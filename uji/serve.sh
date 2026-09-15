#!/bin/bash
# Menyajikan folder repo ini sebagai situs statis di porta 5180 pada 0.0.0.0
# (dilihat dari HP di tailnet lewat http://100.125.6.77:5180).
#
# Hanya menghentikan proses yang dijalankan skrip ini sendiri (uji/.serve.pid,
# dicocokkan dengan baris perintahnya). Kalau portanya dipegang proses lain,
# skrip berhenti: server ini dipakai bersama proyek lain, dan membunuh "apa pun
# yang memegang porta" bisa mematikan layanan orang lain.
set -euo pipefail
cd "$(dirname "$0")/.."
AKAR=$(pwd)
PORT="${PORT:-5180}"
PIDF="$AKAR/uji/.serve.pid"
LOG="$AKAR/uji/.serve.log"

porta_dipakai() { ss -ltnH "sport = :$PORT" | grep -q .; }

# milik_skrip_ini benar kalau pid hidup dan perintahnya python http.server
# untuk porta ini yang berjalan dari folder repo ini.
milik_skrip_ini() {
    local pid="$1"
    [ -e "/proc/$pid" ] || return 1
    [ "$(readlink "/proc/$pid/cwd" 2>/dev/null || true)" = "$AKAR" ] || return 1
    tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | grep -q "http.server $PORT "
}

if [ -f "$PIDF" ]; then
    PID=$(cat "$PIDF")
    if milik_skrip_ini "$PID"; then
        kill "$PID"
        for _ in $(seq 1 30); do [ -e "/proc/$PID" ] || break; sleep 0.2; done
    fi
    rm -f "$PIDF"
fi

if porta_dipakai; then
    echo "DITOLAK: porta $PORT dipegang proses yang bukan milik skrip ini. Tidak ada yang dihentikan." >&2
    exit 1
fi

nohup python3 -m http.server "$PORT" --bind 0.0.0.0 > "$LOG" 2>&1 &
echo $! > "$PIDF"

for _ in $(seq 1 50); do
    if curl -sf -o /dev/null "http://127.0.0.1:$PORT/login/"; then
        echo "Situs statis hidup di http://0.0.0.0:$PORT (pid $(cat "$PIDF"))"
        exit 0
    fi
    sleep 0.2
done
echo "Server statis tidak kunjung hidup. Log:" >&2
tail -5 "$LOG" >&2
exit 1
