import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { usePublicUser } from "@/context/PublicUserContext";
import { GOAL_ICONS, formatCurrency } from "@/lib/finance";

const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: index * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

type DraftGoal = {
  id?: string;
  name: string;
  target_amount: string;
  current_amount: string;
  deadline: string;
  icon: string;
};

const emptyDraft: DraftGoal = {
  name: "",
  target_amount: "",
  current_amount: "",
  deadline: "",
  icon: GOAL_ICONS[0],
};

export default function Goals() {
  const { bootstrap, saveGoal, deleteGoal, saving } = usePublicUser();
  const [showCreate, setShowCreate] = useState(false);
  const [draftGoal, setDraftGoal] = useState<DraftGoal>(emptyDraft);

  const openCreate = () => {
    setDraftGoal(emptyDraft);
    setShowCreate(true);
  };

  const openEdit = (goal: (typeof bootstrap.goals)[number]) => {
    setDraftGoal({
      id: goal.id,
      name: goal.name,
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount),
      deadline: goal.deadline,
      icon: goal.icon,
    });
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!draftGoal.name.trim() || !draftGoal.target_amount || !draftGoal.deadline) {
      toast.error("Add a name, target, and deadline for this goal.");
      return;
    }

    try {
      await saveGoal({
        id: draftGoal.id,
        name: draftGoal.name.trim(),
        target_amount: Number(draftGoal.target_amount || 0),
        current_amount: Number(draftGoal.current_amount || 0),
        deadline: draftGoal.deadline,
        icon: draftGoal.icon,
      });
      toast.success(draftGoal.id ? "Goal updated" : "Goal added");
      setDraftGoal(emptyDraft);
      setShowCreate(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save goal right now.",
      );
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      await deleteGoal(goalId);
      toast.success("Goal removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to remove goal right now.",
      );
    }
  };

  return (
    <div className="mx-auto max-w-[860px] space-y-6 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track the goals you actually care about, without seeded progress.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.97]"
        >
          <Plus className="h-3.5 w-3.5" />
          New Goal
        </button>
      </motion.div>

      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {draftGoal.id ? "Edit goal" : "Create new goal"}
            </h3>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={draftGoal.name}
              onChange={(event) =>
                setDraftGoal((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Goal name"
              className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <input
              value={draftGoal.target_amount}
              onChange={(event) =>
                setDraftGoal((current) => ({
                  ...current,
                  target_amount: event.target.value,
                }))
              }
              placeholder="Target amount ($)"
              type="number"
              className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <input
              value={draftGoal.current_amount}
              onChange={(event) =>
                setDraftGoal((current) => ({
                  ...current,
                  current_amount: event.target.value,
                }))
              }
              placeholder="Current saved ($)"
              type="number"
              className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <input
              value={draftGoal.deadline}
              onChange={(event) =>
                setDraftGoal((current) => ({
                  ...current,
                  deadline: event.target.value,
                }))
              }
              type="date"
              className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {GOAL_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setDraftGoal((current) => ({ ...current, icon }))}
                className={`rounded-xl border px-3 py-2 text-lg ${
                  draftGoal.icon === icon
                    ? "border-primary/30 bg-primary/8"
                    : "border-border bg-background"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {saving ? "Saving..." : draftGoal.id ? "Save Changes" : "Create Goal"}
          </button>
        </motion.div>
      )}

      {bootstrap.goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No goals yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add your first real goal and eva will start tracking progress instead of placeholders.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {bootstrap.goals.map((goal, index) => {
            const progress = goal.target_amount
              ? Math.round((goal.current_amount / goal.target_amount) * 100)
              : 0;
            const remaining = goal.target_amount - goal.current_amount;
            const monthsLeft = Math.max(
              1,
              Math.ceil(
                (new Date(goal.deadline).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24 * 30),
              ),
            );
            const monthlyContribution = Math.max(0, Math.round(remaining / monthsLeft));

            return (
              <motion.div
                key={goal.id}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="space-y-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/15"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{goal.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold">{goal.name}</h3>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(goal.deadline).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(goal)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      aria-label="Edit goal"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(goal.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete goal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                  <span>{formatCurrency(goal.current_amount)} saved</span>
                  <span>{formatCurrency(goal.target_amount)} target</span>
                </div>

                <Progress value={Math.max(0, Math.min(100, progress))} className="h-1.5 bg-secondary" />

                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-primary">{progress}% complete</span>
                  <span className="text-muted-foreground">
                    {remaining > 0
                      ? `${formatCurrency(monthlyContribution)}/mo needed`
                      : "Goal funded"}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
