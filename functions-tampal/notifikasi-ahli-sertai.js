// ==========================================
// 8. NOTIFIKASI: AHLI YANG DIJEMPUT SUDAH SERTAI (HANYA KEPADA PENGUNDANG: INDUK + PASANGAN)
// ==========================================
// TAMPAL selepas exports.peringatanChecklist40 dalam functions/index.js (guna kumpulToken/hantarKeSemuaPeranti sedia ada).
// Dipanggil oleh myNasab (mynasab/app.js) sekali selepas ahli log masuk. Ia mencari siapa pengundang:
//   Penerima: pengundang, dan satu tingkat ke atas (akaun yang menjemput pengundang itu).
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

        // Cari pengundang sesebuah akaun: dokumen pautan, atau nod akar (link_owner / anak_saudara_dari.uid)
        const cariPengundang = async (id) => {
            let o = '', a = false;
            try { const l = await db.collection('mynasab_links').doc(id).get(); if (l.exists && l.data().owner_uid) o = l.data().owner_uid; } catch (e) {}
            if (!o) {
                try {
                    const r = await db.collection('mynasab_nodes').doc('root_' + id).get();
                    const x = r.exists ? r.data() : {};
                    if (x.anak_saudara_dari && x.anak_saudara_dari.uid) { o = x.anak_saudara_dari.uid; a = true; }
                    else if (x.link_owner) o = x.link_owner;
                } catch (e) {}
            }
            return { owner: o, anak: a };
        };
        let { owner, anak } = await cariPengundang(uid);
        if (!owner && typeof u.dijemput_oleh === 'string') owner = u.dijemput_oleh;
        if (!owner || owner === uid) return { status: 'tiada_pengundang' };

        // Satu tingkat ke atas: akaun yang menjemput pengundang (cth. Awi menjemput abang; abang menjemput anaknya -> Awi juga diberitahu)
        const atas = (await cariPengundang(owner)).owner;
        const penerima = [owner];
        if (atas && atas !== uid && atas !== owner) penerima.push(atas);

        // Tandakan dahulu supaya panggilan serentak tidak menghantar dua kali
        await uRef.update({ notis_sertai_dihantar: Date.now() });

        const nama = String(u.name || 'Ahli keluarga').replace(/[<>]/g, '').slice(0, 40);
        const jenis = anak ? 'anak saudara' : 'ahli keluarga';
        let namaPengundang = '';
        const hasil = [];
        for (const pid of penerima) {
            const pRef = db.collection('mynasab_users').doc(pid);
            const pSnap = await pRef.get();
            if (!pSnap.exists) continue;
            if (pid === owner) namaPengundang = String(pSnap.data().name || '').replace(/[<>]/g, '').slice(0, 40);
            const langsung = pid === owner;
            const oleh = langsung ? '' : namaPengundang;
            try {
                await pRef.update({ ahli_baru_notis: admin.firestore.FieldValue.arrayUnion({ uid, nama, jenis, oleh, tarikh: Date.now() }) });
            } catch (e) { console.error('Notis sertai: gagal tulis notis dalam app:', e.message); }
            const n = await hantarKeSemuaPeranti(db, admin.messaging(), pid, pSnap.data(), {
                notification: {
                    title: '🌳 Ahli keluarga anda dah sertai',
                    body: langsung ? `${nama} (${jenis}) kini sudah menjadi sebahagian daripada Famili Pintar.` : `${nama} (${jenis}), dijemput oleh ${namaPengundang || 'ahli keluarga anda'}, kini sudah sertai Famili Pintar.`
                },
                data: { app: 'mynasab', url: '/mynasab/index.html', badgeCount: '1', tag: 'ahli-sertai-' + uid },
                webpush: { fcmOptions: { link: '/mynasab/index.html' } }
            });
            hasil.push(n);
        }
        console.log(`Notis sertai: ${uid} -> ${penerima.join(',')}, push ${hasil.join(',')}`);
        return { status: 'dihantar', penerima: penerima.length };
    });
