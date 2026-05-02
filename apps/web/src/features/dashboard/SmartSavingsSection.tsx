import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BetaBadge from "@/components/BetaBadge";
import { ArrowRight, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface Challenge {
  id: string;
  title: string;
  description: string;
  target_savings: number;
  potential_impact: string;
  category: string;
  action_cta: string;
}

export function SmartSavingsSection() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChallenges() {
      try {
        const { data, error } = await supabase.functions.invoke("generate-savings-plan");
        if (error) throw error;
        setChallenges(data || []);
      } catch (err) {
        console.error("Failed to fetch challenges:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchChallenges();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mt-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-[2rem]" />)}
      </div>
    );
  }

  if (!challenges || challenges.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-2">
        <h2 className="text-xl font-bold tracking-tight">Smart Savings Challenges</h2>
        <BetaBadge />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {challenges.map((challenge, index) => (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full rounded-[2rem] border-border/80 bg-card/95 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="rounded-full bg-primary/5 text-primary border-primary/10">
                    {challenge.category}
                  </Badge>
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-lg mt-2">{challenge.title}</CardTitle>
                <CardDescription className="line-clamp-2">{challenge.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">Target Savings</p>
                    <p className="text-2xl font-bold text-foreground">${challenge.target_savings}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">Impact</p>
                    <p className="text-sm font-bold text-primary">{challenge.potential_impact}</p>
                  </div>
                </div>
                <Button className="w-full rounded-2xl gap-2 font-bold group">
                  {challenge.action_cta}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
