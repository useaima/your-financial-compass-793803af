import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Brain,
  CreditCard,
  PiggyBank,
  Plus,
  Sparkles,
  Trash2,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { usePublicUser } from "@/context/PublicUserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import ManualEntryForm, {
  type AssetEntry,
  type LiabilityEntry,
} from "@/components/financial/ManualEntryForm";
import {
  BUDGET_LIMIT_CATEGORIES,
  COUNTRIES,
  SUBSCRIPTION_CATEGORIES,
  USER_TYPES,
  formatCurrencyDetailed,
} from "@/lib/finance";

type StepId =
  | "welcome"
  | "intent"
  | "problem"
  | "style"
  | "goal"
  | "setup"
  | "action";

type IntentFocus = "save_more" | "stop_overspending" | "understand_spending" | "manage_subscriptions";
type BiggestProblem = "money_disappears" | "category_overspend" | "too_many_subscriptions" | "inconsistent";
type MoneyStyle = "spend_without_tracking" | "tries_to_track" | "somewhat_disciplined" | "optimizer";
type GuidanceStyle = "strict" | "balanced" | "passive";
type GoalFocus = "save_money" | "reduce_expenses" | "control_subscriptions" | "build_habits";
type SubscriptionAwareness = "yes" | "not_sure" | "no";

const steps: Array<{ id: StepId; label: string }> = [
  { id: "welcome", label: "Welcome" },
  { id: "intent", label: "Intent" },
  { id: "problem", label: "Problem" },
  { id: "style", label: "Style" },
  { id: "goal", label: "Goal" },
  { id: "setup", label: "Setup" },
  { id: "action", label: "First Action" },
];

const intentOptions: Array<{
  value: IntentFocus;
  title: string;
  description: string;
  icon: typeof PiggyBank;
}> = [
  {
    value: "save_more",
    title: "Save more money",
    description: "Build more breathing room each month.",
    icon: PiggyBank,
  },
  {
    value: "stop_overspending",
    title: "Stop overspending",
    description: "Catch the habits that quietly drain cash.",
    icon: TrendingDown,
  },
  {
    value: "understand_spending",
    title: "Understand my spending",
    description: "See where your money actually goes.",
    icon: BarChart3,
  },
  {
    value: "manage_subscriptions",
    title: "Manage subscriptions",
    description: "Find the recurring costs worth cutting.",
    icon: CreditCard,
  },
];

const problemOptions: Array<{
  value: BiggestProblem;
  title: string;
  description: string;
}> = [
  {
    value: "money_disappears",
    title: "I do not know where my money goes",
    description: "You want a clearer picture of daily spending.",
  },
  {
    value: "category_overspend",
    title: "I spend too much on certain things",
    description: "You need help spotting the categories that drift.",
  },
  {
    value: "too_many_subscriptions",
    title: "I have too many subscriptions",
    description: "Recurring costs feel harder to control than they should.",
  },
  {
    value: "inconsistent",
    title: "I cannot stay consistent",
    description: "You start tracking, then momentum fades.",
  },
];

const moneyStyleOptions: Array<{
  value: MoneyStyle;
  title: string;
  description: string;
}> = [
  {
    value: "spend_without_tracking",
    title: "I spend without tracking",
    description: "You need fast guardrails and visibility.",
  },
  {
    value: "tries_to_track",
    title: "I try to track but fail",
    description: "You need a lighter, more consistent system.",
  },
  {
    value: "somewhat_disciplined",
    title: "I am somewhat disciplined",
    description: "You want better insights, not just reminders.",
  },
  {
    value: "optimizer",
    title: "I want to optimize",
    description: "You are ready for sharper recommendations and tradeoffs.",
  },
];

const guidanceOptions: Array<{
  value: GuidanceStyle;
  title: string;
  description: string;
}> = [
  {
    value: "strict",
    title: "Strict",
    description: "Push me when I need to improve.",
  },
  {
    value: "balanced",
    title: "Balanced",
    description: "Suggest clearly, but do not overwhelm me.",
  },
  {
    value: "passive",
    title: "Passive",
    description: "Show the data and let me decide.",
  },
];

