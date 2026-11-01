#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-ulak}"
VERSION="${1:-2.0.0}"
ARCH="all"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_ROOT="$ROOT_DIR/build/${APP_NAME}_${VERSION}_${ARCH}"
DIST_DIR="$ROOT_DIR/dist"
APP_LIB_DIR="$BUILD_ROOT/usr/lib/$APP_NAME"
APP_SRC_DIR="$ROOT_DIR/app"

rm -rf "$BUILD_ROOT"
mkdir -p "$BUILD_ROOT/DEBIAN" \
         "$BUILD_ROOT/usr/bin" \
         "$BUILD_ROOT/usr/share/applications" \
         "$BUILD_ROOT/usr/share/pixmaps" \
         "$BUILD_ROOT/usr/share/icons/hicolor/512x512/apps" \
         "$APP_LIB_DIR/assets" \
         "$DIST_DIR"

# 1. Debian Control file
cat > "$BUILD_ROOT/DEBIAN/control" <<EOF
Package: $APP_NAME
Version: $VERSION
Section: utils
Priority: optional
Architecture: $ARCH
Maintainer: ULAK Gelistirici Ekibi <contact@ulak.app>
Depends: python3, python3-gi, gir1.2-gtk-3.0, python3-psutil, python3-dbus, python3-pil, network-manager, bluez, pciutils, usbutils, nftables, iptables, redsocks, policykit-1
Description: ULAK - Ag ve Guvenlik Kiti
 Termius tarzi modern bento grid arayuzu ile WiFi, Bluetooth, Donanim
 telemetrisi ve Guvenlik Duvari/Proxy yonetim kiti.
EOF

# 2. Debian postinst script
cat > "$BUILD_ROOT/DEBIAN/postinst" << 'POSTINST_EOF'
#!/usr/bin/env bash
set -e
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database -q /usr/share/applications || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi
if ! getent group dolunay-noproxy >/dev/null 2>&1; then
    groupadd -r dolunay-noproxy || true
fi
if ! getent group ulak-noproxy >/dev/null 2>&1; then
    groupadd -r ulak-noproxy || true
fi

# Add shortcut to active user desktop if available
for user_home in /home/*; do
    if [[ -d "$user_home" ]]; then
        uname=$(basename "$user_home")
        for desk in "$user_home/Masaüstü" "$user_home/Desktop"; do
            if [[ -d "$desk" ]]; then
                cp -f /usr/share/applications/ulak.desktop "$desk/ULAK.desktop" 2>/dev/null || true
                chmod +x "$desk/ULAK.desktop" 2>/dev/null || true
                chown "$uname:$uname" "$desk/ULAK.desktop" 2>/dev/null || true
            fi
        done
    fi
done

exit 0
POSTINST_EOF
chmod 0755 "$BUILD_ROOT/DEBIAN/postinst"

# 3. Debian postrm script
cat > "$BUILD_ROOT/DEBIAN/postrm" << 'POSTRM_EOF'
#!/usr/bin/env bash
set -e
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database -q /usr/share/applications || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi
exit 0
POSTRM_EOF
chmod 0755 "$BUILD_ROOT/DEBIAN/postrm"

# 4. Executable wrapper in /usr/bin/ulak
cat > "$BUILD_ROOT/usr/bin/$APP_NAME" <<EOF
#!/usr/bin/env bash
exec /usr/bin/python3 /usr/lib/$APP_NAME/main.py "\$@"
EOF
chmod 0755 "$BUILD_ROOT/usr/bin/$APP_NAME"

# 5. Application source files in /usr/lib/ulak
cp "$APP_SRC_DIR"/*.py "$APP_LIB_DIR/"
chmod 0644 "$APP_LIB_DIR"/*.py
chmod 0755 "$APP_LIB_DIR/main.py"

# 6. Assets
if [[ -d "$ROOT_DIR/assets" ]]; then
    cp -r "$ROOT_DIR/assets"/* "$APP_LIB_DIR/assets/"
fi

# 7. Desktop Entry
DESKTOP_FILE_SRC="$ROOT_DIR/packaging/${APP_NAME}.desktop"
if [[ ! -f "$DESKTOP_FILE_SRC" ]]; then
    DESKTOP_FILE_SRC="$ROOT_DIR/packaging/dolunaylnxkit.desktop"
fi
install -m 0644 "$DESKTOP_FILE_SRC" "$BUILD_ROOT/usr/share/applications/${APP_NAME}.desktop"

# 8. Icons
ICON_SRC="$ROOT_DIR/assets/ulak_logo.png"
if [[ ! -f "$ICON_SRC" ]]; then
    ICON_SRC="$ROOT_DIR/assets/dolunay_logo.png"
fi
if [[ -f "$ICON_SRC" ]]; then
    install -m 0644 "$ICON_SRC" "$BUILD_ROOT/usr/share/icons/hicolor/512x512/apps/${APP_NAME}.png"
    install -m 0644 "$ICON_SRC" "$BUILD_ROOT/usr/share/pixmaps/${APP_NAME}.png"
fi

# 9. Build Debian Package
DEB_PATH="$DIST_DIR/${APP_NAME}_${VERSION}_${ARCH}.deb"
dpkg-deb --root-owner-group --build "$BUILD_ROOT" "$DEB_PATH"

echo "=================================================="
echo " Basariyla Derlendi: $DEB_PATH"
echo " Kurulum Komutu: sudo apt install $DEB_PATH"
echo "=================================================="
