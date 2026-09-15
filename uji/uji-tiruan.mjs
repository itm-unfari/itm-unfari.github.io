// Uji frontend dengan API TIRUAN: **/auth/** dan **/health dijawab lewat
// page.route, jadi backend tidak perlu hidup. Yang dibuktikan (§16.2):
// alur masuk, penanganan galat lewat `code`, 401 membuang sesi, disiplin XSS,
// header token, alamat backend dari config.js, bahasa tanpa kedip, tema
// sebelum stylesheet, mode pakar, dan nav menurut layar yang tersedia.
//
//   FRONTEND=http://127.0.0.1:5180 node uji-tiruan.mjs
import { chromium } from "playwright";
import {
    FE, SANDI_UJI, pelapor, muatModulFrontend, pasangApiTiruan, penjawabBaku,
    amplopGalat, pengguna, pasangSesi, redamFont, jalurDari, opsiPeluncur,
} from "./bantu.mjs";

const p = pelapor("API TIRUAN — " + FE);
const { id, en, layarUntuk, LAYAR, SEMUA_PERAN } = await muatModulFrontend();
const XSS = "<img src=x onerror=window.__xss=1>";
const asalFe = new URL(FE);
// config.js: host pengembangan → backend di host yang sama, porta 8095.
const ASAL_API_HARAPAN = `${asalFe.protocol}//${asalFe.hostname}:8095`;

const browser = await chromium.launch(opsiPeluncur());

async function halamanBaru(opsiKonteks = {}) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 800 } }, opsiKonteks));
    const page = await ctx.newPage();
    const galat = [];
    page.on("pageerror", (e) => galat.push(e.message));
    await redamFont(page);
    return { ctx, page, galat };
}
const tanpaGalat = (nama, galat) => p.lapor(`${nama}: tanpa galat JavaScript`, galat.length === 0, galat.join(" | "));
const tungguPesan = (page, idEl = "pesan") =>
    page.waitForFunction((i) => { const e = document.getElementById(i); return e && !e.hidden && e.textContent.length > 0; }, idEl, { timeout: 8000 }).catch(() => {});
const bacaSesi = (page) => page.evaluate(() => ({ token: localStorage.getItem("itm_token"), user: localStorage.getItem("itm_user") }));

