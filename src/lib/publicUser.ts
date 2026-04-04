const PUBLIC_USER_STORAGE_KEY = "eva-public-user-id";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function getStoredPublicUserId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(PUBLIC_USER_STORAGE_KEY) ?? "";
}

export function getOrCreatePublicUserId() {
  if (typeof window === "undefined") return "";

  const stored = getStoredPublicUserId();
  if (stored && isUuid(stored)) {
    return stored;
  }

  const nextId = crypto.randomUUID();
  window.localStorage.setItem(PUBLIC_USER_STORAGE_KEY, nextId);
  return nextId;
}
