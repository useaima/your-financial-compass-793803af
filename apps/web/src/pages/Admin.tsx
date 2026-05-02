import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { motion } from "framer-motion";
import {
  Users,
  Megaphone,
  Link as LinkIcon,
  Settings2,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicUser } from "@/context/PublicUserContext";
import { Navigate } from "react-router-dom";

export default function Admin() {
  const { isAdmin, authLoading } = usePublicUser();
  const [activeTab, setActiveTab] = useState("crm");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isAdmin) {
      fetchData(activeTab);
    }
  }, [isAdmin, activeTab]);

  async function fetchData(tab: string) {
    setLoading(true);
    try {
      let query;
      if (tab === "crm") {
        query = supabase.from("contact_crm_records").select("*");
      } else if (tab === "announcements") {
        query = supabase.from("app_announcements").select("*");
      } else if (tab === "help") {
        query = supabase.from("app_help_links").select("*");
      } else if (tab === "config") {
        query = supabase.from("app_config_flags").select("*");
      }

      if (query) {
        const { data: result, error } = await query.order("created_at", { ascending: false });
        if (error) throw error;
        setData(result || []);
      }
    } catch (err) {
      console.error(`Error fetching ${tab}:`, err);
      toast.error(`Could not load ${tab} data.`);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-6 pb-20 pt-8 md:pt-12">
      <SEO title="Ops Dashboard" description="Admin management for Eva application." />

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Ops Dashboard</h1>
          </div>
          <p className="text-muted-foreground max-w-xl">
            Manage announcements, help resources, application flags, and CRM records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Input
              placeholder={`Search ${activeTab}...`}
              className="w-full md:w-64 rounded-2xl pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <Button className="rounded-2xl gap-2 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" />
            New Entry
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card/50 p-1 rounded-2xl border border-border/50">
          <TabsTrigger value="crm" className="rounded-xl gap-2 px-6">
            <Users className="h-4 w-4" />
            CRM
          </TabsTrigger>
          <TabsTrigger value="announcements" className="rounded-xl gap-2 px-6">
            <Megaphone className="h-4 w-4" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="help" className="rounded-xl gap-2 px-6">
            <LinkIcon className="h-4 w-4" />
            Help Links
          </TabsTrigger>
          <TabsTrigger value="config" className="rounded-xl gap-2 px-6">
            <Settings2 className="h-4 w-4" />
            Config
          </TabsTrigger>
        </TabsList>

        <div className="min-h-[400px]">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
          ) : (
            <TabsContent value={activeTab} className="mt-0 outline-none">
              <Card className="rounded-[2.5rem] border-border/80 bg-card/95 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-muted/30 border-b border-border/50">
                        <tr>
                          {activeTab === "crm" && (
                            <>
                              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">User</th>
                              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Status</th>
                              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Last Contact</th>
                              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground text-right">Actions</th>
                            </>
                          )}
                          {activeTab === "announcements" && (
                            <>
                              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Title</th>
                              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Audience</th>
                              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Active</th>
                              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground text-right">Actions</th>
                            </>
                          )}
                          {activeTab === "help" && (
                            <>
                              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Label</th>
                              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Key</th>
                              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Category</th>
                              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground text-right">Actions</th>
                            </>
                          )}
                          {activeTab === "config" && (
                            <>
                              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Flag Key</th>
                              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Value</th>
                              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Last Updated</th>
                              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground text-right">Actions</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {data.length > 0 ? data.map((item, idx) => (
                          <tr key={item.id} className="group hover:bg-primary/5 transition-colors">
                            {activeTab === "crm" && (
                              <>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-foreground">{item.full_name || 'Anonymous User'}</span>
                                    <span className="text-xs text-muted-foreground">{item.email}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <Badge variant="secondary" className="rounded-lg capitalize">{item.status}</Badge>
                                </td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">
                                  {item.last_contacted_at ? new Date(item.last_contacted_at).toLocaleDateString() : 'Never'}
                                </td>
                              </>
                            )}
                            {activeTab === "announcements" && (
                              <>
                                <td className="px-6 py-4 font-bold text-foreground">{item.title}</td>
                                <td className="px-6 py-4">
                                  <Badge variant="outline" className="rounded-lg">{item.audience}</Badge>
                                </td>
                                <td className="px-6 py-4">
                                  {item.is_active ?
                                    <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                                  }
                                </td>
                              </>
                            )}
                            {activeTab === "help" && (
                              <>
                                <td className="px-6 py-4 font-bold text-foreground">{item.label}</td>
                                <td className="px-6 py-4 font-mono text-xs">{item.key}</td>
                                <td className="px-6 py-4">
                                  <Badge variant="secondary" className="rounded-lg">{item.category}</Badge>
                                </td>
                              </>
                            )}
                            {activeTab === "config" && (
                              <>
                                <td className="px-6 py-4 font-bold text-foreground">{item.key}</td>
                                <td className="px-6 py-4">
                                  <div className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                                    {JSON.stringify(item.value)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">
                                  {new Date(item.updated_at).toLocaleDateString()}
                                </td>
                              </>
                            )}
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                              No entries found in this section.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
