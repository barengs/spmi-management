# Hasil Pengujian Black Box

Tanggal penyusunan: `2026-06-04`

Dokumen ini merangkum pengujian black box berdasarkan perilaku sistem dari sisi input, aksi pengguna, dan output yang terlihat. Pengujian tidak berfokus pada struktur kode internal, tetapi pada apakah sistem memberi respons sesuai kebutuhan fitur.

## Teknik Pengujian

Teknik yang digunakan:
- Boundary Value Analysis: menguji kondisi batas seperti dokumen terbaca dan tidak terbaca, standar draft dan terbit, serta revisi awal dan revisi lanjutan.
- Equivalence Partitioning: membagi input valid dan tidak valid, misalnya format kode standar valid/tidak valid, status standar yang boleh/tidak boleh dihapus, dan role yang boleh/tidak boleh mengakses aksi.
- Decision Table Testing: menguji kombinasi status standar, role pengguna, dan aksi seperti submit, approve, edit, delete, export.
- State Transition Testing: menguji perubahan status standar, evidence, PTK, dan revisi standar dari satu tahap ke tahap berikutnya.

## Ringkasan Hasil

| Modul | Fokus Pengujian | Status |
|---|---|---|
| Import Dokumen Standar | Upload PDF/DOCX, ekstraksi struktur, metadata, IKU/IKT | Valid |
| Builder Struktur Standar | Poin utama, sub poin, isi, nested numbering | Valid |
| Revisi Standar | Copy draft dari standar terbit dan approval ulang | Valid |
| Pengaturan Standar | Update status aktif, validasi kode, hapus draft | Valid |
| Export Standar | Export standar terbit dan blokir non-terbit | Valid |
| Evidence Audit | Upload evidence dan review auditor | Valid |
| PTK / Tindak Koreksi | Siklus create, response, verify, close | Valid |
| RBAC | Hak akses role dan permission | Valid |

## Tabel 1. Pengujian Black Box Import Dokumen Standar

| No. | Skenario Pengujian | Test Case | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
|---|---|---|---|---|---|
| 1 | Upload PDF yang memiliki teks terstruktur | Upload dokumen PDF dengan poin utama, sub poin, dan isi | Sistem menyimpan dokumen dan membentuk struktur standar | Struktur `Poin Utama -> Sub Poin -> Isi` berhasil terbentuk | Valid |
| 2 | Upload DOCX yang memiliki teks terstruktur | Upload dokumen DOCX dengan format poin standar | Sistem membaca dokumen dan membuat struktur standar | Struktur berhasil dibuat dari DOCX | Valid |
| 3 | Upload dokumen yang tidak terbaca | Upload PDF scan/tidak memiliki struktur terbaca | Sistem tetap menyimpan dokumen, tetapi struktur dan informasi hasil ekstraksi kosong | Dokumen tersimpan, `root_count` dan `node_count` bernilai `0`, metadata kosong | Valid |
| 4 | Dokumen memiliki metadata kode, tanggal, revisi, halaman | Upload dokumen dengan informasi pada halaman awal | Sistem mengekstrak kode, tanggal dokumen, revisi, dan jumlah halaman | Metadata berhasil disimpan jika format terbaca | Valid |
| 5 | Dokumen memiliki kode standar dengan format dash | Kode dokumen `SPMI-UIM/SMI/I/A` | Sistem menerima format kode tersebut | Format dash diterima dan tidak memicu error validasi | Valid |

## Tabel 2. Pengujian Black Box Indikator IKU dan IKT

