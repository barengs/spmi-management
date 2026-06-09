# E-SPMI Use Case Role Map

Dokumen ini memetakan fitur per role pengguna di sistem E-SPMI. Format dibuat prompt-ready agar bisa langsung dipakai untuk membuat use case diagram, use case narrative, atau matriks hak akses.

## Scope Sistem

- Sistem: E-SPMI Universitas Islam Madura
- Fokus: aktor, fitur yang dapat diakses, dan aksi utama per role
- Pelaksanaan: sudah dihapus dari menu, route frontend, dan route API
- Bahasa use case: Indonesia
- Tidak memetakan detail database internal

## Modul Aktif

- Autentikasi
- Dashboard
- Akun Saya
- Notifikasi
- Manajemen Pengguna
- Manajemen Role
- Manajemen Permission
- Master Fakultas
- Master Prodi
- Pengaturan Siklus
- Standar
- Import Dokumen Standar DOCX
- Edit Struktur Standar
- Indikator IKU/IKT
- Approval Standar
- Borang
- Jadwal Audit
- Audit AMI
- Evidence / Bukti Dukung
- PTK / Tindak Koreksi
- Laporan Audit
- Export Standar DOCX
- Export Laporan Audit DOCX/PDF

## Role And Feature Lineup

### 1. SuperAdmin

Fitur:
- Login ke sistem
- Melihat dashboard
- Mengelola akun sendiri
- Melihat notifikasi sistem
- Mengelola pengguna
- Membuat pengguna
- Mengubah pengguna
- Menghapus pengguna
- Mengelola role
- Mengelola permission
- Mengelola master fakultas
- Mengelola master prodi
- Mengelola pengaturan siklus
- Melihat semua standar
- Membuat standar manual
- Import dokumen standar DOCX
- Mengubah informasi standar
- Menghapus standar draft yang belum diterapkan
- Mengedit struktur standar
- Mengelola bentuk konten standar: poin-poin, teks panjang, tabel
- Mengelola indikator IKU/IKT
- Mengajukan standar ke approval
- Menyetujui standar di semua tahap jika diperlukan
- Menolak standar ke revisi
- Membuat revisi standar terbit
- Melihat dokumen sumber standar
- Export standar DOCX
- Mengelola borang
- Melihat jadwal audit
- Mengelola jadwal audit
- Melihat audit AMI
- Melakukan review evidence audit jika memiliki konteks audit
- Melihat PTK
- Membuat PTK
- Memverifikasi PTK
- Menutup PTK
- Melihat laporan audit
- Export laporan audit DOCX/PDF

Use case utama:
- Administrasi penuh sistem E-SPMI
- Mengatur data master dan hak akses
- Mengelola siklus standar, audit, borang, PTK, dan laporan

### 2. LPM-Admin

Fitur:
- Login ke sistem
- Melihat dashboard
- Mengelola akun sendiri
- Melihat notifikasi
- Melihat pengguna
- Melihat master unit sesuai permission
- Melihat standar
- Membuat standar manual
- Import dokumen standar DOCX
- Mengubah informasi standar
- Menghapus standar sesuai permission
- Mengedit struktur standar
- Mengajukan standar ke approval
- Membuat revisi standar
- Export standar DOCX
- Mengelola borang
- Melihat jadwal audit
- Membuat jadwal audit
- Mengatur plot audit jika diizinkan
- Melihat audit AMI
- Membuat temuan audit jika diizinkan
- Melihat PTK
- Membuat PTK
- Menutup PTK
- Melihat laporan audit
- Export laporan audit DOCX/PDF
- Melihat audit log sistem jika diberi akses

Use case utama:
- Administrasi mutu operasional
- Menyiapkan standar, borang, audit, dan laporan

### 3. Perumus

