// Data & enjin "Buat Apa Hari Ini": tarikh Hijrah, peristiwa sejarah Islam pada tarikh ini, dan siri ringkasan sirah.
// Kandungan ialah ringkasan umum untuk renungan keluarga. Semak dengan guru/kitab muktabar sebelum dibuka kepada pengguna.

export const BULAN_HIJRAH = ['Muharram', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jamadilawal', 'Jamadilakhir', 'Rejab', 'Syaaban', 'Ramadan', 'Syawal', 'Zulkaedah', 'Zulhijjah'];
export const BULAN_MASIHI = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
export const HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];

// Tarikh Malaysia hari ini sebagai {y,m,d} (zon Asia/Kuala_Lumpur)
export function tarikhMalaysia(now = Date.now()) {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(now)).split('-').map(Number);
  return { y, m, d };
}

// Tarikh Hijrah (Umm al-Qura). Boleh berbeza sehari daripada pengumuman rasmi Malaysia, jadi disediakan laras -1/0/+1.
const FORMAT_HIJRAH = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });
export function tarikhHijrah({ y, m, d }, laras = 0) {
  const t = new Date(Date.UTC(y, m - 1, d + laras, 12));
  const bahagian = FORMAT_HIJRAH.formatToParts(t);
  const ambil = (jenis) => parseInt(bahagian.find(p => p.type === jenis).value, 10);
  return { d: ambil('day'), m: ambil('month'), y: ambil('year') };
}

export function namaHariMasihi({ y, m, d }) { return HARI[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()]; }

