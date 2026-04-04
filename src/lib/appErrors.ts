export const APP_ERROR_DIALOG_EVENT = "eva:error-dialog";

export const NETWORK_ERROR_TITLE = "Network connection error";
export const NETWORK_ERROR_MESSAGE = "Network connection error. Connect your network and try again.";
export const NETWORK_ERROR_DESCRIPTION =
  "eva could not reach the server. Check your internet connection, reconnect, and try again.";

export type AppErrorDialogDetail = {
  kind: "network";
  title: string;
  description: string;
};

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.trim();
  }

  if (typeof error === "string") {
    return error.trim();
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message.trim();
  }

  return "";
}

export function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function isNetworkError(error: unknown) {
  if (isOffline()) {
    return true;
  }

  const errorMessage = extractErrorMessage(error).toLowerCase();
  const errorName =
    error instanceof Error && typeof error.name === "string"
      ? error.name.toLowerCase()
      : "";

  const networkSignals = [
    "failed to fetch",
    "networkerror",
    "network request failed",
    "load failed",
    "err_failed",
    "internet disconnected",
    "failed to send a request",
    "could not establish connection",
    "functionsfetcherror",
    "network connection",
  ];

  return networkSignals.some((signal) =>
    errorMessage.includes(signal) || errorName.includes(signal),
  );
}

export function openNetworkErrorDialog(
  description = NETWORK_ERROR_DESCRIPTION,
  title = NETWORK_ERROR_TITLE,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AppErrorDialogDetail>(APP_ERROR_DIALOG_EVENT, {
      detail: {
        kind: "network",
        title,
        description,
      },
    }),
  );
}

export function ensureOnline() {
  if (!isOffline()) {
    return;
  }

  openNetworkErrorDialog();
  throw new Error(NETWORK_ERROR_MESSAGE);
}

export function getDisplayErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  if (isNetworkError(error)) {
    return NETWORK_ERROR_MESSAGE;
  }

  return extractErrorMessage(error) || fallback;
}

export function handleAppError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  const isNetworkIssue = isNetworkError(error);
  const message = getDisplayErrorMessage(error, fallback);

  if (isNetworkIssue) {
    openNetworkErrorDialog();
  }

  return {
    isNetworkIssue,
    message,
  };
}

export function normalizeAppError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  const { message } = handleAppError(error, fallback);
  return new Error(message);
}
