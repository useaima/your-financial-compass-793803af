import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Transactions from "@/pages/Transactions";
import Goals from "@/pages/Goals";
import Settings from "@/pages/Settings";
import FinancialStatement from "@/pages/FinancialStatement";
import Insights from "@/pages/Insights";
import News from "@/pages/News";
import StockPicks from "@/pages/StockPicks";
import Subscriptions from "@/pages/Subscriptions";
import HelpSupport from "@/pages/HelpSupport";
import Feedback from "@/pages/Feedback";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import NotFound from "@/pages/NotFound";
import Install from "@/pages/Install";
import Budget from "@/pages/Budget";
import SpendingHistory from "@/pages/SpendingHistory";

const queryClient = new QueryClient();

const AppPage = ({ children }: { children: React.ReactNode }) => (
  <>
    <Layout>{children}</Layout>
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/dashboard" element={<AppPage><Dashboard /></AppPage>} />
            <Route path="/chat" element={<AppPage><Chat /></AppPage>} />
            <Route path="/transactions" element={<AppPage><Transactions /></AppPage>} />
            <Route path="/goals" element={<AppPage><Goals /></AppPage>} />
            <Route path="/subscriptions" element={<AppPage><Subscriptions /></AppPage>} />
            <Route path="/settings" element={<AppPage><Settings /></AppPage>} />
            <Route path="/financial-statement" element={<AppPage><FinancialStatement /></AppPage>} />
            <Route path="/insights" element={<AppPage><Insights /></AppPage>} />
            <Route path="/news" element={<AppPage><News /></AppPage>} />
            <Route path="/stock-picks" element={<AppPage><StockPicks /></AppPage>} />
            <Route path="/help" element={<AppPage><HelpSupport /></AppPage>} />
            <Route path="/feedback" element={<AppPage><Feedback /></AppPage>} />
            <Route path="/budget" element={<AppPage><Budget /></AppPage>} />
            <Route path="/spending-history" element={<AppPage><SpendingHistory /></AppPage>} />
            <Route path="/install" element={<Install />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
