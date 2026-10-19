self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // Biarkan kosong. Ini syarat minimum untuk telefon iktiraf PWA.
});
