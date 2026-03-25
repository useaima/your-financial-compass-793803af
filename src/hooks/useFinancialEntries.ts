import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { AssetEntry, LiabilityEntry } from "@/components/financial/ManualEntryForm";

export function useFinancialEntries() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetEntry[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("financial_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load entries");
      setLoading(false);
      return;
    }

    const a: AssetEntry[] = [];
    const l: LiabilityEntry[] = [];
    for (const row of data || []) {
      if (row.entry_type === "asset") {
        a.push({ id: row.id, name: row.name, type: row.type, value: Number(row.value), cashflow: Number(row.cashflow), description: row.description || undefined });
      } else {
        l.push({ id: row.id, name: row.name, type: row.type, balance: Number(row.balance), payment: Number(row.payment), description: row.description || undefined });
      }
    }
    setAssets(a);
    setLiabilities(l);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const addAsset = async (entry: AssetEntry) => {
    if (!user) return;
    const { data, error } = await supabase.from("financial_entries").insert({
      user_id: user.id, entry_type: "asset",
      name: entry.name, type: entry.type, value: entry.value, cashflow: entry.cashflow, description: entry.description || null,
    }).select().single();
    if (error) { toast.error("Failed to save asset"); return; }
    setAssets(prev => [...prev, { ...entry, id: data.id }]);
    toast.success("Asset added");
  };

  const addLiability = async (entry: LiabilityEntry) => {
    if (!user) return;
    const { data, error } = await supabase.from("financial_entries").insert({
      user_id: user.id, entry_type: "liability",
      name: entry.name, type: entry.type, balance: entry.balance, payment: entry.payment, description: entry.description || null,
    }).select().single();
    if (error) { toast.error("Failed to save liability"); return; }
    setLiabilities(prev => [...prev, { ...entry, id: data.id }]);
    toast.success("Liability added");
  };

  const editAsset = async (index: number, entry: AssetEntry) => {
    const existing = assets[index];
    if (!existing?.id) return;
    const { error } = await supabase.from("financial_entries").update({
      name: entry.name, type: entry.type, value: entry.value, cashflow: entry.cashflow, description: entry.description || null, updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
    if (error) { toast.error("Failed to update"); return; }
    setAssets(prev => prev.map((a, i) => i === index ? { ...entry, id: existing.id } : a));
    toast.success("Asset updated");
  };

  const editLiability = async (index: number, entry: LiabilityEntry) => {
    const existing = liabilities[index];
    if (!existing?.id) return;
    const { error } = await supabase.from("financial_entries").update({
      name: entry.name, type: entry.type, balance: entry.balance, payment: entry.payment, description: entry.description || null, updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
    if (error) { toast.error("Failed to update"); return; }
    setLiabilities(prev => prev.map((l, i) => i === index ? { ...entry, id: existing.id } : l));
    toast.success("Liability updated");
  };

  const deleteAsset = async (index: number) => {
    const existing = assets[index];
    if (!existing?.id) return;
    const { error } = await supabase.from("financial_entries").delete().eq("id", existing.id);
    if (error) { toast.error("Failed to delete"); return; }
    setAssets(prev => prev.filter((_, i) => i !== index));
    toast.success("Asset deleted");
  };

  const deleteLiability = async (index: number) => {
    const existing = liabilities[index];
    if (!existing?.id) return;
    const { error } = await supabase.from("financial_entries").delete().eq("id", existing.id);
    if (error) { toast.error("Failed to delete"); return; }
    setLiabilities(prev => prev.filter((_, i) => i !== index));
    toast.success("Liability deleted");
  };

  return { assets, liabilities, loading, addAsset, addLiability, editAsset, editLiability, deleteAsset, deleteLiability };
}
