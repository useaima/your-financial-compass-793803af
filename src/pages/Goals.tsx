import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Calendar, X } from "lucide-react";
import { goals as initialGoals, type Goal, monthlyIncome, monthlyExpenses, categoryBreakdown } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  visible: (i: number) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

const budgetRecommendations = [
  { category: "Food & Dining", recommended: Math.round(monthlyIncome * 0.12), reason: "Based on your income and spending patterns" },
  { category: "Transport", recommended: Math.round(monthlyIncome * 0.08), reason: "Keeping transport under 10% of income" },
  { category: "Entertainment", recommended: Math.round(monthlyIncome * 0.05), reason: "Balanced allocation for enjoyment" },
  { category: "Shopping", recommended: Math.round(monthlyIncome * 0.06), reason: "Discretionary spending cap" },
];

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [showCreate, setShowCreate] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: "", target: "", deadline: "" });

  const handleCreate = () => {
    if (!newGoal.name || !newGoal.target) return;
    setGoals((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newGoal.name,
        target: parseFloat(newGoal.target),
        current: 0,
        icon: "🎯",
        deadline: newGoal.deadline || "2027-01-01",
      },
    ]);
    setNewGoal({ name: "", target: "", deadline: "" });
    setShowCreate(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-[800px] mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals & Budget</h1>
          <p className="text-sm text-muted-foreground mt-1">Track progress and optimize your spending.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.97]"
        >
          <Plus className="w-3.5 h-3.5" /> New Goal
        </button>
      </motion.div>

      {/* Create modal */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Create New Goal</h3>
            <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              value={newGoal.name}
              onChange={(e) => setNewGoal((p) => ({ ...p, name: e.target.value }))}
              placeholder="Goal name"
              className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground"
            />
            <input
              value={newGoal.target}
              onChange={(e) => setNewGoal((p) => ({ ...p, target: e.target.value }))}
              placeholder="Target amount ($)"
              type="number"
              className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground"
            />
            <input
              value={newGoal.deadline}
              onChange={(e) => setNewGoal((p) => ({ ...p, deadline: e.target.value }))}
              type="date"
              className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!newGoal.name || !newGoal.target}
            className="text-xs font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors active:scale-[0.97]"
          >
            Create Goal
          </button>
        </motion.div>
      )}

      {/* Goals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {goals.map((goal, i) => {
          const pct = Math.round((goal.current / goal.target) * 100);
          const remaining = goal.target - goal.current;
          const monthsLeft = Math.max(1, Math.ceil(
            (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
          ));
          const perMonth = Math.round(remaining / monthsLeft);

          return (
            <motion.div
              key={goal.id}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/15 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{goal.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold">{goal.name}</h3>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(goal.deadline).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold tabular-nums text-primary">{pct}%</span>
              </div>

              <Progress value={pct} className="h-1.5 bg-secondary" />

              <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                <span>{formatCurrency(goal.current)} saved</span>
                <span>{formatCurrency(goal.target)} target</span>
              </div>

              {remaining > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Save <span className="text-foreground font-medium">{formatCurrency(perMonth)}/mo</span> to reach your goal
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Budget Recommendations */}
      <motion.div
        custom={goals.length}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="space-y-3"
      >
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Budget Recommendations</h2>
        <div className="grid gap-2">
          {budgetRecommendations.map((b, i) => {
            const actual = categoryBreakdown.find((c) => c.name === b.category)?.value || 0;
            const isOver = actual > b.recommended;
            return (
              <motion.div
                key={b.category}
                custom={goals.length + 1 + i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{b.category}</p>
                  <p className="text-[11px] text-muted-foreground">{b.reason}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(b.recommended)}</p>
                  <p className={cn("text-[10px] font-medium tabular-nums", isOver ? "text-destructive" : "text-primary")}>
                    {isOver ? "Over" : "Under"} by {formatCurrency(Math.abs(actual - b.recommended))}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
