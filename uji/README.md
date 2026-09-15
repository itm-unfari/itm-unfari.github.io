# Uji frontend ITM

Dijalankan di Chromium sungguhan lewat Playwright. curl tidak bisa membuktikan
yang diuji di sini: apakah JavaScript-nya benar-benar memanggil API dengan
header yang benar, menerjemahkan `code` galat, membuang sesi pada 401, tidak
menafsirkan data sebagai HTML, dan tidak berkedip saat bahasa bukan Indonesia.

## Prasyarat

- Node 22, lalu di folder ini `npm install` dan `npx playwright install chromium`.
- `assets/css/app.css` sudah dibangun (`npm run build` di akar repo).
- Frontend statis hidup di `http://127.0.0.1:5180` dari akar repo: `./serve.sh`.
- Hanya untuk `uji-langsung.mjs`: backend itm-gocroot di `http://127.0.0.1:8095`
  dengan Mongo berisi akun uji (`go run ./tools/seeduser`), dan env backend
  `FRONTEND_ORIGIN` memuat `http://127.0.0.1:5180` (bawaannya hanya
  `http://localhost:5180`; tanpa itu setiap panggilan dari peramban kandas di
  CORS, dan uji melaporkannya sebagai pemeriksaan pertama).

Alamat bisa diganti lewat env `FRONTEND` (bawaan `http://127.0.0.1:5180`) dan
`API` (bawaan `http://127.0.0.1:8095`).

## Menjalankan

    npm run kamus          # tanpa peramban
    npm run tiruan         # peramban, API dipalsukan — tidak butuh backend
    npm run mutu           # kontras dan tata letak, API dipalsukan
    npm run mutu:negatif   # uji negatif kontras (harus GAGAL pada warna pucat)
    npm run langsung       # butuh backend 8095
    npm run tangkap        # tangkapan wireframe ke uji/tangkapan/
    node uji-mutu.mjs --utama=1D4ED8 [--utama-gelap=93C5FD]   # warna organisasi
    npm run semua          # kamus, tiruan, langsung, mutu, mutu:negatif

Setiap berkas mencetak `✓`/`✗` per pemeriksaan dan keluar dengan kode bukan nol
bila ada yang gagal. `tangkap-layar.mjs` tidak termasuk `semua` karena
luarannya berkas gambar, bukan keputusan lolos/gagal.

## Isi

| Berkas | Yang dibuktikan |
|---|---|
| `bantu.mjs` | Perkakas bersama: alamat, pelapor, pemuat modul frontend di Node (tiruan `window` minimal untuk `config.js`), API tiruan lewat `page.route` untuk `**/auth/**` dan `**/health` (termasuk preflight OPTIONS), sesi tiruan, peredam Google Fonts. |
| `uji-kamus.mjs` | Kunci `id.js` dan `en.js` identik, tidak ada nilai kosong, placeholder `{nama}` setara, setiap kode layar di `layar.js` punya `layar.<kode>`, setiap peran 1–6 punya `peran.<n>`, setiap layar punya kode/url/peran yang sah dan tidak ganda. |
| `uji-tiruan.mjs` | `/login/` memuat (`lang="id"`, pita sintetis, judul dari kamus); penjaga `requireLogin`/`requireGuest`; masuk berhasil → `itm_token` terisi, ke `/akun/`, `uname` dan peran tampil; `/auth/me` membawa header `login`, `/auth/login` tidak; semua permintaan menuju `http://<host frontend>:8095` (config.js); 401 `kredensial_salah` → pesan kamus, tetap di `/login/`, tanpa token; 401 `sesi_tidak_sah` di `/akun/` → sesi dibuang, ke `/login/`; XSS: `uname`/`name` ber-HTML tidak melahirkan `<img>` dan tampil sebagai teks; kode galat tak dikenal → `message` backend, tanpa keduanya → `galat.http`; bahasa: klik EN → muat ulang `lang="en"`, "Sign in", judul Inggris, tidak ada `[data-i18n]` bersisa teks Indonesia, bertahan di `/akun/` termasuk teks yang dirakit nav.js, tanpa kedip (perekam `addInitScript`: `lang` sudah `en` pada DOMContentLoaded, tirai `i18n-tunggu` terpasang saat teks pertama masuk DOM, tirainya nyata di CSS); tema: `itm_tema` → `data-tema` sebelum `<link app.css>` masuk DOM (prapasang.js sinkron mendahului stylesheet), latar html sesuai palet, `prefers-color-scheme` dihormati, sakelar tema tanpa muat ulang; mode pakar: peran 6 melihat `[data-uji="kode-layar"]` = `U-02`, peran lain tidak; `<nav>` tidak ada selama `layarUntuk()` hanya memberi satu tautan (lihat catatan). |
| `uji-langsung.mjs` | Terhadap backend sungguhan: masuk `uji.karyawan` sampai `/akun/` dengan `uname`, peran, nama; Keluar → `/login/` dan localStorage bersih; `uji.nonaktif` → `galat.akun_nonaktif`; token palsu → 401 → sesi dibuang; ganti sandi: sandi lama salah → `galat.sandi_lama_salah` tetap bersesi; isian ulang beda → `akun.sandi_tidak_sama` tanpa permintaan ke API; berhasil → `akun.sandi_berhasil`, sandi baru berlaku, lalu dikembalikan ke `ujilokal123` lewat formulir dan dicek lewat API (jaring pengaman di `finally` memulihkan sandi apa pun yang terjadi). |
| `uji-mutu.mjs` | Untuk `/login/` dan `/akun/` × tema terang/gelap × bahasa id/en × lebar 1280/400: kontras teks terburuk terhadap latar elemen sebenarnya (naik ke leluhur sampai warna legap, lapisan transparan dikomposit) ≥ 4,5, termasuk tiga varian pesan status yang dipaksa tampil; kontras batas `.medan`, `.segmen`, `.tombol-halus`, `.kode-layar` terhadap latar di belakangnya ≥ 3; tidak ada gulir mendatar; halaman benar-benar tergambar (minimal 12 elemen teks terukur). `--utama=RRGGBB` menimpa `--w-utama` tema terang lewat `page.addStyleTag` setelah muat (`--utama-gelap=RRGGBB` untuk tema gelap; dipisah karena tema gelap memakai teks gelap di atas utama yang terang, jadi satu warna organisasi untuk kedua tema hampir pasti gagal di salah satunya). |
| `tangkap-layar.mjs` | Setiap layar `tersedia: true` × id/en × terang/gelap → `tangkapan/<kode>-<bahasa>-<tema>.png` (1280) dan `-hp.png` (400), halaman penuh, skala 2×. Bahan lampiran wireframe/mockup. `PERAN=6` memaksa sesi pakar. |

