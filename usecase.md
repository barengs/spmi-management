# DFD Actor Access Map

Dokumen ini hanya memetakan aktor pengguna dan akses utamanya di sistem E-SPMI. Format ini sengaja disederhanakan agar mudah dipakai sebagai input AI untuk membuat DFD.

## Scope

- Fokus: aktor, area akses, dan interaksi utama
- Tidak memetakan detail tabel database
- Tidak memetakan alur teknis internal seperti queue, cache, atau service worker

## External Actors

### 1. SuperAdmin

Hak akses utama:
- Login ke sistem
- Kelola pengguna
- Kelola role
- Kelola permission
- Kelola unit/fakultas/prodi
- Kelola master data lain
- Lihat seluruh standar
- Buat standar manual
- Import/scan dokumen standar
- Edit builder struktur standar
- Submit standar ke alur approval
- Approve standar di semua tahap
- Reject standar
- Lihat dokumen sumber standar
- Export standar terbit
- Kelola borang
- Lihat seluruh pelaksanaan
- Lihat seluruh jadwal audit
- Lihat seluruh audit AMI
- Lihat seluruh PTK/tindak koreksi
- Lihat seluruh laporan audit
- Export laporan audit
- Lihat notifikasi sistem
- Kelola akun sendiri

Interaksi utama:
- Mengakses semua modul inti sebagai administrator penuh

### 2. LPM-Admin

Hak akses utama:
- Login ke sistem
- Lihat standar
- Bantu pengelolaan data mutu sesuai permission yang diberikan
- Lihat borang/pelaksanaan jika diizinkan
- Lihat laporan jika diizinkan
- Lihat notifikasi
- Kelola akun sendiri

Interaksi utama:
- Mendukung administrasi mutu operasional

### 3. Perumus

Hak akses utama:
- Login ke sistem
- Lihat daftar standar
- Buat standar manual
- Import/scan dokumen standar
- Edit informasi standar saat masih draft/revisi
- Edit builder struktur standar
- Lihat dokumen sumber hasil import
- Submit standar ke tahap review/approval
- Lihat riwayat standar
- Kelola akun sendiri

Interaksi utama:
- Menyusun isi standar dan struktur poin standar

### 4. Pemeriksa

Hak akses utama:
- Login ke sistem
- Lihat standar
- Lihat detail standar
- Lihat riwayat dan dokumen sumber
- Lihat notifikasi terkait standar
- Kelola akun sendiri

Interaksi utama:
- Pemeriksaan/read-only pada dokumen standar sesuai peran governance

### 5. Penyetuju

Hak akses utama:
- Login ke sistem
- Lihat standar
- Lihat detail standar
- Lihat dokumen sumber
- Lihat notifikasi terkait approval
- Kelola akun sendiri

Interaksi utama:
- Peran governance approval-facing, tetapi approval final sistem saat ini masih mengikuti role struktural khusus

### 6. Penimbang

Hak akses utama:
- Login ke sistem
- Lihat standar
- Lihat detail standar
- Lihat riwayat
- Lihat notifikasi
- Kelola akun sendiri

Interaksi utama:
- Memberi pertimbangan/read-only terhadap standar

### 7. Pengendali

Hak akses utama:
- Login ke sistem
- Lihat standar
- Lihat detail standar
- Lihat pelaksanaan/monitoring jika diizinkan
- Lihat notifikasi
- Kelola akun sendiri

Interaksi utama:
- Monitoring dan pengendalian mutu secara baca-saja

### 8. Kepala LPMI

Hak akses utama:
- Login ke sistem
- Lihat standar yang diajukan
- Lihat detail, struktur, riwayat, dan dokumen sumber
- Approve standar pada tahap Kepala LPMI
- Reject standar ke revisi
- Lihat notifikasi approval
- Kelola akun sendiri

Interaksi utama:
- Aktor approval tahap 1

### 9. Wakil Rektor 1

