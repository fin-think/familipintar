// =====================================================================
// LANGGANAN weCare & OurMoney DI SERVER (ganti tulisan terus dari browser)
// TAMPAL di HUJUNG functions/index.js (guna db, admin, functions sedia ada).
// Harga & tempoh percubaan dibaca dari tetapan_awam/harga (sama macam app).
// =====================================================================
// Panggilan dari app: httpsCallable(fns, 'langganApp')({ app: 'wecare' | 'ourmoney', tindakan: 'mula' | 'baharu' })
//   mula   -> percubaan percuma (sekali sahaja), tempoh = percubaan_hari (asal 30)
//   baharu -> potong wecare_kredit / ourmoney_kredit (asal 20), tambah 30 hari dari tarikh tamat semasa (atau hari ini jika dah tamat)

const LA_MEDAN = { wecare: 'wecare_expiry_date', ourmoney: 'ourmoney_expiry_date' };
const LA_HARI = 30;

exports.langganApp = functions
    .region('asia-southeast1')
    .https.onCall(async (data, context) => {
        const uid = context.auth && context.auth.uid;
        if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Sila log masuk.');
        const appNama = data && data.app, medan = LA_MEDAN[appNama];
        if (!medan) throw new functions.https.HttpsError('invalid-argument', 'App tidak sah.');

        // Tetapan harga (admin boleh ubah di Tetapan)
        let percuba = 30, kredit = 20;
        try {
            const s = await db.collection('tetapan_awam').doc('harga').get();
            if (s.exists) {
                const d = s.data(), p = Number(d.percubaan_hari), k = Number(d[appNama + '_kredit']);
                if (Number.isFinite(p) && p >= 1) percuba = p;
                if (Number.isFinite(k) && k >= 0) kredit = k;
            }
        } catch (e) {}

        const ref = db.collection('mynasab_users').doc(uid);
        return db.runTransaction(async (t) => {
            const s = await t.get(ref);
            if (!s.exists) throw new functions.https.HttpsError('not-found', 'Akaun tidak dijumpai.');
            const u = s.data(), kini = Date.now();

            if (data.tindakan === 'mula') {
                if (u[medan]) return { tamat: u[medan], baru: false };          // percubaan sekali sahaja
                const tamat = kini + percuba * 86400000;
                t.update(ref, { [medan]: tamat });
                return { tamat, baru: true, hari: percuba };
            }

            if (data.tindakan === 'baharu') {
                const baki = parseInt(u.credit_balance) || 0;
                if (baki < kredit) throw new functions.https.HttpsError('failed-precondition', `Kredit tidak mencukupi. Baki: ${baki} kredit.`);
                const tamat = Math.max(kini, Number(u[medan]) || 0) + LA_HARI * 86400000;
                t.update(ref, { credit_balance: baki - kredit, [medan]: tamat });
                return { tamat, baki: baki - kredit, kredit };
            }

            throw new functions.https.HttpsError('invalid-argument', 'Tindakan tidak sah.');
        });
    });
