// =====================================================================
// CARA GUNA: panduan ringkas setiap app (satu gaya untuk semua).
// Guna: <script src="cara-guna.js" data-app="wecare" defer></script>
// Butang "❓ Cara Guna" terapung (atau dalam #cgSlot jika ada). Kali pertama app dibuka, panduan terbuka sendiri.
// =====================================================================
(function () {
  const PANDUAN = {
    wecare: {
      tajuk: 'Cara Guna weCare',
      intro: 'Urus penjagaan ibu bapa bersama adik-beradik: kesihatan, ubat, tugasan dan giliran menjaga.',
      langkah: [
        ['Pilih belah', 'Pilih ibu bapa belah anda atau belah pasangan di bahagian atas. Adik-beradik ditarik terus daripada myNasab.'],
        ['Profil kesihatan', 'Isi penyakit, ubat harian, alahan dan doktor ibu bapa di <b>Profil & Kesihatan</b>, supaya semua adik-beradik tahu.'],
        ['Tambah tugasan', 'Tekan tarikh pada <b>Kalendar Jagaan</b>. Tanda <b>📋 Tugasan</b> (cth. bawa ke klinik, makan ubat) dan/atau <b>🏠 Balik Kampung</b>, kemudian simpan sekali.'],
        ['Peringatan ubat', 'Tugasan ubat yang ada <b>masa</b> akan dihantar notifikasi kepada semua. Bila sudah beri ubat, tekan <b>✅ DONE</b> supaya yang lain tahu.'],
        ['Giliran jaga', 'Tekan <b>🔄 Jana giliran</b>, pilih adik-beradik dan berapa hari seorang. Semua dimaklumkan bila giliran seseorang bermula.'],
        ['Nota keluarga', 'Tulis makluman di <b>Papan Nota Keluarga</b>. Adik-beradik lain terima notifikasi.']
      ]
    },
    gotravel: {
      tajuk: 'Cara Guna goTravel',
      intro: 'Rancang percutian keluarga, kira kos, dan simpan duit sedikit demi sedikit sebelum bertolak.',
      langkah: [
        ['Buat pelan', 'Isi <b>nama program</b>, destinasi dan <b>tarikh berlepas/pulang</b>. Pelan disimpan automatik.'],
        ['Pilih rombongan', 'Tanda ahli keluarga yang ikut di <b>Ahli Rombongan</b>. Senarai ditarik daripada myNasab.'],
        ['Masukkan kos', 'Isi <b>Pengangkutan / Tiket</b>, <b>Penginapan</b> dan <b>Makan & Lain-lain</b>. Jumlah dan simpanan bulanan dikira sendiri.'],
        ['Jadual itinerari', 'Tekan <b>Edit Jadual</b> untuk susun aktiviti setiap hari.'],
        ['Simpan duit', 'Dalam OurMoney, rekod Duit Keluar dan pilih pelan percutian ini dalam Kategori. Kemajuan simpanan dikemas kini.'],
        ['Peringatan', 'Anda dan ahli rombongan yang ada akaun FP menerima notifikasi 7, 3 dan 1 hari sebelum bertolak.']
      ]
    },
    myjurnal: {
      tajuk: 'Cara Guna myJurnal',
      intro: 'Kumpulan kalkulator, ujian dan e-book untuk suami isteri merancang hidup langkah demi langkah.',
      langkah: [
        ['Ikut langkah', 'Mulakan dari langkah pertama dalam senarai. Setiap langkah ada satu tindakan ringkas.'],
        ['Guna kalkulator & ujian', 'Buka alat (cth. myHEALTH, myDEBT, myFINPLAN). Keputusan disimpan automatik ke myTADBIR atau myKids.'],
        ['Baca e-book', 'E-book panduan ada pada setiap topik untuk faham sebelum membuat keputusan.'],
        ['myCHECKLIST40', 'Tanda amalan harian. Hidupkan peringatan jika mahu dimaklumkan amalan yang belum ditanda.'],
        ['Bersama pasangan', 'Induk dan Pasangan berkongsi satu akaun. Pilih nama anda bila diminta supaya rekod tidak bercampur.']
      ]
    },
    mykids: {
      tajuk: 'Cara Guna myKids (Anakku Hartaku)',
      intro: 'Pantau perkembangan setiap anak untuk dunia dan akhirat. Nama dan umur anak ditarik daripada myNasab.',
      langkah: [
        ['Pilih anak', 'Tekan nama anak di bahagian atas.'],
        ['Tab Dunia', 'Pilih kerjaya impian. Anda dapat sasaran SPM, laluan universiti, langkah ke kerjaya dan anggaran kos (dipaut ke myTADBIR).'],
        ['Tab Akhirat', 'Senarai didikan Islam ikut umur anak. Tanda yang sudah diajar.'],
        ['Ujian karakter', 'Jawab ujian personaliti dan psikologi (myPSIKOkids/teens, myINTEGRITY) untuk analisis karakter anak.'],
        ['Telefon anak', 'Anak 7 tahun ke atas boleh didaftar telefonnya di <b>Tetapan → Peranti & Notifikasi</b> untuk terima peringatan sendiri.']
      ]
    },
    mytadbir: {
      tajuk: 'Cara Guna myTADBIR',
      intro: 'Gambaran penuh kewangan keluarga: aset, hutang, dana pendidikan anak, kesihatan dan persaraan.',
      langkah: [
        ['Maklumat anda', 'Isi umur, gaji dan perbelanjaan bulanan di <b>Maklumat Anda</b>.'],
        ['Aset & liabiliti', 'Tambah simpanan/pelaburan di <b>Urus Senarai Aset</b> dan pinjaman di <b>Urus Senarai Hutang</b>.'],
        ['Dana pendidikan', 'Setiap anak ada kotak <b>Anggaran Kos</b>, <b>Dana Semasa</b> dan <b>Dana Diperlukan</b>. Ubah terus dalam kotak.'],
        ['Baca analisis', 'Semak DSR, harta bersih, unjuran kos kesihatan dan dana bersara. Merah bermaksud perlu tindakan.'],
        ['Jadikan misi', 'Sasaran simpanan dari sini muncul sebagai <b>Misi Kewangan</b> dalam OurMoney.']
      ]
    },
    ourmoney: {
      tajuk: 'Cara Guna OurMoney',
      intro: 'Rekod duit masuk dan keluar keluarga setiap hari, dan capai misi simpanan.',
      langkah: [
        ['Pilih paparan', 'Pilih nama anda, pasangan, atau <b>Gabungan</b> di bahagian atas.'],
        ['Mula dengan baki sebenar', 'Tekan <b>⚖️ Betulkan baki</b> dan masukkan baki sebenar Tunai dan setiap akaun bank.'],
        ['Rekod harian', 'Pilih <b>Duit Keluar</b> atau <b>Duit Masuk</b>, kategori, dan <b>Bank/Tunai</b>, kemudian Simpan Rekod.'],
        ['Banyak akaun bank', 'Dalam pilihan Bank/Tunai, tekan <b>➕ Tambah akaun bank</b>. Pindahan antara akaun guna kategori <b>🔁 Pindah antara akaun</b>.'],
        ['Keluar duit ATM', 'Guna kategori <b>🏧 Pengeluaran tunai</b>. Ia bukan perbelanjaan, cuma pindah dari bank ke tunai.'],
        ['Tersalah rekod', 'Buka senarai transaksi. Tekan <b>✏️</b> untuk edit atau <b>✕</b> untuk padam.'],
        ['Misi & analisis', 'Simpan untuk misi melalui Duit Keluar → pilih misi dalam Kategori. Lihat tab <b>📊 Analisis</b> dan laporan bulanan.']
      ]
    },
    buatapa: {
      tajuk: 'Cara Guna Buat Apa Hari Ini',
      intro: 'Laman keluarga untuk berkongsi cerita dan gambar, ganti grup WhatsApp keluarga.',
      langkah: [
        ['Kongsi', 'Tulis sesuatu dan tambah gambar dengan <b>Galeri</b> atau <b>Kamera</b>.'],
        ['Pilih siapa nampak', '<b>Kami</b> untuk anda, pasangan dan anak sahaja. <b>Semua</b> untuk seluruh keluarga.'],
        ['Reaksi & komen', 'Tekan ❤️ 🤲 😂 atau <b>Komen</b> pada siaran keluarga.'],
        ['Gambar profil', 'Tekan <b>Gambar profil</b> (atau Tetapan di halaman utama) supaya keluarga kenal anda.'],
        ['Sirah & hari kebesaran', 'Kisah sirah harian dan kiraan hari kebesaran Islam sentiasa ada di halaman ini.'],
        ['Berbual', 'Tekan <b>JomSalam</b> untuk mesej peribadi dengan keluarga dan kenalan.']
      ]
    },
    jomsalam: {
      tajuk: 'Cara Guna JomSalam',
      intro: 'Berbual dengan keluarga dan kenalan. Teks sahaja.',
      langkah: [
        ['Keluarga', 'Tab <b>Keluarga</b> menyenaraikan ahli keluarga yang ada akaun FP. Tekan nama untuk terus berbual.'],
        ['Kita Nasab Adam', 'Untuk kawan dan kenalan (18 tahun ke atas). Tekan <b>Hulur Salam</b> dan cari dengan emel penuh atau Kod Salam.'],
        ['Kod Salam', 'Tekan <b>Kod Salam</b> di atas untuk kongsi kod anda kepada kenalan.'],
        ['Sambut / Tolak', 'Salam daripada kenalan perlu disambut dahulu sebelum boleh berbual. Penolakan tidak dimaklumkan.'],
        ['Keselamatan', 'Menu ⋮ dalam perbualan: <b>Sekat</b> atau <b>Lapor</b>. Mesej Kita Nasab Adam dipadam automatik selepas 90 hari.']
      ]
    }
  };

  const sc = document.currentScript, app = sc && sc.dataset.app, P = PANDUAN[app];
  if (!P) return;
  const css = document.createElement('style');
  css.textContent = `
    #cgBtn{position:fixed;right:14px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:900;display:inline-flex;align-items:center;gap:6px;background:#fff;color:#0f766e;border:1.5px solid #99f6e4;border-radius:999px;padding:8px 13px;font:700 13px/1 system-ui,sans-serif;box-shadow:0 6px 18px rgba(15,23,42,.15);cursor:pointer}
    #cgBtn.dlm{position:static;box-shadow:none;padding:6px 10px;font-size:12px;background:rgba(255,255,255,.15);color:#fff;border-color:transparent}
    #cgLatar{position:fixed;inset:0;z-index:9990;background:rgba(15,23,42,.55);display:none;align-items:flex-end;justify-content:center;padding:14px 14px calc(14px + env(safe-area-inset-bottom))}
    #cgLatar.buka{display:flex}
    #cgKad{background:#fff;width:100%;max-width:520px;max-height:84vh;overflow:auto;border-radius:22px;box-shadow:0 18px 40px rgba(15,23,42,.25);padding:20px;font-family:system-ui,sans-serif;color:#1e293b}
    @media(min-width:768px){#cgLatar{align-items:center}#cgKad{border-radius:22px}}
    #cgKad h2{margin:0;font-size:18px;font-weight:800}
    #cgKad .cg-intro{font-size:13px;color:#64748b;margin:6px 0 14px;line-height:1.5}
    #cgKad ol{list-style:none;margin:0;padding:0;counter-reset:cg}
    #cgKad li{counter-increment:cg;display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13.5px;line-height:1.5}
    #cgKad li:last-child{border-bottom:0}
    #cgKad li::before{content:counter(cg);flex:none;width:26px;height:26px;border-radius:999px;background:#ccfbf1;color:#0f766e;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:13px}
    #cgKad li b.cg-t{display:block;color:#0f172a}
    #cgTutup{width:100%;margin-top:14px;background:#0f766e;color:#fff;border:0;border-radius:12px;padding:12px;font-weight:800;font-size:14px;cursor:pointer}`;
  document.head.appendChild(css);

  const latar = document.createElement('div');
  latar.id = 'cgLatar';
  latar.innerHTML = `<div id="cgKad" role="dialog" aria-label="${P.tajuk}">
      <div style="display:flex;justify-content:space-between;align-items:center"><h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f766e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/></svg>${P.tajuk}</h2><button type="button" data-cg-tutup style="background:none;border:0;font-size:26px;color:#94a3b8;cursor:pointer;line-height:1" aria-label="Tutup">&times;</button></div>
      <p class="cg-intro">${P.intro}</p>
      <ol>${P.langkah.map(([t, d]) => `<li><span><b class="cg-t">${t}</b>${d}</span></li>`).join('')}</ol>
      <button type="button" id="cgTutup" data-cg-tutup>Faham, mula guna</button>
    </div>`;
  const buka = () => latar.classList.add('buka');
  const tutup = () => { latar.classList.remove('buka'); try { localStorage.setItem('cg_' + app, '1'); } catch (e) {} };
  latar.addEventListener('click', (e) => { if (e.target === latar || e.target.closest('[data-cg-tutup]')) tutup(); });

  const btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'cgBtn'; btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg> Cara Guna'; btn.onclick = buka;

  const pasang = () => {
    document.body.appendChild(latar);
    const slot = document.getElementById('cgSlot');
    if (slot) { btn.classList.add('dlm'); slot.appendChild(btn); } else document.body.appendChild(btn);
    let sudah = false; try { sudah = localStorage.getItem('cg_' + app) === '1'; } catch (e) { sudah = true; }
    if (!sudah) setTimeout(buka, 900);     // kali pertama: buka sendiri sekali
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang); else pasang();
  window.bukaCaraGuna = buka;
})();
