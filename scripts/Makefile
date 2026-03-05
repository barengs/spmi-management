# E-SPMI Setup Makefile
# Usage: cd scripts && make setup
#        atau: make -C scripts setup

# Project root directory (parent of scripts folder)
ROOT_DIR := ..

.PHONY: setup install-composer install-frontend create-env migrate seed config-url generate-keys all check-root

# Check if running from scripts directory
ifneq ($(lastword $(subst /, ,$(CURDIR))),scripts)
    $(warning ⚠️  Please run this Makefile from the scripts directory)
    $(warning    cd scripts && make setup)
endif

# Default target - run full setup
setup: check-root install-composer install-frontend create-env migrate seed config-url generate-keys
	@echo "=================================="
	@echo "✅ Setup selesai!"
	@echo "=================================="
	@$(MAKE) show-info

# Show final info
show-info:
	@echo "APP_URL: $$(grep APP_URL $(ROOT_DIR)/.env | cut -d '=' -f2)"
	@echo "Login: admin@espmi.dev / Password@123"
	@echo "=================================="

# Check root directory exists
check-root:
	@if [ ! -f $(ROOT_DIR)/composer.json ]; then \
		echo "❌ Error: Cannot find project root. Make sure you run from scripts folder."; \
		exit 1; \
	fi

# 1. Update composer dependencies
install-composer: check-root
	@echo "📦 Installing/updating Composer dependencies..."
	@cd $(ROOT_DIR) && composer update --no-interaction --prefer-dist --optimize-autoloader

# 2. Install frontend dependencies (priority: bun > yarn > npm)
install-frontend: check-root
	@echo "🎨 Installing frontend dependencies..."
	@cd $(ROOT_DIR) && if command -v bun >/dev/null 2>&1; then \
		echo "✓ Bun detected, using bun install..."; \
		bun install; \
	elif command -v yarn >/dev/null 2>&1; then \
		echo "✓ Yarn detected, using yarn install..."; \
		yarn install; \
	elif command -v npm >/dev/null 2>&1; then \
		echo "✓ NPM detected, using npm install..."; \
		npm install; \
	else \
		echo "❌ Error: No package manager found (bun, yarn, or npm)"; \
		exit 1; \
	fi

# 3. Create .env file if not exists
create-env: check-root
	@echo "⚙️  Setting up environment file..."
	@if [ ! -f $(ROOT_DIR)/.env ]; then \
		if [ -f $(ROOT_DIR)/.env.example ]; then \
			cp $(ROOT_DIR)/.env.example $(ROOT_DIR)/.env; \
			echo "✓ Created .env from .env.example"; \
		else \
			echo "❌ Error: .env.example not found"; \
			exit 1; \
		fi \
	else \
		echo "✓ .env already exists, skipping..."; \
	fi

# 4. Run database migrations
migrate: create-env
	@echo "🗄️  Running database migrations..."
	@cd $(ROOT_DIR) && php artisan migrate --force

# 5. Apply database seeders
seed: migrate
	@echo "🌱 Running database seeders..."
	@cd $(ROOT_DIR) && php artisan db:seed --force

# 6. Configure APP_URL (auto-detect or use provided)
config-url: create-env
	@echo "🌐 Configuring APP_URL..."
	@cd $(ROOT_DIR) && CURRENT_URL=$$(grep APP_URL .env | cut -d '=' -f2); \
	if [ -z "$(APP_URL)" ]; then \
		if echo "$$CURRENT_URL" | grep -q "localhost"; then \
			NEW_URL="http://localhost:8000"; \
			sed -i.bak "s|APP_URL=.*|APP_URL=$$NEW_URL|" .env && rm -f .env.bak; \
			echo "✓ Set APP_URL to $$NEW_URL"; \
		else \
			echo "✓ APP_URL already set to $$CURRENT_URL"; \
		fi \
	else \
		sed -i.bak "s|APP_URL=.*|APP_URL=$(APP_URL)|" .env && rm -f .env.bak; \
		echo "✓ Set APP_URL to $(APP_URL)"; \
	fi

# 7 & 8. Generate application key and JWT secret
generate-keys: create-env
	@echo "🔑 Generating application keys..."
	@cd $(ROOT_DIR) && if ! grep -q "APP_KEY=" .env 2>/dev/null || [ "$$(grep APP_KEY .env | cut -d '=' -f2 | tr -d '\n')" = "" ]; then \
		php artisan key:generate; \
	else \
		echo "✓ APP_KEY already exists"; \
	fi
	@echo "🔐 Generating JWT secret..."
	@cd $(ROOT_DIR) && (php artisan jwt:secret --force 2>/dev/null || php artisan jwt:secret)

# Individual targets for flexibility
composer:
	$(MAKE) install-composer

frontend:
	$(MAKE) install-frontend

env:
	$(MAKE) create-env

db:
	$(MAKE) migrate seed

url:
	$(MAKE) config-url

keys:
	$(MAKE) generate-keys

# Fresh start - reset everything
fresh: check-root
	@echo "🧹 Fresh start - resetting database..."
	@cd $(ROOT_DIR) && php artisan migrate:fresh --seed --force

# Build frontend assets for production
build: check-root
	@echo "🏗️  Building frontend assets..."
	@cd $(ROOT_DIR) && if command -v bun >/dev/null 2>&1; then \
		bun run build; \
	elif command -v yarn >/dev/null 2>&1; then \
		yarn build; \
	elif command -v npm >/dev/null 2>&1; then \
		npm run build; \
	fi

# Development server
dev: check-root
	@echo "🚀 Starting development servers..."
	@cd $(ROOT_DIR) && (if command -v bun >/dev/null 2>&1; then \
		bun run dev & \
	elif command -v yarn >/dev/null 2>&1; then \
		yarn dev & \
	elif command -v npm >/dev/null 2>&1; then \
		npm run dev & \
	fi) && php artisan serve

# Help
help:
	@echo "E-SPMI Makefile Commands:"
	@echo "========================"
	@echo "Usage: cd scripts && make [command]"
	@echo ""
	@echo "Commands:"
	@echo "  make setup         - Run full setup (default)"
	@echo "  make composer      - Install Composer dependencies"
	@echo "  make frontend      - Install frontend dependencies"
	@echo "  make env           - Create .env file"
	@echo "  make migrate       - Run database migrations"
	@echo "  make seed          - Run database seeders"
	@echo "  make db            - Run migrations + seeders"
	@echo "  make url           - Configure APP_URL"
	@echo "  make keys          - Generate app key and JWT secret"
	@echo "  make fresh         - Fresh migrate with seeders"
	@echo "  make build         - Build frontend for production"
	@echo "  make dev           - Start development servers"
	@echo ""
	@echo "With custom APP_URL:"
	@echo "  make setup APP_URL=http://your-domain.com"
