// =====================================================================
// PETI NOTIFIKASI (72 JAM) - Muhasabah & myChecklist40 sahaja
// =====================================================================
// CARA TAMPAL dalam functions/index.js:
//   Cari fungsi:  async function cl40Hantar(dbRef, messaging, uid, medanToken, tokens, payload) {
//   Dalam fungsi tu, cari baris:   return berjaya;
//   TAMPAL blok di bawah ini SEBELUM baris "return berjaya;" (jangan ubah apa-apa lain).
//
// Kesan: setiap kali peringatan Muhasabah / myChecklist40 dihantar, satu rekod disimpan di
//   mynasab_users/{uid}/notis/{id}  -> dipaparkan di notifikasi.html (loceng di index).
//   Rekod dipadam sendiri oleh TTL Firestore selepas 72 jam (medan luput_pada).
// Push lain (weCare, goTravel, BAHI, JomSalam, uji) TIDAK disimpan.

    // --- MULA TAMPAL ---
    try {
        const d = (payload && payload.data) || {};
        if (d.app === 'muhasabah' || d.app === 'checklist40') {
            const per = medanToken === 'fcm_pasangan' ? 'pasangan' : 'induk';
            const kini = Date.now();
            const jamMY = new Date(kini + 8 * 3600000).toISOString().slice(0, 13);      // cth 2026-11-17T22 (elak rekod berganda)
            await dbRef.collection('mynasab_users').doc(uid).collection('notis').doc(`${d.tag || d.app}_${per}_${jamMY}`).set({
                app: d.app,
                tajuk: (payload.notification && payload.notification.title) || '',
                isi: (payload.notification && payload.notification.body) || '',
                url: d.url || '',
                per,
                masa: admin.firestore.Timestamp.fromMillis(kini),
                luput_pada: admin.firestore.Timestamp.fromMillis(kini + 72 * 3600000),
                dibaca: false
            });
        }
    } catch (e) { console.error('Peti notifikasi: gagal simpan:', uid, e.message); }
    // --- TAMAT TAMPAL ---


// =====================================================================
// PERATURAN FIRESTORE (tampal DALAM blok  match /mynasab_users/{userId} { ... } )
// =====================================================================
// Kalau nama pembolehubah dalam peraturan ko bukan {userId}, tukar ikut nama tu.
/*
      match /notis/{notisId} {
        allow read, delete: if request.auth != null && request.auth.uid == userId;
        allow update: if request.auth != null && request.auth.uid == userId
                      && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['dibaca']);
        allow create: if false;   // hanya Cloud Function (admin) yang cipta
      }
*/


// =====================================================================
// TTL FIRESTORE (padam automatik) - buat sekali di Google Cloud Console
// =====================================================================
// Firebase Console -> Firestore Database -> tab "Time-to-live (TTL)" (atau Google Cloud Console -> Firestore -> TTL)
//   -> Create policy:
//   1. Collection group: notis    Timestamp field: luput_pada     (peti notifikasi, 72 jam)
//   2. Collection group: mesej    Timestamp field: luput_pada     (mesej JomSalam bukan keluarga)
// Hanya dokumen yang ADA medan luput_pada akan dipadam. Dokumen tanpa medan tu tidak disentuh.
// TTL ambil masa beberapa minit untuk aktif; pemadaman biasanya berlaku dalam 24 jam selepas tamat tempoh.
