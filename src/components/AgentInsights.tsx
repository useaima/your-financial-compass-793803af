import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertTriangle, Lightbulb, Trophy, Bell, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'insight' | 'warning' | 'tip' | 'achievement';
  is_read: boolean;
  created_at: string;
}

const typeIcons = {
  insight: Sparkles,
  warning: AlertTriangle,
  tip: Lightbulb,
  achievement: Trophy,
};

const typeColors = {
  insight: "text-primary",
  warning: "text-accent",
  tip: "text-blue-400",
  achievement: "text-yellow-400",
};

export default function AgentInsights() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchNotifications() {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  }

  async function deleteNotification(id: string) {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 bg-card rounded-xl border border-border" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Your AI Agent is Analyzing...</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Log some spending to receive personalized financial insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-primary" />
          Agent Advisor Insights
        </h2>
      </div>
      
      <div className="grid gap-2">
        <AnimatePresence initial={false}>
          {notifications.map((n, i) => {
            const Icon = typeIcons[n.type] || Bell;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "bg-card rounded-xl border border-border p-4 flex items-start gap-4 group hover:border-primary/30 transition-all",
                  !n.is_read && "border-l-primary/50 border-l-4"
                )}
              >
                <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 mt-0.5", typeColors[n.type])}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground leading-tight">{n.title}</h3>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.is_read && (
                        <button 
                          onClick={() => markAsRead(n.id)}
                          className="p-1 hover:bg-primary/10 rounded text-primary transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteNotification(n.id)}
                        className="p-1 hover:bg-destructive/10 rounded text-destructive transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {n.body}
                  </p>
                  <span className="text-[10px] text-muted-foreground/60 mt-2 block uppercase tracking-tighter">
                    {new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
