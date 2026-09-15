// Perkakas antarmuka. Semuanya menulis lewat textContent, tidak pernah
// innerHTML: nama skill, judul peluang, dan kutipan usulan AI adalah masukan
// yang tidak dipercaya. Dari jscroot, jangan pakai setInner/insertHTML/
// renderHTML/replaceTag — semuanya menulis lewat innerHTML.
import { clear as bersihkanSesi } from "./auth.js";
import { redirect } from "./jscroot/url.js";
import { t } from "./i18n.js";
import { asal } from "./config.js";

const SESI_HABIS = new Set(["sesi_tidak_sah", "akun_tidak_ditemukan"]);

export function el(tag, kelas, teks) {
    const e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks != null) e.textContent = String(teks);
    return e;
}

export function pesan(elemen, teks, jenis) {
    if (!elemen) return;
    const warna = jenis === "galat" ? "bg-galat-muda text-galat"
        : jenis === "sah" ? "bg-sah-muda text-sah"
        : "bg-tinjau-muda text-tinjau";
    elemen.className = "rounded-xl px-3 py-2 text-sm mb-4 " + warna;
    elemen.textContent = teks;
    elemen.hidden = false;
}

export function sembunyikan(elemen) { if (elemen) elemen.hidden = true; }

export function kosongkan(elemen) {
    while (elemen && elemen.firstChild) elemen.removeChild(elemen.firstChild);
}

// teksGalat menerjemahkan balasan galat lewat `code`; `message` backend hanya
// cadangan kalau kodenya belum ada di kamus.
export function teksGalat(hasil) {
    const d = (hasil && hasil.data) || {};
    if (d.code) {
        const kunci = "galat." + d.code;
        const teks = t(kunci);
        if (teks !== kunci) return teks;
    }
    return d.message || t("galat.http", { status: hasil ? hasil.status : "?" });
}

// sehat WAJIB dipanggil di awal setiap callback jscroot. api.js tidak
// menangani 401 maupun galat jaringan sendiri; tanpa ini sesi yang habis
// tampak sebagai halaman kosong tanpa sebab.
export function sehat(hasil, elPesan) {
    if (!asal) {
        pesan(elPesan, t("galat.backend_belum_diatur"), "galat");
        return false;
    }
    if (!hasil || typeof hasil.status !== "number") {
        pesan(elPesan, t("galat.tanpa_jawaban"), "galat");
        return false;
    }
    // 401 hanya berarti sesi habis bila kodenya soal sesi; sandi lama salah
    // atau kredensial salah juga 401, dan itu harus tampil sebagai pesan.
    const kode = (hasil.data && hasil.data.code) || "";
    if (hasil.status === 401 && (kode === "" || SESI_HABIS.has(kode))) {
        bersihkanSesi();
        redirect("/login/");
        return false;
    }
    if (hasil.status < 200 || hasil.status >= 300) {
        pesan(elPesan, teksGalat(hasil), "galat");
        return false;
    }
    return true;
}
