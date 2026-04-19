import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import BrandLockup from "@/components/BrandLockup";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePublicUser } from "@/context/PublicUserContext";
import { COUNTRIES } from "@/lib/finance";
import { cn } from "@/lib/utils";
import {
  getAuthErrorMessage,
  getPasswordStrength,
  isValidEmail,
  type PasswordStrengthLevel,
} from "@/lib/authProfile";
import { SUPPORT_LINKS } from "@/lib/supportLinks";

type AuthMode = "signin" | "signup" | "verify-email" | "set-password";
type VerificationFlow = "signup" | "legacy";
const VERIFY_EMAIL_AUTO_RESEND_KEY = "eva-pending-verification-email";
const VERIFY_EMAIL_AUTO_RESEND_DELAY_SECONDS = 12;

type AuthProps = {
  forcedMode?: AuthMode;
};

function readLastEmail() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem("eva-last-email") ?? "";
}

function persistLastEmail(email: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem("eva-last-email", email);
}

function queueVerificationAutoResend(email: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    VERIFY_EMAIL_AUTO_RESEND_KEY,
    JSON.stringify({
      email: email.trim().toLowerCase(),
      queuedAt: Date.now(),
    }),
  );
}

function consumeVerificationAutoResend(email: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const raw = window.sessionStorage.getItem(VERIFY_EMAIL_AUTO_RESEND_KEY);
    if (!raw) {
      return false;
    }

    const parsed = JSON.parse(raw) as { email?: string; queuedAt?: number };
    window.sessionStorage.removeItem(VERIFY_EMAIL_AUTO_RESEND_KEY);

    if (parsed.email !== email.trim().toLowerCase()) {
      return false;
    }

    return typeof parsed.queuedAt === "number" && Date.now() - parsed.queuedAt < 5 * 60_000;
  } catch {
    window.sessionStorage.removeItem(VERIFY_EMAIL_AUTO_RESEND_KEY);
    return false;
  }
}

function getMode(value: string | null): AuthMode {
  if (value === "signup" || value === "verify-email" || value === "set-password") {
    return value;
  }
  return "signin";
}

function getVerificationFlow(value: string | null): VerificationFlow {
  return value === "legacy" ? "legacy" : "signup";
}

function getStrengthLabel(level: PasswordStrengthLevel) {
  if (level === "strong") return "Strong";
  if (level === "medium") return "Medium";
  return "Weak";
}

