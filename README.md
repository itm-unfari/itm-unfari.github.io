# Internal Talent Marketplace — frontend

Situs statis untuk GitHub Pages, bagian dari penelitian fundamental
*Internal Talent Marketplace (ITM) berbasis AI* di Universitas Al-Ghifari.
Memanggil backend [`itm-gocroot`](../itm-gocroot) lewat JSON.

Layar hanya memuat yang dibutuhkan untuk bekerja. Catatan internal (konteks riset,
metodologi, status data dan taksonomi) ada di repo privat `itm-unfari/docs`,
bukan di halaman; `uji/uji-statis.mjs` dan `uji/uji-alur.mjs` menjaganya.

**Tampil di https://itm-unfari.github.io/, belum bisa dipakai.** Setiap push ke
`main` membangun `app.css` dan menayangkan situs lewat workflow Actions
(`.github/workflows/pages.yml`; sumber Pages repo ini = GitHub Actions). Alamat
backend produksi belum ada sampai GCP dan domain diputuskan, jadi masuk hanya
berfungsi di `mubaroqadb-lab`.

## Menjalankan di `mubaroqadb-lab`

    npm install
    npm run build          # kompilasi Tailwind ke assets/css/app.css
    npm run watch:css      # atau: bangun ulang otomatis saat menyunting

    uji/serve.sh           # sajikan di 0.0.0.0:5180, pid di uji/.serve.pid
    npm run serve          # sama, tapi di latar depan tanpa berkas pid

`uji/serve.sh` hanya menghentikan server yang ia jalankan sendiri; kalau 5180
dipegang proses lain ia berhenti dengan pesan, bukan membunuh. Server ini
dipakai bersama proyek lain.

Dilihat dari Mac lewat porta yang diteruskan VS Code (`http://localhost:5180`),
dari HP di tailnet lewat `http://100.125.6.77:5180`. Backend harus hidup di
porta 8095 pada host yang sama — lihat `../itm-gocroot/uji/README.md`.
`assets/js/config.js` memilih backend dari nama host: `localhost`, `127.0.0.1`,
dan IP tailnet memakai `:8095`; host lain hanya kalau disebut di `PRODUKSI`.

Uji Playwright ada di `uji/` (`cd uji && npm install && npx playwright install
chromium`); dependensi sistem Chromium dipasang sekali dengan
`sudo npx playwright install-deps chromium`.

## Sistem visual

Identitas sendiri (§13.5 rencana); disiplinnya diambil dari acuan.

| | |
|---|---|
| Huruf | **Plus Jakarta Sans** (SIL OFL, Tokotype) untuk judul dan teks. **IBM Plex Mono** untuk skor, kode skill, kode layar, versi: semuanya kode berformat tetap |
| Warna | Token `--w-*` di `assets/css/input.css`, dua tema (terang, gelap, ikut sistem). Kontras tiap token **diukur, bukan dikira**; ringkasan angkanya di `tailwind.config.js`. Skala bawaan Tailwind diganti, bukan diperluas |
| Warna utama | **Satu token** (`utama`, `utama-dalam`, `utama-muda`) yang boleh diganti warna organisasi; uji kontras dijalankan terhadap token pengganti |
| Merah | Hanya untuk galat sistem. Penanda fairness memakai kuning tua `tinjau` ("perlu ditinjau"); gap skill bukan kegagalan, jadi tidak merah |
| Tanda tangan | **Batang kontribusi**: satu batang mendatar per rekomendasi, segmen per skill sebanding sumbangannya, sisa sampai 100 digambar berongga. Karena skornya aditif, batang ini *adalah* perhitungannya. **Belum dibangun** — muncul di K-03, K-04, M-02, H-01, H-02 |
| Hiasan | Satu garis 3px warna utama di puncak halaman. Tidak ada yang lain |

Tema dan bahasa dipasang `assets/js/prapasang.js` di `<head>` **sebelum**
`app.css`, supaya tidak ada kedip putih atau kedip bahasa yang salah.

## Aturan yang tidak boleh dilanggar

Token disimpan di `localStorage`, bukan cookie HttpOnly — cookie tidak bisa
lintas-origin antara Pages dan backend. **Satu celah XSS berarti sesi tercuri.**
Karena itu:

1. **Tidak ada `innerHTML` untuk data apa pun.** Elemen dibuat lewat `el()` di
   `assets/js/ui.js` atau `createElement` + `textContent`. Nama skill, judul
   peluang, dan kutipan usulan AI adalah masukan yang tidak dipercaya. Dari
   jscroot jangan pakai `setInner`, `addInner`, `insertHTML`, `renderHTML`,
   `replaceTag`.
2. Tidak ada `eval`, `new Function`, atau URL `javascript:`.
3. Pustaka pihak ketiga di-*vendor*, tidak dari CDN. jscroot ada di
   `assets/js/jscroot/` apa adanya (lihat `VERSI.md` di dalamnya). Satu-satunya
   sumber luar adalah Google Fonts untuk huruf.
