# DFD Actor Access Map

Dokumen ini memetakan aktor pengguna, akses utama, dan alur bagaimana data diproses di sistem E-SPMI. Format ini disederhanakan agar mudah dipakai sebagai input AI untuk membuat DFD.

## Scope

- Fokus: aktor, area akses, interaksi utama, dan flow data
- Tidak memetakan detail tabel database secara teknis
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

## Data Flow Process Map

Bagian ini menjelaskan bagaimana data diproses di dalam sistem. Formatnya dibuat linear agar mudah diubah menjadi DFD Level 0 atau Level 1.

### 1. Authentication

Flow:
- User memasukkan email dan password
- Sistem memvalidasi kredensial ke data user
- Sistem memeriksa status akun aktif/tidak aktif
- Jika valid, sistem membuat token login dan mengirim profil user + role + permission
- User memakai token untuk mengakses modul lain

Data utama:
- Data user
- Data role user
- Data permission user
- Token autentikasi

### 2. User Management

Flow:
- SuperAdmin atau admin berwenang mengirim data user baru/perubahan user
- Sistem memvalidasi input user
- Sistem menyimpan user ke data user
- Sistem menghubungkan user dengan unit
- Sistem menghubungkan user dengan role
- Sistem menampilkan daftar/detail user ke aktor yang berwenang

Data utama:
- Data user
- Data unit
- Data role

### 3. Role Management

Flow:
- SuperAdmin mengirim data role baru atau perubahan role
- Sistem memvalidasi nama role
- Sistem menyimpan role
- Sistem menghubungkan role dengan permission
- Sistem menampilkan matrix role-permission

Data utama:
- Data role
- Data permission
- Mapping role-permission

### 4. Permission Management

Flow:
- SuperAdmin membuat atau mengubah permission
- Sistem memvalidasi format permission
- Sistem menyimpan permission
- Permission dipakai sistem saat memeriksa akses user

Data utama:
- Data permission
- Mapping role-permission

### 5. Unit Master Management

Flow:
- Admin mengirim data fakultas/prodi/unit
- Sistem memvalidasi struktur parent-child unit
- Sistem menyimpan unit
- Sistem memakai data unit untuk relasi user, borang, audit, dan laporan

Data utama:
- Data unit
- Relasi parent-child unit

### 6. Standard Manual Creation

Flow:
- Perumus membuat standar baru
- Sistem menyimpan informasi dasar standar dalam status draft
- Perumus membuka builder
- Perumus menambah poin utama, sub poin, isi, teks panjang, atau tabel
- Sistem menyimpan struktur standar ke data metric/tree
- Sistem menampilkan detail standar, struktur, dan riwayat perubahan

Data utama:
- Data standar
- Data struktur metric

### 7. Standard Import / Scan Document

Flow:
- Perumus mengunggah file dokumen standar
- Sistem menyimpan file dokumen sumber
- Sistem mengekstrak teks dari dokumen
- Sistem membangun struktur poin dari hasil ekstraksi
- Sistem menyimpan metadata dokumen impor
- Sistem menyimpan struktur hasil import ke data metric/tree
- Sistem menampilkan hasil import di detail standar

Data utama:
- Data standar
- Dokumen sumber standar
- Hasil ekstraksi teks
- Data struktur metric

### 8. Standard Builder Update

Flow:
- Perumus memilih node struktur
- Perumus menambah, mengubah, atau menghapus node
- Sistem memvalidasi tipe node dan relasi parent-child
- Sistem menyimpan perubahan struktur
- Sistem memuat ulang tree builder
- Sistem menampilkan struktur terbaru di builder dan detail standar

Data utama:
- Data metric/tree
- Data standar

### 9. Standard Approval Flow

Flow:
- Perumus submit standar
- Sistem memvalidasi apakah struktur standar sudah layak diajukan
- Sistem mengubah status/tahap approval standar
- Sistem mengirim item notifikasi ke approver aktif
- Approver melihat detail standar dan dokumen sumber
- Approver melakukan approve atau reject
- Sistem memperbarui tahap approval, status, dan timestamp approval
- Jika final approve, sistem mengubah status standar menjadi terbit
- Jika reject, sistem mengembalikan status ke revisi

Data utama:
- Data standar
- Status approval standar
- Catatan revisi
- Notifikasi approval

### 10. Standard Read / Detail View

Flow:
- User yang berwenang membuka detail standar
- Sistem membaca data standar
- Sistem membaca struktur metric
- Sistem membaca riwayat approval dan versi
- Sistem membaca dokumen sumber jika ada
- Sistem menampilkan tab informasi, struktur, riwayat, dokumen, dan peningkatan

Data utama:
- Data standar
- Data metric/tree
- Riwayat approval
- Dokumen sumber

### 11. Borang Management

Flow:
- Admin atau pengelola memilih indikator standar dan prodi
- Sistem membuat item borang per prodi
- Sistem menyimpan PJ dan target sasaran pada borang item
- Sistem menampilkan daftar borang per prodi/fakultas
- Data borang dipakai pada pelaksanaan audit dan upload evidence

Data utama:
- Data borang item
- Data metric
- Data prodi/unit

### 12. Pelaksanaan / Evidence Upload

Flow:
- Auditee membuka borang yang terkait dengan unitnya
- Auditee mengunggah bukti dukung atau link evidence
- Sistem memvalidasi file/link
- Sistem menyimpan evidence
- Auditor atau reviewer membuka evidence
- Reviewer menerima atau menolak evidence
- Sistem memperbarui status review evidence

