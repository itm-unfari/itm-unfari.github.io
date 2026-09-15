// Tangkapan wireframe/mockup (§16.2): setiap layar `tersedia: true` di
// layar.js × bahasa id/en × tema terang/gelap, lebar 1280 dan 400 (-hp),
// satu halaman penuh, ke uji/tangkapan/<kode>-<bahasa>-<tema>[-hp].png.
// API dipalsukan; layar yang butuh sesi mendapat sesi tiruan.
//
//   node tangkap-layar.mjs            peran sesi: 4 (karyawan) untuk layar
//                                     semua-peran, selain itu peran pertama
//   PERAN=6 node tangkap-layar.mjs    memaksa peran (mis. pakar → kode layar)
//
// Daftar layar diambil dengan mengimpor layar.js sungguhan (lewat tiruan
// `window` minimal di bantu.mjs), bukan regex: bila definisinya berubah
// bentuk, impornya gagal keras alih-alih diam-diam melewatkan layar.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { FE, muatModulFrontend, pasangApiTiruan, penjawabBaku, pengguna, redamFont, opsiPeluncur } from "./bantu.mjs";

const { LAYAR, SEMUA_PERAN } = await muatModulFrontend();
const KELUAR = path.resolve(import.meta.dirname, "tangkapan");
await mkdir(KELUAR, { recursive: true });
const PERAN_PAKSA = process.env.PERAN ? Number(process.env.PERAN) : null;
if (PERAN_PAKSA && !SEMUA_PERAN.includes(PERAN_PAKSA)) { console.error("PERAN harus 1–6"); process.exit(2); }

const tersedia = LAYAR.filter((l) => l.tersedia);
if (!tersedia.length) { console.error("✗ tidak ada layar tersedia di layar.js"); process.exit(1); }
console.log(`\n══ TANGKAP LAYAR — ${tersedia.length} layar × 2 bahasa × 2 tema × 2 lebar → ${KELUAR} ══`);

const browser = await chromium.launch(opsiPeluncur());
let gagal = 0, jadi = 0;
try {
    for (const l of tersedia) for (const bahasa of ["id", "en"]) for (const tema of ["terang", "gelap"]) {
        const nama = `${l.kode}-${bahasa}-${tema}`;
        const butuhSesi = l.url !== "/login/";   // halaman masuk mengalihkan pengguna bersesi
        const peran = PERAN_PAKSA || (l.peran.length === SEMUA_PERAN.length ? 4 : l.peran[0]);
        const u = pengguna(peran);
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
        await ctx.addInitScript(({ bahasa, tema, sesi, u }) => {
            localStorage.setItem("itm_bahasa", bahasa);
            localStorage.setItem("itm_tema", tema);
            if (sesi) { localStorage.setItem("itm_token", "token-uji"); localStorage.setItem("itm_user", JSON.stringify(u)); }
        }, { bahasa, tema, sesi: butuhSesi, u });
        const page = await ctx.newPage();
        await redamFont(page, true);
        await pasangApiTiruan(page, penjawabBaku(u));
        try {
            await page.goto(FE + l.url, { waitUntil: "networkidle", timeout: 20000 });
            await page.waitForFunction(() => !document.documentElement.classList.contains("i18n-tunggu"), null, { timeout: 8000 });
            if (butuhSesi) await page.waitForFunction(() => document.getElementById("uname") === null || document.getElementById("uname").textContent.length > 0, null, { timeout: 8000 }).catch(() => {});
            await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]));
            await page.waitForTimeout(250);
            const jalur = new URL(page.url()).pathname;
            if (jalur !== l.url) throw new Error(`halaman berpindah ke ${jalur}`);
            await page.screenshot({ path: path.join(KELUAR, nama + ".png"), fullPage: true });
            await page.setViewportSize({ width: 400, height: 800 });
            await page.waitForTimeout(250);
            await page.screenshot({ path: path.join(KELUAR, nama + "-hp.png"), fullPage: true });
            jadi += 2;
            console.log(`✓ ${nama}.png, ${nama}-hp.png`);
        } catch (e) {
            gagal++;
            console.log(`✗ ${nama}: ${e.message}`);
        }
        await ctx.close();
    }
} finally {
    await browser.close();
}
console.log(gagal ? `\n✗ ${gagal} kombinasi gagal, ${jadi} berkas jadi` : `\n✓ ${jadi} berkas tangkapan di ${KELUAR}`);
process.exit(gagal ? 1 : 0);
