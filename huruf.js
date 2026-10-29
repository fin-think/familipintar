/* huruf.js - jika pengguna menaip SEMUA HURUF BESAR (caps lock), tukar kepada huruf yang betul.
   Nama/teks pendek -> Huruf Besar Setiap Perkataan. Teks panjang (textarea) -> huruf besar di awal ayat.
   Tidak menyentuh kata laluan, emel, URL, nombor, kod, atau medan bertanda data-kekal-huruf. */
(function () {
  var LEWAT = /(pass|kata.?laluan|e-?mail|emel|url|kod|code|ref|cari|search|token)/i;
  function perlu(el) {
    if (!el || el.disabled || el.readOnly || el.hasAttribute('data-kekal-huruf')) return false;
    var tag = el.tagName;
    if (tag === 'TEXTAREA') return true;
    if (tag !== 'INPUT') return false;
    var t = (el.type || 'text').toLowerCase();
    if (t !== 'text' && t !== 'search') return false;
    if (LEWAT.test((el.id || '') + ' ' + (el.name || '') + ' ' + (el.getAttribute('autocomplete') || '') + ' ' + (el.type === 'search' ? 'search' : ''))) return false;
    return true;
  }
  function tajuk(s) {
    return s.toLowerCase().replace(/(^|[\s\-\/\.\("])([a-z\u00e0-\u00ff])/g, function (m, p, c) { return p + c.toUpperCase(); });
  }
  function ayat(s) {
    return s.toLowerCase().replace(/(^\s*|[.!?]\s+|\n\s*)([a-z])/g, function (m, p, c) { return p + c.toUpperCase(); });
  }
  function semak(el) {
    if (!perlu(el)) return;
    var v = el.value;
    if (!v || v.length < 3 || !/[A-Z]/.test(v) || /[a-z]/.test(v)) return;
    var b = el.tagName === 'TEXTAREA' ? ayat(v) : tajuk(v);
    if (b !== v) {
      el.value = b;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  document.addEventListener('focusout', function (e) { semak(e.target); }, true);
  document.addEventListener('change', function (e) { semak(e.target); }, true);
  // Enter pada input menghantar borang sebelum 'blur': betulkan dahulu
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter') semak(e.target); }, true);
  window.FPHuruf = { tajuk: tajuk, ayat: ayat, semak: semak };
})();
