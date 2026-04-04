import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Building2,
  CreditCard,
  HelpCircle,
  Loader2,
  MessageCircle,
  Save,
  Shield,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { usePublicUser } from "@/context/PublicUserContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils";
import {
  BUDGETING_FOCUS_OPTIONS,
  COUNTRIES,
  USER_TYPES,
} from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type SettingsTab = "profile" | "notifications" | "billing" | "help" | "feedback";

export default function Settings() {
  const navigate = useNavigate();
  const { bootstrap, updateProfile, saving } = usePublicUser();
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
    pushEnabled: permission === "granted",
    stockAlerts: true,
    budgetWarnings: true,
    weeklyReports: true,
    dailySummary: false,
    newsDigest: true,
  });
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    country: "United States",
    user_type: "personal" as "personal" | "business",
    updates_opt_in: true,
    cash_balance: "",
    monthly_income: "",
    monthly_fixed_expenses: "",
    budgeting_focus: BUDGETING_FOCUS_OPTIONS[0],
  });

  useEffect(() => {
    if (!bootstrap.profile) return;
    setForm({
      first_name: bootstrap.profile.first_name,
      last_name: bootstrap.profile.last_name,
      country: bootstrap.profile.country || "United States",
      user_type:
        bootstrap.profile.user_type === "business" ? "business" : "personal",
      updates_opt_in: bootstrap.profile.updates_opt_in,
      cash_balance: String(bootstrap.profile.cash_balance ?? 0),
      monthly_income: String(bootstrap.profile.monthly_income ?? 0),
      monthly_fixed_expenses: String(bootstrap.profile.monthly_fixed_expenses ?? 0),
      budgeting_focus:
        bootstrap.profile.budgeting_focus || BUDGETING_FOCUS_OPTIONS[0],
    });
  }, [bootstrap.profile]);

  const handleSave = async () => {
    try {
      await updateProfile({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        country: form.country,
        user_type: form.user_type,
        updates_opt_in: form.updates_opt_in,
        cash_balance: Number(form.cash_balance || 0),
        monthly_income: Number(form.monthly_income || 0),
        monthly_fixed_expenses: Number(form.monthly_fixed_expenses || 0),
        budgeting_focus: form.budgeting_focus,
      });
      toast.success("Settings saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save settings right now.",
      );
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "help", label: "Help & Support", icon: HelpCircle },
    { id: "feedback", label: "Feedback", icon: MessageCircle },
  ];

  return (
    <div className="mx-auto max-w-[860px] space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your onboarding profile, notifications, and support preferences.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-wrap gap-1 border-b border-border pb-2"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </motion.div>

      {activeTab === "profile" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5 rounded-xl border border-border bg-card p-6"
        >
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Profile Settings</p>
              <p className="text-xs text-muted-foreground">
                This information powers onboarding-backed summaries and planning.
              </p>
            </div>
          </div>

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
                      "rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
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

          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Product updates</p>
              <p className="text-xs text-muted-foreground">
                Receive occasional product news and helpful release notes.
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
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </motion.div>
      )}

      {activeTab === "notifications" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5 rounded-xl border border-border bg-card p-6"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bell className="h-4 w-4" />
            Notification Preferences
          </h2>

          {isSupported && (
            <div className="flex items-center justify-between border-b border-border py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Push notifications</p>
                <p className="text-xs text-muted-foreground">
                  {permission === "granted"
                    ? "Enabled in this browser"
                    : permission === "denied"
                      ? "Blocked by the browser"
                      : "Enable browser push notifications"}
                </p>
              </div>
              <Switch
                checked={permission === "granted"}
                onCheckedChange={() => requestPermission()}
                disabled={permission === "denied"}
              />
            </div>
          )}

          {[
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
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={notifPrefs[item.key as keyof typeof notifPrefs] as boolean}
                onCheckedChange={(value) =>
                  setNotifPrefs((current) => ({ ...current, [item.key]: value }))
                }
              />
            </div>
          ))}

          <Button
            className="w-full gap-2"
            onClick={() => {
              window.localStorage.setItem("eva_notification_preferences", JSON.stringify(notifPrefs));
              toast.success("Notification preferences saved");
            }}
          >
            <Save className="h-4 w-4" />
            Save preferences
          </Button>
        </motion.div>
      )}

      {activeTab === "billing" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5 rounded-xl border border-border bg-card p-6"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CreditCard className="h-4 w-4" />
            Billing and plan
          </h2>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Free plan</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your current workspace includes all core features.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                Active
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Included
            </h3>
            {[
              "AI financial advisor",
              "Real spending tracking",
              "Budget limits and alerts",
              "Financial statements",
              "Stock recommendations",
              "Finance news feed",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <p className="text-sm font-medium text-foreground">Premium plan</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Advanced analytics, team management, and higher AI usage are planned for the
              SaaS release.
            </p>
            <Button variant="outline" className="mt-3 w-full" disabled>
              Coming soon
            </Button>
          </div>
        </motion.div>
      )}

      {activeTab === "help" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5 rounded-xl border border-border bg-card p-6"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <HelpCircle className="h-4 w-4" />
            Help and support
          </h2>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/help")}>
              Open help center
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/feedback")}>
              Share product feedback
            </Button>
          </div>
        </motion.div>
      )}

      {activeTab === "feedback" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5 rounded-xl border border-border bg-card p-6"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageCircle className="h-4 w-4" />
            Feedback
          </h2>

          <textarea
            value={feedbackMsg}
            onChange={(event) => {
              setFeedbackMsg(event.target.value);
              if (feedbackSent) setFeedbackSent(false);
            }}
            placeholder="Tell us what is working, what feels confusing, or what you want next."
            className="min-h-[140px] w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:ring-1 focus:ring-primary/40"
          />

          <Button
            className="w-full"
            onClick={() => {
              if (!feedbackMsg.trim()) {
                toast.error("Write a short note before sending feedback.");
                return;
              }
              setFeedbackSent(true);
              setFeedbackMsg("");
              toast.success("Feedback sent");
            }}
          >
            Send feedback
          </Button>

          {feedbackSent && (
            <p className="text-sm text-muted-foreground">
              Thanks. Your feedback helps shape the next phase of eva.
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
