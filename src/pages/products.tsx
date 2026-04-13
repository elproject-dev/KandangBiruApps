import { useEffect, useState, useMemo, useRef } from "react";
import { Plus, Pencil, Trash2, Package, Search, Upload, Download, Tag, FileSpreadsheet, AlertCircle, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCategories } from "@/lib/category-context";
import {
  getCategoryLabel,
  getCategoryColor,
  formatCurrency,
  importProductsFromExcel,
  generateExcelTemplate,
} from "@/lib/store";

import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  type FeedProduct,
  type ProductVariant,
} from "@/lib/supabase-store";

function ProductRow({ product, onEdit, onDelete, isAdminMode }: {
  product: FeedProduct;
  onEdit: (p: FeedProduct) => void;
  onDelete: (id: string) => void;
  isAdminMode: boolean;
}) {
  const lowestOriginalPrice = Math.min(...product.variants.map((v) => v.originalPrice));
  const highestOriginalPrice = Math.max(...product.variants.map((v) => v.originalPrice));
  const lowestSellingPrice = Math.min(...product.variants.map((v) => v.sellingPrice));
  const highestSellingPrice = Math.max(...product.variants.map((v) => v.sellingPrice));

  return (
    <tr
      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
      data-testid={`row-product-${product.id}`}
    >
      <td className="px-4 py-3">
        <p className="font-semibold text-sm">{product.name}</p>
        <p className="text-xs text-muted-foreground">{product.description}</p>
      </td>
      <td className="px-4 py-3 text-center">
        <Badge variant="outline" className={`text-xs ${getCategoryColor(product.category)}`}>
          {getCategoryLabel(product.category)}
        </Badge>
      </td>
      {isAdminMode && (
      <td className="px-4 py-3 text-sm text-right">
        {product.variants.length === 1
          ? formatCurrency(lowestOriginalPrice)
          : `${formatCurrency(lowestOriginalPrice)} – ${formatCurrency(highestOriginalPrice)}`}
      </td>
      )}
      <td className="px-4 py-3 text-sm text-right">
        {product.variants.length === 1
          ? formatCurrency(lowestSellingPrice)
          : `${formatCurrency(lowestSellingPrice)} – ${formatCurrency(highestSellingPrice)}`}
      </td>
      <td className="px-4 py-3 text-center">
        <Badge variant="secondary" className="text-xs">{product.variants.length} varian</Badge>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`text-sm font-medium ${product.stock < 10 ? "text-red-600" : ""}`}>{product.stock}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex gap-1.5 justify-center">
          {isAdminMode && (
            <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg" data-testid={`button-edit-${product.id}`} onClick={() => onEdit(product)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {isAdminMode && (
            <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive hover:text-destructive-foreground" data-testid={`button-delete-${product.id}`} onClick={() => onDelete(product.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function Products() {
  const [products, setProducts] = useState<FeedProduct[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStock, setFilterStock] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FeedProduct | null>(null);
  const [formData, setFormData] = useState({ name: "", category: "", description: "", stock: "" });
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantForm, setVariantForm] = useState({ label: "", originalPrice: "", sellingPrice: "", unit: "" });
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  // Admin mode state
  const [isAdminMode, setIsAdminMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminMode') === 'true';
    }
    return false;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { categories } = useCategories();

  const refresh = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      toast({ title: "Gagal memuat produk", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    refresh();
  }, []);

  const formatCurrencyInput = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) return '';
    return Number(cleanValue).toLocaleString('id-ID');
  };

  const parseCurrencyInput = (value: string) => {
    return value.replace(/\./g, '');
  };

  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      const matchName = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = filterCategory === "all" || p.category === filterCategory;
      let matchStock = true;
      if (filterStock === "low") matchStock = p.stock < 10;
      else if (filterStock === "out") matchStock = p.stock === 0;
      else if (filterStock === "available") matchStock = p.stock > 0;
      return matchName && matchCategory && matchStock;
    });

    // If filter is active, move filtered products to top
    if (filterCategory !== "all" || filterStock !== "all") {
      result = [...result].sort((a, b) => {
        const aMatches = (filterCategory === "all" || a.category === filterCategory) &&
                        (filterStock === "all" ||
                         (filterStock === "low" && a.stock < 10) ||
                         (filterStock === "out" && a.stock === 0) ||
                         (filterStock === "available" && a.stock > 0));
        const bMatches = (filterCategory === "all" || b.category === filterCategory) &&
                        (filterStock === "all" ||
                         (filterStock === "low" && b.stock < 10) ||
                         (filterStock === "out" && b.stock === 0) ||
                         (filterStock === "available" && b.stock > 0));
        return aMatches === bMatches ? 0 : aMatches ? -1 : 1;
      });
    }

    return result;
  },
    [products, search, filterCategory, filterStock]
  );

  const resetDialog = () => {
    setFormData({ name: "", category: categories[0]?.name || "", description: "", stock: "" });
    setVariants([]);
    setVariantForm({ label: "", originalPrice: "", sellingPrice: "", unit: "" });
    setEditingVariant(null);
    setEditingProduct(null);
  };

  const openEdit = (product: FeedProduct) => {
    setEditingProduct(product);
    setFormData({ 
    name: product.name, 
    category: product.category, 
    description: product.description, 
    stock: product.stock.toString()
  });
    setVariants([...product.variants]);
    setDialogOpen(true);
  };

  const addVariant = () => {
    if (!variantForm.label || !variantForm.sellingPrice) {
      toast({ title: "Data varian tidak lengkap", variant: "destructive" });
      return;
    }
    const originalPrice = Number(parseCurrencyInput(variantForm.originalPrice)) || Number(parseCurrencyInput(variantForm.sellingPrice));
    const sellingPrice = Number(parseCurrencyInput(variantForm.sellingPrice));
    if (editingVariant) {
      setVariants((prev) => prev.map((v) =>
        v.id === editingVariant
          ? { ...v, label: variantForm.label, originalPrice, sellingPrice, unit: variantForm.unit }
          : v
      ));
      setEditingVariant(null);
    } else {
      setVariants((prev) => [...prev, {
        id: `v_${Date.now()}`,
        label: variantForm.label,
        originalPrice,
        sellingPrice,
        unit: variantForm.unit || "unit",
      }]);
    }
    setVariantForm({ label: "", originalPrice: "", sellingPrice: "", unit: "" });
  };

  const editVariant = (v: ProductVariant) => {
    setEditingVariant(v.id);
    setVariantForm({ label: v.label, originalPrice: formatCurrencyInput(v.originalPrice.toString()), sellingPrice: formatCurrencyInput(v.sellingPrice.toString()), unit: v.unit });
  };

  const deleteVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
    if (editingVariant === id) { setEditingVariant(null); setVariantForm({ label: "", originalPrice: "", sellingPrice: "", unit: "" }); }
  };

  const handleSave = async () => {
    if (!formData.name) { toast({ title: "Nama produk wajib diisi", variant: "destructive" }); return; }
    if (variants.length === 0) { toast({ title: "Tambahkan minimal 1 varian harga", variant: "destructive" }); return; }
    const data = { name: formData.name, category: formData.category, description: formData.description, stock: Number(formData.stock) || 0, unit: "ons", variants };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
        toast({ title: "Produk diperbarui" });
      } else {
        await addProduct(data);
        toast({ title: "Produk ditambahkan" });
      }

      await refresh();
      setDialogOpen(false);
      resetDialog();
    } catch (err) {
      toast({ title: "Gagal menyimpan produk", variant: "destructive" });
    }
  };

  const handleDelete = (id: string) => {
    setProductToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      try {
        await deleteProduct(productToDelete);
        await refresh();
        toast({ title: "Produk dihapus" });
        setShowDeleteConfirm(false);
        setProductToDelete(null);
      } catch (err) {
        toast({ title: "Gagal menghapus produk", variant: "destructive" });
      }
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportResult(null);
    setImportErrors([]);
    try {
      const { read, utils } = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
      const result = importProductsFromExcel(rows);

      // Use the products directly from the result, not from localStorage
      const importedProducts = result.products;

      // Upsert by name: if product exists (case-insensitive), update it; else insert
      const current = await getProducts();
      const byName = new Map(current.map((p) => [p.name.toLowerCase().trim(), p] as const));

      for (const p of importedProducts) {
        const existing = byName.get(p.name.toLowerCase().trim());
        if (existing) {
          await updateProduct(existing.id, {
            description: p.description,
            category: p.category,
            stock: p.stock,
            variants: p.variants,
          });
        } else {
          await addProduct({
            name: p.name,
            description: p.description,
            category: p.category,
            stock: p.stock,
            unit: "ons",
            variants: p.variants,
          });
        }
      }

      await refresh();
      setImportResult(`Berhasil import/update ${importedProducts.length} produk`);
      setImportErrors(result.errors);
      toast({ title: "Import Selesai", description: `${result.imported} produk diimport` });
    } catch (err) {
      toast({ title: "Gagal membaca file", description: "Pastikan file format .xlsx", variant: "destructive" });
    } finally {
      setImportLoading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadTemplate = async () => {
    const { utils, writeFile } = await import("xlsx");
    const { headers, sampleRows } = generateExcelTemplate();
    const ws = utils.aoa_to_sheet([headers, ...sampleRows]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Produk Pakan");
    writeFile(wb, "template_pakan_ternak.xlsx");
    toast({ title: "Template diunduh", description: "File template_pakan_ternak.xlsx sudah diunduh" });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Memuat produk...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input data-testid="input-search-products" placeholder="Cari produk..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card h-10" />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {isAdminMode && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-10" onClick={() => setImportDialogOpen(true)} data-testid="button-import">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
          )}
          {isAdminMode && (
          <Button size="sm" className="gap-1.5 text-xs h-10" onClick={() => { resetDialog(); setDialogOpen(true); }} data-testid="button-add-product">
            <Plus className="h-4 w-4" />
            Tambah Produk
          </Button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStock} onValueChange={setFilterStock}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Stok" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Stok</SelectItem>
              <SelectItem value="available">Tersedia</SelectItem>
              <SelectItem value="low">Stok Rendah</SelectItem>
              <SelectItem value="out">Habis</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} dari {products.length} produk</p>

      {/* Desktop Table */}
      <Card className="border-card-border shadow-sm">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  "Produk", 
                  "Kategori", 
                  ...(isAdminMode ? ["Harga Asli"] : []),
                  "Harga Jual", 
                  "Varian", 
                  "Stok", 
                  "Aksi"
                ].map((h, i) => (
                  <th key={h} className={`text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 ${
                    i === 1 || 
                    (isAdminMode ? i === 4 : i === 3) || 
                    (isAdminMode ? i === 5 : i === 4) || 
                    (isAdminMode ? i === 6 : i === 5) 
                      ? 'text-center' : 
                      (isAdminMode ? i === 2 : i === 2) || i === (isAdminMode ? 3 : 3) 
                        ? 'text-right' : 
                        ''
                  }`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <ProductRow key={product.id} product={product} onEdit={openEdit} onDelete={handleDelete} isAdminMode={isAdminMode} />
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={isAdminMode ? 7 : 6} className="text-center py-12 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Belum ada produk</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden p-3 space-y-3">
          {filtered.map((product) => {
            const lowestPrice = Math.min(...product.variants.map((v) => v.sellingPrice));
            return (
              <Card key={product.id} className="border-card-border shadow-sm" data-testid={`card-manage-${product.id}`}>
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight">{product.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{product.description}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${getCategoryColor(product.category)}`}>
                      {getCategoryLabel(product.category)}
                    </Badge>
                  </div>

                  {/* Info List */}
                  <div className="space-y-1.5 mb-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">harga</span>
                      <span className="font-bold text-primary">{formatCurrency(lowestPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">stok</span>
                      <span className={`font-semibold ${product.stock < 10 ? "text-red-600" : ""}`}>{product.stock}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">varian</span>
                      <Badge variant="secondary" className="text-xs py-0">{product.variants.length}</Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-border/50">
                    {isAdminMode && (
                      <Button size="sm" variant="outline" className="flex-1 h-9 text-xs gap-1.5" onClick={() => openEdit(product)} data-testid={`button-edit-${product.id}`}>
                        <Pencil className="h-3 w-3" />Edit
                      </Button>
                    )}
                    {isAdminMode && (
                      <Button size="sm" variant="outline" className="flex-1 h-9 text-xs gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDelete(product.id)} data-testid={`button-delete-${product.id}`}>
                        <Trash2 className="h-3 w-3" />Hapus
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Belum ada produk</p>
              <p className="text-xs mt-1">Tambahkan produk untuk memulai</p>
            </div>
          )}
        </div>
      </Card>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md w-full rounded-2xl mx-0 sm:mx-4 p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Import Data dari Excel
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1.5">
              <p className="font-semibold text-xs">Format Kolom Excel:</p>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {["Nama Produk *", "Deskripsi", "Kategori", "Stok", "Varian *", "Harga *", "Satuan"].map((h) => (
                  <span key={h} className={`bg-white border border-border rounded px-1.5 py-0.5 font-mono ${h.includes("*") ? "text-primary font-bold" : "text-muted-foreground"}`}>{h}</span>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Produk dengan nama sama akan digabungkan variannya</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-1.5 text-xs rounded-lg py-2" onClick={handleDownloadTemplate} disabled={importLoading}>
                <Download className="h-3.5 w-3.5" />
                Unduh Template
              </Button>
              <Button className="gap-1.5 text-xs rounded-lg py-2" onClick={() => fileInputRef.current?.click()} disabled={importLoading}>
                {importLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Upload...
                  </span>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Pilih File .xlsx
                  </>
                )}
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileImport}
            />

            {importLoading && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="font-medium text-primary">Harap menunggu, proses upload memerlukan waktu beberapa saat...</span>
                </div>
              </div>
            )}

            {importResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs text-emerald-700 font-medium">
                ✅ {importResult}
              </div>
            )}
            {importErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-[10px] text-red-600 space-y-0.5 max-h-24 overflow-y-auto">
                {importErrors.map((e, i) => <p key={i}>⚠ {e}</p>)}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm w-full rounded-2xl mx-0 sm:mx-4 p-0">
          <DialogHeader className="px-4 pt-4 pb-3">
            <DialogTitle className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-5 w-5" />
              Hapus Produk
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-4 pb-4">
            <p className="text-sm text-muted-foreground">
              Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={confirmDelete}
              >
                Hapus
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog(); }}>
        <DialogContent className="max-w-lg w-full rounded-2xl mx-0 sm:mx-4 p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
            <DialogTitle className="text-base font-semibold">{editingProduct ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 p-4">
            {/* Basic Info */}
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium mb-1 block">Nama Produk *</label>
                <Input data-testid="input-product-name" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Pakan Ayam Premium" className="h-8 text-sm" />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium mb-1 block">Kategori</label>
                  <Select value={formData.category} onValueChange={(v: string) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger className="h-8 text-sm" data-testid="select-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Stok</label>
                  <Input data-testid="input-product-stock" type="number" value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0" className="h-8 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Deskripsi</label>
                <Input data-testid="input-product-description" value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi singkat produk..." className="h-8 text-sm" />
              </div>
            </div>

            <Separator />

            {/* Variants */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold">Varian Harga *</label>
                <Badge variant="secondary" className="text-xs">{variants.length} varian</Badge>
              </div>

              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {variants.map((v) => (
                  <div key={v.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
                    <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{v.label}</p>
                      <p className="text-[10px] text-muted-foreground">{v.unit}</p>
                    </div>
                    <p className="text-xs font-bold text-primary shrink-0">{formatCurrency(v.sellingPrice)}</p>
                    {isAdminMode && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => editVariant(v)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                      <button onClick={() => deleteVariant(v.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    )}
                  </div>
                ))}
                {variants.length === 0 && (
                  <div className="text-center py-3 border-2 border-dashed border-border rounded-lg">
                    <Tag className="h-5 w-5 mx-auto mb-1 text-muted-foreground opacity-30" />
                    <p className="text-xs text-muted-foreground">Belum ada varian</p>
                  </div>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-2 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {editingVariant ? "Edit Varian" : "Tambah Varian Baru"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <div className="col-span-1 sm:col-span-2">
                    <Input
                      data-testid="input-variant-label"
                      placeholder="Label varian"
                      value={variantForm.label}
                      onChange={(e) => setVariantForm({ ...variantForm, label: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <Input
                    data-testid="input-variant-original-price"
                    type="text"
                    placeholder="Harga Asli (Modal)"
                    value={variantForm.originalPrice}
                    onChange={(e) => setVariantForm({ ...variantForm, originalPrice: formatCurrencyInput(e.target.value) })}
                    className="h-8 text-xs"
                  />
                  <Input
                    data-testid="input-variant-selling-price"
                    type="text"
                    placeholder="Harga Jual"
                    value={variantForm.sellingPrice}
                    onChange={(e) => setVariantForm({ ...variantForm, sellingPrice: formatCurrencyInput(e.target.value) })}
                    className="h-8 text-xs"
                  />
                  <Input
                    data-testid="input-variant-unit"
                    placeholder="Satuan"
                    value={variantForm.unit}
                    onChange={(e) => setVariantForm({ ...variantForm, unit: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <Button size="sm" className="w-full h-8 gap-1.5 rounded-lg text-xs" onClick={addVariant}>
                  <Plus className="h-3 w-3" />
                  {editingVariant ? "Simpan Varian" : "Tambah Varian"}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 p-4 pt-0">
            <Button variant="outline" className="flex-1 h-8 text-sm" onClick={() => { setDialogOpen(false); resetDialog(); }}>Batal</Button>
            <Button className="flex-1 h-8 text-sm" data-testid="button-save-product" onClick={handleSave}>
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
