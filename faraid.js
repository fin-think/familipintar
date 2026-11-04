/* =====================================================================
 * faraid.js — Enjin Faraid Famili Pintar (mazhab Syafi'i)
 * Satu enjin dikongsi oleh myWARIS dan myTADBIR supaya jawapan sentiasa sama.
 *
 * Kaedah diselaraskan dengan rujukan K-Faraid MAIS (efaraid.mais.gov.my):
 *   - Waris Utama, Waris Ganti (datuk, nenek, cucu dari anak lelaki) dan Waris Kedua (saudara, anak saudara,
 *     bapa saudara, sepupu) beserta pendindingan (hajb)
 *   - 'Aul bila jumlah fardu melebihi harta
 *   - Baki yang tiada asabah diserahkan kepada Baitulmal (tiada radd)
 *   - Kes khas: Umariyyatain (Gharrawain), Musytarakah, Akdariyyah, datuk bersama saudara (kaedah Zaid bin Thabit)
 * Keputusan ialah ANGGARAN untuk pendidikan sahaja. Pembahagian sebenar tertakluk kepada
 * Sijil/Perintah Faraid Mahkamah Syariah.
 *
 * Guna:  Faraid.kira({ jantina: 'L', isteri: 1, ibu: 1, AL: 2, AP: 1, ... })
 * Kod waris (bilangan):
 *   suami, isteri, bapa, ibu, datuk (bapa kepada bapa), nenekBapa (ibu kepada bapa), nenekIbu (ibu kepada ibu),
 *   AL, AP (anak), CL, CP (anak kepada anak lelaki),
 *   SIBL, SIBP (saudara seibu sebapa), SBL, SBP (saudara sebapa), SIL, SIP (saudara seibu),
 *   ASIBL, ASBL (anak lelaki kepada saudara lelaki seibu sebapa / sebapa),
 *   BSIBL, BSBL (bapa saudara: saudara lelaki seibu sebapa / sebapa kepada bapa),
 *   SPSIBL, SPSBL (sepupu: anak lelaki kepada bapa saudara tersebut)
 * ===================================================================== */
