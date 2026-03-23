import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

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
          {sent ? (
            <div className="text-center space-y-3">
              <h1 className="text-xl font-semibold text-foreground">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                We've sent a password reset link to <span className="text-foreground">{email}</span>
              </p>
              <Link to="/signin" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-4">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-foreground mb-1">Reset password</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email and we'll send you a reset link
              </p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    onKeyDown={(e) => e.key === "Enter" && handleReset()}
                  />
                </div>
                <Button className="w-full" onClick={handleReset} disabled={!email || loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-5">
                <Link to="/signin" className="text-primary hover:underline inline-flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