Hak akses utama:
- Login ke sistem
- Lihat standar yang diajukan
- Lihat detail, struktur, riwayat, dan dokumen sumber
- Approve standar kategori yang dipetakan ke WR1
- Reject standar ke revisi
- Lihat notifikasi approval
- Kelola akun sendiri

Interaksi utama:
- Aktor approval tahap WR untuk kategori tertentu

### 10. Wakil Rektor 2

Hak akses utama:
- Login ke sistem
- Lihat standar yang diajukan
- Lihat detail, struktur, riwayat, dan dokumen sumber
- Approve standar kategori yang dipetakan ke WR2
- Reject standar ke revisi
- Lihat notifikasi approval
- Kelola akun sendiri

Interaksi utama:
- Aktor approval tahap WR untuk kategori tertentu

### 11. Wakil Rektor 3

Hak akses utama:
- Login ke sistem
- Lihat standar yang diajukan
- Lihat detail, struktur, riwayat, dan dokumen sumber
- Approve standar kategori yang dipetakan ke WR3
- Reject standar ke revisi
- Lihat notifikasi approval
- Kelola akun sendiri

Interaksi utama:
- Aktor approval tahap WR untuk kategori tertentu

### 12. Rektor

Hak akses utama:
- Login ke sistem
- Lihat standar yang diajukan
- Lihat detail, struktur, riwayat, dan dokumen sumber
- Approve final standar
- Reject standar ke revisi
- Lihat notifikasi approval
- Kelola akun sendiri

Interaksi utama:
- Aktor approval final standar

### 13. Auditor

Hak akses utama:
- Login ke sistem
- Lihat standar
- Lihat borang/audit requirement
- Lihat jadwal audit
- Melakukan audit AMI
- Mengisi skor audit
- Membuat temuan
- Membuat PTK dari hasil audit
- Akses menu Tindak Koreksi
- Melihat seluruh PTK yang terkait dengan akunnya
- Lihat laporan audit
- Export laporan audit
- Lihat notifikasi audit dan PTK
- Kelola akun sendiri

Interaksi utama:
- Mengaudit standar/borang dan menghasilkan temuan serta PTK

### 14. Auditee

Hak akses utama:
- Login ke sistem
- Lihat jadwal audit yang terkait
- Lihat borang untuk unit/prodi terkait
- Upload evidence/bukti dukung
- Memberi respons PTK
- Menyetujui/menolak target tanggal koreksi PTK
- Lihat laporan audit yang terkait jika diizinkan
- Lihat notifikasi audit/PTK
- Kelola akun sendiri

Interaksi utama:
- Menindaklanjuti audit dengan bukti dan respons koreksi

### 15. Pimpinan

Hak akses utama:
- Login ke sistem
- Lihat dashboard ringkasan
- Lihat standar
- Lihat laporan audit
- Lihat hasil monitoring dan riwayat
- Lihat notifikasi
- Kelola akun sendiri

Interaksi utama:
- Konsumsi informasi dan pengambilan keputusan tingkat pimpinan

### 16. Observer

Hak akses utama:
- Login ke sistem
- Lihat area yang diizinkan secara read-only
- Lihat standar jika diberikan akses
- Lihat laporan jika diberikan akses
- Kelola akun sendiri

Interaksi utama:
- Pengguna baca-saja dengan akses minimal

## System Areas Referenced By Actors

Untuk membantu AI membuat DFD, berikut daftar area sistem yang sering menjadi proses/data store utama:

- Autentikasi
- Manajemen Pengguna
- Manajemen Role
- Manajemen Permission
- Master Unit/Fakultas/Prodi
- Standar Mutu
- Import/Scan Dokumen Standar
- Builder Struktur Standar
- Approval Standar
- Dokumen Sumber Standar
- Borang
- Pelaksanaan
- Jadwal Audit
- Audit AMI
- PTK / Tindak Koreksi
- Evidence / Bukti Dukung
- Laporan Audit
- Notifikasi
- Akun Saya

