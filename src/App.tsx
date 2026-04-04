import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import { PublicUserProvider, usePublicUser } from "@/context/PublicUserContext";
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
import Onboarding from "@/pages/Onboarding";

const queryClient = new QueryClient();

const AppPage = ({ children }: { children: React.ReactNode }) => (
  <>
    <Layout>{children}</Layout>
  </>
);

function FullPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <p className="text-sm text-muted-foreground">Loading your workspace...</p>
      </div>
    </div>
  );
}

function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { bootstrap, loading } = usePublicUser();
  const location = useLocation();

  if (loading) {
    return <FullPageLoading />;
  }

  if (!bootstrap.has_onboarded) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }

  return <AppPage>{children}</AppPage>;
}

function OnboardingPage() {
  const { bootstrap, loading } = usePublicUser();

  if (loading) {
    return <FullPageLoading />;
  }

  if (bootstrap.has_onboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Onboarding />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PublicUserProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
            <Route path="/chat" element={<ProtectedPage><Chat /></ProtectedPage>} />
            <Route path="/transactions" element={<ProtectedPage><Transactions /></ProtectedPage>} />
            <Route path="/goals" element={<ProtectedPage><Goals /></ProtectedPage>} />
            <Route path="/subscriptions" element={<ProtectedPage><Subscriptions /></ProtectedPage>} />
            <Route path="/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
            <Route path="/financial-statement" element={<ProtectedPage><FinancialStatement /></ProtectedPage>} />
            <Route path="/insights" element={<ProtectedPage><Insights /></ProtectedPage>} />
            <Route path="/news" element={<ProtectedPage><News /></ProtectedPage>} />
            <Route path="/stock-picks" element={<ProtectedPage><StockPicks /></ProtectedPage>} />
            <Route path="/help" element={<ProtectedPage><HelpSupport /></ProtectedPage>} />
            <Route path="/feedback" element={<ProtectedPage><Feedback /></ProtectedPage>} />
            <Route path="/budget" element={<ProtectedPage><Budget /></ProtectedPage>} />
            <Route path="/spending-history" element={<ProtectedPage><SpendingHistory /></ProtectedPage>} />
            <Route path="/install" element={<Install />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PublicUserProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
