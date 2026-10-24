// ==========================================
// app.js - Logik Teras FamiliPintar (VERSI 5 - DIBETULKAN)6257d36
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, increment, arrayUnion, arrayRemove, collection, addDoc, query, where, getDocs, deleteDoc, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyA7SW4U--evGtfRyPz5Feh3mEN8MF92gTg",
    authDomain: "familipintar.firebaseapp.com",
    databaseURL: "https://familipintar-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "familipintar",
    storageBucket: "familipintar.firebasestorage.app",
    messagingSenderId: "277029764059",
    appId: "1:277029764059:web:0a21bb2e01d868b1ed05fe",
    measurementId: "G-S3RP7E4460"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
let penggunaSemasa = null;

// --- BANTU: escape teks (elak skrip berniat jahat) ---
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// --- BANTU: teks "Lahir" / "Meninggal dunia" pada kad ---
const infoLahir = (a) => {
    if (a.status === 'meninggal') return 'Meninggal dunia';
    if (!a.dob) return '';
    const t = parseInt(a.dob.split('-')[0], 10);
    return `Lahir: ${t} (${new Date().getFullYear() - t} thn)`;
};

// --- JEMPUTAN: baca ?jemput=KOD dari pautan ---
let kodJemput = new URLSearchParams(location.search).get('jemput');

// Simpan dalam Session Storage supaya tak hilang bila kena tendang ke muka depan
if (kodJemput) {
    sessionStorage.setItem('simpanJemput', kodJemput);
} else {
    kodJemput = sessionStorage.getItem('simpanJemput'); // Ambil semula dari ingatan jika ada
}

let jemputan = null;
if (kodJemput) {
    getDoc(doc(db, "mynasab_invites", kodJemput)).then(s => {
        if (!s.exists()) { 
            alert("Pautan jemputan tidak sah atau telah tamat."); 
            sessionStorage.removeItem('simpanJemput');
            return; 
        }
        jemputan = s.data();
        const b = document.getElementById('bannerJemput');
        if(b) {
            b.innerText = `Anda dijemput menyertai keluarga ${jemputan.nama_pengundang}. Mendaftar atau log masuk akan memautkan akaun anda secara automatik.`;
            b.classList.remove('hidden');
        }
    });
}

// --- 1. PENGURUSAN SESI ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        penggunaSemasa = user;

        const dashboardUtama = document.getElementById('dashboardUtama');
        if (dashboardUtama) dashboardUtama.classList.remove('hidden');

        const refPengguna = doc(db, "mynasab_users", user.uid);
        const snapPengguna = await getDoc(refPengguna);

        if (snapPengguna.exists()) {
            const dataPengguna = snapPengguna.data();
            document.getElementById('creditBalance').innerText = dataPengguna.credit_balance;
            document.getElementById('treeNameDisplay').innerText = dataPengguna.name;
            
            // --- LOGIK PAUTAN AUTOMATIK (JEMPUTAN) ---
            if (kodJemput && jemputan) {
                const linkRef = doc(db, "mynasab_links", user.uid);
                const linkSnap = await getDoc(linkRef);
                
                // Jika belum dipautkan, pautkan sekarang!
                if (!linkSnap.exists()) {
                    await setDoc(linkRef, {
                        uid: user.uid,
                        owner_uid: jemputan.owner_uid,
                        sasaran_id: jemputan.sasaran_id,
                        kod: kodJemput,
                        status: 'menunggu',
                        nama: dataPengguna.name,
                        created_at: new Date()
                    });
                    
                    // Kemas kini nod Induk untuk tandakan sebagai adik-beradik
                    await setDoc(doc(db, "mynasab_nodes", "root_" + user.uid), {
                        owner_uid: user.uid,
                        name: dataPengguna.name,
                        relationship: "Diri Sendiri (Induk)",
                        is_root: true,
                        sibling_of: jemputan.sasaran_id,
                        link_owner: jemputan.owner_uid,
                        created_at: new Date()
                    }, { merge: true }); // guna merge supaya tak padam data sedia ada

                    alert(`Berjaya! Pautan keluarga anda menunggu kelulusan ${jemputan.nama_pengundang}.`);
                }
                
                // Padam kod jemputan dari ingatan dan bersihkan URL URL
                sessionStorage.removeItem('simpanJemput');
                window.history.replaceState({}, document.title, location.pathname); 
            }
            // ----------------------------------------

            window.muatTurunSalasilah();
            window.muatMenunggu();

            if (window.pantauMesejBaru) {
                window.pantauMesejBaru(user.uid);
            }
        }
    } else {
        penggunaSemasa = null;
        // JANGAN tendang ke muka depan jika dia ada link jemputan
        if (!sessionStorage.getItem('simpanJemput') && !new URLSearchParams(location.search).get('jemput')) {
            window.location.href = "../index.html";
        }
    }
});

// --- 2. FUNGSI LOG MASUK & DAFTAR ---
window.logMasuk = async (emel, kataLaluan) => {
    try {
        await signInWithEmailAndPassword(auth, emel, kataLaluan);
        alert("Log masuk berjaya!");
        document.getElementById('authModal').style.display = 'none';
    } catch (error) {
        alert("Log masuk gagal. Sila semak emel dan kata laluan anda.");
    }
};

window.daftarPengguna = async (emel, kataLaluan, namaKeluarga, jantina) => {
    if (kodJemput && !jemputan) {
        alert("Pautan jemputan tidak sah atau belum siap dimuatkan. Cuba lagi sebentar.");
        return;
    }
    const jem = jemputan;
    const kreditAwal = jem ? 5 : 10;

    try {
        const kredensial = await createUserWithEmailAndPassword(auth, emel, kataLaluan);
        const user = kredensial.user;

        await setDoc(doc(db, "mynasab_users", user.uid), {
            name: namaKeluarga,
            email: emel,
            credit_balance: kreditAwal,
            pdpa: { setuju: true, tarikh: new Date(), versi: "1.0" },
            created_at: new Date()
        });

        await setDoc(doc(db, "mynasab_nodes", "root_" + user.uid), {
            owner_uid: user.uid,
            name: namaKeluarga,
            relationship: "Diri Sendiri (Induk)",
            gender: jantina,
            is_root: true,
            ...(jem ? { sibling_of: jem.sasaran_id, link_owner: jem.owner_uid } : {}),
            created_at: new Date()
        });

       if (jem) {
            await setDoc(doc(db, "mynasab_links", user.uid), {
                uid: user.uid,
                owner_uid: jem.owner_uid,
                sasaran_id: jem.sasaran_id,
                kod: kodJemput,
                status: 'menunggu',
                nama: namaKeluarga,
                created_at: new Date()
            });

            // 🧬 FUNGSI AUTO-SALIN IBUBAPA & LELUHUR DARI PENGUNDANG (DIBETULKAN PIVOT)
            try {
                const qLeluhur = query(collection(db, "mynasab_nodes"), where("owner_uid", "==", jem.owner_uid));
                const snapLeluhur = await getDocs(qLeluhur);
                
                let idMapping = {}; 
                let senaraiSalin = [];
                let nodesLama = [];
                
                // Simpan semua data lama dalam memori dulu
                snapLeluhur.forEach(d => nodesLama.push({ idLama: d.id, data: d.data() }));
                
                // 1. CARI IDENTITI PENGUNDANG SEBENAR (AWI ATAU ANIS?)
                const sasaranNode = nodesLama.find(n => n.idLama === jem.sasaran_id);
                const sasaranRel = sasaranNode ? (sasaranNode.data.relationship || '').toLowerCase() : '';
                
                if (sasaranRel.includes('suami') || sasaranRel.includes('isteri')) {
                    // KES 1: Anis (Isteri) yang jemput Adi. 
                    // Kita kena tarik Mertua Awi, dan ubah status jadi Mak/Ayah Adi.
                    nodesLama.forEach((n) => {
                        let hub = (n.data.relationship || '').toLowerCase();
                        if (hub.includes('mertua')) {
                            // Pastikan mertua ini memang terikat pada Anis
                            if (!n.data.ref_id || n.data.ref_id === jem.sasaran_id) {
                                let newHub = hub.includes('bapa') ? 'Ayah' : 'Ibu';
                                // Ubah 'Bapa Mertua' jadi 'Ayah' sebelum salin
                                senaraiSalin.push({ idLama: n.idLama, data: { ...n.data, relationship: newHub } });
                            }
                        }
                    });
                } else {
                    // KES 2: Awi (Induk) yang jemput adik dia. 
                    // Tarik leluhur Awi macam biasa. (DIPERBAIKI: TOLAK MERTUA)
                    nodesLama.forEach((n) => {
                        let hub = (n.data.relationship || '').toLowerCase();
                        let isMertua = hub.includes('mertua') || hub.includes('mentua');
                        
                        if (hub.match(/ayah|ibu|bapa|mak|abah|mama|papa|datuk|nenek|moyang|buyut|cakawari|cilawagi/) && !isMertua) {
                            senaraiSalin.push({ idLama: n.idLama, data: n.data });
                        }
                    });
                }
                
                // 2. Salin data yang dah ditapis ke akaun baru (Adi / Hanapi)
                for (let item of senaraiSalin) {
                    const docRef = await addDoc(collection(db, "mynasab_nodes"), {
                        ...item.data,
                        owner_uid: user.uid,
                        created_by: jem.owner_uid, // Kekalkan hak cipta Awi
                        created_at: new Date()
                    });
                    idMapping[item.idLama] = docRef.id;
                }
                
                // 3. Perbaiki Ikatan (ref_id)
                for (let lama in idMapping) {
                    const baruId = idMapping[lama];
                    const asal = nodesLama.find(x => x.idLama === lama).data; // Rujuk fail asal untuk ref_id lama
                    
                    let newRef = asal.ref_id || ""; 
                    const refPengundang = "root_" + jem.owner_uid;
                    const refSasaran = "root_" + jem.sasaran_id;
                    
                    // Ikat pada Induk baharu (DIPERBAIKI: TAMBAH STRING KOSONG "")
                    if ([refPengundang, refSasaran, jem.owner_uid, jem.sasaran_id, ""].includes(asal.ref_id)) {
                        newRef = "root_" + user.uid; 
                    } else if (asal.ref_id && idMapping[asal.ref_id]) {
                        newRef = idMapping[asal.ref_id]; 
                    }
                    
                    await updateDoc(doc(db, "mynasab_nodes", baruId), { ref_id: newRef });
                }
            } catch(e) { console.warn("Gagal auto-salin leluhur", e); }
        }
        
        alert(jem
            ? `Pendaftaran berjaya! Anda menerima ${kreditAwal} Kredit. Pautan keluarga anda menunggu kelulusan ${jem.nama_pengundang}.`
            : `Pendaftaran berjaya! Anda menerima ${kreditAwal} Kredit percuma.`);
        location.href = location.pathname;
    } catch (error) {
        alert("Ralat pendaftaran: " + error.message);
    }
};

// --- FUNGSI LOG KELUAR ---
window.logKeluar = async () => {
    try {
        await signOut(auth);
        
        // Buang data jemputan sementara jika ada (langkah berjaga-jaga)
        sessionStorage.removeItem('simpanJemput');
        
        // Selepas berjaya log keluar, terus hantar balik ke muka depan Famili Pintar
        window.location.href = "../index.html"; 
        
    } catch (error) {
        alert("Gagal log keluar: " + error.message);
    }
};

