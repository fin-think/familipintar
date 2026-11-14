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
