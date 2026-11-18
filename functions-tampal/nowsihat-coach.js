// =====================================================================
// nowSIHAT COACH: dashboard coach (baca data klien yang bersetuju, tetapkan sasaran, komen makanan)
// =====================================================================
// TAMPAL seluruh fail ini di HUJUNG functions/index.js, SELEPAS blok nowSihat (guna nsTarikhMY, db, admin, hantarKeSemuaPeranti).
// Deploy:
//   firebase deploy --only functions:nowSihatCoach,functions:nowSihatImbas
//   (nowSihatImbas perlu dideploy semula jika ko tukar baris sasaran di LANGKAH 2 di bawah)
//
// Keselamatan: coach TIDAK membaca data klien terus dari Firestore. Semua melalui fungsi ini, yang
// semak (1) pemanggil coach aktif, (2) klien ada pautan aktif kepada coach itu, (3) apa yang klien benarkan dikongsi.
// =====================================================================

async function nsCoachAktif(uid) {
    const c = await db.collection('nowsihat_coach').doc(uid).get();
    if (!c.exists || c.data().status !== 'aktif') throw new functions.https.HttpsError('permission-denied', 'Akaun coach belum aktif.');
    return c.data();
}
async function nsPautan(coach, klien) {
    const p = await db.collection('nowsihat_klien').doc(klien).get();
    if (!p.exists || p.data().coach_uid !== coach || p.data().status !== 'aktif') throw new functions.https.HttpsError('permission-denied', 'Klien ini tidak berpaut dengan anda.');
    return p.data();
}
const nsTarikhOff = (n) => nsTarikhMY(Date.now() + n * 86400000);
// Sasaran automatik jika klien belum simpan profil (formula sama dengan nowsihat.html)
async function nsSasaranAuto(klien, pr) {
    if (pr.sasaran && Object.keys(pr.sasaran).length) return pr.sasaran;
    let dob = pr.dob, jantina = pr.jantina;
    if (!dob || !jantina) { try { const r = await db.collection('mynasab_nodes').doc('root_' + klien).get(); if (r.exists) { dob = dob || r.data().dob; jantina = jantina || (r.data().gender === 'P' ? 'P' : r.data().gender === 'L' ? 'L' : ''); } } catch (e) {} }
    let berat = +pr.berat, tinggi = +pr.tinggi;
    if (!berat || !tinggi) { try { const u = await db.collection('mynasab_users').doc(klien).get(); if (u.exists) { berat = berat || +u.data().myhealth_berat; tinggi = tinggi || +u.data().myhealth_tinggi; } } catch (e) {} }
    const u = nsUmur(dob), f = +pr.aktiviti || 1.2, fokus = pr.fokus || [];
    const s = { gula: fokus.includes('gula') ? 25 : 50, natrium: fokus.includes('garam') ? 1500 : 2000 };
    if (berat > 0) s.protein = Math.round(berat * (pr.matlamat === 'turun' || fokus.includes('protein') ? 1.2 : 1.0));
    if (u !== null && u >= 18 && berat > 0 && tinggi > 0 && jantina) {
        let k = (10 * berat + 6.25 * tinggi - 5 * u + (jantina === 'L' ? 5 : -161)) * f;
        if (pr.matlamat === 'turun') k -= 400; else if (pr.matlamat === 'naik') k += 300;
        s.kalori = Math.round(Math.max(k, jantina === 'L' ? 1500 : 1200) / 10) * 10;
    }
    return s;
}