// --- 3. FUNGSI MUAT TURUN DATA KE JADUAL DASHBOARD ---
window.muatTurunSalasilah = async () => {
    if (!penggunaSemasa) return;
    try {
        const q = query(collection(db, "mynasab_nodes"), where("owner_uid", "==", penggunaSemasa.uid));
        const querySnapshot = await getDocs(q);
        
        const tbody = document.getElementById('senaraiAhliTbody'); 
        if (tbody) tbody.innerHTML = ''; 
        
        // --- TAMBAHAN BARU: Kumpul Data Global & Bina Dropdown Faraid ---
        window.dataAhliFaraid = []; 
        let htmlPilihan = `<option value="root">Diri Sendiri (Induk)</option>`;
        
        // AUTO-PEMULIHAN: Jika jadual kosong
        if (querySnapshot.empty) {
            const namaPenuh = document.getElementById('treeNameDisplay').innerText || "Ketua Keluarga";
            await setDoc(doc(db, "mynasab_nodes", "root_" + penggunaSemasa.uid), {
                owner_uid: penggunaSemasa.uid,
                name: namaPenuh,
                relationship: "Diri Sendiri (Induk)",
                is_root: true,
                created_at: new Date()
            });
            window.muatTurunSalasilah();
            return;
        }
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            data.id = docSnap.id; // Simpan ID
            
            window.dataAhliFaraid.push(data); // Masukkan ke senarai Faraid
            
            let rel = (data.relationship || '').toLowerCase();
            
            // Masukkan Pasangan, Ibubapa, dan Mertua ke dalam Dropdown
            if(rel === 'isteri' || rel === 'suami' || rel === 'ayah' || rel === 'ibu' || rel.includes('mertua')) {
                htmlPilihan += `<option value="${data.id}">${data.name} (${data.relationship})</option>`;
            }
            
            // --- BINA JADUAL (KOD SEDIA ADA) ---
            let nama = data.name || "Tiada Nama";
            let hubungan = data.relationship || "Belum Ditetapkan";
            let jantina = data.gender === 'L' ? 'Lelaki' : (data.gender === 'P' ? 'Perempuan' : '-');
            let telefon = data.phone || '-';
            
            let lokasi = [data.city, data.state].filter(Boolean).join(', ') || '-';
            
            // Kira Umur (Automatik ikut tahun semasa. Jika tiada DOB = Meninggal Dunia)
           let paparanUmur = '';

// TUKAR DI SINI: Gunakan 'meninggal' mengikut apa yang disave dalam database
if (data.status === 'meninggal') { 
    paparanUmur = '<span style="color: #e74c3c; font-weight: bold; font-size: 11px; background: #fadbd8; padding: 3px 6px; border-radius: 6px; white-space: nowrap;">Meninggal dunia</span>';
} 
else if (data.dob && data.dob.trim() !== '') {
    const tahunLahir = parseInt(data.dob.split('-')[0], 10);
    const tahunSemasa = new Date().getFullYear();
    const umur = tahunSemasa - tahunLahir;
    paparanUmur = `${data.dob} <br><small style="color:#7f8c8d; font-weight:bold;">(${umur} tahun)</small>`;
} 
else {
    paparanUmur = '-';
}

            let gambarMini = data.photo_url
                ? `<img src="${data.photo_url}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid #bdc3c7;">` 
                : `<div style="width: 32px; height: 32px; border-radius: 50%; background: #ecf0f1; display: flex; justify-content: center; align-items: center; font-size: 16px; border: 1px solid #bdc3c7;">👤</div>`;
            
          const tr = document.createElement('tr');
            
            // --- KOD BARU: SEKATAN BUTANG & FIX KLIK ---
            let butangTindakan = '';
            if (data.created_by && data.created_by !== penggunaSemasa.uid) {
                butangTindakan = `<span style="color:#95a5a6; font-size:12px; font-style:italic; font-weight:bold;">🔒 Milik Pengundang</span>`;
            } else {
                // Tambahan href="javascript:void(0)" agar tombol wajib bereaksi saat diklik
                butangTindakan = `<a href="javascript:void(0)" onclick="window.bukaModalEdit('${data.id}')" class="action-link" style="cursor: pointer;">✏️ Edit</a>`;
                if (!data.is_root) { 
                    butangTindakan += `<a href="javascript:void(0)" onclick="padamAhli('${data.id}')" class="action-link" style="color: #e74c3c; margin-left: 10px; cursor: pointer;">🗑️ Padam</a>`;
                }
            }
            // ---------------------------------------------------------

            tr.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${gambarMini}
                        <strong style="color: #2c3e50;">${nama}</strong>
                    </div>
                </td>
                <td><span style="background: #e8f8f5; color: #117a65; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; white-space: nowrap;">${hubungan}</span></td>
                <td style="color: #576574;">${jantina}</td>
                <td style="color: #576574; font-size: 13px;">${paparanUmur}</td>
                <td style="color: #576574; font-size: 13px;">${telefon}</td>
                <td style="color: #576574; font-size: 13px;">${lokasi}</td>
                <td style="white-space: nowrap;">${butangTindakan}</td>
            `;
            if(tbody) tbody.appendChild(tr);
        });
        
        // --- KEMAS KINI DROPDOWN & PANGGIL ENJIN FARAID ---
        const dropdownFaraid = document.getElementById('pilihanMatiFaraid');
        if(dropdownFaraid) {
            let nilaiSemasa = dropdownFaraid.value; 
            dropdownFaraid.innerHTML = htmlPilihan;
            if(htmlPilihan.includes(`value="${nilaiSemasa}"`)) dropdownFaraid.value = nilaiSemasa; 
        }
        
        if(window.jalankanFaraid) window.jalankanFaraid();
        
    } catch (error) { console.error("Gagal memuat turun senarai:", error); }
};

// --- 4. PADAM AHLI ---
window.padamAhli = async (idAhli) => {
    if (confirm("Anda pasti mahu memadam rekod ahli ini?")) {
        try {
            await deleteDoc(doc(db, "mynasab_nodes", idAhli));
            window.muatTurunSalasilah();
        } catch (e) {
            alert("Gagal memadam ahli: " + e.message);
        }
    }
};

// --- 5. TAMBAH AHLI BARU ---
window.tambahAhliBaru = async (nama, hubungan, jantina, dob, telefon, bandar, negeri, failGambar, rujukanId, status = 'hidup', email = '') => {
    if (!penggunaSemasa) return;

    const sPautanSaya = await getDoc(doc(db, "mynasab_links", penggunaSemasa.uid));
    if (sPautanSaya.exists() && ["Ayah","Ibu","Datuk","Nenek","Moyang","Buyut","Cakawari","Cilawagi"].includes(hubungan)) {
        alert("Ibu bapa dan leluhur diambil daripada pokok pengundang, jadi tidak perlu ditambah di sini.");
        return;
    }

    const btnSubmit = document.querySelector('#formTambahAhli button[type="submit"]');
    let teksAsalButang = "Simpan Ahli";

    if (btnSubmit) {
        teksAsalButang = btnSubmit.innerText;
        btnSubmit.disabled = true;
        btnSubmit.innerText = "Menyimpan...";
    }

    const refPengguna = doc(db, "mynasab_users", penggunaSemasa.uid);

    try {
        const snapPengguna = await getDoc(refPengguna);
        const bakiTerkini = parseInt(snapPengguna.data().credit_balance, 10) || 0;

        let kosAhli = 0;
        const hubLower = hubungan.toLowerCase();

        if (hubungan === "Anak") {
            const qAnak = query(collection(db, "mynasab_nodes"), where("owner_uid", "==", penggunaSemasa.uid), where("relationship", "==", "Anak"));
            const snapAnak = await getDocs(qAnak);
            if (snapAnak.size >= 5) kosAhli = 1;
        }
        else if (hubungan === "Bapa Mertua" || hubungan === "Ibu Mertua") {
            kosAhli = 5;
        }
        // KEMAS KINI: Masukkan sekali Abang, Kakak, Adik, Ipar & Anak Saudara untuk caj 1 Kredit
        else if (
            hubLower.includes("cucu") || hubLower.includes("cicit") || 
            hubLower.includes("piut") || hubLower.includes("cece") || 
            hubLower.includes("oneng") || hubLower.includes("menantu") ||
            hubLower.includes("abang") || hubLower.includes("kakak") || 
            hubLower.includes("adik") || hubLower.includes("ipar") || 
            hubLower.includes("anak saudara")
        ) {
            kosAhli = 1;
        }

        if (RUJUKAN[hubungan] && !rujukanId) {
            alert("Sila pilih ibu/bapa (atau pasangan) kepada siapa. Jika senarai kosong, tambah orang tu dahulu.");
            return;
        }

      // Had 2 ibu bapa — TIDAK terpakai untuk keturunan bawah dan cabang sisi!
        const hubunganDikecualikan = [
            "Menantu", "Pasangan Cucu", 
            "Cucu", "Cicit", "Piut / Cece", "Oneng-oneng", 
            "Ipar", "Anak Saudara", "Cucu Saudara" // <-- Tambahan kat sini
        ];
        
        const kecualikanHad = hubunganDikecualikan.includes(hubungan);
        
        if (rujukanId && !kecualikanHad) {
            const qSama = query(collection(db, "mynasab_nodes"), where("owner_uid", "==", penggunaSemasa.uid), where("ref_id", "==", rujukanId));
            const snapSama = await getDocs(qSama);
            if (snapSama.size >= 2) { 
                alert("Orang ini sudah ada 2 ibu bapa dalam salasilah."); 
                return; 
            }
        }

           
        const kosGambar = (failGambar && failGambar.size > 0) ? 1 : 0;
        const jumlahKos = kosAhli + kosGambar;

        if (jumlahKos > 0 && bakiTerkini < jumlahKos) {
            alert(`Baki kredit tidak mencukupi!\n\nSistem perlukan: ${jumlahKos} Kredit\n(Caj Ahli: ${kosAhli} + Caj Gambar: ${kosGambar})\n\nBaki semasa anda: ${bakiTerkini} Kredit.`);
            return;
        }

        let urlGambar = "";
        if (failGambar && failGambar.size > 0) {
            const storageRef = ref(storage, `profil_pictures/${penggunaSemasa.uid}_${Date.now()}_${failGambar.name}`);
            await uploadBytes(storageRef, failGambar);
            urlGambar = await getDownloadURL(storageRef);
        }

        await addDoc(collection(db, "mynasab_nodes"), {
            owner_uid: penggunaSemasa.uid,
            name: nama,
            relationship: hubungan,
            gender: jantina,
            ref_id: rujukanId || "",
            dob: status === 'meninggal' ? '' : dob,
            status: status,
            phone: telefon,
            email: email,
            city: bandar,
            state: negeri,
            photo_url: urlGambar,
            is_root: false,
            created_by: penggunaSemasa.uid,  // Menyimpan ID pencipta asal (Contoh: ID Awi)
            created_at: new Date()
        });

        if (jumlahKos > 0) {
            await updateDoc(refPengguna, { credit_balance: increment(-jumlahKos) });
            document.getElementById('creditBalance').innerText = bakiTerkini - jumlahKos;
        }

        alert(`Berjaya! ${nama} direkodkan.`);
        document.getElementById('modalTambahAhli').classList.add('hidden');
        document.getElementById('formTambahAhli').reset();
        document.getElementById('groupRujukan').classList.add('hidden');
        window.muatTurunSalasilah();

    } catch (error) {
        alert("Gagal menambah data: " + error.message);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = teksAsalButang;
        }
    }
};

// --- 6. KEMASKINI PROFIL AHLI (EDIT) ---
window.bukaModalEdit = async (idKotak) => {
    try {
        const docSnap = await getDoc(doc(db, "mynasab_nodes", idKotak));
        if (docSnap.exists()) {
            const data = docSnap.data();

            document.getElementById('editAhliId').value = idKotak;
            document.getElementById('editAhliNama').value = data.name || "";
            document.getElementById('editAhliHubungan').value = data.relationship || "";
            document.getElementById('editAhliDob').value = data.dob || "";
            document.getElementById('editAhliTelefon').value = data.phone || "";
            document.getElementById('editAhliEmail').value = data.email || "";
            document.getElementById('editAhliBandar').value = data.city || "";
            document.getElementById('editAhliNegeri').value = data.state || "";
            document.getElementById('editAhliJantina').value = data.gender || "";

            const statusVal = data.status === 'meninggal' ? 'meninggal' : 'hidup';
            const radioStatus = document.querySelector(`input[name="editStatus"][value="${statusVal}"]`);
            if (radioStatus) radioStatus.checked = true;
            if (window.tukarStatus) window.tukarStatus('edit');

            // Logika khusus untuk Diri Sendiri (Induk) dengan safety checks
            const groupAkaun = document.getElementById('groupEditAkaun');
            if (data.is_root && groupAkaun) {
                groupAkaun.classList.remove('hidden');
                const snapPengguna = await getDoc(doc(db, "mynasab_users", penggunaSemasa.uid));
                if (snapPengguna.exists()) {
                    const inputAkaun = document.getElementById('editAkaunKeluarga');
                    if (inputAkaun) inputAkaun.value = snapPengguna.data().name || "";
                }
                if (!data.email && window.penggunaSemasa) {
                    document.getElementById('editAhliEmail').value = window.penggunaSemasa.email;
                }
            } else if (groupAkaun) {
                groupAkaun.classList.add('hidden');
            }

            document.getElementById('modalEditAhli').classList.remove('hidden');
        }
    } catch (error) {
        alert("Gagal membuka borang edit. Ralat: " + error.message);
        console.error("Ralat Modal Edit:", error);
    }
};

const formEdit = document.getElementById('formEditAhli');
if (formEdit) {
    formEdit.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idKotak = document.getElementById('editAhliId').value;
        const groupAkaun = document.getElementById('groupEditAkaun');
        const failGambarEdit = document.getElementById('editAhliGambar').files[0];
        const radioTerpilih = document.querySelector('input[name="editStatus"]:checked');

        try {
            let dataUpdate = {
                name: document.getElementById('editAhliNama').value,
                dob: document.getElementById('editAhliDob').value,
                phone: document.getElementById('editAhliTelefon').value,
                email: document.getElementById('editAhliEmail').value,
                city: document.getElementById('editAhliBandar').value,
                state: document.getElementById('editAhliNegeri').value,
                gender: document.getElementById('editAhliJantina').value,
                status: radioTerpilih ? radioTerpilih.value : 'hidup',
                updated_at: new Date()
            };

            if (failGambarEdit) {
                const refPengguna = doc(db, "mynasab_users", penggunaSemasa.uid);
                const snapPengguna = await getDoc(refPengguna);
                const bakiTerkini = snapPengguna.data().credit_balance;

                if (bakiTerkini < 1) {
                    alert("Anda tiada kredit yang cukup (1 Kredit diperlukan) untuk menukar gambar.");
                    return;
                }

                alert("Sedang memuat naik gambar baru. Sila tunggu...");
                await updateDoc(refPengguna, { credit_balance: increment(-1) });
                document.getElementById('creditBalance').innerText = bakiTerkini - 1;

                const storageRef = ref(storage, `profil_pictures/${penggunaSemasa.uid}_${Date.now()}_${failGambarEdit.name}`);
                await uploadBytes(storageRef, failGambarEdit);
                dataUpdate.photo_url = await getDownloadURL(storageRef);
            }

            if (!groupAkaun.classList.contains('hidden')) {
                const namaAkaunBaru = document.getElementById('editAkaunKeluarga').value;
                await updateDoc(doc(db, "mynasab_users", penggunaSemasa.uid), { name: namaAkaunBaru });
                document.getElementById('treeNameDisplay').innerText = namaAkaunBaru;
            }

            await updateDoc(doc(db, "mynasab_nodes", idKotak), dataUpdate);

            alert("Profil berjaya dikemas kini!");
            document.getElementById('modalEditAhli').classList.add('hidden');
            window.muatTurunSalasilah();

        } catch (error) {
            alert("Gagal mengemas kini profil: " + error.message);
        }
    });
}

// --- 7. PREVIEW "KELUARGA SAYA" (HANYA SUSUR GALUR MENEGAK) ---
window.bukaPreview = async () => {
    if (!penggunaSemasa) return;

    const pp = document.getElementById('pilihanPaparan'); if (pp) pp.value = 'saya';

    document.getElementById('modalPreview').classList.remove('hidden');
    document.getElementById('ruangAutoLayout').innerHTML = '<p>Sedang melukis pokok keturunan...</p>';
    document.getElementById('namaAkaunCetak').innerText = document.getElementById('treeNameDisplay').innerText;

    try {
        const q = query(collection(db, "mynasab_nodes"), where("owner_uid", "==", penggunaSemasa.uid));
        const querySnapshot = await getDocs(q);

        let diriSendiri = null;
        let pasangan = [];
        let ibuBapa = [], datukNenek = [], moyang = [], buyut = [], cakawari = [], cilawagi = [];
        let mertua = [];
        let anakAnak = [], cucu = [], cicit = [], piut = [], oneng = [];
        let menantuKeturunan = [];

        const semuaId = new Set(querySnapshot.docs.map(s => s.id));

        querySnapshot.forEach((docSnap) => {
            const d = { ...docSnap.data(), id: docSnap.id };
            const hub = (d.relationship || '').toLowerCase();
            
            if (d.is_root) diriSendiri = d;
            else if (hub.includes("suami") || hub.includes("isteri")) pasangan.push(d);
            else if (hub === "ayah" || hub === "ibu") ibuBapa.push(d);
            else if (hub.includes("mertua")) mertua.push(d);
            else if (hub.includes("datuk") || hub.includes("nenek")) datukNenek.push(d);
            else if (hub.includes("moyang")) moyang.push(d);
            else if (hub.includes("buyut")) buyut.push(d);
            else if (hub.includes("cakawari")) cakawari.push(d);
            else if (hub.includes("cilawagi")) cilawagi.push(d);
            else if (hub === "anak") anakAnak.push(d);
            else if (hub === "cucu") cucu.push(d);
            else if (hub === "cicit") cicit.push(d);
            else if (hub.includes("piut") || hub.includes("cece")) piut.push(d);
            else if (hub.includes("oneng")) oneng.push(d);
            else if (hub.includes("menantu") || hub.includes("pasangan cucu")) menantuKeturunan.push(d);
            // Adik-beradik/Ipar/Anak Saudara DIABAIKAN sepenuhnya dalam paparan ini
        });

        const binaKotak = (ahli, kategory) => {
            let tema = 'theme-neutral';
            const hub = (ahli.relationship || '').toLowerCase();

            if (ahli.gender === 'L') tema = 'theme-lelaki';
            else if (ahli.gender === 'P') tema = 'theme-perempuan';
            else if (hub.match(/ayah|suami|bapa|datuk|moyang|buyut|cakawari|cilawagi/)) tema = 'theme-lelaki';
            else if (hub.match(/ibu|isteri|nenek/)) tema = 'theme-perempuan';

            let paparanAvatar = `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
            if (ahli.photo_url && ahli.photo_url !== "") {
                paparanAvatar = `<img src="${esc(ahli.photo_url)}" style="width: 100%; height: 100%; object-fit: cover;">`;
            }

            return `
                <div class="mh-card ${tema}">
                    <div class="badge-mini">${esc(ahli.relationship)}</div>
                    <div class="mh-avatar">${paparanAvatar}</div>
                    <div class="mh-details">
                        <p class="mh-name" title="${esc(ahli.name)}">${esc(ahli.name)}</p>
                        <p class="mh-info" style="font-size: 10px;">${infoLahir(ahli)}</p>
                    </div>
                </div>
            `;
        };

        const cariIbuBapa = (ahli, levels, utama) => {
            const idx = levels.findIndex(arr => arr.length > 0);
            if (idx === -1) return { senarai: [], sisa: [] };
            const senarai = levels[idx].filter(x =>
                (x.ref_id && semuaId.has(x.ref_id)) ? x.ref_id === ahli.id : utama
            );
            return { senarai, sisa: levels.slice(idx + 1) };
        };

        const lelaki = x => x.gender
            ? x.gender === 'L'
            : /ayah|bapa|datuk|suami|moyang|buyut|cakawari|cilawagi/.test((x.relationship || '').toLowerCase());

        const binaTiangAtasan = (ahli, levels = [], kategoryAhli = 'neutral', utama = true) => {
            let str = `<div class="pillar">`;
            const { senarai, sisa } = cariIbuBapa(ahli, levels, utama);

            if (senarai.length > 0) {
                const bapa = senarai.find(lelaki) || senarai[0];
                const ibu = senarai.find(x => x !== bapa);

                let kelas = "couple-wrapper ancestor-couple has-children";
                if (ibu) kelas += " has-spouse";
                const bapaAda = cariIbuBapa(bapa, sisa, true).senarai.length > 0;
                const ibuAda = ibu && cariIbuBapa(ibu, sisa, false).senarai.length > 0;
                if (bapaAda && ibuAda) kelas += " anc-both";

                str += `<div class="${kelas}">`;
                str += binaTiangAtasan(bapa, sisa, 'ibubapa', true);
                if (ibu) str += binaTiangAtasan(ibu, sisa, 'ibubapa', false);
                str += `</div>`;
            }

            str += binaKotak(ahli, kategoryAhli);
            str += `</div>`;
            return str;
        };

        const renderKeturunan = (dataSemasa, bakiLevel) => {
            if (Array.isArray(dataSemasa[0])) {
                let firstLevelIndex = dataSemasa.findIndex(arr => arr.length > 0);
                if (firstLevelIndex === -1) return '';
                bakiLevel = dataSemasa.slice(firstLevelIndex + 1);
                dataSemasa = dataSemasa[firstLevelIndex];
            }

            if (!dataSemasa || dataSemasa.length === 0) return '';
            
            dataSemasa.sort((a, b) => {
                if (!a.dob) return 1;
                if (!b.dob) return -1;
                return new Date(a.dob) - new Date(b.dob);
            });
            
            let str = `<ul>`;
            
            dataSemasa.forEach((node, index) => {
                let pasanganNodeIni = menantuKeturunan.filter(m => m.ref_id === node.id);
                let anakKepadaNode = [];
                let bakiGenerasiSeterusnya = [];
                
                if (bakiLevel && bakiLevel.length > 0) {
                    let nextLevelAll = bakiLevel[0];
                    anakKepadaNode = nextLevelAll.filter(child => child.ref_id === node.id);
                    if (index === 0) {
                        let dataYatim = nextLevelAll.filter(child => !child.ref_id || child.ref_id === "");
                        anakKepadaNode = anakKepadaNode.concat(dataYatim);
                    }
                    bakiGenerasiSeterusnya = bakiLevel.slice(1);
                }

                let adaKeturunanBawah = anakKepadaNode.length > 0;
                let classW = "couple-wrapper" + (adaKeturunanBawah ? " has-children" : "");
                if (pasanganNodeIni.length > 0) classW += " has-spouse";
                
                let gabung = [node, ...pasanganNodeIni].sort((a,b) => (a.gender === 'L' ? -1 : 1));
                
                let htmlKumpulan = '';
                gabung.forEach(p => htmlKumpulan += `<div class="pillar">${binaKotak(p, 'anak')}</div>`);
                
                str += `<li><div class="${classW}">${htmlKumpulan}</div>`;
                if (adaKeturunanBawah) {
                    str += renderKeturunan(anakKepadaNode, bakiGenerasiSeterusnya);
                }
                str += `</li>`;
            });
            
            return str + `</ul>`;
        };
        
        let htmlLayout = '<div class="tree"><ul>';
        const senaraiKeturunan = [anakAnak, cucu, cicit, piut, oneng];
        const adaKeturunan = senaraiKeturunan.some(arr => arr.length > 0);
        const adaPasangan = pasangan.length > 0;

        let classWrapper = "couple-wrapper main-couple";
        if (adaPasangan) classWrapper += " has-spouse";
        if (adaKeturunan) classWrapper += " has-children";

        let htmlMain = `<div class="${classWrapper}">`;
        const mainArray = [];
        if (diriSendiri) mainArray.push(diriSendiri);
        pasangan.forEach(p => mainArray.push(p));

        mainArray.sort((a, b) => {
            const aLelaki = a.gender === 'L' || (a.relationship || '').toLowerCase().match(/suami|ayah|bapa/);
            const bLelaki = b.gender === 'L' || (b.relationship || '').toLowerCase().match(/suami|ayah|bapa/);
            if (aLelaki && !bLelaki) return -1;
            if (!aLelaki && bLelaki) return 1;
            return 0;
        });

        mainArray.forEach((p) => {
            if (p.is_root) {
                htmlMain += binaTiangAtasan(p, [ibuBapa, datukNenek, moyang, buyut, cakawari, cilawagi], 'diri');
            } else {
                htmlMain += binaTiangAtasan(p, [mertua], 'pasangan', p === pasangan[0]);
            }
        });

        htmlMain += `</div>`;
        if (adaKeturunan) htmlMain += renderKeturunan(senaraiKeturunan);
        
        htmlLayout += `<li>${htmlMain}</li></ul></div>`;
        document.getElementById('ruangAutoLayout').innerHTML = htmlLayout;
        window.autoMuat();

    } catch (error) {
        document.getElementById('ruangAutoLayout').innerHTML = `<p style="color:red;">Gagal menjana visual: ${esc(error.message)}</p>`;
    }
};

