// Lantai mutu (§13.5, §16.2): kontras teks TERBURUK terhadap latar elemen
// sebenarnya ≥ 4,5 dan batas kendali ≥ 3, di kedua tema × kedua bahasa ×
// dua lebar, tanpa gulir mendatar. Diukur pada halaman terkomposit, bukan
// dihitung dari palet.
//
//   node uji-mutu.mjs                    lantai mutu dengan palet bawaan
//   node uji-mutu.mjs --utama=RRGGBB     menimpa --w-utama (warna organisasi)
//   node uji-mutu.mjs --harap-gagal      uji negatif: --utama=B8E0DC HARUS
//                                        menggagalkan setidaknya satu
//                                        pemeriksaan kontras
import { chromium } from "playwright";
import { FE, pelapor, pasangApiTiruan, penjawabBaku, pengguna, redamFont, opsiPeluncur } from "./bantu.mjs";

const arg = Object.fromEntries(process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const HARAP_GAGAL = arg["harap-gagal"] === true;
// --utama menimpa --w-utama tema TERANG; --utama-gelap untuk tema gelap.
// Dipisah karena tema gelap memakai teks gelap di atas utama yang terang:
// satu warna organisasi untuk kedua tema hampir pasti gagal di salah satunya.
const heks = (s) => (typeof s === "string" ? s.replace(/^#/, "") : null);
const UTAMA = heks(arg.utama) || (HARAP_GAGAL ? "B8E0DC" : null);
const UTAMA_GELAP = heks(arg["utama-gelap"]);
for (const [n, v] of [["--utama", UTAMA], ["--utama-gelap", UTAMA_GELAP]]) {
    if (v && !/^[0-9a-fA-F]{6}$/.test(v)) { console.error(`${n} harus RRGGBB`); process.exit(2); }
}
const keRgb = (h) => (h ? [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(" ") : null);
const utamaRgb = keRgb(UTAMA), utamaGelapRgb = keRgb(UTAMA_GELAP);

const p = pelapor(HARAP_GAGAL ? `MUTU — uji negatif: --utama=${UTAMA} harus menggagalkan kontras` : `MUTU — ${FE}${UTAMA ? " · --utama=" + UTAMA : ""}${UTAMA_GELAP ? " · --utama-gelap=" + UTAMA_GELAP : ""}`);
const HALAMAN = [{ jalur: "/login/", sesi: false }, { jalur: "/akun/", sesi: true }];
const LEBAR = [1280, 400];
const MIN_TEKS = 4.5, MIN_BATAS = 3;
const MIN_ELEMEN = 12;   // halaman yang tidak tergambar tidak boleh lolos karena tak ada yang diukur

let kontrasGagal = 0, kontrasDiperiksa = 0;
function laporKontras(nama, ok, ket) {
    kontrasDiperiksa++;
    if (!ok) kontrasGagal++;
    if (HARAP_GAGAL) console.log(`  ${ok ? "lolos          " : "GAGAL (diharap)"} ${nama} — ${ket}`);
    else p.lapor(nama, ok, ket);
}

// Berjalan di halaman. Latar diambil dari elemen itu sendiri lalu naik ke
// leluhur sampai ketemu warna legap, dengan lapisan setengah transparan
// dikomposit lewat canvas — jadi teks di kartu diukur terhadap kartu, bukan
// terhadap latar halaman.
function ukurDiHalaman(opsi) {
    const L = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const rasio = (a, b) => { const l1 = L(...a), l2 = L(...b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
    const k = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    k.canvas.width = k.canvas.height = 1;
    const campur = (warna, dasar) => {
        k.clearRect(0, 0, 1, 1);
        if (dasar) { k.fillStyle = "rgb(" + dasar.join(",") + ")"; k.fillRect(0, 0, 1, 1); }
        k.fillStyle = warna; k.fillRect(0, 0, 1, 1);
        const d = k.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]];
    };
    const kosong = (w) => !w || /^rgba\(0, 0, 0, 0\)$|^transparent$/.test(w);
    const legap = (w) => campur(w, [0, 0, 0]).join() === campur(w, [255, 255, 255]).join();
    const latar = (el, dariInduk) => {
        const lapis = [];
        for (let n = dariInduk ? el.parentElement : el; n; n = n.parentElement) {
            const bg = getComputedStyle(n).backgroundColor;
            if (kosong(bg)) continue;
            lapis.push(bg);
            if (legap(bg)) break;
        }
        let dasar = [255, 255, 255];
        for (let i = lapis.length - 1; i >= 0; i--) dasar = campur(lapis[i], dasar);
        return dasar;
    };
    const tampak = (el) => {
        if (!el.getClientRects().length) return false;
        const cs = getComputedStyle(el);
        return cs.visibility !== "hidden" && cs.opacity !== "0";
    };
    const nama = (el) => {
        const kelas = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
        const teks = (el.value || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 32);
        return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${kelas} "${teks}"`;
    };
    const catat = (daftar, el, fgWarna, bg) => {
        const fg = campur(fgWarna, bg);
        daftar.push({ nama: nama(el), rasio: +rasio(fg, bg).toFixed(2), fg: fg.join(","), bg: bg.join(",") });
    };

    const teks = [];
    for (const el of document.body.querySelectorAll("*")) {
        if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(el.tagName)) continue;
        const isian = ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
        const punyaTeks = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!isian && !punyaTeks) continue;
        if (!tampak(el)) continue;
        catat(teks, el, getComputedStyle(el).color, latar(el));
    }
    // Pesan status tidak tampil saat diam; dipaksa tampil sebentar dengan
    // kelas persis seperti yang dipasang ui.js:pesan().
    const elPesan = document.getElementById("pesan");
    if (elPesan) {
        const asal = { kelas: elPesan.className, hidden: elPesan.hidden, teks: elPesan.textContent };
        for (const [jenis, kelas] of [["galat", "bg-galat-muda text-galat"], ["sah", "bg-sah-muda text-sah"], ["tinjau", "bg-tinjau-muda text-tinjau"]]) {
            elPesan.className = "rounded-xl px-3 py-2 text-sm mb-4 " + kelas;
            elPesan.textContent = "Contoh pesan " + jenis;
            elPesan.hidden = false;
            catat(teks, elPesan, getComputedStyle(elPesan).color, latar(elPesan));
        }
        elPesan.className = asal.kelas; elPesan.textContent = asal.teks; elPesan.hidden = asal.hidden;
    }
    const batas = [];
    for (const el of document.querySelectorAll(opsi.selektorBatas)) {
        if (!tampak(el)) continue;
        const cs = getComputedStyle(el);
        if (!parseFloat(cs.borderTopWidth)) continue;
        catat(batas, el, cs.borderTopColor, latar(el, true));   // latar DI SEKITAR kendalinya
    }
    return {
        teks, batas,
        geser: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        lebarGulir: document.documentElement.scrollWidth, lebarTampak: document.documentElement.clientWidth,
        tema: document.documentElement.dataset.tema, lang: document.documentElement.lang,
        tirai: document.documentElement.classList.contains("i18n-tunggu"),
    };
}

const terburuk = (daftar) => daftar.reduce((a, b) => (b.rasio < a.rasio ? b : a), { rasio: Infinity, nama: "-" });
const uraikan = (x) => `${x.rasio}:1 pada ${x.nama} (fg ${x.fg} / bg ${x.bg})`;

const browser = await chromium.launch(opsiPeluncur());
try {
    for (const hal of HALAMAN) for (const tema of ["terang", "gelap"]) for (const bahasa of ["id", "en"]) {
        const label = `${hal.jalur} · ${tema} · ${bahasa}`;
        const ctx = await browser.newContext({ viewport: { width: LEBAR[0], height: 800 } });
        // Sesi lewat init script tidak apa-apa di sini: tidak ada skenario
        // pengalihan, jadi penanaman ulang tidak mengganggu.
        await ctx.addInitScript(({ tema, bahasa, sesi, u }) => {
            localStorage.setItem("itm_tema", tema);
            localStorage.setItem("itm_bahasa", bahasa);
            if (sesi) { localStorage.setItem("itm_token", "token-uji"); localStorage.setItem("itm_user", JSON.stringify(u)); }
        }, { tema, bahasa, sesi: hal.sesi, u: pengguna(4) });
        const page = await ctx.newPage();
        const galat = [];
        page.on("pageerror", (e) => galat.push(e.message));
        await redamFont(page);
        await pasangApiTiruan(page, penjawabBaku(pengguna(4)));
        await page.goto(FE + hal.jalur, { waitUntil: "networkidle" });
        await page.waitForFunction(() => !document.documentElement.classList.contains("i18n-tunggu"), null, { timeout: 8000 }).catch(() => {});
        if (hal.sesi) await page.waitForFunction(() => document.getElementById("uname").textContent.length > 0, null, { timeout: 8000 }).catch(() => {});
        if (utamaRgb || utamaGelapRgb) {
            // Dipasang SETELAH muat. Spesifisitas (0,2,0) mengalahkan kedua
            // definisi (0,1,0) di input.css tanpa saling menimpa antar tema.
            const aturan = [];
            if (utamaRgb) aturan.push(`:root:not([data-tema="gelap"]) { --w-utama: ${utamaRgb}; }`);
            if (utamaGelapRgb) aturan.push(`:root[data-tema="gelap"] { --w-utama: ${utamaGelapRgb}; }`);
            await page.addStyleTag({ content: aturan.join("\n") });
        }
        p.lapor(`${label}: halaman tetap di ${hal.jalur} tanpa galat JS`, new URL(page.url()).pathname === hal.jalur && galat.length === 0, galat.join(" | ") || page.url());

        for (const lebar of LEBAR) {
            await page.setViewportSize({ width: lebar, height: 800 });
            await page.waitForTimeout(200);
            const h = await page.evaluate(ukurDiHalaman, { selektorBatas: ".medan, .segmen, .tombol-halus, .kode-layar" });
            const tag = `${label} · ${lebar}px`;
            p.lapor(`${tag}: tema/bahasa terpasang dan tirai terbuka`, h.tema === tema && h.lang === bahasa && !h.tirai, `tema=${h.tema} lang=${h.lang} tirai=${h.tirai}`);
            p.lapor(`${tag}: halaman tergambar (${h.teks.length} elemen teks terukur, min ${MIN_ELEMEN})`, h.teks.length >= MIN_ELEMEN);
            const bt = terburuk(h.teks), bb = terburuk(h.batas);
            laporKontras(`${tag}: kontras teks terburuk ≥ ${MIN_TEKS}`, bt.rasio >= MIN_TEKS, uraikan(bt));
            laporKontras(`${tag}: kontras batas kendali terburuk ≥ ${MIN_BATAS} (${h.batas.length} kendali)`, h.batas.length > 0 && bb.rasio >= MIN_BATAS, uraikan(bb));
            p.lapor(`${tag}: tidak ada gulir mendatar`, !h.geser, `scrollWidth ${h.lebarGulir} vs clientWidth ${h.lebarTampak}`);
        }
        await ctx.close();
    }
} catch (e) {
    p.lapor("berjalan tanpa galat tak terduga", false, String(e && e.stack || e));
} finally {
    await browser.close();
}

if (HARAP_GAGAL) {
    p.lapor(`uji negatif: --utama=${UTAMA} menggagalkan pemeriksaan kontras (${kontrasGagal} dari ${kontrasDiperiksa})`, kontrasGagal > 0 && kontrasDiperiksa > 0);
}
process.exit(p.selesai());
