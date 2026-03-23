import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { TrendingUp, Brain, Shield, Target, ArrowRight, Sparkles } from "lucide-react";
import FAQSection from "@/components/FAQSection";
import { landingFAQs } from "@/data/faqData";

const features = [
  { icon: Brain, title: "AI-Powered Insights", desc: "Get personalized financial advice from your intelligent advisor, 24/7." },
  { icon: TrendingUp, title: "Smart Analytics", desc: "Track spending patterns, predict balances, and optimize your finances." },
  { icon: Target, title: "Goal Planning", desc: "Set savings goals and get AI-generated strategies to reach them faster." },
  { icon: Shield, title: "Financial Health Score", desc: "Monitor your financial wellness with a real-time health score." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-[1200px] mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            F
          </div>
          <span className="font-semibold text-foreground tracking-tight text-[15px]">FinanceAI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/signin">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" className="gap-1.5">
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-24 max-w-[1200px] mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
            <Sparkles className="w-3.5 h-3.5" /> AI-Powered Financial Intelligence
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1] max-w-3xl mx-auto text-balance">
            Your money, managed by <span className="text-primary">intelligence</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            FinanceAI analyzes your spending, predicts your future, and gives you actionable advice — all in one beautiful dashboard.
          </p>
          <div className="flex items-center justify-center gap-3 pt-4">
            <Link to="/signup">
              <Button size="lg" className="gap-2 px-8">
                Start for free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/signin">
              <Button variant="outline" size="lg" className="px-8">
                Sign in
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="bg-card border border-border rounded-xl p-6 space-y-3 hover:border-primary/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="px-6 pb-24 max-w-[800px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-foreground text-center mb-2">Frequently Asked Questions</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">Everything you need to know about FinanceAI</p>
          <FAQSection faqs={landingFAQs} />
        </motion.div>
      </section>

      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© 2026 FinanceAI. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
