// Batang kontribusi (§13.5 rencana): "identitas visual" bersama K-04 dan
// H-02 — SATU perakit dipakai kedua layar supaya penjelasan karyawan dan HR
// menampilkan angka yang identik (§16.2: "Batang kontribusi dan kalimat
// penjelasan menampilkan angka yang sama").
//
// Kalimat dirakit di sini dari data terstruktur (model.Kontribusi), bukan
// disimpan sebagai teks (§13.1 rencana): kesetiaan penjelasan tidak
// bergantung pada terjemahan, dan Indonesia/Inggris dijamin setara karena
// keduanya membaca field angka yang sama.
import { el, kosongkan } from "./ui.js";
import { t, bahasa } from "./i18n.js";

const NAMA_TINGKAT = { 0: "kontribusi.tidak_dimiliki", 1: "tingkat.1", 2: "tingkat.2", 3: "tingkat.3", 4: "tingkat.4" };

function namaTingkat(tk) { return t(NAMA_TINGKAT[tk] || "kontribusi.tidak_dimiliki"); }

function namaSkill(kode, skillMap) {
    const s = skillMap && skillMap[kode];
    if (!s || !s.nama) return kode;
    const b = bahasa();
    return (s.nama[b] || s.nama.id || kode) + " (" + kode + ")";
}

function kalimat(k, kode, skillMap) {
    return t("kontribusi.kalimat", {
        skill: namaSkill(kode, skillMap),
        butuh: namaTingkat(k.tingkat_dibutuhkan),
        milik: namaTingkat(k.tingkat_dimiliki),
        sumbangan: fmt(k.sumbangan),
        bobot: fmt(k.bobot_efektif),
    });
}

function fmt(n) { return Math.round((n + Number.EPSILON) * 10) / 10; }

// satuBatang membangun satu baris: label, angka sumbangan/bobot, batang
// proporsional, kalimat penjelasan di bawahnya.
function satuBatang(k, skillMap) {
    const baris = el("div", "space-y-1.5");
    const atas = el("div", "flex items-baseline justify-between gap-3 text-sm");
    atas.appendChild(el("span", "font-medium", namaSkill(k.kode, skillMap)));
    atas.appendChild(el("span", "font-data text-tinta-redup shrink-0", fmt(k.sumbangan) + " / " + fmt(k.bobot_efektif)));
    baris.appendChild(atas);

    const trek = el("div", "h-2 rounded-full bg-latar overflow-hidden");
    const isi = el("div", k.sumbangan >= k.bobot_efektif ? "h-full rounded-full bg-utama" : "h-full rounded-full bg-tinjau");
    const pct = k.bobot_efektif > 0 ? Math.max(0, Math.min(100, (k.sumbangan / k.bobot_efektif) * 100)) : 0;
    isi.style.width = pct + "%";
    trek.appendChild(isi);
    baris.appendChild(trek);

    baris.appendChild(el("p", "text-sm text-tinta-redup", kalimat(k, k.kode, skillMap)));
    return baris;
}

// renderKontribusi menggambar seluruh daftar kontribusi satu match ke dalam
// `wadah`, plus skor total di atasnya. skillMap datang dari balasan
// GET /api/match/:id (field `skill`, {kode: {nama:{id,en}, kelompok}}).
export function renderKontribusi(wadah, match, skillMap) {
    kosongkan(wadah);
    const ringkas = el("div", "flex items-baseline gap-3");
    ringkas.appendChild(el("span", "text-2xl font-data font-medium", fmt(match.skor)));
    ringkas.appendChild(el("span", "text-tinta-redup text-sm", t("kontribusi.dari_100")));
    wadah.appendChild(ringkas);

    const daftar = (match.kontribusi || []).slice().sort(function (a, b) { return b.bobot_efektif - a.bobot_efektif; });
    const grid = el("div", "space-y-5 mt-4");
    if (!daftar.length) {
        grid.appendChild(el("p", "text-sm text-tinta-redup", t("kontribusi.kosong")));
    } else {
        daftar.forEach(function (k) { grid.appendChild(satuBatang(k, skillMap)); });
    }
    wadah.appendChild(grid);
}
