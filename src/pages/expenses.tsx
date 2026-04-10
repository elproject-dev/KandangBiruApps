import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, Tag, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/store";
import { getExpenses, addExpense, deleteExpense, Expense } from "@/lib/supabase-store";

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load expenses from Supabase on mount
  useEffect(() => {
    setMounted(true);
    const loadExpenses = async () => {
      try {
        const data = await getExpenses();
        setExpenses(data);
      } catch (err) {
        console.error("Failed to load expenses from Supabase:", err);
        // Fallback to localStorage if Supabase fails
        const EXPENSES_KEY = "pakan_ternak_expenses";
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem(EXPENSES_KEY);
          if (stored) {
            setExpenses(JSON.parse(stored));
          }
        }
      } finally {
        setLoading(false);
      }
    };
    loadExpenses();
  }, []);

  // Reset date to today when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setNotes("");
    }
  }, [isDialogOpen]);

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const handleAddExpense = async () => {
    if (!description.trim() || !amount || !category) return;

    setSaving(true);
    try {
      // Convert date string (YYYY-MM-DD) to ISO timestamp
      const expenseDate = new Date(date + 'T00:00:00').toISOString();

      const newExpense = await addExpense({
        description: description.trim(),
        amount: parseInt(amount.replace(/\D/g, "")) || 0,
        date: expenseDate,
        category: category,
        notes: notes.trim() || undefined,
      });
      setExpenses([newExpense, ...expenses]);
      setDescription("");
      setAmount("");
      setCategory("");
      setDate(new Date().toISOString().split('T')[0]);
      setNotes("");
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Failed to add expense:", err);
      alert("Gagal menambahkan pengeluaran: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpense(id);
      setExpenses(expenses.filter((exp) => exp.id !== id));
    } catch (err) {
      console.error("Failed to delete expense:", err);
    }
  };

  const formatCurrencyInput = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) return '';
    return parseInt(cleanValue).toLocaleString('id-ID');
  };

  return (
    <div className={`flex flex-col gap-5 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Total Card */}
      <Card className="border-card-border shadow-sm relative hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Total Pengeluaran
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Memuat...</p>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-destructive transition-all duration-300">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs text-muted-foreground mt-1">{expenses.length} catatan pengeluaran</p>
            </>
          )}

          <div className="absolute top-1/2 right-4 -translate-y-1/2">
            <Button size="sm" onClick={() => setIsDialogOpen(true)} disabled={loading} className="hover:scale-105 transition-transform duration-200">
              Catat
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Catat Pengeluaran</DialogTitle>
            <DialogDescription>
              Masukkan detail pengeluaran yang ingin dicatat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                placeholder="Contoh: Beli kertas struk"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="category">Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bahan Habis Pakai">Bahan Habis Pakai</SelectItem>
                  <SelectItem value="Peralatan">Peralatan</SelectItem>
                  <SelectItem value="Utilitas">Utilitas</SelectItem>
                  <SelectItem value="Gaji">Gaji</SelectItem>
                  <SelectItem value="Sewa">Sewa</SelectItem>
                  <SelectItem value="Belanja">Belanja</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="amount">Jumlah</Label>
                <Input
                  id="amount"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="date">Tanggal</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Catatan</Label>
              <Input
                id="notes"
                placeholder="Catatan tambahan (opsional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 mt-2" disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleAddExpense} className="flex-1 mt-2" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Catat"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expenses List */}
      <Card className="border-card-border shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Riwayat Pengeluaran</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p>Memuat data pengeluaran...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="font-medium">Belum ada pengeluaran</p>
              <p className="text-sm mt-1 mb-4">Tambahkan pengeluaran pertama Anda</p>
              <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                Catat
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense, index) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-muted/40 hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-default"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{expense.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {expense.category} • {new Date(expense.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {expense.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{expense.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-sm font-bold text-destructive">{formatCurrency(expense.amount)}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={() => handleDeleteExpense(expense.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
