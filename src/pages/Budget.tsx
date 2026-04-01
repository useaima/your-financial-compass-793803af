import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, Check, X, DollarSign, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Food", "Transport", "Entertainment", "Shopping", "Bills",
  "Health", "Education", "Subscriptions", "Groceries", "Personal Care", "Other",
];

interface BudgetLimit {
  id: string;
  category: string;
  monthly_limit: number;
}

interface SpendingByCategory {
  [category: string]: number;
}

export default function Budget() {
  const [budgets, setBudgets] = useState<BudgetLimit[]>([]);
  const [spending, setSpending] = useState<SpendingByCategory>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [editLimit, setEditLimit] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Load budgets
    const { data: budgetData } = await supabase
      .from("budget_limits")
      .select("*")
      .eq("user_id", user.id);

    setBudgets((budgetData as BudgetLimit[]) || []);

    // Load this month's spending
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const { data: logs } = await supabase
      .from("spending_logs")
      .select("items")
      .eq("user_id", user.id)
      .gte("date", monthStart);

    const catSpending: SpendingByCategory = {};
    (logs || []).forEach((log: any) => {
      const items = Array.isArray(log.items) ? log.items : [];
      items.forEach((item: any) => {
        catSpending[item.category] = (catSpending[item.category] || 0) + (item.amount || 0);
      });
    });
    setSpending(catSpending);
    setLoading(false);
  };

  const addBudget = async () => {
    if (!newCategory || !newLimit) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please sign in"); return; }

    const { error } = await supabase.from("budget_limits").insert({
      user_id: user.id,
      category: newCategory,
      monthly_limit: parseFloat(newLimit),
    });

    if (error) {
      if (error.code === "23505") toast.error("Budget for this category already exists");
      else toast.error("Failed to add budget");
      return;
    }

    toast.success("Budget limit added");
    setAdding(false);
    setNewCategory("");
    setNewLimit("");
    loadData();
  };

  const updateBudget = async (id: string) => {
    if (!editLimit) return;
    const { error } = await supabase.from("budget_limits")
      .update({ monthly_limit: parseFloat(editLimit) })
      .eq("id", id);

    if (error) { toast.error("Failed to update"); return; }
    toast.success("Budget updated");
    setEditingId(null);
    loadData();
  };

  const deleteBudget = async (id: string) => {
    const { error } = await supabase.from("budget_limits").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Budget removed");
    loadData();
  };

  const getPercentage = (category: string, limit: number) => {
    const spent = spending[category] || 0;
    return limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  };

  const usedCategories = budgets.map(b => b.category);
  const availableCategories = CATEGORIES.filter(c => !usedCategories.includes(c));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Budget Limits</h1>
          <p className="text-sm text-muted-foreground mt-1">Set monthly spending limits per category</p>
        </div>
        {!adding && availableCategories.length > 0 && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select category</option>
              {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="number"
              placeholder="Monthly limit ($)"
              value={newLimit}
              onChange={e => setNewLimit(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button onClick={addBudget} className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                Save
              </button>
              <button onClick={() => { setAdding(false); setNewCategory(""); setNewLimit(""); }} className="px-3 py-2 rounded-lg bg-secondary text-muted-foreground text-sm">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center text-muted-foreground py-12 text-sm">Loading...</div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <DollarSign className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground text-sm">No budget limits set yet</p>
          <p className="text-xs text-muted-foreground/70">Add a category budget to start tracking against limits</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map(budget => {
            const spent = spending[budget.category] || 0;
            const pct = getPercentage(budget.category, budget.monthly_limit);
            const isOver = spent > budget.monthly_limit;
            const isNear = pct >= 80 && !isOver;

            return (
              <motion.div
                key={budget.id}
                layout
                className={cn(
                  "rounded-xl border bg-card p-4",
                  isOver ? "border-destructive/40" : isNear ? "border-yellow-500/40" : "border-border"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{budget.category}</span>
                    {isOver && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                    {isNear && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />}
                  </div>
                  <div className="flex items-center gap-1">
                    {editingId === budget.id ? (
                      <>
                        <input
                          type="number"
                          value={editLimit}
                          onChange={e => setEditLimit(e.target.value)}
                          className="w-20 bg-secondary/50 border border-border rounded px-2 py-1 text-xs"
                          autoFocus
                        />
                        <button onClick={() => updateBudget(budget.id)} className="p-1 text-primary"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingId(budget.id); setEditLimit(String(budget.monthly_limit)); }} className="p-1 text-muted-foreground hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteBudget(budget.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>${spent.toFixed(2)} spent</span>
                  <span>${budget.monthly_limit.toFixed(2)} limit</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      isOver ? "bg-destructive" : isNear ? "bg-yellow-500" : "bg-primary"
                    )}
                  />
                </div>
                {isOver && (
                  <p className="text-xs text-destructive mt-1.5">
                    Over budget by ${(spent - budget.monthly_limit).toFixed(2)}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
