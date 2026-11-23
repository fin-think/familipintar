// =====================================================================
// weCare: push ikut JANGKAR KELUARGA (sama macam penapis dalam app)
// Nota/event hanya dihantar kepada ahli yang jangkar dia sama dengan anchor_id item.
// Adik-beradik Salam Paut (linked_adik) pun turut terima.
// =====================================================================
//
// LANGKAH 1: TAMPAL blok "HELPER" di bawah SEBELUM baris
//            const wcLabelBalik = (t) => ...
//
// LANGKAH 2: GANTI keseluruhan  async function wcHantarKumpulan(...) { ... }
//            dengan versi di bawah.
//
// LANGKAH 3: Dalam wecareBalikBaru, jalankanWeCarePagi, jalankanWeCareMalam,
//            GANTI blok-blok seperti yang ditanda.
//
// LANGKAH 4: GANTI keseluruhan exports.hantarNotifikasiWeCare dengan versi di bawah.
//
// Lepas tu: firebase deploy --only functions


// ---------------- LANGKAH 1: HELPER (tampal baru) ----------------
// Senarai ahli kumpulan weCare + jangkar setiap ahli.
// pemilik  : induk = root pemilik,           pasangan = pasangan pemilik
// jemputan : induk = sasaran_id,             pasangan = pasangan ahli tu
// Salam Paut (linked_adik): induk = root pemilik, pasangan = pasangan adik tu
async function ahliWeCareJangkar(dbRef, groupId) {
    const nodOf = async (uid) => {
        try { const s = await dbRef.collection('mynasab_nodes').where('owner_uid', '==', uid).get(); return s.docs.map(d => ({ ...d.data(), id: d.id })); }
        catch (e) { return []; }
    };
    const idDiri = (nod) => (nod.find(n => n.is_root) || {}).id || null;
    const idPasangan = (nod) => (nod.find(n => /suami|isteri/i.test(n.relationship || '')) || {}).id || null;

    const nodPemilik = await nodOf(groupId);
    const rootPemilik = idDiri(nodPemilik);
    const calon = [{ uid: groupId, induk: rootPemilik, pasangan: idPasangan(nodPemilik) }];

    const links = await dbRef.collection('mynasab_links').where('owner_uid', '==', groupId).where('status', '==', 'aktif').get();
    for (const d of links.docs) {
        const nod = await nodOf(d.id);
        calon.push({ uid: d.id, induk: d.data().sasaran_id || idDiri(nod), pasangan: idPasangan(nod) });
    }

    try {
        const akar = await dbRef.collection('mynasab_nodes').doc('root_' + groupId).get();
        for (const adik of ((akar.exists && akar.data().linked_adik) || [])) {
            if (calon.some(c => c.uid === adik)) continue;
            const l = await dbRef.collection('mynasab_links').doc(adik).get();
            if (l.exists && l.data().status === 'aktif') continue;   // dah ikut kumpulan jemputan lain
            const nod = await nodOf(adik);
            calon.push({ uid: adik, induk: rootPemilik, pasangan: idPasangan(nod) });
        }
    } catch (e) {}

    const hasil = [];
    for (const c of calon) {
        const u = await dbRef.collection('mynasab_users').doc(c.uid).get();
        if (u.exists && kumpulToken(u.data()).length) hasil.push({ ...c, userData: u.data() });
    }
    return hasil;
}
// Item tanpa anchor_id (data lama) -> semua ahli, macam sebelum ni.
const wcPadanJangkar = (p, anchorId) => !anchorId || p.induk === anchorId || p.pasangan === anchorId;


// ---------------- LANGKAH 2: GANTI wcHantarKumpulan ----------------
async function wcHantarKumpulan(dbRef, messaging, groupId, kecuali, tajuk, isi, tag, pautan = '/wecare.html', anchorId = null) {
    let n = 0;
    for (const p of await ahliWeCareJangkar(dbRef, groupId)) {
        if (p.uid === kecuali || !wcPadanJangkar(p, anchorId)) continue;
        n += await hantarKeSemuaPeranti(dbRef, messaging, p.uid, p.userData, {
            notification: { title: tajuk, body: isi },
            data: { app: 'wecare', url: pautan, badgeCount: '1', tag },
            webpush: { fcmOptions: { link: pautan } }
        });
    }
    return n;
}


// ---------------- LANGKAH 3: GANTI baris-baris ini ----------------

// (a) Dalam exports.wecareBalikBaru — GANTI baris:
//         'wecare-balik-' + context.params.id, '/wecare.html?tugas=' + context.params.id);
//     DENGAN:
        'wecare-balik-' + context.params.id, '/wecare.html?tugas=' + context.params.id, t.anchor_id || null);

