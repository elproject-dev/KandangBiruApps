import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
      <p className="text-lg font-medium text-foreground mb-1">Halaman Tidak Ditemukan</p>
      <p className="text-sm text-muted-foreground mb-6">
        Halaman yang Anda cari tidak tersedia
      </p>
      <Link href="/" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium text-sm">
        Kembali ke Beranda
      </Link>
    </div>
  );
}
