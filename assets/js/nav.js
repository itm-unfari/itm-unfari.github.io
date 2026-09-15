// Kerangka aplikasi: pita atas, pita data sintetis, kepala halaman, sidebar
// menurut peran, sakelar bahasa dan tema, Keluar.
//
// Tautan yang disembunyikan adalah kenyamanan, bukan keamanan.
import { getUser, logout } from "./auth.js";
import { PERAN } from "./config.js";
import { cariLayar, layarUntuk } from "./layar.js";
import { t, terapkan } from "./i18n.js";
import { el } from "./ui.js";

function segmen(label, pilihan, aktif, pilih) {
    const wadah = el("div", "segmen");
    wadah.setAttribute("role", "group");
    wadah.setAttribute("aria-label", label);
    pilihan.forEach(function (p) {
        const b = el("button", "", p.teks);
        b.type = "button";
        b.dataset.nilai = p.nilai;
        b.setAttribute("aria-pressed", String(p.nilai === aktif));
        b.addEventListener("click", function () { pilih(p.nilai); });
        wadah.appendChild(b);
    });
    return wadah;
}

export function sakelarBahasa() {
    const tampilan = window.itmTampilan;
    return segmen(t("umum.bahasa"), [
        { nilai: "id", teks: "ID" },
        { nilai: "en", teks: "EN" },
    ], tampilan.bahasa(), function (b) { if (b !== tampilan.bahasa()) tampilan.setelBahasa(b); });
}

export function sakelarTema() {
    const tampilan = window.itmTampilan;
    const s = segmen(t("umum.tema"), [
        { nilai: "sistem", teks: t("umum.tema_sistem") },
        { nilai: "terang", teks: t("umum.tema_terang") },
        { nilai: "gelap", teks: t("umum.tema_gelap") },
    ], tampilan.tema(), function (p) {
        tampilan.setelTema(p);
        s.querySelectorAll("button").forEach(function (b) {
            b.setAttribute("aria-pressed", String(b.dataset.nilai === p));
        });
    });
    return s;
}

// pasang membangun kerangka untuk layar berkode `kode`, lalu menerapkan kamus.
export function pasang(kode) {
    const u = getUser() || {};
    const layar = cariLayar(kode);

    const pita = el("div", "pita-atas");
    pita.setAttribute("aria-hidden", "true");
    // Selama aturan keselamatan §4.1 berlaku, seluruh data aplikasi sintetis.
    const sintetis = el("div", "pita-sintetis", t("aplikasi.pita_sintetis"));
    sintetis.setAttribute("role", "note");
    sintetis.dataset.uji = "pita-sintetis";

    const kepala = el("header", "border-b border-garis bg-kertas");
    const isi = el("div", "mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-3");

    const kiri = el("div", "min-w-0 flex-1");
    kiri.appendChild(el("div", "eyebrow text-tinta-redup", t("aplikasi.nama")));
    const h1 = el("h1", "judul-halaman text-lg leading-tight", t("layar." + kode));
    kiri.appendChild(h1);
    isi.appendChild(kiri);

    const tautan = layarUntuk(u.role);
    if (tautan.length > 1) {
        const nav = el("nav", "flex flex-wrap gap-1");
        nav.setAttribute("aria-label", t("aplikasi.singkat"));
        tautan.forEach(function (l) {
            const a = el("a", "rounded-full px-3 py-1.5 text-sm text-tinta-redup hover:bg-latar", t("layar." + l.kode));
            a.href = l.url;
            if (l.kode === kode) {
                a.setAttribute("aria-current", "page");
                a.className += " bg-utama-muda text-utama font-medium";
            }
            nav.appendChild(a);
        });
        isi.appendChild(nav);
    }

    const kanan = el("div", "flex flex-wrap items-center gap-3");
    if (u.role === PERAN.PAKAR && layar) {
        const k = el("span", "kode-layar", layar.kode);
        k.title = t("umum.kode_layar");
        k.dataset.uji = "kode-layar";
        kanan.appendChild(k);
    }
    const ident = el("div", "text-right");
    ident.appendChild(el("div", "text-sm font-medium leading-tight", u.name || ""));
    ident.appendChild(el("div", "text-mikro text-tinta-redup", t("peran." + u.role)));
    kanan.appendChild(ident);
    kanan.appendChild(sakelarBahasa());
    const keluar = el("button", "tombol-halus", t("umum.keluar"));
    keluar.type = "button";
    keluar.addEventListener("click", logout);
    kanan.appendChild(keluar);
    isi.appendChild(kanan);
    kepala.appendChild(isi);

    document.body.prepend(pita, sintetis, kepala);
    terapkan();
}
