// Perakit bersama layar tata kelola (A-02, A-03, H-07): navigasi halaman,
// format waktu, dan satu versi kondisi batas. Teks pernyataan disimpan dalam
// bahasa penulisannya dan ditampilkan apa adanya — tidak pernah dipilih atau
// ditukar menurut bahasa antarmuka.
import { el, lencana } from "./ui.js";
import { t, bahasa } from "./i18n.js";

export const DIMENSI_KONDISI = ["D1", "D2", "D3", "D4"];
export const BAHASA_PERNYATAAN = ["id", "en"];

function lokal() { return bahasa() === "en" ? "en-GB" : "id-ID"; }

export function tanggal(x) {
    const d = new Date(x);
    return isNaN(d) ? "" : d.toLocaleDateString(lokal());
}

export function waktu(x) {
    const d = new Date(x);
    if (isNaN(d)) return "";
    return d.toLocaleDateString(lokal()) + " " + d.toLocaleTimeString(lokal(), { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// navigasiHalaman(meta, pindah(nomor)) → HTMLElement "Sebelumnya · Halaman n dari total · Berikutnya"
export function navigasiHalaman(meta, pindah) {
    const m = meta || {};
    const n = Math.max(1, Number(m.page) || 1);
    const total = Math.max(1, Number(m.total_pages) || 1);
    const w = el("nav", "mt-4 flex flex-wrap items-center justify-between gap-2");
    w.setAttribute("aria-label", t("umum.halaman", { n: n, total: total }));
    const seb = el("button", "tombol-halus", t("umum.sebelumnya"));
    seb.type = "button";
    seb.disabled = n <= 1;
    seb.addEventListener("click", function () { pindah(n - 1); });
    const ber = el("button", "tombol-halus", t("umum.berikutnya"));
    ber.type = "button";
    ber.disabled = n >= total;
    ber.addEventListener("click", function () { pindah(n + 1); });
    w.appendChild(seb);
    w.appendChild(el("span", "text-sm text-tinta-redup", t("umum.halaman", { n: n, total: total })));
    w.appendChild(ber);
    return w;
}

// tagBahasa(kode) → pil kecil "ID"/"EN" dengan keterangan bahasa penulisan.
export function tagBahasa(kode) {
    const tag = el("span", "inline-flex shrink-0 items-center rounded border border-garis px-1.5 font-data text-mikro text-tinta-redup", String(kode || "?").toUpperCase());
    if (BAHASA_PERNYATAAN.includes(kode)) {
        tag.title = t("kondisiBatas.ditulis_dalam", { bahasa: t("kondisiBatas.bahasa." + kode) });
    }
    return tag;
}

// gambarPernyataan(pernyataan) → HTMLElement dikelompokkan D1–D4.
export function gambarPernyataan(pernyataan) {
    const daftar = pernyataan || [];
    const w = el("dl", "space-y-4");
    DIMENSI_KONDISI.forEach(function (d) {
        const grup = el("div", "");
        grup.appendChild(el("dt", "eyebrow text-tinta-redup mb-1.5", t("dimensiKondisi." + d)));
        const isi = daftar.filter(function (p) { return p.dimensi === d; });
        if (!isi.length) {
            grup.appendChild(el("dd", "text-sm text-tinta-redup", "—"));
        }
        isi.forEach(function (p) {
            const dd = el("dd", "flex items-start gap-2 py-1");
            dd.appendChild(tagBahasa(p.bahasa));
            const teks = el("p", "min-w-0 flex-1 whitespace-pre-wrap break-words text-sm", p.teks);
            if (BAHASA_PERNYATAAN.includes(p.bahasa)) teks.lang = p.bahasa;
            dd.appendChild(teks);
            grup.appendChild(dd);
        });
        w.appendChild(grup);
    });
    return w;
}

// gambarVersiKondisi(versi, terbuka) → <details> satu versi kondisi batas.
export function gambarVersiKondisi(v, terbuka) {
    const det = el("details", "rounded-xl border border-garis px-4 py-3");
    det.dataset.uji = "versi-kondisi";
    if (terbuka) det.open = true;
    // summary tetap list-item agar penanda buka/tutup bawaan peramban terlihat.
    const summary = el("summary", "cursor-pointer");
    const ringkas = el("span", "inline-flex max-w-full flex-wrap items-center gap-2 align-middle");
    summary.appendChild(ringkas);
    ringkas.appendChild(el("span", "font-data font-medium", v.versi != null ? String(v.versi) : v.id));
    if (v.aktif) ringkas.appendChild(lencana(t("umum.aktif"), "sah"));
    const tgl = tanggal(v.dibuat);
    if (tgl) ringkas.appendChild(el("span", "text-sm text-tinta-redup", t("umum.dibuat") + " " + tgl));
    if (v.dibuat_oleh) {
        ringkas.appendChild(el("span", "text-sm text-tinta-redup", t("umum.oleh")));
        ringkas.appendChild(el("span", "font-data text-mikro text-tinta-redup", v.dibuat_oleh));
    }
    det.appendChild(summary);
    const isi = el("div", "mt-3");
    isi.appendChild(gambarPernyataan(v.pernyataan));
    det.appendChild(isi);
    return det;
}
