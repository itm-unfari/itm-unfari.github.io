// Alur yang bisa diklik sampai habis (§16.2) terhadap backend SUNGGUHAN:
//   karyawan U-01 → K-02 → K-01 → K-03 → K-04 → K-05
//   HR       H-01 → H-02 → H-04 → H-05 → H-06 → H-07 → A-03
// ditambah: kutipan K-02 tersorot tepat pada posisinya dan bertanda usulan AI
// sampai diputuskan; batang kontribusi = kalimat penjelasan; penjelasan satu
// match sama (skill, urutan, angka) di K-04 dan H-02 serta dalam dua bahasa;
// mode pakar menampilkan kode layar di setiap layar yang bisa dibukanya; tidak
// ada catatan internal (pita data sintetis, label usulan AI/belum ditelaah,
// keterangan metodologi) di layar mana pun.
//
// Butuh backend 8095 dengan data generator (go run ./tools/sintetis) dan
// repo backend bersebelahan (tools/pekerja-ai), lihat README.
//
//   node uji-alur.mjs
import { chromium } from "playwright";
import {
    FE, pelapor, muatModulFrontend, pasangSesi, redamFont, jalurDari, opsiPeluncur,
    masukApi, apiJSON, jalankanPekerjaAI, catatanTampil,
} from "./bantu.mjs";

const p = pelapor("ALUR — " + FE);
const { id, en, LAYAR, layarUntuk, PERAN } = await muatModulFrontend();
// Satu-satunya teks yang dijawab adaptor rekaman dengan satu butir sah
// (layanan/ai/rekaman.go di backend).
const TEKS_REKAMAN = "Saya terbiasa menganalisis data penjualan bulanan menggunakan SQL untuk menyusun laporan bagi manajemen.";
const KUTIPAN_REKAMAN = "menganalisis data penjualan bulanan";
const tanda = Date.now();

const browser = await chromium.launch(opsiPeluncur());

async function halaman() {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const galat = [];
    page.on("pageerror", (e) => galat.push(e.message));
    page.on("dialog", (d) => d.accept());
    await redamFont(page);
    return { ctx, page, galat };
}
async function masukUI(page, uname) {
    await page.goto(FE + "/login/", { waitUntil: "networkidle" });
    await page.fill("#uname", uname);
    await page.fill("#password", "ujilokal123");
    await page.click("#tombolMasuk");
    await page.waitForURL((u) => !u.pathname.startsWith("/login/"), { timeout: 10000 });
    await page.waitForLoadState("networkidle");
}
async function klikNav(page, url) {
    await page.click(`header nav a[href="${url}"]`);
    await page.waitForURL("**" + url + "**");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
}
// bersih: tidak ada catatan internal yang terlihat (revisi 9 rencana).
const bersih = async (page) => (await catatanTampil(page)).length === 0;
const tanpaGalat = (nama, galat) => p.lapor(`${nama}: tanpa galat JavaScript`, galat.length === 0, galat.join(" | "));

// bacaPenjelasan mengumpulkan angka batang, legenda, dan kalimat dari
// renderKontribusi — bentuk yang sama di K-04 dan H-02.
async function bacaPenjelasan(page) {
    await page.waitForSelector('[data-uji="batang-kontribusi"]', { timeout: 10000 });
    return page.evaluate(() => {
        const q = (s) => [...document.querySelectorAll(s)];
        return {
            skor: (document.querySelector('[data-uji="skor"]') || {}).textContent,
            segmen: q('[data-uji="batang-kontribusi"] > div').map((e) => e.dataset.kode + "=" + e.dataset.sumbangan),
            legenda: q('[data-uji="angka-kontribusi"]').map((e) => e.dataset.kode + "=" + e.textContent.split(" / ")[0]),
            bobot: q('[data-uji="angka-kontribusi"]').map((e) => e.textContent.split(" / ")[1]),
            kalimat: q('[data-uji="kalimat-kontribusi"]').map((e) => e.textContent),
        };
    });
}
function batangSamaKalimat(x) {
    const segmenAda = x.segmen.every((s) => x.legenda.includes(s));
    // Skill yang belum dimiliki (sumbangan 0) dijelaskan lewat bobotnya sebagai
    // peluang pengembangan; selain itu kalimat menyebut sumbangannya.
    const kalimatMemuatAngka = x.legenda.every((l, i) => {
        const sumbangan = l.split("=")[1];
        return (x.kalimat[i] || "").includes(" " + (sumbangan === "0" ? x.bobot[i] : sumbangan) + " ");
    });
    return segmenAda && kalimatMemuatAngka && x.legenda.length === x.kalimat.length && x.legenda.length > 0;
}

