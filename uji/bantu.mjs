// Perkakas bersama uji frontend ITM: alamat, pelapor ✓/✗, pemuat modul
// frontend di Node, sesi tiruan, dan API tiruan lewat page.route.

export const FE = (process.env.FRONTEND || "http://127.0.0.1:5180").replace(/\/+$/, "");
export const API = (process.env.API || "http://127.0.0.1:8095").replace(/\/+$/, "");
export const SANDI_UJI = "ujilokal123";

// Sama dengan tools/seeduser/main.go di itm-gocroot.
export const AKUN_UJI = {
    1: { uname: "uji.admin", name: "Uji Admin" },
    2: { uname: "uji.hr", name: "Uji HR" },
    3: { uname: "uji.manajer", name: "Uji Manajer" },
    4: { uname: "uji.karyawan", name: "Uji Karyawan" },
    5: { uname: "uji.auditor", name: "Uji Auditor" },
    6: { uname: "uji.pakar", name: "Uji Pakar" },
};

// pengguna membentuk objek seperti publicUser() di controller/auth.go.
export function pengguna(role, tambahan) {
    const a = AKUN_UJI[role] || { uname: "uji.tak-dikenal", name: "Uji" };
    return Object.assign(
        { id: "uji-" + role, uname: a.uname, name: a.name, role: role, role_name: "", sintetis: true },
        tambahan || {},
    );
}

export function pelapor(judul) {
    let lulus = 0, gagal = 0;
    console.log(`\n══ ${judul} ══`);
    return {
        lapor(nama, ok, ket = "") {
            ok ? lulus++ : gagal++;
            console.log(`${ok ? "✓" : "✗"} ${nama}${ket ? "  — " + ket : ""}`);
            return ok;
        },
        catatan(teks) { console.log("  · " + teks); },
        get gagal() { return gagal; },
        selesai() {
            console.log(gagal ? `\n✗ ${gagal} gagal, ${lulus} lolos` : `\n✓ semua lolos (${lulus} pemeriksaan)`);
            return gagal ? 1 : 0;
        },
    };
}

// muatModulFrontend mengimpor layar.js, config.js, dan kedua kamus di Node.
//
// config.js membaca window.location saat diimpor. Tiruan `window` di sini
// sengaja sekecil mungkin: kalau config.js kelak menyentuh bagian lain dari
// window, impornya gagal keras di sini — bukan diam-diam salah baca seperti
// kalau daftarnya diambil lewat regex. Impor dinamis wajib: impor statis
// dinaikkan ke atas dan berjalan sebelum tiruan ini terpasang.
export async function muatModulFrontend() {
    if (typeof globalThis.window === "undefined") {
        globalThis.window = { location: { hostname: "127.0.0.1", protocol: "http:" } };
    }
    const [layar, config, id, en] = await Promise.all([
        import("../assets/js/layar.js"),
        import("../assets/js/config.js"),
        import("../assets/js/kamus/id.js"),
        import("../assets/js/kamus/en.js"),
    ]);
    return {
        LAYAR: layar.LAYAR, layarUntuk: layar.layarUntuk, cariLayar: layar.cariLayar,
        PERAN: config.PERAN, SEMUA_PERAN: config.SEMUA_PERAN,
        id: id.default, en: en.default,
    };
}

// ── API tiruan ──

export const amplopOk = (data) => ({ status: "ok", data });
export const amplopGalat = (code, message) => ({ status: "error", code, message });

function tajukCors(request) {
    const h = request.headers();
    return {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "access-control-allow-origin": h.origin || "*",
        "access-control-allow-headers": "content-type, accept, login, authorization, token",
        "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
        "access-control-max-age": "600",
    };
}

// penjawabBaku: jawaban sukses untuk setiap rute auth, dipakai sebagai dasar
// lalu ditimpa per skenario.
export function penjawabBaku(user, token = "token-uji") {
    return {
        "/health": () => ({ status: 200, body: amplopOk({ status: "ok" }) }),
        "/auth/login": () => ({ status: 200, body: amplopOk({ token, user }) }),
        "/auth/me": () => ({ status: 200, body: amplopOk(user) }),
        "/auth/logout": () => ({ status: 200, body: amplopOk({ message: "berhasil keluar" }) }),
        "/auth/password": () => ({ status: 200, body: amplopOk({ message: "sandi diperbarui" }) }),
    };
}