| No. | Skenario Pengujian | Test Case | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
|---|---|---|---|---|---|
| 1 | Dokumen memiliki indikator format lama | Input `IKU No. 9.1 Capaian pembelajaran lulusan` | Sistem menyimpan tipe `IKU`, nomor `9.1`, dan isi indikator | Data indikator tersimpan sesuai format | Valid |
| 2 | Dokumen memiliki indikator format tabel | Input tabel dengan `IKU.05`, `IKT.01`, `IKT.02` | Sistem menyimpan tipe, nomor, dan isi indikator ke tabel indikator | Semua indikator tersimpan di tabel indikator | Valid |
| 3 | Isi indikator berada sebelum kode dalam layout PDF | Tabel PDF menampilkan isi indikator row pertama sebelum teks `IKU.01` terbaca oleh parser | Sistem tetap memasangkan isi tersebut ke `IKU.01` | `IKU.01` berisi teks indikator lengkap | Valid |
| 4 | Isi indikator terpotong beberapa baris | Tabel dengan teks indikator panjang yang wrap ke beberapa baris | Sistem menggabungkan baris lanjutan menjadi satu isi indikator | Isi indikator lengkap dan tidak terpotong | Valid |
| 5 | Nomor baris tabel ikut terbaca | Tabel memuat nomor `1`, `2`, `3` di kolom pertama | Nomor baris tidak boleh masuk ke isi indikator | Nomor baris dibersihkan dari isi indikator | Valid |

## Tabel 3. Pengujian Black Box Pengaturan dan Revisi Standar

| No. | Skenario Pengujian | Test Case | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
|---|---|---|---|---|---|
| 1 | Nama standar dibuat lowercase | Input nama standar dengan huruf kecil | Sistem menyimpan nama standar dalam uppercase | Nama standar tersimpan uppercase | Valid |
| 2 | Nama standar duplikat aktif | Membuat standar dengan nama yang sudah ada | Sistem menolak nama duplikat | Muncul pesan nama sudah digunakan | Valid |
| 3 | Nama standar pernah dihapus | Membuat standar dengan nama dari data soft delete | Sistem mengizinkan nama dipakai ulang | Nama dapat digunakan kembali | Valid |
| 4 | Ubah status aktif standar draft | Mengubah `Aktif` menjadi `Nonaktif` pada standar draft | Sistem menyimpan perubahan status aktif | Status aktif berhasil berubah | Valid |
| 5 | Hapus standar draft belum diterapkan | Klik `Hapus Standar` pada standar `DRAFT` tanpa versi sebelumnya | Sistem menghapus standar | Standar terhapus secara soft delete | Valid |
| 6 | Hapus draft hasil revisi standar terbit | Klik hapus pada draft revisi dari standar yang sudah terbit | Sistem menolak penghapusan langsung | Aksi ditolak karena draft adalah salinan revisi | Valid |
| 7 | Edit standar terbit | Pengguna ingin edit standar status `TERBIT` | Sistem membuat salinan draft revisi, bukan mengedit versi terbit langsung | Draft revisi dibuat dan versi terbit tetap menjadi versi read-only | Valid |
| 8 | Revisi standar harus approval ulang | Draft revisi diajukan kembali | Sistem mengikuti alur approval seperti standar baru | Revisi tidak menggantikan versi terbit sebelum approval selesai | Valid |

## Tabel 4. Pengujian Black Box Builder Struktur Standar

| No. | Skenario Pengujian | Test Case | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
|---|---|---|---|---|---|
| 1 | Membuat indikator sebagai root node | Tambah isi langsung di level utama | Sistem menolak karena root harus `Poin Utama` | Aksi ditolak | Valid |
| 2 | Sub poin memiliki isi sendiri | Sub poin berisi teks tanpa child isi | Sistem menganggap struktur valid | Standar dapat diajukan | Valid |
| 3 | Bentuk konten poin-poin | Input list dengan nested numbering | Sistem menyimpan list dan nested numbering | Nested numbering tersimpan | Valid |
| 4 | Bentuk konten teks panjang | Input teks panjang tanpa nested numbering | Sistem menyimpan teks sebagai long text | Teks panjang tersimpan | Valid |
| 5 | Long text diberi nested numbering | Input nested numbering pada mode teks panjang | Sistem menolak format yang tidak sesuai | Aksi ditolak | Valid |