// --- 8. SAIZ KERTAS & CETAK ---
const SAIZ_KERTAS = { A4: { w: 297, h: 210 }, A3: { w: 420, h: 297 }, A1: { w: 841, h: 594 } };
const MM = 3.78;

window.tukarSaizKertas = () => {
    const saiz = document.getElementById('pilihanSaizKertas').value;
    let st = document.getElementById('stylePage');
    if (!st) {
        st = document.createElement('style');
        st.id = 'stylePage';
        document.head.appendChild(st);
    }
    st.textContent = `@page { size: ${saiz} landscape; margin: 10mm; }`;
};

window.cetakSalasilah = () => {
    window.tukarSaizKertas();

    const saiz = document.getElementById('pilihanSaizKertas').value;
    const ruang = document.getElementById('ruangAutoLayout');
    const pokok = ruang.querySelector('.tree');
    const tajuk = document.getElementById('tajukKeluargaCetak');

    ruang.style.zoom = 1;
    if (pokok) {
        const lebarMuat = (SAIZ_KERTAS[saiz].w - 20) * MM;
        const tinggiMuat = (SAIZ_KERTAS[saiz].h - 20) * MM - tajuk.offsetHeight - 40;
        const skala = Math.min(lebarMuat / pokok.scrollWidth, tinggiMuat / pokok.scrollHeight, 3) * 0.95;
        ruang.style.zoom = skala;
    }

    window.addEventListener('afterprint', () => { ruang.style.zoom = zoomSemasa; }, { once: true });
    setTimeout(() => window.print(), 100);
};

// --- 9. DROPDOWN "RUJUKAN IKATAN KELUARGA" ---
const RUJUKAN = {
    "Datuk": ["Ayah","Ibu"], "Nenek": ["Ayah","Ibu"],
    "Moyang": ["Datuk","Nenek"], "Buyut": ["Moyang"],
    "Cakawari": ["Buyut"], "Cilawagi": ["Cakawari"],
    "Bapa Mertua": ["Isteri","Suami"], "Ibu Mertua": ["Isteri","Suami"],
    "Menantu": ["Anak"], "Pasangan Cucu": ["Cucu"],
    "Cucu": ["Anak"], 
    "Cicit": ["Cucu"], 
    "Piut / Cece": ["Cicit"], 
    "Oneng-oneng": ["Piut / Cece"],
    // 🔥 TAMBAHAN BARU UNTUK CABANG ADIK-BERADIK (MANUAL)
    "Ipar": ["Abang", "Kakak", "Adik", "Adik-beradik"],
    "Anak Saudara": ["Abang", "Kakak", "Adik", "Adik-beradik"],
    "Cucu Saudara": ["Anak Saudara"],
    // --- TAMBAH INI TUK FASA 1 ---
    "Sepupu": [
        "Bapa Saudara (Belah Ayah)", "Mak Saudara (Belah Ayah)", 
        "Bapa Saudara (Belah Ibu)", "Mak Saudara (Belah Ibu)"
    ],
    "Dua Pupuk": ["Sepupu"]
};

window.siapkanRujukan = async (hubungan) => {
    const kumpulan = document.getElementById('groupRujukan');
    const sel = document.getElementById('tambahRujukan');
    const labelRujukan = kumpulan.querySelector('label');
    const sasaran = RUJUKAN[hubungan];

    // Jika tambah Abang/Kakak/Adik, borang rujukan disembunyikan (mereka berbaris automatik dgn Diri Sendiri)
    if (!sasaran || !penggunaSemasa) { kumpulan.classList.add('hidden'); sel.innerHTML = ''; return; }

    // Ubah label soalan mengikut jenis hubungan supaya lebih tepat
    if (["Menantu", "Pasangan Cucu", "Ipar"].includes(hubungan)) {
        labelRujukan.innerText = `Suami/Isteri kepada siapa?`;
    } else if (["Cucu", "Cicit", "Piut / Cece", "Oneng-oneng", "Anak Saudara", "Cucu Saudara", "Sepupu", "Dua Pupuk"].includes(hubungan)) {
        // Sepupu & Dua Pupuk ditambah di sini ^
        labelRujukan.innerText = `Anak kepada siapa?`;
    } else {
        labelRujukan.innerText = `Ibu/bapa kepada siapa?`;
    }

    const snap = await getDocs(query(collection(db, "mynasab_nodes"), where("owner_uid", "==", penggunaSemasa.uid)));
    const pilihan = snap.docs.filter(s => sasaran.includes(s.data().relationship));
    
    let labelPilihan = sasaran.length > 2 ? "Adik-beradik / Ahli" : sasaran.join('/');

    sel.innerHTML = pilihan.length
        ? `<option value="">-- Sila Pilih --</option>` + pilihan.map(s => `<option value="${s.id}">${s.data().name} (${s.data().relationship})</option>`).join('')
        : `<option value="">-- Tambah ${labelPilihan} dahulu --</option>`;
        
    kumpulan.classList.remove('hidden');
};

// Serasi dengan pengendali lama dalam index.html (jika masih digunakan)
window.muatSenaraiRujukan = async (hubungan) => {
    if (!penggunaSemasa) return [];
    const snap = await getDocs(query(collection(db, "mynasab_nodes"), where("owner_uid", "==", penggunaSemasa.uid)));
    return snap.docs
        .filter(s => s.data().relationship === hubungan)
        .map(s => ({ id: s.id, name: s.data().name }));
};

// --- 10. JEMPUT ADIK-BERADIK ---
window.bukaJemput = async () => {
    const snap = await getDocs(query(collection(db, "mynasab_nodes"), where("owner_uid", "==", penggunaSemasa.uid)));
    const calon = snap.docs.filter(s => s.data().is_root || /suami|isteri/i.test(s.data().relationship));
    document.getElementById('jemputSasaran').innerHTML =
        calon.map(s => `<option value="${esc(s.id)}">Adik-beradik ${esc(s.data().name)}</option>`).join('');
    document.getElementById('hasilPautan').classList.add('hidden');
    window.muatMenunggu();
    document.getElementById('modalJemput').classList.remove('hidden');
};

window.janaPautan = async () => {
    const sel = document.getElementById('jemputSasaran');
    if (!sel.value) return;
    const kod = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    await setDoc(doc(db, "mynasab_invites", kod), {
        owner_uid: penggunaSemasa.uid,
        sasaran_id: sel.value,
        nama_sasaran: sel.options[sel.selectedIndex].text.replace('Adik-beradik ', ''),
        nama_pengundang: document.getElementById('treeNameDisplay').innerText,
        created_at: new Date()
    });
    document.getElementById('inputPautan').value = `${location.origin}${location.pathname}?jemput=${kod}`;
    document.getElementById('hasilPautan').classList.remove('hidden');
};

window.salinPautan = () => {
    navigator.clipboard.writeText(document.getElementById('inputPautan').value);
    alert("Pautan disalin!");
};

