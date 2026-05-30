# Buku Manual E-SPMI

Dokumen ini adalah panduan penggunaan aplikasi **E-SPMI** untuk operator, auditor, auditee, dan pimpinan.

## 1. Tujuan Aplikasi

E-SPMI digunakan untuk mengelola siklus penjaminan mutu internal, mulai dari:

- penyusunan standar
- pelaksanaan dan unggah bukti
- audit mutu internal
- tindak koreksi
- peningkatan standar
- pelaporan audit

## 2. Cara Login

1. Buka halaman login aplikasi.
2. Masukkan email dan password.
3. Klik `Masuk`.

Setelah login berhasil, pengguna akan diarahkan ke `Dashboard`.

## 3. Menu Utama

Menu yang tampil bisa berbeda tergantung role akun.

- `Dashboard`
  - ringkasan status standar, audit, PTK, dan siklus
- `Standar`
  - daftar standar mutu
  - tambah standar baru
  - detail standar
  - builder struktur standar
  - review/persetujuan standar
- `Borang`
  - daftar dokumen borang per prodi
  - detail indikator borang
  - unggah bukti
- `Pelaksanaan`
  - daftar prodi
  - daftar standar/indikator yang diimplementasi
  - detail dokumen bukti per item
- `Jadwal Audit`
  - pembuatan dan pengelolaan jadwal audit
- `Audit (AMI)`
  - audit detail per prodi
  - review bukti
  - akhir periode audit
- `Tindak Koreksi`
  - daftar PTK
  - respons auditee
  - verifikasi auditor
- `Laporan Audit`
  - daftar laporan audit
  - detail laporan audit
  - export laporan
- `Notifikasi`
  - pemberitahuan approval, audit, dan PTK
- `Akun Saya`
  - ubah nama
  - ubah password
  - unggah tanda tangan virtual

## 4. Role dan Fungsi Umum

### SuperAdmin

- akses penuh seluruh sistem
- kelola user
- kelola role dan permission
- kelola master fakultas/prodi
- atur durasi siklus

### LPM-Admin

- mengelola standar, borang, dan monitoring sistem mutu

### Perumus

- membuat dan menyusun draft standar
- tidak memiliki akses ke fitur lain di luar alur standar yang diizinkan

### Pemeriksa / Persetujuan / Pertimbangan / Pengendalian

- digunakan untuk pengelolaan role governance standar sesuai kebutuhan institusi

### Auditor

- melihat bukti auditee
- mereview bukti
- membuat temuan dan PTK
- menyetujui penutupan periode audit

### Auditee

- mengunggah bukti pelaksanaan
- merespons PTK
- menyetujui atau menolak target tanggal PTK

### Pimpinan / Observer

- akses baca sesuai izin yang diberikan

## 5. Panduan Modul Standar

### 5.1 Melihat Daftar Standar

1. Buka menu `Standar`.
2. Gunakan pencarian atau filter bila diperlukan.
3. Klik salah satu standar untuk membuka detail.

### 5.2 Menambah Standar Baru

1. Buka menu `Standar`.
2. Klik `Tambah Standar`.
3. Isi metadata standar.
4. Upload dokumen sumber jika diminta oleh flow saat ini.
5. Simpan.

### 5.3 Menyusun Struktur Standar

1. Buka detail standar.
2. Masuk ke `Builder`.
3. Tambahkan struktur:
   - `Poin Utama`
   - `Sub Poin`
   - `Isi`
4. Simpan perubahan.

### 5.4 Submit dan Review Standar

1. Setelah draft siap, klik `Submit`.
2. Standar akan masuk ke alur approval.
3. Role approver akan membuka halaman review standar.
4. Approver bisa:
   - menyetujui
   - menolak dan mengembalikan ke revisi

### 5.5 Peningkatan Standar

Fitur peningkatan tersedia di `Detail Standar` pada tab `Peningkatan`.

Pengguna dapat:

- menambahkan catatan peningkatan
- menandai standar akan:
  - diperbaiki dan diterapkan lagi
  - dipertahankan
  - tidak diterapkan lagi

