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
 *
 * Data Induk TIDAK berubah (kekal pada uid / medan asal). Data pasangan disimpan berasingan.
 */
(function (w) {
  var KUNCI = 'fp_pengguna';
  var P = { mod: 'induk', info: null, pilihan: null };

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
      '.fp-peranan button.aktif{background:#0d9488;border-color:#0d9488;color:#fff}';
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
    return fs.getDocs(fs.query(fs.collection(db, 'mynasab_nodes'), fs.where('owner_uid', '==', uid))).then(function (snap) {
      var r = cariNod(snap);
      var info = { ada: !!r.pasangan, induk: r.induk || { nama: 'Induk', jantina: '', dob: '' }, pasangan: r.pasangan };
      if (!info.induk.nama) info.induk.nama = 'Induk';
      if (info.pasangan && !info.pasangan.nama) info.pasangan.nama = 'Pasangan';
      P.info = info;
      var simpan = null; try { simpan = localStorage.getItem(KUNCI); } catch (e) {}
      P.mod = (simpan === 'pasangan' || simpan === 'gabungan') && info.ada ? simpan : 'induk';
      return info;
    }).catch(function (e) { console.error('Peranan.muat:', e); P.info = { ada: false, induk: { nama: 'Induk', jantina: '', dob: '' }, pasangan: null }; P.mod = 'induk'; return P.info; });
  };

  P.dok = function (uid, mod) { return (mod || P.mod) === 'pasangan' ? uid + '_pasangan' : uid; };
  P.awalan = function (mod) { return (mod || P.mod) === 'pasangan' ? 'pasangan_' : ''; };
  P.orang = function (mod) { var m = mod || P.mod; return m === 'pasangan' && P.info && P.info.pasangan ? P.info.pasangan : (P.info ? P.info.induk : null); };

  P.pasang = function (tempat, info, opsyen) {
    opsyen = opsyen || {};
    suntikGaya();
    var el = typeof tempat === 'string' ? document.querySelector(tempat) : tempat;
    if (!el) return;
    P.pilihan = { el: el, gabungan: !!opsyen.gabungan, onTukar: opsyen.onTukar };
    if (!info.ada) { el.style.display = 'none'; el.innerHTML = ''; return; }
    if (P.mod === 'gabungan' && !P.pilihan.gabungan) P.mod = 'induk';
    el.style.display = '';
    el.className = 'fp-peranan';
    var items = [['induk', info.induk.nama], ['pasangan', info.pasangan.nama]];
    if (P.pilihan.gabungan) items.push(['gabungan', 'Gabungan']);
    el.innerHTML = '<div class="fp-l">👤 Untuk</div><div class="fp-b">' + items.map(function (it) {
      return '<button type="button" data-mod="' + it[0] + '" class="' + (it[0] === P.mod ? 'aktif' : '') + '">' + (it[0] === 'gabungan' ? '👨‍👩‍👧 ' : '') + esc(it[1]) + '</button>';
    }).join('') + '</div>';
    Array.prototype.forEach.call(el.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () { P.tukar(b.getAttribute('data-mod')); });
    });
  };

  P.tukar = function (mod) {
    if (!P.info || !P.info.ada) mod = 'induk';
    if (mod === 'gabungan' && !(P.pilihan && P.pilihan.gabungan)) mod = 'induk';
    if (mod === P.mod) return;
    P.mod = mod;
    try { localStorage.setItem(KUNCI, mod); } catch (e) {}
    if (P.pilihan) {
      Array.prototype.forEach.call(P.pilihan.el.querySelectorAll('button'), function (b) { b.classList.toggle('aktif', b.getAttribute('data-mod') === mod); });
      if (P.pilihan.onTukar) P.pilihan.onTukar(mod);
    }
  };

  w.Peranan = P;
})(window);
