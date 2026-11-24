// =====================================================================
// SATU TELEFON = SATU AKAUN: bila telefon log masuk ke sesuatu akaun (index.html tulis fcm_masa),
// buang token telefon itu dari akaun LAIN supaya notifikasi akaun lain tidak sampai ke telefon ini.
// TAMPAL di HUJUNG functions/index.js (guna db, admin, functions sedia ada).
// =====================================================================

exports.tokenSatuAkaun = functions
    .region('asia-southeast1')
    .firestore.document('mynasab_users/{uid}')
    .onWrite(async (chg, context) => {
        const a = chg.before.exists ? chg.before.data() : {}, b = chg.after.exists ? chg.after.data() : null;
        if (!b || !b.fcm_token || b.fcm_masa === a.fcm_masa) return null;     // hanya bila telefon mendaftar semula
        const token = b.fcm_token, uid = context.params.uid;
        const sn = await db.collection('mynasab_users').where('fcm_tokens', 'array-contains', token).get();
        let n = 0;
        for (const d of sn.docs) {
            if (d.id === uid) continue;
            const x = d.data(), buang = admin.firestore.FieldValue.arrayRemove(token);
            const ubah = { fcm_tokens: buang };
            // Semua senarai token ikut orang (induk, pasangan, anak, versi lama checklist40)
            Object.keys(x).forEach(k => { if (k.startsWith('fcm_') && Array.isArray(x[k]) && x[k].includes(token)) ubah[k] = buang; });
            if (x.fcm_token === token) ubah.fcm_token = admin.firestore.FieldValue.delete();
            try { await d.ref.update(ubah); n++; } catch (e) { console.error('tokenSatuAkaun:', d.id, e.message); }
        }
        if (n) console.log(`tokenSatuAkaun: token ${uid} dibuang dari ${n} akaun lain`);
        return null;
    });
