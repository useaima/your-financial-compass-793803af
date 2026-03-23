import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQSection({ faqs, className }: { faqs: FAQItem[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className={cn("space-y-2", className)}>
      {faqs.map((faq, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-xl overflow-hidden"
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex items-center justify-between w-full px-5 py-4 text-left"
          >
            <span className="text-sm font-medium text-foreground pr-4">{faq.question}</span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200",
                open === i && "rotate-180"
              )}
            />
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