Fitur:
- Login ke sistem
- Melihat dashboard perumus
- Mengelola akun sendiri
- Melihat daftar standar yang dapat disusun
- Membuat standar manual
- Import dokumen standar DOCX
- Mengisi informasi standar
- Mengubah informasi standar saat draft atau revisi
- Mengedit struktur standar
- Menambah poin utama
- Menambah isi/sub poin
- Memilih bentuk konten: poin-poin, teks panjang, tabel
- Mengisi tabel dengan teks pengantar dan catatan tabel opsional
- Mengelola indikator IKU/IKT
- Mengajukan standar ke proses approval
- Melihat riwayat standar
- Melihat dokumen sumber standar
- Export standar draft/revisi DOCX jika diizinkan

Use case utama:
- Menyusun standar mutu
- Mengubah struktur dan isi standar sebelum diajukan

### 4. Pemeriksa

Fitur:
- Login ke sistem
- Melihat dashboard
- Mengelola akun sendiri
- Melihat notifikasi terkait standar
- Melihat daftar standar
- Melihat detail standar
- Melihat tab informasi standar
- Melihat tab indikator
- Melihat struktur standar
- Melihat riwayat standar
- Melihat dokumen sumber standar

Use case utama:
- Melakukan pemeriksaan baca-saja terhadap dokumen standar

### 5. Persetujuan

Fitur:
- Login ke sistem
- Melihat dashboard
- Mengelola akun sendiri
- Melihat notifikasi terkait approval
- Melihat daftar standar
- Melihat detail standar
- Melihat informasi dan struktur standar
- Melihat dokumen sumber standar

Use case utama:
- Role governance approval-facing secara baca-saja
- Approval eksekusi tetap dilakukan oleh role struktural: Kepala LPMI, Wakil Rektor, dan Rektor

### 6. Pertimbangan

Fitur:
- Login ke sistem
- Melihat dashboard
- Mengelola akun sendiri
- Melihat notifikasi
- Melihat daftar standar
- Melihat detail standar
- Melihat riwayat standar
- Melihat dokumen sumber standar

Use case utama:
- Memberikan pertimbangan berbasis akses baca terhadap standar

### 7. Pengendalian

Fitur:
- Login ke sistem
- Melihat dashboard
- Mengelola akun sendiri
- Melihat notifikasi
- Melihat daftar standar
- Melihat detail standar
- Melihat struktur standar
- Melihat riwayat standar
- Melihat laporan jika diberi permission

Use case utama:
- Monitoring dan pengendalian mutu secara baca-saja

### 8. Kepala LPMI

Fitur:
- Login ke sistem
- Melihat dashboard
- Mengelola akun sendiri
- Melihat notifikasi approval standar
- Melihat daftar standar
- Melihat standar yang menunggu approval Kepala LPMI
- Melihat detail standar
- Melihat informasi, indikator, struktur, riwayat, dan dokumen standar
- Menyetujui standar pada tahap Kepala LPMI
- Menolak standar ke revisi
- Melihat jadwal audit
- Melihat laporan audit
- Export laporan audit jika diberi permission

Use case utama:
- Approval standar tahap awal

### 9. Wakil Rektor 1

Fitur:
- Login ke sistem
- Melihat dashboard
- Mengelola akun sendiri
- Melihat notifikasi approval standar
- Melihat daftar standar
- Melihat standar kategori yang dipetakan ke WR1
- Melihat detail standar
- Melihat informasi, indikator, struktur, riwayat, dan dokumen standar
- Menyetujui standar pada tahap Wakil Rektor 1
- Menolak standar ke revisi
- Melihat laporan audit jika diberi permission

Use case utama:
- Approval standar tahap Wakil Rektor untuk kategori WR1

### 10. Wakil Rektor 2

Fitur:
- Login ke sistem
- Melihat dashboard
- Mengelola akun sendiri
- Melihat notifikasi approval standar
- Melihat daftar standar
- Melihat standar kategori yang dipetakan ke WR2
- Melihat detail standar
- Melihat informasi, indikator, struktur, riwayat, dan dokumen standar
- Menyetujui standar pada tahap Wakil Rektor 2
- Menolak standar ke revisi
- Melihat laporan audit jika diberi permission

