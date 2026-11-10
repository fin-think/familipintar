// ==========================================
// 10. HARI LAHIR AHLI KELUARGA (myNasab) - push 8 pagi
// ==========================================
// TAMPAL selepas exports.peringatanAnak dalam functions/index.js (guna OM_TZ dan cl40Hantar yang sedia ada).
// Penerima: peranti berdaftar Induk (fcm_induk) dan Pasangan (fcm_pasangan). Akaun lama tanpa peranti ikut orang: fcm_tokens untuk Induk.
// Sumber tarikh lahir: semua nod dalam pokok akaun itu (yang ditambah atau dijemput), tidak termasuk yang telah meninggal.
// Akaun adik-beradik yang dijemput melalui pautan (mynasab_links/{uid}.owner_uid) turut menerima hari lahir pokok pengundang.
// Sehari sekali; klik membuka /app/peringatan40.html?mod=harijadi&l=Nama~umur~hubungan,...
// Pengecualian: mynasab_users.fp_harijadi_mati === true.

function harijadiHariIni(nod, tarikh) {
    const [t, m, h] = tarikh.split('-').map(Number);
    const kabisat = (t % 4 === 0 && t % 100 !== 0) || t % 400 === 0;
    const hasil = [], dilihat = new Set();
    for (const n of nod) {
        if (!n || n.status === 'meninggal' || !n.dob || !n.name) continue;
        const p = String(n.dob).split('-').map(Number);
        if (p.length < 3 || !p[0] || !p[1] || !p[2]) continue;
        const [ty, tm, td] = p;
        const hari = (tm === m && td === h) || (tm === 2 && td === 29 && !kabisat && m === 2 && h === 28);
        if (!hari) continue;
        const umur = t - ty;
        if (umur < 0 || umur > 120) continue;
        const kunci = String(n.name).toLowerCase().trim() + '|' + n.dob;
        if (dilihat.has(kunci)) continue;
        dilihat.add(kunci);
        hasil.push({ nama: String(n.name).trim(), umur, hubungan: n.is_root ? '' : String(n.relationship || '').trim().toLowerCase(), is_root: !!n.is_root, relationship: n.relationship || '', id: n.id });
    }
    return hasil;
}

function tajukBadanHarijadi(senarai, diri) {
    const nama = (x) => x.nama.split(/\s+/).slice(0, 2).join(' ');
    const lain = senarai.filter(x => !x.diri);
    const sebut = lain.slice(0, 3).map(x => `${nama(x)} (${x.umur})`).join(', ') + (lain.length > 3 ? ` dan ${lain.length - 3} lagi` : '');
    if (diri && !lain.length) return { tajuk: '🎂 Selamat hari lahir!', badan: `Selamat hari lahir, ${nama(diri)}! Semoga panjang umur, murah rezeki dan dalam lindungan Allah.` };
    if (diri) return { tajuk: '🎂 Selamat hari lahir!', badan: `Selamat hari lahir, ${nama(diri)}! Hari ni juga hari lahir ${sebut}.` };
    return { tajuk: '🎂 Hari lahir keluarga hari ini', badan: `Hari ni hari lahir ${sebut}. Jom wish dan doakan mereka!` };
}

async function jalankanHariJadi(dbRef, messaging, opsi = {}) {
    const now = opsi.now || Date.now();
    const tarikh = new Intl.DateTimeFormat('en-CA', { timeZone: OM_TZ }).format(new Date(now));
    const snap = await dbRef.collection('mynasab_users').get();
    const cacheNod = new Map();
    const nodDari = async (uid) => {
        if (!cacheNod.has(uid)) { const sn = await dbRef.collection('mynasab_nodes').where('owner_uid', '==', uid).get(); cacheNod.set(uid, sn.docs.map(x => ({ ...x.data(), id: x.id }))); }
        return cacheNod.get(uid);
    };
    let dihantar = 0, langkau = 0;
    for (const d of snap.docs) {
        const u = d.data();
        if (u.fp_harijadi_mati === true) continue;
        const arr = (k) => (Array.isArray(u[k]) ? u[k] : []);
        const induk = [...new Set([...arr('fcm_induk'), ...arr('fcm_checklist40_induk')])].filter(Boolean);
        const psgT = [...new Set([...arr('fcm_pasangan'), ...arr('fcm_checklist40_pasangan')])].filter(Boolean);
        let tokenInduk = induk;
        if (!induk.length && !psgT.length) tokenInduk = [...new Set([...arr('fcm_tokens'), ...(u.fcm_token ? [u.fcm_token] : [])])].filter(Boolean);
        if (!tokenInduk.length && !psgT.length) continue;
        try {
            let nod = await nodDari(d.id);
            try { const lk = await dbRef.collection('mynasab_links').doc(d.id).get(); if (lk.exists && lk.data().owner_uid && lk.data().owner_uid !== d.id) nod = nod.concat(await nodDari(lk.data().owner_uid)); } catch (e) {}
            const hari = harijadiHariIni(nod, tarikh);
            if (!hari.length) { langkau++; continue; }
            const nodInduk = (await nodDari(d.id)).find(n => n.is_root);
            const nodPsg = (await nodDari(d.id)).find(n => /^(suami|isteri)$/i.test(n.relationship || '') && !n.is_root);
            for (const [p, token, nodDiri] of [['induk', tokenInduk, nodInduk], ['pasangan', psgT, nodPsg]]) {
                if (!token.length) continue;
                if (!opsi.tanpaLog) {
                    try { await dbRef.collection('checklist40_notif_log').doc(`${d.id}_${p}_harijadi_${tarikh}`).create({ uid: d.id, tarikh, timestamp: new Date().toISOString() }); }
                    catch (e) { langkau++; continue; }
                }
                const senarai = hari.map(x => ({ ...x, diri: !!(nodDiri && x.id === nodDiri.id) }));
                const diri = senarai.find(x => x.diri);
                const { tajuk, badan } = tajukBadanHarijadi(senarai, diri);
                const l = senarai.slice(0, 8).map(x => [x.nama.slice(0, 40), x.umur, x.diri ? 'diri' : x.hubungan.slice(0, 20)].map(v => String(v).replace(/[,~]/g, ' ')).join('~')).join(',');
                const pautan = `/app/peringatan40.html?mod=harijadi&l=${encodeURIComponent(l)}`;
                const n = await cl40Hantar(dbRef, messaging, d.id, 'fcm_' + p, token, {
                    notification: { title: tajuk, body: badan },
                    data: { app: 'harijadi', url: pautan, badgeCount: '1', tag: 'harijadi-' + tarikh },
                    webpush: { fcmOptions: { link: pautan } }
                });
                if (n > 0) dihantar++; else langkau++;
            }
        } catch (e) { console.error('Hari lahir: gagal untuk', d.id, e.message); }
    }
    console.log(`Hari lahir ${tarikh}: dihantar ${dihantar}, dilangkau ${langkau}`);
    return { dihantar, langkau };
}

exports.peringatanHariJadi = functions
    .runWith({ timeoutSeconds: 300, memory: '256MB' })
    .pubsub.schedule('0 8 * * *')
    .timeZone(OM_TZ)
    .onRun(async () => { await jalankanHariJadi(db, admin.messaging()); return null; });
