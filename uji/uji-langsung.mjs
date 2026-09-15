// Uji terhadap backend SUNGGUHAN (8095, Mongo berisi akun uji dari
// tools/seeduser). Membuktikan alur masuk, penolakan akun nonaktif, ganti
// sandi lewat formulir, dan Keluar — lewat antarmuka, bukan curl.
//
//   FRONTEND=http://127.0.0.1:5180 API=http://127.0.0.1:8095 node uji-langsung.mjs
//
// Backend harus mengizinkan asal frontend (FRONTEND_ORIGIN memuat FRONTEND);
// tanpa itu setiap panggilan dari peramban kandas di CORS, bukan di kode.
import { chromium } from "playwright";
import { FE, API, SANDI_UJI, pelapor, muatModulFrontend, redamFont, jalurDari, opsiPeluncur } from "./bantu.mjs";

const p = pelapor(`LANGSUNG — ${FE} → ${API}`);
const { id } = await muatModulFrontend();
const AKUN = "uji.karyawan";
const SANDI_SEMENTARA = "ujilokal123-sementara";   // ≥ 8 karakter dan ≠ sandi lama (syarat backend)

// ── prasyarat lewat Node: backend hidup dan CORS mengizinkan asal frontend ──
let sehat;
try { sehat = await fetch(API + "/health", { headers: { Origin: FE } }); }
catch (e) { console.error(`backend ${API} tidak terjangkau: ${e.message}`); process.exit(2); }
p.lapor("backend menjawab /health", sehat.ok, `HTTP ${sehat.status}`);
const acao = sehat.headers.get("access-control-allow-origin");
p.lapor(`CORS backend mengizinkan ${FE} (env FRONTEND_ORIGIN)`, acao === FE || acao === "*", `access-control-allow-origin=${acao}`);

async function apiMasuk(uname, sandi) {
    const r = await fetch(API + "/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ uname, password: sandi }) });
    return { status: r.status, data: await r.json().catch(() => ({})) };
}
async function apiGantiSandi(token, lama, baru) {
    const r = await fetch(API + "/auth/password", { method: "POST", headers: { "content-type": "application/json", login: token }, body: JSON.stringify({ lama, baru }) });
    return { status: r.status, data: await r.json().catch(() => ({})) };
}
// Kalau uji sebelumnya gugur di tengah, sandi bisa tertinggal di nilai
// sementara; kembalikan dulu supaya uji lain (juga uji backend) tidak rusak.
async function pulihkanSandi() {
    const coba = await apiMasuk(AKUN, SANDI_SEMENTARA);
    const token = coba.data && coba.data.data && coba.data.data.token;
    if (coba.status !== 200 || !token) return true;
    const r = await apiGantiSandi(token, SANDI_SEMENTARA, SANDI_UJI);
    p.catatan(`sandi ${AKUN} dipulihkan ke bawaan (HTTP ${r.status})`);
    return r.status === 200;
}
await pulihkanSandi();

const browser = await chromium.launch(opsiPeluncur());

async function masuk(uname, sandi) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const galat = [];
    page.on("pageerror", (e) => galat.push(e.message));
    await redamFont(page);
    await page.goto(FE + "/login/", { waitUntil: "networkidle" });
    await page.fill("#uname", uname);
    await page.fill("#password", sandi);
    await page.click("#tombolMasuk");
    // Selesai bila sudah di /akun/ ATAU pesan galat tampil di /login/.
    await page.waitForFunction(() => location.pathname.startsWith("/akun")
        || (document.getElementById("pesan") && !document.getElementById("pesan").hidden), null, { timeout: 15000 }).catch(() => {});
    if (jalurDari(page.url()) !== "/akun/") await page.waitForURL("**/akun/**", { timeout: 3000 }).catch(() => {});
    if (jalurDari(page.url()) === "/akun/") {
        await page.waitForFunction(() => document.getElementById("uname").textContent.length > 0, null, { timeout: 10000 }).catch(() => {});
    }
    return { ctx, page, galat };
}
const tanpaGalat = (nama, galat) => p.lapor(`${nama}: tanpa galat JavaScript`, galat.length === 0, galat.join(" | "));
const bacaSesi = (page) => page.evaluate(() => ({ token: localStorage.getItem("itm_token"), user: localStorage.getItem("itm_user") }));