let matchKaryawan = null, peluangAlur = null, profilAwal = null;
const hr = await masukApi("uji.hr");
const karyawan = await masukApi("uji.karyawan");

try {
    // ── 1. Alur karyawan ──
    {
        profilAwal = ((await apiJSON(karyawan.token, "/api/saya/profil")).data || {}).profil_skill || [];
        const { ctx, page, galat } = await halaman();
        await masukUI(page, "uji.karyawan");
        p.lapor("U-01 → layar pertama karyawan", jalurDari(page.url()) === layarUntuk(PERAN.KARYAWAN).find((l) => l.kode !== "U-02").url, page.url());
        let pita = await bersih(page);

        await klikNav(page, "/usulan-skill/");
        await page.fill("#teks", TEKS_REKAMAN);
        await page.selectOption("#selBahasa", "id");
        await page.click("#tombolKirim");
        await page.waitForTimeout(800);
        await jalankanPekerjaAI();
        await page.waitForSelector('[data-uji="hasil-baru"] mark', { timeout: 30000 }).catch(() => {});
        const sorot = await page.evaluate(() => {
            const p = document.querySelector('[data-uji="hasil-baru"] [data-uji="teks-sumber"]');
            const m = p && p.querySelector("mark");
            return m ? { mark: m.textContent, sebelum: p.textContent.slice(0, p.textContent.indexOf(m.textContent)), utuh: p.textContent } : null;
        });
        p.lapor("K-02: kutipan tersorot tepat pada posisinya di teks sumber", !!sorot && sorot.mark === KUTIPAN_REKAMAN && sorot.utuh === TEKS_REKAMAN && sorot.sebelum === "Saya terbiasa ", JSON.stringify(sorot));
        const butir = page.locator('[data-uji="hasil-baru"] [data-uji="butir-usulan"]').first();
        p.lapor("K-02: butir belum diputuskan punya tombol keputusan, tanpa label usulan AI", (await butir.getByRole("button", { name: id["usulanSkill.terima"] }).count()) === 1 && !(await butir.textContent()).includes(id["bukti.usulan_ai"]));
        await butir.getByRole("button", { name: id["usulanSkill.terima"] }).click();
        await page.waitForTimeout(1000);
        const butirSetelah = page.locator('[data-uji="hasil-baru"] [data-uji="butir-usulan"]').first();
        p.lapor("K-02: setelah diterima, tombol keputusan hilang dan status Diterima", (await butirSetelah.getByRole("button", { name: id["usulanSkill.terima"] }).count()) === 0 && (await butirSetelah.textContent()).includes(id["status.usulan.diterima"]));
        pita = pita && await bersih(page);

        await klikNav(page, "/profil/");
        const barisDat = page.locator("#wadahTabel tbody tr").filter({ hasText: "DAT-01" });
        p.lapor("K-01: skill yang diterima masuk profil dengan sumber usulan AI", (await barisDat.count()) === 1 && (await barisDat.textContent()).includes(id["bukti.usulan_ai"]));
        pita = pita && await bersih(page);

        await klikNav(page, "/rekomendasi/");
        p.lapor("K-03: batang kontribusi di setiap baris", (await page.locator('[data-uji="batang-kontribusi"]').count()) === (await page.locator("#wadahTabel tbody tr").count()));
        await page.locator('#wadahTabel a[href^="/penjelasan/"]').first().click();
        await page.waitForURL("**/penjelasan/**");
        matchKaryawan = { id: new URL(page.url()).searchParams.get("id") };
        const idK04 = await bacaPenjelasan(page);
        p.lapor("K-04: batang kontribusi dan kalimat penjelasan menampilkan angka yang sama", batangSamaKalimat(idK04), JSON.stringify(idK04).slice(0, 300));
        matchKaryawan.penjelasan = idK04;
        pita = pita && await bersih(page);

        await page.click('header .segmen button[data-nilai="en"]');
        await page.waitForLoadState("networkidle");
        const enK04 = await bacaPenjelasan(page);
        p.lapor("K-04: penjelasan dalam dua bahasa — skill, urutan, dan angka sama", enK04.skor === idK04.skor && enK04.legenda.join() === idK04.legenda.join() && enK04.segmen.join() === idK04.segmen.join(), `id ${idK04.legenda.join(",")} | en ${enK04.legenda.join(",")}`);
        p.lapor("K-04: kalimat Inggris benar-benar Inggris", enK04.kalimat.every((k) => /points\.$/.test(k)) && (await page.title()) === en["penjelasan.judul_halaman"], enK04.kalimat[0]);
        await page.click('header .segmen button[data-nilai="id"]');
        await page.waitForLoadState("networkidle");

        // Keputusan karyawan di K-04 harus terlihat di K-05, beserta versi
        // kondisi batas yang dipakai saat rekomendasi itu dibuat (§7.2).
        let statusBaru = null;
        const tombolAksi = page.locator("#wadahAksi button");
        if (await tombolAksi.count()) {
            await tombolAksi.first().click();
            await page.waitForTimeout(1000);
            statusBaru = (await page.locator("#lencanaStatus").textContent()).trim();
        }
        await page.goto(FE + "/riwayat/", { waitUntil: "networkidle" });
        await page.waitForTimeout(500);
        const barisRiwayat = page.locator("#wadahTabel tbody tr").filter({ has: page.locator(`a[href="/penjelasan/?id=${encodeURIComponent(matchKaryawan.id)}"]`) });
        const isiBaris = (await barisRiwayat.count()) === 1 ? await barisRiwayat.textContent() : "";
        p.lapor("K-05: riwayat memuat match yang baru diputuskan, dengan status barunya", (await barisRiwayat.count()) === 1 && (statusBaru === null || isiBaris.includes(statusBaru)), statusBaru || "(tanpa aksi tersedia)");
        p.lapor("K-05: baris membawa versi kondisi batas yang dipakai", /v\d+/.test(isiBaris), isiBaris.slice(0, 120));
        pita = pita && await bersih(page);
        p.lapor("alur karyawan: tidak ada catatan internal di setiap layar", pita);
        tanpaGalat("alur karyawan", galat);
        await ctx.close();
    }

    // ── 2. Alur HR ──
    {
        const skill = [{ kode: "DAT-01", tingkat: 2, bobot: 1 }];
        const dibuat = await apiJSON(hr.token, "/api/peluang", { jenis: "proyek", judul: "Alur Uji " + tanda, deskripsi: "Peluang uji alur.", bahasa_deskripsi: "id", unit: "TI", skill_dibutuhkan: skill });
        peluangAlur = dibuat.data.id;
        await apiJSON(hr.token, "/api/peluang/" + peluangAlur, { status: "terbuka" });

        const { ctx, page, galat } = await halaman();
        await masukUI(page, "uji.hr");
        p.lapor("U-01 → H-01 untuk HR", jalurDari(page.url()) === "/pipeline/", page.url());
        let pita = await bersih(page);
        const namaSiklus = "Siklus Alur " + tanda;
        await page.fill("#namaSiklus", namaSiklus);
        await page.locator("#daftarPeluang label").filter({ hasText: "Alur Uji " + tanda }).locator("input[type=checkbox]").check();
        await page.click("#tombolBuat");
        await page.waitForTimeout(1000);
        const barisSiklus = () => page.locator("#wadahSiklus tr, #wadahSiklus li, #wadahSiklus article").filter({ hasText: namaSiklus }).first();
        await barisSiklus().getByRole("button", { name: id["pipeline.jalankan"] }).click();
        await page.waitForTimeout(2500);
        await barisSiklus().getByRole("button", { name: id["pipeline.lihat_pipeline"] }).click();
        await page.waitForTimeout(800);
        await page.locator("#isiPipeline details summary").first().click();
        await page.waitForSelector('#isiPipeline a[href^="/detail-kandidat/"]', { timeout: 10000 });
        p.lapor("H-01: siklus dibuat dan dijalankan dari layar; pipeline memuat kandidat dengan batang", (await page.locator('#isiPipeline [data-uji="batang-kontribusi"]').count()) > 0);
        await page.locator('#isiPipeline a[href^="/detail-kandidat/"]').first().click();
        await page.waitForURL("**/detail-kandidat/**");
        const matchH02 = new URL(page.url()).searchParams.get("id");
        const h02 = await bacaPenjelasan(page);
        p.lapor("H-02: batang kontribusi dan kalimat menampilkan angka yang sama", batangSamaKalimat(h02));
        await page.fill("#catatan", "Ditinjau dalam uji alur");
        const aksi = page.locator("#wadahAksi button").first();
        const labelAksi = await aksi.textContent();
        await aksi.click();
        await page.waitForTimeout(1000);
        p.lapor("H-02: keputusan HR tercatat di riwayat status beserta catatan", (await page.locator("#wadahRiwayat").textContent()).includes("Ditinjau dalam uji alur"), labelAksi);
        pita = pita && await bersih(page);

        await page.goto(FE + "/detail-kandidat/?id=" + encodeURIComponent(matchKaryawan.id), { waitUntil: "networkidle" });
        const h02Sama = await bacaPenjelasan(page);
        p.lapor("H-02 dan K-04 untuk match yang sama: skill, urutan, dan angka identik", h02Sama.skor === matchKaryawan.penjelasan.skor && h02Sama.legenda.join() === matchKaryawan.penjelasan.legenda.join() && h02Sama.kalimat.join("|") === matchKaryawan.penjelasan.kalimat.join("|"), `H-02 ${h02Sama.legenda.join(",")} | K-04 ${matchKaryawan.penjelasan.legenda.join(",")}`);

        await page.goto(FE + "/pipeline/", { waitUntil: "networkidle" });
        await barisSiklus().getByRole("button", { name: id["pipeline.lihat_pipeline"] }).click();
        await page.waitForTimeout(800);
        await page.locator('[data-uji="tautan-fairness"]').first().click();
        await page.waitForURL("**/fairness/**");
        await page.waitForSelector('[data-uji="plot-fairness"]', { timeout: 10000 });
        p.lapor("H-04: dari pipeline ke dashboard fairness siklus itu, empat dimensi", (await page.locator('[data-uji="plot-fairness"]').count()) >= 4 && new URL(page.url()).searchParams.get("siklus") !== null);
        pita = pita && await bersih(page);

        await klikNav(page, "/aturan/");
        const versiSebelum = Math.max(0, ...(((await apiJSON(hr.token, "/api/aturan?limit=200")).data) || []).map((a) => a.versi || 0));
        await page.click("#tombolLatihMitigasi");
        await page.waitForTimeout(800);
        await jalankanPekerjaAI();
        // Data contoh sudah memuat satu versi bermitigasi, jadi kolom mitigasi
        // sudah berplot sebelum pelatihan ini selesai. Yang ditunggu adalah
        // keterangan versi yang BARU, bukan sekadar munculnya plot.
        let aturanBaru = {};
        for (let i = 0; i < 40 && !aturanBaru.versi; i++) {
            aturanBaru = (((await apiJSON(hr.token, "/api/aturan?limit=200")).data) || []).find((a) => (a.versi || 0) > versiSebelum) || {};
            if (!aturanBaru.versi) await page.waitForTimeout(1000);
        }
        const ketBaru = id["aturan.bandingkan_ket_versi"].replace("{versi}", String(aturanBaru.versi));
        const kolomMitigasi = page.locator('[data-uji="kolom-perbandingan"][data-jenis="mitigasi"]');
        await kolomMitigasi.filter({ hasText: ketBaru }).locator('[data-uji="plot-fairness"]').waitFor({ timeout: 60000 }).catch(() => {});
        p.lapor("H-05: kolom mitigasi memakai versi hasil belajar yang BARU dilatih",
            (await kolomMitigasi.locator('[data-uji="plot-fairness"]').count()) === 1 && !!aturanBaru.mitigasi_aktif && (await kolomMitigasi.textContent()).includes(ketBaru),
            `versi sebelum=${versiSebelum} baru=${aturanBaru.versi} mitigasi=${aturanBaru.mitigasi_aktif}`);
        // Detail versi baru dibuka halaman sendiri setelah tugasnya selesai.
        await page.waitForSelector('[data-uji="aktifkan-aturan"]', { timeout: 40000 }).catch(() => {});
        const urut = await page.evaluate(() => {
            const a = document.querySelector('[data-uji="fitur-proksi"]'), z = document.querySelector('[data-uji="aktifkan-aturan"]');
            return a && z ? !!(a.compareDocumentPosition(z) & Node.DOCUMENT_POSITION_FOLLOWING) : null;
        });
        p.lapor("H-05: hasil pemeriksaan proksi tampil sebelum tombol aktifkan", urut === true, String(urut));
        pita = pita && await bersih(page);

        await klikNav(page, "/grafik-skill/");
        await page.click("#tombolUsulkan");
        await page.waitForTimeout(800);
        await jalankanPekerjaAI();
        await page.goto(FE + "/grafik-skill/", { waitUntil: "networkidle" });
        await page.waitForTimeout(800);
        p.lapor("H-06: tepi usulan yang belum diputuskan punya tombol terima", (await page.locator("#wadahTabel").getByRole("button", { name: id["grafikSkill.terima"] }).count()) > 0);
        pita = pita && await bersih(page);

        await klikNav(page, "/kondisi-batas/");
        const kondisiAktif = ((await apiJSON(hr.token, "/api/kondisi-batas?limit=200")).data || []).find((k) => k.aktif) || { pernyataan: [] };
        const teksKondisi = (kondisiAktif.pernyataan[0] || {}).teks || "";
        p.lapor("H-07: pernyataan versi aktif tampil apa adanya", teksKondisi.length > 0 && (await page.locator("main").textContent()).includes(teksKondisi), teksKondisi.slice(0, 60));
        pita = pita && await bersih(page);

        await klikNav(page, "/log-audit/");
        const siklusAlur = (((await apiJSON(hr.token, "/api/siklus?limit=200")).data) || []).find((s) => s.nama === namaSiklus) || {};
        const isiLog = await page.locator("main tbody").textContent();
        p.lapor("A-03: siklus DAN match yang baru diubah tercatat, dengan id objeknya", isiLog.includes(siklusAlur.id || "?") && isiLog.includes(matchH02) && isiLog.includes(id["logAudit.aksi.siklus_jalankan"]) && isiLog.includes(id["logAudit.aksi.match_status_ubah"]), `siklus=${siklusAlur.id} match=${matchH02}`)
        pita = pita && await bersih(page);
        p.lapor("alur HR: tidak ada catatan internal di setiap layar", pita);
        tanpaGalat("alur HR", galat);
        await ctx.close();
    }

    // ── 3. Mode pakar dan catatan internal di setiap layar setiap peran ──
    {
        const idKaryawanMatch = ((await apiJSON(hr.token, "/api/match/" + encodeURIComponent(matchKaryawan.id))).data || {}).karyawan.id;
        const param = { "K-03": "?karyawan_id=" + encodeURIComponent(idKaryawanMatch), "K-04": "?id=" + encodeURIComponent(matchKaryawan.id), "H-02": "?id=" + encodeURIComponent(matchKaryawan.id), "M-02": "?peluang=" };
        const manajer = await masukApi("uji.manajer");
        const peluangManajer = (((await apiJSON(manajer.token, "/api/peluang?status=terbuka")).data) || [])[0];
        param["M-02"] += peluangManajer ? encodeURIComponent(peluangManajer.id) : "";
        const akun = { 1: "uji.admin", 2: "uji.hr", 3: "uji.manajer", 4: "uji.karyawan", 5: "uji.auditor", 6: "uji.pakar" };
        for (const peran of Object.keys(akun).map(Number)) {
            const s = await masukApi(akun[peran]);
            const { ctx, page, galat } = await halaman();
            await pasangSesi(page, s.user, s.token);
            const layar = LAYAR.filter((l) => l.tersedia && l.kode !== "U-01" && l.peran.includes(peran));
            const bercatatan = [], salahKode = [], pindah = [];
            for (const l of layar) {
                await page.goto(FE + l.url + (param[l.kode] || ""), { waitUntil: "networkidle" });
                await page.waitForTimeout(300);
                if (jalurDari(page.url()) !== l.url) { pindah.push(`${l.kode}→${jalurDari(page.url())}`); continue; }
                const kena = await catatanTampil(page);
                if (kena.length) bercatatan.push(`${l.kode}: ${kena.join("/")}`);
                if (peran === PERAN.PAKAR) {
                    const k = await page.locator('[data-uji="kode-layar"]').textContent().catch(() => "");
                    if (k !== l.kode) salahKode.push(`${l.kode}:${k}`);
                } else if (await page.locator('[data-uji="kode-layar"]').count()) salahKode.push(`${l.kode}:tampil`);
            }
            p.lapor(`peran ${peran}: ${layar.length} layar terbuka tanpa dialihkan`, pindah.length === 0, pindah.join(", "));
            p.lapor(`peran ${peran}: tidak ada catatan internal di setiap layar`, bercatatan.length === 0, bercatatan.join("; "));
            p.lapor(peran === PERAN.PAKAR ? "pakar: kode layar tampil di setiap layar yang bisa dibuka" : `peran ${peran}: kode layar tidak tampil`, salahKode.length === 0, salahKode.join(", "));
            tanpaGalat(`peran ${peran} di semua layarnya`, galat);
            await ctx.close();
        }
    }
} catch (e) {
    p.lapor("berjalan tanpa galat tak terduga", false, String(e && e.stack || e));
} finally {
    // Pulihkan profil uji.karyawan: skill yang ditambahkan lewat usulan dihapus
    // lagi bila sebelumnya tidak ada.
    try {
        if (profilAwal && !profilAwal.some((x) => x.kode === "DAT-01")) {
            await fetch((process.env.API || "http://127.0.0.1:8095") + "/api/saya/profil-skill/DAT-01", { method: "DELETE", headers: { login: karyawan.token } });
        }
        if (peluangAlur) await apiJSON(hr.token, "/api/peluang/" + peluangAlur, { status: "ditutup" });
    } catch (e) { console.log("  · pemulihan gagal: " + e.message); }
    await browser.close();
}
process.exit(p.selesai());