// Peristiwa: h = [bulan Hijrah, hari], g = [bulan Masihi, hari], th = tahun Hijrah, tm = tahun Masihi (rujukan, boleh kosong),
// ragu = ulama/sejarawan berbeza pendapat tentang tarikh (dipaparkan sebagai catatan).
export const PERISTIWA = [
  { h: [1, 1], tajuk: 'Awal Muharram', teks: 'Hijrah Nabi ﷺ dijadikan permulaan takwim Islam pada zaman Khalifah Umar bin al-Khattab RA selepas bermusyawarah dengan para sahabat (sekitar 17 H).' },
  { h: [1, 10], tajuk: 'Hari Asyura', teks: 'Rasulullah ﷺ mendapati orang Yahudi Madinah berpuasa pada hari ini kerana Allah menyelamatkan Nabi Musa AS daripada Firaun. Baginda menggalakkan umat Islam berpuasa pada hari ini.' },
  { h: [1, 10], th: 61, tm: 680, tajuk: 'Syahidnya Husain bin Ali RA di Karbala', teks: 'Cucu Rasulullah ﷺ, Husain bin Ali RA, syahid di Karbala bersama ahli keluarga dan pengikutnya. Peristiwa ini menjadi pengajaran besar tentang keberanian mempertahankan kebenaran.' },
  { h: [1, 1], th: 24, tm: 644, tajuk: 'Uthman bin Affan RA dilantik khalifah', teks: 'Selepas Umar RA wafat, Uthman RA dibaiah sebagai khalifah ketiga. Pada zaman beliau, mushaf al-Quran disalin dan diseragamkan.', ragu: true },
  { h: [2, 27], g: [3, 4], th: 589, tm: 1193, tajuk: 'Wafatnya Salahuddin al-Ayyubi', teks: 'Pembebas Baitulmaqdis ini wafat di Damsyik. Beliau dikenang kerana keberanian, sifat pemaaf dan keadilannya terhadap musuh.' },
  { h: [3, 12], tm: 570, tajuk: 'Kelahiran Nabi Muhammad ﷺ (Maulidur Rasul)', teks: 'Baginda dilahirkan di Makkah pada Tahun Gajah, sekitar 570 Masihi, dalam keadaan yatim. Ayahandanya, Abdullah, wafat sebelum baginda lahir.', ragu: true },
  { h: [3, 12], th: 11, tm: 632, tajuk: 'Wafatnya Rasulullah ﷺ', teks: 'Baginda wafat pada hari Isnin di Madinah dalam usia 63 tahun. Abu Bakar RA menenangkan para sahabat dengan mengingatkan bahawa Allah Maha Hidup dan tidak mati.', ragu: true },
  { h: [4, 25], g: [7, 4], th: 583, tm: 1187, tajuk: 'Perang Hattin', teks: 'Tentera Salahuddin al-Ayyubi menewaskan tentera Salib di Hattin. Kemenangan ini membuka jalan kepada pembebasan Baitulmaqdis.', ragu: true },
  { h: [5, 20], g: [5, 29], th: 857, tm: 1453, tajuk: 'Pembukaan Konstantinopel', teks: 'Sultan Muhammad al-Fateh membuka Konstantinopel pada usia 21 tahun, dan namanya sering dikaitkan dengan hadis tentang pemimpin dan tentera terbaik yang akan membuka kota itu.' },
  { h: [6, 22], th: 13, tm: 634, tajuk: 'Wafatnya Abu Bakar as-Siddiq RA', teks: 'Khalifah pertama dan sahabat paling rapat Rasulullah ﷺ ini wafat selepas memerintah kira-kira dua tahun. Dalam tempoh singkat itu beliau menyatukan semula umat dan mengumpulkan al-Quran.', ragu: true },
  { h: [7, 27], tajuk: 'Isra dan Mikraj', teks: 'Rasulullah ﷺ diperjalankan pada waktu malam dari Masjidilharam ke Masjidilaqsa, lalu dinaikkan ke langit. Pada peristiwa ini solat lima waktu difardukan. Tarikh 27 Rejab ialah yang diraikan di Malaysia.', ragu: true },
  { h: [7, 27], g: [10, 2], th: 583, tm: 1187, tajuk: 'Baitulmaqdis dibebaskan', teks: 'Salahuddin al-Ayyubi memasuki Baitulmaqdis selepas hampir 90 tahun ia dikuasai tentera Salib. Penduduknya diperlakukan dengan belas kasihan.' },
  { h: [8, 15], th: 2, tm: 624, tajuk: 'Pertukaran kiblat', teks: 'Kiblat dipindahkan dari Baitulmaqdis ke Kaabah ketika Rasulullah ﷺ solat di Madinah. Ada riwayat menyebut pertengahan Syaaban dan ada yang menyebut Rejab.', ragu: true },
  { h: [9, 10], tajuk: 'Wafatnya Khadijah binti Khuwailid RA', teks: 'Isteri pertama dan penyokong terbesar Rasulullah ﷺ wafat tiga tahun sebelum Hijrah. Tahun itu, bersama wafatnya Abu Talib, dikenali sebagai Tahun Dukacita.', ragu: true },
  { h: [9, 15], th: 3, tm: 625, tajuk: 'Kelahiran Hasan bin Ali RA', teks: 'Cucu pertama Rasulullah ﷺ lahir di Madinah. Baginda sangat menyayangi cucunya dan sering mendukungnya.', ragu: true },
  { h: [9, 17], th: 2, tm: 624, tajuk: 'Perang Badar', teks: 'Sekitar 313 orang Islam menewaskan kira-kira seribu tentera Quraisy di Badar. Al-Quran menamakannya Yaumul Furqan, hari yang membezakan antara yang hak dengan yang batil.' },
  { h: [9, 17], tajuk: 'Nuzul al-Quran', teks: 'Wahyu pertama, "Iqra", turun kepada Rasulullah ﷺ di Gua Hira. Tarikh 17 Ramadan ialah yang diraikan di Malaysia.', ragu: true },
  { h: [9, 20], th: 8, tm: 630, tajuk: 'Fathu Makkah', teks: 'Rasulullah ﷺ memasuki Makkah bersama kira-kira 10,000 sahabat, hampir tanpa pertumpahan darah. Baginda memaafkan penduduk Makkah yang dahulu memusuhi dan menyakiti baginda.', ragu: true },
  { h: [9, 25], g: [9, 3], th: 658, tm: 1260, tajuk: 'Perang Ain Jalut', teks: 'Tentera Mamluk di bawah Qutuz dan Baibars menewaskan tentera Mongol yang sebelum itu belum pernah dikalahkan, lalu menghalang mereka daripada terus ke Mesir.' },
  { h: [10, 1], th: 2, tm: 624, tajuk: 'Eidulfitri pertama', teks: 'Eidulfitri disambut buat pertama kali pada tahun 2 H, selepas puasa Ramadan difardukan dan kemenangan di Badar.' },
  { h: [10, 7], th: 3, tm: 625, tajuk: 'Perang Uhud', teks: 'Pasukan Islam hampir menang, tetapi sebahagian pemanah meninggalkan kedudukan di Bukit Rumat. Hamzah RA syahid. Peristiwa ini mengajar pentingnya taat kepada arahan pemimpin.' },
  { h: [12, 9], th: 10, tm: 632, tajuk: 'Khutbah Wada di Arafah', teks: 'Dalam Haji Wada, Rasulullah ﷺ berpesan tentang pengharaman darah dan harta sesama Muslim, hak wanita, serta berpegang kepada al-Quran dan sunnah.' },
  { h: [12, 10], tajuk: 'Hari Raya Aidiladha', teks: 'Hari mengenang ketaatan Nabi Ibrahim AS dan Nabi Ismail AS. Umat Islam melaksanakan ibadah korban dan berkongsi daging dengan keluarga, jiran dan fakir miskin.' },
  { h: [12, 18], th: 35, tm: 656, tajuk: 'Syahidnya Uthman bin Affan RA', teks: 'Khalifah ketiga yang digelar Zun Nurain (pemilik dua cahaya) itu syahid ketika sedang membaca al-Quran di rumahnya di Madinah.', ragu: true },
  { g: [1, 2], tm: 1492, tajuk: 'Jatuhnya Granada', teks: 'Granada, kubu terakhir pemerintahan Islam di Andalus, jatuh selepas kira-kira lapan abad Islam berkembang di Semenanjung Iberia.' },
  { g: [2, 10], tm: 1258, tajuk: 'Jatuhnya Baghdad', teks: 'Baghdad, pusat ilmu dan ibu kota Khilafah Abbasiyah, jatuh ke tangan Mongol. Perpustakaan dan khazanah ilmunya musnah.' },
  { g: [3, 3], tm: 1924, tajuk: 'Khilafah Uthmaniyah dibubarkan', teks: 'Majlis Kebangsaan Turki memansuhkan jawatan khalifah, menamatkan kesinambungan khilafah yang berusia hampir 13 abad.' },
  { g: [8, 26], tm: 1071, tajuk: 'Perang Manzikert', teks: 'Sultan Alp Arslan dari Seljuk menewaskan tentera Byzantium. Kemenangan ini membuka Anatolia kepada penghijrahan orang Turki, yang kemudian menjadi tapak kerajaan Uthmaniyah.' },
];

