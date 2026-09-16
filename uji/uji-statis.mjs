// Disiplin kode tanpa peramban (§16.2): setiap callback jscroot diawali
// sehat(), tidak ada penulisan DOM lewat string HTML, dan setiap halaman
// berkode memakai kerangka requireLogin/requireRole/pasang dengan kode yang
// ada di layar.js.
//
//   node uji-statis.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { muatModulFrontend, pelapor, FRASA_CATATAN } from "./bantu.mjs";

const AKAR = path.resolve(import.meta.dirname, "..");
const p = pelapor("STATIS");
const { LAYAR, id: KAMUS_ID, en: KAMUS_EN } = await muatModulFrontend();

function berkas(dir, hasil = []) {
    for (const n of readdirSync(dir)) {
        if (["node_modules", "uji", ".git", "jscroot"].includes(n) || n.startsWith(".")) continue;
        const f = path.join(dir, n);
        if (statSync(f).isDirectory()) berkas(f, hasil);
        else if (/\.(html|js)$/.test(n) && !f.includes(path.join("assets", "css"))) hasil.push(f);
    }
    return hasil;
}

// Komentar dibuang dulu: banyak komentar justru MENYEBUT innerHTML sebagai
// larangan. Pemotongan kasar (tidak memahami string berisi "//") cukup untuk
// kode frontend ini, yang tidak menaruh URL literal di baris kode.
function tanpaKomentar(teks) {
    return teks.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1");
}

