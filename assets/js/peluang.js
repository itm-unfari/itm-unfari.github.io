// Layar peluang bersama: M-01 (manajer, unit terkunci ke unitnya) dan H-03
// (HR, semua unit). Selain HR dan manajer — termasuk pakar — hanya membaca:
// kendali tulis tidak dibangun sama sekali, bukan sekadar disembunyikan.
import { getJSON, postJSON } from "/assets/js/minta.js";
import { asal, PERAN } from "/assets/js/config.js";
import { tokenHeader, getUser } from "/assets/js/auth.js";
import { pesan, sembunyikan, sehat, el, kosongkan, lencana, tabel, baris, kosong } from "/assets/js/ui.js";
import { t, bahasa } from "/assets/js/i18n.js";
import { teksTersorot, potongKutipan } from "/assets/js/sorot.js";

const LANGKAH_STATUS = { draf: "terbuka", terbuka: "ditutup" };
const JENIS = ["posisi", "proyek", "penugasan", "mentoring"];
const STATUS = ["draf", "terbuka", "ditutup"];
const BAHASA = ["id", "en"];
const BATAS_HALAMAN = 20;
const BATAS_POLING = 20;
const JEDA_POLING = 1500;

function tombol(teks, kelas, aksi) {
    const b = el("button", kelas, teks);
    b.type = "button";
    if (aksi) b.addEventListener("click", aksi);
    return b;
}

function pilihan(nilai, teks, terpilih) {
    const o = el("option", "", teks);
    o.value = nilai;
    if (terpilih) o.selected = true;
    return o;
}

function medan(label, kontrol, kelas) {
    const w = el("label", "block " + (kelas || ""));
    w.appendChild(el("span", "block text-sm font-medium mb-1.5", label));
    w.appendChild(kontrol);
    return w;
}

function medanKecil(label, kontrol, kelas) {
    const w = el("label", "block " + (kelas || ""));
    w.appendChild(el("span", "block text-mikro text-tinta-redup mb-1", label));
    w.appendChild(kontrol);
    return w;
}

function lokal() { return bahasa() === "en" ? "en-GB" : "id-ID"; }

function tanggal(x) {
    const d = new Date(x);
    return isNaN(d) ? "" : d.toLocaleDateString(lokal());
}

function waktu(x) {
    const d = new Date(x);
    return isNaN(d) ? "" : d.toLocaleString(lokal());
}

function namaBi(nama, cadangan) {
    return (nama && (nama[bahasa()] || nama.id)) || cadangan;
}

function namaTingkat(n) {
    return n >= 1 && n <= 4 ? t("tingkat." + n) : String(n);
}

export function lencanaPeluang(status) {
    return lencana(t("status.peluang." + status), status === "terbuka" ? "sah" : "netral");
}

function periksaForm(judul, unit, skill) {
    if (!judul.trim()) return "peluang.cek_judul";
    if (!unit.trim()) return "peluang.cek_unit";
    const dilihat = {};
    for (const k of skill) {
        if (!k.kode) return "peluang.cek_skill";
        if (!(k.bobot > 0)) return "peluang.cek_bobot";
        if (dilihat[k.kode]) return "peluang.cek_duplikat";
        dilihat[k.kode] = true;
    }
    return "";
}