// pasangApiTiruan menjawab **/auth/** dan **/health dari `penjawab` (jalur →
// fungsi yang mengembalikan {status, body}) dan mencatat setiap permintaan.
// Permintaan OPTIONS (preflight CORS, karena ada header `login` dan
// Content-Type JSON) dijawab 204 di sini juga, supaya uji tidak bergantung
// pada apakah Playwright menyintesis preflight sendiri.
export async function pasangApiTiruan(page, penjawab) {
    const dicatat = [];
    const tangani = async (route) => {
        const request = route.request();
        if (request.method() === "OPTIONS") {
            return route.fulfill({ status: 204, headers: tajukCors(request) });
        }
        const jalur = new URL(request.url()).pathname.replace(/\/+$/, "") || "/";
        dicatat.push({ jalur, method: request.method(), url: request.url(), headers: request.headers(), badan: request.postData() });
        const fn = penjawab[jalur];
        const jawab = fn ? await fn(request) : { status: 404, body: amplopGalat("rute_tidak_ditemukan", "alamat yang diminta tidak ada") };
        return route.fulfill({ status: jawab.status || 200, headers: tajukCors(request), body: JSON.stringify(jawab.body) });
    };
    await page.route("**/auth/**", tangani);
    await page.route("**/health", tangani);
    // /api/** yang tidak disebut penjawab dijawab 404 rute_tidak_ditemukan,
    // BUKAN diteruskan ke jaringan: backend sungguhan akan menolak token
    // tiruan dengan 401 sesi_tidak_sah dan halaman membuang sesi.
    await page.route("**/api/**", tangani);
    return dicatat;
}

// redamFont menjawab Google Fonts secara lokal supaya `networkidle` tidak
// menunggu jaringan luar di server tanpa internet. coba=true mencoba
// mengunduh dulu (untuk tangkapan layar) dan baru mengosongkan bila gagal.
export async function redamFont(page, coba = false) {
    const tangani = async (route) => {
        if (coba) {
            try {
                const r = await route.fetch({ timeout: 5000 });
                return route.fulfill({ response: r });
            } catch (e) { /* luring: pakai huruf cadangan */ }
        }
        const font = /gstatic/.test(route.request().url());
        return route.fulfill({ status: 200, contentType: font ? "font/woff2" : "text/css", body: "" });
    };
    await page.route("https://fonts.googleapis.com/**", tangani);
    await page.route("https://fonts.gstatic.com/**", tangani);
}

// pasangSesi menanam token lewat evaluate, BUKAN addInitScript: init script
// berjalan ulang di setiap navigasi dan akan menanam kembali token yang baru
// saja dibuang halaman — uji 401 berubah jadi gelung pengalihan.
export async function pasangSesi(page, user, token = "token-uji") {
    await page.goto(FE + "/login/", { waitUntil: "domcontentloaded" });
    await page.evaluate(([t, u]) => {
        localStorage.setItem("itm_token", t);
        localStorage.setItem("itm_user", JSON.stringify(u));
    }, [token, user]);
}

export const jalurDari = (url) => new URL(url).pathname;

// ── backend sungguhan ──

