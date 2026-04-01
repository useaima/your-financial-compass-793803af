export type PrototypeUserType = "personal" | "enterprise";

export interface PrototypeProfile {
  firstName: string;
  lastName: string;
  country: string;
  userType: PrototypeUserType;
  updatesOptIn: boolean;
}

const STORAGE_KEY = "financeai-prototype-profile";

const DEFAULT_PROFILE: PrototypeProfile = {
  firstName: "Idea",
  lastName: "Mode",
  country: "Kenya",
  userType: "personal",
  updatesOptIn: false,
};

export function getPrototypeProfile(): PrototypeProfile {
  if (typeof window === "undefined") {
    return DEFAULT_PROFILE;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PROFILE;

    return {
      ...DEFAULT_PROFILE,
      ...JSON.parse(stored),
    } as PrototypeProfile;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function savePrototypeProfile(profile: PrototypeProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
