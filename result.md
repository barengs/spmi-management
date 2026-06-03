# Hasil Pengujian Unit Testing

Tanggal eksekusi: `2026-06-03`  
Command utama: `php artisan test --testsuite=Unit`

## Ringkasan

| Jenis Pengujian | Status | Jumlah Test | Jumlah Assertion | Durasi |
|---|---|---:|---:|---:|
| Unit | PASS with 1 skipped | 5 | 26 | 0.20s |

Kesimpulan umum:
- Fokus pengujian saat ini adalah `Unit Testing` saja.
- Hasil aktual suite unit: `4 passed`, `1 skipped`, `26 assertions`.

## Tabel 1. Hasil Pengujian Unit Testing

| No. | Skenario Pengujian | Test Case | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
|---|---|---|---|---|---|
| 1 | Service export audit menyimpan file DOCX dan melakukan escape karakter XML spesial dengan benar | Menjalankan `saveDocx()` pada `AuditReportExportService` dengan konten yang mengandung karakter spesial XML | Dokumen DOCX tetap valid dan karakter XML spesial tidak merusak `word/document.xml` | Test `save docx escapes xml special characters in generated document` lulus | Valid / Sesuai harapan |
| 2 | Service export audit tetap valid saat signature WebP dipakai pada environment yang mendukung | Menjalankan `saveDocx()` dengan signature WebP | Dokumen tetap valid ketika dependency environment mendukung pemrosesan WebP | Test `save docx keeps document valid when signature is webp` berstatus `skipped` karena dependency `GD WebP` tidak tersedia di environment lokal | Skip / Bergantung environment |
| 3 | Service import standar membangun tree dari teks hasil ekstraksi dengan struktur poin, sub poin, dan isi | Menjalankan `buildTreeFromExtractedText()` pada `StandardDocumentImportService` dengan teks terstruktur | Sistem membentuk struktur `Header -> Statement -> Indicator` sesuai format poin | Test `build tree from extracted text uses point subpoint and content structure` lulus | Valid / Sesuai harapan |
| 4 | Service import standar mendukung pola section template tanpa header numerik | Menjalankan `buildTreeFromExtractedText()` dengan gaya template section | Sistem tetap membentuk tree standar walaupun dokumen memakai section template non-numerik | Test `build tree from extracted text supports template style sections without numeric headers` lulus | Valid / Sesuai harapan |
| 5 | Baseline unit test framework berjalan normal | Menjalankan `ExampleTest` | Assertion dasar berhasil dijalankan | Test `that true is true` lulus | Valid / Sesuai harapan |

## Keterangan Hasil Aktual

- Files:
  - `tests/Unit/AuditReportExportServiceTest.php`
  - `tests/Unit/StandardDocumentImportServiceTest.php`
  - `tests/Unit/ExampleTest.php`
- Result: `4 passed, 1 skipped`
- Assertions: `26 assertions`
- Duration: `0.20s`

## Catatan Environment

Saat test dijalankan, environment lokal menampilkan warning:

- `PHP Warning: Module "pgsql" is already loaded in Unknown on line 0`

Status:
- Warning ini tidak menyebabkan pengujian gagal.
- Hasil akhir unit testing tetap `PASS`.
