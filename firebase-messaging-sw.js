importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyA7SW4U--evGtfRyPz5Feh3mEN8MF92gTg",
    authDomain: "familipintar.firebaseapp.com",
    databaseURL: "https://familipintar-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "familipintar",
    storageBucket: "familipintar.firebasestorage.app",
    messagingSenderId: "277029764059",
    appId: "1:277029764059:web:0a21bb2e01d868b1ed05fe",
    measurementId: "G-S3RP7E4460"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mesej Diterima: ', payload);
    
    const jumlahLencana = parseInt(payload.data.badgeCount || 1);
    
    // 1. Naikkan App Badge
    if (navigator.setAppBadge) {
        navigator.setAppBadge(jumlahLencana);
    }

    
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Tutup kotak notifikasi bila ditekan
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Jika aplikasi dah sedia terbuka di latar belakang, fokuskan saja
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes('familipintar') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Jika aplikasi tertutup penuh, buka aplikasi sebagai PWA
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// Syarat wajib WebAPK Android agar aplikasi memiliki identitas mandiri
self.addEventListener('fetch', (event) => {
    // Tidak perlu diisi apa-apa, cukup ada agar Chrome mengenalinya sebagai PWA penuh
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return clients.openWindow('/wecare.html');
  }));
});
