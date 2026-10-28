/*!
 * fpapp.js - asas kongsi untuk app Famili Pintar yang menarik data myNasab
 * Dimuat sebagai skrip biasa selepas peranan.js dan autosave.js (../fpapp.js untuk folder app/):
 *   <script src="../peranan.js?v=2"></script><script src="../autosave.js?v=1"></script><script src="../fpapp.js?v=1"></script>
 *
 * FP.sedia({
 *   kunci:  'mylove',                 // nama simpanan (medan fp_<kunci> / fp_pasangan_<kunci> dalam mynasab_users/{uid})
 *   letak:  '#bekas',                 // elemen yang akan diletakkan kad log masuk + pemilih di bahagian atas (lalai: body)
 *   perOrang: true,                   // paparkan pemilih Induk/Pasangan dan simpan data berasingan untuk setiap orang
 *   gabungan: false,
 *   isi:    (FP, mod) => {},          // dipanggil setiap kali orang bertukar: isi lalai app daripada myNasab (umur, anak, dll.)
 *   ambil:  () => keadaan | null,     // keadaan app untuk disimpan (null = jangan simpan)
 *   pulih:  (simpanan | null, FP) => {}, // pulihkan keadaan app daripada simpanan
 *   selepasSimpan: (keadaan) => {},   // pilihan: dipanggil selepas simpanan berjaya
 *   onData: (FP) => {}                // dipanggil sekali selepas log masuk dan data myNasab dimuat
 * });
 *
 * Selepas log masuk:  FP.user, FP.db, FP.nod (nod myNasab), FP.orang(mod), FP.anak(), FP.ibuBapa(mod), FP.adikBeradik(), FP.baca(koleksi, id)
 */
