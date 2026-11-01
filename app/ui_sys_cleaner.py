import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, GLib, Pango
import os
import re
import shutil
import subprocess
import threading

from ui_shared import UsageGraph, storage


# ============================================================
# CANLI VERI YARDIMCILARI (hepsi gercek dosya sistemi / komut)
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


def disk_usage():
    st = os.statvfs("/")
    total = st.f_blocks * st.f_frsize
    free = st.f_bavail * st.f_frsize
    return total - free, total, free


def priv_prefix():
    if os.geteuid() == 0:
        return []
    if shutil.which("pkexec"):
        return ["pkexec"]
    return ["sudo"]


def _parse_size(s):
    m = re.search(r"([0-9][0-9.,]*)\s*([KMGT]?i?B?)", s, re.IGNORECASE)
    if not m:
        return 0
    num = float(m.group(1).replace(",", "."))
    unit = m.group(2).upper().replace("I", "").replace("B", "")
    mult = {"": 1, "K": 1024, "M": 1024 ** 2, "G": 1024 ** 3, "T": 1024 ** 4}
    return int(num * mult.get(unit, 1))


def apt_cache_bytes():
    try:
        out = subprocess.run(["du", "-sb", "/var/cache/apt/archives"],
                             stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                             text=True, timeout=15).stdout
        return int(out.split()[0]) if out.split() else 0
    except Exception:
        return 0


def journal_bytes():
    if not shutil.which("journalctl"):
        return 0
    try:
        out = subprocess.run(["journalctl", "--disk-usage"],
                             stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                             text=True, timeout=15).stdout
        return _parse_size(out)
    except Exception:
        return 0


def purge_dir(path):
    """Klasor icerigini (kendisi kalarak) siler, geri kazanilan bayti dondurur."""
    if not path or not os.path.isdir(path):
        return 0
    freed = 0
    for name in os.listdir(path):
        fp = os.path.join(path, name)
        try:
            if os.path.isdir(fp) and not os.path.islink(fp):
                sz = dir_size(fp)
                shutil.rmtree(fp, ignore_errors=True)
                freed += sz
            else:
                sz = os.stat(fp).st_size if os.path.exists(fp) else 0
                os.remove(fp)
                freed += sz
        except OSError:
            continue
    return freed


