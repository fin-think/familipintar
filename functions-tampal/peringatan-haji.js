// Rujukan: tampal dalam jalankanPeringatanOurMoney (functions/index.js), selepas gelung senaraiAmanah dan sebelum 'if (!tertunggak.length)'.
// Dan dalam aSnap.forEach tambah: if (x.jenis === 'haji') { senaraiHaji.push(x); return; }  (isytihar const senaraiHaji = [] bersama senaraiAmanah)
                for (const hj of senaraiHaji) {
                    if (hj.status !== 'aktif' || !(Number(hj.sasaran) > 0)) continue;
                    const per = hj.peranan === 'pasangan' ? 'pasangan' : 'induk';
                    const hjSnap = await dbRef.collection('ourmoney_transactions').where('owner_uid', '==', uid).where('haji', '==', true).get();
                    let sebelum = Number(hj.baki_awal) || 0, bulanIni = 0;
                    hjSnap.forEach(d => {
                        const x = d.data();
                        if (x.type !== 'outflow' || !x.date || (x.txnPeranan === 'pasangan' ? 'pasangan' : 'induk') !== per) return;
                        if (hj.mula && String(x.date) < String(hj.mula)) return;
                        const bln = String(x.date).slice(0, 7);
                        if (bln < bulanStr) sebelum += Number(x.amount) || 0;
                        else if (bln === bulanStr) bulanIni += Number(x.amount) || 0;
                    });
                    const sasaran = Number(hj.sasaran);
                    if (sebelum + bulanIni >= sasaran) continue;                       // sasaran sudah tercapai
                    const bulanTinggal = Math.max(1, (Number(hj.tahun_target) - thn) * 12 + (13 - bln));
                    const kurang = Math.max(0, sasaran - sebelum) / bulanTinggal - bulanIni;
                    if (kurang > 1) tertunggak.push({ label: '🕋 Haji' + (per === 'pasangan' ? ' (pasangan)' : ''), baki: kurang });
                }
