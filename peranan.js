/*!
 * peranan.js - pemilih Induk / Pasangan (/ Gabungan) kongsi untuk aplikasi Famili Pintar
 * Dimuat sebagai skrip biasa:  <script src="peranan.js?v=1"></script>   (../peranan.js untuk folder app/)
 *
 * Guna:
 *   const info = await Peranan.muat(db, uid, { collection, query, where, getDocs });
 *   //  info = { ada, induk:{nama,jantina,dob}, pasangan:{nama,jantina,dob}|null }
 *   Peranan.pasang('#tempat', info, { gabungan: false, onTukar: (mod) => {...} });
 *   Peranan.mod            // 'induk' | 'pasangan' | 'gabungan'
 *   Peranan.dok(uid)       // id dokumen ikut peranan: uid (induk) atau uid + '_pasangan'
 *   Peranan.awalan()       // '' (induk) atau 'pasangan_' (untuk medan dalam dokumen kongsi)
 *   Peranan.pemilik()      // 'induk' | 'pasangan' | null : siapa pemilik PERANTI ini (dipilih sekali, disimpan pada peranti)
 *   Peranan.daftarPush(mod)// daftar token notifikasi peranti ini untuk orang itu (fcm_induk / fcm_pasangan dalam mynasab_users)
 *
 * Data Induk TIDAK berubah (kekal pada uid / medan asal). Data pasangan disimpan berasingan.
 */
