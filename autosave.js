/*!
 * autosave.js - modul auto-save kongsi untuk aplikasi Famili Pintar
 * Dimuat sebagai skrip biasa:  <script src="autosave.js?v=1"></script>   (../autosave.js untuk folder app/)
 *
 * Guna:
 *   const AS = AutoSimpan.buat({
 *     ambil:  () => keadaanSemasa | null,        // null = belum cukup lengkap, jangan simpan
 *     simpan: async (keadaan) => { await setDoc(...) },
 *     boleh:  () => !!user,                      // pilihan: false = belum log masuk
 *     el:     'save-status' | () => elemen,      // pilihan: tempat paparan status
 *     onStatus: (keadaan, teks) => {},           // pilihan: ganti el (cth React)
 *     kelewatan: 2000                            // ms selepas perubahan terakhir
 *   });
 *   AS.sedia(asas)   // WAJIB dipanggil selepas data lama selesai dimuat. asas = keadaan yang sudah tersimpan
 *                    // (tiada argumen = anggap keadaan semasa sudah tersimpan; '' = tiada simpanan lagi)
 *   AS.ubah()        // panggil bila ada perubahan (selamat dipanggil banyak kali)
 *   AS.siram()       // simpan serta-merta jika ada perubahan belum disimpan
 */
(function (w) {
  function stabil(v) {
    if (v === undefined) return 'null';
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stabil).join(',') + ']';
    return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; })
      .map(function (k) { return JSON.stringify(k) + ':' + stabil(v[k]); }).join(',') + '}';
  }

  function buat(o) {
    var kelewatan = o.kelewatan == null ? 2000 : o.kelewatan;
    var sedia = false, masa = null, ulangMasa = null, berjalan = false, perluLagi = false;
    var terakhir = null;           // JSON keadaan yang terakhir disahkan tersimpan
    var generasi = 0;              // naik setiap kali sedia() dipanggil (cth bila user tukar rekod)
    var teksTerakhir = '', stateTerakhir = '';

    function paparan(state, teks) {
      stateTerakhir = state; teksTerakhir = teks;
      if (o.onStatus) { try { o.onStatus(state, teks); } catch (e) {} }
      var e = typeof o.el === 'function' ? o.el() : (typeof o.el === 'string' ? document.getElementById(o.el) : o.el);
      if (!e) return;
      e.textContent = teks;
      e.setAttribute('data-state', state);
      e.style.color = state === 'gagal' ? '#dc2626' : (state === 'tersimpan' ? '#059669' : '#64748b');
      e.style.fontWeight = '600';
    }
    function jam() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

    async function jalan() {
      clearTimeout(masa); masa = null;
      if (!sedia) return;
      if (o.boleh && !o.boleh()) { paparan('tunggu', 'Log masuk untuk simpan automatik.'); return; }
      if (berjalan) { perluLagi = true; return; }       // satu simpanan pada satu masa
      var keadaan = o.ambil();                           // dibaca serta-merta (selari)
      if (keadaan == null) { paparan('tunggu', o.mesejTunda || 'Simpan automatik bermula selepas maklumat mencukupi.'); return; }
      var j = stabil(keadaan);
      if (j === terakhir) { if (stateTerakhir === 'gagal' || stateTerakhir === 'simpan') paparan('tersimpan', '✓ Tersimpan'); return; }
      var gen = generasi;
      berjalan = true; paparan('simpan', 'Menyimpan…');
      try {
        await o.simpan(keadaan);
        if (gen === generasi) terakhir = j;   // abaikan jika rekod sudah ditukar semasa menyimpan
        paparan('tersimpan', '✓ Tersimpan automatik ' + jam());
      } catch (err) {
        console.error('[AutoSimpan]', err);
        paparan('gagal', '⚠️ Gagal menyimpan. Mencuba semula…');
        clearTimeout(ulangMasa);
        ulangMasa = setTimeout(function () { jalan(); }, 8000);
      }
      berjalan = false;
      if (perluLagi) { perluLagi = false; jalan(); }
    }

    var api = {
      sedia: function (asas) {
        terakhir = asas === undefined ? (function () { var k = o.ambil(); return k == null ? null : stabil(k); })()
                 : (asas === '' || asas === null ? null : (typeof asas === 'string' ? asas : stabil(asas)));
        sedia = true; generasi++;
        if (o.boleh && !o.boleh()) paparan('tunggu', 'Log masuk untuk simpan automatik.');
        else paparan('tunggu', o.mesejSedia || 'Simpan automatik aktif.');
      },
      ubah: function () {
        if (!sedia) return;
        clearTimeout(masa);
        masa = setTimeout(jalan, kelewatan);
      },
      siram: function () { if (masa) return jalan(); },
      segar: function () { if (teksTerakhir) paparan(stateTerakhir, teksTerakhir); },
      stabil: stabil
    };

    // simpan bila tab disembunyikan / ditutup
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') api.siram(); });
    w.addEventListener('pagehide', function () { api.siram(); });
    return api;
  }

  w.AutoSimpan = { buat: buat, stabil: stabil };
})(window);
