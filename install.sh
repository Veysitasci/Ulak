#!/usr/bin/env bash
set -euo pipefail

# ULAK - Ag ve Guvenlik Kiti (v2.0.0) Kurulum ve Yonetim Betigi

APP_NAME="ulak"
VERSION="2.0.0"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DEB="$ROOT_DIR/dist/${APP_NAME}_${VERSION}_all.deb"

# Colors
C_RESET="\033[0m"
C_BOLD="\033[1m"
C_CYAN="\033[36m"
C_GREEN="\033[32m"
C_YELLOW="\033[33m"
C_RED="\033[31m"

show_banner() {
    echo -e "${C_CYAN}${C_BOLD}"
    echo "  ██╗   ██╗██╗      █████╗ ██╗  ██╗"
    echo "  ██║   ██║██║     ██╔══██╗██║ ██╔╝"
    echo "  ██║   ██║██║     ███████║█████═╝ "
    echo "  ██║   ██║██║     ██╔══██║██╔═██╗ "
    echo "  ╚██████╔╝███████╗██║  ██║██║ ╚██╗"
    echo "   ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝"
    echo -e "   Ağ & Güvenlik Kiti • v${VERSION}${C_RESET}\n"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${C_YELLOW}[!] Bu islem icin yonetici (sudo) yetkisi gereklidir.${C_RESET}"
        SUDO_CMD="sudo"
    else
        SUDO_CMD=""
    fi
}

install_dependencies() {
    echo -e "${C_CYAN}[*] Sistem gereksinimleri kontrol ediliyor...${C_RESET}"
    if command -v apt-get >/dev/null 2>&1; then
        $SUDO_CMD apt-get update -y
        $SUDO_CMD apt-get install -y --no-install-recommends \
            python3 \
            python3-gi \
            gir1.2-gtk-3.0 \
            python3-psutil \
            python3-dbus \
            python3-pil \
            network-manager \
            bluez \
            pciutils \
            usbutils \
            nftables \
            iptables \
            redsocks \
            policykit-1 \
            dpkg-dev
        echo -e "${C_GREEN}[✓] Tum bagimliliklar kurulu.${C_RESET}"
    else
        echo -e "${C_YELLOW}[!] Debian/Ubuntu/Kali tabanli olmayan bir sistem algilandi. Paket bagimliliklarini manuel kontrol ediniz.${C_RESET}"
    fi
}

build_package() {
    echo -e "\n${C_CYAN}[*] ULAK v${VERSION} .deb paketi derleniyor...${C_RESET}"
    chmod +x "$ROOT_DIR/scripts/build_deb.sh"
    "$ROOT_DIR/scripts/build_deb.sh" "$VERSION"
}

install_deb() {
    echo -e "\n${C_CYAN}[*] ULAK sisteme kuruluyor...${C_RESET}"
    check_root
    $SUDO_CMD apt-get install -y --reinstall "$DIST_DEB"
    echo -e "\n${C_GREEN}${C_BOLD}[✓] ULAK basariyla sisteme kuruldu!${C_RESET}"
    echo -e "${C_CYAN}  • Terminalden baslatmak icin: ${C_BOLD}ulak${C_RESET}"
    echo -e "${C_CYAN}  • Uygulama menusunden: ${C_BOLD}ULAK (Ag ve Guvenlik Yoneticisi)${C_RESET}"
}

uninstall_app() {
    echo -e "${C_YELLOW}[*] ULAK sistemden kaldiriliyor...${C_RESET}"
    check_root
    $SUDO_CMD apt-get remove --purge -y "$APP_NAME" || true
    echo -e "${C_GREEN}[✓] ULAK sistemden basariyla kaldirildi.${C_RESET}"
}

show_help() {
    echo "Kullanim: $0 [SECENEK]"
    echo ""
    echo "Secenekler:"
    echo "  --install      Bagimliliklari kurar, .deb paketini derler ve sisteme yukler (Varsayilan)"
    echo "  --build        Yalnizca .deb paketini dist/ klasorune derler (Kurulum yapmaz)"
    echo "  --uninstall    ULAK uygulamasini sistemden tamamen kaldirir"
    echo "  --help         Bu yardim iletisini goruntuler"
    echo ""
}

# Main routing
show_banner

ACTION="${1:---install}"

case "$ACTION" in
    --install)
        check_root
        install_dependencies
        build_package
        install_deb
        ;;
    --build)
        build_package
        echo -e "\n${C_GREEN}[✓] Paket hazir: ${DIST_DEB}${C_RESET}"
        ;;
    --uninstall)
        uninstall_app
        ;;
    --help|-h)
        show_help
        ;;
    *)
        echo -e "${C_RED}[X] Gecersiz secenek: $ACTION${C_RESET}\n"
        show_help
        exit 1
        ;;
esac
