// =====================================================================
// nowSIHAT: imbas gambar makanan dengan Gemini + langganan 20 kredit/bulan
// =====================================================================
// TAMPAL seluruh fail ini di HUJUNG functions/index.js (guna `db`, `admin`, `functions` yang sudah ada).
//
// SEBELUM DEPLOY (sekali sahaja):
//   1. Dapatkan kunci API Gemini: https://aistudio.google.com/apikey  -> Create API key (pilih projek familipintar)
//   2. Simpan sebagai rahsia (JANGAN tampal kunci dalam kod):
//        firebase functions:secrets:set GEMINI_KEY
//      (tampal kunci bila diminta, tekan Enter)
//   3. Deploy:
//        firebase deploy --only functions:nowSihatLanggan,functions:nowSihatImbas,functions:nowSihatPeringatan
//
// Peraturan perniagaan:
//   - Percubaan percuma 30 hari bila pengguna mula (sama seperti weCare & OurMoney), kemudian 20 kredit / 30 hari.
//   - Had 8 imbasan sehari dalam langganan. Lepas had: 1 kredit = 3 imbasan tambahan (hari itu sahaja).
//   - Gambar TIDAK disimpan. Hanya keputusan analisis disimpan dalam nowsihat_log.
// =====================================================================

const NS_MODEL = 'gemini-3.5-flash-lite';       // tukar di sini jika mahu model lain (cth 'gemini-3.5-flash')
const NS_HAD_HARIAN = 8, NS_KREDIT_TAMBAHAN = 1, NS_IMBAS_TAMBAHAN = 3, NS_LANGGAN_KREDIT = 20, NS_HARI = 30;
const nsTarikhMY = (ms) => new Date((ms || Date.now()) + 8 * 3600000).toISOString().slice(0, 10);

function nsUmur(dob) {
    if (!dob) return null;
    const p = String(dob).split('-').map(Number); if (!p[0]) return null;
    const k = new Date(Date.now() + 8 * 3600000);
    let u = k.getUTCFullYear() - p[0];
    if ((k.getUTCMonth() + 1) < (p[1] || 1) || ((k.getUTCMonth() + 1) === (p[1] || 1) && k.getUTCDate() < (p[2] || 1))) u--;
    return u >= 0 && u < 130 ? u : null;
}

// Langganan: { tindakan: 'mula' } -> percubaan 30 hari (sekali sahaja); { tindakan: 'baharu' } -> potong 20 kredit, +30 hari
exports.nowSihatLanggan = functions
    .region('asia-southeast1')
    .https.onCall(async (data, context) => {
        const uid = context.auth && context.auth.uid;
        if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Sila log masuk.');
        const ref = db.collection('mynasab_users').doc(uid);
        return db.runTransaction(async (t) => {
            const s = await t.get(ref); if (!s.exists) throw new functions.https.HttpsError('not-found', 'Akaun tidak dijumpai.');
            const u = s.data(), kini = Date.now();
            if (data && data.tindakan === 'mula') {
                if (u.nowsihat_expiry_date) return { tamat: u.nowsihat_expiry_date, baru: false };
                const tamat = kini + NS_HARI * 86400000;
                t.update(ref, { nowsihat_expiry_date: tamat, nowsihat_mula: kini });
                return { tamat, baru: true };
            }
            if (data && data.tindakan === 'baharu') {
                const baki = parseInt(u.credit_balance) || 0;
                if (baki < NS_LANGGAN_KREDIT) throw new functions.https.HttpsError('failed-precondition', `Kredit tidak mencukupi. Baki: ${baki} kredit.`);
                const tamat = Math.max(kini, u.nowsihat_expiry_date || 0) + NS_HARI * 86400000;
                t.update(ref, { credit_balance: baki - NS_LANGGAN_KREDIT, nowsihat_expiry_date: tamat });
                return { tamat, baki: baki - NS_LANGGAN_KREDIT };
            }
            throw new functions.https.HttpsError('invalid-argument', 'Tindakan tidak sah.');
        });
    });