// pasangLayarPeluang membangun daftar, formulir, dan alur usulan skill AI di
// dalam `akar`. unitTerkunci: true untuk M-01 (unit dari profil manajer, dan
// server memaksa unit itu), false untuk H-03 (unit bebas + saringan unit).
export function pasangLayarPeluang(opsi) {
    const akar = opsi.akar;
    const elPesan = opsi.elPesan;
    const unitTerkunci = !!opsi.unitTerkunci;
    const peran = (getUser() || {}).role;
    const bolehTulis = peran === PERAN.HR || peran === PERAN.MANAJER;

    const s = {
        halaman: 1, totalHalaman: 1, q: "", status: "", unit: "",
        taksonomi: null, skillMap: {}, unitSaya: "",
        aktif: null, tugas: null,
    };

    function namaSkill(kode) {
        const sk = s.skillMap[kode];
        return sk ? namaBi(sk.nama, kode) + " (" + kode + ")" : kode;
    }

    // ── daftar ──
    const kartuDaftar = el("section", "kartu p-6");
    const kepala = el("div", "flex flex-wrap items-start justify-between gap-3 mb-4");
    const kepalaKiri = el("div", "min-w-0");
    kepalaKiri.appendChild(el("h2", "eyebrow text-tinta-redup", t("peluang.daftar")));
    const elUnitSaya = el("p", "text-sm text-tinta-redup mt-1");
    elUnitSaya.hidden = true;
    kepalaKiri.appendChild(elUnitSaya);
    kepala.appendChild(kepalaKiri);
    if (bolehTulis) kepala.appendChild(tombol(t("peluang.baru"), "tombol-utama", bukaBaru));
    kartuDaftar.appendChild(kepala);

    const formSaring = el("form", "grid gap-3 mb-4 " + (unitTerkunci ? "sm:grid-cols-[1fr_12rem_auto]" : "sm:grid-cols-[1fr_10rem_10rem_auto]"));
    formSaring.setAttribute("role", "search");
    formSaring.noValidate = true;
    const inCari = el("input", "medan");
    inCari.type = "search";
    inCari.placeholder = t("umum.cari");
    inCari.setAttribute("aria-label", t("peluang.cari_judul"));
    formSaring.appendChild(inCari);
    const selStatus = el("select", "medan");
    selStatus.setAttribute("aria-label", t("peluang.saring_status"));
    selStatus.appendChild(pilihan("", t("peluang.semua_status"), true));
    STATUS.forEach(function (st) { selStatus.appendChild(pilihan(st, t("status.peluang." + st))); });
    formSaring.appendChild(selStatus);
    let inSaringUnit = null;
    if (!unitTerkunci) {
        inSaringUnit = el("input", "medan");
        inSaringUnit.type = "text";
        inSaringUnit.placeholder = t("peluang.saring_unit");
        inSaringUnit.setAttribute("aria-label", t("peluang.saring_unit"));
        formSaring.appendChild(inSaringUnit);
    }
    const btnSaring = el("button", "tombol-halus", t("umum.terapkan"));
    btnSaring.type = "submit";
    formSaring.appendChild(btnSaring);
    formSaring.addEventListener("submit", function (e) {
        e.preventDefault();
        s.q = inCari.value.trim();
        s.status = selStatus.value;
        s.unit = inSaringUnit ? inSaringUnit.value.trim() : "";
        s.halaman = 1;
        muatDaftar();
    });
    kartuDaftar.appendChild(formSaring);

    const wadahTabel = el("div");
    kartuDaftar.appendChild(wadahTabel);
    const navHalaman = el("div", "flex flex-wrap items-center justify-between gap-3 mt-4");
    const btnSebelum = tombol(t("umum.sebelumnya"), "tombol-halus", function () {
        if (s.halaman > 1) { s.halaman -= 1; muatDaftar(); }
    });
    const elHalaman = el("span", "text-sm text-tinta-redup");
    const btnBerikut = tombol(t("umum.berikutnya"), "tombol-halus", function () {
        if (s.halaman < s.totalHalaman) { s.halaman += 1; muatDaftar(); }
    });
    navHalaman.appendChild(btnSebelum);
    navHalaman.appendChild(elHalaman);
    navHalaman.appendChild(btnBerikut);
    kartuDaftar.appendChild(navHalaman);

    const kartuDetail = el("section", "kartu p-6");
    kartuDetail.hidden = true;
    kartuDetail.dataset.uji = "detail-peluang";

    akar.appendChild(kartuDaftar);
    akar.appendChild(kartuDetail);

    function tautanKandidat(p) {
        // Peluang draf belum pernah masuk siklus, jadi tidak punya kandidat.
        if (peran !== PERAN.MANAJER || p.status === "draf") return null;
        const a = el("a", "text-utama hover:underline text-sm whitespace-nowrap", t("peluang.lihat_kandidat"));
        a.href = "/kandidat/?peluang=" + encodeURIComponent(p.id);
        return a;
    }

    function muatDaftar() {
        const q = new URLSearchParams();
        q.set("page", String(s.halaman));
        q.set("limit", String(BATAS_HALAMAN));
        if (s.q) q.set("q", s.q);
        if (s.status) q.set("status", s.status);
        if (!unitTerkunci && s.unit) q.set("unit", s.unit);
        getJSON(asal + "/api/peluang?" + q.toString(), function (hasil) {
            if (!sehat(hasil, elPesan)) return;
            gambarDaftar(hasil.data.data || [], hasil.data.meta || {});
        }, ...tokenHeader());
    }

    function gambarDaftar(daftar, meta) {
        kosongkan(wadahTabel);
        const kolom = [t("peluang.kolom_peluang"), t("peluang.kolom_status"), t("peluang.kolom_jumlah_skill"), t("umum.dibuat"), t("umum.aksi")];
        const { wadah, tbody } = tabel(kolom);
        if (!daftar.length) tbody.appendChild(kosong(kolom.length, t("umum.tidak_ada_data")));
        daftar.forEach(function (p) {
            const judul = el("div", "min-w-[10rem]");
            judul.appendChild(el("div", "font-medium break-words", p.judul));
            judul.appendChild(el("div", "text-mikro text-tinta-redup", t("jenis." + p.jenis) + " · " + (p.unit || "")));
            const aksi = el("div", "flex flex-wrap items-center gap-2");
            aksi.appendChild(tombol(t(bolehTulis ? "peluang.kelola" : "umum.detail"), "tombol-halus", function () {
                bukaPeluang(p.id, { gulir: true });
            }));
            const a = tautanKandidat(p);
            if (a) aksi.appendChild(a);
            tbody.appendChild(baris([
                judul,
                lencanaPeluang(p.status),
                el("span", "font-data", String((p.skill_dibutuhkan || []).length)),
                tanggal(p.dibuat),
                aksi,
            ]));
        });
        wadahTabel.appendChild(wadah);
        s.halaman = Number(meta.page) || s.halaman;
        s.totalHalaman = Math.max(1, Number(meta.total_pages) || 1);
        const total = meta.total != null ? meta.total : daftar.length;
        elHalaman.textContent = t("umum.halaman", { n: s.halaman, total: s.totalHalaman }) + " · " + t("peluang.jumlah", { n: total });
        btnSebelum.disabled = s.halaman <= 1;
        btnBerikut.disabled = s.halaman >= s.totalHalaman;
    }

    // ── detail ──
    // Nomor permintaan: klik cepat pada dua peluang tidak boleh membuka
    // peluang yang balasannya kebetulan datang belakangan.
    let permintaanBuka = 0;
    function bukaPeluang(id, opsiBuka) {
        const o = opsiBuka || {};
        if (!id) return;
        const nomor = ++permintaanBuka;
        getJSON(asal + "/api/peluang/" + encodeURIComponent(id), function (hasil) {
            if (nomor !== permintaanBuka) return;
            if (!sehat(hasil, elPesan)) return;
            s.aktif = hasil.data.data;
            gambarDetail(o.pesanSah);
            if (o.gulir) kartuDetail.scrollIntoView({ behavior: "smooth", block: "start" });
        }, ...tokenHeader());
    }

    function bukaBaru() {
        s.aktif = null;
        gambarDetail();
        kartuDetail.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function tutupDetail() {
        s.aktif = null;
        kosongkan(kartuDetail);
        kartuDetail.hidden = true;
    }

    function gambarDetail(pesanSah) {
        const p = s.aktif;
        kosongkan(kartuDetail);
        kartuDetail.hidden = false;

        const atas = el("div", "flex flex-wrap items-start justify-between gap-3");
        const kiri = el("div", "min-w-0 flex-1");
        if (p) {
            kiri.appendChild(el("h2", "judul-halaman text-lg break-words", p.judul));
            const bagian = [t("jenis." + p.jenis), p.unit || ""];
            if (BAHASA.includes(p.bahasa_deskripsi)) bagian.push(t("peluang.bahasa_" + p.bahasa_deskripsi));
            kiri.appendChild(el("p", "text-sm text-tinta-redup mt-1", bagian.join(" · ")));
            if (p.dibuat) kiri.appendChild(el("p", "text-mikro text-tinta-redup mt-1", t("peluang.dibuat_pada", { tanggal: tanggal(p.dibuat) })));
        } else {
            kiri.appendChild(el("h2", "judul-halaman text-lg", t("peluang.baru_judul")));
        }
        atas.appendChild(kiri);
        const kanan = el("div", "flex flex-wrap items-center gap-2");
        if (p) kanan.appendChild(lencanaPeluang(p.status));
        kanan.appendChild(tombol(t("umum.tutup"), "tombol-halus", tutupDetail));
        atas.appendChild(kanan);
        kartuDetail.appendChild(atas);

        const elPesanDetail = el("div", "mt-4");
        elPesanDetail.hidden = true;
        elPesanDetail.setAttribute("role", "alert");
        kartuDetail.appendChild(elPesanDetail);
        if (pesanSah) pesan(elPesanDetail, pesanSah, "sah");

        if (p) {
            const aksi = el("div", "flex flex-wrap items-center gap-3 mt-4");
            const ke = LANGKAH_STATUS[p.status];
            if (bolehTulis && ke) {
                aksi.appendChild(tombol(t(ke === "terbuka" ? "peluang.aksi_buka" : "peluang.aksi_tutup"), "tombol-utama", function () {
                    ubahStatus(p, ke, elPesanDetail);
                }));
            }
            const a = tautanKandidat(p);
            if (a) aksi.appendChild(a);
            if (aksi.firstChild) kartuDetail.appendChild(aksi);
        }

        if (bolehTulis) gambarForm(p, elPesanDetail);
        else if (p) gambarBaca(p);
        if (p && bolehTulis) gambarUsulan(p, elPesanDetail);
    }

    function ubahStatus(p, ke, elPesanDetail) {
        if (!window.confirm(t(ke === "terbuka" ? "peluang.konfirmasi_buka" : "peluang.konfirmasi_tutup"))) return;
        sembunyikan(elPesanDetail);
        postJSON(asal + "/api/peluang/" + encodeURIComponent(p.id), { status: ke }, function (hasil) {
            if (!sehat(hasil, elPesanDetail)) return;
            muatDaftar();
            bukaPeluang(p.id, { pesanSah: t("peluang.status_berubah", { status: t("status.peluang." + ke) }) });
        }, ...tokenHeader());
    }

    function gambarBaca(p) {
        const blok = el("div", "mt-5 space-y-3");
        blok.appendChild(el("h3", "eyebrow text-tinta-redup", t("peluang.label_deskripsi")));
        blok.appendChild(el("p", "text-sm leading-relaxed whitespace-pre-wrap break-words", p.deskripsi || ""));
        blok.appendChild(el("h3", "eyebrow text-tinta-redup pt-2", t("peluang.label_skill")));
        const { wadah, tbody } = tabel([t("peluang.kolom_skill"), t("peluang.kolom_tingkat"), t("peluang.kolom_bobot")]);
        const daftar = p.skill_dibutuhkan || [];
        if (!daftar.length) tbody.appendChild(kosong(3, t("peluang.skill_kosong")));
        daftar.forEach(function (k) {
            tbody.appendChild(baris([namaSkill(k.kode), namaTingkat(k.tingkat), el("span", "font-data", String(k.bobot))]));
        });
        blok.appendChild(wadah);
        kartuDetail.appendChild(blok);
    }

    function pilihSkill(kodeTerpilih) {
        const sel = el("select", "medan");
        const tax = s.taksonomi || {};
        const perKelompok = {};
        (tax.skill || []).forEach(function (sk) { (perKelompok[sk.kelompok] = perKelompok[sk.kelompok] || []).push(sk); });
        const kelompok = (tax.kelompok || []).slice();
        Object.keys(perKelompok).forEach(function (k) {
            if (!kelompok.some(function (x) { return x.kode === k; })) kelompok.push({ kode: k });
        });
        let ada = false;
        kelompok.forEach(function (k) {
            if (!perKelompok[k.kode]) return;
            const grup = document.createElement("optgroup");
            grup.label = namaBi(k.nama, k.kode);
            perKelompok[k.kode].forEach(function (sk) {
                const cocok = sk.kode === kodeTerpilih;
                if (cocok) ada = true;
                grup.appendChild(pilihan(sk.kode, namaBi(sk.nama, sk.kode) + " (" + sk.kode + ")", cocok));
            });
            sel.appendChild(grup);
        });
        // Kode di luar taksonomi aktif tetap ditampilkan supaya tidak hilang diam-diam saat disimpan.
        if (kodeTerpilih && !ada) sel.insertBefore(pilihan(kodeTerpilih, kodeTerpilih), sel.firstChild);
        if (kodeTerpilih) sel.value = kodeTerpilih;
        return sel;
    }

    function gambarForm(p, elPesanDetail) {
        const form = el("form", "grid gap-4 sm:grid-cols-2 mt-5");
        form.noValidate = true;

        const selJenis = el("select", "medan");
        JENIS.forEach(function (j) { selJenis.appendChild(pilihan(j, t("jenis." + j), p ? p.jenis === j : j === "proyek")); });
        form.appendChild(medan(t("peluang.label_jenis"), selJenis));

        const inJudul = el("input", "medan");
        inJudul.type = "text";
        inJudul.required = true;
        inJudul.value = p ? p.judul || "" : "";
        form.appendChild(medan(t("peluang.label_judul"), inJudul));

        let inUnit = null;
        if (unitTerkunci) {
            const blok = el("div");
            blok.appendChild(el("span", "block text-sm font-medium mb-1.5", t("peluang.label_unit")));
            const nilai = el("p", "text-sm font-medium py-2 break-words", p ? p.unit || "" : s.unitSaya);
            if (!p) nilai.dataset.unitSaya = "1";
            blok.appendChild(nilai);
            blok.appendChild(el("p", "text-mikro text-tinta-redup", t("peluang.unit_terkunci")));
            form.appendChild(blok);
        } else {
            inUnit = el("input", "medan");
            inUnit.type = "text";
            inUnit.required = true;
            inUnit.value = p ? p.unit || "" : "";
            form.appendChild(medan(t("peluang.label_unit"), inUnit));
        }

        const selBahasa = el("select", "medan");
        BAHASA.forEach(function (b) {
            selBahasa.appendChild(pilihan(b, t("peluang.bahasa_" + b), p ? p.bahasa_deskripsi === b : bahasa() === b));
        });
        form.appendChild(medan(t("peluang.label_bahasa"), selBahasa));

        const taDeskripsi = el("textarea", "medan");
        taDeskripsi.rows = 6;
        taDeskripsi.value = p ? p.deskripsi || "" : "";
        form.appendChild(medan(t("peluang.label_deskripsi"), taDeskripsi, "sm:col-span-2"));

        const blokSkill = el("fieldset", "sm:col-span-2");
        blokSkill.appendChild(el("legend", "text-sm font-medium mb-1.5", t("peluang.label_skill")));
        const elSkillKosong = el("p", "text-sm text-tinta-redup py-2", t("peluang.skill_kosong"));
        blokSkill.appendChild(elSkillKosong);
        const wadahBaris = el("div");
        blokSkill.appendChild(wadahBaris);
        const barisan = [];

        const btnSimpan = el("button", "tombol-utama", t("umum.simpan"));
        btnSimpan.type = "submit";

        function perbaruiKosong() { elSkillKosong.hidden = barisan.length > 0; }

        function tambahBaris(nilai) {
            const r = el("div", "flex flex-wrap items-end gap-2 py-2 border-b border-garis-tipis last:border-0");
            const sel = pilihSkill(nilai ? nilai.kode : "");
            const tk = el("select", "medan");
            [1, 2, 3, 4].forEach(function (n) { tk.appendChild(pilihan(String(n), t("tingkat." + n), nilai ? nilai.tingkat === n : n === 2)); });
            const bobot = el("input", "medan font-data");
            bobot.type = "number";
            bobot.min = "0";
            bobot.step = "any";
            bobot.inputMode = "decimal";
            bobot.value = nilai && nilai.bobot != null ? String(nilai.bobot) : "1";
            const entri = { sel: sel, tk: tk, bobot: bobot };
            r.appendChild(medanKecil(t("peluang.kolom_skill"), sel, "flex-1 min-w-[12rem]"));
            r.appendChild(medanKecil(t("peluang.kolom_tingkat"), tk, "w-32"));
            r.appendChild(medanKecil(t("peluang.kolom_bobot"), bobot, "w-24"));
            r.appendChild(tombol(t("umum.hapus"), "tombol-halus", function () {
                barisan.splice(barisan.indexOf(entri), 1);
                r.remove();
                perbaruiKosong();
                btnSimpan.disabled = false;
            }));
            barisan.push(entri);
            wadahBaris.appendChild(r);
            perbaruiKosong();
        }

        (p ? p.skill_dibutuhkan || [] : []).forEach(tambahBaris);
        perbaruiKosong();
        blokSkill.appendChild(tombol(t("peluang.tambah_skill"), "tombol-halus mt-3", function () {
            tambahBaris(null);
            btnSimpan.disabled = false;
        }));
        form.appendChild(blokSkill);

        const aksi = el("div", "sm:col-span-2 flex flex-wrap gap-2");
        aksi.appendChild(btnSimpan);
        if (!p) aksi.appendChild(tombol(t("umum.batal"), "tombol-halus", tutupDetail));
        form.appendChild(aksi);

        // Tombol simpan dikunci selama permintaan; perubahan isian membukanya lagi
        // (termasuk setelah galat, yang biasanya menuntut isian diperbaiki).
        form.addEventListener("input", function () { btnSimpan.disabled = false; });
        form.addEventListener("change", function () { btnSimpan.disabled = false; });
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            sembunyikan(elPesanDetail);
            const skill = barisan.map(function (b) {
                return { kode: b.sel.value, tingkat: Number(b.tk.value), bobot: Number(b.bobot.value) };
            });
            const cek = periksaForm(inJudul.value, inUnit ? inUnit.value : "-", skill);
            if (cek) {
                pesan(elPesanDetail, t(cek), "tinjau");
                return;
            }
            const badan = {
                jenis: selJenis.value,
                judul: inJudul.value.trim(),
                deskripsi: taDeskripsi.value,
                bahasa_deskripsi: selBahasa.value,
                skill_dibutuhkan: skill,
            };
            if (inUnit) badan.unit = inUnit.value.trim();
            btnSimpan.disabled = true;
            const url = asal + "/api/peluang" + (p ? "/" + encodeURIComponent(p.id) : "");
            postJSON(url, badan, function (hasil) {
                if (!sehat(hasil, elPesanDetail)) return;
                const tersimpan = hasil.data.data || {};
                muatDaftar();
                bukaPeluang(tersimpan.id || (p && p.id), { pesanSah: t(p ? "peluang.tersimpan" : "peluang.terbuat") });
            }, ...tokenHeader());
        });

        kartuDetail.appendChild(form);
    }

    // ── usulan skill AI dari deskripsi ──
    function gambarUsulan(p, elPesanDetail) {
        const sek = el("div", "mt-6 border-t border-garis pt-5 space-y-3");
        sek.appendChild(el("h3", "eyebrow text-tinta-redup", t("peluang.usulan_judul")));
        const elStatus = el("p", "text-sm text-tinta-redup");
        elStatus.setAttribute("aria-live", "polite");
        const btn = tombol(t("peluang.usulkan"), "tombol-halus", function () {
            if (!(p.deskripsi || "").trim()) {
                pesan(elPesanDetail, t("peluang.deskripsi_kosong"), "tinjau");
                return;
            }
            if (tugasBerjalan(p.id)) return;
            sembunyikan(elPesanDetail);
            postJSON(asal + "/api/peluang/" + encodeURIComponent(p.id) + "/usulan-skill", {}, function (hasil) {
                if (!sehat(hasil, elPesanDetail)) return;
                const tugas = hasil.data.data || {};
                if (!tugas.id) return;
                s.tugas = { idPeluang: p.id, teks: t("usulanSkill.diproses"), sampai: Date.now() + (BATAS_POLING + 2) * JEDA_POLING };
                tampilkanStatusTugas();
                tungguTugas(tugas.id, BATAS_POLING, p.id);
            }, ...tokenHeader());
        });
        const baris1 = el("div", "flex flex-wrap items-center gap-3");
        baris1.appendChild(btn);
        baris1.appendChild(elStatus);
        sek.appendChild(baris1);
        const wadahDaftar = el("div", "space-y-4");
        sek.appendChild(wadahDaftar);
        kartuDetail.appendChild(sek);

        s.elStatusTugas = elStatus;
        s.btnUsulkan = btn;
        tampilkanStatusTugas();
        muatUsulan(p, wadahDaftar, elPesanDetail);
    }

    // Batas waktu menggantikan penanda "sedang berjalan" yang harus dibersihkan:
    // bila satu jawaban poling gagal, tombol tetap terbuka lagi dengan sendirinya.
    function tugasBerjalan(idPeluang) {
        return !!(s.tugas && s.tugas.idPeluang === idPeluang && s.tugas.sampai && Date.now() < s.tugas.sampai);
    }

    function tampilkanStatusTugas() {
        const p = s.aktif;
        if (!s.elStatusTugas || !p) return;
        const milik = s.tugas && s.tugas.idPeluang === p.id;
        s.elStatusTugas.textContent = milik ? s.tugas.teks : "";
        s.elStatusTugas.hidden = !milik;
        if (s.btnUsulkan) s.btnUsulkan.disabled = tugasBerjalan(p.id);
    }

    function tungguTugas(tugasId, sisa, idPeluang) {
        getJSON(asal + "/api/tugas-ai/" + encodeURIComponent(tugasId), function (hasil) {
            if (!sehat(hasil, elPesan)) return;
            const tugas = hasil.data.data || {};
            const dilihat = s.aktif && s.aktif.id === idPeluang;
            if (tugas.status === "selesai") {
                s.tugas = null;
                if (dilihat) bukaPeluang(idPeluang, { pesanSah: t("peluang.usulan_selesai") });
            } else if (tugas.status === "gagal") {
                s.tugas = { idPeluang: idPeluang, teks: t("peluang.usulan_gagal") };
                tampilkanStatusTugas();
            } else if (sisa <= 0) {
                s.tugas = { idPeluang: idPeluang, teks: t("usulanSkill.masih_diproses") };
                tampilkanStatusTugas();
            } else {
                s.tugas = { idPeluang: idPeluang, teks: t("usulanSkill.diproses"), sampai: Date.now() + (sisa + 2) * JEDA_POLING };
                tampilkanStatusTugas();
                setTimeout(function () { tungguTugas(tugasId, sisa - 1, idPeluang); }, JEDA_POLING);
            }
        }, ...tokenHeader());
    }

    function muatUsulan(p, wadah, elPesanDetail) {
        getJSON(asal + "/api/peluang/" + encodeURIComponent(p.id) + "/usulan-skill?limit=50", function (hasil) {
            if (!sehat(hasil, elPesanDetail)) return;
            const daftar = (hasil.data.data || []).slice().sort(function (a, b) {
                return (new Date(b.dibuat) - new Date(a.dibuat)) || 0;
            });
            kosongkan(wadah);
            if (!daftar.length) {
                wadah.appendChild(el("p", "text-sm text-tinta-redup", t("peluang.usulan_kosong")));
                return;
            }
            daftar.forEach(function (u) { wadah.appendChild(gambarSatuUsulan(p, u, elPesanDetail)); });
        }, ...tokenHeader());
    }

    function gambarSatuUsulan(p, u, elPesanDetail) {
        const kartu = el("div", "rounded-xl border border-garis-tipis p-4 space-y-3");
        kartu.dataset.uji = "usulan-peluang";
        const butir = u.butir || [];
        const kepalaU = el("div", "flex flex-wrap items-center justify-between gap-2");
        kepalaU.appendChild(el("span", "text-mikro text-tinta-redup", t("peluang.usulan_dibuat", { waktu: waktu(u.dibuat) })));
        const belum = butir.filter(function (b) { return b.status === "usulan"; }).length;
        if (belum) kepalaU.appendChild(el("span", "text-mikro text-tinta-redup", t("peluang.usulan_belum", { n: belum })));
        kartu.appendChild(kepalaU);
        if (!butir.length) {
            kartu.appendChild(el("p", "text-sm text-tinta-redup", t("peluang.usulan_tanpa_butir")));
            return kartu;
        }
        const teks = p.deskripsi || "";
        const sumber = el("div", "rounded-xl bg-latar p-3");
        sumber.appendChild(teksTersorot(teks, butir));
        kartu.appendChild(sumber);
        const tersorot = potongKutipan(teks, butir).filter(function (x) { return x.sorot; }).length;
        if (tersorot < butir.length) kartu.appendChild(el("p", "text-mikro text-tinta-redup", t("peluang.sorot_sebagian")));
        const daftar = el("div");
        butir.forEach(function (b) { daftar.appendChild(gambarButir(p, u.id, b, elPesanDetail)); });
        kartu.appendChild(daftar);
        return kartu;
    }

    function gambarButir(p, usulanId, b, elPesanDetail) {
        const r = el("div", "py-3 border-b border-garis-tipis last:border-0 space-y-2");
        r.dataset.kode = b.kode;
        const atasB = el("div", "flex flex-wrap items-center gap-2");
        atasB.appendChild(el("span", "font-medium break-words", namaSkill(b.kode)));
        atasB.appendChild(el("span", "text-sm text-tinta-redup", t("peluang.tingkat_perkiraan", { tingkat: namaTingkat(b.tingkat_perkiraan) })));
        if (b.status !== "usulan") {
            atasB.appendChild(lencana(t("status.usulan." + b.status), b.status === "ditolak" ? "netral" : "sah"));
            if (b.tingkat_diputuskan) atasB.appendChild(el("span", "text-sm text-tinta-redup", "→ " + namaTingkat(b.tingkat_diputuskan)));
        }
        r.appendChild(atasB);
        if (b.kutipan) r.appendChild(el("blockquote", "border-l-2 border-garis pl-3 text-sm text-tinta-redup break-words", b.kutipan));
        if (b.status === "usulan") {
            const aksi = el("div", "flex flex-wrap items-center gap-2");
            aksi.appendChild(tombol(t("usulanSkill.terima"), "tombol-halus", function () {
                putuskan(p, usulanId, b.kode, "diterima", null, elPesanDetail);
            }));
            const sel = el("select", "medan w-auto text-sm");
            sel.setAttribute("aria-label", t("peluang.pilih_tingkat"));
            [1, 2, 3, 4].forEach(function (n) { sel.appendChild(pilihan(String(n), t("tingkat." + n), n === b.tingkat_perkiraan)); });
            aksi.appendChild(sel);
            aksi.appendChild(tombol(t("usulanSkill.ubah_tingkat"), "tombol-halus", function () {
                putuskan(p, usulanId, b.kode, "diubah", Number(sel.value), elPesanDetail);
            }));
            aksi.appendChild(tombol(t("usulanSkill.tolak"), "tombol-halus", function () {
                putuskan(p, usulanId, b.kode, "ditolak", null, elPesanDetail);
            }));
            r.appendChild(aksi);
        }
        return r;
    }

    function putuskan(p, usulanId, kode, keputusan, tingkat, elPesanDetail) {
        const badan = { kode: kode, keputusan: keputusan };
        if (tingkat != null) badan.tingkat = tingkat;
        sembunyikan(elPesanDetail);
        postJSON(asal + "/api/usulan-skill/" + encodeURIComponent(usulanId) + "/putuskan", badan, function (hasil) {
            if (!sehat(hasil, elPesanDetail)) return;
            muatDaftar();
            bukaPeluang(p.id, { pesanSah: t("peluang.keputusan_tersimpan") });
        }, ...tokenHeader());
    }

    // ── data pendukung ──
    function muatSkill() {
        getJSON(asal + "/api/skill", function (hasil) {
            if (!sehat(hasil, elPesan)) return;
            s.taksonomi = hasil.data.data || {};
            s.skillMap = {};
            (s.taksonomi.skill || []).forEach(function (sk) { s.skillMap[sk.kode] = sk; });
            if (!kartuDetail.hidden) gambarDetail();
        }, ...tokenHeader());
    }

    function muatUnitSaya() {
        getJSON(asal + "/api/saya/profil", function (hasil) {
            if (!sehat(hasil, elPesan)) return;
            const d = hasil.data.data || {};
            s.unitSaya = (d.karyawan && d.karyawan.unit) || "";
            if (s.unitSaya) {
                elUnitSaya.textContent = t("peluang.unit_anda", { unit: s.unitSaya });
                elUnitSaya.hidden = false;
            }
            kartuDetail.querySelectorAll("[data-unit-saya]").forEach(function (e) { e.textContent = s.unitSaya; });
        }, ...tokenHeader());
    }

    muatSkill();
    // /api/saya/profil hanya untuk manajer; peran lain tidak punya unit terkunci.
    if (unitTerkunci && peran === PERAN.MANAJER) muatUnitSaya();
    muatDaftar();
}