## Compact Matrix

| Actor | Read | Create/Submit | Approve/Review | Operational Action |
|---|---|---|---|---|
| SuperAdmin | Semua modul | Semua modul utama | Semua tahap | Administrasi penuh |
| LPM-Admin | Modul sesuai permission | Terbatas sesuai permission | Tidak utama | Administrasi operasional |
| Perumus | Standar, dokumen, riwayat | Buat/import/edit/submit standar | Tidak | Menyusun standar |
| Pemeriksa | Standar | Tidak | Read-only review-facing | Pemeriksaan baca-saja |
| Persetujuan | Standar | Tidak | Read-only governance | Persetujuan non-eksekusi |
| Pertimbangan | Standar | Tidak | Read-only governance | Pertimbangan baca-saja |
| Pengendalian | Standar, monitoring | Tidak | Read-only governance | Monitoring |
| Kepala LPMI | Standar diajukan | Tidak | Approve tahap 1 | Persetujuan tahap awal |
| Wakil Rektor 1 | Standar diajukan | Tidak | Approve tahap WR1 | Persetujuan tahap WR |
| Wakil Rektor 2 | Standar diajukan | Tidak | Approve tahap WR2 | Persetujuan tahap WR |
| Wakil Rektor 3 | Standar diajukan | Tidak | Approve tahap WR3 | Persetujuan tahap WR |
| Rektor | Standar diajukan | Tidak | Approve final | Persetujuan final |
| Auditor | Standar, borang, audit, PTK, laporan | Buat temuan/PTK | Review audit | Audit dan tindak koreksi |
| Auditee | Jadwal, borang, PTK | Upload evidence / respons PTK | Tidak | Tindak lanjut audit |
| Pimpinan | Dashboard, standar, laporan | Tidak | Tidak utama | Konsumsi informasi |
| Observer | Modul read-only terbatas | Tidak | Tidak | Observasi |

## Prompt-Ready Version

Jika ingin langsung dipakai ke AI diagram generator, gunakan ringkasan ini:

```text
Create a DFD for an Internal Quality Assurance System (E-SPMI) with these external actors only:

1. SuperAdmin: full access to authentication, user management, role/permission management, unit master, standards, standard import/scan, standard builder, standard approval, borang, audit schedule, audit process, PTK, reports, notifications, and own account.
2. LPM-Admin: administrative access to quality modules depending on assigned permissions.
3. Perumus: create/import/edit/submit standards, edit structure builder, view source documents and history.
4. Pemeriksa: read-only access to standards, details, history, source documents, and notifications.
5. Persetujuan: read-only access to standards and approval-related information.
6. Pertimbangan: read-only access to standards and history.
7. Pengendalian: read-only access to standards and monitoring information.
8. Kepala LPMI: approve/reject standards at stage 1, view submitted standards and source documents.
9. Wakil Rektor 1: approve/reject standards at WR1 stage.
10. Wakil Rektor 2: approve/reject standards at WR2 stage.
11. Wakil Rektor 3: approve/reject standards at WR3 stage.
12. Rektor: final approve/reject standards.
13. Auditor: view standards, borang, audit schedules, perform audit, score audit, create findings, create PTK, access tindak koreksi, view/export reports, receive notifications.
14. Auditee: view related schedules and borang, upload evidence, respond to PTK, accept/reject correction target dates, manage own account.
15. Pimpinan: read dashboard summaries, standards, reports, and monitoring results.
16. Observer: limited read-only access.

Main system areas/processes:
Authentication, User Management, Role Management, Permission Management, Unit Master, Standards, Standard Import/Scan, Standard Builder, Standard Approval, Source Documents, Borang, Pelaksanaan, Audit Schedule, Audit AMI, PTK/Tindak Koreksi, Evidence, Reports, Notifications, Own Account.
```
