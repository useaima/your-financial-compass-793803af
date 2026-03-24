import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, ArrowLeftRight, Target,
  FileText, HelpCircle, MessageCircle, Settings, LogOut, Menu, ChevronDown, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mainTabs = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const menuItems = [
  { path: "/chat", label: "AI Advisor", icon: MessageSquare },
  { path: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { path: "/financial-statement", label: "Financial Statement", icon: FileText },
  { path: "/insights", label: "Spending Insights", icon: BarChart3 },
  { path: "/goals", label: "Goals", icon: Target },
  { path: "/help", label: "Help & Support", icon: HelpCircle },
  { path: "/feedback", label: "Feedback", icon: MessageCircle },
  { path: "/settings", label: "Settings", icon: Settings },
];

const allTabs = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/chat", label: "Advisor", icon: MessageSquare },
  { path: "/transactions", label: "Activity", icon: ArrowLeftRight },
  { path: "/goals", label: "Goals", icon: Target },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const activePath = location.pathname;

  const handleSignOut = async () => {
    await signOut();
    navigate("/signin");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] border-r border-border bg-card/50 p-4 pt-6 gap-1 fixed h-screen">
        <div className="flex items-center gap-2.5 px-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            F
          </div>
          <span className="font-semibold text-foreground tracking-tight text-[15px]">FinanceAI</span>
        </div>

        <nav className="flex flex-col gap-0.5 flex-1">
          {/* Dashboard */}
          <button
            onClick={() => navigate("/dashboard")}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
              activePath === "/dashboard"
                ? "text-primary bg-primary/12"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <LayoutDashboard className="w-[18px] h-[18px]" />
            Dashboard
            {activePath === "/dashboard" && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>

          {/* Menu items */}
          {menuItems.map((item) => {
            const isActive = activePath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                  isActive
                    ? "text-primary bg-primary/12"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Theme toggle + Sign out at bottom */}
        <div className="mt-auto flex flex-col gap-1">
          <div className="flex items-center gap-2 px-3 py-1">
            <ThemeToggle />
            <span className="text-xs text-muted-foreground">Theme</span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-[220px] pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom tabs with dropdown */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50">
        <div className="flex items-center justify-around h-16 px-2">
          {allTabs.map((tab) => {
            const isActive = activePath === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="tab-active"
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}

          {/* More menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-muted-foreground">
                <Menu className="w-5 h-5" />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48 mb-2">
              <DropdownMenuItem onClick={() => navigate("/financial-statement")}>
                <FileText className="w-4 h-4 mr-2" /> Financial Statement
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/insights")}>
                <BarChart3 className="w-4 h-4 mr-2" /> Spending Insights
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/help")}>
                <HelpCircle className="w-4 h-4 mr-2" /> Help & Support
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/feedback")}>
                <MessageCircle className="w-4 h-4 mr-2" /> Feedback
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
}
