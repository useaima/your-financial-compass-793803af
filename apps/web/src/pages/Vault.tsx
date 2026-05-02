import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { motion } from "framer-motion";
import { FileText, Upload, Search, Lock, ShieldCheck, MoreVertical, Trash2, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BetaBadge from "@/components/BetaBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface VaultDocument {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: string;
  is_verified: boolean;
  created_at: string;
}

export default function Vault() {
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      const { data, error } = await supabase
        .from("vault_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error("Error fetching documents:", err);
      toast.error("Could not load your vault documents.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      // 1. Upload to storage (assumes 'vault' bucket exists)
      const { error: uploadError } = await supabase.storage
        .from('vault')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Insert record
      const { error: dbError } = await supabase.from('vault_documents').insert({
        user_id: user.id,
        name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        category: 'other'
      });

      if (dbError) throw dbError;

      toast.success("Document uploaded to your secure vault.");
      fetchDocuments();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload document.");
    } finally {
      setUploading(false);
    }
  }

  const filteredDocs = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 px-6 pb-20 pt-8 md:pt-12">
      <SEO title="Document Vault" description="Secure, AI-powered document storage for your financial life." />

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Document Vault</h1>
            <BetaBadge size="md" />
          </div>
          <p className="text-muted-foreground max-w-xl">
            Store receipts, contracts, and statements. EVA automatically extracts key data for your finance records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Input
              placeholder="Search vault..."
              className="w-full md:w-64 rounded-2xl pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <Button className="rounded-2xl gap-2 shadow-lg shadow-primary/20" asChild disabled={uploading}>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload"}
              <input type="file" className="hidden" onChange={handleUpload} />
            </label>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-[1.8rem]" />)}
            </div>
          ) : filteredDocs.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredDocs.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative flex items-center gap-4 rounded-[1.8rem] border border-border/80 bg-card/95 p-4 transition-all hover:border-primary/20 hover:shadow-md"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold py-0 h-4">{doc.category}</Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-border/60 bg-card/40 p-20 text-center">
              <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
                <FileText className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Your vault is empty</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Upload your first document to start organizing your financial records with AI assistance.
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <Card className="rounded-[2rem] border-primary/20 bg-primary/5 shadow-none">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Security First</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                All documents in your vault are encrypted and only accessible by you. EVA analyzes them locally within your private session.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  AES-256 Encryption
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Private Data Isolation
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground italic">
                "Upload a few receipts or a bank statement. I can help you reconcile them with your transaction history automatically."
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
