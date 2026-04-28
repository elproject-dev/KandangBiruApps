import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import {
  TrendingUp, Package, ShoppingCart, AlertTriangle,
  ArrowRight, Clock, Leaf, CheckCircle, Calendar, DollarSign, Download, Loader2, RefreshCw, Wallet, Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/store";
import { getProducts, getTransactions, getExpenses } from "@/lib/supabase-store";
import { useCategories } from "@/lib/category-context";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Capacitor } from "@capacitor/core";

export default function Dashboard() {
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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

  // Detect mobile/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Download dialog state
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("all");

  // Chart filter state
  const [chartFilter, setChartFilter] = useState<"week" | "month" | "all">("week");
  // Profit filter state
  const [profitFilter, setProfitFilter] = useState<"today" | "week" | "month" | "all">("today");
  // Admin mode state
  const [isAdminMode, setIsAdminMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminMode') === 'true';
    }
    return false;
  });
  const [adminPasswordDialog, setAdminPasswordDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const ADMIN_PASSWORD = "admin123"; // Bisa diubah nanti

  const handleToggleAdminMode = () => {
    if (isAdminMode) {
      // Exit admin mode
      setIsAdminMode(false);
      localStorage.setItem('adminMode', 'false');
    } else {
      // Show password dialog
      setAdminPasswordDialog(true);
    }
  };

  const handleAdminPasswordSubmit = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdminMode(true);
      localStorage.setItem('adminMode', 'true');
      setAdminPasswordDialog(false);
      setAdminPassword("");
      toast({ title: "Mode Admin Aktif", description: "Anda sekarang bisa melihat informasi laba" });
    } else {
      toast({ title: "Password Salah", description: "Password tidak valid", variant: "destructive" });
      setAdminPassword("");
    }
  };

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
    
    // Week transactions
    const weekTxs = transactions.filter((t) => {
      const txDate = new Date(t.date);
      const now = new Date();
      const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      return txDate >= weekAgo;
    });
    
    // Calculate profit (laba)
    const calculateProfit = (txs: any[]) => {
      return txs.reduce((total: number, tx: any) => {
        return total + tx.items.reduce((itemTotal: number, item: any) => {
          const originalPrice = item.variant.originalPrice || 0;
          const sellingPrice = item.variant.sellingPrice || 0;
          const profitPerUnit = sellingPrice - originalPrice;
          return itemTotal + (profitPerUnit * item.quantity);
        }, 0);
      }, 0);
    };
    const totalProfit = calculateProfit(transactions);
    const todayProfit = calculateProfit(todayTxs);
    const monthProfit = calculateProfit(monthTxs);
    const weekProfit = calculateProfit(weekTxs);
    
    // Calculate expenses
    const todayExpenses = expenses.filter((e: any) => new Date(e.date).toDateString() === today);
    const todayExpenseTotal = todayExpenses.reduce((s: number, e: any) => s + e.amount, 0);
    const monthExpenses = expenses.filter((e: any) => {
      const d = new Date(e.date);
      return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
    });
    const monthExpenseTotal = monthExpenses.reduce((s: number, e: any) => s + e.amount, 0);
    const totalExpenseTotal = expenses.reduce((s: number, e: any) => s + e.amount, 0);
    
    return { todayRevenue, todayTxs: todayTxs.length, monthRevenue, monthTxs: monthTxs.length, totalRevenue, lowStock, todayExpenseTotal, monthExpenseTotal, totalExpenseTotal, todayExpenseCount: todayExpenses.length, totalProfit, todayProfit, monthProfit, weekProfit };
  }, [products, transactions, expenses]);

  const categoryStats = useMemo(() => {
    return categories.map((cat) => {
      const catProducts = products.filter((p) => p.category === cat.name);
      const totalVariants = catProducts.reduce((s, p) => s + p.variants.length, 0);
      return { category: cat, count: catProducts.length, totalVariants };
    }).filter((c) => c.count > 0);
  }, [products, categories]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  const topProducts = useMemo(() => {
    const salesMap: Record<string, { product: typeof products[0]; sold: number; revenue: number }> = {};
    for (const tx of transactions) {
      for (const item of tx.items) {
        if (!salesMap[item.product.id]) {
          salesMap[item.product.id] = { product: item.product, sold: 0, revenue: 0 };
        }
        salesMap[item.product.id].sold += item.quantity;
        salesMap[item.product.id].revenue += item.variant.sellingPrice * item.quantity;
      }
    }
    return Object.values(salesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [transactions]);

  // Data untuk chart berdasarkan filter
  const chartData = useMemo(() => {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const data = [];
    const today = new Date();
    const barsCount = isMobile ? 8 : 15;

    if (chartFilter === "week") {
      // Harian (Rolling otomatis, 8 batang mobile / 15 batang desktop)
      for (let i = barsCount - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();

        const dayTransactions = transactions.filter(t => new Date(t.date).toDateString() === dateStr);
        const totalRevenue = dayTransactions.reduce((sum, t) => sum + t.total, 0);

        data.push({
          day: date.getDate().toString().padStart(2, '0'),
          date: date.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
          pendapatan: totalRevenue
        });
      }
    } else if (chartFilter === "month") {
      // Bulanan (Rolling otomatis, 8 batang mobile / 15 batang desktop)
      for (let i = barsCount - 1; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthTxs = transactions.filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
        });
        const totalRevenue = monthTxs.reduce((sum, t) => sum + t.total, 0);

        data.push({
          day: months[date.getMonth()],
          date: date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
          pendapatan: totalRevenue
        });
      }
    } else {
      // Tahunan (Rolling otomatis, 8 batang mobile / 15 batang desktop)
      for (let i = barsCount - 1; i >= 0; i--) {
        const year = today.getFullYear() - i;
        const yearTxs = transactions.filter(t => {
          const d = new Date(t.date);
          return d.getFullYear() === year;
        });
        const totalRevenue = yearTxs.reduce((sum, t) => sum + t.total, 0);

        data.push({
          day: year.toString(),
          date: `Tahun ${year}`,
          pendapatan: totalRevenue
        });
      }
    }

    return data;
  }, [transactions, chartFilter, isMobile]);

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
      const columns = [
        { header: "Tanggal", key: "tanggal", width: 15 },
        { header: "Jam", key: "jam", width: 10 },
        { header: "Pelanggan", key: "pelanggan", width: 20 },
        { header: "Nama Produk", key: "namaProduk", width: 35 },
        { header: "Qty", key: "qty", width: 8 },
        { header: "Varian", key: "varian", width: 12 },
        { header: "Harga Asli", key: "hargaAsli", width: 15 },
        { header: "Harga Jual", key: "hargaJual", width: 15 },
        { header: "Diskon", key: "diskon", width: 10 },
        { header: "PPN", key: "ppn", width: 10 },
        { header: "Layanan", key: "biayaLayanan", width: 10 },
        ...(isAdminMode ? [{ header: "Laba", key: "laba", width: 15 }] : []),
        { header: "Total Transaksi", key: "totalTransaksi", width: 15 },
      ];
      worksheet.columns = columns;

      // Add data
      filteredTransactions.forEach((tx) => {
        tx.items.forEach((item: any, index: number) => {
          const originalPrice = item.variant.originalPrice || 0;
          const sellingPrice = item.variant.sellingPrice || 0;
          const profitPerUnit = sellingPrice - originalPrice;
          const itemProfit = profitPerUnit * item.quantity;
          
          const rowData: any = {
            tanggal: new Date(tx.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
            jam: new Date(tx.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            pelanggan: tx.customerName,
            namaProduk: item.product.name,
            qty: item.quantity,
            varian: item.variant.label || item.variant.name || '',
            hargaAsli: originalPrice,
            hargaJual: sellingPrice,
            diskon: index === 0 ? (tx.discount || 0) : null,
            ppn: index === 0 ? (tx.ppn || 0) : null,
            biayaLayanan: index === 0 ? (tx.serviceCharge || 0) : null,
            totalTransaksi: index === 0 ? tx.total : null,
          };
          
          if (isAdminMode) {
            rowData.laba = itemProfit;
          }
          
          worksheet.addRow(rowData);
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
        
        const labaColumnIndex = isAdminMode ? 12 : -1; // Laba column index if exists
        const totalColumnIndex = isAdminMode ? 13 : 12; // Total Transaksi column index
        
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
            } else if (colNumber >= 7 && (isAdminMode ? colNumber <= 13 : colNumber <= 12)) {
              // Price columns (Harga Asli, Harga Jual, Diskon, PPN, Layanan, Laba, Total) header: right
              cell.alignment = { horizontal: "right", vertical: "middle" };
            } else {
              // Other columns (Pelanggan, Nama Produk, Varian) header: left
              cell.alignment = { horizontal: "left", vertical: "middle" };
            }
          } else {
            // Data rows
            // Tanggal (1) and Jam (2): center
            if (colNumber === 1 || colNumber === 2) {
              cell.alignment = { horizontal: "center", vertical: "middle" };
            }
            // Qty column (5): center
            else if (colNumber === 5) {
              cell.alignment = { horizontal: "center", vertical: "middle" };
            }
            // Price columns (7 to totalColumnIndex): right
            else if (colNumber >= 7 && colNumber <= totalColumnIndex) {
              cell.alignment = { horizontal: "right", vertical: "middle" };
              // Apply number format to numeric columns
              if (cell.value) {
                cell.numFmt = "#,##0";
              }
              // Make Total Transaksi bold
              if (colNumber === totalColumnIndex) {
                cell.font = { bold: true };
              }
            }
            // Other columns (Pelanggan, Nama Produk, Varian): left
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

      // Check if running in Tauri (desktop) by trying to import Tauri API
      try {
        console.log("Trying Tauri mode...");
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeFile } = await import("@tauri-apps/plugin-fs");
        console.log("Tauri plugins imported successfully");

        const filePath = await save({
          defaultPath: filename,
          filters: [
            {
              name: "Excel File",
              extensions: ["xlsx"]
            }
          ]
        });

        console.log("File path selected:", filePath);

        if (filePath) {
          await writeFile(filePath, new Uint8Array(buffer));
          console.log("File written successfully");
          toast({
            title: "Berhasil",
            description: "File berhasil disimpan",
          });
        } else {
          toast({
            title: "Dibatalkan",
            description: "User membatalkan pemilihan file",
          });
        }
      } catch (error: any) {
        console.log("Tauri not available, using fallback:", error.message);
        // Fallback to Capacitor or browser
        if (Capacitor.isNativePlatform()) {
          // On Android/iOS (Capacitor native), browser-style download often doesn't work.
          // Save the file using Filesystem then open share sheet.
          const { Filesystem, Directory } = await import("@capacitor/filesystem");
          const { Share } = await import("@capacitor/share");

          const toBase64 = (arrayBuffer: ArrayBuffer): string => {
            const bytes = new Uint8Array(arrayBuffer);
            const chunkSize = 0x8000;
            let binary = '';
            for (let i = 0; i < bytes.length; i += chunkSize) {
              binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
            }
            return btoa(binary);
          };

          const dataBase64 = toBase64(buffer as ArrayBuffer);

          try {
            // Use Directory.Cache for Android (more reliable than Documents)
            const directory = Directory.Cache;

            await Filesystem.writeFile({
              path: filename,
              data: dataBase64,
              directory: directory,
              recursive: true,
            });

            const uri = await Filesystem.getUri({
              path: filename,
              directory: directory,
            });

            await Share.share({
              title: "Laporan Penjualan",
              text: filename,
              url: uri.uri,
              dialogTitle: "Bagikan Laporan",
            });
          } catch (err) {
            console.error("Error writing file on native platform:", err);
            toast({
              title: "Gagal Download",
              description: "Terjadi kesalahan saat menyimpan file",
              variant: "destructive"
            });
          }
        } else {
          // Browser fallback
          console.log("Using browser fallback");
          const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(url);
          toast({
            title: "Download",
            description: "File sedang didownload",
          });
        }
      }
    } catch (err) {
      console.error("Error downloading report:", err);
    }
  };

  const statCards = [
    { title: "Omset Hari Ini", value: formatCurrency(stats.todayRevenue), sub: `${stats.todayTxs} transaksi`, icon: Calendar, iconColor: "text-emerald-600" },
    { title: "Omset Bulan Ini", value: formatCurrency(stats.monthRevenue), sub: `${stats.monthTxs} transaksi`, icon: CheckCircle, iconColor: "text-sky-600" },
    { title: "Total Produk", value: products.length.toString(), sub: `${products.reduce((s, p) => s + p.variants.length, 0)} varian harga`, icon: Package, iconColor: "text-amber-600" },
    { title: "Pengeluaran", value: formatCurrency(stats.monthExpenseTotal), sub: "Bulan ini", icon: DollarSign, iconColor: "text-destructive" },
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
          <button
            onClick={handleToggleAdminMode}
            className="absolute top-3 right-2 p-2 rounded-full hover:bg-white/10 transition-colors"
            title={isAdminMode ? "Keluar mode admin" : "Masuk mode admin"}
          >
            <Shield className={`h-4 w-4 ${isAdminMode ? "text-green-400" : "text-white/50"}`} />
          </button>
          <div className="flex flex-wrap gap-3 mt-4 w-full">
            <Link href="/cart" className="flex-1 min-w-[120px]">
              <Button size="sm" className="w-full bg-white text-primary hover:bg-white/90 rounded-full gap-2 font-semibold no-print text-xs">
                <ShoppingCart className="h-3.5 w-3.5" />Mulai Transaksi
              </Button>
            </Link>
            <Link href="/products" className="flex-1 min-w-[120px]">
              <Button size="sm" variant="ghost" className="w-full text-white hover:bg-white/20 rounded-full gap-2 border border-white/30 no-print text-xs">
                <Package className="h-3.5 w-3.5" />Kelola Stok
              </Button>
            </Link>
            <Link href="/stock-conversion" className="flex-1 min-w-[120px] hidden lg:flex">
              <Button size="sm" variant="ghost" className="w-full text-white hover:bg-white/20 rounded-full gap-2 border border-white/30 no-print text-xs">
                <RefreshCw className="h-3.5 w-3.5" />Konversi Stok
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

      {/* Charts and Recent Transactions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <Card className="border-card-border shadow-sm h-full flex flex-col">
            <CardHeader className="pb-3 flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Grafik Penjualan
              </CardTitle>
              <Select value={chartFilter} onValueChange={(value: any) => setChartFilter(value)}>
                <SelectTrigger className="w-24 h-7 text-[10px] px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Harian</SelectItem>
                  <SelectItem value="month">Bulanan</SelectItem>
                  <SelectItem value="all">Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0 px-4 sm:px-6 flex-1 flex flex-col justify-center">
              <div className="h-48 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: isMobile ? (chartFilter === "week" ? 10 : 9) : 11 }}
                      className="text-muted-foreground"
                      axisLine={false}
                      tickLine={false}
                      interval={chartFilter === "week" ? "preserveEnd" : 0}
                      height={30}
                    />
                    <YAxis
                      hide
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={false}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => {
                        const data = chartData.find((d: any) => d.day === label);
                        return data ? data.date : label;
                      }}
                    />
                    <Bar dataKey="pendapatan" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-1">
          <Card className="border-card-border shadow-sm h-full flex flex-col">
            <CardHeader className="pb-3 flex flex-row items-center justify-between shrink-0">
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
            <CardContent className="pt-0 flex-1">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground h-full flex flex-col justify-center">
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
      </div>

      {/* Mobile Stock Conversion Button */}
      <div className="lg:hidden">
        <Link href="/stock-conversion">
          <Button className="w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            Konversi Stok
          </Button>
        </Link>
      </div>

      {/* Categories, Expenses and Report Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {/* Category breakdown */}
        <div className="lg:col-span-2">
          <Card className="border-card-border shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-5">
                <Package className="h-4 w-4 text-primary" />
                Kategori Produk
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categoryStats.map(({ category, count, totalVariants }) => (
                  <div key={category.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium truncate">{category.name}</span>
                        <span className="text-muted-foreground text-xs shrink-0">{count} produk</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full w-full">
                        <div
                          className="h-1.5 bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min(100, (count / products.length) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{totalVariants} varian harga</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel (Expenses, Report, and Low Stock) */}
        <div className="lg:col-span-1 flex flex-col gap-4 lg:gap-5">
          {/* Total Laba Card - Admin Only */}
          {isAdminMode && (
            <Card className="border-card-border shadow-sm hover:shadow-md transition-all relative flex flex-col justify-center min-h-[120px]">
              <div className="absolute top-4 right-4">
                <Select value={profitFilter} onValueChange={(value: any) => setProfitFilter(value)}>
                  <SelectTrigger className="w-20 h-6 text-[10px] px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hari Ini</SelectItem>
                    <SelectItem value="week">Minggu Ini</SelectItem>
                    <SelectItem value="month">Bulan Ini</SelectItem>
                    <SelectItem value="all">Semua</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Wallet className="absolute bottom-8 right-4 h-5 w-5 text-green-600/50" />
              <CardHeader className="pb-2 text-left">
                <CardTitle className="text-base">
                  Total Laba
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-left">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    profitFilter === "today" ? stats.todayProfit :
                    profitFilter === "week" ? stats.weekProfit :
                    profitFilter === "month" ? stats.monthProfit :
                    stats.totalProfit
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {profitFilter === "today" ? "Hari ini" :
                   profitFilter === "week" ? "7 hari terakhir" :
                   profitFilter === "month" ? "Bulan ini" : "Semua waktu"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Download Report Card - Admin Only */}
          {isAdminMode && (
            <Card
              className="border-card-border shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 relative flex flex-col justify-center min-h-[120px]"
              onClick={() => setDownloadDialogOpen(true)}
            >
              <Download className="absolute bottom-8 right-4 h-5 w-5 text-primary/50" />
              <CardHeader className="pb-2 text-left">
                <CardTitle className="text-base">
                  Download Laporan
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-left">
                <p className="text-2xl font-bold text-primary">{transactions.length} Transaksi</p>
                <p className="text-xs text-muted-foreground mt-1">Laporan penjualan dalam format Excel</p>
              </CardContent>
            </Card>
          )}

          {/* Low stock alert - Side Panel */}
          {stats.lowStock.length > 0 && (
            <Card className="border-yellow-400 bg-yellow-500 shadow-sm flex-1 flex flex-col h-full min-h-[120px]">
              <CardHeader className="pb-3 text-center lg:text-left">
                <CardTitle className="text-base flex items-center justify-center lg:justify-start gap-2 text-white">
                  <AlertTriangle className="h-4 w-4 text-white" />
                  Stok Menipis
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1 space-y-2 flex-1">
                <div className="flex flex-col gap-1.5 overflow-visible pr-1">
                  {stats.lowStock.slice(0, 4).map((product) => (
                    <div key={product.id} className="flex items-start justify-between p-1.5 sm:p-2 rounded-lg bg-white/10 shrink-0 gap-2">
                      <p className="text-[10px] sm:text-xs font-medium text-white break-words flex-1 leading-tight">{product.name}</p>
                      <Badge variant="outline" className="text-white border-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 h-4 sm:h-5 shrink-0 mt-0">
                        {product.stock} unit
                      </Badge>
                    </div>
                  ))}
                  {stats.lowStock.length > 4 && (
                    <p className="text-[9px] sm:text-[10px] text-white/80 text-center italic shrink-0">+{stats.lowStock.length - 4} produk lainnya</p>
                  )}
                </div>
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

      {/* Quick Access */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        {[
          { href: "/expenses", icon: DollarSign, label: "Pengeluaran", desc: "Catat Pengeluaran" },
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

      {/* Admin Password Dialog */}
      <Dialog open={adminPasswordDialog} onOpenChange={setAdminPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masuk Mode Admin</DialogTitle>
            <DialogDescription>Masukkan password untuk mengakses informasi selengkapnya</DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Password admin"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdminPasswordSubmit()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAdminPasswordDialog(false);
              setAdminPassword("");
            }}>
              Batal
            </Button>
            <Button onClick={handleAdminPasswordSubmit}>
              Masuk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
