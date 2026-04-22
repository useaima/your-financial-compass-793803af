import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BrandLockup from "@/components/BrandLockup";
import { motion } from "framer-motion";
import { TrendingUp, Brain, Shield, Target, ArrowRight, Sparkles } from "lucide-react";
import FAQSection from "@/components/FAQSection";
import { landingFAQs } from "@/data/faqData";
import SEO, { generateFAQSchema, generateOrganizationSchema } from "@/components/SEO";
import { usePublicUser } from "@/context/PublicUserContext";

const features = [
  { icon: Brain, title: "AI-Powered Insights", desc: "Understand your money with clear advice on spending patterns, habits, and next best moves." },
  { icon: TrendingUp, title: "Cashflow Visibility", desc: "Track balances, forecast what is coming next, and spot trends before they become stressful." },
  { icon: Target, title: "Goal Guidance", desc: "Turn savings goals into realistic plans with steady progress and fewer surprises." },
  { icon: Shield, title: "Calmer Decisions", desc: "Keep your finances in one place with warm, focused guidance that stays easy to act on." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Landing() {
  const { bootstrap, isAuthenticated } = usePublicUser();
  const faqSchema = generateFAQSchema(landingFAQs.map((f) => ({ question: f.question, answer: f.answer })));
  const orgSchema = generateOrganizationSchema();
  const workspacePath = isAuthenticated
    ? bootstrap.has_onboarded
      ? "/dashboard"
      : "/onboarding"
    : "/auth?mode=signin";
  const signInPath = "/auth?mode=signin";
  const signUpPath = "/auth?mode=signup";
  const primaryCta = isAuthenticated ? "Open workspace" : "Sign up";
  const secondaryCta = isAuthenticated ? "Continue setup" : "Sign in";

  return (
    <>
      <SEO
        title="Your AI Finance Assistant"
        description="eva is your AI finance assistant for spending clarity, planning confidence, and calmer cashflow decisions."
        schema={{ "@graph": [orgSchema, faqSchema] }}
        geo={{ region: "US", placename: "United States" }}
      />
      <div className="relative min-h-screen overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[36rem]">
          <div className="absolute left-1/2 top-[-11rem] h-[30rem] w-[48rem] -translate-x-1/2 rounded-full bg-primary/14 blur-3xl" />
          <div className="absolute right-[8%] top-24 h-56 w-56 rounded-full bg-[hsl(28_73%_38%/.09)] blur-3xl" />
        </div>

        <nav className="sticky top-0 z-20 mx-auto flex max-w-[1200px] items-center justify-between border-b border-border/70 bg-background/78 px-6 py-4 backdrop-blur-xl">
          <BrandLockup
            loading="eager"
            size="sm"
            subtitleClassName="text-[0.58rem] tracking-[0.18em]"
            titleClassName="text-[1.2rem]"
          />
          <div className="flex items-center gap-3">
            <Link to={isAuthenticated ? workspacePath : signInPath}>
              <Button variant="ghost" size="sm">{isAuthenticated ? "Workspace" : "Sign in"}</Button>
            </Link>
            <Link to={isAuthenticated ? workspacePath : signUpPath}>
              <Button size="sm" className="gap-1.5">
                {primaryCta} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </nav>

        <main>
          <section className="mx-auto max-w-[1200px] px-6 pb-24 pt-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-7"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Your AI Finance Assistant
            </div>

              <BrandLockup
                align="center"
                fetchPriority="high"
                loading="eager"
                size="lg"
                iconClassName="h-16 w-16 md:h-20 md:w-20"
                subtitleClassName="text-[0.72rem] tracking-[0.3em]"
                titleClassName="text-[2.35rem] md:text-[3rem]"
              />

            <h1 className="mx-auto max-w-4xl text-balance text-4xl font-bold leading-[1.05] text-foreground md:text-6xl">
              Clarity for spending, <span className="text-primary">planning</span>, and calmer cashflow.
            </h1>

            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
              eva helps you understand where money is going, what is coming next, and which decisions deserve your attention now.
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link to={isAuthenticated ? workspacePath : signUpPath}>
                <Button size="lg" className="gap-2 px-8">
                  {primaryCta} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to={isAuthenticated ? workspacePath : signInPath}>
                <Button variant="outline" size="lg" className="px-8">
                  {secondaryCta}
                </Button>
              </Link>
            </div>

            <div className="mx-auto mt-10 flex max-w-4xl flex-col items-center gap-6 rounded-[2rem] border border-border/80 bg-card/88 px-6 py-7 shadow-[0_30px_80px_-48px_rgba(110,73,75,0.36)] backdrop-blur">
              <div className="rounded-[1.5rem] border border-primary/10 bg-background/80 px-5 py-4 shadow-[0_18px_44px_-36px_rgba(110,73,75,0.28)]">
                <BrandLockup align="center" size="md" />
              </div>

              <div className="w-full flex flex-col md:flex-row gap-6 items-center justify-center py-6">
                <div className="relative group overflow-hidden rounded-2xl border border-border/60 shadow-xl transition-all hover:scale-[1.02]">
                  <img src="/images/dashboard_mockup.png" alt="EVA Dashboard" className="w-64 h-auto object-cover rounded-2xl" />
                </div>
                <div className="relative group overflow-hidden rounded-2xl border border-border/60 shadow-xl transition-all hover:scale-[1.02]">
                  <img src="/images/subscriptions_mockup.png" alt="EVA Subscriptions" className="w-64 h-auto object-cover rounded-2xl" />
                </div>
              </div>

              <div className="grid gap-4 text-left md:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Understand</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">See where money is actually going</p>
                  <p className="mt-1 text-sm text-muted-foreground">Log spending naturally and keep every decision grounded in clear category trends.</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Plan</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">Look ahead with confidence</p>
                  <p className="mt-1 text-sm text-muted-foreground">Forecast balances, savings targets, and budget pressure before surprises hit.</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Grow</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">Build calmer long-term habits</p>
                  <p className="mt-1 text-sm text-muted-foreground">Turn day-to-day decisions into steadier momentum with practical AI guidance.</p>
                </div>
              </div>
            </div>
          </motion.div>
          </section>

          <section className="mx-auto max-w-[1200px] px-6 pb-24">
            <div className="mb-8 max-w-2xl">
              <h2 className="text-2xl font-bold text-foreground">What eva helps you do every day</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Stay grounded in the numbers, understand what changed, and move from reactive spending to calmer planning.
              </p>
            </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="space-y-3 rounded-[1.25rem] border border-border bg-card/88 p-6 shadow-[0_20px_50px_-40px_rgba(110,73,75,0.36)] transition-all hover:-translate-y-0.5 hover:border-primary/30"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
          </section>

          <section className="mx-auto max-w-[800px] px-6 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-2 text-center text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
            <p className="mb-8 text-center text-sm text-muted-foreground">Everything you need to know about eva</p>
            <FAQSection faqs={landingFAQs} />
          </motion.div>
          </section>
        </main>

        <footer className="border-t border-border px-6 py-8">
          <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-xs text-muted-foreground">© 2026 eva. All rights reserved.</p>
            <div className="flex gap-4">
              <Link to="/terms" className="text-xs text-muted-foreground transition-colors hover:text-foreground">Terms</Link>
              <Link to="/privacy" className="text-xs text-muted-foreground transition-colors hover:text-foreground">Privacy</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
