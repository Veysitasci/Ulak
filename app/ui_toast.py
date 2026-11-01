import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, Gdk, GLib
import time

class ModernToastService:
    def __init__(self, overlay):
        self.overlay = overlay
        self.toasts = []

    def show(self, message, type="info", timeout_ms=5000):
        # type can be: info (yeşil/açık yeşil), warning (sarı), error/critical (kırmızı)
        
        toast_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        toast_box.set_halign(Gtk.Align.END)
        toast_box.set_valign(Gtk.Align.START)
        toast_box.set_margin_top(20)
        toast_box.set_margin_end(20)
        # We will add multiple toasts by stacking them? GTK Overlay expects distinct positions, 
        # but we can use a VBox inside the overlay if we want stacking. 
        # For simplicity, we just add it to overlay with top-right alignment.
        
        # Color matching
        bg_color = "#10b981" # success/info
        if type == "warning": bg_color = "#f59e0b"
        elif type in ["error", "critical"]: bg_color = "#ef4444"
        elif type == "normal": bg_color = "#34d399"
        
        # UI
        main_frame = Gtk.Frame()
        main_frame.get_style_context().add_class("bento-dialog-frame")
        
        css = f"""
        * {{
            background-color: {bg_color};
            color: #ffffff;
            border-radius: 8px;
            padding: 10px 15px;
            font-weight: bold;
        }}
        """
        provider = Gtk.CssProvider()
        provider.load_from_data(css.encode('utf-8'))
        main_frame.get_style_context().add_provider(provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
        
        lbl = Gtk.Label(label=message)
        main_frame.add(lbl)
        
        # Progress Bar
        prog = Gtk.ProgressBar()
        prog.set_size_request(-1, 4)
        prog.get_style_context().add_provider(provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
        
        inner_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        inner_box.pack_start(main_frame, True, True, 0)
        inner_box.pack_start(prog, False, False, 0)
        
        revealer = Gtk.Revealer()
        revealer.set_transition_type(Gtk.RevealerTransitionType.SLIDE_LEFT)
        revealer.set_transition_duration(300)
        revealer.add(inner_box)
        
        self.overlay.add_overlay(revealer)
        revealer.show_all()
        
        # Animate in
        GLib.idle_add(revealer.set_reveal_child, True)
        
        start_time = time.time()
        duration = timeout_ms / 1000.0
        
        def _update_prog():
            elapsed = time.time() - start_time
            if elapsed >= duration:
                revealer.set_reveal_child(False)
                GLib.timeout_add(300, self.overlay.remove, revealer)
                return False
            prog.set_fraction(1.0 - (elapsed / duration))
            return True
            
        GLib.timeout_add(50, _update_prog)

