// Tangkapan wireframe/mockup (§16.2): setiap layar `tersedia: true` di
// layar.js × bahasa id/en × tema terang/gelap, lebar 1280 dan 400 (-hp),
// satu halaman penuh, ke uji/tangkapan/<kode>-<bahasa>-<tema>[-hp].png.
// API dipalsukan; layar yang butuh sesi mendapat sesi tiruan.
//
//   node tangkap-layar.mjs            peran sesi: 4 (karyawan) untuk layar
//                                     semua-peran, selain itu peran pertama
//   PERAN=6 node tangkap-layar.mjs    memaksa peran (mis. pakar → kode layar);
//                                     nama berkas diberi akhiran -p<peran>
//   node tangkap-layar.mjs --langsung data backend sungguhan (8095): layar
//                                     terisi, bukan kerangka kosong
//
// Daftar layar diambil dengan mengimpor layar.js sungguhan (lewat tiruan
// `window` minimal di bantu.mjs), bukan regex: bila definisinya berubah
// bentuk, impornya gagal keras alih-alih diam-diam melewatkan layar.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { FE, muatModulFrontend, pasangApiTiruan, penjawabBaku, pengguna, redamFont, opsiPeluncur, layarLangsung } from "./bantu.mjs";

const { LAYAR, SEMUA_PERAN } = await muatModulFrontend();
const KELUAR = path.resolve(import.meta.dirname, "tangkapan");
await mkdir(KELUAR, { recursive: true });
const PERAN_PAKSA = process.env.PERAN ? Number(process.env.PERAN) : null;
if (PERAN_PAKSA && !SEMUA_PERAN.includes(PERAN_PAKSA)) { console.error("PERAN harus 1–6"); process.exit(2); }

const LANGSUNG = process.argv.includes("--langsung");
const tersedia = LANGSUNG
    ? await layarLangsung(PERAN_PAKSA)
    : LAYAR.filter((l) => l.tersedia && (!PERAN_PAKSA || l.url === "/login/" || l.peran.includes(PERAN_PAKSA))).map((l) => {
        const peran = PERAN_PAKSA || (l.peran.length === SEMUA_PERAN.length ? 4 : l.peran[0]);
        return { kode: l.kode, jalur: l.url, query: "", sesi: l.url !== "/login/", peran, u: pengguna(peran), token: "token-uji" };
    });
if (!tersedia.length) { console.error("✗ tidak ada layar tersedia di layar.js"); process.exit(1); }
console.log(`\n══ TANGKAP LAYAR${LANGSUNG ? " (data langsung)" : ""} — ${tersedia.length} layar × 2 bahasa × 2 tema × 2 lebar → ${KELUAR} ══`);

const browser = await chromium.launch(opsiPeluncur());
let gagal = 0, jadi = 0;
try {
    for (const l of tersedia) for (const bahasa of ["id", "en"]) for (const tema of ["terang", "gelap"]) {
        const nama = `${l.kode}-${bahasa}-${tema}${PERAN_PAKSA ? "-p" + PERAN_PAKSA : ""}`;
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
        await ctx.addInitScript(({ bahasa, tema, sesi, u, token }) => {
            localStorage.setItem("itm_bahasa", bahasa);
            localStorage.setItem("itm_tema", tema);
            if (sesi) { localStorage.setItem("itm_token", token); localStorage.setItem("itm_user", JSON.stringify(u)); }
        }, { bahasa, tema, sesi: l.sesi, u: l.u, token: l.token });
        const page = await ctx.newPage();
        await redamFont(page, true);
        if (!LANGSUNG) await pasangApiTiruan(page, penjawabBaku(l.u));
        try {
            await page.goto(FE + l.jalur + l.query, { waitUntil: "networkidle", timeout: 20000 });
            await page.waitForFunction(() => !document.documentElement.classList.contains("i18n-tunggu"), null, { timeout: 8000 });
            if (l.jalur === "/akun/") await page.waitForFunction(() => document.getElementById("uname").textContent.length > 0, null, { timeout: 8000 }).catch(() => {});
            await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]));
            await page.waitForTimeout(LANGSUNG ? 1200 : 250);
            const jalur = new URL(page.url()).pathname;
            if (jalur !== l.jalur) throw new Error(`halaman berpindah ke ${jalur}`);
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