// (b) Dalam jalankanWeCarePagi — GANTI baris (balik hari ini):
//         n += await wcHantarKumpulan(dbRef, messaging, t.group_id, null, `🏠 Hari ini ${t.shift_siapa || 'ahli keluarga'} ${wcLabelBalik(t)}`, wcTempoh(t), 'wecare-balik-' + d.id, '/wecare.html?tugas=' + d.id);
//     DENGAN:
            n += await wcHantarKumpulan(dbRef, messaging, t.group_id, null, `🏠 Hari ini ${t.shift_siapa || 'ahli keluarga'} ${wcLabelBalik(t)}`, wcTempoh(t), 'wecare-balik-' + d.id, '/wecare.html?tugas=' + d.id, t.anchor_id || null);

// (c) Dalam jalankanWeCarePagi — GANTI baris:
//         (kumpulan[t.group_id] = kumpulan[t.group_id] || []).push(t);
//     DENGAN:
        const kunci = t.group_id + '|' + (t.anchor_id || '');
        (kumpulan[kunci] = kumpulan[kunci] || []).push(t);

// (d) Dalam jalankanWeCarePagi — GANTI keseluruhan gelung  for (const [g, senarai] of Object.entries(kumpulan)) { ... }
//     DENGAN:
    for (const [kunci, senarai] of Object.entries(kumpulan)) {
        const [g, anchorId] = kunci.split('|');
        try { await dbRef.collection('checklist40_notif_log').doc(`wecare_ringkasan_${g}_${anchorId || 'x'}_${hariIni}`).create({ t: Date.now() }); } catch (e) { continue; }
        senarai.sort((a, b) => String(a.time || '99').localeCompare(String(b.time || '99')));
        const isi = senarai.slice(0, 6).map(t => `${t.time ? t.time + ' ' : ''}${t.shift_siapa && t.shift_siapa !== 'Umum' ? t.shift_siapa + ': ' : ''}${t.title}`).join('; ') + (senarai.length > 6 ? ` (+${senarai.length - 6} lagi)` : '');
        n += await wcHantarKumpulan(dbRef, messaging, g, null, `📋 Tugasan jaga hari ini (${senarai.length})`, isi, 'wecare-ringkasan-' + hariIni, '/wecare.html', anchorId || null);
    }

// (e) Dalam jalankanWeCareMalam — GANTI baris:
//         n += await wcHantarKumpulan(dbRef, messaging, t.group_id, null, `🔄 Esok giliran ${t.shift_siapa}`, `${t.title || 'Giliran jaga'}: ${wcTempoh(t)}.`, 'wecare-giliran-' + d.id, '/wecare.html?tugas=' + d.id);
//     DENGAN:
        n += await wcHantarKumpulan(dbRef, messaging, t.group_id, null, `🔄 Esok giliran ${t.shift_siapa}`, `${t.title || 'Giliran jaga'}: ${wcTempoh(t)}.`, 'wecare-giliran-' + d.id, '/wecare.html?tugas=' + d.id, t.anchor_id || null);


// ---------------- LANGKAH 4: GANTI exports.hantarNotifikasiWeCare ----------------
exports.hantarNotifikasiWeCare = functions
  .region('asia-southeast1')
  .firestore.document("wecare_notes/{noteId}")
  .onCreate(async (snap, context) => {
    const nota = snap.data();
    if (!nota.group_id) return null;
    try {
        let berjayaHantar = 0;
        for (const p of await ahliWeCareJangkar(db, nota.group_id)) {
            const namaAkaun = p.userData.email ? p.userData.email.split('@')[0] : '';
            const penulis = nota.author_uid ? p.uid === nota.author_uid : namaAkaun === nota.author;   // penulis tidak perlu dimaklumkan
            if (penulis || !wcPadanJangkar(p, nota.anchor_id)) continue;
            berjayaHantar += await hantarKeSemuaPeranti(db, admin.messaging(), p.uid, p.userData, {
                notification: { title: "weCare: Pesanan Keluarga 🗒️", body: `${nota.author}: ${nota.note}` },
                data: { app: 'wecare', url: '/wecare.html', badgeCount: '1', tag: 'wecare-nota-' + context.params.noteId },
                android: { notification: { sound: "default" } },
                webpush: { fcmOptions: { link: '/wecare.html' } }
            });
        }
        console.log("Notifikasi weCare berjaya dihantar ke", berjayaHantar, "peranti.");
        return null;
    } catch (error) {
        console.error("Ralat notifikasi weCare:", error);
        return null;
    }
  });
