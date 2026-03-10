# E-SPMI Enterprise

> **Sistem Penjaminan Mutu Internal** - Internal Quality Assurance System untuk institusi pendidikan tinggi.

E-SPMI (Sistem Penjaminan Mutu Internal) adalah aplikasi web berbasis Laravel dan React yang dirancang untuk mengelola proses penjaminan mutu internal pada institusi pendidikan. Sistem ini mencakup manajemen standar mutu, audit, upload bukti, dan pelaporan untuk keperluan akreditasi.

---

## 📋 Table of Contents

- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Manual Setup](#-manual-setup)
- [Development](#-development)
- [Default Credentials](#-default-credentials)

---

## 🚀 Technology Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Laravel** | 12.x | PHP Web Framework |
| **PHP** | 8.2+ | Server-side Language |
| **JWT Auth** | ^2.1 | Token-based Authentication |
| **Spatie Permission** | ^6.4 | Role-based Access Control |
| **SQLite** | default | Database (supports MySQL/PostgreSQL) |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.x | UI Library |
| **Redux Toolkit** | ^2.5 | State Management |
| **React Router** | v7 | Client-side Routing |
| **Tailwind CSS** | v4 | Utility-first CSS Framework |
| **Vite** | ^7.0 | Build Tool |

### Development Tools
| Tool | Purpose |
|------|---------|
| **PHPUnit** | Testing Framework |
| **Laravel Pint** | Code Formatting |
| **Vite HMR** | Hot Module Replacement |

---

## 🏗️ Architecture

### Modular Structure
Proyek ini menggunakan pola **Domain Module** untuk mengorganisir kode berdasarkan domain bisnis:

```
app/Modules/
├── Core/           # Authentication, Users, Units (Organizational)
│   ├── Controllers/
│   └── Models/
└── Standard/       # Quality Standards & Metrics
    ├── Controllers/
    └── Models/
```

### Key Architectural Decisions

#### 1. **Modular Organization**
- Domain terpisah: Core (autentikasi, user, unit) dan Standard (standar mutu)
- Memudahkan maintenance dan scaling fitur baru
- Model naming: `Mst{Entity}` untuk master data

#### 2. **JWT Authentication**
- Stateless authentication dengan JWT tokens
- Token TTL: 60 menit (configurable)
- Auto-refresh dan 401 handling di frontend

#### 3. **RBAC (Role-Based Access Control)**
| Role | Permissions |
|------|-------------|
| SuperAdmin | Full system access |
| LPM-Admin | Quality assurance admin |
| Auditor | Scoring & findings |
| Auditee | Evidence upload, PTK response |
| Pimpinan | Read-only executive |
| Observer | Minimal read-only |

#### 4. **Tree Structure Data**
- **Unit**: Struktur organisasi hierarkis (Universitas → Fakultas → Jurusan)
- **MstMetric**: Indikator standar bersarang (Header → Statement → Indicator)
- Circular reference prevention logic

#### 5. **API Response Standard**
```json
{
    "status": "success|error",
    "message": "...",
    "data": {...}
}
```

#### 6. **Activity Logging**
- Append-only audit log (`ActivityLog`)
- Tracks: model changes, user, IP, user agent, URL

---

## ⚡ Quick Start

### Prerequisites
- PHP 8.2+
- Composer
- Node.js 18+ (dengan npm/yarn/bun)
- SQLite extension untuk PHP
- Git

### Automated Setup (Recommended)

#### Linux / macOS
```bash
cd scripts
make setup

# Atau dengan custom APP_URL
make setup APP_URL=http://espmi.local
```

#### Windows
```cmd
scripts\setup.bat

# Atau dengan custom APP_URL
scripts\setup.bat http://espmi.local
```

> **Catatan**: Script akan otomatis detect package manager (priority: bun > yarn > npm)

---

## 🔧 Manual Setup

Jika prefer setup manual, ikuti langkah-langkah berikut:

### 1. Install PHP Dependencies
```bash
composer install
```

### 2. Install Frontend Dependencies
```bash
# Otomatis detect (priority: bun > yarn > npm)
bun install    # atau: yarn install / npm install
```

### 3. Environment Configuration
```bash
# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Generate JWT secret
php artisan jwt:secret
```

### 4. Database Setup

#### PostgreSQL (Default)
```bash
# Update .env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=spmi_management
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_SSLMODE=prefer

# Buat database
createdb spmi_management
```

#### SQLite (Alternative)
```bash
# Pastikan SQLite extension terinstall di PHP
php -m | grep -i sqlite

# Buat database file
touch database/database.sqlite

# Update .env
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
```

#### MySQL (Alternative)
```bash
# Update .env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=espmi
DB_USERNAME=root
DB_PASSWORD=your_password

# Buat database
mysql -u root -p -e "CREATE DATABASE espmi;"
```

### 5. Migrate & Seed
```bash
# Run migrations
php artisan migrate

# Apply seeders (roles, permissions, default users)
php artisan db:seed
```

### 6. Configure APP_URL
```bash
# Update di .env
APP_URL=http://localhost:8000
```

### 7. Build Assets (Production)
```bash
npm run build    # atau: yarn build / bun run build
```

---

## 🖥️ Development

### Start Development Server
```bash
# Linux/macOS dengan Makefile
cd scripts && make dev

# Atau manual
npm run dev &      # Frontend dev server
php artisan serve  # Backend server
```

Akses aplikasi di: `http://localhost:8000`

### Code Formatting
```bash
./vendor/bin/pint
```

### Testing
```bash
composer run test
```

### Available Make Commands
```bash
cd scripts

make setup         # Full setup
make composer      # Update composer deps
make frontend      # Install frontend deps
make migrate       # Run migrations
make seed          # Run seeders
make db            # Migrate + seed
make fresh         # Fresh migrate with seed
make build         # Build for production
make dev           # Start dev servers
```

---

## 🔐 Default Credentials

Setelah menjalankan seeder, login dengan:

| Email | Password | Role |
|-------|----------|------|
| `admin@espmi.dev` | `Password@123` | SuperAdmin |
| `lpm@espmi.dev` | `Password@123` | LPM-Admin |

---

## 📁 Project Structure

```
espmi-management/
├── app/
│   ├── Http/Controllers/      # Base controller
│   ├── Models/                # User model
│   └── Modules/               # Domain modules
│       ├── Core/              # Auth, Users, Units
│       └── Standard/          # Standards, Metrics
├── config/                    # Configuration files
├── database/
│   ├── migrations/            # Database migrations
│   └── seeders/               # Database seeders
├── resources/
│   ├── js/                    # React SPA
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   └── store/             # Redux store
│   ├── css/                   # Tailwind CSS
│   └── views/                 # Blade templates
├── routes/
│   ├── api.php                # API routes (v1)
│   └── web.php                # Web routes
├── scripts/                   # Setup scripts
│   ├── Makefile               # Linux/macOS setup
│   └── setup.bat              # Windows setup
└── tests/                     # PHPUnit tests
```

---

## 🔗 Useful Links

- [Laravel 12 Documentation](https://laravel.com/docs/12.x)
- [React 19 Documentation](https://react.dev/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [JWT Auth](https://github.com/tymondesigns/jwt-auth)
- [Spatie Laravel Permission](https://spatie.be/docs/laravel-permission)

---

## 📝 License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).

---

<p align="center">Built with ❤️ for Indonesian Higher Education Quality Assurance</p>


Login: admin@espmi.dev / Password@123