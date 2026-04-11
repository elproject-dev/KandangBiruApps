import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Guide() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Panduan Pengguna</h1>
        <p className="text-muted-foreground mt-1">Panduan lengkap penggunaan aplikasi Kandang Biru</p>
      </div>

      {/* Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📊</span> Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h3 className="font-semibold mb-2">Ringkasan Statistik</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Omset Hari Ini</strong>: Total penjualan hari ini</li>
              <li><strong>Omset Bulan Ini</strong>: Total penjualan bulan ini</li>
              <li><strong>Total Produk</strong>: Jumlah produk yang terdaftar</li>
              <li><strong>Stok Menipis</strong>: Produk dengan stok di bawah 10 unit</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Produk Terlaris</h3>
            <p className="text-sm text-muted-foreground">Menampilkan 5 produk dengan pendapatan tertinggi</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Download Laporan</h3>
            <p className="text-sm text-muted-foreground">
              Klik card "Download Laporan" untuk mengunduh laporan penjualan dalam format Excel.
              Pilih rentang tanggal: Hari Ini, 7 Hari Terakhir, Bulan Ini, atau Semua Waktu.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Kasir */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🛒</span> Kasir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h3 className="font-semibold mb-2">Menambah Produk ke Keranjang</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Pilih produk dari daftar</li>
              <li>Pilih varian harga</li>
              <li>Masukkan jumlah kuantitas</li>
              <li>Klik tombol <Badge variant="outline">+</Badge> untuk menambah ke keranjang</li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Menyelesaikan Transaksi</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Isi nama pelanggan (opsional)</li>
              <li>Tambahkan diskon jika ada (opsional)</li>
              <li>Tambahkan PPN jika ada (opsional)</li>
              <li>Tambahkan biaya layanan jika ada (opsional)</li>
              <li>Pilih metode pembayaran</li>
              <li>Klik tombol <Badge>Selesaikan Transaksi</Badge></li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Produk */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📦</span> Kelola Produk
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h3 className="font-semibold mb-2">Menambah Produk Baru</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Klik tombol <Badge>Tambah Produk</Badge></li>
              <li>Isi nama produk</li>
              <li>Pilih kategori produk</li>
              <li>Isi deskripsi (opsional)</li>
              <li>Isi stok awal</li>
              <li>Tambahkan varian harga (nama, harga, satuan)</li>
              <li>Klik <Badge>Simpan</Badge></li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Mengedit Produk</h3>
            <p className="text-sm text-muted-foreground">
              Klik tombol edit (ikon pensil) pada produk untuk mengubah informasi produk.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Menghapus Produk</h3>
            <p className="text-sm text-muted-foreground">
              Klik tombol hapus (ikon sampah) pada produk untuk menghapusnya.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Import dari Excel</h3>
            <p className="text-sm text-muted-foreground">
              Klik tombol <Badge>Import Excel</Badge> untuk mengimpor produk dari file Excel.
              Format kolom: Nama Produk, Deskripsi, Kategori, Stok, Varian, Harga, Satuan.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Riwayat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🕐</span> Riwayat Transaksi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h3 className="font-semibold mb-2">Melihat Riwayat</h3>
            <p className="text-sm text-muted-foreground">
              Semua transaksi yang selesai akan tersimpan di halaman Riwayat.
              Anda dapat melihat detail setiap transaksi termasuk item yang dibeli.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Menghapus Riwayat</h3>
            <p className="text-sm text-muted-foreground">
              Untuk menghapus semua riwayat transaksi, pergi ke menu Setting dan klik
              <Badge variant="destructive" className="ml-1">Hapus Riwayat Transaksi</Badge>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pengeluaran */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>💸</span> Pengeluaran
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h3 className="font-semibold mb-2">Mencatat Pengeluaran</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Masukkan jumlah pengeluaran</li>
              <li>Pilih tanggal pengeluaran</li>
              <li>Isi catatan (opsional)</li>
              <li>Klik tombol <Badge>Catat</Badge></li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Melihat Pengeluaran</h3>
            <p className="text-sm text-muted-foreground">
              Semua pengeluaran akan ditampilkan di bawah form input.
              Total pengeluaran hari ini juga ditampilkan di Dashboard.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Setting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>⚙️</span> Setting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h3 className="font-semibold mb-2">Informasi Toko</h3>
            <p className="text-sm text-muted-foreground">
              Anda dapat mengubah nama toko yang ditampilkan di aplikasi.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Manajemen Kategori</h3>
            <p className="text-sm text-muted-foreground">
              Tambah, edit, atau hapus kategori produk sesuai kebutuhan.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Hapus Data</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <Badge variant="destructive" className="mr-1">Hapus Riwayat Transaksi</Badge>:
                Menghapus semua riwayat transaksi. Stok produk akan dikembalikan.
              </p>
              <p>
                <Badge variant="destructive" className="mr-1">Hapus Data Produk</Badge>:
                Menghapus semua data produk. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Konversi Satuan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>⚖️</span> Konversi Satuan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h3 className="font-semibold mb-2">Konsep Dasar Stok</h3>
            <div className="bg-muted p-3 rounded-lg border mb-3">
              <p className="text-sm font-semibold mb-2">⚠️ PENTING</p>
              <p className="text-sm text-muted-foreground">
                <strong>Selalu gunakan ONS sebagai acuan stok!</strong><br /><br />
                Jika Anda memecah produk menjadi beberapa bagian (misalnya dari sak ke kg atau ons),
                Anda harus memasukkan nilai stok dalam bentuk ONS.
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p className="text-sm font-semibold text-yellow-700 mb-2">💡 Contoh Praktis</p>
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Anda punya 5 Sak (25kg) pakan jagung:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                <li>1 Sak (25kg) = 250 ons</li>
                <li>5 Sak = 5 × 250 ons = <Badge className="bg-yellow-200 text-yellow-800">1.250 ons</Badge></li>
                <li>Jadi, saat input stok awal, masukkan: <strong>1.250 ons</strong></li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Tabel Konversi</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Satuan</th>
                    <th className="text-left py-2 pr-4">Konversi ke Ons</th>
                    <th className="text-left py-2">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-medium">1 ons</td>
                    <td className="py-2 pr-4">1 ons</td>
                    <td className="py-2">Satuan dasar (acuan)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-medium">1/4 kg</td>
                    <td className="py-2 pr-4">2.5 ons</td>
                    <td className="py-2">0.25 kg = 2.5 ons</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-medium">1/2 kg</td>
                    <td className="py-2 pr-4">5 ons</td>
                    <td className="py-2">0.5 kg = 5 ons</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-medium">1 kg</td>
                    <td className="py-2 pr-4">10 ons</td>
                    <td className="py-2">1 kg = 10 ons</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-medium">1 sak (25kg)</td>
                    <td className="py-2 pr-4">250 ons</td>
                    <td className="py-2">25 kg = 250 ons</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">1 sak (50kg)</td>
                    <td className="py-2 pr-4">500 ons</td>
                    <td className="py-2">50 kg = 500 ons</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Cara Menghitung Stok</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="bg-muted p-3 rounded-lg border">
                <p className="font-medium mb-1">Contoh 1: Dari Sak ke Ons</p>
                <p>
                  Anda punya <strong>3 Sak (25kg)</strong> dedak:<br />
                  3 × 250 ons = <Badge>750 ons</Badge> (masukkan 750 di stok)
                </p>
              </div>
              <div className="bg-muted p-3 rounded-lg border">
                <p className="font-medium mb-1">Contoh 2: Dari Kg ke Ons</p>
                <p>
                  Anda punya <strong>10 kg</strong> jagung giling:<br />
                  10 × 10 ons = <Badge>100 ons</Badge> (masukkan 100 di stok)
                </p>
              </div>
              <div className="bg-muted p-3 rounded-lg border">
                <p className="font-medium mb-1">Contoh 3: Pecah Sak ke Kecil</p>
                <p>
                  Anda beli <strong>1 Sak (50kg)</strong>, tapi mau jual per kg:<br />
                  1 Sak (50kg) = 500 ons = 50 kg<br />
                  Masukkan stok: <Badge>500 ons</Badge><br />
                  Buat varian: 1 kg (harga per kg)
                </p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Alasan Menggunakan Ons</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Ons adalah satuan terkecil yang fleksibel</li>
              <li>Mudah dikonversi ke satuan lain (kg, sak)</li>
              <li>Menghindari kebingungan dalam perhitungan stok</li>
              <li>Konsisten untuk semua jenis produk</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <span>💡</span> Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Gunakan satuan yang konsisten untuk memudahkan konversi stok</li>
            <li>Restock produk sebelum stok habis untuk menghindari kekosongan</li>
            <li>Download laporan secara berkala untuk backup data</li>
            <li>Data tersimpan di browser, jangan hapus cache browser jika ingin menyimpan data</li>
          </ul>
        </CardContent>
      </Card>

      {/* Penting - Database Supabase */}
      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <span>⚠️</span> Penting: Aktivitas Database
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-red-100 p-4 rounded-lg border border-red-300">
            <p className="text-sm font-bold text-red-800 mb-2">🚨 JAGA AKTIVITAS DATABASE SUPABASE</p>
            <p className="text-sm text-red-700 mb-3">
              Supabase akan <strong>men-pause (menonaktifkan)</strong> database jika tidak ada aktivitas selama 1 minggu.
            </p>
            <p className="text-sm text-red-700 mb-3">
              Untuk menghindari database di-pause, pastikan melakukan aktivitas di aplikasi <strong>minimal sekali seminggu</strong>,
              seperti:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700 ml-4">
              <li>Membuka aplikasi</li>
              <li>Menambah atau mengedit produk</li>
              <li>Melakukan transaksi penjualan</li>
              <li>Mencatat pengeluaran</li>
            </ul>
            <p className="text-sm text-red-800 font-semibold mt-3">
              Jika database di-pause, Anda perlu mengaktifkannya kembali melalui dashboard Supabase.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
