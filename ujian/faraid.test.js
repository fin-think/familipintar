// Ujian enjin faraid: node ujian/faraid.test.js
// Jawapan rujukan ialah kes-kes masyhur dalam ilmu faraid (Syafi'i) seperti yang diterangkan dalam K-Faraid MAIS.
const F = require('../faraid.js');
let lulus = 0, gagal = 0;
function uji(tajuk, inp, jangka, opsi = {}) {
  const r = F.kira(inp);
  const dapat = {}; r.waris.forEach(w => { dapat[w.kod] = w.teks; });
  const salah = [];
  for (const k in jangka) if (dapat[k] !== jangka[k]) salah.push(`${k}: jangka ${jangka[k]}, dapat ${dapat[k] || '-'}`);
  for (const k in dapat) if (!(k in jangka)) salah.push(`${k}: tidak dijangka (${dapat[k]})`);
  const j = r.jumlahSemak; if (j.n !== j.d) salah.push(`jumlah bukan 1 (${j.n}/${j.d})`);
  if (opsi.kes && r.kes !== opsi.kes) salah.push(`kes: jangka ${opsi.kes}, dapat ${r.kes}`);
  if (opsi.dinding) for (const k of opsi.dinding) if (!r.terdinding.some(d => d.kod === k)) salah.push(`${k} sepatutnya terdinding`);
  if (salah.length) { gagal++; console.log('✗', tajuk, '\n   ', salah.join('\n    ')); } else { lulus++; console.log('✓', tajuk); }
}
const L = 'L', P = 'P';
uji('Isteri + 1 AL + 1 AP', { jantina: L, isteri: 1, AL: 1, AP: 1 }, { isteri: '1/8', AL: '7/12', AP: '7/24' });
uji('Suami + ibu + bapa (Gharrawain)', { jantina: P, suami: 1, ibu: 1, bapa: 1 }, { suami: '1/2', ibu: '1/6', bapa: '1/3' }, { kes: 'Umariyyatain' });
uji('Isteri + ibu + bapa (Gharrawain)', { jantina: L, isteri: 1, ibu: 1, bapa: 1 }, { isteri: '1/4', ibu: '1/4', bapa: '1/2' }, { kes: 'Umariyyatain' });
uji('Ibu + bapa sahaja', { jantina: L, ibu: 1, bapa: 1 }, { ibu: '1/3', bapa: '2/3' });
uji('Suami + 2 saudara perempuan seibu sebapa (aul 7)', { jantina: P, suami: 1, SIBP: 2 }, { suami: '3/7', SIBP: '4/7' }, { kes: "'Aul" });
uji('Suami + ibu + 2 AP (aul 13)', { jantina: P, suami: 1, ibu: 1, AP: 2 }, { suami: '3/13', ibu: '2/13', AP: '8/13' });
uji('Minbariyyah: isteri + bapa + ibu + 2 AP (aul 27)', { jantina: L, isteri: 1, bapa: 1, ibu: 1, AP: 2 }, { isteri: '1/9', bapa: '4/27', ibu: '4/27', AP: '16/27' });
uji('Isteri + 1 saudara perempuan (baki Baitulmal)', { jantina: L, isteri: 1, SIBP: 1 }, { isteri: '1/4', SIBP: '1/2', baitulmal: '1/4' });
uji('1 AP + 1 saudara perempuan (asabah ma\'al ghair)', { jantina: L, AP: 1, SIBP: 1 }, { AP: '1/2', SIBP: '1/2' });
uji('1 AP + 1 cucu perempuan (Baitulmal)', { jantina: L, AP: 1, CP: 1 }, { AP: '1/2', CP: '1/6', baitulmal: '1/3' });
uji('1 AP + 1 CP + 1 saudara lelaki', { jantina: L, AP: 1, CP: 1, SIBL: 1 }, { AP: '1/2', CP: '1/6', SIBL: '1/3' });
uji('2 AP + 1 CP (CP terdinding)', { jantina: L, AP: 2, CP: 1, SIBL: 1 }, { AP: '2/3', SIBL: '1/3' }, { dinding: ['CP'] });
uji('2 AP + 1 CL + 1 CP', { jantina: L, AP: 2, CL: 1, CP: 1 }, { AP: '2/3', CL: '2/9', CP: '1/9' });
uji('Musytarakah', { jantina: P, suami: 1, ibu: 1, SIL: 1, SIP: 1, SIBL: 1 }, { suami: '1/2', ibu: '1/6', SIL: '1/9', SIP: '1/9', SIBL: '1/9' }, { kes: 'Musytarakah' });
uji('Akdariyyah', { jantina: P, suami: 1, ibu: 1, datuk: 1, SIBP: 1 }, { suami: '1/3', ibu: '2/9', datuk: '8/27', SIBP: '4/27' }, { kes: 'Akdariyyah' });
uji('Datuk + 1 saudara lelaki (muqasamah)', { jantina: L, datuk: 1, SIBL: 1 }, { datuk: '1/2', SIBL: '1/2' });
uji('Datuk + 3 saudara lelaki (1/3 lebih baik)', { jantina: L, datuk: 1, SIBL: 3 }, { datuk: '1/3', SIBL: '2/3' });
uji('Datuk + isteri + 2 saudara lelaki', { jantina: L, datuk: 1, isteri: 1, SIBL: 2 }, { isteri: '1/4', datuk: '1/4', SIBL: '1/2' });
uji('Datuk + 1 AP + 1 saudara lelaki', { jantina: L, datuk: 1, AP: 1, SIBL: 1 }, { AP: '1/2', datuk: '1/4', SIBL: '1/4' });
uji('Mu\'addah: datuk + 1 SIBP + 1 SBL', { jantina: L, datuk: 1, SIBP: 1, SBL: 1 }, { datuk: '2/5', SIBP: '1/2', SBL: '1/10' });
uji('Datuk + SIBL + SBL (SBL dikira, kemudian terdinding)', { jantina: L, datuk: 1, SIBL: 1, SBL: 1 }, { datuk: '1/3', SIBL: '2/3' }, { dinding: ['SBL'] });
uji('Ibu + bapa + 2 saudara (saudara terdinding tetapi kurangkan ibu)', { jantina: L, ibu: 1, bapa: 1, SIBL: 2 }, { ibu: '1/6', bapa: '5/6' }, { dinding: ['SIBL'] });
uji('Isteri + ibu + 2 saudara lelaki', { jantina: L, isteri: 1, ibu: 1, SIBL: 2 }, { isteri: '1/4', ibu: '1/6', SIBL: '7/12' });
uji('Isteri + ibu + 1 saudara seibu', { jantina: L, isteri: 1, ibu: 1, SIL: 1 }, { isteri: '1/4', ibu: '1/3', SIL: '1/6', baitulmal: '1/4' });
uji('Datuk gantikan bapa: suami + ibu + datuk (bukan Umariyyatain)', { jantina: P, suami: 1, ibu: 1, datuk: 1 }, { suami: '1/2', ibu: '1/3', datuk: '1/6' });
uji('Bapa + 1 AP (fardu + asabah)', { jantina: L, bapa: 1, AP: 1 }, { AP: '1/2', bapa: '1/2' });
uji('Bapa + 1 AL', { jantina: L, bapa: 1, AL: 1 }, { bapa: '1/6', AL: '5/6' });
uji('2 isteri + 2 AL', { jantina: L, isteri: 2, AL: 2 }, { isteri: '1/8', AL: '7/8' });
uji('Nenek dua belah, tanpa ibu', { jantina: L, nenekIbu: 1, nenekBapa: 1, AL: 1 }, { nenekIbu: '1/12', nenekBapa: '1/12', AL: '5/6' });
uji('Nenek sebelah bapa terdinding oleh bapa', { jantina: L, nenekIbu: 1, nenekBapa: 1, bapa: 1 }, { nenekIbu: '1/6', bapa: '5/6' }, { dinding: ['nenekBapa'] });
uji('1 SIBP + 1 SBP (takmilah 1/6)', { jantina: L, SIBP: 1, SBP: 1, ASIBL: 1 }, { SIBP: '1/2', SBP: '1/6', ASIBL: '1/3' });
uji('2 SIBP + SBP + SBL (SBP diselamatkan SBL)', { jantina: L, SIBP: 2, SBP: 1, SBL: 1 }, { SIBP: '2/3', SBL: '2/9', SBP: '1/9' });
uji('Anak saudara lelaki ambil baki, bapa saudara terdinding', { jantina: L, isteri: 1, ASIBL: 2, BSIBL: 1 }, { isteri: '1/4', ASIBL: '3/4' }, { dinding: ['BSIBL'] });
uji('Sepupu sahaja', { jantina: L, SPSIBL: 3 }, { SPSIBL: '1' + '/1' });
uji('Tiada waris (Baitulmal)', { jantina: L }, { baitulmal: '1/1' });
uji('Suami + AL + ibu + bapa', { jantina: P, suami: 1, AL: 1, ibu: 1, bapa: 1 }, { suami: '1/4', ibu: '1/6', bapa: '1/6', AL: '5/12' });
uji('Suami + bapa + ibu + 2 seibu (seibu terdinding oleh bapa, ibu 1/6)', { jantina: P, suami: 1, bapa: 1, ibu: 1, SIL: 2 }, { suami: '1/2', ibu: '1/6', bapa: '1/3' }, { dinding: ['SIL'] });
uji('Suami + 2 seibu + ibu + SIBL tanpa bapa (Musytarakah dengan saudara perempuan)', { jantina: P, suami: 1, ibu: 1, SIL: 2, SIBL: 1, SIBP: 1 }, { suami: '1/2', ibu: '1/6', SIL: '1/6', SIBL: '1/12', SIBP: '1/12' }, { kes: 'Musytarakah' });
// RM
const r = F.agihRM(F.kira({ jantina: 'L', isteri: 1, AL: 1, AP: 1 }), 240000);
const amt = Object.fromEntries(r.map(w => [w.kod, Math.round(w.amaun)]));
if (amt.isteri === 30000 && amt.AL === 140000 && amt.AP === 70000) { lulus++; console.log('✓ agihRM RM240,000'); } else { gagal++; console.log('✗ agihRM', amt); }
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
