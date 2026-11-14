// ==========================================
// GOTRAVEL: KIRAAN MUNDUR PERCUTIAN (7, 3, 1 hari sebelum & hari bertolak), jam 8 pagi. Tampal di hujung functions/index.js.
// Penerima: akaun pemilik pelan (Induk & Pasangan) + ahli rombongan yang ada akaun FP (share_with).
// ==========================================
const PCT_TZ = 'Asia/Kuala_Lumpur';
const pctTarikh = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: PCT_TZ }).format(new Date(ms));
const PCT_MESEJ = {
    7: (t, s) => [`✈️ 7 hari lagi ke ${t}!`, `Semak tempahan penginapan & tiket.${s}`],
    3: (t) => [`🧳 3 hari lagi ke ${t}!`, 'Masa untuk mula kemas beg dan senaraikan barang penting.'],
    1: (t) => [`🚗 Esok bertolak ke ${t}`, 'Semak dokumen, ubat-ubatan, caj telefon & isi minyak kenderaan.'],
    0: (t) => [`🤲 Selamat bermusafir ke ${t}!`, 'Jangan lupa doa naik kenderaan. Semoga perjalanan selamat dan diberkati.']
};

async function jalankanPeringatanPercutian(dbRef, messaging, opsi = {}) {
    const now = opsi.now || Date.now();
    const hari = {}; [7, 3, 1, 0].forEach(n => { hari[pctTarikh(now + n * 86400000)] = n; });
    const snap = await dbRef.collection('jombercuti_trips').where('date_go', 'in', Object.keys(hari)).get();
    let dihantar = 0;
    for (const d of snap.docs) {
        const t = d.data(), n = hari[t.date_go];
        if (n === undefined || !t.owner_uid) continue;
        if (!opsi.tanpaLog) {
            try { await dbRef.collection('checklist40_notif_log').doc(`percutian_${d.id}_${n}_${t.date_go}`).create({ timestamp: new Date().toISOString() }); }
            catch (e) { continue; }   // sudah dihantar
        }
        const destinasi = t.destination || t.title || 'percutian';
        let simpanan = '';
        if (n === 7 && Number(t.total_budget) > 0) {
            try {
                let kumpul = 0;
                (await dbRef.collection('ourmoney_transactions').where('owner_uid', '==', t.owner_uid).where('trip_id', '==', d.id).get())
                    .forEach(x => { if (x.data().type === 'outflow') kumpul += Number(x.data().amount) || 0; });
                const pct = Math.min(100, Math.round(kumpul / Number(t.total_budget) * 100));
                simpanan = ` Simpanan: RM${kumpul.toFixed(0)} / RM${Number(t.total_budget).toFixed(0)} (${pct}%).`;
            } catch (e) {}
        }
        const [tajuk, isi] = PCT_MESEJ[n](destinasi, simpanan);
        const penerima = [...new Set([t.owner_uid, ...(Array.isArray(t.share_with) ? t.share_with : [])])];
        for (const uid of penerima) {
            const u = await dbRef.collection('mynasab_users').doc(uid).get();
            if (!u.exists) continue;
            const pautan = uid === t.owner_uid ? '/gotravel.html?trip=' + encodeURIComponent(d.id) : '/gotravel.html';
            dihantar += await hantarKeSemuaPeranti(dbRef, messaging, uid, u.data(), {
                notification: { title: tajuk, body: isi },
                data: { app: 'gotravel', url: pautan, badgeCount: '1', tag: `percutian-${d.id}-${n}` },
                webpush: { fcmOptions: { link: pautan } }
            });
        }
    }
    console.log(`Percutian ${pctTarikh(now)}: ${snap.size} pelan, dihantar ${dihantar}`);
    return { dihantar };
}

exports.peringatanPercutian = functions
    .region('asia-southeast1')
    .pubsub.schedule('0 8 * * *')
    .timeZone('Asia/Kuala_Lumpur')
    .onRun(async () => { await jalankanPeringatanPercutian(db, admin.messaging()); return null; });

// ==========================================
// WECARE TAMBAHAN: balik kampung, ringkasan tugasan harian, giliran esok.
// Guna ahliWeCare() dan WC_UBAT yang sudah ada dalam index.js (bahagian peringatan ubat weCare).
// ==========================================
const wcLabelBalik = (t) => t.balik_jenis === 'hari' ? 'balik hari' : 'balik bermalam';
const wcTempoh = (t) => (t.end_date && t.end_date !== t.date) ? `${t.date} hingga ${t.end_date}` : t.date;
async function wcHantarKumpulan(dbRef, messaging, groupId, kecuali, tajuk, isi, tag, pautan = '/wecare.html') {
    let n = 0;
    for (const p of await ahliWeCare(dbRef, groupId)) {
        if (p.uid === kecuali) continue;
        n += await hantarKeSemuaPeranti(dbRef, messaging, p.uid, p.userData, {
            notification: { title: tajuk, body: isi },
            data: { app: 'wecare', url: pautan, badgeCount: '1', tag },
            webpush: { fcmOptions: { link: pautan } }
        });
    }
    return n;
}

