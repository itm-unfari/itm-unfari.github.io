// Batang kontribusi (§13.5 rencana): satu batang mendatar per match. Segmen =
// sumbangan per skill, lebarnya sebanding; segmen yang dihitung lewat tepi
// grafik (via_kode) bertekstur garis miring; sisa sampai 100 digambar berongga
// bergaris putus sebagai gap — tidak pernah merah. Karena skor aditif, batang
// ini ADALAH perhitungannya.
//
// Satu perakit untuk K-03, K-04, M-02, H-01, H-02 (§16.2: batang dan kalimat
// menampilkan angka yang sama). Kalimat dirakit dari data terstruktur
// model.Kontribusi, bukan disimpan sebagai teks (§13.1).
import { el, kosongkan } from "./ui.js";
import { t, bahasa } from "./i18n.js";

const TEKSTUR_TEPI = "repeating-linear-gradient(135deg, rgb(var(--w-kertas) / .55) 0 3px, transparent 3px 7px)";

export function fmt(n) { return Math.round(((Number(n) || 0) + Number.EPSILON) * 10) / 10; }

function namaTingkat(tk) { return tk >= 1 && tk <= 4 ? t("tingkat." + tk) : t("kontribusi.tidak_dimiliki"); }

export function namaSkill(kode, skillMap) {
    const s = skillMap && skillMap[kode];
    if (!s || !s.nama) return kode;
    return (s.nama[bahasa()] || s.nama.id || kode) + " (" + kode + ")";
}

function urut(match) {
    return (match.kontribusi || []).slice().sort(function (a, b) {
        return b.sumbangan - a.sumbangan || b.bobot_efektif - a.bobot_efektif || (a.kode < b.kode ? -1 : 1);
    });
}

// Dua nada utama bergantian supaya segmen bersebelahan terbedakan tanpa
// memberi warna bernilai; urutan legenda mengikuti urutan segmen.
function kelasSegmen(i) { return i % 2 === 0 ? "bg-utama" : "bg-utama-dalam"; }

// batangKontribusi mengembalikan satu elemen batang (tanpa legenda), untuk
// baris daftar (K-03, M-02, H-01) maupun kepala penjelasan (K-04, H-02).
export function batangKontribusi(match, skillMap) {
    const daftar = urut(match);
    const batang = el("div", "flex h-3 w-full min-w-[8rem] overflow-hidden rounded-full border border-dashed border-garis-kendali");
    batang.setAttribute("role", "img");
    batang.setAttribute("aria-label", t("kontribusi.aria", { skor: fmt(match.skor) }));
    batang.dataset.uji = "batang-kontribusi";
    let terisi = 0;
    daftar.forEach(function (k, i) {
        if (!(k.sumbangan > 0)) return;
        const seg = el("div", "h-full " + kelasSegmen(i));
        seg.style.width = Math.min(100, k.sumbangan) + "%";
        if (k.via_kode) seg.style.backgroundImage = TEKSTUR_TEPI;
        seg.title = namaSkill(k.kode, skillMap) + ": " + fmt(k.sumbangan);
        seg.dataset.kode = k.kode;
        seg.dataset.sumbangan = String(fmt(k.sumbangan));
        batang.appendChild(seg);
        terisi += k.sumbangan;
    });
    // Sisa sampai 100 dibiarkan kosong: yang tampak adalah batas bergaris
    // putus milik wadah (gap berongga).
    batang.dataset.gap = String(fmt(Math.max(0, 100 - terisi)));
    return batang;
}

function kalimat(k, skillMap) {
    const vars = {
        skill: namaSkill(k.kode, skillMap),
        butuh: namaTingkat(k.tingkat_dibutuhkan),
        milik: namaTingkat(k.tingkat_dimiliki),
        sumbangan: fmt(k.sumbangan),
        bobot: fmt(k.bobot_efektif),
        gap: fmt(k.gap),
        via: k.via_kode ? namaSkill(k.via_kode, skillMap) : "",
    };
    if (k.via_kode) return t("kontribusi.kalimat_via", vars);
    if (!(k.tingkat_dimiliki >= 1)) return t("kontribusi.kalimat_kurang", vars);
    return t("kontribusi.kalimat", vars);
}

// renderKontribusi menggambar penjelasan lengkap satu match: skor, batang,
// lalu satu baris legenda per skill (angka sama dengan segmen batang).
export function renderKontribusi(wadah, match, skillMap) {
    kosongkan(wadah);
    const ringkas = el("div", "flex items-baseline gap-2 mb-3");
    const skor = el("span", "text-2xl font-data font-medium", fmt(match.skor));
    skor.dataset.uji = "skor";
    ringkas.appendChild(skor);
    ringkas.appendChild(el("span", "text-tinta-redup text-sm", t("kontribusi.dari_100")));
    wadah.appendChild(ringkas);
    wadah.appendChild(batangKontribusi(match, skillMap));

    const daftar = urut(match);
    const legenda = el("ul", "mt-5 space-y-3");
    if (!daftar.length) {
        legenda.appendChild(el("li", "text-sm text-tinta-redup", t("kontribusi.kosong")));
    }
    daftar.forEach(function (k, i) {
        const li = el("li", "flex gap-3");
        const penanda = el("span", "mt-1 h-3 w-3 shrink-0 rounded-sm " + (k.sumbangan > 0 ? kelasSegmen(i) : "border border-dashed border-garis-kendali"));
        if (k.via_kode && k.sumbangan > 0) penanda.style.backgroundImage = TEKSTUR_TEPI;
        li.appendChild(penanda);
        const isi = el("div", "min-w-0 flex-1");
        const atas = el("div", "flex flex-wrap items-baseline justify-between gap-x-3 text-sm");
        atas.appendChild(el("span", "font-medium", namaSkill(k.kode, skillMap)));
        const angka = el("span", "font-data text-tinta-redup", fmt(k.sumbangan) + " / " + fmt(k.bobot_efektif));
        angka.dataset.uji = "angka-kontribusi";
        angka.dataset.kode = k.kode;
        atas.appendChild(angka);
        isi.appendChild(atas);
        const p = el("p", "text-sm text-tinta-redup", kalimat(k, skillMap));
        p.dataset.uji = "kalimat-kontribusi";
        isi.appendChild(p);
        li.appendChild(isi);
        legenda.appendChild(li);
    });
    wadah.appendChild(legenda);
}
