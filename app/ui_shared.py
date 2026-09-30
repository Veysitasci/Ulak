import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, Gdk, GLib
import json
from pathlib import Path

class Storage:
    def __init__(self):
        self.config_dir = Path.home() / ".config" / "wireless-manager"
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.file_path = self.config_dir / "data.json"
        
        if not self.file_path.exists():
            with open(self.file_path, "w") as f:
                json.dump({"bt": {}, "wifi": {}, "global": {}}, f)

    def load(self):
        try:
            with open(self.file_path, "r") as f:
                data = json.load(f)
                if "global" not in data: data["global"] = {}
                if "bt" not in data: data["bt"] = {}
                if "wifi" not in data: data["wifi"] = {}
                return data
        except:
            return {"bt": {}, "wifi": {}, "global": {}}

    def save(self, data):
        with open(self.file_path, "w") as f:
            json.dump(data, f, indent=4)

    # Global Settings
    def get_global(self, key, default=None):
        return self.load()["global"].get(key, default)
        
    def set_global(self, key, value):
        data = self.load()
        data["global"][key] = value
        self.save(data)

    # Domain specific settings (WIFI / BT)
    def get_device_setting(self, domain, addr, key, default=None):
        data = self.load()
        if addr not in data[domain]: return default
        return data[domain][addr].get(key, default)

    def set_device_setting(self, domain, addr, key, value):
        data = self.load()
        if addr not in data[domain]: data[domain][addr] = {}
        data[domain][addr][key] = value
        self.save(data)

    def add_log(self, domain, addr, event):
        import time
        timestamp = time.strftime("[%H:%M:%S]")
        data = self.load()
        if addr not in data[domain]: data[domain][addr] = {}
        if "logs" not in data[domain][addr]: data[domain][addr]["logs"] = []
        data[domain][addr]["logs"].insert(0, f"{timestamp} {event}")
        data[domain][addr]["logs"] = data[domain][addr]["logs"][:50]
        self.save(data)

    def add_history(self, domain, addr, val, key="signal_history"):
        data = self.load()
        if addr not in data[domain]: data[domain][addr] = {}
        if key not in data[domain][addr]: data[domain][addr][key] = []
        data[domain][addr][key].insert(0, val)
        data[domain][addr][key] = data[domain][addr][key][:30]
        self.save(data)