class SystemCleanerView(Gtk.ScrolledWindow):
    """
    ULAK Sistem Temizleyici — tamamiyle CANLI verilerle calisir:
    disk halkasi (statvfs), APT/log/onbellek/cop boyutlari gercek olcum,
    gercek temizlik komutlari (pkexec ile yetki) ve buyuk dosya dedektoru.
    """
    def __init__(self, toast_service):
        super().__init__()
        self.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        self.toast_service = toast_service
        self._busy = set()
        self._size_labels = {}
        self._measuring = False

        home = os.path.expanduser("~")
        self.targets = {
            "apt": {"title": "Paket Ön Belleği (APT)", "icon": "edit-clear-all-symbolic",
                    "sub": "İndirilen .deb arşivlerini siler (apt-get clean).",
                    "measure": apt_cache_bytes, "priv": True,
                    "cmd": ["apt-get", "clean"]},
            "logs": {"title": "Sistem Günlükleri (Journal)", "icon": "document-properties-symbolic",
                     "sub": "7 günden eski systemd günlüklerini kırpars.",
                     "measure": journal_bytes, "priv": True,
                     "cmd": ["journalctl", "--vacuum-time=7d"]},
            "usercache": {"title": "Kullanıcı Önbelleği", "icon": "address-book-new-symbolic",
                          "sub": "~/.cache içindeki yeniden üretilebilir uygulama önbellekleri.",
                          "path": os.path.join(home, ".cache"), "measure": lambda: dir_size(os.path.join(home, ".cache"))},
            "trash": {"title": "Çöp Kutusu", "icon": "user-trash-full-symbolic",
                      "sub": "~/.local/share/Trash içeriğini kalıcı boşaltır.",
                      "path": os.path.join(home, ".local/share/Trash"),
                      "measure": lambda: dir_size(os.path.join(home, ".local/share/Trash"))},
        }

        main_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        main_box.set_margin_top(20)
        main_box.set_margin_bottom(24)
        main_box.set_margin_start(32)
        main_box.set_margin_end(32)
        self.add(main_box)

        # --- Baslik ---
        header = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        lbl_title = Gtk.Label(label="Sistem Temizleyici")
        lbl_title.get_style_context().add_class("header-title")
        lbl_title.set_halign(Gtk.Align.START)
        header.pack_start(lbl_title, False, False, 0)

        lbl_desc = Gtk.Label(label="Disk sağlığı, önbellek, günlük ve çöp boyutları canlı ölçülür; temizlikler gerçek komutlarla yapılır.")
        lbl_desc.get_style_context().add_class("header-sub")
        lbl_desc.set_halign(Gtk.Align.START)
        lbl_desc.set_line_wrap(True)
        header.pack_start(lbl_desc, False, False, 0)
        main_box.pack_start(header, False, False, 0)

        # ============================================================
        # 1. BENTO DASHBOARD — 4 canli olcum karti
        # ============================================================
        top_grid = Gtk.Grid(column_spacing=16, row_spacing=16)
        top_grid.set_column_homogeneous(True)
        main_box.pack_start(top_grid, False, False, 0)
        self._top_grid = top_grid
        self._stat_cards = []
        self._dash_wide = None

        card, self.graph_disk, self.lbl_disk = self._create_bento_stat_card(
            "Disk Sağlığı", "drive-harddisk-symbolic", (0.2, 0.6, 1.0, 1.0), size=92)
        self._stat_cards.append(card)

        card, self.graph_rec, self.lbl_rec = self._create_bento_stat_card(
            "Toplam Kurtarılan Alan", "edit-undo-symbolic", (0.06, 0.72, 0.5, 1.0), size=92)
        self._stat_cards.append(card)

        card, self.graph_apt, self.lbl_apt = self._create_bento_stat_card(
            "APT Paket Deposu", "edit-clear-all-symbolic", (0.99, 0.65, 0.14, 1.0), size=92)
        self._stat_cards.append(card)

        card, self.graph_logs, self.lbl_logs = self._create_bento_stat_card(
            "Sistem Günlükleri", "document-properties-symbolic", (0.85, 0.3, 0.4, 1.0), size=92)
        self._stat_cards.append(card)

        for card in self._stat_cards:
            top_grid.attach(card, 0, 0, 1, 1)
        self.connect("size-allocate", self._relayout_dashboard)

        # ============================================================
        # 2. AKILLI TARAMA & ALLASINI TEMIZLE (yeni)
        # ============================================================
        sec1 = Gtk.Label(label="HIZLI KOMUTA MERKEZİ")
        sec1.get_style_context().add_class("nav-section-title")
        sec1.set_halign(Gtk.Align.START)
        sec1.set_margin_top(8)
        main_box.pack_start(sec1, False, False, 0)

        master = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        master.get_style_context().add_class("settings-card")
        mic = Gtk.Image.new_from_icon_name("system-search-symbolic", Gtk.IconSize.DIALOG)
        mic.set_pixel_size(40)
        master.pack_start(mic, False, False, 4)
        mv = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        mv.set_valign(Gtk.Align.CENTER)
        mt = Gtk.Label(label="Akıllı Tarama")
        mt.get_style_context().add_class("setting-title")
        mt.set_halign(Gtk.Align.START)
        self.lbl_master = Gtk.Label(label="Taranacak alan hesaplanıyor...")
        self.lbl_master.get_style_context().add_class("setting-subtitle")
        self.lbl_master.set_halign(Gtk.Align.START)
        self.lbl_master.set_ellipsize(Pango.EllipsizeMode.END)
        self.lbl_master.set_line_wrap(True)
        self.lbl_master.set_max_width_chars(48)
        mv.pack_start(mt, False, False, 0)
        mv.pack_start(self.lbl_master, False, False, 0)
        master.pack_start(mv, True, True, 0)

        self.btn_clean_all = Gtk.Button(label="Tümünü Temizle")
        self.btn_clean_all.get_style_context().add_class("btn-primary")
        self.btn_clean_all.set_valign(Gtk.Align.CENTER)
        self.btn_clean_all.connect("clicked", lambda b: self._clean_all())
        master.pack_end(self.btn_clean_all, False, False, 4)

        btn_rescan = Gtk.Button(label="Yeniden Tara")
        btn_rescan.get_style_context().add_class("btn-secondary")
        btn_rescan.set_valign(Gtk.Align.CENTER)
        btn_rescan.connect("clicked", lambda b: self._measure_all())
        master.pack_end(btn_rescan, False, False, 4)
        main_box.pack_start(master, False, False, 0)

        # ============================================================
        # 3. TEMIZLIK SECENEKLERI (gercek komutlar + boyut rozetleri)
        # ============================================================
        sec2 = Gtk.Label(label="TEMİZLEME HEDEFLERİ")
        sec2.get_style_context().add_class("nav-section-title")
        sec2.set_halign(Gtk.Align.START)
        sec2.set_margin_top(8)
        main_box.pack_start(sec2, False, False, 0)

        tools_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        main_box.pack_start(tools_box, False, False, 0)

        for key in ("apt", "logs", "usercache", "trash"):
            tools_box.pack_start(self._create_action_card(key), False, False, 0)

        # DNS ayrik (boyut yok, anlik islem)
        tools_box.pack_start(self._create_dns_card(), False, False, 0)

        # Otomatik periyodik temizlik (kalici)
        tools_box.pack_start(self._create_switch_card(
            icon_name="appointment-soon-symbolic",
            title="Otomatik Periyodik Temizlik",
            subtitle="Haftalık zamanlayıcıyla kullanıcı önbelleği ve çöp kutusunu otomatik temizler.",
            key="cleaner_auto", default=False,
            callback=lambda s: self.toast_service.show(
                "Otomatik temizlik etkin." if s else "Otomatik temizlik kapatıldı.", type="info")
        ), False, False, 0)

        # ============================================================
        # 4. BUYUK DOSYA DEDEKTORU (yeni, aranabilir liste - Kural 3)
        # ============================================================
        sec3 = Gtk.Label(label="BÜYÜK DOSYA DEDEKTÖRÜ")
        sec3.get_style_context().add_class("nav-section-title")
        sec3.set_halign(Gtk.Align.START)
        sec3.set_margin_top(12)
        main_box.pack_start(sec3, False, False, 0)

        det_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.big_search = Gtk.SearchEntry()
        self.big_search.get_style_context().add_class("termius-search")
        self.big_search.set_placeholder_text("Dosya veya klasör adı ara...")
        det_row.pack_start(self.big_search, True, True, 0)
        btn_detect = Gtk.Button(label="Tara")
        btn_detect.get_style_context().add_class("btn-secondary")
        btn_detect.connect("clicked", lambda b: self._detect_big_files())
        det_row.pack_start(btn_detect, False, False, 0)
        main_box.pack_start(det_row, False, False, 0)

        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        scroll.set_min_content_height(160)
        self.big_list = Gtk.ListBox()
        self.big_list.set_selection_mode(Gtk.SelectionMode.NONE)
        scroll.add(self.big_list)
        main_box.pack_start(scroll, True, True, 0)

        def big_filter(row):
            q = self.big_search.get_text().strip().lower()
            return q in getattr(row, "name", "").lower()
        self.big_list.set_filter_func(big_filter)
        self.big_search.connect("search-changed", lambda e: self.big_list.invalidate_filter())

        self._empty_hint = Gtk.Label(label="‘Tara’ ile ev dizininizdeki en büyük dosyalar listelenir.")
        self._empty_hint.get_style_context().add_class("setting-subtitle")
        self._empty_hint.set_halign(Gtk.Align.START)
        self._empty_hint.set_margin_top(8)
        self.big_list.add(self._empty_hint)

        self._refresh_recovered_card()
        GLib.idle_add(self._measure_all)

    # ---------- RESPONSIF DASHBOARD (4x1 <-> 2x2) ----------
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

    # ---------- BENTO KART UR ETICILERI ----------
    def _create_bento_stat_card(self, title, icon_name, color, size=92):
        card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        card.get_style_context().add_class("card")
        card.set_margin_top(4)
        card.set_margin_bottom(4)
        card.set_margin_start(4)
        card.set_margin_end(4)

        graph = UsageGraph(color_rgba=color, size=size)
        card.pack_start(graph, False, False, 6)

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        vbox.set_valign(Gtk.Align.CENTER)
        head = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        ic = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.MENU)
        head.pack_start(ic, False, False, 0)
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

    def _create_action_card(self, key):
        t = self.targets[key]
        card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        card.get_style_context().add_class("settings-card")
        icon = Gtk.Image.new_from_icon_name(t["icon"], Gtk.IconSize.BUTTON)
        card.pack_start(icon, False, False, 4)

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        vbox.set_valign(Gtk.Align.CENTER)
        ttl = Gtk.Label(label=t["title"])
        ttl.get_style_context().add_class("setting-title")
        ttl.set_halign(Gtk.Align.START)
        sub = Gtk.Label(label=t["sub"])
        sub.get_style_context().add_class("setting-subtitle")
        sub.set_halign(Gtk.Align.START)
        sub.set_line_wrap(True)
        vbox.pack_start(ttl, False, False, 0)
        vbox.pack_start(sub, False, False, 0)
        card.pack_start(vbox, True, True, 0)

        btn = Gtk.Button(label="Temizle")
        btn.get_style_context().add_class("btn-primary")
        btn.set_valign(Gtk.Align.CENTER)
        btn.connect("clicked", lambda b: self._clean_target(key, b))
        card.pack_end(btn, False, False, 4)

        badge = Gtk.Label()
        badge.set_markup("<span foreground='#94a3b8' size='small'><b>  —  </b></span>")
        card.pack_end(badge, False, False, 6)
        self._size_labels[key] = badge
        return card

    def _create_dns_card(self):
        card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        card.get_style_context().add_class("settings-card")
        card.pack_start(Gtk.Image.new_from_icon_name("network-wireless-symbolic", Gtk.IconSize.BUTTON), False, False, 4)
        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        vbox.set_valign(Gtk.Align.CENTER)
        ttl = Gtk.Label(label="DNS Önbelleğini Sıfırla")
        ttl.get_style_context().add_class("setting-title")
        ttl.set_halign(Gtk.Align.START)
        sub = Gtk.Label(label="systemd-resolved önbelleğini boşaltır (resolvectl flush-caches).")
        sub.get_style_context().add_class("setting-subtitle")
        sub.set_halign(Gtk.Align.START)
        sub.set_line_wrap(True)
        vbox.pack_start(ttl, False, False, 0)
        vbox.pack_start(sub, False, False, 0)
        card.pack_start(vbox, True, True, 0)
        btn = Gtk.Button(label="DNS Temizle")
        btn.get_style_context().add_class("btn-secondary")
        btn.set_valign(Gtk.Align.CENTER)
        btn.connect("clicked", self._clean_dns)
        card.pack_end(btn, False, False, 4)
        return card

    def _create_switch_card(self, icon_name, title, subtitle, key, default, callback):
        card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        card.get_style_context().add_class("settings-card")
        card.pack_start(Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.BUTTON), False, False, 4)
        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        ttl = Gtk.Label(label=title)
        ttl.get_style_context().add_class("setting-title")
        ttl.set_halign(Gtk.Align.START)
        sub = Gtk.Label(label=subtitle)
        sub.get_style_context().add_class("setting-subtitle")
        sub.set_halign(Gtk.Align.START)
        sub.set_line_wrap(True)
        sub.set_max_width_chars(60)
        vbox.pack_start(ttl, False, False, 0)
        vbox.pack_start(sub, False, False, 0)
        card.pack_start(vbox, True, True, 0)
        sw = Gtk.Switch()
        sw.set_valign(Gtk.Align.CENTER)
        sw.set_active(storage.get_global(key, default))
        sw.connect("notify::active", lambda s, p: (storage.set_global(key, s.get_active()), callback(s.get_active())))
        card.pack_end(sw, False, False, 4)
        return card

    # ---------- CANLI OLUM (arka plan is parcacigi) ----------
    def _measure_all(self):
        if self._measuring:
            return False
        self._measuring = True
        self.lbl_master.set_text("Canlı boyutlar hesaplanıyor...")

        def _work():
            sizes = {}
            for key, t in self.targets.items():
                try:
                    sizes[key] = t["measure"]()
                except Exception:
                    sizes[key] = 0
            used, total, free = disk_usage()
            GLib.idle_add(self._apply_sizes, sizes, used, total, free)
        threading.Thread(target=_work, daemon=True).start()
        return False

    def _apply_sizes(self, sizes, used, total, free):
        self._measuring = False
        apt_b = sizes.get("apt", 0)
        log_b = sizes.get("logs", 0)
        for key, val in sizes.items():
            badge = self._size_labels.get(key)
            if badge:
                color = "#047857" if val > 0 else "#94a3b8"
                badge.set_markup(f"<span foreground='{color}' size='small'><b>  {human(val)}  </b></span>")

        self.lbl_apt.set_text(f"Boyut: {human(apt_b)}")
        self.graph_apt.set_fraction(min(1.0, apt_b / (2 * 1024 ** 3)))
        self.lbl_logs.set_text(f"Boyut: {human(log_b)}")
        self.graph_logs.set_fraction(min(1.0, log_b / (2 * 1024 ** 3)))

        pct = used / total if total else 0
        self.graph_disk.set_fraction(pct)
        self.graph_disk.set_color((0.85, 0.2, 0.25, 1.0) if pct > 0.9 else
                                  (0.99, 0.65, 0.14, 1.0) if pct > 0.75 else
                                  (0.06, 0.72, 0.5, 1.0))
        self.lbl_disk.set_text(f"{human(free)} boş / {human(total)}")

        recoverable = sum(sizes.values())
        self.lbl_master.set_text(f"Tahmini temizlenebilir: {human(recoverable)} "
                                 f"(APT {human(apt_b)} • Log {human(log_b)} • "
                                 f"Önbellek {human(sizes.get('usercache', 0))} • Çöp {human(sizes.get('trash', 0))})")
        return False

    def _refresh_recovered_card(self):
        rec = storage.get_global("cleaner_recovered_bytes", 0)
        self.lbl_rec.set_text(human(rec))
        self.graph_rec.set_fraction(min(1.0, rec / (20 * 1024 ** 3)))

    def _record_recovered(self, freed):
        if freed <= 0:
            return
        rec = storage.get_global("cleaner_recovered_bytes", 0) + freed
        storage.set_global("cleaner_recovered_bytes", rec)
        self._refresh_recovered_card()

    # ---------- GEREKLI TEMIZLIK ISLEMLERI ----------
    def _clean_target(self, key, btn=None):
        if key in self._busy:
            return
        t = self.targets[key]
        self._busy.add(key)
        if btn:
            btn.set_sensitive(False)
        self.toast_service.show(f"{t['title']} temizleniyor...", type="info")

        def _finish(ok, freed, err):
            def _done():
                self._busy.discard(key)
                if btn:
                    btn.set_sensitive(True)
                if ok:
                    self._record_recovered(freed)
                    self.toast_service.show(f"{t['title']}: {human(freed)} alan açıldı.", type="success")
                    self._measure_all()
                else:
                    self.toast_service.show(f"Temizlik başarısız: {err or 'yetki reddedildi'}", type="error")
                return False
            GLib.idle_add(_done)

        def _work():
            try:
                if "cmd" in t:
                    before = t["measure"]()
                    cmd = priv_prefix() + t["cmd"]
                    r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                       text=True, timeout=120)
                    after = t["measure"]()
                    ok = r.returncode == 0
                    freed = max(0, before - after) if ok else 0
                    _finish(ok, freed, (r.stderr or r.stdout).strip()[:180])
                else:
                    before = t["measure"]()
                    freed = purge_dir(t["path"])
                    _finish(True, freed or before, "")
            except Exception as e:
                _finish(False, 0, str(e))
        threading.Thread(target=_work, daemon=True).start()

    def _clean_all(self):
        if self._busy:
            self.toast_service.show("Zaten bir temizlik sürüyor...", type="warning")
            return
        self.btn_clean_all.set_sensitive(False)
        self.toast_service.show("Tüm hedefler temizleniyor...", type="info")
        keys = list(self.targets.keys())

        def _work():
            total_freed = 0
            for key in keys:
                t = self.targets[key]
                try:
                    if "cmd" in t:
                        cmd = priv_prefix() + t["cmd"]
                        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
                    else:
                        total_freed += purge_dir(t["path"])
                except Exception:
                    pass
            GLib.idle_add(self._finish_all, total_freed)

        threading.Thread(target=_work, daemon=True).start()

    def _finish_all(self, freed):
        self.btn_clean_all.set_sensitive(True)
        self._record_recovered(freed)
        self.toast_service.show(f"Tümünü Temizle tamamlandı: ~{human(freed)}+ alan açıldı.", type="success")
        self._measure_all()
        return False

    def _clean_dns(self, btn):
        btn.set_sensitive(False)
        self.toast_service.show("DNS önbelleği sıfırlanıyor...", type="info")

        def _work():
            ok, err = False, ""
            try:
                if shutil.which("resolvectl"):
                    r = subprocess.run(["resolvectl", "flush-caches"],
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=20)
                    ok = r.returncode == 0
                    if not ok:
                        r = subprocess.run(priv_prefix() + ["resolvectl", "flush-caches"],
                                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=60)
                        ok = r.returncode == 0
                    err = (r.stderr or r.stdout).strip()[:150]
                elif shutil.which("systemd-resolve"):
                    r = subprocess.run(priv_prefix() + ["systemd-resolve", "--flush-caches"],
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=20)
                    ok = r.returncode == 0
                else:
                    err = "systemd-resolved bulunamadı"
            except Exception as e:
                err = str(e)
            GLib.idle_add(self._dns_done, btn, ok, err)

        threading.Thread(target=_work, daemon=True).start()

    def _dns_done(self, btn, ok, err):
        btn.set_sensitive(True)
        if ok:
            self.toast_service.show("DNS önbelleği temizlendi.", type="success")
        else:
            self.toast_service.show(f"DNS temizlenemedi: {err}", type="error")
        return False

    # ---------- BUYUK DOSYA DEDEKTORU ----------
    def _detect_big_files(self):
        for ch in self.big_list.get_children():
            self.big_list.remove(ch)
        loading = Gtk.ListBoxRow()
        ll = Gtk.Label(label="Ev dizini taranıyor (büyük dosyalar)...")
        ll.get_style_context().add_class("setting-subtitle")
        ll.set_margin_top(10)
        ll.set_margin_bottom(10)
        loading.add(ll)
        self.big_list.add(loading)
        self.big_list.show_all()

        home = os.path.expanduser("~")

        def _work():
            found = []
            MIN = 50 * 1024 * 1024
            skip_dirs = {".cache", ".local/share/Trash", ".git", "node_modules", ".mozilla", ".config"}
            for root, dirs, files in os.walk(home, onerror=lambda e: None):
                dirs[:] = [d for d in dirs if d not in skip_dirs and not os.path.islink(os.path.join(root, d))]
                for f in files:
                    fp = os.path.join(root, f)
                    try:
                        if os.path.islink(fp):
                            continue
                        sz = os.stat(fp).st_size
                        if sz >= MIN:
                            found.append((sz, fp))
                    except OSError:
                        continue
            found.sort(reverse=True)
            GLib.idle_add(self._apply_big_files, found[:20])

        threading.Thread(target=_work, daemon=True).start()

    def _apply_big_files(self, found):
        for ch in self.big_list.get_children():
            self.big_list.remove(ch)
        if not found:
            hint = Gtk.Label(label="50 MB üzerinde büyük dosya bulunamadı.")
            hint.get_style_context().add_class("setting-subtitle")
            hint.set_margin_top(10)
            self.big_list.add(hint)
        else:
            for sz, fp in found:
                row = Gtk.ListBoxRow()
                row.name = fp.lower()
                row.get_style_context().add_class("settings-card")
                row.set_margin_bottom(6)
                box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
                box.pack_start(Gtk.Image.new_from_icon_name("text-x-generic-symbolic", Gtk.IconSize.BUTTON), False, False, 0)
                vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
                name = Gtk.Label(label=os.path.basename(fp))
                name.get_style_context().add_class("device-name")
                name.set_halign(Gtk.Align.START)
                name.set_ellipsize(Pango.EllipsizeMode.END)
                name.set_max_width_chars(24)
                path = Gtk.Label(label=fp)
                path.get_style_context().add_class("device-mac")
                path.set_halign(Gtk.Align.START)
                path.set_ellipsize(Pango.EllipsizeMode.MIDDLE)
                vbox.pack_start(name, False, False, 0)
                vbox.pack_start(path, False, False, 0)
                box.pack_start(vbox, True, True, 0)

                size_lbl = Gtk.Label()
                size_lbl.set_markup(f"<span foreground='#b45309'><b>{human(sz)}</b></span>")
                box.pack_end(size_lbl, False, False, 6)

                del_btn = Gtk.Button(label="Sil")
                del_btn.get_style_context().add_class("btn-danger")
                del_btn.set_valign(Gtk.Align.CENTER)
                del_btn.connect("clicked", lambda b, p=fp, s=sz: self._delete_big_file(p, s))
                box.pack_end(del_btn, False, False, 4)

                row.add(box)
                self.big_list.add(row)
        self.big_list.show_all()
        return False

    def _delete_big_file(self, path, size):
        try:
            os.remove(path)
            self._record_recovered(size)
            self.toast_service.show(f"Silindi: {os.path.basename(path)} ({human(size)})", type="success")
            self._detect_big_files()
        except OSError as e:
            self.toast_service.show(f"Silinemedi: {e}", type="error")
