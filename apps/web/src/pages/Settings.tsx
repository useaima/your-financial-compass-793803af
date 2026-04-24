import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Bell,
  Building2,
  CreditCard,
  HelpCircle,
  Loader2,
  LogOut,
  MessageCircle,
  MoonStar,
  Palette,
  Save,
  Shield,
  SlidersHorizontal,
  User,
  type LucideIcon,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePublicUser } from "@/context/PublicUserContext";
import { useAppPreferences } from "@/context/app-preferences-context";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useMfaStatus } from "@/hooks/useMfaStatus";
import { supabase } from "@/integrations/supabase/client";
import {
  BUDGETING_FOCUS_OPTIONS,
  COUNTRIES,
  USER_TYPES,
} from "@/lib/finance";
import {
  normalizeSettingsSection,
  type FontScale,
  type SettingsSection,
} from "@/lib/appPreferences";
import { SUPPORT_LINKS } from "@/lib/supportLinks";
import { cn } from "@/lib/utils";

type SectionMeta = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const SETTINGS_SECTIONS: Record<SettingsSection, SectionMeta> = {
  settings: {
    title: "App Preferences",
    description: "Control appearance, text size, and motion without changing your account data.",
    icon: Palette,
  },
  profile: {
    title: "Profile",
    description: "Keep your personal details and planning defaults up to date.",
    icon: User,
  },
  account: {
    title: "Account",
    description: "Review your signed-in account, security status, and session controls.",
    icon: Shield,
  },
  notifications: {
    title: "Notifications",
    description: "Choose which alerts and recaps eva should surface for you.",
    icon: Bell,
  },
  billing: {
    title: "Billing",
    description: "See your current plan and what is reserved for future upgrades.",
    icon: CreditCard,
  },
  help: {
    title: "Help & Support",
    description: "Find support, troubleshooting tips, and the best way to get help quickly.",
    icon: HelpCircle,
  },
  feedback: {
    title: "Feedback",
    description: "Tell us what is working, what feels rough, and what should improve next.",
    icon: MessageCircle,
  },
};

const NOTIFICATION_STORAGE_KEY = "eva_notification_preferences";

type NotificationPreferences = {
  pushEnabled: boolean;
  stockAlerts: boolean;
  budgetWarnings: boolean;
  weeklyReports: boolean;
  dailySummary: boolean;
  newsDigest: boolean;
};

type PendingTotpEnrollment = {
  id: string;
  qrCode: string;
  secret: string;
  uri: string;
  friendlyName: string;
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushEnabled: false,
  stockAlerts: true,
  budgetWarnings: true,
  weeklyReports: true,
  dailySummary: false,
  newsDigest: true,
};

function readNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...parsed,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

function PreferenceOption({
  active,
  label,
  detail,
  onClick,
}: {
  active: boolean;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(243,162,28,0.14)]"
          : "border-border bg-background text-foreground hover:border-primary/30 hover:bg-secondary/50",
      )}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className={cn("mt-1 text-xs", active ? "text-primary/80" : "text-muted-foreground")}>{detail}</p>
    </button>
  );
}

