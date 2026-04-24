FROM php:8.3-cli-alpine AS vendor

WORKDIR /app

RUN apk add --no-cache \
        git \
        icu-libs \
        libpq \
        libxml2 \
        libzip \
        oniguruma \
        unzip \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        icu-dev \
        libpq-dev \
        libxml2-dev \
        libzip-dev \
        oniguruma-dev \
        postgresql-dev \
    && docker-php-ext-install \
        bcmath \
        dom \
        intl \
        mbstring \
        pdo \
        pdo_pgsql \
        zip \
    && apk del .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader

COPY . .
RUN composer dump-autoload --optimize --no-dev

FROM node:22-alpine AS frontend

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY resources ./resources
COPY public ./public
COPY vite.config.js ./
RUN npm run build

FROM php:8.3-fpm-alpine AS app

WORKDIR /var/www/html

RUN apk add --no-cache \
        bash \
        fcgi \
        libpq \
        libzip \
        oniguruma \
        postgresql-libs \
        icu-libs \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        icu-dev \
        libpq-dev \
        libzip-dev \
        oniguruma-dev \
        postgresql-dev \
    && docker-php-ext-install \
        bcmath \
        intl \
        pcntl \
        pdo \
        pdo_pgsql \
        zip \
    && apk del .build-deps

COPY --from=vendor /app /var/www/html
COPY --from=frontend /app/public/build /var/www/html/public/build

RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R ug+rwx storage bootstrap/cache

COPY docker/php/php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY docker/php/www.conf /usr/local/etc/php-fpm.d/zz-app.conf
COPY scripts/setup.sh /usr/local/bin/app-entrypoint
RUN chmod +x /usr/local/bin/app-entrypoint

ENTRYPOINT ["app-entrypoint"]
CMD ["php-fpm"]

FROM nginx:1.27-alpine AS nginx

WORKDIR /var/www/html

COPY --from=vendor /app/public /var/www/html/public
COPY --from=frontend /app/public/build /var/www/html/public/build
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
