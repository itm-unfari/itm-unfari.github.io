#!/bin/bash
# Memasang identitas, kunci SSH, dan hook untuk repo ini SAJA (tidak global:
# server dipakai juga oleh LabOS dan proyek lain).
#
#     .githooks/pasang.sh
#
# core.sshCommand mengikat kunci server dan MENGABAIKAN agen SSH yang
# diteruskan VS Code dari Mac, supaya push tidak diam-diam memakai kunci Mac.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
source .githooks/aturan.sh

KUNCI="${ITM_KUNCI_GITHUB:-$HOME/.ssh/github_mubaroqadb_itm}"

git config --local user.name "$ITM_NAMA"
git config --local user.email "$ITM_EMAIL"
git config --local user.useConfigOnly true
git config --local core.hooksPath .githooks
git config --local core.sshCommand "ssh -i $KUNCI -o IdentitiesOnly=yes -o IdentityAgent=none"
chmod +x .githooks/commit-msg .githooks/pre-commit .githooks/pre-push

echo "terpasang di $(pwd):"
git config --local --get-regexp '^(user|core\.hooksPath|core\.sshCommand)'
