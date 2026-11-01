#!/usr/bin/env python3
import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, Gdk, GLib
import os
import requests
import threading

class IntroView(Gtk.Box):
    """
    ULAK Intro Splash Screen
    Kompakt, kareye yakın kart formatında, adımların sırayla kontrol edilip
    önceki adımın silinerek yeni adımın geldiği ve altta modern progress bar olan Bento tasarımı.
    """
    def __init__(self, toast_service, on_complete_callback):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.toast_service = toast_service
        self.on_complete_callback = on_complete_callback
        self.get_style_context().add_class("intro-container")
        self.current_step = 0
        
        self.steps = [
            ("Sistem servisleri denetleniyor...", 0.20),
            ("Ağ ve Wi-Fi denetleniyor...", 0.45),
            ("Güvenlik duvarı ve modüller taranıyor...", 0.70),
            ("Güncellemeler kontrol ediliyor...", 0.88),
            ("ULAK ortamı hazırlanıyor...", 1.0)
        ]
        self.total_steps = len(self.steps)
        self._build_ui()
        self._start_loading_sequence()

    def _build_ui(self):
        # Arka plan overlay
        self.bg_overlay = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.bg_overlay.get_style_context().add_class("intro-background")
        self.pack_start(self.bg_overlay, True, True, 0)

        # Kompakt kare/yuvarlak Bento Kart (420x360)
        card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        card.get_style_context().add_class("intro-card")
        card.set_halign(Gtk.Align.CENTER)
        card.set_valign(Gtk.Align.CENTER)
        card.set_size_request(420, 360)

        # Logo
        logo_img = Gtk.Image()
        logo_path = self._get_ulak_logo_path()
        if logo_path:
            try:
                from gi.repository import GdkPixbuf
                pb = GdkPixbuf.Pixbuf.new_from_file_at_scale(logo_path, 60, 60, True)
                logo_img.set_from_pixbuf(pb)
            except Exception:
                logo_img.set_from_icon_name("network-wireless-symbolic", Gtk.IconSize.DIALOG)
                logo_img.set_pixel_size(60)
        else:
            logo_img.set_from_icon_name("network-wireless-symbolic", Gtk.IconSize.DIALOG)
            logo_img.set_pixel_size(60)

        logo_img.set_halign(Gtk.Align.CENTER)
        logo_img.set_margin_top(8)
        card.pack_start(logo_img, False, False, 0)

        # Başlık - ULAK
        title_lbl = Gtk.Label(label="ULAK")
        title_lbl.get_style_context().add_class("intro-title")
        title_lbl.set_halign(Gtk.Align.CENTER)
        card.pack_start(title_lbl, False, False, 0)

        # Alt Başlık
        subtitle_lbl = Gtk.Label(label="Ağ & Güvenlik Kiti • v2.0")
        subtitle_lbl.get_style_context().add_class("intro-subtitle")
        subtitle_lbl.set_halign(Gtk.Align.CENTER)
        card.pack_start(subtitle_lbl, False, False, 0)

        # Ayırıcı
        separator = Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL)
        separator.get_style_context().add_class("intro-separator")
        separator.set_margin_top(6)
        separator.set_margin_bottom(6)
        card.pack_start(separator, False, False, 0)

        # Tekil Durum Alanı (Liste değil, biri bittiğinde diğeri gelen tek satır)
        self.step_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.step_box.set_halign(Gtk.Align.CENTER)
        self.step_box.set_valign(Gtk.Align.CENTER)
        self.step_box.set_size_request(340, 36)

        # Canlı durum noktası
        self.dot_lbl = Gtk.Label(label="●")
        self.dot_lbl.get_style_context().add_class("step-indicator")
        self.dot_lbl.get_style_context().add_class("step-active")
        self.step_box.pack_start(self.dot_lbl, False, False, 0)

        # Dinamik Adım Metni
        self.step_lbl = Gtk.Label(label=self.steps[0][0])
        self.step_lbl.get_style_context().add_class("step-text")
        self.step_lbl.get_style_context().add_class("step-active-text")
        self.step_lbl.set_halign(Gtk.Align.START)
        self.step_box.pack_start(self.step_lbl, True, True, 0)

        card.pack_start(self.step_box, False, False, 4)

        # Progress bar
        self.progress_bar = Gtk.ProgressBar()
        self.progress_bar.get_style_context().add_class("intro-progress")
        self.progress_bar.set_show_text(False)
        self.progress_bar.set_fraction(0.15)
        self.progress_bar.set_size_request(340, 6)
        self.progress_bar.set_halign(Gtk.Align.CENTER)
        self.progress_bar.set_margin_top(4)
        self.progress_bar.set_margin_bottom(8)
        card.pack_start(self.progress_bar, False, False, 0)

        self.bg_overlay.pack_start(card, True, True, 0)

    def _start_loading_sequence(self):
        """Yükleme aşamalarını sırayla başlatır."""
        # 1. Aşama
        GLib.timeout_add(500, lambda: self._set_step(1))
        # 2. Aşama (Ağ ve GitHub kontrolü)
        GLib.timeout_add(1100, lambda: self._check_network_and_update(2))

    def _check_network_and_update(self, next_step):
        self._set_step(next_step)
        thread = threading.Thread(target=self._background_network_check)
        thread.daemon = True
        thread.start()

    def _background_network_check(self):
        try:
            response = requests.get("https://api.github.com/repos/veysitasci/ulak/releases/latest", timeout=3)
            if response.status_code == 200:
                data = response.json()
                latest_version = data.get("tag_name", "").lstrip("v")
                current_version = "2.0.0"
                if latest_version and latest_version != current_version:
                    GLib.idle_add(lambda: self.toast_service.show(f"Yeni sürüm v{latest_version} mevcut!", type="info"))
        except Exception:
            pass

        GLib.timeout_add(700, lambda: self._set_step(3))
        GLib.timeout_add(1400, lambda: self._set_step(4))
        GLib.timeout_add(2000, self._complete_intro)

    def _set_step(self, step_idx):
        if step_idx < len(self.steps):
            text, frac = self.steps[step_idx]
            self.step_lbl.set_text(text)
            self.progress_bar.set_fraction(frac)
            self.current_step = step_idx
        return False

    def _complete_intro(self):
        self.step_lbl.set_text("ULAK Hazır!")
        self.progress_bar.set_fraction(1.0)
        self.dot_lbl.get_style_context().remove_class("step-active")
        self.dot_lbl.get_style_context().add_class("step-complete")
        if self.on_complete_callback:
            GLib.timeout_add(400, self.on_complete_callback)
        return False

    def _get_ulak_logo_path(self):
        candidates = [
            os.path.join(os.path.dirname(__file__), "..", "assets", "ulak_logo.png"),
            os.path.join(os.path.dirname(__file__), "assets", "ulak_logo.png"),
            "/usr/lib/ulak/assets/ulak_logo.png",
            "/usr/share/icons/hicolor/512x512/apps/ulak.png",
            os.path.expanduser("~/.local/share/icons/ulak.png"),
        ]
        for p in candidates:
            if os.path.exists(p):
                return p
        return None