Data utama:
- Data borang item
- Data evidence
- Status review evidence

### 13. Audit Schedule Management

Flow:
- Admin membuat jadwal audit
- Sistem memvalidasi auditor, auditee, fakultas, prodi, dan tanggal
- Sistem menyimpan jadwal audit
- Sistem mengirim notifikasi jadwal ke pihak terkait
- Auditor dan auditee melihat jadwal dari akun masing-masing

Data utama:
- Data jadwal audit
- Data auditor
- Data auditee
- Notifikasi audit

### 14. Audit AMI Execution

Flow:
- Auditor membuka jadwal audit
- Sistem menampilkan borang/evidence/indikator terkait
- Auditor memberi skor audit
- Auditor mengisi temuan audit jika ada ketidaksesuaian
- Sistem menyimpan hasil audit
- Sistem menyiapkan data hasil audit untuk laporan dan PTK

Data utama:
- Data jadwal audit
- Data borang
- Data evidence
- Data hasil audit
- Data temuan

### 15. PTK / Tindak Koreksi

Flow:
- Auditor membuat PTK dari temuan audit
- Sistem menyimpan PTK dan target tanggal koreksi
- Auditee melihat PTK yang terkait
- Auditee memberi respons atau persetujuan target tanggal
- Sistem memperbarui status target tanggal
- Auditee mengirim tindak lanjut koreksi
- Auditor memeriksa tindak lanjut
- Sistem memperbarui status PTK sampai selesai/ditutup

Data utama:
- Data PTK
- Data temuan audit
- Data respons auditee
- Data target tanggal koreksi

### 16. Audit Report Generation

Flow:
- User berwenang membuka detail laporan audit
- Sistem membaca jadwal audit, data temuan, auditor, auditee, dan tanda tangan
- Sistem menyusun context laporan
- Sistem menghasilkan file export PDF atau DOCX
- User mengunduh laporan

Data utama:
- Data jadwal audit
- Data temuan
- Data user auditor/auditee
- Asset tanda tangan
- File laporan

### 17. Standard Improvement

Flow:
- User berwenang membuka tab peningkatan pada standar terbit
- Sistem membaca data standar dan temuan terkait
- User mengisi keputusan peningkatan
- Sistem menyimpan catatan peningkatan
- Jika perlu revisi siklus baru, sistem membuat relasi versi/perbaikan standar
- Sistem menampilkan histori peningkatan di detail standar

Data utama:
- Data standar
- Data improvement
- Data temuan/PTK
- Relasi versi standar

### 18. Notification Flow

Flow:
- Peristiwa penting terjadi: submit standar, approval, jadwal audit, PTK, dll
- Sistem membentuk data notifikasi
- Sistem menyimpan atau mengagregasi notifikasi
- User membuka navbar atau halaman notifikasi
- Sistem menampilkan notifikasi sesuai role dan keterkaitan user

Data utama:
- Data notifikasi
- Data standar
- Data audit
- Data PTK

### 19. Own Account Management

Flow:
- User membuka akun saya
- User mengubah nama, password, atau tanda tangan virtual
- Sistem memvalidasi input
- Sistem menyimpan perubahan akun
- Jika tanda tangan diunggah, sistem menyimpan file signature
- Data signature dipakai pada export laporan audit

Data utama:
- Data user
- File tanda tangan virtual

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

## DFD-Level Prompt Version

Gunakan ini jika ingin AI membuat alur proses data, bukan hanya aktor:

```text
Create a DFD for E-SPMI that includes actors, processes, and data flows.

Actors:
SuperAdmin, LPM-Admin, Perumus, Pemeriksa, Persetujuan, Pertimbangan, Pengendalian, Kepala LPMI, Wakil Rektor 1, Wakil Rektor 2, Wakil Rektor 3, Rektor, Auditor, Auditee, Pimpinan, Observer.

Main processes:
1. Authentication
2. User Management
3. Role Management
4. Permission Management
5. Unit Master Management
6. Standard Manual Creation
7. Standard Import/Scan Document
8. Standard Builder Update
9. Standard Approval Flow
10. Standard Detail View
11. Borang Management
12. Pelaksanaan / Evidence Upload
13. Audit Schedule Management
14. Audit AMI Execution
15. PTK / Tindak Koreksi
16. Audit Report Generation
17. Standard Improvement
18. Notification Flow
19. Own Account Management

Main data stores:
User Data, Role Data, Permission Data, Unit Data, Standard Data, Metric Tree Data, Source Document Data, Borang Data, Evidence Data, Audit Schedule Data, Audit Result Data, Finding Data, PTK Data, Improvement Data, Notification Data, Signature Data, Report Data.

Key data flows:
- User sends credentials to Authentication, receives token and profile
- Perumus sends standard info and structure to Standard Creation / Builder
- Uploaded standard document goes to Import/Scan, then extracted text and structure are stored in Standard + Metric Tree
- Submitted standard goes to Approval Flow, approvers send approve/reject decisions, status updates return to Standard Data
- Borang Management maps standards/metrics to prodi and stores borang items
- Auditee sends evidence to Pelaksanaan, reviewer sends acceptance/rejection
- Audit Schedule sends schedule data to Auditor and Auditee
- Auditor sends scores and findings to Audit Execution
- Findings generate PTK, Auditee sends correction response, Auditor reviews PTK closure
- Audit data is sent to Report Generation for PDF/DOCX output
- Published standard and findings feed Standard Improvement
- Important events feed Notification Flow
- User profile and signature updates go through Own Account Management
```