window.muatMenunggu = async () => {
    if (!penggunaSemasa) return;
    const elModal = document.getElementById('senaraiMenunggu');
    const elKad = document.getElementById('senaraiMenungguKad');
    const kad = document.getElementById('kadMenunggu');
    const lencana = document.getElementById('lencanaMenunggu');
    try {
        const s = await getDocs(query(collection(db, "mynasab_links"),
            where("owner_uid", "==", penggunaSemasa.uid), where("status", "==", "menunggu")));

        const baris = s.docs.map(d => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid #eee;">
                <strong style="font-size:14px;">${esc(d.data().nama)}</strong>
                <span style="white-space:nowrap;">
                    <button type="button" onclick="window.luluskanPautan('${esc(d.id)}')" style="background:#27ae60; color:#fff; border:none; border-radius:5px; padding:5px 12px; cursor:pointer;">Terima</button>
                    <button type="button" onclick="window.tolakPautan('${esc(d.id)}')" style="background:#e74c3c; color:#fff; border:none; border-radius:5px; padding:5px 12px; cursor:pointer;">Tolak</button>
                </span>
            </div>`).join('');

        if (elKad) elKad.innerHTML = baris;
        if (elModal) elModal.innerHTML = s.empty ? '' :
            '<p style="font-weight:bold; color:#d35400; margin:0 0 6px;">Menunggu kelulusan:</p>' + baris;
        if (kad) kad.classList.toggle('hidden', s.empty);
        if (lencana) { lencana.textContent = s.size; lencana.classList.toggle('hidden', s.empty); }
    } catch (e) { console.warn("Gagal muat senarai menunggu:", e.message); }
};

window.luluskanPautan = async (uid) => {
    try {
        await updateDoc(doc(db, "mynasab_links", uid), { status: 'aktif' });
        alert("Adik-beradik diterima. Mereka kini boleh dilihat dalam Keluarga Besar.");
    } catch (e) { alert("Gagal meluluskan: " + e.message); }
    window.muatMenunggu();
};

window.tolakPautan = async (uid) => {
    if (!confirm("Tolak permohonan ini?")) return;
    try { await deleteDoc(doc(db, "mynasab_links", uid)); }
    catch (e) { alert("Gagal menolak: " + e.message); }
    window.muatMenunggu();
};

// ==========================================
// 11. POKOK BESAR (KELUARGA DIPAUTKAN) - ENJIN PIVOT PERSPEKTIF
// ==========================================
window.tukarPaparan = (kekal = false) => {
    kekalZoom = (kekal === true);
    const v = document.getElementById('pilihanPaparan').value;
    if (v === 'saya') return window.bukaPreview();
    window.bukaPreviewBesar(v.replace('besar_', ''));
};

window.sembunyiAkaun = async (uid) => {
    await updateDoc(doc(db, "mynasab_users", penggunaSemasa.uid), { sembunyi: arrayUnion(uid) });
    window.tukarPaparan(true);
};
window.paparAkaun = async (uid) => {
    await updateDoc(doc(db, "mynasab_users", penggunaSemasa.uid), { sembunyi: arrayRemove(uid) });
    window.tukarPaparan(true);
};

window.bukaPreviewBesar = async (mod = 'semua') => {
    if (!penggunaSemasa) return;
    const saya = penggunaSemasa.uid;
    const ruang = document.getElementById('ruangAutoLayout');
    
    document.getElementById('modalPreview').classList.remove('hidden');
    ruang.innerHTML = '<p>Sedang melukis pokok keluarga besar...</p>';
    document.getElementById('namaAkaunCetak').innerText = document.getElementById('treeNameDisplay').innerText;

    try {
        const sLinkSaya = await getDoc(doc(db, "mynasab_links", saya));
        if (sLinkSaya.exists() && sLinkSaya.data().status !== 'aktif') {
            ruang.innerHTML = '<p>Pautan keluarga anda masih menunggu kelulusan pengundang.</p>';
            return;
        }
        
        const indukUid = sLinkSaya.exists() ? sLinkSaya.data().owner_uid : saya;
        const sayaInduk = indukUid === saya;

        const sPautan = await getDocs(query(collection(db, "mynasab_links"), where("owner_uid", "==", indukUid), where("status", "==", "aktif")));
        const pautan = sPautan.docs.map(d => d.data());
        
        const sUser = await getDoc(doc(db, "mynasab_users", saya));
        const sembunyi = (sUser.exists() && sUser.data().sembunyi) || [];

        const ambil = async (uid) => {
            try {
                const s = await getDocs(query(collection(db, "mynasab_nodes"), where("owner_uid", "==", uid)));
                return s.docs.map(d => ({ ...d.data(), id: d.id }));
            } catch (e) { 
                console.warn("Tak dapat baca nod", uid, e.message); 
                return []; 
            }
        };
        
        const nodInduk = await ambil(indukUid);
        const akaun = await Promise.all(pautan.map(async p => ({ uid: p.uid, sasaran: p.sasaran_id, nod: await ambil(p.uid) })));

        const kelompok = (nod) => {
            const k = { 
                diri: null, pasangan: [], menantu: [], ibuBapa: [], datukNenek: [], moyang: [], buyut: [], cakawari: [], cilawagi: [], mertua: [], turun: [[], [], [], [], []],
                adikBeradik: [], ipar: [], anakSaudara: [], cucuSaudara: []
            };
            nod.forEach(d => {
                const h = (d.relationship || '').toLowerCase();
                if (d.is_root) k.diri = d;
                else if (h.includes('suami') || h.includes('isteri')) k.pasangan.push(d);
                else if (h.includes('menantu') || h.includes('pasangan cucu')) k.menantu.push(d);
                else if (h === 'ayah' || h === 'ibu') k.ibuBapa.push(d);
                else if (h.includes('mertua')) k.mertua.push(d);
                else if (h.includes('datuk') || h.includes('nenek')) k.datukNenek.push(d);
                else if (h.includes('moyang')) k.moyang.push(d);
                else if (h.includes('buyut')) k.buyut.push(d);
                else if (h.includes('cakawari')) k.cakawari.push(d);
                else if (h.includes('cilawagi')) k.cilawagi.push(d);
                else if (h === 'anak') k.turun[0].push(d);
                else if (h === 'cucu') k.turun[1].push(d);
                else if (h === 'cicit') k.turun[2].push(d);
                else if (h.includes('piut') || h.includes('cece')) k.turun[3].push(d);
                else if (h.includes('oneng')) k.turun[4].push(d);
                else if (h.includes('adik') || h.includes('abang') || h.includes('kakak') || h === 'adik-beradik') k.adikBeradik.push(d);
                else if (h.includes('ipar')) k.ipar.push(d);
                else if (h.includes('anak saudara')) k.anakSaudara.push(d);
                else if (h.includes('cucu saudara')) k.cucuSaudara.push(d);
            });
            return k;
        };
        
        const kInduk = kelompok(nodInduk);
        if (!kInduk.diri) { 
            ruang.innerHTML = '<p>Data akaun induk tidak dijumpai.</p>'; 
            return; 
        }
        
        const indukRootId = kInduk.diri.id;
        
        // --- ENJIN PERSPEKTIF PUSAT (PIVOT KELUARGA) ---
        let kPusat;
        let ibuBapaPusat = [], sisaLeluhurPusat = [[], [], [], [], []];
        let sasaranIdPusat = indukRootId; 

        if (sayaInduk) {
            // Jika bos (Induk) tengok, kekalkan pusat asal
            kPusat = kInduk;
            ibuBapaPusat = kInduk.ibuBapa;
            sisaLeluhurPusat = [kInduk.datukNenek, kInduk.moyang, kInduk.buyut, kInduk.cakawari, kInduk.cilawagi];
        } else {
            // Jika Adi tengok, tukar pusat jadi Adi!
            const akaunSaya = akaun.find(a => a.uid === saya);
            if (!akaunSaya) throw new Error("Akaun anda tidak dijumpai dalam pautan aktif.");
            kPusat = kelompok(akaunSaya.nod);
            sasaranIdPusat = akaunSaya.sasaran;

            const sasaranNode = nodInduk.find(n => n.id === sasaranIdPusat);
            if (sasaranNode) {
                const rel = (sasaranNode.relationship || '').toLowerCase();
                if (rel === 'isteri' || rel === 'suami') {
                    // Ayah Anis (Mertua Awi) akan dijadikan IbuBapa Adi!
                    ibuBapaPusat = kInduk.mertua; 
                } else {
                    ibuBapaPusat = kInduk.ibuBapa;
                    sisaLeluhurPusat = [kInduk.datukNenek, kInduk.moyang, kInduk.buyut, kInduk.cakawari, kInduk.cilawagi];
                }
            }
        }

        // Gabungkan semua ID untuk rujukan silang
        let semuaIdArr = [...nodInduk.map(n => n.id)];
        akaun.forEach(a => semuaIdArr.push(...a.nod.map(n => n.id)));
        const semuaId = new Set(semuaIdArr);
        
        const sasaranUid = {};
        akaun.forEach(a => { sasaranUid[a.uid] = a.sasaran; });

        const label = (n) => {
            const h = n.relationship || '';
            if (n.is_root) {
                if (n.owner_uid === saya) return 'Diri Sendiri';
                if (n.owner_uid === indukUid) {
                    const sasaranNode = nodInduk.find(x => x.id === sasaranIdPusat);
                    if (sasaranNode && (/suami|isteri/i.test(sasaranNode.relationship || ''))) return 'Ipar';
                    return 'Adik-beradik';
                }
                if (sayaInduk) {
                    return sasaranUid[n.owner_uid] === indukRootId ? 'Adik-beradik' : 'Ipar';
                } else {
                    return sasaranUid[n.owner_uid] === sasaranIdPusat ? 'Adik-beradik' : 'Ipar';
                }
            }
            if (n.owner_uid !== saya) {
                if (!sayaInduk && n.id === sasaranIdPusat) return 'Adik-beradik'; // Anis ialah adik-beradik Adi
                if (/suami|isteri/i.test(h)) return 'Ipar';
                if (h === 'Anak') return 'Anak saudara';
                if (h === 'Cucu') return 'Cucu saudara';
                if (h === 'Cicit') return 'Cicit saudara';
                if (h === 'Menantu') return 'Ipar';
            }
            return h;
        };

        const SVG = `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;

        const binaKotak = (a, butangSembunyi = false) => {
            const h = (a.relationship || '').toLowerCase();
            let tema = 'theme-neutral';
            
            if (a.gender === 'L') tema = 'theme-lelaki';
            else if (a.gender === 'P') tema = 'theme-perempuan';
            else if (/ayah|suami|bapa|datuk|moyang|buyut|cakawari|cilawagi/.test(h)) tema = 'theme-lelaki';
            else if (/ibu|isteri|nenek/.test(h)) tema = 'theme-perempuan';
            
            const avatar = a.photo_url ? `<img src="${esc(a.photo_url)}" style="width:100%;height:100%;object-fit:cover;">` : SVG;
            const btn = butangSembunyi ? `<button class="btn-sembunyi" title="Sembunyikan keluarga ini" onclick="window.sembunyiAkaun('${esc(a.owner_uid)}')">✕</button>` : '';
            
            return `<div class="mh-card ${tema}">${btn}<div class="badge-mini">${esc(label(a))}</div><div class="mh-avatar">${avatar}</div><div class="mh-details"><p class="mh-name" title="${esc(a.name)}">${esc(a.name)}</p><p class="mh-info" style="font-size:10px;">${infoLahir(a)}</p></div></div>`;
        };

        const lelaki = x => x.gender ? x.gender === 'L' : /ayah|bapa|datuk|suami|moyang|buyut|cakawari|cilawagi/.test((x.relationship || '').toLowerCase());
        const jantinaL = x => x.gender ? x.gender === 'L' : /suami|ayah|bapa/.test((x.relationship || '').toLowerCase());
        const susunKiri = (arr) => [...arr].sort((a, b) => (jantinaL(b) ? 1 : 0) - (jantinaL(a) ? 1 : 0));

        const cariIbuBapa = (matchId, levels, utama) => {
            const idx = levels.findIndex(arr => arr.length > 0);
            if (idx === -1) return { senarai: [], sisa: [] };
            const senarai = levels[idx].filter(x => (x.ref_id && semuaId.has(x.ref_id)) ? x.ref_id === matchId : utama);
            return { senarai, sisa: levels.slice(idx + 1) };
        };

        const binaTiangAtasan = (ahli, levels = [], utama = true) => {
            let s = '<div class="pillar">';
            const { senarai, sisa } = cariIbuBapa(ahli.id, levels, utama);
            
            if (senarai.length > 0) {
                const bapa = senarai.find(lelaki) || senarai[0];
                const ibu = senarai.find(x => x !== bapa);
                let kelas = 'couple-wrapper ancestor-couple has-children';
                if (ibu) kelas += ' has-spouse';
                
                if (ibu && cariIbuBapa(bapa.id, sisa, true).senarai.length > 0 && cariIbuBapa(ibu.id, sisa, false).senarai.length > 0) {
                    kelas += ' anc-both';
                }
                s += `<div class="${kelas}">${binaTiangAtasan(bapa, sisa, true)}${ibu ? binaTiangAtasan(ibu, sisa, false) : ''}</div>`;
            }
            s += binaKotak(ahli);
            s += '</div>';
            return s;
        };

        const binaIbuBapaAtas = (senarai, sisa) => {
            const bapa = senarai.find(lelaki) || senarai[0];
            const ibu = senarai.find(x => x !== bapa);
            const bAda = cariIbuBapa(bapa.id, sisa, true).senarai.length > 0;
            const iAda = ibu && cariIbuBapa(ibu.id, sisa, false).senarai.length > 0;
            let kelas = 'couple-wrapper main-couple induk-atas has-children';
            if (ibu) kelas += ' has-spouse';
            if (bAda && iAda) kelas += ' anc-both';
            return `<div class="${kelas}">${binaTiangAtasan(bapa, sisa, true)}${ibu ? binaTiangAtasan(ibu, sisa, false) : ''}</div>`;
        };

        const renderKeturunan = (dataSemasa, bakiLevel, menantu) => {
            if (Array.isArray(dataSemasa[0])) {
                let firstLevelIndex = dataSemasa.findIndex(arr => arr.length > 0);
                if (firstLevelIndex === -1) return '';
                bakiLevel = dataSemasa.slice(firstLevelIndex + 1);
                dataSemasa = dataSemasa[firstLevelIndex];
            }

            if (!dataSemasa || dataSemasa.length === 0) return '';
            
            dataSemasa.sort((a, b) => {
                if (!a.dob) return 1;
                if (!b.dob) return -1;
                return new Date(a.dob) - new Date(b.dob);
            });
            
            let str = '<ul>';
            
            dataSemasa.forEach((node, index) => {
                let pasanganNodeIni = menantu.filter(m => m.ref_id === node.id);
                let anakKepadaNode = [];
                let bakiGenerasiSeterusnya = [];
                
                if (bakiLevel && bakiLevel.length > 0) {
                    let nextLevelAll = bakiLevel[0];
                    anakKepadaNode = nextLevelAll.filter(child => child.ref_id === node.id);
                    if (index === 0) {
                        let dataYatim = nextLevelAll.filter(child => !child.ref_id || child.ref_id === "");
                        anakKepadaNode = anakKepadaNode.concat(dataYatim);
                    }
                    bakiGenerasiSeterusnya = bakiLevel.slice(1);
                }

                let adaKeturunanBawah = anakKepadaNode.length > 0;
                let classW = "couple-wrapper" + (adaKeturunanBawah ? " has-children" : "");
                if (pasanganNodeIni.length > 0) classW += " has-spouse";
                
                let gabung = [node, ...pasanganNodeIni].sort((a,b) => (a.gender === 'L' ? -1 : 1));
                let htmlKumpulan = gabung.map(p => `<div class="pillar">${binaKotak(p)}</div>`).join('');
                
                str += `<li><div class="${classW}">${htmlKumpulan}</div>`;
                if (adaKeturunanBawah) {
                    str += renderKeturunan(anakKepadaNode, bakiGenerasiSeterusnya, menantu);
                }
                str += `</li>`;
            });
            
            return str + '</ul>';
        };

        const binaRumah = (k, orang, bolehSembunyi) => {
            const adaAnak = k.turun.some(a => a.length > 0);
            let kelas = 'couple-wrapper main-couple';
            if (orang.length > 1) kelas += ' has-spouse';
            if (adaAnak) kelas += ' has-children';
            
            let s = `<div class="${kelas}">`;
            orang.forEach(p => { 
                s += `<div class="pillar">${binaKotak(p, bolehSembunyi && p.is_root)}</div>`; 
            });
            s += '</div>';
            
            if (adaAnak) {
                let salinanTurun = k.turun.map(a => [...a]);
                s += renderKeturunan(salinanTurun, [], k.menantu); 
            }
            return s;
        };

        const tarikh = (n) => n && n.dob ? new Date(n.dob).getTime() : Infinity;
        const hiddenList = [];

        const binaSisi = (judul, jangkar, ibuBapa, sisa, sasaranIdSisi) => {
            const entri = [{ t: tarikh(jangkar.penentu), html: binaRumah(jangkar.k, jangkar.orang, false) }];
            
            // 1. Adik Beradik dari Pautan (Akaun Luar)
            akaun.filter(a => a.sasaran === sasaranIdSisi && a.uid !== jangkar.k.diri.owner_uid).forEach(a => {
                const kAkaun = kelompok(a.nod);
                if (!kAkaun.diri) return;
                
                if (sembunyi.includes(a.uid)) { 
                    hiddenList.push({ uid: a.uid, nama: kAkaun.diri.name }); 
                    return; 
                }
                
                let susunanOrang = susunKiri([kAkaun.diri, ...kAkaun.pasangan]);
                entri.push({ t: tarikh(kAkaun.diri), html: binaRumah(kAkaun, susunanOrang, a.uid !== saya) });
            });

            // 1.5. MASUKKAN KELUARGA INDUK JIKA SAYA BUKAN INDUK
            if (!sayaInduk && sasaranIdSisi === sasaranIdPusat) {
                if (sembunyi.includes(indukUid)) {
                    hiddenList.push({ uid: indukUid, nama: kInduk.diri.name });
                } else {
                    let susunanOrangInduk = susunKiri([kInduk.diri, ...kInduk.pasangan]);
                    const sasaranNode = nodInduk.find(n => n.id === sasaranIdPusat) || kInduk.diri;
                    entri.push({ t: tarikh(sasaranNode), html: binaRumah(kInduk, susunanOrangInduk, true) });
                }
            }

            // 2. Adik Beradik Manual (Ditambah dalam akaun sendiri)
            if (jangkar.k.adikBeradik && jangkar.k.adikBeradik.length > 0) {
                jangkar.k.adikBeradik.forEach(adik => {
                    const kAdik = {
                        diri: adik,
                        pasangan: jangkar.k.ipar.filter(i => i.ref_id === adik.id),
                        menantu: jangkar.k.ipar, 
                        ibuBapa: [], datukNenek: [], moyang: [], buyut: [], cakawari: [], cilawagi: [], mertua: [],
                        turun: [
                            jangkar.k.anakSaudara.filter(c => c.ref_id === adik.id),
                            jangkar.k.cucuSaudara,
                            [], [], []
                        ],
                        adikBeradik: [], ipar: [], anakSaudara: [], cucuSaudara: []
                    };
                    let susunanOrang = susunKiri([kAdik.diri, ...kAdik.pasangan]);
                    entri.push({ t: tarikh(kAdik.diri), html: binaRumah(kAdik, susunanOrang, false) });
                });
            }
            
            entri.sort((x, y) => x.t - y.t);

            let isi = '';
            if (ibuBapa.length > 0) {
                let htmlEntri = entri.map(e => `<li>${e.html}</li>`).join('');
                isi = `<ul><li>${binaIbuBapaAtas(ibuBapa, sisa)}<ul>${htmlEntri}</ul></li></ul>`;
            } else {
                let htmlEntri = entri.map(e => `<ul><li>${e.html}</li></ul>`).join('');
                isi = `<div style="display:flex; gap:60px; align-items:flex-start;">${htmlEntri}</div>`;
            }
            
            return { ada: (ibuBapa.length > 0 || entri.length > 1), judul: judul, isi: isi };
        };

        const sisi = [];
        if (mod === 'saya' || mod === 'semua') {
            const matchIdSaya = sayaInduk ? kPusat.diri.id : sasaranIdPusat;
            const { senarai, sisa } = cariIbuBapa(matchIdSaya, [ibuBapaPusat, ...sisaLeluhurPusat], true);
            let susunanOrangDiri = susunKiri([kPusat.diri, ...kPusat.pasangan]);
            sisi.push(binaSisi('Belah ' + kPusat.diri.name, { k: kPusat, orang: susunanOrangDiri, penentu: kPusat.diri }, senarai, sisa, sasaranIdPusat));
        }
        
        if (mod === 'pasangan' || mod === 'semua') {
            kPusat.pasangan.forEach((p, i) => {
                const { senarai } = cariIbuBapa(p.id, [kPusat.mertua], i === 0);
                let susunanOrangPsg = susunKiri([p, kPusat.diri]);
                const s = binaSisi('Belah ' + p.name, { k: kPusat, orang: susunanOrangPsg, penentu: p }, senarai, [], p.id);
                if (s.ada) sisi.push(s);
            });
        }
        
        if (sisi.length === 0) {
            ruang.innerHTML = '<p>Belum ada maklumat belah pasangan. Tambah Bapa/Ibu Mertua atau jemput adik-beradik pasangan.</p>';
            return;
        }

        const tunjukJudul = sisi.length > 1;
        let htmlSisi = '';
        
        for (let i = 0; i < sisi.length; i++) {
            let tajuk = '';
            if (tunjukJudul) {
                tajuk = '<h3 class="judul-belah">' + esc(sisi[i].judul) + '</h3>';
            }
            htmlSisi += '<div class="sisi-pokok">' + tajuk + sisi[i].isi + '</div>';
        }
        
        let htmlBar = '';
        if (hiddenList.length > 0) {
            let senaraiSembunyi = hiddenList.map(h => `${esc(h.nama)} <button onclick="window.paparAkaun('${esc(h.uid)}')">Papar</button>`).join(' ');
            htmlBar = `<div class="bar-sembunyi">Disembunyikan: ${senaraiSembunyi}</div>`;
        }

        ruang.innerHTML = `<div class="tree pokok-besar">${htmlSisi}</div>${htmlBar}`;
        window.autoMuat();

    } catch (error) {
        ruang.innerHTML = `<p style="color:red;">Gagal menjana pokok besar: ${esc(error.message)}</p>`;
    }
};

// --- 12. ZOOM POKOK ---
let zoomSemasa = 1;
let kekalZoom = false;
const ZOOM_MIN = 0.15, ZOOM_MAX = 2.5;

const terapZoom = (z) => {
    zoomSemasa = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
    document.getElementById('ruangAutoLayout').style.zoom = zoomSemasa;
    document.getElementById('labelZoom').innerText = Math.round(zoomSemasa * 100) + '%';
};

window.zoomMasuk = () => terapZoom(zoomSemasa * 1.2);
window.zoomKeluar = () => terapZoom(zoomSemasa / 1.2);

// Muat lebar skrin (tak pernah membesarkan melebihi 100%)
window.autoMuat = (paksa = false) => {
    if (kekalZoom && paksa !== true) { kekalZoom = false; terapZoom(zoomSemasa); return; }
    kekalZoom = false;
    const ruang = document.getElementById('ruangAutoLayout');
    const pokok = ruang.querySelector('.tree');
    if (!pokok) return;
    ruang.style.zoom = 1;
    const lebarSedia = document.getElementById('kertasCetak').clientWidth - 80;
    terapZoom(Math.min(1, lebarSedia / pokok.scrollWidth));
};

// Ctrl + roda tetikus = zoom
document.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const kertas = document.getElementById('kertasCetak');
    if (!kertas || !kertas.contains(e.target)) return;
    e.preventDefault();
    terapZoom(zoomSemasa * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
}, { passive: false });


