# Testing Strategy E-SPMI

Dokumen ini menjelaskan metode testing yang paling cocok untuk proyek E-SPMI berdasarkan arsitektur Laravel + React, modul bisnis, dan workflow PPEPP yang ada saat ini.

## 1. Prinsip Utama

E-SPMI bukan aplikasi CRUD biasa. Area paling berisiko ada pada:

- workflow approval standar
- upload dan review bukti
- lifecycle PTK
- locking audit period
- export dokumen
- RBAC dan pembatasan akses role

Karena itu, metode testing resmi yang dipakai untuk proyek ini adalah **black-box testing**.

Artinya yang diuji adalah:

1. input
2. output
3. status response
4. perubahan state sistem
5. pembatasan akses role
6. hasil file yang diproduksi sistem

Tanpa mengandalkan detail implementasi internal sebagai basis pengujian utama.

## 2. Bentuk Black-Box Test yang Dipakai

### A. Feature Test

Ini adalah lapisan utama backend.

Gunakan untuk menguji:

- request API
- response JSON
- validasi permission
- perubahan database
- side effect penting

Contoh area utama:

- auth
- standard lifecycle
- borang evidence upload
- evidence review
- PTK
- report export
- role/permission management

### B. Workflow Test

Untuk E-SPMI, ini lapisan paling penting.

Workflow test menguji satu alur bisnis lengkap, misalnya:

- draft standar -> submit -> approve -> terbit
- upload bukti -> review auditor -> reject -> PTK -> respond -> verify -> close
- audit period approval oleh lead auditor dan auditor
- audit ended -> borang locked

Workflow test bisa tetap ditulis sebagai feature test, tetapi dipisahkan secara tujuan.

### C. Manual UAT

Masih diperlukan untuk:

- layout export `.docx` / `.pdf`
- tampilan halaman kompleks
- sticky header dialog
- active state sidebar
- visual locked state
- cross-role UI visibility

Area ini tetap black-box karena yang dinilai adalah perilaku dan hasil akhir yang terlihat user.

## 3. Layer Testing yang Cocok untuk Repo Ini

### Layer 1: Fast Gate

Jalankan di setiap perubahan kecil:

- `npm run build`
- black-box feature test modul yang disentuh

Tujuan:

- menangkap regresi lokal cepat

### Layer 2: Module Gate

Jalankan saat menyentuh satu domain fitur:

- `standards`
- `evidence`
- `ptk`
- `audit`
- `report`
- `rbac`

Tujuan:

- memverifikasi satu modul tetap aman setelah perubahan

### Layer 3: Workflow Gate

Jalankan sebelum merge besar atau rilis:

- alur standar
- alur audit
- alur PTK
- alur export

Tujuan:

- memastikan integrasi bisnis lintas modul tetap utuh

### Layer 4: Release UAT

Checklist manual sebelum deploy:

- login per role utama
- upload bukti
- review audit
- buat PTK
- close audit period
- export laporan audit
- export standar

## 4. Prioritas Area yang Wajib Punya Test

Urutan prioritas untuk E-SPMI:

1. `RBAC`
2. `Standard approval flow`
3. `Evidence upload + review`
4. `PTK lifecycle`
5. `Audit period closure rules`
6. `Export document response`
7. `Document import parser`

## 5. Pembagian Jenis Test per Modul

### Auth & Account

Wajib dites:

- login sukses/gagal
- user inactive tidak bisa login
- ubah nama sendiri
- ubah password sendiri
- upload/hapus tanda tangan virtual

### RBAC

Wajib dites:

- role creation
- permission creation
- role assignment
- route forbidden bila permission tidak ada
- role khusus seperti `Perumus` tetap terbatas

### Standard

Wajib dites:

- create standard
- submit standard
- approve/reject standard
- review stage transition
- structure validation
- improvement notes logic

### Borang / Evidence

Wajib dites:

- upload bukti file
- upload bukti link
- review accepted
- reject tanpa komentar harus gagal
- reject dengan PTK
- locked state setelah audit ended

### PTK

Wajib dites:

- create PTK
- respond PTK
- verify PTK
- close PTK
- target date acceptance/rejection

### Audit

Wajib dites:

