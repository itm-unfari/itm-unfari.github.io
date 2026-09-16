# Uji frontend ITM

Dijalankan di Chromium sungguhan lewat Playwright. curl tidak bisa membuktikan
yang diuji di sini: apakah JavaScript-nya benar-benar memanggil API dengan
header yang benar, menerjemahkan `code` galat, membuang sesi pada 401, tidak
menafsirkan data sebagai HTML, dan tidak berkedip saat bahasa bukan Indonesia.

## Prasyarat

- Node 22, lalu di folder ini `npm install` dan `npx playwright install chromium`.
- `assets/css/app.css` sudah dibangun (`npm run build` di akar repo).
- Frontend statis hidup di `http://127.0.0.1:5180` dari akar repo: `./serve.sh`.
- Untuk `uji-langsung.mjs`, `uji-alur.mjs`, `--langsung`, dan `siapkan-demo.mjs`:
  backend itm-gocroot di `http://127.0.0.1:8095`
  dengan Mongo berisi akun uji (`go run ./tools/seeduser`), dan env backend
  `FRONTEND_ORIGIN` memuat `http://127.0.0.1:5180` (bawaannya hanya
  `http://localhost:5180`; tanpa itu setiap panggilan dari peramban kandas di
  CORS, dan uji melaporkannya sebagai pemeriksaan pertama).

- `uji-alur.mjs` dan `siapkan-demo.mjs` juga butuh data generator
  (`go run ./tools/sintetis` di repo backend) dan menjalankan
  `go run ./tools/pekerja-ai` dari repo backend yang bersebelahan dengan repo
  ini (`../itm-gocroot`, atau env `BACKEND_REPO`). Keduanya menambah data ke
  basis data pengembangan; bangkitkan ulang data dasar bila ingin bersih.

Alamat bisa diganti lewat env `FRONTEND` (bawaan `http://127.0.0.1:5180`) dan
`API` (bawaan `http://127.0.0.1:8095`).

## Menjalankan

    npm run kamus          # tanpa peramban
    npm run statis         # tanpa peramban: sehat(), larangan innerHTML, kerangka layar
    npm run tiruan         # peramban, API dipalsukan — tidak butuh backend
    npm run mutu           # kontras dan tata letak /login/ dan /akun/, API dipalsukan
    npm run mutu:negatif   # uji negatif kontras (harus GAGAL pada warna pucat)
    npm run langsung       # butuh backend 8095
    npm run alur           # butuh backend 8095 + data generator + repo backend
    npm run mutu:langsung  # kontras dan tata letak SELURUH layar dengan data sungguhan
    npm run demo           # sekali, setelah data dasar dibangkitkan ulang
    npm run tangkap        # tangkapan wireframe seluruh layar (data sungguhan)
    npm run tangkap:pakar  # tangkapan dari sudut pandang pakar (kode layar tampil)
    node uji-mutu.mjs --utama=1D4ED8 [--utama-gelap=93C5FD]   # warna organisasi
    npm run publik         # situs publik + backend produksi (lihat catatan)
    npm run semua          # seluruh uji keputusan (tanpa tangkapan)

Setiap berkas mencetak `✓`/`✗` per pemeriksaan dan keluar dengan kode bukan nol
bila ada yang gagal. Tangkapan tidak termasuk `semua` karena luarannya berkas
gambar, bukan keputusan lolos/gagal.

## Isi

