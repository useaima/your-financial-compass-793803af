import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { User, Save, Loader2 } from "lucide-react";

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany", "France",
  "India", "Brazil", "Japan", "South Korea", "Nigeria", "South Africa",
  "Kenya", "Ghana", "Mexico", "Singapore", "Netherlands", "Sweden",
  "Switzerland", "Spain", "Italy", "Portugal", "Ireland", "New Zealand",
  "Argentina", "Colombia", "Chile", "UAE", "Saudi Arabia", "Egypt",
];

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    country: "",
    updatesOptIn: false,
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (data) {
          setForm({
            firstName: data.first_name,
            lastName: data.last_name,
            country: data.country,
            updatesOptIn: data.updates_opt_in,
          });
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: form.firstName,
        last_name: form.lastName,
        country: form.country,
        updates_opt_in: form.updatesOptIn,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile updated");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[600px] mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account details</p>
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
            <p className="text-sm font-medium text-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Account email</p>
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
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </motion.div>
    </div>
  );
}
