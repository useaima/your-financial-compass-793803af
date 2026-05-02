import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PieChart,
  Target,
  History,
  CreditCard,
  ClipboardCheck,
  Clock3,
  Newspaper,
  TrendingUp,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import UserProfileMenu from "./UserProfileMenu";

type NavItem = {
  path: string;
  label: string;
  icon: any;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const coreMenuItems: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/transactions", label: "Transactions", icon: History },
];

const intelligenceMenuItems: NavItem[] = [
  { path: "/budget", label: "Budget Plan", icon: PieChart },
  { path: "/goals", label: "Financial Goals", icon: Target },
  { path: "/subscriptions", label: "Subscriptions", icon: CreditCard },
];

const actionMenuItems: NavItem[] = [
  { path: "/approvals", label: "Approval Inbox", icon: ClipboardCheck },
  { path: "/action-history", label: "Action History", icon: Clock3 },
];

const marketMenuItems: NavItem[] = [
  { path: "/news", label: "Finance News", icon: Newspaper },
  { path: "/stock-picks", label: "Stock Picks", icon: TrendingUp },
];

const navigationSections: NavSection[] = [
  { label: "Workspace", items: coreMenuItems },
  { label: "Plan", items: intelligenceMenuItems },
  { label: "Actions", items: actionMenuItems },
  { label: "Markets", items: marketMenuItems },
];

const desktopMenuItems = navigationSections.flatMap((section) => section.items);

function AppLogoButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-testid="app-logo-button"
      onClick={onClick}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 bg-card/92 p-2 shadow-[0_14px_30px_-24px_rgba(110,73,75,0.24)] transition-colors hover:bg-secondary/70",
        className,
      )}
      aria-label="Go to dashboard"
    >
      <img
        src="/apple-touch-icon.png"
        alt="eva app logo"
        width={48}
        height={48}
        loading="eager"
        decoding="async"
        className="h-8 w-8 rounded-xl object-cover"
      />
    </button>
  );
}

function NavigationButton({
  item,
  activePath,
  onClick,
  variant = "desktop",
  index = 0,
}: {
  item: NavItem;
  activePath: string;
  onClick: () => void;
  variant?: "desktop" | "mobile";
  index?: number;
}) {
  const isActive = activePath === item.path;

  return (
    <motion.button
      type="button"
      data-testid={`nav-item-${item.path.replace("/", "")}-${variant}`}
      onClick={onClick}
      initial={variant === "mobile" ? { opacity: 0, x: -20 } : false}
      animate={variant === "mobile" ? { opacity: 1, x: 0 } : false}
      transition={{ delay: index * 0.05 }}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
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
    </motion.button>
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
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
      <aside className="window-controls-safe-sidebar fixed inset-y-0 left-0 z-30 hidden h-screen w-[236px] flex-col gap-4 border-r border-border/60 bg-[hsl(var(--sidebar-background)/0.8)] p-4 pt-5 shadow-[20px_0_50px_-40px_rgba(110,73,75,0.2)] backdrop-blur-2xl md:flex">
        <div className="flex items-center justify-between px-1">
          <AppLogoButton onClick={() => navigate("/dashboard")} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 scrollbar-none">
          <nav data-testid="desktop-navigation" className="space-y-3 pb-2">
            <div className="space-y-1 rounded-[1.8rem] border border-border/40 bg-card/40 p-2.5 shadow-[0_20px_40px_-30px_rgba(110,73,75,0.12)] backdrop-blur-md">
              {desktopMenuItems.map((item, idx) => (
                <NavigationButton
                  key={item.path}
                  item={item}
                  activePath={activePath}
                  onClick={() => navigate(item.path)}
                  index={idx}
                />
              ))}
            </div>
          </nav>
        </div>
      </aside>

      <div className="fixed right-6 top-5 z-40 hidden md:flex">
        <UserProfileMenu compact />
      </div>

      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/40 bg-[hsl(var(--background)/0.75)] shadow-[0_12px_24px_-20px_rgba(110,73,75,0.15)] backdrop-blur-xl md:hidden">
        <div data-testid="mobile-header" className="flex h-16 items-center justify-between gap-3 px-4">
          <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                data-testid="mobile-nav-trigger"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-card/80 text-foreground shadow-sm transition-colors hover:bg-secondary"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>

            <SheetContent
              side="left"
              data-testid="mobile-nav-drawer"
              className="flex h-dvh w-[92vw] max-w-[22rem] flex-col gap-0 overflow-hidden border-r border-border/40 bg-[hsl(var(--background)/0.9)] p-0 backdrop-blur-2xl"
            >
              <SheetHeader className="border-b border-border/40 px-5 pb-5 pt-7 text-left">
                <div className="flex items-center gap-3">
                  <AppLogoButton
                    onClick={() => navigate("/dashboard")}
                    className="h-10 w-10 rounded-xl p-1.5 shadow-none"
                  />
                  <div>
                    <SheetTitle className="text-sm font-bold text-foreground">
                      Navigation
                    </SheetTitle>
                    <SheetDescription className="mt-1 text-xs text-muted-foreground">
                      {activeSectionLabel} is active
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 pb-12 scrollbar-none">
                <nav data-testid="mobile-navigation" className="space-y-7 pb-6" aria-label="Mobile navigation">
                  {navigationSections.map((section, sIdx) => (
                    <motion.div
                      key={section.label}
                      className="space-y-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: sIdx * 0.1 }}
                    >
                      <p className="px-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                        {section.label}
                      </p>
                      <div className="space-y-1 rounded-[1.6rem] border border-border/40 bg-card/30 p-2 shadow-sm backdrop-blur-sm">
                        {section.items.map((item, iIdx) => (
                          <NavigationButton
                            key={item.path}
                            item={item}
                            activePath={activePath}
                            onClick={() => navigate(item.path)}
                            variant="mobile"
                            index={iIdx}
                          />
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <UserProfileMenu compact />
        </div>
      </header>

      <main
        data-testid="app-shell-main"
        className="window-controls-safe-main flex-1 px-0 pb-8 pt-16 md:ml-[236px] md:pr-20 md:pt-0"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activePath}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
