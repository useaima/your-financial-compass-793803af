import { motion } from "framer-motion";
import { HelpCircle, Mail, MessageSquare } from "lucide-react";

export default function HelpSupport() {
  return (
    <div className="p-4 md:p-8 max-w-[800px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-bold tracking-tight">Help & Support</h1>
        <p className="text-sm text-muted-foreground mt-1">Get assistance with your eva account</p>
      </motion.div>

      <div className="grid gap-4">
        {[
          { icon: MessageSquare, title: "Chat with AI Advisor", desc: "Ask your AI advisor any financial question in the chat tab." },
          { icon: Mail, title: "Contact Support", desc: "Email us at support@useaima.com for account issues." },
          { icon: HelpCircle, title: "FAQs", desc: "Common questions about spending analysis, goals, and budgets." },
        ].map((item) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-5 flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
