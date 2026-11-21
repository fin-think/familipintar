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
    if (!c.exists || c.data().status !== 'aktif') throw new functions.https.HttpsError('permission-denied', 'Akaun coach tidak aktif.');
    return c.data();
}
// Pautan klien: id dokumen = pid klien (uid atau uid_pasangan)
async function nsPautan(coach, pid) {
    const p = await db.collection('nowsihat_klien').doc(pid).get();
    if (!p.exists || p.data().coach_uid !== coach || p.data().status !== 'aktif') throw new functions.https.HttpsError('permission-denied', 'Klien ini tidak berpaut dengan anda.');
    const d = p.data(); return { ...d, klien_uid: d.klien_uid || pid.replace(/_pasangan$/, ''), per: nsPer(d.per || (pid.endsWith('_pasangan') ? 'pasangan' : 'induk')) };
}
const nsTarikhOff = (n) => nsTarikhMY(Date.now() + n * 86400000);
// Gambar profil dari pokok myNasab (induk: nod root; pasangan: nod Suami/Isteri)
async function nsFoto(uid, per) {
    try {
        if (nsPer(per) === 'induk') { const r = await db.collection('mynasab_nodes').doc('root_' + uid).get(); return (r.exists && r.data().photo_url) || ''; }
        const q = await db.collection('mynasab_nodes').where('owner_uid', '==', uid).where('relationship', 'in', ['Suami', 'Isteri']).limit(1).get();
        return q.empty ? '' : (q.docs[0].data().photo_url || '');
    } catch (e) { return ''; }
}
// Sasaran automatik jika klien belum simpan profil (formula sama dengan nowsihat.html)
async function nsSasaranAuto(klien, pr, per) {
    per = nsPer(per); const aw = per === 'pasangan' ? 'pasangan_' : '';
    if (pr.sasaran && Object.keys(pr.sasaran).length) return pr.sasaran;
    let dob = pr.dob, jantina = pr.jantina;
    if ((!dob || !jantina) && per === 'induk') { try { const r = await db.collection('mynasab_nodes').doc('root_' + klien).get(); if (r.exists) { dob = dob || r.data().dob; jantina = jantina || (r.data().gender === 'P' ? 'P' : r.data().gender === 'L' ? 'L' : ''); } } catch (e) {} }
    let berat = +pr.berat, tinggi = +pr.tinggi;
    if (!berat || !tinggi) { try { const u = await db.collection('mynasab_users').doc(klien).get(); if (u.exists) { berat = berat || +u.data()[aw + 'myhealth_berat']; tinggi = tinggi || +u.data()[aw + 'myhealth_tinggi']; } } catch (e) {} }
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
        const T = await nsTetapan();

        // ---- DAFTAR COACH: percuma, aktif terus, mula tempoh ujian klien ----
        // (Guna nowSihat untuk diri sendiri perlu langganan biasa nowsihat_expiry_date.)
        if (tindakan === 'daftar') {
            const uref = db.collection('mynasab_users').doc(uid), cref = db.collection('nowsihat_coach').doc(uid);
            const [su, sc] = await Promise.all([uref.get(), cref.get()]);
            const u = su.exists ? su.data() : {}, c = sc.exists ? sc.data() : null, kini = Date.now();
            if (c && c.status === 'aktif') throw new functions.https.HttpsError('already-exists', 'Akaun coach anda sudah aktif.');
            if (!u.is_affiliate || !u.referral_code) throw new functions.https.HttpsError('failed-precondition', 'Daftar sebagai Affiliate dahulu.');
            const nama = String((data && data.nama) || u.name || 'Coach').trim().slice(0, 60), bio = String((data && data.bio) || '').trim().slice(0, 200);
            await cref.set({ uid, nama, bio, foto: await nsFoto(uid, 'induk'), kod: u.referral_code, emel: u.email || '', status: 'aktif', mula: kini,
                             ujian_tamat: kini + T.coach_ujian_hari * 86400000, ujian_min: T.coach_min_klien, ujian_lulus: false, sebab: '',
                             coach_tamat: admin.firestore.FieldValue.delete() }, { merge: true });
            return { ok: true };
        }

        // ---- KLIEN: Tanya coach tentang satu rekod makan (pilihan gambar) ----
        if (tindakan === 'tanya') {
            const per = nsPer(data && data.per);
            const pk = await db.collection('nowsihat_klien').doc(nsPid(uid, per)).get();
            if (!pk.exists || pk.data().status !== 'aktif') throw new functions.https.HttpsError('failed-precondition', 'Anda belum berpaut dengan coach.');
            const ref = db.collection('nowsihat_log').doc(String(data.log || ''));
            const l = await ref.get();
            if (!l.exists || l.data().uid !== uid || nsPer(l.data().per) !== per) throw new functions.https.HttpsError('not-found', 'Rekod tidak dijumpai.');
            const teks = String(data.teks || '').trim().slice(0, 300);
            const gambar = /^https:\/\/firebasestorage\.googleapis\.com\//.test(String(data.gambar || '')) ? String(data.gambar) : '';
            if (!teks && !gambar) throw new functions.https.HttpsError('invalid-argument', 'Tulis soalan atau lampirkan gambar.');
            await ref.update({ tanya_coach: { teks, gambar, masa: Date.now(), dijawab: false } });
            try {
                const cu = await db.collection('mynasab_users').doc(pk.data().coach_uid).get();
                const nama = String(pk.data().nama_klien || (await db.collection('mynasab_users').doc(uid).get()).data().name || 'Klien').split(' ')[0];
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
            let keluarga = new Set(); try { keluarga = await slKeluargaPenuh(uid); } catch (e) {}   // keluarga coach (ikut myNasab) tidak dikira dalam syarat
            for (const p of ps.docs) {
                const k = p.id, pk = p.data(), kongsi = pk.kongsi || {};
                const kuid = pk.klien_uid || k.replace(/_pasangan$/, ''), kper = nsPer(pk.per || (k.endsWith('_pasangan') ? 'pasangan' : 'induk'));
                const [su, sp, ss] = await Promise.all([
                    db.collection('mynasab_users').doc(kuid).get(),
                    db.collection('nowsihat_profil').doc(k).get(),
                    db.collection('nowsihat_senaman').doc(`${k}_${nsTarikhMY()}`).get()
                ]);
                const pr = sp.exists ? sp.data() : {};
                const harian = Object.fromEntries(hari7.map(t => [t, { kalori: 0, bil: 0 }]));
                let soalan = 0;
                if (kongsi.makan !== false) {
                    const sl = await db.collection('nowsihat_log').where('uid', '==', kuid).where('tarikh', 'in', hari7).get();
                    sl.forEach(d => { const x = d.data(); if (nsPer(x.per) !== kper) return; if (x.tanya_coach && !x.tanya_coach.dijawab) soalan++; if (harian[x.tarikh]) { harian[x.tarikh].kalori += (x.jumlah || {}).kalori || 0; harian[x.tarikh].bil++; } });
                }
                const sasAuto = await nsSasaranAuto(kuid, pr, kper);
                const bl = Object.entries(pr.berat_log || {}).sort((a, b) => a[0] < b[0] ? -1 : 1);
                out.push({
                    uid: k, nama: pk.nama_klien || (su.exists && su.data().name) || 'Klien', foto: await nsFoto(kuid, kper), keluarga: keluarga.has(kuid), sejak: pk.masa || null, kongsi,
                    sasaran: Object.assign({}, sasAuto, pr.sasaran_coach || {}), sasaran_coach: !!pr.sasaran_coach, matlamat: pr.matlamat || '', soalan,
                    harian: kongsi.makan !== false ? harian : null,
                    berat: kongsi.berat !== false ? (pr.berat || null) : null,
                    berat_ubah: kongsi.berat !== false && bl.length > 1 ? +(bl[bl.length - 1][1] - bl[0][1]).toFixed(1) : null,
                    senaman_hari_ini: kongsi.senaman !== false ? (ss.exists ? ss.data() : false) : null,
                    streak: kongsi.senaman !== false ? (pr.senaman_streak || 0) : null,
                    langganan_aktif: !!(su.exists && su.data().nowsihat_expiry_date > Date.now())
                });
            }
            const fotoCoach = await nsFoto(uid, 'induk');
            if (fotoCoach !== (coach.foto || '')) db.collection('nowsihat_coach').doc(uid).update({ foto: fotoCoach }).catch(() => {});   // segarkan gambar coach
            const layak = new Set(out.filter(k => !k.keluarga && !k.uid.startsWith(uid)).map(k => k.uid.replace(/_pasangan$/, ''))).size;
            return { klien: out, hari: hari7, coach: { nama: coach.nama, kod: coach.kod, foto: fotoCoach, ujian_tamat: coach.ujian_tamat || null, ujian_lulus: !!coach.ujian_lulus, ujian_min: coach.ujian_min || T.coach_min_klien, layak } };
        }

        const klien = String((data && data.klien) || '');
        if (!klien) throw new functions.https.HttpsError('invalid-argument', 'Klien tidak dinyatakan.');
        const pk = await nsPautan(uid, klien), kongsi = pk.kongsi || {}, kuid = pk.klien_uid, kper = pk.per;   // klien = pid

        // ---- Butiran seorang klien ----
        if (tindakan === 'klien') {
            const [su, sp] = await Promise.all([db.collection('mynasab_users').doc(kuid).get(), db.collection('nowsihat_profil').doc(klien).get()]);
            const pr = sp.exists ? sp.data() : {}, u = su.exists ? su.data() : {};
            let log = [], senaman = [];
            if (kongsi.makan !== false) {
                const sl = await db.collection('nowsihat_log').where('uid', '==', kuid).where('tarikh', 'in', hari7).get();
                sl.forEach(d => { const x = d.data(); if (nsPer(x.per) !== kper) return; log.push({ id: d.id, tarikh: x.tarikh, masa: x.masa, makanan: (x.makanan || []).map(m => ({ nama: m.nama, saiz: m.saiz || '', kalori: m.kalori, protein: m.protein, gula: m.gula, natrium: m.natrium })), jumlah: x.jumlah, status: x.status || '', nasihat: x.nasihat || '', komen_coach: x.komen_coach || null, tanya_coach: x.tanya_coach || null, sumber: x.sumber || '' }); });
                log.sort((a, b) => b.masa - a.masa);
            }
            if (kongsi.senaman !== false) {
                const ds = await db.getAll(...hari7.map(t => db.collection('nowsihat_senaman').doc(`${klien}_${t}`)));
                ds.forEach(d => { if (d.exists) senaman.push(d.data()); });
            }
            return {
                nama: pk.nama_klien || u.name || 'Klien', foto: await nsFoto(kuid, kper), hari: hari7, kongsi,
                profil: { matlamat: pr.matlamat || '', aktiviti: pr.aktiviti || '', fokus: pr.fokus || [], jantina: pr.jantina || '', dob: pr.dob || '', tinggi: pr.tinggi || null,
                          sasaran: await nsSasaranAuto(kuid, pr, kper), sasaran_coach: pr.sasaran_coach || null, senaman_rutin: kongsi.senaman !== false ? (pr.senaman || null) : null },
                berat_log: kongsi.berat !== false ? (pr.berat_log || {}) : null,
                keadaan: kongsi.kesihatan === true ? (Array.isArray(pr.keadaan) ? pr.keadaan.join(', ') : (u[(kper === 'pasangan' ? 'pasangan_' : '') + 'myhealth_status'] || '')) : null,
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
            if (!l.exists || l.data().uid !== kuid || nsPer(l.data().per) !== kper) throw new functions.https.HttpsError('not-found', 'Rekod tidak dijumpai.');
            const teks = String(data.teks || '').trim().slice(0, 300);
            const kemas = { komen_coach: teks ? { teks, oleh: uid, oleh_nama: coach.nama || 'Coach', masa: Date.now() } : admin.firestore.FieldValue.delete() };
            if (teks && l.data().tanya_coach) kemas['tanya_coach.dijawab'] = true;
            await ref.update(kemas);
            if (teks) {
                try {
                    const u = await db.collection('mynasab_users').doc(kuid).get();
                    if (u.exists) await hantarKeSemuaPeranti(db, admin.messaging(), kuid, u.data(), {
                        notification: { title: `${coach.nama || 'Coach'} komen pada makanan anda`, body: teks.slice(0, 120) },
                        data: { app: 'nowsihat', url: '/nowsihat.html', tag: `nowsihat-komen-${l.id}` }
                    });
                } catch (e) { console.error('Coach komen push:', e.message); }
            }
            return { ok: true };
        }

        throw new functions.https.HttpsError('invalid-argument', 'Tindakan tidak sah.');
    });

// Semakan harian coach: selepas tempoh ujian, mesti ada sekurang-kurangnya N klien BUKAN keluarga (ikut myNasab).
// Jika tidak, akaun coach dinyahaktifkan dan coach dimaklumkan.
exports.nowSihatCoachSemak = functions
    .region('asia-southeast1')
    .pubsub.schedule('every day 09:00').timeZone('Asia/Kuala_Lumpur')
    .onRun(async () => {
        const sn = await db.collection('nowsihat_coach').where('status', '==', 'aktif').get();
        for (const d of sn.docs) {
            const c = d.data();
            if (c.ujian_lulus || !c.ujian_tamat || c.ujian_tamat > Date.now()) continue;
            let keluarga = new Set(); try { keluarga = await slKeluargaPenuh(d.id); } catch (e) {}
            const ps = await db.collection('nowsihat_klien').where('coach_uid', '==', d.id).where('status', '==', 'aktif').get();
            const layak = new Set(); ps.forEach(p => { const ku = p.data().klien_uid || p.id.replace(/_pasangan$/, ''); if (ku !== d.id && !keluarga.has(ku)) layak.add(ku); });
            const min = c.ujian_min || 3;
            if (layak.size >= min) { await d.ref.update({ ujian_lulus: true }); continue; }
            const sebab = `Kurang daripada ${min} klien bukan keluarga dalam tempoh ujian (${layak.size} klien).`;
            await d.ref.update({ status: 'nyahaktif', sebab, nyahaktif_pada: Date.now() });
            try {
                const u = await db.collection('mynasab_users').doc(d.id).get();
                if (u.exists) await hantarKeSemuaPeranti(db, admin.messaging(), d.id, u.data(), {
                    notification: { title: 'Akaun coach nowSihat dinyahaktifkan', body: sebab + ' Anda boleh daftar semula bila-bila masa.' },
                    data: { app: 'nowsihat', url: '/nowsihat.html', tag: 'nowsihat-coach-semak' }
                });
            } catch (e) { console.error('Coach semak push:', e.message); }
        }
        return null;
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

