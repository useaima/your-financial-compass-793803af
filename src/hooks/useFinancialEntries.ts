import { toast } from "sonner";
import type {
  AssetEntry,
  LiabilityEntry,
} from "@/components/financial/ManualEntryForm";
import { usePublicUser } from "@/context/PublicUserContext";

export function useFinancialEntries() {
  const {
    bootstrap,
    saveFinancialEntry,
    deleteFinancialEntry,
    saving,
  } = usePublicUser();

  const assets = bootstrap.financial_entries
    .filter((entry) => entry.entry_type === "asset")
    .map<AssetEntry>((entry) => ({
      id: entry.id,
      name: entry.name,
      type: entry.type,
      value: entry.value,
      cashflow: entry.cashflow,
      description: entry.description ?? undefined,
    }));

  const liabilities = bootstrap.financial_entries
    .filter((entry) => entry.entry_type === "liability")
    .map<LiabilityEntry>((entry) => ({
      id: entry.id,
      name: entry.name,
      type: entry.type,
      balance: entry.balance,
      payment: entry.payment,
      description: entry.description ?? undefined,
    }));

  const addAsset = async (entry: AssetEntry) => {
    await saveFinancialEntry({
      name: entry.name,
      type: entry.type,
      entry_type: "asset",
      value: entry.value,
      cashflow: entry.cashflow,
      balance: 0,
      payment: 0,
      description: entry.description ?? "",
    });
    toast.success("Asset added");
  };

  const addLiability = async (entry: LiabilityEntry) => {
    await saveFinancialEntry({
      name: entry.name,
      type: entry.type,
      entry_type: "liability",
      value: 0,
      cashflow: 0,
      balance: entry.balance,
      payment: entry.payment,
      description: entry.description ?? "",
    });
    toast.success("Liability added");
  };

  const editAsset = async (index: number, entry: AssetEntry) => {
    const existing = assets[index];
    if (!existing?.id) return;

    await saveFinancialEntry({
      id: existing.id,
      name: entry.name,
      type: entry.type,
      entry_type: "asset",
      value: entry.value,
      cashflow: entry.cashflow,
      balance: 0,
      payment: 0,
      description: entry.description ?? "",
    });
    toast.success("Asset updated");
  };

  const editLiability = async (index: number, entry: LiabilityEntry) => {
    const existing = liabilities[index];
    if (!existing?.id) return;

    await saveFinancialEntry({
      id: existing.id,
      name: entry.name,
      type: entry.type,
      entry_type: "liability",
      value: 0,
      cashflow: 0,
      balance: entry.balance,
      payment: entry.payment,
      description: entry.description ?? "",
    });
    toast.success("Liability updated");
  };

  const removeAsset = async (index: number) => {
    const existing = assets[index];
    if (!existing?.id) return;
    await deleteFinancialEntry(existing.id);
    toast.success("Asset deleted");
  };

  const removeLiability = async (index: number) => {
    const existing = liabilities[index];
    if (!existing?.id) return;
    await deleteFinancialEntry(existing.id);
    toast.success("Liability deleted");
  };

  return {
    assets,
    liabilities,
    loading: saving,
    addAsset,
    addLiability,
    editAsset,
    editLiability,
    deleteAsset: removeAsset,
    deleteLiability: removeLiability,
  };
}
