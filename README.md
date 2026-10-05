# FinTrack App V2

FinTrack App V2 adalah aplikasi pencatatan keuangan berbasis web (SPA - Single Page Application) yang sangat responsif untuk desktop dan mobile, yang dibuat menggunakan HTML, Tailwind CSS, Javascript, dan menggunakan **Google Sheets** sebagai database melalui **Google Apps Script**.

Aplikasi ini memenuhi semua kebutuhan manajemen keuangan Anda, termasuk fitur pemasukan, pengeluaran, hutang, laporan grafik realtime bulanan, upload bukti file (maksimal 2MB), dan filter kategori.

## Panduan Instalasi & Penggunaan

Untuk membuat aplikasi web ini bisa berjalan dan tersambung ke database Google Sheets, ikuti langkah-langkah di bawah ini:

### Langkah 1: Buat Spreadsheet Baru
1. Buka [Google Sheets](https://sheets.new) dan buat spreadsheet baru.
2. Beri nama spreadsheet Anda, misalnya `Database FinTrack`.

### Langkah 2: Setup Google Apps Script
1. Di dalam Google Sheets yang baru Anda buat, klik menu **Ekstensi > Apps Script**.
2. Hapus semua kode default yang ada di dalam editor `Code.gs`.
3. Buka file `Code.gs` yang ada di folder project ini (di PC Anda) menggunakan text editor.
4. Salin seluruh isi dari file `Code.gs` tersebut dan paste ke dalam editor Apps Script.
5. Klik ikon **Simpan** (Save) bergambar disket di Apps Script.
6. Pada dropdown fungsi di atas (sebelah tombol Run/Jalankan), pilih fungsi **`setup`**.
7. Klik tombol **Run** (Jalankan).
   > *Catatan: Anda mungkin akan dimintai izin (Authorization). Lanjutkan dengan memilih akun Google Anda, klik "Lanjutan" (Advanced), dan "Buka (tidak aman)".*
8. Jika berhasil, kembali ke Google Sheets. Anda akan melihat sheet baru telah terbuat (Pemasukan, Pengeluaran, Hutang, Dashboard).

### Langkah 3: Deploy sebagai Web App
1. Masih di editor Apps Script, di pojok kanan atas klik tombol **Terapkan > Deployment baru** (Deploy > New deployment).
2. Klik ikon roda gigi di sebelah "Pilih jenis" (Select type) dan pastikan **Aplikasi Web** (Web app) dicentang.
3. Konfigurasi:
   - Deskripsi: `FinTrack API v1` (atau bebas)
   - Jalankan sebagai (Execute as): **Saya (Email Anda)**
   - Siapa yang memiliki akses (Who has access): **Siapa saja (Anyone)**
4. Klik **Terapkan** (Deploy).
5. Akan muncul jendela baru berisi **URL Aplikasi Web**. Salin URL tersebut.

### Langkah 4: Hubungkan Web App ke UI FinTrack
1. Buka file `index.html` dari folder project ini di browser web Anda (Cukup klik dua kali `index.html`).
2. Di pojok kanan atas aplikasi, klik ikon **Pengaturan (roda gigi)**.
3. Paste **URL Aplikasi Web** yang sudah Anda salin sebelumnya ke dalam kolom yang tersedia.
4. Klik **Simpan Pengaturan**. Aplikasi akan otomatis memuat data.

---

## Logika Aplikasi

### Dashboard di Spreadsheet
Saat Anda menjalankan fungsi `setup`, spreadsheet akan otomatis dibuatkan sebuah sheet bernama **Dashboard**. Sheet ini akan memberikan informasi otomatis mengenai Total Pemasukan, Total Pengeluaran, Saldo Saat Ini, dan Total Hutang (Sisa) berdasarkan kalkulasi langsung (`=SUM`) dari sheet terkait.

### Logika Manajemen Hutang
Sesuai dengan permintaan sistem:
- **Saat Anda Berhutang (Memberikan pinjaman uang ke pihak lain)**: 
  Sistem akan membuat kartu di menu Hutang. Sistem juga akan *otomatis* mencatatnya sebagai **Pengeluaran** dengan kategori "Peminjaman Duit (Hutang)".
- **Saat Hutang Dibayar**:
  Sistem akan mengupdate sisa hutang di kartu tersebut. Sistem juga akan *otomatis* mencatatnya sebagai **Pemasukan** dengan kategori "Pembayaran Hutang".
- **Penghapusan Kartu Hutang**:
  Jika Anda menghapus kartu hutang yang sudah lunas (dengan menekan ikon tong sampah di kartu hutang), data historis pada Pemasukan dan Pengeluaran **tidak akan hilang**, sehingga keuangan Anda tetap seimbang dan terlacak sempurna.

### Upload Bukti (Pengeluaran)
Form pengeluaran memiliki opsi untuk mengunggah file gambar / PDF (maks 2MB).
Saat Anda menyimpan data dengan file, Apps Script akan otomatis membuat folder bernama `FinTrack Receipts` di Google Drive Anda, dan menaruh struk/file di sana, kemudian menyimpan URL file ke dalam Sheet Pengeluaran.
