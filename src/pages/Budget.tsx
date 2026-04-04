import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  DollarSign,
  Edit2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { usePublicUser } from "@/context/PublicUserContext";
import { BUDGET_LIMIT_CATEGORIES, formatCurrencyDetailed } from "@/lib/finance";
import { cn } from "@/lib/utils";

export default function Budget() {
  const { bootstrap, saveBudgetLimit, deleteBudgetLimit, saving } = usePublicUser();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState(BUDGET_LIMIT_CATEGORIES[0]);
  const [newLimit, setNewLimit] = useState("");
  const [editLimit, setEditLimit] = useState("");

  const spendingByCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    bootstrap.spending_logs
      .filter((log) => log.date.startsWith(currentMonth))
      .forEach((log) => {
        log.items.forEach((item) => {
          totals[item.category] = (totals[item.category] || 0) + Number(item.amount || 0);
        });
      });

    return totals;
  }, [bootstrap.spending_logs]);

  const usedCategories = bootstrap.budget_limits.map((budget) => budget.category);
  const availableCategories = BUDGET_LIMIT_CATEGORIES.filter(
    (category) => !usedCategories.includes(category),
  );

  const addBudget = async () => {
    if (!newLimit) return;

    try {
      await saveBudgetLimit({
        category: newCategory,
        monthly_limit: Number(newLimit || 0),
      });
      toast.success("Budget limit added");
      setAdding(false);
      setNewLimit("");
      setNewCategory(availableCategories[0] ?? BUDGET_LIMIT_CATEGORIES[0]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to add budget right now.",
      );
    }
  };

  const updateBudget = async (id: string) => {
    if (!editLimit) return;

    try {
      const existingBudget = bootstrap.budget_limits.find((budget) => budget.id === id);
      await saveBudgetLimit({
        id,
        category: existingBudget?.category,
        monthly_limit: Number(editLimit || 0),
      });
      toast.success("Budget updated");
      setEditingId(null);
      setEditLimit("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update budget right now.",
      );
    }
  };

  const removeBudget = async (id: string) => {
    try {
      await deleteBudgetLimit(id);
      toast.success("Budget removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to remove budget right now.",
      );
    }
  };

  const getPercentage = (category: string, limit: number) => {
    const spent = spendingByCategory[category] || 0;
    return limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Budget Limits</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set monthly spending limits per category using your real data.
          </p>
        </div>
        {!adding && availableCategories.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        )}
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 rounded-xl border border-border bg-card p-4"
          >
            <select
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
            >
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Monthly limit ($)"
              value={newLimit}
              onChange={(event) => setNewLimit(event.target.value)}
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addBudget}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setNewLimit("");
                }}
                className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {bootstrap.budget_limits.length === 0 ? (
        <div className="space-y-3 py-16 text-center">
          <DollarSign className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No budget limits set yet</p>
          <p className="text-xs text-muted-foreground/70">
            Add a category budget to start tracking against real spending.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bootstrap.budget_limits.map((budget) => {
            const spent = spendingByCategory[budget.category] || 0;
            const percentage = getPercentage(budget.category, budget.monthly_limit);
            const isOver = spent > budget.monthly_limit;
            const isNear = percentage >= 80 && !isOver;

            return (
              <motion.div
                key={budget.id}
                layout
                className={cn(
                  "rounded-xl border bg-card p-4",
                  isOver
                    ? "border-destructive/40"
                    : isNear
                      ? "border-yellow-500/40"
                      : "border-border",
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {budget.category}
                    </span>
                    {isOver && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                    {isNear && <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />}
                  </div>
                  <div className="flex items-center gap-1">
                    {editingId === budget.id ? (
                      <>
                        <input
                          type="number"
                          value={editLimit}
                          onChange={(event) => setEditLimit(event.target.value)}
                          className="w-20 rounded border border-border bg-secondary/50 px-2 py-1 text-xs"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => updateBudget(budget.id)}
                          className="p-1 text-primary"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 text-muted-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(budget.id);
                            setEditLimit(String(budget.monthly_limit));
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBudget(budget.id)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatCurrencyDetailed(spent)} spent</span>
                  <span>{formatCurrencyDetailed(budget.monthly_limit)} limit</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      isOver
                        ? "bg-destructive"
                        : isNear
                          ? "bg-yellow-500"
                          : "bg-primary",
                    )}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {saving && (
        <p className="text-center text-xs text-muted-foreground">Saving changes...</p>
      )}
    </div>
  );
}
