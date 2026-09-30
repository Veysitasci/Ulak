import gi
gi.require_version("Gtk", "3.0")
gi.require_version("Notify", "0.7")
from gi.repository import Gtk, Gdk, GLib, Notify
import time
import json
import os

class Storage:
    def __init__(self):
        self.data_file = os.path.expanduser("~/.local/share/ulak/data.json")
        os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
        if not os.path.exists(self.data_file):
            self.save({"wifi": {}, "bt": {}, "firewall": {}, "hw": {}, "settings": {}})
            
    def load(self):
        try:
            with open(self.data_file, "r") as f:
                return json.load(f)
        except:
            return {"wifi": {}, "bt": {}, "firewall": {}, "hw": {}, "settings": {}}
            
    def save(self, data):
        with open(self.data_file, "w") as f:
            json.dump(data, f, indent=4)

    def get_device_setting(self, domain, addr, key, default=None):
        data = self.load()
        if domain not in data: return default
        if addr not in data[domain]: return default
        return data[domain][addr].get(key, default)

    def set_device_setting(self, domain, addr, key, value):
        data = self.load()
        if addr not in data[domain]: data[domain][addr] = {}
        data[domain][addr][key] = value
        self.save(data)

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
        if not Notify.is_initted():
            Notify.init("ULAK")

    def show(self, message, type="info", timeout_ms=4000, target_tab=None):
        ts = time.strftime("[%H:%M:%S]")
        self.history.insert(0, f"{ts} [{type.upper()}] {message}")
        self.history = self.history[:50]

        # 1. OS Notification (Always triggered, visible if app is in background)
        try:
            icon_name = "dialog-information"
            if type == "warning": icon_name = "dialog-warning"
            elif type in ["error", "critical"]: icon_name = "dialog-error"
            elif type == "success": icon_name = "emblem-ok-symbolic"
            
            n = Notify.Notification.new("ULAK", message, icon_name)
            if target_tab is not None and self.main_window:
                def _on_notify_action(notification, action, user_data):
                    if self.main_window:
                        self.main_window.present() # Bring to front
                        # Assuming main_window has notebook
                        if hasattr(self.main_window, 'notebook'):
                            self.main_window.notebook.set_current_page(target_tab)
                n.add_action("default", "Aç", _on_notify_action, None)
            n.show()
        except Exception as e:
            print("OS Notification failed:", e)

        # 2. In-App Elegant Toast (Bottom Right)
        bg_color = "#334155" # Default dark slate
        if type == "warning": bg_color = "#d97706"
        elif type in ["error", "critical"]: bg_color = "#dc2626"
        elif type == "success": bg_color = "#059669"
        elif type == "info": bg_color = "#2563eb"

        toast_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        toast_box.set_size_request(280, -1)
        
        # Clickable event box to navigate
        eb = Gtk.EventBox()
        if target_tab is not None and self.main_window:
            def _on_toast_click(w, e):
                if hasattr(self.main_window, 'notebook'):
                    self.main_window.notebook.set_current_page(target_tab)
                return True
            eb.connect("button-press-event", _on_toast_click)
        
        lbl = Gtk.Label(label=message)
        lbl.set_line_wrap(True)
        lbl.set_xalign(0.0) # Left align text
        lbl.set_margin_all(12)
        
        css = f"""
        * {{
            background-color: {bg_color};
            color: #ffffff;
            border-radius: 8px 8px 0 0;
            font-size: 13px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }}
        """
        provider = Gtk.CssProvider()
        provider.load_from_data(css.encode('utf-8'))
        lbl.get_style_context().add_provider(provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
        
        eb.add(lbl)
        toast_box.pack_start(eb, True, True, 0)
        
        # Thin Progress Bar
        prog = Gtk.ProgressBar()
        prog.set_size_request(-1, 3)
        prog_css = f"""
        progressbar trough {{ min-height: 3px; background-color: {bg_color}; border-radius: 0 0 8px 8px; }}
        progressbar progress {{ background-color: rgba(255,255,255,0.8); border-radius: 0 0 8px 8px; }}
        """
        p_provider = Gtk.CssProvider()
        p_provider.load_from_data(prog_css.encode('utf-8'))
        prog.get_style_context().add_provider(p_provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
        toast_box.pack_start(prog, False, False, 0)
        
        revealer = Gtk.Revealer()
        revealer.set_transition_type(Gtk.RevealerTransitionType.SLIDE_UP)
        revealer.set_transition_duration(400)
        revealer.add(toast_box)
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
                GLib.timeout_add(400, lambda: self.toast_container.remove(revealer))
                return False
            prog.set_fraction(1.0 - (elapsed / duration))
            return True
            
        GLib.timeout_add(30, _update_prog)

storage = Storage()

class BentoDialog(Gtk.Dialog):
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

        self.dialog_frame = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.dialog_frame.get_style_context().add_class("main-frame")
        self.dialog_frame.get_style_context().add_class("bento-dialog-frame")

        event_box = Gtk.EventBox()
        event_box.connect("button-press-event", self._on_header_drag)

        self.custom_header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.custom_header.get_style_context().add_class("app-header")
        self.custom_header.get_style_context().add_class("dialog-header")
        event_box.add(self.custom_header)

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

        h_spacer = Gtk.Box()
        self.custom_header.pack_start(h_spacer, True, True, 0)

        self.btn_close = Gtk.Button(label="✕")
        self.btn_close.get_style_context().add_class("win-btn")
        self.btn_close.get_style_context().add_class("win-btn-close")
        self.btn_close.set_valign(Gtk.Align.CENTER)
        self.btn_close.connect("clicked", lambda b: self.response(Gtk.ResponseType.CANCEL))
        self.custom_header.pack_end(self.btn_close, False, False, 0)

        self.dialog_frame.pack_start(event_box, False, False, 0)

        self.body_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        self.body_box.set_margin_top(16)
        self.body_box.set_margin_bottom(16)
        self.body_box.set_margin_start(20)
        self.body_box.set_margin_end(20)
        self.dialog_frame.pack_start(self.body_box, True, True, 0)

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

        self.action_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.action_box.set_halign(Gtk.Align.END)
        self.action_box.set_margin_top(8)

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
