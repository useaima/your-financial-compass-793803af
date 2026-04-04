import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { usePublicUser } from "@/context/PublicUserContext";
import {
  SPENDING_CATEGORIES,
  SPENDING_CATEGORY_COLORS,
  SPENDING_CATEGORY_ICONS,
  type SpendingCategory,
  formatCurrencyDetailed,
} from "@/lib/finance";
import { cn } from "@/lib/utils";

type TransactionRow = {
  id: string;
  date: string;
  merchant: string;
  category: SpendingCategory;
  amount: number;
};

const categories: Array<SpendingCategory | "All"> = ["All", ...SPENDING_CATEGORIES];

const fadeUp = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: index * 0.03, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Transactions() {
  const { bootstrap } = usePublicUser();
  const [filter, setFilter] = useState<SpendingCategory | "All">("All");
  const [search, setSearch] = useState("");

  const transactions = useMemo<TransactionRow[]>(
    () =>
      bootstrap.spending_logs.flatMap((log) =>
        log.items.map((item, index) => ({
          id: `${log.id}-${index}`,
          date: log.date,
          merchant: item.description,
          category: (item.category as SpendingCategory) ?? "Other",
          amount: Number(item.amount || 0),
        })),
      ),
    [bootstrap.spending_logs],
  );

  const filtered = useMemo(
    () =>
      transactions.filter((transaction) => {
        if (filter !== "All" && transaction.category !== filter) return false;
        if (
          search &&
          !transaction.merchant.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    [filter, search, transactions],
  );

  const grouped = useMemo(() => {
    const groupedMap: Record<string, TransactionRow[]> = {};
    filtered.forEach((transaction) => {
      const label = new Date(transaction.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      (groupedMap[label] ||= []).push(transaction);
    });
    return Object.entries(groupedMap);
  }, [filtered]);

  return (
    <div className="mx-auto max-w-[840px] space-y-5 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {transactions.length === 0
            ? "No real spending logged yet"
            : `${transactions.length} line item${transactions.length === 1 ? "" : "s"} from your real spending logs`}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search descriptions..."
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex gap-1.5 overflow-x-auto pb-1"
      >
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setFilter(category)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors",
              filter === category
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {category !== "All" && `${SPENDING_CATEGORY_ICONS[category]} `}
            {category}
          </button>
        ))}
      </motion.div>

      {transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No transactions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use the AI Advisor to log spending, and each item will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, transactionRows], groupIndex) => (
            <div key={date}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {date}
              </p>
              <div className="space-y-1">
                {transactionRows.map((transaction, index) => (
                  <motion.div
                    key={transaction.id}
                    custom={groupIndex * 3 + index}
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/15"
                  >
                    <span className="text-lg">{SPENDING_CATEGORY_ICONS[transaction.category]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{transaction.merchant}</p>
                      <p className="text-[11px] text-muted-foreground">{transaction.category}</p>
                    </div>
                    <span
                      className="rounded-full px-2 py-1 text-[10px] font-medium"
                      style={{
                        backgroundColor: `${SPENDING_CATEGORY_COLORS[transaction.category]}15`,
                        color: SPENDING_CATEGORY_COLORS[transaction.category],
                      }}
                    >
                      {transaction.category}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrencyDetailed(transaction.amount)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