## Tabel 5. Pengujian Black Box Export Standar

| No. | Skenario Pengujian | Test Case | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
|---|---|---|---|---|---|
| 1 | Export standar terbit | Export standar dengan status `TERBIT` | Sistem menghasilkan dokumen Word dengan tabel approval/signature | File export berhasil dibuat | Valid |
| 2 | Export standar belum terbit | Export standar status `DRAFT` atau belum final | Sistem menolak export | Aksi ditolak dengan pesan hanya standar terbit yang dapat diekspor | Valid |

## Tabel 6. Pengujian Black Box Evidence dan PTK

| No. | Skenario Pengujian | Test Case | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
|---|---|---|---|---|---|
| 1 | Upload evidence indikator | Auditee upload file evidence untuk indikator | Sistem menyimpan file evidence | Evidence berhasil tersimpan | Valid |
| 2 | Auditor reject evidence tanpa komentar | Auditor menolak evidence tanpa mengisi komentar | Sistem wajib meminta komentar | Aksi ditolak sampai komentar diisi | Valid |
| 3 | Reject evidence tidak otomatis membuat PTK | Auditor reject evidence | Sistem tidak membuat PTK otomatis | PTK tidak dibuat otomatis | Valid |
| 4 | Auditor membuat PTK dari audit | Auditor membuat PTK untuk temuan audit | Sistem membuat PTK dan menampilkan siklus tindak koreksi | PTK berhasil dibuat | Valid |
| 5 | PTK ditutup sebelum verifikasi | Auditor mencoba close PTK sebelum verifikasi | Sistem menolak close | PTK tidak dapat ditutup sebelum diverifikasi | Valid |
| 6 | Siklus PTK lengkap | Create PTK, auditee response, auditor verify, close | Sistem memindahkan status sesuai tahapan | PTK berhasil sampai status close | Valid |

## Tabel 7. Pengujian Black Box RBAC

| No. | Skenario Pengujian | Test Case | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
|---|---|---|---|---|---|
| 1 | SuperAdmin mengakses permission | Login sebagai SuperAdmin | Sistem mengizinkan akses walaupun permission detail tidak dicek satu per satu | SuperAdmin dapat mengakses | Valid |
| 2 | User authorized melihat RBAC matrix | User dengan permission membuka halaman RBAC | Sistem menampilkan matrix role dan permission | Matrix berhasil ditampilkan | Valid |
| 3 | User authorized update permission role | User mengubah permission role | Sistem menyimpan perubahan permission | Permission role berhasil diperbarui | Valid |
| 4 | Role tidak berwenang melakukan aksi standar | User tanpa permission standar mencoba create/update/delete | Sistem menolak aksi | Aksi ditolak sesuai hak akses | Valid |

## Catatan Eksekusi

Pengujian otomatis yang mendukung dokumen ini dijalankan menggunakan PHPUnit/Laravel test command pada beberapa suite feature dan unit. Hasil terakhir yang relevan:

| Command | Hasil |
|---|---|
| `php artisan test tests/Feature/StandardDocumentImportTest.php` | PASS, 5 tests |
| `php artisan test tests/Feature/StandardRevisionTest.php` | PASS, 8 tests |
| `npm run build` | PASS, dengan warning ukuran chunk Vite |

Catatan environment:
- Saat menjalankan test PHP, muncul warning `Module "pgsql" is already loaded`.
- Warning tersebut tidak membuat test gagal.

## Kesimpulan

Berdasarkan pengujian black box, fitur utama yang diuji berjalan sesuai harapan:
- Dokumen tetap dapat disimpan walaupun struktur tidak terbaca.
- Indikator IKU/IKT dari tabel PDF dapat dipetakan dengan tipe, nomor, dan isi indikator.
- Standar draft dapat diedit atau dihapus sesuai aturan.
- Standar terbit tidak diedit langsung, tetapi melalui draft revisi dan approval ulang.
- Role dan permission membatasi akses sesuai kebutuhan sistem.
