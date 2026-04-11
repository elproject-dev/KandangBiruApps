export type MainCategory = "bijian" | "konsentrat" | "vitamin" | "mineral" | "hijauan" | "lainnya";

function generateTransactionId(): string {
  const lastNumber = parseInt(localStorage.getItem("lastTransactionNumber") || "980000");
  const newNumber = lastNumber + 1;
  localStorage.setItem("lastTransactionNumber", newNumber.toString());
  return `TRX${newNumber}`;
}

// Conversion factors to base unit "ons"
const CONVERSION_TO_ONS: Record<string, number> = {

  "ons": 1,

  "1/4": 2.5,
  "1/4 kg": 2.5,
  "1/4 kilo": 2.5,
  "1/4 kilogram": 2.5,

  "1/2": 5,
  "1/2 kg": 5,
  "1/2 kilo": 5,
  "1/2 kilogram": 5,

  "kg": 10,
  "kilo": 10,
  "kilogram": 10,

  "sak": 250,
  "sak 25kg": 250,
  "sak 50kg": 500,

};

export function convertToOns(quantity: number, unit: string): number {
  const normalizedUnit = unit.toLowerCase().trim();
  const conversionFactor = CONVERSION_TO_ONS[normalizedUnit] || 1;
  return quantity * conversionFactor;
}

export interface ProductVariant {
  id: string;
  label: string;
  price: number;
  unit: string;
}

export interface FeedProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  stock: number;
  variants: ProductVariant[];
}

export interface CartItem {
  product: FeedProduct;
  variant: ProductVariant;
  quantity: number;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  total: number;
  date: string;
  customerName: string;
  paymentMethod: string;
  discount?: number;
  serviceCharge?: number;
  ppn?: number;
  ppnPercentage?: number;
}

export function cartItemKey(productId: string, variantId: string): string {
  return `${productId}__${variantId}`;
}

const PRODUCTS_KEY = "pakan_ternak_products_v2";
const TRANSACTIONS_KEY = "pakan_ternak_transactions_v2";

const defaultProducts: FeedProduct[] = [];

export function getProducts(): FeedProduct[] {
  const stored = localStorage.getItem(PRODUCTS_KEY);
  if (!stored) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(defaultProducts));
    return defaultProducts;
  }
  return JSON.parse(stored);
}

export function saveProducts(products: FeedProduct[]) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function addProduct(product: Omit<FeedProduct, "id">): FeedProduct {
  const products = getProducts();
  const newProduct: FeedProduct = { ...product, id: Date.now().toString() };
  products.push(newProduct);
  saveProducts(products);
  return newProduct;
}

export function updateProduct(id: string, updates: Partial<FeedProduct>) {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index !== -1) {
    products[index] = { ...products[index], ...updates };
    saveProducts(products);
  }
}

export function deleteProduct(id: string) {
  const products = getProducts().filter((p) => p.id !== id);
  saveProducts(products);
}

export function getTransactions(): Transaction[] {
  const stored = localStorage.getItem(TRANSACTIONS_KEY);
  if (!stored) return [];
  return JSON.parse(stored);
}

export function saveTransaction(transaction: Omit<Transaction, "id" | "date">): Transaction {
  const transactions = getTransactions();
  const newTransaction: Transaction = {
    ...transaction,
    id: generateTransactionId(),
    date: new Date().toISOString(),
  };
  transactions.unshift(newTransaction);
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));

  const products = getProducts();
  
  for (const item of transaction.items) {
    // Try to find product by ID first, then by name if ID is manual
    let idx = products.findIndex((p) => p.id === item.product.id);
    if (idx === -1) {
      idx = products.findIndex((p) => p.name.toLowerCase() === item.product.name.toLowerCase());
    }
    
    if (idx !== -1) {
      // Convert quantity to ons before reducing stock
      const quantityInOns = convertToOns(item.quantity, item.variant.unit);
      products[idx].stock = Math.max(0, products[idx].stock - quantityInOns);
    }
  }
  
  saveProducts(products);
  return newTransaction;
}

export function clearAllTransactions(): void {
  localStorage.removeItem(TRANSACTIONS_KEY);
}

