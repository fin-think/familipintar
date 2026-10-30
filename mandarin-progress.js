/*! mandarin-progress.js - penjejak progres & skor Mandarin (skrip biasa; dimuat dalam app/mandarin*.0.html)
 *  Data: mandarin_progress/{uid}  ->  ahli[ahliId] = { nama, topik: { "<tahap>_<topik>": {buka, cuba, terbaik, jumlah, akhir, tarikh, sejarah:[{s,j,t}]} } }
 *  Ahli semasa dipilih di mandarin.html (localStorage fp_mandarin_ahli = {id,nama}). Semua ahli keluarga guna akaun yang sama.
 */
(function (w) {
  var V = '10.8.1', B = 'https://www.gstatic.com/firebasejs/' + V + '/';
  var CFG = { apiKey: "AIzaSyA7SW4U--evGtfRyPz5Feh3mEN8MF92gTg", authDomain: "familipintar.firebaseapp.com", projectId: "familipintar", storageBucket: "familipintar.firebasestorage.app", messagingSenderId: "277029764059", appId: "1:277029764059:web:0a21bb2e01d868b1ed05fe" };
  var fb = null;
  function tahap() { var m = location.pathname.match(/mandarin(\d)\.0/); return m ? m[1] : '1'; }
  function ahli() { try { var a = JSON.parse(localStorage.getItem('fp_mandarin_ahli')); if (a && a.id) return a; } catch (e) {} return { id: 'induk', nama: '' }; }
  function muat() {
    if (fb) return fb;
    fb = Promise.all([import(B + 'firebase-app.js'), import(B + 'firebase-auth.js'), import(B + 'firebase-firestore.js')]).then(function (m) {
      var app = m[0].getApps().length ? m[0].getApp() : m[0].initializeApp(CFG);
      var auth = m[1].getAuth(app), db = m[2].getFirestore(app);
      return new Promise(function (ok) { var u = m[1].onAuthStateChanged(auth, function (user) { u(); ok({ user: user, db: db, fs: m[2] }); }); });
    });
    return fb;
  }
  function toast(t) {
    var e = document.getElementById('mp-toast');
    if (!e) { e = document.createElement('div'); e.id = 'mp-toast'; e.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);background:#065f46;color:#fff;padding:10px 18px;border-radius:999px;font:700 13px system-ui;z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.25);transition:opacity .4s;opacity:0;pointer-events:none'; document.body.appendChild(e); }
    e.textContent = t; e.style.opacity = 1; clearTimeout(e._t); e._t = setTimeout(function () { e.style.opacity = 0; }, 2600);
  }
  function tulis(kunci, fn, mesej) {
    return muat().then(function (c) {
      if (!c.user) return;
      var a = ahli(), ref = c.fs.doc(c.db, 'mandarin_progress', c.user.uid);
      return c.fs.getDoc(ref).then(function (s) {
        var d = s.exists() ? s.data() : {}, ah = (d.ahli || {})[a.id] || {}, tp = (ah.topik || {})[kunci] || {};
        tp = fn(tp) || tp;
        var o = { ahli: {} }; o.ahli[a.id] = { nama: a.nama || ah.nama || '', topik: {} }; o.ahli[a.id].topik[kunci] = tp;
        o.owner_uid = c.user.uid; o.dikemas = Date.now();
        return c.fs.setDoc(ref, o, { merge: true });
      }).then(function () { if (mesej) toast(mesej.replace('{nama}', a.nama ? ' untuk ' + a.nama : '')); });
    }).catch(function (e) { console.warn('mandarin-progress:', e && e.message); });
  }
  w.MandarinProg = {
    buka: function (topik) { tulis(tahap() + '_' + topik, function (t) { if (!t.buka) t.buka = Date.now(); t.terakhir = Date.now(); return t; }); },
    skor: function (topik, s, j) {
      tulis(tahap() + '_' + topik, function (t) {
        t.cuba = (t.cuba || 0) + 1; t.akhir = s; t.jumlah = j; t.tarikh = Date.now();
        if (s >= (t.terbaik || 0)) t.terbaik = s;
        t.sejarah = (t.sejarah || []).concat([{ s: s, j: j, t: Date.now() }]).slice(-10);
        if (!t.buka) t.buka = Date.now();
        return t;
      }, '✅ Skor ' + s + '/' + j + ' disimpan{nama}');
    }
  };
})(window);
