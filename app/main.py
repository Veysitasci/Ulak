#!/usr/bin/env python3
import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, Gdk, GLib, GdkPixbuf
import os
import socket
import psutil
import sys
app_dir = os.path.dirname(os.path.abspath(__file__))
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

from i18n import _, i18n_instance
from theme import theme_mgr
from ui_shared import storage, ToastService, BentoDialog
from ui_bt import BluetoothView
from ui_wifi import WifiView
from ui_store import StoreView
from ui_hw import HardwareView
from ui_admin import AdminView
from ui_settings import SettingsView
from ui_hacker import HackerView
from ui_firewall import FirewallView
from api_firewall import fw_api

def get_ulak_logo_path(is_light_mode=False):
    """Dynamically find ULAK application logo from standard locations based on theme mode."""
    target_name = "ulak_logo_dark.png" if is_light_mode else "ulak_logo.png"
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "assets", target_name),
        os.path.join(os.path.dirname(__file__), "assets", target_name),
        f"/usr/lib/ulak/assets/{target_name}",
        os.path.join(os.path.dirname(__file__), "..", "assets", "ulak_logo.png"),
        os.path.join(os.path.dirname(__file__), "assets", "ulak_logo.png"),
        "/usr/share/icons/hicolor/512x512/apps/ulak.png",
        os.path.expanduser("~/.local/share/icons/ulak.png"),
        "/usr/lib/ulak/assets/ulak_logo.png",
        os.path.join(os.path.dirname(__file__), "..", "assets", "dolunay_logo.png"),
        os.path.join(os.path.dirname(__file__), "assets", "dolunay_logo.png")
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None

