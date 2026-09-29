import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, GLib
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
        self._current_toast = None
        self.history = []

    def show(self, message, timeout_ms=3000):
        import time
        ts = time.strftime("[%H:%M:%S]")
        self.history.insert(0, f"{ts} {message}")
        self.history = self.history[:50]
        
        if self._current_toast is not None:
            self.overlay.remove(self._current_toast)
            self._current_toast = None

        toast_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        toast_box.get_style_context().add_class("toast-container")
        toast_box.set_halign(Gtk.Align.CENTER)
        toast_box.set_valign(Gtk.Align.END)
        toast_box.set_margin_bottom(20)

        lbl = Gtk.Label(label=message)
        toast_box.pack_start(lbl, True, True, 0)
        toast_box.show_all()

        self.overlay.add_overlay(toast_box)
        self._current_toast = toast_box

        # Auto remove
        GLib.timeout_add(timeout_ms, self._hide_toast, toast_box)
        
        # Desktop Fallback Notify (optional)
        try:
            import gi
            gi.require_version('Notify', '0.7')
            from gi.repository import Notify
            if not Notify.is_initted():
                Notify.init("Wireless Manager")
            Notify.Notification.new("Wireless Manager", message, "network-wireless").show()
        except:
            pass

    def _hide_toast(self, toast_box):
        if self._current_toast == toast_box:
            self.overlay.remove(toast_box)
            self._current_toast = None
        return False

storage = Storage()
