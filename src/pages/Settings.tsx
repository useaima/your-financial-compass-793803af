import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  User, Building2, Save, Loader2, Bell, Download, Palette, HelpCircle,
  MessageCircle, CreditCard, Shield, Moon, Sun, Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNavigate } from "react-router-dom";
import { getPrototypeProfile, savePrototypeProfile } from "@/lib/prototypeProfile";
import { useTheme } from "next-themes";

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany", "France",
  "India", "Brazil", "Japan", "South Korea", "Nigeria", "South Africa",
  "Kenya", "Ghana", "Mexico", "Singapore", "Netherlands", "Sweden",
  "Switzerland", "Spain", "Italy", "Portugal", "Ireland", "New Zealand",
  "Argentina", "Colombia", "Chile", "UAE", "Saudi Arabia", "Egypt",
];

type SettingsTab = "profile" | "notifications" | "appearance" | "billing" | "help" | "feedback";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => getPrototypeProfile());
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [notifPrefs, setNotifPrefs] = useState({
    pushEnabled: permission === "granted",
    stockAlerts: true,
    budgetWarnings: true,
    weeklyReports: true,
    dailySummary: false,
    newsDigest: true,
  });
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    savePrototypeProfile(form);
    setSaving(false);
    toast.success("Settings saved");
  };

  const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "help", label: "Help & Support", icon: HelpCircle },
    { id: "feedback", label: "Feedback", icon: MessageCircle },
  ];

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[800px] mx-auto space-y-6 pb-24 md:pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your preferences and account</p>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1 flex-wrap border-b border-border pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Profile Settings</p>
              <p className="text-xs text-muted-foreground">Your profile is stored locally on this device</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">First name</Label>
              <Input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Last name</Label>
              <Input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Country</Label>
            <Select value={form.country} onValueChange={(v) => setForm((p) => ({ ...p, country: v }))}>
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Account type</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: "personal", icon: User, label: "Personal" },
                { type: "enterprise", icon: Building2, label: "Enterprise" },
              ].map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, userType: opt.type as "personal" | "enterprise" }))}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors",
                    form.userType === opt.type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  <opt.icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-sm font-medium text-foreground">Email updates</p>
              <p className="text-xs text-muted-foreground">Receive tips and product news</p>
            </div>
            <Switch checked={form.updatesOptIn} onCheckedChange={(v) => setForm((p) => ({ ...p, updatesOptIn: v }))} />
          </div>

          <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </motion.div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6 space-y-5"
        >
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notification Preferences
          </h2>

          {isSupported && (
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Push Notifications</p>
                <p className="text-xs text-muted-foreground">
                  {permission === "granted" ? "Enabled" : permission === "denied" ? "Blocked by browser" : "Enable browser push notifications"}
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
            { key: "stockAlerts", title: "Stock Alerts", desc: "Get notified about stock recommendations and price targets" },
            { key: "budgetWarnings", title: "Budget Warnings", desc: "Alerts when approaching or exceeding budget limits" },
            { key: "weeklyReports", title: "Weekly Reports", desc: "Receive weekly spending summaries and insights" },
            { key: "dailySummary", title: "Daily Summary", desc: "End-of-day spending summary" },
            { key: "newsDigest", title: "News Digest", desc: "Daily digest of trending finance news" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={notifPrefs[item.key as keyof typeof notifPrefs] as boolean}
                onCheckedChange={(v) => setNotifPrefs((p) => ({ ...p, [item.key]: v }))}
              />
            </div>
          ))}

          <Button className="w-full gap-2" onClick={() => {
            localStorage.setItem("financeai_notif_prefs", JSON.stringify(notifPrefs));
            toast.success("Notification preferences saved");
          }}>
            <Save className="w-4 h-4" /> Save Preferences
          </Button>
        </motion.div>
      )}

      {/* Appearance Tab */}
      {activeTab === "appearance" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6 space-y-5"
        >
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-4 h-4" /> Appearance
          </h2>

          <div className="space-y-3">
            <Label className="text-xs">Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors",
                    theme === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  <opt.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Billing Tab */}
      {activeTab === "billing" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6 space-y-5"
        >
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Billing & Plan
          </h2>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Free Plan</p>
                <p className="text-xs text-muted-foreground mt-1">All core features included</p>
              </div>
              <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">Active</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan Features</h3>
            {[
              "AI Financial Advisor",
              "Spending tracking & insights",
              "Budget limits & alerts",
              "Financial statement generation",
              "Stock recommendations",
              "Finance news feed",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <p className="text-sm font-medium text-foreground">Premium Plan</p>
            <p className="text-xs text-muted-foreground mt-1">Advanced analytics, unlimited AI queries, and priority support.</p>
            <Button variant="outline" className="mt-3 w-full" disabled>
              Coming Soon
            </Button>
          </div>
        </motion.div>
      )}

      {/* Help Tab */}
      {activeTab === "help" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {[
            { icon: MessageCircle, title: "Chat with AI Advisor", desc: "Ask your AI advisor any financial question in the chat tab.", action: () => navigate("/chat") },
            { icon: HelpCircle, title: "FAQs", desc: "Common questions about spending analysis, goals, and budgets.", action: () => navigate("/help") },
            { icon: Shield, title: "Privacy & Security", desc: "Learn about how we protect your data.", action: () => navigate("/privacy") },
          ].map((item) => (
            <button
              key={item.title}
              onClick={item.action}
              className="w-full bg-card border border-border rounded-xl p-5 flex items-start gap-4 hover:border-primary/20 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </div>
            </button>
          ))}
        </motion.div>
      )}

      {/* Feedback Tab */}
      {activeTab === "feedback" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Send Feedback
          </h2>

          {feedbackSent ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-lg font-semibold text-foreground">Thanks for your feedback! 🎉</p>
              <p className="text-sm text-muted-foreground">We read every message.</p>
              <Button variant="outline" className="mt-4" onClick={() => { setFeedbackSent(false); setFeedbackMsg(""); }}>
                Send another
              </Button>
            </div>
          ) : (
            <>
              <textarea
                value={feedbackMsg}
                onChange={(e) => setFeedbackMsg(e.target.value)}
                placeholder="What would you like us to improve?"
                rows={5}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button
                className="w-full gap-2"
                onClick={() => { setFeedbackSent(true); toast.success("Feedback submitted!"); }}
                disabled={!feedbackMsg.trim()}
              >
                <MessageCircle className="w-4 h-4" /> Submit Feedback
              </Button>
            </>
          )}
        </motion.div>
      )}

      {/* Install App */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/install")}>
          <Download className="w-4 h-4" /> Install App
        </Button>
      </motion.div>
    </div>
  );
}
