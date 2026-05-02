import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Sparkles, AlertCircle, CheckCircle2, Clock, Info } from "lucide-react";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { toast } from "sonner";
import BetaBadge from "@/components/BetaBadge";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface ShoppingResult {
  verdict: "buy" | "wait" | "avoid";
  reasoning: string;
  savings_tip: string;
  competitor_hint?: string;
  impact_score: number;
}

export function ShoppingAssistantSection() {
  const [item, setItem] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShoppingResult | null>(null);

  const handleCheck = async () => {
    if (!item || !price) {
      toast.error("Please enter both item name and price.");
      return;
    }

    setLoading(true);
    try {
      const data = await invokeEdgeFunction<ShoppingResult>("generate-shopping-advice", {
        item,
        price: parseFloat(price),
        category: "general"
      });
      setResult(data);
    } catch (err) {
      console.error("Shopping check failed:", err);
      toast.error("Could not get shopping advice.");
    } finally {
      setLoading(false);
    }
  };

  const getVerdictDetails = (verdict: ShoppingResult["verdict"]) => {
    switch (verdict) {
      case "buy":
        return { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Buy Now" };
      case "wait":
        return { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", label: "Wait for Sale" };
      case "avoid":
        return { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Avoid" };
    }
  };

  return (
    <Card className="overflow-hidden rounded-[2.5rem] border-border/80 bg-card/95 shadow-xl shadow-black/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Shopping Assistant</CardTitle>
              <CardDescription>AI-powered purchase advice</CardDescription>
            </div>
          </div>
          <BetaBadge />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row">
          <Input
            placeholder="What are you buying?"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            className="rounded-2xl border-border/60 bg-background/50"
          />
          <Input
            placeholder="Price ($)"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full md:w-32 rounded-2xl border-border/60 bg-background/50"
          />
          <Button
            onClick={handleCheck}
            disabled={loading}
            className="rounded-2xl gap-2 shadow-lg shadow-primary/20"
          >
            {loading ? <Sparkles className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Check
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 rounded-[1.8rem] border border-border/60 bg-secondary/20 p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const { icon: Icon, color, bg, label } = getVerdictDetails(result.verdict);
                    return (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${bg} ${color} text-xs font-bold uppercase`}>
                        <Icon className="h-4 w-4" />
                        {label}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  Impact Score
                  <Badge variant="outline" className="h-5 px-1.5 font-bold">{result.impact_score}/10</Badge>
                </div>
              </div>

              <p className="text-sm font-medium leading-relaxed text-foreground">
                {result.reasoning}
              </p>

              <div className="flex items-start gap-3 rounded-2xl bg-primary/5 p-3 text-xs border border-primary/10">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-primary">EVA's Tip</p>
                  <p className="text-muted-foreground">{result.savings_tip}</p>
                </div>
              </div>

              {result.competitor_hint && (
                <p className="text-[11px] text-muted-foreground italic">
                  * Hint: {result.competitor_hint}
                </p>
              )}
            </motion.div>
          ) : !loading && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 opacity-20 mb-3" />
              <p className="text-sm">Enter an item and price to get personalized advice.</p>
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
