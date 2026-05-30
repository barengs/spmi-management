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
| Perumus | Can create and draft standards manually |
| Pemeriksa | Standard read/review-facing role without audit assignment |
| Persetujuan | Standard approval-facing governance role |
| Pertimbangan | Standard consideration/read-only governance role |
| Pengendalian | Standard control/monitoring read-only role |
| Kepala LPMI | First approver for standard publication flow |
| Wakil Rektor 1 | Parallel approver at vice rector stage |
| Wakil Rektor 2 | Parallel approver at vice rector stage |
| Wakil Rektor 3 | Parallel approver at vice rector stage |
| Rektor | Final approver for standard publication flow |
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
- Also stores optional virtual signature metadata:
  - `signature_path`
  - `signature_original_name`
  - `signature_mime_type`
  - `signature_size_bytes`

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
- `PJ` is no longer authored in standard structure; it is assigned during borang creation per prodi
- Soft deletes enabled

### BorangItem
- Maps one indicator to one prodi for operational execution/audit
- Stores per-prodi `pj` and `target_sasaran`
- Used as the source of truth for borang and evidence audit requirement tables
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
| PUT | `/api/v1/auth/profile` | Update own account name |
| PUT | `/api/v1/auth/password` | Update own password |
| POST | `/api/v1/auth/signature` | Upload or replace own virtual signature |
| DELETE | `/api/v1/auth/signature` | Remove own virtual signature |
| GET | `/api/v1/auth/signature/download` | Download own virtual signature |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List users (paginated) |
| POST | `/api/v1/users` | Create user |
| GET | `/api/v1/users/{id}` | Get user details |
| PUT | `/api/v1/users/{id}` | Update user |
| DELETE | `/api/v1/users/{id}` | Soft delete user |
| POST | `/api/v1/users/{id}/force-reset` | Send password reset link |

### RBAC / Permissions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/rbac/matrix` | Get roles plus all permissions |
| POST | `/api/v1/rbac/roles` | Create a new role with optional initial permissions |
| PUT | `/api/v1/rbac/roles/{role}` | Update permissions assigned to a role |
| GET | `/api/v1/rbac/permissions` | List permissions |
| POST | `/api/v1/rbac/permissions` | Create permission using `module.action` shape |
| GET | `/api/v1/rbac/permissions/{permission}` | Get one permission |
| PUT | `/api/v1/rbac/permissions/{permission}` | Update one permission |

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
| PATCH | `/api/v1/standards/{id}/submit` | Submit standard into approval flow |
| PATCH | `/api/v1/standards/{id}/approve` | Approve current stage |
| PATCH | `/api/v1/standards/{id}/reject` | Reject back to revision |
| POST | `/api/v1/standards/{id}/clone` | Clone standard to a new period/name |
| GET | `/api/v1/standards/{id}/metrics/tree` | Get metric hierarchy |

### Metrics
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/metrics` | Create metric |
| PUT | `/api/v1/metrics/{id}` | Update metric |
| DELETE | `/api/v1/metrics/{id}` | Delete metric (cascade) |

### Borang
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/borang/prodis/{prodi}` | List borang items for a prodi |
| POST | `/api/v1/borang` | Create borang item with per-prodi PJ and target |
| DELETE | `/api/v1/borang/{borangItem}` | Delete borang item |

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

## 13. Current State Audit (2026-04-29)

The repository currently contains several additions and implementation details beyond sections above:

### Newly Present Modules / Features
- `RefEducationLevel` module (`app/Modules/Core/Models/RefEducationLevel.php`, controller, seeder)
- `StandardCloneController` for deep clone of standards and metric trees
- Standard lifecycle workflow now uses staged approval fields and actors:
  - `HEAD_LPMI`
  - `WR`
  - `RECTOR`
  - `FINAL`
- Approval actor roles currently present:
  - `Kepala LPMI`
  - `Wakil Rektor 1`
  - `Wakil Rektor 2`
  - `Wakil Rektor 3`
  - `Rektor`
- Notification center now aggregates:
  - audit schedule notifications
  - standard approval notifications per active stage
- Borang module is now an active execution layer:
  - `borang_items` binds indicator + prodi
  - `pj` and `target_sasaran` are filled during borang creation
  - audit requirement tables now derive target from borang, not from standard builder
- Standard builder behavior has been refined:
  - new standards start with an empty tree
  - structure creation flow is now conceptually `Poin Utama -> Sub Poin -> Isi`
  - internal DB type values still remain `Header -> Statement -> Indicator`
  - add/edit UI updates immediately without requiring manual page refresh
- Standard document import is now active:
  - source PDF files are stored on `mst_standards` via:
    - `source_document_path`
    - `source_document_original_name`
    - `source_document_stored_name`
    - `source_document_mime_type`
    - `source_document_size_bytes`
    - `imported_from_document_at`
  - backend import endpoint: `POST /api/v1/standards/import`
  - source document download endpoint: `GET /api/v1/standards/{id}/source-document/download`
  - parser runs server-side using `pdfjs-dist` via `scripts/extract-standard-pdf.mjs`
  - current parser behavior:
    - top-level point uses `1. ...`
    - sub point uses `a. ...` / `b. ...`
    - paragraph content under a sub point becomes one `Isi`
    - numbered list content under a sub point uses `1)` / `2)` and is merged across wrapped PDF lines
  - current parser still uses heuristics and is not yet table-aware in persisted node payloads
