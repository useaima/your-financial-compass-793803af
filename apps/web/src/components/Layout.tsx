import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  DollarSign,
  FileText,
  History,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Newspaper,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import BrandLockup from "@/components/BrandLockup";
import UserProfileMenu from "@/components/UserProfileMenu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const coreMenuItems: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/chat", label: "AI Advisor", icon: MessageSquare },
  { path: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { path: "/spending-history", label: "Spending History", icon: History },
  { path: "/budget", label: "Budget Limits", icon: DollarSign },
  { path: "/goals", label: "Goals", icon: Target },
];

const intelligenceMenuItems: NavItem[] = [
  { path: "/financial-statement", label: "Financial Statement", icon: FileText },
  { path: "/insights", label: "Spending Insights", icon: BarChart3 },
  { path: "/subscriptions", label: "Subscriptions", icon: CreditCard },
];

const marketMenuItems: NavItem[] = [
  { path: "/news", label: "Finance News", icon: Newspaper },
  { path: "/stock-picks", label: "Stock Picks", icon: TrendingUp },
];

const navigationSections: NavSection[] = [
  { label: "Workspace", items: coreMenuItems },
  { label: "Plan", items: intelligenceMenuItems },
  { label: "Markets", items: marketMenuItems },
];

const desktopMenuItems = navigationSections.flatMap((section) => section.items);

function NavigationButton({
  item,
  activePath,
  onClick,
  variant = "desktop",
}: {
  item: NavItem;
  activePath: string;
  onClick: () => void;
  variant?: "desktop" | "mobile";
}) {
  const isActive = activePath === item.path;

  return (
    <button
      type="button"
      data-testid={`nav-item-${item.path.replace("/", "") || "root"}-${variant}`}
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center gap-3 rounded-2xl text-left font-medium transition-colors",
        variant === "desktop" ? "px-3 py-3 text-base" : "px-4 py-3.5 text-sm",
        isActive
          ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_rgba(243,162,28,0.14)]"
          : "text-muted-foreground hover:bg-secondary/90 hover:text-foreground",
      )}
    >
      <item.icon className={cn(variant === "desktop" ? "h-[18px] w-[18px]" : "h-4 w-4")} />
      <span className="flex-1">{item.label}</span>
      {isActive && (
        <motion.div
          layoutId={variant === "desktop" ? "desktop-nav-active" : "mobile-nav-active"}
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
    </button>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activePath = location.pathname;
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [activePath]);

  const activeSectionLabel = useMemo(() => {
    const activeItem = desktopMenuItems.find((item) => item.path === activePath);
    return activeItem?.label ?? "Workspace";
  }, [activePath]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="window-controls-safe-sidebar fixed hidden w-[236px] flex-col gap-4 border-r border-border/90 bg-[hsl(var(--sidebar-background)/0.94)] p-4 pt-5 shadow-[18px_0_45px_-38px_rgba(110,73,75,0.28)] backdrop-blur-xl md:flex">
        <div className="rounded-[1.6rem] border border-border/80 bg-card/92 p-4 shadow-[0_18px_40px_-34px_rgba(110,73,75,0.18)]">
          <BrandLockup
            size="sm"
            subtitleClassName="text-[0.58rem] tracking-[0.2em]"
            titleClassName="text-[1.08rem]"
            iconClassName="h-11 w-11 rounded-[1rem]"
          />
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Keep your finances grounded in one canonical workspace.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <nav data-testid="desktop-navigation" className="space-y-3 pb-2">
            <div className="space-y-1 rounded-[1.5rem] border border-border/80 bg-card/90 p-2 shadow-[0_18px_40px_-34px_rgba(110,73,75,0.18)]">
              {desktopMenuItems.map((item) => (
                <NavigationButton
                  key={item.path}
                  item={item}
                  activePath={activePath}
                  onClick={() => navigate(item.path)}
                />
              ))}
            </div>
          </nav>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/90 bg-[hsl(var(--background)/0.94)] shadow-[0_16px_32px_-28px_rgba(110,73,75,0.25)] backdrop-blur-xl md:hidden">
        <div data-testid="mobile-header" className="flex h-16 items-center justify-between gap-3 px-4">
          <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                data-testid="mobile-nav-trigger"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-card/90 text-foreground shadow-[0_14px_28px_-22px_rgba(110,73,75,0.3)] transition-colors hover:bg-secondary"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>

            <SheetContent
              side="left"
              data-testid="mobile-nav-drawer"
              className="flex h-dvh w-[92vw] max-w-[22rem] flex-col gap-0 overflow-hidden border-r border-border/80 bg-[hsl(var(--background)/0.98)] p-0"
            >
              <SheetHeader className="border-b border-border/80 px-5 pb-4 pt-6 text-left">
                <SheetTitle className="text-sm font-semibold text-foreground">
                  Navigation
                </SheetTitle>
                <SheetDescription className="mt-1 text-sm text-muted-foreground">
                  {activeSectionLabel} is active. All sections stay available below.
                </SheetDescription>
              </SheetHeader>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-8">
                <nav data-testid="mobile-navigation" className="space-y-5 pb-6">
                  {navigationSections.map((section) => (
                    <div key={section.label} className="space-y-2">
                      <p className="px-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {section.label}
                      </p>
                      <div className="space-y-1 rounded-[1.4rem] border border-border/75 bg-card/92 p-2 shadow-[0_16px_34px_-30px_rgba(110,73,75,0.18)]">
                        {section.items.map((item) => (
                          <NavigationButton
                            key={item.path}
                            item={item}
                            activePath={activePath}
                            onClick={() => navigate(item.path)}
                            variant="mobile"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <UserProfileMenu compact />
        </div>
      </header>

      <main data-testid="app-shell-main" className="window-controls-safe-main flex-1 px-0 pb-8 pt-16 md:ml-[236px] md:pt-0">
        {children}
      </main>
    </div>
  );
}
