// Sesi di localStorage dan penjaga halaman.
//
// Cookie tidak bisa dipakai karena frontend dan backend berbeda domain.
// Konsekuensinya satu celah XSS berarti token tercuri, jadi seluruh frontend
// tidak memakai innerHTML untuk data, tanpa eval, dan pustaka di-vendor.
import { redirect } from "./jscroot/url.js";
import { postJSON } from "./jscroot/api.js";
import { backend, tokenKey } from "./config.js";
import { layarUntuk } from "./layar.js";

const KUNCI_TOKEN = "itm_token";
const KUNCI_USER = "itm_user";

export function getToken() {
    try { return localStorage.getItem(KUNCI_TOKEN); } catch (e) { return null; }
}

export function setSession(token, user) {
    try {
        localStorage.setItem(KUNCI_TOKEN, token);
        localStorage.setItem(KUNCI_USER, JSON.stringify(user));
    } catch (e) { /* mode penyamaran: sesi hanya bertahan selama halaman terbuka */ }
}

export function getUser() {
    try {
        const mentah = localStorage.getItem(KUNCI_USER);
        return mentah ? JSON.parse(mentah) : null;
    } catch (e) { return null; }
}

export function clear() {
    try {
        localStorage.removeItem(KUNCI_TOKEN);
        localStorage.removeItem(KUNCI_USER);
    } catch (e) { /* diabaikan */ }
}

// tokenHeader memberi pasangan argumen yang diminta jscroot api.js:
//   getJSON(url, fn, ...tokenHeader())
export function tokenHeader() { return [tokenKey, getToken()]; }

// Penjaga ini kenyamanan, bukan keamanan: yang menegakkan izin adalah backend.
export function requireLogin() {
    if (!getToken()) {
        redirect("/login/");
        return false;
    }
    return true;
}

export function requireGuest() {
    if (getToken()) {
        redirect(tujuanSetelahMasuk());
        return false;
    }
    return true;
}

// Tiap peran mendarat di layar pekerjaan pertamanya yang sudah tersedia.
export function tujuanSetelahMasuk() {
    const u = getUser() || {};
    const pertama = layarUntuk(u.role).find(function (l) { return l.kode !== "U-02"; });
    return pertama ? pertama.url : "/akun/";
}

export function logout() {
    // Sesi dibuang tanpa menunggu server: backend yang mati tidak boleh
    // membuat tombol Keluar diam saja.
    const [kunci, nilai] = tokenHeader();
    postJSON(backend.auth.logout, {}, function () { /* sebisanya */ }, kunci, nilai);
    clear();
    redirect("/login/");
}