- create audit schedule
- duplicate auditor restriction
- detail audit per prodi
- end audit period butuh dua approval
- audit tidak boleh ditutup jika masih ada PTK aktif
- audit tidak boleh ditutup jika masih ada item belum final review

### Report Export

Wajib dites:

- endpoint export mengembalikan file
- content type sesuai format
- filename sesuai
- export hanya untuk user berizin

Catatan:

- validasi visual `.docx/.pdf` tetap manual
- automated test cukup memastikan file terbentuk dan tidak kosong

## 6. Metode Testing yang Direkomendasikan

### A. Backend Automated

Pakai:

- PHPUnit Feature Test
- SQLite in-memory untuk test cepat

Kelebihan:

- cepat
- mudah masuk CI
- cocok untuk rule business logic yang diekspos lewat API dan workflow

### B. Snapshot / Structural Export Check

Untuk export dokumen, metode yang cocok bukan pixel-perfect.

Gunakan pemeriksaan:

- response status
- content type
- file size tidak kosong
- zip `.docx` bisa dibuka
- XML penting valid

Untuk `.pdf`:

- header `%PDF`
- ukuran file > minimum wajar

### C. Manual Visual Comparison

Untuk output laporan audit dan standar:

- buka file hasil export
- bandingkan dengan template institusi
- cek logo
- cek tabel
- cek tanda tangan
- cek pagination kasar

Ini wajib karena layout Word/PDF tidak realistis diuji penuh via assertion biasa.

## 7. Struktur Suite yang Disarankan

Repo ini cocok memakai 4 mode eksekusi black-box:

### `test:blackbox`

Untuk:

- seluruh feature test black-box utama

### `test:feature`

Untuk:

- seluruh endpoint per modul

### `test:workflow`

Untuk:

- alur bisnis utama end-to-end backend

### `test`

Untuk:

- suite black-box default sebelum merge biasa

## 8. Kapan Menulis Regression Test

Setiap bug nyata yang pernah muncul sebaiknya diberi test regresi, terutama untuk kasus:

- export `.docx` rusak
- export `.pdf` gagal parse
- filter dropdown flick back
- audit close rule salah
- role leakage
- view readonly tapi masih bisa mutate

Aturan praktis:

- bug sekali muncul di produksi atau QA
- bug bisa diulang
- bug menyentuh workflow inti

Maka tambahkan regression test.

## 9. Standar Penulisan Test

Gunakan pola:

- nama test menjelaskan perilaku
- satu test fokus pada satu rule bisnis
- helper factory/fixture dipakai ulang
- role/permission di-setup jelas
- assertion harus mencakup:
  - response
  - database
  - side effect penting

Contoh penamaan:

- `test_auditor_must_provide_comment_when_rejecting_evidence`
- `test_audit_period_cannot_be_closed_when_open_ptk_exists`
- `test_perumus_cannot_access_user_management`

## 10. Checklist Minimal Sebelum Merge

Untuk perubahan backend biasa:

- syntax check file yang diubah
- `npm run build`
- unit test terkait
- feature test terkait modul

Untuk perubahan workflow besar:

- semua di atas
- workflow test terkait
- manual UAT per role utama

Untuk perubahan export:

- semua di atas
- generate file `.doc/.docx/.pdf`
- buka manual file hasil export

## 11. Kondisi Repo Saat Ini

Repo saat ini sudah punya pondasi test yang benar untuk dijadikan base:

- `StandardApprovalTest`
- `EvidenceUploadTest`
- `EvidenceReviewTest`
- `PtkWorkflowTest`
- `StandardExportTest`
- `StandardDocumentImportTest`
- `RbacMatrixTest`

Artinya metode yang cocok bukan ganti framework, tetapi:

- memperluas coverage
- memisahkan layer eksekusi
- menambah regression test untuk bug nyata

## 12. Rekomendasi Implementasi Praktis

Metode testing terbaik untuk proyek ini adalah:

1. `Black-box feature test` sebagai engine utama backend
2. `Workflow test` sebagai suite khusus untuk proses bisnis inti
3. `Manual black-box UAT` untuk export dan UI kompleks
4. setiap bug besar harus ditutup dengan regression test black-box

Singkatnya:

- gunakan automation black-box untuk API dan workflow
- gunakan manual black-box verification untuk layout dokumen
- prioritaskan workflow inti, bukan coverage angka semata
