import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BrandLockup from "@/components/BrandLockup";
import { motion } from "framer-motion";
import { TrendingUp, Brain, Shield, Target, ArrowRight, Sparkles } from "lucide-react";
import FAQSection from "@/components/FAQSection";
import { landingFAQs } from "@/data/faqData";
import { SEO, generateFAQSchema, generateOrganizationSchema } from "@/components/SEO";
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
      <div className="relative min-h-screen overflow-x-hidden bg-background">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

        <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 shadow-sm backdrop-blur-xl">
          <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
            <BrandLockup
              size="sm"
              iconClassName="h-8 w-8"
              subtitleClassName="text-[0.58rem] tracking-[0.18em]"
              titleClassName="text-[1.2rem]"
            />
            <div className="flex items-center gap-3">
              <Link to={isAuthenticated ? workspacePath : signInPath}>
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  {isAuthenticated ? "Workspace" : "Sign in"}
                </Button>
              </Link>
              <Link to={isAuthenticated ? workspacePath : signUpPath}>
                <Button size="sm" className="gap-1.5 shadow-md">
                  {primaryCta} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </nav>
        </header>

        <main>
          <section data-testid="landing-hero" className="mx-auto max-w-[1200px] px-6 pb-24 pt-20 text-center md:pt-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary shadow-[0_4px_12px_-4px_rgba(var(--primary),0.2)]">
                <Sparkles className="h-3.5 w-3.5" />
                Your AI Finance Assistant
              </div>

              <BrandLockup
                align="center"
                fetchPriority="high"
                loading="eager"
                size="lg"
                iconClassName="h-16 w-16 md:h-20 md:w-20"
                subtitleClassName="text-[0.72rem] tracking-[0.3em]"
                titleClassName="text-[2.35rem] md:text-[3.5rem]"
              />

              <h1 className="mx-auto max-w-4xl text-balance text-4xl font-bold leading-[1.05] tracking-tight text-foreground md:text-7xl">
                Clarity for spending, <span className="text-primary">planning</span>, and calmer cashflow.
              </h1>

              <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                eva helps you understand where money is going, what is coming next, and which decisions deserve your attention now.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
                <Link to={isAuthenticated ? workspacePath : signUpPath} className="w-full sm:w-auto">
                  <Button data-testid="landing-primary-cta" size="lg" className="h-14 w-full gap-2 px-10 text-base shadow-lg sm:w-auto">
                    {primaryCta} <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to={isAuthenticated ? workspacePath : signInPath} className="w-full sm:w-auto">
                  <Button data-testid="landing-secondary-cta" variant="outline" size="lg" className="h-14 w-full px-10 text-base sm:w-auto">
                    {secondaryCta}
                  </Button>
                </Link>
              </div>

              <div className="mx-auto mt-16 flex max-w-4xl flex-col items-center gap-8 rounded-[2.5rem] border border-border/60 bg-card/40 px-6 py-10 shadow-[0_40px_100px_-40px_rgba(110,73,75,0.25)] backdrop-blur-2xl">
                <div className="rounded-[1.8rem] border border-primary/20 bg-background/90 px-6 py-5 shadow-inner">
                  <BrandLockup align="center" size="md" />
                </div>

                <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="group relative overflow-hidden rounded-3xl border border-border/40 shadow-2xl transition-all duration-500 hover:scale-[1.03] hover:shadow-primary/10">
                    <img src="/images/dashboard_mockup.png" alt="EVA Dashboard Overview" className="aspect-[4/3] w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div className="group relative overflow-hidden rounded-3xl border border-border/40 shadow-2xl transition-all duration-500 hover:scale-[1.03] hover:shadow-primary/10">
                    <img src="/images/subscriptions_mockup.png" alt="EVA Subscriptions Management" className="aspect-[4/3] w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>

                <div className="grid gap-8 text-left md:grid-cols-3">
                  <article>
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Understand</p>
                    <h3 className="mt-2.5 text-base font-bold text-foreground">See where money is actually going</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Log spending naturally and keep every decision grounded in clear category trends.</p>
                  </article>
                  <article>
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Plan</p>
                    <h3 className="mt-2.5 text-base font-bold text-foreground">Look ahead with confidence</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Forecast balances, savings targets, and budget pressure before surprises hit.</p>
                  </article>
                  <article>
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Grow</p>
                    <h3 className="mt-2.5 text-base font-bold text-foreground">Build calmer long-term habits</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Turn day-to-day decisions into steadier momentum with practical AI guidance.</p>
                  </article>
                </div>
              </div>
            </motion.div>
          </section>

          <section className="mx-auto max-w-[1200px] px-6 py-24">
            <header className="mb-12 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">What eva helps you do every day</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Stay grounded in the numbers, understand what changed, and move from reactive spending to calmer planning.
              </p>
            </header>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, i) => (
                <motion.article
                  key={feature.title}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="group flex flex-col gap-4 rounded-[1.75rem] border border-border/80 bg-card/60 p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:bg-card/80 hover:shadow-xl"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 shadow-sm ring-1 ring-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-[900px] px-6 py-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-[3rem] border border-border/60 bg-card/30 p-8 md:p-12 shadow-inner backdrop-blur-sm"
            >
              <header className="mb-12 text-center">
                <h2 className="text-3xl font-bold text-foreground">Frequently Asked Questions</h2>
                <p className="mt-3 text-muted-foreground">Everything you need to know about eva</p>
              </header>
              <FAQSection faqs={landingFAQs} />
            </motion.div>
          </section>
        </main>

        <footer className="border-t border-border/40 bg-card/20 px-6 py-12 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex flex-col items-center gap-4 md:items-start">
              <BrandLockup size="sm" iconClassName="h-6 w-6" />
              <p className="text-sm text-muted-foreground">© 2026 eva. Built for calmer finance.</p>
            </div>
            <nav className="flex items-center gap-8">
              <Link to="/terms" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">Terms</Link>
              <Link to="/privacy" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">Privacy</Link>
              <a href="https://twitter.com/eva_finance" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">Twitter</a>
            </nav>
          </div>
        </footer>
      </div>
    </>
  );
}
