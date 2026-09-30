import urllib.request
import json
import os
import subprocess
from gi.repository import GLib

GITHUB_API_URL = "https://api.github.com/repos/Veysitasci/ulak/releases/latest"
CURRENT_VERSION = "2.0.0"  # This should match build_deb.sh / system info

class Updater:
    @staticmethod
    def check_for_updates(callback):
        """Asynchronously checks for updates and calls callback(has_update, latest_version, download_url)"""
        def _check():
            try:
                req = urllib.request.Request(GITHUB_API_URL, headers={"User-Agent": "ULAK-Updater"})
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = json.loads(response.read().decode())
                    latest_version = data.get("tag_name", "").lstrip("v")
                    
                    if not latest_version:
                        GLib.idle_add(callback, False, CURRENT_VERSION, None)
                        return
                    
                    # Very simple string comparison for version, can be improved.
                    if latest_version != CURRENT_VERSION and latest_version > CURRENT_VERSION:
                        # Find deb package asset
                        deb_url = None
                        for asset in data.get("assets", []):
                            if asset.get("name", "").endswith(".deb"):
                                deb_url = asset.get("browser_download_url")
                                break
                        
                        GLib.idle_add(callback, True, latest_version, deb_url)
                    else:
                        GLib.idle_add(callback, False, latest_version, None)
            except Exception as e:
                print(f"Update check failed: {e}")
                GLib.idle_add(callback, False, CURRENT_VERSION, None)
                
        import threading
        threading.Thread(target=_check, daemon=True).start()

    @staticmethod
    def apply_update(deb_url, callback_progress=None):
        """Downloads and installs the deb update using pkexec, then restarts"""
        def _update():
            import tempfile
            import time
            try:
                if callback_progress: GLib.idle_add(callback_progress, "Güncelleme indiriliyor...")
                temp_deb = os.path.join(tempfile.gettempdir(), "ulak_update.deb")
                urllib.request.urlretrieve(deb_url, temp_deb)
                
                if callback_progress: GLib.idle_add(callback_progress, "Sistem güncelleniyor (Parola gerekebilir)...")
                
                # Install package via pkexec
                cmd = ["pkexec", "sh", "-c", f"dpkg -i {temp_deb} && apt-get install -f -y"]
                res = subprocess.run(cmd, capture_output=True, text=True)
                
                if res.returncode == 0:
                    if callback_progress: GLib.idle_add(callback_progress, "Güncelleme başarılı. Yeniden başlatılıyor...")
                    time.sleep(1)
                    # Restart the app
                    subprocess.Popen(["ulak"]) # or the path to start script
                    import sys
                    sys.exit(0)
                else:
                    if callback_progress: GLib.idle_add(callback_progress, f"Kurulum hatası: {res.stderr}")
            except Exception as e:
                if callback_progress: GLib.idle_add(callback_progress, f"Hata: {e}")
                
        import threading
        threading.Thread(target=_update, daemon=True).start()
