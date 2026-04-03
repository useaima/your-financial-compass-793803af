import { useState } from "react";
import { motion } from "framer-motion";
import { Newspaper, Loader2, RefreshCw, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { hasSupabaseConfig, SUPABASE_SETUP_MESSAGE, supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NewsArticle {
  title: string;
  summary: string;
  source: string;
  source_url: string;
  category: string;
  published_ago: string;
  sentiment: "bullish" | "bearish" | "neutral";
}

const sentimentConfig = {
  bullish: { icon: TrendingUp, label: "Bullish", class: "text-primary bg-primary/10" },
  bearish: { icon: TrendingDown, label: "Bearish", class: "text-destructive bg-destructive/10" },
  neutral: { icon: Minus, label: "Neutral", class: "text-muted-foreground bg-secondary" },
};

const categoryColors: Record<string, string> = {
  Markets: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Economy: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Crypto: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "Personal Finance": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Tech: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  Commodities: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Real Estate": "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  Policy: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

export default function News() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("All");

  const fetchNews = async () => {
    if (!hasSupabaseConfig) {
      toast.error(SUPABASE_SETUP_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-finance-news");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setArticles(data.articles || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch news");
    } finally {
      setLoading(false);
    }
  };

  const categories = ["All", ...new Set(articles.map((a) => a.category))];
  const filtered = filter === "All" ? articles : articles.filter((a) => a.category === filter);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-24 md:pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance News</h1>
          <p className="text-sm text-muted-foreground mt-1">Trending articles from top financial outlets</p>
        </div>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : articles.length ? <RefreshCw className="w-4 h-4" /> : <Newspaper className="w-4 h-4" />}
          {articles.length ? "Refresh" : "Load News"}
        </button>
      </motion.div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Fetching latest finance news...</p>
        </div>
      )}

      {!loading && !articles.length && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/12 flex items-center justify-center">
            <Newspaper className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground max-w-sm">
            Get the latest trending finance news from Yahoo Finance, Reuters, Forbes, and more.
          </p>
        </div>
      )}

      {!loading && articles.length > 0 && (
        <>
          {/* Category filter */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  filter === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </motion.div>

          {/* Articles */}
          <div className="space-y-4">
            {filtered.map((article, i) => {
              const sentiment = sentimentConfig[article.sentiment];
              const SentimentIcon = sentiment.icon;
              return (
                <motion.a
                  key={i}
                  href={article.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="block rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider", categoryColors[article.category] || "bg-secondary text-muted-foreground")}>
                          {article.category}
                        </span>
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1", sentiment.class)}>
                          <SentimentIcon className="w-3 h-3" />
                          {sentiment.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{article.published_ago}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                        {article.summary}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-[10px] font-medium text-muted-foreground">{article.source}</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                </motion.a>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
