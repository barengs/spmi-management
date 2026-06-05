# Credentials

Dokumen ini berisi daftar akun default yang dibuat oleh `UserOnlySeeder`.

Command seeding:

```bash
php artisan db:seed --class=UserOnlySeeder
```

Password default semua akun:

```text
Password@123
```

## Daftar Akun

| No. | Nama | Email | Role |
|---:|---|---|---|
| 1 | Administrator E-SPMI | `admin@espmi.dev` | SuperAdmin |
| 2 | Admin LPM | `lpm@espmi.dev` | LPM-Admin |
| 3 | Perumus Standar | `perumus@espmi.dev` | Perumus |
| 4 | Pemeriksa Standar | `pemeriksa@espmi.dev` | Pemeriksa |
| 5 | Persetujuan Standar | `persetujuan@espmi.dev` | Persetujuan |
| 6 | Pertimbangan Standar | `pertimbangan@espmi.dev` | Pertimbangan |
| 7 | Pengendalian Standar | `pengendalian@espmi.dev` | Pengendalian |
| 8 | Kepala LPMI | `kepala.lpmi@espmi.dev` | Kepala LPMI |
| 9 | Wakil Rektor 1 | `wareg1@espmi.dev` | Wakil Rektor 1 |
| 10 | Wakil Rektor 2 | `wareg2@espmi.dev` | Wakil Rektor 2 |
| 11 | Wakil Rektor 3 | `wareg3@espmi.dev` | Wakil Rektor 3 |
| 12 | Rektor | `rektor@espmi.dev` | Rektor |
| 13 | Auditor | `auditor@espmi.dev` | Auditor |
| 14 | Lead Auditor | `lead.auditor@espmi.dev` | Lead Auditor |
| 15 | Auditee | `auditee@espmi.dev` | Auditee |
| 16 | Pimpinan | `pimpinan@espmi.dev` | Pimpinan |
| 17 | Observer | `observer@espmi.dev` | Observer |

## Catatan

- Akun dibuat aktif (`is_active = true`).
- Seeder aman dijalankan ulang karena menggunakan `updateOrCreate`.
- User yang pernah dihapus secara soft delete akan di-restore saat seeder dijalankan ulang.
