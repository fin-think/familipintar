/* pwa.js - manifest, service worker dan butang "Pasang App" untuk semua halaman Famili Pintar */
(function () {
  var d = document;
  if (!d.querySelector('link[rel="manifest"]')) {
    var l = d.createElement('link'); l.rel = 'manifest'; l.href = '/manifest.json'; d.head.appendChild(l);
  }
  if (!d.querySelector('meta[name="theme-color"]')) {
    var m = d.createElement('meta'); m.name = 'theme-color'; m.content = '#059669'; d.head.appendChild(m);
  }
  if (!d.querySelector('link[rel="apple-touch-icon"]')) {
    var a = d.createElement('link'); a.rel = 'apple-touch-icon'; a.href = '/icon-192.png'; d.head.appendChild(a);
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(function () {});
    });
  }

  var sudahPasang = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (sudahPasang) return;
  try { if (localStorage.getItem('fp_pwa_tutup') === '1') return; } catch (e) {}

  var tunda = null, bar = null;
  function papar(teks, butang, fn) {
    if (bar || !d.body) return;
    bar = d.createElement('div');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99998;max-width:420px;margin:0 auto;background:#0f172a;color:#fff;border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:10px;font:600 13px/1.35 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3)';
    bar.innerHTML = '<img src="/icon-192.png" alt="" style="width:36px;height:36px;border-radius:9px"><span style="flex:1"></span>' +
      (butang ? '<button style="background:#10b981;color:#fff;border:0;border-radius:9px;padding:8px 12px;font-weight:800;cursor:pointer"></button>' : '') +
      '<button aria-label="Tutup" style="background:none;border:0;color:#94a3b8;font-size:20px;cursor:pointer">&times;</button>';
    bar.querySelector('span').textContent = teks;
    var bt = bar.querySelectorAll('button');
    if (butang) { bt[0].textContent = butang; bt[0].onclick = function () { fn(); }; }
    bt[bt.length - 1].onclick = function () {
      try { localStorage.setItem('fp_pwa_tutup', '1'); } catch (e) {}
      bar.remove();
    };
    d.body.appendChild(bar);
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); tunda = e;
    var tunggu = function () { papar('Pasang Famili Pintar di skrin utama', 'Pasang', function () {
      tunda.prompt(); tunda.userChoice.finally(function () { if (bar) { bar.remove(); bar = null; } tunda = null; });
    }); };
    if (d.body) tunggu(); else d.addEventListener('DOMContentLoaded', tunggu);
  });
  window.addEventListener('appinstalled', function () { if (bar) bar.remove(); });

  // iOS Safari tiada beforeinstallprompt: tunjuk panduan ringkas
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  var safari = /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
  if (ios && safari) {
    window.addEventListener('load', function () {
      setTimeout(function () { papar('Untuk pasang: tekan butang Kongsi, kemudian "Tambah ke Skrin Utama"'); }, 2500);
    });
  }
})();
