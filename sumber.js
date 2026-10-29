/* Sumber.js - tangkap sumber pendaftaran (first-touch). Dimuat oleh halaman awam. */
(function () {
  var K = 'fp_sumber';
  function baca() { try { return JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { return null; } }
  function simpan(o) { try { localStorage.setItem(K, JSON.stringify(o)); } catch (e) {} }
  var p = new URLSearchParams(location.search);
  var ref = (p.get('ref') || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20);
  var utm = { s: p.get('utm_source'), m: p.get('utm_medium'), c: p.get('utm_campaign') };
  var ada = baca();
  var jemput = p.get('jemput') || p.get('kod');
  // first-touch: simpan sekali sahaja, kecuali ref baharu muncul dan belum ada ref
  if (!ada) {
    var rujuk = ''; try { rujuk = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
    simpan({ ref: ref || '', utm_source: utm.s || '', utm_medium: utm.m || '', utm_campaign: utm.c || '',
      halaman: location.pathname, rujuk: rujuk, masa: Date.now() });
  } else if (ref && !ada.ref) { ada.ref = ref; simpan(ada); }

  // Hantar ref ke pautan familipintar.com / mynasab (BUKAN pautan jemputan adik-beradik)
  document.addEventListener('DOMContentLoaded', function () {
    var s = baca(); if (!s || !s.ref) return;
    document.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (!h || /[?&](jemput|kod)=/.test(h) || /^(mailto|tel|#|javascript|https?:\/\/wa\.me)/.test(h)) return;
      var u; try { u = new URL(h, location.href); } catch (e) { return; }
      if (!/(^|\.)familipintar\.com$/.test(u.hostname) && u.hostname !== location.hostname) return;
      if (u.searchParams.has('ref')) return;
      u.searchParams.set('ref', s.ref);
      a.setAttribute('href', u.href);
    });
  });

  // Dipanggil semasa pendaftaran. jemputan=true => TIADA komisen (referred_by tidak diset).
  window.FPSumber = {
    baca: baca,
    untukDaftar: function (jemputan) {
      var s = baca() || {};
      var o = { ref: jemputan ? '' : (s.ref || ''), utm_source: s.utm_source || '', utm_medium: s.utm_medium || '',
        utm_campaign: s.utm_campaign || '', halaman: s.halaman || '', rujuk: s.rujuk || '',
        jenis: jemputan ? 'jemputan' : (s.ref ? 'affiliate' : (s.utm_source ? 'kempen' : 'langsung')) };
      return o;
    },
    // cuba padankan kod ref -> uid ejen (diam jika peraturan Firestore tidak membenarkan)
    selesaikanRef: async function (db, fs, ref, uidSendiri) {
      if (!ref) return null;
      try {
        var q = fs.query(fs.collection(db, 'mynasab_users'), fs.where('referral_code', '==', ref));
        var sn = await fs.getDocs(q);
        var uid = null; sn.forEach(function (d) { uid = d.id; });
        return uid && uid !== uidSendiri ? uid : null;
      } catch (e) { return null; }
    },
    bersih: function () { try { localStorage.removeItem(K); } catch (e) {} }
  };
})();
