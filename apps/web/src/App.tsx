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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import BrandLockup from "@/components/BrandLockup";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import RouteAnnouncer from "@/components/RouteAnnouncer";
import SkipToContent from "@/components/SkipToContent";
import { AppPreferencesProvider } from "@/context/AppPreferencesContext";
import { PublicUserProvider, usePublicUser } from "@/context/PublicUserContext";
import { useAppPreferences } from "@/context/app-preferences-context";
import { SUPPORT_BASE_URL } from "@/lib/supportLinks";
import Landing from "@/pages/Landing";

const pageLoaders = import.meta.glob<{ default: React.ComponentType<any> }>(
  "./pages/{ActionHistory,ApprovalInbox,Auth,Budget,Chat,Dashboard,FinancialStatement,Goals,Insights,News,NotFound,Onboarding,Privacy,Settings,SpendingHistory,StockPicks,Subscriptions,Terms,Transactions}.tsx",
);

function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk/i.test(message) ||
    /dynamically imported module/i.test(message)
  );
}

async function recoverFromStaleChunk() {
  if (typeof window === "undefined") return;

  const storageKey = "eva-stale-chunk-recovery";
  const lastRecovery = Number(window.sessionStorage.getItem(storageKey) ?? 0);
  if (Date.now() - lastRecovery < 30_000) return;

  window.sessionStorage.setItem(storageKey, String(Date.now()));

  window.location.reload();
}

function lazyPage(path: keyof typeof pageLoaders) {
  return lazy(async () => {
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        console.log(`[eva] Loading page chunk: ${path} (attempt ${retries + 1})`);
        const module = await pageLoaders[path]();
        console.log(`[eva] Successfully loaded chunk: ${path}`);
        return module;
      } catch (error) {
        console.error(`[eva] Failed to load chunk: ${path}`, error);
        if (isChunkLoadError(error)) {
          if (retries < maxRetries) {
            retries++;
            console.warn(`[eva] Retrying chunk load in ${retries}s...`);
            await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
            continue;
          }
          console.error(`[eva] Max retries reached for chunk: ${path}. Triggering stale chunk recovery.`);
          void recoverFromStaleChunk();
        }
        throw error;
      }
    }
    throw new Error(`Failed to load page chunk after ${maxRetries} retries: ${path}`);
  });
}

const Dashboard = lazyPage("./pages/Dashboard.tsx");
const ApprovalInbox = lazyPage("./pages/ApprovalInbox.tsx");
const ActionHistory = lazyPage("./pages/ActionHistory.tsx");
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
const Budget = lazyPage("./pages/Budget.tsx");
const SpendingHistory = lazyPage("./pages/SpendingHistory.tsx");
const Onboarding = lazyPage("./pages/Onboarding.tsx");
const Auth = lazyPage("./pages/Auth.tsx");
const Vault = lazyPage("./pages/Vault.tsx");
const Admin = lazyPage("./pages/Admin.tsx");

const queryClient = new QueryClient();

function AppMotionShell({ children }: { children: React.ReactNode }) {
  const { preferences } = useAppPreferences();

  return <MotionConfig reducedMotion={preferences.reducedMotion ? "always" : "never"}>{children}</MotionConfig>;
}

function FullPageLoading() {
  return (
    <div
      data-testid="workspace-loading"
      className="flex min-h-screen items-center justify-center bg-background px-6"
    >
      <div className="w-full max-w-md rounded-[1.9rem] border border-border/80 bg-card/95 p-6 text-center shadow-[0_24px_70px_-42px_rgba(110,73,75,0.26)]">
        <BrandLockup align="center" size="sm" subtitle="Workspace status" />
        <div className="mt-6 space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="text-base font-semibold text-foreground">Loading your workspace</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We’re restoring your latest finance snapshot, navigation state, and recommended next action.
          </p>
        </div>
      </div>
    </div>
  );
}

