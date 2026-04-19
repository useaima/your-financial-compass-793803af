import type { User } from "firebase/auth";
import type { UserProfile } from "@/lib/evaContracts";

export type AuthProfileSeed = {
  full_name: string;
  first_name: string;
  last_name: string;
  country: string;
  phone_number: string;
  updates_opt_in: boolean;
  password_setup_completed: boolean;
};

export type PasswordStrengthLevel = "weak" | "medium" | "strong";
const SIGNUP_SEED_PREFIX = "eva-signup-seed:";

type SignupSeed = Pick<
  AuthProfileSeed,
  "country" | "phone_number" | "updates_opt_in" | "password_setup_completed"
>;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return fallback;
}

export function splitFullName(fullName: string) {
  const cleaned = fullName.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return { first_name: "", last_name: "" };
  }

  const [first_name, ...rest] = cleaned.split(" ");
  return {
    first_name,
    last_name: rest.join(" "),
  };
}

function readSignupSeed(uid: string | null) {
  if (typeof window === "undefined" || !uid) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(`${SIGNUP_SEED_PREFIX}${uid}`);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SignupSeed>;
    return {
      country: readString(parsed.country) || "United States",
      phone_number: readString(parsed.phone_number),
      updates_opt_in: readBoolean(parsed.updates_opt_in, true),
      password_setup_completed: readBoolean(parsed.password_setup_completed, true),
    } satisfies SignupSeed;
  } catch {
    return null;
  }
}

export function persistSignupSeed(uid: string, seed: SignupSeed) {
  if (typeof window === "undefined" || !uid) {
    return;
  }

  window.localStorage.setItem(`${SIGNUP_SEED_PREFIX}${uid}`, JSON.stringify(seed));
}

export function clearSignupSeed(uid: string | null | undefined) {
  if (typeof window === "undefined" || !uid) {
    return;
  }

  window.localStorage.removeItem(`${SIGNUP_SEED_PREFIX}${uid}`);
}

export function getAuthProfileSeed(user: User | null): AuthProfileSeed {
  const full_name = readString(user?.displayName);
  const parsedName = full_name ? splitFullName(full_name) : { first_name: "", last_name: "" };
  const signupSeed = readSignupSeed(user?.uid ?? null);

  return {
    full_name: full_name || [parsedName.first_name, parsedName.last_name].filter(Boolean).join(" "),
    first_name: parsedName.first_name,
    last_name: parsedName.last_name,
    country: signupSeed?.country || "United States",
    phone_number: signupSeed?.phone_number || "",
    updates_opt_in: signupSeed?.updates_opt_in ?? true,
    password_setup_completed: signupSeed?.password_setup_completed ?? true,
  };
}

export function getResolvedProfileField(
  profileValue: string | null | undefined,
  fallbackValue: string,
) {
  const normalizedProfileValue = readString(profileValue);
  return normalizedProfileValue || fallbackValue;
}

export function hasPasswordSetup(
  user: User | null,
  profile: Pick<UserProfile, "password_setup_completed"> | null,
) {
  const seed = getAuthProfileSeed(user);
  return Boolean(profile?.password_setup_completed || seed.password_setup_completed);
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function getAuthErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code;
  }

  return "";
}

export function getAuthErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const code = getAuthErrorCode(error);

  if (code === "over_email_send_rate_limit") {
    return "A verification email was already sent recently. Check your inbox or wait a minute, then try again.";
  }

  if (code === "email_not_confirmed") {
    return "Verify your email before signing in. You can resend the verification email below.";
  }

  if (
    code === "email_exists" ||
    code === "user_already_exists" ||
    code === "auth/email-already-in-use"
  ) {
    return "That email already has an eva account. Sign in instead or reset your password if you need help getting back in.";
  }

  if (
    code === "invalid_credentials" ||
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found" ||
    /invalid login credentials/i.test(message)
  ) {
    return "That email or password did not match. If this account was migrated, reset your password first, then sign back in.";
  }

  if (code === "auth/too-many-requests") {
    return "Firebase temporarily slowed sign-in attempts for safety. Wait a moment, then try again.";
  }

  if (/email rate limit exceeded/i.test(message)) {
    return "A verification email was already sent recently. Check your inbox or wait a minute, then try again.";
  }

  return message;
}

export function getPasswordStrength(password: string) {
  const checks = {
    length: password.length >= 10,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;
  const isStrong = Object.values(checks).every(Boolean);

  let level: PasswordStrengthLevel = "weak";
  if (isStrong) {
    level = "strong";
  } else if (passedChecks >= 3 && password.length >= 8) {
    level = "medium";
  }

  return {
    level,
    checks,
    isStrong,
  };
}
