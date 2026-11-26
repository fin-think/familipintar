/* kembali-app.js: butang "← Kembali" seragam untuk alat dalam folder app/ yang tiada butang keluar sendiri.
 * Dimuat dengan: <link rel="stylesheet" href="../kembali.css"><script src="../kembali-app.js" defer></script>
 * Tingkah laku: tab dibuka oleh myJurnal/myKids (window.open) -> tutup tab; datang dari halaman Famili Pintar -> undur;
 * selain itu -> buka myJurnal. Butang tidak ditambah jika halaman sudah ada butang Kembali sendiri.
 */
(function () {
  function adaSendiri() {
    if (document.querySelector('.fp-kembali, #kembali, [data-fp-kembali]')) return true;
    var el = document.querySelectorAll('a, button');
    for (var i = 0; i < el.length; i++) {
      var t = el[i].textContent || '', h = el[i].innerHTML || '';
      if (/kembali|返回/i.test(t) && /arrow-left|chevron-left|←|&larr;/i.test(h) && !/menu|keputusan|soalan/i.test(t)) return true;
    }
    return false;
  }
  function balik() {
    try { if (window.opener && !window.opener.closed) { window.close(); return; } } catch (e) {}
    var r = document.referrer || '';
    try { if (r && new URL(r).origin === location.origin && history.length > 1) { history.back(); return; } } catch (e) {}
    location.href = '../myjurnal.html';
  }
  function pasang() {
    if (adaSendiri()) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'fp-kembali'; b.setAttribute('data-fp-kembali', '1');
    b.innerHTML = '<span aria-hidden="true">←</span> Kembali';
    b.style.cssText = 'position:fixed;left:12px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:9998;box-shadow:0 4px 14px rgba(15,23,42,.18)';
    b.onclick = balik;
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(pasang, 300); });
  else setTimeout(pasang, 300);
})();
