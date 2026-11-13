// ==========================================
// JOMSALAM: tampal di HUJUNG functions/index.js (guna db, admin, functions, hantarKeSemuaPeranti sedia ada)
// ==========================================
async function slPenerima(uid) {
    const u = await db.collection('mynasab_users').doc(uid).get();
    return u.exists ? u.data() : null;
}
async function slHantar(uid, tajuk, isi, cid, tag) {
    const ud = await slPenerima(uid); if (!ud) return 0;
    const pautan = '/jomsalam.html?c=' + encodeURIComponent(cid);
    return hantarKeSemuaPeranti(db, admin.messaging(), uid, ud, {
        notification: { title: tajuk, body: String(isi || '').slice(0, 120) },
        data: { app: 'jomsalam', url: pautan, badgeCount: '1', tag },
        webpush: { fcmOptions: { link: pautan } }
    });
}

// Mesej baru -> maklumkan pihak satu lagi (kecuali disekat). Tag ikut perbualan: satu notifikasi dikemas kini, bukan bertimbun.
exports.jomsalamMesej = functions
    .region('asia-southeast1')
    .firestore.document('salam_chat/{cid}/mesej/{mid}')
    .onCreate(async (snap, context) => {
        const m = snap.data(), c = (await db.collection('salam_chat').doc(context.params.cid).get()).data();
        if (!c || c.status !== 'aktif') return null;
        const ke = (c.ahli || []).find(u => u !== m.dari); if (!ke) return null;
        const nama = (c.nama && c.nama[m.dari]) || 'Mesej baru';
        await slHantar(ke, `💬 ${nama}`, m.teks, context.params.cid, 'salam-' + context.params.cid);
        return null;
    });

// Hulur Salam baru -> maklumkan penerima
exports.jomsalamHulur = functions
    .region('asia-southeast1')
    .firestore.document('salam_chat/{cid}')
    .onCreate(async (snap, context) => {
        const c = snap.data(); if (c.jenis !== 'adam' || c.status !== 'menunggu') return null;
        const ke = (c.ahli || []).find(u => u !== c.pemohon); if (!ke) return null;
        await slHantar(ke, `🤝 ${(c.nama && c.nama[c.pemohon]) || 'Seseorang'} hulur Salam`, c.pengenalan || 'Mahu berkenalan dengan anda', context.params.cid, 'salam-hulur-' + context.params.cid);
        return null;
    });

// Salam disambut -> maklumkan pemohon (penolakan TIDAK dimaklumkan)
exports.jomsalamSambut = functions
    .region('asia-southeast1')
    .firestore.document('salam_chat/{cid}')
    .onUpdate(async (chg, context) => {
        const a = chg.before.data(), b = chg.after.data();
        if (!(a.status === 'menunggu' && b.status === 'aktif')) return null;
        const penerima = (b.ahli || []).find(u => u !== b.pemohon);
        await slHantar(b.pemohon, `✅ ${(b.nama && b.nama[penerima]) || 'Kenalan anda'} sambut Salam anda`, 'Anda kini boleh berbual di JomSalam.', context.params.cid, 'salam-' + context.params.cid);
        return null;
    });

// Laporan -> kunci perbualan: buang luput_pada supaya TTL tidak memadam bukti sehingga admin semak
exports.jomsalamLaporan = functions
    .region('asia-southeast1')
    .firestore.document('salam_laporan/{id}')
    .onCreate(async (snap) => {
        const r = snap.data(); if (!r.chat_id) return null;
        const ms = await db.collection('salam_chat').doc(r.chat_id).collection('mesej').get();
        let batch = db.batch(), n = 0;
        for (const d of ms.docs) {
            if (!d.data().luput_pada) continue;
            batch.update(d.ref, { luput_pada: admin.firestore.FieldValue.delete() });
            if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); }
        }
        await batch.commit();
        console.log('Laporan JomSalam', r.chat_id, '-', n, 'mesej dikunci');
        return null;
    });
