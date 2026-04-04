import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CreditCard,
  Edit2,
  Plus,
  Sparkles,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { usePublicUser } from "@/context/PublicUserContext";
import { hasSupabaseConfig, SUPABASE_SETUP_MESSAGE, supabase } from "@/integrations/supabase/client";
import { SUBSCRIPTION_CATEGORIES, formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";

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

const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: index * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Subscriptions() {
  const { toast } = useToast();
  const { bootstrap, saveSubscription, deleteSubscription } = usePublicUser();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SubscriptionInput>({
    name: "",
    price: "",
    billing_cycle: "monthly",
    category: SUBSCRIPTION_CATEGORIES[0],
  });
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const subscriptions = bootstrap.subscriptions;

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.price) return;

    try {
      await saveSubscription({
        id: editingId ?? undefined,
        name: formData.name.trim(),
        price: Number(formData.price || 0),
        billing_cycle: formData.billing_cycle,
        category: formData.category,
        is_active: true,
      });
      toast({
        title: editingId ? "Subscription updated" : "Subscription added",
      });
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: "",
        price: "",
        billing_cycle: "monthly",
        category: SUBSCRIPTION_CATEGORIES[0],
      });
    } catch (error) {
      toast({
        title: "Unable to save subscription",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSubscription(id);
      toast({ title: "Subscription deleted" });
    } catch (error) {
      toast({
        title: "Unable to remove subscription",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (subscription: (typeof subscriptions)[number]) => {
    setEditingId(subscription.id);
    setFormData({
      name: subscription.name,
      price: String(subscription.price),
      billing_cycle: subscription.billing_cycle,
      category: subscription.category,
    });
    setShowForm(true);
  };

  const runAnalysis = async () => {
    if (subscriptions.length === 0) return;
    if (!hasSupabaseConfig) {
      toast({
        title: "Analysis unavailable",
        description: SUPABASE_SETUP_MESSAGE,
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-subscriptions", {
        body: { subscriptions },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data as AnalysisResult);
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Unable to analyze subscriptions right now.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const monthlyTotal = useMemo(
    () =>
      subscriptions.reduce((sum, subscription) => {
        if (!subscription.is_active) return sum;
        return (
          sum +
          (subscription.billing_cycle === "yearly"
            ? Number(subscription.price) / 12
            : Number(subscription.price))
        );
      }, 0),
    [subscriptions],
  );

  const yearlyTotal = useMemo(
    () =>
      subscriptions.reduce((sum, subscription) => {
        if (!subscription.is_active) return sum;
        return (
          sum +
          (subscription.billing_cycle === "monthly"
            ? Number(subscription.price) * 12
            : Number(subscription.price))
        );
      }, 0),
    [subscriptions],
  );

  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    subscriptions.forEach((subscription) => {
      if (!subscription.is_active) return;
      const monthly =
        subscription.billing_cycle === "yearly"
          ? Number(subscription.price) / 12
          : Number(subscription.price);
      breakdown[subscription.category] = (breakdown[subscription.category] || 0) + monthly;
    });
    return breakdown;
  }, [subscriptions]);

  return (
    <div className="mx-auto max-w-[800px] space-y-6 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track recurring payments and run AI analysis on your real subscription stack.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add New
        </Button>
      </motion.div>

      <div className="grid grid-cols-3 gap-3">
        <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp} className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Monthly</p>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(monthlyTotal)}</p>
        </motion.div>
        <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp} className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Yearly</p>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(yearlyTotal)}</p>
        </motion.div>
        <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp} className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-xl font-bold tabular-nums">
            {subscriptions.filter((subscription) => subscription.is_active).length}
          </p>
        </motion.div>
      </div>

      {subscriptions.length > 0 && (
        <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp} className="space-y-3 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Category Breakdown</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(categoryBreakdown).map(([category, amount]) => (
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
          <Button onClick={runAnalysis} disabled={analyzing} className="w-full gap-2">
            <Sparkles className="h-4 w-4" />
            {analyzing ? "Analyzing..." : "Run AI Analysis"}
          </Button>
        </motion.div>
      )}

      {analysis && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 rounded-xl border border-border bg-card p-5">
          {analysis.overwhelmDetected && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Subscription overwhelm detected</p>
                <p className="mt-1 text-xs text-muted-foreground">{analysis.overwhelmMessage}</p>
              </div>
            </div>
          )}

          {analysis.savingsProjection.monthly > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/10 p-3">
              <TrendingDown className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Potential savings</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Save {formatCurrency(analysis.savingsProjection.monthly)}/mo (
                  {formatCurrency(analysis.savingsProjection.yearly)}/yr) by acting on the
                  strongest recommendations.
                </p>
              </div>
            </div>
          )}

          {analysis.recommendations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">AI Recommendations</h3>
              {analysis.recommendations.map((recommendation) => {
                const subscription = subscriptions.find(
                  (existingSubscription) =>
                    existingSubscription.id === recommendation.subscriptionId,
                );
                if (!subscription) return null;

                return (
                  <div
                    key={recommendation.subscriptionId}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3",
                      recommendation.action === "cancel"
                        ? "border-destructive/20 bg-destructive/5"
                        : recommendation.action === "review"
                          ? "border-yellow-500/20 bg-yellow-500/5"
                          : "border-primary/20 bg-primary/5",
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{subscription.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{recommendation.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {recommendation.action}
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(recommendation.savings)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {subscriptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-foreground">No subscriptions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add your recurring services and eva will track their real monthly impact.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((subscription, index) => (
            <motion.div
              key={subscription.id}
              custom={index + 5}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{subscription.name}</p>
                <p className="text-xs text-muted-foreground">
                  {subscription.category} • {formatCurrency(Number(subscription.price))} /{" "}
                  {subscription.billing_cycle}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleEdit(subscription)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Edit subscription"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(subscription.id)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete subscription"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit subscription" : "Add subscription"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <input
              value={formData.name}
              onChange={(event) =>
                setFormData((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Subscription name"
              className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={formData.price}
              onChange={(event) =>
                setFormData((current) => ({ ...current, price: event.target.value }))
              }
              placeholder="Price"
              className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
            />
            <Select
              value={formData.billing_cycle}
              onValueChange={(value: "monthly" | "yearly") =>
                setFormData((current) => ({ ...current, billing_cycle: value }))
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
              value={formData.category}
              onValueChange={(value) =>
                setFormData((current) => ({ ...current, category: value }))
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
            <Button onClick={handleSubmit}>
              {editingId ? "Save changes" : "Add subscription"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
