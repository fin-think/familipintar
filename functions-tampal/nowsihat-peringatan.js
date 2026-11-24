// =====================================================================
// nowSihat: peringatan senaman ikut SENARAI RUTIN (boleh banyak rutin: jenis, hari, masa berbeza)
// GANTI keseluruhan exports.nowSihatPeringatan dalam functions/index.js dengan blok ini.
// Profil baharu: senaman_rutin [ {id, jenis, minit, hari, masa, notif} ] + senaman_slot ['<hari>_<HH:MM>', ...]
// Profil lama (belum buka app selepas kemas kini): senaman {..} masih disokong.
// =====================================================================
exports.nowSihatPeringatan = functions
    .region('asia-southeast1')
    .pubsub.schedule('every 30 minutes').timeZone('Asia/Kuala_Lumpur')
    .onRun(async () => {
        const k = new Date(Date.now() + 8 * 3600000);
        const slot = `${String(k.getUTCHours()).padStart(2, '0')}:${k.getUTCMinutes() < 30 ? '00' : '30'}`, dow = k.getUTCDay(), hari = nsTarikhMY();
        const NAMA = { jog: 'jogging', jalan: 'jalan santai', regangan: 'regangan', rumah: 'senaman ringan', basikal: 'berbasikal', renang: 'berenang', brisk: 'brisk walk' };

        // Calon: format baharu (senaman_slot) + format lama (senaman.masa) yang belum dinaik taraf
        const [sBaru, sLama] = await Promise.all([
            db.collection('nowsihat_profil').where('senaman_slot', 'array-contains', `${dow}_${slot}`).get(),
            db.collection('nowsihat_profil').where('senaman.notif', '==', true).where('senaman.masa', '==', slot).get()
        ]);
        const calon = new Map();
        sBaru.forEach(d => calon.set(d.id, d));
        sLama.forEach(d => { if (!Array.isArray(d.data().senaman_rutin)) calon.set(d.id, d); });

        let n = 0;
        for (const d of calon.values()) {
            const p = d.data();
            const senarai = Array.isArray(p.senaman_rutin) ? p.senaman_rutin : (p.senaman ? [{ id: 'r1', ...p.senaman }] : []);
            const kena = senarai.filter(r => r.notif && r.masa === slot && (r.hari || []).includes(dow));
            if (!kena.length) continue;
            // Rutin yang sudah ditanda siap hari ini tidak diingatkan
            const rek = await db.collection('nowsihat_senaman').doc(`${d.id}_${hari}`).get();
            const dah = rek.exists ? (Array.isArray(rek.data().sesi) ? new Set(rek.data().sesi.map(x => x.rid)) : null) : new Set();
            const belum = dah === null ? [] : kena.filter(r => !dah.has(r.id));      // rekod lama tanpa sesi: anggap dah buat
            if (!belum.length) continue;
            const uidAkaun = d.id.replace(/_pasangan$/, '');
            const u = await db.collection('mynasab_users').doc(uidAkaun).get();
            if (!u.exists || !(u.data().nowsihat_expiry_date > Date.now())) continue;
            for (const r of belum) {
                const nama = NAMA[r.jenis] || 'brisk walk';
                try {
                    n += await hantarKeSemuaPeranti(db, admin.messaging(), uidAkaun, u.data(), {
                        notification: { title: `Masa untuk ${nama}`, body: `${r.minit || 30} minit ${nama} hari ini. Siap nanti, tekan "Tanda siap" di nowSihat.` },
                        data: { app: 'nowsihat', url: '/nowsihat.html', tag: `nowsihat-senaman-${hari}-${r.id}` }
                    });
                } catch (e) { console.error('nowSihat peringatan:', d.id, e.message); }
            }
        }
        console.log(`nowSihat peringatan ${dow}_${slot}: ${n} push`);
        return null;
    });