// Imbas: { gambar: base64 JPEG, nota?: 'saiz/keterangan', bayarTambahan?: true }
exports.nowSihatImbas = functions
    .region('asia-southeast1')
    .runWith({ secrets: ['GEMINI_KEY'], timeoutSeconds: 60, memory: '512MB' })
    .https.onCall(async (data, context) => {
        const uid = context.auth && context.auth.uid;
        if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Sila log masuk.');
        const gambar = String((data && data.gambar) || '');
        if (!gambar || gambar.length > 2.5 * 1024 * 1024) throw new functions.https.HttpsError('invalid-argument', 'Gambar tiada atau terlalu besar.');
        const nota = String((data && data.nota) || '').slice(0, 200);
        const puasa = !!(data && data.puasa);

        const userRef = db.collection('mynasab_users').doc(uid);
        const hari = nsTarikhMY(), harianRef = db.collection('nowsihat_harian').doc(`${uid}_${hari}`);

        // 1. Semak langganan + had harian (dan potong kredit tambahan jika diminta) dalam satu transaksi
        await db.runTransaction(async (t) => {
            const [su, sh] = await Promise.all([t.get(userRef), t.get(harianRef)]);
            const u = su.exists ? su.data() : {};
            if (!u.nowsihat_expiry_date || u.nowsihat_expiry_date < Date.now()) throw new functions.https.HttpsError('permission-denied', 'LANGGANAN_TAMAT');
            const h = sh.exists ? sh.data() : { uid, tarikh: hari, bil: 0, tambahan: 0 };
            const had = NS_HAD_HARIAN + (h.tambahan || 0);
            if ((h.bil || 0) >= had) {
                if (!(data && data.bayarTambahan)) throw new functions.https.HttpsError('resource-exhausted', 'HAD_HARIAN');
                const baki = parseInt(u.credit_balance) || 0;
                if (baki < NS_KREDIT_TAMBAHAN) throw new functions.https.HttpsError('failed-precondition', `Kredit tidak mencukupi. Baki: ${baki} kredit.`);
                t.update(userRef, { credit_balance: baki - NS_KREDIT_TAMBAHAN });
                h.tambahan = (h.tambahan || 0) + NS_IMBAS_TAMBAHAN;
            }
            t.set(harianRef, { uid, tarikh: hari, bil: (h.bil || 0) + 1, tambahan: h.tambahan || 0, luput_pada: admin.firestore.Timestamp.fromMillis(Date.now() + 3 * 86400000) }, { merge: true });
        });

        // 2. Konteks pengguna: profil + jumlah hari ini
        const [sp, sr, slog, su2] = await Promise.all([
            db.collection('nowsihat_profil').doc(uid).get(),
            db.collection('mynasab_nodes').doc('root_' + uid).get(),
            db.collection('nowsihat_log').where('uid', '==', uid).where('tarikh', '==', hari).get(),
            userRef.get()
        ]);
        const keadaan = (su2.exists && su2.data().myhealth_status && su2.data().myhealth_status !== 'tiada') ? String(su2.data().myhealth_status) : '';   // daripada myHEALTH
        const pr = sp.exists ? sp.data() : {}, akar = sr.exists ? sr.data() : {};
        const umur = nsUmur(pr.dob || akar.dob), jantina = pr.jantina || (akar.gender === 'P' ? 'P' : akar.gender === 'L' ? 'L' : '');
        const sudah = { kalori: 0, protein: 0, gula: 0, natrium: 0 };
        slog.forEach(d => { const j = d.data().jumlah || {}; for (const k in sudah) sudah[k] += Number(j[k]) || 0; });
        const sasaran = pr.sasaran || {};

        const prompt = `Anda pembantu pemakanan untuk pengguna di Malaysia. Kenal pasti makanan/minuman dalam gambar dan anggarkan nutrisi untuk hidangan yang kelihatan.
Maklumat pengguna: umur ${umur ?? 'tidak diketahui'}, jantina ${jantina === 'P' ? 'perempuan' : jantina === 'L' ? 'lelaki' : 'tidak diketahui'}, matlamat ${pr.matlamat || 'kekal sihat'}${pr.fokus && pr.fokus.length ? ', fokus: ' + pr.fokus.join(', ') : ''}.
${keadaan ? 'Keadaan kesihatan yang dilaporkan pengguna: ' + keadaan + '. Ambil kira dalam nasihat (cth. gula, garam, lemak, purin), tanpa diagnosis.\n' : ''}Sasaran harian: kalori ${sasaran.kalori || '-'} kcal, protein ${sasaran.protein || '-'} g, gula tambahan maksimum ${sasaran.gula || 50} g, natrium maksimum ${sasaran.natrium || 2000} mg.
Sudah dimakan hari ini (sebelum hidangan ini): kalori ${Math.round(sudah.kalori)} kcal, protein ${Math.round(sudah.protein)} g, gula ${Math.round(sudah.gula)} g, natrium ${Math.round(sudah.natrium)} mg.
${nota ? 'Keterangan daripada pengguna: ' + nota : ''}
Waktu sekarang (Malaysia): ${new Date(Date.now() + 8 * 3600000).toISOString().slice(11, 16)}.
${puasa ? 'Pengguna sedang berpuasa sunat hari ini: anggap hidangan ini sahur atau berbuka (ikut waktu) dan beri nasihat yang sesuai.' : ''}
Peraturan:
- Gunakan anggaran saiz hidangan biasa di Malaysia jika saiz tidak jelas. Nyatakan anggaran saiz.
- Jika gambar bukan makanan atau minuman, pulangkan makanan = [] dan status "bukan_makanan".
- Nasihat dalam Bahasa Melayu santai dan mesra, maksimum 2 ayat, praktikal (cth. kurangkan kuah, tambah sayur). Jangan memalukan pengguna. Jangan beri nasihat perubatan atau diagnosis.
${umur !== null && umur < 18 ? '- Pengguna bawah 18 tahun: JANGAN sebut kiraan kalori atau diet dalam nasihat; fokus pada pinggan seimbang dan tumbesaran.' : ''}
- seterusnya: SATU ayat cadangan konkrit untuk waktu makan seterusnya (tengah hari / malam / sarapan esok, atau berbuka / sahur jika berpuasa) berdasarkan baki hari ini, cth. apa yang perlu dikurangkan dan apa yang perlu ditambah.
- status: "baik" (sesuai), "sederhana" (boleh, dengan pelarasan), "kurangkan" (tinggi gula/garam/lemak berbanding baki hari ini).
Pulangkan JSON SAHAJA dengan bentuk:
{"makanan":[{"nama":"","saiz":"","kalori":0,"protein":0,"karbo":0,"lemak":0,"gula":0,"natrium":0}],"jumlah":{"kalori":0,"protein":0,"karbo":0,"lemak":0,"gula":0,"natrium":0},"status":"baik","nasihat":"","seterusnya":""}
Unit: kalori kcal; protein/karbo/lemak/gula gram; natrium mg. Nombor bulat.`;

        let hasil;
        try {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${NS_MODEL}:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_KEY },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: gambar } }] }],
                    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
                })
            });
            const j = await r.json();
            if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
            const teks = (((j.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text || '').join('') || '';
            hasil = JSON.parse(teks.replace(/^```json\s*|\s*```$/g, ''));
        } catch (e) {
            console.error('nowSihat: Gemini gagal:', uid, e.message);
            // Pulangkan kiraan imbasan supaya pengguna tidak rugi
            await harianRef.update({ bil: admin.firestore.FieldValue.increment(-1) }).catch(() => {});
            throw new functions.https.HttpsError('unavailable', 'Analisis gagal. Sila cuba lagi sebentar.');
        }

        const n = (x) => Math.max(0, Math.round(Number(x) || 0));
        const makanan = (Array.isArray(hasil.makanan) ? hasil.makanan : []).slice(0, 12).map(m => ({
            nama: String(m.nama || '').slice(0, 80), saiz: String(m.saiz || '').slice(0, 60),
            kalori: n(m.kalori), protein: n(m.protein), karbo: n(m.karbo), lemak: n(m.lemak), gula: n(m.gula), natrium: n(m.natrium)
        }));
        const jumlah = { kalori: 0, protein: 0, karbo: 0, lemak: 0, gula: 0, natrium: 0 };
        makanan.forEach(m => { for (const k in jumlah) jumlah[k] += m[k]; });
        const status = ['baik', 'sederhana', 'kurangkan', 'bukan_makanan'].includes(hasil.status) ? hasil.status : 'sederhana';
        const rekod = { uid, tarikh: hari, masa: Date.now(), makanan, jumlah, status, nasihat: String(hasil.nasihat || '').slice(0, 400), seterusnya: String(hasil.seterusnya || '').slice(0, 300), puasa, nota, model: NS_MODEL };

        if (status === 'bukan_makanan' || !makanan.length) {
            await harianRef.update({ bil: admin.firestore.FieldValue.increment(-1) }).catch(() => {});
            return { ...rekod, id: null };
        }
        const ref = await db.collection('nowsihat_log').add(rekod);
        return { ...rekod, id: ref.id };
    });


