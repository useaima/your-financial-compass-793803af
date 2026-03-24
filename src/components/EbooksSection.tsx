import { motion } from "framer-motion";
import { BookOpen, ExternalLink } from "lucide-react";

const ebooks = [
  {
    title: "Rich Dad Poor Dad",
    author: "Robert Kiyosaki",
    description: "What the rich teach their kids about money that the poor and middle class do not.",
    color: "hsl(var(--primary))",
    url: "https://www.amazon.com/Rich-Dad-Poor-Teach-Middle/dp/1612680194",
  },
  {
    title: "The Intelligent Investor",
    author: "Benjamin Graham",
    description: "The definitive book on value investing, with timeless wisdom for the stock market.",
    color: "hsl(38 75% 55%)",
    url: "https://www.amazon.com/Intelligent-Investor-Definitive-Investing-Essentials/dp/0060555661",
  },
  {
    title: "Think and Grow Rich",
    author: "Napoleon Hill",
    description: "Distilled wisdom from over 500 of America's most successful individuals.",
    color: "hsl(280 60% 50%)",
    url: "https://www.amazon.com/Think-Grow-Rich-Landmark-Bestseller/dp/1585424331",
  },
  {
    title: "The Psychology of Money",
    author: "Morgan Housel",
    description: "Timeless lessons on wealth, greed, and happiness through 19 short stories.",
    color: "hsl(200 60% 45%)",
    url: "https://www.amazon.com/Psychology-Money-Timeless-lessons-happiness/dp/0857197681",
  },
  {
    title: "The Total Money Makeover",
    author: "Dave Ramsey",
    description: "A proven plan for financial fitness with practical steps to get out of debt.",
    color: "hsl(350 60% 50%)",
    url: "https://www.amazon.com/Total-Money-Makeover-Classic-Financial/dp/1595555277",
  },
  {
    title: "I Will Teach You to Be Rich",
    author: "Ramit Sethi",
    description: "A 6-week program for 20-to-35-year-olds covering banking, saving, budgeting, and investing.",
    color: "hsl(120 40% 40%)",
    url: "https://www.amazon.com/Will-Teach-You-Rich-Second/dp/1523505745",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function EbooksSection() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Recommended Reads
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ebooks.map((book, i) => (
          <motion.a
            key={book.title}
            href={book.url}
            target="_blank"
            rel="noopener noreferrer"
            custom={i}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="group bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-colors flex gap-3"
          >
            <div
              className="w-10 h-14 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold text-primary-foreground"
              style={{ background: book.color }}
            >
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
                  {book.title}
                </h3>
                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{book.author}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">
                {book.description}
              </p>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
