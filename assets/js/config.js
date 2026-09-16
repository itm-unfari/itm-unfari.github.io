// Konfigurasi publik frontend. Terkirim apa adanya ke setiap peramban, jadi
// tidak boleh memuat rahasia apa pun.

// Nama header pembawa token (GoCroot menerima Authorization, Token, Login).
export const tokenKey = "login";

// Alamat pengembangan memakai backend di host yang sama, porta 8095. IP tailnet
// sengaja termasuk: tanpa itu frontend yang dibuka dari HP akan memakai
// cabang produksi dan diam-diam memanggil backend produksi.
const HOST_PENGEMBANGAN = new Set(["localhost", "127.0.0.1", "100.125.6.77"]);

// Domain produksi → alamat backend. Host yang tidak disebut di sini tidak
// mendapat backend sama sekali, jadi salinan situs di domain lain tidak bisa
// diam-diam memanggil backend ini.
//
// Alamat cloudfunctions.net dipakai, bukan URL run.app, karena bentuknya
// ditentukan nama fungsi dan region: fungsi yang dibangun ulang tetap beralamat
// sama, sedangkan URL run.app membawa hash yang bisa berubah.
const PRODUKSI = {
    "itm-unfari.github.io": "https://asia-southeast2-itm-unfari.cloudfunctions.net/itm-gocroot",
};

const host = window.location.hostname;
export const asal = HOST_PENGEMBANGAN.has(host)
    ? window.location.protocol + "//" + host + ":8095"
    : (PRODUKSI[host] || "");

export const backend = {
    asal: asal,
    health: asal + "/health",
    auth: {
        login: asal + "/auth/login",
        logout: asal + "/auth/logout",
        me: asal + "/auth/me",
        sandi: asal + "/auth/password",
    },
};

// Sama dengan model/role.go di backend.
export const PERAN = {
    ADMIN: 1,
    HR: 2,
    MANAJER: 3,
    KARYAWAN: 4,
    AUDITOR: 5,
    PAKAR: 6,
};

export const SEMUA_PERAN = Object.values(PERAN);
