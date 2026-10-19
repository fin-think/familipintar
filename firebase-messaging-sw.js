// 1. Import modul Firebase serasi latar belakang
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// 2. Masukkan konfigurasi Firebase bos
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

// 3. Tangkap mesej masa aplikasi di belakang & naikkan lencana
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mesej Diterima: ', payload);
    
    // Tarik nombor lencana dari data server
    const jumlahLencana = parseInt(payload.data.badgeCount || 1);
    
    // Naikkan App Badge di telefon
    if (navigator.setAppBadge) {
        navigator.setAppBadge(jumlahLencana);
    }
});
