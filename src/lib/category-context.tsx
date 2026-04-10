import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCategories, addCategory, deleteCategory as deleteCategorySupabase } from "@/lib/supabase-store";

interface Category {
  id: string;
  name: string;
}

interface CategoryContextType {
  categories: Category[];
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  loading: boolean;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error("Failed to load categories from Supabase:", err);
        // Fallback to localStorage if Supabase fails
        const saved = localStorage.getItem("categories");
        if (saved) {
          setCategories(JSON.parse(saved));
        } else {
          setCategories([
            { id: "1", name: "Pakan Ternak" },
            { id: "2", name: "Vitamin" },
            { id: "3", name: "Obat" },
          ]);
        }
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, []);

  const handleAddCategory = async (name: string) => {
    try {
      const newCategory = await addCategory(name.trim());
      setCategories((prev) => [...prev, newCategory]);
    } catch (err) {
      console.error("Failed to add category:", err);
      // Fallback to localStorage if Supabase fails
      const newCategory: Category = {
        id: Date.now().toString(),
        name: name.trim(),
      };
      setCategories((prev) => [...prev, newCategory]);
      localStorage.setItem("categories", JSON.stringify([...categories, newCategory]));
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategorySupabase(id);
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
    } catch (err) {
      console.error("Failed to delete category:", err);
      // Fallback to localStorage if Supabase fails
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
      localStorage.setItem("categories", JSON.stringify(categories.filter((cat) => cat.id !== id)));
    }
  };

  return (
    <CategoryContext.Provider value={{ categories, addCategory: handleAddCategory, deleteCategory: handleDeleteCategory, loading }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error("useCategories must be used within a CategoryProvider");
  }
  return context;
}
