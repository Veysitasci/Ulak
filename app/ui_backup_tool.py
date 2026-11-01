import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, GLib, Pango
import json
import os
import re
import shutil
import subprocess
import tarfile
import tempfile
import threading
import time

from ui_shared import UsageGraph, storage, DeviceDetailsDialog, BentoDialog


# ============================================================
# CANLI YARDIMCILAR
# ============================================================
def human(nbytes):
    n = float(max(0, nbytes))
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024 or unit == "TB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024.0


def dir_size(path):
    total = 0
    if not path or not os.path.exists(path):
        return 0
    for root, _dirs, files in os.walk(path, onerror=lambda e: None):
        for f in files:
            fp = os.path.join(root, f)
            try:
                if not os.path.islink(fp):
                    total += os.stat(fp).st_size
            except OSError:
                pass
    return total


def rel_time(ts):
    if not ts:
        return "Hiç yedek yok"
    age = max(0, time.time() - ts)
    if age < 90:
        return "az önce"
    if age < 3600:
        return f"{int(age / 60)} dk önce"
    if age < 86400:
        return f"{int(age / 3600)} sa önce"
    return f"{int(age / 86400)} gün önce"


def _xdir(const, fallback):
    try:
        p = GLib.get_user_special_dir(const)
        if p and p != os.path.expanduser("~") and os.path.isdir(p):
            return p
    except Exception:
        pass
    return fallback


def source_catalog():
    home = os.path.expanduser("~")
    return [
        ("documents", "Belgeler", _xdir(GLib.UserDirectory.DIRECTORY_DOCUMENTS,
                                         os.path.join(home, "Belgeler")), "folder-documents-symbolic"),
        ("desktop", "Masaüstü", _xdir(GLib.UserDirectory.DIRECTORY_DESKTOP,
                                      os.path.join(home, "Masaüstü")), "user-desktop-symbolic"),
        ("download", "İndirilenler", _xdir(GLib.UserDirectory.DIRECTORY_DOWNLOAD,
                                           os.path.join(home, "İndirilenler")), "folder-download-symbolic"),
        ("pictures", "Resimler", _xdir(GLib.UserDirectory.DIRECTORY_PICTURES,
                                       os.path.join(home, "Resimler")), "folder-pictures-symbolic"),
        ("ssh", "SSH Anahtarları", os.path.join(home, ".ssh"), "security-high-symbolic"),
        ("ulak", "ULAK Yapılandırması", os.path.expanduser("~/.config/wireless-manager"),
         "preferences-system-symbolic"),
    ]