function SectionSurface({
  title,
  subtitle,
  icon: Icon,
  testId,
  children,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      data-testid={testId}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 rounded-[1.75rem] border border-border bg-card/95 p-5 shadow-[0_22px_55px_-38px_rgba(110,73,75,0.24)] md:p-6"
    >
      <div className="flex items-start gap-3 border-b border-border/80 pb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {children}
    </motion.section>
  );
}

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const activeSection = normalizeSettingsSection(requestedSection);

  const { bootstrap, markNotificationRead, updateProfile, saving, signOut, user } = usePublicUser();
  const { preferences, setFontScale, setReducedMotion } = useAppPreferences();
  const { theme, setTheme } = useTheme();
  const { isSupported, permission, requestPermission } = usePushNotifications();

  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(() => readNotificationPreferences());
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [pendingTotpEnrollment, setPendingTotpEnrollment] =
    useState<PendingTotpEnrollment | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    country: "United States",
    phone_number: "",
    user_type: "personal" as "personal" | "business",
    updates_opt_in: true,
    model_training_opt_in: false,
    cash_balance: "",
    monthly_income: "",
    monthly_fixed_expenses: "",
    budgeting_focus: BUDGETING_FOCUS_OPTIONS[0],
  });

  const {
    assuranceLevel: mfaAssuranceLevel,
    error: mfaError,
    factors: mfaFactors,
    hasVerifiedMfa,
    loading: mfaStatusLoading,
    refresh: refreshMfaStatus,
    verifiedTotpFactors,
  } = useMfaStatus();

  useEffect(() => {
    if (requestedSection !== activeSection) {
      setSearchParams({ section: activeSection }, { replace: true });
    }
  }, [activeSection, requestedSection, setSearchParams]);

  useEffect(() => {
    if (!bootstrap.profile) return;
    setForm({
      first_name: bootstrap.profile.first_name,
      last_name: bootstrap.profile.last_name,
      country: bootstrap.profile.country || "United States",
      phone_number: bootstrap.profile.phone_number || "",
      user_type:
        bootstrap.profile.user_type === "business" ? "business" : "personal",
      updates_opt_in: bootstrap.profile.updates_opt_in,
      model_training_opt_in: bootstrap.profile.model_training_opt_in ?? false,
      cash_balance: String(bootstrap.profile.cash_balance ?? 0),
      monthly_income: String(bootstrap.profile.monthly_income ?? 0),
      monthly_fixed_expenses: String(bootstrap.profile.monthly_fixed_expenses ?? 0),
      budgeting_focus:
        bootstrap.profile.budgeting_focus || BUDGETING_FOCUS_OPTIONS[0],
    });
  }, [bootstrap.profile]);

  useEffect(() => {
    setNotifPrefs((current) => ({
      ...current,
      pushEnabled: permission === "granted",
    }));
  }, [permission]);

  const sectionMeta = SETTINGS_SECTIONS[activeSection];
  const SectionIcon = sectionMeta.icon;
  const currentTheme = theme === "light" || theme === "dark" ? theme : "system";
  const memberSince = useMemo(() => {
    if (!bootstrap.profile?.created_at) {
      return null;
    }

    const parsed = new Date(bootstrap.profile.created_at);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return format(parsed, "MMMM yyyy");
  }, [bootstrap.profile?.created_at]);
  const handleSave = async () => {
    try {
      await updateProfile({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        country: form.country,
        phone_number: form.phone_number.trim(),
        user_type: form.user_type,
        updates_opt_in: form.updates_opt_in,
        model_training_opt_in: form.model_training_opt_in,
        cash_balance: Number(form.cash_balance || 0),
        monthly_income: Number(form.monthly_income || 0),
        monthly_fixed_expenses: Number(form.monthly_fixed_expenses || 0),
        budgeting_focus: form.budgeting_focus,
      });
      toast.success("Profile updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save settings right now.",
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to sign out right now.",
      );
    }
  };

  const handleStartMfaSetup = async () => {
    setMfaBusy(true);
    try {
      const startEnrollment = async () => {
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "eva Authenticator",
        });

        if (error) {
          throw error;
        }

        return data;
      };

      let data;

      try {
        data = await startEnrollment();
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const hasStaleTotpFactor = /friendly name .* already exists/i.test(message);

        if (!hasStaleTotpFactor) {
          throw error;
        }

        const staleTotpFactors = mfaFactors.filter(
          (factor) => factor.factor_type === "totp" && factor.status !== "verified",
        );

        if (!staleTotpFactors.length) {
          throw error;
        }

        for (const factor of staleTotpFactors) {
          const { error: unenrollError } = await supabase.auth.mfa.unenroll({
            factorId: factor.id,
          });

          if (unenrollError) {
            throw unenrollError;
          }
        }

        await refreshMfaStatus();
        data = await startEnrollment();
        toast.message("We cleared an unfinished MFA setup and restarted it for you.");
      }

      setPendingTotpEnrollment({
        id: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
        friendlyName: data.friendly_name ?? "eva Authenticator",
      });
      setMfaCode("");
      toast.success("Scan the QR code in your authenticator app, then enter the code below.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "We could not start MFA setup right now.",
      );
    } finally {
      setMfaBusy(false);
    }
  };

  const handleVerifyMfaSetup = async () => {
    if (!pendingTotpEnrollment) {
      return;
    }

    if (mfaCode.trim().length < 6) {
      toast.error("Enter the six-digit code from your authenticator app.");
      return;
    }

    setMfaBusy(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({
        factorId: pendingTotpEnrollment.id,
      });

      if (challenge.error || !challenge.data) {
        throw challenge.error ?? new Error("We could not create an MFA challenge.");
      }

      const verifyResult = await supabase.auth.mfa.verify({
        factorId: pendingTotpEnrollment.id,
        challengeId: challenge.data.id,
        code: mfaCode.trim(),
      });

      if (verifyResult.error) {
        throw verifyResult.error;
      }

      setPendingTotpEnrollment(null);
      setMfaCode("");
      toast.success("Multi-factor authentication is now enabled for your eva account.");
      await refreshMfaStatus();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "We could not verify that MFA code right now.",
      );
    } finally {
      setMfaBusy(false);
    }
  };

  const themeChoices = [
    { id: "light", label: "Light", detail: "Bright and clear for daytime use." },
    { id: "dark", label: "Dark", detail: "Lower glare with a darker workspace." },
    { id: "system", label: "System", detail: "Match your phone or computer setting." },
  ] as const;

  const fontChoices: Array<{ id: FontScale; label: string; detail: string }> = [
    { id: "16", label: "16 px", detail: "Compact and efficient." },
    { id: "17", label: "17 px", detail: "Balanced default for most users." },
    { id: "18", label: "18 px", detail: "More breathing room for reading." },
    { id: "20", label: "20 px", detail: "Largest supported size for extra comfort." },
  ];

  const notificationItems = useMemo(
    () => [
      {
        key: "stockAlerts",
        title: "Stock alerts",
        desc: "Get notified about new stock recommendations and price targets.",
      },
      {
        key: "budgetWarnings",
        title: "Budget warnings",
        desc: "Alerts when you approach or exceed a budget limit.",
      },
      {
        key: "weeklyReports",
        title: "Weekly reports",
        desc: "Receive weekly spending summaries and insight rollups.",
      },
      {
        key: "dailySummary",
        title: "Daily summary",
        desc: "A quick end-of-day spending recap.",
      },
      {
        key: "newsDigest",
        title: "News digest",
        desc: "A daily roundup of the finance stories that matter most.",
      },
    ] as const,
    [],
  );

  return (
    <div data-testid="settings-shell" className="mx-auto max-w-[920px] space-y-6 p-4 pb-10 md:p-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="rounded-[1.9rem] border border-border/80 bg-card/95 p-5 shadow-[0_22px_55px_-38px_rgba(110,73,75,0.24)] md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-primary">
                <SectionIcon className="h-3.5 w-3.5" />
                {sectionMeta.title}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{sectionMeta.title}</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {sectionMeta.description}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm">
              <p className="font-semibold text-foreground">Workspace status</p>
              <p className="mt-1 text-muted-foreground">
                Signed in as {user?.email ?? bootstrap.email ?? "your eva account"}.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {activeSection === "settings" && (
        <SectionSurface
          testId="settings-section-settings"
          title="Appearance and reading comfort"
          subtitle="These preferences stay on this device so each user can make eva feel comfortable without affecting account data."
          icon={SlidersHorizontal}
        >
          <div className="space-y-4 rounded-2xl border border-border/75 bg-background/80 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Theme</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose how eva should look across the whole app.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {themeChoices.map((choice) => (
                <PreferenceOption
                  key={choice.id}
                  active={currentTheme === choice.id}
                  label={choice.label}
                  detail={choice.detail}
                  onClick={() => setTheme(choice.id)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border/75 bg-background/80 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Font size</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick a safe preset that scales the interface without breaking the layout.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {fontChoices.map((choice) => (
                <PreferenceOption
                  key={choice.id}
                  active={preferences.fontScale === choice.id}
                  label={choice.label}
                  detail={choice.detail}
                  onClick={() => setFontScale(choice.id)}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border/75 bg-background/80 px-4 py-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Reduced motion</p>
              <p className="text-xs text-muted-foreground">
                Tone down interface motion and transitions when you want a calmer experience.
              </p>
            </div>
            <Switch
              checked={preferences.reducedMotion}
              onCheckedChange={setReducedMotion}
              aria-label="Toggle reduced motion"
            />
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-foreground">Current reading setup</p>
            <p className="mt-2 text-sm text-muted-foreground">
              eva is using a {currentTheme === "system" ? "system-controlled" : currentTheme} theme, {preferences.fontScale}px base text, and{" "}
              {preferences.reducedMotion ? "reduced motion" : "standard motion"}.
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border border-border/75 bg-background/80 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Model training consent</p>
              <p className="text-xs text-muted-foreground">
                If eva ever uses personal finance data to improve future models, we will respect this choice. Leaving it off keeps your data out of those training programs.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-4">
              <div className="space-y-1 pr-4">
                <p className="text-sm font-semibold text-foreground">Allow my data to improve eva</p>
                <p className="text-xs text-muted-foreground">
                  This only stores your consent preference. Your budgeting features work either way.
                </p>
              </div>
              <Switch
                checked={form.model_training_opt_in}
                onCheckedChange={(value) =>
                  setForm((current) => ({ ...current, model_training_opt_in: value }))
                }
                aria-label="Toggle model training consent"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save data preferences"}
            </Button>
          </div>
        </SectionSurface>
      )}

      {activeSection === "profile" && (
        <SectionSurface
          testId="settings-section-profile"
          title="Personal profile"
          subtitle="These details power onboarding-backed summaries, guidance, and planning defaults."
          icon={User}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>First name</Label>
              <Input
                value={form.first_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, first_name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input
                value={form.last_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, last_name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={form.country}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, country: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone number</Label>
              <Input
                type="tel"
                value={form.phone_number}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone_number: event.target.value }))
                }
                placeholder="+254 700 000 000"
              />
            </div>
            <div className="space-y-2">
              <Label>User type</Label>
              <div className="grid grid-cols-2 gap-3">
                {USER_TYPES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        user_type: option.value,
                      }))
                    }
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-sm font-medium transition-colors",
                      form.user_type === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30",
                    )}
                  >
                    {option.value === "business" ? (
                      <span className="inline-flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {option.label}
                      </span>
                    ) : (
                      option.label
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cash balance</Label>
              <Input
                type="number"
                value={form.cash_balance}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    cash_balance: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly income</Label>
              <Input
                type="number"
                value={form.monthly_income}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    monthly_income: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly fixed expenses</Label>
              <Input
                type="number"
                value={form.monthly_fixed_expenses}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    monthly_fixed_expenses: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Budgeting focus</Label>
              <Select
                value={form.budgeting_focus}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, budgeting_focus: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUDGETING_FOCUS_OPTIONS.map((focus) => (
                    <SelectItem key={focus} value={focus}>
                      {focus}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Product updates</p>
              <p className="text-xs text-muted-foreground">
                Receive occasional release notes and helpful product announcements.
              </p>
            </div>
            <Switch
              checked={form.updates_opt_in}
              onCheckedChange={(value) =>
                setForm((current) => ({ ...current, updates_opt_in: value }))
              }
            />
          </div>

          <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save profile changes"}
          </Button>
        </SectionSurface>
      )}

      {activeSection === "account" && (
        <SectionSurface
          testId="settings-section-account"
          title="Account details"
          subtitle="Your sign-in identity, verification, and session controls live here."
          icon={Shield}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Email</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {user?.email ?? bootstrap.email ?? "Not available"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {user?.email_confirmed_at
                  ? "Verified and ready for secure sign-in."
                  : "Email verification is still pending."}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Membership</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {memberSince ? `Since ${memberSince}` : "New eva member"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Account security and session control are handled with Supabase Auth.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-foreground">Multi-factor authentication</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Because eva holds sensitive financial data, we recommend adding an authenticator app as a second layer of sign-in protection.
            </p>
            <a
              href={SUPPORT_LINKS.mfaSecurity}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-xs font-semibold text-primary hover:text-primary/85"
            >
              Read the MFA setup and recovery guide
            </a>

            <div className="mt-4 rounded-2xl border border-border bg-background/80 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {hasVerifiedMfa ? "MFA is enabled" : "MFA is not enabled yet"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hasVerifiedMfa
                      ? `Current assurance level: ${mfaAssuranceLevel ?? "aal2"}`
                      : "Set up a TOTP authenticator app to protect your eva account beyond password-only sign-in."}
                  </p>
                </div>
                {!hasVerifiedMfa && (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={handleStartMfaSetup}
                    disabled={mfaBusy || mfaStatusLoading}
                  >
                    {mfaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                    {pendingTotpEnrollment ? "Restart setup" : "Enable MFA"}
                  </Button>
                )}
              </div>

              {mfaStatusLoading && (
                <p className="mt-3 text-xs text-muted-foreground">Loading MFA status...</p>
              )}

              {mfaError && (
                <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                  {mfaError}
                </div>
              )}

              {hasVerifiedMfa && (
                <div className="mt-4 space-y-2">
                  {verifiedTotpFactors.map((factor) => (
                    <div key={factor.id} className="rounded-xl border border-border px-3 py-3">
                      <p className="text-sm font-semibold text-foreground">
                        {factor.friendly_name || "eva Authenticator"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Verified TOTP factor active. Sign-ins can be stepped up to AAL2 when required.
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {pendingTotpEnrollment && !hasVerifiedMfa && (
                <div className="mt-4 space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Finish MFA setup</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Scan the QR code with Google Authenticator, 1Password, Authy, or another TOTP app, then enter the current code.
                    </p>
                  </div>

                  <div className="flex justify-center rounded-2xl bg-white p-4">
                    <img
                      src={`data:image/svg+xml;utf8,${encodeURIComponent(pendingTotpEnrollment.qrCode)}`}
                      alt="TOTP QR code for eva MFA setup"
                      className="h-40 w-40"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-background px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Manual setup secret
                    </p>
                    <p className="mt-2 break-all font-mono text-sm text-foreground">
                      {pendingTotpEnrollment.secret}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mfa-code">Authenticator code</Label>
                    <Input
                      id="mfa-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={mfaCode}
                      onChange={(event) => setMfaCode(event.target.value.replace(/\s+/g, ""))}
                      placeholder="123456"
                    />
                  </div>

                  <Button
                    type="button"
                    className="w-full gap-2"
                    onClick={handleVerifyMfaSetup}
                    disabled={mfaBusy || mfaCode.trim().length < 6}
                  >
                    {mfaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                    {mfaBusy ? "Verifying..." : "Verify and enable MFA"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-foreground">Session management</p>
            <p className="mt-2 text-sm text-muted-foreground">
              If you are using a shared device, sign out here to protect your workspace and financial data.
            </p>
            <Button type="button" variant="outline" className="mt-4 gap-2" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </SectionSurface>
      )}

      {activeSection === "notifications" && (
        <SectionSurface
          testId="settings-section-notifications"
          title="Notifications"
          subtitle="Choose the nudges, alerts, and recaps that should reach you."
          icon={Bell}
        >
          {isSupported && (
            <div className="flex items-center justify-between rounded-2xl border border-border bg-background/80 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Push notifications</p>
                <p className="text-xs text-muted-foreground">
                  {permission === "granted"
                    ? "Enabled in this browser"
                    : permission === "denied"
                      ? "Blocked by this browser"
                      : "Allow notifications for real-time reminders and insights"}
                </p>
              </div>
              <Switch
                checked={permission === "granted"}
                onCheckedChange={() => requestPermission()}
                disabled={permission === "denied"}
              />
            </div>
          )}

          {notificationItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-2xl border border-border bg-background/80 px-4 py-4"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={notifPrefs[item.key]}
                onCheckedChange={(value) =>
                  setNotifPrefs((current) => ({ ...current, [item.key]: value }))
                }
              />
            </div>
          ))}

          <Button
            className="w-full gap-2"
            onClick={() => {
              window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifPrefs));
              toast.success("Notification preferences saved");
            }}
          >
            <Save className="h-4 w-4" />
            Save notification preferences
          </Button>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Recent EVA notifications
            </h3>
            {bootstrap.notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background/80 p-4 text-sm text-muted-foreground">
                As EVA starts generating daily and weekly summaries, they will appear here.
              </div>
            ) : (
              bootstrap.notifications.map((notification) => (
                <div key={notification.id} className="rounded-2xl border border-border bg-background/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void markNotificationRead(notification.id)
                            .then(() => toast.success("Notification marked as read."))
                            .catch((error) =>
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Unable to update the notification right now.",
                              ),
                            );
                        }}
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionSurface>
      )}

      {activeSection === "billing" && (
        <SectionSurface
          testId="settings-section-billing"
          title="Billing and plan"
          subtitle="Phase B stays free-plan first while we harden the public launch experience."
          icon={CreditCard}
        >
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Free plan</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your current workspace includes all core personal finance features.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                Active
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Included today
            </h3>
            {[
              "AI financial advisor",
              "Real spending tracking",
              "Budget limits and alerts",
              "Financial statements",
              "Stock recommendations",
              "Finance news feed",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-4 py-3">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-secondary/30 p-4">
            <p className="text-sm font-semibold text-foreground">Premium plans</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Advanced analytics, team management, and higher AI usage are planned after the public launch.
            </p>
            <Button variant="outline" className="mt-4 w-full" disabled>
              Coming soon
            </Button>
          </div>
        </SectionSurface>
      )}

      {activeSection === "help" && (
        <SectionSurface
          testId="settings-section-help"
          title="Help and support"
          subtitle="The full help center lives at support.useaima.com. Use these direct links when you need help quickly."
          icon={HelpCircle}
        >
          <div className="grid gap-4">
            {[
              {
                title: "Verification options",
                desc: "Use this guide for resend behavior, code entry, magic links, and getting unverified users back into the right flow.",
                href: SUPPORT_LINKS.verificationOptions,
              },
              {
                title: "Spending history mismatch",
                desc: "Use this when chat says spending was logged but the workspace does not seem to reflect it yet.",
                href: SUPPORT_LINKS.historyMismatch,
              },
              {
                title: "Financial statement troubleshooting",
                desc: "Read the guide for generating your statement and handling missing-data or session issues.",
                href: SUPPORT_LINKS.statementErrors,
              },
              {
                title: "Network and offline recovery",
                desc: "Use the offline guide when EVA cannot reach the server or your connection drops mid-session.",
                href: SUPPORT_LINKS.offline,
              },
              {
                title: "Workspace recovery and onboarding loops",
                desc: "Use this when EVA says it cannot restore the workspace or tries to send you back into onboarding unexpectedly.",
                href: SUPPORT_LINKS.onboardingRecovery,
              },
              {
                title: "MFA setup and recovery",
                desc: "Read this before enabling MFA or if a sensitive action asks you to refresh your MFA status first.",
                href: SUPPORT_LINKS.mfaSecurity,
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-background/80 p-4">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-primary hover:text-primary/85"
                >
                  Open article
                </a>
              </div>
            ))}
          </div>
        </SectionSurface>
      )}

      {activeSection === "feedback" && (
        <SectionSurface
          testId="settings-section-feedback"
          title="Product feedback"
          subtitle="Tell us what is working, what feels rough, or what would make eva more useful for real users."
          icon={MessageCircle}
        >
          <div className="space-y-3">
            <Label htmlFor="feedback-message">Your feedback</Label>
            <textarea
              id="feedback-message"
              value={feedbackMsg}
              onChange={(event) => {
                setFeedbackMsg(event.target.value);
                setFeedbackSent(false);
              }}
              placeholder="Share what you noticed, what confused you, or the improvement you want next."
              className="min-h-[180px] w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <Button
            className="w-full"
            disabled={!feedbackMsg.trim()}
            onClick={() => {
              setFeedbackSent(true);
              setFeedbackMsg("");
              toast.success("Feedback received. Thank you for helping shape eva.");
            }}
          >
            Send feedback
          </Button>

          {feedbackSent && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
              Your note has been captured locally for now. The next phase can route feedback into a real support pipeline.
            </div>
          )}
        </SectionSurface>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[1.6rem] border border-border/80 bg-card/95 p-4 shadow-[0_18px_40px_-34px_rgba(110,73,75,0.18)]"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <MoonStar className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Profile menu shortcut</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You can jump directly into profile, account, notifications, billing, help, and feedback from the avatar menu in the top-right corner.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
