# jscroot lib — salinan vendored untuk ITM

Sumber : https://github.com/jscroot/lib
Versi  : v0.2.8 (tag terbaru; `main` menunjuk ke commit yang sama)
Commit : d71f5fc760f79803204fa594124bce9c59cc5ab3
Diambil: 15 September 2026 (dari salinan vendored kkn-frontend, 4 September 2026)
Lisensi: MIT (lihat LICENSE)

Hanya tiga berkas yang disalin: `api.js`, `url.js`, `element.js`. Berkas lain
di hulu (cookie, loading, websocket, dll.) tidak dipakai ITM dan tidak dibawa.

**Jangan sunting berkas .js di folder ini.** Ia salinan apa adanya dari hulu,
supaya bisa dibandingkan byte-per-byte saat menyegarkan. Yang khas ITM ditulis
di luar folder ini (`assets/js/ui.js`, `auth.js`, dst.).

Dari `element.js` dan `api.js`, fungsi yang menulis lewat `innerHTML`
(`setInner`, `addInner`, `insertHTML`, `renderHTML`, `replaceTag`) TIDAK boleh
dipakai — lihat aturan di README akar.

Menyegarkan: unduh tag terbaru dari hulu, salin ketiga berkas di atas, lalu
perbarui baris Versi/Commit/Diambil di sini.
