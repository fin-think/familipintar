// ==========================================
// UJI PUSH DARI SERVER (butang "Uji notifikasi" di Tetapan). Tampal di hujung functions/index.js.
// Hantar FCM sebenar ke token telefon ini (mesti milik akaun pemanggil) dan pulangkan keputusan/ralat FCM.
// ==========================================
exports.ujiPushSaya = functions
    .region('asia-southeast1')
    .https.onCall(async (data, context) => {
        const uid = context.auth && context.auth.uid;
        if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Sila log masuk.');
        const token = String((data && data.token) || '');
        const u = await db.collection('mynasab_users').doc(uid).get();
        const ud = u.exists ? u.data() : {};
        const medan = Object.keys(ud).filter(k => (k.startsWith('fcm_') && Array.isArray(ud[k]) && ud[k].includes(token)) || (k === 'fcm_token' && ud[k] === token));
        if (!token || !medan.length) throw new functions.https.HttpsError('failed-precondition', 'Telefon ini belum berdaftar pada akaun anda.');
        try {
            await admin.messaging().send({
                token,
                notification: { title: 'Famili Pintar 🔔', body: 'Ujian dari server berjaya. Peringatan akan sampai ke telefon ini.' },
                data: { app: 'fp', url: '/', tag: 'fp-uji-server' },
                webpush: { notification: { tag: 'fp-uji-server' }, fcmOptions: { link: '/' } }
            });
            return { ok: true, medan };
        } catch (e) {
            return { ok: false, kod: (e && e.code) || '', mesej: (e && e.message) || '', medan };
        }
    });
