// Perakit tampilan audit fairness (A-01, H-04, dan perbandingan aturan H-05).
// Hanya agregat: modul ini tidak pernah menerima maupun menampilkan data
// perorangan. Nama kelompok berasal dari data → textContent saja.
import { getJSON } from "./jscroot/api.js";
import { asal } from "./config.js";
import { tokenHeader } from "./auth.js";
import { el, kosongkan, lencana, tabel, baris, kosong, sehat } from "./ui.js";
import { t, bahasa } from "./i18n.js";

export const DIMENSI = ["jenis_kelamin", "kelompok_usia", "disabilitas", "unit"];
export const METRIK = ["parity", "equal_opportunity", "equalized_odds"];

// Ujung kanan sumbu. Pita acuan 0,8–1,25 adalah rentang empat-perlima dua arah.
const SUMBU_MAKS = 1.25;

function lokal() { return bahasa() === "en" ? "en-GB" : "id-ID"; }

export function persen(x) {
    if (x == null || isNaN(Number(x))) return "—";
    const n = Math.round(Number(x) * 1000) / 10;
    return n.toLocaleString(lokal(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

function persenBulat(x) {
    return Math.round(Number(x) * 100).toLocaleString(lokal()) + "%";
}

function angka(x) {
    return x == null || isNaN(Number(x)) ? "—" : Number(x).toLocaleString(lokal());
}

function tanggal(x) {
    const d = new Date(x);
    return isNaN(d) ? "" : d.toLocaleDateString(lokal());
}

export function namaKelompok(nama) {
    if (nama && typeof nama === "object") return nama[bahasa()] || nama.id || "";
    return nama == null ? "" : String(nama);
}

function ambangPenanda(audit) {
    const a = Number(audit && audit.ambang_penanda);
    return a > 0 && a < SUMBU_MAKS ? a : 0.8;
}

function teksTersembunyi(audit) {
    const n = audit && audit.ambang_kelompok != null ? audit.ambang_kelompok : "?";
    return t("fairness.tersembunyi", { n: n });
}

// Penanda hanya sah untuk sampel yang tidak kecil, walau backend sudah menjamin.
function ditandai(sel) { return !!sel.ditandai && !sel.sampel_kecil; }

function lencanaSel(sel) {
    const wadah = el("span", "inline-flex flex-wrap gap-1");
    if (sel.sampel_kecil) wadah.appendChild(lencana(t("fairness.sampel_kecil"), "netral"));
    if (ditandai(sel)) {
        const l = lencana(t("fairness.perlu_ditinjau"), "tinjau");
        l.dataset.uji = "penanda-fairness";
        wadah.appendChild(l);
    }
    return wadah;
}

function posisi(nilai) {
    return Math.max(0, Math.min(100, (Number(nilai) / SUMBU_MAKS) * 100)) + "%";
}

function garisBantu(ambang) {
    const frag = document.createDocumentFragment();
    const pita = el("div", "absolute inset-y-0 bg-utama-muda");
    pita.style.left = posisi(ambang);
    pita.style.right = "0";
    frag.appendChild(pita);
    const dasar = el("div", "absolute inset-x-0 top-1/2 h-px bg-garis-tipis");
    frag.appendChild(dasar);
    [ambang, 1].forEach(function (v) {
        const g = el("div", "absolute inset-y-0 w-px bg-garis-kendali");
        g.style.left = posisi(v);
        frag.appendChild(g);
    });
    return frag;
}

function barisPlot(sel, audit) {
    const nama = namaKelompok(sel.nama);
    const b = el("div", "space-y-1");
    b.dataset.uji = "baris-plot";
    b.dataset.disembunyikan = String(!!sel.disembunyikan);

    const atas = el("div", "flex flex-wrap items-center justify-between gap-x-2 gap-y-1");
    const kiri = el("div", "flex min-w-0 max-w-full flex-wrap items-center gap-1.5");
    kiri.appendChild(el("span", "min-w-0 max-w-full break-words text-sm font-medium", nama));
    atas.appendChild(kiri);

    if (sel.disembunyikan) {
        b.appendChild(atas);
        const ket = el("div", "flex h-6 items-center rounded border border-dashed border-garis px-2 text-mikro text-tinta-redup", teksTersembunyi(audit));
        b.appendChild(ket);
        return b;
    }

    kiri.appendChild(lencanaSel(sel));
    atas.appendChild(el("span", "font-data text-mikro text-tinta-redup", persen(sel.rasio)));
    b.appendChild(atas);

    const jalur = el("div", "relative h-6 w-full overflow-hidden rounded");
    jalur.appendChild(garisBantu(ambangPenanda(audit)));
    if (sel.rasio != null && !isNaN(Number(sel.rasio))) {
        const titik = el("div", "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 "
            + (ditandai(sel) ? "border-tinjau bg-tinjau" : sel.sampel_kecil ? "border-utama bg-kertas" : "border-utama bg-utama"));
        // Titik di tepi 0 atau 125% tetap terlihat utuh.
        titik.style.left = "clamp(0.375rem, " + posisi(sel.rasio) + ", calc(100% - 0.375rem))";
        titik.title = nama + ": " + persen(sel.rasio);
        titik.dataset.rasio = String(sel.rasio);
        jalur.appendChild(titik);
    }
    b.appendChild(jalur);
    return b;
}

function sumbu(ambang) {
    const s = el("div", "relative h-4 w-full text-mikro font-data text-tinta-redup");
    s.setAttribute("aria-hidden", "true");
    [0, 0.5, ambang, 1, SUMBU_MAKS].forEach(function (v, i, semua) {
        const label = el("span", "absolute top-0 whitespace-nowrap", persenBulat(v));
        if (i === 0) label.style.left = "0";
        else if (i === semua.length - 1) label.style.right = "0";
        else {
            label.style.left = posisi(v);
            label.className += " -translate-x-1/2";
        }
        s.appendChild(label);
    });
    return s;
}

function legenda(audit) {
    const ambang = ambangPenanda(audit);
    const l = el("ul", "flex flex-wrap gap-x-4 gap-y-1 text-mikro text-tinta-redup");
    function butir(kelas, teks) {
        const li = el("li", "flex items-center gap-1.5");
        li.appendChild(el("span", "inline-block shrink-0 " + kelas));
        li.appendChild(el("span", "", teks));
        l.appendChild(li);
    }
    butir("h-3 w-5 rounded-sm bg-utama-muda", t("fairness.legenda_pita", { bawah: persenBulat(ambang), atas: persenBulat(SUMBU_MAKS) }));
    butir("h-3 w-3 rounded-full border-2 border-utama bg-utama", t("fairness.legenda_rasio"));
    butir("h-3 w-3 rounded-full border-2 border-utama bg-kertas", t("fairness.sampel_kecil"));
    butir("h-3 w-3 rounded-full border-2 border-tinjau bg-tinjau", t("fairness.perlu_ditinjau"));
    return l;
}

// plotRasio(audit, opsi?) → HTMLElement
// opsi: { judul?: string, legenda?: boolean (bawaan true) }
// Plot titik rasio paritas per kelompok terhadap pita acuan; kelompok
// tersembunyi tampil sebagai baris tanpa titik. Lebar mengikuti wadah.
export function plotRasio(audit, opsi) {
    const o = opsi || {};
    const ambang = ambangPenanda(audit);
    const fig = el("figure", "w-full min-w-0 space-y-3");
    fig.dataset.uji = "plot-fairness";
    if (audit && audit.dimensi) fig.dataset.dimensi = audit.dimensi;
    if (o.judul) fig.appendChild(el("figcaption", "text-sm font-medium", o.judul));

    const sel = (audit && audit.paritas) || [];
    const isi = el("div", "space-y-3");
    if (!sel.length) {
        isi.appendChild(el("p", "text-sm text-tinta-redup", t("umum.tidak_ada_data")));
    } else {
        sel.forEach(function (s) { isi.appendChild(barisPlot(s, audit)); });
        isi.appendChild(sumbu(ambang));
    }
    fig.appendChild(isi);
    if (o.legenda !== false) fig.appendChild(legenda(audit));
    return fig;
}

// ringkasAudit(audit) → { ditandai, sampelKecil, disembunyikan, tidakIkutDitandai }
export function ringkasAudit(audit) {
    const r = { ditandai: 0, sampelKecil: 0, disembunyikan: 0, tidakIkutDitandai: 0 };
    ((audit && audit.paritas) || []).forEach(function (s) {
        if (s.disembunyikan) r.disembunyikan++;
        else {
            if (s.sampel_kecil) r.sampelKecil++;
            if (ditandai(s)) r.ditandai++;
        }
    });
    ((audit && audit.tidak_ikut) || []).forEach(function (s) {
        if (!s.disembunyikan && ditandai(s)) r.tidakIkutDitandai++;
    });
    return r;
}

// lencanaRingkas(audit) → HTMLElement berisi lencana hitungan untuk kartu ringkas.
export function lencanaRingkas(audit) {
    const r = ringkasAudit(audit);
    const w = el("div", "flex flex-wrap gap-1.5");
    if (r.ditandai) w.appendChild(lencana(t("fairness.ringkas_ditandai", { n: r.ditandai }), "tinjau"));
    if (r.tidakIkutDitandai) w.appendChild(lencana(t("fairness.ringkas_tidak_ikut_ditandai", { n: r.tidakIkutDitandai }), "tinjau"));
    if (r.sampelKecil) w.appendChild(lencana(t("fairness.ringkas_sampel_kecil", { n: r.sampelKecil }), "netral"));
    if (r.disembunyikan) w.appendChild(lencana(t("fairness.ringkas_disembunyikan", { n: r.disembunyikan }), "netral"));
    if (!w.firstChild) w.appendChild(lencana(t("fairness.ringkas_tanpa_penanda"), "netral"));
    return w;
}

function barisTersembunyi(sel, audit, nKolom) {
    const tr = el("tr", "border-b border-garis-tipis last:border-0");
    tr.dataset.disembunyikan = "true";
    tr.appendChild(el("td", "py-2 pr-4 align-top font-medium", namaKelompok(sel.nama)));
    const td = el("td", "py-2 pr-4 align-top text-tinta-redup", teksTersembunyi(audit));
    td.colSpan = nKolom - 1;
    tr.appendChild(td);
    return tr;
}

// tabelSel membangun tabel paritas atau tidak-ikut dengan aturan penyembunyian
// yang sama; baris total hanya muncul bila backend mengizinkan.
function tabelSel(audit, daftar, total, totalTampil, label) {
    const pakaiRasio = daftar.some(function (s) { return !s.disembunyikan && s.rasio != null; });
    const kolom = [t("fairness.kolom_kelompok"), t("fairness.kolom_n"), label.k, label.tingkat];
    if (pakaiRasio) kolom.push(t("fairness.kolom_rasio"));
    kolom.push(t("fairness.kolom_keterangan"));
    const { wadah, tbody } = tabel(kolom);
    if (!daftar.length) {
        tbody.appendChild(kosong(kolom.length, t("umum.tidak_ada_data")));
    }
    daftar.forEach(function (s) {
        if (s.disembunyikan) {
            tbody.appendChild(barisTersembunyi(s, audit, kolom.length));
            return;
        }
        const sel = [
            el("span", "font-medium", namaKelompok(s.nama)),
            el("span", "font-data", angka(s.n)),
            el("span", "font-data", angka(s.k)),
            el("span", "font-data", persen(s.tingkat)),
        ];
        if (pakaiRasio) sel.push(el("span", "font-data", persen(s.rasio)));
        sel.push(lencanaSel(s));
        tbody.appendChild(baris(sel));
    });
    if (totalTampil && total) {
        const sel = [
            el("span", "font-medium", t("fairness.baris_total")),
            el("span", "font-data font-medium", angka(total.n)),
            el("span", "font-data font-medium", angka(total.k)),
            el("span", "font-data font-medium", persen(total.tingkat)),
        ];
        if (pakaiRasio) sel.push("");
        sel.push("");
        const tr = baris(sel);
        tr.dataset.uji = "baris-total";
        tbody.appendChild(tr);
    }
    const frag = el("div", "space-y-2");
    frag.appendChild(wadah);
    return frag;
}

// renderAudit(wadah, audit) → void
// Menggambar satu objek audit lengkap (GET /api/fairness/siklus/:id):
// plot, tabel paritas, tabel tidak ikut.
export function renderAudit(wadah, audit) {
    kosongkan(wadah);
    const akar = el("div", "space-y-6");
    akar.dataset.uji = "audit-fairness";

    const kepala = el("div", "space-y-1");
    kepala.appendChild(el("h3", "font-medium", t("fairness.judul_plot", { dimensi: t("dimensi." + audit.dimensi) })));
    if (audit.dibuat) kepala.appendChild(el("p", "text-mikro text-tinta-redup", t("fairness.dihitung_pada", { tanggal: tanggal(audit.dibuat) })));
    akar.appendChild(kepala);
    akar.appendChild(plotRasio(audit));

    const bagParitas = el("section", "space-y-2");
    bagParitas.appendChild(el("h3", "font-medium", t("fairness.judul_paritas")));
    bagParitas.appendChild(tabelSel(audit, audit.paritas || [], audit.paritas_total, !!audit.paritas_total_tampil, {
        k: t("fairness.kolom_direkomendasikan"), tingkat: t("fairness.kolom_tingkat_rekomendasi"),
    }));
    akar.appendChild(bagParitas);

    const bagTidakIkut = el("section", "space-y-2");
    bagTidakIkut.appendChild(el("h3", "font-medium", t("fairness.judul_tidak_ikut")));
    bagTidakIkut.appendChild(tabelSel(audit, audit.tidak_ikut || [], audit.tidak_ikut_total, !!audit.tidak_ikut_total_tampil, {
        k: t("fairness.kolom_tidak_ikut"), tingkat: t("fairness.kolom_tingkat_tidak_ikut"),
    }));
    akar.appendChild(bagTidakIkut);

    wadah.appendChild(akar);
}

// ── data ──

// urlAudit(siklusId, dimensi, metrik?) → string
export function urlAudit(siklusId, dimensi, metrik) {
    return asal + "/api/fairness/siklus/" + encodeURIComponent(siklusId)
        + "?dimensi=" + encodeURIComponent(dimensi)
        + "&metrik=" + encodeURIComponent(metrik || "parity");
}

// muatSiklusDijalankan(elPesan, selesai(daftar)) → void
// Menelusuri semua halaman GET /api/siklus dan menyisakan yang dijalankan.
export function muatSiklusDijalankan(elPesan, selesai) {
    const kumpulan = [];
    function halaman(n) {
        getJSON(asal + "/api/siklus?limit=200&page=" + n, function (hasil) {
            if (!sehat(hasil, elPesan)) return;
            (hasil.data.data || []).forEach(function (s) { if (s.status === "dijalankan") kumpulan.push(s); });
            const meta = hasil.data.meta || {};
            if (meta.total_pages && n < meta.total_pages) halaman(n + 1);
            else selesai(kumpulan);
        }, ...tokenHeader());
    }
    halaman(1);
}

// siklusBawaan(daftar) → siklus terbaru yang bukan bayangan (daftar terbaru dulu).
export function siklusBawaan(daftar) {
    return daftar.find(function (s) { return !s.bayangan; }) || daftar[0] || null;
}

// isiPilihanSiklus(select, daftar, idTerpilih) → void; siklus bayangan diberi label.
export function isiPilihanSiklus(select, daftar, idTerpilih) {
    kosongkan(select);
    daftar.forEach(function (s) {
        const opt = document.createElement("option");
        opt.value = s.id;
        const vars = { nama: s.nama || s.id, tanggal: tanggal(s.dijalankan_pada || s.dibuat) };
        opt.textContent = vars.tanggal || s.bayangan
            ? t(s.bayangan ? "fairness.opsi_siklus_bayangan" : "fairness.opsi_siklus", vars)
            : vars.nama;
        if (s.id === idTerpilih) opt.selected = true;
        select.appendChild(opt);
    });
}

// keteranganSiklus(siklus) → HTMLElement: nama, tanggal jalan, label bayangan.
export function keteranganSiklus(siklus) {
    const w = el("div", "flex flex-wrap items-center gap-2 text-sm text-tinta-redup");
    if (!siklus) return w;
    w.appendChild(el("span", "min-w-0 max-w-full break-words font-medium text-tinta", siklus.nama || siklus.id));
    const tgl = tanggal(siklus.dijalankan_pada || siklus.dibuat);
    if (tgl) w.appendChild(el("span", "", t("fairness.dijalankan_pada", { tanggal: tgl })));
    if (siklus.bayangan) {
        w.appendChild(lencana(t("fairness.lencana_bayangan"), "netral"));
    }
    return w;
}
