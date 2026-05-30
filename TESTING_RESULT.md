# Testing Result

Dokumen ini mencatat hasil eksekusi testing **black-box** pada proyek E-SPMI.

## Informasi Eksekusi

| Item | Nilai |
|------|-------|
| Tanggal | 30 Mei 2026 |
| Repository | `spmi-management` |
| Metode | `Black-box testing` |
| Engine | `PHPUnit` via `php artisan test` |
| Database testing | `sqlite` |
| Database target | `:memory:` |

## Ruang Lingkup Metode

| Area | Pendekatan |
|------|------------|
| API endpoint | Black-box |
| Workflow bisnis | Black-box |
| RBAC | Black-box |
| Export endpoint | Black-box |
| UI visual export | Tidak diuji otomatis pada run ini |

## Command yang Dijalankan

| No | Command | Tujuan |
|----|---------|--------|
| 1 | `composer test:feature` | Menjalankan seluruh feature test black-box |
| 2 | `composer test:rbac` | Menjalankan suite black-box RBAC |
| 3 | `composer test:workflow` | Menjalankan suite black-box workflow inti |

## Ringkasan Hasil

| Suite | Status | Passed | Failed | Catatan |
|------|--------|--------|--------|---------|
| `composer test:feature` | FAILED | 1 | 16 | Terhenti oleh error migration SQLite |
| `composer test:rbac` | FAILED | 0 | 3 | Terhenti oleh error migration SQLite |
| `composer test:workflow` | FAILED | 0 | 11 | Terhenti oleh error migration SQLite |

## Detail Hasil per Suite

### 1. Feature Suite

| Test / Grup | Status | Keterangan |
|-------------|--------|------------|
| `Tests\Feature\ExampleTest` | PASS | Response aplikasi dasar berhasil |
| `Tests\Feature\EvidenceReviewTest` | FAIL | Gagal sebelum assertion bisnis karena migration SQLite |
| `Tests\Feature\EvidenceUploadTest` | FAIL | Gagal sebelum assertion bisnis karena migration SQLite |
| `Tests\Feature\PtkWorkflowTest` | FAIL | Gagal sebelum assertion bisnis karena migration SQLite |
| `Tests\Feature\RbacMatrixTest` | FAIL | Gagal sebelum assertion bisnis karena migration SQLite |
| `Tests\Feature\StandardApprovalTest` | FAIL | Gagal sebelum assertion bisnis karena migration SQLite |
| `Tests\Feature\StandardDocumentImportTest` | FAIL | Gagal sebelum assertion bisnis karena migration SQLite |
| `Tests\Feature\StandardExportTest` | FAIL | Gagal sebelum assertion bisnis karena migration SQLite |
| `Tests\Feature\StandardStructureValidationTest` | FAIL | Gagal sebelum assertion bisnis karena migration SQLite |

### 2. RBAC Suite

| Test | Status | Keterangan |
|------|--------|------------|
| `superadmin bypasses gate checks` | FAIL | Gagal pada migration SQLite |
| `authorized user can view rbac matrix` | FAIL | Gagal pada migration SQLite |
| `authorized user can update role permissions` | FAIL | Gagal pada migration SQLite |

### 3. Workflow Suite

| Test | Status | Keterangan |
|------|--------|------------|
| `StandardApprovalTest` | FAIL | Gagal pada migration SQLite |
| `EvidenceUploadTest` | FAIL | Gagal pada migration SQLite |
| `EvidenceReviewTest` | FAIL | Gagal pada migration SQLite |
| `PtkWorkflowTest` | FAIL | Gagal pada migration SQLite |
| `StandardExportTest` | FAIL | Gagal pada migration SQLite |
| `StandardDocumentImportTest` | FAIL | Gagal pada migration SQLite |

## Akar Masalah yang Ditemukan

| Item | Nilai |
|------|-------|
| File migration | `database/migrations/2026_05_27_210000_expand_activity_log_action_column.php` |
| Query bermasalah | `ALTER TABLE activity_logs ALTER COLUMN action TYPE VARCHAR(100)` |
| Engine yang gagal | `SQLite` |
| Error | `SQLSTATE[HY000]: General error: 1 near "ALTER": syntax error` |

## Dampak terhadap Validitas Hasil

| Aspek | Status | Penjelasan |
|-------|--------|------------|
| Black-box suite berhasil dieksekusi | Ya | Command test berjalan dan menghasilkan output |
| Black-box assertions bisnis tervalidasi penuh | Tidak | Test berhenti di layer migration |
| Failure merepresentasikan bug bisnis | Tidak langsung | Failure saat ini didominasi blocker environment test |
| Failure merepresentasikan bug kompatibilitas test env | Ya | SQLite tidak kompatibel dengan migration saat ini |

## Kesimpulan

| Poin | Hasil |
|------|-------|
| Metode yang dipakai | Black-box testing |
| Hasil suite saat ini | Belum lulus |
| Blocker utama | Migration PostgreSQL-style tidak kompatibel dengan SQLite in-memory |
| Status akhir | Perlu perbaikan environment test sebelum evaluasi logic bisnis lanjutan |

## Rekomendasi Tindak Lanjut

| Prioritas | Tindakan |
|----------|----------|
| 1 | Perbaiki migration `2026_05_27_210000_expand_activity_log_action_column.php` agar kompatibel dengan SQLite |
| 2 | Jalankan ulang `composer test:blackbox` |
| 3 | Jalankan ulang `composer test:rbac` |
| 4 | Jalankan ulang `composer test:workflow` |
| 5 | Update dokumen hasil testing setelah blocker migration selesai |

## Catatan Tambahan

| Item | Catatan |
|------|---------|
| Warning PHP | `Module "pgsql" is already loaded` muncul saat command PHP dijalankan |
| Dampak warning | Bukan penyebab utama kegagalan suite |

