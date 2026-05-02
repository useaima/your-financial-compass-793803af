import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { usePublicUser } from "@/context/PublicUserContext";
import { cn } from "@/lib/utils";

const toneIcons = {
  info: Sparkles,
  success: CheckCircle2,
  warning: AlertTriangle,
} as const;

const toneColors = {
  info: "text-primary",
  success: "text-[hsl(var(--chart-2))]",
  warning: "text-[hsl(var(--chart-4))]",
} as const;

export default function AgentInsights() {
  const { bootstrap } = usePublicUser();
  const advice = bootstrap.advice ?? [];

  if (advice.length === 0) {
    return (
      <div className="rounded-[1.6rem] border border-dashed border-border bg-card p-5">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">eva will coach from real activity</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Once you start logging real spending, this space turns into grounded next actions
              instead of generic tips.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" role="region" aria-label="eva next actions">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          eva next actions
        </h2>
      </div>

      <div className="grid gap-2">
        {advice.map((item, index) => {
          const Icon = toneIcons[item.tone];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30"
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary",
                    toneColors[item.tone],
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold leading-tight text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                  {item.cta_label && item.cta_href ? (
                    <Link
                      to={item.cta_href}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                    >
                      {item.cta_label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