function InShellRouteLoading() {
  return (
    <div
      data-testid="workspace-route-loading"
      className="flex min-h-[calc(100vh-4rem)] items-start justify-center px-4 py-8 md:min-h-screen md:px-8 md:py-10"
    >
      <div className="w-full max-w-5xl rounded-[1.8rem] border border-border/80 bg-card/95 p-6 shadow-[0_24px_70px_-42px_rgba(110,73,75,0.22)]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Switching sections</p>
            <p className="text-sm text-muted-foreground">
              eva is loading the next view in the background.
            </p>
          </div>
        </div>
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
    <div
      data-testid="workspace-recovery"
      className="flex min-h-screen items-center justify-center bg-background px-6"
    >
      <div className="w-full max-w-lg rounded-[1.8rem] border border-border bg-card/95 p-6 shadow-[0_24px_70px_-40px_rgba(110,73,75,0.28)]">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 text-primary" />
          Workspace recovery
        </div>
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
    <ErrorBoundary>
      <Suspense fallback={<InShellRouteLoading />}>{children}</Suspense>
    </ErrorBoundary>
  </Layout>
);

function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { bootstrap, isAuthenticated, loading, requiresPasswordSetup, workspaceError } =
    usePublicUser();
  const location = useLocation();

  if (workspaceError) {
    return <WorkspaceRecovery description={workspaceError} />;
  }

  if (loading) {
    return <FullPageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth?mode=signin" replace state={{ from: location.pathname }} />;
  }

  if (requiresPasswordSetup) {
    return <Navigate to="/auth?mode=set-password" replace state={{ from: location.pathname }} />;
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
  <ErrorBoundary context="Eva application">
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
                <SkipToContent />
                <RouteAnnouncer />
                <PublicUserProvider>
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/terms" element={<RouteSuspense><Terms /></RouteSuspense>} />
                    <Route path="/privacy" element={<RouteSuspense><Privacy /></RouteSuspense>} />
                    <Route path="/onboarding" element={<OnboardingPage />} />
                    <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
                    <Route path="/approvals" element={<ProtectedPage><ApprovalInbox /></ProtectedPage>} />
                    <Route path="/action-history" element={<ProtectedPage><ActionHistory /></ProtectedPage>} />
                    <Route path="/chat" element={<ProtectedPage><Chat /></ProtectedPage>} />
                    <Route path="/transactions" element={<ProtectedPage><Transactions /></ProtectedPage>} />
                    <Route path="/goals" element={<ProtectedPage><Goals /></ProtectedPage>} />
                    <Route path="/subscriptions" element={<ProtectedPage><Subscriptions /></ProtectedPage>} />
                    <Route path="/vault" element={<ProtectedPage><Vault /></ProtectedPage>} />
                    <Route path="/admin" element={<ProtectedPage><Admin /></ProtectedPage>} />
                    <Route path="/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
                    <Route path="/financial-statement" element={<ProtectedPage><FinancialStatement /></ProtectedPage>} />
                    <Route path="/insights" element={<ProtectedPage><Insights /></ProtectedPage>} />
                    <Route path="/news" element={<ProtectedPage><News /></ProtectedPage>} />
                    <Route path="/stock-picks" element={<ProtectedPage><StockPicks /></ProtectedPage>} />
                    <Route path="/help" element={<ExternalRedirect href={SUPPORT_BASE_URL} />} />
                    <Route path="/feedback" element={<Navigate to="/settings?section=feedback" replace />} />
                    <Route path="/budget" element={<ProtectedPage><Budget /></ProtectedPage>} />
                    <Route path="/spending-history" element={<ProtectedPage><SpendingHistory /></ProtectedPage>} />
                    <Route path="*" element={<RouteSuspense><NotFound /></RouteSuspense>} />
                  </Routes>
                </PublicUserProvider>
              </BrowserRouter>
            </TooltipProvider>
          </AppMotionShell>
        </AppPreferencesProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