export default function Auth({ forcedMode }: AuthProps) {
  const {
    authProfileSeed,
    completeLegacyPasswordSetup,
    refreshAuthUser,
    resendVerificationEmail,
    sendPasswordReset,
    signInWithPassword,
    signUpWithPassword,
    user,
  } = usePublicUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [signInEmail, setSignInEmail] = useState(() => readLastEmail());
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpForm, setSignUpForm] = useState({
    full_name: authProfileSeed.full_name,
    email: readLastEmail(),
    country: authProfileSeed.country || "United States",
    phone_number: authProfileSeed.phone_number,
    password: "",
    confirm_password: "",
    agree_terms: false,
    agree_privacy: false,
    updates_opt_in: authProfileSeed.updates_opt_in,
  });
  const [setPasswordForm, setSetPasswordForm] = useState({
    password: "",
    confirm_password: "",
  });
  const [autoResendCountdown, setAutoResendCountdown] = useState<number | null>(null);
  const [autoResendState, setAutoResendState] = useState<
    "idle" | "countdown" | "sending" | "sent" | "error"
  >("idle");

  const currentMode = forcedMode ?? getMode(searchParams.get("mode"));
  const verificationEmail = (
    searchParams.get("email") ??
    user?.email ??
    readLastEmail()
  ).trim().toLowerCase();
  const verificationFlow = getVerificationFlow(searchParams.get("flow"));

  const signInReady = isValidEmail(signInEmail) && signInPassword.trim().length > 0;
  const signUpPasswordStrength = getPasswordStrength(signUpForm.password);
  const signUpEmailValid = isValidEmail(signUpForm.email);
  const signUpReady =
    signUpForm.full_name.trim().length > 0 &&
    signUpEmailValid &&
    signUpForm.country.trim().length > 0 &&
    signUpForm.phone_number.trim().length > 0 &&
    signUpPasswordStrength.isStrong &&
    signUpForm.confirm_password === signUpForm.password &&
    signUpForm.agree_terms &&
    signUpForm.agree_privacy;
  const setPasswordStrength = getPasswordStrength(setPasswordForm.password);
  const setPasswordReady =
    setPasswordStrength.isStrong &&
    setPasswordForm.confirm_password === setPasswordForm.password;

  const helperText = useMemo(() => {
    if (currentMode === "signup") {
      return "Create your eva account once, verify your email, and continue straight into financial onboarding.";
    }

    if (currentMode === "verify-email") {
      if (verificationFlow === "legacy") {
        return `We sent a secure email link to ${verificationEmail}. Open it on this device to verify and continue into eva.useaima.com.`;
      }

      return `We sent a verification email to ${verificationEmail}. Confirm it to activate your eva account and continue into eva.useaima.com.`;
    }

    if (currentMode === "set-password") {
      return "This is a one-time step for earlier magic-link users. Add a strong password so future sign-ins are simple and consistent.";
    }

    return "Sign in with your email and password to continue into your eva workspace.";
  }, [currentMode, verificationEmail, verificationFlow]);

  const setMode = (mode: AuthMode, extras?: Record<string, string>) => {
    if (forcedMode) {
      return;
    }

    const next = new URLSearchParams();
    next.set("mode", mode);
    Object.entries(extras ?? {}).forEach(([key, value]) => {
      if (value) {
        next.set(key, value);
      }
    });
    setSearchParams(next, { replace: true });
  };

  const triggerVerificationDelivery = useCallback(
    async ({
      email,
      flow,
    }: {
      email: string;
      flow: VerificationFlow;
    }) => {
      if (flow === "legacy") {
        throw new Error("Legacy sign-in links are no longer available from the sign-in page.");
      }

      await resendVerificationEmail(email);

      persistLastEmail(email);
    },
    [resendVerificationEmail],
  );

  const handleSignInResend = async () => {
    const email = signInEmail.trim().toLowerCase();
    if (!isValidEmail(email)) {
      toast.error("Enter your email first so eva knows where to send the verification email.");
      return;
    }

    setResending(true);
    try {
      await resendVerificationEmail(email);
      persistLastEmail(email);
      setMode("verify-email", { email, flow: "signup" });
      toast.success("Verification email sent.");
    } catch (error) {
      toast.error(
        getAuthErrorMessage(
          error,
          "We could not resend the verification email right now.",
        ),
      );
    } finally {
      setResending(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = signInEmail.trim().toLowerCase();
    if (!isValidEmail(email)) {
      toast.error("Enter your email first so eva can send the password reset email.");
      return;
    }

    setResettingPassword(true);
    try {
      await sendPasswordReset(email);
      persistLastEmail(email);
      toast.success("Password reset email sent.");
    } catch (error) {
      toast.error(
        getAuthErrorMessage(
          error,
          "We could not send the password reset email right now.",
        ),
      );
    } finally {
      setResettingPassword(false);
    }
  };

  const handleVerificationCheck = async () => {
    setVerifying(true);
    try {
      const verified = await refreshAuthUser();
      if (verified) {
        toast.success("Email verified. Loading your eva workspace...");
      } else {
        toast.error("Your email is not verified yet. Open the latest email and try again.");
      }
    } catch (error) {
      toast.error(
        getAuthErrorMessage(error, "We could not refresh your verification status right now."),
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();

    const email = signInEmail.trim().toLowerCase();
    if (!signInReady) {
      toast.error("Enter a valid email and password to continue.");
      return;
    }

    setSubmitting(true);
    try {
      await signInWithPassword(email, signInPassword);
      persistLastEmail(email);
      toast.success("Signed in successfully.");
    } catch (error) {
      const message = getAuthErrorMessage(
        error,
        "We could not sign you in. Please try again.",
      );

      if (
        /verify your email|email not confirmed|email.*not.*confirmed/i.test(message)
      ) {
        persistLastEmail(email);
        setMode("verify-email", { email, flow: "signup" });
        toast.error("Verify your email to continue.");
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();

    const email = signUpForm.email.trim().toLowerCase();
    if (!signUpReady) {
      toast.error("Finish the required fields and use a strong password to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUpWithPassword({
        full_name: signUpForm.full_name.trim(),
        email,
        country: signUpForm.country,
        phone_number: signUpForm.phone_number.trim(),
        password: signUpForm.password,
        updates_opt_in: signUpForm.updates_opt_in,
      });
      persistLastEmail(email);

      if (result.requiresEmailVerification) {
        queueVerificationAutoResend(email);
        setMode("verify-email", { email, flow: "signup" });
        toast.success("Check your inbox to verify your eva account.");
      } else {
        toast.success("Account created. Loading your onboarding...");
      }
    } catch (error) {
      const message = getAuthErrorMessage(
        error,
        "We could not create your account right now.",
      );
      persistLastEmail(email);

      if (/verification email was already sent recently/i.test(message)) {
        setMode("verify-email", { email, flow: "signup" });
      }

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!verificationEmail || !isValidEmail(verificationEmail)) {
      toast.error("Enter a valid email address first.");
      return;
    }

    setResending(true);
    try {
      await triggerVerificationDelivery({
        email: verificationEmail,
        flow: verificationFlow,
      });
      toast.success("Verification email sent again.");
    } catch (error) {
      toast.error(
        getAuthErrorMessage(error, "We could not resend the verification email right now."),
      );
    } finally {
      setResending(false);
    }
  };

  const handleSetPassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!setPasswordReady) {
      toast.error("Use a strong password and make sure both fields match.");
      return;
    }

    setSubmitting(true);
    try {
      await completeLegacyPasswordSetup(setPasswordForm.password);
      toast.success("Password saved. Loading your workspace...");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "We could not finish setting your password right now.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (
      currentMode !== "verify-email" ||
      verificationFlow !== "signup" ||
      !verificationEmail ||
      !isValidEmail(verificationEmail)
    ) {
      setAutoResendCountdown(null);
      setAutoResendState("idle");
      return;
    }

    if (!consumeVerificationAutoResend(verificationEmail)) {
      setAutoResendCountdown(null);
      setAutoResendState("idle");
      return;
    }

    let remaining = VERIFY_EMAIL_AUTO_RESEND_DELAY_SECONDS;
    setAutoResendCountdown(remaining);
    setAutoResendState("countdown");

    const intervalId = window.setInterval(() => {
      remaining -= 1;

      if (remaining <= 0) {
        window.clearInterval(intervalId);
        setAutoResendCountdown(0);
        setAutoResendState("sending");

        void triggerVerificationDelivery({
          email: verificationEmail,
          flow: "signup",
        })
          .then(() => {
            setAutoResendState("sent");
            toast.success("A second verification email is on the way.");
          })
          .catch((error) => {
            setAutoResendState("error");
            toast.error(
              getAuthErrorMessage(
                error,
                "We could not send another verification email right now.",
              ),
            );
          });
        return;
      }

      setAutoResendCountdown(remaining);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [currentMode, triggerVerificationDelivery, verificationEmail, verificationFlow]);

  const passwordChecks = currentMode === "set-password"
    ? setPasswordStrength.checks
    : signUpPasswordStrength.checks;
  const passwordLevel = currentMode === "set-password"
    ? setPasswordStrength.level
    : signUpPasswordStrength.level;

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col justify-center gap-8 md:grid md:grid-cols-[1.05fr_0.95fr] md:items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-3 rounded-full border border-border bg-card/80 px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <img
              src="/apple-touch-icon.png"
              alt="eva app icon"
              width={192}
              height={192}
              className="h-8 w-8 rounded-2xl object-cover"
            />
            Back to eva home
          </Link>

          <div className="space-y-4">
            <BrandLockup
              loading="eager"
              size="lg"
              iconClassName="h-14 w-14 md:h-16 md:w-16"
              titleClassName="text-[2.3rem] md:text-[2.7rem]"
            />
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              EVA account access
            </div>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              {currentMode === "signup" && "Create your eva account and verify your email."}
              {currentMode === "signin" && "Sign in and continue into your financial workspace."}
              {currentMode === "verify-email" && "Check your inbox to keep moving."}
              {currentMode === "set-password" && "Finish your account setup with a password."}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              {helperText}
            </p>
          </div>

          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card/85 p-4">
              Verified access
              <p className="mt-1 text-xs leading-relaxed">
                Every account is confirmed by email before eva unlocks the workspace.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card/85 p-4">
              Cross-device sync
              <p className="mt-1 text-xs leading-relaxed">
                Your financial record is tied to your account instead of one browser.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card/85 p-4">
              Agent-ready foundation
              <p className="mt-1 text-xs leading-relaxed">
                Identity, approval trails, and future agent actions all build on this layer.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="rounded-[2rem] border border-border bg-card/95 p-6 shadow-[0_28px_80px_-54px_rgba(110,73,75,0.32)] md:p-8"
        >
          <div className="mb-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              {currentMode === "signup" && "Sign up"}
              {currentMode === "signin" && "Sign in"}
              {currentMode === "verify-email" && "Verify email"}
              {currentMode === "set-password" && "Set password"}
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {currentMode === "signup" && "Create your account"}
              {currentMode === "signin" && "Welcome back"}
              {currentMode === "verify-email" && "Verification required"}
              {currentMode === "set-password" && "Choose a strong password"}
            </h2>
          </div>

          {currentMode === "signin" && (
            <form className="space-y-4" onSubmit={handleSignIn}>
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={signInEmail}
                    onChange={(event) => setSignInEmail(event.target.value)}
                    className="h-12 pl-11 text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={signInPassword}
                    onChange={(event) => setSignInPassword(event.target.value)}
                    className="h-12 pl-11 text-base"
                  />
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full gap-2" disabled={!signInReady || submitting}>
                {submitting ? "Signing in..." : "Sign in"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-primary"
                onClick={handleSignInResend}
                disabled={!isValidEmail(signInEmail) || resending}
              >
                {resending ? "Sending verification..." : "Resend verification email"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={handlePasswordReset}
                disabled={!isValidEmail(signInEmail) || resettingPassword}
              >
                {resettingPassword ? "Sending reset email..." : "Forgot password?"}
              </Button>

              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-semibold text-primary transition-colors hover:text-primary/85"
                >
                  Sign up
                </button>
              </p>
            </form>
          )}

          {currentMode === "signup" && (
            <form className="space-y-4" onSubmit={handleSignUp}>
              <div className="space-y-2">
                <Label htmlFor="signup-full-name">Full names</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="signup-full-name"
                    autoComplete="name"
                    placeholder="Alvin Mukabane"
                    value={signUpForm.full_name}
                    onChange={(event) =>
                      setSignUpForm((current) => ({ ...current, full_name: event.target.value }))
                    }
                    className="h-12 pl-11 text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={signUpForm.email}
                    onChange={(event) =>
                      setSignUpForm((current) => ({ ...current, email: event.target.value }))
                    }
                    className="h-12 pl-11 text-base"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="signup-country">Country</Label>
                  <Select
                    value={signUpForm.country}
                    onValueChange={(value) =>
                      setSignUpForm((current) => ({ ...current, country: value }))
                    }
                  >
                    <SelectTrigger id="signup-country" className="h-12 text-base">
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
                  <Label htmlFor="signup-phone">Phone number</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+254 700 000 000"
                    value={signUpForm.phone_number}
                    onChange={(event) =>
                      setSignUpForm((current) => ({
                        ...current,
                        phone_number: event.target.value,
                      }))
                    }
                    className="h-12 text-base"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Create a strong password"
                      value={signUpForm.password}
                      onChange={(event) =>
                        setSignUpForm((current) => ({ ...current, password: event.target.value }))
                      }
                      className="h-12 pl-11 text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    value={signUpForm.confirm_password}
                    onChange={(event) =>
                      setSignUpForm((current) => ({
                        ...current,
                        confirm_password: event.target.value,
                      }))
                    }
                    className="h-12 text-base"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/70 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Password strength</p>
                    <p className="text-xs text-muted-foreground">
                      Minimum 10 characters, with uppercase, lowercase, number, and symbol.
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      passwordLevel === "strong" && "bg-emerald-100 text-emerald-700",
                      passwordLevel === "medium" && "bg-amber-100 text-amber-700",
                      passwordLevel === "weak" && "bg-red-100 text-red-700",
                    )}
                  >
                    {getStrengthLabel(passwordLevel)}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  {[
                    { label: "At least 10 characters", passed: passwordChecks.length },
                    { label: "One lowercase letter", passed: passwordChecks.lowercase },
                    { label: "One uppercase letter", passed: passwordChecks.uppercase },
                    { label: "One number", passed: passwordChecks.number },
                    { label: "One symbol", passed: passwordChecks.symbol },
                    {
                      label: "Passwords match",
                      passed:
                        signUpForm.confirm_password.length > 0 &&
                        signUpForm.confirm_password === signUpForm.password,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-2 py-1.5",
                        item.passed ? "text-emerald-700" : "text-muted-foreground",
                      )}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border bg-background/70 px-4 py-4">
                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={signUpForm.agree_terms}
                    onCheckedChange={(checked) =>
                      setSignUpForm((current) => ({
                        ...current,
                        agree_terms: checked === true,
                      }))
                    }
                    className="mt-0.5"
                  />
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    I agree to the{" "}
                    <Link to="/terms" className="font-semibold text-primary hover:text-primary/85">
                      Terms of Service
                    </Link>
                    .
                  </span>
                </label>

                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={signUpForm.agree_privacy}
                    onCheckedChange={(checked) =>
                      setSignUpForm((current) => ({
                        ...current,
                        agree_privacy: checked === true,
                      }))
                    }
                    className="mt-0.5"
                  />
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    I agree to the{" "}
                    <Link
                      to="/privacy"
                      className="font-semibold text-primary hover:text-primary/85"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>

                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={signUpForm.updates_opt_in}
                    onCheckedChange={(checked) =>
                      setSignUpForm((current) => ({
                        ...current,
                        updates_opt_in: checked === true,
                      }))
                    }
                    className="mt-0.5"
                  />
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    Receive email updates about product improvements and release notes.
                  </span>
                </label>
              </div>

              <Button type="submit" size="lg" className="w-full gap-2" disabled={!signUpReady || submitting}>
                {submitting ? "Creating account..." : "Sign up"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </Button>

              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-semibold text-primary transition-colors hover:text-primary/85"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {currentMode === "verify-email" && (
            <div className="space-y-5">
              <div className="rounded-[1.6rem] border border-primary/15 bg-primary/6 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/14 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {verificationFlow === "legacy" ? "Secure sign-in link sent" : "Verification email sent"}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {verificationFlow === "legacy"
                        ? `Open the email we sent to ${verificationEmail}. Once the link is confirmed on this device, eva will guide you through password setup if needed.`
                        : `Open the email we sent to ${verificationEmail}. After verification, tap the button below and eva will take you into onboarding or back to your dashboard automatically.`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/70 px-4 py-4">
                <p className="text-sm font-medium text-foreground">What happens next</p>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 text-primary" />
                    <span>Open the email in this browser if possible.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <span>Confirm the link and return to eva.useaima.com.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="mt-0.5 h-4 w-4 text-primary" />
                    <span>New users go to onboarding. Existing verified users go to their workspace.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <RefreshCw className="mt-0.5 h-4 w-4 text-primary" />
                    <span>Check your inbox, spam, and promotions tabs. eva will send a second copy automatically if the first one does not land quickly.</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 gap-2"
                  onClick={handleVerificationCheck}
                  disabled={verifying}
                >
                  {verifying ? "Checking..." : "I've verified my email"}
                  {!verifying && <CheckCircle2 className="h-4 w-4" />}
                </Button>
                <Button type="button" className="flex-1 gap-2" onClick={handleResend} disabled={resending}>
                  {resending ? "Sending again..." : "Resend email"}
                  {!resending && <RefreshCw className="h-4 w-4" />}
                </Button>
                {!forcedMode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setMode("signin")}
                  >
                    Back to sign in
                  </Button>
                )}
              </div>

              {verificationFlow === "signup" && (
                <p className="text-xs text-muted-foreground">
                  {autoResendState === "countdown" && autoResendCountdown !== null
                    ? `If the email does not arrive quickly, eva will send another copy in ${autoResendCountdown}s.`
                    : autoResendState === "sending"
                      ? "Sending another verification email now..."
                      : autoResendState === "sent"
                        ? "A second verification email was sent. Check inbox, spam, and promotions."
                        : autoResendState === "error"
                          ? "Automatic resend did not go through. You can use the resend button above."
                          : "Verification emails should arrive within seconds. If not, use resend and check spam or promotions."}
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                {user && !user.emailVerified
                  ? "This browser is still signed in to your unverified account, so resend and verification refresh will work here."
                  : "If you verified on another device, sign in again here after confirming the email."}
              </p>

              <p className="text-xs text-muted-foreground">
                Still stuck?{" "}
                <a
                  href={SUPPORT_LINKS.verifyEmail}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary hover:text-primary/85"
                >
                  Open the verification help guide
                </a>
                .
              </p>
            </div>
          )}

          {currentMode === "set-password" && (
            <form className="space-y-4" onSubmit={handleSetPassword}>
              <div className="rounded-2xl border border-primary/15 bg-primary/6 px-4 py-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/14 text-primary">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">One-time security upgrade</p>
                    <p className="mt-1 leading-relaxed">
                      Your earlier eva account was created with email links only. Add a password now
                      so future sign-ins are faster and consistent.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="set-password">New password</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="set-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    value={setPasswordForm.password}
                    onChange={(event) =>
                      setSetPasswordForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    className="h-12 pl-11 text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-set-password">Confirm password</Label>
                <Input
                  id="confirm-set-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={setPasswordForm.confirm_password}
                  onChange={(event) =>
                    setSetPasswordForm((current) => ({
                      ...current,
                      confirm_password: event.target.value,
                    }))
                  }
                  className="h-12 text-base"
                />
              </div>

              <div className="rounded-2xl border border-border bg-background/70 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-foreground">Password strength</p>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      passwordLevel === "strong" && "bg-emerald-100 text-emerald-700",
                      passwordLevel === "medium" && "bg-amber-100 text-amber-700",
                      passwordLevel === "weak" && "bg-red-100 text-red-700",
                    )}
                  >
                    {getStrengthLabel(passwordLevel)}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  {[
                    { label: "At least 10 characters", passed: passwordChecks.length },
                    { label: "One lowercase letter", passed: passwordChecks.lowercase },
                    { label: "One uppercase letter", passed: passwordChecks.uppercase },
                    { label: "One number", passed: passwordChecks.number },
                    { label: "One symbol", passed: passwordChecks.symbol },
                    {
                      label: "Passwords match",
                      passed:
                        setPasswordForm.confirm_password.length > 0 &&
                        setPasswordForm.confirm_password === setPasswordForm.password,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-2 py-1.5",
                        item.passed ? "text-emerald-700" : "text-muted-foreground",
                      )}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full gap-2" disabled={!setPasswordReady || submitting}>
                {submitting ? "Saving password..." : "Save password"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
