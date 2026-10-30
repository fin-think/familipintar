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
      }).then(function () { return segar(); }).then(function () { if (mesej) toast(mesej.replace('{nama}', a.nama ? ' untuk ' + a.nama : '')); });
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

  // ---------- UI dalam halaman tahap: pilih ahli + progres ----------
  var AHLI = [{ id: 'induk', nama: 'Saya', peranan: 'Induk', emoji: '🧑' }], PROG = {}, AKTIF = null, SIAP = false;
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function n1(n) { return (n || '').trim().split(/\s+/).slice(0, 2).join(' '); }
  function simpanAktif() { try { localStorage.setItem('fp_mandarin_ahli', JSON.stringify({ id: AKTIF.id, nama: AKTIF.nama })); } catch (e) {} }
  function segar() {
    return muat().then(function (c) {
      if (!c.user) return;
      return c.fs.getDoc(c.fs.doc(c.db, 'mandarin_progress', c.user.uid)).then(function (s) { PROG = s.exists() ? (s.data().ahli || {}) : {}; });
    }).catch(function () {}).then(papar);
  }
  function muatAhli() {
    return muat().then(function (c) {
      if (!c.user) return;
      var fs = c.fs;
      return fs.getDocs(fs.query(fs.collection(c.db, 'mynasab_nodes'), fs.where('owner_uid', '==', c.user.uid))).then(function (s) {
        var nod = s.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }).filter(function (n) { return n.status !== 'meninggal'; });
        var root = nod.filter(function (n) { return n.is_root || n.relationship === 'Diri Sendiri'; })[0];
        var psg = nod.filter(function (n) { return n.relationship === 'Suami' || n.relationship === 'Isteri'; })[0];
        var anak = nod.filter(function (n) { return n.relationship === 'Anak'; }).sort(function (a, b) { return (a.dob || '9').localeCompare(b.dob || '9'); });
        var l = [{ id: 'induk', nama: n1(root && root.name) || 'Saya', peranan: 'Induk', emoji: '🧑' }];
        if (psg) l.push({ id: 'pasangan', nama: n1(psg.name) || 'Pasangan', peranan: psg.relationship, emoji: psg.relationship === 'Suami' ? '👨' : '👩' });
        anak.forEach(function (a) { l.push({ id: 'anak_' + a.id, nama: n1(a.name) || 'Anak', peranan: 'Anak', emoji: '🧒' }); });
        AHLI = l;
      });
    }).catch(function (e) { console.warn('muatAhli', e && e.message); }).then(function () {
      var s = null; try { s = JSON.parse(localStorage.getItem('fp_mandarin_ahli')); } catch (e) {}
      AKTIF = (s && AHLI.filter(function (a) { return a.id === s.id; })[0]) || AHLI[0];
      simpanAktif(); SIAP = true; return segar();
    });
  }
  function ringkas(id) {
    var tp = (PROG[id] && PROG[id].topik) || {}, t = tahap(), sel = 0, b = 0, j = 0, semua = 0;
    Object.keys(tp).forEach(function (k) { var x = tp[k]; if (x.cuba > 0) { semua++; if (k.split('_')[0] === t) { sel++; b += x.terbaik || 0; j += x.jumlah || 0; } } });
    return { sel: sel, pct: j ? Math.round(b / j * 100) : null, tp: tp };
  }
  function papar() {
    var el = document.getElementById('mp-panel'), grid = document.getElementById('topic-grid');
    if (!grid || !SIAP) return;
    if (!el) { el = document.createElement('div'); el.id = 'mp-panel'; el.style.cssText = 'background:#fff;border:2px solid #fde68a;border-radius:18px;padding:14px 16px;margin:0 0 18px;box-shadow:0 2px 8px rgba(0,0,0,.06)'; grid.parentNode.insertBefore(el, grid); }
    var jum = (typeof topics !== 'undefined' && topics.length) || 6, t = tahap();
    var chips = AHLI.map(function (a) { var on = a.id === AKTIF.id; return '<button type="button" data-id="' + esc(a.id) + '" style="padding:7px 14px;border-radius:999px;font:800 13px Nunito,system-ui;cursor:pointer;border:2px solid ' + (on ? '#e11d48' : '#e5e7eb') + ';background:' + (on ? '#e11d48' : '#f9fafb') + ';color:' + (on ? '#fff' : '#374151') + '">' + a.emoji + ' ' + esc(a.nama) + '</button>'; }).join(' ');
    var baris = AHLI.map(function (a) {
      var r = ringkas(a.id), p = Math.round(r.sel / jum * 100);
      return '<div style="display:flex;align-items:center;gap:10px;margin-top:8px;font:700 12px Nunito,system-ui;color:#4b5563"><span style="width:92px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + a.emoji + ' ' + esc(a.nama) + '</span><div style="flex:1;height:8px;background:#f1f5f9;border-radius:99px;overflow:hidden"><div style="height:100%;width:' + p + '%;background:#10b981"></div></div><span style="min-width:110px;text-align:right">' + r.sel + '/' + jum + ' topik' + (r.pct !== null ? ' · ' + r.pct + '%' : '') + '</span></div>';
    }).join('');
    el.innerHTML = '<div style="font:800 11px Nunito,system-ui;color:#9ca3af;letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px">👨‍👩‍👧 Siapa belajar hari ini?</div><div style="display:flex;flex-wrap:wrap;gap:8px">' + chips + '</div>' + baris + '<div style="font:600 11px Nunito,system-ui;color:#9ca3af;margin-top:8px">Skor ujian & kemajuan disimpan atas nama ' + esc(AKTIF.nama) + ' (nama dari myNasab).</div>';
    Array.prototype.forEach.call(el.querySelectorAll('button'), function (b) { b.onclick = function () { AKTIF = AHLI.filter(function (a) { return a.id === b.getAttribute('data-id'); })[0]; simpanAktif(); papar(); }; });
    // lencana skor pada kad topik
    var tp = ringkas(AKTIF.id).tp;
    Array.prototype.forEach.call(grid.children, function (k) {
      var m = (k.getAttribute('onclick') || '').match(/openLesson\('([^']+)'\)/); if (!m) return;
      var x = tp[t + '_' + m[1]], tag = k.querySelector('.mp-tag');
      if (!tag) { tag = document.createElement('div'); tag.className = 'mp-tag'; tag.style.cssText = 'margin-top:8px;font:800 11px Nunito,system-ui;padding:3px 10px;border-radius:99px'; k.appendChild(tag); }
      if (x && x.cuba) { tag.textContent = '✅ Terbaik ' + x.terbaik + '/' + x.jumlah + ' · ' + x.cuba + 'x cuba'; tag.style.background = '#d1fae5'; tag.style.color = '#047857'; }
      else { tag.textContent = x && x.buka ? 'Sudah dibuka · belum diuji' : 'Belum belajar'; tag.style.background = '#f3f4f6'; tag.style.color = '#9ca3af'; }
    });
  }
  w.MandarinProg.segar = segar;
  function mula() { muatAhli(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mula); else mula();
})(window);
