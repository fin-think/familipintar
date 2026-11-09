// ==========================================
// PEMBANTU: HANTAR PUSH KE SEMUA PERANTI PENGGUNA
// ==========================================
// Tampal dekat bahagian atas functions/index.js (selepas `const db = ...` / `admin.initializeApp()`).
// Pelayar/telefon menyimpan token dalam mynasab_users.fcm_tokens (senarai) selain fcm_token lama (kekal untuk keserasian).
// Token yang didaftar untuk ORANG tertentu (Peranan.daftarPush di peranan.js) disimpan juga dalam fcm_induk / fcm_pasangan.
// Hantar dengan parameter ke-6 `per` ('induk' | 'pasangan') untuk menghantar hanya ke peranti orang itu. Jika orang itu belum
// mendaftar sebarang peranti, jatuh balik kepada semua peranti akaun (tiada peringatan yang hilang).

const kumpulToken = (u) => [...new Set([].concat(Array.isArray(u && u.fcm_tokens) ? u.fcm_tokens : [], (u && u.fcm_token) || []).filter(Boolean))];

const tokenUntuk = (u, per) => {
    if (per === 'induk' || per === 'pasangan') {
        const k = [...new Set([].concat(Array.isArray(u && u['fcm_' + per]) ? u['fcm_' + per] : [], Array.isArray(u && u['fcm_checklist40_' + per]) ? u['fcm_checklist40_' + per] : []).filter(Boolean))];
        if (k.length) return k;
    }
    return kumpulToken(u);
};

// Hantar ke setiap token; token yang sudah tidak sah dibuang daripada dokumen pengguna. Pulangkan bilangan yang berjaya.
async function hantarKeSemuaPeranti(dbRef, messaging, uid, userData, payload, per = null) {
    let berjaya = 0; const mati = [];
    // Satu telefon boleh ada lebih daripada satu token (cth. Chrome + app dipasang, atau token lama). Tag yang sama
    // membuatkan telefon menggantikan notifikasi yang sama, bukan menunjukkan dua kali.
    const tag = payload && payload.data && payload.data.tag;
    const muatan = tag ? { ...payload, webpush: { ...(payload.webpush || {}), notification: { ...((payload.webpush || {}).notification || {}), tag } } } : payload;
    for (const token of tokenUntuk(userData, per)) {
        try { await messaging.send({ ...muatan, token }); berjaya++; }
        catch (e) {
            const kod = (e && e.code) || '';
            if (kod.includes('registration-token-not-registered') || kod.includes('invalid-registration-token')) mati.push(token);
            else console.error('Gagal hantar push:', uid, kod || (e && e.message));
        }
    }
    if (mati.length && uid) {
        const upd = { fcm_tokens: admin.firestore.FieldValue.arrayRemove(...mati), fcm_induk: admin.firestore.FieldValue.arrayRemove(...mati), fcm_pasangan: admin.firestore.FieldValue.arrayRemove(...mati) };
        if (mati.includes(userData.fcm_token)) upd.fcm_token = admin.firestore.FieldValue.delete();
        try { await dbRef.collection('mynasab_users').doc(uid).update(upd); } catch (e) { console.error('Gagal buang token mati:', e.message); }
    }
    return berjaya;
}