## Aturan: setiap kriteria punya uji negatif

Pemeriksa yang tidak pernah gagal tidak membuktikan apa-apa, jadi tiap berkas
menyertakan kasus yang HARUS tertangkap:

- `uji-kamus.mjs`: kunci dihapus/asing, nilai spasi saja, placeholder hilang,
  layar tanpa kunci, peran tanpa kunci, layar tanpa kode, kode ganda — semuanya
  pada salinan objek, dan pemeriksa harus menyebut kunci yang salah.
- `uji-tiruan.mjs`: 401 `kredensial_salah` tidak boleh mengalihkan sedangkan
  401 `sesi_tidak_sah` harus; kode yang sengaja tidak ada di kamus harus
  jatuh ke `message`; payload XSS harus tampil sebagai teks; kelas
  `i18n-tunggu` dipasang kembali harus benar-benar menyembunyikan teks;
  peran non-pakar tidak boleh melihat kode layar.
- `uji-langsung.mjs`: akun nonaktif, sandi lama salah, isian tidak sama, dan
  token palsu — semuanya harus ditolak dengan pesan/aksi yang tepat.
- `uji-mutu.mjs --harap-gagal`: menjalankan seluruh pengukuran dengan
  `--utama=B8E0DC` (biru-hijau pucat) dan MENUNTUT setidaknya satu
  pemeriksaan kontras gagal. Kalau pengukurnya rusak sehingga semua lolos,
  uji negatif ini yang gagal.

## Catatan

- Chromium bawaan Playwright diunduh dengan `npx playwright install chromium`.
  Bila ingin memakai Chrome sistem: `PW_CHANNEL=chrome node uji-tiruan.mjs`.
- Node memperingatkan `MODULE_TYPELESS_PACKAGE_JSON` saat mengimpor modul
  frontend (package.json akar tidak menyatakan `"type": "module"`). Tidak
  berpengaruh; `node --no-warnings` meredamnya.

- Uji tiruan menjawab preflight OPTIONS sendiri dan memasang header CORS pada
  setiap jawaban palsu, supaya tidak bergantung pada perilaku Playwright
  terhadap permintaan lintas asal.
- Pemeriksaan "tidak ada `<nav>`" di `uji-tiruan.mjs` mengikuti keadaan
  `layar.js` sekarang (hanya U-01 dan U-02 tersedia). Saat layar lain
  dinyatakan `tersedia: true`, pemeriksaan keadaan-saat-ini perlu diperbarui;
  pemeriksaan turunannya (`layarUntuk(peran).length > 1` ⇔ ada `<nav>`)
  tetap berlaku.
- Sesi tiruan ditanam lewat `page.evaluate`, bukan `addInitScript`, pada uji
  yang mengharapkan pengalihan: init script berjalan ulang di setiap
  navigasi dan akan menanam kembali token yang baru dibuang.
