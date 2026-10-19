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
    
    // 1. Tarik nombor lencana dari data server
    const jumlahLencana = parseInt(payload.data?.badgeCount || 1);
    
    // 2. Naikkan App Badge
    if (navigator.setAppBadge) {
        navigator.setAppBadge(jumlahLencana);
    }

    // 3. PENTING: Keluarkan Notifikasi supaya Android tahu ia milik Famili Pintar, bukan Chrome
    const notificationTitle = payload.notification?.title || "Mesej Baharu";
    const notificationOptions = {
        body: payload.notification?.body || "Anda mempunyai mesej di Famili Pintar.",
        icon: '/logo.png' // Gantikan dengan nama fail logo aplikasi bos jika berbeza
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});
