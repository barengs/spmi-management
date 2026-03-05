# E-SPMI Enterprise - Agent Guide

> **Project:** E-SPMI (Sistem Penjaminan Mutu Internal) - Internal Quality Assurance System
> **Stack:** Laravel 12 + React 19 + Tailwind CSS 4
> **Language:** Indonesian (Bahasa Indonesia) for user-facing content, English for code

---

## 1. Project Overview

E-SPMI Enterprise is a web-based Internal Quality Assurance System designed for educational institutions. It manages quality standards, audit processes, evidence uploads, and reporting for accreditation purposes.

### Key Features
- **User Management** with role-based access control (RBAC)
- **Organizational Unit Hierarchy** (tree structure for faculties, departments, etc.)
- **Quality Standards Document Management** (SN-Dikti, Institusi categories)
- **Hierarchical Metrics/Indicators** for quality measurement
- **JWT-based Authentication** for API security
- **Activity Logging** for audit trails

### Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | Laravel 12 (PHP 8.2+) |
| Frontend | React 19, Redux Toolkit, React Router v7 |
| Styling | Tailwind CSS 4 |
| Build Tool | Vite 7 |
| Authentication | JWT (tymon/jwt-auth) |
| Authorization | Spatie Laravel Permission |
| Database | SQLite (default), supports MySQL/PostgreSQL |
| Testing | PHPUnit 11 |

---

## 2. Project Structure

```
app/
├── Http/
│   └── Controllers/
│       └── Controller.php          # Base controller
├── Models/
│   └── User.php                    # User model (JWTSubject, HasRoles)
├── Modules/                        # Domain modules
│   ├── Core/                       # Core module (Auth, Users, Units)
│   │   ├── Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── UnitController.php
│   │   │   └── UserController.php
│   │   └── Models/
│   │       ├── ActivityLog.php
│   │       └── Unit.php
│   └── Standard/                   # Standard module (Quality Standards)
│       ├── Controllers/
│       │   ├── MetricController.php
│       │   └── StandardController.php
│       └── Models/
│           ├── MstMetric.php
│           └── MstStandard.php
└── Providers/
    └── AppServiceProvider.php

resources/
├── js/                             # React SPA
│   ├── components/
│   │   ├── MainApp.jsx             # App entry with routing
│   │   └── layout/
│   │       ├── AppLayout.jsx
│   │       ├── Navbar.jsx
│   │       └── Sidebar.jsx
│   ├── pages/
│   │   ├── auth/
│   │   │   └── LoginPage.jsx
│   │   └── Dashboard.jsx
│   ├── services/
│   │   └── api.js                  # Axios instance with interceptors
│   ├── store/
│   │   ├── authSlice.js            # Redux auth state
│   │   └── index.js
│   ├── app.jsx                     # React mount point
│   ├── app.js
│   └── bootstrap.js
├── css/
│   └── app.css                     # Tailwind CSS entry
└── views/
    └── index.blade.php             # SPA shell

routes/
├── api.php                         # All API routes (v1)
├── web.php                         # SPA catch-all route
└── console.php

database/
├── migrations/
└── seeders/
    ├── DatabaseSeeder.php
    ├── RolePermissionSeeder.php
    └── UnitSeeder.php

config/
├── app.php
├── auth.php
├── jwt.php                         # JWT configuration
├── permission.php                  # Spatie permission config
└── ...

tests/
├── Feature/                        # API endpoint tests
├── Unit/                           # Unit tests
└── TestCase.php
```

---

## 3. Architecture Patterns

### Modular Organization
The project uses a **domain module pattern** where related controllers and models are grouped by business domain:

- `App\Modules\Core\` - Authentication, user management, organizational units
- `App\Modules\Standard\` - Quality standards and metrics

Models follow the naming convention: `Mst{Entity}` for master data tables.

### API Response Format
All API responses follow a standardized JSON structure:

```php
return response()->json([
    'status'  => 'success',  // or 'error'
    'message' => '...',      // optional, human-readable (Indonesian)
    'data'    => $payload,   // nullable
]);
```

### Route Structure
API routes are versioned under `/api/v1/` prefix:

```php
Route::prefix('v1')->group(function () {
    // Public routes
    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login']);
    });
    
    // Protected routes (JWT required)
    Route::middleware('auth:api')->group(function () {
        // Resources...
    });
});
```

### Frontend Architecture
- **SPA (Single Page Application)** with React Router v7
- **Redux Toolkit** for global state management (auth)
- **Axios interceptors** for automatic token attachment and 401 handling
- **Role-based menu filtering** in Sidebar component
- **localStorage** for token persistence (`espmi_token`, `espmi_user`)

---

## 4. Build & Development Commands

### Initial Setup
```bash
composer run setup
```
This command will:
1. Install PHP dependencies
2. Create `.env` from `.env.example`
3. Generate application key
4. Run migrations
5. Install NPM dependencies
6. Build frontend assets

### Development
```bash
composer run dev
```
Starts four concurrent processes:
- Laravel development server
- Queue listener
- Log watcher (Pail)
- Vite dev server with HMR

### Build for Production
```bash
npm run build
```

### Testing
```bash
composer run test
```
Runs PHPUnit tests with configuration from `phpunit.xml`.

### Code Formatting
```bash
./vendor/bin/pint
```
Uses Laravel Pint for PHP code styling.

---

## 5. Authentication & Authorization

### JWT Authentication
The application uses JWT tokens via `tymon/jwt-auth`:

1. Login returns a token: `POST /api/v1/auth/login`
2. Token is stored in localStorage (`espmi_token`)
3. API client automatically attaches token via Axios interceptor
4. Token auto-refresh and 401 handling in `resources/js/services/api.js`

### Role-Based Access Control
Roles are defined in `RolePermissionSeeder.php`:

| Role | Description |
|------|-------------|
| SuperAdmin | Full system access |
| LPM-Admin | Quality assurance admin |
| Auditor | Can score and create findings |
| Auditee | Can upload evidence, respond to PTK |
| Pimpinan | Read-only executive access |
| Observer | Minimal read-only access |

Permissions follow the pattern `{resource}.{action}`:
- `user.view`, `user.create`, `user.update`, `user.delete`
- `standard.view`, `standard.create`, `standard.update`, `standard.delete`
- `audit.view`, `audit.create`, `audit.score.update`

---

## 6. Key Models & Relationships

### User
- Authenticatable with JWTSubject
- Belongs to `Unit` (organizational unit)
- Uses `HasRoles` trait from Spatie
- Soft deletes enabled
- Fields: `nidn_npk`, `name`, `email`, `password`, `unit_id`, `is_active`

### Unit (ref_units table)
- Self-referencing tree structure (parent/children)
- Levels: `university`, `faculty`, `department`, `bureau`
- Has many `User`
- Supports circular reference prevention logic
- Soft deletes enabled

### MstStandard (Quality Standards)
- Categories: `SN-Dikti`, `Institusi`
- Has many `MstMetric`
- Fields: `name`, `category`, `periode_tahun`, `is_active`, `referensi_regulasi`
- Soft deletes enabled

### MstMetric (Standard Components)
- Tree structure for hierarchical indicators
- Types: `Header`, `Statement`, `Indicator`
- Belongs to `MstStandard`
- Self-referencing parent/children relationships
- Automatic order assignment
- Soft deletes enabled

### ActivityLog
- Append-only audit log (no `updated_at`)
- Tracks model changes (`old_data`/`new_data`)
- Records user, IP, user agent, URL, method
- Static `record()` method for easy logging

---

## 7. API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login, returns JWT token |
| POST | `/api/v1/auth/logout` | Logout (authenticated) |
| GET | `/api/v1/auth/me` | Get current user info |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List users (paginated) |
| POST | `/api/v1/users` | Create user |
| GET | `/api/v1/users/{id}` | Get user details |
| PUT | `/api/v1/users/{id}` | Update user |
| DELETE | `/api/v1/users/{id}` | Soft delete user |
| POST | `/api/v1/users/{id}/force-reset` | Send password reset link |

### Units
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/units` | Get tree structure |
| GET | `/api/v1/units/flat` | Get flat list for dropdowns |
| POST | `/api/v1/units` | Create unit |
| GET | `/api/v1/units/{id}` | Get unit details |
| PUT | `/api/v1/units/{id}` | Update unit |
| DELETE | `/api/v1/units/{id}` | Delete unit |

### Standards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/standards` | List standards |
| POST | `/api/v1/standards` | Create standard |
| GET | `/api/v1/standards/{id}` | Get standard details |
| PUT | `/api/v1/standards/{id}` | Update standard |
| DELETE | `/api/v1/standards/{id}` | Delete standard |
| GET | `/api/v1/standards/{id}/metrics/tree` | Get metric hierarchy |