// Perekam yang dipasang SEBELUM skrip halaman mana pun. Merekam keadaan lang
// dan tema pada DOMContentLoaded, apakah tirai i18n-tunggu sudah terpasang
// saat elemen [data-i18n] pertama masuk DOM, tema saat <link app.css>
// masuk DOM, dan teks tombol saat tirai dibuka.
function skripPerekam() {
    const rekam = { langDCL: null, temaDCL: null, tiraiSaatTeksPertama: null, teksSaatTiraiDibuka: null, temaSaatStylesheet: null };
    window.__rekam = rekam;
    document.addEventListener("DOMContentLoaded", function () {
        rekam.langDCL = document.documentElement.lang;
        rekam.temaDCL = document.documentElement.dataset.tema || null;
    });
    new MutationObserver(function (daftar) {
        const h = document.documentElement;
        if (!h) return;
        if (rekam.temaSaatStylesheet === null) {
            for (const m of daftar) for (const n of m.addedNodes) {
                if (n.nodeType === 1 && n.tagName === "LINK" && /app\.css/.test(n.getAttribute("href") || "")) {
                    rekam.temaSaatStylesheet = h.dataset.tema || "(belum ada)";
                }
            }
        }
        if (rekam.tiraiSaatTeksPertama === null && document.querySelector("[data-i18n]")) {
            rekam.tiraiSaatTeksPertama = h.classList.contains("i18n-tunggu");
        }
        if (rekam.tiraiSaatTeksPertama !== null && rekam.teksSaatTiraiDibuka === null && !h.classList.contains("i18n-tunggu")) {
            const b = document.getElementById("tombolMasuk") || document.getElementById("tombolSandi");
            rekam.teksSaatTiraiDibuka = b ? b.textContent : "(tombol tidak ada)";
        }
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
}

try {
    // ── 1. /login/ memuat ──
    {
        const { ctx, page, galat } = await halamanBaru();
        await pasangApiTiruan(page, penjawabBaku(pengguna(4)));
        await page.goto(FE + "/login/", { waitUntil: "networkidle" });
        p.lapor('/login/ memuat dengan <html lang="id"> bawaan', (await page.evaluate(() => document.documentElement.lang)) === "id");
        p.lapor("tirai i18n-tunggu sudah dibuka setelah modul berjalan", await page.evaluate(() => !document.documentElement.classList.contains("i18n-tunggu")));
        const pita = page.locator('[data-uji="pita-sintetis"]');
        p.lapor("pita data sintetis terlihat", await pita.isVisible());
        p.lapor("teks pita dari kamus id", (await pita.textContent()) === id["aplikasi.pita_sintetis"]);
        p.lapor("judul dokumen dari kamus id", (await page.title()) === id["masuk.judul_halaman"]);
        p.lapor("sakelar bahasa tergambar (ID/EN)", (await page.locator("#wadahBahasa .segmen button").count()) === 2);
        p.lapor("segmen ID ditandai aria-pressed", (await page.getAttribute('#wadahBahasa button[data-nilai="id"]', "aria-pressed")) === "true");
        tanpaGalat("/login/", galat);
        await ctx.close();
    }

    // ── 2. Penjaga halaman ──
    {
        const { ctx, page } = await halamanBaru();
        await pasangApiTiruan(page, penjawabBaku(pengguna(4)));
        await page.goto(FE + "/akun/", { waitUntil: "commit" }).catch(() => {});
        await page.waitForURL("**/login/**", { timeout: 8000 }).catch(() => {});
        p.lapor("/akun/ tanpa sesi dilempar ke /login/", jalurDari(page.url()) === "/login/", page.url());
        await pasangSesi(page, pengguna(4));
        await page.goto(FE + "/login/", { waitUntil: "commit" }).catch(() => {});
        await page.waitForURL("**/akun/**", { timeout: 8000 }).catch(() => {});
        p.lapor("/login/ dengan sesi dilempar ke /akun/", jalurDari(page.url()) === "/akun/", page.url());
        await ctx.close();
    }

    // ── 3. Masuk berhasil, header token, alamat backend ──
    {
        const { ctx, page, galat } = await halamanBaru();
        const dicatat = await pasangApiTiruan(page, penjawabBaku(pengguna(4), "token-uji-123"));
        await page.goto(FE + "/login/", { waitUntil: "networkidle" });
        await page.fill("#uname", "uji.karyawan");
        await page.fill("#password", SANDI_UJI);
        await page.click("#tombolMasuk");
        await page.waitForURL("**/akun/**", { timeout: 10000 }).catch(() => {});
        p.lapor("masuk berhasil diarahkan ke /akun/", jalurDari(page.url()) === "/akun/", page.url());
        const sesi = await bacaSesi(page);
        p.lapor("localStorage.itm_token terisi token dari balasan", sesi.token === "token-uji-123", String(sesi.token));
        p.lapor("localStorage.itm_user terisi pengguna dari balasan", !!sesi.user && JSON.parse(sesi.user).uname === "uji.karyawan");
        await page.waitForFunction(() => document.getElementById("uname").textContent.length > 0, null, { timeout: 8000 }).catch(() => {});
        p.lapor("/akun/ menampilkan uname dari /auth/me", (await page.locator("#uname").textContent()) === "uji.karyawan");
        p.lapor("/akun/ menampilkan peran dari kamus (peran.4)", (await page.locator("#peran").textContent()) === id["peran.4"]);
        p.lapor("pita data sintetis ada di /akun/", await page.locator('[data-uji="pita-sintetis"]').isVisible());
        p.lapor("kepala halaman memuat judul layar U-02", (await page.locator("header h1").textContent()) === id["layar.U-02"]);

        const masuk = dicatat.find((r) => r.jalur === "/auth/login");
        const me = dicatat.find((r) => r.jalur === "/auth/me");
        let badan = {};
        try { badan = JSON.parse(masuk.badan || "{}"); } catch (e) { /* dilaporkan di bawah */ }
        p.lapor("/auth/login dipanggil lewat POST dengan uname & password", !!masuk && masuk.method === "POST" && badan.uname === "uji.karyawan" && badan.password === SANDI_UJI);
        p.lapor("/auth/login TIDAK membawa header login", !!masuk && masuk.headers.login === undefined, masuk ? JSON.stringify(masuk.headers.login) : "tidak ada permintaan");
        p.lapor("/auth/me membawa header login = token", !!me && me.headers.login === "token-uji-123", me ? JSON.stringify(me.headers.login) : "tidak ada permintaan");
        const asal = [...new Set(dicatat.map((r) => new URL(r.url).origin))];
        p.lapor(`config.js: semua permintaan API menuju ${ASAL_API_HARAPAN}`, asal.length === 1 && asal[0] === ASAL_API_HARAPAN, asal.join(","));
        tanpaGalat("alur masuk", galat);
        await ctx.close();
    }

    // ── 4. Masuk gagal: 401 kredensial_salah TIDAK dianggap sesi habis ──
    {
        const { ctx, page, galat } = await halamanBaru();
        const penjawab = penjawabBaku(pengguna(4));
        penjawab["/auth/login"] = () => ({ status: 401, body: amplopGalat("kredensial_salah", "nama pengguna atau sandi salah") });
        await pasangApiTiruan(page, penjawab);
        await page.goto(FE + "/login/", { waitUntil: "networkidle" });
        await page.fill("#uname", "uji.karyawan");
        await page.fill("#password", "salah");
        await page.click("#tombolMasuk");
        await tungguPesan(page);
        const teks = await page.locator("#pesan").textContent();
        p.lapor("pesan galat dari kamus id (galat.kredensial_salah)", teks === id["galat.kredensial_salah"], JSON.stringify(teks));
        p.lapor("message mentah backend tidak dipakai saat kode dikenal", teks !== "nama pengguna atau sandi salah");
        p.lapor("tetap di /login/ (pengecualian sehat() untuk kredensial_salah)", jalurDari(page.url()) === "/login/", page.url());
        const sesi = await bacaSesi(page);
        p.lapor("tidak ada token tersimpan", sesi.token === null && sesi.user === null);
        p.lapor("tombol masuk pulih (aktif, teks kembali)", (await page.locator("#tombolMasuk").isEnabled()) && (await page.locator("#tombolMasuk").textContent()) === id["masuk.tombol"]);
        tanpaGalat("masuk gagal", galat);
        await ctx.close();
    }

    // ── 5. 401 sesi_tidak_sah di /akun/ membuang sesi ──
    {
        const { ctx, page, galat } = await halamanBaru();
        const penjawab = penjawabBaku(pengguna(4));
        penjawab["/auth/me"] = () => ({ status: 401, body: amplopGalat("sesi_tidak_sah", "sesi tidak sah atau sudah berakhir") });
        await pasangApiTiruan(page, penjawab);
        await pasangSesi(page, pengguna(4), "token-basi");
        await page.goto(FE + "/akun/", { waitUntil: "commit" }).catch(() => {});
        await page.waitForURL("**/login/**", { timeout: 10000 }).catch(() => {});
        p.lapor("401 sesi_tidak_sah mengalihkan ke /login/", jalurDari(page.url()) === "/login/", page.url());
        const sesi = await bacaSesi(page);
        p.lapor("sesi dibuang (itm_token dan itm_user kosong)", sesi.token === null && sesi.user === null, JSON.stringify(sesi));
        tanpaGalat("401 di /akun/", galat);
        await ctx.close();
    }

    // ── 6. XSS: data pengguna tidak pernah jadi HTML ──
    {
        const { ctx, page, galat } = await halamanBaru();
        const jahat = pengguna(4, { uname: XSS, name: XSS });
        await pasangApiTiruan(page, penjawabBaku(jahat));
        await pasangSesi(page, jahat);   // name di kepala halaman dibaca dari itm_user
        await page.goto(FE + "/akun/", { waitUntil: "networkidle" });
        await page.waitForFunction(() => document.getElementById("uname").textContent.length > 0, null, { timeout: 8000 }).catch(() => {});
        const h = await page.evaluate(() => ({
            img: document.querySelectorAll("img").length,
            xss: window.__xss,
            uname: document.getElementById("uname").textContent,
            kepala: (document.querySelector("header") || {}).textContent || "",
        }));
        p.lapor("tidak ada elemen <img> lahir dari data pengguna", h.img === 0, `img=${h.img}`);
        p.lapor("window.__xss tidak pernah disetel", h.xss === undefined, String(h.xss));
        p.lapor("uname tampil apa adanya sebagai teks", h.uname === XSS, JSON.stringify(h.uname));
        p.lapor("nama di kepala halaman tampil apa adanya", h.kepala.includes(XSS));
        tanpaGalat("xss", galat);
        await ctx.close();
    }

    // ── 7. Kode galat yang tidak dikenal kamus → message backend jadi cadangan ──
    {
        const { ctx, page } = await halamanBaru();
        const penjawab = penjawabBaku(pengguna(4));
        let ke = 0;
        penjawab["/auth/login"] = () => (++ke === 1
            ? { status: 400, body: amplopGalat("kode_yang_belum_dikenal_kamus", "Pesan cadangan dari backend") }
            : { status: 500, body: { status: "error" } });
        await pasangApiTiruan(page, penjawab);
        p.lapor("prasyarat: kode uji memang tidak ada di kamus", id["galat.kode_yang_belum_dikenal_kamus"] === undefined && en["galat.kode_yang_belum_dikenal_kamus"] === undefined);
        await page.goto(FE + "/login/", { waitUntil: "networkidle" });
        await page.fill("#uname", "x"); await page.fill("#password", "y");
        await page.click("#tombolMasuk");
        await tungguPesan(page);
        p.lapor("kode tak dikenal → message backend ditampilkan", (await page.locator("#pesan").textContent()) === "Pesan cadangan dari backend");
        await page.evaluate(() => { document.getElementById("pesan").hidden = true; });
        await page.click("#tombolMasuk");
        await tungguPesan(page);
        p.lapor("tanpa code dan message → galat.http dengan status", (await page.locator("#pesan").textContent()) === id["galat.http"].replace("{status}", "500"));
        await ctx.close();
    }

    // ── 8. Bahasa: EN tanpa kedip, bertahan antarhalaman ──
    {
        const { ctx, page, galat } = await halamanBaru();
        await page.addInitScript(skripPerekam);
        await pasangApiTiruan(page, penjawabBaku(pengguna(4)));
        await page.goto(FE + "/login/", { waitUntil: "networkidle" });
        p.lapor("sebelum ganti: tombol masuk berbahasa Indonesia", (await page.locator("#tombolMasuk").textContent()) === id["masuk.tombol"]);

        const nav = page.waitForNavigation({ waitUntil: "networkidle", timeout: 10000 }).catch(() => null);
        await page.click('#wadahBahasa button[data-nilai="en"]');
        await nav;
        await page.waitForFunction(() => document.documentElement.lang === "en" && !document.documentElement.classList.contains("i18n-tunggu"), null, { timeout: 10000 }).catch(() => {});

        p.lapor('klik EN → halaman dimuat ulang dengan <html lang="en">', (await page.evaluate(() => document.documentElement.lang)) === "en");
        p.lapor("localStorage.itm_bahasa = en", (await page.evaluate(() => localStorage.getItem("itm_bahasa"))) === "en");
        p.lapor('teks tombol masuk jadi "Sign in"', (await page.locator("#tombolMasuk").textContent()) === "Sign in");
        p.lapor("judul dokumen berbahasa Inggris", (await page.title()) === en["masuk.judul_halaman"], await page.title());
        p.lapor("segmen EN ditandai aria-pressed", (await page.getAttribute('#wadahBahasa button[data-nilai="en"]', "aria-pressed")) === "true");

        const elemen = await page.evaluate(() => [...document.querySelectorAll("[data-i18n]")].map((e) => [e.dataset.i18n, e.textContent]));
        const sisaId = elemen.filter(([k, teks]) => id[k] !== en[k] && teks === id[k]).map(([k]) => k);
        const takCocok = elemen.filter(([k, teks]) => teks !== en[k]).map(([k, teks]) => `${k}=${JSON.stringify(teks)}`);
        p.lapor(`tidak ada [data-i18n] yang masih berisi teks kamus Indonesia (${elemen.length} elemen)`, elemen.length > 0 && sisaId.length === 0, sisaId.join(","));
        p.lapor("setiap [data-i18n] berisi nilai en.js untuk kuncinya", takCocok.length === 0, takCocok.join("; "));

        const r = await page.evaluate(() => window.__rekam);
        p.lapor('tanpa kedip: lang sudah "en" pada DOMContentLoaded', r.langDCL === "en", JSON.stringify(r));
        p.lapor("tanpa kedip: tirai i18n-tunggu terpasang saat teks pertama masuk DOM", r.tiraiSaatTeksPertama === true);
        p.lapor("tanpa kedip: saat tirai dibuka, teks sudah Inggris", r.teksSaatTiraiDibuka === en["masuk.tombol"], JSON.stringify(r.teksSaatTiraiDibuka));
        // Tirainya nyata di CSS, bukan hanya nama kelas.
        const tirai = await page.evaluate(() => {
            document.documentElement.classList.add("i18n-tunggu");
            const v = getComputedStyle(document.getElementById("tombolMasuk")).visibility;
            document.documentElement.classList.remove("i18n-tunggu");
            return v;
        });
        p.lapor("kelas i18n-tunggu benar-benar menyembunyikan [data-i18n] (visibility hidden)", tirai === "hidden", tirai);

        // Pilihan bertahan di halaman lain, termasuk teks yang dirakit nav.js.
        await pasangSesi(page, pengguna(4));
        await page.goto(FE + "/akun/", { waitUntil: "networkidle" });
        await page.waitForFunction(() => document.getElementById("uname").textContent.length > 0, null, { timeout: 8000 }).catch(() => {});
        p.lapor('/akun/ tetap <html lang="en">', (await page.evaluate(() => document.documentElement.lang)) === "en");
        p.lapor("/akun/: judul dokumen Inggris", (await page.title()) === en["akun.judul_halaman"]);
        p.lapor("/akun/: tombol simpan Inggris (data-i18n)", (await page.locator("#tombolSandi").textContent()) === en["umum.simpan"]);
        p.lapor("/akun/: judul layar Inggris (dirakit nav.js)", (await page.locator("header h1").textContent()) === en["layar.U-02"]);
        p.lapor("/akun/: tombol keluar Inggris (dirakit nav.js)", (await page.locator("header button.tombol-halus").textContent()) === en["umum.keluar"]);
        p.lapor("/akun/: nama peran Inggris (dari /auth/me)", (await page.locator("#peran").textContent()) === en["peran.4"]);
        p.lapor("/akun/: lang sudah en pada DOMContentLoaded", (await page.evaluate(() => window.__rekam.langDCL)) === "en");

        const nav2 = page.waitForNavigation({ waitUntil: "networkidle", timeout: 10000 }).catch(() => null);
        await page.click('header .segmen button[data-nilai="id"]');
        await nav2;
        await page.waitForFunction(() => document.documentElement.lang === "id" && !document.documentElement.classList.contains("i18n-tunggu"), null, { timeout: 10000 }).catch(() => {});
        p.lapor("kembali ke ID dari /akun/ berhasil", (await page.locator("#tombolSandi").textContent()) === id["umum.simpan"]);
        tanpaGalat("bahasa", galat);
        await ctx.close();
    }

    // ── 9. Tema: data-tema terpasang sebelum stylesheet ──
    for (const [simpan, harap, latar] of [["gelap", "gelap", "rgb(12, 19, 20)"], ["terang", "terang", "rgb(237, 242, 241)"]]) {
        const { ctx, page } = await halamanBaru();
        await page.addInitScript((t) => localStorage.setItem("itm_tema", t), simpan);
        await page.addInitScript(skripPerekam);
        await pasangApiTiruan(page, penjawabBaku(pengguna(4)));
        await page.goto(FE + "/login/", { waitUntil: "networkidle" });
        const h = await page.evaluate(() => {
            const anak = [...document.head.children];
            const s = anak.findIndex((e) => e.tagName === "SCRIPT" && /prapasang/.test(e.getAttribute("src") || ""));
            const l = anak.findIndex((e) => e.tagName === "LINK" && e.rel === "stylesheet" && /app\.css/.test(e.getAttribute("href") || ""));
            const skrip = anak[s];
            return {
                tema: document.documentElement.dataset.tema,
                latar: getComputedStyle(document.documentElement).backgroundColor,
                rekam: window.__rekam,
                urutan: { s, l, sinkron: !!skrip && !skrip.async && !skrip.defer && skrip.type !== "module" },
            };
        });
        p.lapor(`itm_tema=${simpan} → html[data-tema="${harap}"]`, h.tema === harap, String(h.tema));
        p.lapor(`tema ${harap}: data-tema sudah ada saat <link app.css> masuk DOM`, h.rekam.temaSaatStylesheet === harap, String(h.rekam.temaSaatStylesheet));
        p.lapor(`tema ${harap}: data-tema pada DOMContentLoaded`, h.rekam.temaDCL === harap);
        p.lapor("prapasang.js adalah skrip sinkron yang mendahului stylesheet di <head>", h.urutan.s >= 0 && h.urutan.l > h.urutan.s && h.urutan.sinkron, JSON.stringify(h.urutan));
        p.lapor(`tema ${harap}: latar html = ${latar}`, h.latar === latar, h.latar);
        await ctx.close();
    }
    {
        const { ctx, page } = await halamanBaru({ colorScheme: "dark" });
        await pasangApiTiruan(page, penjawabBaku(pengguna(4)));
        await page.goto(FE + "/login/", { waitUntil: "networkidle" });
        p.lapor("tanpa pilihan, prefers-color-scheme: dark → gelap", (await page.evaluate(() => document.documentElement.dataset.tema)) === "gelap");
        // Sakelar tema di /akun/ bekerja tanpa muat ulang.
        await pasangSesi(page, pengguna(4));
        await page.goto(FE + "/akun/", { waitUntil: "networkidle" });
        await page.click('#wadahTema button[data-nilai="terang"]');
        p.lapor("sakelar tema: pilih Terang → data-tema=terang seketika", (await page.evaluate(() => document.documentElement.dataset.tema)) === "terang");
        p.lapor("sakelar tema: pilihan tersimpan di itm_tema", (await page.evaluate(() => localStorage.getItem("itm_tema"))) === "terang");
        await page.click('#wadahTema button[data-nilai="sistem"]');
        p.lapor("sakelar tema: Ikut sistem menghapus itm_tema dan kembali ke gelap (sistem)", (await page.evaluate(() => localStorage.getItem("itm_tema") === null && document.documentElement.dataset.tema === "gelap")));
        await ctx.close();
    }

    // ── 10. Mode pakar dan nav per peran ──
    //
    // Saat ini hanya U-02 yang tersedia untuk semua peran, jadi layarUntuk()
    // menghasilkan satu tautan dan pasang() tidak membuat <nav>. Pemeriksaan
    // "tidak ada <nav>" INI AKAN BERUBAH saat layar lain dinyatakan tersedia
    // di layar.js: perbarui harapannya (atau andalkan pemeriksaan turunan di
    // bawahnya yang membaca layar.js).
    const tersedia = LAYAR.filter((l) => l.tersedia).map((l) => l.kode);
    p.lapor("keadaan saat ini: hanya U-01 dan U-02 yang tersedia (perbarui uji nav bila berubah)", tersedia.join(",") === "U-01,U-02", tersedia.join(","));
    for (const role of SEMUA_PERAN) {
        const { ctx, page, galat } = await halamanBaru();
        await pasangApiTiruan(page, penjawabBaku(pengguna(role)));
        await pasangSesi(page, pengguna(role));
        await page.goto(FE + "/akun/", { waitUntil: "networkidle" });
        await page.waitForFunction(() => document.getElementById("uname").textContent.length > 0, null, { timeout: 8000 }).catch(() => {});
        const kode = page.locator('[data-uji="kode-layar"]');
        const nKode = await kode.count();
        if (role === 6) {
            p.lapor("peran 6 (pakar): kode layar U-02 tampil", nKode === 1 && (await kode.textContent()) === "U-02", `count=${nKode}`);
        } else {
            p.lapor(`peran ${role}: kode layar tidak tampil`, nKode === 0, `count=${nKode}`);
        }
        const nNav = await page.locator("nav").count();
        const harapNav = layarUntuk(role).length > 1 ? 1 : 0;
        p.lapor(`peran ${role}: <nav> ${harapNav ? "ada" : "tidak ada"} sesuai layarUntuk() (${layarUntuk(role).length} tautan)`, nNav === harapNav, `nav=${nNav}`);
        p.lapor(`peran ${role}: nama peran dari kamus`, (await page.locator("#peran").textContent()) === id["peran." + role]);
        p.lapor(`peran ${role}: pita data sintetis ada`, await page.locator('[data-uji="pita-sintetis"]').isVisible());
        tanpaGalat(`peran ${role}`, galat);
        await ctx.close();
    }
} catch (e) {
    p.lapor("berjalan tanpa galat tak terduga", false, String(e && e.stack || e));
} finally {
    await browser.close();
}
process.exit(p.selesai());
