// Bukti ujung-ke-ujung: situs publik GitHub Pages memanggil Cloud Function.
// Dijalankan sekali dari mubaroqadb-lab, bukan bagian dari suite uji.
import { chromium } from "playwright";

const SITUS = "https://itm-unfari.github.io";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, bypassCSP: false });
const page = await ctx.newPage();
const galat = [];
const asalDipanggil = new Set();
page.on("pageerror", (e) => galat.push(e.message));
page.on("console", (m) => { if (m.type() === "error") galat.push("console: " + m.text()); });
page.on("request", (r) => { const u = new URL(r.url()); if (u.host !== "itm-unfari.github.io" && !u.host.includes("fonts.g")) asalDipanggil.add(u.origin); });
page.on("response", async (r) => {
    if (r.url().includes("/auth/")) console.log("   jawaban " + r.status() + " " + r.url());
});

function lapor(nama, ok, ket) { console.log((ok ? "✓ " : "✗ ") + nama + (ket ? "  — " + ket : "")); return ok; }
let semua = true;

await page.goto(SITUS + "/login/?t=" + Date.now(), { waitUntil: "networkidle" });
const latar = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
semua = lapor("halaman masuk bergaya (CSS terpasang)", latar !== "rgba(0, 0, 0, 0)", latar) && semua;
const asalKlien = await page.evaluate(() => window.location.hostname);
console.log("   host: " + asalKlien);

await page.fill("#uname", "uji.hr");
await page.fill("#password", "ujilokal123");
await page.click("#tombolMasuk");
await page.waitForTimeout(6000);
const pesanLayar = (await page.locator("#pesan").textContent().catch(() => "")) || "";
semua = lapor("masuk sebagai uji.hr mendarat di layar kerjanya", !page.url().includes("/login/"), page.url() + " | pesan: " + pesanLayar.trim()) && semua;

const token = await page.evaluate(() => localStorage.getItem("itm_token"));
semua = lapor("token tersimpan dari backend produksi", !!token && token.length > 20) && semua;

if (token) {
    await page.waitForTimeout(2500);
    const isi = (await page.locator("main").textContent().catch(() => "")) || "";
    semua = lapor("data Atlas tampil di layar", isi.length > 40, isi.slice(0, 80).replace(/\s+/g, " ")) && semua;

    // H-03 adalah /peluang/; /kandidat/ (M-02) hanya untuk manajer dan pakar,
    // jadi membukanya sebagai HR akan dialihkan balik ke /pipeline/ dan
    // pemeriksaan ini akan lolos karena alasan yang salah. URL akhir ikut
    // diperiksa supaya pengalihan diam-diam tidak lolos lagi.
    await page.goto(SITUS + "/peluang/", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    const barisPeluang = await page.locator("main tbody tr").count();
    const diPeluang = new URL(page.url()).pathname === "/peluang/";
    semua = lapor("H-03 daftar peluang terisi dari Atlas, tanpa dialihkan",
        diPeluang && barisPeluang > 1, "baris=" + barisPeluang + " url=" + page.url()) && semua;
}

semua = lapor("permintaan luar hanya ke Cloud Function", asalDipanggil.size === 1 && [...asalDipanggil][0].includes("cloudfunctions"), [...asalDipanggil].join(",")) && semua;
semua = lapor("tanpa galat JavaScript", galat.length === 0, galat.slice(0, 3).join(" | ")) && semua;

await browser.close();
console.log(semua ? "\n✓ situs publik tersambung ke backend produksi" : "\n✗ ada yang gagal");
process.exit(semua ? 0 : 1);
