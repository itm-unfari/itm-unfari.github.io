// Penerjemah antarmuka. Semua teks ditulis lewat textContent/atribut, tidak
// pernah innerHTML.
import id from "./kamus/id.js";
import en from "./kamus/en.js";

const KAMUS = { id, en };

export function bahasa() {
    return document.documentElement.getAttribute("lang") === "en" ? "en" : "id";
}

// t mengembalikan teks untuk kunci; {nama} diganti dari vars. Kunci yang tidak
// ada dikembalikan apa adanya supaya kelalaian terlihat, bukan kosong.
export function t(kunci, vars) {
    let s = KAMUS[bahasa()][kunci];
    if (s == null) s = KAMUS.id[kunci];
    if (s == null) return kunci;
    if (vars) {
        s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? String(vars[k]) : m; });
    }
    return s;
}

// terapkan mengisi elemen bertanda data-i18n* lalu membuka tirai i18n-tunggu.
export function terapkan(akar) {
    const r = akar || document;
    r.querySelectorAll("[data-i18n]").forEach(function (e) { e.textContent = t(e.dataset.i18n); });
    r.querySelectorAll("[data-i18n-placeholder]").forEach(function (e) { e.placeholder = t(e.dataset.i18nPlaceholder); });
    r.querySelectorAll("[data-i18n-label]").forEach(function (e) { e.setAttribute("aria-label", t(e.dataset.i18nLabel)); });
    const judul = document.documentElement.dataset.judul;
    if (judul) document.title = t(judul);
    document.documentElement.classList.remove("i18n-tunggu");
}