Use case utama:
- Approval standar tahap Wakil Rektor untuk kategori WR2

### 11. Wakil Rektor 3

Fitur:
- Login ke sistem
- Melihat dashboard
- Mengelola akun sendiri
- Melihat notifikasi approval standar
- Melihat daftar standar
- Melihat standar kategori yang dipetakan ke WR3
- Melihat detail standar
- Melihat informasi, indikator, struktur, riwayat, dan dokumen standar
- Menyetujui standar pada tahap Wakil Rektor 3
- Menolak standar ke revisi
- Melihat laporan audit jika diberi permission

Use case utama:
- Approval standar tahap Wakil Rektor untuk kategori WR3

### 12. Rektor

Fitur:
- Login ke sistem
- Melihat dashboard
- Mengelola akun sendiri
- Melihat notifikasi approval standar
- Melihat daftar standar
- Melihat standar yang menunggu approval final
- Melihat detail standar
- Melihat informasi, indikator, struktur, riwayat, dan dokumen standar
- Menyetujui final standar
- Menolak standar ke revisi
- Memicu standar menjadi TERBIT setelah approval final
- Melihat laporan audit jika diberi permission

Use case utama:
- Approval final standar

### 13. Pimpinan

Fitur:
- Login ke sistem
- Melihat dashboard ringkasan
- Mengelola akun sendiri
- Melihat notifikasi
- Melihat daftar standar
- Melihat detail standar
- Melihat audit dan skor secara baca-saja
- Melihat laporan audit
- Export laporan audit DOCX/PDF

Use case utama:
- Konsumsi informasi untuk pengambilan keputusan pimpinan

### 14. Auditor

Fitur:
- Login ke sistem
- Melihat dashboard
- Mengelola akun sendiri
- Melihat notifikasi audit dan PTK
- Melihat standar secara baca-saja
- Melihat borang dan audit requirement
- Melihat jadwal audit yang terkait
- Melakukan audit AMI
- Melihat evidence auditee
- Memberi skor audit
- Membuat temuan audit
- Mengubah temuan audit jika diizinkan
- Membuat PTK dari hasil audit
- Melihat daftar PTK yang terkait dengan akunnya
- Memverifikasi PTK
- Menutup PTK jika sudah selesai
- Melihat laporan audit

Use case utama:
- Melaksanakan audit AMI
- Menghasilkan temuan dan PTK

### 15. Lead Auditor

Fitur:
- Login ke sistem
- Melihat dashboard
- Mengelola akun sendiri
- Melihat notifikasi audit dan PTK
- Melihat standar secara baca-saja
- Melihat borang dan audit requirement
- Melihat jadwal audit yang terkait
- Melakukan audit AMI
- Melihat evidence auditee
- Memberi skor audit
- Membuat temuan audit
- Mengubah temuan audit jika diizinkan
- Membuat PTK dari hasil audit
- Melihat daftar PTK yang terkait dengan akunnya
- Memverifikasi PTK
- Menutup PTK jika sudah selesai
- Melihat laporan audit

Use case utama:
- Memimpin atau menjalankan proses audit AMI dengan kapabilitas seperti Auditor

### 16. Auditee

Fitur:
- Login ke sistem
- Melihat dashboard
- Mengelola akun sendiri
- Melihat notifikasi audit dan PTK
- Melihat standar secara baca-saja
- Melihat jadwal audit yang terkait
- Melihat borang untuk unit/prodi terkait
- Upload evidence/bukti dukung
- Menghapus evidence miliknya jika masih diizinkan
- Melihat review evidence
- Melihat PTK yang ditujukan kepadanya
- Memberi respons PTK
- Menyetujui target tanggal koreksi PTK
- Menolak target tanggal koreksi PTK
- Melihat laporan audit yang terkait jika diberi permission