export function peristiwaHariIni(g, hijrah) {
  return PERISTIWA.filter(e => (e.h && e.h[0] === hijrah.m && e.h[1] === hijrah.d) || (e.g && e.g[0] === g.m && e.g[1] === g.d))
    .map(e => {
      const padanH = e.h && e.h[0] === hijrah.m && e.h[1] === hijrah.d;
      const label = padanH
        ? `${e.h[1]} ${BULAN_HIJRAH[e.h[0] - 1]}${e.th ? ' ' + e.th + ' H' : ''}`
        : `${e.g[1]} ${BULAN_MASIHI[e.g[0] - 1]}${e.tm ? ' ' + e.tm + ' M' : ''}`;
      return { ...e, label };
    });
}

// Siri sirah: ringkasan mengikut kronologi, berpusing mengikut hari dalam setahun supaya semua orang melihat bahagian yang sama pada hari yang sama.
export const SIRAH = [
  { t: 'Tahun Gajah dan kelahiran', b: 'Pada tahun Abrahah menggerakkan tentera bergajah untuk meruntuhkan Kaabah, Nabi Muhammad ﷺ dilahirkan di Makkah. Ayahandanya Abdullah telah wafat sebelum baginda lahir. Kisah tentera bergajah itu diabadikan dalam Surah al-Fil.' },
  { t: 'Disusukan oleh Halimah', b: 'Mengikut adat Arab, bayi Muhammad dihantar ke perkampungan Bani Saad untuk disusukan oleh Halimah as-Saadiyah. Di sana baginda membesar dengan udara bersih dan bahasa Arab yang fasih.' },
  { t: 'Yatim piatu sejak kecil', b: 'Ibunda baginda, Aminah, wafat ketika baginda berusia enam tahun. Baginda diasuh oleh datuknya Abdul Muttalib, dan selepas itu oleh bapa saudaranya Abu Talib. Kasih sayang keluarga menjadi penguat baginda.' },
  { t: 'Al-Amin, yang dipercayai', b: 'Sebelum diangkat menjadi rasul, baginda dikenali sebagai al-Amin kerana kejujurannya. Ketika Kaabah dibina semula, baginda menyelesaikan perselisihan tentang siapa yang meletakkan Hajarulaswad dengan meminta semua ketua kabilah memegang bahagian kain yang sama.' },
  { t: 'Perkahwinan dengan Khadijah', b: 'Pada usia 25 tahun, baginda berkahwin dengan Khadijah binti Khuwailid RA, seorang peniaga yang lebih berusia dan terhormat. Beliau terpikat dengan kejujuran baginda semasa berniaga dan menjadi sandaran baginda sepanjang hayatnya.' },
  { t: 'Wahyu pertama di Gua Hira', b: 'Baginda sering beruzlah di Gua Hira. Di sanalah Jibril AS datang membawa wahyu pertama, "Iqra". Baginda pulang dalam keadaan gementar, dan Khadijah RA menenangkan baginda dengan menyebut akhlak mulia baginda.' },
  { t: 'Dakwah bermula dalam senyap', b: 'Dakwah bermula secara rahsia di kalangan orang terdekat. Antara yang awal beriman ialah Khadijah, Abu Bakar, Ali dan Zaid bin Harithah RA. Selepas sekitar tiga tahun, baginda diperintahkan berdakwah secara terang-terangan.' },
  { t: 'Seruan di Bukit Safa', b: 'Baginda naik ke Bukit Safa dan memanggil kaum Quraisy. Sebelum menyampaikan risalah, baginda bertanya sama ada mereka percaya jika baginda menyatakan ada pasukan musuh di sebalik bukit. Mereka mengakui baginda tidak pernah berdusta.' },
  { t: 'Ujian orang-orang beriman', b: 'Para sahabat yang lemah diseksa kerana iman mereka. Bilal bin Rabah tetap menyebut "Ahad, Ahad" walaupun dihimpit batu panas. Sumayyah RA, ibu kepada Ammar bin Yasir, ialah syahidah pertama dalam Islam.' },
  { t: 'Hijrah ke Habsyah', b: 'Rasulullah ﷺ menyuruh sebahagian sahabat berhijrah ke Habsyah kerana rajanya, Najasyi, seorang yang adil. Jaafar bin Abi Talib RA membacakan ayat daripada Surah Maryam, dan Najasyi menolak permintaan Quraisy untuk menyerahkan mereka.' },
  { t: 'Pemulauan di Syib Abi Talib', b: 'Quraisy memulaukan Bani Hasyim dan Bani Muttalib selama sekitar tiga tahun. Mereka kekurangan makanan, namun bersabar sehinggalah piagam pemulauan itu dibatalkan.' },
  { t: 'Tahun Dukacita', b: 'Dalam tempoh yang berdekatan, baginda kehilangan isterinya Khadijah RA dan bapa saudaranya Abu Talib. Tahun itu dikenali sebagai Amul Huzn, Tahun Dukacita. Namun baginda tidak berputus asa dalam berdakwah.' },
  { t: 'Ke Taif', b: 'Baginda ke Taif mengajak penduduknya kepada Islam, tetapi ditolak dan dibaling batu hingga berdarah. Apabila malaikat gunung menawarkan untuk menghempap mereka, baginda menolak dan berharap kelak lahir daripada mereka yang menyembah Allah.' },
  { t: 'Isra dan Mikraj', b: 'Dalam satu malam, baginda diperjalankan dari Masjidilharam ke Masjidilaqsa, lalu dinaikkan ke langit. Peristiwa ini menghadiahkan umat Islam solat lima waktu, hadiah yang diterima terus daripada Allah.' },
  { t: 'Baiah Aqabah', b: 'Sekumpulan penduduk Yathrib dari kabilah Aus dan Khazraj berbaiah kepada Rasulullah ﷺ di Aqabah. Mussab bin Umair RA dihantar mengajar mereka, dan dalam waktu singkat rumah-rumah di Madinah dipenuhi Islam.' },
  { t: 'Hijrah ke Madinah', b: 'Ali RA tidur di tempat tidur baginda untuk mengaburi mata Quraisy. Baginda dan Abu Bakar RA bersembunyi tiga hari di Gua Thawr, sebelum meneruskan perjalanan ke Madinah. Abu Bakar berasa gentar, lalu baginda menenangkannya, "Jangan bersedih, sesungguhnya Allah bersama kita."' },
  { t: 'Membina masjid', b: 'Sebaik tiba, baginda membina Masjid Quba, dan kemudian Masjid Nabawi. Baginda sendiri turut mengangkat batu bersama para sahabat. Masjid menjadi pusat ibadah, ilmu dan urusan masyarakat.' },
  { t: 'Persaudaraan Muhajirin dan Ansar', b: 'Rasulullah ﷺ mempersaudarakan penghijrah dengan penduduk Madinah. Saad bin Rabi RA menawarkan separuh hartanya kepada Abdul Rahman bin Auf RA, yang menolak dengan baik dan hanya meminta ditunjukkan arah ke pasar.' },
  { t: 'Piagam Madinah', b: 'Baginda menyusun perjanjian bersama antara Muslim, Yahudi dan kabilah di Madinah yang menjamin kebebasan beragama, keselamatan bersama dan kewajipan mempertahankan kota. Ia dianggap antara dokumen perlembagaan terawal.' },
  { t: 'Perang Badar', b: 'Pasukan kecil yang kurang kelengkapan menewaskan tentera Quraisy yang jauh lebih besar. Baginda berdoa bersungguh-sungguh sebelum perang. Menurut riwayat sirah, sebahagian tawanan yang pandai menulis dibebaskan dengan syarat mengajar kanak-kanak Madinah menulis.' },
  { t: 'Perang Uhud', b: 'Pasukan Islam hampir menang, tetapi sebahagian pemanah meninggalkan Bukit Rumat kerana tergoda dengan harta rampasan. Hamzah RA syahid. Pengajarannya ialah taat kepada arahan pemimpin walaupun dalam keadaan menang.' },
  { t: 'Perang Khandaq', b: 'Apabila sepuluh ribu tentera bersekutu mengepung Madinah, Salman al-Farisi RA mencadangkan menggali parit, strategi yang belum dikenali orang Arab. Para sahabat menggalinya dalam keadaan lapar dan sejuk, dan Allah menghantar angin kencang ke atas musuh.' },
  { t: 'Perjanjian Hudaibiyah', b: 'Perjanjian yang kelihatan merugikan umat Islam ini sebenarnya membuka tempoh aman yang menyebabkan Islam tersebar luas. Al-Quran menamakannya "kemenangan yang nyata" dalam Surah al-Fath.' },
  { t: 'Surat kepada raja-raja', b: 'Selepas Hudaibiyah, baginda menghantar utusan dengan surat kepada raja-raja seperti Heraklius, Kisra dan Najasyi, mengajak mereka kepada Islam. Ini menunjukkan risalah Islam bersifat sejagat.' },
  { t: 'Fathu Makkah', b: 'Baginda memasuki Makkah dengan tunduk dan tenang, dan memaafkan penduduknya yang dahulu menyakiti baginda dan para sahabat. Kaabah dibersihkan daripada berhala.' },
  { t: 'Hunain dan Taif', b: 'Pada Perang Hunain, umat Islam hampir kalah apabila terlalu yakin dengan bilangan mereka yang ramai. Pertolongan Allah kembali apabila mereka teguh bersama Rasulullah ﷺ. Selepas perang, baginda berlaku adil dan lemah lembut dalam membahagikan harta rampasan.' },
  { t: 'Haji Wada', b: 'Dalam khutbah di Arafah, baginda berpesan bahawa darah dan harta sesama Muslim adalah haram, supaya wanita dilayan dengan baik, dan supaya umat berpegang kepada al-Quran serta sunnah. Tidak lama selepas itu turun ayat yang menyempurnakan agama ini.' },
  { t: 'Wafat Rasulullah ﷺ', b: 'Baginda wafat pada hari Isnin di Madinah. Ketika para sahabat tergamam, Abu Bakar RA menenangkan mereka dengan mengingatkan bahawa sesiapa yang menyembah Muhammad, Muhammad telah wafat, tetapi sesiapa yang menyembah Allah, Allah Maha Hidup dan tidak mati.' },
  { t: 'Bersama anak-anak', b: 'Rasulullah ﷺ mencium cucu-cucunya dan bersikap lembut dengan kanak-kanak. Baginda pernah memendekkan solat apabila mendengar tangisan bayi kerana tidak mahu menyusahkan ibunya. Baginda juga bersujud lama apabila cucunya menaiki belakang baginda.' },
  { t: 'Dalam rumah tangga', b: 'Isteri-isteri baginda menceritakan bahawa baginda membantu kerja rumah, menampal pakaian dan membaiki kasutnya sendiri. Baginda juga pernah berlumba lari dengan Aisyah RA. Baginda bersabda bahawa yang terbaik antara kamu ialah yang terbaik terhadap keluarganya.' },
];

