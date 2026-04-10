import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider, useCart } from "@/lib/cart-context";
import { FontProvider } from "@/lib/font-context";
import { ThemeProvider } from "@/lib/theme-context";
import { CategoryProvider } from "@/lib/category-context";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Clock,
  Menu,
  X,
  Leaf,
  PlusCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import Dashboard from "@/pages/dashboard";
import Cart from "@/pages/cart";
import Products from "@/pages/products";
import History from "@/pages/history";
import Expenses from "@/pages/expenses";
import SettingsPage from "@/pages/settings";
import Guide from "@/pages/guide";
import Support from "@/pages/support";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/cart", icon: PlusCircle, label: "Kasir", showBadge: true },
  { path: "/products", icon: Package, label: "Produk" },
  { path: "/history", icon: Clock, label: "Riwayat" },
  { path: "/expenses", icon: ArrowDownLeft, label: "Pengeluaran", showOnMobile: false },
  { path: "/guide", icon: BookOpen, label: "Panduan", showOnMobile: false },
  { path: "/support", icon: MessageSquare, label: "Hubungi Support", showOnMobile: false },
  { path: "/settings", icon: Settings, label: "Setting" },
];

function SidebarNav({ collapsed, onToggleCollapse, onClose }: { collapsed?: boolean; onToggleCollapse?: () => void; onClose?: () => void }) {
  const [location] = useLocation();
  const { itemCount } = useCart();

  return (
    <div className="flex flex-col h-full">
      {/* Logo Header - Desktop */}
      <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <Leaf className="h-4 w-4 text-white" />
        </div>
        <span className={`font-bold text-base whitespace-nowrap ml-2 transition-all duration-300 ${collapsed ? 'opacity-0 w-0 overflow-hidden ml-0' : 'opacity-100 w-auto ml-2'}`}>Kandang Biru</span>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          const badge = item.showBadge ? itemCount : 0;
          return (
            <Link
              key={item.path}
              href={item.path}
              data-testid={`sidebar-${item.label.toLowerCase()}`}
              onClick={onClose}
              className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              } ${collapsed ? 'rounded-none' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <div className="relative">
                <Icon className="h-4 w-4" />
                {badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                    {badge}
                  </span>
                )}
              </div>
              {!collapsed && item.label}
              {!collapsed && badge > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold rounded-full px-2 py-0.5">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={onClose ? onClose : onToggleCollapse}
          className={`w-full flex items-center justify-center p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground`}
          title={onClose ? "Tutup" : (collapsed ? "Perluas Sidebar" : "Ciutkan Sidebar")}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

function BottomNav() {
  const [location] = useLocation();
  const { itemCount } = useCart();

  const mobileNavItems = navItems.filter(item => item.showOnMobile !== false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border no-print z-40 lg:hidden">
      <div className="flex items-center justify-around px-2 py-1.5">
        {mobileNavItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          const badge = item.showBadge ? itemCount : 0;
          return (
            <Link
              key={item.path}
              href={item.path}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors relative ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                    {badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const [location] = useLocation();
  const titles: Record<string, string> = {
    "/": "Dashboard",
    "/cart": "Kasir",
    "/products": "Kelola Produk",
    "/history": "Riwayat Transaksi",
    "/expenses": "Pengeluaran",
    "/guide": "Panduan Pengguna",
    "/support": "Hubungi Support",
    "/settings": "Setting",
  };
  return (
    <header className="h-14 bg-card border-b border-border flex items-center px-4 gap-3 no-print lg:hidden sticky top-0 z-30">
      <button
        data-testid="button-menu"
        onClick={onMenuClick}
        className="p-2 -ml-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
          <Leaf className="h-4 w-4 text-white" />
        </div>
        <h1 className="font-bold text-sm">{titles[location] ?? "Kandang Biru Bantul"}</h1>
      </div>
    </header>
  );
}

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col ${sidebarCollapsed ? 'w-16' : 'w-60 xl:w-64'} bg-card border-r border-border no-print fixed top-0 left-0 h-full z-40 transition-all duration-300`}>
        <SidebarNav collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </aside>

      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-50 transition-transform duration-300 lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full">
          <SidebarNav onClose={() => setSidebarOpen(false)} />
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60 xl:ml-64'}`}>
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        {/* Desktop Header */}
        <header className="hidden lg:flex h-14 bg-card border-b border-border items-center px-6 gap-4 no-print sticky top-0 z-30">
          <PageTitle />
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
          <Router />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

function PageTitle() {
  const [location] = useLocation();
  const titles: Record<string, string> = {
    "/": "Dashboard",
    "/cart": "Kasir",
    "/products": "Kelola Produk",
    "/history": "Riwayat Transaksi",
    "/expenses": "Pengeluaran",
    "/guide": "Panduan Pengguna",
    "/support": "Hubungi Support",
    "/settings": "Setting",
  };
  return <h2 className="font-bold text-base">{titles[location] ?? "Kandang Biru Bantul"}</h2>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/cart" component={Cart} />
      <Route path="/products" component={Products} />
      <Route path="/history" component={History} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/guide" component={Guide} />
      <Route path="/support" component={Support} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <CategoryProvider>
            <FontProvider>
              <CartProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <AppShell />
                </WouterRouter>
                <Toaster />
              </CartProvider>
            </FontProvider>
          </CategoryProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
