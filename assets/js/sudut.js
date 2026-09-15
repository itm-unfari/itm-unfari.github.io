// Sudut pandang pakar (§13.2 rencana, P-01): akun pakar tidak menunjuk satu
// karyawan pun, jadi layar yang bermakna "milik sendiri" (K-03) dilihat
// sebagai karyawan yang dipilih pakar. Pilihan ini kenyamanan per peramban;
// backend tetap menerima karyawan_id per permintaan dan tidak memberi akses
// tulis apa pun kepada pakar.
const KUNCI = "itm_sudut_pandang";

export function bacaSudut() {
    try {
        const v = JSON.parse(localStorage.getItem(KUNCI) || "null");
        return v && typeof v.id === "string" ? v : null;
    } catch (e) { return null; }
}

export function simpanSudut(karyawan) {
    try {
        localStorage.setItem(KUNCI, JSON.stringify({ id: karyawan.id, nama: karyawan.nama, unit: karyawan.unit || "" }));
    } catch (e) { /* penyimpanan ditolak: pilihan berlaku lewat tautan saja */ }
}

export function hapusSudut() {
    try { localStorage.removeItem(KUNCI); } catch (e) { /* diabaikan */ }
}
