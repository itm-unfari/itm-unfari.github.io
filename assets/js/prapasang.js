// Tema dan bahasa dipasang di <head> SEBELUM stylesheet.
//
// Skrip klasik, bukan modul: modul ditunda sampai dokumen selesai diurai,
// dan itu terlambat untuk mencegah kedip putih atau kedip bahasa yang salah.
(function () {
    var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    var html = document.documentElement;

    function baca(kunci, sah, bawaan) {
        try {
            var v = localStorage.getItem(kunci);
            return sah.indexOf(v) >= 0 ? v : bawaan;
        } catch (e) { return bawaan; }
    }
    function tulis(kunci, nilai) {
        try {
            if (nilai == null) localStorage.removeItem(kunci);
            else localStorage.setItem(kunci, nilai);
        } catch (e) { /* penyimpanan ditolak: pilihan hanya berlaku di halaman ini */ }
    }

    // ── tema ──
    function pilihanTema() { return baca("itm_tema", ["terang", "gelap"], "sistem"); }
    function terapkanTema() {
        var p = pilihanTema();
        var efektif = p === "sistem" ? (media && media.matches ? "gelap" : "terang") : p;
        html.setAttribute("data-tema", efektif);
    }
    if (media && media.addEventListener) {
        media.addEventListener("change", function () { if (pilihanTema() === "sistem") terapkanTema(); });
    }

    // ── bahasa ──
    function pilihanBahasa() { return baca("itm_bahasa", ["id", "en"], "id"); }

    terapkanTema();
    html.setAttribute("lang", pilihanBahasa());
    html.classList.add("i18n-tunggu");

    window.itmTampilan = {
        tema: pilihanTema,
        setelTema: function (p) {
            tulis("itm_tema", p === "terang" || p === "gelap" ? p : null);
            terapkanTema();
        },
        bahasa: pilihanBahasa,
        setelBahasa: function (b) {
            tulis("itm_bahasa", b === "en" ? "en" : "id");
            // Muat ulang: semua teks, termasuk yang dirakit skrip halaman,
            // digambar ulang dalam bahasa baru dengan satu jalan yang sama.
            window.location.reload();
        },
    };
})();