Catatan:

- tab ini terkunci bila standar belum `TERBIT`
- tab ini juga terkunci bila standar belum punya bukti implementasi

## 6. Panduan Modul Borang

### 6.1 Membuka Borang Prodi

1. Buka menu `Borang`.
2. Pilih prodi.
3. Masuk ke halaman detail prodi.

Route aplikasi:

- daftar prodi: `/borang`
- detail prodi: `/borang/prodi/:prodiId`
- detail item: `/borang/:borangItemId`

### 6.2 Mengunggah Bukti

1. Buka detail item borang.
2. Pilih jenis bukti:
   - file
   - link
3. Isi judul/keterangan bila tersedia.
4. Upload bukti.

### 6.3 Kondisi Setelah Audit Berakhir

Jika periode audit sudah `ENDED`:

- auditee tidak bisa upload/edit/hapus bukti lagi
- auditor tidak bisa mengubah hasil review lagi
- halaman berada dalam kondisi terkunci

## 7. Panduan Modul Pelaksanaan

### 7.1 Alur Halaman

- `/pelaksanaan`
  - tabel daftar prodi
- `/pelaksanaan/prodis/:prodiId/standards`
  - daftar standar/indikator per prodi
- `/pelaksanaan/items/:itemId`
  - daftar seluruh dokumen bukti/capaian item tersebut

### 7.2 Mode Akses

- `SuperAdmin` dan `Auditee`
  - dapat melakukan perubahan
- role lain
  - hanya baca

### 7.3 Isi Data Pelaksanaan

Halaman pelaksanaan difokuskan pada:

- indikator dari standar
- upload dokumen atau link bukti

## 8. Panduan Jadwal Audit

### 8.1 Membuat Jadwal Audit

1. Buka `Jadwal Audit`.
2. Klik tambah jadwal.
3. Pilih fakultas, prodi, lead auditor, auditor, dan auditee.
4. Isi tanggal audit dan informasi pendukung.
5. Simpan.

Catatan sistem:

- auditor yang sudah dipakai pada jadwal lain tidak akan muncul lagi pada pilihan yang tidak valid
- lead auditor dan auditor tidak boleh bentrok dalam satu jadwal

## 9. Panduan Audit (AMI)

### 9.1 Membuka Detail Audit Prodi

1. Buka menu `Audit (AMI)`.
2. Klik `Lihat Detail`.
3. Sistem akan membuka route:
   - `/audit/prodi/:prodiId`

Di halaman ini pengguna dapat:

- melihat prodi, fakultas, auditee
- membuka borang prodi terkait
- memonitor status audit

### 9.2 Status AMI

Status audit ditampilkan dalam Bahasa Indonesia:

- `Belum Dijadwalkan`
- `Belum Mulai`
- `Sedang Berjalan`
- `Selesai`

### 9.3 Review Bukti

Auditor melakukan review pada route:

- `/audit/:id/review`

Di halaman review auditor dapat:

- melihat bukti secara read-only
- mengisi komentar auditor
- memilih hasil:
  - `Terealisasi`
  - `Tidak Terealisasi`
  - `Tolak Bukti dan Buat PTK`

### 9.4 Temuan Audit

Bagian `Keputusan Review` mendukung:

- referensi butir mutu
- pernyataan temuan
- tambah lebih dari satu temuan

Referensi butir mutu dipilih melalui dialog pencarian yang berisi:

- IKU
- IKT
- pernyataan
- filter periode

### 9.5 PTK Saat Review

Jika auditor mencentang pembuatan PTK:

- komentar auditor wajib diisi
- target tanggal PTK wajib diisi

Jika auditor menolak tanpa PTK:

- sistem menampilkan warning bahwa auditee tidak mendapat kelonggaran waktu tambahan

### 9.6 Mengakhiri Periode Audit

Tombol `Akhiri Periode Audit` ada di detail audit prodi.

Syarat penutupan:

