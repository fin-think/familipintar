// =====================================================================
// LUPUT KREDIT: kredit luput selepas 6 bulan tiada aktiviti (Polisi Kredit, terma-privasi.html Bahagian C.3)
// =====================================================================
// CARA TAMPAL: tampal SELURUH blok di bawah di HUJUNG functions/index.js
// (perlukan db, admin, functions dan hantarKeSemuaPeranti yang sudah ada dalam index.js).
//
// "Aktiviti" = paling lewat antara:
//   - last_active        : ditulis oleh index.html sekali sehari bila pengguna log masuk/buka Famili Pintar
//   - kredit_aktif_pada  : ditetapkan oleh fungsi ini bila baki kredit berubah (top up atau guna kredit dalam mana-mana app)
// Kali pertama fungsi ini nampak sesuatu akaun, jam mula dikira dari hari itu (tiada siapa hilang kredit serta-merta).
//
// Aliran setiap hari jam 3:30 pagi:
//   1. Baki berubah sejak semakan lepas  -> rekod aktiviti baharu, tiada tindakan lain.
//   2. Tinggal 14 hari sebelum 6 bulan   -> hantar peringatan (push + peti notifikasi), sekali bagi setiap tempoh tidak aktif.
//   3. Cukup 6 bulan                      -> baki jadi 0, direkod dalam koleksi kredit_luput.

const KL_HARI = 182;            // ~6 bulan
const KL_AMARAN_HARI = 14;      // peringatan sebelum luput
const KL_HARI_MS = 86400000;

exports.kreditLuputHarian = functions
    .region('asia-southeast1')
    .runWith({ timeoutSeconds: 540, memory: '512MB' })
    .pubsub.schedule('30 3 * * *').timeZone('Asia/Kuala_Lumpur')
    .onRun(async () => {
        const kini = Date.now();
        const sn = await db.collection('mynasab_users').where('credit_balance', '>', 0).get();
        let dikemas = 0, diamaran = 0, diluput = 0;

        for (const d of sn.docs) {
            const u = d.data(), baki = parseInt(u.credit_balance) || 0;
            if (baki <= 0) continue;
            try {
                // 1. Baki berubah (top up / guna kredit) atau akaun belum pernah disemak -> mula / sambung kiraan
                if (u.kredit_snap !== baki || !u.kredit_aktif_pada) {
                    await d.ref.update({ kredit_snap: baki, kredit_aktif_pada: kini });
                    dikemas++; continue;
                }
                const aktif = Math.max(Number(u.last_active) || 0, Number(u.kredit_aktif_pada) || 0);
                const lalu = (kini - aktif) / KL_HARI_MS;

                // 3. Luput
                if (lalu >= KL_HARI) {
                    await db.runTransaction(async (t) => {
                        const s = await t.get(d.ref), x = s.data() || {}, b = parseInt(x.credit_balance) || 0;
                        if (b <= 0 || x.kredit_snap !== b) return;                         // ada aktiviti saat akhir: batal
                        t.update(d.ref, { credit_balance: 0, kredit_snap: 0, kredit_luput_pada: kini });
                        t.set(db.collection('kredit_luput').doc(), { uid: d.id, emel: x.email || '', jumlah: b, aktif_terakhir: aktif, masa: kini });
                    });
                    diluput++; continue;
                }

                // 2. Peringatan 14 hari sebelum luput (sekali bagi setiap tempoh tidak aktif)
                if (lalu >= KL_HARI - KL_AMARAN_HARI && !(Number(u.kredit_amaran_pada) > aktif)) {
                    const tkh = new Date(aktif + KL_HARI * KL_HARI_MS + 8 * 3600000).toISOString().slice(0, 10).split('-').reverse().join('/');
                    const tajuk = `${baki} kredit anda akan luput pada ${tkh}`;
                    const isi = 'Log masuk ke Famili Pintar atau guna kredit anda sebelum tarikh itu untuk mengekalkannya.';
                    try {
                        await hantarKeSemuaPeranti(db, admin.messaging(), d.id, u, {
                            notification: { title: tajuk, body: isi },
                            data: { app: 'kredit', url: '/index.html', tag: 'kredit-luput' }
                        });
                    } catch (e) { console.error('Kredit luput push:', d.id, e.message); }
                    try {
                        await d.ref.collection('notis').doc(`kredit-luput_${new Date(kini).toISOString().slice(0, 10)}`).set({
                            app: 'kredit', tajuk, isi, url: '/index.html', per: 'induk',
                            masa: admin.firestore.Timestamp.fromMillis(kini),
                            luput_pada: admin.firestore.Timestamp.fromMillis(kini + KL_AMARAN_HARI * KL_HARI_MS),
                            dibaca: false
                        });
                    } catch (e) { console.error('Kredit luput notis:', d.id, e.message); }
                    await d.ref.update({ kredit_amaran_pada: kini });
                    diamaran++;
                }
            } catch (e) { console.error('Kredit luput:', d.id, e.message); }
        }
        console.log(`Kredit luput: ${sn.size} akaun berbaki, ${dikemas} dikemas kini, ${diamaran} diberi peringatan, ${diluput} luput`);
        return null;
    });

// =====================================================================
// PERATURAN FIRESTORE: koleksi kredit_luput hanya untuk admin (baca), tiada tulis dari klien.
// Tampal dalam rules (tukar syarat admin ikut yang ko guna untuk koleksi admin lain):
/*
    match /kredit_luput/{id} {
      allow read: if request.auth != null && request.auth.token.email in ['EMEL_ADMIN'];
      allow write: if false;
    }
*/