const SINK = /\b(innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b|\b(setInner|addInner|addChild|renderHTML|replaceTag)\s*\(/g;

// periksaCallback mencari setiap getJSON/postJSON yang callback-nya berupa
// fungsi anonim (langsung atau dibungkus satu pemanggil, mis.
// denganTombol(b, function (hasil) {...})) dan menuntut sehat( muncul di
// tiga pernyataan pertamanya. Callback bernama dicatat untuk diperiksa
// dengan mencari definisi fungsinya di berkas yang sama.
function periksaCallback(teks) {
    const masalah = [];
    let n = 0;
    const re = /\b(getJSON|postJSON)\s*\(/g;
    let m;
    while ((m = re.exec(teks))) {
        const potong = teks.slice(m.index, m.index + 1200);
        const anon = potong.match(/function\s*\(\s*(\w*)\s*\)\s*\{/);
        const bernama = potong.match(/^\w+\s*\([^,]+,\s*(?:\{[\s\S]*?\}\s*,\s*|[^,()]+,\s*)?(\w+)\s*[,)]/);
        n++;
        const baris = teks.slice(0, m.index).split("\n").length;
        // function () tanpa parameter = balasan sengaja diabaikan (logout
        // "sebisanya": backend mati tidak boleh menahan tombol Keluar).
        if (anon && anon.index < 400 && !anon[1]) continue;
        if (anon && anon.index < 400) {
            // Tiga pernyataan pertama; satu penjaga awal (mis. 404 yang memang
            // bukan galat halaman, atau memulihkan tombol) boleh mendahului.
            const badan = potong.slice(anon.index + anon[0].length);
            const awal = badan.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 4).join(" ");
            if (!awal.includes("sehat(")) masalah.push(`baris ${baris}: callback tidak diawali sehat() — "${awal.slice(0, 90)}"`);
        } else if (bernama) {
            const nama = bernama[1];
            const def = teks.match(new RegExp(`function\\s+${nama}\\s*\\(\\s*\\w+\\s*\\)\\s*\\{([\\s\\S]{0,300})`));
            if (def && !def[1].split("\n").slice(0, 6).join(" ").includes("sehat(")) masalah.push(`baris ${baris}: callback ${nama} tidak diawali sehat()`);
            if (!def && !["tokenHeader"].includes(nama)) masalah.push(`baris ${baris}: callback ${nama} tidak ditemukan untuk diperiksa`);
        }
    }
    return { n, masalah };
}

let totalCb = 0;
const semuaMasalahCb = [], semuaSink = [];
for (const f of berkas(AKAR)) {
    const rel = path.relative(AKAR, f);
    // minta.js MENDEFINISIKAN getJSON/postJSON, bukan memanggilnya.
    if (rel === path.join("assets", "js", "minta.js")) continue;
    const teks = tanpaKomentar(readFileSync(f, "utf8"));
    const sink = [...teks.matchAll(SINK)].map((x) => x[0]);
    if (sink.length) semuaSink.push(`${rel}: ${[...new Set(sink)].join(", ")}`);
    const { n, masalah } = periksaCallback(teks);
    totalCb += n;
    masalah.forEach((x) => semuaMasalahCb.push(`${rel} ${x}`));
}
p.lapor("tidak ada penulisan DOM lewat string HTML di halaman dan modul", semuaSink.length === 0, semuaSink.join("; "));
p.lapor(`setiap callback jscroot diawali sehat() (${totalCb} panggilan)`, semuaMasalahCb.length === 0 && totalCb > 50, semuaMasalahCb.join("; "));

const halaman = LAYAR.filter((l) => l.tersedia && !["U-01", "U-02"].includes(l.kode));
const kerangka = [];
for (const l of halaman) {
    const f = path.join(AKAR, l.url, "index.html");
    let teks = "";
    try { teks = readFileSync(f, "utf8"); } catch (e) { kerangka.push(`${l.kode}: ${l.url}index.html tidak ada`); continue; }
    const rr = [...teks.matchAll(/requireRole\("([A-Z]-\d{2})"\)/g)].map((x) => x[1]);
    const ps = [...teks.matchAll(/pasang\("([A-Z]-\d{2})"\)/g)].map((x) => x[1]);
    if (!teks.includes("requireLogin()") || rr.join() !== l.kode || ps.join() !== l.kode) kerangka.push(`${l.kode}: requireRole=${rr} pasang=${ps}`);
    if (!/<div id="pesan" hidden role="alert"><\/div>/.test(teks)) kerangka.push(`${l.kode}: tanpa #pesan`);
}
p.lapor(`setiap layar tersedia punya halaman dengan kerangka dan kode yang sama (${halaman.length} layar)`, kerangka.length === 0, kerangka.join("; "));
p.lapor("seluruh 24 kode layar tersedia", LAYAR.length === 24 && LAYAR.every((l) => l.tersedia), LAYAR.filter((l) => !l.tersedia).map((l) => l.kode).join(","));

// Catatan internal tidak tampil di frontend (revisi 9): tidak ada teks kamus
// yang memuat frasa catatan, dan halaman tidak membangun pita data sintetis.
function frasaDiKamus(...kamus) {
    const kena = [];
    for (const k of kamus) for (const [kunci, nilai] of Object.entries(k)) {
        const n = String(nilai).toLowerCase();
        FRASA_CATATAN.forEach((f) => { if (n.includes(f)) kena.push(`${kunci}: "${f}"`); });
    }
    return kena;
}
const frasa = frasaDiKamus(KAMUS_ID, KAMUS_EN);
p.lapor("kamus tidak memuat teks catatan internal", frasa.length === 0, frasa.join("; "));
const pita = berkas(AKAR).filter((f) => /pita-sintetis|pita_sintetis|umum\.tandaAI/.test(readFileSync(f, "utf8"))).map((f) => path.relative(AKAR, f));
p.lapor("halaman tidak membangun pita data sintetis maupun label usulan AI", pita.length === 0, pita.join(", "));

// ── negatif: pemeriksa harus menangkap kesalahan yang disengaja ──
p.lapor("negatif: frasa catatan di kamus tertangkap", frasaDiKamus({ "x.y": "Data sintetis — bukan data karyawan sungguhan" }).length === 1);
{
    const buruk = 'getJSON(url, function (hasil) {\n    const d = hasil.data.data;\n    tampil(d);\n}, ...tokenHeader());';
    p.lapor("negatif: callback tanpa sehat() tertangkap", periksaCallback(buruk).masalah.length === 1);
    const baik = 'getJSON(url, function (hasil) {\n    if (!sehat(hasil, elPesan)) return;\n    tampil(hasil);\n}, ...tokenHeader());';
    p.lapor("negatif: callback dengan sehat() lolos", periksaCallback(baik).masalah.length === 0);
    const bungkus = 'postJSON(url, {}, denganTombol(b, function (hasil) {\n    tampil(hasil);\n}), ...tokenHeader());';
    p.lapor("negatif: callback terbungkus tanpa sehat() tertangkap", periksaCallback(bungkus).masalah.length === 1);
    p.lapor("negatif: innerHTML tertangkap", [..."x.innerHTML = y".matchAll(SINK)].length === 1);
}

process.exit(p.selesai());