// ==========================================
// 11.5 ENJIN PENUKARAN IDENTITI (PIVOT KELUARGA) - DIBETULKAN
// ==========================================
window.jalankanFaraid = () => {
    if (!window.dataAhliFaraid || window.dataAhliFaraid.length === 0) return;
    
    let targetId = document.getElementById('pilihanMatiFaraid').value;
    let docsData = window.dataAhliFaraid;
    let mappedData = []; 
    
    // Jika Diri Sendiri dipilih, hantar data asal terus ke kalkulator
    if (targetId === 'root' || targetId === '') {
        window.kiraFaraidAuto(docsData);
        return;
    } 
    
    let target = docsData.find(d => d.id === targetId);
    if (!target) return;
    
    let targetRel = (target.relationship || '').toLowerCase();
    
    docsData.forEach(d => {
        let dRel = (d.relationship || '').toLowerCase();
        
        if (d.id === targetId) {
            // Mangsa / Si Mati yang dipilih dijadikan Induk
            mappedData.push({ ...d, is_root: true, relationship: 'Diri Sendiri' });
        } else {
            let newRel = '';
            
            // --- JIKA SI MATI ADALAH PASANGAN (ISTERI / SUAMI) ---
            if (targetRel === 'isteri' || targetRel === 'suami') {
                if (d.is_root) newRel = targetRel === 'isteri' ? 'Suami' : 'Isteri';
                // FIX: Semua Anak, Cucu, Cicit kepada Diri Sendiri juga dianggap keturunan kepada Pasangan
                else if (dRel === 'anak' || dRel === 'cucu' || dRel === 'cicit') newRel = dRel === 'anak' ? 'Anak' : (dRel === 'cucu' ? 'Cucu' : 'Cicit'); 
                else if (dRel.includes('mertua')) newRel = dRel.includes('bapa') ? 'Bapa' : 'Ibu'; // Mertua bos adalah ibubapa pasangan
            }
            // --- JIKA SI MATI ADALAH IBU ATAU BAPA ---
            else if (targetRel === 'ayah' || targetRel === 'ibu') {
                if (d.is_root) newRel = 'Anak'; // Diri Sendiri jadi Anak
                else if (targetRel === 'ayah' && dRel === 'ibu') newRel = 'Isteri';
                else if (targetRel === 'ibu' && dRel === 'ayah') newRel = 'Suami';
                else if (dRel === 'datuk') newRel = 'Bapa';
                else if (dRel === 'nenek') newRel = 'Ibu';
                else if (dRel.includes('adik') || dRel.includes('abang') || dRel.includes('kakak')) newRel = 'Anak'; // Adik beradik bos adalah Anak kepada ibu bapa bos
            }
            // --- JIKA SI MATI ADALAH MERTUA ---
            else if (targetRel.includes('mertua')) {
                if (dRel === 'isteri' || dRel === 'suami') newRel = 'Anak'; // Pasangan bos adalah Anak kepada mertua
                else if (targetRel === 'bapa mertua' && dRel === 'ibu mertua') newRel = 'Isteri';
                else if (targetRel === 'ibu mertua' && dRel === 'bapa mertua') newRel = 'Suami';
            }
            
            // Jika hubungan baru berjaya dikenal pasti, masukkan ke senarai
            if (newRel !== '') {
                mappedData.push({ ...d, is_root: false, relationship: newRel });
            }
        }
    });
    
    // Hantar data yang telah "diterjemah" ke Enjin Faraid Pintar
    window.kiraFaraidAuto(mappedData);
};

// ==========================================
// 12. ENJIN FARAID PINTAR (OTOMATIS - 100% LOGIK AQMS)
// ==========================================
window.kiraFaraidAuto = (docs) => {
    let isteriCount = 0, suamiCount = 0;
    let bapa = 0, ibu = 0, datuk = 0, nenek = 0;
    let al = 0, ap = 0;
    let adikLelaki = 0, adikPerempuan = 0; // Tambahan untuk Waris Kedua
    let jantinaInduk = 'L'; // Asumsi Default Lelaki

    // 1. Imbas seluruh senarai keluarga dari database
   // 1. Imbas seluruh senarai keluarga dari database
    docs.forEach(d => {
        // A: Jika ini adalah si mati (Induk), dapatkan jantinanya. Si mati bukan penerima!
        if (d.is_root) { 
            jantinaInduk = d.gender || 'L'; 
            return; // Berhenti di sini untuk orang ini, teruskan ke orang seterusnya
        }
        
       // B: HALANG WARIS MENINGGAL DUNIA (Tapisan Berganda)
        if (d.status === 'meninggal' || !d.dob || d.dob.trim() === '') {
            return; // Berhenti di sini, dia takkan dikira dalam isteriCount, bapa, dll
        }

        let rel = (d.relationship || '').toLowerCase();
        let gen = d.gender;

        if (rel === 'isteri') isteriCount++;
        else if (rel === 'suami') suamiCount++;
        else if (rel === 'ayah' || rel === 'bapa') bapa = 1;
        else if (rel === 'ibu') ibu = 1;
        else if (rel.includes('datuk')) datuk = 1;
        else if (rel.includes('nenek')) nenek++;
        else if (rel === 'anak') {
            if (gen === 'L') al++;
            else if (gen === 'P') ap++;
        }
        else if (rel.includes('adik') || rel.includes('abang') || rel.includes('kakak')) {
            if (gen === 'L') adikLelaki++;
            else if (gen === 'P') adikPerempuan++;
        }
    });

    // Halang logik bercanggah dengan jantina Diri Sendiri
    if (jantinaInduk === 'P') isteriCount = 0;
    if (jantinaInduk === 'L') suamiCount = 0;

    const hasChild = (al + ap) > 0;
    const hasSiblings = (adikLelaki + adikPerempuan) >= 2;
    let results = [];
    let BASE = 24;
    let sumFardu = 0;

    // 2. PENGIRAAN FARDU
    if (isteriCount > 0) {
        results.push({ name: isteriCount > 1 ? `${isteriCount} Isteri` : 'Isteri', share: hasChild ? 3 : 6, type: 'Fardu', color: '#1abc9c' });
    }
    if (suamiCount > 0) {
        results.push({ name: 'Suami', share: hasChild ? 6 : 12, type: 'Fardu', color: '#1abc9c' });
    }
    if (ibu > 0) {
        let ibuShare = (hasChild || hasSiblings) ? 4 : 8; // 1/6 atau 1/3
        results.push({ name: 'Ibu', share: ibuShare, type: 'Fardu', color: '#3498db' });
    } else if (nenek > 0) {
        results.push({ name: 'Nenek', share: 4, type: 'Waris Ganti (Ibu)', color: '#2980b9' });
    }
    if (bapa > 0) {
        results.push({ name: 'Bapa', share: 4, type: 'Fardu', color: '#2563eb' });
    } else if (datuk > 0) {
        results.push({ name: 'Datuk', share: 4, type: 'Waris Ganti (Bapa)', color: '#818cf8' });
    }

    sumFardu = results.reduce((acc, r) => acc + r.share, 0);
    let remaining = BASE - sumFardu;

    // AUL (Penyebut meningkat jika jumlah fardu melebihi asalnya)
    if (remaining < 0) {
        results.forEach(r => { r.base = sumFardu; });
        remaining = 0;
        BASE = sumFardu;
    } else {
        results.forEach(r => { r.base = BASE; });
    }

    // 3. PENGIRAAN ASABAH (ANAK-ANAK)
    if (al > 0 || ap > 0) {
        if (al === 0) {
            // Hanya anak perempuan (Fardu)
            let share = ap === 1 ? 12 : 16;
            if (remaining < share) {
                sumFardu += share;
                results.push({ name: ap > 1 ? `${ap} Anak Perempuan` : 'Anak Perempuan', share: share, base: sumFardu, type: 'Fardu', color: '#ec4899' });
                results.forEach(r => r.base = sumFardu);
                BASE = sumFardu;
                remaining = 0;
            } else {
                results.push({ name: ap > 1 ? `${ap} Anak Perempuan` : 'Anak Perempuan', share: share, base: BASE, type: 'Fardu', color: '#ec4899' });
                remaining -= share;
            }
        } else {
            // Asabah Bil Ghayr (Lelaki : Perempuan = 2 : 1)
            let totalParts = (al * 2) + ap;
            if (remaining > 0 && totalParts > 0) {
                let shareAL = (remaining * (al * 2)) / totalParts;
                let shareAP = (remaining * ap) / totalParts;
                if (al > 0) results.push({ name: al > 1 ? `${al} Anak Lelaki` : 'Anak Lelaki', share: shareAL, base: BASE, type: 'Asabah', color: '#6366f1' });
                if (ap > 0) results.push({ name: ap > 1 ? `${ap} Anak Perempuan` : 'Anak Perempuan', share: shareAP, base: BASE, type: 'Asabah', color: '#ec4899' });
                remaining = 0;
            }
        }
    }

    // 4. BAKI (ASABAH BAPA / ADIK BERADIK / BAITULMAL)
    if (remaining > 0) {
        if (bapa > 0) {
            let b = results.find(r => r.name === 'Bapa');
            b.share += remaining;
            b.type = 'Fardu + Asabah';
            remaining = 0;
            
        } else if (datuk > 0) {
            let d = results.find(r => r.name === 'Datuk');
            d.share += remaining;
            d.type = 'Fardu + Asabah';
            remaining = 0;
            
        } else if (adikLelaki > 0 || adikPerempuan > 0) {
            // Adik beradik ambil asabah jika tiada anak lelaki & tiada bapa
            let totalParts = (adikLelaki * 2) + adikPerempuan;
            if (totalParts > 0) {
                if (adikLelaki > 0) results.push({ name: adikLelaki > 1 ? `${adikLelaki} Adik Beradik Lelaki` : 'Adik Beradik Lelaki', share: (remaining * (adikLelaki * 2)) / totalParts, base: BASE, type: 'Asabah (Waris Kedua)', color: '#9333ea' });
                if (adikPerempuan > 0) results.push({ name: adikPerempuan > 1 ? `${adikPerempuan} Adik Beradik Perempuan` : 'Adik Beradik Perempuan', share: (remaining * adikPerempuan) / totalParts, base: BASE, type: 'Asabah (Waris Kedua)', color: '#c084fc' });
                remaining = 0;
            }
        } else {
            // LOGIK BAITULMAL: Jika tak ada langsung waris lelaki untuk habiskan baki
            results.push({ name: 'Baitulmal / Baki', share: remaining, base: BASE, type: 'Baki Belum Diagih', color: '#94a3b8' });
            remaining = 0;
        }
    }

    window.renderFaraidHtml(results);
};

// 13. RENDER KAD FARAID KE HTML
window.renderFaraidHtml = (results) => {
    const box = document.getElementById('ruangKiraanFaraid');
    if (!box) return;

    if (results.length === 0) {
        box.innerHTML = `<p style="font-size:13px; color:#7f8c8d; text-align:center; padding: 20px 0;">Sila tambah waris utama (Anak/Pasangan/Ibu/Bapa) untuk melihat kiraan Faraid.</p>`;
        return;
    }

    let html = `<div style="display:flex; flex-direction:column; gap:12px;">`;
    results.forEach(r => {
        let perc = ((r.share / r.base) * 100).toFixed(1);
        let shareVal = Math.round(r.share * 100) / 100;
        
        html += `
        <div style="background:#fff; border:1px solid #e0e6ed; border-radius:10px; padding:12px 15px; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            <div style="flex:1;">
                <div style="font-weight:800; color:#2c3e50; font-size:14px; margin-bottom: 2px;">${r.name}</div>
                <div style="font-size:10px; font-weight:700; color:#95a5a6; text-transform:uppercase; letter-spacing: 0.5px;">${r.type}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:800; color:#27ae60; font-size:15px;">${shareVal}/${r.base} <span style="font-weight:600; color:#bdc3c7; font-size:12px;">(${perc}%)</span></div>
                <div style="width:70px; height:6px; background:#ecf0f1; border-radius:3px; margin-top:6px; float:right; overflow:hidden;">
                    <div style="width:${perc}%; height:100%; background:${r.color};"></div>
                </div>
            </div>
        </div>`;
    });
    html += `</div>`;
    box.innerHTML = html;
};

// =========================================================
// ENJIN CARIAN NASAB GLOBAL & MESEJ (VERSI PUSAT FOKUS DINAMIK)
// =========================================================

window.ujiCarianNasab = async () => {
    const hasilContainer = document.getElementById('hasilCarianNasab');
    const carianAsal = document.getElementById('inputCarianNama').value.trim();
    const namaCari = carianAsal.toLowerCase();
    
    const negeriCari = document.getElementById('inputCarianNegeri').value;
    const bandarCari = document.getElementById('inputCarianBandar').value.trim().toLowerCase();

    if (!namaCari) {
        alert("Sila taip sekurang-kurangnya nama untuk mula mencari.");
        return;
    }

    hasilContainer.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px;">Memeriksa salasilah seluruh negara... <i class="fa-solid fa-spinner fa-spin"></i></p>';

    try {
        // 1. Tarik semua data dari database (Sekali Sahaja)
        const nodesRef = collection(db, "mynasab_nodes");
        const snapNodes = await getDocs(query(nodesRef));
        
        let semuaNodesGlobal = [];
        snapNodes.forEach(doc => {
            semuaNodesGlobal.push({ ...doc.data(), id: doc.id });
        });

        const myUid = window.penggunaSemasa ? window.penggunaSemasa.uid : "tiada_uid";
        
        // 2. Tapis dan cari Node individu yang namanya sepadan
        let senaraiMatch = [];
        semuaNodesGlobal.forEach(node => {
            const namaNode = (node.name || '').toLowerCase();
            // Halang carian diri sendiri dan pastikan nama padan
            if (node.owner_uid !== myUid && namaNode.includes(namaCari)) {
                senaraiMatch.push(node);
            }
        });

        if (senaraiMatch.length === 0) {
            hasilContainer.innerHTML = '<p style="text-align:center; color:#ef4444; padding:20px; font-weight:bold;">Tiada rekod waris ditemui yang sepadan dengan carian ini.</p>';
            return;
        }

        let htmlHasil = '';
        let jumlahJumpa = 0;

        // 3. Proses setiap ahli yang dijumpai (Fokus Node)
        for (const focusNode of senaraiMatch) {
            const ownerUid = focusNode.owner_uid;
            
            // Dapatkan akaun tuan rumah yang pegang data ini
            const userRef = doc(db, "mynasab_users", ownerUid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                const namaAkaunKhas = userData.name || 'Akaun Tanpa Nama';

                // Asingkan senarai ahli khusus untuk keluarga akaun ini sahaja
                const senaraiKeluargaIni = semuaNodesGlobal.filter(n => n.owner_uid === ownerUid);
                const rootNode = senaraiKeluargaIni.find(n => n.is_root === true || n.relationship === "Diri Sendiri (Induk)");
                
                let namaIndividu = rootNode ? rootNode.name : "";
                
                // Paparan Nama Akaun (Cth: Dahanis Famili (Hasnawi Bin Che Harun))
                let paparanAkaun = namaAkaunKhas;
                if (namaIndividu && namaIndividu.toLowerCase() !== namaAkaunKhas.toLowerCase()) {
                    paparanAkaun = `${namaAkaunKhas} (${namaIndividu})`;
                }

                const padanNegeri = negeriCari === "" || (userData.negeri === negeriCari);
                const padanBandar = bandarCari === "" || (userData.bandar || '').toLowerCase().includes(bandarCari);

                if (padanNegeri && padanBandar) {
                    
                    // Panggil fungsi penjana Nasab berpusatkan ahli yang dicari (focusNode)
                    const kotakNasabPenuh = binaRantaianNasabFokus(focusNode, senaraiKeluargaIni, rootNode);
                    
                    htmlHasil += `
                        <div class="hasil-card" style="background:#fff; border:1px solid #e2e8f0; padding:15px; border-radius:10px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                            <div style="flex:1; padding-right:10px;">
                                <h4 style="margin:0 0 5px 0; color:#334155; font-size:14px; line-height:1.4;">
                                    Akaun myNasab: <strong style="color:#8e44ad;">${paparanAkaun}</strong><br>
                                    Individu Dijumpai: <strong style="font-size:16px; color:#0f172a;">${focusNode.name}</strong>
                                </h4>
                                
                                ${kotakNasabPenuh}
                                
                                <small style="color:#64748b;"><i class="fa-solid fa-location-dot" style="color:#f87171;"></i> ${userData.bandar || 'Tidak dinyatakan'}, ${userData.negeri || 'Tidak dinyatakan'}</small>
                            </div>
                            <button onclick="bukaMesejNasab('${ownerUid}', '${paparanAkaun.replace(/'/g, "\\'")}')" class="btn-action" style="background:#3b82f6; color:white; padding:8px 15px; font-size:12px; border-radius:6px; cursor:pointer; border:none; display:flex; gap:5px; align-items:center; white-space:nowrap; height:fit-content;">
                                <i class="fa-regular fa-paper-plane"></i> Hantar Mesej
                            </button>
                        </div>
                    `;
                    jumlahJumpa++;
                }
            }
        }

        if (jumlahJumpa === 0) {
            hasilContainer.innerHTML = '<p style="text-align:center; color:#ef4444; padding:20px; font-weight:bold;">Terdapat padanan nama, tetapi tidak melepasi tapisan negeri/daerah.</p>';
        } else {
            hasilContainer.innerHTML = htmlHasil;
        }

    } catch (error) {
        console.error("Ralat Carian:", error);
        hasilContainer.innerHTML = '<p style="text-align:center; color:#ef4444; padding:20px;">Gagal menarik data. Sila semak sambungan internet anda.</p>';
    }
};

