import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import {
  TrendingUp, Package, ShoppingCart, AlertTriangle,
  ArrowRight, Clock, Leaf, CheckCircle, Calendar, ArrowDownLeft, Download, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/store";
import { getProducts, getTransactions, getExpenses } from "@/lib/supabase-store";
import { useCategories } from "@/lib/category-context";

export default function Dashboard() {
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { categories } = useCategories();

  // Load data from Supabase
  useEffect(() => {
    setMounted(true);
    const loadData = async () => {
      try {
        const [productsData, transactionsData, expensesData] = await Promise.all([
          getProducts(),
          getTransactions(),
          getExpenses()
        ]);
        setProducts(productsData);
        setTransactions(transactionsData);
        setExpenses(expensesData);
      } catch (err) {
        console.error("Failed to load data from Supabase:", err);
        // Fallback to localStorage
        setProducts(JSON.parse(localStorage.getItem("pakan_ternak_products") || "[]"));
        setTransactions(JSON.parse(localStorage.getItem("pakan_ternak_transactions") || "[]"));
        setExpenses(JSON.parse(localStorage.getItem("pakan_ternak_expenses") || "[]"));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Download dialog state
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("all");

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayTxs = transactions.filter((t) => new Date(t.date).toDateString() === today);
    const todayRevenue = todayTxs.reduce((s, t) => s + t.total, 0);
    const thisMonth = new Date();
    const monthTxs = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
    });
    const monthRevenue = monthTxs.reduce((s, t) => s + t.total, 0);
    const totalRevenue = transactions.reduce((s, t) => s + t.total, 0);
    const lowStock = products.filter((p) => p.stock < 10);
    
    // Calculate expenses
    const todayExpenses = expenses.filter((e: any) => new Date(e.date).toDateString() === today);
    const todayExpenseTotal = todayExpenses.reduce((s: number, e: any) => s + e.amount, 0);
    const monthExpenses = expenses.filter((e: any) => {
      const d = new Date(e.date);
      return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
    });
    const monthExpenseTotal = monthExpenses.reduce((s: number, e: any) => s + e.amount, 0);
    const totalExpenseTotal = expenses.reduce((s: number, e: any) => s + e.amount, 0);
    
    return { todayRevenue, todayTxs: todayTxs.length, monthRevenue, monthTxs: monthTxs.length, totalRevenue, lowStock, todayExpenseTotal, monthExpenseTotal, totalExpenseTotal, todayExpenseCount: todayExpenses.length };
  }, [products, transactions, expenses]);

  const categoryStats = useMemo(() => {
    return categories.map((cat) => {
      const catProducts = products.filter((p) => p.category === cat.name);
      const totalVariants = catProducts.reduce((s, p) => s + p.variants.length, 0);
      return { category: cat, count: catProducts.length, totalVariants };
    }).filter((c) => c.count > 0);
  }, [products, categories]);

  const recentTransactions = useMemo(() => transactions.slice(0, 6), [transactions]);

  const topProducts = useMemo(() => {
    const salesMap: Record<string, { product: typeof products[0]; sold: number; revenue: number }> = {};
    for (const tx of transactions) {
      for (const item of tx.items) {
        if (!salesMap[item.product.id]) {
          salesMap[item.product.id] = { product: item.product, sold: 0, revenue: 0 };
        }
        salesMap[item.product.id].sold += item.quantity;
        salesMap[item.product.id].revenue += item.variant.price * item.quantity;
      }
    }
    return Object.values(salesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [transactions]);

  const handleDownloadReport = async (range: "today" | "week" | "month" | "all" = "all") => {
    try {
      const ExcelJS = await import("exceljs");
      
      // Filter transactions based on date range
      let filteredTransactions = transactions;
      const now = new Date();
      const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (range === "today") {
        filteredTransactions = transactions.filter(t => {
          const txDate = new Date(t.date);
          return txDate.toDateString() === currentDate.toDateString();
        });
      } else if (range === "week") {
        const weekAgo = new Date(currentDate);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filteredTransactions = transactions.filter(t => {
          const txDate = new Date(t.date);
          return txDate >= weekAgo;
        });
      } else if (range === "month") {
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        filteredTransactions = transactions.filter(t => {
          const txDate = new Date(t.date);
          return txDate >= thisMonth;
        });
      }
      
      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Laporan Penjualan");
      
      // Define columns
      worksheet.columns = [
        { header: "Tanggal", key: "tanggal", width: 15 },
        { header: "Jam", key: "jam", width: 10 },
        { header: "Pelanggan", key: "pelanggan", width: 20 },
        { header: "Nama Produk", key: "namaProduk", width: 35 },
        { header: "Qty", key: "qty", width: 8 },
        { header: "Harga Satuan", key: "hargaSatuan", width: 15 },
        { header: "Varian", key: "varian", width: 12 },
        { header: "Diskon", key: "diskon", width: 10 },
        { header: "PPN", key: "ppn", width: 10 },
        { header: "Layanan", key: "biayaLayanan", width: 10 },
        { header: "Total Transaksi", key: "totalTransaksi", width: 15 },
      ];

      // Add data
      filteredTransactions.forEach((tx) => {
        tx.items.forEach((item, index) => {
          worksheet.addRow({
            tanggal: new Date(tx.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
            jam: new Date(tx.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            pelanggan: tx.customerName,
            namaProduk: item.product.name,
            qty: item.quantity,
            hargaSatuan: item.variant.price,
            varian: item.variant.label,
            diskon: index === 0 ? (tx.discount || 0) : null,
            ppn: index === 0 ? (tx.ppn || 0) : null,
            biayaLayanan: index === 0 ? (tx.serviceCharge || 0) : null,
            totalTransaksi: index === 0 ? tx.total : null,
          });
        });
        // Add empty row after each transaction
        worksheet.addRow([]);
      });

      // Apply number format and alignment to all cells
      worksheet.eachRow((row, rowNumber) => {
        // Skip empty rows - check if first cell is empty
        const firstCell = row.getCell(1);
        if (!firstCell || !firstCell.value) {
          return;
        }
        
        row.eachCell((cell, colNumber) => {
          // Header row
          if (rowNumber === 1) {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF000000" }
            };
            // Header alignment per column
            if (colNumber === 1 || colNumber === 2) {
              // Tanggal and Jam header: center
              cell.alignment = { horizontal: "center", vertical: "middle" };
            } else if (colNumber === 5) {
              // Qty header: center
              cell.alignment = { horizontal: "center", vertical: "middle" };
            } else if (colNumber >= 6 && colNumber <= 11) {
              // Price columns and Varian header: right
              cell.alignment = { horizontal: "right", vertical: "middle" };
            } else {
              // Other columns (Pelanggan, Nama Produk) header: left
              cell.alignment = { horizontal: "left", vertical: "middle" };
            }
          } else {
            // Data rows
            // Tanggal and Jam (columns 1-2): center
            if (colNumber === 1 || colNumber === 2) {
              cell.alignment = { horizontal: "center", vertical: "middle" };
            }
            // Qty (column 5): center
            else if (colNumber === 5) {
              cell.alignment = { horizontal: "center", vertical: "middle" };
            }
            // Price columns and Varian (6-11): right
            else if (colNumber >= 6 && colNumber <= 11) {
              cell.alignment = { horizontal: "right", vertical: "middle" };
              // Only apply number format to price columns (6, 8-11), not Varian (7)
              if (cell.value && colNumber !== 7) {
                cell.numFmt = "#,##0";
              }
              // Make Total Transaksi column (11) bold
              if (colNumber === 11) {
                cell.font = { bold: true };
              }
            }
            // Other columns (Pelanggan, Nama Produk): left
            else {
              cell.alignment = { horizontal: "left", vertical: "middle" };
            }
          }
        });
      });

      // Generate filename with current date
      const today = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }).replace(/\//g, "-");
      const filename = `laporan-penjualan-${today}.xlsx`;

      // Download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading report:", err);
    }
  };

  const statCards = [
    { title: "Omset Hari Ini", value: formatCurrency(stats.todayRevenue), sub: `${stats.todayTxs} transaksi`, icon: Calendar, iconColor: "text-emerald-600" },
    { title: "Omset Bulan Ini", value: formatCurrency(stats.monthRevenue), sub: `${stats.monthTxs} transaksi`, icon: CheckCircle, iconColor: "text-sky-600" },
    { title: "Total Produk", value: products.length.toString(), sub: `${products.reduce((s, p) => s + p.variants.length, 0)} varian harga`, icon: Package, iconColor: "text-amber-600" },
    { title: "Stok Menipis", value: stats.lowStock.length.toString(), sub: stats.lowStock.length > 0 ? "perlu restock" : "stok aman", icon: AlertTriangle, iconColor: stats.lowStock.length > 0 ? "text-yellow-600" : "text-muted-foreground" },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Memuat dashboard...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Banner */}
      <div className="bg-gradient-to-br from-primary via-emerald-500 to-teal-600 rounded-2xl p-5 lg:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-20 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="h-5 w-5 opacity-90" />
            <span className="text-sm font-medium opacity-90">Selamat datang</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold">Kandang Biru Bantul</h2>
          <p className="text-sm opacity-80 mt-1">
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <div className="flex flex-wrap gap-3 mt-4 w-full">
            <Link href="/catalog" className="flex-1 min-w-[140px]">
              <Button size="sm" className="w-full bg-white text-primary hover:bg-white/90 rounded-full gap-2 font-semibold no-print">
                <ShoppingCart className="h-3.5 w-3.5" />Mulai Transaksi
              </Button>
            </Link>
            <Link href="/products" className="flex-1 min-w-[140px]">
              <Button size="sm" variant="ghost" className="w-full text-white hover:bg-white/20 rounded-full gap-2 border border-white/30 no-print">
                <Package className="h-3.5 w-3.5" />Kelola Stok
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-card-border shadow-sm hover:shadow-md transition-shadow relative">
              <CardContent className="p-4">
                <p className="text-base lg:text-lg font-bold" data-testid={`stat-${card.title}`}>{card.value}</p>
                <p className="text-xs font-medium mt-0.5">{card.title}</p>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
                <div className={`absolute bottom-6 right-4 ${card.iconColor || "text-muted-foreground/30"}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <Card className="border-card-border shadow-sm h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Transaksi Terbaru
              </CardTitle>
              <Link href="/history">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary h-7 no-print ml-2">
                  Lihat Semua <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Belum ada transaksi</p>
                  <Link href="/catalog">
                    <Button size="sm" className="mt-3 rounded-full">Mulai Transaksi</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/60 transition-colors" data-testid={`dashboard-tx-${tx.id}`}>
                      <div className="flex-1 min-w-0 leading-tight">
                        <p className="text-sm font-medium truncate leading-tight">{tx.customerName}</p>
                        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                          {new Date(tx.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          · {tx.items.length} item
                        </p>
                      </div>
                      <p className="text-sm font-bold text-primary shrink-0 leading-tight">{formatCurrency(tx.total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Category breakdown */}
          <Card className="border-card-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-5">
                <Package className="h-4 w-4 text-primary" />
                Kategori Produk
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {categoryStats.map(({ category, count, totalVariants }) => (
                <div key={category.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{category.name}</span>
                      <span className="text-muted-foreground text-xs">{count} produk</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full">
                      <div
                        className="h-1.5 bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(100, (count / products.length) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{totalVariants} varian harga</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Low stock alert */}
          {stats.lowStock.length > 0 && (
            <Card className="border-yellow-400 bg-yellow-500 shadow-sm hidden sm:block">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <AlertTriangle className="h-4 w-4 text-white" />
                  Stok Menipis
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {stats.lowStock.slice(0, 4).map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <p className="text-xs font-medium truncate flex-1 mr-2 text-white">{product.name}</p>
                    <Badge variant="outline" className="text-white border-white text-xs shrink-0">
                      {product.stock} unit
                    </Badge>
                  </div>
                ))}
                {stats.lowStock.length > 4 && (
                  <p className="text-xs text-white/80">+{stats.lowStock.length - 4} produk lainnya</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <Card className="border-card-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              Produk Terlaris
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {topProducts.map(({ product, sold, revenue }, index) => (
                <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors" data-testid={`top-product-${product.id}`}>
                  <div className="text-xl font-black text-muted-foreground/30 w-7 text-center leading-none">{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{sold} terjual</p>
                    <p className="text-xs font-bold text-primary">{formatCurrency(revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense and Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Expense Card */}
        <Link href="/expenses">
          <Card className="border-card-border shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 relative">
            <ArrowDownLeft className="absolute top-4 right-4 h-5 w-5 text-destructive/50" />
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Pengeluaran Hari Ini
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-bold text-destructive">{formatCurrency(stats.todayExpenseTotal)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.todayExpenseCount} catatan pengeluaran</p>
            </CardContent>
          </Card>
        </Link>

        {/* Download Report Card */}
        <Card 
          className="border-card-border shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 relative"
          onClick={() => setDownloadDialogOpen(true)}
        >
          <Download className="absolute top-4 right-4 h-5 w-5 text-primary/50" />
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Download Laporan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold text-primary">{transactions.length} Transaksi</p>
            <p className="text-xs text-muted-foreground mt-1">Laporan penjualan dalam format Excel</p>
          </CardContent>
        </Card>
      </div>

      {/* Low stock alert - Mobile only */}
      {stats.lowStock.length > 0 && (
        <Card className="border-yellow-400 bg-yellow-500 shadow-sm sm:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <AlertTriangle className="h-4 w-4 text-white" />
              Stok Menipis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {stats.lowStock.slice(0, 4).map((product) => (
              <div key={product.id} className="flex items-center justify-between">
                <p className="text-xs font-medium truncate flex-1 mr-2 text-white">{product.name}</p>
                <Badge variant="outline" className="text-white border-white text-xs shrink-0">
                  {product.stock} unit
                </Badge>
              </div>
            ))}
            {stats.lowStock.length > 4 && (
              <p className="text-xs text-white/80">+{stats.lowStock.length - 4} produk lainnya</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Access */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        {[
          { href: "/expenses", icon: ArrowDownLeft, label: "Pengeluaran", desc: "Catat Pengeluaran" },
          { href: "/products", icon: Package, label: "Kelola Produk", desc: "Tambah & edit varian" },
          { href: "/history", icon: Clock, label: "Lihat Riwayat", desc: "Histori transaksi" },
          { href: "/cart", icon: ShoppingCart, label: "Keranjang", desc: "Lanjutkan checkout" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="border-card-border shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-0.5 relative">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  <div className="absolute top-4 right-4 text-muted-foreground/30">
                    <Icon className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Download Dialog */}
      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Laporan Penjualan</DialogTitle>
            <DialogDescription>
              Pilih rentang tanggal untuk laporan yang ingin diunduh
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih rentang tanggal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="week">7 Hari Terakhir</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
                <SelectItem value="all">Semua Waktu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDownloadDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => {
              handleDownloadReport(dateRange);
              setDownloadDialogOpen(false);
            }}>
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
