import { Settings as SettingsIcon, Type, Moon, Sun, Plus, Trash2, AlertCircle, Store, QrCode, Package, Tag, Loader2, Clock, Eye } from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { SerialPort } from 'tauri-plugin-serialplugin-api';
import { getPrayerNotificationsEnabled, setPrayerNotificationsEnabled, schedulePrayerNotifications, resetPrayerSchedule } from "@/lib/notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useFont } from "@/lib/font-context";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useCategories } from "@/lib/category-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSettings, saveSettings, getProducts, deleteProduct, clearAllTransactions } from "@/lib/supabase-store";
import { buildEscPosReceipt, removeEscapeSequences } from "@/lib/escpos-receipt";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const fontSizes = [
  { value: "small" as const, label: "Kecil" },
  { value: "medium" as const, label: "Sedang" },
  { value: "large" as const, label: "Besar" },
];

const themes = [
  { value: "light" as const, label: "Normal" },
  { value: "dark" as const, label: "Gelap" },
];

export default function SettingsPage() {
  const { fontSize, setFontSize } = useFont();
  const { theme, setTheme } = useTheme();
  const { categories, addCategory, deleteCategory } = useCategories();
  const [newCategory, setNewCategory] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetProductsConfirm, setShowResetProductsConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [storeName, setStoreName] = useState("TOKO PAKAN TERNAK");
  const [storeAddress, setStoreAddress] = useState("Jl. Peternakan No.22 Ngalor Ngidul, Kec. Nganjuk");
  const [storePhone, setStorePhone] = useState("0812-3456-7890");
  const [storeFooter, setStoreFooter] = useState("Terima kasih telah berbelanja");
  const [bluetoothPrinterAddress, setBluetoothPrinterAddress] = useState("");
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [scanningPorts, setScanningPorts] = useState(false);
  const [selectedPort, setSelectedPort] = useState("");
  const [isTauriDesktop, setIsTauriDesktop] = useState(false);
  const [qrCodeLink, setQrCodeLink] = useState("");
  const [showQRCode, setShowQRCode] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [receiptPreviewText, setReceiptPreviewText] = useState("");
  const [enableServiceCharge, setEnableServiceCharge] = useState(false);
  const [defaultServiceCharge, setDefaultServiceCharge] = useState("");
  const [enableDiscount, setEnableDiscount] = useState(true);
  const [defaultDiscount, setDefaultDiscount] = useState("");
  const [enablePPN, setEnablePPN] = useState(false);
  const [defaultPPN, setDefaultPPN] = useState("");
  const [loading, setLoading] = useState(true);
  const [resetProductsLoading, setResetProductsLoading] = useState(false);
  const [clearTransactionsLoading, setClearTransactionsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Admin mode state
  const [isAdminMode, setIsAdminMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminMode') === 'true';
    }
    return false;
  });
  const { toast } = useToast();

  // Notification settings (Android only)
  const [enableStockNotifications, setEnableStockNotifications] = useState(true);
  const [enablePrayerNotifications, setEnablePrayerNotifications] = useState(true);

  const handleSaveNotificationSettings = async () => {
    try {
      localStorage.setItem('enableStockNotifications', String(enableStockNotifications));
      toast({
        title: "Pengaturan Notifikasi Disimpan",
        description: "Pengaturan notifikasi stok telah disimpan",
      });
    } catch (err) {
      console.error("Failed to save notification settings:", err);
      toast({
        title: "Error",
        description: "Gagal menyimpan pengaturan notifikasi",
        variant: "destructive",
      });
    }
  };

  const formatCurrencyInput = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) return '';
    return Number(cleanValue).toLocaleString('id-ID');
  };

  useEffect(() => {
    setMounted(true);
    // Detect if running in Tauri desktop (works in both dev and production)
    setIsTauriDesktop(
      typeof window !== 'undefined' &&
      ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)
    );

    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        setStoreName(settings.storeName || "TOKO PAKAN TERNAK");
        setStoreAddress(settings.storeAddress || "Jl. Peternakan No.22 Ngalor Ngidul, Kec. Nganjuk");
        setStorePhone(settings.storePhone || "0812-3456-7890");
        setStoreFooter(settings.storeFooter || "Terima kasih telah berbelanja");
        setBluetoothPrinterAddress(settings.bluetoothPrinterAddress || localStorage.getItem("bluetoothPrinterAddress") || "");
        setQrCodeLink(settings.qrCodeLink || "");
        setShowQRCode(settings.showQRCode || false);
        setEnableServiceCharge(settings.enableServiceCharge || false);
        setDefaultServiceCharge(settings.defaultServiceCharge || "");
        setEnableDiscount(settings.enableDiscount !== false); // Default true
        setDefaultDiscount(settings.defaultDiscount || "");
        setEnablePPN(settings.enablePPN || false);
        setDefaultPPN(settings.defaultPPN || "");
      } catch (err) {
        console.error("Failed to load settings from Supabase:", err);
        // Fallback to localStorage if Supabase fails
        setStoreName(localStorage.getItem("storeName") || "TOKO PAKAN TERNAK");
        setStoreAddress(localStorage.getItem("storeAddress") || "Jl. Peternakan No.22 Ngalor Ngidul, Kec. Nganjuk");
        setStorePhone(localStorage.getItem("storePhone") || "0812-3456-7890");
        setStoreFooter(localStorage.getItem("storeFooter") || "Terima kasih telah berbelanja");
        setBluetoothPrinterAddress(localStorage.getItem("bluetoothPrinterAddress") || "");
        setQrCodeLink(localStorage.getItem("qrCodeLink") || "");
        const savedShowQRCode = localStorage.getItem("showQRCode");
        setShowQRCode(savedShowQRCode === "true");
        const savedEnableServiceCharge = localStorage.getItem("enableServiceCharge");
        setEnableServiceCharge(savedEnableServiceCharge === "true");
        setDefaultServiceCharge(localStorage.getItem("defaultServiceCharge") || "");
        const savedEnableDiscount = localStorage.getItem("enableDiscount");
        setEnableDiscount(savedEnableDiscount !== "false");
        setDefaultDiscount(localStorage.getItem("defaultDiscount") || "");
        const savedEnablePPN = localStorage.getItem("enablePPN");
        setEnablePPN(savedEnablePPN === "true");
        setDefaultPPN(localStorage.getItem("defaultPPN") || "");
      }

      // Load notification settings from localStorage (Android only)
      const savedEnableNotifications = localStorage.getItem("enableStockNotifications");
      setEnableStockNotifications(savedEnableNotifications !== "false");

      // Load selected serial port (Tauri Desktop)
      const savedSelectedPort = localStorage.getItem("selectedSerialPort");
      if (savedSelectedPort) {
        setSelectedPort(savedSelectedPort);
      }

      // Load prayer notification setting
      const prayerEnabled = getPrayerNotificationsEnabled();
      setEnablePrayerNotifications(prayerEnabled);

      setLoading(false);
    };
    loadSettings();
  }, []);

  const handleAddCategory = async () => {
    if (newCategory.trim()) {
      await addCategory(newCategory.trim());
      setNewCategory("");
    }
  };

  const handleKeyPress = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      await handleAddCategory();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id);
  };

  const handleClearTransactions = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setClearTransactionsLoading(true);
    try {
      await clearAllTransactions();
      setShowClearConfirm(false);
      setDeleteConfirmText("");
      toast({
        title: "Berhasil",
        description: "Semua riwayat transaksi telah dihapus",
      });
    } catch (err) {
      console.error("Failed to clear transactions:", err);
      toast({
        title: "Error",
        description: "Gagal menghapus riwayat transaksi",
        variant: "destructive",
      });
    } finally {
      setClearTransactionsLoading(false);
    }
  };

  const handleResetProducts = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setResetProductsLoading(true);
    try {
      const products = await getProducts();
      for (const product of products) {
        await deleteProduct(product.id);
      }
      setShowResetProductsConfirm(false);
      setResetConfirmText("");
      toast({
        title: "Berhasil",
        description: "Semua data produk telah dihapus",
      });
    } catch (err) {
      console.error("Failed to reset products:", err);
      toast({
        title: "Error",
        description: "Gagal menghapus produk",
        variant: "destructive",
      });
    } finally {
      setResetProductsLoading(false);
    }
  };

  const handleSaveStoreSettings = async () => {
    try {
      await saveSettings({
        storeName,
        storeAddress,
        storePhone,
        storeFooter,
        qrCodeLink,
        showQRCode,
        enableServiceCharge,
        defaultServiceCharge,
        enableDiscount,
        defaultDiscount,
        enablePPN,
        defaultPPN,
      });
      localStorage.setItem("bluetoothPrinterAddress", bluetoothPrinterAddress.trim());
      localStorage.setItem("selectedSerialPort", selectedPort);
      toast({
        title: "Berhasil",
        description: "Pengaturan toko telah disimpan",
      });
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast({
        title: "Error",
        description: "Gagal menyimpan pengaturan toko",
        variant: "destructive",
      });
    }
  };

  const handlePreviewReceipt = () => {
    const sampleData = {
      id: "TRX-001",
      date: new Date().toISOString(),
      customerName: "Pelanggan Contoh",
      items: [
        {
          product: { name: "Pakan Ayam 5kg" },
          quantity: 2,
          variant: { unit: "sak", sellingPrice: 50000 },
        },
        {
          product: { name: "Vitamin Ternak" },
          quantity: 1,
          variant: { unit: "botol", sellingPrice: 25000 },
        },
      ],
      discount: 5000,
      serviceCharge: 0,
      ppn: 0,
      ppnPercentage: 0,
      total: 120000,
      paymentMethod: "CASH",
    };

    const settings = {
      storeName,
      storeAddress,
      storePhone,
      storeFooter,
    };

    const escpos = buildEscPosReceipt(sampleData, settings);
    const cleanEscpos = removeEscapeSequences(escpos);
    setReceiptPreviewText(cleanEscpos);
    setShowReceiptPreview(true);
  };

  const handleScanPorts = async () => {
    setScanningPorts(true);
    try {
      // Check if running in Tauri (works in both dev and production)
      if (typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)) {
        const ports = await SerialPort.available_ports();
        // Convert object to array of port names
        const portNames = Object.keys(ports);
        setAvailablePorts(portNames);
        toast({
          title: "Scan Berhasil",
          description: `Ditemukan ${portNames.length} port COM`,
        });
      } else {
        toast({
          title: "Info",
          description: "Scan port hanya tersedia di Tauri Desktop",
        });
      }
    } catch (error: any) {
      console.error("Error scanning ports:", error);
      toast({
        title: "Gagal Scan",
        description: error?.message || "Terjadi kesalahan",
        variant: "destructive"
      });
    } finally {
      setScanningPorts(false);
    }
  };

  const handleTestPrint = async () => {
    if (!selectedPort) {
      toast({
        title: "Error",
        description: "Pilih port COM terlebih dahulu",
        variant: "destructive"
      });
      return;
    }

    try {
      // Generate test receipt
      const sampleData = {
        id: "TEST-001",
        date: new Date().toISOString(),
        customerName: "TEST PRINT",
        items: [
          {
            product: { name: "Test Item" },
            quantity: 1,
            variant: { unit: "pcs", sellingPrice: 10000 },
          },
        ],
        discount: 0,
        serviceCharge: 0,
        ppn: 0,
        ppnPercentage: 0,
        total: 10000,
        paymentMethod: "CASH",
      };

      const settings = {
        storeName,
        storeAddress,
        storePhone,
        storeFooter,
      };

      const escpos = buildEscPosReceipt(sampleData, settings);

      // Send to printer via serial port
      if (typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)) {
        const port = new SerialPort({ path: selectedPort, baudRate: 9600 });
        await port.open();
        await port.write(escpos);
        await port.close();

        toast({
          title: "Print Berhasil",
          description: "Test receipt terkirim ke printer",
        });
      }
    } catch (error: any) {
      console.error("Error printing:", error);
      toast({
        title: "Gagal Print",
        description: error?.message || "Terjadi kesalahan",
        variant: "destructive"
      });
    }
  };

  const handleQRCodeToggle = (checked: boolean) => {
    setShowQRCode(checked);
  };

  const handleSaveQRCodeSettings = async () => {
    try {
      await saveSettings({
        storeName,
        storeAddress,
        storePhone,
        storeFooter,
        qrCodeLink,
        showQRCode,
        enableServiceCharge,
        defaultServiceCharge,
        enableDiscount,
        defaultDiscount,
        enablePPN,
        defaultPPN,
      });
      toast({
        title: "Berhasil",
        description: "Pengaturan QR Code telah disimpan",
      });
    } catch (err) {
      console.error("Failed to save QR settings:", err);
      toast({
        title: "Error",
        description: "Gagal menyimpan pengaturan QR Code",
        variant: "destructive",
      });
    }
  };

  const handleServiceChargeToggle = (checked: boolean) => {
    setEnableServiceCharge(checked);
  };

  const handleSaveServiceChargeSettings = async () => {
    try {
      await saveSettings({
        storeName,
        storeAddress,
        storePhone,
        storeFooter,
        qrCodeLink,
        showQRCode,
        enableServiceCharge,
        defaultServiceCharge,
        enableDiscount,
        defaultDiscount,
        enablePPN,
        defaultPPN,
      });
      toast({
        title: "Berhasil",
        description: "Pengaturan biaya layanan telah disimpan",
      });
    } catch (err) {
      console.error("Failed to save service charge settings:", err);
      toast({
        title: "Error",
        description: "Gagal menyimpan pengaturan biaya layanan",
        variant: "destructive",
      });
    }
  };

  const handleDiscountToggle = (checked: boolean) => {
    setEnableDiscount(checked);
  };

  const handleSaveDiscountSettings = async () => {
    try {
      await saveSettings({
        storeName,
        storeAddress,
        storePhone,
        storeFooter,
        qrCodeLink,
        showQRCode,
        enableServiceCharge,
        defaultServiceCharge,
        enableDiscount,
        defaultDiscount,
        enablePPN,
        defaultPPN,
      });
      toast({
        title: "Berhasil",
        description: "Pengaturan diskon telah disimpan",
      });
    } catch (err) {
      console.error("Failed to save discount settings:", err);
      toast({
        title: "Error",
        description: "Gagal menyimpan pengaturan diskon",
        variant: "destructive",
      });
    }
  };

  const handlePPNToggle = (checked: boolean) => {
    setEnablePPN(checked);
  };

  const handleSavePPNSettings = async () => {
    try {
      await saveSettings({
        storeName,
        storeAddress,
        storePhone,
        storeFooter,
        qrCodeLink,
        showQRCode,
        enableServiceCharge,
        defaultServiceCharge,
        enableDiscount,
        defaultDiscount,
        enablePPN,
        defaultPPN,
      });
      toast({
        title: "Berhasil",
        description: "Pengaturan PPN telah disimpan",
      });
    } catch (err) {
      console.error("Failed to save PPN settings:", err);
      toast({
        title: "Error",
        description: "Gagal menyimpan pengaturan PPN",
        variant: "destructive",
      });
    }
  };

  const handleTogglePrayerNotifications = async (enabled: boolean) => {
    console.log('handleTogglePrayerNotifications called with enabled:', enabled);
    setEnablePrayerNotifications(enabled);
    setPrayerNotificationsEnabled(enabled);
    if (enabled) {
      console.log('Scheduling prayer notifications...');
      toast({
        title: "Notifikasi Sholat Diaktifkan",
        description: "Jadwal sholat akan di-schedule otomatis.",
      });
      // Schedule prayer notifications when enabled
      try {
        const count = await schedulePrayerNotifications();
        console.log('Prayer notifications scheduled:', count);
      } catch (err) {
        console.error('Failed to schedule prayer notifications:', err);
      }
    } else {
      toast({
        title: "Notifikasi Sholat Dinonaktifkan",
        description: "Notifikasi sholat telah dimatikan.",
      });
    }
  };

  const handleResetPrayerSchedule = () => {
    (async () => {
      const canceled = await resetPrayerSchedule();
      toast({
        title: "Jadwal Sholat Direset",
        description: `Jadwal sholat direset. Pending dibatalkan: ${canceled}. Aktifkan ulang untuk menjadwalkan ulang.`,
      });
    })();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Memuat pengaturan...</p>
      </div>
    );
  }

  return (
    <div className={`max-w-2xl mx-auto flex flex-col gap-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <Card className="border-card-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-primary" />
            Pengaturan Tampilan
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Type className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Ukuran Font</h3>
              </div>
              <Select value={fontSize} onValueChange={(value: "small" | "medium" | "large") => setFontSize(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontSizes.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Tema</h3>
              </div>
              <Select value={theme} onValueChange={(value: "light" | "dark") => setTheme(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {themes.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-card-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            Pengaturan Toko
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <Input
              placeholder="Nama Toko"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="Alamat Toko"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="Nomor Telepon"
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="Footer Struk"
              value={storeFooter}
              onChange={(e) => setStoreFooter(e.target.value)}
              className="text-sm"
            />
            {/* Bluetooth MAC Address untuk Android */}
            {!isTauriDesktop && (
              <Input
                placeholder="MAC Address Printer Bluetooth (contoh: 00:11:22:33:44:55)"
                value={bluetoothPrinterAddress}
                onChange={(e) => setBluetoothPrinterAddress(e.target.value)}
                className="text-sm"
              />
            )}
            {/* Serial Port untuk Tauri Desktop */}
            {isTauriDesktop && (
              <div className="space-y-2 mt-2">
                <div className="flex gap-2">
                  <Select value={selectedPort} onValueChange={setSelectedPort}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Pilih Port COM" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePorts.map((port) => (
                        <SelectItem key={port} value={port}>
                          {port}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleScanPorts}
                    disabled={scanningPorts}
                    variant="outline"
                    size="icon"
                  >
                    {scanningPorts ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Loader2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  onClick={handleTestPrint}
                  disabled={!selectedPort}
                  variant="outline"
                  className="w-full"
                >
                  Test Print Bluetooth
                </Button>
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <Button onClick={handleSaveStoreSettings} className="flex-1">
                Simpan
              </Button>
              <Button onClick={handlePreviewReceipt} variant="outline" className="flex-1">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-card-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <Input
              placeholder="Link QR Code"
              value={qrCodeLink}
              onChange={(e) => setQrCodeLink(e.target.value)}
              className="text-sm"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tampilkan QR Code di Struk</span>
              <Switch checked={showQRCode} onCheckedChange={handleQRCodeToggle} />
            </div>
            <Button onClick={handleSaveQRCodeSettings} className="w-full mt-2">
              Simpan QR Code
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-card-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Biaya Layanan
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Aktifkan biaya layanan di cart</span>
              <Switch checked={enableServiceCharge} onCheckedChange={handleServiceChargeToggle} />
            </div>
            <Input
              placeholder="Default biaya layanan (Rp)"
              value={defaultServiceCharge}
              onChange={(e) => setDefaultServiceCharge(formatCurrencyInput(e.target.value))}
              className="text-sm"
            />
            <Button onClick={handleSaveServiceChargeSettings} className="w-full">
              Simpan Biaya Layanan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-card-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Diskon
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Aktifkan input diskon di cart</span>
              <Switch checked={enableDiscount} onCheckedChange={handleDiscountToggle} />
            </div>
            <Input
              placeholder="Default diskon (Rp)"
              value={defaultDiscount}
              onChange={(e) => setDefaultDiscount(formatCurrencyInput(e.target.value))}
              className="text-sm"
            />
            <Button onClick={handleSaveDiscountSettings} className="w-full">
              Simpan Diskon
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-card-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            PPN
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Aktifkan PPN di cart</span>
              <Switch checked={enablePPN} onCheckedChange={handlePPNToggle} />
            </div>
            <Input
              placeholder="Default PPN (%)"
              value={defaultPPN}
              onChange={(e) => setDefaultPPN(e.target.value)}
              className="text-sm"
            />
            <Button onClick={handleSavePPNSettings} className="w-full">
              Simpan PPN
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings - Android Only */}
      {Capacitor.getPlatform() === 'android' && (
        <Card className="border-card-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-primary" />
              Notifikasi Stok
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Aktifkan notifikasi stok menipis</span>
                <Switch checked={enableStockNotifications} onCheckedChange={setEnableStockNotifications} />
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                Notifikasi akan dikirim otomatis jika stok produk &lt; 10 (dicek setiap 3 jam)
              </p>
              <Button onClick={handleSaveNotificationSettings} className="w-full">
                Simpan Notifikasi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {Capacitor.isNativePlatform() && (
      <Card className="border-card-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Notifikasi Sholat
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="text-sm font-medium">Aktifkan Notifikasi Sholat</label>
                <p className="text-xs text-muted-foreground mt-1">Notif 10 menit sebelum waktu sholat (D.I.Y)</p>
              </div>
              <Switch
                checked={enablePrayerNotifications}
                onCheckedChange={handleTogglePrayerNotifications}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetPrayerSchedule}
              className="w-full"
            >
              Reset Jadwal Sholat
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      <Card className="border-card-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Kategori Produk
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Nama kategori baru..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button size="icon" onClick={handleAddCategory} className="h-9 w-9 rounded-full">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <span className="text-sm">{category.name}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteCategory(category.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isAdminMode && (
        <Card className="border-card-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">Hapus Riwayat Transaksi</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setShowClearConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus Semua Riwayat
            </Button>

            <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
              <AlertDialogContent className="rounded-xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Semua Riwayat Transaksi?</AlertDialogTitle>
                  {!clearTransactionsLoading ? (
                    <AlertDialogDescription className="space-y-3">
                      <p>Seluruh riwayat transaksi akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.</p>
                      <div className="space-y-1.5 text-foreground">
                        <p className="text-xs font-medium">Ketik <span className="font-bold select-none">HAPUS RIWAYAT</span> untuk konfirmasi:</p>
                        <Input
                          placeholder="Ketik konfirmasi..."
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </AlertDialogDescription>
                  ) : null}
                </AlertDialogHeader>

                {clearTransactionsLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-6">
                    <Loader2 className="h-8 w-8 animate-spin text-destructive" />
                    <p className="text-sm font-medium text-destructive text-center">Harap menunggu,<br/>proses hapus riwayat memerlukan waktu beberapa saat...</p>
                  </div>
                ) : null}

                {!clearTransactionsLoading && (
                  <AlertDialogFooter className="flex gap-2">
                    <AlertDialogCancel onClick={() => setDeleteConfirmText("")} className="flex-1 mt-0">Batal</AlertDialogCancel>
                    <Button
                      onClick={handleClearTransactions}
                      disabled={deleteConfirmText !== "HAPUS RIWAYAT"}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1"
                    >
                      Ya, Hapus
                    </Button>
                  </AlertDialogFooter>
                )}
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {isAdminMode && (
        <Card className="border-card-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-center gap-2">
              <Package className="h-4 w-4 text-destructive" />
              <span className="text-destructive">Reset Data Produk</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setShowResetProductsConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus Semua Produk
            </Button>

            <AlertDialog open={showResetProductsConfirm} onOpenChange={setShowResetProductsConfirm}>
              <AlertDialogContent className="rounded-xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Semua Produk?</AlertDialogTitle>
                  {!resetProductsLoading ? (
                    <AlertDialogDescription className="space-y-3">
                      <p>Seluruh data produk akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.</p>
                      <div className="space-y-1.5 text-foreground">
                        <p className="text-xs font-medium">Ketik <span className="font-bold select-none">HAPUS PRODUK</span> untuk konfirmasi:</p>
                        <Input
                          placeholder="Ketik konfirmasi..."
                          value={resetConfirmText}
                          onChange={(e) => setResetConfirmText(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </AlertDialogDescription>
                  ) : null}
                </AlertDialogHeader>

                {resetProductsLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-6">
                    <Loader2 className="h-8 w-8 animate-spin text-destructive" />
                    <p className="text-sm font-medium text-destructive text-center">Harap menunggu,<br/>proses hapus produk memerlukan waktu beberapa saat...</p>
                  </div>
                ) : null}

                {!resetProductsLoading && (
                  <AlertDialogFooter className="flex gap-2">
                    <AlertDialogCancel onClick={() => setResetConfirmText("")} className="flex-1 mt-0">Batal</AlertDialogCancel>
                    <Button
                      onClick={handleResetProducts}
                      disabled={resetConfirmText !== "HAPUS PRODUK"}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1"
                    >
                      Ya, Hapus
                    </Button>
                  </AlertDialogFooter>
                )}
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      <Dialog open={showReceiptPreview} onOpenChange={setShowReceiptPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Preview Struk 58mm</DialogTitle>
          </DialogHeader>
          <div className="bg-gray-100 p-4 rounded-lg">
            <pre className="text-xs font-mono whitespace-pre-wrap bg-white p-4 rounded border">
              {receiptPreviewText}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
