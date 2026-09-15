// Menyiapkan keadaan demo di atas data generator, supaya tangkapan
// wireframe (tangkap-layar.mjs --langsung) dan skenario pakar menampilkan
// layar yang terisi: aturan hasil belajar tanpa dan dengan mitigasi (H-05),
// usulan tepi grafik dari AI yang belum diputuskan (H-06), dan satu usulan
// skill AI yang belum diputuskan milik uji.karyawan (K-02).
//
// Hanya MENAMBAH data. Jalankan setelah data dasar dibangkitkan ulang di repo
// backend (go run ./tools/sintetis), satu kali:
//
//   node siapkan-demo.mjs
import { pelapor, masukApi, apiJSON, jalankanPekerjaAI } from "./bantu.mjs";

const p = pelapor("SIAPKAN DEMO");
const hr = await masukApi("uji.hr");
const karyawan = await masukApi("uji.karyawan");

const aturan = ((await apiJSON(hr.token, "/api/aturan?limit=200")).data) || [];
if (aturan.some((a) => a.asal === "dipelajari")) {
    p.lapor("data belum pernah disiapkan (belum ada aturan hasil belajar)", false, "bangkitkan ulang data dasar dulu: go run ./tools/sintetis di repo backend");
    process.exit(p.selesai());
}

const tugas = [
    ["latih tanpa mitigasi", await apiJSON(hr.token, "/api/aturan/latih", { mitigasi_aktif: false })],
    ["latih dengan mitigasi", await apiJSON(hr.token, "/api/aturan/latih", { mitigasi_aktif: true })],
    ["usulan tepi grafik", await apiJSON(hr.token, "/api/grafik-skill/usulkan", {})],
    ["usulan skill dari teks", await apiJSON(karyawan.token, "/api/saya/usulan-skill", {
        teks: "Saya terbiasa menganalisis data penjualan bulanan menggunakan SQL untuk menyusun laporan bagi manajemen.", bahasa: "id",
    })],
];
for (const [nama, r] of tugas) p.lapor(`tugas ${nama} dibuat`, r.http === 200, r.code || "");
await jalankanPekerjaAI();

for (const [nama, r] of tugas) {
    const token = nama === "usulan skill dari teks" ? karyawan.token : hr.token;
    const cek = r.data && r.data.id ? await apiJSON(token, "/api/tugas-ai/" + encodeURIComponent(r.data.id)) : r;
    p.lapor(`tugas ${nama} selesai`, !!cek.data && cek.data.status === "selesai", cek.data ? cek.data.status + " " + (cek.data.galat || "") : cek.code);
}
const sesudah = ((await apiJSON(hr.token, "/api/aturan?limit=200")).data) || [];
p.lapor("aturan hasil belajar tanpa dan dengan mitigasi tersedia",
    sesudah.some((a) => a.asal === "dipelajari" && !a.mitigasi_aktif) && sesudah.some((a) => a.asal === "dipelajari" && a.mitigasi_aktif));
process.exit(p.selesai());
