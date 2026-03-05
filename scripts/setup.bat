@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: E-SPMI Setup Script for Windows
:: Usage: setup.bat [APP_URL]

echo ======================================
echo     E-SPMI Setup Script (Windows)
echo ======================================
echo.

:: Parse arguments
set "APP_URL=%~1"

:: Step 1: Composer dependencies
echo 📦 Installing/updating Composer dependencies...
call composer update --no-interaction --prefer-dist --optimize-autoloader
if errorlevel 1 (
    echo ❌ Composer update failed!
    exit /b 1
)
echo ✅ Composer dependencies installed
echo.

:: Step 2: Frontend dependencies (priority: bun ^> yarn ^> npm)
echo 🎨 Installing frontend dependencies...
where bun >nul 2>nul
if %errorlevel% == 0 (
    echo ✓ Bun detected, using bun install...
    call bun install
    if errorlevel 1 (
        echo ❌ Bun install failed!
        exit /b 1
    )
    goto :frontend_done
)

where yarn >nul 2>nul
if %errorlevel% == 0 (
    echo ✓ Yarn detected, using yarn install...
    call yarn install
    if errorlevel 1 (
        echo ❌ Yarn install failed!
        exit /b 1
    )
    goto :frontend_done
)

where npm >nul 2>nul
if %errorlevel% == 0 (
    echo ✓ NPM detected, using npm install...
    call npm install
    if errorlevel 1 (
        echo ❌ NPM install failed!
        exit /b 1
    )
    goto :frontend_done
)

echo ❌ Error: No package manager found (bun, yarn, or npm)
exit /b 1

:frontend_done
echo ✅ Frontend dependencies installed
echo.

:: Step 3: Create .env file
echo ⚙️  Setting up environment file...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo ✅ Created .env from .env.example
    ) else (
        echo ❌ Error: .env.example not found
        exit /b 1
    )
) else (
    echo ✅ .env already exists, skipping...
)
echo.

:: Step 4: Database migrations
echo 🗄️  Running database migrations...
call php artisan migrate --force
if errorlevel 1 (
    echo ❌ Migration failed!
    exit /b 1
)
echo ✅ Migrations completed
echo.

:: Step 5: Database seeders
echo 🌱 Running database seeders...
call php artisan db:seed --force
if errorlevel 1 (
    echo ❌ Seeding failed!
    exit /b 1
)
echo ✅ Seeding completed
echo.

:: Step 6: Configure APP_URL
echo 🌐 Configuring APP_URL...
if "%~1"=="" (
    :: Auto-detect - set to localhost:8000 if using default
    for /f "tokens=*" %%a in ('findstr /B "APP_URL=" .env') do (
        set "CURRENT_URL=%%a"
    )
    echo !CURRENT_URL! | findstr /C:"localhost" >nul
    if !errorlevel! == 0 (
        set "NEW_URL=http://localhost:8000"
        powershell -Command "(Get-Content .env) -replace '^APP_URL=.*', 'APP_URL=!NEW_URL!' | Set-Content .env"
        echo ✅ Set APP_URL to !NEW_URL!
    ) else (
        echo ✅ APP_URL already configured
    )
) else (
    set "NEW_URL=%~1"
    powershell -Command "(Get-Content .env) -replace '^APP_URL=.*', 'APP_URL=!NEW_URL!' | Set-Content .env"
    echo ✅ Set APP_URL to !NEW_URL!
)
echo.

:: Step 7: Generate Application Key
echo 🔑 Generating application key...
:: Check if APP_KEY exists and is not empty
for /f "tokens=2 delims==" %%a in ('findstr /B "APP_KEY=" .env') do (
    set "KEY_VALUE=%%a"
)
set "KEY_VALUE=!KEY_VALUE: =!"
if "!KEY_VALUE!"=="" (
    call php artisan key:generate
    echo ✅ Application key generated
) else (
    echo ✅ Application key already exists
)
echo.

:: Step 8: Generate JWT Secret
echo 🔐 Generating JWT secret...
call php artisan jwt:secret --force 2>nul || call php artisan jwt:secret
echo ✅ JWT secret generated
echo.

:: Final output
echo ======================================
echo          ✅ Setup selesai!
echo ======================================
for /f "tokens=2 delims==" %%a in ('findstr /B "APP_URL=" .env') do (
    echo APP_URL: %%a
)
echo.
echo 📝 Default Login Credentials:
echo    Email:    admin@espmi.dev
echo    Password: Password@123
echo ======================================
echo.
echo 🚀 To start development server:
echo    php artisan serve
echo.

pause
