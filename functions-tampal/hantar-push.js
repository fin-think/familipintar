// ==========================================
// PEMBANTU: HANTAR PUSH KE SEMUA PERANTI PENGGUNA
// ==========================================
// Tampal dekat bahagian atas functions/index.js (selepas `const db = ...` / `admin.initializeApp()`).
// Pelayar/telefon menyimpan token dalam mynasab_users.fcm_tokens (senarai) selain fcm_token lama (kekal untuk keserasian).

const kumpulToken = (u) => [...new Set([].concat(Array.isArray(u && u.fcm_tokens) ? u.fcm_tokens : [], (u && u.fcm_token) || []).filter(Boolean))];

// Hantar ke setiap token; token yang sudah tidak sah dibuang daripada dokumen pengguna. Pulangkan bilangan yang berjaya.
async function hantarKeSemuaPeranti(dbRef, messaging, uid, userData, payload) {
    let berjaya = 0; const mati = [];
    for (const token of kumpulToken(userData)) {
        try { await messaging.send({ ...payload, token }); berjaya++; }
        catch (e) {
            const kod = (e && e.code) || '';
            if (kod.includes('registration-token-not-registered') || kod.includes('invalid-registration-token')) mati.push(token);
            else console.error('Gagal hantar push:', uid, kod || (e && e.message));
        }
    }
    if (mati.length && uid) {
        const upd = { fcm_tokens: admin.firestore.FieldValue.arrayRemove(...mati) };
        if (mati.includes(userData.fcm_token)) upd.fcm_token = admin.firestore.FieldValue.delete();
        try { await dbRef.collection('mynasab_users').doc(uid).update(upd); } catch (e) { console.error('Gagal buang token mati:', e.message); }
    }
    return berjaya;
}
