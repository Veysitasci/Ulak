#!/bin/bash
# ============================================================
# Dolunay LnxKit — Korumalı Build Script (Nuitka)
# Python kaynak kodunu native makine koduna derler.
# ============================================================
set -euo pipefail
VERSION="${1:-2.0.0}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$PROJECT_DIR/app"
OUTPUT_DIR="$PROJECT_DIR/dist/protected"

echo "╔══════════════════════════════════════════════════════╗"
echo "║  🌕 Dolunay LnxKit — Korumalı Derleme v${VERSION}       ║"
echo "║     Python → C → Native ELF Binary                  ║"
echo "╚══════════════════════════════════════════════════════╝"

# Bağımlılık kontrolleri
if ! python3 -c "import nuitka" 2>/dev/null; then
    echo "Nuitka yükleniyor..."
    pip3 install nuitka --break-system-packages 2>/dev/null || pip3 install nuitka
fi

mkdir -p "$OUTPUT_DIR"

cd "$APP_DIR"
python3 -m nuitka \
    --standalone \
    --enable-plugin=gi \
    --follow-imports \
    --remove-output \
    --no-pyi-file \
    --output-dir="$OUTPUT_DIR" \
    --output-filename=dolunaylnxkit \
    --company-name="Dolunay" \
    --product-name="Dolunay LnxKit" \
    --file-version="$VERSION" \
    --assume-yes-for-downloads \
    main.py

echo "✅ Derleme tamamlandı!"
echo "Binary: $OUTPUT_DIR/main.dist/dolunaylnxkit"