// Peringatan senaman: setiap 30 minit, hantar push kepada pengguna yang rutinnya jatuh pada slot ini dan belum tanda "Dah buat"
exports.nowSihatPeringatan = functions
    .region('asia-southeast1')
    .pubsub.schedule('every 30 minutes').timeZone('Asia/Kuala_Lumpur')
    .onRun(async () => {
        const k = new Date(Date.now() + 8 * 3600000);
        const slot = `${String(k.getUTCHours()).padStart(2, '0')}:${k.getUTCMinutes() < 30 ? '00' : '30'}`, dow = k.getUTCDay(), hari = nsTarikhMY();
        const sn = await db.collection('nowsihat_profil').where('senaman.notif', '==', true).where('senaman.masa', '==', slot).get();
        let n = 0;
        for (const d of sn.docs) {
            const s = d.data().senaman || {};
            if (!(s.hari || []).includes(dow)) continue;
            if ((await db.collection('nowsihat_senaman').doc(`${d.id}_${hari}`).get()).exists) continue;
            const u = await db.collection('mynasab_users').doc(d.id).get();
            if (!u.exists || !(u.data().nowsihat_expiry_date > Date.now())) continue;
            const nama = s.jenis === 'jog' ? 'jogging' : 'brisk walk';
            try {
                n += await hantarKeSemuaPeranti(db, admin.messaging(), d.id, u.data(), {
                    notification: { title: `Masa untuk ${nama}`, body: `${s.minit || 30} minit ${nama} hari ini. Siap nanti, tekan "Dah buat" di nowSihat.` },
                    data: { app: 'nowsihat', url: '/nowsihat.html', tag: `nowsihat-senaman-${hari}` }
                });
            } catch (e) { console.error('nowSihat peringatan:', d.id, e.message); }
        }
        console.log(`nowSihat peringatan ${slot}: ${n} push`);
        return null;
    });

// =====================================================================
// PERATURAN FIRESTORE (tampal dalam match /databases/{database}/documents { ... })
// =====================================================================
/*
    match /nowsihat_profil/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /nowsihat_log/{id} {
      allow read, delete: if request.auth != null && resource.data.uid == request.auth.uid;
      allow create, update: if false;      // hanya Cloud Function
    }
    match /nowsihat_senaman/{id} {
      allow read, delete: if request.auth != null && resource.data.uid == request.auth.uid;
      allow create, update: if request.auth != null && request.resource.data.uid == request.auth.uid
                            && id == request.auth.uid + '_' + request.resource.data.tarikh;
    }
    match /nowsihat_harian/{id} {
      allow read: if request.auth != null && resource.data.uid == request.auth.uid;
      allow write: if false;               // hanya Cloud Function
    }
*/
// INDEKS: kali pertama buka nowSihat, Firestore mungkin minta indeks (uid + tarikh) untuk nowsihat_log.
// Klik pautan dalam ralat konsol / log fungsi, Create, tunggu beberapa minit.
// TTL (pilihan): collection group nowsihat_harian, medan luput_pada (padam kiraan harian lama).
