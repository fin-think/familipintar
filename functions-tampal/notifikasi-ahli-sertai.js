// ==========================================
// 8. NOTIFIKASI: AHLI YANG DIJEMPUT SUDAH SERTAI (HANYA KEPADA PENGUNDANG: INDUK + PASANGAN)
// ==========================================
// TAMPAL selepas exports.peringatanChecklist40 dalam functions/index.js (guna kumpulToken/hantarKeSemuaPeranti sedia ada).
// Dipanggil oleh myNasab (mynasab/app.js) sekali selepas ahli log masuk. Ia mencari siapa pengundang:
//   1. mynasab_links/{uid}.owner_uid                 (jemputan pautan adik-beradik, dan akaun jemputan e-mel jika dokumen pautan dicipta)
//   2. nod akar root_{uid}: link_owner atau anak_saudara_dari.uid  (jemputan pautan anak saudara / adik-beradik)
//   3. mynasab_users/{uid}.dijemput_oleh             (pilihan: jika jemputAhliEmel menulis medan ini)
// Penerima: pemilik akaun pengundang, iaitu semua peranti Induk dan Pasangan akaun itu. Orang lain tidak diberitahu.
// Sekali sahaja bagi setiap ahli (penanda notis_sertai_dihantar). Selain push, satu popup dalam myNasab untuk pengundang.

exports.beritahuPengundang = functions
    .runWith({ timeoutSeconds: 60, memory: '256MB' })
    .https.onCall(async (data, context) => {
        if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Log masuk diperlukan.');
        const uid = context.auth.uid;
        const uRef = db.collection('mynasab_users').doc(uid);
        const uSnap = await uRef.get();
        if (!uSnap.exists) return { status: 'tiada_akaun' };
        const u = uSnap.data();
        if (u.notis_sertai_dihantar) return { status: 'sudah' };

        let owner = '', anak = false;
        try {
            const l = await db.collection('mynasab_links').doc(uid).get();
            if (l.exists && l.data().owner_uid) owner = l.data().owner_uid;
        } catch (e) {}
        if (!owner) {
            try {
                const r = await db.collection('mynasab_nodes').doc('root_' + uid).get();
                const x = r.exists ? r.data() : {};
                if (x.anak_saudara_dari && x.anak_saudara_dari.uid) { owner = x.anak_saudara_dari.uid; anak = true; }
                else if (x.link_owner) owner = x.link_owner;
            } catch (e) {}
        }
        if (!owner && typeof u.dijemput_oleh === 'string') owner = u.dijemput_oleh;
        if (!owner || owner === uid) return { status: 'tiada_pengundang' };

        // Tandakan dahulu supaya panggilan serentak tidak menghantar dua kali
        await uRef.update({ notis_sertai_dihantar: Date.now() });

        const oRef = db.collection('mynasab_users').doc(owner);
        const oSnap = await oRef.get();
        if (!oSnap.exists) return { status: 'pengundang_tiada' };
        const nama = String(u.name || 'Ahli keluarga').replace(/[<>]/g, '').slice(0, 40);
        const jenis = anak ? 'anak saudara' : 'ahli keluarga';

        try {
            await oRef.update({ ahli_baru_notis: admin.firestore.FieldValue.arrayUnion({ uid, nama, jenis, tarikh: Date.now() }) });
        } catch (e) { console.error('Notis sertai: gagal tulis notis dalam app:', e.message); }

        const n = await hantarKeSemuaPeranti(db, admin.messaging(), owner, oSnap.data(), {
            notification: { title: '🌳 Ahli keluarga anda dah sertai', body: `${nama} (${jenis}) kini sudah menjadi sebahagian daripada Famili Pintar.` },
            data: { app: 'mynasab', url: '/mynasab/index.html', badgeCount: '1', tag: 'ahli-sertai-' + uid },
            webpush: { fcmOptions: { link: '/mynasab/index.html' } }
        });
        console.log(`Notis sertai: ${uid} -> ${owner}, push ${n} peranti`);
        return { status: 'dihantar', push: n };
    });