class WirelessManagerWindow(Gtk.Window):
    def __init__(self):
        super().__init__(title="ULAK - Ağ & Güvenlik Kiti")
        self.set_default_size(1080, 720)
        self.set_position(Gtk.WindowPosition.CENTER)
        self.set_decorated(False)  # Termius Frameless CSD Window
        self.set_resizable(True)
        # Allow resizing from borders and corners even when frameless
        geometry = Gdk.Geometry()
        geometry.min_width = 520
        geometry.min_height = 400
        self.set_geometry_hints(None, geometry, Gdk.WindowHints.MIN_SIZE)
        
        # Enable RGBA visual for rounded window corners
        screen = self.get_screen()
        visual = screen.get_rgba_visual()
        if visual and screen.is_composited():
            self.set_visual(visual)
        self.set_app_paintable(True)
        self.get_style_context().add_class("main-window")

        # Set app window icon
        try:
            logo_p = get_ulak_logo_path()
            if logo_p:
                self.set_icon_from_file(logo_p)
        except: pass

        # Apply saved settings
        saved_lang = storage.get_global("language", "tr")
        i18n_instance.set_lang(saved_lang)
        saved_theme_mode = storage.get_global("theme_mode", "dark")
        theme_mgr.apply_mode(saved_theme_mode)
        theme_mgr.add_theme_change_callback(self._on_theme_changed)

        self._build_ui()
        GLib.timeout_add_seconds(2, self._update_telemetry)
        
    def _build_ui(self):
        self.overlay = Gtk.Overlay()
        self.add(self.overlay)
        self.toast_service = ToastService(self.overlay)
        self.toast_service.main_window = self

        self.root_frame = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.root_frame.get_style_context().add_class("main-frame")
        
        # Connect window border drag events for corner/edge resizing
        self.add_events(Gdk.EventMask.POINTER_MOTION_MASK | Gdk.EventMask.BUTTON_PRESS_MASK | Gdk.EventMask.LEAVE_NOTIFY_MASK)
        self.connect("motion-notify-event", self._on_root_motion)
        self.connect("button-press-event", self._on_root_button_press)
        self.connect("size-allocate", self._on_size_allocate)

        self.overlay.add(self.root_frame)

        # 1. TOP HEADER BAR
        self._build_header(self.root_frame)

        # 2. MAIN BODY (Sidebar + Stack)
        body_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=0)
        self.root_frame.pack_start(body_box, True, True, 0)

        self.sidebar = self._build_sidebar(body_box)

        # Content Area (Stack)
        self.stack = Gtk.Stack()
        self.stack.set_transition_type(Gtk.StackTransitionType.CROSSFADE)

        self.firewall_view = FirewallView(self.toast_service)
        self.stack.add_named(self.firewall_view, "firewall")

        self.bt_view = BluetoothView(self.toast_service)
        self.stack.add_named(self.bt_view, "bt")

        self.wifi_view = WifiView(self.toast_service)
        self.stack.add_named(self.wifi_view, "wifi")

        self.hw_view = HardwareView(self.toast_service)
        self.stack.add_named(self.hw_view, "hw")

        self.admin_view = AdminView(self.toast_service)
        self.stack.add_named(self.admin_view, "admin")

        self.hacker_view = HackerView(self.toast_service)
        self.stack.add_named(self.hacker_view, "hack")

        self.store_view = StoreView(self.toast_service)
        self.stack.add_named(self.store_view, "store")

        self.settings_view = SettingsView(self.toast_service)
        self.stack.add_named(self.settings_view, "settings")

        # Load any installed external modules into stack immediately
        self._load_external_module_views()

        body_box.pack_start(self.stack, True, True, 0)

        # 3. BOTTOM FOOTER STATUS BAR
        self._build_footer(self.root_frame)

        # Start on Firewall view by default
        if hasattr(self, 'first_nav_btn') and self.first_nav_btn:
            self.first_nav_btn.set_active(True)
            self._on_nav_toggled(self.first_nav_btn, "firewall")
        self.show_all()
        self._update_telemetry()

    def _check_resize_edge(self, x, y, width, height, margin=8):
        edge = None
        if x < margin and y < margin:
            edge = Gdk.WindowEdge.NORTH_WEST
        elif x > width - margin and y < margin:
            edge = Gdk.WindowEdge.NORTH_EAST
        elif x < margin and y > height - margin:
            edge = Gdk.WindowEdge.SOUTH_WEST
        elif x > width - margin and y > height - margin:
            edge = Gdk.WindowEdge.SOUTH_EAST
        elif x < margin:
            edge = Gdk.WindowEdge.WEST
        elif x > width - margin:
            edge = Gdk.WindowEdge.EAST
        elif y < margin:
            edge = Gdk.WindowEdge.NORTH
        elif y > height - margin:
            edge = Gdk.WindowEdge.SOUTH
        return edge

    def _on_size_allocate(self, widget, allocation):
        # Responsive adaptation for 4-way split / narrow screens
        if allocation.width < 760:
            if hasattr(self, 'search_entry'):
                self.search_entry.set_visible(False)
            if hasattr(self, 'tab_box'):
                self.tab_box.set_visible(False)
        else:
            if hasattr(self, 'search_entry'):
                self.search_entry.set_visible(True)
            if hasattr(self, 'tab_box'):
                self.tab_box.set_visible(True)

    def _on_root_motion(self, widget, event):
        if self.is_maximized():
            return False
        alloc = self.get_allocation()
        edge = self._check_resize_edge(event.x, event.y, alloc.width, alloc.height)
        gdk_win = self.get_window()
        if not gdk_win:
            return False
        
        cursor_type = Gdk.CursorType.ARROW
        if edge in [Gdk.WindowEdge.NORTH, Gdk.WindowEdge.SOUTH]:
            cursor_type = Gdk.CursorType.SB_V_DOUBLE_ARROW
        elif edge in [Gdk.WindowEdge.EAST, Gdk.WindowEdge.WEST]:
            cursor_type = Gdk.CursorType.SB_H_DOUBLE_ARROW
        elif edge in [Gdk.WindowEdge.NORTH_WEST, Gdk.WindowEdge.SOUTH_EAST]:
            cursor_type = Gdk.CursorType.TOP_LEFT_CORNER
        elif edge in [Gdk.WindowEdge.NORTH_EAST, Gdk.WindowEdge.SOUTH_WEST]:
            cursor_type = Gdk.CursorType.TOP_RIGHT_CORNER
        
        cursor = Gdk.Cursor.new_for_display(Gdk.Display.get_default(), cursor_type)
        gdk_win.set_cursor(cursor)
        return False

    def _on_root_button_press(self, widget, event):
        if event.button == 1 and not self.is_maximized():
            alloc = self.get_allocation()
            edge = self._check_resize_edge(event.x, event.y, alloc.width, alloc.height)
            if edge is not None:
                self.begin_resize_drag(edge, event.button, int(event.x_root), int(event.y_root), event.time)
                return True
        return False

    def _build_header(self, parent):
        # EventBox for window drag (Termius frameless titlebar)
        event_box = Gtk.EventBox()
        event_box.connect("button-press-event", self._on_window_drag)

        header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        header.get_style_context().add_class("app-header")
        event_box.add(header)

        # Left: App Brand & Quick Tabs (Termius style)
        brand_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        brand_box.set_valign(Gtk.Align.CENTER)
        
        self.brand_logo_img = Gtk.Image()
        self._update_brand_logo(theme_mgr.is_light_mode)
        brand_box.pack_start(self.brand_logo_img, False, False, 0)

        title_lbl = Gtk.Label(label="ULAK")
        title_lbl.get_style_context().add_class("app-brand-title")
        brand_box.pack_start(title_lbl, False, False, 0)

        # Termius-style Tabs (Vaults / SFTP style)
        self.tab_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        tab_box = self.tab_box
        tab_box.set_margin_start(14)

        tab_fw = Gtk.Button(label="Kalkan")
        tab_fw.get_style_context().add_class("termius-tab")
        tab_fw.connect("clicked", lambda w: self._select_tab("firewall"))
        tab_box.pack_start(tab_fw, False, False, 0)

        tab_wifi = Gtk.Button(label="Ağ & Wi-Fi")
        tab_wifi.get_style_context().add_class("termius-tab")
        tab_wifi.connect("clicked", lambda w: self._select_tab("wifi"))
        tab_box.pack_start(tab_wifi, False, False, 0)

        tab_hw = Gtk.Button(label="Donanım")
        tab_hw.get_style_context().add_class("termius-tab")
        tab_hw.connect("clicked", lambda w: self._select_tab("hw"))
        tab_box.pack_start(tab_hw, False, False, 0)

        brand_box.pack_start(tab_box, False, False, 0)
        header.pack_start(brand_box, False, False, 0)

        # Center: Termius Search Entry
        center_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        center_box.set_hexpand(True)
        center_box.set_halign(Gtk.Align.CENTER)
        center_box.set_valign(Gtk.Align.CENTER)

        self.search_entry = Gtk.SearchEntry()
        self.search_entry.set_placeholder_text("Cihaz, kural, port veya IP ara...")
        self.search_entry.get_style_context().add_class("termius-search")
        center_box.pack_start(self.search_entry, False, False, 0)

        header.pack_start(center_box, True, True, 0)

        # Right: Notifications & Custom Window Control Buttons (—, ▢, ✕)
        actions_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=4)
        actions_box.set_valign(Gtk.Align.CENTER)

        notif_btn = Gtk.Button()
        notif_btn.set_image(Gtk.Image.new_from_icon_name("preferences-system-notifications-symbolic", Gtk.IconSize.BUTTON))
        notif_btn.get_style_context().add_class("win-btn")
        notif_btn.set_tooltip_text(_("btn_notifications"))
        notif_btn.connect("clicked", self._on_notifications_clicked)
        actions_box.pack_start(notif_btn, False, False, 0)

        # Minimize Button
        btn_min = Gtk.Button(label="—")
        btn_min.get_style_context().add_class("win-btn")
        btn_min.set_tooltip_text("Simge Durumuna Küçült")
        btn_min.connect("clicked", lambda w: self.iconify())
        actions_box.pack_start(btn_min, False, False, 0)

        # Maximize / Restore Button
        self.btn_max = Gtk.Button(label="▢")
        self.btn_max.get_style_context().add_class("win-btn")
        self.btn_max.set_tooltip_text("Büyüt / Küçült")
        self.btn_max.connect("clicked", self._toggle_maximize)
        actions_box.pack_start(self.btn_max, False, False, 0)

        # Close Button
        btn_close = Gtk.Button(label="✕")
        btn_close.get_style_context().add_class("win-btn")
        btn_close.get_style_context().add_class("win-btn-close")
        btn_close.set_tooltip_text("Kapat")
        btn_close.connect("clicked", lambda w: self.close())
        actions_box.pack_start(btn_close, False, False, 0)

        header.pack_start(actions_box, False, False, 0)
        parent.pack_start(event_box, False, False, 0)


    def _apply_tile_geometry(self, mode):
        """
        Modes:
        - 'left_half': x=0, y=0, w=mon_w//2, h=mon_h
        - 'right_half': x=mon_w//2, y=0, w=mon_w//2, h=mon_h
        - 'top_left_quarter': x=0, y=0, w=mon_w//2, h=mon_h//2
        - 'top_right_quarter': x=mon_w//2, y=0, w=mon_w//2, h=mon_h//2
        - 'bottom_left_quarter': x=0, y=mon_h//2, w=mon_w//2, h=mon_h//2
        - 'bottom_right_quarter': x=mon_w//2, y=mon_h//2, w=mon_w//2, h=mon_h//2
        """
        display = Gdk.Display.get_default()
        gdk_win = self.get_window()
        if not display or not gdk_win:
            return
            
        monitor = display.get_monitor_at_window(gdk_win) or display.get_primary_monitor() or display.get_monitor(0)
        geom = monitor.get_geometry()
        
        # Save previous normal size if not yet snapped
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

    def _check_and_snap_cursor(self, root_x, root_y, threshold=20):
        display = Gdk.Display.get_default()
        monitor = display.get_primary_monitor() or display.get_monitor(0)
        geom = monitor.get_geometry()
        
        rel_x = root_x - geom.x
        rel_y = root_y - geom.y
        
        # Corner 4-way detection
        is_left = rel_x <= threshold
        is_right = rel_x >= geom.width - threshold
        is_top = rel_y <= threshold
        is_bottom = rel_y >= geom.height - threshold
        
        if is_top and is_left:
            self._apply_tile_geometry('top_left_quarter')
            return True
        elif is_top and is_right:
            self._apply_tile_geometry('top_right_quarter')
            return True
        elif is_bottom and is_left:
            self._apply_tile_geometry('bottom_left_quarter')
            return True
        elif is_bottom and is_right:
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

    def _select_tab(self, page_name):
        btn_map = {
            "firewall": getattr(self, "btn_firewall", None),
            "wifi": getattr(self, "btn_wifi", None),
            "hw": getattr(self, "btn_hw", None),
        }
        btn = btn_map.get(page_name)
        if btn:
            btn.set_active(True)
        else:
            self.stack.set_visible_child_name(page_name)

    def _on_window_drag(self, widget, event):
        if event.button == 1 and event.type == Gdk.EventType.BUTTON_PRESS:
            if self.is_maximized():
                self._toggle_maximize()
            elif getattr(self, '_is_snapped', False):
                self._is_snapped = False
                if hasattr(self, '_normal_width') and hasattr(self, '_normal_height'):
                    self.resize(self._normal_width, self._normal_height)

            # Polling timer during drag to check if user released near screen border
            self._drag_start_x = int(event.x_root)
            self._drag_start_y = int(event.y_root)
            self.begin_move_drag(event.button, int(event.x_root), int(event.y_root), event.time)
            
            # Start a liveness tracker for edge release
            self._track_drag_release()
        elif event.button == 1 and event.type == Gdk.EventType._2BUTTON_PRESS:
            self._toggle_maximize()

    def _track_drag_release(self):
        def _check_mouse_release():
            # Query pointer root coordinates
            device_mgr = Gdk.Display.get_default().get_device_manager()
            pointer = device_mgr.get_client_pointer()
            _, root_x, root_y, mask = pointer.get_position()
            
            # If left mouse button is still pressed, continue tracking
            if mask & Gdk.ModifierType.BUTTON1_MASK:
                return True
                
            # Mouse has been released! Check if released at screen edge
            self._check_and_snap_cursor(root_x, root_y, threshold=24)
            return False

        GLib.timeout_add(50, _check_mouse_release)


    def _toggle_maximize(self, *args):
        if self.is_maximized():
            self.unmaximize()
            if hasattr(self, 'root_frame'):
                self.root_frame.get_style_context().remove_class("maximized")
            if hasattr(self, 'btn_max'):
                self.btn_max.set_label("▢")
        else:
            self.maximize()
            if hasattr(self, 'root_frame'):
                self.root_frame.get_style_context().add_class("maximized")
            if hasattr(self, 'btn_max'):
                self.btn_max.set_label("❐")

    def _update_brand_logo(self, is_light=False):
        logo_p = get_ulak_logo_path(is_light_mode=is_light)
        if logo_p and hasattr(self, "brand_logo_img"):
            try:
                pb = GdkPixbuf.Pixbuf.new_from_file_at_scale(logo_p, 24, 24, True)
                self.brand_logo_img.set_from_pixbuf(pb)
            except Exception as e:
                print("Failed to set brand logo:", e)

    def _on_theme_changed(self, is_light):
        self._update_brand_logo(is_light)

    def rebuild_sidebar(self):
        # Clear sidebar
        for child in self.sidebar.get_children():
            self.sidebar.remove(child)
        self.nav_group = None
        self._populate_sidebar()
        self.sidebar.show_all()

    def _build_sidebar(self, parent):
        self.sidebar = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        self.sidebar.get_style_context().add_class("sidebar-box")
        self.sidebar.set_size_request(180, -1)
        self.nav_group = None
        self._populate_sidebar()
        parent.pack_start(self.sidebar, False, False, 0)
        return self.sidebar
        
    def _populate_sidebar(self):
        import os, json
        
        # Scrolled Window for dynamic content
        self.sidebar_scroll = Gtk.ScrolledWindow()
        self.sidebar_scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.sidebar_scroll.get_style_context().add_class("sidebar-scroll")
        
        self.sidebar_scroll_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        self.sidebar_scroll.add(self.sidebar_scroll_box)
        
        self.sidebar.pack_start(self.sidebar_scroll, True, True, 0)
        
        # Bottom Fixed Box for System/Store/Settings
        self.sidebar_bottom_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        self.sidebar_bottom_box.set_margin_top(8)
        self.sidebar.pack_end(self.sidebar_bottom_box, False, False, 0)
        
        # Base categories (excluding Store and Settings, which are fixed at bottom)
        categories = {
            "GÜVENLİK": [
                {"id": "firewall", "icon": "security-high-symbolic", "name": _("tab_firewall").replace("🛡️", "").strip()},
                {"id": "hack", "icon": "system-search-symbolic", "name": _("tab_hacker")}
            ],
            "BAĞLANTI": [
                {"id": "bt", "icon": "bluetooth-active-symbolic", "name": _("tab_bluetooth")},
                {"id": "wifi", "icon": "network-wireless-symbolic", "name": _("tab_wifi")}
            ],
            "DONANIM": [
                {"id": "hw", "icon": "computer-symbolic", "name": _("tab_hw")},
                {"id": "admin", "icon": "security-medium-symbolic", "name": _("tab_admin")}
            ]
        }
        
        # Load external modules dynamically
        modules_dir = os.path.expanduser("~/.local/share/ulak/modules")
        if os.path.exists(modules_dir):
            for d in os.listdir(modules_dir):
                man_path = os.path.join(modules_dir, d, "manifest.json")
                if os.path.exists(man_path):
                    try:
                        with open(man_path, "r") as f:
                            man = json.load(f)
                        # Skip legacy test modules
                        if man["id"] in ["test_mod", "uzay_istasyonu"]:
                            continue
                            
                        cat = man.get("category", "EKSTRALAR").upper()
                        if cat not in categories:
                            categories[cat] = []
                        categories[cat].append({
                            "id": man["id"],
                            "icon": man.get("icon", "application-x-executable-symbolic"),
                            "name": _(man.get("name_key", man["id"]))
                        })
                        
                        # Dynamically add view to stack if not exists
                        if hasattr(self, 'stack') and self.stack.get_child_by_name(man["id"]) is None:
                            try:
                                import importlib
                                mod_name = f"ui_{man['id']}"
                                module = importlib.import_module(mod_name)
                                view_class = None
                                for attr_name in dir(module):
                                    attr = getattr(module, attr_name)
                                    if isinstance(attr, type) and issubclass(attr, Gtk.Widget) and attr_name.endswith("View"):
                                        view_class = attr
                                        break
                                if view_class:
                                    view_instance = view_class(self.toast_service)
                                    self.stack.add_named(view_instance, man["id"])
                                    self.stack.show_all()
                            except Exception as e:
                                print(f"Could not load UI for module {man['id']}: {e}")
                    except Exception as e:
                        print("Error loading module manifest", e)

        # UI Building helper
        def create_nav_btn(icon_name, text, name):
            btn = Gtk.RadioButton(group=self.nav_group)
            if not self.nav_group:
                self.nav_group = btn
            if not hasattr(self, 'first_nav_btn') or self.first_nav_btn is None:
                self.first_nav_btn = btn
            btn.set_mode(False)
            btn.get_style_context().add_class("sidebar-btn")
            
            box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
            icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.BUTTON)
            lbl = Gtk.Label(label=text)
            lbl.set_halign(Gtk.Align.START)
            
            box.pack_start(icon, False, False, 0)
            box.pack_start(lbl, True, True, 0)
            btn.add(box)
            btn.connect("toggled", self._on_nav_toggled, name)
            return btn
            
        # 1. Fill Scrollable Content
        for cat_name, items in categories.items():
            if not items: continue
            lbl_sec = Gtk.Label(label=cat_name.upper())
            lbl_sec.get_style_context().add_class("nav-section-title")
            lbl_sec.set_halign(Gtk.Align.START)
            self.sidebar_scroll_box.pack_start(lbl_sec, False, False, 0)
            
            for item in items:
                btn = create_nav_btn(item["icon"], item["name"], item["id"])
                self.sidebar_scroll_box.pack_start(btn, False, False, 0)
                
        # 2. Fill Bottom Fixed Content (Mağaza ve Ayarlar)
        lbl_fixed = Gtk.Label(label="SİSTEM")
        lbl_fixed.get_style_context().add_class("nav-section-title")
        lbl_fixed.set_halign(Gtk.Align.START)
        self.sidebar_bottom_box.pack_start(lbl_fixed, False, False, 0)
        
        btn_store = create_nav_btn("system-software-install-symbolic", _("tab_store"), "store")
        self.sidebar_bottom_box.pack_start(btn_store, False, False, 0)
        
        btn_settings = create_nav_btn("emblem-system-symbolic", _("settings"), "settings")
        self.sidebar_bottom_box.pack_start(btn_settings, False, False, 0)

    def _load_external_module_views(self):
        import os, json, importlib
        modules_dir = os.path.expanduser("~/.local/share/ulak/modules")
        if os.path.exists(modules_dir):
            for d in os.listdir(modules_dir):
                man_path = os.path.join(modules_dir, d, "manifest.json")
                if os.path.exists(man_path):
                    try:
                        with open(man_path, "r") as f:
                            man = json.load(f)
                        mod_id = man.get("id")
                        if mod_id and self.stack.get_child_by_name(mod_id) is None:
                            mod_name = f"ui_{mod_id}"
                            module = importlib.import_module(mod_name)
                            view_class = None
                            for attr_name in dir(module):
                                attr = getattr(module, attr_name)
                                if isinstance(attr, type) and issubclass(attr, Gtk.Widget) and attr_name.endswith("View"):
                                    view_class = attr
                                    break
                            if view_class:
                                view_instance = view_class(self.toast_service)
                                self.stack.add_named(view_instance, mod_id)
                    except Exception as e:
                        print(f"Error loading external view {d}:", e)

    def _build_footer(self, parent):
        footer = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        footer.get_style_context().add_class("app-footer")

        # Left Live Telemetry
        self.footer_cpu_pill = Gtk.Label(label="CPU: --%")
        self.footer_cpu_pill.get_style_context().add_class("metric-pill")
        footer.pack_start(self.footer_cpu_pill, False, False, 0)

        self.footer_ram_pill = Gtk.Label(label="RAM: --%")
        self.footer_ram_pill.get_style_context().add_class("metric-pill")
        footer.pack_start(self.footer_ram_pill, False, False, 0)

        # Center Status
        center_status_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        center_status_box.set_hexpand(True)
        center_status_box.set_halign(Gtk.Align.CENTER)
        
        self.footer_status_lbl = Gtk.Label(label="Ulak Kalkanı devrede • Dışarıya kapalı")
        self.footer_status_lbl.get_style_context().add_class("footer-text")
        center_status_box.pack_start(self.footer_status_lbl, False, False, 0)
        footer.pack_start(center_status_box, True, True, 0)

        # Right Host/OS Info
        host = os.uname().nodename
        sys_lbl = Gtk.Label(label=f"127.0.0.1 • {host} • ULAK v2.0")
        sys_lbl.get_style_context().add_class("footer-text")
        footer.pack_start(sys_lbl, False, False, 0)

        parent.pack_start(footer, False, False, 0)

    def _update_telemetry(self):
        try:
            # CPU & RAM
            cpu = psutil.cpu_percent(interval=None)
            self.footer_cpu_pill.set_label(f"CPU: {cpu:.0f}%")
            
            v = psutil.virtual_memory()
            ram_gb = v.used / (1024**3)
            self.footer_ram_pill.set_label(f"RAM: {ram_gb:.1f} GB ({v.percent:.0f}%)")

            # Firewall status in header & footer
            fw_active = fw_api.is_enabled()
            if fw_active:
                if hasattr(self, 'header_fw_pill'):
                    self.header_fw_pill.set_label("Kalkan: Aktif")
                    self.header_fw_pill.get_style_context().remove_class("status-pill-amber")
                    self.header_fw_pill.get_style_context().add_class("status-pill-green")
                self.footer_status_lbl.set_label("Ulak Kalkanı devrede • Dışarıya kapalı")
            else:
                if hasattr(self, 'header_fw_pill'):
                    self.header_fw_pill.set_label("Kalkan: Pasif")
                    self.header_fw_pill.get_style_context().remove_class("status-pill-green")
                    self.header_fw_pill.get_style_context().add_class("status-pill-amber")
                self.footer_status_lbl.set_label("Kalkan pasif • Güvenlik duvarı kapalı")
        except:
            pass
        return True

    def _on_theme_toggle_clicked(self, btn):
        theme_mgr.toggle_mode()
        storage.set_global("light_mode", theme_mgr.is_light_mode)
        self.toast_service.show("Açık Mod" if theme_mgr.is_light_mode else "Koyu Mod")

    def _on_nav_toggled(self, btn, page_name):
        if btn.get_active():
            self.stack.set_visible_child_name(page_name)
            fw_title = _("tab_firewall").replace("🛡️", "").strip()
            nav_titles = {
                "firewall": fw_title,
                "hack": _("tab_hacker"),
                "bt": _("tab_bluetooth"),
                "wifi": _("tab_wifi"),
                "hw": _("tab_hw"),
                "admin": _("tab_admin"),
                "store": _("tab_store"),
                "settings": _("settings")
            }
            if hasattr(self, 'header_page_lbl'):
                self.header_page_lbl.set_label(nav_titles.get(page_name, page_name))

    def _on_notifications_clicked(self, widget):
        dialog = BentoDialog(title=_("notif_title"), parent=self, icon_name="preferences-system-notifications-symbolic", default_width=440, default_height=360)
        dialog.add_bento_action_button("Kapat", Gtk.ResponseType.OK, is_primary=True)
        
        content = dialog.get_bento_content()
        
        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        
        listbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        if not self.toast_service.history:
             lbl = Gtk.Label(label=_("notif_empty"))
             lbl.set_margin_top(20)
             listbox.pack_start(lbl, False, False, 0)
        else:
             for msg in self.toast_service.history:
                 card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
                 card.get_style_context().add_class("card")
                 lbl = Gtk.Label(label=msg)
                 lbl.set_halign(Gtk.Align.START)
                 lbl.get_style_context().add_class("device-name")
                 card.pack_start(lbl, True, True, 0)
                 listbox.pack_start(card, False, False, 0)
                 
        scroll.add(listbox)
        content.pack_start(scroll, True, True, 0)
        
        dialog.show_all()
        dialog.run()
        dialog.destroy()