// kirimSandi mengisi formulir ganti sandi dan menunggu pesan tampil ATAU
// halaman berpindah ke /login/ (yang terjadi bila sehat() menganggap 401
// sebagai sesi habis).
async function kirimSandi(page, lama, baru, ulang) {
    await page.evaluate(() => { document.getElementById("pesanSandi").hidden = true; });
    await page.fill("#lama", lama);
    await page.fill("#baru", baru);
    await page.fill("#ulang", ulang);
    await page.click("#tombolSandi");
    await page.waitForFunction(() => location.pathname.startsWith("/login")
        || (document.getElementById("pesanSandi") && !document.getElementById("pesanSandi").hidden), null, { timeout: 15000 }).catch(() => {});
    const jalur = jalurDari(page.url());
    const teks = jalur === "/akun/" ? await page.locator("#pesanSandi").textContent() : null;
    return { jalur, teks };
}

try {
    // ── A. Masuk sebagai karyawan, lalu Keluar ──
    {
        const { ctx, page, galat } = await masuk(AKUN, SANDI_UJI);
        p.lapor(`masuk ${AKUN} sampai di /akun/`, jalurDari(page.url()) === "/akun/", page.url());
        p.lapor("uname tampil dari /auth/me", (await page.locator("#uname").textContent()) === AKUN);
        p.lapor("peran tampil dari kamus (peran.4)", (await page.locator("#peran").textContent()) === id["peran.4"]);
        p.lapor("nama tampil di kepala halaman", ((await page.locator("header").textContent()) || "").includes("Uji Karyawan"));
        p.lapor("karyawan tidak melihat kode layar (bukan pakar)", (await page.locator('[data-uji="kode-layar"]').count()) === 0);
        const sesi = await bacaSesi(page);
        p.lapor("token sungguhan tersimpan", !!sesi.token && sesi.token.length > 20 && !!sesi.user && JSON.parse(sesi.user).uname === AKUN);

        await page.click("header button.tombol-halus");
        await page.waitForURL("**/login/**", { timeout: 10000 }).catch(() => {});
        p.lapor("Keluar → /login/", jalurDari(page.url()) === "/login/", page.url());
        const sisa = await bacaSesi(page);
        p.lapor("Keluar membersihkan localStorage", sisa.token === null && sisa.user === null, JSON.stringify(sisa));
        tanpaGalat("masuk & keluar", galat);
        await ctx.close();
    }

    // ── B. Akun nonaktif ditolak dengan pesan dari kamus ──
    {
        const { ctx, page, galat } = await masuk("uji.nonaktif", SANDI_UJI);
        p.lapor("uji.nonaktif tetap di /login/", jalurDari(page.url()) === "/login/", page.url());
        const teks = jalurDari(page.url()) === "/login/" ? await page.locator("#pesan").textContent() : null;
        p.lapor("pesan galat.akun_nonaktif dari kamus", teks === id["galat.akun_nonaktif"], JSON.stringify(teks));
        const sesi = await bacaSesi(page);
        p.lapor("tidak ada token tersimpan", sesi.token === null);
        tanpaGalat("akun nonaktif", galat);
        await ctx.close();
    }

    // ── C. Token palsu ditolak backend sungguhan → sesi dibuang ──
    {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await redamFont(page);
        await page.goto(FE + "/login/", { waitUntil: "domcontentloaded" });
        await page.evaluate(() => { localStorage.setItem("itm_token", "token-palsu"); localStorage.setItem("itm_user", JSON.stringify({ uname: "x", name: "X", role: 4 })); });
        await page.goto(FE + "/akun/", { waitUntil: "commit" }).catch(() => {});
        await page.waitForURL("**/login/**", { timeout: 10000 }).catch(() => {});
        p.lapor("token palsu: backend 401 → kembali ke /login/", jalurDari(page.url()) === "/login/", page.url());
        p.lapor("token palsu dibuang dari localStorage", (await bacaSesi(page)).token === null);
        await ctx.close();
    }

    // ── D. Ganti sandi: sandi lama salah ──
    //
    // Backend membalas 401 sandi_lama_salah. Kriterianya: pesan
    // galat.sandi_lama_salah tampil dan pengguna TETAP bersesi. Pada ui.js
    // saat ini sehat() memperlakukan setiap 401 selain kredensial_salah
    // sebagai sesi habis (buang sesi, ke /login/) — bila pemeriksaan ini
    // gagal dengan jalur=/login/, itu penyebabnya, bukan ujinya.
    {
        const { ctx, page, galat } = await masuk(AKUN, SANDI_UJI);
        const h = await kirimSandi(page, "bukan-sandinya-123", SANDI_SEMENTARA, SANDI_SEMENTARA);
        p.lapor("sandi lama salah → pesan galat.sandi_lama_salah", h.teks === id["galat.sandi_lama_salah"], `jalur=${h.jalur} teks=${JSON.stringify(h.teks)}`);
        p.lapor("sandi lama salah → tetap bersesi di /akun/", h.jalur === "/akun/" && (await bacaSesi(page)).token !== null);
        p.lapor("sandi lama salah → sandi bawaan masih berlaku", (await apiMasuk(AKUN, SANDI_UJI)).status === 200);
        tanpaGalat("sandi lama salah", galat);
        await ctx.close();
    }

    // ── E. Ganti sandi: isian ulang tidak sama → tanpa permintaan ke API ──
    {
        const { ctx, page, galat } = await masuk(AKUN, SANDI_UJI);
        let permintaan = 0;
        page.on("request", (r) => { if (jalurDari(r.url()) === "/auth/password") permintaan++; });
        const h = await kirimSandi(page, SANDI_UJI, SANDI_SEMENTARA, SANDI_SEMENTARA + "-beda");
        p.lapor("isian ulang tidak sama → pesan akun.sandi_tidak_sama", h.teks === id["akun.sandi_tidak_sama"], JSON.stringify(h.teks));
        p.lapor("isian ulang tidak sama → tidak ada permintaan ke /auth/password", permintaan === 0, `permintaan=${permintaan}`);
        p.lapor("tombol simpan tetap aktif", await page.locator("#tombolSandi").isEnabled());
        tanpaGalat("isian tidak sama", galat);
        await ctx.close();
    }

    // ── F. Ganti sandi berhasil, lalu dikembalikan ──
    {
        const { ctx, page, galat } = await masuk(AKUN, SANDI_UJI);
        const h1 = await kirimSandi(page, SANDI_UJI, SANDI_SEMENTARA, SANDI_SEMENTARA);
        p.lapor("ganti sandi berhasil → pesan akun.sandi_berhasil", h1.teks === id["akun.sandi_berhasil"], `jalur=${h1.jalur} teks=${JSON.stringify(h1.teks)}`);
        p.lapor("formulir dikosongkan setelah berhasil", h1.jalur === "/akun/" && (await page.inputValue("#lama")) === "" && (await page.inputValue("#baru")) === "");
        p.lapor("sandi baru berlaku di backend", (await apiMasuk(AKUN, SANDI_SEMENTARA)).status === 200);
        p.lapor("sandi lama tidak berlaku lagi", (await apiMasuk(AKUN, SANDI_UJI)).status === 401);
        p.lapor("sesi lama tetap berlaku setelah ganti sandi", h1.jalur === "/akun/");

        const h2 = h1.jalur === "/akun/" ? await kirimSandi(page, SANDI_SEMENTARA, SANDI_UJI, SANDI_UJI) : { jalur: h1.jalur, teks: null };
        p.lapor("sandi dikembalikan ke ujilokal123 lewat formulir", h2.teks === id["akun.sandi_berhasil"], JSON.stringify(h2.teks));
        tanpaGalat("ganti sandi", galat);
        await ctx.close();
    }
} catch (e) {
    p.lapor("berjalan tanpa galat tak terduga", false, String(e && e.stack || e));
} finally {
    await browser.close();
    // Jaring pengaman: apa pun yang terjadi di atas, sandi kembali ke bawaan.
    const pulih = await pulihkanSandi().catch(() => false);
    p.lapor("sandi uji.karyawan kembali ujilokal123 (dicek lewat API)", pulih && (await apiMasuk(AKUN, SANDI_UJI)).status === 200);
}
process.exit(p.selesai());