| Berkas | Yang dibuktikan |
|---|---|
| `bantu.mjs` | Perkakas bersama: alamat, pelapor, pemuat modul frontend di Node (tiruan `window` minimal untuk `config.js`), API tiruan lewat `page.route` untuk `**/auth/**` dan `**/health` (termasuk preflight OPTIONS), sesi tiruan, peredam Google Fonts. |
| `uji-kamus.mjs` | Kunci `id.js` dan `en.js` identik, tidak ada nilai kosong, placeholder `{nama}` setara, setiap kode layar di `layar.js` punya `layar.<kode>`, setiap peran 1–6 punya `peran.<n>`, setiap layar punya kode/url/peran yang sah dan tidak ganda. |
| `uji-tiruan.mjs` | XSS pada data talenta: balasan tiruan dengan `<img onerror>` di nama skill, judul peluang, kutipan usulan AI, nama karyawan, dan teks kondisi batas tampil sebagai teks tanpa satu `<img>` pun di K-01, K-02, K-03, K-04, H-02, H-03 (detail dibuka), M-02, H-06. `/login/` memuat (`lang="id"`, tanpa catatan internal, judul dari kamus); penjaga `requireLogin`/`requireGuest`; masuk berhasil → `itm_token` terisi, ke `/akun/`, `uname` dan peran tampil; `/auth/me` membawa header `login`, `/auth/login` tidak; semua permintaan menuju `http://<host frontend>:8095` (config.js); 401 `kredensial_salah` → pesan kamus, tetap di `/login/`, tanpa token; 401 `sesi_tidak_sah` di `/akun/` → sesi dibuang, ke `/login/`; XSS: `uname`/`name` ber-HTML tidak melahirkan `<img>` dan tampil sebagai teks; kode galat tak dikenal → `message` backend, tanpa keduanya → `galat.http`; bahasa: klik EN → muat ulang `lang="en"`, "Sign in", judul Inggris, tidak ada `[data-i18n]` bersisa teks Indonesia, bertahan di `/akun/` termasuk teks yang dirakit nav.js, tanpa kedip (perekam `addInitScript`: `lang` sudah `en` pada DOMContentLoaded, tirai `i18n-tunggu` terpasang saat teks pertama masuk DOM, tirainya nyata di CSS); tema: `itm_tema` → `data-tema` sebelum `<link app.css>` masuk DOM (prapasang.js sinkron mendahului stylesheet), latar html sesuai palet, `prefers-color-scheme` dihormati, sakelar tema tanpa muat ulang; mode pakar: peran 6 melihat `[data-uji="kode-layar"]` = `U-02`, peran lain tidak; `<nav>` tidak ada selama `layarUntuk()` hanya memberi satu tautan (lihat catatan); jawaban yang tidak berbentuk: backend mati (permintaan digugurkan), badan kosong, dan halaman HTML dari proksi — ketiganya memberi pesan kamus dan tombol kembali bisa ditekan, bukan macet di "Memproses…". |
| `uji-statis.mjs` | Tanpa peramban, di seluruh halaman dan modul: tidak ada `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write` maupun helper jscroot yang menulis HTML (komentar dibuang dulu); setiap callback `getJSON`/`postJSON` diawali `sehat()` (callback tanpa parameter = balasan sengaja diabaikan, hanya logout; `minta.js` dilewati karena di sanalah keduanya didefinisikan, bukan dipanggil); setiap layar tersedia punya halaman dengan `requireLogin()`, `requireRole(kode)` dan `pasang(kode)` yang sama dengan `layar.js` serta `#pesan`; ke-24 kode layar tersedia. Uji negatif: callback tanpa `sehat()` (langsung maupun dibungkus) dan `innerHTML` harus tertangkap. |
| Catatan internal | Revisi 9 rencana: konteks riset, metodologi, status telaah, dan data sintetis tidak tampil di layar (tempatnya repo privat `itm-unfari/docs`). `bantu.mjs` `catatanTampil()` mencari frasa catatan (`FRASA_CATATAN`) dan elemen pita di halaman; dipakai `uji-tiruan.mjs` (dengan uji negatif: pita yang disisipkan harus tertangkap) dan `uji-alur.mjs` (setiap layar setiap peran). `uji-statis.mjs` memastikan tidak ada teks kamus yang memuat frasa itu. |
| `uji-alur.mjs` | Terhadap backend sungguhan. Alur karyawan U-01 → K-02 → K-01 → K-03 → K-04 → K-05 dan alur HR H-01 → H-02 → H-04 → H-05 → H-06 → H-07 → A-03 diklik sampai habis. K-02: kutipan usulan AI tersorot tepat pada posisinya di teks sumber (teks sebelum sorotan diperiksa), butir yang belum diputuskan punya tombol keputusan tanpa label usulan AI, lalu tombolnya hilang setelah diputuskan, skill yang diterima masuk K-01 bersumber usulan AI. K-04 dan H-02: angka segmen batang = legenda = kalimat; dua bahasa memberi skill, urutan, dan angka yang sama; H-02 dan K-04 untuk match yang sama identik. H-05: latih dengan mitigasi mengisi kolom perbandingan mitigasi, dan hasil cek proksi tampil sebelum tombol aktifkan. A-03 mencatat siklus dijalankan dan keputusan match. Lalu setiap peran membuka semua layarnya: tanpa dialihkan, tidak ada catatan internal yang terlihat, kode layar hanya tampil untuk pakar (di setiap layar yang bisa dibukanya). Profil `uji.karyawan` dipulihkan dan peluang uji ditutup di akhir. |
| `uji-publik.mjs` | Butuh `SANDI_PUBLIK` dari lingkungan — sandi akun produksi sengaja tidak ada di repo ini, karena repo ini publik dan backend produksi terbuka di internet. Asap ujung-ke-ujung terhadap **situs yang sudah tayang** (`https://itm-unfari.github.io`) dan **backend produksi** di Cloud Function: halaman masuk bergaya, masuk `uji.hr` mendarat di layar kerjanya dengan token dari backend produksi, data Atlas tampil, permintaan luar hanya ke `cloudfunctions.net`, tanpa galat JavaScript. Tidak termasuk `npm run semua` karena menembak layanan sungguhan; jalankan sesudah deploy. |
| `siapkan-demo.mjs` | Menambah keadaan demo di atas data generator: aturan hasil belajar tanpa dan dengan mitigasi, usulan tepi grafik AI, satu usulan skill AI milik `uji.karyawan`. Menolak jalan dua kali di atas data yang sama. |
| `uji-langsung.mjs` | Terhadap backend sungguhan: masuk `uji.karyawan` sampai `/akun/` dengan `uname`, peran, nama; Keluar → `/login/` dan localStorage bersih; `uji.nonaktif` → `galat.akun_nonaktif`; token palsu → 401 → sesi dibuang; ganti sandi: sandi lama salah → `galat.sandi_lama_salah` tetap bersesi; isian ulang beda → `akun.sandi_tidak_sama` tanpa permintaan ke API; berhasil → `akun.sandi_berhasil`, sandi baru berlaku, lalu dikembalikan ke `ujilokal123` lewat formulir dan dicek lewat API (jaring pengaman di `finally` memulihkan sandi apa pun yang terjadi). |
| `uji-mutu.mjs` | Tanpa argumen: untuk `/login/` dan `/akun/` × tema terang/gelap × bahasa id/en × lebar 1280/400: kontras teks terburuk terhadap latar elemen sebenarnya (naik ke leluhur sampai warna legap, lapisan transparan dikomposit) ≥ 4,5, termasuk tiga varian pesan status yang dipaksa tampil; kontras batas `.medan`, `.segmen`, `.tombol-halus`, `.kode-layar` terhadap latar di belakangnya ≥ 3; tidak ada gulir mendatar; halaman benar-benar tergambar (minimal 12 elemen teks terukur). `--utama=RRGGBB` menimpa `--w-utama` tema terang lewat `page.addStyleTag` setelah muat (`--utama-gelap=RRGGBB` untuk tema gelap; dipisah karena tema gelap memakai teks gelap di atas utama yang terang, jadi satu warna organisasi untuk kedua tema hampir pasti gagal di salah satunya). Dengan `--langsung`: pengukuran yang sama pada SELURUH layar tersedia dengan data backend sungguhan, tiap layar dibuka peran utamanya (1056 pemeriksaan pada 24 layar). |
| `tangkap-layar.mjs` | Setiap layar `tersedia: true` × id/en × terang/gelap (dengan `--langsung`: data backend sungguhan, tiap layar dibuka peran utamanya dan layar yang butuh id diberi id dari backend; `PERAN=6` hanya layar yang boleh dibuka pakar, berkas berakhiran `-p6`) → `tangkapan/<kode>-<bahasa>-<tema>.png` (1280) dan `-hp.png` (400), halaman penuh, skala 2×. Bahan lampiran wireframe/mockup. `PERAN=6` memaksa sesi pakar. |

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
- Uji tidak menghardcode daftar layar tersedia maupun layar tujuan setelah
  masuk: keduanya dibaca dari `layar.js` saat uji berjalan.
- API tiruan menjawab `/api/**` yang tidak disebut penjawab dengan 404
  `rute_tidak_ditemukan`, tidak meneruskannya ke jaringan: backend sungguhan
  akan menolak token tiruan dengan 401 dan halaman membuang sesi.
- Sesi tiruan ditanam lewat `page.evaluate`, bukan `addInitScript`, pada uji
  yang mengharapkan pengalihan: init script berjalan ulang di setiap
  navigasi dan akan menanam kembali token yang baru dibuang.