// masukApi masuk langsung ke backend (tanpa peramban) dan mengembalikan
// {token, user}; dipakai uji langsung untuk menyiapkan sesi dan mencari id.
export async function masukApi(uname, sandi = SANDI_UJI) {
    const r = await fetch(API + "/auth/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ uname, password: sandi }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.data || !j.data.token) throw new Error(`masuk ${uname} gagal: HTTP ${r.status} ${j.code || ""}`);
    return j.data;
}

export async function apiJSON(token, jalur, badan) {
    const r = await fetch(API + jalur, {
        method: badan === undefined ? "GET" : "POST",
        headers: { "content-type": "application/json", login: token },
        body: badan === undefined ? undefined : JSON.stringify(badan),
    });
    const j = await r.json().catch(() => ({}));
    // http terpisah dari status amplop ("ok"/"error"), yang bernama sama.
    return { ...j, http: r.status };
}

// jalankanPekerjaAI memproses antrean tugas AI sekali (tools/pekerja-ai di
// repo backend). Repo backend dianggap bersebelahan dengan repo ini kecuali
// BACKEND_REPO diatur.
export async function jalankanPekerjaAI() {
    const { spawn } = await import("node:child_process");
    const path = await import("node:path");
    const repo = process.env.BACKEND_REPO || path.resolve(import.meta.dirname, "..", "..", "itm-gocroot");
    return new Promise((ok, gagal) => {
        const p = spawn("go", ["run", "./tools/pekerja-ai"], { cwd: repo, stdio: "ignore" });
        p.on("error", gagal);
        p.on("exit", (kode) => (kode === 0 ? ok() : gagal(new Error("pekerja-ai keluar " + kode))));
    });
}

// opsiPeluncur: PW_CHANNEL=chrome memakai Chrome sistem bila Chromium
// bawaan Playwright belum diunduh (npx playwright install chromium).
export function opsiPeluncur() {
    return process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {};
}

// layarLangsung menyiapkan setiap layar tersedia untuk dibuka dengan data
// backend sungguhan: peran utamanya (peran pertama di layar.js; U-02 sebagai
// karyawan) atau peranPaksa, sesi dari /auth/login, dan parameter id yang
// dicari dari backend untuk layar yang dibuka dari layar lain. Layar yang
// tidak boleh dibuka peranPaksa tidak disertakan.
export async function layarLangsung(peranPaksa) {
    const { LAYAR, PERAN } = await muatModulFrontend();
    const akun = { 1: "uji.admin", 2: "uji.hr", 3: "uji.manajer", 4: "uji.karyawan", 5: "uji.auditor", 6: "uji.pakar" };
    const sesi = {};
    for (const r of Object.keys(akun)) sesi[r] = await masukApi(akun[r]);
    const rekom = (await apiJSON(sesi[PERAN.KARYAWAN].token, "/api/saya/rekomendasi")).data || {};
    const m = (rekom.match || [])[0] || {};
    const peluangManajer = ((await apiJSON(sesi[PERAN.MANAJER].token, "/api/peluang?status=terbuka")).data || [])[0] || {};
    if (!m.id || !m.karyawan_id || !peluangManajer.id) {
        throw new Error(`data backend belum siap untuk layar berparameter: match=${m.id || "-"} karyawan=${m.karyawan_id || "-"} peluang manajer=${peluangManajer.id || "-"}. Bangkitkan ulang data generator.`);
    }
    const param = {
        "K-03": peranPaksa === PERAN.PAKAR ? "?karyawan_id=" + encodeURIComponent(m.karyawan_id) : "",
        "K-04": "?id=" + encodeURIComponent(m.id || ""),
        "H-02": "?id=" + encodeURIComponent(m.id || ""),
        "M-02": "?peluang=" + encodeURIComponent(peluangManajer.id || ""),
    };
    return LAYAR.filter((l) => l.tersedia && (!peranPaksa || l.kode === "U-01" || l.peran.includes(peranPaksa))).map((l) => {
        const peran = peranPaksa || (l.kode === "U-02" ? PERAN.KARYAWAN : l.peran[0]);
        return { kode: l.kode, jalur: l.url, query: param[l.kode] || "", sesi: l.kode !== "U-01", peran, u: sesi[peran].user, token: sesi[peran].token };
    });
}

// ── catatan internal (§14.1, §16.2 revisi 9) ──

// FRASA_CATATAN: potongan teks yang hanya muncul di catatan internal (konteks
// riset, metodologi, status telaah). Tempatnya repo itm-unfari/docs, bukan
// layar. Huruf kecil; dicocokkan pada innerText halaman.
export const FRASA_CATATAN = [
    "data sintetis", "synthetic data", "belum ditelaah", "not yet reviewed",
    "empat-per", "four-fifths", "uniform guidelines", "delphi",
];

// catatanTampil mengembalikan daftar catatan internal yang terlihat di halaman
// (kosong = bersih): frasa di atas dan elemen pita data sintetis.
export async function catatanTampil(page) {
    return page.evaluate((frasa) => {
        const teks = document.body.innerText.toLowerCase();
        const kena = frasa.filter((f) => teks.includes(f));
        if (document.querySelector(".pita-sintetis, [data-uji='pita-sintetis']")) kena.push("elemen pita-sintetis");
        return kena;
    }, FRASA_CATATAN);
}