### Metrics
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/metrics` | Create metric |
| PUT | `/api/v1/metrics/{id}` | Update metric |
| DELETE | `/api/v1/metrics/{id}` | Delete metric (cascade) |

---

## 8. Development Conventions

### Code Style
- **Language:** Indonesian for user-facing messages, English for code
- **PascalCase** for class names
- **camelCase** for methods and variables
- **snake_case** for database columns
- **Route names:** Use controller action comments to document endpoints

### PHP Conventions
- Return type declarations: `JsonResponse`
- Validation using `$request->validate()`
- Use `findOrFail()` for 404 handling
- Soft deletes on all major entities
- Activity logging for significant actions

### Frontend Conventions
- Functional components with hooks
- Redux for global state (auth)
- Tailwind CSS for styling (dark mode supported)
- Role-based menu filtering in Sidebar

### Database Conventions
- Migrations for all schema changes
- Foreign keys with `cascadeOnDelete()` where appropriate
- Soft deletes on all major entities
- Seeder pattern: Units → Roles → Users

---

## 9. Testing Strategy

### Test Configuration
- Uses SQLite in-memory database (`:memory:`)
- Environment variables in `phpunit.xml`
- Two test suites: Unit and Feature

### Running Tests
```bash
# Run all tests
composer run test

# Run specific test
./vendor/bin/phpunit tests/Feature/ExampleTest.php
```

### Test Guidelines
- Feature tests for API endpoints
- Unit tests for model methods and scopes
- Use Laravel's testing traits (`RefreshDatabase` when needed)

---

## 10. Security Considerations

### Authentication
- JWT tokens with configurable TTL (default 60 minutes)
- Tokens stored in localStorage (XSS protection needed)
- Automatic logout on 401 responses
- Users must have `is_active = true` to login

### Authorization
- Middleware `auth:api` protects all sensitive routes
- Role middleware available via Spatie
- Cannot delete own account (enforced in UserController)
- SuperAdmin bypasses all permission checks

### Data Protection
- Soft deletes prevent data loss
- Activity logging for audit trails
- Password hashing with bcrypt
- Input validation on all endpoints
- Circular reference prevention in tree structures

### Environment Variables
Key variables in `.env`:
```
JWT_SECRET=           # Generate with: php artisan jwt:secret
DB_CONNECTION=sqlite  # or mysql, pgsql
APP_DEBUG=false       # Set to false in production
```

---

## 11. Deployment Notes

### Requirements
- PHP 8.2+
- Composer
- Node.js 18+
- SQLite (built-in) or MySQL/PostgreSQL

### Production Checklist
1. Set `APP_ENV=production` and `APP_DEBUG=false`
2. Generate unique `JWT_SECRET` with `php artisan jwt:secret`
3. Configure database connection
4. Run `npm run build` for optimized assets
5. Set proper file permissions for `storage/` and `bootstrap/cache/`
6. Configure web server to point to `public/` directory
7. Set up queue worker if using background jobs

### Default Admin Credentials (Development)
- Email: `admin@espmi.dev`
- Password: `Password@123`

---

## 12. File Locations Reference

### Key Configuration Files
| File | Purpose |
|------|---------|
| `composer.json` | PHP dependencies and scripts |
| `package.json` | NPM dependencies and scripts |
| `phpunit.xml` | PHPUnit configuration |
| `vite.config.js` | Vite build configuration |
| `.env.example` | Environment template |
| `config/jwt.php` | JWT authentication settings |
| `config/permission.php` | Spatie permission config |

### Key Source Files
| File | Purpose |
|------|---------|
| `routes/api.php` | API route definitions |
| `routes/web.php` | Web/SPA routes |
| `resources/js/app.jsx` | React entry point |
| `resources/js/services/api.js` | Axios configuration |
| `resources/js/store/authSlice.js` | Redux auth slice |
| `resources/views/index.blade.php` | SPA shell |

### Key Backend Files
| File | Purpose |
|------|---------|
| `app/Models/User.php` | User model |
| `app/Modules/Core/Controllers/AuthController.php` | Authentication |
| `app/Modules/Core/Controllers/UserController.php` | User CRUD |
| `app/Modules/Core/Controllers/UnitController.php` | Unit management |
| `app/Modules/Standard/Controllers/StandardController.php` | Standards CRUD |
| `app/Modules/Standard/Controllers/MetricController.php` | Metrics CRUD |
| `database/seeders/RolePermissionSeeder.php` | RBAC setup |

---

*Last Updated: 2026-03-05*