exports.nowSihatCoach = functions
    .region('asia-southeast1')
    .https.onCall(async (data, context) => {
        const uid = context.auth && context.auth.uid;
        if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Sila log masuk.');
        const tindakan = data && data.tindakan;

        // ---- KLIEN: Tanya coach tentang satu rekod makan (pilihan gambar) ----
        if (tindakan === 'tanya') {
            const pk = await db.collection('nowsihat_klien').doc(uid).get();
            if (!pk.exists || pk.data().status !== 'aktif') throw new functions.https.HttpsError('failed-precondition', 'Anda belum berpaut dengan coach.');
            const ref = db.collection('nowsihat_log').doc(String(data.log || ''));
            const l = await ref.get();
            if (!l.exists || l.data().uid !== uid) throw new functions.https.HttpsError('not-found', 'Rekod tidak dijumpai.');
            const teks = String(data.teks || '').trim().slice(0, 300);
            const gambar = /^https:\/\/firebasestorage\.googleapis\.com\//.test(String(data.gambar || '')) ? String(data.gambar) : '';
            if (!teks && !gambar) throw new functions.https.HttpsError('invalid-argument', 'Tulis soalan atau lampirkan gambar.');
            await ref.update({ tanya_coach: { teks, gambar, masa: Date.now(), dijawab: false } });
            try {
                const cu = await db.collection('mynasab_users').doc(pk.data().coach_uid).get();
                const nama = String((await db.collection('mynasab_users').doc(uid).get()).data().name || 'Klien').split(' ')[0];
                if (cu.exists) await hantarKeSemuaPeranti(db, admin.messaging(), pk.data().coach_uid, cu.data(), {
                    notification: { title: `${nama} bertanya`, body: (teks || 'Hantar gambar makanan').slice(0, 120) },
                    data: { app: 'nowsihat', url: '/nowsihat-coach.html', tag: `nowsihat-tanya-${l.id}` }
                });
            } catch (e) { console.error('Tanya coach push:', e.message); }
            return { ok: true };
        }

        const coach = await nsCoachAktif(uid);
        const hari7 = Array.from({ length: 7 }, (_, i) => nsTarikhOff(i - 6));

        // ---- Senarai klien + ringkasan 7 hari ----
        if (tindakan === 'senarai') {
            const ps = await db.collection('nowsihat_klien').where('coach_uid', '==', uid).where('status', '==', 'aktif').get();
            const out = [];
            for (const p of ps.docs) {
                const k = p.id, pk = p.data(), kongsi = pk.kongsi || {};
                const [su, sp, ss] = await Promise.all([
                    db.collection('mynasab_users').doc(k).get(),
                    db.collection('nowsihat_profil').doc(k).get(),
                    db.collection('nowsihat_senaman').doc(`${k}_${nsTarikhMY()}`).get()
                ]);
                const pr = sp.exists ? sp.data() : {};
                const harian = Object.fromEntries(hari7.map(t => [t, { kalori: 0, bil: 0 }]));
                let soalan = 0;
                if (kongsi.makan !== false) {
                    const sl = await db.collection('nowsihat_log').where('uid', '==', k).where('tarikh', 'in', hari7).get();
                    sl.forEach(d => { const x = d.data(); if (x.tanya_coach && !x.tanya_coach.dijawab) soalan++; if (harian[x.tarikh]) { harian[x.tarikh].kalori += (x.jumlah || {}).kalori || 0; harian[x.tarikh].bil++; } });
                }
                const sasAuto = await nsSasaranAuto(k, pr);
                const bl = Object.entries(pr.berat_log || {}).sort((a, b) => a[0] < b[0] ? -1 : 1);
                out.push({
                    uid: k, nama: (su.exists && su.data().name) || pk.nama_klien || 'Klien', sejak: pk.masa || null, kongsi,
                    sasaran: Object.assign({}, sasAuto, pr.sasaran_coach || {}), sasaran_coach: !!pr.sasaran_coach, matlamat: pr.matlamat || '', soalan,
                    harian: kongsi.makan !== false ? harian : null,
                    berat: kongsi.berat !== false ? (pr.berat || null) : null,
                    berat_ubah: kongsi.berat !== false && bl.length > 1 ? +(bl[bl.length - 1][1] - bl[0][1]).toFixed(1) : null,
                    senaman_hari_ini: kongsi.senaman !== false ? (ss.exists ? ss.data() : false) : null,
                    streak: kongsi.senaman !== false ? (pr.senaman_streak || 0) : null,
                    langganan_aktif: !!(su.exists && su.data().nowsihat_expiry_date > Date.now())
                });
            }
            return { klien: out, hari: hari7, coach: { nama: coach.nama, kod: coach.kod } };
        }

        const klien = String((data && data.klien) || '');
        if (!klien) throw new functions.https.HttpsError('invalid-argument', 'Klien tidak dinyatakan.');
        const pk = await nsPautan(uid, klien), kongsi = pk.kongsi || {};

        // ---- Butiran seorang klien ----
        if (tindakan === 'klien') {
            const [su, sp] = await Promise.all([db.collection('mynasab_users').doc(klien).get(), db.collection('nowsihat_profil').doc(klien).get()]);
            const pr = sp.exists ? sp.data() : {}, u = su.exists ? su.data() : {};
            let log = [], senaman = [];
            if (kongsi.makan !== false) {
                const sl = await db.collection('nowsihat_log').where('uid', '==', klien).where('tarikh', 'in', hari7).get();
                sl.forEach(d => { const x = d.data(); log.push({ id: d.id, tarikh: x.tarikh, masa: x.masa, makanan: (x.makanan || []).map(m => ({ nama: m.nama, saiz: m.saiz || '', kalori: m.kalori, protein: m.protein, gula: m.gula, natrium: m.natrium })), jumlah: x.jumlah, status: x.status || '', nasihat: x.nasihat || '', komen_coach: x.komen_coach || null, tanya_coach: x.tanya_coach || null, sumber: x.sumber || '' }); });
                log.sort((a, b) => b.masa - a.masa);
            }
            if (kongsi.senaman !== false) {
                const ds = await db.getAll(...hari7.map(t => db.collection('nowsihat_senaman').doc(`${klien}_${t}`)));
                ds.forEach(d => { if (d.exists) senaman.push(d.data()); });
            }
            return {
                nama: u.name || 'Klien', hari: hari7, kongsi,
                profil: { matlamat: pr.matlamat || '', aktiviti: pr.aktiviti || '', fokus: pr.fokus || [], jantina: pr.jantina || '', dob: pr.dob || '', tinggi: pr.tinggi || null,
                          sasaran: await nsSasaranAuto(klien, pr), sasaran_coach: pr.sasaran_coach || null, senaman_rutin: kongsi.senaman !== false ? (pr.senaman || null) : null },
                berat_log: kongsi.berat !== false ? (pr.berat_log || {}) : null,
                keadaan: kongsi.kesihatan === true ? (u.myhealth_status || '') : null,
                log, senaman
            };
        }

        // ---- Tetapkan sasaran (atau padam untuk kembali ke kiraan automatik) ----
        if (tindakan === 'sasaran') {
            const n = (x, mn, mx) => { const v = Math.round(Number(x)); return v >= mn && v <= mx ? v : null; };
            const s = data.padam ? null : { kalori: n(data.kalori, 1000, 5000), protein: n(data.protein, 20, 300), gula: n(data.gula, 5, 100), natrium: n(data.natrium, 500, 4000) };
            if (s) { Object.keys(s).forEach(k => s[k] === null && delete s[k]); s.oleh = uid; s.oleh_nama = coach.nama || 'Coach'; s.masa = Date.now(); }
            await db.collection('nowsihat_profil').doc(klien).set({ sasaran_coach: s || admin.firestore.FieldValue.delete() }, { merge: true });
            return { ok: true, sasaran_coach: s };
        }

        // ---- Komen pada rekod makanan (klien dapat notifikasi) ----
        if (tindakan === 'komen') {
            if (kongsi.makan === false) throw new functions.https.HttpsError('permission-denied', 'Klien tidak berkongsi rekod makan.');
            const ref = db.collection('nowsihat_log').doc(String(data.log || ''));
            const l = await ref.get();
            if (!l.exists || l.data().uid !== klien) throw new functions.https.HttpsError('not-found', 'Rekod tidak dijumpai.');
            const teks = String(data.teks || '').trim().slice(0, 300);
            const kemas = { komen_coach: teks ? { teks, oleh: uid, oleh_nama: coach.nama || 'Coach', masa: Date.now() } : admin.firestore.FieldValue.delete() };
            if (teks && l.data().tanya_coach) kemas['tanya_coach.dijawab'] = true;
            await ref.update(kemas);
            if (teks) {
                try {
                    const u = await db.collection('mynasab_users').doc(klien).get();
                    if (u.exists) await hantarKeSemuaPeranti(db, admin.messaging(), klien, u.data(), {
                        notification: { title: `${coach.nama || 'Coach'} komen pada makanan anda`, body: teks.slice(0, 120) },
                        data: { app: 'nowsihat', url: '/nowsihat.html', tag: `nowsihat-komen-${l.id}` }
                    });
                } catch (e) { console.error('Coach komen push:', e.message); }
            }
            return { ok: true };
        }

        throw new functions.https.HttpsError('invalid-argument', 'Tindakan tidak sah.');
    });