(function (root) {
  'use strict';

  // ---------- pecahan ----------
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function P(n, d) { d = d || 1; if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); return { n: n / g, d: d / g }; }
  var SIFAR = P(0), SATU = P(1);
  function tambah(a, b) { return P(a.n * b.d + b.n * a.d, a.d * b.d); }
  function tolak(a, b) { return P(a.n * b.d - b.n * a.d, a.d * b.d); }
  function darab(a, b) { return P(a.n * b.n, a.d * b.d); }
  function bahagi(a, b) { return P(a.n * b.d, a.d * b.n); }
  function banding(a, b) { return a.n * b.d - b.n * a.d; }
  function maks(arr) { return arr.reduce(function (m, x) { return banding(x, m) > 0 ? x : m; }); }
  function min2(a, b) { return banding(a, b) < 0 ? a : b; }
  function jumlah(arr) { return arr.reduce(function (s, x) { return tambah(s, x); }, SIFAR); }
  function lcm(a, b) { return a / gcd(a, b) * b; }

  var NAMA = {
    suami: 'Suami', isteri: 'Isteri', bapa: 'Bapa', ibu: 'Ibu', datuk: 'Datuk (bapa kepada bapa)',
    nenekBapa: 'Nenek (ibu kepada bapa)', nenekIbu: 'Nenek (ibu kepada ibu)', nenek: 'Nenek',
    AL: 'Anak Lelaki', AP: 'Anak Perempuan', CL: 'Cucu Lelaki (dari anak lelaki)', CP: 'Cucu Perempuan (dari anak lelaki)',
    SIBL: 'Saudara Lelaki Seibu Sebapa', SIBP: 'Saudara Perempuan Seibu Sebapa',
    SBL: 'Saudara Lelaki Sebapa', SBP: 'Saudara Perempuan Sebapa',
    SIL: 'Saudara Lelaki Seibu', SIP: 'Saudara Perempuan Seibu', SI: 'Saudara Seibu',
    ASIBL: 'Anak Saudara Lelaki (dari saudara lelaki seibu sebapa)', ASBL: 'Anak Saudara Lelaki (dari saudara lelaki sebapa)',
    BSIBL: 'Bapa Saudara (seibu sebapa dengan bapa)', BSBL: 'Bapa Saudara (sebapa dengan bapa)',
    SPSIBL: 'Sepupu Lelaki (anak bapa saudara seibu sebapa)', SPSBL: 'Sepupu Lelaki (anak bapa saudara sebapa)',
    baitulmal: 'Baitulmal'
  };
  var KOD = ['suami', 'isteri', 'bapa', 'ibu', 'datuk', 'nenekBapa', 'nenekIbu', 'AL', 'AP', 'CL', 'CP',
    'SIBL', 'SIBP', 'SBL', 'SBP', 'SIL', 'SIP', 'ASIBL', 'ASBL', 'BSIBL', 'BSBL', 'SPSIBL', 'SPSBL'];
  var TUNGGAL = { suami: 1, bapa: 1, ibu: 1, datuk: 1, nenekBapa: 1, nenekIbu: 1 };

  function normal(inp) {
    var c = {}; inp = inp || {};
    KOD.forEach(function (k) { var v = Math.max(0, Math.floor(Number(inp[k]) || 0)); c[k] = TUNGGAL[k] ? Math.min(1, v) : v; });
    c.isteri = Math.min(4, c.isteri);
    c.jantina = inp.jantina === 'P' ? 'P' : 'L';
    if (c.jantina === 'L') c.suami = 0; else c.isteri = 0;
    return c;
  }

  function kira(inp) {
    var c = normal(inp);
    var fardu = [];        // { kod, bil, frac, jenis }
    var asabah = [];       // { kod, bil, frac, jenis }
    var dinding = [];      // { kod, bil, sebab }
    var nota = [];
    var kes = '';
    function dinding_(kod, sebab) { if (c[kod] > 0) dinding.push({ kod: kod, nama: NAMA[kod], bil: c[kod], sebab: sebab }); }
    function f(kod, bil, frac, jenis) { fardu.push({ kod: kod, bil: bil, frac: frac, jenis: jenis || 'Fardu' }); }
    function a(kod, bil, frac, jenis) { if (bil > 0 && frac.n > 0) asabah.push({ kod: kod, bil: bil, frac: frac, jenis: jenis || 'Asabah' }); }
    // Bahagi baki 2:1 (lelaki:perempuan)
    function duaSatu(kodL, kodP, baki, jenis) {
      var bahagian = 2 * c[kodL] + c[kodP]; if (!bahagian || baki.n <= 0) return;
      a(kodL, c[kodL], darab(baki, P(2 * c[kodL], bahagian)), jenis);
      a(kodP, c[kodP], darab(baki, P(c[kodP], bahagian)), jenis);
    }

    var adaAnak = c.AL + c.AP > 0;
    var furu = adaAnak || c.CL + c.CP > 0;                    // keturunan yang mewarisi
    var furuL = c.AL + c.CL > 0;                              // keturunan lelaki
    var furuP = c.AP > 0 || (c.AL === 0 && c.CP > 0);         // keturunan perempuan yang tidak terdinding
    var bilSaudara = c.SIBL + c.SIBP + c.SBL + c.SBP + c.SIL + c.SIP;
    var datukE = c.datuk > 0 && !c.bapa;
    var blokSaudara = furuL || c.bapa > 0;                    // saudara seibu sebapa / sebapa terdinding
    var datukSaudara = datukE && !blokSaudara && (c.SIBL + c.SIBP + c.SBL + c.SBP) > 0;

    // ---------- pendindingan ----------
    if (c.bapa) dinding_('datuk', 'Terdinding oleh Bapa');
    if (c.ibu) { dinding_('nenekIbu', 'Terdinding oleh Ibu'); dinding_('nenekBapa', 'Terdinding oleh Ibu'); }
    else if (c.bapa) dinding_('nenekBapa', 'Terdinding oleh Bapa');
    if (c.AL) { dinding_('CL', 'Terdinding oleh Anak Lelaki'); dinding_('CP', 'Terdinding oleh Anak Lelaki'); }
    else if (c.AP >= 2 && c.CL === 0) dinding_('CP', 'Terdinding: 2/3 sudah diambil oleh Anak Perempuan');
    var sebabSaudara = c.AL ? 'Anak Lelaki' : (c.CL ? 'Cucu Lelaki' : 'Bapa');
    if (blokSaudara) ['SIBL', 'SIBP', 'SBL', 'SBP'].forEach(function (k) { dinding_(k, 'Terdinding oleh ' + sebabSaudara); });
    var blokSeibu = furu || c.bapa || datukE;
    if (blokSeibu) ['SIL', 'SIP'].forEach(function (k) { dinding_(k, 'Terdinding oleh ' + (furu ? 'keturunan si mati' : (c.bapa ? 'Bapa' : 'Datuk'))); });

    // ---------- fardu ----------
    var pasangan = SIFAR;
    if (c.suami) { pasangan = furu ? P(1, 4) : P(1, 2); f('suami', 1, pasangan); }
    if (c.isteri) { pasangan = furu ? P(1, 8) : P(1, 4); f('isteri', c.isteri, pasangan, 'Fardu' + (c.isteri > 1 ? ' (dikongsi)' : '')); }

    if (c.ibu) {
      var umariyyatain = c.bapa && !furu && bilSaudara < 2 && (c.suami || c.isteri);
      if (umariyyatain) { f('ibu', 1, darab(tolak(SATU, pasangan), P(1, 3)), 'Fardu (1/3 baki, Umariyyatain)'); kes = 'Umariyyatain'; }
      else f('ibu', 1, (furu || bilSaudara >= 2) ? P(1, 6) : P(1, 3));
    }
    var bilNenek = (!c.ibu && c.nenekIbu ? 1 : 0) + (!c.ibu && !c.bapa && c.nenekBapa ? 1 : 0);
    if (bilNenek) {
      if (!c.ibu && c.nenekIbu) f('nenekIbu', 1, P(1, 6 * bilNenek), bilNenek > 1 ? 'Fardu (1/6 dikongsi)' : 'Fardu');
      if (!c.ibu && !c.bapa && c.nenekBapa) f('nenekBapa', 1, P(1, 6 * bilNenek), bilNenek > 1 ? 'Fardu (1/6 dikongsi)' : 'Fardu');
    }
    if (c.bapa && furu) f('bapa', 1, P(1, 6));
    if (datukE && !datukSaudara && furu) f('datuk', 1, P(1, 6));

    if (c.AL === 0 && c.AP) f('AP', c.AP, c.AP === 1 ? P(1, 2) : P(2, 3));
    if (c.AL === 0 && c.CL === 0 && c.CP && c.AP < 2) {
      if (c.AP === 0) f('CP', c.CP, c.CP === 1 ? P(1, 2) : P(2, 3));
      else f('CP', c.CP, P(1, 6), 'Fardu (1/6 pelengkap 2/3)');
    }

    var SIBPfardu = false;
    if (!blokSaudara && !datukSaudara && c.SIBL === 0 && c.SIBP && !furuP) { f('SIBP', c.SIBP, c.SIBP === 1 ? P(1, 2) : P(2, 3)); SIBPfardu = true; }
    var SIBPasabahGhair = !blokSaudara && !datukSaudara && c.SIBL === 0 && c.SIBP > 0 && furuP;
    // Saudara sebapa
    var blokSebapa = blokSaudara || c.SIBL > 0 || SIBPasabahGhair;
    if (!blokSaudara && !datukSaudara) {
      if (c.SIBL > 0) { dinding_('SBL', 'Terdinding oleh Saudara Lelaki Seibu Sebapa'); dinding_('SBP', 'Terdinding oleh Saudara Lelaki Seibu Sebapa'); }
      else if (SIBPasabahGhair) { dinding_('SBL', 'Terdinding oleh Saudara Perempuan Seibu Sebapa (asabah ma\'al ghair)'); dinding_('SBP', 'Terdinding oleh Saudara Perempuan Seibu Sebapa (asabah ma\'al ghair)'); }
    }
    if (!blokSebapa && !datukSaudara && c.SBL === 0 && c.SBP && !furuP) {
      if (c.SIBP === 0) f('SBP', c.SBP, c.SBP === 1 ? P(1, 2) : P(2, 3));
      else if (c.SIBP === 1) f('SBP', c.SBP, P(1, 6), 'Fardu (1/6 pelengkap 2/3)');
      else dinding_('SBP', 'Terdinding: 2/3 sudah diambil oleh Saudara Perempuan Seibu Sebapa');
    }
    var bilSeibu = c.SIL + c.SIP;
    if (!blokSeibu && bilSeibu) {
      var fSeibu = bilSeibu === 1 ? P(1, 6) : P(1, 3);
      if (c.SIL) f('SIL', c.SIL, darab(fSeibu, P(c.SIL, bilSeibu)), 'Fardu' + (bilSeibu > 1 ? ' (1/3 dikongsi sama rata)' : ''));
      if (c.SIP) f('SIP', c.SIP, darab(fSeibu, P(c.SIP, bilSeibu)), 'Fardu' + (bilSeibu > 1 ? ' (1/3 dikongsi sama rata)' : ''));
    }

    var F = jumlah(fardu.map(function (x) { return x.frac; }));
    var baki = tolak(SATU, F);
    var baitulmal = SIFAR;

    // ---------- Akdariyyah: suami + ibu + datuk + seorang saudara perempuan (seibu sebapa / sebapa) ----------
    var seorangSdrP = (c.SIBP + c.SBP === 1) && c.SIBL === 0 && c.SBL === 0;
    if (datukSaudara && seorangSdrP && c.suami && c.ibu && !furu && bilNenek === 0 && bilSeibu === 0) {
      var kodP = c.SIBP ? 'SIBP' : 'SBP';
      fardu = [];
      f('suami', 1, P(9, 27), 'Fardu (Akdariyyah)');
      f('ibu', 1, P(6, 27), 'Fardu (Akdariyyah)');
      f('datuk', 1, P(8, 27), 'Akdariyyah');
      f(kodP, 1, P(4, 27), 'Akdariyyah');
      kes = 'Akdariyyah';
      return hasil(c, fardu, [], dinding, SIFAR, true, kes, nota);
    }

    // ---------- datuk bersama saudara (kaedah Zaid bin Thabit) ----------
    if (datukSaudara) {
      kes = 'Datuk bersama saudara';
      var ada16 = P(1, 6);
      if (banding(baki, ada16) <= 0) {
        f('datuk', 1, ada16, 'Fardu 1/6');
        ['SIBL', 'SIBP', 'SBL', 'SBP'].forEach(function (k) { dinding_(k, 'Tiada baki selepas bahagian Datuk'); });
      } else {
        var kepala = 2 + 2 * (c.SIBL + c.SBL) + c.SIBP + c.SBP;
        var muq = darab(baki, P(2, kepala));
        var pilihan = F.n === 0 ? [muq, P(1, 3)] : [muq, darab(baki, P(1, 3)), ada16];
        var bDatuk = maks(pilihan);
        var jenisD = banding(bDatuk, muq) === 0 ? 'Muqasamah' : (F.n === 0 || banding(bDatuk, darab(baki, P(1, 3))) === 0 ? '1/3' + (F.n ? ' baki' : '') : 'Fardu 1/6');
        a('datuk', 1, bDatuk, jenisD);
        var S = tolak(baki, bDatuk);
        if (c.SIBL > 0) {
          duaSatu('SIBL', 'SIBP', S, 'Asabah (bersama Datuk)');
          dinding_('SBL', 'Terdinding oleh Saudara Lelaki Seibu Sebapa (dikira dalam muqasamah)');
          dinding_('SBP', 'Terdinding oleh Saudara Lelaki Seibu Sebapa (dikira dalam muqasamah)');
        } else if (c.SIBP > 0 && c.SBL + c.SBP > 0) {
          var had = c.SIBP === 1 ? P(1, 2) : P(2, 3);
          var bSIBP = min2(S, had);
          a('SIBP', c.SIBP, bSIBP, 'Bersama Datuk (sehingga had fardu)');
          var lebih = tolak(S, bSIBP);
          if (lebih.n > 0) duaSatu('SBL', 'SBP', lebih, 'Asabah (bersama Datuk)');
          else { dinding_('SBL', 'Tiada baki selepas Saudara Perempuan Seibu Sebapa'); dinding_('SBP', 'Tiada baki selepas Saudara Perempuan Seibu Sebapa'); }
        } else if (c.SIBP > 0) {
          a('SIBP', c.SIBP, S, 'Bersama Datuk (muqasamah)');
        } else {
          duaSatu('SBL', 'SBP', S, 'Asabah (bersama Datuk)');
        }
      }
      ['ASIBL', 'ASBL', 'BSIBL', 'BSBL', 'SPSIBL', 'SPSBL'].forEach(function (k) { dinding_(k, 'Terdinding oleh Datuk'); });
      return selesai();
    }

    // ---------- asabah ----------
    var penerimaBaki = '';
    if (banding(baki, SIFAR) > 0) {
      if (c.AL) { duaSatu('AL', 'AP', baki, 'Asabah'); penerimaBaki = 'AL'; }
      else if (c.CL) { duaSatu('CL', 'CP', baki, 'Asabah'); penerimaBaki = 'CL'; }
      else if (c.bapa) { a('bapa', 1, baki, furu ? 'Asabah' : 'Asabah'); penerimaBaki = 'bapa'; }
      else if (datukE) { a('datuk', 1, baki, 'Asabah'); penerimaBaki = 'datuk'; }
      else if (!blokSaudara && c.SIBL) { duaSatu('SIBL', 'SIBP', baki, 'Asabah'); penerimaBaki = 'SIBL'; }
      else if (SIBPasabahGhair) { a('SIBP', c.SIBP, baki, 'Asabah ma\'al ghair (bersama anak perempuan)'); penerimaBaki = 'SIBP'; }
      else if (!blokSebapa && c.SBL) { duaSatu('SBL', 'SBP', baki, 'Asabah'); penerimaBaki = 'SBL'; }
      else if (!blokSebapa && c.SBP && furuP) { a('SBP', c.SBP, baki, 'Asabah ma\'al ghair (bersama anak perempuan)'); penerimaBaki = 'SBP'; }
      else {
        var lain = ['ASIBL', 'ASBL', 'BSIBL', 'BSBL', 'SPSIBL', 'SPSBL'].filter(function (k) { return c[k] > 0; })[0];
        if (lain) { a(lain, c[lain], baki, 'Asabah'); penerimaBaki = lain; }
        else { baitulmal = baki; }
      }
    }
    // Asabah lebih jauh terdinding oleh asabah yang menerima baki (atau tiada baki langsung)
    var JAUH = ['ASIBL', 'ASBL', 'BSIBL', 'BSBL', 'SPSIBL', 'SPSBL'];
    var iTerima = JAUH.indexOf(penerimaBaki);
    JAUH.forEach(function (k, i) {
      if (!c[k] || k === penerimaBaki) return;
      if (penerimaBaki && (iTerima < 0 || i > iTerima)) dinding_(k, 'Terdinding oleh ' + NAMA[penerimaBaki]);
      else if (!penerimaBaki) dinding_(k, 'Tiada baki: harta habis dibahagi kepada waris fardu');
    });

    // ---------- Musytarakah: suami + ibu/nenek + 2 atau lebih saudara seibu + saudara lelaki seibu sebapa ----------
    if (!penerimaBaki || banding(baki, SIFAR) <= 0) {
      var ibuNenek16 = fardu.some(function (x) { return x.kod === 'ibu' || x.kod === 'nenekIbu' || x.kod === 'nenekBapa'; });
      if (c.suami && ibuNenek16 && !blokSeibu && bilSeibu >= 2 && !blokSaudara && c.SIBL > 0 && banding(baki, SIFAR) === 0) {
        kes = 'Musytarakah';
        var kongsi = bilSeibu + c.SIBL + c.SIBP;
        fardu = fardu.filter(function (x) { return x.kod !== 'SIL' && x.kod !== 'SIP'; });
        ['SIL', 'SIP', 'SIBL', 'SIBP'].forEach(function (k) { if (c[k]) f(k, c[k], darab(P(1, 3), P(c[k], kongsi)), 'Musytarakah (1/3 dikongsi sama rata)'); });
        return selesai();
      }
    }
    // Asabah yang tidak mendapat apa-apa kerana fardu sudah menghabiskan harta
    if (banding(baki, SIFAR) <= 0) {
      var asabahHabis = c.AL ? ['AL'] : (c.CL ? ['CL', 'CP'] : (!c.bapa && !datukE && !blokSaudara && c.SIBL ? ['SIBL', 'SIBP'] : (!blokSebapa && c.SBL ? ['SBL', 'SBP'] : [])));
      asabahHabis.forEach(function (k) { if (c[k] && !dinding.some(function (d) { return d.kod === k; }) && !fardu.some(function (x) { return x.kod === k; })) dinding.push({ kod: k, nama: NAMA[k], bil: c[k], sebab: 'Tiada baki: harta habis dibahagi kepada waris fardu' }); });
    }
    return selesai();

    function selesai() {
      var Fx = jumlah(fardu.map(function (x) { return x.frac; }));
      var aul = banding(Fx, SATU) > 0;
      if (aul) {
        fardu = fardu.map(function (x) { return Object.assign({}, x, { frac: bahagi(x.frac, Fx) }); });
        asabah = []; baitulmal = SIFAR;
        if (!kes) kes = '\'Aul';
        nota.push('Jumlah fardu melebihi harta, maka penyebut dinaikkan (\'aul) dan semua waris fardu berkongsi kekurangan secara seimbang.');
      }
      return hasil(c, fardu, asabah, dinding, baitulmal, aul, kes, nota);
    }
  }

  function hasil(c, fardu, asabah, dinding, baitulmal, aul, kes, nota) {
    // Gabung bahagian fardu + asabah bagi waris yang sama (contoh Bapa: 1/6 + baki)
    var peta = {}, urutan = [];
    fardu.concat(asabah).forEach(function (x) {
      if (!peta[x.kod]) { peta[x.kod] = { kod: x.kod, nama: NAMA[x.kod], bil: x.bil, frac: SIFAR, jenis: [] }; urutan.push(x.kod); }
      peta[x.kod].frac = tambah(peta[x.kod].frac, x.frac);
      if (peta[x.kod].jenis.indexOf(x.jenis) < 0) peta[x.kod].jenis.push(x.jenis);
    });
    var waris = urutan.map(function (k) { var w = peta[k]; return { kod: k, nama: w.nama, bil: w.bil, bahagian: w.frac, seorang: P(w.frac.n, w.frac.d * w.bil), jenis: w.jenis.join(' + ') }; })
      .filter(function (w) { return w.bahagian.n > 0; });
    if (baitulmal.n > 0) waris.push({ kod: 'baitulmal', nama: NAMA.baitulmal, bil: 1, bahagian: baitulmal, seorang: baitulmal, jenis: 'Baki tanpa asabah' });
    var asas = waris.reduce(function (m, w) { return lcm(m, w.seorang.d); }, 1);
    waris.forEach(function (w) {
      w.saham = w.bahagian.n * (asas / w.bahagian.d);            // bahagian kumpulan dalam unit asas
      w.peratus = w.bahagian.n / w.bahagian.d * 100;
      w.teks = w.bahagian.n + '/' + w.bahagian.d;
      w.teksSeorang = w.seorang.n + '/' + w.seorang.d;
    });
    // nama terdinding unik
    var lihat = {}; dinding = dinding.filter(function (d) { if (lihat[d.kod] || waris.some(function (w) { return w.kod === d.kod; })) return false; lihat[d.kod] = 1; return true; });
    return { input: c, waris: waris, terdinding: dinding, asas: asas, aul: !!aul, kes: kes || '', nota: nota || [],
      jumlahSemak: waris.reduce(function (s, w) { return tambah(s, w.bahagian); }, SIFAR) };
  }

  // Agih nilai RM ikut keputusan kira()
  function agihRM(keputusan, nilai) {
    nilai = Number(nilai) || 0;
    return keputusan.waris.map(function (w) {
      var amaun = nilai * w.bahagian.n / w.bahagian.d;
      return Object.assign({}, w, { amaun: amaun, amaunSeorang: amaun / w.bil });
    });
  }

  // ---------- daripada nod myNasab ----------
  // nod: senarai mynasab_nodes (owner_uid = pengguna). mod: 'induk' (si mati = Diri Sendiri) atau 'pasangan'.
  // Pulangkan { input, nota[] } untuk kira(). Saudara dianggap seibu sebapa (myNasab tidak membezakan).
  function dariNasab(nod, mod) {
    nod = (nod || []).filter(Boolean);
    var rel = function (n) { return String(n.relationship || '').trim().toLowerCase(); };
    var hidup = function (n) { return n.status !== 'meninggal'; };
    var byId = {}; nod.forEach(function (n) { byId[n.id] = n; });
    var akar = nod.filter(function (n) { return n.is_root; })[0] || {};
    var jantinaDari = function (n) { var r = rel(n); return n.gender || (/^(abang|ayah|bapa|datuk|suami|bapa mertua|datuk mertua)/.test(r) ? 'L' : (/^(kakak|ibu|nenek|isteri|ibu mertua|nenek mertua)/.test(r) ? 'P' : '')); };
    var inp = { jantina: 'L' }, nota = [], tiadaJantina = [];
    var kira_ = function (k) { inp[k] = (inp[k] || 0) + 1; };
    var pas = mod === 'pasangan';
    var pasanganNod = nod.filter(function (n) { return /^(isteri|suami)$/.test(rel(n)); });

    if (!pas) {
      inp.jantina = jantinaDari(akar) === 'P' ? 'P' : 'L';
      pasanganNod.filter(hidup).forEach(function (n) { kira_(rel(n) === 'suami' ? 'suami' : 'isteri'); });
      var ayah = nod.filter(function (n) { return rel(n) === 'ayah' || rel(n) === 'bapa'; })[0];
      var ibu = nod.filter(function (n) { return rel(n) === 'ibu'; })[0];
      if (ayah && hidup(ayah)) inp.bapa = 1;
      if (ibu && hidup(ibu)) inp.ibu = 1;
      if (!ayah) nota.push('Bapa belum direkod dalam myNasab: dianggap sudah meninggal dunia.');
      if (!ibu) nota.push('Ibu belum direkod dalam myNasab: dianggap sudah meninggal dunia.');
      nod.forEach(function (n) {
        var r = rel(n), ref = byId[n.ref_id];
        if (!hidup(n)) return;
        if (r === 'datuk' && ref && ayah && ref.id === ayah.id) inp.datuk = 1;
        if (r === 'nenek' && ref) { if (ayah && ref.id === ayah.id) inp.nenekBapa = 1; else if (ibu && ref.id === ibu.id) inp.nenekIbu = 1; }
        if (/^(abang|kakak|adik|adik-beradik)$/.test(r)) { var g = jantinaDari(n); if (g === 'L') kira_('SIBL'); else if (g === 'P') kira_('SIBP'); else tiadaJantina.push(n.name || n.relationship || 'Tanpa nama'); }
        if (r === 'anak saudara' && ref && jantinaDari(ref) === 'L' && jantinaDari(n) === 'L' && /^(abang|adik|adik-beradik)$/.test(rel(ref))) kira_('ASIBL');
        if (r === 'bapa saudara (belah ayah)') kira_('BSIBL');
        if (r === 'sepupu' && ref && rel(ref) === 'bapa saudara (belah ayah)' && jantinaDari(n) === 'L') kira_('SPSIBL');
      });
    } else {
      var pn = pasanganNod[0];
      if (!pn) return { input: inp, nota: ['Pasangan belum direkod dalam myNasab.'] };
      inp.jantina = rel(pn) === 'suami' ? 'L' : 'P';
      if (hidup(akar)) kira_(jantinaDari(akar) === 'P' ? 'isteri' : 'suami');
      var bm = nod.filter(function (n) { return /^(bapa|ayah) (mertua|mentua)$/.test(rel(n)); })[0];
      var im = nod.filter(function (n) { return /^ibu (mertua|mentua)$/.test(rel(n)); })[0];
      if (bm && hidup(bm)) inp.bapa = 1;
      if (im && hidup(im)) inp.ibu = 1;
      if (!bm) nota.push('Bapa mertua belum direkod dalam myNasab: dianggap sudah meninggal dunia.');
      if (!im) nota.push('Ibu mertua belum direkod dalam myNasab: dianggap sudah meninggal dunia.');
      nod.forEach(function (n) {
        var r = rel(n), ref = byId[n.ref_id];
        if (!hidup(n)) return;
        if (r === 'datuk mertua' && ref && bm && ref.id === bm.id) inp.datuk = 1;
        if (r === 'nenek mertua' && ref) { if (bm && ref.id === bm.id) inp.nenekBapa = 1; else if (im && ref.id === im.id) inp.nenekIbu = 1; }
        if (/^(abang|kakak|adik) pasangan$/.test(r)) { var g = jantinaDari(n) || (/^abang/.test(r) ? 'L' : (/^kakak/.test(r) ? 'P' : '')); if (g === 'L') kira_('SIBL'); else if (g === 'P') kira_('SIBP'); else tiadaJantina.push(n.name || n.relationship || 'Tanpa nama'); }
      });
    }
    // Anak & cucu (anak dianggap anak bersama Induk dan Pasangan)
    nod.forEach(function (n) {
      var r = rel(n), ref = byId[n.ref_id];
      if (!hidup(n)) return;
      if (r === 'anak') { var g = jantinaDari(n); if (g === 'L') kira_('AL'); else if (g === 'P') kira_('AP'); else tiadaJantina.push(n.name || n.relationship || 'Tanpa nama'); }
      if (r === 'cucu' && ref && rel(ref) === 'anak' && jantinaDari(ref) === 'L') { var g2 = jantinaDari(n); if (g2 === 'L') kira_('CL'); else if (g2 === 'P') kira_('CP'); }
    });
    if (tiadaJantina.length) nota.push('Jantina belum diisi untuk: ' + tiadaJantina.join(', ') + '. Mereka tidak dikira.');
    if ((inp.SIBL || 0) + (inp.SIBP || 0) > 0) nota.push('Adik-beradik dianggap saudara seibu sebapa. Ubah jika ada yang sebapa atau seibu sahaja.');
    return { input: inp, nota: nota };
  }

  // ---------- muat nod myNasab lengkap (sama seperti paparan myNasab) ----------
  // Selain nod sendiri, tambah:
  //  - leluhur (ayah, ibu, datuk, nenek, moyang) dipinjam daripada adik-beradik berakaun yang bercantum (linked_adik)
  //    jika akaun ini tiada ibu bapa sendiri, sama seperti pokok myNasab
  //  - adik-beradik berakaun: akaun bercantum (linked_adik), pengundang (sibling_of/link_owner) dan akaun yang dijemput (mynasab_links)
  // fs = { collection, query, where, getDocs }. Nod tambahan ditanda luar: true.
  async function muatNod(fs, db, uid) {
    var ambil = function (s) { return s.docs.map(function (d) { return Object.assign({}, d.data(), { id: d.id }); }); };
    var q = function (owner, lagi) { var a = [fs.collection(db, 'mynasab_nodes'), fs.where('owner_uid', '==', owner)].concat(lagi || []); return fs.getDocs(fs.query.apply(null, a)); };
    var rel = function (n) { return String(n.relationship || '').trim().toLowerCase(); };
    var kunci = function (t) { return String(t || '').toLowerCase().split(/\s+(?:bin|binti|bte|b\.|bt\.)\s+/)[0].trim(); };
    var SDR = /^(abang|kakak|adik|adik-beradik)$/, SDRP = /^(abang|kakak|adik) pasangan$/;
    var LELUHUR = /^(ayah|ibu)$|datuk|nenek|moyang|buyut/;
    var nod = ambil(await q(uid));
    var akar = nod.filter(function (n) { return n.is_root; })[0] || {};
    var sudah = {}, sudahP = {};
    nod.forEach(function (n) { if (SDR.test(rel(n))) sudah[kunci(n.name)] = 1; if (SDRP.test(rel(n))) sudahP[kunci(n.name)] = 1; });
    sudah[kunci(akar.name)] = 1;
    nod.filter(function (n) { return /^(isteri|suami)$/.test(rel(n)); }).forEach(function (n) { sudahP[kunci(n.name)] = 1; });
    function tambah(d, relBaru) {
      var psg = relBaru === 'Adik Pasangan', set = psg ? sudahP : sudah, k = kunci(d.name);
      if (!k || set[k] || d.owner_uid === uid && d.is_root) return;
      set[k] = 1;
      nod.push({ id: 'luar_' + d.id, name: d.name, gender: d.gender || '', dob: d.dob || '', status: d.status || 'hidup', relationship: relBaru, luar: true });
    }
    var adaIbuBapa = function () { return nod.some(function (n) { return /^(ayah|ibu)$/.test(rel(n)); }); };
    function pinjamLeluhur(nu) {
      if (adaIbuBapa()) return;
      var L = nu.filter(function (n) { return !n.is_root && LELUHUR.test(rel(n)) && !/mertua|mentua|saudara/.test(rel(n)); });
      if (L.some(function (n) { return /^(ayah|ibu)$/.test(rel(n)); })) L.forEach(function (n) { nod.push(Object.assign({}, n, { luar: true })); });
    }
    function dariPokok(nu) {
      nu.filter(function (n) { return n.is_root; }).forEach(function (r) { tambah(r, 'Adik-beradik'); });
      nu.filter(function (n) { return SDR.test(rel(n)); }).forEach(function (n) { tambah(n, 'Adik-beradik'); });
      pinjamLeluhur(nu);
    }
    var linked = Array.isArray(akar.linked_adik) ? akar.linked_adik : [];
    for (var i = 0; i < linked.length; i++) {
      if (!linked[i] || linked[i] === uid) continue;
      try { dariPokok(ambil(await q(linked[i]))); } catch (e) { console.warn('Faraid.muatNod linked_adik:', e.message); }
    }
    if (akar.sibling_of && akar.link_owner && akar.link_owner !== uid) {
      try { dariPokok(ambil(await q(akar.link_owner))); } catch (e) { console.warn('Faraid.muatNod pengundang:', e.message); }
    }
    try {
      var sl = await fs.getDocs(fs.query(fs.collection(db, 'mynasab_links'), fs.where('owner_uid', '==', uid), fs.where('status', '==', 'aktif')));
      var idPas = {}; nod.forEach(function (n) { if (/^(isteri|suami)$/.test(rel(n))) idPas[n.id] = 1; });
      for (var j = 0; j < sl.docs.length; j++) {
        var l = sl.docs[j].data(), u = l.uid, sas = String(l.sasaran_id || '');
        if (!u || u === uid) continue;
        var psg = !!idPas[sas], induk = sas === akar.id || sas === 'root_' + uid;
        if (!psg && !induk) continue;
        var rr = ambil(await q(u, [fs.where('is_root', '==', true)]))[0];
        if (rr) tambah(rr, psg ? 'Adik Pasangan' : 'Adik-beradik');
      }
    } catch (e) { console.warn('Faraid.muatNod pautan:', e.message); }
    return nod;
  }

  var Faraid = { kira: kira, agihRM: agihRM, dariNasab: dariNasab, muatNod: muatNod, NAMA: NAMA, KOD: KOD, pecahan: P };
  if (typeof module !== 'undefined' && module.exports) module.exports = Faraid;
  root.Faraid = Faraid;
})(typeof window !== 'undefined' ? window : globalThis);
