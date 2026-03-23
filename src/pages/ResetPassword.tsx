import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check for recovery session in URL hash
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      // If no recovery token, redirect
      navigate("/signin", { replace: true });
    }
  }, [navigate]);

  const allMet = passwordRules.every((r) => r.test(password));
  const match = password === confirm && confirm.length > 0;

  const handleReset = async () => {
    if (!allMet || !match) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully");
      navigate("/", { replace: true });
    }
  };

  const strength = passwordRules.filter((r) => r.test(password)).length;
  const strengthLabel = strength <= 2 ? "Weak" : strength <= 4 ? "Fair" : "Strong";
  const strengthColor = strength <= 2 ? "bg-destructive" : strength <= 4 ? "bg-accent" : "bg-primary";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            F
          </div>
          <span className="font-semibold text-foreground tracking-tight text-lg">FinanceAI</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-lg shadow-black/20">
          <h1 className="text-xl font-semibold text-foreground mb-1">Set new password</h1>
          <p className="text-sm text-muted-foreground mb-6">Choose a strong password for your account</p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">New password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", strengthColor)} style={{ width: `${(strength / 5) * 100}%` }} />
                    </div>
                    <span className={cn("text-xs font-medium", strength === 5 ? "text-primary" : "text-muted-foreground")}>{strengthLabel}</span>
                  </div>
                  <div className="grid gap-0.5">
                    {passwordRules.map((r) => {
                      const pass = r.test(password);
                      return (
                        <div key={r.label} className="flex items-center gap-1.5">
                          {pass ? <Check className="w-3 h-3 text-primary" /> : <X className="w-3 h-3 text-muted-foreground" />}
                          <span className={cn("text-[11px]", pass ? "text-primary" : "text-muted-foreground")}>{r.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Confirm password</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
              />
              {confirm && !match && <p className="text-xs text-destructive">Passwords do not match</p>}
            </div>

            <Button className="w-full" onClick={handleReset} disabled={!allMet || !match || loading}>
              {loading ? "Updating…" : "Update password"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
