#!/bin/sh
set -eu

cd /var/www/html

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwx storage bootstrap/cache

if [ "${APP_KEY:-}" = "" ]; then
    echo "APP_KEY is not set" >&2
    exit 1
fi

if [ "${JWT_SECRET:-}" = "" ]; then
    echo "JWT_SECRET is not set" >&2
    exit 1
fi

php artisan config:clear
php artisan route:clear
php artisan view:clear

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    php artisan migrate --force
fi

php artisan optimize

exec "$@"
