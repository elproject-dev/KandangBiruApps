# Setup Supabase untuk Kandang Biru

## Langkah 1: Buat Project Supabase

1. Buka https://supabase.com
2. Sign up atau login
3. Klik "New Project"
4. Masukkan:
   - Name: `kandang-biru`
   - Database Password: (buat password yang kuat dan simpan)
   - Region: Pilih region terdekat (misal: Singapore)
5. Klik "Create new project"
6. Tunggu beberapa menit hingga project siap

## Langkah 2: Dapatkan Credentials

1. Di dashboard Supabase, klik "Settings" → "API"
2. Copy:
   - **Project URL** → paste ke `.env` sebagai `VITE_SUPABASE_URL`
   - **anon public** key → paste ke `.env` sebagai `VITE_SUPABASE_ANON_KEY`

## Langkah 3: Update .env File

Buka file `.env` di root project dan update:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Langkah 4: Setup Tabel Database

1. Di dashboard Supabase, klik "SQL Editor"
2. Klik "New query"
3. Copy semua isi file `supabase-setup.sql`
4. Paste ke SQL Editor
5. Klik "Run" untuk execute

Tabel yang akan dibuat:
- `products` - untuk menyimpan data produk
- `transactions` - untuk menyimpan riwayat transaksi
- `expenses` - untuk menyimpan data pengeluaran
- `settings` - untuk menyimpan pengaturan aplikasi

## Langkah 5: Update Kode Aplikasi

Untuk migrasi dari localStorage ke Supabase, ubah import di file-file yang menggunakan data:

**Sebelum:**
```typescript
import { getProducts, saveProduct, deleteProduct } from "@/lib/store";
```

**Setelah:**
```typescript
import { getProducts, saveProduct, deleteProduct } from "@/lib/supabase-store";
```

File yang perlu diupdate:
- `src/pages/products.tsx`
- `src/pages/cart.tsx`
- `src/pages/history.tsx`
- `src/pages/expenses.tsx`
- `src/pages/dashboard.tsx`
- `src/pages/settings.tsx`

## Langkah 6: Test Koneksi

Setelah update import, jalankan aplikasi dan test:
1. Tambah produk baru
2. Buat transaksi
3. Cek di Supabase dashboard → Table Editor untuk memastikan data tersimpan

## Catatan Penting

- RLS (Row Level Security) saat ini di-set untuk public access. Untuk production, sebaiknya setup authentication
- Untuk mengubah ke production dengan auth, perlu menambahkan sistem login
- Data di localStorage tidak akan otomatis migrasi. Perlu manual entry ulang atau script migrasi

## Troubleshooting

**Error: "Invalid API key"**
- Pastikan credentials di `.env` benar
- Restart development server setelah update `.env`

**Error: "Table does not exist"**
- Pastikan SQL script sudah dijalankan
- Cek di Table Editor apakah tabel sudah dibuat

**Error: "Permission denied"**
- Cek RLS policies di Supabase
- Pastikan policies mengizinkan akses
