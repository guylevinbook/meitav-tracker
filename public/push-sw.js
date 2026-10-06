self.addEventListener("push", (event) => {
  let data = {
    title: "מעקב חיטוב",
    body: "לא שכחת לסמן היום? 🤍",
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: "daily-cut-reminder",
      data: {
        url: "/",
      },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate("/");
          return client.focus();
        }
      }

      return clients.openWindow("/");
    })
  );
});