(function (w) {
  var V = '10.8.1', B = 'https://www.gstatic.com/firebasejs/' + V + '/';
  var CFG = {
    apiKey: "AIzaSyA7SW4U--evGtfRyPz5Feh3mEN8MF92gTg",
    authDomain: "familipintar.firebaseapp.com",
    projectId: "familipintar",
    storageBucket: "familipintar.firebasestorage.app",
    appId: "1:277029764059:web:0a21bb2e01d868b1ed05fe"
  };
  var FP = { sudahSimpan: false, ada: false, user: null, db: null, fs: null, nod: [], opt: null, AS: null, info: null };

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  FP.umur = function (dob) {
    if (!dob) return 0;
    var l = new Date(dob), k = new Date();
    if (isNaN(l)) return 0;
    var u = k.getFullYear() - l.getFullYear(), m = k.getMonth() - l.getMonth();
    if (m < 0 || (m === 0 && k.getDate() < l.getDate())) u--;
    return u > 0 ? u : 0;
  };

  function gaya() {
    if (document.getElementById('fp-gaya')) return;
    var s = document.createElement('style');
    s.id = 'fp-gaya';
    s.textContent =
      '#fp-kad{box-sizing:border-box;max-width:56rem;margin:12px auto;padding:12px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;font-family:inherit;font-size:13px;color:#334155;box-shadow:0 1px 3px rgba(0,0,0,.05)}' +
      '#fp-kad form{display:grid;grid-template-columns:1fr 1fr auto;gap:8px}' +
      '#fp-kad input{padding:9px 10px;border:1px solid #cbd5e1;border-radius:9px;font-size:14px;min-width:0}' +
      '#fp-kad button.fp-log{background:#0d9488;color:#fff;border:none;border-radius:9px;padding:9px 14px;font-weight:800;cursor:pointer}' +
      '#fp-kad .fp-kecil{font-size:12px;color:#64748b;margin-top:6px}' +
      '#fp-kad .fp-peranan{margin:0 0 10px}' +
      '@media(max-width:560px){#fp-kad form{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  function kad() {
    var e = document.getElementById('fp-kad');
    if (e) return e;
    e = document.createElement('div');
    e.id = 'fp-kad';
    var t = FP.opt.letak ? document.querySelector(FP.opt.letak) : null;
    if (t) t.insertAdjacentElement('afterbegin', e); else document.body.insertAdjacentElement('afterbegin', e);
    return e;
  }

  FP.maklumat = function (html) { var e = document.getElementById('fp-info'); if (e) e.innerHTML = html || ''; };

  function paparLogMasuk(login) {
    var e = kad();
    e.innerHTML =
      '<form id="fp-log"><input name="e" type="email" required placeholder="E-mel myNasab" autocomplete="username">' +
      '<input name="p" type="password" required placeholder="Kata laluan" autocomplete="current-password">' +
      '<button class="fp-log">Log masuk</button></form>' +
      '<div class="fp-kecil">Log masuk untuk tarik maklumat keluarga daripada myNasab dan simpan automatik. Tanpa log masuk, anda masih boleh guna app ini.</div>';
    document.getElementById('fp-log').onsubmit = function (ev) {
      ev.preventDefault();
      login(ev.target.e.value, ev.target.p.value).catch(function () { alert('Log masuk gagal. Sila semak e-mel dan kata laluan.'); });
    };
  }

  function paparKad() {
    var e = kad();
    e.innerHTML = '<div id="fp-pilih" style="display:none"></div>' +
      '<div class="fp-kecil" style="margin-top:0">Log masuk sebagai <b>' + esc(FP.user.email || '') + '</b></div>' +
      '<div id="fp-info" class="fp-kecil"></div>' +
      '<div id="fp-status" class="fp-kecil" style="font-weight:600"></div>';
    if (FP.AS) FP.AS.segar();
  }

  // ---- data myNasab ----
  function rel(n) { return String(n.relationship || '').trim().toLowerCase(); }

  FP.orang = function (mod) {
    var m = mod || w.Peranan.mod, o = w.Peranan.orang(m) || { nama: '', jantina: '', dob: '' };
    return { nama: o.nama, jantina: o.jantina, dob: o.dob, umur: FP.umur(o.dob), pasangan: m === 'pasangan' ? 'induk' : 'pasangan' };
  };
  FP.adaPasangan = function () { return !!(FP.info && FP.info.ada); };
  FP.anak = function () {
    return FP.nod.filter(function (n) { return rel(n) === 'anak' && n.status !== 'meninggal'; })
      .sort(function (a, b) { return String(a.dob || '9999').localeCompare(String(b.dob || '9999')); })
      .map(function (n) { return { id: n.id, nama: n.name || '', jantina: n.gender || '', dob: n.dob || '', umur: FP.umur(n.dob) }; });
  };
  FP.ibuBapa = function (mod) {
    var m = mod || w.Peranan.mod, pas = m === 'pasangan';
    var ay = FP.nod.filter(function (n) { var r = rel(n); return pas ? /^(bapa|ayah) mertua$|^bapa mentua$/.test(r) : r === 'ayah'; })[0];
    var ib = FP.nod.filter(function (n) { var r = rel(n); return pas ? /^ibu (mertua|mentua)$/.test(r) : r === 'ibu'; })[0];
    var f = function (n) { return n ? { ada: true, hidup: n.status !== 'meninggal', nama: n.name } : { ada: false, hidup: null, nama: '' }; };
    return { ayah: f(ay), ibu: f(ib) };
  };
  FP.adikBeradik = function () {
    var a = FP.nod.filter(function (n) { return /^(abang|kakak|adik|adik-beradik)$/.test(rel(n)); });
    return {
      lelaki: a.filter(function (n) { return n.gender === 'L' || rel(n) === 'abang'; }).length,
      perempuan: a.filter(function (n) { return n.gender === 'P' || rel(n) === 'kakak'; }).length
    };
  };
  FP.baca = async function (koleksi, id) {
    try { var s = await FP.fs.getDoc(FP.fs.doc(FP.db, koleksi, id)); return s.exists() ? s.data() : null; }
    catch (e) { console.warn('FP.baca', koleksi, e.message); return null; }
  };

  // ---- simpanan per orang ----
  function medan() { return 'fp_' + (FP.opt.perOrang === false ? '' : w.Peranan.awalan()) + FP.opt.kunci; }
  async function muatSimpanan() {
    if (!FP.opt.kunci) return null;
    var d = await FP.baca('mynasab_users', FP.user.uid);
    return d && d[medan()] ? d[medan()] : null;
  }

  async function ganti() {
    var o = FP.opt;
    try { if (o.isi) await o.isi(FP, w.Peranan.mod); } catch (e) { console.error('FP isi', e); }
    var d = null;
    FP.sudahSimpan = false;
    if (o.kunci && o.pulih) {
      d = await muatSimpanan();
      try { await o.pulih(d, FP); } catch (e) { console.error('FP pulih', e); }
    }
    FP.sudahSimpan = !!d;
    if (FP.AS) { if (d) FP.AS.sedia(); else FP.AS.sedia(''); }
  }

  FP.sedia = async function (opt) {
    FP.opt = opt || {};
    gaya();
    if (FP.opt.ambil && w.AutoSimpan) {
      FP.AS = w.AutoSimpan.buat({
        el: function () { return document.getElementById('fp-status'); },
        boleh: function () { return !!FP.user; },
        mesejTunda: 'Simpan automatik bermula selepas anda mengisi.',
        ambil: FP.opt.ambil,
        simpan: async function (s) {
          var f = medan(), uid = FP.user.uid, d = {};
          d[f] = JSON.parse(JSON.stringify(s));
          await FP.fs.updateDoc(FP.fs.doc(FP.db, 'mynasab_users', uid), d);
          FP.sudahSimpan = true;
          if (FP.opt.selepasSimpan) { try { FP.opt.selepasSimpan(s); } catch (e) {} }
        }
      });
      FP.AS.sedia('');
      ['input', 'change', 'click'].forEach(function (ev) {
        document.addEventListener(ev, function (e) {
          if (e.target && e.target.closest && e.target.closest('#fp-kad')) return;
          if (FP.AS) FP.AS.ubah();
        }, true);
      });
    }
    paparLogMasuk(function () { return Promise.reject(); });
    var A, Au, Fs;
    try {
      var m = await Promise.all([import(B + 'firebase-app.js'), import(B + 'firebase-auth.js'), import(B + 'firebase-firestore.js')]);
      A = m[0]; Au = m[1]; Fs = m[2];
    } catch (e) { console.warn('FP: Firebase tidak dapat dimuat', e); return; }
    var app = A.initializeApp(CFG), auth = Au.getAuth(app);
    FP.db = Fs.getFirestore(app); FP.fs = Fs;
    paparLogMasuk(function (e, p) { return Au.signInWithEmailAndPassword(auth, e, p); });
    Au.onAuthStateChanged(auth, async function (u) {
      FP.user = u || null;
      if (!u) { FP.ada = false; FP.nod = []; paparLogMasuk(function (e, p) { return Au.signInWithEmailAndPassword(auth, e, p); }); if (FP.AS) FP.AS.sedia(''); return; }
      FP.ada = true;
      paparKad();
      FP.info = await w.Peranan.muat(FP.db, u.uid, { collection: Fs.collection, query: Fs.query, where: Fs.where, getDocs: Fs.getDocs });
      if (w.Peranan.mod === 'gabungan') w.Peranan.mod = 'induk';
      try {
        var s = await Fs.getDocs(Fs.query(Fs.collection(FP.db, 'mynasab_nodes'), Fs.where('owner_uid', '==', u.uid)));
        FP.nod = s.docs.map(function (d) { return Object.assign({}, d.data(), { id: d.id }); });
      } catch (e) { console.warn('FP: gagal muat nod', e); FP.nod = []; }
      if (FP.opt.onData) { try { await FP.opt.onData(FP); } catch (e) { console.error('FP onData', e); } }
      if (FP.opt.perOrang !== false) {
        w.Peranan.pasang('#fp-pilih', FP.info, {
          gabungan: !!FP.opt.gabungan,
          sebelum: function () { if (FP.AS) FP.AS.siram(); },
          onTukar: function () { ganti(); }
        });
      }
      await ganti();
    });
  };

  w.FP = FP;
})(window);