const goalOptions: Array<{
  value: GoalFocus;
  title: string;
  description: string;
}> = [
  {
    value: "save_money",
    title: "Save money",
    description: "Create more cushion and control.",
  },
  {
    value: "reduce_expenses",
    title: "Reduce expenses",
    description: "Lower outflows that do not add enough value.",
  },
  {
    value: "control_subscriptions",
    title: "Control subscriptions",
    description: "Get recurring costs under control.",
  },
  {
    value: "build_habits",
    title: "Build better habits",
    description: "Improve consistency and decision quality.",
  },
];

const subscriptionAwarenessOptions: Array<{
  value: SubscriptionAwareness;
  title: string;
}> = [
  { value: "yes", title: "Yes" },
  { value: "not_sure", title: "Not sure" },
  { value: "no", title: "No" },
];

const CHAT_STARTER_STORAGE_KEY = "eva-chat-starter";

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function SelectionCard({
  active,
  title,
  description,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon?: typeof PiggyBank;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1.35rem] border p-4 text-left transition-all duration-200 ${
        active
          ? "border-primary/35 bg-primary/8 shadow-[0_18px_48px_-36px_rgba(110,73,75,0.3)]"
          : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/20"
      }`}
    >
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { completeOnboarding, saving } = usePublicUser();
  const [stepIndex, setStepIndex] = useState(0);
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    country: "United States",
    user_type: "personal" as "personal" | "business",
    updates_opt_in: true,
    cash_balance: "",
    monthly_income: "",
    monthly_fixed_expenses: "",
  });
  const [intentFocus, setIntentFocus] = useState<IntentFocus | null>(null);
  const [biggestProblem, setBiggestProblem] = useState<BiggestProblem | null>(null);
  const [moneyStyle, setMoneyStyle] = useState<MoneyStyle | null>(null);
  const [guidanceStyle, setGuidanceStyle] = useState<GuidanceStyle>("balanced");
  const [goalFocus, setGoalFocus] = useState<GoalFocus | null>(null);
  const [targetMonthlySavings, setTargetMonthlySavings] = useState("");
  const [subscriptionAwareness, setSubscriptionAwareness] =
    useState<SubscriptionAwareness>("not_sure");
  const [budgetForm, setBudgetForm] = useState({
    category: BUDGET_LIMIT_CATEGORIES[0],
    monthly_limit: "",
  });
  const [budgetLimits, setBudgetLimits] = useState<
    Array<{ id: string; category: string; monthly_limit: string }>
  >([]);
  const [subscriptionForm, setSubscriptionForm] = useState({
    name: "",
    price: "",
    billing_cycle: "monthly" as "monthly" | "yearly",
    category: SUBSCRIPTION_CATEGORIES[0],
  });
  const [subscriptions, setSubscriptions] = useState<
    Array<{
      id: string;
      name: string;
      price: string;
      billing_cycle: "monthly" | "yearly";
      category: string;
    }>
  >([]);
  const [manualAssets, setManualAssets] = useState<AssetEntry[]>([]);
  const [manualLiabilities, setManualLiabilities] = useState<LiabilityEntry[]>([]);
  const [showBalanceSheet, setShowBalanceSheet] = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [showBudgets, setShowBudgets] = useState(false);
  const [firstActionPrompt, setFirstActionPrompt] = useState("");

  const currentStep = steps[stepIndex];

  const monthlySubscriptionTotal = useMemo(
    () =>
      subscriptions.reduce((sum, subscription) => {
        const amount = Number(subscription.price || 0);
        return sum + (subscription.billing_cycle === "yearly" ? amount / 12 : amount);
      }, 0),
    [subscriptions],
  );

  const insightMessage = useMemo(() => {
    const intentLabel =
      intentOptions.find((option) => option.value === intentFocus)?.title.toLowerCase() ??
      "build better money habits";
    const problemLabel =
      problemOptions.find((option) => option.value === biggestProblem)?.title.toLowerCase() ??
      "untracked spending";
    const guidanceLabel =
      guidanceOptions.find((option) => option.value === guidanceStyle)?.title.toLowerCase() ??
      "balanced";

    const subscriptionLine =
      subscriptionAwareness === "yes" || subscriptionAwareness === "not_sure"
        ? "I will keep a close eye on subscriptions too."
        : "I will focus more on daily behavior than recurring costs.";

    return {
      headline: `You want eva to help you ${intentLabel}, and your biggest blocker right now feels like ${problemLabel}.`,
      detail: `I will guide you in a ${guidanceLabel} way, surface the habits that matter first, and turn your first logged expense into real momentum. ${subscriptionLine}`,
    };
  }, [biggestProblem, guidanceStyle, intentFocus, subscriptionAwareness]);

  const canContinue = () => {
    if (currentStep.id === "style") {
      return Boolean(moneyStyle && guidanceStyle);
    }

    if (currentStep.id === "goal") {
      return Boolean(goalFocus && subscriptionAwareness);
    }

    if (currentStep.id === "setup") {
      return Boolean(
        profile.first_name.trim() &&
          profile.country &&
          profile.cash_balance &&
          profile.monthly_income &&
          profile.monthly_fixed_expenses,
      );
    }

    return true;
  };

  const moveToNext = () => {
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const selectAndAdvance = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    window.setTimeout(() => {
      setStepIndex((current) => Math.min(current + 1, steps.length - 1));
    }, 180);
  };

  const addBudgetLimit = () => {
    if (!budgetForm.monthly_limit) return;
    setBudgetLimits((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        category: budgetForm.category,
        monthly_limit: budgetForm.monthly_limit,
      },
    ]);
    setBudgetForm({ category: BUDGET_LIMIT_CATEGORIES[0], monthly_limit: "" });
  };

  const addSubscription = () => {
    if (!subscriptionForm.name.trim() || !subscriptionForm.price) return;
    setSubscriptions((current) => [
      ...current,
      { ...subscriptionForm, id: crypto.randomUUID() },
    ]);
    setSubscriptionForm({
      name: "",
      price: "",
      billing_cycle: "monthly",
      category: SUBSCRIPTION_CATEGORIES[0],
    });
  };

  const buildStarterGoal = () => {
    const monthlyTarget = Number(targetMonthlySavings || 0);
    const monthlyIncome = Number(profile.monthly_income || 0);
    const defaultTarget = Math.max(600, Math.round(Math.max(monthlyIncome * 0.1, 100) * 6));
    const deadline = addMonths(new Date(), 6).toISOString().split("T")[0];

    const mapping: Record<GoalFocus, { name: string; icon: string }> = {
      save_money: { name: "Save more money", icon: "🎯" },
      reduce_expenses: { name: "Reduce monthly expenses", icon: "🛟" },
      control_subscriptions: { name: "Control subscriptions", icon: "💳" },
      build_habits: { name: "Build better money habits", icon: "🌱" },
    };

    const selectedGoal = mapping[goalFocus ?? "save_money"];
    return {
      name: selectedGoal.name,
      target_amount: monthlyTarget > 0 ? monthlyTarget * 6 : defaultTarget,
      current_amount: 0,
      deadline,
      icon: selectedGoal.icon,
    };
  };

  const finishOnboarding = async ({
    route,
    autoStartPrompt,
  }: {
    route: "chat" | "dashboard";
    autoStartPrompt?: string;
  }) => {
    if (!goalFocus || !intentFocus || !biggestProblem || !moneyStyle) {
      toast.error("Finish the core setup first so eva can personalize your workspace.");
      return;
    }

    try {
      const starterGoal = buildStarterGoal();

      await completeOnboarding({
        profile: {
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          country: profile.country,
          user_type: profile.user_type,
          updates_opt_in: profile.updates_opt_in,
          cash_balance: Number(profile.cash_balance || 0),
          monthly_income: Number(profile.monthly_income || 0),
          monthly_fixed_expenses: Number(profile.monthly_fixed_expenses || 0),
          budgeting_focus: starterGoal.name,
          intent_focus: intentFocus,
          biggest_problem: biggestProblem,
          money_style: moneyStyle,
          guidance_style: guidanceStyle,
          goal_focus: goalFocus,
          subscription_awareness: subscriptionAwareness,
          target_monthly_savings: Number(targetMonthlySavings || 0),
        },
        goals: [starterGoal],
        budget_limits: budgetLimits.map((limit) => ({
          category: limit.category,
          monthly_limit: Number(limit.monthly_limit || 0),
        })),
        financial_entries: [
          ...manualAssets.map((asset) => ({
            name: asset.name,
            type: asset.type,
            entry_type: "asset" as const,
            value: Number(asset.value || 0),
            cashflow: Number(asset.cashflow || 0),
            balance: 0,
            payment: 0,
            description: asset.description ?? "",
          })),
          ...manualLiabilities.map((liability) => ({
            name: liability.name,
            type: liability.type,
            entry_type: "liability" as const,
            value: 0,
            cashflow: 0,
            balance: Number(liability.balance || 0),
            payment: Number(liability.payment || 0),
            description: liability.description ?? "",
          })),
        ],
        subscriptions: subscriptions.map((subscription) => ({
          name: subscription.name.trim(),
          price: Number(subscription.price || 0),
          billing_cycle: subscription.billing_cycle,
          category: subscription.category,
          is_active: true,
        })),
      });

      toast.success("Your workspace is ready.");

      if (route === "chat" && autoStartPrompt) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            CHAT_STARTER_STORAGE_KEY,
            JSON.stringify({
              starterPrompt: autoStartPrompt,
              autoStart: true,
            }),
          );
        }

        navigate("/chat", {
          replace: true,
          state: {
            starterPrompt: autoStartPrompt,
            autoStart: true,
          },
        });
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to complete onboarding right now.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-border bg-card/95 p-6 shadow-[0_28px_80px_-54px_rgba(110,73,75,0.32)]"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() =>
                stepIndex === 0 ? navigate("/") : setStepIndex((current) => Math.max(current - 1, 0))
              }
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {stepIndex === 0 ? "Back home" : "Back"}
            </button>

            <div className="flex items-center gap-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`h-2.5 w-10 rounded-full transition-colors ${
                    index <= stepIndex ? "bg-primary" : "bg-secondary"
                  }`}
                />
              ))}
            </div>
          </div>

          {currentStep.id === "welcome" && (
            <div className="space-y-8 py-8 text-center md:py-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-primary/12 text-primary">
                <Sparkles className="h-8 w-8" />
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  eva onboarding
                </p>
                <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                  Your AI for smarter money decisions
                </h1>
                <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground">
                  Understand your spending. Improve your habits. Save more. This starts fast,
                  feels personal, and ends with a real first action instead of a dead-end setup
                  screen.
                </p>
              </div>
              <Button size="lg" className="gap-2 px-8" onClick={moveToNext}>
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {currentStep.id === "intent" && (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  What do you want help with?
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Choose the outcome that matters most right now
                </h1>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {intentOptions.map((option) => (
                  <SelectionCard
                    key={option.value}
                    active={intentFocus === option.value}
                    title={option.title}
                    description={option.description}
                    icon={option.icon}
                    onClick={() => selectAndAdvance(setIntentFocus, option.value)}
                  />
                ))}
              </div>
            </div>
          )}

          {currentStep.id === "problem" && (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  What is your biggest struggle right now?
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Pick the friction point that feels most true
                </h1>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {problemOptions.map((option) => (
                  <SelectionCard
                    key={option.value}
                    active={biggestProblem === option.value}
                    title={option.title}
                    description={option.description}
                    onClick={() => selectAndAdvance(setBiggestProblem, option.value)}
                  />
                ))}
              </div>
            </div>
          )}

          {currentStep.id === "style" && (
            <div className="space-y-8">
              <div className="space-y-2 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Personalize the way eva guides you
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Match the advice to how you actually think
                </h1>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Which describes you best?</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {moneyStyleOptions.map((option) => (
                    <SelectionCard
                      key={option.value}
                      active={moneyStyle === option.value}
                      title={option.title}
                      description={option.description}
                      onClick={() => setMoneyStyle(option.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">How should I guide you?</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {guidanceOptions.map((option) => (
                    <SelectionCard
                      key={option.value}
                      active={guidanceStyle === option.value}
                      title={option.title}
                      description={option.description}
                      onClick={() => setGuidanceStyle(option.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={moveToNext} disabled={!canContinue()} className="gap-2">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {currentStep.id === "goal" && (
            <div className="space-y-8">
              <div className="space-y-2 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Point eva at the right outcome
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  What is the main goal behind this setup?
                </h1>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {goalOptions.map((option) => (
                  <SelectionCard
                    key={option.value}
                    active={goalFocus === option.value}
                    title={option.title}
                    description={option.description}
                    onClick={() => setGoalFocus(option.value)}
                  />
                ))}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Optional: how much would you like to save each month?</Label>
                  <Input
                    type="number"
                    value={targetMonthlySavings}
                    onChange={(event) => setTargetMonthlySavings(event.target.value)}
                    placeholder="200"
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">
                    Do you think subscriptions are costing you too much?
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {subscriptionAwarenessOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSubscriptionAwareness(option.value)}
                        className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                          subscriptionAwareness === option.value
                            ? "border-primary/30 bg-primary/8 text-primary"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {option.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={moveToNext} disabled={!canContinue()} className="gap-2">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {currentStep.id === "setup" && (
            <div className="space-y-8">
              <div className="space-y-2 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Real numbers, no demo mode
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Give eva the baseline it needs to be honest
                </h1>
                <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  This is the moment where the app stops being generic. Your dashboard will use
                  these numbers immediately, and the optional extras below can make it even more
                  accurate.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input
                    value={profile.first_name}
                    onChange={(event) =>
                      setProfile((current) => ({ ...current, first_name: event.target.value }))
                    }
                    placeholder="Alvin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input
                    value={profile.last_name}
                    onChange={(event) =>
                      setProfile((current) => ({ ...current, last_name: event.target.value }))
                    }
                    placeholder="Mukabane"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select
                    value={profile.country}
                    onValueChange={(value) =>
                      setProfile((current) => ({ ...current, country: value }))
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
                          setProfile((current) => ({
                            ...current,
                            user_type: option.value,
                          }))
                        }
                        className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                          profile.user_type === option.value
                            ? "border-primary/30 bg-primary/8 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cash balance</Label>
                  <Input
                    type="number"
                    value={profile.cash_balance}
                    onChange={(event) =>
                      setProfile((current) => ({ ...current, cash_balance: event.target.value }))
                    }
                    placeholder="1500"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly income</Label>
                  <Input
                    type="number"
                    value={profile.monthly_income}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        monthly_income: event.target.value,
                      }))
                    }
                    placeholder="4200"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Monthly fixed expenses</Label>
                  <Input
                    type="number"
                    value={profile.monthly_fixed_expenses}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        monthly_fixed_expenses: event.target.value,
                      }))
                    }
                    placeholder="2100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Product updates</p>
                  <p className="text-xs text-muted-foreground">
                    Keep me posted when new features or insights roll out.
                  </p>
                </div>
                <Switch
                  checked={profile.updates_opt_in}
                  onCheckedChange={(value) =>
                    setProfile((current) => ({ ...current, updates_opt_in: value }))
                  }
                />
              </div>

              <div className="space-y-4 rounded-[1.6rem] border border-border bg-background p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Optional workspace boost</p>
                    <p className="text-xs text-muted-foreground">
                      Add richer context now, or skip and come back later from the dashboard.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBalanceSheet((current) => !current);
                      setShowSubscriptions((current) => !current);
                      setShowBudgets((current) => !current);
                    }}
                    className="text-xs font-medium text-primary"
                  >
                    {showBalanceSheet || showSubscriptions || showBudgets ? "Hide extras" : "Open extras"}
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setShowBalanceSheet((current) => !current)}
                    className={`rounded-xl border px-4 py-3 text-left ${
                      showBalanceSheet ? "border-primary/30 bg-primary/8" : "border-border bg-card"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">Balance sheet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Assets: {manualAssets.length} • Liabilities: {manualLiabilities.length}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSubscriptions((current) => !current)}
                    className={`rounded-xl border px-4 py-3 text-left ${
                      showSubscriptions ? "border-primary/30 bg-primary/8" : "border-border bg-card"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">Subscriptions</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {subscriptions.length} added • {formatCurrencyDetailed(monthlySubscriptionTotal)}/mo
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBudgets((current) => !current)}
                    className={`rounded-xl border px-4 py-3 text-left ${
                      showBudgets ? "border-primary/30 bg-primary/8" : "border-border bg-card"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">Budget limits</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {budgetLimits.length} categories ready
                    </p>
                  </button>
                </div>

                {showBalanceSheet && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <ManualEntryForm
                      manualAssets={manualAssets}
                      manualLiabilities={manualLiabilities}
                      onAddAsset={(asset) =>
                        setManualAssets((current) => [...current, { ...asset, id: crypto.randomUUID() }])
                      }
                      onAddLiability={(liability) =>
                        setManualLiabilities((current) => [
                          ...current,
                          { ...liability, id: crypto.randomUUID() },
                        ])
                      }
                      onEditAsset={(index, asset) =>
                        setManualAssets((current) =>
                          current.map((entry, currentIndex) =>
                            currentIndex === index ? { ...asset, id: entry.id } : entry,
                          ),
                        )
                      }
                      onEditLiability={(index, liability) =>
                        setManualLiabilities((current) =>
                          current.map((entry, currentIndex) =>
                            currentIndex === index ? { ...liability, id: entry.id } : entry,
                          ),
                        )
                      }
                      onDeleteAsset={(index) =>
                        setManualAssets((current) =>
                          current.filter((_, currentIndex) => currentIndex !== index),
                        )
                      }
                      onDeleteLiability={(index) =>
                        setManualLiabilities((current) =>
                          current.filter((_, currentIndex) => currentIndex !== index),
                        )
                      }
                    />
                  </div>
                )}

                {showSubscriptions && (
                  <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        value={subscriptionForm.name}
                        onChange={(event) =>
                          setSubscriptionForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Netflix"
                      />
                      <Input
                        type="number"
                        value={subscriptionForm.price}
                        onChange={(event) =>
                          setSubscriptionForm((current) => ({
                            ...current,
                            price: event.target.value,
                          }))
                        }
                        placeholder="15.99"
                      />
                      <Select
                        value={subscriptionForm.billing_cycle}
                        onValueChange={(value: "monthly" | "yearly") =>
                          setSubscriptionForm((current) => ({
                            ...current,
                            billing_cycle: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={subscriptionForm.category}
                        onValueChange={(value) =>
                          setSubscriptionForm((current) => ({
                            ...current,
                            category: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBSCRIPTION_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="button" variant="outline" className="gap-2" onClick={addSubscription}>
                      <Plus className="h-4 w-4" />
                      Add subscription
                    </Button>

                    {subscriptions.length > 0 && (
                      <div className="space-y-2">
                        {subscriptions.map((subscription) => (
                          <div
                            key={subscription.id}
                            className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm"
                          >
                            <div>
                              <p className="font-medium text-foreground">{subscription.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrencyDetailed(Number(subscription.price || 0))} /{" "}
                                {subscription.billing_cycle}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setSubscriptions((current) =>
                                  current.filter((item) => item.id !== subscription.id),
                                )
                              }
                              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {showBudgets && (
                  <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <Select
                        value={budgetForm.category}
                        onValueChange={(value) =>
                          setBudgetForm((current) => ({ ...current, category: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BUDGET_LIMIT_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={budgetForm.monthly_limit}
                        onChange={(event) =>
                          setBudgetForm((current) => ({
                            ...current,
                            monthly_limit: event.target.value,
                          }))
                        }
                        placeholder="250"
                      />
                      <Button type="button" variant="outline" onClick={addBudgetLimit}>
                        Add
                      </Button>
                    </div>

                    {budgetLimits.length > 0 && (
                      <div className="space-y-2">
                        {budgetLimits.map((budget) => (
                          <div
                            key={budget.id}
                            className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm"
                          >
                            <div>
                              <p className="font-medium text-foreground">{budget.category}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrencyDetailed(Number(budget.monthly_limit || 0))} / month
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setBudgetLimits((current) =>
                                  current.filter((item) => item.id !== budget.id),
                                )
                              }
                              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => moveToNext()}
                  className="text-xs font-medium text-muted-foreground"
                >
                  Skip extras for now
                </button>
                <Button onClick={moveToNext} disabled={!canContinue()} className="gap-2">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {currentStep.id === "action" && (
            <div className="space-y-8">
              <div className="space-y-2 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Instant insight
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  eva already understands the shape of the problem
                </h1>
              </div>

              <div className="space-y-3 rounded-[1.8rem] border border-primary/20 bg-primary/8 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/14 text-primary">
                    <Brain className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">eva</p>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      Your AI Finance Assistant
                    </p>
                  </div>
                </div>
                <div className="space-y-3 rounded-[1.4rem] border border-border bg-card px-4 py-4">
                  <p className="text-sm leading-relaxed text-foreground">{insightMessage.headline}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{insightMessage.detail}</p>
                </div>
              </div>

              <div className="space-y-3 rounded-[1.8rem] border border-border bg-background p-5">
                <div>
                  <p className="text-sm font-semibold text-foreground">Let us start with a real action</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    What did you spend today? This becomes the first real data point in your
                    workspace.
                  </p>
                </div>
                <textarea
                  value={firstActionPrompt}
                  onChange={(event) => setFirstActionPrompt(event.target.value)}
                  placeholder="e.g. I spent $20 on food and $10 on transport"
                  className="min-h-[130px] w-full rounded-[1.2rem] border border-border bg-card px-4 py-3 text-sm outline-none transition focus:ring-1 focus:ring-primary/40"
                />
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => finishOnboarding({ route: "dashboard" })}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Skip for now
                  </button>
                  <Button
                    onClick={() => {
                      if (!firstActionPrompt.trim()) {
                        toast.error("Add one real expense so the onboarding ends with action.");
                        return;
                      }
                      void finishOnboarding({
                        route: "chat",
                        autoStartPrompt: firstActionPrompt.trim(),
                      });
                    }}
                    disabled={saving}
                    className="gap-2"
                  >
                    {saving ? "Starting..." : "Start with this expense"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.35rem] border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Income
                  </p>
                  <p className="mt-3 text-xl font-bold text-foreground">
                    {formatCurrencyDetailed(Number(profile.monthly_income || 0))}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Fixed costs
                  </p>
                  <p className="mt-3 text-xl font-bold text-foreground">
                    {formatCurrencyDetailed(
                      Number(profile.monthly_fixed_expenses || 0) + monthlySubscriptionTotal,
                    )}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Subscription signal
                  </p>
                  <p className="mt-3 text-xl font-bold text-foreground">
                    {subscriptionAwareness === "yes"
                      ? "High"
                      : subscriptionAwareness === "not_sure"
                        ? "Watch"
                        : "Low"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
