#!/usr/bin/env python3
"""
ULAK Evrensel Paket Yükleyici (Bento Standartlarında Bağımsız Pencere & Modül).
Tüm Linux dağıtımları (.deb, .rpm, .AppImage, .tar.*, .zip, .pkg.tar.zst) ile uyumludur.
"""

import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, Gdk, GLib, Pango
import os
import sys
import shutil
import subprocess
import threading
from pathlib import Path

app_dir = os.path.dirname(os.path.abspath(__file__))
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

from i18n import _
from theme import theme_mgr
from ui_shared import ToastService, BentoDialog, UsageGraph
from pkg_engine import PackageInspector, PackageInstaller, PackageInfo, DistroDetector

def get_pkg_logo_path():
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "assets", "ulak_logo.png"),
        os.path.join(os.path.dirname(__file__), "assets", "ulak_logo.png"),
        "/usr/share/icons/hicolor/512x512/apps/ulak.png",
        "/usr/lib/ulak/assets/ulak_logo.png"
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


PKG_EXTS = (".deb", ".rpm", ".AppImage", ".tar.gz", ".zip", ".pkg.tar.zst")

def scan_download_packages(limit=6):
    found = []
    for name in ("İndirilenler", "Downloads"):
        dl_dir = os.path.expanduser(f"~/{name}")
        if not os.path.isdir(dl_dir):
            continue
        try:
            for f in sorted(os.listdir(dl_dir)):
                if f.endswith(PKG_EXTS):
                    found.append(os.path.join(dl_dir, f))
        except OSError:
            pass
    return found[:limit]


def is_pkg_installed_systemwide(raw_name):
    if shutil.which("dpkg"):
        try:
            r = subprocess.run(["dpkg", "-s", raw_name], stdout=subprocess.PIPE,
                               stderr=subprocess.DEVNULL, text=True)
            if r.returncode == 0 and "Status: install ok installed" in r.stdout:
                return True
        except Exception:
            pass
    return bool(shutil.which(raw_name) or os.path.exists(f"/usr/bin/{raw_name}"))


def build_recent_pkg_card(p_path, card_cid, on_activate):
    raw_base = os.path.basename(p_path)
    raw_name = raw_base.split('_')[0].split('-')[0].lower()
    is_inst = is_pkg_installed_systemwide(raw_name)

    card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
    card.get_style_context().add_class("settings-card")
    card.set_name(card_cid)

    if is_inst:
        card.get_style_context().add_class("card-status-installed")
        t_fg, s_fg = "#0f172a", "#475569"
        st_badge = "<span background='#dcfce7' foreground='#15803d' size='small'><b>  ● Yüklü  </b></span>"
        btn_lbl, btn_class = "İncele", "btn-secondary"
    else:
        card.get_style_context().add_class("card-status-ready")
        t_fg, s_fg = "#ffffff", "#ecfdf5"
        st_badge = "<span background='white' foreground='#047857' size='small'><b>  ＋ Yüklemeye Hazır  </b></span>"
        btn_lbl, btn_class = "İncele & Kur", "btn-card-action"

    ic = Gtk.Image.new_from_icon_name("application-x-executable-symbolic", Gtk.IconSize.BUTTON)
    card.pack_start(ic, False, False, 0)

    v = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
    t_lbl = Gtk.Label()
    t_lbl.set_markup(f"<span foreground='{t_fg}'><b>{raw_base}</b></span>")
    t_lbl.set_halign(Gtk.Align.START)
    t_lbl.set_ellipsize(Pango.EllipsizeMode.MIDDLE)
    s_lbl = Gtk.Label()
    try:
        size_mb = os.path.getsize(p_path) / (1024 * 1024)
    except OSError:
        size_mb = 0.0
    s_lbl.set_markup(f"<span foreground='{s_fg}' size='small'>{size_mb:.1f} MB</span>")
    s_lbl.set_halign(Gtk.Align.START)
    v.pack_start(t_lbl, False, False, 0)
    v.pack_start(s_lbl, False, False, 0)
    card.pack_start(v, True, True, 0)

    b_lbl = Gtk.Label()
    b_lbl.set_markup(st_badge)
    card.pack_end(b_lbl, False, False, 6)

    btn = Gtk.Button(label=btn_lbl)
    btn.get_style_context().add_class(btn_class)
    btn.connect("clicked", lambda b: on_activate(p_path))
    card.pack_end(btn, False, False, 0)
    return card


