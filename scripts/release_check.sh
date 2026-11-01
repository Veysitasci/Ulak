#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="${1:-2.0.0}"
APP_NAME="ulak"
PKG_PATH="dist/${APP_NAME}_${VERSION}_all.deb"

ok() {
  printf "[OK] %s\n" "$1"
}

fail() {
  printf "[FAIL] %s\n" "$1" >&2
  exit 1
}

echo "Release checklist for ${APP_NAME} v${VERSION}"
echo "----------------------------------------------"

[[ -f "scripts/build_deb.sh" ]] || fail "Build script missing"
ok "Build script present"

[[ -d "app" ]] || fail "App source directory missing"
ok "App source directory present"

[[ -f "install.sh" ]] || fail "install.sh missing"
ok "install.sh present"

[[ -f "start.sh" ]] || fail "start.sh missing"
ok "start.sh present"

[[ -f "packaging/${APP_NAME}.desktop" ]] || fail "Desktop file missing"
ok "Desktop entry present"

chmod +x scripts/build_deb.sh
APP_NAME="$APP_NAME" ./scripts/build_deb.sh "$VERSION" >/tmp/ulak_build.log 2>&1 || {
  cat /tmp/ulak_build.log
  fail "Deb build failed"
}
ok "Deb package built"

[[ -f "$PKG_PATH" ]] || fail "Package output not found: $PKG_PATH"
ok "Package artifact exists"

dpkg-deb -f "$PKG_PATH" Package | grep -qx "$APP_NAME" || fail "Debian package name is not ${APP_NAME}"
ok "Package name is ${APP_NAME}"

PKG_CONTENTS="$(dpkg-deb -c "$PKG_PATH")"

echo "$PKG_CONTENTS" | grep -E "./usr/bin/${APP_NAME}$" >/dev/null || fail "Binary launcher missing in package"
ok "Binary launcher included"

echo "$PKG_CONTENTS" | grep -E "./usr/share/applications/${APP_NAME}.desktop$" >/dev/null || fail "Desktop file missing in package"
ok "Desktop entry included"

echo "$PKG_CONTENTS" | grep -E "./usr/lib/${APP_NAME}/main.py$" >/dev/null || fail "Application main.py missing in package"
ok "Application files included"

echo "$PKG_CONTENTS" | grep -E "./usr/share/icons/hicolor/512x512/apps/${APP_NAME}.png$" >/dev/null || fail "Icon missing in package"
ok "Application icon included"

echo "----------------------------------------------"
echo "All release checks passed for ${APP_NAME} v${VERSION}."
