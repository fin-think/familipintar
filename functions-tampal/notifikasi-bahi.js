// ==========================================
// BUAT APA HARI INI (BAHI): notifikasi siaran baru & komen. Tampal selepas bahagian JomSalam dalam functions/index.js.
// ==========================================
// Ahli kumpulan = sama seperti rules ahliKumpulan(): kumpulan "kami" -> buatapa_kumpulan.ahli; kumpulan biasa -> induk + akaun berpaut aktif.
async function bahiAhli(groupId) {
    if (String(groupId).endsWith('_kami')) {
        const k = await db.collection('buatapa_kumpulan').doc(groupId).get();
        return (k.exists && k.data().ahli) || [];
    }
    const uids = [groupId];
    (await db.collection('mynasab_links').where('owner_uid', '==', groupId).where('status', '==', 'aktif').get()).forEach(d => uids.push(d.id));
    return [...new Set(uids)];
}
async function bahiHantar(uids, payload) {
    let n = 0;
    for (const uid of uids) {
        const u = await db.collection('mynasab_users').doc(uid).get();
        if (u.exists && kumpulToken(u.data()).length) n += await hantarKeSemuaPeranti(db, admin.messaging(), uid, u.data(), payload);
    }
    return n;
}

exports.bahiSiaranBaru = functions
    .region('asia-southeast1')
    .firestore.document('buatapa_posts/{id}')
    .onCreate(async (snap, context) => {
        const p = snap.data(); if (!p.group_id) return null;
        const penerima = (await bahiAhli(p.group_id)).filter(u => u !== p.author_uid);
        const bilGambar = (p.gambar || []).length;
        const isi = p.teks ? String(p.teks).slice(0, 120) : (bilGambar ? `📷 ${bilGambar} gambar` : 'Siaran baru');
        await bahiHantar(penerima, {
            notification: { title: `🏡 ${p.author_nama || 'Ahli keluarga'} kongsi di Laman keluarga`, body: isi },
            data: { app: 'bahi', url: '/buatapa.html', badgeCount: '1', tag: 'bahi-pos-' + context.params.id },
            webpush: { fcmOptions: { link: '/buatapa.html' } }
        });
        return null;
    });

// Komen baru -> maklumkan penulis siaran (kecuali dia sendiri yang komen)
exports.bahiKomenBaru = functions
    .region('asia-southeast1')
    .firestore.document('buatapa_komen/{id}')
    .onCreate(async (snap) => {
        const k = snap.data(); if (!k.post_id) return null;
        const p = await db.collection('buatapa_posts').doc(k.post_id).get();
        if (!p.exists || p.data().author_uid === k.author_uid) return null;
        await bahiHantar([p.data().author_uid], {
            notification: { title: `💬 ${k.author_nama || 'Ahli keluarga'} komen siaran anda`, body: String(k.teks || '').slice(0, 120) },
            data: { app: 'bahi', url: '/buatapa.html', badgeCount: '1', tag: 'bahi-komen-' + k.post_id },
            webpush: { fcmOptions: { link: '/buatapa.html' } }
        });
        return null;
    });
