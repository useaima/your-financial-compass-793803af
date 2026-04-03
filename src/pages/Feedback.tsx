import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

export default function Feedback() {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (!message.trim()) return;
    // Mock submit
    setSent(true);
    toast.success("Thank you for your feedback!");
  };

  return (
    <div className="p-4 md:p-8 max-w-[600px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-bold tracking-tight">Feedback</h1>
        <p className="text-sm text-muted-foreground mt-1">Help us improve eva</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="bg-card border border-border rounded-xl p-6 space-y-4"
      >
        {sent ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-lg font-semibold text-foreground">Thanks for your feedback! 🎉</p>
            <p className="text-sm text-muted-foreground">We read every message.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setSent(false); setMessage(""); }}>
              Send another
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Your feedback</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What would you like us to improve?"
                rows={5}
              />
            </div>
            <Button className="w-full gap-2" onClick={handleSubmit} disabled={!message.trim()}>
              <Send className="w-4 h-4" /> Submit feedback
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}
