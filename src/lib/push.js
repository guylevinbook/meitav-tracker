import { supabase } from "./supabase";

function urlBase64ToUint8Array(base64String) {
  const padding =
    "=".repeat(
      (4 - (base64String.length % 4)) % 4
    );

  const base64 =
    (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const rawData =
    window.atob(base64);

  return Uint8Array.from(
    [...rawData].map(
      (char) =>
        char.charCodeAt(0)
    )
  );
}

export async function isPushEnabled() {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return false;
  }

  if (
    Notification.permission !==
    "granted"
  ) {
    return false;
  }

  try {
    const registration =
      await navigator.serviceWorker.ready;

    const subscription =
      await registration.pushManager.getSubscription();

    return Boolean(subscription);
  } catch (error) {
    console.error(error);

    return false;
  }
}

export async function enablePushNotifications() {
  if (
    !("serviceWorker" in navigator)
  ) {
    throw new Error(
      "המכשיר הזה לא תומך בהתראות"
    );
  }

  if (
    !("PushManager" in window)
  ) {
    throw new Error(
      "המכשיר הזה לא תומך ב-Push"
    );
  }

  const permission =
    await Notification.requestPermission();

  if (
    permission !== "granted"
  ) {
    throw new Error(
      "לא אושרו התראות"
    );
  }

  const registration =
    await navigator.serviceWorker.ready;

  let subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    const publicKey =
      import.meta.env
        .VITE_VAPID_PUBLIC_KEY;

    if (!publicKey) {
      throw new Error(
        "חסר VAPID public key"
      );
    }

    subscription =
      await registration.pushManager.subscribe({
        userVisibleOnly: true,

        applicationServerKey:
          urlBase64ToUint8Array(
            publicKey
          ),
      });
  }

  const json =
    subscription.toJSON();

  const { error } =
    await supabase
      .from(
        "push_subscriptions"
      )
      .upsert(
        {
          endpoint:
            json.endpoint,

          p256dh:
            json.keys.p256dh,

          auth:
            json.keys.auth,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "endpoint",
        }
      );

  if (error) {
    console.error(error);

    throw new Error(
      "לא הצלחתי לשמור את ההתראה"
    );
  }

  return true;
}