class UlakSplashScreen(Gtk.Window):
    def __init__(self, on_finish_callback):
        super().__init__(type=Gtk.WindowType.TOPLEVEL)
        self.on_finish_callback = on_finish_callback
        self.set_default_size(440, 260)
        self.set_position(Gtk.WindowPosition.CENTER)
        self.set_decorated(False)
        self.set_resizable(False)
        
        # Enable RGBA visual for true transparent rounded corners
        screen = self.get_screen()
        visual = screen.get_rgba_visual()
        if visual and screen.is_composited():
            self.set_visual(visual)
        self.set_app_paintable(True)
        self.get_style_context().add_class("splash-window")

        main_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        main_box.get_style_context().add_class("splash-box")
        
        logo_path = get_ulak_logo_path(is_light_mode=theme_mgr.is_light_mode)
        if logo_path and os.path.exists(logo_path):
            try:
                pb = GdkPixbuf.Pixbuf.new_from_file_at_scale(logo_path, 60, 60, True)
                img = Gtk.Image.new_from_pixbuf(pb)
                main_box.pack_start(img, False, False, 0)
            except: pass
            
        title = Gtk.Label(label="ULAK")
        title.get_style_context().add_class("splash-title")
        main_box.pack_start(title, False, False, 0)
        
        sub = Gtk.Label(label="Ağ & Güvenlik Kiti • v2.0")
        sub.get_style_context().add_class("splash-sub")
        main_box.pack_start(sub, False, False, 0)
        
        spacer = Gtk.Box()
        main_box.pack_start(spacer, True, True, 0)
        
        self.status_lbl = Gtk.Label(label="Sistem bileşenleri başlatılıyor...")
        self.status_lbl.get_style_context().add_class("splash-status")
        self.status_lbl.set_halign(Gtk.Align.START)
        main_box.pack_start(self.status_lbl, False, False, 0)
        
        self.prog = Gtk.ProgressBar()
        self.prog.get_style_context().add_class("splash-progress")
        self.prog.set_fraction(0.1)
        main_box.pack_start(self.prog, False, False, 0)
        
        self.add(main_box)
        self.show_all()
        
        self.step = 0
        self.steps = [
            (0.20, "Güncellemeler kontrol ediliyor..."),
            (0.40, "Ağ servisleri ve Wi-Fi denetleniyor..."),
            (0.70, "Ulak Kalkan güvenlik motoru yükleniyor..."),
            (0.90, "Yetkiler ve donanım doğrulanıyor..."),
            (1.00, "Hazır. ULAK açılıyor..."),
        ]
        GLib.timeout_add(320, self._step_forward)
        
    def _step_forward(self):
        if self.step == 0:
            # Check updates on the first step
            from updater import Updater
            frac, text = self.steps[self.step]
            self.prog.set_fraction(frac)
            self.status_lbl.set_label(text)
            
            def on_update_checked(has_update, version, deb_url):
                if has_update and deb_url:
                    self.status_lbl.set_label(f"Yeni sürüm ({version}) bulundu! Yükleniyor...")
                    Updater.apply_update(deb_url, lambda msg: self.status_lbl.set_label(msg))
                    # We wait here, app will restart. If it fails, we just continue.
                else:
                    self.step += 1
                    GLib.timeout_add(320, self._step_forward)
                    
            Updater.check_for_updates(on_update_checked)
            return False # Stop timer, wait for callback
            
        elif self.step < len(self.steps):
            frac, text = self.steps[self.step]
            self.prog.set_fraction(frac)
            self.status_lbl.set_label(text)
            self.step += 1
            return True
        else:
            self.destroy()
            self.on_finish_callback()
            return False


def main():
    def show_main():
        app = WirelessManagerWindow()
        app.connect("destroy", Gtk.main_quit)

    splash = UlakSplashScreen(show_main)
    Gtk.main()


if __name__ == "__main__":
    main()
