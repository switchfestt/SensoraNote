# =============================================================================
# SensoraNote Production Dockerfile
# Stack: Laravel 12 + MongoDB + Vite (React SPA) + Sanctum
# Target: Render free tier (also works for Railway, Fly.io, etc.)
# =============================================================================

FROM php:8.3-apache

# Step 1: Install system tools & libraries needed by PHP extensions.
RUN apt-get update && apt-get install -y \
    git \
    curl \
    zip \
    unzip \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    libssl-dev \
    libcurl4-openssl-dev \
    libicu-dev \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Step 2: Install Node.js 20 LTS (for npm run build — Vite + TypeScript).
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Step 3: Install PHP extensions used by Laravel + MongoDB.
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql mbstring exif pcntl bcmath gd zip intl

# Step 4: Install MongoDB driver via PECL.
RUN pecl install mongodb && docker-php-ext-enable mongodb

# Step 5: Install Composer.
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Step 6: Configure Apache — DocumentRoot & ModRewrite.
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && a2dismod mpm_event 2>/dev/null || true \
    && a2enmod mpm_prefork \
    && a2enmod rewrite headers

# Step 7: Set working directory.
WORKDIR /var/www/html

# Step 8: Install PHP dependencies (layer cache).
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

# Step 9: Install Node dependencies (layer cache).
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Step 10: Copy the rest of the source.
COPY . .

# Step 11: Build frontend assets (Vite → public/build/).
RUN npm run build

# Step 12: Finalize composer autoload.
RUN composer dump-autoload --optimize --no-interaction

# Step 13: Create storage dirs & set permissions.
RUN mkdir -p storage/framework/{sessions,views,cache} \
    && mkdir -p storage/app/public \
    && mkdir -p bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Step 14: Create storage symlink.
RUN php artisan storage:link 2>/dev/null || true

# Step 15: Dynamic Port for Render.
ENV PORT=10000
EXPOSE ${PORT}

# Step 16: Start — Configure port, optimize Laravel, launch Apache.
CMD sed -i "s/80/$PORT/g" /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache \
    && docker-php-entrypoint apache2-foreground
