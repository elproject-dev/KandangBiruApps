import { useState, useEffect } from "react";
import { RefreshCw, Calculator, ArrowRight, CheckCircle, Table } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProducts, updateProduct } from "@/lib/supabase-store";
import { useToast } from "@/hooks/use-toast";

const CONVERSION_RATES: Record<string, number> = {
  ons: 1,
  kg: 10,
  "sak-25kg": 250,
  "sak-50kg": 500,
  ton: 10000,
};

const UNIT_LABELS: Record<string, string> = {
  ons: "Ons",
  kg: "Kilogram (kg)",
  "sak-25kg": "Sak 25 kg",
  "sak-50kg": "Sak 50 kg",
  ton: "Ton",
};

export default function StockConversion() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [unit, setUnit] = useState("sak-50kg");
  const [amount, setAmount] = useState("");
  const [convertedToOns, setConvertedToOns] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    const loadProducts = async () => {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        console.error("Failed to load products:", err);
        toast({ title: "Gagal memuat produk", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [toast]);

  useEffect(() => {
    if (amount && unit) {
      const numAmount = parseFloat(amount.replace(/\./g, '').replace(/,/g, '.'));
      if (!isNaN(numAmount)) {
        const unitRate = CONVERSION_RATES[unit];
        const result = numAmount * unitRate;
        setConvertedToOns(result);
      } else {
        setConvertedToOns(null);
      }
    } else {
      setConvertedToOns(null);
    }
  }, [amount, unit]);

  const handleConvert = async () => {
    if (!selectedProduct || !amount || !convertedToOns) {
      toast({ title: "Data tidak lengkap", variant: "destructive" });
      return;
    }

    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    setConverting(true);
    try {
      const currentStock = product.stock;
      const numAmount = parseFloat(amount.replace(/\./g, '').replace(/,/g, '.'));
      // Konversi input langsung ke ONS (satuan dasar) untuk disimpan di stok
      const unitRate = CONVERSION_RATES[unit];
      const addedOns = numAmount * unitRate;
      const newStock = currentStock + addedOns;

      await updateProduct(selectedProduct, {
        name: product.name,
        description: product.description,
        category: product.category,
        stock: Math.round(newStock),
        variants: product.variants,
      });

      toast({
        title: "Konversi Berhasil",
        description: `Stok ${product.name} ditambah ${amount} ${unit} = ${addedOns % 1 === 0 ? addedOns.toFixed(0) : addedOns.toFixed(2)} ons`,
      });

      // Reload products
      const data = await getProducts();
      setProducts(data);
      setAmount("");
      setConvertedToOns(null);
    } catch (err) {
      console.error("Failed to convert stock:", err);
      toast({ title: "Gagal konversi stok", variant: "destructive" });
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Memuat produk...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <RefreshCw className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Konversi Stok</h1>
          <p className="text-sm text-muted-foreground">Konversi dan tambah stok produk</p>
        </div>
      </div>

      {/* Conversion Calculator */}
      <Card className="border-card-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Kalkulator Konversi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="product">Pilih Produk</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Pilih produk" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} (Stok: {product.stock} ons)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="unit">Satuan</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(UNIT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Jumlah</Label>
            <Input
              id="amount"
              type="text"
              placeholder="Masukkan jumlah..."
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5"
            />
          </div>

          {convertedToOns !== null && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-sm font-medium text-primary">Hasil Konversi ke Ons</p>
                    <p className="text-xl sm:text-2xl font-bold text-primary truncate">
                      {convertedToOns % 1 === 0 ? convertedToOns.toFixed(0) : convertedToOns.toFixed(2)} ons
                    </p>
                  </div>
                </div>
                <Button onClick={handleConvert} disabled={converting || !selectedProduct} size="sm" className="text-xs sm:text-sm shrink-0">
                  {converting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                      Tambah ke Stok
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Table */}
      <Card className="border-card-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Table className="h-4 w-4 text-primary" />
            Tabel Konversi
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-[11px] sm:text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 pr-3 sm:py-2 sm:pr-4 font-semibold">Satuan</th>
                  <th className="text-left py-1.5 pr-3 sm:py-2 sm:pr-4 font-semibold">Konversi ke Ons</th>
                  <th className="text-left py-1.5 sm:py-2 font-semibold">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-1.5 pr-3 sm:py-2 sm:pr-4">Ons</td>
                  <td className="py-1.5 pr-3 sm:py-2 sm:pr-4">1 ons</td>
                  <td className="py-1.5 sm:py-2 text-muted-foreground">Satuan dasar</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1.5 pr-3 sm:py-2 sm:pr-4">Kilogram (kg)</td>
                  <td className="py-1.5 pr-3 sm:py-2 sm:pr-4">10 ons</td>
                  <td className="py-1.5 sm:py-2 text-muted-foreground">1 kg = 10 ons</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1.5 pr-3 sm:py-2 sm:pr-4">Sak 25 kg</td>
                  <td className="py-1.5 pr-3 sm:py-2 sm:pr-4">250 ons</td>
                  <td className="py-1.5 sm:py-2 text-muted-foreground">1 sak 25 kg = 25 kg</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1.5 pr-3 sm:py-2 sm:pr-4">Sak 50 kg</td>
                  <td className="py-1.5 pr-3 sm:py-2 sm:pr-4">500 ons</td>
                  <td className="py-1.5 sm:py-2 text-muted-foreground">1 sak 50 kg = 50 kg</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 sm:py-2 sm:pr-4">Ton</td>
                  <td className="py-1.5 pr-3 sm:py-2 sm:pr-4">10.000 ons</td>
                  <td className="py-1.5 sm:py-2 text-muted-foreground">1 ton = 1.000 kg</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