// =========================================================
// 2. Fungsi Pembantu: Jejak Nasab Berpusatkan Individu Dicari
// =========================================================
const binaRantaianNasabFokus = (focusNode, senaraiNodes, rootNode) => {
    try {
        if (!focusNode) return "Tiada Maklumat";

        // Tentukan jantina individu yang dicari secara pintar
        const cekLelaki = (n) => {
            if (n.gender === "L" || n.gender === "Lelaki") return true;
            if (n.gender === "P" || n.gender === "Perempuan") return false;
            const rel = (n.relationship || "").toLowerCase();
            if (rel.match(/ayah|suami|bapa|datuk|moyang|buyut|cakawari|cilawagi|abang/)) return true;
            if (rel.match(/ibu|isteri|emak|nenek|kakak/)) return false;
            return null; // Tidak diketahui
        };

        const isLelaki = cekLelaki(focusNode);
        const gelaranIbuBapa = (isLelaki === false) ? "Ibu" : "Ayah";

       // Fungsi cari Ibu & Bapa kepada sebarang Node
        const cariIbuBapaNode = (cNode) => {
            const rel = (cNode.relationship || "").toLowerCase();
            let bapa, ibu;
            
            if (cNode.is_root || rel.includes("diri sendiri")) {
                bapa = senaraiNodes.find(n => {
                    const r = (n.relationship || "").toLowerCase();
                    return (r === "ayah" || r === "bapa") && (n.ref_id === cNode.id || !n.ref_id || n.ref_id === "");
                });
                ibu = senaraiNodes.find(n => {
                    const r = (n.relationship || "").toLowerCase();
                    return (r === "ibu" || r === "emak") && (n.ref_id === cNode.id || !n.ref_id || n.ref_id === "");
                });
            
            } else if (rel === "isteri" || rel === "suami") {
                bapa = senaraiNodes.find(n => (n.relationship || "").toLowerCase() === "bapa mertua" && (n.ref_id === cNode.id || (rootNode && n.ref_id === rootNode.id) || !n.ref_id || n.ref_id === ""));
                ibu = senaraiNodes.find(n => (n.relationship || "").toLowerCase() === "ibu mertua" && (n.ref_id === cNode.id || (rootNode && n.ref_id === rootNode.id) || !n.ref_id || n.ref_id === ""));
            
            } else if (rel === "ayah" || rel === "bapa" || rel === "ibu" || rel === "emak") {
                // DILONGGARKAN: Cari Datuk/Nenek walaupun ref_id terikat pada Induk atau kosong
                bapa = senaraiNodes.find(n => (n.relationship || "").toLowerCase() === "datuk" && cekLelaki(n) === true && (n.ref_id === cNode.id || (rootNode && n.ref_id === rootNode.id) || !n.ref_id || n.ref_id === ""));
                ibu = senaraiNodes.find(n => (n.relationship || "").toLowerCase() === "nenek" && cekLelaki(n) === false && (n.ref_id === cNode.id || (rootNode && n.ref_id === rootNode.id) || !n.ref_id || n.ref_id === ""));
            
            } else if (rel === "datuk" || rel === "nenek") {
                // DILONGGARKAN: Cari Moyang walaupun ref_id terikat pada Induk atau kosong
                bapa = senaraiNodes.find(n => (n.relationship || "").toLowerCase() === "moyang" && cekLelaki(n) === true && (n.ref_id === cNode.id || (rootNode && n.ref_id === rootNode.id) || !n.ref_id || n.ref_id === ""));
                ibu = senaraiNodes.find(n => (n.relationship || "").toLowerCase() === "moyang" && cekLelaki(n) === false && (n.ref_id === cNode.id || (rootNode && n.ref_id === rootNode.id) || !n.ref_id || n.ref_id === ""));
            
            } else if (rel === "moyang") {
                bapa = senaraiNodes.find(n => (n.relationship || "").toLowerCase() === "buyut" && cekLelaki(n) === true && (n.ref_id === cNode.id || (rootNode && n.ref_id === rootNode.id) || !n.ref_id || n.ref_id === ""));
                ibu = senaraiNodes.find(n => (n.relationship || "").toLowerCase() === "buyut" && cekLelaki(n) === false && (n.ref_id === cNode.id || (rootNode && n.ref_id === rootNode.id) || !n.ref_id || n.ref_id === ""));
            
            } else if (rel === "anak") {
                let parent1 = senaraiNodes.find(n => n.id === cNode.ref_id);
                if (!parent1 && rootNode) parent1 = rootNode; 
                
                if (parent1) {
                    if (cekLelaki(parent1) === true) bapa = parent1;
                    else ibu = parent1;
                    
                    let spouse = senaraiNodes.find(n => {
                        const r = (n.relationship || "").toLowerCase();
                        return (r === "isteri" || r === "suami") && (n.ref_id === parent1.id || parent1.ref_id === n.id || n.is_root || parent1.is_root);
                    });
                    if (spouse) {
                        if (cekLelaki(spouse) === true) bapa = spouse;
                        else ibu = spouse;
                    }
                }
            }
            return { bapa, ibu };
        };
        
        // Fungsi Jejak Susur Galur ke Atas
        const traceNasab = (isBelahIbu) => {
            let rantaian = focusNode.name;
            let currentChild = focusNode;
            
            let parents = cariIbuBapaNode(currentChild);
            let parent1 = isBelahIbu ? parents.ibu : parents.bapa;

            if (parent1 && parent1.name) {
                let statusLelaki = cekLelaki(currentChild);
                let connector1 = (statusLelaki === true) ? " bin " : ((statusLelaki === false) ? " binti " : " bin/binti ");
                rantaian += connector1 + parent1.name;
                
                currentChild = parent1;
                
                let failsafe = 0;
                while(currentChild && failsafe < 5) {
                    failsafe++;
                    let nextParents = cariIbuBapaNode(currentChild);
                    let bapaSeterusnya = nextParents.bapa; 
                    
                    if (bapaSeterusnya && bapaSeterusnya.name) {
                        let statNext = cekLelaki(currentChild);
                        let connectorNext = (statNext === true) ? " bin " : ((statNext === false) ? " binti " : " bin/binti ");
                        rantaian += connectorNext + bapaSeterusnya.name;
                        currentChild = bapaSeterusnya;
                    } else {
                        break;
                    }
                }
            } else {
                rantaian += " (Tiada Maklumat)";
            }
            return rantaian;
        };

        let nasabBapa = traceNasab(false);
        let nasabIbu = traceNasab(true);

        // Cari Pasangan kepada Fokus Node
        const cariPasanganNode = (cNode) => {
            const rel = (cNode.relationship || "").toLowerCase();
            if (cNode.is_root || rel.includes("diri sendiri")) {
                return senaraiNodes.filter(n => n.relationship === "Isteri" || n.relationship === "Suami");
            } else if (rel === "isteri" || rel === "suami") {
                return senaraiNodes.filter(n => n.is_root || (n.relationship || "").toLowerCase().includes("diri sendiri"));
            } else if (rel === "ayah" || rel === "bapa") {
                return senaraiNodes.filter(n => n.relationship === "Ibu" || n.relationship === "Emak");
            } else if (rel === "ibu" || rel === "emak") {
                return senaraiNodes.filter(n => n.relationship === "Ayah" || n.relationship === "Bapa");
            } else if (rel.includes("datuk")) {
                return senaraiNodes.filter(n => n.relationship === "Nenek" && n.ref_id === cNode.ref_id);
            } else if (rel.includes("nenek")) {
                return senaraiNodes.filter(n => n.relationship === "Datuk" && n.ref_id === cNode.ref_id);
            } else if (rel === "anak") {
                return senaraiNodes.filter(n => n.relationship === "Menantu" && n.ref_id === cNode.id);
            }
            return [];
        };

        const pasangan = cariPasanganNode(focusNode);
        let teksPasangan = "Tiada Maklumat";
        if (pasangan.length > 0) {
            teksPasangan = pasangan.map(p => p.name).join(', ');
        }

        // Cari Anak-anak kepada Fokus Node
        const cariAnakNode = (cNode) => {
            const rel = (cNode.relationship || "").toLowerCase();
            if (cNode.is_root || rel.includes("diri sendiri")) {
                return senaraiNodes.filter(n => n.relationship === "Anak");
            } else if (rel === "isteri" || rel === "suami") {
                return senaraiNodes.filter(n => n.relationship === "Anak" && (n.ref_id === cNode.id || n.ref_id === (rootNode?rootNode.id:"") || !n.ref_id));
            } else if (rel === "ayah" || rel === "ibu" || rel === "bapa" || rel === "emak") {
                return senaraiNodes.filter(n => n.is_root || (n.relationship || "").toLowerCase().includes("diri sendiri") || n.relationship === "Adik-beradik" || n.relationship === "Abang" || n.relationship === "Kakak" || n.relationship === "Adik");
            } else if (rel.includes("datuk") || rel.includes("nenek")) {
                return senaraiNodes.filter(n => n.relationship === "Ayah" || n.relationship === "Ibu" || n.relationship === "Bapa Saudara" || n.relationship === "Ibu Saudara"); 
            } else if (rel === "anak") {
                return senaraiNodes.filter(n => n.relationship === "Cucu" && n.ref_id === cNode.id);
            }
            return [];
        };

        const anakAnak = cariAnakNode(focusNode);
        let teksAnak = "Tiada Maklumat";
        if (anakAnak.length > 0) {
            teksAnak = anakAnak.map(a => a.name).join(', ');
        }

        return `
            <div style="margin:10px 0; font-size:12px; color:#064e3b; background:#ecfdf5; padding:12px; border-radius:8px; border:1px solid #a7f3d0; line-height:1.7;">
                <div style="margin-bottom:2px;"><strong style="color:#047857;">1. Nasab Bapa:</strong> ${nasabBapa}</div>
                <div style="margin-bottom:2px;"><strong style="color:#047857;">2. Nasab Ibu:</strong> ${nasabIbu}</div>
                <div style="margin-bottom:2px;"><strong style="color:#047857;">3. Pasangan:</strong> ${teksPasangan}</div>
                <div><strong style="color:#047857;">4. ${gelaranIbuBapa} Kepada:</strong> ${teksAnak}</div>
            </div>
        `;
    } catch (e) {
        console.error("Ralat bina nasab fokus", e);
        return `<div style="color:red; font-size:12px;">Gagal memuatkan profil keluarga</div>`; 
    }
};

