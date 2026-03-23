import { motion } from "framer-motion";
import { formatCurrency, monthlyIncome, monthlyExpenses, totalBalance, savingsRate, monthlyTrend } from "@/data/mockData";

export default function FinancialStatement() {
  return (
    <div className="p-4 md:p-8 max-w-[800px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-bold tracking-tight">Financial Statement</h1>
        <p className="text-sm text-muted-foreground mt-1">Your income, expenses, and net worth summary</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="bg-card border border-border rounded-xl overflow-hidden"
      >
        <div className="p-5 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Month Summary</h2>
        </div>
        <div className="divide-y divide-border">
          {[
            { label: "Total Balance", value: formatCurrency(totalBalance) },
            { label: "Monthly Income", value: formatCurrency(monthlyIncome), positive: true },
            { label: "Monthly Expenses", value: formatCurrency(monthlyExpenses), negative: true },
            { label: "Net Savings", value: formatCurrency(monthlyIncome - monthlyExpenses), positive: true },
            { label: "Savings Rate", value: `${savingsRate}%` },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className={`text-sm font-semibold tabular-nums ${row.positive ? "text-primary" : row.negative ? "text-destructive" : "text-foreground"}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="bg-card border border-border rounded-xl overflow-hidden"
      >
        <div className="p-5 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">6-Month History</h2>
        </div>
        <div className="divide-y divide-border">
          <div className="grid grid-cols-4 px-5 py-2.5 text-xs font-medium text-muted-foreground">
            <span>Month</span>
            <span className="text-right">Income</span>
            <span className="text-right">Expenses</span>
            <span className="text-right">Net</span>
          </div>
          {monthlyTrend.map((m) => (
            <div key={m.month} className="grid grid-cols-4 px-5 py-3 text-sm">
              <span className="text-foreground">{m.month}</span>
              <span className="text-right text-primary tabular-nums">{formatCurrency(m.income)}</span>
              <span className="text-right text-destructive tabular-nums">{formatCurrency(m.expenses)}</span>
              <span className={`text-right font-medium tabular-nums ${m.income - m.expenses >= 0 ? "text-primary" : "text-destructive"}`}>
                {formatCurrency(m.income - m.expenses)}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
