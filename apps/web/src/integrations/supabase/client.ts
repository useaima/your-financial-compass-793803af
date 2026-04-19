import { getApp, getApps, initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

export const firebaseProjectId = firebaseConfig.projectId;
export const firebaseFunctionsRegion =
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1";
export const firebaseFunctionsBaseUrl =
  import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL ||
  (firebaseConfig.projectId
    ? `https://${firebaseFunctionsRegion}-${firebaseConfig.projectId}.cloudfunctions.net`
    : "");

const FIREBASE_FUNCTION_NAME_MAP: Record<string, string> = {
  "finance-core": "financeCore",
  chat: "chat",
  "generate-insights": "generateInsights",
  "generate-statement": "generateStatement",
  "receipt-ingress": "receiptIngress",
  "scheduled-summaries": "scheduledSummaries",
  "stock-recommendations": "stockRecommendations",
  "fetch-finance-news": "fetchFinanceNews",
};

export const hasSupabaseConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId,
);

export const SUPABASE_SETUP_MESSAGE =
  "Add the Firebase web environment variables in Vercel to enable live EVA auth, data, and AI features.";

if (!hasSupabaseConfig) {
  console.warn(
    "Firebase credentials are missing. The app will load in limited mode until the Vercel env vars are added.",
  );
}

export const firebaseApp = hasSupabaseConfig
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;

if (firebaseAuth) {
  void setPersistence(firebaseAuth, browserLocalPersistence).catch((error) => {
    console.warn("Unable to configure Firebase auth persistence", error);
  });
}

export function getFirebaseFunctionUrl(functionName: string) {
  if (!firebaseFunctionsBaseUrl) {
    throw new Error(SUPABASE_SETUP_MESSAGE);
  }

  return `${firebaseFunctionsBaseUrl}/${FIREBASE_FUNCTION_NAME_MAP[functionName] ?? functionName}`;
}
