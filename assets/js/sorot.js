// Sorotan kutipan bukti usulan AI di teks sumbernya (§7.2, §16.2: "Kutipan
// bukti tersorot tepat pada posisinya di teks sumber").
//
// posisi_mulai/posisi_selesai berasal dari strings.Index di Go: offset BYTE
// UTF-8, bukan indeks string JavaScript (UTF-16). Untuk teks ASCII keduanya
// sama, sehingga kesalahan ini tidak terlihat sampai teks memuat "é", "—",
// atau huruf non-Latin. Semua pemotongan di sini dilakukan pada byte lalu
// didekode ulang.
import { el } from "./ui.js";

const enc = new TextEncoder();
const dec = new TextDecoder();

// potongKutipan memecah teks menjadi bagian biasa dan bagian tersorot.
// Butir yang posisinya di luar teks, tumpang tindih dengan butir sebelumnya,
// atau potongan bytenya tidak sama dengan `kutipan` dilewati (teks sumber
// sudah berubah) — lebih baik tidak menyorot daripada menyorot tempat yang
// salah.
export function potongKutipan(teks, butir) {
    const b = enc.encode(teks);
    const urut = (butir || []).slice().sort(function (x, y) { return x.posisi_mulai - y.posisi_mulai; });
    const hasil = [];
    let kursor = 0;
    urut.forEach(function (u) {
        const a = u.posisi_mulai, z = u.posisi_selesai;
        if (!(a >= kursor && z > a && z <= b.length)) return;
        const potong = dec.decode(b.slice(a, z));
        if (u.kutipan != null && potong !== u.kutipan) return;
        if (a > kursor) hasil.push({ teks: dec.decode(b.slice(kursor, a)), sorot: false });
        hasil.push({ teks: potong, sorot: true, kode: u.kode });
        kursor = z;
    });
    if (kursor < b.length) hasil.push({ teks: dec.decode(b.slice(kursor)), sorot: false });
    return hasil;
}

// teksTersorot mengembalikan <p> berisi teks dengan <mark data-kode> pada
// setiap kutipan yang cocok. Seluruh isi lewat textContent/TextNode.
export function teksTersorot(teks, butir) {
    const p = el("p", "text-sm leading-relaxed whitespace-pre-wrap break-words");
    p.dataset.uji = "teks-sumber";
    potongKutipan(teks, butir).forEach(function (bagian) {
        if (!bagian.sorot) {
            p.appendChild(document.createTextNode(bagian.teks));
            return;
        }
        const m = document.createElement("mark");
        m.className = "rounded bg-utama-muda px-0.5 text-utama";
        m.textContent = bagian.teks;
        if (bagian.kode) m.dataset.kode = bagian.kode;
        p.appendChild(m);
    });
    return p;
}
