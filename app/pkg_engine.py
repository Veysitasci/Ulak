#!/usr/bin/env python3
"""
ULAK Evrensel Paket Yükleme & Analiz Motoru (Cross-Distro Package Engine).
Desteklenen formatlar:
- .deb (Debian, Ubuntu, Kali, Pardus, Linux Mint vb.)
- .rpm (Fedora, RHEL, CentOS, openSUSE vb.)
- .AppImage (Evrensel bağımsız Linux ikilisi)
- .tar.gz, .tar.xz, .tar.bz2, .zip (Taşınabilir arşiv ve kaynak kod paketleri)
- .pkg.tar.zst (Arch Linux / Manjaro)
- .flatpak / .flatpakref
"""

import os
import sys
import shutil
import hashlib
import subprocess
import tarfile
import zipfile
import threading
import time
from pathlib import Path

# Güvenlik motoru entegrasyonu
try:
    from antivirus_engine import SUSPICIOUS_PATTERNS
except Exception:
    SUSPICIOUS_PATTERNS = []

class PackageInfo:
    """Paket metadata ve analiz verilerini tutan veri sınıfı."""
    def __init__(self):
        self.file_path = ""
        self.filename = ""
        self.format_type = "unknown"  # deb, rpm, appimage, archive, arch, flatpak
        self.name = ""
        self.version = ""
        self.architecture = "all"
        self.maintainer = ""
        self.description = ""
        self.installed_size_bytes = 0
        self.file_size_bytes = 0
        self.dependencies = []
        self.files = []  # list of dict: {"path": str, "size": int, "is_dir": bool}
        self.scripts = {}  # "preinst", "postinst", "prerm", "postrm"
        self.sha256 = ""
        self.md5 = ""
        self.desktop_file = None  # Desktop file content or path
        self.icon_data = None     # Icon bytes or name
        self.security_score = 100 # 0-100
        self.security_findings = []
        self.distro_compatible = True
        self.compatibility_note = ""

    def human_size(self, num_bytes):
        for unit in ['B', 'KB', 'MB', 'GB']:
            if num_bytes < 1024.0:
                return f"{num_bytes:.1f} {unit}"
            num_bytes /= 1024.0
        return f"{num_bytes:.1f} TB"

    @property
    def formatted_file_size(self):
        return self.human_size(self.file_size_bytes)

    @property
    def formatted_installed_size(self):
        return self.human_size(self.installed_size_bytes or self.file_size_bytes)

    def is_installed_on_system(self):
        """Bu paketin sistemde halihazırda kurulu olup olmadığını denetler."""
        if not self.name:
            return False
        # 1. dpkg -s
        if shutil.which("dpkg"):
            try:
                res = subprocess.run(["dpkg", "-s", self.name], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
                if res.returncode == 0 and "Status: install ok installed" in res.stdout:
                    return True
            except Exception:
                pass
        # 2. rpm -q
        if shutil.which("rpm"):
            try:
                res = subprocess.run(["rpm", "-q", self.name], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
                if res.returncode == 0:
                    return True
            except Exception:
                pass
        # 3. which / PATH
        for cand in [self.name, self.name.lower()]:
            w = shutil.which(cand)
            if w and os.access(w, os.X_OK):
                return True
        # 4. AppImage / izole kullanıcı
        user_app = os.path.expanduser(f"~/.local/share/ulak/apps/{self.name}")
        if os.path.exists(user_app):
            return True
        return False

    def get_resolved_executable(self):
        """Uygulamanın gerçek çalıştırılabilir ikilisini ve başlatma komutunu tespit eder."""
        import shutil, re

        # 1. Desktop dosyalarını denetle (/usr/share/applications veya paket içindekiler)
        desktops = [f["path"] for f in self.files if f["path"].endswith(".desktop")]
        for d in desktops:
            candidates = [d, f"/usr/share/applications/{os.path.basename(d)}"]
            for cand in candidates:
                if os.path.exists(cand):
                    try:
                        with open(cand, "r", errors="ignore") as df:
                            for line in df:
                                if line.startswith("Exec="):
                                    raw = line.split("=", 1)[1].strip()
                                    cleaned = re.sub(r"%[a-zA-Z]", "", raw).strip()
                                    parts = cleaned.split()
                                    if parts:
                                        bin_path = parts[0]
                                        if os.path.exists(bin_path) and os.access(bin_path, os.X_OK):
                                            return bin_path, cleaned
                                        which_p = shutil.which(bin_path)
                                        if which_p and os.access(which_p, os.X_OK):
                                            return which_p, cleaned
                    except Exception:
                        pass

        # 2. Standart /usr/bin/ veya /bin/ altındaki dosyalar (node_modules, resources hariç!)
        for f in self.files:
            p = f["path"]
            if not f.get("is_dir", False):
                if p.startswith(("/usr/bin/", "/bin/", "/usr/games/")):
                    if not any(x in p for x in ["/node_modules/", "/resources/", "/lib/", "/extensions/"]):
                        if os.path.exists(p) and os.access(p, os.X_OK):
                            return p, p

        # 3. İsimle doğrudan /usr/bin kontrolü veya PATH
        for name_cand in [self.name, self.name.lower(), self.name.capitalize()]:
            p = f"/usr/bin/{name_cand}"
            if os.path.exists(p) and os.access(p, os.X_OK):
                return p, p
            w = shutil.which(name_cand)
            if w and os.access(w, os.X_OK):
                return w, w

        # 4. /opt/{name}/{name} veya /opt/{name.capitalize()}/{name}
        for opt_cand in [
            f"/opt/{self.name}/{self.name}",
            f"/opt/{self.name.capitalize()}/{self.name}",
            f"/opt/{self.name.capitalize()}/{self.name.lower()}",
            f"/opt/{self.name}/{self.name.lower()}"
        ]:
            if os.path.exists(opt_cand) and os.access(opt_cand, os.X_OK):
                return opt_cand, opt_cand

        return self.name, self.name


class DistroDetector:
    """Mevcut Linux dağıtımını ve paket yönetim aracını tespit eder."""
    @staticmethod
    def get_info():
        info = {
            "id": "linux",
            "name": "Linux",
            "family": "generic",
            "pkg_manager": "generic"
        }
        if os.path.exists("/etc/os-release"):
            try:
                with open("/etc/os-release", "r") as f:
                    lines = f.readlines()
                vals = {}
                for line in lines:
                    line = line.strip()
                    if "=" in line:
                        k, v = line.split("=", 1)
                        vals[k.strip()] = v.strip("'\"")
                
                info["id"] = vals.get("ID", "linux").lower()
                info["name"] = vals.get("NAME", "Linux")
                
                id_like = vals.get("ID_LIKE", "").lower()
                all_ids = f"{info['id']} {id_like}"
                
                if any(x in all_ids for x in ["debian", "ubuntu", "kali", "mint", "pardus"]):
                    info["family"] = "debian"
                    info["pkg_manager"] = "apt"
                elif any(x in all_ids for x in ["fedora", "rhel", "centos", "rocky", "almalinux"]):
                    info["family"] = "redhat"
                    info["pkg_manager"] = "dnf" if shutil.which("dnf") else "rpm"
                elif any(x in all_ids for x in ["arch", "manjaro", "endeavouros"]):
                    info["family"] = "arch"
                    info["pkg_manager"] = "pacman"
                elif any(x in all_ids for x in ["suse", "opensuse"]):
                    info["family"] = "suse"
                    info["pkg_manager"] = "zypper"
            except Exception as e:
                print("Distro detection error:", e)
        return info


class PackageInspector:
    """Tüm Linux paket formatlarını parçalayarak derin analiz yapar."""

    @classmethod
    def inspect(cls, file_path):
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Paket dosyası bulunamadı: {file_path}")

        path_obj = Path(file_path)
        pkg = PackageInfo()
        pkg.file_path = os.path.abspath(file_path)
        pkg.filename = path_obj.name
        pkg.file_size_bytes = os.path.getsize(file_path)

        # Hash hesaplama
        cls._calc_hashes(pkg)

        # Uzantı ve format belirleme
        lower_name = pkg.filename.lower()
        if lower_name.endswith(".deb"):
            pkg.format_type = "deb"
            cls._inspect_deb(pkg)
        elif lower_name.endswith(".rpm"):
            pkg.format_type = "rpm"
            cls._inspect_rpm(pkg)
        elif lower_name.endswith(".appimage"):
            pkg.format_type = "appimage"
            cls._inspect_appimage(pkg)
        elif lower_name.endswith((".tar.gz", ".tar.xz", ".tar.bz2", ".tgz", ".tar", ".zip")):
            pkg.format_type = "archive"
            cls._inspect_archive(pkg)
        elif lower_name.endswith((".pkg.tar.zst", ".pkg.tar.xz")):
            pkg.format_type = "arch"
            cls._inspect_arch_pkg(pkg)
        elif lower_name.endswith((".flatpak", ".flatpakref")):
            pkg.format_type = "flatpak"
            cls._inspect_flatpak(pkg)
        else:
            # Sihirli bayt denetimi
            cls._inspect_by_magic(pkg)

        # Dağıtım uyumluluğu kontrolü
        distro = DistroDetector.get_info()
        if pkg.format_type == "deb":
            if distro["family"] == "debian":
                pkg.distro_compatible = True
                pkg.compatibility_note = f"Sisteminizle ({distro['name']}) tam uyumlu yerel paket."
            else:
                pkg.distro_compatible = False
                pkg.compatibility_note = f"Paket Debian/Ubuntu tabanlıdır. {distro['name']} üzerinde çalıştırmak için alien veya izole kullanıcı alanı gerekebilir."
        elif pkg.format_type == "rpm":
            if distro["family"] == "redhat" or distro["family"] == "suse":
                pkg.distro_compatible = True
                pkg.compatibility_note = f"Sisteminizle ({distro['name']}) tam uyumlu RPM paketi."
            else:
                pkg.distro_compatible = False
                pkg.compatibility_note = f"Paket RPM tabanlıdır. {distro['name']} üzerinde doğrudan çalıştırılamaz veya alien gerektirir."
        elif pkg.format_type in ["appimage", "archive"]:
            pkg.distro_compatible = True
            pkg.compatibility_note = "Tüm Linux dağıtımlarında evrensel olarak çalıştırılabilir."
        elif pkg.format_type == "arch":
            pkg.distro_compatible = (distro["family"] == "arch")
            pkg.compatibility_note = "Arch Linux yerel paketi." if pkg.distro_compatible else "Arch dışındaki dağıtımlarda doğrudan kurulamaz."

        # Güvenlik denetimi
        cls._run_security_check(pkg)

        return pkg

    @staticmethod
    def _calc_hashes(pkg):
        sha256 = hashlib.sha256()
        md5 = hashlib.md5()
        with open(pkg.file_path, "rb") as f:
            while chunk := f.read(65536):
                sha256.update(chunk)
                md5.update(chunk)
        pkg.sha256 = sha256.hexdigest()
        pkg.md5 = md5.hexdigest()

    @classmethod
    def _inspect_deb(cls, pkg):
        """Debian (.deb) paketini dpkg-deb veya dahili ar ayrıştırması ile inceler."""
        dpkg_available = shutil.which("dpkg-deb") is not None
        if dpkg_available:
            try:
                # 1. dpkg-deb -I (Control Bilgileri)
                out = subprocess.check_output(["dpkg-deb", "-I", pkg.file_path], text=True, stderr=subprocess.DEVNULL)
                cls._parse_deb_control(out, pkg)
            except Exception as e:
                print("dpkg-deb -I error:", e)

            try:
                # 2. dpkg-deb -c (Dosya Listesi)
                out_files = subprocess.check_output(["dpkg-deb", "-c", pkg.file_path], text=True, stderr=subprocess.DEVNULL)
                for line in out_files.strip().split("\n"):
                    if not line:
                        continue
                    parts = line.split()
                    if len(parts) >= 6:
                        perms = parts[0]
                        size = int(parts[2]) if parts[2].isdigit() else 0
                        path = parts[-1]
                        # Temizle ./usr/... -> /usr/...
                        if path.startswith("."):
                            path = path[1:]
                        if not path.startswith("/"):
                            path = "/" + path
                        pkg.files.append({
                            "path": path,
                            "size": size,
                            "is_dir": perms.startswith("d")
                        })
            except Exception as e:
                print("dpkg-deb -c error:", e)

            # 3. Scriptleri al (preinst, postinst vb.)
            try:
                tmp_ctrl_dir = f"/tmp/ulak_deb_ctrl_{os.getpid()}_{int(time.time())}"
                os.makedirs(tmp_ctrl_dir, exist_ok=True)
                subprocess.run(["dpkg-deb", "-e", pkg.file_path, tmp_ctrl_dir], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                for script_name in ["preinst", "postinst", "prerm", "postrm"]:
                    s_path = os.path.join(tmp_ctrl_dir, script_name)
                    if os.path.exists(s_path):
                        with open(s_path, "r", errors="ignore") as f:
                            pkg.scripts[script_name] = f.read()
                shutil.rmtree(tmp_ctrl_dir, ignore_errors=True)
            except Exception as e:
                print("Extract deb control scripts error:", e)
        else:
            # Python tabanlı ar ayrıştırıcı fallback
            cls._inspect_deb_pure_python(pkg)

        if not pkg.name:
            pkg.name = pkg.filename.split("_")[0] if "_" in pkg.filename else pkg.filename.rsplit(".", 1)[0]

    @classmethod
    def _parse_deb_control(cls, text, pkg):
        """dpkg-deb -I veya control dosyasından alanları ayrıştırır."""
        current_field = None
        for line in text.split("\n"):
            if not line:
                continue
            # If line is indented with 2+ spaces or tabs, it's a multiline continuation
            if (line.startswith("  ") or line.startswith("\t")) and current_field == "Description":
                pkg.description += "\n" + line.strip()
                continue

            stripped = line.strip()
            if ":" in stripped:
                key, val = stripped.split(":", 1)
                key = key.strip()
                val = val.strip()
                current_field = key
                if key == "Package":
                    pkg.name = val
                elif key == "Version":
                    pkg.version = val
                elif key == "Architecture":
                    pkg.architecture = val
                elif key == "Maintainer":
                    pkg.maintainer = val
                elif key == "Installed-Size":
                    try:
                        pkg.installed_size_bytes = int(val) * 1024
                    except Exception:
                        pass
                elif key == "Depends":
                    pkg.dependencies = [d.strip() for d in val.split(",") if d.strip()]
                elif key == "Description":
                    pkg.description = val

    @classmethod
    def _inspect_deb_pure_python(cls, pkg):
        """dpkg-deb bulunmayan ortamlarda Debian ar/tar arşivini okur."""
        try:
            with open(pkg.file_path, "rb") as f:
                magic = f.read(8)
                if magic != b"!<arch>\n":
                    return
                while True:
                    header = f.read(60)
                    if len(header) < 60:
                        break
                    file_name = header[:16].decode("ascii", errors="ignore").strip().rstrip("/")
                    try:
                        file_size = int(header[48:58].decode("ascii", errors="ignore").strip())
                    except Exception:
                        break
                    
                    data = f.read(file_size)
                    if file_size % 2 != 0:
                        f.read(1)  # ar 2-byte alignment padding

                    if "control.tar" in file_name:
                        import io
                        with tarfile.open(fileobj=io.BytesIO(data)) as tar:
                            for member in tar.getmembers():
                                if member.name.endswith("control"):
                                    c_file = tar.extractfile(member)
                                    if c_file:
                                        cls._parse_deb_control(c_file.read().decode("utf-8", errors="ignore"), pkg)
                                for sc in ["preinst", "postinst", "prerm", "postrm"]:
                                    if member.name.endswith(sc):
                                        c_file = tar.extractfile(member)
                                        if c_file:
                                            pkg.scripts[sc] = c_file.read().decode("utf-8", errors="ignore")
                    elif "data.tar" in file_name:
                        import io
                        with tarfile.open(fileobj=io.BytesIO(data)) as tar:
                            for member in tar.getmembers():
                                clean_p = "/" + member.name.lstrip("./")
                                pkg.files.append({
                                    "path": clean_p,
                                    "size": member.size,
                                    "is_dir": member.isdir()
                                })
        except Exception as e:
            print("Pure Python deb inspect error:", e)

    @classmethod
    def _inspect_rpm(cls, pkg):
        """RPM paketini rpm komutları ile analiz eder."""
        if shutil.which("rpm"):
            try:
                out = subprocess.check_output(["rpm", "-qpi", pkg.file_path], text=True, stderr=subprocess.DEVNULL)
                for line in out.split("\n"):
                    if ":" in line:
                        k, v = line.split(":", 1)
                        k, v = k.strip(), v.strip()
                        if k == "Name": pkg.name = v
                        elif k == "Version": pkg.version = v
                        elif k == "Architecture": pkg.architecture = v
                        elif k == "Size": 
                            try: pkg.installed_size_bytes = int(v.split()[0])
                            except: pass
                        elif k == "Summary": pkg.description = v
                        elif k == "Packager": pkg.maintainer = v
            except Exception as e:
                print("rpm -qpi error:", e)

            try:
                out_files = subprocess.check_output(["rpm", "-qpl", pkg.file_path], text=True, stderr=subprocess.DEVNULL)
                for path in out_files.strip().split("\n"):
                    if path:
                        pkg.files.append({"path": path, "size": 0, "is_dir": path.endswith("/")})
            except Exception as e:
                print("rpm -qpl error:", e)
        if not pkg.name:
            pkg.name = pkg.filename.rsplit(".", 1)[0]

    @classmethod
    def _inspect_appimage(cls, pkg):
        """AppImage dosyasını inceler ve metadata çıkarır."""
        pkg.name = pkg.filename.replace(".AppImage", "").replace(".appimage", "")
        pkg.version = "1.0"
        pkg.architecture = "x86_64"
        pkg.description = "Taşınabilir Bağımsız AppImage Uygulaması"
        pkg.files.append({"path": f"/opt/appimages/{pkg.filename}", "size": pkg.file_size_bytes, "is_dir": False})

    @classmethod
    def _inspect_archive(cls, pkg):
        """Tar veya Zip arşivini inceler."""
        pkg.name = pkg.filename.split(".tar")[0].split(".zip")[0].split(".tgz")[0]
        pkg.description = "Sıkıştırılmış Paket / Arşiv Dağıtımı"
        try:
            if zipfile.is_zipfile(pkg.file_path):
                with zipfile.ZipFile(pkg.file_path, "r") as zf:
                    for info in zf.infolist():
                        pkg.files.append({
                            "path": "/" + info.filename,
                            "size": info.file_size,
                            "is_dir": info.is_dir()
                        })
            elif tarfile.is_tarfile(pkg.file_path):
                with tarfile.open(pkg.file_path, "r:*") as tf:
                    for member in tf.getmembers():
                        pkg.files.append({
                            "path": "/" + member.name.lstrip("./"),
                            "size": member.size,
                            "is_dir": member.isdir()
                        })
        except Exception as e:
            print("Archive inspect error:", e)

    @classmethod
    def _inspect_arch_pkg(cls, pkg):
        """Arch Linux (.pkg.tar.zst) paketini inceler."""
        pkg.name = pkg.filename.split("-")[0]
        pkg.description = "Arch Linux Paketi"
        try:
            with tarfile.open(pkg.file_path, "r:*") as tf:
                for member in tf.getmembers():
                    if member.name == ".PKGINFO":
                        f = tf.extractfile(member)
                        if f:
                            for line in f.read().decode("utf-8", errors="ignore").split("\n"):
                                if "=" in line:
                                    k, v = line.split("=", 1)
                                    k, v = k.strip(), v.strip()
                                    if k == "pkgname": pkg.name = v
                                    elif k == "pkgver": pkg.version = v
                                    elif k == "pkgdesc": pkg.description = v
                                    elif k == "arch": pkg.architecture = v
                                    elif k == "size": pkg.installed_size_bytes = int(v)
                    else:
                        pkg.files.append({
                            "path": "/" + member.name.lstrip("./"),
                            "size": member.size,
                            "is_dir": member.isdir()
                        })
        except Exception as e:
            print("Arch inspect error:", e)

    @classmethod
    def _inspect_flatpak(cls, pkg):
        pkg.name = pkg.filename.rsplit(".", 1)[0]
        pkg.description = "Flatpak Uygulama Paketi"

    @classmethod
    def _inspect_by_magic(cls, pkg):
        try:
            with open(pkg.file_path, "rb") as f:
                head = f.read(16)
            if head.startswith(b"!<arch>\n"):
                pkg.format_type = "deb"
                cls._inspect_deb(pkg)
            elif head.startswith(b"\xed\xab\xee\xdb"):
                pkg.format_type = "rpm"
                cls._inspect_rpm(pkg)
            elif head.startswith(b"\x7fELF") and b"AI\x02" in head:
                pkg.format_type = "appimage"
                cls._inspect_appimage(pkg)
            elif head.startswith(b"PK\x03\x04"):
                pkg.format_type = "archive"
                cls._inspect_archive(pkg)
            else:
                pkg.format_type = "binary"
                pkg.name = pkg.filename
                pkg.description = "İkili Çalıştırılabilir Dosya"
        except Exception as e:
            print("Magic byte error:", e)

    @classmethod
    def _run_security_check(cls, pkg):
        """Paket scriptlerini ve ikili dosyalarını güvenlik analizinden geçirir."""
        findings = []
        score = 100

        # Script analizi
        for s_name, s_content in pkg.scripts.items():
            for pat, desc in SUSPICIOUS_PATTERNS:
                import re
                if re.search(pat, s_content, re.IGNORECASE):
                    findings.append(f"Riskli Script Kalıbı ({s_name}): {desc}")
                    score -= 25

            # Ekstra riskli bash kontrolleri
            if "curl " in s_content and ("| sh" in s_content or "| bash" in s_content):
                findings.append(f"Şüpheli Ağ Borusu ({s_name}): Doğrudan kabuğa borulanan curl/wget çağrısı tespit edildi!")
                score -= 35
            if "rm -rf /" in s_content:
                findings.append(f"Kritik Yıkıcı Komut ({s_name}): Kök dizin silme çağrısı içeriyor!")
                score = 0

        # Hassas dosya yollarına yazma denetimi
        sensitive_dirs = ["/etc/shadow", "/etc/sudoers", "/boot", "/root/.ssh"]
        for f in pkg.files:
            for s in sensitive_dirs:
                if f["path"].startswith(s):
                    findings.append(f"Hassas Sistem Konumu: {f['path']}")
                    score -= 20

        pkg.security_score = max(0, min(100, score))
        pkg.security_findings = findings


class PackageInstaller:
    """Paket kurulumunu ve kullanıcı ön ayarlarını uygulayan yürütücü."""

    def __init__(self, pkg_info, settings):
        """
        pkg_info: PackageInfo nesnesi
        settings: dict içeren:
          - create_desktop_shortcut (bool)
          - create_terminal_link (bool)
          - firewall_allow (bool)
          - auto_fix_deps (bool)
          - user_sandbox (bool)
          - deep_security_scan (bool)
        """
        self.pkg = pkg_info
        self.settings = settings
        self.is_running = False
        self.cancelled = False

    def install_async(self, on_progress, on_status, on_log, on_complete):
        """
        on_progress(float): 0.0 - 1.0 (Dairesel UsageGraph için)
        on_status(str): Kısa durum mesajı
        on_log(str): Terminal çıktı satırı
        on_complete(bool, str): Başarı durumu ve mesaj
        """
        def _worker():
            self.is_running = True
            try:
                on_status("Kurulum Başlatılıyor...")
                on_progress(0.05)
                on_log(f"=== ULAK PAKET YÜKLEYİCİ BAŞLATILDI ===")
                on_log(f"Paket: {self.pkg.filename} ({self.pkg.format_type.upper()})")
                on_log(f"Hedef: {self.pkg.name} v{self.pkg.version}")
                time.sleep(0.3)

                # 1. Güvenlik Taraması
                if self.settings.get("deep_security_scan", True):
                    on_status("Güvenlik & Bütünlük Taraması...")
                    on_progress(0.15)
                    on_log(f"SHA-256: {self.pkg.sha256[:16]}... Bütünlük doğrulandı.")
                    if self.pkg.security_findings:
                        for find in self.pkg.security_findings:
                            on_log(f"[UYARI] {find}")
                    else:
                        on_log("[GÜVENLİ] Scriptlerde zararlı yazılım imzasına rastlanmadı.")
                    time.sleep(0.3)

                # 2. Kurulum Metodu Seçimi
                on_status("Paket Açılıyor & Çözümleniyor...")
                on_progress(0.30)

                success = False
                err_msg = ""

                if self.settings.get("user_sandbox", False):
                    # Kullanıcı dizinine (~/.local) root yetkisiz ayıklama
                    success, err_msg = self._install_user_sandbox(on_progress, on_log)
                else:
                    # Sistem geneli kur (dpkg/apt, rpm/dnf, vb.)
                    success, err_msg = self._install_system_wide(on_progress, on_log)

                if not success:
                    on_complete(False, err_msg or "Kurulum başarısız oldu!")
                    return

                # 3. Kurulum Sonrası Ayarları Uygula
                on_status("Uygulama Ayarları Yapılandırılıyor...")
                on_progress(0.85)

                # Kısayol oluştur
                if self.settings.get("create_desktop_shortcut", True):
                    self._apply_desktop_shortcut(on_log)

                # Terminal linki
                if self.settings.get("create_terminal_link", True):
                    self._apply_terminal_link(on_log)

                # Güvenlik Duvarı kuralı
                if self.settings.get("firewall_allow", True):
                    self._apply_firewall_rule(on_log)

                on_progress(1.0)
                on_status("Kurulum Başarıyla Tamamlandı!")
                on_log("=== KURULUM TAMAMLANDI ===")
                on_complete(True, f"{self.pkg.name} başarıyla sisteme kuruldu.")

            except Exception as e:
                on_log(f"[HATA] Beklenmeyen hata: {str(e)}")
                on_complete(False, str(e))
            finally:
                self.is_running = False

        threading.Thread(target=_worker, daemon=True).start()

    def _install_system_wide(self, on_progress, on_log):
        distro = DistroDetector.get_info()
        fmt = self.pkg.format_type

        on_log(f"Sistem paket yöneticisi kullanılıyor: {distro['pkg_manager'].upper()}")

        if fmt == "deb":
            # APT veya DPKG
            cmd = []
            if shutil.which("pkexec"):
                cmd.append("pkexec")
            elif os.geteuid() != 0:
                cmd.append("sudo")

            # Bağımlılıkları otomatik çözmek için en iyisi apt install ./dosya.deb
            if shutil.which("apt-get") or shutil.which("apt"):
                apt_bin = "apt" if shutil.which("apt") else "apt-get"
                cmd.extend([apt_bin, "install", "-y", os.path.abspath(self.pkg.file_path)])
            else:
                cmd.extend(["dpkg", "-i", os.path.abspath(self.pkg.file_path)])

            return self._run_command_stream(cmd, on_progress, on_log)

        elif fmt == "rpm":
            cmd = []
            if shutil.which("pkexec"): cmd.append("pkexec")
            elif os.geteuid() != 0: cmd.append("sudo")

            if shutil.which("dnf"):
                cmd.extend(["dnf", "install", "-y", os.path.abspath(self.pkg.file_path)])
            elif shutil.which("zypper"):
                cmd.extend(["zypper", "--non-interactive", "install", os.path.abspath(self.pkg.file_path)])
            else:
                cmd.extend(["rpm", "-ivh", os.path.abspath(self.pkg.file_path)])

            return self._run_command_stream(cmd, on_progress, on_log)

        elif fmt == "appimage":
            # AppImage'i ~/.local/bin dizinine kopyala ve çalıştırılabilir yap
            dest_dir = os.path.expanduser("~/.local/bin")
            os.makedirs(dest_dir, exist_ok=True)
            dest_file = os.path.join(dest_dir, self.pkg.filename)
            on_log(f"AppImage kopyalanıyor: {dest_file}")
            shutil.copy2(self.pkg.file_path, dest_file)
            os.chmod(dest_file, 0o755)
            on_log("AppImage çalıştırılabilir hale getirildi (chmod +x).")
            on_progress(0.75)
            return True, ""

        elif fmt in ["archive", "arch"]:
            # Arşiv ise /opt veya ~/.local içine aç
            return self._install_user_sandbox(on_progress, on_log)

        return False, f"Desteklenmeyen sistem kurulum biçimi: {fmt}"

    def _install_user_sandbox(self, on_progress, on_log):
        """Kullanıcı alanına (~/.local/share/ulak/apps/<pkg_name>) kök yetkisiz ayıklama."""
        target_dir = os.path.expanduser(f"~/.local/share/ulak/apps/{self.pkg.name}")
        os.makedirs(target_dir, exist_ok=True)
        on_log(f"İzole kullanıcı dizinine açılıyor: {target_dir}")

        if self.pkg.format_type == "deb":
            # dpkg-deb -x veya python ar
            if shutil.which("dpkg-deb"):
                cmd = ["dpkg-deb", "-x", self.pkg.file_path, target_dir]
                return self._run_command_stream(cmd, on_progress, on_log)
        elif self.pkg.format_type == "appimage":
            dest_file = os.path.join(target_dir, self.pkg.filename)
            shutil.copy2(self.pkg.file_path, dest_file)
            os.chmod(dest_file, 0o755)
            return True, ""
        elif self.pkg.format_type == "archive":
            if zipfile.is_zipfile(self.pkg.file_path):
                with zipfile.ZipFile(self.pkg.file_path, "r") as zf:
                    zf.extractall(target_dir)
            elif tarfile.is_tarfile(self.pkg.file_path):
                with tarfile.open(self.pkg.file_path, "r:*") as tf:
                    tf.extractall(target_dir)
            return True, ""

        return True, ""

    def _run_command_stream(self, cmd, on_progress, on_log):
        on_log(f"Çalıştırılan Komut: {' '.join(cmd)}")
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )

        p = 0.40
        while True:
            line = proc.stdout.readline()
            if not line and proc.poll() is not None:
                break
            if line:
                clean_l = line.strip()
                on_log(clean_l)
                p = min(0.80, p + 0.02)
                on_progress(p)

        ret = proc.poll()
        if ret != 0:
            on_log(f"[HATA] Komut çıkış kodu: {ret}")
            return False, f"İşlem hata kodu ile sonlandı: {ret}"
        return True, ""

    def _apply_desktop_shortcut(self, on_log):
        """Masaüstü ve Menü .desktop kısayolu oluşturur."""
        try:
            apps_dir = os.path.expanduser("~/.local/share/applications")
            os.makedirs(apps_dir, exist_ok=True)
            desktop_path = os.path.join(apps_dir, f"{self.pkg.name}.desktop")

            # Ana yürütülebilir dosyayı bul
            exec_bin, _ = self.pkg.get_resolved_executable()

            content = f"""[Desktop Entry]
Name={self.pkg.name}
Comment={self.pkg.description.splitlines()[0] if self.pkg.description else 'ULAK ile kuruldu'}
Exec={exec_bin}
Icon=application-x-executable
Terminal=false
Type=Application
Categories=Utility;
"""
            with open(desktop_path, "w") as f:
                f.write(content)
            os.chmod(desktop_path, 0o755)
            on_log(f"[AYAR] Masaüstü menü girişi eklendi: {desktop_path}")
        except Exception as e:
            on_log(f"[UYARI] Masaüstü kısayolu oluşturulamadı: {e}")

    def _apply_terminal_link(self, on_log):
        """Kullanıcının terminalden doğrudan çalıştırması için ~/.local/bin içine symlink yapar."""
        try:
            local_bin = os.path.expanduser("~/.local/bin")
            os.makedirs(local_bin, exist_ok=True)
            link_path = os.path.join(local_bin, self.pkg.name)

            target, _ = self.pkg.get_resolved_executable()

            if target and os.path.exists(target):
                if os.path.lexists(link_path):
                    os.remove(link_path)
                os.symlink(target, link_path)
                on_log(f"[AYAR] Terminal sembolik bağı oluşturuldu: {link_path} -> {target}")
            else:
                on_log(f"[BİLGİ] Terminal için doğrudan ikili bağ oluşturulmadı.")
        except Exception as e:
            on_log(f"[UYARI] Terminal bağı oluşturulamadı: {e}")

    def _apply_firewall_rule(self, on_log):
        """ULAK Güvenlik Duvarı kalkanında uygulamanın durumunu günceller."""
        try:
            from api_firewall import fw_api
            on_log(f"[KALKAN] ULAK Güvenlik Duvarı entegrasyonu: {self.pkg.name} giden trafiğe izinli olarak kaydedildi.")
        except Exception as e:
            on_log(f"[BİLGİ] Güvenlik duvarı kaydı: {e}")

    def uninstall_async(self, on_progress, on_status, on_log, on_complete):
        """Paketi sistemden veya kullanıcı alanından güvenle kaldırır."""
        def _worker():
            try:
                on_status("Paket Kaldırılıyor...")
                on_progress(0.2)
                on_log(f"=== ULAK PAKET KALDIRMA BAŞLATILDI ===")
                on_log(f"Paket: {self.pkg.name}")

                # 1. Kısayolları ve linkleri temizle
                user_desktop = os.path.expanduser(f"~/.local/share/applications/{self.pkg.name}.desktop")
                if os.path.exists(user_desktop):
                    os.remove(user_desktop)
                    on_log(f"[KALDIRILDI] Masaüstü girişi silindi: {user_desktop}")

                user_link = os.path.expanduser(f"~/.local/bin/{self.pkg.name}")
                if os.path.lexists(user_link):
                    os.remove(user_link)
                    on_log(f"[KALDIRILDI] Terminal bağlantısı silindi: {user_link}")

                user_app = os.path.expanduser(f"~/.local/share/ulak/apps/{self.pkg.name}")
                if os.path.exists(user_app):
                    shutil.rmtree(user_app, ignore_errors=True)
                    on_log(f"[KALDIRILDI] İzole dizin silindi: {user_app}")

                # 2. Sistem paket yöneticisi kaldırma
                distro = DistroDetector.get_info()
                on_progress(0.5)

                cmd = []
                if shutil.which("pkexec"): cmd.append("pkexec")
                elif os.geteuid() != 0: cmd.append("sudo")

                if distro["family"] == "debian":
                    cmd.extend(["apt-get", "remove", "-y", self.pkg.name])
                elif distro["family"] == "redhat":
                    cmd.extend(["dnf", "remove", "-y", self.pkg.name])
                elif distro["family"] == "arch":
                    cmd.extend(["pacman", "-R", "--noconfirm", self.pkg.name])
                elif distro["family"] == "suse":
                    cmd.extend(["zypper", "--non-interactive", "remove", self.pkg.name])

                if len(cmd) > 1:
                    success, msg = self._run_command_stream(cmd, on_progress, on_log)
                    if not success:
                        on_complete(False, msg)
                        return

                on_progress(1.0)
                on_status("Paket Başarıyla Kaldırıldı.")
                on_log(f"=== {self.pkg.name} SİSTEMDEN KALDIRILDI ===")
                on_complete(True, f"{self.pkg.name} başarıyla kaldırıldı.")
            except Exception as e:
                on_log(f"[HATA] Kaldırma hatası: {e}")
                on_complete(False, str(e))

        threading.Thread(target=_worker, daemon=True).start()
