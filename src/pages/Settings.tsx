import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { User, Building2, Save, Loader2, Bell, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNavigate } from "react-router-dom";
import { getPrototypeProfile, savePrototypeProfile } from "@/lib/prototypeProfile";

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany", "France",
  "India", "Brazil", "Japan", "South Korea", "Nigeria", "South Africa",
  "Kenya", "Ghana", "Mexico", "Singapore", "Netherlands", "Sweden",
  "Switzerland", "Spain", "Italy", "Portugal", "Ireland", "New Zealand",
  "Argentina", "Colombia", "Chile", "UAE", "Saudi Arabia", "Egypt",
];

export default function Settings() {
  const navigate = useNavigate();
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => getPrototypeProfile());

  const handleSave = async () => {
    setSaving(true);
    savePrototypeProfile(form);
    setSaving(false);
    toast.success("Prototype settings saved");
  };

  return (
    <div className="p-4 md:p-8 max-w-[600px] mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Prototype Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage local demo details for this browser</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="bg-card border border-border rounded-xl p-6 space-y-5"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No sign-in required</p>
            <p className="text-xs text-muted-foreground">Your profile is stored locally on this device</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">First name</Label>
            <Input
              value={form.firstName}
              onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Last name</Label>
            <Input
              value={form.lastName}
              onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Country</Label>
          <Select value={form.country} onValueChange={(v) => setForm((p) => ({ ...p, country: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Account type</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, userType: "personal" }))}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors",
                form.userType === "personal"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              )}
            >
              <User className="w-4 h-4" />
              <span className="text-xs font-medium">Personal</span>
            </button>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, userType: "enterprise" }))}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors",
                form.userType === "enterprise"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              )}
            >
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-medium">Enterprise</span>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-sm font-medium text-foreground">Email updates</p>
            <p className="text-xs text-muted-foreground">Receive tips and product news</p>
          </div>
          <Switch
            checked={form.updatesOptIn}
            onCheckedChange={(v) => setForm((p) => ({ ...p, updatesOptIn: v }))}
          />
        </div>

        <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="bg-card border border-border rounded-xl p-6 space-y-4"
      >
        <h2 className="text-sm font-semibold text-foreground">App Settings</h2>

        {isSupported && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4" /> Push Notifications
              </p>
              <p className="text-xs text-muted-foreground">
                {permission === "granted" ? "Enabled" : "Get alerts for insights and goals"}
              </p>
            </div>
            <Switch
              checked={permission === "granted"}
              onCheckedChange={() => requestPermission()}
              disabled={permission === "denied"}
            />
          </div>
        )}

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => navigate("/install")}
        >
          <Download className="w-4 h-4" /> Install App
        </Button>
      </motion.div>
    </div>
  );
}
