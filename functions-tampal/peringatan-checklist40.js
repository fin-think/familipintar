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
    22: ['mengumpat', 'riya', 'ujub', 'hasad', 'sabar', 'zikir', 'taubat', 'maaf']
};

const CL40_AYAT = {
    solat5: 'Solat ialah amalan pertama yang dihisab. Jika ia baik, baiklah amalan yang lain. Malam ini, berapa waktu yang benar-benar kamu tunaikan, dan berapa yang sekadar tertinggal tanpa disedari?',
    berjemaah: 'Solat berjemaah bukan sekadar pahala berganda. Ia latihan menyahut seruan Allah sebelum menyahut urusan dunia. Esok, yang manakah akan kamu dahulukan?',
    awalwaktu: 'Menangguhkan solat lama-lama menjadikan hati terbiasa menganggapnya beban. Solat di awal waktu ialah cara paling jujur untuk berkata: Engkau yang pertama, ya Allah.',
    qadha: 'Hutang solat tidak luput kerana kita lupa. Ia tetap tercatat, sedangkan umur terus berkurang. Mulakan satu qadha malam ini, kerana hutang kecil yang dibayar lebih baik daripada hutang besar yang dibiarkan.',
    tahajjud: 'Di sepertiga malam, doa lebih dekat dan hati lebih jujur. Dua rakaat sebelum tidur pun sudah menjadi permulaan hubungan yang tidak diketahui sesiapa kecuali Allah.',
    bacaanHarian: 'Al-Quran yang tidak dibuka tidak dapat memberi petunjuk, sebagaimana peta yang disimpan dalam laci tidak dapat menunjukkan jalan. Satu muka surat malam ini sudah cukup untuk bermula.',
    lazim: 'Surah-surah pendek yang kamu hafal hari ini ialah bekalan solat sepanjang hayat. Anak-anak belajar daripada apa yang mereka dengar kamu baca, jadi hafalan itu juga pusaka untuk mereka.',
    pilihan: 'Yasin, Al-Waqiah dan Al-Mulk bukan bacaan untuk majlis kematian sahaja. Ia teman yang dibaca ketika masih sempat memahaminya. Pilih satu dan mulakan malam ini.',
    tadabbur: 'Membaca tanpa memahami umpama menerima surat tanpa membukanya. Ambil satu ayat malam ini, baca terjemahannya perlahan-lahan dan tanya diri: apa yang Allah mahu daripada aku melalui ayat ini?',
    daftarHaji: 'Giliran Haji tidak menunggu kita bersedia. Setiap tahun yang ditangguhkan menambah tahun menunggu, sedangkan usia tidak menambah panjang. Mendaftar hari ini ialah langkah yang paling mudah untuk satu niat yang besar.',
    umrah: 'Tanah suci memanggil sesiapa yang dikehendaki-Nya. Jika kamu mampu, jangan tunggu sehingga mampu menjadi alasan yang paling lama kamu pelihara.',
    tabungan: 'Niat tanpa perancangan jarang sampai ke Tanah Suci. Asingkan jumlah kecil setiap bulan untuk tujuan itu supaya suatu hari panggilan itu bertemu dengan kesiapan.',
    puasaWajib: 'Puasa Ramadan yang belum diganti ialah hutang dengan Allah, dan hutang dengan Allah lebih berhak dilunaskan. Tetapkan satu tarikh yang pasti, kerana "nanti" tidak pernah wujud dalam kalendar.',
    qadhaPuasa: 'Setiap hari puasa yang tertinggal menunggu giliran kamu. Menunda tidak menghapuskannya, hanya menambah beban di hujung usia. Pilih satu hari minggu ini dan niatkan sekarang.',
    puasaIsninKhamis: 'Isnin dan Khamis ialah dua hari amalan diangkat kepada Allah. Biar amalan kamu diangkat ketika kamu sedang berpuasa dan hati sedang merendah diri.',
    puasaHariPutih: 'Tiga hari dalam sebulan, dengan malam yang terang, ialah cara lembut untuk melatih diri sebelum Ramadan datang lagi. Tandakan 13, 14 dan 15 Hijrah dalam kalendar kamu.',
    zakat: 'Harta yang belum dizakatkan masih bercampur dengan hak orang lain. Ia terasa milik kita sepenuhnya, tetapi sebahagiannya ialah amanah untuk mereka yang memerlukan. Bersihkan harta kamu sebelum ia membersihkan kamu daripada rezeki yang berkat.',
    sedekah: 'Apa yang kamu sedekahkan itulah yang benar-benar kekal. Selebihnya akan ditinggalkan. Satu sedekah kecil sebelum tidur malam ini ialah simpanan yang tidak boleh dituntut oleh sesiapa.',
    wakaf: 'Wakaf ialah pahala yang terus mengalir ketika kamu sudah tidak mampu beramal. Pintu itu terbuka kepada sesiapa yang mahu, walau sekecil RM10 sebulan.',
    wasiat: 'Kematian tidak memberi notis. Waris yang kamu sayangi akan menanggung kesulitan jika harta tidak tersusun, dan pertelingkahan selalunya bermula daripada perkara yang tidak sempat dijelaskan. Satu wasiat hari ini ialah kasih sayang yang paling praktikal.',
    hibah: 'Faraid hanya berjalan selepas kamu pergi, tetapi apa yang mahu kamu beri kepada insan tertentu perlu dirancang ketika masih hidup. Hibah ialah hadiah yang sempat kamu lihat diterima.',
    sepencarian: 'Rumah, simpanan dan pelaburan yang dikumpul bersama perlu diketahui bersama. Susun senarainya dan simpan dokumen di tempat yang pasangan tahu, supaya pada hari yang sukar tiada yang tertinggal tanpa jawapan.',
    tunaiAmanah: 'Akaun yang dibekukan sementara pusaka diuruskan menyebabkan keluarga tercari-cari wang untuk perkara yang paling mendesak, seperti pengurusan jenazah. Sediakan dana segera supaya mereka dapat berduka tanpa tertekan.',
    danaPendidikan: 'Anak sulung membesar lebih cepat daripada simpanan kita. Setiap bulan yang berlalu tanpa dana khas bermakna beban yang lebih berat kelak, dan mungkin pilihan yang menyakitkan antara persaraan dan pengajian mereka. Mulakan auto-debit kecil malam ini.',
    mengumpat: 'Mengumpat bermakna memakan daging saudara sendiri tanpa kita merasainya. Malam ini ingat semula perbualan hari ini: adakah ada nama yang disebut dengan cara yang kamu tidak sanggup sebut di hadapannya? Mohonlah maaf dan tutuplah hari dengan lidah yang lebih bersih.',
    riya: 'Amal yang dilakukan supaya dilihat akan hilang nilainya apabila pandangan manusia hilang. Semak niat kamu hari ini. Jika tiada siapa tahu, adakah kamu masih akan melakukannya?',
    ujub: 'Rasa diri lebih baik ialah penyakit yang halus kerana ia datang selepas kita berbuat baik. Ingatlah bahawa segala taufik hanya pinjaman daripada Allah, dan kita tidak memiliki walau satu pun amal yang pasti diterima.',
    hasad: 'Hasad membakar kebaikan sendiri sebagaimana api memakan kayu. Apabila hati sempit melihat nikmat orang lain, doakan mereka dengan nama mereka. Hati yang berlapang tidak mampu menyimpan dengki.',
    sabar: 'Sabar yang sebenar diuji pada saat pertama kita marah, bukan selepas reda. Ingat satu keadaan hari ini yang membuat kamu naik suara, dan bayangkan jawapan yang akan kamu pilih jika Allah menyaksikannya dengan jelas.',
    zikir: 'Hati yang tidak diisi dengan zikir akan diisi dengan bunyi lain sepanjang hari. Sebelum tidur, basahkan lidah kamu dengan istighfar dan tasbih, kerana ia menjadi kata terakhir yang kamu bawa ke dalam tidur.',
    taubat: 'Tidur ialah mati kecil. Kita tidak pasti akan bangun semula. Sebelum mata terpejam, akui satu kesalahan hari ini dengan sebenar-benarnya, dan mohon ampun dengan hati yang berniat tidak mengulanginya.',
    maaf: 'Hubungan yang retak tidak sembuh dengan menunggu. Pilih satu nama yang kamu tahu masih ada sakit antara kamu berdua, dan hantar mesej pendek malam ini. Memohon maaf lebih ringan daripada membawanya ke hari penghisaban.'
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
            const belum = kump.filter(id => !ditanda.has(id) && !(id === 'danaPendidikan' && tiadaAnak));
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
