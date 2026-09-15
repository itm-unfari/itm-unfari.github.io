#!/bin/bash
# Aturan identitas commit bersama untuk ketiga hook. Dibaca lewat `source`.

ITM_NAMA="mubaroqadb"
ITM_EMAIL="mubaroq@digitalbdg.ac.id"

# pesan_bertrailer_ai membaca pesan commit dari stdin dan berhasil (exit 0)
# kalau pesannya memuat atribusi AI.
pesan_bertrailer_ai() {
    grep -Eiq 'co-authored-by:.*(claude|anthropic)|noreply@anthropic\.com|generated with .*claude'
}
