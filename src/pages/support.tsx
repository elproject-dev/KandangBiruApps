import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Clock, Info, Globe, Github, Database } from "lucide-react";

export default function Support() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Hubungi Support</h1>
        <p className="text-muted-foreground mt-1">Kami siap membantu Anda</p>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
          Kontak Kami
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">WhatsApp</h3>
                <p className="text-sm text-muted-foreground">+62 838-6718-0887</p>
                
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Email</h3>
                <p className="text-sm text-muted-foreground">elproject.dev@gmail.com</p>

              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Jam Operasional</h3>
                <p className="text-sm text-muted-foreground">Senin - Sabtu</p>
                <p className="text-xs text-muted-foreground mt-1">08:00 - 21:00 WIB</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button className="w-full" onClick={() => window.open('https://wa.me/6283867180887', '_blank')}>
              Chat via WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Info className="h-5 w-5" /> Informasi Aplikasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Versi</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Nama Aplikasi</span>
            <span className="font-medium">Kandang Biru</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Pengembang</span>
            <span className="font-medium">EL PROJECT DEVELOPMENT</span>
          </div>

          <div className="pt-3 border-t border-primary/20 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-center gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 shadow-sm"
              onClick={() => window.open('https://github.com/elproject-dev/KandangBiruApps', '_blank')}
            >
              <Github className="h-4 w-4" />
              Kode Sumber (GitHub)
            </Button>
            <Button
              variant="outline"
              className="w-full justify-center gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 shadow-sm"
              onClick={() => window.open('https://vercel.com', '_blank')}
            >
              <Globe className="h-4 w-4" />
              Deployment (Vercel)
            </Button>
            <Button
              variant="outline"
              className="w-full justify-center gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 shadow-sm"
              onClick={() => window.open('https://supabase.com/dashboard/project/lftxcfhgonpflymegugs', '_blank')}
            >
              <Database className="h-4 w-4" />
              Database (Supabase)
            </Button>
          </div>

          <div className="pt-3 border-t border-primary/20">
            <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
              © 2026 EL PROJECT DEVELOPMENT. Semua hak dilindungi.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
