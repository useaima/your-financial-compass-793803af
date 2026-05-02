export const CHAT_STARTER_STORAGE_KEY = "eva-chat-starter";

export type ChatStarterPayload = {
  starterPrompt: string;
  autoStart?: boolean;
};

export function saveChatStarter(payload: ChatStarterPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(CHAT_STARTER_STORAGE_KEY, JSON.stringify(payload));
}

export function readChatStarter() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(CHAT_STARTER_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as ChatStarterPayload;
    if (!parsed.starterPrompt?.trim()) {
      return null;
    }
    return parsed;
  } catch {
    clearChatStarter();
    return null;
  }
}

export function clearChatStarter() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(CHAT_STARTER_STORAGE_KEY);
}