class PackageInstallerWindow(Gtk.Window):
    """
    Kural 4 & 7: Çerçevesiz, RGBA yuvarlak hatlı, kenara/köşeye yapışmalı (Snapping),
    duyarlı (Responsive) bağımsız ULAK Evrensel Paket Yükleyici Penceresi.
    """
    def __init__(self, initial_package_path=None, parent_window=None):
        super().__init__(title="ULAK Paket Yükleyici")
        self.set_default_size(780, 640)
        self.set_position(Gtk.WindowPosition.CENTER)
        self.set_decorated(False)
        self.set_resizable(True)

        if parent_window:
            self.set_transient_for(parent_window)

        # Kural 7.2: Minimum boyut sınırları (380x300 - 520x400)
        geometry = Gdk.Geometry()
        geometry.min_width = 440
        geometry.min_height = 360
        self.set_geometry_hints(None, geometry, Gdk.WindowHints.MIN_SIZE)

        # RGBA saydamlık
        screen = self.get_screen()
        visual = screen.get_rgba_visual()
        if visual and screen.is_composited():
            self.set_visual(visual)
        self.set_app_paintable(True)
        self.get_style_context().add_class("main-window")

        # İkon
        logo_p = get_pkg_logo_path()
        if logo_p:
            try: self.set_icon_from_file(logo_p)
            except: pass

        # Veri ve ayar durumu
        self.pkg = None
        self.settings = {
            "create_desktop_shortcut": True,
            "create_terminal_link": True,
            "firewall_allow": True,
            "auto_fix_deps": True,
            "user_sandbox": False,
            "deep_security_scan": True
        }
        self.distro = DistroDetector.get_info()

        self._build_ui()

        # İlk paket verilmişse doğrudan yükle
        if initial_package_path and os.path.exists(initial_package_path):
            GLib.idle_add(self.load_package, initial_package_path)

    def _build_ui(self):
        self.overlay = Gtk.Overlay()
        self.add(self.overlay)
        self.toast_service = ToastService(self.overlay)
        self.toast_service.main_window = self
        self.toast_service.toast_container.set_margin_bottom(52)

        self.root_frame = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.root_frame.get_style_context().add_class("main-frame")
        self.overlay.add(self.root_frame)

        # Kenar yeniden boyutlandırma olayları
        self.add_events(Gdk.EventMask.POINTER_MOTION_MASK | Gdk.EventMask.BUTTON_PRESS_MASK | Gdk.EventMask.LEAVE_NOTIFY_MASK)
        self.connect("motion-notify-event", self._on_root_motion)
        self.connect("button-press-event", self._on_root_button_press)
        self.connect("size-allocate", self._on_size_allocate)

        # 1. Başlık Çubuğu (Draggable Bento Header)
        self._build_header(self.root_frame)

        # 2. Gövde (ScrolledWindow - Kural 7.1: asla PolicyType.NEVER ile yatay kilitlenmez)
        self.main_scroll = Gtk.ScrolledWindow()
        self.main_scroll.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        self.root_frame.pack_start(self.main_scroll, True, True, 0)

        self.content_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        self.content_box.set_margin_top(14)
        self.content_box.set_margin_bottom(16)
        self.content_box.set_margin_start(20)
        self.content_box.set_margin_end(20)
        self.main_scroll.add(self.content_box)

        # Yığın (Stack) - Aşamalar
        self.stack = Gtk.Stack()
        self.stack.set_transition_type(Gtk.StackTransitionType.SLIDE_LEFT_RIGHT)
        self.content_box.pack_start(self.stack, True, True, 0)

        # Sayfa 1: Paket Seçim & Giriş Ekranı (Dropzone)
        self.page_select = self._build_page_select()
        self.stack.add_named(self.page_select, "select")

        # Sayfa 2: Paket Detayları & Dosya İnceleme & Ayarlar (Wizard Dashboard)
        self.page_details = self._build_page_details()
        self.stack.add_named(self.page_details, "details")

        # Sayfa 3: Canlı Kurulum & UsageGraph İlerleme Ekranı
        self.page_install = self._build_page_install()
        self.stack.add_named(self.page_install, "install")

        # Alt Durum Çubuğu
        self._build_footer(self.root_frame)

        self.stack.set_visible_child_name("select")
        self.show_all()

    # ==========================================
    # BAŞLIK ÇUBUĞU & PENCERE SNAPPING KONTROLLERİ
    # ==========================================
    def _build_header(self, parent):
        event_box = Gtk.EventBox()
        event_box.connect("button-press-event", self._on_header_drag)

        self.header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        self.header.get_style_context().add_class("app-header")
        event_box.add(self.header)

        # Sol: Simge & Başlık
        left_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        left_box.set_valign(Gtk.Align.CENTER)

        self.header_icon = Gtk.Image.new_from_icon_name("system-software-install-symbolic", Gtk.IconSize.BUTTON)
        self.header_icon.set_pixel_size(18)
        left_box.pack_start(self.header_icon, False, False, 0)

        self.header_title = Gtk.Label(label="ULAK Evrensel Paket Yükleyici")
        self.header_title.get_style_context().add_class("app-brand-title")
        left_box.pack_start(self.header_title, False, False, 0)

        # Sekme Butonları (Özet, Dosyalar, Ayarlar)
        self.header_nav_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        self.header_nav_box.set_margin_start(16)

        self.btn_nav_overview = Gtk.Button(label="Özet")
        self.btn_nav_overview.get_style_context().add_class("termius-tab")
        self.btn_nav_overview.connect("clicked", lambda b: self._switch_details_tab("overview"))
        self.header_nav_box.pack_start(self.btn_nav_overview, False, False, 0)

        self.btn_nav_files = Gtk.Button(label="Dosya Ağacı")
        self.btn_nav_files.get_style_context().add_class("termius-tab")
        self.btn_nav_files.connect("clicked", lambda b: self._switch_details_tab("files"))
        self.header_nav_box.pack_start(self.btn_nav_files, False, False, 0)

        self.btn_nav_settings = Gtk.Button(label="Ön Ayarlar")
        self.btn_nav_settings.get_style_context().add_class("termius-tab")
        self.btn_nav_settings.connect("clicked", lambda b: self._switch_details_tab("settings"))
        self.header_nav_box.pack_start(self.btn_nav_settings, False, False, 0)

        self.header_nav_box.set_no_show_all(True)
        self.header_nav_box.set_visible(False)  # Paket seçilene kadar gizli

        self.header.pack_start(left_box, False, False, 0)
        self.header.pack_start(self.header_nav_box, False, False, 0)

        # Orta Boşluk (Sürükleme alanı)
        spacer = Gtk.Box()
        self.header.pack_start(spacer, True, True, 0)

        # Sağ: Yeni Dosya Aç & Pencere Kontrolleri
        actions_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=4)
        actions_box.set_valign(Gtk.Align.CENTER)

        self.btn_open_file = Gtk.Button()
        self.btn_open_file.set_image(Gtk.Image.new_from_icon_name("document-open-symbolic", Gtk.IconSize.BUTTON))
        self.btn_open_file.get_style_context().add_class("win-btn")
        self.btn_open_file.set_tooltip_text("Yeni Paket Aç (.deb, .rpm, .AppImage, .tar)")
        self.btn_open_file.connect("clicked", lambda b: self._open_file_chooser())
        actions_box.pack_start(self.btn_open_file, False, False, 0)

        btn_min = Gtk.Button(label="—")
        btn_min.get_style_context().add_class("win-btn")
        btn_min.set_tooltip_text("Simge Durumuna Küçült")
        btn_min.connect("clicked", lambda w: self.iconify())
        actions_box.pack_start(btn_min, False, False, 0)

        self.btn_max = Gtk.Button(label="▢")
        self.btn_max.get_style_context().add_class("win-btn")
        self.btn_max.set_tooltip_text("Büyüt / Küçült")
        self.btn_max.connect("clicked", self._toggle_maximize)
        actions_box.pack_start(self.btn_max, False, False, 0)

        btn_close = Gtk.Button(label="✕")
        btn_close.get_style_context().add_class("win-btn")
        btn_close.get_style_context().add_class("win-btn-close")
        btn_close.set_tooltip_text("Kapat")
        btn_close.connect("clicked", lambda w: self.close())
        actions_box.pack_start(btn_close, False, False, 0)

        self.header.pack_start(actions_box, False, False, 0)
        parent.pack_start(event_box, False, False, 0)

    def _build_footer(self, parent):
        self.footer = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.footer.get_style_context().add_class("app-footer")

        self.footer_distro_pill = Gtk.Label(label=f"Dağıtım: {self.distro['name']}")
        self.footer_distro_pill.get_style_context().add_class("metric-pill")
        self.footer.pack_start(self.footer_distro_pill, False, False, 0)

        self.footer_mgr_pill = Gtk.Label(label=f"Paket Yöneticisi: {self.distro['pkg_manager'].upper()}")
        self.footer_mgr_pill.get_style_context().add_class("metric-pill")
        self.footer.pack_start(self.footer_mgr_pill, False, False, 0)

        spacer = Gtk.Box()
        self.footer.pack_start(spacer, True, True, 0)

        self.footer_status = Gtk.Label(label="ULAK Kalkanı Doğrulaması Aktif")
        self.footer_status.get_style_context().add_class("footer-text")
        self.footer.pack_end(self.footer_status, False, False, 0)

        parent.pack_start(self.footer, False, False, 0)

    # ==========================================
    # KURAL 7: SNAPPING, RESIZING & DUYARLILIK
    # ==========================================
    def _on_size_allocate(self, widget, allocation):
        is_compact = allocation.width < 750
        if hasattr(self, 'header_nav_box') and self.header_nav_box.get_visible():
            # Kompakt ekranda sekme butonlarını daha sade tut
            self.header_nav_box.set_spacing(2 if is_compact else 6)
        if hasattr(self, 'footer_status'):
            self.footer_status.set_visible(not is_compact)
        if hasattr(self, 'dropzone_sub'):
            self.dropzone_sub.set_no_show_all(True)
            self.dropzone_sub.set_visible(not is_compact)
        if hasattr(self, 'btn_view_scripts'):
            self.btn_view_scripts.set_no_show_all(True)
            self.btn_view_scripts.set_label("Scriptler" if is_compact else "Scriptleri Gör (preinst/postinst)")
            self.btn_view_scripts.set_visible(True)

    def _check_resize_edge(self, x, y, width, height, margin=8):
        edge = None
        if x < margin and y < margin: edge = Gdk.WindowEdge.NORTH_WEST
        elif x > width - margin and y < margin: edge = Gdk.WindowEdge.NORTH_EAST
        elif x < margin and y > height - margin: edge = Gdk.WindowEdge.SOUTH_WEST
        elif x > width - margin and y > height - margin: edge = Gdk.WindowEdge.SOUTH_EAST
        elif x < margin: edge = Gdk.WindowEdge.WEST
        elif x > width - margin: edge = Gdk.WindowEdge.EAST
        elif y < margin: edge = Gdk.WindowEdge.NORTH
        elif y > height - margin: edge = Gdk.WindowEdge.SOUTH
        return edge

    def _on_root_motion(self, widget, event):
        if self.is_maximized(): return False
        alloc = self.get_allocation()
        edge = self._check_resize_edge(event.x, event.y, alloc.width, alloc.height)
        gdk_win = self.get_window()
        if not gdk_win: return False

        cursor_type = Gdk.CursorType.ARROW
        if edge in [Gdk.WindowEdge.NORTH, Gdk.WindowEdge.SOUTH]: cursor_type = Gdk.CursorType.SB_V_DOUBLE_ARROW
        elif edge in [Gdk.WindowEdge.EAST, Gdk.WindowEdge.WEST]: cursor_type = Gdk.CursorType.SB_H_DOUBLE_ARROW
        elif edge in [Gdk.WindowEdge.NORTH_WEST, Gdk.WindowEdge.SOUTH_EAST]: cursor_type = Gdk.CursorType.TOP_LEFT_CORNER
        elif edge in [Gdk.WindowEdge.NORTH_EAST, Gdk.WindowEdge.SOUTH_WEST]: cursor_type = Gdk.CursorType.TOP_RIGHT_CORNER

        gdk_win.set_cursor(Gdk.Cursor.new_for_display(Gdk.Display.get_default(), cursor_type))
        return False

    def _on_root_button_press(self, widget, event):
        if event.button == 1 and not self.is_maximized():
            alloc = self.get_allocation()
            edge = self._check_resize_edge(event.x, event.y, alloc.width, alloc.height)
            if edge is not None:
                self.begin_resize_drag(edge, event.button, int(event.x_root), int(event.y_root), event.time)
                return True
        return False

    def _toggle_maximize(self, *args):
        if self.is_maximized():
            self.unmaximize()
            self.root_frame.get_style_context().remove_class("maximized")
            self.btn_max.set_label("▢")
        else:
            self.maximize()
            self.root_frame.get_style_context().add_class("maximized")
            self.btn_max.set_label("❐")

    def _apply_tile_geometry(self, mode):
        display = Gdk.Display.get_default()
        gdk_win = self.get_window()
        if not display or not gdk_win: return
        monitor = display.get_monitor_at_window(gdk_win) or display.get_primary_monitor() or display.get_monitor(0)
        geom = monitor.get_geometry()

        if not getattr(self, '_is_snapped', False):
            alloc = self.get_allocation()
            self._normal_width = alloc.width
            self._normal_height = alloc.height
        self._is_snapped = True

        half_w = geom.width // 2
        half_h = geom.height // 2

        if mode == 'left_half':
            self.move(geom.x, geom.y)
            self.resize(half_w, geom.height)
        elif mode == 'right_half':
            self.move(geom.x + half_w, geom.y)
            self.resize(half_w, geom.height)
        elif mode == 'top_left_quarter':
            self.move(geom.x, geom.y)
            self.resize(half_w, half_h)
        elif mode == 'top_right_quarter':
            self.move(geom.x + half_w, geom.y)
            self.resize(half_w, half_h)
        elif mode == 'bottom_left_quarter':
            self.move(geom.x, geom.y + half_h)
            self.resize(half_w, half_h)
        elif mode == 'bottom_right_quarter':
            self.move(geom.x + half_w, geom.y + half_h)
            self.resize(half_w, half_h)

    def _check_and_snap_cursor(self, root_x, root_y, threshold=45):
        display = Gdk.Display.get_default()
        gdk_win = self.get_window()
        if not display: return False
        monitor = (display.get_monitor_at_window(gdk_win) if gdk_win else None) or display.get_primary_monitor() or display.get_monitor(0)
        geom = monitor.get_geometry()

        rel_x = root_x - geom.x
        rel_y = root_y - geom.y

        is_left = rel_x <= threshold
        is_right = rel_x >= (geom.width - threshold)
        is_top = rel_y <= threshold
        is_bottom = rel_y >= (geom.height - threshold)
        corner_margin = 100

        if is_top and (rel_x <= corner_margin):
            self._apply_tile_geometry('top_left_quarter')
            return True
        elif is_top and (rel_x >= geom.width - corner_margin):
            self._apply_tile_geometry('top_right_quarter')
            return True
        elif is_bottom and (rel_x <= corner_margin):
            self._apply_tile_geometry('bottom_left_quarter')
            return True
        elif is_bottom and (rel_x >= geom.width - corner_margin):
            self._apply_tile_geometry('bottom_right_quarter')
            return True
        elif is_left:
            self._apply_tile_geometry('left_half')
            return True
        elif is_right:
            self._apply_tile_geometry('right_half')
            return True
        elif is_top:
            self.maximize()
            return True
        return False

    def _on_header_drag(self, widget, event):
        if event.button == 1 and event.type == Gdk.EventType.BUTTON_PRESS:
            if self.is_maximized():
                self._toggle_maximize()
            elif getattr(self, '_is_snapped', False):
                self._is_snapped = False
                if hasattr(self, '_normal_width') and hasattr(self, '_normal_height'):
                    self.resize(self._normal_width, self._normal_height)

            self.begin_move_drag(event.button, int(event.x_root), int(event.y_root), event.time)
            
            def _track_release():
                device_mgr = Gdk.Display.get_default().get_device_manager()
                pointer = device_mgr.get_client_pointer()
                _, root_x, root_y, mask = pointer.get_position()
                if mask & Gdk.ModifierType.BUTTON1_MASK:
                    return True
                self._check_and_snap_cursor(root_x, root_y, threshold=30)
                return False

            GLib.timeout_add(50, _track_release)
        elif event.button == 1 and event.type == Gdk.EventType._2BUTTON_PRESS:
            self._toggle_maximize()

    # ==========================================
    # SAYFA 1: PAKET SEÇİM & DROPZONE (KURAL 1)
    # ==========================================
    def _build_page_select(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        box.set_valign(Gtk.Align.CENTER)
        box.set_halign(Gtk.Align.FILL)
        box.set_hexpand(True)

        # Bento Dropzone Kartı
        dropzone = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        dropzone.get_style_context().add_class("settings-card")
        dropzone.set_margin_top(30)
        dropzone.set_margin_bottom(20)
        dropzone.set_margin_start(40)
        dropzone.set_margin_end(40)

        icon = Gtk.Image.new_from_icon_name("package-x-generic-symbolic", Gtk.IconSize.DIALOG)
        icon.set_pixel_size(64)
        icon.set_margin_top(20)
        dropzone.pack_start(icon, False, False, 0)

        title = Gtk.Label(label="Kurulacak Paketi Seçin veya Buraya Sürükleyin")
        title.get_style_context().add_class("header-title")
        dropzone.pack_start(title, False, False, 0)

        sub = Gtk.Label(label="Desteklenen Formatlar: .deb • .rpm • .AppImage • .tar.gz / .zip • .pkg.tar.zst")
        sub.get_style_context().add_class("setting-subtitle")
        self.dropzone_sub = sub
        dropzone.pack_start(sub, False, False, 0)

        btn_browse = Gtk.Button(label="Dosya Seç (.deb / Linux Paketi)")
        btn_browse.get_style_context().add_class("btn-primary")
        btn_browse.set_halign(Gtk.Align.CENTER)
        btn_browse.set_margin_bottom(24)
        btn_browse.connect("clicked", lambda b: self._open_file_chooser())
        dropzone.pack_start(btn_browse, False, False, 0)

        # Sürükle & Bırak (Drag & Drop) Desteği
        dropzone_eb = Gtk.EventBox()
        dropzone_eb.add(dropzone)
        self._setup_drag_and_drop(dropzone_eb)

        box.pack_start(dropzone_eb, False, False, 0)

        # Hızlı Örnek / İndirilenler Test Paketleri
        recent_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        recent_box.set_margin_start(40)
        recent_box.set_margin_end(40)

        rec_title = Gtk.Label(label="İNDİRİLENLER KLASÖRÜNDEKİ PAKETLER")
        rec_title.get_style_context().add_class("nav-section-title")
        rec_title.set_halign(Gtk.Align.START)
        recent_box.pack_start(rec_title, False, False, 0)

        # Bulunan paketleri listele
        found = scan_download_packages()
        if found:
            for idx, p_path in enumerate(found):
                card = build_recent_pkg_card(p_path, f"recent-pkg-card-{idx}", self.load_package)
                recent_box.pack_start(card, False, False, 0)
        else:
            no_pkg = Gtk.Label(label="İndirilenler klasöründe paket bulunamadı. Yukarıdan dosya seçebilirsiniz.")
            no_pkg.get_style_context().add_class("setting-subtitle")
            recent_box.pack_start(no_pkg, False, False, 0)

        box.pack_start(recent_box, False, False, 0)
        return box

    def _setup_drag_and_drop(self, widget):
        widget.drag_dest_set(Gtk.DestDefaults.ALL, [], Gdk.DragAction.COPY)
        widget.drag_dest_add_uri_targets()
        def _on_drag_data_received(w, context, x, y, data, info, time):
            uris = data.get_uris()
            if uris:
                from urllib.parse import unquote, urlparse
                path = unquote(urlparse(uris[0]).path)
                self.load_package(path)
            context.finish(True, False, time)
        widget.connect("drag-data-received", _on_drag_data_received)

    def _open_file_chooser(self):
        dialog = Gtk.FileChooserDialog(
            title="Kurulacak Paketi Seçin",
            parent=self,
            action=Gtk.FileChooserAction.OPEN
        )
        dialog.add_button("İptal", Gtk.ResponseType.CANCEL)
        dialog.add_button("Paketi Aç", Gtk.ResponseType.OK)

        filt = Gtk.FileFilter()
        filt.set_name("Linux Paketleri (*.deb, *.rpm, *.AppImage, *.tar.*, *.zip)")
        filt.add_pattern("*.deb")
        filt.add_pattern("*.rpm")
        filt.add_pattern("*.AppImage")
        filt.add_pattern("*.appimage")
        filt.add_pattern("*.tar.gz")
        filt.add_pattern("*.tar.xz")
        filt.add_pattern("*.tar.bz2")
        filt.add_pattern("*.zip")
        filt.add_pattern("*.pkg.tar.zst")
        dialog.add_filter(filt)

        all_filt = Gtk.FileFilter()
        all_filt.set_name("Tüm Dosyalar")
        all_filt.add_pattern("*")
        dialog.add_filter(all_filt)

        res = dialog.run()
        if res == Gtk.ResponseType.OK:
            path = dialog.get_filename()
            dialog.destroy()
            self.load_package(path)
        else:
            dialog.destroy()

    # ==========================================
    # PAKETİ YÜKLEME VE ANALİZ
    # ==========================================
    def load_package(self, file_path):
        if getattr(self, "_pkg_loading", False):
            return
        self._pkg_loading = True
        self.toast_service.show("Paket analiz ediliyor ve açılıyor...", type="info")

        def _work():
            try:
                pkg = PackageInspector.inspect(file_path)
                GLib.idle_add(self._on_package_loaded, pkg)
            except Exception as e:
                GLib.idle_add(self._on_package_load_failed, str(e))

        threading.Thread(target=_work, daemon=True).start()

    def _on_package_loaded(self, pkg):
        self._pkg_loading = False
        self.pkg = pkg
        self._update_details_ui()
        self.header_nav_box.set_visible(True)
        self.stack.set_visible_child_name("details")
        self._switch_details_tab("overview")
        self.toast_service.show(f"{self.pkg.name} başarıyla çözümlendi.", type="success")
        return False

    def _on_package_load_failed(self, error):
        self._pkg_loading = False
        self.toast_service.show(f"Paket okunamadı: {error}", type="error")
        return False

    # ==========================================
    # SAYFA 2: DETAYLAR, DOSYALAR & ÖN AYARLAR
    # ==========================================
    def _build_page_details(self):
        container = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)

        # Üst Özet Kartı (Kural 4: 44px simge, paket adı, canlı durum noktası)
        self.summary_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        self.summary_card.get_style_context().add_class("settings-card")
        self.summary_card.set_margin_bottom(4)

        self.summary_icon = Gtk.Image.new_from_icon_name("package-x-generic", Gtk.IconSize.DIALOG)
        self.summary_icon.set_pixel_size(44)
        self.summary_card.pack_start(self.summary_icon, False, False, 4)

        v_summary = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        v_summary.set_valign(Gtk.Align.CENTER)

        self.lbl_pkg_name = Gtk.Label(label="Paket Adı")
        self.lbl_pkg_name.get_style_context().add_class("device-name")
        self.lbl_pkg_name.set_halign(Gtk.Align.START)
        v_summary.pack_start(self.lbl_pkg_name, False, False, 0)

        self.lbl_pkg_sub = Gtk.Label(label="Sürüm • Mimari • Boyut")
        self.lbl_pkg_sub.get_style_context().add_class("device-mac")
        self.lbl_pkg_sub.set_halign(Gtk.Align.START)
        v_summary.pack_start(self.lbl_pkg_sub, False, False, 0)

        self.lbl_pkg_status = Gtk.Label()
        self.lbl_pkg_status.set_halign(Gtk.Align.START)
        v_summary.pack_start(self.lbl_pkg_status, False, False, 2)

        self.summary_card.pack_start(v_summary, True, True, 0)

        # Doğrudan Kurulum & Kaldırma Butonları
        self.btn_start_install = Gtk.Button(label="Kurulumu Başlat")
        self.btn_start_install.get_style_context().add_class("btn-primary")
        self.btn_start_install.set_valign(Gtk.Align.CENTER)
        self.btn_start_install.connect("clicked", lambda b: self._start_installation())
        self.summary_card.pack_end(self.btn_start_install, False, False, 4)

        self.btn_uninstall_pkg = Gtk.Button(label="Sistemden Kaldır")
        self.btn_uninstall_pkg.get_style_context().add_class("btn-danger")
        self.btn_uninstall_pkg.set_valign(Gtk.Align.CENTER)
        self.btn_uninstall_pkg.connect("clicked", lambda b: self._start_uninstallation())
        self.btn_uninstall_pkg.set_no_show_all(True)
        self.btn_uninstall_pkg.set_visible(False)
        self.summary_card.pack_end(self.btn_uninstall_pkg, False, False, 4)

        container.pack_start(self.summary_card, False, False, 0)

        # Alt Sekmeler (Details Stack)
        self.details_stack = Gtk.Stack()
        self.details_stack.set_transition_type(Gtk.StackTransitionType.CROSSFADE)
        container.pack_start(self.details_stack, True, True, 0)

        # 1. Özet Sekmesi
        self.tab_overview = self._build_tab_overview()
        self.details_stack.add_named(self.tab_overview, "overview")

        # 2. Dosya Ağacı Sekmesi (Kural 3)
        self.tab_files = self._build_tab_files()
        self.details_stack.add_named(self.tab_files, "files")

        # 3. Ön Ayarlar Sekmesi (Kural 2)
        self.tab_settings = self._build_tab_settings()
        self.details_stack.add_named(self.tab_settings, "settings")

        return container

    def _switch_details_tab(self, tab_name):
        self.details_stack.set_visible_child_name(tab_name)
        # Tab buton stillerini güncelle
        for name, btn in [("overview", self.btn_nav_overview), ("files", self.btn_nav_files), ("settings", self.btn_nav_settings)]:
            if name == tab_name:
                btn.get_style_context().add_class("active")
            else:
                btn.get_style_context().remove_class("active")

    def _build_tab_overview(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)

        # Bento Bilgi Kartları
        self.card_desc = self._create_info_card("Açıklama", "dialog-information-symbolic", "-")
        box.pack_start(self.card_desc["container"], False, False, 0)

        self.card_compat = self._create_info_card("Dağıtım Uyumluluğu", "emblem-system-symbolic", "-")
        box.pack_start(self.card_compat["container"], False, False, 0)

        self.card_maint = self._create_info_card("Bakımcı & Geliştirici", "avatar-default-symbolic", "-")
        box.pack_start(self.card_maint["container"], False, False, 0)

        self.card_deps = self._create_info_card("Bağımlılıklar (Dependencies)", "application-x-addon-symbolic", "-")
        box.pack_start(self.card_deps["container"], False, False, 0)

        self.card_sec = self._create_info_card("Güvenlik & Bütünlük Puanı", "security-high-symbolic", "-")
        box.pack_start(self.card_sec["container"], False, False, 0)

        return box

    def _create_info_card(self, title, icon_name, value):
        card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        card.get_style_context().add_class("settings-card")

        icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.BUTTON)
        card.pack_start(icon, False, False, 0)

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        vbox.set_valign(Gtk.Align.CENTER)

        t_lbl = Gtk.Label(label=title)
        t_lbl.get_style_context().add_class("setting-title")
        t_lbl.set_halign(Gtk.Align.START)
        vbox.pack_start(t_lbl, False, False, 0)

        v_lbl = Gtk.Label(label=value)
        v_lbl.get_style_context().add_class("setting-subtitle")
        v_lbl.set_halign(Gtk.Align.START)
        v_lbl.set_line_wrap(True)
        v_lbl.set_selectable(True)
        vbox.pack_start(v_lbl, False, False, 0)

        card.pack_start(vbox, True, True, 0)
        return {"container": card, "val_lbl": v_lbl, "icon": icon}

    # ==========================================
    # KURAL 3: ARAMA DESTEKLİ DOSYA LİSTESİ
    # ==========================================
    def _build_tab_files(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)

        # 1. Üst Arama Çubuğu (Kural 3.1)
        search_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.file_search = Gtk.SearchEntry()
        self.file_search.set_placeholder_text("Paket içindeki dosyalarda ara...")
        self.file_search.get_style_context().add_class("termius-search")
        self.file_search.set_hexpand(True)
        search_row.pack_start(self.file_search, True, True, 0)

        # Scriptleri İncele Butonu
        self.btn_view_scripts = Gtk.Button(label="Scriptleri Gör (preinst/postinst)")
        self.btn_view_scripts.get_style_context().add_class("btn-secondary")
        self.btn_view_scripts.connect("clicked", lambda b: self._show_scripts_dialog())
        search_row.pack_end(self.btn_view_scripts, False, False, 0)

        box.pack_start(search_row, False, False, 0)

        # 2. Kaydırılabilir Liste (Kural 3.2: ScrolledWindow içinde ListBox)
        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        scroll.set_size_request(-1, 320)
        box.pack_start(scroll, True, True, 0)

        self.files_listbox = Gtk.ListBox()
        self.files_listbox.set_selection_mode(Gtk.SelectionMode.NONE)
        scroll.add(self.files_listbox)

        # 4. Gerçek Zamanlı Filtreleme (Kural 3.4)
        def filter_func(row):
            q = self.file_search.get_text().strip().lower()
            if not q: return True
            return q in getattr(row, 'file_path_text', '').lower()

        self.files_listbox.set_filter_func(filter_func)
        self.file_search.connect("search-changed", lambda e: self.files_listbox.invalidate_filter())

        return box

    def _show_scripts_dialog(self):
        if not self.pkg or not self.pkg.scripts:
            self.toast_service.show("Bu pakette kurulum scripti bulunmuyor.", type="info")
            return

        dialog = BentoDialog(title="Kurulum Scriptleri İnceleme", parent=self, icon_name="text-x-script-symbolic", default_width=560, default_height=480)
        dialog.add_bento_action_button("Kapat", Gtk.ResponseType.OK, is_primary=True)
        content = dialog.get_bento_content()

        sc = Gtk.ScrolledWindow()
        sc.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        content.pack_start(sc, True, True, 0)

        v = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        sc.add(v)

        for s_name, s_content in self.pkg.scripts.items():
            card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
            card.get_style_context().add_class("settings-card")

            t = Gtk.Label(label=f"Script: {s_name}")
            t.get_style_context().add_class("setting-title")
            t.set_halign(Gtk.Align.START)
            card.pack_start(t, False, False, 0)

            tv = Gtk.TextView()
            tv.set_editable(False)
            tv.set_monospace(True)
            tv.get_buffer().set_text(s_content)
            card.pack_start(tv, False, False, 0)
            v.pack_start(card, False, False, 0)

        dialog.show_all()
        dialog.run()
        dialog.destroy()

    # ==========================================
    # KURAL 2: BENTO SWITCH VE ÖN AYAR KARTLARI
    # ==========================================
    def _build_tab_settings(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)

        # 1. Masaüstü Kısayolu
        box.pack_start(self._create_switch_card(
            title="Masaüstü & Menü Kısayolu Ekle",
            sub="Uygulama menüsüne (.desktop) ve masaüstüne başlatıcı simge kaydeder.",
            icon_name="user-desktop-symbolic",
            key="create_desktop_shortcut"
        ), False, False, 0)

        # 2. Terminal Sembolik Bağı (PATH)
        box.pack_start(self._create_switch_card(
            title="Terminalden Doğrudan Çalıştırma Kısayolu",
            sub="Komut satırından paket adıyla anında açılabilmesi için PATH (/usr/local/bin) bağı oluşturur.",
            icon_name="utilities-terminal-symbolic",
            key="create_terminal_link"
        ), False, False, 0)

        # 3. ULAK Kalkanı Ağ İzni
        box.pack_start(self._create_switch_card(
            title="ULAK Güvenlik Duvarı İzni",
            sub="Kurulacak uygulamanın giden internet bağlantılarını güvenlik duvarında otomatik izinlendirir.",
            icon_name="security-high-symbolic",
            key="firewall_allow"
        ), False, False, 0)

        # 4. Bağımlılıkları Otomatik Onar
        box.pack_start(self._create_switch_card(
            title="Eksik Bağımlılıkları Otomatik Çöz",
            sub="Kurulum esnasında sistem paket depolarından eksik bağımlılıkları otomatik tamamlar (apt -f).",
            icon_name="system-software-update-symbolic",
            key="auto_fix_deps"
        ), False, False, 0)

        # 5. İzole Kullanıcı Alanı (Sandbox)
        box.pack_start(self._create_switch_card(
            title="İzole Kullanıcı Alanı Kurulumu (~/.local)",
            sub="Root (kök) şifresi gerektirmeden, dosyaları yalnızca geçerli kullanıcının ev dizinine ayıklar.",
            icon_name="folder-home-symbolic",
            key="user_sandbox"
        ), False, False, 0)

        # 6. Kurulum Öncesi Derin Güvenlik Taraması
        box.pack_start(self._create_switch_card(
            title="ULAK Antivirüs & Ters Bağlantı Taraması",
            sub="Paket içindeki script ve ikilileri şüpheli kabuk komutlarına karşı önceden denetler.",
            icon_name="dialog-password-symbolic",
            key="deep_security_scan"
        ), False, False, 0)

        return box

    def _create_switch_card(self, title, sub, icon_name, key):
        """Kural 2: Birebir Proxy / Bento Switch Kartı Şablonu."""
        card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        card.get_style_context().add_class("settings-card")

        # Sol İkon
        icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.BUTTON)
        card.pack_start(icon, False, False, 0)

        # Orta Metinler
        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        t_lbl = Gtk.Label(label=title)
        t_lbl.get_style_context().add_class("setting-title")
        t_lbl.set_halign(Gtk.Align.START)

        s_lbl = Gtk.Label(label=sub)
        s_lbl.get_style_context().add_class("setting-subtitle")
        s_lbl.set_halign(Gtk.Align.START)
        s_lbl.set_line_wrap(True)

        vbox.pack_start(t_lbl, False, False, 0)
        vbox.pack_start(s_lbl, False, False, 0)
        card.pack_start(vbox, True, True, 0)

        # Sağ Toggle (Switch)
        switch = Gtk.Switch()
        switch.set_valign(Gtk.Align.CENTER)
        switch.set_active(self.settings.get(key, True))
        
        def _on_toggled(sw, gparam):
            self.settings[key] = sw.get_active()
        switch.connect("notify::active", _on_toggled)
        card.pack_end(switch, False, False, 0)

        return card

    # ==========================================
    # SAYFA 3: YÜKLEME EKRANI & DAİRESEL GRAFİK (KURAL 6)
    # ==========================================
    def _build_page_install(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        box.set_valign(Gtk.Align.FILL)
        box.set_margin_start(20)
        box.set_margin_end(20)
        box.set_margin_top(8)
        box.set_margin_bottom(8)

        # Üst İlerleme Kartı (Bento)
        prog_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=16)
        prog_card.get_style_context().add_class("settings-card")
        prog_card.set_margin_top(4)

        # Kural 6: Cairo Dairesel Pasta Grafiği
        self.install_graph = UsageGraph(color_rgba=(0.06, 0.72, 0.5, 1.0), size=86)
        prog_card.pack_start(self.install_graph, False, False, 10)

        v_info = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        v_info.set_valign(Gtk.Align.CENTER)

        self.lbl_install_title = Gtk.Label(label="Paket Kuruluyor...")
        self.lbl_install_title.get_style_context().add_class("header-title")
        self.lbl_install_title.set_halign(Gtk.Align.START)
        v_info.pack_start(self.lbl_install_title, False, False, 0)

        self.lbl_install_status = Gtk.Label(label="İşlem başlatılıyor...")
        self.lbl_install_status.get_style_context().add_class("setting-subtitle")
        self.lbl_install_status.set_halign(Gtk.Align.START)
        v_info.pack_start(self.lbl_install_status, False, False, 0)

        prog_card.pack_start(v_info, True, True, 0)
        box.pack_start(prog_card, False, False, 0)

        # Canlı Log / Terminal Çıktısı (Bento Box içinde Monospace)
        log_frame = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        log_frame.get_style_context().add_class("settings-card")

        lbl_log_title = Gtk.Label(label="KURULUM VE SİSTEM GÜNLÜĞÜ")
        lbl_log_title.get_style_context().add_class("nav-section-title")
        lbl_log_title.set_halign(Gtk.Align.START)
        log_frame.pack_start(lbl_log_title, False, False, 0)

        sc_log = Gtk.ScrolledWindow()
        sc_log.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        sc_log.set_size_request(-1, 105)
        sc_log.set_vexpand(True)

        self.tv_log = Gtk.TextView()
        self.tv_log.set_editable(False)
        self.tv_log.set_monospace(True)
        self.tv_log.get_style_context().add_class("terminal-output")
        sc_log.add(self.tv_log)
        log_frame.pack_start(sc_log, True, True, 0)

        box.pack_start(log_frame, True, True, 0)

        # Kurulum Tamamlanınca Açılan Aksiyon Butonları
        self.action_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.action_box.set_halign(Gtk.Align.END)
        self.action_box.set_margin_top(6)
        self.action_box.set_margin_bottom(6)

        self.btn_launch_app = Gtk.Button(label="Uygulamayı Başlat")
        self.btn_launch_app.get_style_context().add_class("btn-primary")
        self.btn_launch_app.connect("clicked", self._on_launch_app)
        self.action_box.pack_start(self.btn_launch_app, False, False, 0)

        self.btn_open_folder = Gtk.Button(label="Kurulum Konumunu Aç")
        self.btn_open_folder.get_style_context().add_class("btn-secondary")
        self.btn_open_folder.connect("clicked", self._on_open_folder)
        self.action_box.pack_start(self.btn_open_folder, False, False, 0)

        self.btn_new_install = Gtk.Button(label="Yeni Paket Yükle")
        self.btn_new_install.get_style_context().add_class("btn-secondary")
        self.btn_new_install.connect("clicked", lambda b: self.stack.set_visible_child_name("select"))
        self.action_box.pack_start(self.btn_new_install, False, False, 0)

        self.action_box.set_no_show_all(True)
        self.action_box.set_visible(False)
        box.pack_start(self.action_box, False, False, 0)

        return box

    def _start_installation(self):
        if not self.pkg: return

        self.stack.set_visible_child_name("install")
        self.header_nav_box.set_visible(False)
        self.action_box.set_visible(False)
        self.install_graph.set_fraction(0.0)
        self.install_graph.set_color((0.06, 0.72, 0.5, 1.0))
        self.lbl_install_title.set_label(f"{self.pkg.name} Kuruluyor...")
        self.tv_log.get_buffer().set_text("")

        installer = PackageInstaller(self.pkg, self.settings)

        def _on_progress(val):
            GLib.idle_add(self.install_graph.set_fraction, val)

        def _on_status(msg):
            GLib.idle_add(self.lbl_install_status.set_label, msg)

        def _on_log(line):
            def _append():
                buf = self.tv_log.get_buffer()
                buf.insert(buf.get_end_iter(), line + "\n")
                mark = buf.create_mark(None, buf.get_end_iter(), False)
                self.tv_log.scroll_to_mark(mark, 0.05, True, 0.0, 1.0)
            GLib.idle_add(_append)

        def _on_complete(success, message):
            def _done():
                if success:
                    self.install_graph.set_fraction(1.0)
                    self.lbl_install_title.set_label("Kurulum Başarıyla Tamamlandı!")
                    self.lbl_install_status.set_label(message)
                    self.btn_launch_app.set_visible(True)
                    self.btn_open_folder.set_visible(True)
                    self.btn_new_install.set_visible(True)
                    self.action_box.set_visible(True)
                    self.action_box.show_all()
                    self.toast_service.show(f"{self.pkg.name} başarıyla kuruldu!", type="success")
                    
                    # Sayfa kaydırma ve butonları net gösterme
                    def _scroll():
                        adj = self.main_scroll.get_vadjustment()
                        if adj:
                            adj.set_value(adj.get_upper())
                        return False
                    GLib.timeout_add(120, _scroll)
                else:
                    self.install_graph.set_color((0.9, 0.2, 0.2, 1.0))
                    self.lbl_install_title.set_label("Kurulum Başarısız Oldu")
                    self.lbl_install_status.set_label(message)
                    self.btn_new_install.set_visible(True)
                    self.action_box.set_visible(True)
                    self.toast_service.show(f"Kurulum hatası: {message}", type="error")
            GLib.idle_add(_done)

        installer.install_async(_on_progress, _on_status, _on_log, _on_complete)

    def _start_uninstallation(self):
        if not self.pkg: return

        self.stack.set_visible_child_name("install")
        self.header_nav_box.set_visible(False)
        self.action_box.set_visible(False)
        self.install_graph.set_fraction(0.0)
        self.install_graph.set_color((0.9, 0.2, 0.2, 1.0))
        self.lbl_install_title.set_label(f"{self.pkg.name} Sistemden Kaldırılıyor...")
        self.tv_log.get_buffer().set_text("")

        installer = PackageInstaller(self.pkg, self.settings)

        def _on_progress(val):
            GLib.idle_add(self.install_graph.set_fraction, val)

        def _on_status(msg):
            GLib.idle_add(self.lbl_install_status.set_label, msg)

        def _on_log(line):
            def _append():
                buf = self.tv_log.get_buffer()
                buf.insert(buf.get_end_iter(), line + "\n")
                mark = buf.create_mark(None, buf.get_end_iter(), False)
                self.tv_log.scroll_to_mark(mark, 0.05, True, 0.0, 1.0)
            GLib.idle_add(_append)

        def _on_complete(success, message):
            def _done():
                if success:
                    self.install_graph.set_fraction(1.0)
                    self.lbl_install_title.set_label("Paket Kaldırıldı")
                    self.lbl_install_status.set_label(message)
                    self.btn_launch_app.set_visible(False)
                    self.btn_open_folder.set_visible(False)
                    self.btn_new_install.set_visible(True)
                    self.action_box.set_visible(True)
                    self.toast_service.show(f"{self.pkg.name} kaldırıldı.", type="warning")

                    # Güncelleme: KALDIRILANLAR -> KIRMIZI
                    for c in ["card-status-installed", "card-status-ready", "card-status-removed"]:
                        self.summary_card.get_style_context().remove_class(c)
                    self.summary_card.get_style_context().add_class("card-status-removed")
                    self.lbl_pkg_status.set_markup("<span background='white' foreground='#b91c1c' size='small'><b>  ✕ Kaldırıldı (Tekrar Kur)  </b></span>")
                    self.btn_start_install.set_label("Tekrar Kur")
                    self.btn_uninstall_pkg.set_visible(False)
                else:
                    self.lbl_install_title.set_label("Kaldırma Başarısız")
                    self.lbl_install_status.set_label(message)
                    self.btn_new_install.set_visible(True)
                    self.action_box.set_visible(True)
                    self.toast_service.show(f"Kaldırma hatası: {message}", type="error")
            GLib.idle_add(_done)

        installer.uninstall_async(_on_progress, _on_status, _on_log, _on_complete)

    def _on_launch_app(self, widget):
        if not self.pkg: return
        try:
            import shutil
            bin_path, full_cmd = self.pkg.get_resolved_executable()

            # 1. Desktop dosyası ile gtk-launch denemesi
            desktops = [os.path.basename(f["path"]).replace(".desktop", "") for f in self.pkg.files if f["path"].endswith(".desktop")]
            launched = False
            for d in desktops:
                if shutil.which("gtk-launch"):
                    try:
                        ret = subprocess.run(["gtk-launch", d], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        if ret.returncode == 0:
                            launched = True
                            break
                    except Exception:
                        pass

            # 2. Doğrudan ikiliyi çalıştır
            if not launched:
                cmd_parts = full_cmd.split() if full_cmd else [bin_path]
                try:
                    subprocess.Popen(cmd_parts, start_new_session=True)
                    launched = True
                except PermissionError:
                    alt_bin = shutil.which(self.pkg.name) or shutil.which(self.pkg.name.lower())
                    if alt_bin:
                        subprocess.Popen([alt_bin], start_new_session=True)
                        launched = True
                    else:
                        raise

            self.toast_service.show(f"{self.pkg.name} başlatıldı.", type="success")
        except Exception as e:
            self.toast_service.show(f"Uygulama başlatılamadı: {e}", type="error")

    def _on_open_folder(self, widget):
        if not self.pkg: return
        target_dir = "/usr/bin"
        if self.settings.get("user_sandbox", False):
            target_dir = os.path.expanduser(f"~/.local/share/ulak/apps/{self.pkg.name}")
        subprocess.Popen(["xdg-open", target_dir])

    # ==========================================
    # VERİ GÜNCELLEME METODU
    # ==========================================
    def _update_details_ui(self):
        if not self.pkg: return

        # Özet Kartı
        self.lbl_pkg_name.set_label(self.pkg.name)
        self.lbl_pkg_sub.set_label(f"v{self.pkg.version or '1.0'} • {self.pkg.architecture} • Dosya: {self.pkg.formatted_file_size} • Kurulu: {self.pkg.formatted_installed_size}")

        # RENK KURALI:
        # Yüklü -> BEYAZ
        # Yüklenmeye Hazır -> YEŞİL
        # Kaldırılanlar -> KIRMIZI
        is_inst = self.pkg.is_installed_on_system()

        # Temizle ve yeni sınıfı ekle
        for c in ["card-status-installed", "card-status-ready", "card-status-removed"]:
            self.summary_card.get_style_context().remove_class(c)

        if is_inst:
            # YÜKLÜ: BEYAZ
            self.summary_card.get_style_context().add_class("card-status-installed")
            st_markup = "<span background='#dcfce7' foreground='#15803d' size='small'><b>  ● Sistemde Yüklü  </b></span>"
            self.btn_start_install.set_label("Yeniden Kur")
            self.btn_uninstall_pkg.set_visible(True)
        else:
            # YÜKLENMEYE HAZIR: YEŞİL
            self.summary_card.get_style_context().add_class("card-status-ready")
            st_markup = "<span background='white' foreground='#047857' size='small'><b>  ＋ Yüklemeye Hazır (Kur)  </b></span>"
            self.btn_start_install.set_label("Kurulumu Başlat")
            self.btn_uninstall_pkg.set_visible(False)

        self.lbl_pkg_status.set_markup(st_markup)

        # Bilgi Kartları
        desc_text = self.pkg.description.strip() or "Açıklama belirtilmemiş."
        self.card_desc["val_lbl"].set_label(desc_text)

        compat_txt = self.pkg.compatibility_note
        self.card_compat["val_lbl"].set_label(compat_txt)

        maint_txt = self.pkg.maintainer or "Bilinmiyor"
        self.card_maint["val_lbl"].set_label(maint_txt)

        deps_txt = ", ".join(self.pkg.dependencies) if self.pkg.dependencies else "Bağımsız (Harici bağımlılık listelenmemiş)"
        self.card_deps["val_lbl"].set_label(deps_txt)

        sec_txt = f"Güvenlik Skoru: {self.pkg.security_score}/100 • SHA256: {self.pkg.sha256[:20]}..."
        if self.pkg.security_findings:
            sec_txt += "\nBulgular: " + " | ".join(self.pkg.security_findings)
        self.card_sec["val_lbl"].set_label(sec_txt)

        # Dosya Listesi (Kural 3.3)
        for child in self.files_listbox.get_children():
            self.files_listbox.remove(child)

        for f_info in self.pkg.files:
            row = Gtk.ListBoxRow()
            row.file_path_text = f_info["path"]

            row_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
            row_card.get_style_context().add_class("settings-card")
            row_card.set_margin_top(2)
            row_card.set_margin_bottom(2)

            f_icon_name = "folder-symbolic" if f_info["is_dir"] else ("application-x-executable-symbolic" if "/bin/" in f_info["path"] else "text-x-generic-symbolic")
            ic = Gtk.Image.new_from_icon_name(f_icon_name, Gtk.IconSize.BUTTON)
            row_card.pack_start(ic, False, False, 0)

            p_lbl = Gtk.Label(label=f_info["path"])
            p_lbl.get_style_context().add_class("setting-title")
            p_lbl.set_halign(Gtk.Align.START)
            p_lbl.set_ellipsize(Pango.EllipsizeMode.MIDDLE)
            row_card.pack_start(p_lbl, True, True, 0)

            if f_info["size"] > 0:
                s_lbl = Gtk.Label(label=self.pkg.human_size(f_info["size"]))
                s_lbl.get_style_context().add_class("setting-subtitle")
                row_card.pack_end(s_lbl, False, False, 4)

            row.add(row_card)
            self.files_listbox.add(row)

        self.files_listbox.show_all()


class PackageInstallerView(Gtk.ScrolledWindow):
    """
    Ana ULAK penceresi içine gömülebilen veya 'Ayrı Pencerede Aç'
    butonu ile bağımsız PackageInstallerWindow açabilen Bento görünümü.
    """
    def __init__(self, toast_service):
        super().__init__()
        self.toast_service = toast_service
        self.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)

        main_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        main_box.set_margin_top(16)
        main_box.set_margin_bottom(24)
        main_box.set_margin_start(24)
        main_box.set_margin_end(24)
        self.add(main_box)

        # Header Row
        header_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        
        titles = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        t = Gtk.Label(label="Evrensel Paket Yükleyici")
        t.get_style_context().add_class("header-title")
        t.set_halign(Gtk.Align.START)

        sub = Gtk.Label(label=".deb, .rpm, .AppImage, .tar ve tüm Linux paketlerini güvenle analiz edin ve kurun.")
        sub.get_style_context().add_class("header-sub")
        sub.set_halign(Gtk.Align.START)
        titles.pack_start(t, False, False, 0)
        titles.pack_start(sub, False, False, 0)
        header_row.pack_start(titles, True, True, 0)

        # Ayrı Pencerede Aç Butonu
        btn_popout = Gtk.Button(label="Ayrı Pencerede Aç ❐")
        btn_popout.get_style_context().add_class("btn-secondary")
        btn_popout.set_valign(Gtk.Align.CENTER)
        btn_popout.connect("clicked", lambda b: self.open_standalone_window())
        header_row.pack_end(btn_popout, False, False, 0)

        main_box.pack_start(header_row, False, False, 0)

        # Bento Dropzone Kartı
        dropzone = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        dropzone.get_style_context().add_class("settings-card")
        dropzone.set_margin_top(12)
        dropzone.set_margin_bottom(12)

        icon = Gtk.Image.new_from_icon_name("package-x-generic-symbolic", Gtk.IconSize.DIALOG)
        icon.set_pixel_size(56)
        icon.set_margin_top(16)
        dropzone.pack_start(icon, False, False, 0)

        title = Gtk.Label(label="Paket Dosyasını Seçin veya Sürükleyin")
        title.get_style_context().add_class("header-title")
        dropzone.pack_start(title, False, False, 0)

        btn_browse = Gtk.Button(label="Dosya Seç (.deb / RPM / AppImage)")
        btn_browse.get_style_context().add_class("btn-primary")
        btn_browse.set_halign(Gtk.Align.CENTER)
        btn_browse.set_margin_bottom(18)
        btn_browse.connect("clicked", lambda b: self._browse_and_open())
        dropzone.pack_start(btn_browse, False, False, 0)

        main_box.pack_start(dropzone, False, False, 0)

        # Hızlı Paketler
        lbl_recent = Gtk.Label(label="İNDİRİLENLERDEKİ PAKETLER")
        lbl_recent.get_style_context().add_class("nav-section-title")
        lbl_recent.set_halign(Gtk.Align.START)
        main_box.pack_start(lbl_recent, False, False, 0)

        dl_pkgs = scan_download_packages()
        for idx, p_path in enumerate(dl_pkgs):
            card = build_recent_pkg_card(p_path, f"embedded-pkg-card-{idx}",
                                         lambda p: self.open_standalone_window(p))
            main_box.pack_start(card, False, False, 0)
        if not dl_pkgs:
            no_pkg = Gtk.Label(label="İndirilenler klasöründe paket bulunamadı. Yukarıdan dosya seçebilirsiniz.")
            no_pkg.get_style_context().add_class("setting-subtitle")
            no_pkg.set_halign(Gtk.Align.START)
            main_box.pack_start(no_pkg, False, False, 0)

    def _browse_and_open(self):
        dialog = Gtk.FileChooserDialog(
            title="Kurulacak Paketi Seçin",
            parent=self.get_toplevel(),
            action=Gtk.FileChooserAction.OPEN
        )
        dialog.add_button("İptal", Gtk.ResponseType.CANCEL)
        dialog.add_button("Paketi Aç", Gtk.ResponseType.OK)

        res = dialog.run()
        if res == Gtk.ResponseType.OK:
            path = dialog.get_filename()
            dialog.destroy()
            self.open_standalone_window(path)
        else:
            dialog.destroy()

    def open_standalone_window(self, pkg_path=None):
        win = PackageInstallerWindow(initial_package_path=pkg_path, parent_window=self.get_toplevel())
        win.show_all()
        return win


def open_package_installer(pkg_path=None, parent=None):
    win = PackageInstallerWindow(initial_package_path=pkg_path, parent_window=parent)
    win.show_all()
    return win


if __name__ == "__main__":
    pkg_arg = sys.argv[1] if len(sys.argv) > 1 else None
    win = PackageInstallerWindow(initial_package_path=pkg_arg)
    win.connect("destroy", Gtk.main_quit)
    win.show_all()
    Gtk.main()