// 3. Simpan UID Penerima ke Memori
window.bukaMesejNasab = (uidPenerima, namaPenerima) => {
    window.uidPenerimaSemasa = uidPenerima; 
    document.getElementById('namaPenerimaMesej').innerText = namaPenerima;
    document.getElementById('ruangMesejNasab').style.display = 'block';
    document.getElementById('ruangMesejNasab').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// 4. Hantar Mesej ke Firebase
window.hantarMesejUjian = async () => {
    const teks = document.getElementById('teksMesejNasab').value;
    const penerimaUid = window.uidPenerimaSemasa; 
    
    if(!teks.trim()) {
        alert("Sila taip sesuatu mesej sebelum hantar.");
        return;
    }

    // Guna auth.currentUser dari Firebase (Cara paling selamat)
    const userAktif = auth.currentUser;

    if (!userAktif) {
        alert("Ralat: Sistem gagal mengesan sesi log masuk anda. Sila log masuk semula.");
        return;
    }

    try {
        await addDoc(collection(db, "mynasab_messages"), {
            penghantar_uid: userAktif.uid,
            penghantar_nama: userAktif.email.split('@')[0], 
            penerima_uid: penerimaUid,
            mesej: teks,
            tarikh: new Date().toISOString(),
            status_baca: false
        });

        alert("Mesej anda telah berjaya dihantar ke Peti Mesej waris!");
        window.tutupMesejNasab();
    } catch (error) {
        console.error("Ralat Hantar Mesej:", error);
        alert("Gagal: " + error.message);
    }
};

// =========================================================
// ENJIN PETI MESEJ (INBOX) & BALASAN
// =========================================================

// Buka Peti Mesej & Tarik Data
window.bukaPetiMesej = async () => {
    document.getElementById('modalPetiMesej').style.display = 'flex';
    const container = document.getElementById('senaraiPetiMesej');
    container.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px;">Menyemak peti mesej... <i class="fa-solid fa-spinner fa-spin"></i></p>';

    const userAktif = window.penggunaSemasa || (typeof auth !== 'undefined' ? auth.currentUser : null);
    if (!userAktif) {
        container.innerHTML = '<p style="text-align:center; color:#ef4444;">Sila log masuk untuk melihat mesej.</p>';
        return;
    }

    try {
        const q = query(
            collection(db, "mynasab_messages"), 
            where("penerima_uid", "==", userAktif.uid), 
            orderBy("tarikh", "desc")
        );
        
        const snap = await getDocs(q);
        
        if (snap.empty) {
            container.innerHTML = `
                <div style="text-align:center; padding:30px 10px;">
                    <i class="fa-regular fa-folder-open" style="font-size:40px; color:#cbd5e1; margin-bottom:15px;"></i>
                    <p style="color:#64748b; font-weight:bold; margin:0;">Tiada mesej diterima setakat ini.</p>
                </div>`;
            return;
        }

        let htmlContent = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const idMesej = docSnap.id; // Ini ID sebenar dari Firebase
            
            const statusDot = data.status_baca ? '' : '<span style="display:inline-block; width:8px; height:8px; background:#ef4444; border-radius:50%; margin-left:8px;" title="Mesej Baru"></span>';
            const bgStyle = data.status_baca ? 'background:#ffffff; border:1px solid #e2e8f0;' : 'background:#f0fdf4; border:1px solid #86efac;';
            const formatTarikh = new Date(data.tarikh).toLocaleDateString('ms-MY', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
            
            // KITA GUNA CANTUMAN (+) SUPAYA SISTEM TAK KELIRU LAGI
            htmlContent += `
                <div style="padding:15px; border-radius:12px; margin-bottom:12px; ${bgStyle} box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid ${data.status_baca ? '#f1f5f9' : '#dcfce3'}; padding-bottom:8px;">
                        <strong style="color:#0f172a; font-size:14px;"><i class="fa-regular fa-user" style="color:#64748b; margin-right:5px;"></i> ${data.penghantar_nama} ${statusDot}</strong>
                        <small style="color:#64748b; font-size:11px;">${formatTarikh}</small>
                    </div>
                    <p style="margin:0; font-size:13px; color:#334155; line-height:1.6;">${data.mesej}</p>
                    
                    <div style="margin-top:12px; display:flex; justify-content:flex-end; gap:8px;">
                        <button onclick="paparKotakBalas('` + idMesej + `')" style="background:#3b82f6; color:white; border:none; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer;">
                            <i class="fa-solid fa-reply"></i> Balas
                        </button>
                        
                        ${!data.status_baca ? `
                            <button onclick="tandakanMesejDibaca('` + idMesej + `')" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer;">
                                Tandakan Dibaca ✓
                            </button>
                        ` : ''}

<button onclick="padamMesej('` + idMesej + `')" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer;">
                            Padam 🗑️
                        </button>
                        
                    </div>

                    <div id="kotakBalas_` + idMesej + `" style="display:none; margin-top:15px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                        <textarea id="teksBalas_` + idMesej + `" rows="2" style="width:100%; border:1px solid #cbd5e1; border-radius:6px; padding:8px; font-size:12px; margin-bottom:8px; outline:none; box-sizing:border-box; font-family:inherit;" placeholder="Taip balasan..."></textarea>
                        <div style="text-align:right;">
                            <button onclick="hantarBalasanMesej('` + idMesej + `', '` + data.penghantar_uid + `')" style="background:#059669; color:white; border:none; padding:6px 15px; border-radius:6px; font-size:12px; font-weight:bold; cursor:pointer;">
                                Hantar Balasan <i class="fa-solid fa-paper-plane ml-1"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = htmlContent;
        
    } catch (error) {
        console.error("Ralat Tarik Mesej:", error);
        container.innerHTML = `<p style="text-align:center; color:#ef4444; padding:20px;">Gagal memuatkan mesej. Ralat: ${error.message}</p>`;
    }
};

// Tutup Peti Mesej
window.tutupPetiMesej = () => {
    document.getElementById('modalPetiMesej').style.display = 'none';
};

// Tandakan mesej sebagai 'Telah Dibaca' di Firebase
window.tandakanMesejDibaca = async (docId) => {
    try {
        await updateDoc(doc(db, "mynasab_messages", docId), { status_baca: true });
        window.bukaPetiMesej(); // Refresh 
    } catch (error) { 
        console.error("Gagal update status:", error);
        alert("Ralat Firebase: " + error.message);
    }
};

// Buka tutup kotak balas
window.paparKotakBalas = (idMesej) => {
    const kotak = document.getElementById('kotakBalas_' + idMesej);
    if(kotak.style.display === 'none') {
        kotak.style.display = 'block';
    } else {
        kotak.style.display = 'none';
    }
};

// Hantar mesej balasan ke Firebase
window.hantarBalasanMesej = async (idMesej, uidPenerima) => {
    const teks = document.getElementById('teksBalas_' + idMesej).value;
    if(!teks.trim()) {
        alert("Sila taip sesuatu sebelum hantar balasan.");
        return;
    }

    const userAktif = window.penggunaSemasa || (typeof auth !== 'undefined' ? auth.currentUser : null);
    
    try {
        await addDoc(collection(db, "mynasab_messages"), {
            penghantar_uid: userAktif.uid,
            penghantar_nama: userAktif.email.split('@')[0], 
            penerima_uid: uidPenerima,
            mesej: teks,
            tarikh: new Date().toISOString(),
            status_baca: false
        });
        
        await updateDoc(doc(db, "mynasab_messages", idMesej), { status_baca: true });
        alert("Mesej balasan anda telah berjaya dihantar!");
        window.bukaPetiMesej(); 
        
    } catch (error) {
        console.error("Gagal balas mesej:", error);
        alert("Gagal menghantar balasan: " + error.message);
    }
};

window.padamMesej = async (mesejId) => {
    // Memunculkan popup konfirmasi
    const sahkan = confirm("Adakah anda pasti mahu memadam mesej ini?"); 
    
    if (sahkan) {
        try {
            // Memadam dokumen di Firebase
            await deleteDoc(doc(db, "mynasab_messages", mesejId));
            console.log("Mesej berjaya dipadam.");
            
            // KEMAS KINI PAPARAN: Panggil semula fungsi buka peti supaya mesej tadi ghaib dari skrin
            window.bukaPetiMesej(); 
            
        } catch (error) {
            console.error("Gagal memadam mesej:", error);
            alert("Ralat: Tidak dapat memadam mesej.");
        }
    }
};


// =========================================================
// SISTEM NOTIFIKASI MESEJ (REAL-TIME & APP BADGE)
// =========================================================
window.pantauMesejBaru = (uid) => {
    const q = query(
        collection(db, "mynasab_messages"),
        where("penerima_uid", "==", uid),
        where("status_baca", "==", false)
    );

    onSnapshot(q, (snapshot) => {
        const jumlahBaru = snapshot.docs.length;
        
        // 1. Kemas kini Lencana pada Butang Dalam Aplikasi
        const lencana = document.getElementById('lencanaMesejBaru');
        if (lencana) {
            if (jumlahBaru > 0) {
                lencana.style.display = 'inline-block';
                lencana.innerText = jumlahBaru;
            } else {
                lencana.style.display = 'none';
            }
        }

        // 2. Kemas kini Ikon di Telefon (App Badging API) & Tab Browser
        if (jumlahBaru > 0) {
            // Hanya tolak nombor ke ikon Home Screen JIKA dibuka sebagai Aplikasi (PWA)
            if (navigator.setAppBadge && window.matchMedia('(display-mode: standalone)').matches) {
                navigator.setAppBadge(jumlahBaru).catch(e => console.log("Badging API tidak disokong", e));
            }
            // Letak nombor di tab/favicon browser (Cth: "(2) myNasab")
            document.title = `(${jumlahBaru}) myNasab - Famili Pintar`;
        } else {
            // Buang nombor jika tiada mesej
            if (navigator.clearAppBadge && window.matchMedia('(display-mode: standalone)').matches) {
                navigator.clearAppBadge().catch(e => console.log("Badging API tidak disokong", e));
            }
            document.title = `myNasab - Famili Pintar`; 
        }
    });
};

// Pastikan arrayUnion diimport di bahagian atas fail app.js bos jika belum ada:
// import { arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- FUNGSI 1: HANTAR MESEJ (BIASA & PAUTAN) ---
window.hantarMesejSebenar = async () => {
    const teks = document.getElementById('teksMesejNasab').value;
    const jenis = document.getElementById('jenisMesejNasab').value;
    const uidPenerima = window.uidPenerimaSemasa; // Tarik dari memori

    if (!uidPenerima || uidPenerima === 'undefined') return alert("Ralat: ID waris tidak dijumpai di pangkalan data.");
    if (!teks.trim()) return alert("Sila taip sesuatu mesej.");
    
    try {
        const btn = event.currentTarget;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menghantar...`;
        btn.disabled = true;

        await addDoc(collection(db, "mynasab_requests"), {
            pemohon_uid: penggunaSemasa.uid,
            penghantar_nama: (penggunaSemasa.email || '').split('@')[0], 
            penerima_uid: uidPenerima,
            mesej: teks,
            jenis: jenis, // Tanda sebagai "biasa" atau "pautan"
            status: jenis === "pautan" ? "menunggu" : "belum_baca", 
            tarikh: new Date().toISOString()
        });
        
        alert(jenis === "pautan" ? "Salaman dihulur! Permohonan pautan dihantar." : "Mesej berjaya dihantar ke Peti Mesej waris!");
        window.tutupMesejNasab();
        
        btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Hantar`;
        btn.disabled = false;
    } catch (e) {
        console.error("Gagal hantar mesej:", e);
        alert("Gagal menghantar. Sila cuba lagi.");
    }
};

window.tutupMesejNasab = () => {
    document.getElementById('ruangMesejNasab').style.display = 'none';
    document.getElementById('teksMesejNasab').value = ''; 
};

// --- FUNGSI 2: BACA PETI MESEJ PINTAR ---
window.bukaPetiMesej = async () => {
    document.getElementById('modalPetiMesej').style.display = 'flex';
    const senarai = document.getElementById('senaraiPetiMesej');
    senarai.innerHTML = '<p style="text-align:center; color:#64748b;">Memuatkan mesej...</p>';
    
    try {
        // Tarik semua mesej & pautan yang dituju kepada pengguna
        const q = query(collection(db, "mynasab_requests"), where("penerima_uid", "==", penggunaSemasa.uid), where("status", "in", ["menunggu", "belum_baca", "dibaca"]));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            senarai.innerHTML = `
                <div style="text-align:center; padding:30px 10px;">
                    <i class="fa-regular fa-folder-open" style="font-size:40px; color:#cbd5e1; margin-bottom:15px;"></i>
                    <p style="color:#64748b; font-weight:bold; margin:0;">Tiada mesej diterima setakat ini.</p>
                </div>`;
            return;
        }

        let html = '';
        snap.forEach(d => {
            const data = d.data();
            const isPautan = data.jenis === "pautan" && data.status === "menunggu";
            const isUnread = data.status === "belum_baca" || data.status === "menunggu";
            
            const statusDot = isUnread ? '<span style="display:inline-block; width:8px; height:8px; background:#ef4444; border-radius:50%; margin-left:8px;" title="Mesej Baru"></span>' : '';
            const namaPenghantar = data.penghantar_nama || "Waris";
            const formatTarikh = new Date(data.tarikh).toLocaleDateString('ms-MY', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

            html += `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:10px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                    <strong style="color:#0f172a; font-size:14px;"><i class="fa-regular fa-user" style="color:#64748b; margin-right:5px;"></i> ${namaPenghantar} ${statusDot}</strong>
                    <small style="color:#64748b; font-size:11px;">${formatTarikh}</small>
                </div>
                <p style="font-size:12px; font-weight:bold; color:${isPautan ? '#0ea5e9' : '#8b5cf6'}; text-transform:uppercase; margin:0 0 5px 0;">
                    ${isPautan ? '🤝 Permohonan Cantuman Pokok' : '💬 Mesej Biasa'}
                </p>
                <p style="margin:0 0 15px 0; font-size:14px; font-weight:bold; color:#1e293b; background:#f8fafc; padding:10px; border-radius:8px;">"${data.mesej}"</p>
                
                <div style="display:flex; gap:10px;">
                ${isPautan ? `
                    <button onclick="window.terimaPautan('${d.id}', '${data.pemohon_uid}')" style="background:#10b981; color:white; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; flex:1;">Terima Salaman</button>
                    <button onclick="window.padamMesej('${d.id}', 'tolak')" style="background:#ef4444; color:white; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; flex:1;">Tolak</button>
                ` : `
                    <button onclick="window.paparKotakBalas('${d.id}')" style="background:#3b82f6; color:white; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; flex:1;">Balas</button>
                    ${data.status === "belum_baca" ? `<button onclick="window.tandakanMesejDibaca('${d.id}')" style="background:#10b981; color:white; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; flex:1;">Tandakan Dibaca ✓</button>` : ''}
                    <button onclick="window.padamMesej('${d.id}', 'padam')" style="background:transparent; color:#ef4444; border:1px solid #ef4444; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; flex:1;">Padam</button>
                `}
                </div>

                ${!isPautan ? `
                <div id="kotakBalas_${d.id}" style="display:none; margin-top:15px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                    <textarea id="teksBalas_${d.id}" rows="2" style="width:100%; border:1px solid #cbd5e1; border-radius:6px; padding:8px; font-size:12px; margin-bottom:8px; outline:none; box-sizing:border-box; font-family:inherit;" placeholder="Taip balasan..."></textarea>
                    <div style="text-align:right;">
                        <button onclick="window.hantarBalasanMesej('${d.id}', '${data.pemohon_uid}')" style="background:#059669; color:white; border:none; padding:6px 15px; border-radius:6px; font-size:12px; font-weight:bold; cursor:pointer;">
                            Hantar Balasan <i class="fa-solid fa-paper-plane ml-1"></i>
                        </button>
                    </div>
                </div>
                ` : ''}
            </div>`;
        });
        
        senarai.innerHTML = html;
        
    } catch (e) {
        console.error(e);
        senarai.innerHTML = '<p style="text-align:center; color:#ef4444;">Gagal memuatkan peti mesej.</p>';
    }
};

window.tandakanMesejDibaca = async (docId) => {
    await updateDoc(doc(db, "mynasab_requests", docId), { status: "dibaca" });
    window.bukaPetiMesej();
};

window.padamMesej = async (id, jenis) => {
    const msg = jenis === 'tolak' ? "Tolak permohonan pautan ini?" : "Adakah anda pasti mahu memadam mesej ini?";
    if (confirm(msg)) {
        await updateDoc(doc(db, "mynasab_requests", id), { status: "dipadam" });
        window.bukaPetiMesej();
    }
};

// Buka tutup kotak balas
window.paparKotakBalas = (idMesej) => {
    const kotak = document.getElementById('kotakBalas_' + idMesej);
    kotak.style.display = kotak.style.display === 'none' ? 'block' : 'none';
};

// Hantar mesej balasan ke Firebase
window.hantarBalasanMesej = async (idMesej, uidPenerima) => {
    const teks = document.getElementById('teksBalas_' + idMesej).value;
    if(!teks.trim()) return alert("Sila taip sesuatu sebelum hantar balasan.");

    try {
        // Hantar mesej baru
        await addDoc(collection(db, "mynasab_requests"), {
            pemohon_uid: penggunaSemasa.uid,
            penghantar_nama: (penggunaSemasa.email || '').split('@')[0], 
            penerima_uid: uidPenerima,
            mesej: teks,
            jenis: "biasa",
            status: "belum_baca",
            tarikh: new Date().toISOString()
        });
        
        // Tandakan mesej asal sebagai dibaca secara automatik
        await updateDoc(doc(db, "mynasab_requests", idMesej), { status: "dibaca" });
        
        alert("Mesej balasan anda telah berjaya dihantar!");
        window.bukaPetiMesej(); 
    } catch (error) {
        console.error("Gagal balas mesej:", error);
        alert("Gagal menghantar balasan: " + error.message);
    }
};

// --- FUNGSI 2: BACA PETI MESEJ PINTAR ---
window.bukaPetiMesej = async () => {
    document.getElementById('modalPetiMesej').style.display = 'flex';
    const senarai = document.getElementById('senaraiPetiMesej');
    senarai.innerHTML = '<p style="text-align:center; color:#64748b;">Memuatkan mesej...</p>';
    
    try {
        const q = query(collection(db, "mynasab_requests"), where("penerima_uid", "==", penggunaSemasa.uid), where("status", "in", ["menunggu", "belum_baca", "dibaca"]));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            senarai.innerHTML = `
                <div style="text-align:center; padding:30px 10px;">
                    <i class="fa-regular fa-folder-open" style="font-size:40px; color:#cbd5e1; margin-bottom:15px;"></i>
                    <p style="color:#64748b; font-weight:bold; margin:0;">Tiada mesej diterima setakat ini.</p>
                </div>`;
            return;
        }

        let html = '';
        snap.forEach(d => {
            const data = d.data();
            const isPautan = data.jenis === "pautan" && data.status === "menunggu";
            const isUnread = data.status === "belum_baca" || data.status === "menunggu";
            
            const statusDot = isUnread ? '<span style="display:inline-block; width:8px; height:8px; background:#ef4444; border-radius:50%; margin-left:8px;" title="Mesej Baru"></span>' : '';
            const namaPenghantar = data.penghantar_nama || "Waris";
            const formatTarikh = new Date(data.tarikh).toLocaleDateString('ms-MY', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

            html += `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:10px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                    <strong style="color:#0f172a; font-size:14px;"><i class="fa-regular fa-user" style="color:#64748b; margin-right:5px;"></i> ${namaPenghantar} ${statusDot}</strong>
                    <small style="color:#64748b; font-size:11px;">${formatTarikh}</small>
                </div>
                <p style="font-size:12px; font-weight:bold; color:${isPautan ? '#0ea5e9' : '#8b5cf6'}; text-transform:uppercase; margin:0 0 5px 0;">
                    ${isPautan ? '🤝 Permohonan Cantuman Pokok' : '💬 Mesej Biasa'}
                </p>
                <p style="margin:0 0 15px 0; font-size:14px; font-weight:bold; color:#1e293b; background:#f8fafc; padding:10px; border-radius:8px;">"${data.mesej}"</p>
                
                <div style="display:flex; gap:8px;">
                ${isPautan ? `
                    <button onclick="window.terimaPautan('${d.id}', '${data.pemohon_uid}')" style="background:#10b981; color:white; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; flex:1;">Terima Salaman</button>
                    <button onclick="window.padamMesej('${d.id}', 'tolak')" style="background:#ef4444; color:white; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; flex:1;">Tolak</button>
                ` : `
                    <button onclick="window.paparKotakBalas('${d.id}')" style="background:#3b82f6; color:white; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; flex:1;">
                        <i class="fa-solid fa-reply"></i> Balas
                    </button>
                    ${data.status === "belum_baca" ? `<button onclick="window.tandakanMesejDibaca('${d.id}')" style="background:#10b981; color:white; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; flex:1;">Tandakan Dibaca ✓</button>` : ''}
                    <button onclick="window.padamMesej('${d.id}', 'padam')" style="background:transparent; color:#ef4444; border:1px solid #ef4444; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; flex:1;">Padam 🗑️</button>
                `}
                </div>

                <!-- Kotak Balas Tersembunyi (Hanya untuk mesej biasa) -->
                ${!isPautan ? `
                <div id="kotakBalas_${d.id}" style="display:none; margin-top:15px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                    <textarea id="teksBalas_${d.id}" rows="2" style="width:100%; border:1px solid #cbd5e1; border-radius:6px; padding:8px; font-size:12px; margin-bottom:8px; outline:none; box-sizing:border-box; font-family:inherit;" placeholder="Taip balasan..."></textarea>
                    <div style="text-align:right;">
                        <button onclick="window.hantarBalasanMesej('${d.id}', '${data.pemohon_uid}')" style="background:#059669; color:white; border:none; padding:6px 15px; border-radius:6px; font-size:12px; font-weight:bold; cursor:pointer;">
                            Hantar Balasan <i class="fa-solid fa-paper-plane ml-1"></i>
                        </button>
                    </div>
                </div>
                ` : ''}
            </div>`;
        });
        
        senarai.innerHTML = html;
        
    } catch (e) {
        console.error(e);
        senarai.innerHTML = '<p style="text-align:center; color:#ef4444;">Gagal memuatkan peti mesej.</p>';
    }
};

// --- FUNGSI SOKONGAN BALAS MESEJ ---
window.paparKotakBalas = (idMesej) => {
    const kotak = document.getElementById('kotakBalas_' + idMesej);
    if(kotak.style.display === 'none') {
        kotak.style.display = 'block';
    } else {
        kotak.style.display = 'none';
    }
};

window.hantarBalasanMesej = async (idMesej, uidPenerima) => {
    const teks = document.getElementById('teksBalas_' + idMesej).value;
    if(!teks.trim()) return alert("Sila taip sesuatu sebelum hantar balasan.");

    try {
        await addDoc(collection(db, "mynasab_requests"), {
            pemohon_uid: penggunaSemasa.uid,
            penghantar_nama: (penggunaSemasa.email || '').split('@')[0], 
            penerima_uid: uidPenerima,
            mesej: teks,
            jenis: "biasa",
            status: "belum_baca",
            tarikh: new Date().toISOString()
        });
        
        // Autotandakan mesej asal sebagai dibaca selepas membalas
        await updateDoc(doc(db, "mynasab_requests", idMesej), { status: "dibaca" });
        
        alert("Mesej balasan anda telah berjaya dihantar!");
        window.bukaPetiMesej(); 
        
    } catch (error) {
        console.error("Gagal balas mesej:", error);
        alert("Gagal menghantar balasan: " + error.message);
    }
};

window.tutupPetiMesej = () => { document.getElementById('modalPetiMesej').style.display = 'none'; };

// --- FUNGSI 3: KELULUSAN (THE MAGIC HANDSHAKE) ---
window.terimaPautan = async (requestDocId, pemohonUid) => {
    try {
        await updateDoc(doc(db, "mynasab_requests", requestDocId), { status: "lulus" });
        
        const nodePenerimaSnap = await getDocs(query(collection(db, "mynasab_nodes"), where("owner_uid", "==", penggunaSemasa.uid), where("relationship", "in", ["Diri Sendiri", "Induk"])));
        if (!nodePenerimaSnap.empty) {
            await updateDoc(doc(db, "mynasab_nodes", nodePenerimaSnap.docs[0].id), { linked_uids: arrayUnion(pemohonUid) });
        }

        const nodePemohonSnap = await getDocs(query(collection(db, "mynasab_nodes"), where("owner_uid", "==", pemohonUid), where("relationship", "in", ["Diri Sendiri", "Induk"])));
        if (!nodePemohonSnap.empty) {
            await updateDoc(doc(db, "mynasab_nodes", nodePemohonSnap.docs[0].id), { linked_uids: arrayUnion(penggunaSemasa.uid) });
        }

        alert("Berjaya! Pokok keluarga anda berdua kini telah bercantum secara rasmi.");
        window.bukaPetiMesej(); 
        
    } catch (e) {
        console.error(e);
        alert("Ralat ketika cuba menyambungkan pokok keluarga.");
    }
};

// =========================================================
// SISTEM NOTIFIKASI MESEJ (REAL-TIME & APP BADGE)
// =========================================================
window.pantauMesejBaru = (uid) => {
    const q = query(
        collection(db, "mynasab_requests"), 
        where("penerima_uid", "==", uid),
        where("status", "in", ["menunggu", "belum_baca"]) // Pantau mesej belum dibaca & pautan menunggu
    );

    onSnapshot(q, (snapshot) => {
        const jumlahBaru = snapshot.docs.length;
        
        const lencana = document.getElementById('lencanaMesejBaru');
        if (lencana) {
            if (jumlahBaru > 0) {
                lencana.style.display = 'inline-block';
                lencana.innerText = jumlahBaru;
            } else {
                lencana.style.display = 'none';
            }
        }

        if (jumlahBaru > 0) {
            if (navigator.setAppBadge && window.matchMedia('(display-mode: standalone)').matches) {
                navigator.setAppBadge(jumlahBaru).catch(e => console.log(e));
            }
            document.title = `(${jumlahBaru}) myNasab - Famili Pintar`;
        } else {
            if (navigator.clearAppBadge && window.matchMedia('(display-mode: standalone)').matches) {
                navigator.clearAppBadge().catch(e => console.log(e));
            }
            document.title = `myNasab - Famili Pintar`; 
        }
    });
};

// =========================================================
// FASA 3: ENJIN CARTA DINAMIK (VERSI DIBETULKAN)
// GANTIKAN keseluruhan window.bukaCartaDinamik lama dalam app.js
// (dari baris "FASA 3: ENJIN CARTA DINAMIK" hingga hujung fail)
// =========================================================
window.bukaCartaDinamik = async () => {
    if (!penggunaSemasa) return;

    const ruang = document.getElementById('ruangCartaDinamik');
    document.getElementById('modalCartaDinamik').classList.remove('hidden');
    ruang.innerHTML = '<p style="text-align:center; margin-top:40px; color:#2c3e50; font-weight:bold;">Menarik data dan memproses jaringan... <i class="fa-solid fa-spinner fa-spin"></i></p>';

    try {
        if (typeof FamilyTree === 'undefined') throw new Error("Pustaka FamilyTree (balkan.app) belum dimuatkan.");

        const saya = penggunaSemasa.uid;

        const ambil = async (uid) => {
            try {
                const s = await getDocs(query(collection(db, "mynasab_nodes"), where("owner_uid", "==", uid)));
                return s.docs.map(d => ({ ...d.data(), id: d.id }));
            } catch (e) {
                console.warn("Tak dapat baca nod", uid, e.message);
                return [];
            }
        };

        // ---------- 1. TENTUKAN AKAUN INDUK & AKAUN DIPAUTKAN ----------
        let indukUid = saya;
        const sLinkSaya = await getDoc(doc(db, "mynasab_links", saya));
        if (sLinkSaya.exists() && sLinkSaya.data().status === 'aktif') indukUid = sLinkSaya.data().owner_uid;

        const nodInduk = await ambil(indukUid);
        const rootInduk = nodInduk.find(n => n.is_root);
        if (!rootInduk) throw new Error("Data akaun induk tidak dijumpai.");

        const sPautan = await getDocs(query(collection(db, "mynasab_links"),
            where("owner_uid", "==", indukUid), where("status", "==", "aktif")));
        const akaunLuar = await Promise.all(sPautan.docs.map(async d => {
            const p = d.data();
            return { uid: p.uid, sasaran: p.sasaran_id, nod: await ambil(p.uid) };
        }));

        // Waris cantuman (salaman) lama - tanpa sambungan ke pokok induk
        const sudah = new Set([indukUid, ...akaunLuar.map(a => a.uid)]);
        const akaunCantum = [];
        for (const u of (rootInduk.linked_uids || [])) {
            if (sudah.has(u)) continue;
            sudah.add(u);
            akaunCantum.push({ uid: u, nod: await ambil(u) });
        }

        // ---------- 2. ALATAN ----------
        const peta = new Map(); // id -> nod carta

        const jantina = (n) => {
            if (n.gender === 'L') return 'male';
            if (n.gender === 'P') return 'female';
            const h = (n.relationship || '').toLowerCase();
            if (/ayah|bapa|datuk|suami|abang|moyang|buyut|cakawari|cilawagi/.test(h)) return 'male';
            if (/ibu|isteri|nenek|kakak|mak /.test(h)) return 'female';
            return 'male';
        };

        const avatar = (g) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="${g === 'female' ? '#f8c8d4' : '#aed9e0'}"/><path fill="#ffffff" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`);

        const daftar = (n, title) => {
            const g = jantina(n);
            const o = {
                id: n.id,
                name: n.name || 'Tiada Nama',
                title: n.status === 'meninggal' ? `${title} (Meninggal)` : title,
                gender: g,
                img: n.photo_url || avatar(g)
            };
            peta.set(n.id, o);
            return o;
        };

        // anak.fid / anak.mid ikut jantina ibu bapa
        const jadiIbuBapa = (anak, ibubapa) => {
            if (!anak || !ibubapa || anak.id === ibubapa.id) return;
            if (ibubapa.gender === 'male') {
                if (!anak.fid) anak.fid = ibubapa.id; else if (!anak.mid) anak.mid = ibubapa.id;
            } else {
                if (!anak.mid) anak.mid = ibubapa.id; else if (!anak.fid) anak.fid = ibubapa.id;
            }
        };

        const pasang = (a, b) => {
            if (!a || !b || a.id === b.id) return;
            a.pids = a.pids || []; b.pids = b.pids || [];
            if (!a.pids.includes(b.id)) a.pids.push(b.id);
            if (!b.pids.includes(a.id)) b.pids.push(a.id);
        };

        // Anak kepada 'induk' + pasangannya (jika hanya ada seorang pasangan)
        const jadiAnak = (anak, induk) => {
            if (!anak || !induk) return;
            jadiIbuBapa(anak, induk);
            if (induk.pids && induk.pids.length === 1) jadiIbuBapa(anak, peta.get(induk.pids[0]));
        };

        // Jika seseorang belum ada ibu bapa tetapi perlu ada adik-beradik, cipta penanda tempat
        const pastikanIbuBapa = (n) => {
            if (!n || n.fid || n.mid) return;
            const ph = { id: 'ph_' + n.id, name: '(Belum direkod)', title: 'Ibu bapa', gender: 'male', img: avatar('male') };
            peta.set(ph.id, ph);
            n.fid = ph.id;
        };

        const jadiAdikBeradik = (adik, jangkar) => {
            if (!adik || !jangkar || adik.id === jangkar.id) return;
            pastikanIbuBapa(jangkar);
            if (jangkar.fid) adik.fid = jangkar.fid;
            if (jangkar.mid) adik.mid = jangkar.mid;
        };

        // ---------- 3. KLASIFIKASI HUBUNGAN (padanan TEPAT, bukan regex longgar) ----------
        const rel = (n) => (n.relationship || '').toLowerCase().trim();
        const aras = (n) => {
            const h = rel(n);
            if (h === 'ayah' || h === 'ibu') return 0;
            if (h === 'datuk' || h === 'nenek') return 1;
            if (h === 'moyang') return 2;
            if (h === 'buyut') return 3;
            if (h === 'cakawari') return 4;
            if (h === 'cilawagi') return 5;
            return -1;
        };
        const jenis = (n) => {
            if (n.is_root) return 'diri';
            const h = rel(n);
            if (h === 'suami' || h === 'isteri') return 'pasangan';
            if (h.includes('mertua')) return 'mertua';
            if (h.includes('bapa saudara') || h.includes('mak saudara')) return 'saudaraIbuBapa';
            if (aras(n) >= 0) return 'leluhur';
            if (h === 'menantu' || h === 'pasangan cucu' || h === 'ipar') return 'pasanganAhli';
            if (['abang', 'kakak', 'adik', 'adik-beradik'].includes(h)) return 'adik';
            if (['anak', 'cucu', 'cicit', 'anak saudara', 'cucu saudara', 'sepupu', 'dua pupuk'].includes(h)
                || h.includes('piut') || h.includes('oneng')) return 'turun';
            return 'lain';
        };

        // ---------- 4. PROSES SATU AKAUN ----------
        const prosesAkaun = (nodMentah, o) => {
            // Ibu bapa/leluhur salinan daripada pengundang dibuang (sudah ada dalam pokok pengundang)
            const nod = o.tapisSalinan
                ? nodMentah.filter(n => !(n.created_by && n.created_by !== n.owner_uid))
                : nodMentah;

            const lokal = new Map(nod.map(n => [n.id, n]));
            const diri = nod.find(n => n.is_root);
            if (!diri) return null;

            nod.forEach(n => daftar(n, o.label(n)));

            const k = { pasangan: [], leluhur: [], mertua: [], pasanganAhli: [], adik: [], saudaraIbuBapa: [], turun: [] };
            nod.forEach(n => { const j = jenis(n); if (k[j]) k[j].push(n); });

            const cd = (n) => peta.get(n.id);

            // a) Pasangan
            k.pasangan.forEach(p => pasang(cd(diri), cd(p)));
            k.pasanganAhli.forEach(n => {
                const r = lokal.get(n.ref_id);
                if (r) pasang(cd(n), cd(r));
            });

            // b) Leluhur (Ayah/Ibu -> Datuk/Nenek -> Moyang -> ...)
            const peringkat = (a) => k.leluhur.filter(n => aras(n) === a);
            k.leluhur.forEach(n => {
                let anak;
                if (aras(n) === 0) {
                    anak = diri;
                } else {
                    const r = lokal.get(n.ref_id);
                    anak = (r && jenis(r) === 'leluhur' && aras(r) === aras(n) - 1) ? r : peringkat(aras(n) - 1)[0];
                }
                if (anak) jadiIbuBapa(cd(anak), cd(n));
            });

            // c) Mertua -> ibu bapa kepada pasangan
            k.mertua.forEach(n => {
                const r = lokal.get(n.ref_id);
                const psg = (r && jenis(r) === 'pasangan') ? r : k.pasangan[0];
                if (psg) jadiIbuBapa(cd(psg), cd(n));
            });

            // d) Keturunan (Anak, Cucu, Cicit, ... + Anak Saudara, Sepupu)
            k.turun.forEach(n => {
                let induk = lokal.get(n.ref_id);
                if (!induk && rel(n) === 'anak') induk = diri;
                if (!induk || induk.id === n.id) return;
                jadiAnak(cd(n), cd(induk));
            });

            // e) Adik-beradik (kongsi ibu bapa dengan diri sendiri)
            k.adik.forEach(n => jadiAdikBeradik(cd(n), cd(diri)));

            // f) Bapa/Mak Saudara (adik-beradik kepada Ayah atau Ibu)
            k.saudaraIbuBapa.forEach(n => {
                const belahIbu = rel(n).includes('belah ibu');
                const jangkar = k.leluhur.find(x => rel(x) === (belahIbu ? 'ibu' : 'ayah'));
                if (jangkar) jadiAdikBeradik(cd(n), cd(jangkar));
            });

            return { diri, pasangan: k.pasangan };
        };

        // ---------- 5. BINA PETA DATA ----------
        // Akaun induk
        prosesAkaun(nodInduk, {
            label: (n) => n.is_root ? (indukUid === saya ? 'Diri Sendiri' : 'Ketua Keluarga') : (n.relationship || '')
        });

        // Akaun adik-beradik yang dipautkan melalui jemputan
        akaunLuar.forEach(a => {
            const sasaranNode = nodInduk.find(n => n.id === a.sasaran);
            const sasaranPasangan = sasaranNode && /suami|isteri/i.test(sasaranNode.relationship || '');
            const res = prosesAkaun(a.nod, {
                tapisSalinan: true,
                label: (n) => {
                    const h = n.relationship || '';
                    if (n.is_root) return a.uid === saya ? 'Diri Sendiri' : (sasaranPasangan ? 'Ipar' : 'Adik-beradik');
                    if (/suami|isteri|menantu/i.test(h)) return 'Ipar';
                    if (h === 'Anak') return 'Anak saudara';
                    if (h === 'Cucu') return 'Cucu saudara';
                    if (h === 'Cicit') return 'Cicit saudara';
                    return h;
                }
            });
            // Sambung ke ibu bapa pengundang (atau mertua jika sasaran ialah pasangan)
            if (res && sasaranNode) jadiAdikBeradik(peta.get(res.diri.id), peta.get(sasaranNode.id));
        });

        // Waris cantuman (salaman)
        akaunCantum.forEach(a => {
            prosesAkaun(a.nod, { label: (n) => n.is_root ? 'Waris Cantuman' : (n.relationship || '') });
        });

        // Buang rujukan yang tidak wujud supaya graf tak rosak
        const dataCarta = [...peta.values()];
        dataCarta.forEach(n => {
            if (n.fid && !peta.has(n.fid)) delete n.fid;
            if (n.mid && !peta.has(n.mid)) delete n.mid;
            if (n.pids) {
                n.pids = n.pids.filter(id => peta.has(id));
                if (n.pids.length === 0) delete n.pids;
            }
        });

        // ---------- 6. LUKIS ----------
        ruang.innerHTML = '';
        new FamilyTree(ruang, {
            mouseScrool: FamilyTree.action.zoom,
            template: 'tommy',
            scaleInitial: FamilyTree.match.boundary,
            nodeMouseClick: FamilyTree.action.none,
            nodeBinding: {
                field_0: "name",
                field_1: "title",
                img_0: "img"
            },
            nodes: dataCarta
        });

    } catch (e) {
        console.error(e);
        ruang.innerHTML = '<p style="color:red; text-align:center; margin-top:40px;">Gagal memuatkan carta: ' + esc(e.message) + '</p>';
    }
};
