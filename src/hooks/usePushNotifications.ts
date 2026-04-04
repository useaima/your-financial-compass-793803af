import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY_STORAGE = "financeai_vapid_key";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error("Push notifications are not supported in this browser");
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      toast.success("Notifications enabled!");
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification("eva", {
          body: "Your AI Finance Assistant will now send insights and reminders.",
          icon: "/eva-app-icon.png",
          badge: "/pwa-icon-192.png",
          tag: "welcome",
        });
      }
      return true;
    } else {
      toast.error("Notification permission denied");
      return false;
    }
  }, [isSupported]);

  const sendLocalNotification = useCallback(
    async (title: string, body: string, tag?: string) => {
      if (permission !== "granted") return;
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, {
          body,
          icon: "/eva-app-icon.png",
          badge: "/pwa-icon-192.png",
          tag: tag || "financeai-" + Date.now(),
        } as NotificationOptions);
      }
    },
    [permission]
  );

  return {
    isSupported,
    permission,
    isSubscribed,
    requestPermission,
    sendLocalNotification,
  };
}