- Indicator authoring metadata has been reduced:
  - `IKU` and `IKT` are no longer authored in the standard builder flow
  - standard create/update/import paths no longer populate `iku`/`ikt` for newly created nodes
- Structure validation behavior has changed:
  - warning / submit blocking should only happen when a `Poin Utama` or `Sub Poin` is actually empty
  - a `Sub Poin` with its own textual content is now considered valid even without child `Isi`
- Demo approver accounts now include:
  - `kepala.lpmi@espmi.dev`
  - `wareg1@espmi.dev`
  - `wareg2@espmi.dev`
  - `wareg3@espmi.dev`

### Frontend Libraries Actually Used
- `@tanstack/react-table` used in `resources/js/pages/standards/StandardIndex.jsx`
- `react-toastify` used across auth/layout/standards pages
- `@iconify/react` wrapped by `resources/js/components/ui/Icon.jsx`
- `zustand` is installed in `package.json` but currently not used in `resources/js`

### Additional Frontend Pages / Flows Now Present
- Self-account page is active at `resources/js/pages/account/AccountPage.jsx`
  - route: `/account`
  - supports updating own name, password, and virtual signature
- Role management page remains at:
  - route: `/settings`
  - current focus is `Tambah Role Baru`
- Permission management is now separated into dedicated pages:
  - `resources/js/pages/settings/PermissionIndexPage.jsx`
  - `resources/js/pages/settings/PermissionFormPage.jsx`
  - routes:
    - `/settings/permissions`
    - `/settings/permissions/add`
    - `/settings/permissions/:id/edit`
- Sidebar navigation changed:
  - `Manajemen Pengguna` moved under dropdown `Master`
  - `Manajemen Role` and `Manajemen Permission` live under the same dropdown

### Structural Notes
- There are duplicate/legacy placeholder paths:
  - `app/Http/Controllers/Modules/...`
  - `app/Models/Modules/...`
  These are separate from the active `app/Modules/...` implementation and should be reviewed to avoid confusion.
- `resources/js/pages/standards/StandardTargetConfig.jsx` still exists in the tree, but current product flow no longer uses target input during standard creation.
- `MetricTarget` backend artifacts still exist, but current operational target entry is handled in borang per prodi.
- `resources/js/pages/standards/StandardBuilder.jsx` is the main active UI for manual standard authoring.
- `scripts/extract-standard-pdf.mjs` is the truth source for current PDF parsing heuristics used by document import.
- Existing manually-created standards and imported standards now share the same persisted tree model (`mst_metrics`), but import-specific parsing rules only apply during file import.

### Audit Report Export Notes
- Active export implementation lives in:
  - `app/Modules/Audit/Controllers/AuditReportController.php`
  - `app/Modules/Audit/Services/AuditReportExportService.php`
  - `resources/js/pages/report/ReportDetailPage.jsx`
- Supported AMI report export formats are now only:
  - `.docx`
  - `.pdf`
- Legacy `.doc` export has been intentionally removed from AMI report export options and backend validation.
- `.docx` export currently uses `PhpWord`, not a `.docx` template processor.
- The Word cover layout is intentionally left-aligned for logo and title text, matching the current approved output rather than the earlier centered draft.
- Current logo source of truth for AMI report export:
  - `public/logo-uim.png`
- Current PDF-specific logo fallback:
  - `public/logo-uim-pdf.jpg`
  - This exists to avoid Dompdf PNG rendering failures on environments without the PHP `gd` extension.
- Known root causes that were already encountered and fixed in AMI export:
  1. `PhpWord` output escaping was disabled by default, causing raw XML characters such as `&` to corrupt `word/document.xml`.
     - Fix applied: `Settings::setOutputEscapingEnabled(true)` before document generation.
  2. `PhpWord` emitted invalid OOXML for some zero-width borders.
     - Fix applied: post-save zip patching in `patchDocxBorders()`.
  3. Wrong logo assets in `public/` caused Word export to embed an unrelated image even when layout was correct.
     - Fix applied: export now resolves `public/logo-uim.png` first.
  4. Dompdf failed with `The PHP GD extension is required, but is not installed.` when rendering PNG logo assets.
     - Fix applied: PDF export uses `public/logo-uim-pdf.jpg` through `resolvePdfLogoPath()`.
  5. Old Word-specific asset override files (`*-word.png`, `*-word.jpg`) could accidentally override the intended logo.
     - Current safeguard: `prepareWordImagePath()` returns `logo-uim.png` directly when that exact asset is the source path.
- AMI export layout decisions currently in force:
  - Cover logo is placed above the title.
  - Cover title block is left-aligned in `.docx` and `.pdf`.
  - `Ketua Auditor` row is intentionally formatted like `Anggota Auditor`: one merged cell containing `Nama`, unit label (`Program Studi` / `Fakultas`), and `Telp.`.