# Toast Service for unified overlay messages
class ToastService:
    def __init__(self, overlay):
        self.overlay = overlay
        self.history = []
        self.main_window = None # Will be set later to allow bringing window to front
        
        # Container for in-app toasts (Bottom Right)
        self.toast_container = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        self.toast_container.set_halign(Gtk.Align.END)
        self.toast_container.set_valign(Gtk.Align.END)
        self.toast_container.set_margin_bottom(20)
        self.toast_container.set_margin_end(20)
        self.overlay.add_overlay(self.toast_container)
        self.toast_container.show()
        
        # Init libnotify for OS notifications
        try:
            import gi
            gi.require_version("Notify", "0.7")
            from gi.repository import Notify
            if not Notify.is_initted():
                Notify.init("ULAK")
        except:
            pass

    def show(self, message, type="info", timeout_ms=4000, target_tab=None):
        import time
        ts = time.strftime("[%H:%M:%S]")
        self.history.insert(0, f"{ts} [{type.upper()}] {message}")
        self.history = self.history[:50]

        # 1. OS Notification (Always triggered, visible if app is in background)
        try:
            from gi.repository import Notify
            icon_name = "dialog-information"
            if type == "warning": icon_name = "dialog-warning"
            elif type in ["error", "critical"]: icon_name = "dialog-error"
            elif type == "success": icon_name = "emblem-ok-symbolic"
            
            n = Notify.Notification.new("ULAK", message, icon_name)
            if target_tab is not None and self.main_window:
                def _on_notify_action(notification, action, user_data):
                    if self.main_window:
                        self.main_window.present() # Bring to front
                        if hasattr(self.main_window, 'notebook'):
                            self.main_window.notebook.set_current_page(target_tab)
                n.add_action("default", "Aç", _on_notify_action, None)
            n.show()
        except Exception as e:
            pass

        # 2. In-App Elegant Toast (Bottom Right)
        bg_color = "#10b981" # Default normal/info is Green
        if type == "warning": bg_color = "#eab308" # Yellow
        elif type in ["error", "critical"]: bg_color = "#ef4444" # Red
        elif type == "success": bg_color = "#059669" # Darker Green

        # Main Toast Container
        toast_eb = Gtk.EventBox()
        toast_eb.set_name("toast-box")
        toast_eb.set_size_request(280, -1)
        
        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        
        lbl = Gtk.Label(label=message)
        lbl.set_name("toast-lbl")
        lbl.set_line_wrap(True)
        lbl.set_xalign(0.0)
        lbl.set_margin_top(16)
        lbl.set_margin_bottom(12)
        lbl.set_margin_start(16)
        lbl.set_margin_end(16)
        
        vbox.pack_start(lbl, True, True, 0)
        
        # Custom Progress Bar (Bypassing GTK's ugly default ProgressBar)
        prog_container = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        prog_container.set_margin_start(16)
        prog_container.set_margin_end(16)
        prog_container.set_margin_bottom(8)
        
        prog_bar = Gtk.EventBox()
        prog_bar.set_name("toast-prog")
        prog_bar.set_size_request(248, 4) # 280 - 32 margins
        prog_bar.set_halign(Gtk.Align.START)
        
        prog_container.pack_start(prog_bar, False, False, 0)
        vbox.pack_start(prog_container, False, False, 0)
        
        toast_eb.add(vbox)
        
        # CSS with ID selectors to FORCE override GTK Theme
        css = f"""
        #toast-box {{
            background-color: {bg_color};
            border-radius: 16px;
        }}
        #toast-lbl {{
            color: #ffffff;
            font-size: 13px;
            font-weight: bold;
        }}
        #toast-prog {{
            background-color: rgba(255,255,255,0.8);
            border-radius: 4px;
        }}
        """
        provider = Gtk.CssProvider()
        provider.load_from_data(css.encode('utf-8'))
        
        # Apply CSS globally to this widget hierarchy
        def apply_css(widget):
            widget.get_style_context().add_provider(provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
            if isinstance(widget, Gtk.Container):
                widget.forall(apply_css)
        apply_css(toast_eb)
        
        if target_tab is not None and self.main_window:
            def _on_toast_click(w, e):
                if hasattr(self.main_window, 'notebook'):
                    self.main_window.notebook.set_current_page(target_tab)
                return True
            toast_eb.connect("button-press-event", _on_toast_click)
            
        revealer = Gtk.Revealer()
        revealer.set_transition_type(Gtk.RevealerTransitionType.SLIDE_LEFT)
        revealer.set_transition_duration(300)
        revealer.add(toast_eb)
        revealer.show_all()
        
        self.toast_container.pack_start(revealer, False, False, 0)
        
        # Animate in
        GLib.idle_add(revealer.set_reveal_child, True)
        
        start_time = time.time()
        duration = timeout_ms / 1000.0
        
        def _update_prog():
            elapsed = time.time() - start_time
            if elapsed >= duration:
                revealer.set_reveal_child(False)
                GLib.timeout_add(300, lambda: self.toast_container.remove(revealer))
                return False
            remaining_ratio = 1.0 - (elapsed / duration)
            prog_bar.set_size_request(int(248 * remaining_ratio), 4)
            return True
            
        GLib.timeout_add(30, _update_prog)

storage = Storage()


class BentoDialog(Gtk.Dialog):
    """
    Termius / Bento Frameless Modal Dialog.
    Features:
    - RGBA true transparency with rounded corners (18px).
    - Frameless (set_decorated(False)) removing OS window manager titlebars.
    - Custom draggable headerbar (.app-header .dialog-header).
    - Termius close button (✕) (.win-btn .win-btn-close) on top right.
    - Bento content area with clean margins.
    - Bento action button management.
    """
    def __init__(self, title="ULAK", parent=None, icon_name="preferences-system-symbolic", default_width=460, default_height=520):
        super().__init__(transient_for=parent, modal=True)
        self.set_default_size(default_width, default_height)
        self.set_position(Gtk.WindowPosition.CENTER_ON_PARENT)
        self.set_decorated(False)

        screen = self.get_screen()
        visual = screen.get_rgba_visual()
        if visual and screen.is_composited():
            self.set_visual(visual)
        self.set_app_paintable(True)
        self.get_style_context().add_class("main-window")

        # Frame container
        self.dialog_frame = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.dialog_frame.get_style_context().add_class("main-frame")
        self.dialog_frame.get_style_context().add_class("bento-dialog-frame")

        # Draggable Headerbar
        event_box = Gtk.EventBox()
        event_box.connect("button-press-event", self._on_header_drag)

        self.custom_header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.custom_header.get_style_context().add_class("app-header")
        self.custom_header.get_style_context().add_class("dialog-header")
        event_box.add(self.custom_header)

        # Header Icon & Title
        h_left = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        h_left.set_valign(Gtk.Align.CENTER)
        
        if icon_name:
            self.header_icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.BUTTON)
            self.header_icon.set_pixel_size(18)
            h_left.pack_start(self.header_icon, False, False, 0)

        self.header_title = Gtk.Label(label=title)
        self.header_title.get_style_context().add_class("app-brand-title")
        h_left.pack_start(self.header_title, False, False, 0)
        self.custom_header.pack_start(h_left, False, False, 0)

        # Header Spacer (drag area)
        h_spacer = Gtk.Box()
        self.custom_header.pack_start(h_spacer, True, True, 0)

        # Header Close Button (✕)
        self.btn_close = Gtk.Button(label="✕")
        self.btn_close.get_style_context().add_class("win-btn")
        self.btn_close.get_style_context().add_class("win-btn-close")
        self.btn_close.set_valign(Gtk.Align.CENTER)
        self.btn_close.connect("clicked", lambda b: self.response(Gtk.ResponseType.CANCEL))
        self.custom_header.pack_end(self.btn_close, False, False, 0)

        self.dialog_frame.pack_start(event_box, False, False, 0)

        # Body Box
        self.body_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        self.body_box.set_margin_top(16)
        self.body_box.set_margin_bottom(16)
        self.body_box.set_margin_start(20)
        self.body_box.set_margin_end(20)
        self.dialog_frame.pack_start(self.body_box, True, True, 0)

        # Hide GTK's default action area and dialog chrome completely
        try:
            action_area = self.get_action_area()
            if action_area:
                action_area.set_no_show_all(True)
                action_area.hide()
        except Exception:
            pass

        content_area = super().get_content_area()
        content_area.set_spacing(0)
        content_area.set_border_width(0)
        content_area.pack_start(self.dialog_frame, True, True, 0)

        # Action Buttons Area at bottom of body
        self.action_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.action_box.set_halign(Gtk.Align.END)
        self.action_box.set_margin_top(8)

        # Connect Escape key to dismiss dialog
        self.connect("key-press-event", self._on_key_press)

    def _on_key_press(self, widget, event):
        if event.keyval == Gdk.KEY_Escape:
            self.response(Gtk.ResponseType.CANCEL)
            return True
        return False

    def _on_header_drag(self, widget, event):
        if event.button == 1 and event.type == Gdk.EventType.BUTTON_PRESS:
            self.begin_move_drag(event.button, int(event.x_root), int(event.y_root), event.time)

    def get_bento_content(self):
        return self.body_box

    def add_bento_action_button(self, label, response_id, is_primary=False):
        btn = Gtk.Button(label=label)
        if is_primary:
            btn.get_style_context().add_class("btn-primary")
        else:
            btn.get_style_context().add_class("btn-secondary")
        btn.connect("clicked", lambda b: self.response(response_id))
        self.action_box.pack_start(btn, False, False, 0)
        if self.action_box.get_parent() is None:
            self.body_box.pack_end(self.action_box, False, False, 0)
        return btn