- tidak ada PTK aktif yang masih berjalan
- seluruh indikator/PJ sudah memiliki review final
- hasil review final harus `ACCEPTED` atau `REJECTED`
- auditor yang menutup wajib mengisi kesimpulan audit
- penutupan memerlukan persetujuan dua pihak:
  - lead auditor
  - auditor

Alur:

1. auditor pertama klik `Akhiri Periode Audit`
2. status menjadi menunggu persetujuan auditor lain
3. auditor kedua menyetujui
4. periode audit berubah menjadi `ENDED`

## 10. Panduan Tindak Koreksi (PTK)

### 10.1 Membuat PTK

PTK dibuat dari flow review audit ketika auditor menolak bukti dan memilih pembuatan PTK.

### 10.2 Respons Auditee

Auditee menerima notifikasi PTK baru dan harus:

- menyetujui target tanggal, atau
- menolak target tanggal dengan komentar

Jika menolak:

- komentar penolakan akan terlihat oleh auditor
- auditor dapat merevisi tanggal target

### 10.3 Tindak Lanjut

Setelah target tanggal disetujui:

- auditee dapat mengirim tindak lanjut
- auditor memverifikasi hasil tindak lanjut

## 11. Panduan Laporan Audit

### 11.1 Membuka Laporan

1. Buka menu `Laporan Audit`.
2. Pilih salah satu laporan.
3. Buka detail laporan.

### 11.2 Export Laporan

Dari detail laporan audit, pengguna dapat membuka dialog export dan memilih format:

- `.doc`
- `.docx`
- `.pdf`

Catatan:

- `.doc` memakai jalur HTML Word
- `.docx` memakai generator Word native
- `.pdf` memakai template HTML khusus PDF

## 12. Pengaturan Sistem

### 12.1 Manajemen Pengguna

Route:

- `/settings/users`

Fungsi:

- tambah user
- edit user
- assign role
- assign multiple roles

### 12.2 Manajemen Role

Route:

- `/settings`

Fungsi:

- tambah role baru

### 12.3 Manajemen Permission

Route:

- `/settings/permissions`
- `/settings/permissions/add`
- `/settings/permissions/:id/edit`

Fungsi:

- lihat permission
- tambah permission
- edit permission

### 12.4 Master Fakultas dan Prodi

Route:

- `/settings/master/faculties`
- `/settings/master/prodis`

### 12.5 Pengaturan Durasi Siklus

Route:

- `/settings/cycle`

Default durasi siklus:

- `4 bulan`

Pengaturan ini memengaruhi indikator siklus aktif di dashboard.

## 13. Akun Saya

Setiap user dapat membuka menu `Akun Saya` untuk:

- mengubah nama akun
- mengubah password
- upload/ganti/hapus tanda tangan virtual

Tanda tangan virtual dipakai pada dokumen ekspor yang relevan.

## 14. Notifikasi

Halaman notifikasi menampilkan informasi terkait:

- approval standar
- jadwal audit
- PTK
- respons target tanggal PTK
- verifikasi tindak lanjut

## 15. Tips Penggunaan

- gunakan route detail untuk bekerja lebih fokus pada satu prodi atau satu item
- pastikan semua bukti audit direview sebelum menutup periode audit
- isi kesimpulan audit dengan ringkas dan formal karena dipakai pada laporan
- gunakan tanda tangan virtual pada akun auditor/auditee untuk hasil export dokumen

## 16. Ringkasan Route Penting

- `/login`
- `/`
- `/standards`
- `/standards/:id`
- `/standards/:id/builder`
- `/standards/:id/review`
- `/borang`
- `/borang/prodi/:prodiId`
- `/borang/:borangItemId`
- `/pelaksanaan`
- `/pelaksanaan/prodis/:prodiId/standards`
- `/pelaksanaan/items/:itemId`
- `/audit`
- `/audit/prodi/:prodiId`
- `/audit/:id/review`
- `/ptk`
- `/report`
- `/report/:id`
- `/account`
- `/settings`
- `/settings/users`
- `/settings/permissions`
- `/settings/master/faculties`
- `/settings/master/prodis`
- `/settings/cycle`

