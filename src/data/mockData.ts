export type Transaction = {
  id: string;
  date: string;
  merchant: string;
  category: TransactionCategory;
  amount: number;
  type: "expense" | "income";
};

export type TransactionCategory =
  | "Food & Dining"
  | "Transport"
  | "Entertainment"
  | "Shopping"
  | "Bills & Utilities"
  | "Health"
  | "Education"
  | "Income"
  | "Savings";

export type Goal = {
  id: string;
  name: string;
  target: number;
  current: number;
  icon: string;
  deadline: string;
};

export const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  "Food & Dining": "hsl(162 48% 42%)",
  Transport: "hsl(38 75% 55%)",
  Entertainment: "hsl(280 55% 55%)",
  Shopping: "hsl(350 60% 55%)",
  "Bills & Utilities": "hsl(200 60% 50%)",
  Health: "hsl(120 40% 48%)",
  Education: "hsl(220 60% 58%)",
  Income: "hsl(162 60% 50%)",
  Savings: "hsl(45 70% 50%)",
};

export const CATEGORY_ICONS: Record<TransactionCategory, string> = {
  "Food & Dining": "🍽️",
  Transport: "🚗",
  Entertainment: "🎬",
  Shopping: "🛍️",
  "Bills & Utilities": "💡",
  Health: "💊",
  Education: "📚",
  Income: "💰",
  Savings: "🏦",
};

const merchants: Record<TransactionCategory, string[]> = {
  "Food & Dining": ["Whole Foods Market", "Chipotle", "Starbucks", "Trader Joe's", "Blue Apron", "DoorDash"],
  Transport: ["Uber", "Shell Gas", "Metro Card", "Lyft", "Parking Garage"],
  Entertainment: ["Netflix", "Spotify", "AMC Theaters", "Steam", "Apple Arcade"],
  Shopping: ["Amazon", "Target", "Nike", "IKEA", "Uniqlo"],
  "Bills & Utilities": ["Verizon", "Con Edison", "Rent Payment", "Internet Provider", "Water Bill"],
  Health: ["CVS Pharmacy", "Gym Membership", "Dr. Martinez", "Dental Care Plus"],
  Education: ["Coursera", "O'Reilly Books", "Udemy"],
  Income: ["Paycheck - Employer", "Freelance Payment", "Investment Dividend"],
  Savings: [],
};

function randomBetween(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function generateTransactions(): Transaction[] {
  const txns: Transaction[] = [];
  const now = new Date();

  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const month = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);

    // Income: 2 paychecks per month
    txns.push({
      id: `inc-${monthOffset}-1`,
      date: new Date(month.getFullYear(), month.getMonth(), 1).toISOString().split("T")[0],
      merchant: "Paycheck - Employer",
      category: "Income",
      amount: 3850,
      type: "income",
    });
    txns.push({
      id: `inc-${monthOffset}-2`,
      date: new Date(month.getFullYear(), month.getMonth(), 15).toISOString().split("T")[0],
      merchant: "Paycheck - Employer",
      category: "Income",
      amount: 3850,
      type: "income",
    });

    // Freelance income occasionally
    if (monthOffset !== 1) {
      txns.push({
        id: `free-${monthOffset}`,
        date: new Date(month.getFullYear(), month.getMonth(), 20).toISOString().split("T")[0],
        merchant: "Freelance Payment",
        category: "Income",
        amount: randomBetween(400, 900),
        type: "income",
      });
    }

    // Expenses
    const expenseCategories: TransactionCategory[] = [
      "Food & Dining", "Food & Dining", "Food & Dining", "Food & Dining", "Food & Dining",
      "Transport", "Transport", "Transport",
      "Entertainment", "Entertainment",
      "Shopping", "Shopping",
      "Bills & Utilities", "Bills & Utilities", "Bills & Utilities",
      "Health",
      "Education",
    ];

    const amountRanges: Record<string, [number, number]> = {
      "Food & Dining": [12, 85],
      Transport: [8, 55],
      Entertainment: [9.99, 45],
      Shopping: [15, 180],
      "Bills & Utilities": [45, 1450],
      Health: [25, 120],
      Education: [12, 50],
    };

    expenseCategories.forEach((cat, i) => {
      const [min, max] = amountRanges[cat];
      const mList = merchants[cat];
      const day = Math.min(28, Math.floor(Math.random() * 28) + 1);
      txns.push({
        id: `exp-${monthOffset}-${i}`,
        date: new Date(month.getFullYear(), month.getMonth(), day).toISOString().split("T")[0],
        merchant: mList[Math.floor(Math.random() * mList.length)],
        category: cat,
        amount: randomBetween(min, max),
        type: "expense",
      });
    });
  }

  return txns.sort((a, b) => b.date.localeCompare(a.date));
}

