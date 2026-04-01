import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, CreditCard, AlertTriangle, TrendingDown, Sparkles, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

type Subscription = {
  id: string;
  name: string;
  price: number;
  billing_cycle: "monthly" | "yearly";
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type SubscriptionInput = {
  name: string;
  price: string;
  billing_cycle: "monthly" | "yearly";
  category: string;
};

interface AnalysisResult {
  totalMonthly: number;
  totalYearly: number;
  categoryBreakdown: Record<string, number>;
  recommendations: Array<{
    subscriptionId: string;
    action: "cancel" | "review" | "keep";
    reason: string;
    savings: number;
  }>;
  overwhelmDetected: boolean;
  overwhelmMessage: string | null;
  savingsProjection: {
    monthly: number;
    yearly: number;
  };
}

const STORAGE_KEY = "financeai-prototype-subscriptions";

const CATEGORIES = [
  "Entertainment",
  "Productivity",
  "Cloud Services",
  "Gaming",
  "News & Media",
  "Health & Fitness",
  "Education",
  "Other",
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

function loadStoredSubscriptions(): Subscription[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as Subscription[];
  } catch {
    return [];
  }
}

function saveStoredSubscriptions(subscriptions: Subscription[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
}

export default function Subscriptions() {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => loadStoredSubscriptions());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SubscriptionInput>({
    name: "",
    price: "",
    billing_cycle: "monthly",
    category: "Entertainment",
  });
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const persist = (nextSubscriptions: Subscription[]) => {
    setSubscriptions(nextSubscriptions);
    saveStoredSubscriptions(nextSubscriptions);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) return;

    const now = new Date().toISOString();
    const subscription: Subscription = {
      id: editingId ?? crypto.randomUUID(),
      name: formData.name,
      price: parseFloat(formData.price),
      billing_cycle: formData.billing_cycle,
      category: formData.category,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    if (editingId) {
      persist(
        subscriptions.map((existingSubscription) =>
          existingSubscription.id === editingId
            ? { ...subscription, created_at: existingSubscription.created_at, updated_at: now }
            : existingSubscription,
        ),
      );
      toast({ title: "Subscription updated" });
    } else {
      persist([subscription, ...subscriptions]);
      toast({ title: "Subscription added" });
    }

    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", price: "", billing_cycle: "monthly", category: "Entertainment" });
  };

  const handleDelete = async (id: string) => {
    persist(subscriptions.filter((subscription) => subscription.id !== id));
    toast({ title: "Subscription deleted" });
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingId(subscription.id);
    setFormData({
      name: subscription.name,
      price: subscription.price.toString(),
      billing_cycle: subscription.billing_cycle,
      category: subscription.category,
    });
    setShowForm(true);
  };

  const runAnalysis = async () => {
    if (subscriptions.length === 0) return;
    setAnalyzing(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-subscriptions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ subscriptions }),
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Unable to analyze subscriptions right now.");
      }

      setAnalysis(await response.json());
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Unable to analyze subscriptions right now.",
        variant: "destructive",
      });
    }

    setAnalyzing(false);
  };

  const getMonthlyTotal = () =>
    subscriptions.reduce((sum, subscription) => {
      if (!subscription.is_active) return sum;
      return sum + (subscription.billing_cycle === "yearly" ? subscription.price / 12 : subscription.price);
    }, 0);

  const getYearlyTotal = () =>
    subscriptions.reduce((sum, subscription) => {
      if (!subscription.is_active) return sum;
      return sum + (subscription.billing_cycle === "monthly" ? subscription.price * 12 : subscription.price);
    }, 0);

  const getCategoryBreakdown = () => {
    const breakdown: Record<string, number> = {};
    subscriptions.forEach((subscription) => {
      if (!subscription.is_active) return;
      const monthly = subscription.billing_cycle === "yearly" ? subscription.price / 12 : subscription.price;
      breakdown[subscription.category] = (breakdown[subscription.category] || 0) + monthly;
    });
    return breakdown;
  };

  const getActiveCount = () => subscriptions.filter((subscription) => subscription.is_active).length;

  return (
    <div className="p-4 md:p-8 max-w-[800px] mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track recurring payments locally and run AI analysis without creating an account.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add New
        </Button>
      </motion.div>

      <div className="grid grid-cols-3 gap-3">
        <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp} className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Monthly</p>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(getMonthlyTotal())}</p>
        </motion.div>
        <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp} className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Yearly</p>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(getYearlyTotal())}</p>
        </motion.div>
        <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp} className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-xl font-bold tabular-nums">{getActiveCount()}</p>
        </motion.div>
      </div>

      {subscriptions.length > 0 && (
        <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp} className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold">Category Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(getCategoryBreakdown()).map(([category, amount]) => (
              <div key={category} className="text-center">
                <p className="text-xs text-muted-foreground">{category}</p>
                <p className="text-sm font-semibold">{formatCurrency(amount)}/mo</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {subscriptions.length >= 2 && (
        <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp}>
          <Button
            onClick={runAnalysis}
            disabled={analyzing}
            className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Sparkles className="w-4 h-4" />
            {analyzing ? "Analyzing..." : "Run AI Analysis"}
          </Button>
        </motion.div>
      )}

      {analysis && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-5 space-y-4">
          {analysis.overwhelmDetected && (
            <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Subscription Overwhelm Detected</p>
                <p className="text-xs text-muted-foreground mt-1">{analysis.overwhelmMessage}</p>
              </div>
            </div>
          )}

          {analysis.savingsProjection.monthly > 0 && (
            <div className="flex items-start gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <TrendingDown className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Potential Savings</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Save {formatCurrency(analysis.savingsProjection.monthly)}/mo ({formatCurrency(analysis.savingsProjection.yearly)}/yr) by acting on recommendations
                </p>
              </div>
            </div>
          )}

          {analysis.recommendations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">AI Recommendations</h3>
              {analysis.recommendations.map((recommendation) => {
                const subscription = subscriptions.find((existingSubscription) => existingSubscription.id === recommendation.subscriptionId);
                if (!subscription) return null;

                return (
                  <div
                    key={recommendation.subscriptionId}
                    className={cn(
                      "p-3 rounded-lg border flex items-center justify-between",
                      recommendation.action === "cancel"
                        ? "bg-destructive/5 border-destructive/20"
                        : recommendation.action === "review"
                          ? "bg-yellow-500/5 border-yellow-500/20"
                          : "bg-primary/5 border-primary/20",
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{subscription.name}</p>
                      <p className="text-xs text-muted-foreground">{recommendation.reason}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full",
                          recommendation.action === "cancel"
                            ? "bg-destructive text-destructive-foreground"
                            : recommendation.action === "review"
                              ? "bg-yellow-500 text-yellow-foreground"
                              : "bg-primary text-primary-foreground",
                        )}
                      >
                        {recommendation.action.toUpperCase()}
                      </span>
                      {recommendation.savings > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">Save {formatCurrency(recommendation.savings)}/mo</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Your Subscriptions</h2>
        {subscriptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No subscriptions yet</p>
            <p className="text-xs mt-1">Add your first subscription to get started</p>
          </div>
        ) : (
          subscriptions.map((subscription, index) => (
            <motion.div
              key={subscription.id}
              custom={5 + index}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-primary/15 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{subscription.name}</h3>
                  <p className="text-xs text-muted-foreground">{subscription.category} &bull; {subscription.billing_cycle}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(subscription.price)}</p>
                  <p className="text-xs text-muted-foreground">/{subscription.billing_cycle === "monthly" ? "mo" : "yr"}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(subscription)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(subscription.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Subscription" : "Add Subscription"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <input
                value={formData.name}
                onChange={(event) => setFormData((previous) => ({ ...previous, name: event.target.value }))}
                placeholder="e.g., Netflix, Spotify"
                className="w-full mt-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Price</label>
              <input
                value={formData.price}
                onChange={(event) => setFormData((previous) => ({ ...previous, price: event.target.value }))}
                placeholder="0.00"
                type="number"
                step="0.01"
                className="w-full mt-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Billing Cycle</label>
              <Select
                value={formData.billing_cycle}
                onValueChange={(value: "monthly" | "yearly") => setFormData((previous) => ({ ...previous, billing_cycle: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData((previous) => ({ ...previous, category: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={!formData.name || !formData.price}>
              {editingId ? "Update" : "Add"} Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