(function (w) {
  var KUNCI = 'fp_pengguna', KUNCI_PERANTI = 'fp_peranti_untuk', KUNCI_NANTI = 'fp_tanya_nanti';
  var P = { mod: 'induk', info: null, pilihan: null, uid: null };

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  function suntikGaya() {
    if (document.getElementById('peranan-gaya')) return;
    var s = document.createElement('style');
    s.id = 'peranan-gaya';
    s.textContent =
      '.fp-peranan{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px 14px;margin:0 0 16px;box-shadow:0 1px 3px rgba(0,0,0,.05);font-family:inherit}' +
      '.fp-peranan .fp-l{font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.5px}' +
      '.fp-peranan .fp-b{display:flex;gap:8px;flex:1;min-width:200px}' +
      '.fp-peranan button{flex:1;padding:9px 10px;border:1.5px solid #e2e8f0;background:#f8fafc;color:#1e293b;border-radius:10px;font-weight:800;font-size:13px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.fp-peranan button.aktif{background:#0d9488;border-color:#0d9488;color:#fff}' +
      '.fp-peranan .fp-ring{flex:1;font-weight:800;font-size:13px;color:#1e293b;min-width:0}' +
      '.fp-peranan .fp-ring a{margin-left:8px;font-size:12px;font-weight:600;color:#0d9488;text-decoration:underline;cursor:pointer}' +
      '.fp-peranan.ringkas .fp-b{display:none}.fp-peranan.ringkas.buka .fp-b{display:flex;flex-basis:100%}' +
      '.fp-tanya{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:18px;font-family:inherit}' +
      '.fp-tanya>div{background:#fff;border-radius:18px;padding:20px 18px;max-width:380px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.3);text-align:center}' +
      '.fp-tanya h3{margin:0 0 6px;font-size:17px;font-weight:800;color:#0f172a}' +
      '.fp-tanya p{margin:0 0 14px;font-size:13px;color:#64748b;line-height:1.45}' +
      '.fp-tanya button.fp-pil{display:block;width:100%;margin:8px 0 0;padding:13px;border:none;border-radius:12px;background:#0d9488;color:#fff;font-weight:800;font-size:15px;cursor:pointer}' +
      '.fp-tanya a{display:inline-block;margin-top:12px;font-size:12px;color:#64748b;text-decoration:underline;cursor:pointer}';
    document.head.appendChild(s);
  }

  function cariNod(snap) {
    var r = { induk: null, pasangan: null };
    snap.forEach(function (d) {
      var x = d.data(), h = String(x.relationship || '').trim();
      var n = { nama: x.name || '', jantina: x.gender || '', dob: x.dob || '' };
      if (x.is_root || h === 'Diri Sendiri') { if (!r.induk) r.induk = n; }
      else if ((h === 'Suami' || h === 'Isteri') && !r.pasangan) r.pasangan = n;
    });
    return r;
  }

  P.muat = function (db, uid, fs) {
    P.uid = uid;
    return fs.getDocs(fs.query(fs.collection(db, 'mynasab_nodes'), fs.where('owner_uid', '==', uid))).then(function (snap) {
      var r = cariNod(snap);
      var info = { ada: !!r.pasangan, induk: r.induk || { nama: 'Induk', jantina: '', dob: '' }, pasangan: r.pasangan };
      if (!info.induk.nama) info.induk.nama = 'Induk';
      if (info.pasangan && !info.pasangan.nama) info.pasangan.nama = 'Pasangan';
      P.info = info;
      var pem = P.pemilik(), simpan = null;
      // Peranti dikenali: lalai sentiasa pemilik peranti; penukaran melalui bar "Untuk" hanya sementara (sesi ini sahaja).
      try { simpan = (pem ? sessionStorage : localStorage).getItem(KUNCI); } catch (e) {}
      P.mod = (simpan === 'pasangan' || simpan === 'gabungan') && info.ada ? simpan : (pem || 'induk');
      return info;
    }).catch(function (e) { console.error('Peranan.muat:', e); P.info = { ada: false, induk: { nama: 'Induk', jantina: '', dob: '' }, pasangan: null }; P.mod = 'induk'; return P.info; });
  };

  // ---- Pemilik peranti: dipilih sekali, disimpan pada peranti, menjadi lalai untuk semua app ----
  P.pemilik = function () {
    if (!P.info || !P.info.ada) return null;
    var v = null; try { v = localStorage.getItem(KUNCI_PERANTI); } catch (e) {}
    return v === 'induk' || v === 'pasangan' ? v : null;
  };
  P.setPemilik = function (mod) {
    try { localStorage.setItem(KUNCI_PERANTI, mod); } catch (e) {}
    try { sessionStorage.removeItem(KUNCI_NANTI); } catch (e) {}
  };
  P.perluPilih = function () {
    if (!P.info || !P.info.ada || P.pemilik()) return false;
    try { if (sessionStorage.getItem(KUNCI_NANTI)) return false; } catch (e) {}
    return true;
  };

  // ---- Notifikasi push: token peranti didaftar untuk ORANG (fcm_induk / fcm_pasangan), bukan satu senarai akaun ----
  var VAPID = 'BC-vntpi-9WxGGKUPeGopgcykMKc87MODe1aEpwieX096IQ8Hzu3Mh89SI8YxuvvOvPSqhW7Eu2Ziqn4ZjwBugs';
  var CFG_FCM = { apiKey: "AIzaSyA7SW4U--evGtfRyPz5Feh3mEN8MF92gTg", authDomain: "familipintar.firebaseapp.com", projectId: "familipintar", storageBucket: "familipintar.firebasestorage.app", messagingSenderId: "277029764059", appId: "1:277029764059:web:0a21bb2e01d868b1ed05fe" };
  function perKey(mod) { return (mod || P.mod) === 'pasangan' ? 'pasangan' : 'induk'; }
  P.medanToken = function (mod) { return 'fcm_' + perKey(mod); };
  async function modul() {
    var B = 'https://www.gstatic.com/firebasejs/10.8.1/';
    var m = await Promise.all([import(B + 'firebase-app.js'), import(B + 'firebase-messaging.js'), import(B + 'firebase-firestore.js')]);
    return { A: m[0], M: m[1], F: m[2] };
  }
  P.ambilToken = async function () {
    var x = await modul();
    var reg = await navigator.serviceWorker.getRegistration('/');
    var app = x.A.getApps().filter(function (a) { return a.name === 'fpfcm'; })[0] || x.A.initializeApp(CFG_FCM, 'fpfcm');   // konfigurasi kongsi tiada messagingSenderId
    var token = await x.M.getToken(x.M.getMessaging(app), { vapidKey: VAPID, serviceWorkerRegistration: reg || undefined });
    if (!token) throw new Error('tiada token');
    return token;
  };
  // Mesti dipanggil terus daripada tekanan pengguna (kebenaran notifikasi dimohon dahulu sebelum sebarang await lain).
  P.daftarPush = async function (mod) {
    var per = perKey(mod), lain = per === 'induk' ? 'pasangan' : 'induk';
    if (!P.uid) return { ok: false, sebab: 'belum-log-masuk' };
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return { ok: false, sebab: 'tidak-disokong' };
    var izin = Notification.permission;
    if (izin === 'default') izin = await Notification.requestPermission();
    if (izin !== 'granted') return { ok: false, sebab: 'tidak-dibenarkan' };
    try {
      var x = await modul(), token = await P.ambilToken(), db = x.F.getFirestore(x.A.getApp()), ref = x.F.doc(db, 'mynasab_users', P.uid);
      var u = { fcm_tokens: x.F.arrayUnion(token) }; u['fcm_' + per] = x.F.arrayUnion(token);
      await x.F.setDoc(ref, u, { merge: true });
      var b = {}; b['fcm_' + lain] = x.F.arrayRemove(token);          // peranti ini milik orang yang dipilih sahaja
      await x.F.updateDoc(ref, b);
      return { ok: true, token: token };
    } catch (e) { console.warn('daftarPush', e); return { ok: false, sebab: String((e && (e.code || e.message)) || e).slice(0, 90) }; }
  };
  P.buangPush = async function (mod) {
    var per = perKey(mod);
    if (!P.uid || !('Notification' in window) || Notification.permission !== 'granted') return false;
    var x = await modul(), token = await P.ambilToken(), db = x.F.getFirestore(x.A.getApp()), u = {};
    u['fcm_' + per] = x.F.arrayRemove(token);
    await x.F.updateDoc(x.F.doc(db, 'mynasab_users', P.uid), u);
    return true;
  };
  P.adaPush = async function (mod) {
    if (!P.uid || !('Notification' in window) || Notification.permission !== 'granted') return false;
    var x = await modul(), token = await P.ambilToken(), db = x.F.getFirestore(x.A.getApp());
    var d = await x.F.getDoc(x.F.doc(db, 'mynasab_users', P.uid)), v = d.exists() ? d.data()['fcm_' + perKey(mod)] : null;
    return Array.isArray(v) && v.indexOf(token) >= 0;
  };

  // ---- Soalan sekali: "Peranti ini untuk siapa?" ----
  P.tanya = function () {
    if (!P.info || !P.info.ada || document.getElementById('fp-tanya')) return;
    suntikGaya();
    var o = document.createElement('div'); o.id = 'fp-tanya'; o.className = 'fp-tanya';
    o.innerHTML = '<div><h3>Peranti ini untuk siapa?</h3><p>Pilih sekali sahaja. Pilihan disimpan pada peranti ini, menjadi lalai untuk semua app, dan peringatan hanya sampai ke telefon orang itu.</p>' +
      '<button type="button" class="fp-pil" data-mod="induk">' + esc(P.info.induk.nama) + '</button>' +
      '<button type="button" class="fp-pil" data-mod="pasangan">' + esc(P.info.pasangan.nama) + '</button>' +
      '<a id="fp-tanya-nanti">Nanti</a></div>';
    document.body.appendChild(o);
    Array.prototype.forEach.call(o.querySelectorAll('button.fp-pil'), function (b) {
      b.addEventListener('click', function () {
        var mod = b.getAttribute('data-mod');
        var hasil = P.daftarPush(mod);            // dipanggil serta-merta: kebenaran notifikasi dimohon pada tekanan ini
        P.setPemilik(mod); P.tukar(mod);
        if (P.pilihan && P.pilihan.el) P.pasang(P.pilihan.el, P.info, { gabungan: P.pilihan.gabungan, onTukar: P.pilihan.onTukar, sebelum: P.pilihan.sebelum });
        o.querySelector('div').innerHTML = '<h3>Peranti ini untuk ' + esc(mod === 'pasangan' ? P.info.pasangan.nama : P.info.induk.nama) + '</h3><p id="fp-tanya-st">Menyediakan notifikasi...</p><button type="button" class="fp-pil" id="fp-tanya-ok">Teruskan</button>';
        document.getElementById('fp-tanya-ok').onclick = function () { o.remove(); };
        hasil.then(function (r) {
          var t = document.getElementById('fp-tanya-st'); if (!t) return;
          t.textContent = r.ok ? 'Notifikasi dihidupkan untuk peranti ini.' : (r.sebab === 'tidak-dibenarkan' ? 'Notifikasi tidak dibenarkan. Anda boleh membenarkannya kemudian dalam tetapan pelayar/telefon.' : r.sebab === 'tidak-disokong' ? 'Peranti ini tidak menyokong notifikasi. Di iPhone, pasang app ke Skrin Utama dahulu.' : 'Notifikasi belum dapat disediakan (' + r.sebab + ').');
        });
      });
    });
    document.getElementById('fp-tanya-nanti').onclick = function () { try { sessionStorage.setItem(KUNCI_NANTI, '1'); } catch (e) {} o.remove(); };
  };

  P.dok = function (uid, mod) { return (mod || P.mod) === 'pasangan' ? uid + '_pasangan' : uid; };
  P.awalan = function (mod) { return (mod || P.mod) === 'pasangan' ? 'pasangan_' : ''; };
  P.orang = function (mod) { var m = mod || P.mod; return m === 'pasangan' && P.info && P.info.pasangan ? P.info.pasangan : (P.info ? P.info.induk : null); };

  P.pasang = function (tempat, info, opsyen) {
    opsyen = opsyen || {};
    suntikGaya();
    var el = typeof tempat === 'string' ? document.querySelector(tempat) : tempat;
    if (!el) return;
    P.pilihan = { el: el, gabungan: !!opsyen.gabungan, onTukar: opsyen.onTukar, sebelum: opsyen.sebelum };
    if (!info.ada) { el.style.display = 'none'; el.innerHTML = ''; return; }
    if (P.mod === 'gabungan' && !P.pilihan.gabungan) P.mod = 'induk';
    el.style.display = '';
    el.className = 'fp-peranan';
    var items = [['induk', info.induk.nama], ['pasangan', info.pasangan.nama]];
    if (P.pilihan.gabungan) items.push(['gabungan', 'Gabungan']);
    var ring = !!P.pemilik() && !P.pilihan.gabungan;      // peranti sudah dikenali: tunjuk nama sahaja, butang tukar disembunyikan
    el.className = 'fp-peranan' + (ring ? ' ringkas' : '');
    el.innerHTML = '<div class="fp-l">👤 Untuk</div>' + (ring ? '<div class="fp-ring"><b>' + esc(P.orang().nama) + '</b><a role="button" class="fp-tukar">Tukar</a></div>' : '') + '<div class="fp-b">' + items.map(function (it) {
      return '<button type="button" data-mod="' + it[0] + '" class="' + (it[0] === P.mod ? 'aktif' : '') + '">' + (it[0] === 'gabungan' ? '👨‍👩‍👧 ' : '') + esc(it[1]) + '</button>';
    }).join('') + '</div>';
    Array.prototype.forEach.call(el.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () { P.tukar(b.getAttribute('data-mod')); });
    });
    var t = el.querySelector('.fp-tukar');
    if (t) t.addEventListener('click', function () { el.classList.toggle('buka'); });
    if (P.perluPilih()) P.tanya();
  };

  P.tukar = function (mod) {
    if (!P.info || !P.info.ada) mod = 'induk';
    if (mod === 'gabungan' && !(P.pilihan && P.pilihan.gabungan)) mod = 'induk';
    if (mod === P.mod) return;
    // simpan dahulu data orang sebelumnya (masih guna id dokumen lama)
    if (P.pilihan && P.pilihan.sebelum) { try { P.pilihan.sebelum(); } catch (e) {} }
    P.mod = mod;
    try { (P.pemilik() ? sessionStorage : localStorage).setItem(KUNCI, mod); } catch (e) {}
    if (P.pilihan) {
      Array.prototype.forEach.call(P.pilihan.el.querySelectorAll('button'), function (b) { b.classList.toggle('aktif', b.getAttribute('data-mod') === mod); });
      var rn = P.pilihan.el.querySelector('.fp-ring b'); if (rn && P.orang()) rn.textContent = P.orang().nama;
      if (P.pilihan.onTukar) P.pilihan.onTukar(mod);
    }
  };

  w.Peranan = P;
})(window);