export const BAHAGIAN_SIRAH = SIRAH.length;

export function hariDalamTahun({ y, m, d }) {
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86400000);
}

export function sirahHariIni(g) {
  const i = (hariDalamTahun(g) - 1) % SIRAH.length;
  return { ...SIRAH[i], no: i + 1, jumlah: SIRAH.length };
}


// Hari kebesaran Islam mengikut Takwim JAKIM (rujukan: e-solat.gov.my). b = bulan Hijrah, h = hari.
export const HARI_BESAR = [
  { b: 1, h: 1, n: 'Awal Muharam (Maal Hijrah)' },
  { b: 3, h: 12, n: 'Maulidur Rasul' },
  { b: 7, h: 27, n: 'Israk dan Mikraj' },
  { b: 9, h: 1, n: 'Awal Ramadan' },
  { b: 9, h: 17, n: 'Nuzul al-Quran' },
  { b: 10, h: 1, n: 'Hari Raya Aidilfitri' },
  { b: 12, h: 1, n: 'Awal Zulhijjah' },
  { b: 12, h: 10, n: 'Hari Raya Aidiladha' }
];

// Hari kebesaran terdekat: dikira daripada tarikh Hijrah (Umm al-Qura + laras). Anggaran; tarikh rasmi ditetapkan JAKIM.
export function hitungMundur(g, laras = 0, bil = 4) {
  const jumpa = new Map();
  for (let i = 0; i <= 390 && jumpa.size < HARI_BESAR.length; i++) {
    const t = { ...g, d: g.d + i };
    const tt = new Date(Date.UTC(g.y, g.m - 1, g.d + i, 12));
    const hj = tarikhHijrah({ y: tt.getUTCFullYear(), m: tt.getUTCMonth() + 1, d: tt.getUTCDate() }, laras);
    HARI_BESAR.forEach((e, k) => { if (!jumpa.has(k) && hj.m === e.b && hj.d === e.h) jumpa.set(k, { n: e.n, i, h: hj, g: { y: tt.getUTCFullYear(), m: tt.getUTCMonth() + 1, d: tt.getUTCDate() } }); });
  }
  return [...jumpa.values()].sort((a, b) => a.i - b.i).slice(0, bil);
}