export function deleteTransaction(id: string): void {
  const transactions = getTransactions();
  const filtered = transactions.filter((t) => t.id !== id);
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(filtered));
}

export const CATEGORY_LABELS: Record<MainCategory, string> = {
  bijian: "Biji-bijian",
  konsentrat: "Konsentrat",
  vitamin: "Vitamin",
  mineral: "Mineral",
  hijauan: "Hijauan",
  lainnya: "Lainnya",
};

export const CATEGORY_COLORS: Record<MainCategory, string> = {
  bijian: "bg-amber-100 text-amber-700",
  konsentrat: "bg-emerald-100 text-emerald-700",
  vitamin: "bg-sky-100 text-sky-700",
  mineral: "bg-purple-100 text-purple-700",
  hijauan: "bg-green-100 text-green-700",
  lainnya: "bg-gray-100 text-gray-600",
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category as MainCategory] ?? category;
}

export function getCategoryColor(category: string): string {
  return "bg-gray-100 text-gray-600";
}

export function importProductsFromExcel(rows: Record<string, string>[]): { imported: number; errors: string[]; products: FeedProduct[] } {
  const errors: string[] = [];
  const productMap = new Map<string, FeedProduct>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const name = (row["Nama Produk"] || row["nama produk"] || row["nama"] || "").toString().trim();
    const variantLabel = (row["Varian"] || row["varian"] || row["Label"] || row["label"] || "").toString().trim();
    const priceRaw = (row["Harga"] || row["harga"] || row["Price"] || "").toString().replace(/[^\d]/g, "");
    const unit = (row["Satuan"] || row["satuan"] || row["Unit"] || row["unit"] || "").toString().trim();
    const description = (row["Deskripsi"] || row["deskripsi"] || "").toString().trim();
    const stockRaw = (row["Stok"] || row["stok"] || row["Stock"] || "").toString().replace(/[^\d]/g, "");
    const categoryRaw = (row["Kategori"] || row["kategori"] || "").toString().trim().toLowerCase();

    if (!name) { errors.push(`Baris ${rowNum}: Nama produk kosong`); continue; }
    if (!variantLabel) { errors.push(`Baris ${rowNum}: Label varian kosong`); continue; }
    if (!priceRaw) { errors.push(`Baris ${rowNum}: Harga kosong`); continue; }

    const price = parseInt(priceRaw, 10);
    const stock = stockRaw ? parseInt(stockRaw, 10) : 0;

    const category = categoryRaw?.trim() || "Lainnya";

    const key = name.toLowerCase();
    if (!productMap.has(key)) {
      productMap.set(key, {
        id: `import_${Date.now()}_${i}`,
        name,
        category: category,
        description,
        stock,
        variants: [],
      });
    }

    const product = productMap.get(key)!;
    if (description && !product.description) product.description = description;
    if (stock > 0) product.stock = stock;

    const variantId = `${product.id}_v${product.variants.length + 1}`;
    if (!product.variants.find((v) => v.label.toLowerCase() === variantLabel.toLowerCase())) {
      product.variants.push({ id: variantId, label: variantLabel, price, unit });
    }
  }

  const updated = Array.from(productMap.values()).filter((p) => p.variants.length > 0);

  return { imported: updated.length, errors, products: updated };
}

export function generateExcelTemplate(): { headers: string[]; sampleRows: string[][] } {
  return {
    headers: ["Nama Produk", "Deskripsi", "Kategori", "Stok", "Varian", "Harga", "Satuan"],
    sampleRows: [
      ["Jagung Giling", "Jagung giling halus", "bijian", "500", "1 Ons", "500", "ons"],
      ["Jagung Giling", "", "", "", "1 Kg", "4500", "kg"],
      ["Jagung Giling", "", "", "", "1 Sak (50kg)", "195000", "sak"],
      ["Dedak Padi", "Dedak padi berkualitas", "bijian", "300", "1 Kg", "2800", "kg"],
      ["Dedak Padi", "", "", "", "1 Sak", "120000", "sak"],
    ],
  };
}