// 1. Balik kampung direkod -> maklumkan semua adik-beradik serta-merta (kecuali yang merekod)
exports.wecareBalikBaru = functions
    .region('asia-southeast1')
    .firestore.document('wecare_calendar/{id}')
    .onCreate(async (snap, context) => {
        const t = snap.data();
        if (t.jenis !== 'balik' || !t.group_id) return null;
        await wcHantarKumpulan(db, admin.messaging(), t.group_id, t.author_uid,
            `🏠 ${t.shift_siapa || 'Ahli keluarga'} akan ${wcLabelBalik(t)}`, `${wcTempoh(t)}. Selaraskan giliran menjaga Ayah & Ibu.`,
            'wecare-balik-' + context.params.id, '/wecare.html?tugas=' + context.params.id);
        return null;
    });

// 2. Jam 7 pagi: siapa balik kampung hari ini + ringkasan tugasan hari ini (satu notifikasi setiap keluarga)
async function jalankanWeCarePagi(dbRef, messaging, opsi = {}) {
    const now = opsi.now || Date.now(), hariIni = pctTarikh(now);
    const snap = await dbRef.collection('wecare_calendar').where('end_date', '>=', hariIni).get();
    const kumpulan = {};
    let n = 0;
    for (const d of snap.docs) {
        const t = d.data();
        if (!t.group_id || !t.date || t.date > hariIni) continue;
        if (t.jenis === 'balik') {
            if (t.date !== hariIni) continue;
            try { await dbRef.collection('checklist40_notif_log').doc(`wecare_balikhari_${d.id}_${hariIni}`).create({ t: Date.now() }); } catch (e) { continue; }
            n += await wcHantarKumpulan(dbRef, messaging, t.group_id, null, `🏠 Hari ini ${t.shift_siapa || 'ahli keluarga'} ${wcLabelBalik(t)}`, wcTempoh(t), 'wecare-balik-' + d.id, '/wecare.html?tugas=' + d.id);
            continue;
        }
        // Tugasan biasa (ubat ada peringatan sendiri; giliran ada notifikasi sendiri)
        if (t.giliran || (t.time && WC_UBAT.test(`${t.title || ''} ${t.note || ''}`))) continue;
        (kumpulan[t.group_id] = kumpulan[t.group_id] || []).push(t);
    }
    for (const [g, senarai] of Object.entries(kumpulan)) {
        try { await dbRef.collection('checklist40_notif_log').doc(`wecare_ringkasan_${g}_${hariIni}`).create({ t: Date.now() }); } catch (e) { continue; }
        senarai.sort((a, b) => String(a.time || '99').localeCompare(String(b.time || '99')));
        const isi = senarai.slice(0, 6).map(t => `${t.time ? t.time + ' ' : ''}${t.shift_siapa && t.shift_siapa !== 'Umum' ? t.shift_siapa + ': ' : ''}${t.title}`).join('; ') + (senarai.length > 6 ? ` (+${senarai.length - 6} lagi)` : '');
        n += await wcHantarKumpulan(dbRef, messaging, g, null, `📋 Tugasan jaga hari ini (${senarai.length})`, isi, 'wecare-ringkasan-' + hariIni);
    }
    console.log(`weCare pagi ${hariIni}: dihantar ${n}`);
}
exports.wecarePagi = functions
    .region('asia-southeast1')
    .pubsub.schedule('0 7 * * *')
    .timeZone('Asia/Kuala_Lumpur')
    .onRun(async () => { await jalankanWeCarePagi(db, admin.messaging()); return null; });

// 3. Jam 9 malam: giliran yang bermula esok
async function jalankanWeCareMalam(dbRef, messaging, opsi = {}) {
    const now = opsi.now || Date.now(), esok = pctTarikh(now + 86400000);
    const snap = await dbRef.collection('wecare_calendar').where('date', '==', esok).get();
    let n = 0;
    for (const d of snap.docs) {
        const t = d.data();
        if (!t.giliran || !t.group_id) continue;
        try { await dbRef.collection('checklist40_notif_log').doc(`wecare_giliranesok_${d.id}`).create({ t: Date.now() }); } catch (e) { continue; }
        n += await wcHantarKumpulan(dbRef, messaging, t.group_id, null, `🔄 Esok giliran ${t.shift_siapa}`, `${t.title || 'Giliran jaga'}: ${wcTempoh(t)}.`, 'wecare-giliran-' + d.id, '/wecare.html?tugas=' + d.id);
    }
    console.log(`weCare malam (giliran ${esok}): dihantar ${n}`);
}
exports.wecareMalam = functions
    .region('asia-southeast1')
    .pubsub.schedule('0 21 * * *')
    .timeZone('Asia/Kuala_Lumpur')
    .onRun(async () => { await jalankanWeCareMalam(db, admin.messaging()); return null; });
