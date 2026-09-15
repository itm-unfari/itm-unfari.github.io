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

// opsiPeluncur: PW_CHANNEL=chrome memakai Chrome sistem bila Chromium
// bawaan Playwright belum diunduh (npx playwright install chromium).
export function opsiPeluncur() {
    return process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {};
}
