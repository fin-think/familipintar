// ==========================================
// 7. PERINGATAN HARIAN myCHECKLIST40 (PUSH 8 MALAM: IBADAH & LEGASI, 10 MALAM: TAZKIYAH JIWA)
// ==========================================
// TAMPAL selepas exports.peringatanInfaqHarian dalam functions/index.js
// (guna OM_TZ, kumpulToken dan hantarKeSemuaPeranti yang sedia ada).
// Berjalan setiap jam (minit 0, waktu Malaysia), tetapi hanya bertindak pada jam 20 dan 22.
// Syarat hantar:
//   - pengguna menghidupkan peringatan di app: mynasab_users.fp_mychecklist40_ingat === true
//     (pasangan: fp_pasangan_mychecklist40_ingat === true)
//   - checklist sudah disimpan: mynasab_users.fp_mychecklist40.dicentang (pasangan: fp_pasangan_mychecklist40)
//   - ada sekurang-kurangnya satu item belum ditanda dalam kumpulan jam itu
// Satu peringatan sehari bagi setiap kumpulan. Item dipusing ikut hari supaya ayat tidak berulang setiap malam.
// Query guna equality satu medan sahaja, jadi tiada indeks gabungan diperlukan.

const CL40_KUMPULAN = {
    20: ['solat5', 'berjemaah', 'awalwaktu', 'qadha', 'tahajjud',
         'bacaanHarian', 'lazim', 'pilihan', 'tadabbur',
         'daftarHaji', 'umrah', 'tabungan',
         'puasaWajib', 'qadhaPuasa', 'puasaIsninKhamis', 'puasaHariPutih',
         'zakat', 'sedekah', 'wakaf',
         'wasiat', 'hibah', 'sepencarian', 'tunaiAmanah', 'danaPendidikan'],
    22: ['mengumpat', 'riya', 'ujub', 'hasad', 'sabar', 'zikir', 'taubat', 'maaf', 'taatSuami']
};

const CL40_AYAT = {
    solat5: 'Kenapa masih belum jaga solat? Awak tahu ke nak mati bila? Solat yang dihisab dulu.',
    berjemaah: 'Azan dah berkumandang, awak tunggu apa lagi? Jemaah dulu, urusan kemudian.',
    awalwaktu: 'Allah dulu atau urusan dulu? Solat di awal waktu tanda awak letak Dia di tempat pertama.',
    qadha: 'Hutang solat tak hilang sebab awak lupa. Bayar satu malam ni, sebelum terlambat.',
    tahajjud: 'Sepertiga malam itu sunyi dan doa paling dekat. Dua rakaat pun cukup untuk mula.',
    bacaanHarian: 'Al-Quran dalam rak tak boleh tunjuk jalan. Buka satu muka surat malam ni.',
    lazim: 'Anak awak belajar solat daripada bacaan awak. Surah lazim dah lancar?',
    pilihan: 'Yasin, Al-Waqiah, Al-Mulk. Awak nak baca bila, bila dah tak sempat?',
    tadabbur: 'Awak baca surat Allah, tapi faham apa yang Dia nak? Satu ayat dengan terjemahan malam ni.',
    daftarHaji: 'Giliran Haji makin panjang, umur makin pendek. Awak tunggu apa lagi?',
    umrah: 'Mampu hari ni belum tentu mampu esok. Jangan tunggu sampai terlambat.',
    tabungan: 'Niat tanpa simpanan tak sampai ke Mekah. Asingkan sedikit, mulakan bulan ni.',
    puasaWajib: 'Hutang puasa dengan Allah, awak nak langsaikan bila? Tetapkan satu tarikh yang pasti.',
    qadhaPuasa: 'Hari puasa yang tertinggal tak hilang sendiri. Pilih satu hari minggu ni dan niat sekarang.',
    puasaIsninKhamis: 'Isnin dan Khamis, amal diangkat kepada Allah. Biar awak sedang berpuasa waktu itu.',
    puasaHariPutih: 'Tiga hari sebulan, 13, 14 dan 15 Hijrah. Cukup mudah untuk mula. Tandakan dalam kalendar.',
    zakat: 'Harta yang belum dizakat masih ada hak orang lain di dalamnya. Awak sanggup bawa ke akhirat?',
    sedekah: 'Yang awak sedekahkan itu yang kekal, selebihnya ditinggalkan. Satu sedekah kecil sebelum tidur?',
    wakaf: 'Bila awak dah tiada, wakaf masih mengalir. RM10 sebulan pun dikira.',
    wasiat: 'Kalau awak pergi malam ni, harta awak jadi pertelingkahan atau ketenangan? Sediakan wasiat sekarang.',
    hibah: 'Apa yang awak nak beri kepada seseorang, rancang masa hidup. Faraid hanya selepas awak tiada.',
    sepencarian: 'Pasangan awak tahu di mana harta dan dokumen disimpan? Kalau awak tiada esok, mereka nak cari ke mana?',
    tunaiAmanah: 'Akaun dibekukan, jenazah perlu diuruskan. Duit segera untuk keluarga, dah sedia?',
    danaPendidikan: 'Anak sulung membesar lebih cepat daripada simpanan awak. Mulakan auto-debit dana pengajian malam ni.',
    mengumpat: 'Hari ni awak sebut nama siapa tanpa dia tahu? Mohon maaf sebelum tidur.',
    riya: 'Kalau tiada siapa nampak, awak masih buat amal itu?',
    ujub: 'Amal awak nampak baik? Itu taufik Allah, bukan hebat awak.',
    hasad: 'Dengki membakar kebaikan sendiri. Doakan orang yang awak iri, malam ni.',
    sabar: 'Waktu awak marah hari ni, itulah ujian sabar. Lulus atau gagal?',
    zikir: 'Hati yang tak berzikir akan diisi benda lain. Istighfar dulu sebelum tidur.',
    taubat: 'Tidur itu mati kecil. Kalau tak bangun lagi, awak dah bertaubat?',
    maaf: 'Siapa yang awak belum maafkan atau belum minta maaf? Hantar satu mesej malam ni.',
    taatSuami: 'Taat dan hormat suami dalam perkara makruf. Hari ni, tutur kata dan layanan awak macam mana?'
};