4. **Setiap callback jscroot dimulai dengan `sehat(hasil, elPesan)`** dari
   `ui.js`. jscroot tidak menangani 401 maupun galat jaringan sendiri; tanpa
   ini sesi yang habis tampak sebagai halaman kosong tanpa sebab.
5. Kelas Tailwind yang dirakit dinamis di JS harus di-*safelist* di
   `tailwind.config.js`, atau warnanya hilang dari `app.css`.
6. Teks antarmuka lewat kamus: `data-i18n` di HTML atau `t()` di JS, dengan
   kunci yang **identik** di `assets/js/kamus/id.js` dan `en.js`. Galat API
   diterjemahkan lewat `code`, bukan `message`.
7. Identifier, komentar, dan teks dalam bahasa Indonesia. Komentar hanya bila
   alasannya tidak terlihat dari kode.

Penjaga halaman di `auth.js` adalah kenyamanan, bukan keamanan — yang
menegakkan izin adalah backend.

## Susunan

| | |
|---|---|
| `index.html` | Akar situs: mengalihkan ke `/login/` atau ke layar pertama peran bila sudah bersesi |
| `404.html` | Halaman tidak ditemukan, disajikan GitHub Pages |
| `login/` | U-01 Masuk |
| `akun/` | U-02 Akun saya: identitas, tema, ganti sandi |
| `assets/css/input.css` | Token warna dua tema dan komponen (`kartu`, `medan`, `tombol-*`, `pita-atas`) |
| `assets/css/app.css` | Hasil build, **tidak di-commit** |
| `assets/js/prapasang.js` | Skrip klasik di `<head>`: tema dan bahasa dari localStorage, `window.itmTampilan` |
| `assets/js/config.js` | Alamat backend per host dan konstanta `PERAN`. Tidak boleh memuat rahasia |
| `assets/js/i18n.js` | `t()` dan `terapkan()`; kamus di `assets/js/kamus/` |
| `assets/js/layar.js` | Definisi kode layar: satu sumber untuk nav, mode pakar, P-02, dan tangkapan wireframe |
| `assets/js/auth.js` | Sesi localStorage, penjaga halaman, `tokenHeader()`, `tujuanSetelahMasuk()` |
| `assets/js/ui.js` | `el()`, `pesan()`, `sehat()`, `teksGalat()` |
| `assets/js/nav.js` | Kerangka halaman: pita atas, kepala, nav per peran, sakelar bahasa dan tema |
| `assets/js/jscroot/` | jscroot v0.2.8 di-*vendor*. Jangan disunting |
| `uji/` | Playwright: `serve.sh`, `package.json`, berkas uji; `tangkapan/` untuk hasil tangkapan layar |
| `.githooks/` | Hook identitas commit, dipasang lewat `.githooks/pasang.sh` |
| `.github/workflows/pages.yml` | Deploy Pages, hanya `workflow_dispatch` |

## Kode layar

Setiap layar punya kode stabil (`U-01`, `K-03`, `H-04`, …) yang didefinisikan
di `assets/js/layar.js` beserta URL, peran yang boleh membukanya, dan penanda
`tersedia`. Nav hanya menautkan layar yang tersedia; mode pakar menampilkan
kodenya di kepala halaman; P-02 dan tangkapan wireframe dibangkitkan dari
modul yang sama. Kode tidak diubah setelah pengembangan dinyatakan selesai:
instrumen Delphi merujuknya.

## Repo, commit, dan push

Repo ini **publik** dan bernama `itm-unfari/itm-unfari.github.io`, supaya
tersaji di akar `https://itm-unfari.github.io/` dan path absolut (`/assets/…`,
`/login/`) bekerja sebelum dan sesudah domain sendiri dipasang. Tidak boleh ada
rahasia di sini; yang rahasia ada di `itm-gocroot`.

- Remote: `git@github.com:itm-unfari/itm-unfari.github.io.git` (SSH, bukan HTTPS).
- Identitas setiap commit: `mubaroqadb <mubaroq@digitalbdg.ac.id>`.
- Tanpa trailer atribusi AI di pesan commit maupun deskripsi PR.
- Push dari `mubaroqadb-lab` dengan kunci milik `mubaroqadb` yang tinggal di
  server; `core.sshCommand` lokal mengabaikan agen SSH yang diteruskan dari Mac.
- `--no-verify` tidak pernah dipakai.

Pasang sekali per klon:

    .githooks/pasang.sh

Ia menyetel identitas, `core.hooksPath`, dan `core.sshCommand` **lokal repo ini
saja** — konfigurasi git global server tidak disentuh. Hook `commit-msg`
menolak trailer AI, `pre-commit` menolak identitas lain, `pre-push` memeriksa
setiap commit yang akan dikirim.
