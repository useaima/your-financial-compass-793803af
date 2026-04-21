import { lazy, Suspense, useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AlertTriangle, LogOut, RefreshCw } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppErrorDialog from "@/components/AppErrorDialog";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import PwaRuntime from "@/components/PwaRuntime";
import { AppPreferencesProvider } from "@/context/AppPreferencesContext";
import { PublicUserProvider, usePublicUser } from "@/context/PublicUserContext";
import { useAppPreferences } from "@/context/app-preferences-context";
import { SUPPORT_BASE_URL } from "@/lib/supportLinks";
import Landing from "@/pages/Landing";

const pageLoaders = import.meta.glob<{ default: React.ComponentType<any> }>(
  "./pages/{Auth,Budget,Chat,Dashboard,FinancialStatement,Goals,Insights,Install,News,NotFound,Onboarding,Privacy,Settings,SpendingHistory,StockPicks,Subscriptions,Terms,Transactions}.tsx",
);

function lazyPage(path: keyof typeof pageLoaders) {
  return lazy(pageLoaders[path]);
}

const Dashboard = lazyPage("./pages/Dashboard.tsx");
const Chat = lazyPage("./pages/Chat.tsx");
const Transactions = lazyPage("./pages/Transactions.tsx");
const Goals = lazyPage("./pages/Goals.tsx");
const Settings = lazyPage("./pages/Settings.tsx");
const FinancialStatement = lazyPage("./pages/FinancialStatement.tsx");
const Insights = lazyPage("./pages/Insights.tsx");
const News = lazyPage("./pages/News.tsx");
const StockPicks = lazyPage("./pages/StockPicks.tsx");
const Subscriptions = lazyPage("./pages/Subscriptions.tsx");
const Terms = lazyPage("./pages/Terms.tsx");
const Privacy = lazyPage("./pages/Privacy.tsx");
const NotFound = lazyPage("./pages/NotFound.tsx");
const Install = lazyPage("./pages/Install.tsx");
const Budget = lazyPage("./pages/Budget.tsx");
const SpendingHistory = lazyPage("./pages/SpendingHistory.tsx");
const Onboarding = lazyPage("./pages/Onboarding.tsx");
const Auth = lazyPage("./pages/Auth.tsx");

const queryClient = new QueryClient();

function AppMotionShell({ children }: { children: React.ReactNode }) {
  const { preferences } = useAppPreferences();

  return <MotionConfig reducedMotion={preferences.reducedMotion ? "always" : "never"}>{children}</MotionConfig>;
}

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

function RouteSuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<FullPageLoading />}>{children}</Suspense>;
}

function WorkspaceRecovery({ description }: { description: string }) {
  const { refresh, refreshing, signOut, saving } = usePublicUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg rounded-[1.8rem] border border-border bg-card/95 p-6 shadow-[0_24px_70px_-40px_rgba(110,73,75,0.28)]">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          We could not restore your workspace yet
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your account is still signed in. Try reloading your workspace first before continuing.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Need a recovery guide?{" "}
          <a
            href={SUPPORT_BASE_URL + "/articles/onboarding-recovery"}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary hover:text-primary/85"
          >
            Open the workspace recovery article
          </a>
          .
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            className="gap-2"
            onClick={() => {
              void refresh();
            }}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Reloading workspace..." : "Reload workspace"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => {
              void signOut();
            }}
            disabled={saving}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExternalRedirect({ href }: { href: string }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace(href);
    }
  }, [href]);

  return <FullPageLoading />;
}

const AppPage = ({ children }: { children: React.ReactNode }) => (
  <Layout>
    <RouteSuspense>{children}</RouteSuspense>
  </Layout>
);

function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { bootstrap, isAuthenticated, loading, requiresPasswordSetup, workspaceError } =
    usePublicUser();
  const location = useLocation();

  if (loading) {
    return <FullPageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth?mode=signin" replace state={{ from: location.pathname }} />;
  }

  if (requiresPasswordSetup) {
    return <Navigate to="/auth?mode=set-password" replace state={{ from: location.pathname }} />;
  }

  if (
    workspaceError &&
    !bootstrap.has_onboarded &&
    !bootstrap.profile &&
    bootstrap.goals.length === 0 &&
    bootstrap.spending_events.length === 0
  ) {
    return <WorkspaceRecovery description={workspaceError} />;
  }

  if (!bootstrap.has_onboarded) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }

  return <AppPage>{children}</AppPage>;
}

function OnboardingPage() {
  const { bootstrap, isAuthenticated, loading, requiresPasswordSetup, workspaceError } =
    usePublicUser();

  if (loading) {
    return <FullPageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth?mode=signin" replace />;
  }

  if (requiresPasswordSetup) {
    return <Navigate to="/auth?mode=set-password" replace />;
  }

  if (
    workspaceError &&
    !bootstrap.has_onboarded &&
    !bootstrap.profile &&
    bootstrap.goals.length === 0 &&
    bootstrap.spending_events.length === 0
  ) {
    return <WorkspaceRecovery description={workspaceError} />;
  }

  if (bootstrap.has_onboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <RouteSuspense>
      <Onboarding />
    </RouteSuspense>
  );
}

function AuthPage() {
  const { bootstrap, isAuthenticated, loading, requiresPasswordSetup } = usePublicUser();

  if (loading) {
    return <FullPageLoading />;
  }

  if (isAuthenticated) {
    if (requiresPasswordSetup) {
      return (
        <RouteSuspense>
          <Auth forcedMode="set-password" />
        </RouteSuspense>
      );
    }
    return <Navigate to={bootstrap.has_onboarded ? "/dashboard" : "/onboarding"} replace />;
  }

  return (
    <RouteSuspense>
      <Auth />
    </RouteSuspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
      storageKey="eva-theme"
    >
      <AppPreferencesProvider>
        <AppMotionShell>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppErrorDialog />
            <BrowserRouter>
              <PublicUserProvider>
                <PwaRuntime />
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/terms" element={<RouteSuspense><Terms /></RouteSuspense>} />
                  <Route path="/privacy" element={<RouteSuspense><Privacy /></RouteSuspense>} />
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
                  <Route path="/help" element={<ExternalRedirect href={SUPPORT_BASE_URL} />} />
                  <Route path="/feedback" element={<Navigate to="/settings?section=feedback" replace />} />
                  <Route path="/budget" element={<ProtectedPage><Budget /></ProtectedPage>} />
                  <Route path="/spending-history" element={<ProtectedPage><SpendingHistory /></ProtectedPage>} />
                  <Route path="/install" element={<RouteSuspense><Install /></RouteSuspense>} />
                  <Route path="*" element={<RouteSuspense><NotFound /></RouteSuspense>} />
                </Routes>
              </PublicUserProvider>
            </BrowserRouter>
          </TooltipProvider>
        </AppMotionShell>
      </AppPreferencesProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
