import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { transactions, CATEGORY_ICONS, CATEGORY_COLORS, type TransactionCategory } from "@/data/mockData";
import { cn } from "@/lib/utils";

const categories: (TransactionCategory | "All")[] = [
  "All", "Food & Dining", "Transport", "Entertainment", "Shopping", "Bills & Utilities", "Health", "Education", "Income",
];

const fadeUp = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  visible: (i: number) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { delay: i * 0.03, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Transactions() {
  const [filter, setFilter] = useState<TransactionCategory | "All">("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== "All" && t.category !== filter) return false;
      if (search && !t.merchant.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [filter, search]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    filtered.forEach((t) => {
      const label = new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      (map[label] ||= []).push(t);
    });
    return Object.entries(map);
  }, [filtered]);

  return (
    <div className="p-4 md:p-8 max-w-[800px] mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">{transactions.length} transactions across 3 months</p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search merchants..."
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground"
        />
      </motion.div>

      {/* Category filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide"
      >
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors shrink-0 active:scale-[0.97]",
              filter === cat
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {cat !== "All" && `${CATEGORY_ICONS[cat]} `}{cat}
          </button>
        ))}
      </motion.div>

      {/* Transaction list */}
      <div className="space-y-4">
        {grouped.map(([date, txns], gi) => (
          <div key={date}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{date}</p>
            <div className="space-y-1">
              {txns.map((t, i) => (
                <motion.div
                  key={t.id}
                  custom={gi * 3 + i}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  className="flex items-center gap-3 bg-card rounded-xl border border-border px-4 py-3 hover:border-primary/15 transition-colors"
                >
                  <span className="text-lg">{CATEGORY_ICONS[t.category]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.merchant}</p>
                    <p className="text-[11px] text-muted-foreground">{t.category}</p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      t.type === "income" ? "text-primary" : "text-foreground"
                    )}
                  >
                    {t.type === "income" ? "+" : "-"}${t.amount.toLocaleString()}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