// Jam (MYT) ke kumpulan: 20 = ibadah & legasi, 22 = tazkiyah jiwa
const CL40_TAJUK = {
    20: (n) => `🕌 Semak amal hari ini · ${n} belum ditanda`,
    22: (n) => `🌙 Muhasabah jiwa sebelum tidur · ${n} belum ditanda`
};

function cl40NoHari(now) { return Math.floor(now / 86400000); }

async function jalankanPeringatanChecklist40(dbRef, messaging, opsi = {}) {
    const now = opsi.now || Date.now();
    const jamKini = opsi.jamPaksa != null ? opsi.jamPaksa : parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: OM_TZ, hour: '2-digit', hour12: false }).format(new Date(now)), 10) % 24;
    const kump = CL40_KUMPULAN[jamKini];
    if (!kump) return { dihantar: 0, langkau: 0 };
    const tarikh = new Intl.DateTimeFormat('en-CA', { timeZone: OM_TZ }).format(new Date(now));   // YYYY-MM-DD

    const orang = [['', 'fp_mychecklist40', 'fp_mychecklist40_ingat'], ['pasangan', 'fp_pasangan_mychecklist40', 'fp_pasangan_mychecklist40_ingat']];
    const dilihat = new Map();      // uid -> data pengguna (elak baca dua kali)
    const calon = [];
    for (const [per, , medanIngat] of orang) {
        const snap = await dbRef.collection('mynasab_users').where(medanIngat, '==', true).get();
        snap.forEach(d => { dilihat.set(d.id, d.data()); calon.push([d.id, per]); });
    }

    let dihantar = 0, langkau = 0;
    for (const [uid, per] of calon) {
        try {
            const u = dilihat.get(uid), medanData = per ? 'fp_pasangan_mychecklist40' : 'fp_mychecklist40';
            const data = u[medanData];
            if (!data || !Array.isArray(data.dicentang) || !kumpulToken(u).length) { langkau++; continue; }
            const ditanda = new Set(data.dicentang);
            const tiadaAnak = ditanda.has('tiadaAnak');
            // 'tersedia' = soalan yang dipaparkan kepada orang itu (soalan jantina berbeza). Data lama tanpa 'tersedia': langkau soalan khusus jantina.
            const tersedia = Array.isArray(data.tersedia) ? new Set(data.tersedia) : null;
            const sesuai = (id) => tersedia ? tersedia.has(id) : (id !== 'berjemaah' && id !== 'taatSuami');
            const belum = kump.filter(id => sesuai(id) && !ditanda.has(id) && !(id === 'danaPendidikan' && tiadaAnak));
            if (!belum.length) { langkau++; continue; }

            if (!opsi.tanpaLog) {
                try { await dbRef.collection('checklist40_notif_log').doc(`${uid}_${per || 'induk'}_${jamKini}_${tarikh}`).create({ uid, tarikh, jam: jamKini, timestamp: new Date().toISOString() }); }
                catch (e) { langkau++; continue; }        // sudah dihantar hari ini
            }

            const pilih = belum[cl40NoHari(now) % belum.length];
            const n = await hantarKeSemuaPeranti(dbRef, messaging, uid, u, {
                notification: { title: CL40_TAJUK[jamKini](belum.length) + (per ? ' (pasangan)' : ''), body: CL40_AYAT[pilih] },
                data: { app: 'checklist40', url: '/app/mychecklist40.html', badgeCount: '1', tag: 'checklist40-' + jamKini },
                webpush: { fcmOptions: { link: '/app/mychecklist40.html' } }
            });
            if (n > 0) dihantar++; else langkau++;
        } catch (e) { console.error('Checklist40: gagal untuk', uid, e.message); }
    }
    console.log(`Checklist40 jam ${jamKini}: dihantar ${dihantar}, dilangkau ${langkau}, calon ${calon.length}`);
    return { dihantar, langkau };
}

exports.peringatanChecklist40 = functions
    .runWith({ timeoutSeconds: 300, memory: '256MB' })
    .pubsub.schedule('0 20,22 * * *')
    .timeZone(OM_TZ)
    .onRun(async () => { await jalankanPeringatanChecklist40(db, admin.messaging()); return null; });