// =====================================================================
// LANGKAH 2 (dalam exports.nowSihatImbas yang sedia ada): supaya AI guna sasaran coach,
// GANTI baris:
//         const sasaran = pr.sasaran || {};
// DENGAN:
//         const sasaran = Object.assign({}, pr.sasaran || {}, pr.sasaran_coach || {});
// =====================================================================

// =====================================================================
// PERATURAN FIRESTORE (tambah)
// =====================================================================
/*
match /nowsihat_coach/{uid} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.auth.uid == uid
                && request.resource.data.uid == uid && request.resource.data.status == 'mohon';
  allow update: if request.auth != null && (
                  request.auth.token.email == 'dae.book89@gmail.com' ||
                  (request.auth.uid == uid && request.resource.data.status == resource.data.status
                   && request.resource.data.get('kod', '') == resource.data.get('kod', '')));
  allow delete: if request.auth != null && (request.auth.uid == uid || request.auth.token.email == 'dae.book89@gmail.com');
}
match /nowsihat_klien/{uid} {
  allow read: if request.auth != null && (resource == null || request.auth.uid == uid || resource.data.coach_uid == request.auth.uid);
  allow create, update: if request.auth != null && request.auth.uid == uid && request.resource.data.klien_uid == uid
                        && get(/databases/$(database)/documents/nowsihat_coach/$(request.resource.data.coach_uid)).data.status == 'aktif';
  allow delete: if request.auth != null && (request.auth.uid == uid || resource.data.coach_uid == request.auth.uid);
}
*/

// =====================================================================
// STORAGE (gambar "Tanya coach")
// =====================================================================
// 1. Peraturan Storage - tambah dalam match /b/{bucket}/o { ... }:
/*
    match /nowsihat_tanya/{uid}/{fail} {
      allow write: if request.auth != null && request.auth.uid == uid
                   && request.resource.size < 3 * 1024 * 1024 && request.resource.contentType.matches('image/.*');
      allow read: if request.auth != null && (request.auth.uid == uid
                   || firestore.get(/databases/(default)/documents/nowsihat_klien/$(uid)).data.coach_uid == request.auth.uid);
      allow delete: if request.auth != null && request.auth.uid == uid;
    }
*/
// 2. Lifecycle (Cloud Storage -> bucket -> Lifecycle -> Add a rule):
//    Delete object, Age 7 hari, Object name matches prefix: nowsihat_tanya/

