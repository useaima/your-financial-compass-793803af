import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  ArrowLeftRight,
  Target,
  FileText,
  HelpCircle,
  MessageCircle,
  Settings,
  House,
  Menu,
  BarChart3,
  Newspaper,
  CreditCard,
  DollarSign,
  History,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";
import evaLogo from "@/assets/eva-logo.png";

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

const primaryMenuItems: NavItem[] = [
  { path: "/chat", label: "AI Advisor", icon: MessageSquare },
  { path: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { path: "/spending-history", label: "Spending History", icon: History },
  { path: "/budget", label: "Budget Limits", icon: DollarSign },
  { path: "/goals", label: "Goals", icon: Target },
];

const utilityMenuItems: NavItem[] = [
  { path: "/financial-statement", label: "Financial Statement", icon: FileText },
  { path: "/insights", label: "Spending Insights", icon: BarChart3 },
  { path: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { path: "/news", label: "Finance News", icon: Newspaper },
  { path: "/stock-picks", label: "Stock Picks", icon: TrendingUp },
];

const supportMenuItems: NavItem[] = [
  { path: "/help", label: "Help & Support", icon: HelpCircle },
  { path: "/feedback", label: "Feedback", icon: MessageCircle },
  { path: "/settings", label: "Settings", icon: Settings },
];

const mobileTabs: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/chat", label: "Advisor", icon: MessageSquare },
  { path: "/budget", label: "Budget", icon: DollarSign },
  { path: "/settings", label: "Settings", icon: Settings },
];

const mobileMoreSections = [
  {
    label: "Track",
    items: [
      { path: "/transactions", label: "Transactions", icon: ArrowLeftRight },
      { path: "/spending-history", label: "Spending History", icon: History },
      { path: "/goals", label: "Goals", icon: Target },
      { path: "/subscriptions", label: "Subscriptions", icon: CreditCard },
    ],
  },
  {
    label: "Insights",
    items: [
      { path: "/financial-statement", label: "Financial Statement", icon: FileText },
      { path: "/insights", label: "Spending Insights", icon: BarChart3 },
      { path: "/news", label: "Finance News", icon: Newspaper },
      { path: "/stock-picks", label: "Stock Picks", icon: TrendingUp },
    ],
  },
  {
    label: "Support",
    items: [
      { path: "/help", label: "Help & Support", icon: HelpCircle },
      { path: "/feedback", label: "Feedback", icon: MessageCircle },
    ],
  },
] as const;

function SidebarButton({
  item,
  activePath,
  onClick,
}: {
  item: NavItem;
  activePath: string;
  onClick: () => void;
}) {
  const isActive = activePath === item.path;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative",
        isActive ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <item.icon className="h-[18px] w-[18px]" />
      {item.label}
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
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
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mobileMoreItems = mobileMoreSections.flatMap((section) => section.items);
  const isMoreActive = mobileMoreItems.some((item) => item.path === activePath);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [activePath]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed hidden h-screen w-[220px] flex-col gap-4 border-r border-border/80 bg-card/72 p-4 pt-6 backdrop-blur-xl md:flex">
        <div className="mb-2 flex items-center gap-2.5 px-3">
          <img src={evaLogo} alt="eva" className="h-8 w-8 rounded-lg object-contain" />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">eva</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <nav className="space-y-5 pb-2">
            <div className="space-y-1">
              <SidebarButton
                item={{ path: "/dashboard", label: "Dashboard", icon: LayoutDashboard }}
                activePath={activePath}
                onClick={() => navigate("/dashboard")}
              />
            </div>

            <div className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Plan</p>
              {primaryMenuItems.map((item) => (
                <SidebarButton key={item.path} item={item} activePath={activePath} onClick={() => navigate(item.path)} />
              ))}
            </div>

            <div className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Explore</p>
              {utilityMenuItems.map((item) => (
                <SidebarButton key={item.path} item={item} activePath={activePath} onClick={() => navigate(item.path)} />
              ))}
            </div>
          </nav>
        </div>

        <div className="space-y-1 border-t border-border/80 pt-3">
          {supportMenuItems.map((item) => (
            <SidebarButton key={item.path} item={item} activePath={activePath} onClick={() => navigate(item.path)} />
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <div className="rounded-xl border border-border bg-secondary/60 px-3 py-3">
            <p className="text-xs font-semibold text-foreground">Understand · Plan · Grow</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Your AI-powered financial companion.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1">
            <ThemeToggle />
            <span className="text-xs text-muted-foreground">Theme</span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <House className="h-[18px] w-[18px]" />
            Back to home
          </button>
        </div>
      </aside>

      <main className="flex-1 pb-20 md:ml-[220px] md:pb-0">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/92 shadow-sm backdrop-blur-xl md:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          {mobileTabs.map((tab) => {
            const isActive = activePath === tab.path;
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => navigate(tab.path)}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <tab.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="tab-active"
                    className="absolute left-1/2 top-0 h-[2px] w-5 -translate-x-1/2 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMoreOpen((open) => !open)}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 transition-colors",
              isMoreOpen || isMoreActive ? "text-primary" : "text-muted-foreground",
            )}
            aria-expanded={isMoreOpen}
            aria-label="Open more navigation"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
            {(isMoreOpen || isMoreActive) && (
              <motion.div
                layoutId="tab-active"
                className="absolute left-1/2 top-0 h-[2px] w-5 -translate-x-1/2 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close more menu"
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-3 bottom-20 z-50 rounded-3xl border border-border bg-card p-4 shadow-lg md:hidden"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">More</h2>
                  <p className="text-xs text-muted-foreground">Open tools, support, and market pages.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen(false)}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Close more menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[60vh] space-y-4 overflow-y-auto pb-1">
                {mobileMoreSections.map((section) => (
                  <div key={section.label} className="space-y-2">
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{section.label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {section.items.map((item) => {
                        const isActive = activePath === item.path;
                        return (
                          <button
                            key={item.path}
                            type="button"
                            onClick={() => navigate(item.path)}
                            className={cn(
                              "flex items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm transition-colors",
                              isActive
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-border bg-background text-foreground hover:border-primary/20 hover:bg-secondary",
                            )}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="leading-tight">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
