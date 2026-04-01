import { useState } from "react";
import { toast } from "sonner";
import type { AssetEntry, LiabilityEntry } from "@/components/financial/ManualEntryForm";

const STORAGE_KEY = "financeai-manual-financial-entries";

interface StoredEntries {
  assets: AssetEntry[];
  liabilities: LiabilityEntry[];
}

function loadStoredEntries(): StoredEntries {
  if (typeof window === "undefined") {
    return { assets: [], liabilities: [] };
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { assets: [], liabilities: [] };
    return JSON.parse(stored) as StoredEntries;
  } catch {
    return { assets: [], liabilities: [] };
  }
}

function saveStoredEntries(entries: StoredEntries) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useFinancialEntries() {
  const initialEntries = loadStoredEntries();
  const [assets, setAssets] = useState<AssetEntry[]>(initialEntries.assets);
  const [liabilities, setLiabilities] = useState<LiabilityEntry[]>(initialEntries.liabilities);

  const persist = (nextAssets: AssetEntry[], nextLiabilities: LiabilityEntry[]) => {
    setAssets(nextAssets);
    setLiabilities(nextLiabilities);
    saveStoredEntries({ assets: nextAssets, liabilities: nextLiabilities });
  };

  const addAsset = async (entry: AssetEntry) => {
    const nextAssets = [...assets, { ...entry, id: crypto.randomUUID() }];
    persist(nextAssets, liabilities);
    toast.success("Asset added");
  };

  const addLiability = async (entry: LiabilityEntry) => {
    const nextLiabilities = [...liabilities, { ...entry, id: crypto.randomUUID() }];
    persist(assets, nextLiabilities);
    toast.success("Liability added");
  };

  const editAsset = async (index: number, entry: AssetEntry) => {
    const existing = assets[index];
    if (!existing) return;

    const nextAssets = assets.map((asset, assetIndex) =>
      assetIndex === index ? { ...entry, id: existing.id } : asset,
    );
    persist(nextAssets, liabilities);
    toast.success("Asset updated");
  };

  const editLiability = async (index: number, entry: LiabilityEntry) => {
    const existing = liabilities[index];
    if (!existing) return;

    const nextLiabilities = liabilities.map((liability, liabilityIndex) =>
      liabilityIndex === index ? { ...entry, id: existing.id } : liability,
    );
    persist(assets, nextLiabilities);
    toast.success("Liability updated");
  };

  const deleteAsset = async (index: number) => {
    const nextAssets = assets.filter((_, assetIndex) => assetIndex !== index);
    persist(nextAssets, liabilities);
    toast.success("Asset deleted");
  };

  const deleteLiability = async (index: number) => {
    const nextLiabilities = liabilities.filter((_, liabilityIndex) => liabilityIndex !== index);
    persist(assets, nextLiabilities);
    toast.success("Liability deleted");
  };

  return {
    assets,
    liabilities,
    loading: false,
    addAsset,
    addLiability,
    editAsset,
    editLiability,
    deleteAsset,
    deleteLiability,
  };
}
