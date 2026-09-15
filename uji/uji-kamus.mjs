// Kamus dwibahasa (§16.2): kunci id.js dan en.js identik, tidak ada nilai
// kosong, placeholder {nama} setara, setiap kode layar dan peran punya
// terjemahan, dan setiap layar punya kode di definisinya. Tanpa peramban.
//
//   node uji-kamus.mjs
import { muatModulFrontend, pelapor } from "./bantu.mjs";

const p = pelapor("KAMUS");
const { LAYAR, SEMUA_PERAN, id, en } = await muatModulFrontend();

const placeholder = (s) => new Set(String(s).match(/\{\w+\}/g) || []);
const samaSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

// periksa mengembalikan masalah per kategori; kosong semua berarti lolos.
function periksa(id, en, layar, peran) {
    const m = { kunci: [], kosong: [], placeholder: [], layar: [], peran: [], definisi: [] };
    for (const k of Object.keys(id)) if (!(k in en)) m.kunci.push(`"${k}" ada di id, hilang di en`);
    for (const k of Object.keys(en)) if (!(k in id)) m.kunci.push(`"${k}" ada di en, hilang di id`);
    for (const [nama, kamus] of [["id", id], ["en", en]]) {
        for (const [k, v] of Object.entries(kamus)) {
            if (typeof v !== "string" || !v.trim()) m.kosong.push(`${nama}["${k}"]`);
        }
    }
    for (const k of Object.keys(id)) {
        if (!(k in en)) continue;
        const a = placeholder(id[k]), b = placeholder(en[k]);
        if (!samaSet(a, b)) m.placeholder.push(`"${k}": id ${[...a].join(",") || "-"} vs en ${[...b].join(",") || "-"}`);
    }
    const kodeTerlihat = new Set();
    layar.forEach((l, i) => {
        if (!l || typeof l.kode !== "string" || !/^[A-Z]-\d{2}$/.test(l.kode)) m.definisi.push(`layar #${i} tanpa kode yang sah (${JSON.stringify(l && l.kode)})`);
        else if (kodeTerlihat.has(l.kode)) m.definisi.push(`kode ${l.kode} ganda`);
        else kodeTerlihat.add(l.kode);
        if (!l || typeof l.url !== "string" || !/^\/.*\/$/.test(l.url)) m.definisi.push(`layar ${l && l.kode}: url harus berbentuk /nama/`);
        if (!l || !Array.isArray(l.peran) || !l.peran.length || !l.peran.every((r) => peran.includes(r))) m.definisi.push(`layar ${l && l.kode}: peran kosong atau tidak dikenal`);
        if (!l || typeof l.tersedia !== "boolean") m.definisi.push(`layar ${l && l.kode}: tersedia harus boolean`);
    });
    for (const k of kodeTerlihat) {
        for (const [nama, kamus] of [["id", id], ["en", en]]) if (!(("layar." + k) in kamus)) m.layar.push(`layar.${k} hilang di ${nama}`);
    }
    for (const r of peran) {
        for (const [nama, kamus] of [["id", id], ["en", en]]) if (!(("peran." + r) in kamus)) m.peran.push(`peran.${r} hilang di ${nama}`);
    }
    return m;
}

// ── positif ──
const hasil = periksa(id, en, LAYAR, SEMUA_PERAN);
p.lapor(`kunci id.js dan en.js identik (${Object.keys(id).length} kunci)`, hasil.kunci.length === 0, hasil.kunci.join("; "));
p.lapor("tidak ada nilai kosong di kedua kamus", hasil.kosong.length === 0, hasil.kosong.join("; "));
p.lapor("placeholder {nama} setara di kedua bahasa", hasil.placeholder.length === 0, hasil.placeholder.join("; "));
p.lapor(`setiap layar punya kode, url, peran, tersedia (${LAYAR.length} layar)`, hasil.definisi.length === 0, hasil.definisi.join("; "));
p.lapor("setiap kode layar punya layar.<kode> di kedua kamus", hasil.layar.length === 0, hasil.layar.join("; "));
p.lapor(`setiap peran ${SEMUA_PERAN.join(",")} punya peran.<n> di kedua kamus`, hasil.peran.length === 0, hasil.peran.join("; "));
p.lapor("peran yang didefinisikan tepat 1–6", SEMUA_PERAN.slice().sort().join(",") === "1,2,3,4,5,6", SEMUA_PERAN.join(","));
p.lapor("kamus memuat kunci galat.* (terjemahan kode backend)", Object.keys(id).some((k) => k.startsWith("galat.")));

// ── negatif: pemeriksa harus menangkap kesalahan yang disengaja (pada salinan) ──
const salin = (o) => JSON.parse(JSON.stringify(o));
const menyebut = (daftar, potongan) => daftar.some((s) => s.includes(potongan));
{
    const en2 = salin(en);
    delete en2["masuk.tombol"];
    en2["kunci.asing"] = "x";
    const h = periksa(id, en2, LAYAR, SEMUA_PERAN);
    p.lapor("negatif: kunci yang dihapus dari en terdeteksi", menyebut(h.kunci, '"masuk.tombol"'));
    p.lapor("negatif: kunci asing di en terdeteksi", menyebut(h.kunci, '"kunci.asing"'));
}
{
    const id2 = salin(id);
    id2["umum.simpan"] = "   ";
    const h = periksa(id2, en, LAYAR, SEMUA_PERAN);
    p.lapor("negatif: nilai kosong (spasi saja) terdeteksi", menyebut(h.kosong, 'id["umum.simpan"]'));
}
{
    const en2 = salin(en);
    en2["galat.http"] = "Request failed.";
    const h = periksa(id, en2, LAYAR, SEMUA_PERAN);
    p.lapor("negatif: placeholder {status} yang hilang di en terdeteksi", menyebut(h.placeholder, '"galat.http"'));
}
{
    const layar2 = LAYAR.concat([{ kode: "Z-99", url: "/tidak-ada/", peran: [4], tersedia: false }]);
    const h = periksa(id, en, layar2, SEMUA_PERAN);
    p.lapor("negatif: layar tanpa kunci layar.<kode> terdeteksi", menyebut(h.layar, "layar.Z-99 hilang di id") && menyebut(h.layar, "layar.Z-99 hilang di en"));
}
{
    const h = periksa(id, en, LAYAR, SEMUA_PERAN.concat([7]));
    p.lapor("negatif: peran tanpa kunci peran.<n> terdeteksi", menyebut(h.peran, "peran.7 hilang"));
}
{
    const layar2 = LAYAR.concat([{ url: "/tanpa-kode/", peran: [4], tersedia: false }]);
    const h = periksa(id, en, layar2, SEMUA_PERAN);
    p.lapor("negatif: layar tanpa kode menggagalkan uji", menyebut(h.definisi, "tanpa kode"));
}
{
    const layar2 = LAYAR.concat([{ kode: "U-02", url: "/ganda/", peran: [4], tersedia: false }]);
    const h = periksa(id, en, layar2, SEMUA_PERAN);
    p.lapor("negatif: kode layar ganda terdeteksi", menyebut(h.definisi, "U-02 ganda"));
}

process.exit(p.selesai());
