#!/bin/bash
# Abre a ZF 8HP Diagnostic Suite usando o Python do Homebrew (Tk 9.1).
# Uso:  ./run.sh     (no Terminal do macOS)
cd "$(dirname "$0")"
exec /opt/homebrew/bin/python3.15 simulador_zf8hp.py
