/* rm-input.js - paparan ribu berkoma (1,000 / 20,500.50) pada input wang (RM).
   Kod sedia ada tidak berubah: input.value sentiasa pulangkan nombor mentah ("20500.5"),
   manakala yang dipaparkan kepada pengguna ialah "20,500.5". */
(function () {
    var nativ = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    function mentah(s) {
        s = String(s == null ? '' : s).replace(/,/g, '').replace(/[^0-9.\-]/g, '');
        var neg = s.charAt(0) === '-';
        s = s.replace(/-/g, '');
        var i = s.indexOf('.');
        if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '');
        return (neg ? '-' : '') + s;
    }
    function paparan(s) {
        s = mentah(s);
        if (s === '' || s === '-') return s;
        var neg = s.charAt(0) === '-'; if (neg) s = s.slice(1);
        var p = s.split('.'), b = p[0].replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return (neg ? '-' : '') + b + (p.length > 1 ? '.' + p[1] : '');
    }
    function wang(el) {
        if (el.dataset.rm === '1') return false;
        if (el.dataset.rm === '0') return false;
        if (el.type !== 'number') return false;
        var sb = el.previousElementSibling;
        if (sb && sb.tagName === 'SPAN' && sb.textContent.trim() === 'RM') return true;
        var wrap = el.parentElement, lbl = wrap && wrap.querySelector('label');
        if (lbl && /\(RM/i.test(lbl.textContent)) return true;
        return false;
    }
    function pasang(el) {
        if (!wang(el)) return;
        var awal = el.getAttribute('value');
        el.type = 'text';
        el.setAttribute('inputmode', 'decimal');
        el.removeAttribute('step');
        el.dataset.rm = '1';
        Object.defineProperty(el, 'value', {
            configurable: true,
            get: function () { return mentah(nativ.get.call(this)); },
            set: function (v) { nativ.set.call(this, paparan(v)); }
        });
        nativ.set.call(el, paparan(awal != null ? awal : nativ.get.call(el)));
        el.addEventListener('input', function () {
            var cur = el.selectionStart, s = nativ.get.call(el), digit = 0;
            for (var i = 0; i < cur; i++) if (/[0-9.]/.test(s.charAt(i))) digit++;
            var baru = paparan(s);
            nativ.set.call(el, baru);
            var pos = 0, n = 0;
            while (pos < baru.length && n < digit) { if (/[0-9.]/.test(baru.charAt(pos))) n++; pos++; }
            try { el.setSelectionRange(pos, pos); } catch (e) {}
        }, true);
    }
    function imbas(root) {
        (root.querySelectorAll ? root.querySelectorAll('input[type="number"]') : []).forEach(pasang);
    }
    function mula() {
        imbas(document);
        new MutationObserver(function (ms) {
            ms.forEach(function (m) {
                m.addedNodes.forEach(function (n) {
                    if (n.nodeType !== 1) return;
                    if (n.tagName === 'INPUT') pasang(n); else imbas(n);
                });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mula); else mula();
})();
