// =====================================================================
// meTime (nowSihat): peringatan kitaran, jam 8 pagi waktu Malaysia
// TAMPAL di HUJUNG functions/index.js (guna db, admin, functions, hantarKeSemuaPeranti, nsTarikhMY sedia ada).
// Penerima: profil yang hidupkan "Peringatan" di tab meTime (nowsihat_profil.haid_notif == true).
//   - 2 hari sebelum haid dijangka
//   - haid lewat 7 hari daripada jangkaan
//   - haid hari ke-16 / nifas hari ke-61: amaran tempoh maksimum (istihadah)
// Jika isteri benarkan suami lihat (haid.kongsi), suami dapat makluman ringkas (2 hari sebelum).
// Teks notifikasi tidak menyebut perkataan haid (privasi skrin kunci).
// =====================================================================
const MT_HARI = 86400000;
const mtAntara = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / MT_HARI);
const mtTambah = (k, n) => new Date(Date.parse(k + 'T00:00:00Z') + n * MT_HARI).toISOString().slice(0, 10);

function mtAnalisis(h, kini) {
    const rekod = (Array.isArray(h.rekod) ? h.rekod : []).slice().sort((a, b) => String(a.m).localeCompare(String(b.m)));
    const haid = rekod.filter(r => r.j !== 'nifas');
    const semasa = rekod.length && !rekod[rekod.length - 1].t ? rekod[rekod.length - 1] : null;
    const kit = []; for (let i = 1; i < haid.length; i++) { const d = mtAntara(haid[i - 1].m, haid[i].m); if (d >= 15 && d <= 60) kit.push(d); }
    const k6 = kit.slice(-6), kitaran = k6.length ? Math.round(k6.reduce((x, y) => x + y, 0) / k6.length) : 28;
    const akhir = haid.length ? haid[haid.length - 1] : null;
    const jangka = akhir && !semasa ? mtTambah(akhir.m, kitaran) : null;
    return { semasa, jangka, hariKe: semasa ? mtAntara(semasa.m, kini) + 1 : 0, lagi: jangka ? mtAntara(kini, jangka) : null };
}

exports.meTimePeringatan = functions
    .region('asia-southeast1')
    .pubsub.schedule('0 8 * * *').timeZone('Asia/Kuala_Lumpur')
    .onRun(async () => {
        const kini = nsTarikhMY();
        const sn = await db.collection('nowsihat_profil').where('haid_notif', '==', true).get();
        let n = 0;
        for (const d of sn.docs) {
            const p = d.data(), h = p.haid || {};
            if (p.jantina !== 'P' || !h.notif) continue;
            const a = mtAnalisis(h, kini);
            let jenis = null, isi = '', isiSuami = '';
            if (a.semasa && a.semasa.j !== 'nifas' && a.hariKe === 16) { jenis = 'maks'; isi = 'Sudah melebihi 15 hari. Semak panduan tempoh maksimum (istihadah) di meTime dan rujuk ustazah jika ragu.'; }
            else if (a.semasa && a.semasa.j === 'nifas' && a.hariKe === 61) { jenis = 'maks'; isi = 'Sudah melebihi 60 hari. Semak panduan tempoh maksimum (istihadah) di meTime dan rujuk ustazah jika ragu.'; }
            else if (a.lagi === 2) { jenis = 'dekat'; isi = 'Kitaran anda dijangka bermula dalam 2 hari. Sediakan keperluan dan rehat secukupnya.'; isiSuami = 'Kitaran isteri dijangka bermula dalam 2 hari. Lihat panduan suami di meTime.'; }
            else if (a.lagi === -7) { jenis = 'lewat'; isi = 'Kitaran anda lewat 7 hari daripada jangkaan. Semak di meTime; jika berterusan, rujuk doktor.'; }
            if (!jenis) continue;
            try { await db.collection('checklist40_notif_log').doc(`metime_${d.id}_${jenis}_${kini}`).create({ t: Date.now() }); } catch (e) { continue; }   // sudah dihantar
            const uid = d.id.replace(/_pasangan$/, ''), per = d.id.endsWith('_pasangan') ? 'pasangan' : 'induk';
            const u = await db.collection('mynasab_users').doc(uid).get();
            if (!u.exists) continue;
            try {
                n += await hantarKeSemuaPeranti(db, admin.messaging(), uid, u.data(), {
                    notification: { title: 'meTime 🌸', body: isi },
                    data: { app: 'nowsihat', url: '/nowsihat.html', tag: `metime-${jenis}-${kini}` },
                    webpush: { fcmOptions: { link: '/nowsihat.html' } }
                }, per);                                                     // hanya ke peranti isteri
                if (isiSuami && h.kongsi) {
                    n += await hantarKeSemuaPeranti(db, admin.messaging(), uid, u.data(), {
                        notification: { title: 'meTime 🌸', body: isiSuami },
                        data: { app: 'nowsihat', url: '/nowsihat.html', tag: `metime-suami-${kini}` },
                        webpush: { fcmOptions: { link: '/nowsihat.html' } }
                    }, per === 'pasangan' ? 'induk' : 'pasangan');           // peranti suami
                }
            } catch (e) { console.error('meTime peringatan:', d.id, e.message); }
        }
        console.log(`meTime ${kini}: ${sn.size} profil, ${n} push`);
        return null;
    });
