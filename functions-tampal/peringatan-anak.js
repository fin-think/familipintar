// ==========================================
// 9. PERINGATAN ANAK (6 pagi, 6 petang, 9 malam) - peranti anak sendiri
// ==========================================
// TAMPAL selepas exports.peringatanMuhasabah dalam functions/index.js (guna OM_TZ, cl40Hantar yang sedia ada).
// Penerima: setiap anak dalam akaun Induk yang telefonnya didaftar (mynasab_users.fcm_anak_<id nod anak>), umur 7 tahun ke atas.
// Telefon didaftar bila anak mula menjawab myINTEGRITY di telefonnya (app/myintegrity.html).
// Isi ikut umur, jantina, dan status hidup/meninggal ibu bapa dalam myNasab (Induk + pasangan).
//   6 pagi : niat jadi anak soleh/solehah + nasihat belajar (bawah 18) atau kerja (18 ke atas)
//   6 petang: hari nak berakhir, doakan ibu bapa waktu Maghrib (Al-Fatihah untuk yang telah meninggal)
//   9 malam : ucap terima kasih + cerita pengorbanan, ucap sayang + cerita kasih sayang (sedekah Al-Fatihah untuk arwah)
// Pengecualian: dokumen pengguna fp_anak_mati === true (semua anak) atau medan fp_anak_mati_<id> === true (seorang anak).

const ANAK_UMUR_MIN = 7;
const labelIbuBapa = (n) => (n && n.gender === 'L') ? 'ayah' : (n && n.gender === 'P') ? 'ibu' : 'ibu bapa';
const sambung = (a) => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' dan ' + a[a.length - 1];

function badanAnak(slot, c) {
    const h = sambung(c.hidup), a = sambung(c.arwah);
    const doa = c.arwah.length ? ` Jangan lupa Al-Fatihah untuk arwah ${a}.` : '';
    if (slot === 'pagi') return `Assalamualaikum ${c.nama}. Niatkan hari ni nak jadi anak ${c.soleh}, ${c.umur < 18 ? 'belajar elok-elok' : 'kerja elok-elok dan amanah'}.`;
    if (slot === 'petang') return `Hari dah nak berakhir. Bila Maghrib nanti, doakan ${c.hidup.length ? h : 'ibu bapa kita'} ya.${doa}`;
    return c.hidup.length ? `Dah ucap terima kasih dan sayang pada ${h}? Jom buat sebelum tidur.${doa}` : `Sebelum tidur, sedekahkan Al-Fatihah untuk arwah ${a} ya.`;
}

async function jalankanPeringatanAnak(dbRef, messaging, opsi = {}) {
    const now = opsi.now || Date.now();
    const jam = opsi.jamPaksa != null ? opsi.jamPaksa : parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: OM_TZ, hour: '2-digit', hour12: false }).format(new Date(now)), 10) % 24;
    const slot = jam < 12 ? 'pagi' : (jam < 20 ? 'petang' : 'malam');
    const tarikh = new Intl.DateTimeFormat('en-CA', { timeZone: OM_TZ }).format(new Date(now));
    const snap = await dbRef.collection('mynasab_users').get();
    let dihantar = 0, langkau = 0;
    for (const d of snap.docs) {
        const u = d.data();
        const kunci = Object.keys(u).filter(k => k.startsWith('fcm_anak_') && Array.isArray(u[k]) && u[k].length);
        if (!kunci.length || u.fp_anak_mati === true) continue;
        try {
            const sn = await dbRef.collection('mynasab_nodes').where('owner_uid', '==', d.id).get();
            const nod = sn.docs.map(x => ({ ...x.data(), id: x.id }));
            const induk = nod.find(n => n.is_root);
            const psg = nod.find(n => /^(suami|isteri)$/i.test(n.relationship || '') && !n.is_root);
            const ibuBapa = [induk, psg].filter(Boolean);
            const hidup = ibuBapa.filter(n => n.status !== 'meninggal').map(labelIbuBapa);
            const arwah = ibuBapa.filter(n => n.status === 'meninggal').map(labelIbuBapa);
            for (const k of kunci) {
                const idAnak = k.slice('fcm_anak_'.length);
                if (u['fp_anak_mati_' + idAnak] === true) continue;
                const anak = nod.find(n => n.id === idAnak);
                if (!anak || anak.status === 'meninggal' || !anak.dob) { langkau++; continue; }
                const lh = new Date(anak.dob); if (isNaN(lh)) { langkau++; continue; }
                const kini = new Date(now); let umur = kini.getFullYear() - lh.getFullYear();
                if (kini.getMonth() < lh.getMonth() || (kini.getMonth() === lh.getMonth() && kini.getDate() < lh.getDate())) umur--;
                if (umur < ANAK_UMUR_MIN) { langkau++; continue; }
                if (!opsi.tanpaLog) {
                    try { await dbRef.collection('checklist40_notif_log').doc(`${d.id}_anak_${idAnak}_${slot}_${tarikh}`).create({ uid: d.id, anak: idAnak, tarikh, slot, timestamp: new Date().toISOString() }); }
                    catch (e) { langkau++; continue; }
                }
                const nama = String(anak.name || '').trim().split(/\s+/)[0] || 'anak';
                const c = { nama, umur, soleh: anak.gender === 'P' ? 'solehah' : 'soleh', hidup, arwah };
                const pautan = `/app/peringatan40.html?mod=anak&slot=${slot}&n=${encodeURIComponent(nama.slice(0, 30))}&u=${umur}&j=${anak.gender === 'P' ? 'P' : 'L'}&h=${encodeURIComponent(hidup.join(','))}&a=${encodeURIComponent(arwah.join(','))}`;
                const tajuk = { pagi: '☀️ Selamat pagi', petang: '🌇 Hari nak berakhir', malam: '🌙 Sebelum tidur' }[slot];
                const n = await cl40Hantar(dbRef, messaging, d.id, k, [...new Set(u[k])].filter(Boolean), {
                    notification: { title: tajuk, body: badanAnak(slot, c) },
                    data: { app: 'anak', url: pautan, badgeCount: '1', tag: 'anak-' + slot },
                    webpush: { fcmOptions: { link: pautan } }
                });
                if (n > 0) dihantar++; else langkau++;
            }
        } catch (e) { console.error('Peringatan anak: gagal untuk', d.id, e.message); }
    }
    console.log(`Peringatan anak ${slot}: dihantar ${dihantar}, dilangkau ${langkau}`);
    return { dihantar, langkau };
}

exports.peringatanAnak = functions
    .runWith({ timeoutSeconds: 300, memory: '256MB' })
    .pubsub.schedule('0 6,18,21 * * *')
    .timeZone(OM_TZ)
    .onRun(async () => { await jalankanPeringatanAnak(db, admin.messaging()); return null; });
