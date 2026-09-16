// Permintaan JSON ke backend, dengan bentuk callback yang sama seperti
// jscroot/api.js: minta(url, fn, ...tokenHeader()).
//
// Kenapa bukan jscroot/api.js: di sana galat jaringan hanya masuk
// console.log dan badan yang bukan JSON melempar di dalam .then, sehingga
// callback TIDAK PERNAH dipanggil. Akibatnya tombol yang dikunci sebelum
// permintaan tetap terkunci dan cabang "tanpa jawaban" di sehat() tidak
// pernah berjalan — backend mati atau proksi yang mengembalikan halaman HTML
// tampak seperti aplikasi yang menggantung. Di sini callback SELALU
// dipanggil, tepat sekali.
//
// Kontraknya: { status, data }.
//   status null  → tidak ada jawaban sama sekali (jaringan/CORS)
//   data null    → badan kosong atau bukan JSON
// sehat() di ui.js menerjemahkan keduanya menjadi pesan yang bisa dibaca.

function panggil(metode, url, badan, fn, kunciToken, nilaiToken) {
    const tajuk = { Accept: "application/json" };
    if (kunciToken && nilaiToken) tajuk[kunciToken] = nilaiToken;
    if (badan !== undefined) tajuk["Content-Type"] = "application/json";

    let selesai = false;
    const jawab = (hasil) => {
        if (selesai) return;
        selesai = true;
        fn(hasil);
    };

    fetch(url, {
        method: metode,
        headers: tajuk,
        redirect: "follow",
        body: badan === undefined ? undefined : JSON.stringify(badan),
    }).then(function (r) {
        return r.text().then(function (teks) {
            let data = null;
            try {
                data = teks ? JSON.parse(teks) : null;
            } catch (e) {
                data = null;   // mis. halaman galat HTML dari proksi
            }
            jawab({ status: r.status, data: data });
        });
    }).catch(function () {
        jawab({ status: null, data: null });
    });
}

export function getJSON(url, fn, kunciToken, nilaiToken) {
    panggil("GET", url, undefined, fn, kunciToken, nilaiToken);
}

export function postJSON(url, badan, fn, kunciToken, nilaiToken) {
    panggil("POST", url, badan === undefined ? {} : badan, fn, kunciToken, nilaiToken);
}

export function deleteJSON(url, fn, kunciToken, nilaiToken) {
    panggil("DELETE", url, undefined, fn, kunciToken, nilaiToken);
}
