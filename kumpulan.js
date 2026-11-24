// Kumpulan keluarga (group_id) untuk weCare, lencana nota & kalendar goTravel.
// Urutan:
//   1. Saya join melalui jemputan pokok (mynasab_links aktif)        -> ikut induk jemputan
//   2. Ada orang join melalui jemputan saya                           -> saya induk
//   3. Tiada kedua-duanya tetapi ada adik-beradik melalui Salam Paut  -> ikut kumpulan adik-beradik itu
//        - adik-beradik yang join jemputan orang lain / ada pengikut sendiri diutamakan
//        - jika tiada, pilih UID terkecil antara saya & adik-beradik (sama di kedua-dua belah)
//   4. Selain itu                                                     -> diri sendiri
import { doc, getDoc, getDocs, query, collection, where, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const cache = {};

async function pautanAktif(db, uid) {
  try { const s = await getDoc(doc(db, "mynasab_links", uid)); return s.exists() && s.data().status === 'aktif' ? s.data().owner_uid : null; }
  catch (e) { return null; }
}
async function adaPengikut(db, uid) {
  try { const s = await getDocs(query(collection(db, "mynasab_links"), where("owner_uid", "==", uid), where("status", "==", "aktif"), limit(1))); return !s.empty; }
  catch (e) { return false; }
}

export async function tentukanKumpulan(db, uid) {
  if (cache[uid]) return cache[uid];
  const tetap = (g) => (cache[uid] = g);

  const induk = await pautanAktif(db, uid);
  if (induk) { return tetap(induk); }
  if (await adaPengikut(db, uid)) { return tetap(uid); }

  let adik = [];
  try {
    const r = await getDoc(doc(db, "mynasab_nodes", "root_" + uid));
    adik = r.exists() ? (r.data().linked_adik || []).filter(Boolean) : [];
  } catch (e) { console.warn('[FP kumpulan] gagal baca root:', e.message); }
  if (!adik.length) return tetap(uid);

  const utama = [];
  for (const s of adik) {
    const g = await pautanAktif(db, s);
    if (g) utama.push(g);
    else if (await adaPengikut(db, s)) utama.push(s);
  }
  const g = utama.length ? utama.sort()[0] : [uid, ...adik].sort()[0];
  return tetap(g);
}