Use case utama:
- Menyiapkan bukti audit dan menindaklanjuti PTK

### 17. Observer

Fitur:
- Login ke sistem
- Melihat dashboard
- Mengelola akun sendiri
- Melihat daftar standar secara baca-saja
- Melihat audit secara baca-saja
- Melihat laporan audit secara baca-saja

Use case utama:
- Observasi sistem dengan akses minimal

## Use Case Prompt-Ready Summary

Gunakan teks berikut jika ingin langsung membuat use case diagram dengan AI:

```text
Create a use case diagram for E-SPMI, an Internal Quality Assurance System.

Actors and feature access:

SuperAdmin: login, dashboard, manage own account, notifications, manage users, manage roles, manage permissions, manage faculties, manage prodis, manage cycle settings, view/create/import/update/delete standards, edit standard structure, manage standard content formats, manage IKU/IKT indicators, submit standards, approve standards, reject standards, revise published standards, view source documents, export standard DOCX, manage borang, manage audit schedules, view audit AMI, review evidence if assigned, manage PTK, view reports, export audit reports.

LPM-Admin: login, dashboard, own account, notifications, view users and units, view/create/import/update/delete standards according to permission, edit structure, submit standards, revise standards, export standard DOCX, manage borang, manage audit schedules, plot audit, create audit findings, manage PTK, view/export reports, view audit logs if allowed.

Perumus: login, dashboard, own account, view standards, create manual standards, import DOCX standards, edit draft/revision standard information, edit standard structure, create main points, create content/sub points, choose content format as bullet points, long text, or table, manage optional table intro and table notes, manage IKU/IKT indicators, submit standard to approval, view history, view source document, export draft/revision DOCX if allowed.

Pemeriksa: login, dashboard, own account, notifications, view standards, view standard detail, view information, indicators, structure, history, and source document.

Persetujuan: login, dashboard, own account, approval notifications, view standards and approval-related standard details; execution approval is handled by structural roles.

Pertimbangan: login, dashboard, own account, notifications, view standards, view details, view history, view source document.

Pengendalian: login, dashboard, own account, notifications, view standards, view detail, view structure, view history, view reports if allowed.

Kepala LPMI: login, dashboard, own account, approval notifications, view submitted standards, view standard detail, approve at Kepala LPMI stage, reject to revision, view audit schedules, view/export reports if allowed.

Wakil Rektor 1: login, dashboard, own account, approval notifications, view mapped standards, approve at WR1 stage, reject to revision, view reports if allowed.

Wakil Rektor 2: login, dashboard, own account, approval notifications, view mapped standards, approve at WR2 stage, reject to revision, view reports if allowed.

Wakil Rektor 3: login, dashboard, own account, approval notifications, view mapped standards, approve at WR3 stage, reject to revision, view reports if allowed.

Rektor: login, dashboard, own account, approval notifications, view final approval standards, approve final standard, reject to revision, publish standard, view reports if allowed.

Pimpinan: login, dashboard summary, own account, notifications, view standards, view audit score/read-only audit, view reports, export audit reports.

Auditor: login, dashboard, own account, audit/PTK notifications, view standards, view borang, view assigned audit schedules, perform audit AMI, view evidence, score audit, create/update findings, create PTK, view own related PTK, verify PTK, close PTK, view reports.

Lead Auditor: same as Auditor, with lead audit assignment context.

Auditee: login, dashboard, own account, audit/PTK notifications, view standards, view assigned audit schedules, view related borang, upload evidence, delete own evidence if allowed, view evidence review, respond to PTK, accept/reject PTK target date, view related reports if allowed.

Observer: login, dashboard, own account, view standards read-only, view audit read-only, view reports read-only.

Removed feature: Pelaksanaan is not part of the active system and should not appear in the use case diagram.
```

