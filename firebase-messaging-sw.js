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
// [OURMONEY - TAMBAHAN] Klik notifikasi OurMoney -> buka ourmoney.html.
// MESTI didaftar SEBELUM firebase.messaging(): SDK Firebase mendaftar pengendali kliknya sendiri yang
// memanggil stopImmediatePropagation() dan hanya menutup notifikasi jika tiada pautan (sebab itu dahulu ia "hilang" sahaja).
// Didaftar DI ATAS pengendali lama; hanya mengambil alih notifikasi OurMoney,
// yang lain diteruskan kepada pengendali lama di bawah seperti biasa.
self.addEventListener('notificationclick', (event) => {
    const d = event.notification.data || {};
    const fcm = d.FCM_MSG && d.FCM_MSG.data ? d.FCM_MSG.data : {};
    if (d.app !== 'ourmoney' && fcm.app !== 'ourmoney') return;

    event.stopImmediatePropagation();
    event.notification.close();
    const sasaran = new URL(d.url || fcm.url || '/ourmoney.html', self.location.origin).href;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (senarai) => {
            for (const c of senarai) {
                if (c.url.startsWith(self.location.origin) && 'focus' in c) {
                    try { if ('navigate' in c) await c.navigate(sasaran); } catch (e) {}
                    return c.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(sasaran);
        })
    );
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mesej Diterima: ', payload);
    
    // Guard: mesej tanpa `data` tidak lagi menyebabkan ralat (sebelum ini payload.data.badgeCount akan crash).
    const d = (payload && payload.data) || {};
    const jumlahLencana = parseInt(d.badgeCount || 1, 10) || 1;
    
    // 1. Naikkan App Badge (Android Chrome tidak sokong; lencana di Android datang daripada notifikasi dalam tray)
    if (self.navigator && navigator.setAppBadge) {
        try { navigator.setAppBadge(jumlahLencana).catch(() => {}); } catch (e) {}
    }

    // [OURMONEY - TAMBAHAN] Mesej OurMoney (data sahaja) perlu dipaparkan sendiri.
    // Mesej lain (myNasab, weCare) tidak terjejas kerana hanya jalan bila data.app === 'ourmoney'.
    if (d.app === 'ourmoney' && !payload.notification) {
        return self.registration.showNotification(d.title || 'OurMoney', {
            body: d.body || '',
            icon: '/icon-192.png',
            tag: d.tag || 'ourmoney-simpanan',
            data: { app: 'ourmoney', url: d.url || '/ourmoney.html' }
        });
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


// ===== PWA: cache asas + skrin offline (tidak mengganggu FCM) =====
const CACHE_PWA = 'fp-pwa-v1';
const ASET_ASAS = ['/offline.html', '/icon-192.png', '/icon-512.png', '/manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_PWA).then((c) => c.addAll(ASET_ASAS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('fp-pwa-') && k !== CACHE_PWA).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Navigasi halaman: rangkaian dahulu; jika offline, papar offline.html. Permintaan lain tidak disentuh.
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET' || req.mode !== 'navigate') return;
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
});
