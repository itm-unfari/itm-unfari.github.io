// Definisi kode layar (§12 rencana). Satu sumber untuk nav, mode pakar,
// daftar kode layar (P-02), dan tangkapan wireframe.
//
// Kode layar tidak diubah setelah pengembangan dinyatakan selesai: butir
// instrumen Delphi merujuknya.
//
// `tersedia` menandai layar yang halamannya sudah dibangun; nav hanya
// menautkan yang tersedia.
import { PERAN as P, SEMUA_PERAN } from "./config.js";

export const LAYAR = [
    { kode: "U-01", url: "/login/", peran: SEMUA_PERAN, tersedia: true, tanpaNav: true },
    { kode: "U-02", url: "/akun/", peran: SEMUA_PERAN, tersedia: true },

    { kode: "K-01", url: "/profil/", peran: [P.KARYAWAN], tersedia: true },
    { kode: "K-02", url: "/usulan-skill/", peran: [P.KARYAWAN], tersedia: true },
    { kode: "K-03", url: "/rekomendasi/", peran: [P.KARYAWAN, P.PAKAR], tersedia: true },
    { kode: "K-04", url: "/penjelasan/", peran: [P.KARYAWAN, P.MANAJER, P.PAKAR], tersedia: true, tanpaNav: true },
    { kode: "K-05", url: "/riwayat/", peran: [P.KARYAWAN], tersedia: true },

    { kode: "M-01", url: "/peluang-unit/", peran: [P.MANAJER], tersedia: true },
    { kode: "M-02", url: "/kandidat/", peran: [P.MANAJER, P.PAKAR], tersedia: true, tanpaNav: true },

    { kode: "H-01", url: "/pipeline/", peran: [P.HR, P.PAKAR], tersedia: true },
    { kode: "H-02", url: "/detail-kandidat/", peran: [P.HR, P.PAKAR], tersedia: true, tanpaNav: true },
    { kode: "H-03", url: "/peluang/", peran: [P.HR, P.PAKAR], tersedia: true },
    { kode: "H-04", url: "/fairness/", peran: [P.HR, P.PAKAR], tersedia: true },
    { kode: "H-05", url: "/aturan/", peran: [P.HR, P.PAKAR], tersedia: true },
    { kode: "H-06", url: "/grafik-skill/", peran: [P.HR, P.PAKAR], tersedia: true },
    { kode: "H-07", url: "/kondisi-batas/", peran: [P.HR, P.PAKAR], tersedia: true },
    { kode: "H-08", url: "/taksonomi/", peran: [P.HR, P.PAKAR], tersedia: true },

    { kode: "A-01", url: "/audit-fairness/", peran: [P.AUDITOR, P.PAKAR], tersedia: true },
    { kode: "A-02", url: "/riwayat-tata-kelola/", peran: [P.AUDITOR, P.PAKAR], tersedia: true },
    { kode: "A-03", url: "/log-audit/", peran: [P.AUDITOR, P.HR], tersedia: true },

    { kode: "S-01", url: "/pengguna/", peran: [P.ADMIN], tersedia: true },
    { kode: "S-02", url: "/pengaturan/", peran: [P.ADMIN], tersedia: true },

    { kode: "P-01", url: "/pakar/", peran: [P.PAKAR], tersedia: true },
    { kode: "P-02", url: "/kode-layar/", peran: [P.PAKAR], tersedia: true },
];

export function cariLayar(kode) {
    return LAYAR.find(function (l) { return l.kode === kode; });
}

// layarUntuk mengembalikan layar yang ditautkan di nav untuk satu peran.
// Pakar boleh MEMBUKA banyak layar peran lain (hanya-baca), tapi berkeliling
// lewat skenario terpandu P-01 dan daftar P-02 (§13.2), jadi nav-nya tidak
// memuat belasan tautan.
export function layarUntuk(peran) {
    return LAYAR.filter(function (l) {
        if (!l.tersedia || l.tanpaNav || !l.peran.includes(peran)) return false;
        return peran !== P.PAKAR || l.kode === "U-02" || l.kode.startsWith("P-");
    });
}
