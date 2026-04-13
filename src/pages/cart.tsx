import { useState, useMemo, useEffect } from "react";
import { Plus, Minus, Printer, ShoppingBag, ArrowLeft, Tag, PlusCircle, Search, X, ChevronDown, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/lib/cart-context";
import { formatCurrency, convertToOns, type ProductVariant } from "@/lib/store";
import { getProducts, saveTransaction, getSettings, incrementTransactionNumber, updateProduct, type FeedProduct } from "@/lib/supabase-store";
import { useLocation } from "wouter";
import { Printer as CapacitorPrinter } from "@capgo/capacitor-printer";
import { Capacitor } from "@capacitor/core";
import { print, type PrintTemplateData } from "@/lib/print";

type DoneTransaction = {
  id: string;
  items: ReturnType<typeof useCart>["items"];
  total: number;
  date: string;
  customerName: string;
  paymentMethod: string;
  discount?: number;
  serviceCharge?: number;
  ppn?: number;
  ppnPercentage?: number;
};

export default function Cart() {
  const { items, updateQuantity, removeFromCart, clearCart, total, addManualItem } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("tunai");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [lastTransaction, setLastTransaction] = useState<DoneTransaction | null>(null);

  // Form input manual
  const [itemName, setItemName] = useState("");
  const [itemOriginalPrice, setItemOriginalPrice] = useState("");
  const [itemSellingPrice, setItemSellingPrice] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemUnit, setItemUnit] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<FeedProduct | null>(null);
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [serviceCharge, setServiceCharge] = useState("");
  const [enableServiceCharge, setEnableServiceCharge] = useState(false);
  const [enableDiscount, setEnableDiscount] = useState(true);
  const [ppn, setPpn] = useState("");
  const [enablePPN, setEnablePPN] = useState(false);

  // Get products for suggestions
  const [products, setProducts] = useState<FeedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Load products and settings from Supabase
  useEffect(() => {
    setMounted(true);
    const loadData = async () => {
      try {
        const [productsData, settings] = await Promise.all([getProducts(), getSettings()]);
        setProducts(productsData);
        setEnableServiceCharge(settings.enableServiceCharge || false);
        setServiceCharge(settings.defaultServiceCharge || "");
        setEnableDiscount(settings.enableDiscount !== false);
        setDiscount(settings.defaultDiscount || "");
        setEnablePPN(settings.enablePPN || false);
        setPpn(settings.defaultPPN || "");
      } catch (err) {
        console.error("Failed to load data from Supabase:", err);
        // Fallback to localStorage
        const savedEnableServiceCharge = localStorage.getItem("enableServiceCharge");
        setEnableServiceCharge(savedEnableServiceCharge === "true");
        const savedDefaultServiceCharge = localStorage.getItem("defaultServiceCharge");
        if (savedDefaultServiceCharge && savedEnableServiceCharge === "true") {
          setServiceCharge(savedDefaultServiceCharge);
        }
        const savedEnableDiscount = localStorage.getItem("enableDiscount");
        setEnableDiscount(savedEnableDiscount !== "false");
        const savedDefaultDiscount = localStorage.getItem("defaultDiscount");
        if (savedDefaultDiscount && savedEnableDiscount !== "false") {
          setDiscount(savedDefaultDiscount);
        }
        const savedEnablePPN = localStorage.getItem("enablePPN");
        setEnablePPN(savedEnablePPN === "true");
        const savedDefaultPPN = localStorage.getItem("defaultPPN");
        if (savedDefaultPPN && savedEnablePPN === "true") {
          setPpn(savedDefaultPPN);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!itemName.trim()) return [];
    return products.filter((p) =>
      p.name.toLowerCase().includes(itemName.toLowerCase())
    ).slice(0, 5);
  }, [itemName, products]);

  const discountAmount = (enableDiscount && discount) ? Math.max(0, parseInt(discount.replace(/\D/g, ""), 10) || 0) : undefined;
  const serviceChargeAmount = (enableServiceCharge && serviceCharge) ? Math.max(0, parseInt(serviceCharge.replace(/\D/g, ""), 10) || 0) : undefined;
  const ppnPercentage = (enablePPN && ppn) ? Math.max(0, parseFloat(ppn.replace(/,/g, ".")) || 0) : undefined;
  const ppnAmount = (enablePPN && ppnPercentage !== undefined && ppnPercentage > 0) ? Math.round((total - (discountAmount || 0) + (serviceChargeAmount || 0)) * (ppnPercentage / 100)) : undefined;
  const grandTotal = Math.max(0, total - (discountAmount || 0) + (serviceChargeAmount || 0) + (ppnAmount || 0));

  const handleAddManualItem = () => {
    if (!itemName.trim()) {
      toast({ title: "Error", description: "Nama produk harus diisi", variant: "destructive" });
      return;
    }
    const sellingPrice = parseInt(itemSellingPrice.replace(/\D/g, ""), 10) || 0;
    if (sellingPrice <= 0) {
      toast({ title: "Error", description: "Harga harus lebih dari 0", variant: "destructive" });
      return;
    }
    const qty = parseInt(itemQuantity, 10) || 1;
    if (qty <= 0) {
      toast({ title: "Error", description: "Quantity harus lebih dari 0", variant: "destructive" });
      return;
    }

    // Check if product exists in database
    const matchingProduct = products.find(p => p.name.toLowerCase() === itemName.trim().toLowerCase());
    
    if (matchingProduct && !selectedProduct) {
      toast({ 
        title: "Produk Ada di Database", 
        description: "Silakan pilih produk dari suggestion untuk validasi stok otomatis",
        variant: "destructive" 
      });
      setShowSuggestions(true);
      return;
    }

    // Check stock if product is from database
    if (selectedProduct) {
      const product = products.find(p => p.id === selectedProduct.id);
      if (!product) {
        toast({ title: "Error", description: "Produk tidak ditemukan", variant: "destructive" });
        return;
      }
      const variant = selectedVariant || selectedProduct.variants[0];
      // Use the unit from input if provided, otherwise use variant unit
      const unitToCheck = itemUnit || variant.unit;
      
      if (!checkStockAvailability(selectedProduct.id, variant.id, itemUnit || variant.unit, qty, selectedProduct.name)) {
        const availableOns = getAvailableStock(selectedProduct.id, variant.id, itemUnit || variant.unit, selectedProduct.name);
        const conversionFactor = convertToOns(1, unitToCheck);
        const availableInUnit = Math.floor((availableOns || 0) / conversionFactor);
        toast({ 
          title: "Stok Tidak Cukup", 
          description: `Stok tersisa: ${availableOns || 0} ons (${availableInUnit} ${unitToCheck})`,
          variant: "destructive" 
        });
        return;
      }
    } else {
      // For manual items, check if unit matches known conversion factors
      const conversionFactor = convertToOns(1, itemUnit);
      if (conversionFactor === 1 && itemUnit.toLowerCase() !== "ons") {
        // Unit not recognized, warn user but allow (manual items have no stock constraints)
        toast({ 
          title: "Peringatan", 
          description: `Unit "${itemUnit}" tidak dikenali. Pastikan stok cukup secara manual.`,
          variant: "default" 
        });
      }
    }

    // For manual items, set originalPrice = sellingPrice (profit = 0)
    // For database items, use the originalPrice from the variant
    const originalPrice = itemOriginalPrice ? parseInt(itemOriginalPrice.replace(/\D/g, ""), 10) || 0 : sellingPrice;
    addManualItem(itemName.trim(), originalPrice, sellingPrice, qty, itemUnit);
    setItemName("");
    setItemOriginalPrice("");
    setItemSellingPrice("");
    setItemQuantity("1");
    setItemUnit("");
    setShowSuggestions(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
    toast({ title: "Produk Ditambahkan", description: `${itemName} x${qty}` });
  };

  const formatCurrencyInput = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) return '';
    return Number(cleanValue).toLocaleString('id-ID');
  };

  const checkStockAvailability = (productId: string, variantId: string, variantUnit: string, requestedQty: number, productName?: string) => {
    let product = products.find(p => p.id === productId);
    
    // If not found by ID, try to find by product name (for manual items)
    if (!product && productName) {
      product = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
    }
    
    if (!product) return true; // Manual items without matching database product don't have stock constraints
    
    // Convert current cart items to ons
    const currentInCartOns = items
      .filter(i => i.product.id === productId && i.variant.id === variantId)
      .reduce((sum, i) => sum + convertToOns(i.quantity, i.variant.unit), 0);
    
    // Convert requested quantity to ons
    const requestedQtyOns = convertToOns(requestedQty, variantUnit);
    
    return currentInCartOns + requestedQtyOns <= product.stock;
  };

  const getAvailableStock = (productId: string, variantId: string, variantUnit: string, productName?: string) => {
    let product = products.find(p => p.id === productId);
    
    // If not found by ID, try to find by product name (for manual items)
    if (!product && productName) {
      product = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
    }
    
    if (!product) return null;
    
    // Convert current cart items to ons
    const currentInCartOns = items
      .filter(i => i.product.id === productId && i.variant.id === variantId)
      .reduce((sum, i) => sum + convertToOns(i.quantity, i.variant.unit), 0);
    
    const availableOns = product.stock - currentInCartOns;
    return availableOns;
  };

  const handleSelectProduct = (product: FeedProduct) => {
    setSelectedProduct(product);
    if (product.variants.length === 1) {
      // If only one variant, auto-select it
      const variant = product.variants[0];
      setItemName(product.name);
      setItemOriginalPrice(formatCurrencyInput(variant.originalPrice.toString()));
      setItemSellingPrice(formatCurrencyInput(variant.sellingPrice.toString()));
      setItemUnit(variant.unit);
      setShowSuggestions(false);
    } else {
      // If multiple variants, show dialog
      setShowVariantDialog(true);
    }
  };

  const handleSelectVariant = (variant: ProductVariant) => {
    if (selectedProduct) {
      setItemName(selectedProduct.name);
      setItemOriginalPrice(formatCurrencyInput(variant.originalPrice.toString()));
      setItemSellingPrice(formatCurrencyInput(variant.sellingPrice.toString()));
      setItemUnit(variant.unit);
      setSelectedVariant(variant);
      setShowVariantDialog(false);
      setShowSuggestions(false);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast({ title: "Keranjang Kosong", description: "Tambahkan produk terlebih dahulu", variant: "destructive" });
      return;
    }

    // Validate stock for all items
    for (const item of items) {
      // Try to find product by ID or by name (for manual items)
      let product = products.find(p => p.id === item.product.id);
      if (!product && item.product.id.startsWith('manual-')) {
        product = products.find(p => p.name.toLowerCase() === item.product.name.toLowerCase());
      }
      
      if (product) {
        const requestedQtyOns = convertToOns(item.quantity, item.variant.unit);
        
        if (requestedQtyOns > product.stock) {
          const conversionFactor = convertToOns(1, item.variant.unit);
          const availableInUnit = Math.floor(product.stock / conversionFactor);
          toast({ 
            title: "Stok Tidak Cukup", 
            description: `${item.product.name} - Stok tersisa: ${product.stock} ons (${availableInUnit} ${item.variant.unit})`,
            variant: "destructive" 
          });
          return;
        }
      }
    }

    try {
      // Get transaction number from Supabase
      const transactionId = await incrementTransactionNumber();
      
      // Create transaction object
      const transaction = {
        id: transactionId,
        items: items.map((i) => ({ 
          product: i.product, 
          variant: {
            id: i.variant.id,
            name: i.variant.label,
            unit: i.variant.unit,
            originalPrice: i.variant.originalPrice,
            sellingPrice: i.variant.sellingPrice,
            stock: i.product.stock
          },
          quantity: i.quantity 
        })),
        total: grandTotal,
        customerName: customerName || "Umum",
        paymentMethod: paymentMethod,
        discount: discountAmount || 0,
        serviceCharge: serviceChargeAmount || 0,
        ppn: ppnAmount || 0,
        ppnPercentage: ppnPercentage || 0,
        date: new Date().toISOString()
      };

      // Save transaction to Supabase
      await saveTransaction(transaction);

      // Deduct stock for each product
      for (const item of items) {
        // Try to find product by ID or by name (for manual items)
        let product = products.find(p => p.id === item.product.id);
        if (!product && item.product.id.startsWith('manual-')) {
          // Manual item - try to match by name
          product = products.find(p => p.name.toLowerCase() === item.product.name.toLowerCase());
        }
        
        if (product) {
          const qtyOns = convertToOns(item.quantity, item.variant.unit);
          const newStock = Math.max(0, product.stock - qtyOns);
          console.log(`Stock update: ${product.name}`, {
            oldStock: product.stock,
            qtyOns,
            unit: item.variant.unit,
            newStock
          });
          await updateProduct(product.id, { stock: newStock });
        }
      }

      setLastTransaction({ 
        ...transaction, 
        items: [...items], 
        paymentMethod: paymentMethod, 
        discount: discountAmount, 
        serviceCharge: serviceChargeAmount, 
        ppn: ppnAmount, 
        ppnPercentage: ppnPercentage 
      });
      
      // Reload products to get updated stock
      const updatedProducts = await getProducts();
      setProducts(updatedProducts);
      
      clearCart();
      setCustomerName("");
      
      // Reset discount, service charge, PPN to defaults from Supabase
      const settings = await getSettings();
      setDiscount(settings.defaultDiscount || "");
      setServiceCharge(settings.defaultServiceCharge || "");
      setPpn(settings.defaultPPN || "");
      setPaymentMethod("tunai");
      
      toast({ title: "Transaksi Berhasil", description: `Total: ${formatCurrency(grandTotal)}` });
    } catch (err) {
      console.error("Failed to complete checkout:", err);
      toast({ title: "Error", description: "Gagal menyelesaikan transaksi", variant: "destructive" });
    }
  };

  const handlePrint = async () => {
    if (!lastTransaction) return;
    
    // Load settings from Supabase
    const settings = await getSettings();
    
    const printData: PrintTemplateData = {
      id: lastTransaction.id,
      date: lastTransaction.date,
      customerName: lastTransaction.customerName,
      paymentMethod: lastTransaction.paymentMethod,
      items: lastTransaction.items,
      total: lastTransaction.total,
      discount: lastTransaction.discount,
      serviceCharge: lastTransaction.serviceCharge,
      ppn: lastTransaction.ppn,
      ppnPercentage: lastTransaction.ppnPercentage,
    };

    const html = await print(printData, settings);

    if (Capacitor.isNativePlatform()) {
      try {
        await CapacitorPrinter.printHtml({
          html: html,
        });
      } catch (err) {
        console.error("Capacitor printing failed:", err);
        toast({
          title: "Gagal Print",
          description: "Terjadi kesalahan saat mencetak di Android",
          variant: "destructive",
        });
      }
      return;
    }

    // Use window.open for web platform
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

  if (lastTransaction) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-4 mt-24">
        <div className="bg-gradient-to-br from-primary to-emerald-600 rounded-2xl p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold">Transaksi Berhasil!</h2>
          <p className="text-2xl font-black mt-2">{formatCurrency(lastTransaction.total)}</p>
          <p className="text-sm opacity-80 mt-1">{lastTransaction.id} · {lastTransaction.customerName} · {lastTransaction.paymentMethod.toUpperCase()}</p>
        </div>

        <Card className="border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Detail Pembelian</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {lastTransaction.items.map((item, i) => (
              <div key={`${item.product.id}_${item.variant.id}`}>
                <div className="flex justify-between items-start py-2.5">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} {item.variant.unit} × {formatCurrency(item.variant.sellingPrice)}
                    </p>
                  </div>
                  <p className="font-semibold text-sm">{formatCurrency(item.variant.sellingPrice * item.quantity)}</p>
                </div>
                {i < lastTransaction.items.length - 1 && <Separator />}
              </div>
            ))}
            <Separator className="my-2" />
            {lastTransaction.discount !== undefined && lastTransaction.discount !== null && lastTransaction.discount > 0 && (
              <div className="flex justify-between text-sm text-red-600 py-1">
                <span>Diskon</span>
                <span>-{formatCurrency(lastTransaction.discount)}</span>
              </div>
            )}
            {lastTransaction.serviceCharge !== undefined && lastTransaction.serviceCharge !== null && lastTransaction.serviceCharge > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground py-1">
                <span>Biaya Layanan</span>
                <span>+{formatCurrency(lastTransaction.serviceCharge)}</span>
              </div>
            )}
            {lastTransaction.ppn !== undefined && lastTransaction.ppn !== null && lastTransaction.ppn > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground py-1">
                <span>PPN ({lastTransaction.ppnPercentage || 0}%)</span>
                <span>+{formatCurrency(lastTransaction.ppn)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1">
              <p className="font-bold">Total Bayar</p>
              <p className="font-bold text-xl text-primary">{formatCurrency(lastTransaction.total)}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="gap-2 rounded-xl h-11 text-sm font-medium" data-testid="button-back-shop"
            onClick={() => { setLastTransaction(null); }}>
            <PlusCircle className="h-4 w-4" />
            Transaksi Baru
          </Button>
          <Button className="gap-2 rounded-xl h-11 text-sm font-medium" data-testid="button-print" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Cetak Struk 58mm
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className={`max-w-5xl mx-auto flex flex-col gap-5 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Form Input Manual */}
      <Card className="border-card-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            kasirApps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-3 relative">
              <label className="text-xs font-medium text-muted-foreground">Nama Produk</label>
              <div className="relative mt-1.5">
                <Input
                  placeholder="Cari Nama Produk Disini..."
                  value={itemName}
                  onChange={(e) => {
                    setItemName(e.target.value);
                    setShowSuggestions(e.target.value.length > 0);
                    if (e.target.value !== selectedProduct?.name) {
                      setSelectedProduct(null);
                      setSelectedVariant(null);
                    }
                  }}
                  onFocus={() => setShowSuggestions(itemName.length > 0)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddManualItem()}
                  className="h-10"
                />
                {itemName && (
                  <button
                    onClick={() => {
                      setItemName("");
                      setShowSuggestions(false);
                      setSelectedProduct(null);
                      setSelectedVariant(null);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Auto-suggestion dropdown */}
              {showSuggestions && filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Stok: {product.stock} · {product.variants.length} varian
                        </p>
                      </div>
                      {product.variants.length > 1 && (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Harga (Rp)</label>
              <Input
                placeholder="0"
                type="text"
                value={itemSellingPrice}
                onChange={(e) => {
                  setItemSellingPrice(formatCurrencyInput(e.target.value));
                  setSelectedProduct(null);
                  setSelectedVariant(null);
                }}
                className="mt-1.5 h-10"
                onKeyPress={(e) => e.key === 'Enter' && handleAddManualItem()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Quantity</label>
              <Input
                placeholder="0"
                type="text"
                min="1"
                value={itemQuantity}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setItemQuantity(value);
                }}
                className="mt-1.5 h-10"
                onKeyPress={(e) => e.key === 'Enter' && handleAddManualItem()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Satuan</label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  placeholder="-"
                  value={itemUnit}
                  onChange={(e) => {
                    setItemUnit(e.target.value);
                    setSelectedProduct(null);
                    setSelectedVariant(null);
                  }}
                  className="flex-1 h-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddManualItem()}
                />
                {selectedProduct && selectedProduct.variants.length > 1 && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="shrink-0 h-10 w-10"
                    onClick={() => setShowVariantDialog(true)}
                  >
                    <Tag className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="md:col-span-3">
              <Button
                className="w-full rounded-xl gap-2 h-10"
                onClick={handleAddManualItem}
              >
                <PlusCircle className="h-4 w-4" />
                Tambah ke Keranjang
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Cart Items */}
      <div className="lg:col-span-2 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg mt-5" data-testid="text-cart-title">
            Keranjang ({items.length} item)
          </h2>
          {items.length > 0 && (
            <Badge className="bg-red-500 hover:bg-red-600 text-white cursor-pointer" data-testid="button-clear-cart" onClick={clearCart}>
              Hapus Semua
            </Badge>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
            <ShoppingBag className="h-14 w-14 mx-auto mb-4 opacity-30" />
            <p className="font-medium text-lg">Keranjang Kosong</p>
            <p className="text-sm mt-2">Input produk manual di atas untuk memulai transaksi</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <Card key={`${item.product.id}_${item.variant.id}`}
                className="border-card-border"
                data-testid={`card-cart-${item.product.id}-${item.variant.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{item.product.name}</p>
                        <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs shrink-0">{item.variant.label}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-full"
                        data-testid={`button-cart-minus-${item.product.id}`}
                        onClick={() => updateQuantity(item.product.id, item.variant.id, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-bold w-10 text-center">{item.quantity}</span>
                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-full"
                        data-testid={`button-cart-plus-${item.product.id}`}
                        onClick={() => {
                          if (!checkStockAvailability(item.product.id, item.variant.id, item.variant.unit, 1, item.product.name)) {
                            const availableOns = getAvailableStock(item.product.id, item.variant.id, item.variant.unit, item.product.name);
                            const conversionFactor = convertToOns(1, item.variant.unit);
                            const availableInUnit = Math.floor((availableOns || 0) / conversionFactor);
                            toast({ 
                              title: "Stok Tidak Cukup", 
                              description: `Stok tersisa: ${availableOns || 0} ons (${availableInUnit} ${item.variant.unit})`,
                              variant: "destructive" 
                            });
                            return;
                          }
                          updateQuantity(item.product.id, item.variant.id, item.quantity + 1);
                        }}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.variant.sellingPrice)} / {item.variant.unit}</p>
                      <p className="font-bold text-primary text-sm" data-testid={`text-subtotal-${item.product.id}`}>
                        {formatCurrency(item.variant.sellingPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Summary Panel */}
      <div className="flex flex-col gap-3">
        <Card className="border-card-border shadow-sm sticky top-20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Ringkasan Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nama Pelanggan</label>
              <Input
                data-testid="input-customer-name"
                placeholder="Nama pelanggan (opsional)..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1.5 h-10"
              />
            </div>

            {enableDiscount && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Diskon (Rp)</label>
                <Input
                  data-testid="input-discount"
                  placeholder="0"
                  type="text"
                  value={discount}
                  onChange={(e) => setDiscount(formatCurrencyInput(e.target.value))}
                  className="mt-1.5 h-10"
                />
              </div>
            )}

            {enableServiceCharge && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Biaya Layanan (Rp)</label>
                <Input
                  data-testid="input-service-charge"
                  placeholder="0"
                  type="text"
                  value={serviceCharge}
                  onChange={(e) => setServiceCharge(formatCurrencyInput(e.target.value))}
                  className="mt-1.5 h-10"
                />
              </div>
            )}

            {enablePPN && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">PPN (%)</label>
                <Input
                  data-testid="input-ppn"
                  placeholder="0"
                  type="text"
                  value={ppn}
                  onChange={(e) => setPpn(e.target.value)}
                  className="mt-1.5 h-10"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground">Metode Pembayaran</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} data-testid="select-payment-method">
                <SelectTrigger className="mt-1.5 h-10">
                  <SelectValue placeholder="Pilih metode pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tunai">Tunai</SelectItem>
                  <SelectItem value="transfer">Transfer Bank</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                  <SelectItem value="ewallet">E-Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} item)</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {enableDiscount && discountAmount !== undefined && discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Diskon</span>
                  <span>- {formatCurrency(discountAmount || 0)}</span>
                </div>
              )}
              {enableServiceCharge && serviceChargeAmount !== undefined && serviceChargeAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Biaya Layanan</span>
                  <span>+ {formatCurrency(serviceChargeAmount || 0)}</span>
                </div>
              )}
              {enablePPN && ppnAmount !== undefined && ppnAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>PPN ({ppnPercentage || 0}%)</span>
                  <span>+ {formatCurrency(ppnAmount || 0)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total Bayar</span>
                <span className="text-primary" data-testid="text-total">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full rounded-xl gap-2 h-11"
              data-testid="button-checkout"
              onClick={handleCheckout}
              disabled={items.length === 0}
            >
              <ShoppingBag className="h-5 w-5" />
              Bayar Sekarang
            </Button>
          </CardContent>
        </Card>
      </div>
      </div>

      {/* Variant Selection Dialog */}
      <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
        <DialogContent className="max-w-xs rounded-2xl p-4" style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
          <DialogHeader className="space-y-1 pb-2">
            <DialogTitle className="text-base">Pilih Varian</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="flex flex-col gap-2">
              <div className="bg-muted/50 rounded-lg px-3 py-2">
                <p className="font-semibold text-sm">{selectedProduct.name}</p>
              </div>
              <div className="space-y-1.5">
                {selectedProduct.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => handleSelectVariant(variant)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border hover:bg-muted/80 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="text-left flex-1">
                        <p className="text-sm font-medium truncate">{variant.label}</p>
                        <p className="text-xs text-muted-foreground">{variant.unit}</p>
                      </div>
                    </div>
                    <p className="font-bold text-sm text-primary shrink-0">{formatCurrency(variant.sellingPrice)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
