import { useState, useMemo } from "react";
import { Package, ShoppingCart, Search, Plus, Minus, ChevronDown, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/lib/cart-context";
import {
  getProducts,
  getCategoryLabel,
  getCategoryColor,
  formatCurrency,
  type ProductVariant,
  type MainCategory,
} from "@/lib/store";
import { type FeedProduct } from "@/lib/supabase-store";

const CATEGORY_FILTER: { value: MainCategory | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "bijian", label: "Biji-bijian" },
  { value: "konsentrat", label: "Konsentrat" },
  { value: "vitamin", label: "Vitamin" },
  { value: "mineral", label: "Mineral" },
  { value: "hijauan", label: "Hijauan" },
  { value: "lainnya", label: "Lainnya" },
];

function ProductCard({ product }: { product: FeedProduct }) {
  const { addToCart, updateQuantity, removeFromCart, items } = useCart();
  const { toast } = useToast();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.variants[0]);

  const cartEntry = useMemo(() => {
    return items.find(
      (i) => i.product.id === product.id && i.variant.id === selectedVariant?.id
    );
  }, [items, product.id, selectedVariant]);

  const qty = cartEntry?.quantity ?? 0;

  const handleAdd = () => {
    if (!selectedVariant) return;
    if (product.stock <= 0) {
      toast({ title: "Stok Habis", description: `${product.name} tidak tersedia`, variant: "destructive" });
      return;
    }
    addToCart(product, selectedVariant, 1);
    toast({ title: "Ditambahkan", description: `${product.name} – ${selectedVariant.label}` });
  };

  const handleMinus = () => {
    if (!selectedVariant) return;
    if (qty > 1) updateQuantity(product.id, selectedVariant.id, qty - 1);
    else removeFromCart(product.id, selectedVariant.id);
  };

  const handlePlus = () => handleAdd();

  if (!selectedVariant) return null;

  return (
    <Card
      data-testid={`card-product-${product.id}`}
      className="border-card-border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col"
    >
      <CardContent className="p-4 flex flex-col flex-1 gap-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm leading-tight" data-testid={`text-name-${product.id}`}>
                {product.name}
              </h3>
              <Badge variant="outline" className={`text-xs shrink-0 ${getCategoryColor(product.category)}`}>
                {getCategoryLabel(product.category)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
          </div>
        </div>

        {/* Variant Selector */}
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">Pilih Ukuran / Satuan:</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid={`dropdown-variant-${product.id}`}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted transition-colors text-sm"
              >
                <div className="text-left min-w-0">
                  <p className="font-medium text-sm truncate">{selectedVariant.label}</p>
                  <p className="text-xs text-primary font-bold">{formatCurrency(selectedVariant.sellingPrice)}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {product.name} – Pilih Varian
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {product.variants.map((variant) => {
                const isSelected = selectedVariant.id === variant.id;
                const inCart = items.find((i) => i.product.id === product.id && i.variant.id === variant.id);
                return (
                  <DropdownMenuItem
                    key={variant.id}
                    data-testid={`variant-option-${variant.id}`}
                    onClick={() => setSelectedVariant(variant)}
                    className={`flex items-center justify-between cursor-pointer ${isSelected ? "bg-primary/5" : ""}`}
                  >
                    <div>
                      <p className="text-sm font-medium">{variant.label}</p>
                      <p className="text-xs text-primary font-bold">{formatCurrency(variant.sellingPrice)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      {inCart && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">{inCart.quantity}</Badge>
                      )}
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stock + Action */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-primary" data-testid={`text-price-${product.id}`}>
              {formatCurrency(selectedVariant.sellingPrice)}
            </p>
            <p className="text-xs text-muted-foreground">Stok: {product.stock}</p>
          </div>
          {qty > 0 ? (
            <div className="flex items-center gap-1.5">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-full"
                data-testid={`button-minus-${product.id}`}
                onClick={handleMinus}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-bold w-6 text-center">{qty}</span>
              <Button
                size="icon"
                className="h-8 w-8 rounded-full"
                data-testid={`button-plus-${product.id}`}
                onClick={handlePlus}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="rounded-full gap-1.5 h-8 text-xs px-3"
              data-testid={`button-add-${product.id}`}
              onClick={handleAdd}
              disabled={product.stock <= 0 || product.variants.length === 0}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Tambah
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Catalog() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<MainCategory | "all">("all");
  const { items } = useCart();
  const products = getProducts();

  const cartTotal = items.reduce((s, i) => s + i.variant.sellingPrice * i.quantity, 0);
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchName = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === "all" || p.category === activeCategory;
      return matchName && matchCat;
    });
  }, [products, search, activeCategory]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder="Cari produk pakan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-card-border"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 shrink-0">
          {CATEGORY_FILTER.map((f) => (
            <button
              key={f.value}
              data-testid={`button-filter-${f.value}`}
              onClick={() => setActiveCategory(f.value)}
              className={`px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === f.value
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">{filteredProducts.length} produk</span>
        {cartCount > 0 && (
          <span className="ml-auto font-semibold text-primary">
            🛒 {cartCount} item · {formatCurrency(cartTotal)}
          </span>
        )}
      </div>

      {/* Hint */}
      {filteredProducts.length > 0 && (
        <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-2.5 text-xs text-primary/80 flex items-center gap-2">
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          Pilih ukuran / satuan dari dropdown setiap produk, lalu klik <strong>Tambah</strong>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Produk tidak ditemukan</p>
            <p className="text-sm mt-1">Coba kata kunci lain atau ubah filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
