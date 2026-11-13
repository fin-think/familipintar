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

// Senarai akaun keluarga dari induk teratas ke bawah (sama dengan muatKeluarga() dalam jomsalam.html)
async function slIndukTeratas(uid) {
    let u = uid;
    for (let i = 0; i < 8; i++) {
        const l = await db.collection('mynasab_links').doc(u).get();
        if (l.exists && l.data().status === 'aktif' && l.data().owner_uid && l.data().owner_uid !== u) { u = l.data().owner_uid; continue; }
        const r = await db.collection('mynasab_nodes').doc('root_' + u).get();
        const d = r.exists && r.data().anak_saudara_dari;
        if (d && d.uid && d.uid !== u) { u = d.uid; continue; }
        break;
    }
    return u;
}
async function slKeluargaPenuh(uid) {
    const atas = await slIndukTeratas(uid), lawat = new Set([atas]), giliran = [atas];
    while (giliran.length && lawat.size < 300) {
        const u = giliran.shift();
        const ls = await db.collection('mynasab_links').where('owner_uid', '==', u).where('status', '==', 'aktif').get();
        ls.forEach(d => { if (!lawat.has(d.id)) { lawat.add(d.id); giliran.push(d.id); } });
        const rs = await db.collection('mynasab_nodes').where('is_root', '==', true).where('anak_saudara_dari.uid', '==', u).get();
        rs.forEach(d => { const o = d.data().owner_uid; if (o && !lawat.has(o)) { lawat.add(o); giliran.push(o); } });
    }
    return lawat;
}

// Mula perbualan Keluarga dengan ahli di luar kumpulan pautan terus: server sahkan kedua-duanya dalam keluarga yang sama
exports.jomsalamMulaKeluarga = functions
    .region('asia-southeast1')
    .https.onCall(async (data, context) => {
        const saya = context.auth && context.auth.uid, dia = data && data.uid;
        if (!saya) throw new functions.https.HttpsError('unauthenticated', 'Sila log masuk.');
        if (!dia || dia === saya) throw new functions.https.HttpsError('invalid-argument', 'Penerima tidak sah.');
        const keluarga = await slKeluargaPenuh(saya);
        if (!keluarga.has(dia) || !keluarga.has(saya)) throw new functions.https.HttpsError('permission-denied', 'Bukan ahli keluarga yang sama dalam myNasab. Guna Hulur Salam.');
        const ahli = [saya, dia].sort(), id = ahli.join('_'), ref = db.collection('salam_chat').doc(id);
        const ada = await ref.get();
        if (!ada.exists) {
            await ref.set({ ahli, jenis: 'keluarga', status: 'aktif', pemohon: saya,
                nama: { [saya]: String(data.namaSaya || '').slice(0, 80), [dia]: String(data.nama || '').slice(0, 80) },
                belum: {}, sembunyi: {}, created_at: Date.now(), masa_akhir: 0, mesej_akhir: '' });
        }
        return { id };
    });

// Senarai Keluarga untuk tab JomSalam: semua akaun dari induk teratas ke bawah (pautan jemputan + anak saudara)
exports.jomsalamKeluarga = functions
    .region('asia-southeast1')
    .https.onCall(async (data, context) => {
        const saya = context.auth && context.auth.uid;
        if (!saya) throw new functions.https.HttpsError('unauthenticated', 'Sila log masuk.');
        const uids = [...await slKeluargaPenuh(saya)].filter(u => u !== saya);
        const ahli = [];
        for (let i = 0; i < uids.length; i += 50) {
            const docs = await db.getAll(...uids.slice(i, i + 50).map(u => db.collection('mynasab_users').doc(u)));
            docs.forEach(d => { if (d.exists) ahli.push({ uid: d.id, nama: d.data().name || (d.data().email || '').split('@')[0] || 'Ahli keluarga' }); });
        }
        return { ahli };
    });