export const transactions = generateTransactions();

export const currentMonthTransactions = (() => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
})();

export const totalBalance = 14_847.32;

export const monthlyIncome = currentMonthTransactions
  .filter((t) => t.type === "income")
  .reduce((s, t) => s + t.amount, 0);

export const monthlyExpenses = currentMonthTransactions
  .filter((t) => t.type === "expense")
  .reduce((s, t) => s + t.amount, 0);

export const savingsRate = Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100);

export const healthScore = 72;

export const categoryBreakdown = (() => {
  const map: Record<string, number> = {};
  currentMonthTransactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
})();

export const monthlyTrend = (() => {
  const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  return months.map((m, i) => ({
    month: m,
    income: [7200, 7700, 8100, 7700, 8550, monthlyIncome][i] || 7700,
    expenses: [5800, 6200, 7100, 5900, 5400, monthlyExpenses][i] || 5800,
  }));
})();

export const goals: Goal[] = [
  { id: "1", name: "Emergency Fund", target: 15000, current: 9600, icon: "🛡️", deadline: "2026-09-01" },
  { id: "2", name: "New Laptop", target: 2200, current: 1408, icon: "💻", deadline: "2026-06-01" },
  { id: "3", name: "Vacation Fund", target: 5000, current: 1750, icon: "✈️", deadline: "2026-12-01" },
  { id: "4", name: "Investment Portfolio", target: 10000, current: 3200, icon: "📈", deadline: "2027-03-01" },
];

export const smartAlerts = [
  {
    id: "1",
    type: "warning" as const,
    message: "You've spent 28% more on Food & Dining compared to your 3-month average.",
    action: "View breakdown",
  },
  {
    id: "2",
    type: "success" as const,
    message: `At your current rate, you'll save $${Math.round((monthlyIncome - monthlyExpenses) * 0.92)} this month.`,
    action: "See projection",
  },
  {
    id: "3",
    type: "info" as const,
    message: "Your Netflix subscription renewed at $15.99. You've used it 3 times this month.",
    action: "Review subscriptions",
  },
  {
    id: "4",
    type: "warning" as const,
    message: "Predicted end-of-month balance: $13,210. That's $640 below your target buffer.",
    action: "Adjust budget",
  },
];

export const financialContext = `
User Financial Profile:
- Monthly Income: ~$${monthlyIncome.toLocaleString()}
- Monthly Expenses: ~$${monthlyExpenses.toLocaleString()}
- Savings Rate: ${savingsRate}%
- Total Balance: $${totalBalance.toLocaleString()}
- Financial Health Score: ${healthScore}/100
- Top spending categories: ${categoryBreakdown.slice(0, 3).map((c) => `${c.name} ($${c.value})`).join(", ")}
- Active goals: Emergency Fund (64% done), New Laptop (64% done), Vacation (35% done), Investment Portfolio (32% done)
- Recent patterns: Spending on food is 28% above 3-month average. Transport costs are stable. Entertainment spending is low this month.
- Predicted end-of-month balance: $13,210
`;
