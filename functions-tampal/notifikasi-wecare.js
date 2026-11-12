// GANTI blok `berjayaHantar += await hantarKeSemuaPeranti(...)` dalam exports.hantarNotifikasiWeCare (functions/index.js).
// data.tag -> satu notifikasi sahaja walaupun telefon ada 2 token; fcmOptions.link -> tekan terus buka weCare.
            berjayaHantar += await hantarKeSemuaPeranti(db, admin.messaging(), p.uid, p.userData, {
                notification: { title: "weCare: Pesanan Keluarga 🗒️", body: `${nota.author}: ${nota.note}` },
                data: { app: 'wecare', url: '/wecare.html', badgeCount: '1', tag: 'wecare-nota-' + context.params.noteId },
                android: { notification: { sound: "default" } },
                webpush: { fcmOptions: { link: '/wecare.html' } }
            });
