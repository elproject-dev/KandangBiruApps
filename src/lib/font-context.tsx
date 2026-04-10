import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type FontSize = "small" | "medium" | "large";

interface FontContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

export function FontProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const saved = localStorage.getItem("fontSize");
    const initialSize = (saved as FontSize) || "medium";
    // Set immediately on initialization
    document.documentElement.setAttribute("data-font-size", initialSize);
    return initialSize;
  });

  useEffect(() => {
    localStorage.setItem("fontSize", fontSize);
    document.documentElement.setAttribute("data-font-size", fontSize);
  }, [fontSize]);

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
  };

  return (
    <FontContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFont() {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error("useFont must be used within a FontProvider");
  }
  return context;
}
