# E-SPMI - Universitas Islam Madura

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
- [Buku Manual Pengguna](#-buku-manual-pengguna)

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

## 📘 Buku Manual Pengguna

Panduan operasional aplikasi tersedia di:

- [MANUAL_BOOK.md](/Users/alvinsetyapranata/Documents/spmi-management/MANUAL_BOOK.md:1)

Dokumen tersebut mencakup:

- alur login dan dashboard
- penggunaan modul standar, borang, pelaksanaan, audit, PTK, dan laporan
- pengaturan user, role, permission, dan siklus
- ringkasan route penting

---

## 🐳 Docker Deployment

Setup ini ditujukan untuk deploy ke VPS dengan Docker Compose untuk web tier Laravel. PostgreSQL tetap dapat dijalankan di level sistem VPS.

Service container yang dipakai:
- `app` - Laravel PHP-FPM
- `nginx` - Web server untuk melayani frontend + API Laravel
- `queue` - Laravel queue worker
- `scheduler` - Laravel scheduler loop

### File yang disediakan
- `Dockerfile`
- `docker-compose.yml`
- `docker/php/php.ini`
- `docker/php/www.conf`
- `docker/php/entrypoint.sh`
- `scripts/setup.sh`
- `scripts/deploy.sh`

### 1. Siapkan file environment untuk container
```bash
cp .env.example .env
```

Lalu isi minimal value berikut di `.env`:
```env
APP_URL=https://domain-anda.com
APP_KEY=base64:...hasil dari php artisan key:generate --show
JWT_SECRET=...secret jwt anda
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=spmi_management
DB_USERNAME=postgres
DB_PASSWORD=password-db-yang-kuat
```

Generate value yang dibutuhkan:
```bash
php artisan key:generate --show
php artisan jwt:secret --force
```

Jika `php artisan jwt:secret --force` dijalankan lokal, ambil nilainya lalu salin ke `JWT_SECRET` pada `.env`.

### 2. Build dan jalankan container
```bash
docker compose build
docker compose up -d
```

Atau gunakan script deploy production:
```bash
chmod +x scripts/deploy.sh scripts/setup.sh
./scripts/deploy.sh
```

Jika Anda ingin memakai file env selain root `.env`, gunakan:
```bash
APP_ENV_FILE=.env docker compose config
APP_ENV_FILE=.env.production docker compose up -d --build
```

Saat boot pertama, container `app` akan otomatis:
- memastikan permission `storage` dan `bootstrap/cache`
- menjalankan `php artisan migrate --force`
- membangun cache Laravel dengan `php artisan optimize`

Saat `./scripts/deploy.sh` dijalankan tanpa `--no-build`, script akan:
- membangun ulang image `app` dan `nginx`
- menjalankan build frontend Vite di stage Docker Node
- menyalin hasil frontend build ke image runtime yang dipakai Nginx/Laravel

### 3. Seed data awal bila diperlukan
```bash
docker compose exec app php artisan db:seed
```

### 4. Akses aplikasi
- Aplikasi HTTP tersedia di port `80` host VPS secara default melalui container `nginx`.
- Arahkan domain atau IP publik ke port `80` VPS.
- Container `app` hanya melayani PHP-FPM secara internal untuk container `nginx`.

### 5. Operasional umum
```bash
docker compose ps
docker compose logs -f app
docker compose logs -f queue
docker compose exec app php artisan optimize:clear
docker compose exec app php artisan migrate --force
```

### 6. Update aplikasi di VPS
```bash
git pull
docker compose build
docker compose up -d
```

Dengan script:
```bash
./scripts/deploy.sh --pull
```

### Catatan produksi
- Default compose mengekspos HTTP container `nginx` ke port host `80`. Anda bisa ubah lewat `APP_PORT`.
- Default compose memakai file root `.env` sebagai sumber env global untuk `app`, `queue`, dan `scheduler`.
- PostgreSQL harus tersedia di level sistem VPS atau service eksternal.
- `QUEUE_CONNECTION`, `SESSION_DRIVER`, dan `CACHE_STORE` default memakai `database`, jadi tabel terkait harus sudah termigrasi.
- Volume `app-storage` menyimpan file Laravel `storage`.

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
- Token TTL: 3 hari (configurable)
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

Setelah menjalankan `php artisan db:seed`, login dengan:

| Email | Password | Role |
|-------|----------|------|
| `admin@espmi.dev` | `Password@123` | SuperAdmin |
| `lpm@espmi.dev` | `Password@123` | LPM-Admin |
| `perumus@espmi.dev` | `Password@123` | Perumus |
| `ratna.kusuma@espmi.dev` | `Password@123` | Lead Auditor |
| `auditor@espmi.dev` | `Password@123` | Auditor |
| `sari.wulandari@espmi.dev` | `Password@123` | Auditor |
| `andi.pratama@espmi.dev` | `Password@123` | Auditor |
| `auditee@espmi.dev` | `Password@123` | Auditee |
| `kepala.lpmi@espmi.dev` | `Password@123` | Kepala LPMI |
| `pimpinan@espmi.dev` | `Password@123` | Pimpinan |
| `wareg1@espmi.dev` | `Password@123` | Wakil Rektor 1 |
| `wareg2@espmi.dev` | `Password@123` | Wakil Rektor 2 |
| `wareg3@espmi.dev` | `Password@123` | Wakil Rektor 3 |
| `rektor@espmi.dev` | `Password@123` | Rektor |

### Dummy Auditee per Prodi

| Email | Password | Role | Prodi |
|-------|----------|------|-------|
| `rina.maharani@espmi.dev` | `Password@123` | Auditee | S1 Teknik Informatika |
| `dimas.setiawan@espmi.dev` | `Password@123` | Auditee | S1 Sistem Informasi |
| `nabila.ayu@espmi.dev` | `Password@123` | Auditee | S1 Teknologi Komputer |
| `galih.permana@espmi.dev` | `Password@123` | Auditee | S1 Bisnis Digital |
| `maya.lestari@espmi.dev` | `Password@123` | Auditee | S1 Manajemen |
| `fajar.hidayat@espmi.dev` | `Password@123` | Auditee | S1 Akuntansi |
| `putri.anindya@espmi.dev` | `Password@123` | Auditee | S1 Ekonomi Pembangunan |
| `rizky.saputra@espmi.dev` | `Password@123` | Auditee | S1 Kewirausahaan |
| `anita.safitri@espmi.dev` | `Password@123` | Auditee | S1 PGSD |
| `yusuf.kurniawan@espmi.dev` | `Password@123` | Auditee | S1 Pendidikan Bahasa Inggris |
| `lia.oktaviani@espmi.dev` | `Password@123` | Auditee | S1 Pendidikan Matematika |
| `teguh.wicaksono@espmi.dev` | `Password@123` | Auditee | S1 Pendidikan Biologi |

### Demo Accounts Notes

- `perumus@espmi.dev` dipakai untuk role Perumus yang hanya fokus membuat dan menyusun draft standar mutu secara manual.
- akun `Perumus` memiliki menu `Akun Saya` untuk mengubah nama akun, password, dan tanda tangan virtual sendiri.
- `ratna.kusuma@espmi.dev` digunakan sebagai contoh Lead Auditor untuk penjadwalan audit.
- `auditor@espmi.dev`, `sari.wulandari@espmi.dev`, dan `andi.pratama@espmi.dev` digunakan sebagai contoh Auditor.
- akun auditee personal per prodi dipakai untuk assignment otomatis saat prodi dipilih di jadwal audit.
- `kepala.lpmi@espmi.dev` dipakai pada tahap persetujuan awal sebelum masuk ke Wakil Rektor 1, 2, dan 3.
- `pimpinan@espmi.dev` digunakan untuk keputusan final standar: terbitkan atau kembalikan untuk revisi.
- `wareg1@espmi.dev`, `wareg2@espmi.dev`, dan `wareg3@espmi.dev` dipakai pada tahap persetujuan Wakil Rektor 1, 2, dan 3.
- `rektor@espmi.dev` dipakai pada tahap persetujuan final setelah seluruh Wakil Rektor selesai menyetujui.
- Seeder demo juga menyiapkan contoh standar `WAITING_APPROVAL` yang belum direview auditor.

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


Login default: `admin@espmi.dev` / `Password@123`
