import { useState, useMemo, Fragment, useEffect } from "react";
import { Clock, Printer, ChevronDown, ChevronUp, Receipt, TrendingUp, Calendar, Users, Tag, ChevronLeft, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/store";
import { getTransactions, deleteTransaction, type Transaction, getSettings } from "@/lib/supabase-store";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { print, type PrintTemplateData } from "@/lib/print";
import { buildEscPosReceipt } from "@/lib/escpos-receipt";
import { bluetoothPrintEscPos } from "@/lib/bluetooth-spp-printer";
import { SerialPort } from "tauri-plugin-serialplugin-api";

function TransactionCard({ transaction, onDelete, expanded, onToggle, isAdminMode }: { transaction: Transaction; onDelete: (id: string) => void; expanded: boolean; onToggle: () => void; isAdminMode: boolean }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const handlePrint = async () => {
    // Load settings from Supabase
    const settings = await getSettings();
    
    const printData: PrintTemplateData = {
      id: transaction.id,
      date: transaction.date,
      customerName: transaction.customerName,
      paymentMethod: transaction.paymentMethod,
      items: transaction.items,
      total: transaction.total,
      discount: transaction.discount,
      serviceCharge: transaction.serviceCharge,
      ppn: transaction.ppn,
      ppnPercentage: transaction.ppnPercentage,
    };

    // Check if running in Tauri Desktop
    if (typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)) {
      try {
        const selectedPort = localStorage.getItem("selectedSerialPort");
        if (!selectedPort) {
          toast({
            title: "Printer Belum Diset",
            description: "Pilih port COM di Settings terlebih dahulu",
            variant: "destructive",
          });
          return;
        }

        const escpos = buildEscPosReceipt(printData, settings);
        const port = new SerialPort({ path: selectedPort, baudRate: 9600 });
        await port.open();
        await port.write(escpos);
        await port.close();
      } catch (err) {
        console.error("Serial printing failed:", err);
        const msg = err instanceof Error ? err.message : String(err);
        toast({
          title: "Gagal Print",
          description: msg,
          variant: "destructive",
        });
      }
      return;
    }

    // Android/iOS native platform
    if (Capacitor.isNativePlatform()) {
      try {
        const address = (localStorage.getItem("bluetoothPrinterAddress") || "").trim();
        if (!address) {
          toast({
            title: "Printer Belum Diset",
            description: "Isi alamat (MAC) printer di Settings terlebih dahulu",
            variant: "destructive",
          });
          return;
        }

        const escpos = buildEscPosReceipt(printData, settings);
        await bluetoothPrintEscPos(address, escpos);
      } catch (err) {
        console.error("Bluetooth printing failed:", err);
        const msg = err instanceof Error ? err.message : String(err);
        toast({
          title: "Gagal Print",
          description: msg,
          variant: "destructive",
        });
      }
      return;
    }

    // Web platform - HTML print
    const html = await print(printData, settings);
    const printWindow = window.open("", "_blank", "width=800,height=700");
    if (!printWindow) {
      toast({
        title: "Gagal Print",
        description: "Popup diblokir oleh browser",
        variant: "destructive",
      });
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteTransaction(transaction.id);
      onDelete(transaction.id);
      setShowDeleteDialog(false);
      toast({
        title: "Transaksi Dihapus",
        description: `Transaksi ${transaction.id} berhasil dihapus`,
      });
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      toast({
        title: "Error",
        description: "Gagal menghapus transaksi",
        variant: "destructive",
      });
    }
  };

  return (
    <Fragment>
    <div className="border-b border-border/60 last:border-0" data-testid={`card-transaction-${transaction.id}`}>
      <div
        className="px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer relative"
        onClick={onToggle}
      >
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
            <Receipt className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{transaction.id}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(transaction.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} - {new Date(transaction.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-xs text-muted-foreground">{transaction.items.length} item</p>
          </div>
          <div className="shrink-0">
            <p className="text-sm font-bold text-primary">{formatCurrency(transaction.total)}</p>
          </div>
        </div>
        <div className="flex justify-between items-center mt-1.5">
          <div className="flex-1 flex justify-center ml-9">
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
          <div className="flex gap-1">
            {isAdminMode && (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive hover:text-destructive-foreground no-print"
              data-testid={`button-delete-${transaction.id}`}
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7 no-print"
              data-testid={`button-reprint-${transaction.id}`}
              onClick={(e) => { e.stopPropagation(); handlePrint(); }}>
              <Printer className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 bg-muted/10">
          <div className="border-t border-border/60 pt-2">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-muted-foreground">Pelanggan : {transaction.customerName}</p>
              <p className="text-xs text-muted-foreground">{transaction.paymentMethod.toUpperCase()}</p>
            </div>
            <div className="space-y-1">
            {transaction.items.map((item, i) => (
              <div key={`${item.product.id}_${item.variant.id}`}>
                <div className="flex justify-between items-start py-1.5">
                  <div>
                    <p className="text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-semibold text-muted-foreground">{item.quantity}</span> <span className="font-semibold text-primary">{item.variant.unit}</span> <span className="font-semibold text-muted-foreground">× {formatCurrency(item.variant.sellingPrice)}</span>
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">{formatCurrency(item.variant.sellingPrice * item.quantity)}</p>
                </div>
                {i < transaction.items.length - 1 && <Separator className="opacity-40" />}
              </div>
            ))}
            </div>
            <Separator className="my-2" />
            {transaction.discount !== undefined && transaction.discount > 0 && (
              <div className="flex justify-between items-center py-1">
                <p className="text-sm text-red-600">Diskon</p>
                <p className="text-sm font-semibold text-red-600">- {formatCurrency(transaction.discount)}</p>
              </div>
            )}
            {transaction.serviceCharge !== undefined && transaction.serviceCharge > 0 && (
              <div className="flex justify-between items-center py-1">
                <p className="text-sm text-muted-foreground">Biaya Layanan</p>
                <p className="text-sm font-semibold">+ {formatCurrency(transaction.serviceCharge)}</p>
              </div>
            )}
            {transaction.ppn !== undefined && transaction.ppn > 0 && (
              <div className="flex justify-between items-center py-1">
                <p className="text-sm text-muted-foreground">PPN ({transaction.ppnPercentage}%)</p>
                <p className="text-sm font-semibold">+ {formatCurrency(transaction.ppn)}</p>
              </div>
            )}
            <div className="flex justify-between items-center pt-1">
              <p className="font-bold text-sm">Total</p>
              <p className="font-bold text-base text-foreground">{formatCurrency(transaction.total)}</p>
            </div>
          </div>
        </div>
      )}
    </div>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Transaksi</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus transaksi {transaction.id}? Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </Fragment>
  );
}

export default function History() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const ITEMS_PER_PAGE = 20;
  // Admin mode state
  const [isAdminMode, setIsAdminMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminMode') === 'true';
    }
    return false;
  });

  useEffect(() => {
    setMounted(true);
    const loadTransactions = async () => {
      try {
        const data = await getTransactions();
        setTransactions(data);
      } catch (err) {
        console.error("Failed to load transactions from Supabase:", err);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    loadTransactions();
  }, []);

  const handleDelete = (id: string) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const handleToggleExpand = (id: string) => {
    setExpandedTransactionId(expandedTransactionId === id ? null : id);
  };

  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayTxs = transactions.filter((t) => new Date(t.date).toDateString() === today);
    const thisMonth = new Date();
    const monthTxs = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
    });
    const uniqueCustomers = new Set(transactions.map((t) => t.customerName)).size;
    return {
      todayRevenue: todayTxs.reduce((s, t) => s + t.total, 0),
      todayTxs: todayTxs.length,
      monthRevenue: monthTxs.reduce((s, t) => s + t.total, 0),
      monthTxs: monthTxs.length,
      totalRevenue: transactions.reduce((s, t) => s + t.total, 0),
      uniqueCustomers,
    };
  }, [transactions]);

  return (
    <div className={`flex flex-col gap-5 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Mobile layout - all cards except Omset Hari Ini */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {!loading && (
          <>
            <Card className="border-card-border shadow-sm relative">
              <CardContent className="p-3">
                <p className="text-base font-bold" data-testid="stat-Omset Bulan Ini">{formatCurrency(stats.monthRevenue)}</p>
                <p className="text-xs font-medium mt-0.5">Omset Bulan Ini</p>
                <p className="text-xs text-muted-foreground">{stats.monthTxs} transaksi</p>
                <div className="absolute top-3 right-3 text-sky-600/30">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-card-border shadow-sm relative">
              <CardContent className="p-3">
                <p className="text-base font-bold" data-testid="stat-Pelanggan">{stats.uniqueCustomers}</p>
                <p className="text-xs font-medium mt-0.5">Pelanggan</p>
                <p className="text-xs text-muted-foreground">nama berbeda</p>
                <div className="absolute top-3 right-3 text-purple-600/30">
                  <Users className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-card-border shadow-sm col-span-2 relative">
              <CardContent className="p-3">
                <p className="text-base font-bold" data-testid="stat-Total Omset">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs font-medium mt-0.5">Total Omset</p>
                <p className="text-xs text-muted-foreground">{transactions.length} transaksi</p>
                <div className="absolute top-3 right-3 text-amber-600/30">
                  <Receipt className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
        {loading && (
          <div className="col-span-2 flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Desktop layout - all cards */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-3">
        {!loading && (
          <>
            <Card className="border-card-border shadow-sm sm:col-span-1 relative">
              <CardContent className="p-4">
                <p className="text-base lg:text-lg font-bold" data-testid="stat-Omset Hari Ini">{formatCurrency(stats.todayRevenue)}</p>
                <p className="text-xs font-medium mt-0.5">Omset Hari Ini</p>
                <p className="text-xs text-muted-foreground">{stats.todayTxs} transaksi</p>
                <div className="absolute bottom-6 right-4 text-emerald-600/30">
                  <Calendar className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-card-border shadow-sm sm:col-span-1 relative">
              <CardContent className="p-4">
                <p className="text-base lg:text-lg font-bold" data-testid="stat-Omset Bulan Ini">{formatCurrency(stats.monthRevenue)}</p>
                <p className="text-xs font-medium mt-0.5">Omset Bulan Ini</p>
                <p className="text-xs text-muted-foreground">{stats.monthTxs} transaksi</p>
                <div className="absolute bottom-6 right-4 text-sky-600/30">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-card-border shadow-sm sm:col-span-1 relative">
              <CardContent className="p-4">
                <p className="text-base lg:text-lg font-bold" data-testid="stat-Total Omset">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs font-medium mt-0.5">Total Omset</p>
                <p className="text-xs text-muted-foreground">{transactions.length} transaksi</p>
                <div className="absolute bottom-6 right-4 text-amber-600/30">
                  <Receipt className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-card-border shadow-sm sm:col-span-1 relative">
              <CardContent className="p-4">
                <p className="text-base lg:text-lg font-bold" data-testid="stat-Pelanggan">{stats.uniqueCustomers}</p>
                <p className="text-xs font-medium mt-0.5">Pelanggan</p>
                <p className="text-xs text-muted-foreground">nama berbeda</p>
                <div className="absolute bottom-6 right-4 text-purple-600/30">
                  <Users className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
        {loading && (
          <div className="col-span-4 flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <Card className="border-card-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Semua Transaksi
            </div>
            {transactions.length > 0 && <Badge variant="secondary">{transactions.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Memuat data transaksi...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada transaksi</p>
              <p className="text-sm mt-1">Lakukan transaksi dari halaman Katalog</p>
            </div>
          ) : (
            <>
              {paginatedTransactions.map((transaction) => (
                <TransactionCard 
                  key={transaction.id} 
                  transaction={transaction} 
                  onDelete={handleDelete}
                  expanded={expandedTransactionId === transaction.id}
                  onToggle={() => handleToggleExpand(transaction.id)}
                  isAdminMode={isAdminMode}
                />
              ))}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 p-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Sebelumnya
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, transactions.length)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Selanjutnya
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
