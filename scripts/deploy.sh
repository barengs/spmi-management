#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
APP_ENV_FILE=${APP_ENV_FILE:-.env}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.yml}
PROJECT_NAME=${COMPOSE_PROJECT_NAME:-spmi-management}

cd "$ROOT_DIR"

log() {
    printf '%s\n' "$*"
}

fail() {
    printf 'Error: %s\n' "$*" >&2
    exit 1
}

need_cmd() {
    command -v "$1" >/dev/null 2>&1 || fail "command '$1' is required"
}

usage() {
    cat <<EOF
Usage: ./scripts/deploy.sh [--pull] [--seed] [--seed-users] [--no-build]

Options:
  --pull        Run git pull before deploy
  --seed        Run php artisan db:seed after app is healthy
  --seed-users  Run php artisan db:seed --class=UserOnlySeeder after app is healthy
  --no-build    Skip docker compose build
EOF
}

RUN_PULL=false
RUN_SEED=false
RUN_SEED_USERS=false
RUN_BUILD=true

while [ $# -gt 0 ]; do
    case "$1" in
        --pull)
            RUN_PULL=true
            ;;
        --seed)
            RUN_SEED=true
            ;;
        --seed-users)
            RUN_SEED_USERS=true
            ;;
        --no-build)
            RUN_BUILD=false
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            fail "unknown option: $1"
            ;;
    esac
    shift
done

need_cmd docker

docker compose version >/dev/null 2>&1 || fail "docker compose is required"
[ -f "$COMPOSE_FILE" ] || fail "$COMPOSE_FILE not found"
[ -f "$APP_ENV_FILE" ] || fail "$APP_ENV_FILE not found"

if ! grep -Eq '^APP_KEY=.+$' "$APP_ENV_FILE"; then
    fail "APP_KEY is missing in $APP_ENV_FILE"
fi

if ! grep -Eq '^JWT_SECRET=.+$' "$APP_ENV_FILE"; then
    fail "JWT_SECRET is missing in $APP_ENV_FILE"
fi

if [ "$RUN_PULL" = "true" ]; then
    need_cmd git
    log "Pulling latest source..."
    git pull --ff-only
fi

log "Validating compose configuration..."
APP_ENV_FILE="$APP_ENV_FILE" docker compose -f "$COMPOSE_FILE" config >/dev/null

if [ "$RUN_BUILD" = "true" ]; then
    log "Building application images, including frontend assets..."
    APP_ENV_FILE="$APP_ENV_FILE" docker compose -f "$COMPOSE_FILE" build app nginx
else
    log "Skipping image build. Existing frontend assets inside current images will be reused."
fi

log "Starting production services..."
APP_ENV_FILE="$APP_ENV_FILE" docker compose -f "$COMPOSE_FILE" up -d

log "Waiting for app container health..."
APP_CONTAINER_ID=$(APP_ENV_FILE="$APP_ENV_FILE" docker compose -f "$COMPOSE_FILE" ps -q app)
[ -n "$APP_CONTAINER_ID" ] || fail "app container was not created"

ATTEMPT=0
MAX_ATTEMPTS=60
while [ "$ATTEMPT" -lt "$MAX_ATTEMPTS" ]; do
    STATUS=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$APP_CONTAINER_ID" 2>/dev/null || true)
    if [ "$STATUS" = "healthy" ] || [ "$STATUS" = "running" ]; then
        break
    fi

    if [ "$STATUS" = "unhealthy" ] || [ "$STATUS" = "exited" ] || [ "$STATUS" = "dead" ]; then
        APP_ENV_FILE="$APP_ENV_FILE" docker compose -f "$COMPOSE_FILE" logs --tail=100 app
        fail "app container failed with status '$STATUS'"
    fi

    ATTEMPT=$((ATTEMPT + 1))
    sleep 2
done

[ "$ATTEMPT" -lt "$MAX_ATTEMPTS" ] || fail "timeout waiting for app container health"

if [ "$RUN_SEED" = "true" ]; then
    log "Running database seeders..."
    APP_ENV_FILE="$APP_ENV_FILE" docker compose -f "$COMPOSE_FILE" exec -T app php artisan db:seed --force
fi

if [ "$RUN_SEED_USERS" = "true" ]; then
    log "Running user-only seeder..."
    APP_ENV_FILE="$APP_ENV_FILE" docker compose -f "$COMPOSE_FILE" exec -T app php artisan db:seed --class=UserOnlySeeder --force
fi

log "Deployment finished."
APP_ENV_FILE="$APP_ENV_FILE" docker compose -f "$COMPOSE_FILE" ps
