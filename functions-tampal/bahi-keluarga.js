// =====================================================================
// BAHI "SEMUA" = SELURUH KELUARGA (induk teratas ke bawah)
// =====================================================================
// Masalah: "Semua" dulu hanya sampai kepada akaun yang dijemput TERUS oleh induk (mynasab_links).
// Anak saudara (jemputan melalui abang/kakak), adik-beradik Salam Paut, dsb. tidak nampak.
// Penyelesaian: server kira ahli keluarga penuh (guna slKeluargaPenuh yang sama dengan JomSalam)
// dan simpan dalam buatapa_kumpulan/{indukTeratas}_keluarga. Siaran "Semua" pergi ke kumpulan ini.
//
// ---------------------------------------------------------------------
// LANGKAH 1: TAMPAL fungsi baru ini SELEPAS exports.jomsalamKeluarga dalam functions/index.js
//            (ia guna slIndukTeratas & slKeluargaPenuh yang sudah ada di bahagian JomSalam)
// ---------------------------------------------------------------------
exports.bahiKeluarga = functions
    .region('asia-southeast1')
    .https.onCall(async (data, context) => {
        const saya = context.auth && context.auth.uid;
        if (!saya) throw new functions.https.HttpsError('unauthenticated', 'Sila log masuk.');
        const atas = await slIndukTeratas(saya);
        const ahli = [...await slKeluargaPenuh(saya)];
        if (!ahli.includes(saya)) ahli.push(saya);
        let nama = '';
        try { const u = await db.collection('mynasab_users').doc(atas).get(); nama = (u.exists && String(u.data().name || '').trim().split(/\s+/)[0]) || ''; } catch (e) {}
        const id = atas + '_keluarga';
        await db.collection('buatapa_kumpulan').doc(id).set({ owner_uid: atas, nama, ahli, jenis: 'keluarga', updated_at: Date.now() });
        return { id, bil: ahli.length };
    });

// ---------------------------------------------------------------------
// LANGKAH 2: dalam fungsi bahiAhli (bahagian BAHI), GANTI baris:
//     if (String(groupId).endsWith('_kami')) {
// DENGAN:
//     if (/_(kami|keluarga)$/.test(String(groupId))) {
// (supaya notifikasi siaran/komen "Semua" sampai kepada seluruh keluarga)
// ---------------------------------------------------------------------

// Deploy:
//   firebase deploy --only functions:bahiKeluarga,functions:bahiSiaranBaru,functions:bahiKomenBaru
//   (kalau nama fungsi komen BAHI ko lain, atau tak pasti: firebase deploy --only functions)


// =====================================================================
// LANGKAH 3: PERATURAN FIRESTORE - dalam function ahliKumpulan(g), GANTI baris:
//     (g.matches('.*_kami') &&
// DENGAN:
//     (g.matches('.*_(kami|keluarga)') &&
// =====================================================================
// buatapa_kumpulan _keluarga hanya ditulis oleh server; peraturan create/update sedia ada
// (id mesti uid + '_kami') sudah menghalang pengguna menulisnya. Storage tak perlu diubah:
// gambar kini dimuat naik ke buatapa/{uid sendiri}/...
