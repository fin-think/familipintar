// Sunnah harian Rasulullah SAW: satu sunnah sehari (pusingan 30 hari).
// t = tajuk, b = cara amal / keterangan, r = rujukan hadis, doa = { ar, rumi, maksud } (pilihan)
// Rujukan umum: "Sunnah dan Zikir Harian Nabi" (Dr. Abdullah bin Hamod Al-Furaih) dan kitab hadis yang dinyatakan.
import { hariDalamTahun } from "./sejarah-islam.js";

export const SUNNAH = [
  { t: 'Doa bangun tidur', b: 'Sebaik terjaga, usap muka dengan tangan untuk hilangkan kantuk, kemudian baca doa bangun tidur sebagai tanda syukur diberi peluang hidup sehari lagi.', r: 'Bukhari 6312',
    doa: { ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', rumi: 'Alhamdulillahil-lazi ahyana ba‘da ma amatana wa ilaihin-nusyur', maksud: 'Segala puji bagi Allah yang menghidupkan kami setelah mematikan kami, dan kepada-Nya kami dibangkitkan.' } },
  { t: 'Bersiwak selepas bangun tidur', b: 'Nabi SAW membersihkan mulut dengan siwak apabila bangun malam. Mulakan hari dengan gosok gigi atau bersiwak.', r: 'Bukhari 245, Muslim 255' },
  { t: 'Basuh tangan tiga kali', b: 'Selepas bangun tidur, basuh kedua-dua tangan tiga kali sebelum memasukkannya ke dalam bekas air.', r: 'Bukhari 162, Muslim 278' },
  { t: 'Solat sunat sebelum Subuh', b: 'Dua rakaat ringan sebelum solat Subuh. Nabi SAW bersabda ia lebih baik daripada dunia dan segala isinya.', r: 'Muslim 725' },
  { t: 'Duduk berzikir selepas Subuh', b: 'Jika mampu, kekal di tempat solat selepas Subuh untuk berzikir hingga matahari naik. Nabi SAW biasa duduk di tempat solatnya selepas Subuh.', r: 'Muslim 670' },
  { t: 'Sayyidul Istighfar pagi dan petang', b: 'Baca penghulu istighfar pada waktu pagi dan petang. Sesiapa membacanya dengan yakin lalu meninggal pada hari itu, dia termasuk ahli syurga.', r: 'Bukhari 6306' },
  { t: 'Solat Dhuha', b: 'Setiap sendi badan perlu bersedekah setiap hari, dan dua rakaat Dhuha sudah mencukupi untuk semuanya.', r: 'Muslim 720' },
  { t: 'Mulakan dengan kanan', b: 'Nabi SAW suka memulakan dengan kanan: memakai kasut, menyikat rambut, bersuci dan dalam semua urusannya.', r: 'Bukhari 168, Muslim 268' },
  { t: 'Doa keluar rumah', b: 'Bertawakal kepada Allah sebelum melangkah keluar rumah untuk bekerja, belajar atau berurusan.', r: 'Abu Dawud 5095, Tirmizi 3426',
    doa: { ar: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', rumi: 'Bismillahi tawakkaltu ‘alallah, la haula wa la quwwata illa billah', maksud: 'Dengan nama Allah, aku bertawakal kepada Allah. Tiada daya dan kekuatan melainkan dengan Allah.' } },
  { t: 'Sebut nama Allah ketika masuk rumah', b: 'Sebut nama Allah ketika masuk rumah dan ketika makan, maka syaitan tidak mendapat tempat bermalam dan makan malam.', r: 'Muslim 2018' },
  { t: 'Sebarkan salam', b: 'Beri salam kepada ahli keluarga, kawan dan orang yang ditemui. Nabi SAW bersabda: sebarkanlah salam di antara kamu, nescaya kamu saling menyayangi.', r: 'Muslim 54' },
  { t: 'Senyum itu sedekah', b: 'Senyuman kepada saudaramu adalah sedekah. Mulakan dengan pasangan, anak dan ibu bapa di rumah.', r: 'Tirmizi 1956' },
  { t: 'Bantu kerja rumah', b: 'Aisyah RA menceritakan Nabi SAW membantu urusan keluarganya di rumah, dan apabila tiba waktu solat, baginda keluar untuk solat.', r: 'Bukhari 676' },
  { t: 'Istighfar 100 kali sehari', b: 'Nabi SAW beristighfar dan bertaubat kepada Allah seratus kali dalam sehari. Boleh dibaca ketika memandu atau menunggu.', r: 'Muslim 2702' },
  { t: 'Solat sunat rawatib', b: 'Sesiapa solat 12 rakaat sunat setiap hari, Allah binakan baginya sebuah rumah di syurga. Cuba tambah satu rawatib hari ini.', r: 'Muslim 728' },
  { t: 'Bersiwak setiap kali solat', b: 'Nabi SAW bersabda: kalau tidak menyusahkan umatku, aku perintahkan mereka bersiwak setiap kali hendak solat.', r: 'Bukhari 887, Muslim 252' },
  { t: 'Adab makan', b: 'Baca Bismillah, makan dengan tangan kanan, dan ambil makanan yang paling dekat dengan kita. Ajar anak-anak bersama.', r: 'Bukhari 5376, Muslim 2022',
    doa: { ar: 'بِسْمِ اللَّهِ', rumi: 'Bismillah', maksud: 'Dengan nama Allah.' } },
  { t: 'Tidak mencela makanan', b: 'Nabi SAW tidak pernah mencela makanan. Jika baginda suka, baginda makan; jika tidak, baginda tinggalkan.', r: 'Bukhari 5409, Muslim 2064' },
  { t: 'Minum sambil duduk, tiga teguk', b: 'Minum sambil duduk dan bernafas di luar bekas, dalam tiga teguk.', r: 'Muslim 2024, 2028' },
  { t: 'Jilat jari selepas makan', b: 'Nabi SAW menjilat jarinya selepas makan, kerana kita tidak tahu di bahagian mana makanan itu ada keberkatan.', r: 'Muslim 2033' },
  { t: 'Selawat ke atas Nabi', b: 'Sesiapa berselawat ke atas Nabi SAW sekali, Allah berselawat ke atasnya sepuluh kali. Perbanyakkan hari ini.', r: 'Muslim 408' },
  { t: 'Hubungkan silaturahim', b: 'Sesiapa yang ingin dilapangkan rezeki dan dipanjangkan umur, hendaklah dia menghubungkan silaturahim. Hubungi seorang ahli keluarga hari ini.', r: 'Bukhari 5986' },
  { t: 'Tidur awal selepas Isyak', b: 'Nabi SAW tidak suka tidur sebelum Isyak dan berbual-bual selepasnya. Tidur awal supaya mudah bangun untuk Subuh.', r: 'Bukhari 568' },
  { t: 'Berwuduk sebelum tidur', b: 'Berwuduk seperti untuk solat, kemudian baring di atas rusuk kanan sebelum tidur.', r: 'Bukhari 247, Muslim 2710' },
  { t: 'Doa sebelum tidur', b: 'Baca doa ringkas ini ketika meletakkan kepala di bantal.', r: 'Bukhari 6324',
    doa: { ar: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', rumi: 'Bismikallahumma amutu wa ahya', maksud: 'Dengan nama-Mu ya Allah, aku mati dan aku hidup.' } },
  { t: 'Tiga Qul sebelum tidur', b: 'Rapatkan tapak tangan, tiup dan baca al-Ikhlas, al-Falaq dan an-Nas, kemudian sapu ke seluruh badan yang dapat dicapai. Ulang tiga kali.', r: 'Bukhari 5017' },
  { t: 'Ayat Kursi sebelum tidur', b: 'Sesiapa membaca Ayat Kursi ketika hendak tidur, Allah sentiasa memeliharanya dan syaitan tidak mendekatinya hingga pagi.', r: 'Bukhari 2311' },
  { t: 'Tasbih, tahmid dan takbir sebelum tidur', b: 'Subhanallah 33 kali, Alhamdulillah 33 kali dan Allahu Akbar 34 kali. Nabi SAW mengajarkannya kepada Fatimah dan Ali, lebih baik daripada seorang pembantu.', r: 'Bukhari 3705, Muslim 2727' },
  { t: 'Solat witir', b: 'Jadikan witir sebagai penutup solat malam. Jika bimbang tidak bangun, laksanakan sebelum tidur.', r: 'Bukhari 998' },
  { t: 'Qiyamullail di sepertiga malam', b: 'Allah turun ke langit dunia pada sepertiga akhir malam dan berfirman: siapa yang berdoa kepada-Ku, Aku perkenankan. Dua rakaat pun cukup untuk mula.', r: 'Bukhari 1145' }
];

export function sunnahHariIni(g) {
  const i = (hariDalamTahun(g) - 1) % SUNNAH.length;
  return { ...SUNNAH[i], no: i + 1, jumlah: SUNNAH.length };
}
