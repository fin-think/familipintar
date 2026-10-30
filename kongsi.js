/* Draf Direktori Servis: kod kongsi (Firebase, senarai, utiliti). Bukan dalam produksi. */
export const firebaseConfig = {
  apiKey: "AIzaSyA7SW4U--evGtfRyPz5Feh3mEN8MF92gTg", authDomain: "familipintar.firebaseapp.com",
  databaseURL: "https://familipintar-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "familipintar",
  storageBucket: "familipintar.firebasestorage.app", messagingSenderId: "277029764059", appId: "1:277029764059:web:0a21bb2e01d868b1ed05fe"
};
export const YURAN_KREDIT = 50;          // kredit sebulan
export const HARI_LANGGANAN = 30;        // tempoh satu bulan langganan
export const VERSI_TERMA = 'v1-2026-10'; // naikkan bila teks terma diubah
export const KATEGORI = [
  ['aircond', 'Aircond', 'fa-snowflake'], ['paip', 'Paip & Plumber', 'fa-faucet-drip'], ['elektrik', 'Elektrik', 'fa-bolt'],
  ['cuci', 'Cuci Rumah', 'fa-broom'], ['ubahsuai', 'Ubah Suai & Kontraktor', 'fa-hammer'], ['cat', 'Cat & Dekorasi', 'fa-paint-roller'],
  ['perosak', 'Kawalan Perosak', 'fa-bug'], ['kunci', 'Tukang Kunci', 'fa-key'], ['peralatan', 'Baiki Peralatan Rumah', 'fa-screwdriver-wrench'],
  ['landskap', 'Landskap & Taman', 'fa-seedling'], ['lori', 'Pengangkutan & Lori', 'fa-truck'], ['lain', 'Lain-lain', 'fa-ellipsis']
];
export const NEGERI = ['Johor','Kedah','Kelantan','Melaka','Negeri Sembilan','Pahang','Perak','Perlis','Pulau Pinang','Sabah','Sarawak','Selangor','Terengganu','Kuala Lumpur','Putrajaya','Labuan'];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const namaKategori = (k) => (KATEGORI.find(x => x[0] === k) || [k, k])[1];
export const noWa = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '6' + d; if (!d.startsWith('60')) d = '60' + d; return d; };
// Mampat gambar sebelum upload (maks 1280px, JPEG 80%) supaya Storage & data pengguna jimat
export function mampatGambar(fail, maks = 1280, kualiti = 0.8) {
  return new Promise((ok, gagal) => {
    const img = new Image(), url = URL.createObjectURL(fail);
    img.onload = () => {
      const s = Math.min(1, maks / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => { URL.revokeObjectURL(url); b ? ok(b) : gagal(new Error('Gagal mampat gambar')); }, 'image/jpeg', kualiti);
    };
    img.onerror = () => gagal(new Error('Fail bukan gambar yang sah'));
    img.src = url;
  });
}