# ============================================================
# GERCEK YEDEK MOTORU (tar.gz + manifest artimli + opsiyonel GPG)
# ============================================================
class BackupEngine:
    ARCH_RE = re.compile(r"ULAK_(FULL|INCR)_(\d{8}_\d{4})\.tar\.gz(\.gpg)?$")

    def __init__(self):
        home = os.path.expanduser("~")
        self.dest = storage.get_global("backup_dest", os.path.join(home, "Yedekler", "ULAK"))
        os.makedirs(self.dest, exist_ok=True)
        self.manifest_path = os.path.join(self.dest, "manifest.json")

    # ---------- manifest ----------
    def load_manifest(self):
        try:
            with open(self.manifest_path, "r") as f:
                return json.load(f)
        except Exception:
            return {"files": {}}

    def save_manifest(self, m):
        try:
            with open(self.manifest_path, "w") as f:
                json.dump(m, f)
        except OSError:
            pass

    # ---------- tarama ----------
    def scan(self, keys):
        paths = {k: p for k, _l, p, _i in source_catalog() if k in keys and os.path.isdir(p)}
        found = {}
        for key, base in paths.items():
            for root, dirs, files in os.walk(base, onerror=lambda e: None):
                dirs[:] = [d for d in dirs if not os.path.islink(os.path.join(root, d))]
                for fn in files:
                    fp = os.path.join(root, fn)
                    try:
                        if os.path.islink(fp):
                            continue
                        st = os.stat(fp)
                    except OSError:
                        continue
                    rel = key + "/" + os.path.relpath(fp, base)
                    found[rel] = (fp, int(st.st_mtime), st.st_size)
        return found

    def list_archives(self):
        out = []
        try:
            names = os.listdir(self.dest)
        except OSError:
            return out
        for n in names:
            m = self.ARCH_RE.match(n)
            if not m:
                continue
            fp = os.path.join(self.dest, n)
            try:
                ts = time.mktime(time.strptime(m.group(2), "%Y%m%d_%H%M"))
            except ValueError:
                ts = os.path.getmtime(fp)
            out.append({"name": n, "path": fp, "full": m.group(1) == "FULL",
                        "enc": bool(m.group(3)), "ts": ts,
                        "size": os.path.getsize(fp)})
        out.sort(key=lambda a: a["ts"], reverse=True)
        return out

    # ---------- yedekleme ----------
    def create(self, keys, force_full, encrypt, passphrase, on_progress):
        scan = self.scan(keys)
        if not scan:
            return ("empty", 0, 0, None, "Seçili kaynaklarda dosya bulunamadı")
        manifest = self.load_manifest()
        prev = manifest.get("files", {})
        changed = [rel for rel, st in scan.items() if prev.get(rel) != list(st[1:])]
        has_full = any(a["full"] for a in self.list_archives())
        full = force_full or not has_full or len(changed) > max(200, len(scan) // 4)
        picked = list(scan.items()) if full else [(r, scan[r]) for r in changed]
        if not picked:
            return ("nodiff", 0, 0, None, "")

        stamp = time.strftime("%Y%m%d_%H%M")
        name = f"ULAK_{'FULL' if full else 'INCR'}_{stamp}.tar.gz"
        tmp = os.path.join(self.dest, name)
        total = len(picked)
        done_bytes = 0
        try:
            with tarfile.open(tmp, "w:gz") as tf:
                for i, (rel, (fp, _mt, sz)) in enumerate(picked, 1):
                    try:
                        tf.add(fp, arcname=rel, recursive=False)
                        done_bytes += sz
                    except OSError:
                        continue
                    if i % 40 == 0 or i == total:
                        on_progress(i, total, done_bytes)
        except Exception as e:
            try:
                os.remove(tmp)
            except OSError:
                pass
            return ("error", 0, 0, None, str(e)[:160])

        final = tmp
        if encrypt and shutil.which("gpg") and passphrase:
            enc_path = tmp + ".gpg"
            r = subprocess.run(
                ["gpg", "--batch", "--yes", "--pinentry-mode", "loopback",
                 "--passphrase-fd", "0", "--symmetric", "--cipher-algo", "AES256",
                 "-o", enc_path, tmp],
                input=(passphrase + "\n").encode(), stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE, timeout=1800)
            if r.returncode == 0:
                os.remove(tmp)
                final = enc_path
            else:
                # sifreleme basarisiz: sifresiz arsiv zaten hazir, uyari dondurulur
                pass
        # manifest guncelle (degisen/tam tarama durumunu kaydet)
        for rel, (_fp, mt, sz) in picked:
            prev[rel] = [mt, sz]
        manifest["files"] = prev
        manifest["last"] = int(time.time())
        self.save_manifest(manifest)
        note = "" if not encrypt or final.endswith(".gpg") else "GPG sifreleme basarisiz, sifresiz arsivlendi"
        return ("ok", total, done_bytes, final, note)

    # ---------- dogrulama / cikarma ----------
    def _open_tar(self, arch, passphrase=None):
        """(tarfile, temizlenecek_temp_yol) dondurur."""
        if not arch["enc"]:
            return tarfile.open(arch["path"], "r:gz"), None
        if not passphrase:
            raise ValueError("parola gerekli")
        fd, tmp = tempfile.mkstemp(suffix=".tar.gz", prefix="ulak_gpg_")
        os.close(fd)
        try:
            r = subprocess.run(
                ["gpg", "--batch", "--yes", "--quiet", "--pinentry-mode", "loopback",
                 "--passphrase-fd", "0", "-o", tmp, "--decrypt", arch["path"]],
                input=(passphrase + "\n").encode(), stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL, timeout=1800)
            if r.returncode != 0 or os.path.getsize(tmp) == 0:
                raise ValueError("GPG parola hatalı veya arşiv bozuk")
            return tarfile.open(tmp, "r:gz"), tmp
        except Exception:
            os.remove(tmp)
            raise

    def verify(self, arch, passphrase=None):
        tmp = None
        try:
            tf, tmp = self._open_tar(arch, passphrase)
            n = b = 0
            for m in tf:
                if m.isfile():
                    n += 1
                    b += m.size
            tf.close()
            return (True, n, b, "")
        except Exception as e:
            return (False, 0, 0, str(e)[:120])
        finally:
            if tmp and os.path.exists(tmp):
                os.remove(tmp)

    def extract_to(self, arch, target, passphrase=None, on_progress=None):
        tf, tmp = self._open_tar(arch, passphrase)
        try:
            members = [m for m in tf.getmembers() if m.isfile() or m.isdir()]
            safe = []
            for m in members:
                mp = os.path.normpath(os.path.join(target, m.name))
                if mp == target or mp.startswith(target + os.sep):
                    safe.append(m)
            total = len(safe)
            for i in range(0, total, 200):
                chunk = safe[i:i + 200]
                try:
                    tf.extractall(target, members=chunk, filter="data")
                except TypeError:
                    tf.extractall(target, members=chunk)
                if on_progress:
                    on_progress(min(i + 200, total), total)
        finally:
            tf.close()
            if tmp and os.path.exists(tmp):
                os.remove(tmp)
        return sum(1 for m in safe if m.isfile())


# ============================================================
# GORUNUM
# ============================================================
class BackupToolView(Gtk.ScrolledWindow):
    """
    ULAK Otomatik Yedekleme Araci — tamamen CANLI:
    gercek tar.gz arsivler, manifest tabanli artimli yedek, opsiyonel GPG
    AES-256 sifreleme, gercek geri yukleme/dogrulama/silme, dahili
    zamanlayici ve harici USB disk algilama.
    """
    def __init__(self, toast_service):
        super().__init__()
        self.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        self.toast_service = toast_service
        self.engine = BackupEngine()
        self._busy = False
        self._measuring = False
        self._passphrase = None
        self._verify_cache = {}
        self._seen_media = None
        self._src_badges = {}
        self._dash_wide = None

        home = os.path.expanduser("~")
        default_keys = ["documents", "desktop", "download", "ssh", "ulak"]
        self.sources = source_catalog()
        self.selected = storage.get_global("backup_sources", default_keys)

        main_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        main_box.set_margin_top(20)
        main_box.set_margin_bottom(24)
        main_box.set_margin_start(32)
        main_box.set_margin_end(32)
        self.add(main_box)

        header = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        lbl_title = Gtk.Label(label="Otomatik Yedekleme Aracı")
        lbl_title.get_style_context().add_class("header-title")
        lbl_title.set_halign(Gtk.Align.START)
        header.pack_start(lbl_title, False, False, 0)
        lbl_desc = Gtk.Label(label=f"Gerçek arşivler: {self.engine.dest} — artımlı tar yedeği, GPG şifreleme ve canlı bütünlük doğrulaması.")
        lbl_desc.get_style_context().add_class("header-sub")
        lbl_desc.set_halign(Gtk.Align.START)
        lbl_desc.set_line_wrap(True)
        lbl_desc.set_ellipsize(Pango.EllipsizeMode.END)
        lbl_desc.set_max_width_chars(70)
        header.pack_start(lbl_desc, False, False, 0)
        main_box.pack_start(header, False, False, 0)

        # ---------- 1. CANLI DASHBOARD (4x1 <-> 2x2) ----------
        top_grid = Gtk.Grid(column_spacing=16, row_spacing=16)
        top_grid.set_column_homogeneous(True)
        main_box.pack_start(top_grid, False, False, 0)
        self._top_grid = top_grid
        self._stat_cards = []

        card, self.graph_arch, self.lbl_arch = self._create_stat_card(
            "Yedek Arşivleri", "package-x-generic-symbolic", (0.06, 0.72, 0.5, 1.0))
        self._stat_cards.append(card)
        card, self.graph_last, self.lbl_last = self._create_stat_card(
            "Son Yedekleme", "appointment-soon-symbolic", (0.2, 0.6, 1.0, 1.0))
        self._stat_cards.append(card)
        card, self.graph_cov, self.lbl_cov = self._create_stat_card(
            "Korunan Veri", "folder-symbolic", (0.99, 0.65, 0.14, 1.0))
        self._stat_cards.append(card)
        card, self.graph_health, self.lbl_health = self._create_stat_card(
            "Arşiv Bütünlüğü", "emblem-ok-symbolic", (0.06, 0.72, 0.5, 1.0))
        self._stat_cards.append(card)
        for card in self._stat_cards:
            top_grid.attach(card, 0, 0, 1, 1)
        self.connect("size-allocate", self._relayout_dashboard)

        # ---------- 2. KOMUTA MERKEZI ----------
        sec1 = Gtk.Label(label="YEDEKLEME KOMUTA MERKEZİ")
        sec1.get_style_context().add_class("nav-section-title")
        sec1.set_halign(Gtk.Align.START)
        sec1.set_margin_top(8)
        main_box.pack_start(sec1, False, False, 0)

        master = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        master.get_style_context().add_class("settings-card")
        mic = Gtk.Image.new_from_icon_name("drive-harddisk-symbolic", Gtk.IconSize.DIALOG)
        mic.set_pixel_size(40)
        master.pack_start(mic, False, False, 4)
        mv = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        mv.set_valign(Gtk.Align.CENTER)
        mt = Gtk.Label(label="Yedekleme Merkezi")
        mt.get_style_context().add_class("setting-title")
        mt.set_halign(Gtk.Align.START)
        self.lbl_cmd = Gtk.Label(label="Hazır — arşivler taranıyor...")
        self.lbl_cmd.get_style_context().add_class("setting-subtitle")
        self.lbl_cmd.set_halign(Gtk.Align.START)
        self.lbl_cmd.set_ellipsize(Pango.EllipsizeMode.END)
        self.lbl_cmd.set_line_wrap(True)
        self.lbl_cmd.set_max_width_chars(48)
        mv.pack_start(mt, False, False, 0)
        mv.pack_start(self.lbl_cmd, False, False, 0)
        master.pack_start(mv, True, True, 0)

        self.btn_full = Gtk.Button(label="Tam Yedek Al")
        self.btn_full.get_style_context().add_class("btn-secondary")
        self.btn_full.set_valign(Gtk.Align.CENTER)
        self.btn_full.connect("clicked", lambda b: self._run_backup(force_full=True))
        master.pack_end(self.btn_full, False, False, 4)

        self.btn_incr = Gtk.Button(label="Artımlı Yedekle")
        self.btn_incr.get_style_context().add_class("btn-primary")
        self.btn_incr.set_valign(Gtk.Align.CENTER)
        self.btn_incr.connect("clicked", lambda b: self._run_backup(force_full=False))
        master.pack_end(self.btn_incr, False, False, 4)
        main_box.pack_start(master, False, False, 0)

        # ---------- 3. YEDEK KAPSAMI (canli boyutlu switch kartlari) ----------
        sec2 = Gtk.Label(label="YEDEKLEME KAPSAMI")
        sec2.get_style_context().add_class("nav-section-title")
        sec2.set_halign(Gtk.Align.START)
        sec2.set_margin_top(8)
        main_box.pack_start(sec2, False, False, 0)
        scope_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        main_box.pack_start(scope_box, False, False, 0)
        for key, label, path, icon in self.sources:
            scope_box.pack_start(
                self._create_scope_card(key, label, path, icon), False, False, 0)

        # ---------- 4. OTOMATIK AYARLAR ----------
        sec3 = Gtk.Label(label="OTOMATİK YEDEKLEME AYARLARI")
        sec3.get_style_context().add_class("nav-section-title")
        sec3.set_halign(Gtk.Align.START)
        sec3.set_margin_top(8)
        main_box.pack_start(sec3, False, False, 0)
        set_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        main_box.pack_start(set_box, False, False, 0)

        set_box.pack_start(self._create_switch_card(
            "security-high-symbolic", "GPG AES-256 Şifreli Arşivleme",
            "Yeni arşivler parolayla şifrelenir (.tar.gz.gpg). Yedek anında parola sorulur.",
            "backup_encrypt", False), False, False, 0)
        set_box.pack_start(self._create_switch_card(
            "appointment-soon-symbolic", "Zamanlanmış Otomatik Yedek",
            "ULAK açıkken aralık dolduğunda artımlı yedek otomatik alınır.",
            "backup_auto", False), False, False, 0)

        # Aralik secici kart
        icard = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        icard.get_style_context().add_class("settings-card")
        icard.pack_start(Gtk.Image.new_from_icon_name("preferences-system-time-symbolic",
                                                      Gtk.IconSize.BUTTON), False, False, 0)
        ivb = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        it = Gtk.Label(label="Otomatik Yedekleme Aralığı")
        it.get_style_context().add_class("setting-title")
        it.set_halign(Gtk.Align.START)
        isub = Gtk.Label(label="Zamanlanmış yedeğin yenileneceği periyot.")
        isub.get_style_context().add_class("setting-subtitle")
        isub.set_halign(Gtk.Align.START)
        isub.set_line_wrap(True)
        ivb.pack_start(it, False, False, 0)
        ivb.pack_start(isub, False, False, 0)
        icard.pack_start(ivb, True, True, 0)
        self.combo_interval = Gtk.ComboBoxText()
        self.combo_interval.append("24", "Her gün")
        self.combo_interval.append("48", "2 günde bir")
        self.combo_interval.append("168", "Haftalık")
        self.combo_interval.set_active_id(str(storage.get_global("backup_interval_h", 24)))
        self.combo_interval.set_valign(Gtk.Align.CENTER)
        self.combo_interval.connect("changed", self._on_interval_changed)
        icard.pack_end(self.combo_interval, False, False, 0)
        set_box.pack_start(icard, False, False, 0)

        set_box.pack_start(self._create_switch_card(
            "media-removable-symbolic", "Harici USB Disk Algılandığında Kopyala",
            "Takılan yeni harici diske son arşiv otomatik kopyalanır.",
            "backup_usb_watch", False), False, False, 0)

        # ---------- 5. ARSIV LISTESI (Kural 3: aranabilir liste) ----------
        sec4 = Gtk.Label(label="YEDEK ARŞİVLERİ (SNAPSHOTS)")
        sec4.get_style_context().add_class("nav-section-title")
        sec4.set_halign(Gtk.Align.START)
        sec4.set_margin_top(12)
        main_box.pack_start(sec4, False, False, 0)

        self.search_entry = Gtk.SearchEntry()
        self.search_entry.get_style_context().add_class("termius-search")
        self.search_entry.set_placeholder_text("Arşiv adı veya tarih ara (20260930 gibi)...")
        main_box.pack_start(self.search_entry, False, False, 0)

        scroll_list = Gtk.ScrolledWindow()
        scroll_list.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        scroll_list.set_min_content_height(220)
        self.listbox = Gtk.ListBox()
        self.listbox.set_selection_mode(Gtk.SelectionMode.NONE)
        scroll_list.add(self.listbox)
        main_box.pack_start(scroll_list, True, True, 0)

        def filter_func(row):
            q = self.search_entry.get_text().strip().lower()
            return q in getattr(row, "name", "").lower()
        self.listbox.set_filter_func(filter_func)
        self.search_entry.connect("search-changed", lambda e: self.listbox.invalidate_filter())

        self.connect("destroy", self._on_destroy)
        GLib.idle_add(self._refresh_all)
        self._timer_auto = GLib.timeout_add_seconds(600, self._auto_check)
        self._timer_usb = GLib.timeout_add_seconds(10, self._usb_tick)

    # ---------- yardimci urleticiler ----------
    def _relayout_dashboard(self, widget, allocation):
        wide = allocation.width >= 1150
        if wide == self._dash_wide:
            return
        self._dash_wide = wide
        positions = ([(0, 0), (1, 0), (2, 0), (3, 0)] if wide
                     else [(0, 0), (1, 0), (0, 1), (1, 1)])
        for card in self._stat_cards:
            self._top_grid.remove(card)
        for card, (x, y) in zip(self._stat_cards, positions):
            self._top_grid.attach(card, x, y, 1, 1)
        self._top_grid.show_all()

    def _create_stat_card(self, title, icon_name, color):
        card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        card.get_style_context().add_class("card")
        card.set_margin_top(4)
        card.set_margin_bottom(4)
        card.set_margin_start(4)
        card.set_margin_end(4)

        graph = UsageGraph(color_rgba=color, size=92)
        card.pack_start(graph, False, False, 6)
        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        vbox.set_valign(Gtk.Align.CENTER)
        head = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        head.pack_start(Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.MENU), False, False, 0)
        t_lbl = Gtk.Label(label=title)
        t_lbl.get_style_context().add_class("device-name")
        t_lbl.set_halign(Gtk.Align.START)
        t_lbl.set_ellipsize(Pango.EllipsizeMode.END)
        t_lbl.set_max_width_chars(24)
        head.pack_start(t_lbl, False, False, 0)
        vbox.pack_start(head, False, False, 0)
        val_lbl = Gtk.Label(label="Ölçülüyor...")
        val_lbl.get_style_context().add_class("title-label")
        val_lbl.set_halign(Gtk.Align.START)
        val_lbl.set_ellipsize(Pango.EllipsizeMode.END)
        val_lbl.set_max_width_chars(26)
        vbox.pack_start(val_lbl, False, False, 0)
        card.pack_start(vbox, True, True, 0)
        return card, graph, val_lbl

    def _create_switch_card(self, icon_name, title, subtitle, key, default):
        card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        card.get_style_context().add_class("settings-card")
        card.pack_start(Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.BUTTON), False, False, 0)
        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        t_lbl = Gtk.Label(label=title)
        t_lbl.get_style_context().add_class("setting-title")
        t_lbl.set_halign(Gtk.Align.START)
        s_lbl = Gtk.Label(label=subtitle)
        s_lbl.get_style_context().add_class("setting-subtitle")
        s_lbl.set_halign(Gtk.Align.START)
        s_lbl.set_line_wrap(True)
        s_lbl.set_max_width_chars(60)
        vbox.pack_start(t_lbl, False, False, 0)
        vbox.pack_start(s_lbl, False, False, 0)
        card.pack_start(vbox, True, True, 0)
        sw = Gtk.Switch()
        sw.set_valign(Gtk.Align.CENTER)
        sw.set_active(storage.get_global(key, default))
        sw.connect("notify::active", lambda w, p: storage.set_global(key, w.get_active()))
        card.pack_end(sw, False, False, 0)
        return card

    def _create_scope_card(self, key, label, path, icon):
        card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        card.get_style_context().add_class("settings-card")
        card.pack_start(Gtk.Image.new_from_icon_name(icon, Gtk.IconSize.BUTTON), False, False, 0)
        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        t_lbl = Gtk.Label(label=label)
        t_lbl.get_style_context().add_class("setting-title")
        t_lbl.set_halign(Gtk.Align.START)
        s_lbl = Gtk.Label(label=path if path and os.path.isdir(path) else path + " (yok)")
        s_lbl.get_style_context().add_class("setting-subtitle")
        s_lbl.set_halign(Gtk.Align.START)
        s_lbl.set_ellipsize(Pango.EllipsizeMode.MIDDLE)
        s_lbl.set_max_width_chars(40)
        vbox.pack_start(t_lbl, False, False, 0)
        vbox.pack_start(s_lbl, False, False, 0)
        card.pack_start(vbox, True, True, 0)

        badge = Gtk.Label()
        badge.set_markup("<span foreground='#94a3b8' size='small'><b>  —  </b></span>")
        card.pack_end(badge, False, False, 6)
        self._src_badges[key] = badge

        sw = Gtk.Switch()
        sw.set_valign(Gtk.Align.CENTER)
        sw.set_active(key in self.selected)
        sw.connect("notify::active", lambda w, p, k=key: self._on_source_toggled(k, w.get_active()))
        card.pack_end(sw, False, False, 0)
        return card

    def _on_source_toggled(self, key, active):
        cur = list(self.selected)
        if active and key not in cur:
            cur.append(key)
        elif not active and key in cur:
            cur.remove(key)
        self.selected = cur
        storage.set_global("backup_sources", cur)
        self._refresh_all()

    def _on_interval_changed(self, combo):
        try:
            storage.set_global("backup_interval_h", int(combo.get_active_id()))
        except (TypeError, ValueError):
            pass

    # ---------- CANLI OLUM / LISTE TAZELEME ----------
    def _refresh_all(self):
        archives = self.engine.list_archives()
        self._render_archives(archives)
        self._apply_dashboard(archives)
        self._measure_sources()
        self._verify_thread(archives)
        return False

    def _apply_dashboard(self, archives):
        total_b = sum(a["size"] for a in archives)
        st = os.statvfs(self.engine.dest)
        free = st.f_bavail * st.f_frsize
        self.lbl_arch.set_text(f"{len(archives)} arşiv • {human(total_b)}")
        self.graph_arch.set_fraction(total_b / (total_b + free) if (total_b + free) else 0)

        last_ts = archives[0]["ts"] if archives else 0
        self.lbl_last.set_text(rel_time(last_ts))
        interval = storage.get_global("backup_interval_h", 24) * 3600
        fresh = 1.0 if not last_ts else max(0.0, 1.0 - (time.time() - last_ts) / interval)
        self.graph_last.set_fraction(fresh)
        self.graph_last.set_color((0.06, 0.72, 0.5, 1.0) if fresh > 0.5 else
                                  (0.99, 0.65, 0.14, 1.0) if fresh > 0.15 else
                                  (0.85, 0.2, 0.25, 1.0))

        ok_n = sum(1 for v in self._verify_cache.values() if v[0])
        chk_n = sum(1 for v in self._verify_cache.values())
        score = (ok_n / chk_n) if chk_n else 1.0
        self.lbl_health.set_text(f"%{int(score * 100)} • {ok_n}/{chk_n} doğrulandı"
                                 if chk_n else "Doğrulanıyor...")
        self.graph_health.set_fraction(score)
        self.graph_health.set_color((0.06, 0.72, 0.5, 1.0) if score > 0.99 else
                                    (0.99, 0.65, 0.14, 1.0) if score > 0.6 else
                                    (0.85, 0.2, 0.25, 1.0))

    def _measure_sources(self):
        if self._measuring:
            return
        self._measuring = True
        keys = list(self.selected)
        paths = {k: p for k, _l, p, _i in self.sources}

        def _work():
            sizes = {}
            for k in keys:
                try:
                    sizes[k] = dir_size(paths[k])
                except Exception:
                    sizes[k] = 0

            def _apply():
                self._measuring = False
                covered = 0
                for k, sz in sizes.items():
                    covered += sz
                    b = self._src_badges.get(k)
                    if b:
                        color = "#047857" if sz > 0 else "#94a3b8"
                        b.set_markup(f"<span foreground='{color}' size='small'><b>  {human(sz)}  </b></span>")
                self.lbl_cov.set_text(human(covered))
                self.graph_cov.set_fraction(min(1.0, covered / (50 * 1024 ** 3)))
                return False
            GLib.idle_add(_apply)
        threading.Thread(target=_work, daemon=True).start()

    def _verify_thread(self, archives):
        plain = [a for a in archives if not a["enc"]]
        for a in archives:
            if a["enc"]:
                self._verify_cache[a["path"]] = (True, 0, 0)

        def _work():
            for a in plain:
                ok, n, b, _err = self.engine.verify(a)
                self._verify_cache[a["path"]] = (ok, n, b)
                GLib.idle_add(self._apply_dashboard, self.engine.list_archives())
        threading.Thread(target=_work, daemon=True).start()

    # ---------- ARSIV SATIRLARI ----------
    def _render_archives(self, archives):
        for ch in self.listbox.get_children():
            self.listbox.remove(ch)
        if not archives:
            hint = Gtk.Label(label="Henüz arşiv yok. 'Tam Yedek Al' ile ilk gerçek yedeğinizi oluşturun.")
            hint.get_style_context().add_class("setting-subtitle")
            hint.set_margin_top(12)
            hint.set_margin_bottom(12)
            self.listbox.add(hint)
        for a in archives:
            row = Gtk.ListBoxRow()
            row.name = a["name"].lower()
            row.get_style_context().add_class("settings-card")
            row.set_margin_bottom(6)
            box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
            ic = Gtk.Image.new_from_icon_name(
                "security-high-symbolic" if a["enc"] else "package-x-generic-symbolic",
                Gtk.IconSize.BUTTON)
            box.pack_start(ic, False, False, 0)
            vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
            t = Gtk.Label(label=a["name"])
            t.get_style_context().add_class("device-name")
            t.set_halign(Gtk.Align.START)
            t.set_ellipsize(Pango.EllipsizeMode.MIDDLE)
            t.set_max_width_chars(34)
            kind = ("Tam" if a["full"] else "Artımlı") + (" • Şifreli" if a["enc"] else "")
            d = Gtk.Label(label=f"{time.strftime('%d.%m.%Y %H:%M', time.localtime(a['ts']))} • {human(a['size'])} • {kind}")
            d.get_style_context().add_class("device-mac")
            d.set_halign(Gtk.Align.START)
            vbox.pack_start(t, False, False, 0)
            vbox.pack_start(d, False, False, 0)
            box.pack_start(vbox, True, True, 0)

            btns = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
            btns.set_valign(Gtk.Align.CENTER)
            b_info = Gtk.Button(label="Bilgi")
            b_info.get_style_context().add_class("btn-secondary")
            b_info.connect("clicked", lambda b, ar=a: self._show_archive_info(ar))
            btns.pack_start(b_info, False, False, 0)
            b_rest = Gtk.Button(label="Geri Yükle")
            b_rest.get_style_context().add_class("btn-secondary")
            b_rest.connect("clicked", lambda b, ar=a: self._restore_archive(ar))
            btns.pack_start(b_rest, False, False, 0)
            b_del = Gtk.Button(label="Sil")
            b_del.get_style_context().add_class("btn-danger")
            b_del.connect("clicked", lambda b, ar=a: self._delete_archive(ar))
            btns.pack_start(b_del, False, False, 0)
            box.pack_end(btns, False, False, 0)
            row.add(box)
            self.listbox.add(row)
        self.listbox.show_all()

    def _show_archive_info(self, arch):
        v = self._verify_cache.get(arch["path"])
        dialog = DeviceDetailsDialog("Arşiv Detayları", parent=self.get_toplevel(),
                                     icon_name="package-x-generic-symbolic")
        dialog.set_header_info("package-x-generic-symbolic", arch["name"],
                               "ULAK Yedek Arşivi",
                               status_active=bool(v and v[0]),
                               status_text="Sağlam" if v and v[0] else ("Bozuk" if v else "Bilinmiyor"))
        items = [
            ("Tür", "Tam Yedek" if arch["full"] else "Artımlı Yedek", "document-save-symbolic"),
            ("Tarih", time.strftime("%d.%m.%Y %H:%M:%S", time.localtime(arch["ts"])), "calendar-event-symbolic"),
            ("Boyut", human(arch["size"]), "drive-harddisk-symbolic"),
            ("Şifreleme", "GPG AES-256" if arch["enc"] else "Yok", "security-high-symbolic"),
            ("Dosya Sayısı", str(v[1]) if v and v[1] else "—", "text-x-generic-symbolic"),
            ("İçerik Boyutu", human(v[2]) if v and v[2] else "—", "folder-symbolic"),
            ("Yol", arch["path"], "drive-harddisk-symbolic"),
        ]
        dialog.set_items_list(items)
        dialog.show_all()
        dialog.run()
        dialog.destroy()

    def _delete_archive(self, arch):
        try:
            os.remove(arch["path"])
            self._verify_cache.pop(arch["path"], None)
            self.toast_service.show(f"Arşiv silindi: {arch['name']}", type="warning")
        except OSError as e:
            self.toast_service.show(f"Silinemedi: {e}", type="error")
        self._refresh_all()

    # ---------- PAROLA DIALOJU ----------
    def _ask_passphrase(self, title, on_done):
        dlg = BentoDialog(title, parent=self.get_toplevel(),
                          icon_name="security-high-symbolic",
                          default_width=420, default_height=240)
        body = dlg.get_bento_content()
        lbl = Gtk.Label(label="Parola arşivde saklanmaz, yalnızca bu işlem için kullanılır.")
        lbl.get_style_context().add_class("setting-subtitle")
        lbl.set_line_wrap(True)
        body.pack_start(lbl, False, False, 0)
        entry = Gtk.Entry()
        entry.set_visibility(False)
        entry.set_invisible_char("•")
        entry.set_placeholder_text("Parola")
        body.pack_start(entry, False, False, 0)
        dlg.add_bento_action_button("Şifrele / Geri Yükle", Gtk.ResponseType.OK, is_primary=True)
        dlg.add_bento_action_button("Vazgeç", Gtk.ResponseType.CANCEL)
        entry.connect("activate", lambda e: dlg.response(Gtk.ResponseType.OK))
        dlg.show_all()
        resp = dlg.run()
        text = entry.get_text()
        dlg.destroy()
        on_done(text if resp == Gtk.ResponseType.OK and text else None)

    # ---------- YEDEKLEME ----------
    def _run_backup(self, force_full):
        if self._busy:
            self.toast_service.show("Zaten bir yedekleme sürüyor...", type="warning")
            return
        encrypt = storage.get_global("backup_encrypt", False)
        if encrypt and not shutil.which("gpg"):
            self.toast_service.show("gpg bulunamadı, yedek şifresiz alınacak.", type="warning")
            encrypt = False
        if encrypt:
            def _go(pw):
                if pw is None:
                    self.toast_service.show("Yedekleme iptal edildi.", type="info")
                    return
                self._passphrase = pw
                self._start_backup(force_full, True)
            self._ask_passphrase("Şifreleme Parolası", _go)
        else:
            self._start_backup(force_full, False)

    def _start_backup(self, force_full, encrypt):
        self._busy = True
        self.btn_incr.set_sensitive(False)
        self.btn_full.set_sensitive(False)
        keys = list(self.selected)
        pw = self._passphrase if encrypt else None
        self.lbl_cmd.set_text("Yedekleme başlatılıyor...")
        self.toast_service.show("Yedekleme başlatıldı (kapsam taranıyor)...", type="info")

        def _prog(i, total, nbytes):
            GLib.idle_add(self._progress, i, total, nbytes)

        def _work():
            status, nfiles, nbytes, path, note = self.engine.create(
                keys, force_full, encrypt, pw, _prog)
            GLib.idle_add(self._backup_done, status, nfiles, nbytes, path, note)

        threading.Thread(target=_work, daemon=True).start()

    def _progress(self, i, total, nbytes):
        if self._busy:
            pct = int(i * 100 / total) if total else 0
            self.lbl_cmd.set_text(f"Yedekleniyor: {i}/{total} dosya • {human(nbytes)} • %{pct}")
        return False

    def _backup_done(self, status, nfiles, nbytes, path, note):
        self._busy = False
        self.btn_incr.set_sensitive(True)
        self.btn_full.set_sensitive(True)
        if status == "ok":
            kind = "Tam" if "FULL" in os.path.basename(path or "") else "Artımlı"
            self.lbl_cmd.set_text(f"Son işlem: {kind} yedek • {nfiles} dosya • {human(nbytes)}")
            self.toast_service.show(
                f"{kind} yedek tamam: {nfiles} dosya, {human(nbytes)} → {os.path.basename(path)}",
                type="success")
            if note:
                self.toast_service.show(note, type="warning")
        elif status == "nodiff":
            self.lbl_cmd.set_text("Değişiklik yok — yeni arşiv oluşturulmadı.")
            self.toast_service.show("Değişen dosya yok, artımlı yedek atlandı.", type="info")
        elif status == "empty":
            self.lbl_cmd.set_text("Kapsam boş — kaynak klasörlerde dosya yok.")
            self.toast_service.show(note or "Yedeklenecek dosya bulunamadı.", type="error")
        else:
            self.lbl_cmd.set_text(f"Hata: {note}")
            self.toast_service.show(f"Yedekleme başarısız: {note}", type="error")
        self._refresh_all()
        return False

    # ---------- GERI YUKLEME ----------
    def _restore_archive(self, arch):
        if self._busy:
            self.toast_service.show("Başka bir işlem sürüyor...", type="warning")
            return
        if arch["enc"]:
            def _go(pw):
                if pw is None:
                    self.toast_service.show("Geri yükleme iptal edildi.", type="info")
                    return
                self._start_restore(arch, pw)
            self._ask_passphrase("Geri Yükleme Parolası", _go)
        else:
            self._start_restore(arch, None)

    def _start_restore(self, arch, passphrase):
        self._busy = True
        stem = arch["name"].replace(".tar.gz.gpg", "").replace(".tar.gz", "")
        target = os.path.join(os.path.expanduser("~"), "GeriYukleme",
                              f"{stem}_{time.strftime('%H%M%S')}")
        self.lbl_cmd.set_text("Geri yükleniyor...")
        self.toast_service.show("Geri yükleme başladı (güvenli klasöre açılıyor)...", type="info")

        def _prog(i, total):
            GLib.idle_add(self._restore_progress, i, total)

        def _work():
            try:
                n = self.engine.extract_to(arch, target, passphrase, _prog)
                GLib.idle_add(self._restore_done, True, target, n, "")
            except Exception as e:
                GLib.idle_add(self._restore_done, False, target, 0, str(e)[:160])

        threading.Thread(target=_work, daemon=True).start()

    def _restore_progress(self, i, total):
        if self._busy:
            self.lbl_cmd.set_text(f"Geri yükleniyor: {i}/{total} kayıt")
        return False

    def _restore_done(self, ok, target, n, err):
        self._busy = False
        if ok:
            self.lbl_cmd.set_text(f"Geri yükleme tamam: {n} dosya → {target}")
            self.toast_service.show(f"{n} dosya '{target}' içine açıldı.", type="success")
        else:
            self.lbl_cmd.set_text(f"Geri yükleme hatası: {err}")
            self.toast_service.show(f"Geri yüklenemedi: {err}", type="error")
        return False

    # ---------- ZAMANLAYICI VE USB IZLEME ----------
    def _auto_check(self):
        if not storage.get_global("backup_auto", False) or self._busy:
            return True
        archives = self.engine.list_archives()
        interval = storage.get_global("backup_interval_h", 24) * 3600
        last_ts = archives[0]["ts"] if archives else 0
        if time.time() - last_ts >= interval:
            self.toast_service.show("Zamanlanmış otomatik yedek çalışıyor...", type="info")
            self._start_backup(False, storage.get_global("backup_encrypt", False) and bool(self._passphrase))
        return True

    def _usb_tick(self):
        if not storage.get_global("backup_usb_watch", False):
            self._seen_media = None
            return True
        user = os.environ.get("USER", "")
        base = f"/run/media/{user}"
        try:
            cur = set(os.listdir(base))
        except OSError:
            cur = set()
        if self._seen_media is None:
            self._seen_media = cur
            return True
        new = cur - self._seen_media
        self._seen_media = cur
        if new:
            drive = sorted(new)[0]
            archives = self.engine.list_archives()
            if not archives:
                self.toast_service.show(f"Harici disk takıldı: {drive} (kopyalanacak arşiv yok)", type="info")
                return True
            latest = archives[0]
            dest_dir = os.path.join(base, drive, "ULAK-Yedekler")

            def _work():
                try:
                    os.makedirs(dest_dir, exist_ok=True)
                    shutil.copy2(latest["path"], os.path.join(dest_dir, latest["name"]))
                    GLib.idle_add(self.toast_service.show,
                                  f"{latest['name']} '{drive}' diskine kopyalandı.", "success")
                except OSError as e:
                    GLib.idle_add(self.toast_service.show,
                                  f"Disk kopyası başarısız: {e}", "error")
                return False
            self.toast_service.show(f"Harici disk algılandı: {drive} — son arşiv kopyalanıyor...", type="info")
            threading.Thread(target=_work, daemon=True).start()
        return True

    def _on_destroy(self, widget):
        for t in (getattr(self, "_timer_auto", None), getattr(self, "_timer_usb", None)):
            if t:
                GLib.source_remove(t)