- If the exported `.docx` opens but shows the wrong image above `LAPORAN`, first verify the actual packaged file under `word/media/section_image1.*` before changing layout code.
- If the exported `.pdf` fails on image rendering again, check whether a PNG path re-entered the Dompdf path; prefer JPEG assets on environments without `gd`.
- `lap-ami-fe.docx` under `documents/examples/` is useful as a visual reference, but the current AMI export is not template-based and should not assume its embedded media assets are directly reusable via `PhpWord::addImage()`.
- Recommended maintenance rule:
  - Treat AMI export asset problems as a source-path / renderer-compatibility issue first, not a table/layout issue.

### Risks / Inconsistencies To Address
1. **Model namespace mismatch**
   - `MstStandard::submitter()` and `approver()` reference `App\Modules\Core\Models\User`, while active user model is `App\Models\User`.
2. **Metric target FK type mismatch**
   - `metric_targets.metric_id` is `uuid`, but `mst_metrics.id` is `bigint`.
3. **JWT vs token cleanup call**
   - `UserController::destroy()` calls `$user->tokens()->delete()` although authentication uses JWT (`tymon/jwt-auth`) and `User` does not include Sanctum token relation.
4. **RBAC guard consistency**
   - Seeder writes roles/permissions with `guard_name = web`, while API auth guard is `api` (JWT). Re-check permission middleware strategy to prevent guard mismatch behavior.
5. **Legacy target flow still partially present**
   - `MetricTarget` APIs and `StandardTargetConfig.jsx` remain in the codebase even though current UX expects target entry during borang creation.
6. **Testing depth**
   - Current tests remain shallow relative to the approval workflow, borang flow, and notification logic.
7. **Export parity for published manual standards**
   - Next required work: if a standard is created manually in the system, already `TERBIT`, and exported, the export output must support table sections like the approval/signature table shown by the user example, not only plain text blocks.
   - This requirement applies even when the standard was not created via PDF upload.
8. **Table preservation during import/export**
   - Current import parser is text-structure aware, but table structures in PDF content are not yet persisted as explicit table payloads inside node content.
   - Future export work should account for both:
     - manually-authored standards that need rendered tables in exported output
     - imported standards whose source documents may contain tables that should remain table-shaped in exported output
9. **Legacy IKU/IKT references remain outside standard builder**
   - Borang/audit/report pages still contain `IKU`/`IKT` references in some tables and filters even though builder authoring has removed them from new standard node creation.
10. **Seeder mismatch still present**
   - Full `DatabaseSeeder` can still fail on PostgreSQL environments if legacy seed data uses old standard categories such as `SN-Dikti` that no longer satisfy the current DB constraint / category mapping.
11. **Standard governance roles vs approval logic**
   - New governance roles (`Pemeriksa`, `Persetujuan`, `Pertimbangan`, `Pengendalian`) now exist for account assignment and RBAC management, but current approval controller logic is still hardcoded to role names like `Kepala LPMI`, `Wakil Rektor 1/2/3`, and `Rektor`.
12. **Role page naming drift**
   - `resources/js/pages/settings/PermissionMatrixPage.jsx` is no longer a matrix-style page in practice; it now acts as the role creation page for `/settings`.
13. **AMI export implementation complexity**
   - `AuditReportExportService` now contains several renderer-specific workarounds for Word and PDF compatibility.
   - Future refactor should separate:
     - shared report content/context assembly
     - Word rendering
     - PDF rendering
     - asset resolution / compatibility handling

### Quick Verification Paths
- API routing truth source: `routes/api.php`
- SPA routing truth source: `resources/js/components/MainApp.jsx`
- Auth flow: `app/Modules/Core/Controllers/AuthController.php`, `resources/js/store/authSlice.js`, `resources/js/services/api.js`
- Self-account UI flow:
  - `resources/js/pages/account/AccountPage.jsx`
  - `app/Modules/Core/Controllers/AuthController.php`
- Role / permission management flow:
  - `app/Modules/Core/Controllers/RolePermissionController.php`
  - `resources/js/pages/settings/PermissionMatrixPage.jsx`
  - `resources/js/pages/settings/PermissionIndexPage.jsx`
  - `resources/js/pages/settings/PermissionFormPage.jsx`
- Standard import logic:
  - `app/Modules/Standard/Controllers/StandardController.php`
  - `app/Modules/Standard/Services/StandardDocumentImportService.php`
  - `scripts/extract-standard-pdf.mjs`
- Standard builder validation / authoring:
  - `app/Modules/Standard/Controllers/MetricController.php`
  - `app/Modules/Standard/Models/MstStandard.php`
  - `resources/js/pages/standards/StandardBuilder.jsx`
- AMI export verification:
  - `app/Modules/Audit/Controllers/AuditReportController.php`
  - `app/Modules/Audit/Services/AuditReportExportService.php`
  - `resources/js/pages/report/ReportDetailPage.jsx`
  - `public/logo-uim.png`
  - `public/logo-uim-pdf.jpg`
  - `documents/examples/lap-ami-fe.docx`

---

*Last Updated: 2026-05-30*
