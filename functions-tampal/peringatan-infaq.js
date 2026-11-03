// ==========================================
// 6. PERINGATAN INFAQ HARIAN OURMONEY (PUSH IKUT JAM PILIHAN PENGGUNA)
// ==========================================
// TAMPAL selepas exports.peringatanSimpananOurMoney dalam functions/index.js (guna OM_TZ, omTarikhMY, omRM sedia ada).
// Berjalan setiap jam (minit 0, waktu Malaysia). Hantar hanya kepada pengguna yang:
//   - ada misi infaq aktif (ourmoney_goals/{uid}_infaq, status 'aktif', dalam tempoh 365 hari)
//   - peringatan tidak dimatikan (peringatan !== false) dan jam pilihan (peringatan_jam, lalai 20) == jam sekarang
//   - belum merekod infaq hari ini mencukupi sasaran harian
// Token FCM: mynasab_users.fcm_token (sama seperti myNasab / weCare / OurMoney simpanan).

const INFAQ_MS_HARI = 86400000;
const infaqNoHari = (str) => { const [y, m, d] = String(str).split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / INFAQ_MS_HARI); };
const INFAQ_AYAT = [
    'Sedekah kecil yang berterusan lebih baik daripada besar tetapi sekali.',
    'Rezeki yang dikongsi tidak pernah mengurangkan, malah memberkati.',
    'Luangkan seketika untuk menunaikan infaq hari ini.',
    'Sedikit hari ini, besar ganjaran esok. Teruskan misi anda.'
];

async function jalankanPeringatanInfaq(dbRef, messaging, opsi = {}) {
    const now = opsi.now || Date.now();
    const tarikh = omTarikhMY(now);
    const jamKini = opsi.jamPaksa != null ? opsi.jamPaksa : parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: OM_TZ, hour: '2-digit', hour12: false }).format(new Date(now)), 10) % 24;
    const hariNo = infaqNoHari(tarikh);

    const snap = await dbRef.collection('ourmoney_goals').where('jenis', '==', 'infaq_harian').where('status', '==', 'aktif').get();
    let dihantar = 0, langkau = 0;
    const senarai = snap.docs.filter(d => {
        const x = d.data();
        if (!x.owner_uid || !x.mula || !(Number(x.harian) > 0)) return false;
        if (x.peringatan === false) return false;
        const jam = Number.isFinite(x.peringatan_jam) ? x.peringatan_jam : 20;
        if (jam !== jamKini) return false;
        const mulaNo = infaqNoHari(x.mula);
        return hariNo >= mulaNo && hariNo <= mulaNo + 364;      // dalam tempoh 365 hari
    });

    for (let i = 0; i < senarai.length; i += 10) {
        await Promise.all(senarai.slice(i, i + 10).map(async (d) => {
            const x = d.data(), uid = x.owner_uid;
            try {
                const userDoc = await dbRef.collection('mynasab_users').doc(uid).get();
                const udata = userDoc.exists ? userDoc.data() : null;
                if (!udata || !kumpulToken(udata).length) { langkau++; return; }

                const tSnap = await dbRef.collection('ourmoney_transactions').where('owner_uid', '==', uid).where('infaq', '==', true).where('date', '==', tarikh).get();
                let hariIni = 0; tSnap.forEach(t => { const y = t.data(); if (y.type === 'outflow') hariIni += Number(y.amount) || 0; });
                const baki = Number(x.harian) - hariIni;
                if (baki <= 0.005) { langkau++; return; }

                if (!opsi.tanpaLog) {
                    try { await dbRef.collection('ourmoney_notif_log').doc(`${uid}_infaq_${tarikh}`).create({ uid, jenis: 'infaq', tarikh, timestamp: new Date().toISOString() }); }
                    catch (e) { langkau++; return; }          // sudah dihantar hari ini
                }

                const hariKe = hariNo - infaqNoHari(x.mula) + 1;
                const n = await hantarKeSemuaPeranti(dbRef, messaging, uid, udata, {
                    notification: { title: `🤲 Infaq harian · hari ke-${hariKe}`, body: `Baki hari ini ${omRM(baki)}. ${INFAQ_AYAT[hariKe % INFAQ_AYAT.length]}` },
                    data: { app: 'ourmoney', url: '/ourmoney.html', badgeCount: '1', tag: 'ourmoney-infaq' }
                });
                if (n > 0) dihantar++; else langkau++;
            } catch (e) { console.error('Infaq: gagal untuk', uid, e.message); }
        }));
    }
    console.log(`Infaq jam ${jamKini}: dihantar ${dihantar}, dilangkau ${langkau}, calon ${senarai.length}`);
    return { dihantar, langkau };
}

exports.peringatanInfaqHarian = functions
    .runWith({ timeoutSeconds: 300, memory: '256MB' })
    .pubsub.schedule('0 * * * *')
    .timeZone(OM_TZ)
    .onRun(async () => { await jalankanPeringatanInfaq(db, admin.messaging()); return null; });
