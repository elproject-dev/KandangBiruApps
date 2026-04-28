import { supabase } from './supabase';

// Types
export interface ProductVariant {
  id: string;
  label: string;
  originalPrice: number; // Harga asli (modal)
  sellingPrice: number; // Harga jual
  unit: string;
}

export interface FeedProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  stock: number;
  unit: string; // ons, kg, liter, pcs, dll
  variants: ProductVariant[];
}

export interface Transaction {
  id: string;
  customerName: string;
  items: Array<{
    product: FeedProduct;
    variant: {
      id: string;
      name: string;
      unit: string;
      originalPrice: number;
      sellingPrice: number;
      stock: number;
    };
    quantity: number;
  }>;
  total: number;
  discount?: number;
  serviceCharge?: number;
  ppn?: number;
  ppnPercentage?: number;
  paymentMethod: string;
  date: string;
}

export interface AppSettings {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeFooter?: string;
  qrCodeLink?: string;
  showQRCode?: boolean;
  bluetoothPrinterAddress?: string;
  lastTransactionNumber?: number;
  enableServiceCharge?: boolean;
  defaultServiceCharge?: string;
  enableDiscount?: boolean;
  defaultDiscount?: string;
  enablePPN?: boolean;
  defaultPPN?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
}

function normalizeVariants(input: unknown): ProductVariant[] {
  const normalizeArray = (arr: any[]): ProductVariant[] => {
    return arr
      .filter(Boolean)
      .map((v: any) => {
        const legacyPrice = v?.price;
        const legacyPriceNumber = typeof legacyPrice === 'number' ? legacyPrice : Number(legacyPrice);

        const originalPriceRaw = v?.originalPrice;
        const sellingPriceRaw = v?.sellingPrice;

        const originalPrice =
          typeof originalPriceRaw === 'number'
            ? originalPriceRaw
            : Number(originalPriceRaw ?? (Number.isFinite(legacyPriceNumber) ? legacyPriceNumber : 0)) || 0;

        const sellingPrice =
          typeof sellingPriceRaw === 'number'
            ? sellingPriceRaw
            : Number(sellingPriceRaw ?? (Number.isFinite(legacyPriceNumber) ? legacyPriceNumber : 0)) || 0;

        return {
          id: String(v?.id ?? ''),
          label: String(v?.label ?? ''),
          unit: String(v?.unit ?? 'unit'),
          originalPrice,
          sellingPrice,
        };
      })
      .filter((v) => v.id && v.label);
  };

  if (Array.isArray(input)) return normalizeArray(input);
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? normalizeArray(parsed) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeProduct(row: any): FeedProduct {
  const stock = typeof row.stock === 'number' ? row.stock : Number(row.stock) || 0;
  console.log(`Loading product ${row.name}: stock=${stock} (type: ${typeof row.stock})`);
  return {
    id: row.id,
    name: row.name ?? '',
    category: row.category ?? '',
    description: row.description ?? '',
    stock: stock,
    unit: row.unit ?? 'ons',
    variants: normalizeVariants(row.variants),
  };
}

// Products
export async function getProducts(): Promise<FeedProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeProduct);
}

export async function addProduct(product: Omit<FeedProduct, 'id'>): Promise<FeedProduct> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: product.name,
      category: product.category,
      description: product.description,
      stock: product.stock,
      unit: product.unit,
      variants: product.variants,
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeProduct(data);
}

export async function updateProduct(id: string, updates: Partial<Omit<FeedProduct, 'id'>>): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.category !== undefined ? { category: updates.category } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      ...(updates.stock !== undefined ? { stock: updates.stock } : {}),
      ...(updates.unit !== undefined ? { unit: updates.unit } : {}),
      ...(updates.variants !== undefined ? { variants: updates.variants } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Transactions
export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;

  return (data || []).map(tx => ({
    id: tx.id,
    customerName: tx.customer_name,
    items: tx.items || [],
    total: Number(tx.total) || 0,
    discount: Number(tx.discount) || 0,
    serviceCharge: Number(tx.service_charge) || 0,
    ppn: Number(tx.ppn) || 0,
    ppnPercentage: tx.ppn_percentage || 0,
    paymentMethod: tx.payment_method,
    date: tx.date,
  }));
}

export async function saveTransaction(transaction: Transaction): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .insert({
      id: transaction.id,
      customer_name: transaction.customerName,
      items: transaction.items,
      total: transaction.total,
      discount: transaction.discount || 0,
      service_charge: transaction.serviceCharge || 0,
      ppn: transaction.ppn || 0,
      ppn_percentage: transaction.ppnPercentage || 0,
      payment_method: transaction.paymentMethod,
      date: transaction.date
    });
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function clearAllTransactions(): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}

// Expenses
export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;

  return (data || []).map(exp => ({
    id: exp.id,
    description: exp.description,
    amount: Number(exp.amount),
    category: exp.category,
    date: exp.date,
    notes: exp.notes || undefined,
  }));
}

export async function addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert([{
      ...expense,
      id: Date.now().toString(),
      date: expense.date || new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    description: data.description,
    amount: Number(data.amount),
    category: data.category,
    date: data.date,
    notes: data.notes || undefined,
  };
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function clearAllExpenses(): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}

// Settings
export async function getSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 'app_settings')
    .single();

  if (error) throw error;

  return {
    storeName: data?.store_name,
    storeAddress: data?.store_address,
    storePhone: data?.store_phone,
    storeFooter: data?.store_footer,
    qrCodeLink: data?.qr_code_link,
    showQRCode: data?.show_qr_code,
    lastTransactionNumber: data?.last_transaction_number,
    enableServiceCharge: data?.enable_service_charge,
    defaultServiceCharge: data?.default_service_charge,
    enableDiscount: data?.enable_discount,
    defaultDiscount: data?.default_discount,
    enablePPN: data?.enable_ppn,
    defaultPPN: data?.default_ppn,
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .update({
      store_name: settings.storeName,
      store_address: settings.storeAddress,
      store_phone: settings.storePhone,
      store_footer: settings.storeFooter,
      qr_code_link: settings.qrCodeLink,
      show_qr_code: settings.showQRCode,
      last_transaction_number: settings.lastTransactionNumber,
      enable_service_charge: settings.enableServiceCharge,
      default_service_charge: settings.defaultServiceCharge,
      enable_discount: settings.enableDiscount,
      default_discount: settings.defaultDiscount,
      enable_ppn: settings.enablePPN,
      default_ppn: settings.defaultPPN,
      updated_at: new Date().toISOString()
    })
    .eq('id', 'app_settings');
  if (error) throw error;
}

export async function incrementTransactionNumber(): Promise<string> {
  const { data } = await supabase
    .from('settings')
    .select('last_transaction_number')
    .eq('id', 'app_settings')
    .single();

  const newNumber = (data?.last_transaction_number || 0) + 1;

  const { error } = await supabase
    .from('settings')
    .update({
      last_transaction_number: newNumber,
      updated_at: new Date().toISOString()
    })
    .eq('id', 'app_settings');

  if (error) throw error;
  
  // Generate formatted invoice ID: TRX + 6 digit number starting from 890001
  const invoiceNumber = 890000 + newNumber;
  return `TRX${invoiceNumber}`;
}

// Categories
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function addCategory(name: string): Promise<Category> {
  const newCategory: Omit<Category, 'id'> = { name };
  const { data, error } = await supabase
    .from('categories')
    .insert([{ ...newCategory, id: Date.now().toString() }])
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
