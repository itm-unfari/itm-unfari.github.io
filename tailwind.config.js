/** @type {import('tailwindcss').Config} */

// Setiap warna dibaca dari variabel CSS `--w-<nama>` (tiga angka RGB) yang
// didefinisikan di input.css untuk tema terang dan gelap.
//
// Palet DIGANTI, bukan diperluas: skala bawaan Tailwind mengundang warna asing
// masuk diam-diam. Kontras tiap token diukur (bukan dikira) sebelum ditulis:
//   terang  tinta 17,5/15,4 · redup 7,3/6,4 · samar 5,5/4,8 · utama 6,3/5,6
//           kendali 4,2/3,7 · status di latar mudanya ≥ 4,95
//   gelap   tinta 14,4/15,9 · redup 8,1/8,9 · samar 6,1/6,7 · utama 8,2/9,0
//           kendali 3,5/3,8 · status di latar mudanya ≥ 6,4
// (angka pertama di kertas, kedua di latar).
const w = (nama) => `rgb(var(--w-${nama}) / <alpha-value>)`;

module.exports = {
    darkMode: ["selector", '[data-tema="gelap"]'],

    content: [
        "./**/*.html",
        "!./node_modules/**",
        "!./uji/**",
        "./assets/js/**/*.js",
        "!./assets/js/jscroot/**",
    ],

    theme: {
        colors: {
            transparent: "transparent",
            current: "currentColor",
            kertas: w("kertas"),
            latar: w("latar"),
            tinta: { DEFAULT: w("tinta"), redup: w("tinta-redup"), samar: w("tinta-samar") },
            garis: { DEFAULT: w("garis"), tipis: w("garis-tipis"), kendali: w("garis-kendali") },
            // Warna utama adalah SATU token yang boleh diganti warna organisasi;
            // uji kontras dijalankan terhadap token pengganti.
            utama: { DEFAULT: w("utama"), dalam: w("utama-dalam"), muda: w("utama-muda") },
            // Penanda fairness: "perlu ditinjau", sengaja bukan merah.
            tinjau: { DEFAULT: w("tinjau"), muda: w("tinjau-muda") },
            // Merah hanya untuk galat sistem.
            galat: { DEFAULT: w("galat"), muda: w("galat-muda") },
            sah: { DEFAULT: w("sah"), muda: w("sah-muda") },
            tirai: w("tirai"),
            putih: "#FFFFFF",
        },
        fontFamily: {
            judul: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
            teks: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
            data: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
        },
        extend: {
            fontSize: {
                mikro: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.06em" }],
            },
            boxShadow: {
                kartu: "0 1px 2px rgb(var(--w-bayang) / .06), 0 8px 24px -12px rgb(var(--w-bayang) / .18)",
                laci: "0 2px 8px rgb(var(--w-bayang) / .10), 0 24px 64px -20px rgb(var(--w-bayang) / .45)",
            },
        },
    },
    plugins: [],
};
