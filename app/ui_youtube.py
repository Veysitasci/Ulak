import gi
gi.require_version("Gtk", "3.0")
gi.require_version("Gst", "1.0")
gi.require_version("GdkPixbuf", "2.0")
from gi.repository import Gtk, Gdk, GLib, Pango, Gst, GdkPixbuf

import os
import re
import math
import json
import time
import shutil
import urllib.request
import subprocess
import threading

from i18n import _
from ui_shared import UsageGraph, BentoDialog

Gst.init(None)

# -----------------------------------------------------------------------------
# 1. ANIMATED CAIRO AUDIO VISUALIZER WIDGET
# -----------------------------------------------------------------------------
class AudioVisualizerWidget(Gtk.DrawingArea):
    """
    Animated Cairo visualizer with moving background, pulsating equalizer bars,
    soundwaves and rotating vinyl/core for MP3 and audio playback.
    """
    def __init__(self):
        super().__init__()
        self.set_size_request(-1, 320)
        self.phase = 0.0
        self.is_playing = False
        self.title = "Ses Dosyası"
        self.artist = "Bilinmeyen Sanatçı"
        self.num_bars = 36
        self.bar_heights = [0.1] * self.num_bars
        self.target_heights = [0.1] * self.num_bars

        self.connect("draw", self._on_draw)
        self.timer_id = GLib.timeout_add(35, self._on_tick)

    def set_playing(self, playing):
        self.is_playing = playing

    def set_track_info(self, title, artist="ULAK Medya"):
        self.title = title
        self.artist = artist
        self.queue_draw()

    def _on_tick(self):
        if not self.get_mapped():
            return True
        self.phase += 0.04
        if self.phase > 1000.0:
            self.phase = 0.0

        for i in range(self.num_bars):
            if self.is_playing:
                v1 = math.sin(self.phase * 3.2 + i * 0.45)
                v2 = math.cos(self.phase * 1.8 - i * 0.3)
                v3 = math.sin(self.phase * 5.0 + (i % 4) * 1.2)
                raw = (v1 * 0.4 + v2 * 0.35 + v3 * 0.25)
                h = max(0.08, min(0.95, (raw + 1.0) / 2.0))
                if i < 8:
                    h = min(1.0, h * 1.25)
                self.target_heights[i] = h
            else:
                self.target_heights[i] = 0.05 + 0.03 * math.sin(self.phase + i * 0.2)

            self.bar_heights[i] += (self.target_heights[i] - self.bar_heights[i]) * 0.25

        self.queue_draw()
        return True

    def _on_draw(self, widget, cr):
        w = widget.get_allocated_width()
        h = widget.get_allocated_height()
        if w <= 10 or h <= 10:
            return False

        import cairo
        bg_pattern = cairo.LinearGradient(0, 0, w, h)
        shift = math.sin(self.phase * 0.5) * 0.1
        bg_pattern.add_color_stop_rgb(0.0, 0.05 + shift * 0.2, 0.06, 0.12 + shift * 0.3)
        bg_pattern.add_color_stop_rgb(0.5, 0.08, 0.09, 0.16)
        bg_pattern.add_color_stop_rgb(1.0, 0.04, 0.05, 0.10)
        cr.set_source(bg_pattern)
        cr.paint()

        cx = w / 2.0
        cy = h / 2.0 - 15.0
        glow_r = 130.0 + (math.sin(self.phase * 2.0) * 18.0 if self.is_playing else 5.0)

        rad_pat = cairo.RadialGradient(cx, cy, 10, cx, cy, glow_r)
        rad_pat.add_color_stop_rgba(0.0, 0.15, 0.45, 0.95, 0.28)
        rad_pat.add_color_stop_rgba(0.5, 0.55, 0.2, 0.85, 0.15)
        rad_pat.add_color_stop_rgba(1.0, 0.0, 0.0, 0.0, 0.0)
        cr.set_source(rad_pat)
        cr.arc(cx, cy, glow_r, 0, 2 * math.pi)
        cr.fill()

        cr.save()
        for layer in range(3):
            cr.set_line_width(1.8)
            alpha = 0.22 - layer * 0.06
            cr.set_source_rgba(0.2, 0.75, 0.95, alpha)
            cr.move_to(0, cy)
            wave_freq = 0.012 + layer * 0.005
            speed_mult = 1.5 + layer * 0.8
            amp = (26.0 - layer * 7.0) * (1.2 if self.is_playing else 0.4)
            for x in range(0, int(w) + 10, 10):
                y = cy + math.sin(x * wave_freq + self.phase * speed_mult) * amp
                cr.line_to(x, y)
            cr.stroke()
        cr.restore()

        disc_radius = 52.0 + (math.sin(self.phase * 4.0) * 4.0 if self.is_playing else 0.0)
        cr.save()
        cr.set_line_width(2.5)
        cr.set_source_rgba(0.06, 0.72, 0.5, 0.7)
        cr.arc(cx, cy, disc_radius + 8.0, 0, 2 * math.pi)
        cr.stroke()

        cr.arc(cx, cy, disc_radius, 0, 2 * math.pi)
        cr.set_source_rgba(0.09, 0.11, 0.16, 0.9)
        cr.fill_preserve()
        cr.set_source_rgba(0.2, 0.6, 1.0, 0.4)
        cr.set_line_width(1.5)
        cr.stroke()

        rot_angle = self.phase * (2.2 if self.is_playing else 0.2)
        cr.translate(cx, cy)
        cr.rotate(rot_angle)
        for i in range(4):
            cr.set_source_rgba(0.3, 0.8, 1.0, 0.8)
            cr.arc(0, 0, disc_radius - 12.0, i * math.pi / 2, i * math.pi / 2 + 0.35)
            cr.stroke()
        cr.arc(0, 0, 8.0, 0, 2 * math.pi)
        cr.set_source_rgb(0.06, 0.72, 0.5)
        cr.fill()
        cr.restore()

        bar_area_width = min(w * 0.82, 540.0)
        start_x = (w - bar_area_width) / 2.0
        bar_w = max(4.0, (bar_area_width / self.num_bars) - 3.0)
        max_h = 75.0
        base_y = h - 22.0

        for i, h_factor in enumerate(self.bar_heights):
            bx = start_x + i * (bar_w + 3.0)
            bh = max_h * h_factor
            by = base_y - bh

            bar_pat = cairo.LinearGradient(bx, base_y, bx, by)
            bar_pat.add_color_stop_rgba(0.0, 0.06, 0.72, 0.5, 0.95)
            bar_pat.add_color_stop_rgba(0.6, 0.2, 0.6, 1.0, 0.9)
            bar_pat.add_color_stop_rgba(1.0, 0.85, 0.25, 0.95, 0.95)
            cr.set_source(bar_pat)

            r = min(3.0, bar_w / 2.0)
            cr.new_sub_path()
            cr.arc(bx + r, by + r, r, math.pi, 3 * math.pi / 2)
            cr.arc(bx + bar_w - r, by + r, r, 3 * math.pi / 2, 0)
            cr.arc(bx + bar_w - r, base_y, 0, 0, math.pi / 2)
            cr.arc(bx + r, base_y, 0, math.pi / 2, math.pi)
            cr.close_path()
            cr.fill()

        cr.save()
        cr.set_source_rgb(0.95, 0.96, 0.98)
        cr.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        cr.set_font_size(15.0)

        t_text = self.title if len(self.title) <= 45 else self.title[:42] + "..."
        ext = cr.text_extents(t_text)
        cr.move_to((w - ext.width) / 2.0, 36.0)
        cr.show_text(t_text)

        cr.set_source_rgba(0.65, 0.72, 0.85, 0.85)
        cr.set_font_size(12.0)
        sub_text = f"{self.artist} • ULAK Müzik & Ses Oynatıcı"
        sub_ext = cr.text_extents(sub_text)
        cr.move_to((w - sub_ext.width) / 2.0, 56.0)
        cr.show_text(sub_text)
        cr.restore()

        return False

    def destroy_timer(self):
        if getattr(self, "timer_id", 0):
            GLib.source_remove(self.timer_id)
            self.timer_id = 0


class TheaterModeIcon(Gtk.DrawingArea):
    """Sinema perdesi biçiminde tiyatro modu ikonu (tema rengiyle çizilir)."""
    def __init__(self, size=16):
        super().__init__()
        self.set_size_request(size, size)
        self.set_halign(Gtk.Align.CENTER)
        self.set_valign(Gtk.Align.CENTER)
        self.connect("draw", self._on_draw)

    def _on_draw(self, widget, cr):
        w = widget.get_allocated_width()
        h = widget.get_allocated_height()
        rgba = widget.get_style_context().get_color(Gtk.StateFlags.NORMAL)
        cr.set_source_rgba(rgba.red, rgba.green, rgba.blue, rgba.alpha)

        # Geniş perde çerçevesi
        rx, ry = 1.5, 3.0
        rw, rh = w - 3.0, h - 7.0
        cr.set_line_width(1.5)
        cr.rectangle(rx, ry, rw, rh)
        cr.stroke()

        # Perdenin içi (dolu şerit)
        cr.rectangle(rx + 2.2, ry + 2.2, rw - 4.4, rh - 4.4)
        cr.fill()

        # Alt sehpa cizgisi
        cr.set_line_width(1.5)
        cr.move_to(w / 2.0 - 3.0, h - 1.8)
        cr.line_to(w / 2.0 + 3.0, h - 1.8)
        cr.stroke()
        return False


# -----------------------------------------------------------------------------
# 2. BUILT-IN BENTO MEDIA PLAYER DIALOG
# -----------------------------------------------------------------------------
class BentoMediaPlayerDialog(BentoDialog):
    """
    Dedicated Built-in Media Player for Video and Audio files with translucent
    Bento glassmorphism, responsive video sink, scrubber, skip +/-10s, speed control and volume.
    """
    def __init__(self, filepath, title="Medya Oynatıcı", parent=None, is_audio=None, on_download_action=None):
        super().__init__(title="ULAK Medya Oynatıcı", parent=parent, icon_name="multimedia-player-symbolic", default_width=820, default_height=600)
        self.filepath = filepath
        self.media_title = title
        self.is_seeking = False
        self.duration_ns = 0
        self.current_speed = 1.0
        self.is_looping = False
        self.on_download_action = on_download_action

        # Görünüm modu: "normal" | "theater" | "fullscreen"
        self.view_mode = "normal"
        self._mode_before_fs = "normal"
        self._saved_size = None
        self._fs_hide_timer_id = 0
        self._last_volume = 1.0

        # Tema uyumlu arka plan için CSS sınıfı (Cairo çizimi yerine)
        self.get_style_context().add_class("bento-dialog-frame")

        if is_audio is None:
            audio_exts = (".mp3", ".m4a", ".wav", ".flac", ".ogg", ".opus", ".aac")
            self.is_audio = any(filepath.lower().endswith(ext) for ext in audio_exts)
        else:
            self.is_audio = is_audio

        content = self.get_bento_content()
        content.set_spacing(10)
        self._content_box = content
        self._content_margins = (content.get_margin_top(), content.get_margin_bottom(),
                                 content.get_margin_start(), content.get_margin_end())

        # Top Info Pill
        top_bar = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        top_bar.get_style_context().add_class("settings-card")
        top_bar.set_margin_bottom(2)

        ic_type = "audio-x-generic-symbolic" if self.is_audio else "video-x-generic-symbolic"
        top_ic = Gtk.Image.new_from_icon_name(ic_type, Gtk.IconSize.BUTTON)
        top_bar.pack_start(top_ic, False, False, 0)

        lbl_t = Gtk.Label(label=title)
        lbl_t.get_style_context().add_class("setting-title")
        lbl_t.set_ellipsize(Pango.EllipsizeMode.END)
        lbl_t.set_max_width_chars(50)
        lbl_t.set_halign(Gtk.Align.START)
        top_bar.pack_start(lbl_t, True, True, 0)

        lbl_tag = Gtk.Label(label="MÜZİK & SES" if self.is_audio else "VİDEO")
        lbl_tag.get_style_context().add_class("badge-active")
        lbl_tag.set_valign(Gtk.Align.CENTER)
        top_bar.pack_end(lbl_tag, False, False, 0)

        content.pack_start(top_bar, False, False, 0)
        self.top_bar = top_bar

        # Display Box: Video Sink or Audio Visualizer
        self.display_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        self.display_box.get_style_context().add_class("card")
        content.pack_start(self.display_box, True, True, 0)

        self.player = Gst.ElementFactory.make("playbin", "bento_player")
        
        # Pitch preservation için scaletempo audio-filter ekle
        self.pitch_filter = Gst.ElementFactory.make("scaletempo", "pitch_filter")
        if self.pitch_filter:
            self.player.set_property("audio-filter", self.pitch_filter)
        
        if not self.is_audio:
            self.vsink = Gst.ElementFactory.make("gtksink", "bento_vsink")
            if self.vsink and hasattr(self.vsink.props, "widget"):
                self.player.set_property("video-sink", self.vsink)
                video_widget = self.vsink.props.widget
                video_widget.set_size_request(-1, 360)
                self.display_box.pack_start(video_widget, True, True, 0)
            else:
                self.is_audio = True

        if self.is_audio:
            self.visualizer = AudioVisualizerWidget()
            self.visualizer.set_track_info(title=os.path.basename(filepath), artist="ULAK Medya")
            self.display_box.pack_start(self.visualizer, True, True, 0)
        else:
            self.visualizer = None

        # Scrubber / Timeline Bar
        scrub_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        scrub_box.set_margin_start(4)
        scrub_box.set_margin_end(4)
        scrub_box.get_style_context().add_class("settings-card")

        self.lbl_pos = Gtk.Label(label="00:00")
        self.lbl_pos.get_style_context().add_class("device-mac")
        scrub_box.pack_start(self.lbl_pos, False, False, 0)

        self.scale_seek = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0, 100.0, 0.5)
        self.scale_seek.set_draw_value(False)
        self.scale_seek.set_hexpand(True)
        self.scale_seek.get_style_context().add_class("termius-search")
        self.scale_seek.connect("button-press-event", self._on_seek_press)
        self.scale_seek.connect("button-release-event", self._on_seek_release)
        self.scale_seek.connect("change-value", self._on_seek_change)
        scrub_box.pack_start(self.scale_seek, True, True, 0)

        self.lbl_dur = Gtk.Label(label="00:00")
        self.lbl_dur.get_style_context().add_class("device-mac")
        scrub_box.pack_start(self.lbl_dur, False, False, 0)

        content.pack_start(scrub_box, False, False, 0)
        self.scrub_box = scrub_box

        # Control Bar
        ctrl_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        ctrl_card.get_style_context().add_class("settings-card")
        ctrl_card.set_margin_top(4)

        btn_loop = Gtk.Button()
        btn_loop.set_image(Gtk.Image.new_from_icon_name("media-playlist-repeat-symbolic", Gtk.IconSize.BUTTON))
        btn_loop.set_tooltip_text("Tekrar Oynat (Döngü)")
        btn_loop.get_style_context().add_class("btn-secondary")
        btn_loop.connect("clicked", self._toggle_loop)
        ctrl_card.pack_start(btn_loop, False, False, 0)
        self.btn_loop = btn_loop

        mid_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        mid_box.set_halign(Gtk.Align.CENTER)

        btn_rwd = Gtk.Button()
        btn_rwd.set_image(Gtk.Image.new_from_icon_name("media-seek-backward-symbolic", Gtk.IconSize.BUTTON))
        btn_rwd.set_tooltip_text("10 Saniye Geri Sar")
        btn_rwd.get_style_context().add_class("btn-secondary")
        btn_rwd.connect("clicked", lambda b: self._seek_offset(-10))
        mid_box.pack_start(btn_rwd, False, False, 0)

        self.btn_play = Gtk.Button()
        self.btn_play.set_image(Gtk.Image.new_from_icon_name("media-playback-pause-symbolic", Gtk.IconSize.BUTTON))
        self.btn_play.set_tooltip_text("Duraklat")
        self.btn_play.get_style_context().add_class("btn-primary")
        self.btn_play.connect("clicked", self._toggle_play_pause)
        mid_box.pack_start(self.btn_play, False, False, 0)

        btn_fwd = Gtk.Button()
        btn_fwd.set_image(Gtk.Image.new_from_icon_name("media-seek-forward-symbolic", Gtk.IconSize.BUTTON))
        btn_fwd.set_tooltip_text("10 Saniye İleri Sar")
        btn_fwd.get_style_context().add_class("btn-secondary")
        btn_fwd.connect("clicked", lambda b: self._seek_offset(10))
        mid_box.pack_start(btn_fwd, False, False, 0)

        ctrl_card.pack_start(mid_box, True, True, 0)

        right_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        right_box.set_halign(Gtk.Align.END)

        # Tiyatro modu (T)
        self.btn_theater = Gtk.Button()
        self.btn_theater.add(TheaterModeIcon())
        self.btn_theater.set_tooltip_text("Tiyatro Modu (T)")
        self.btn_theater.get_style_context().add_class("btn-secondary")
        self.btn_theater.connect("clicked", lambda b: self.toggle_theater())
        right_box.pack_start(self.btn_theater, False, False, 0)

        # Tam ekran (F11 / F)
        self.btn_fs = Gtk.Button()
        self.btn_fs.set_image(Gtk.Image.new_from_icon_name("view-fullscreen-symbolic", Gtk.IconSize.BUTTON))
        self.btn_fs.set_tooltip_text("Tam Ekran (F11)")
        self.btn_fs.get_style_context().add_class("btn-secondary")
        self.btn_fs.connect("clicked", lambda b: self.toggle_fullscreen())
        right_box.pack_start(self.btn_fs, False, False, 0)

        lbl_sp = Gtk.Label(label="Hız:")
        lbl_sp.get_style_context().add_class("device-mac")
        right_box.pack_start(lbl_sp, False, False, 0)

        self.speed_combo = Gtk.ComboBoxText()
        self.speed_combo.get_style_context().add_class("termius-search")
        speeds = [("0.5", "0.5x"), ("0.75", "0.75x"), ("1.0", "1.0x (Normal)"), ("1.25", "1.25x"), ("1.5", "1.5x"), ("2.0", "2.0x")]
        for s_val, s_lbl in speeds:
            self.speed_combo.append(s_val, s_lbl)
        self.speed_combo.set_active(2)
        self.speed_combo.connect("changed", self._on_speed_changed)
        right_box.pack_start(self.speed_combo, False, False, 0)

        ic_vol = Gtk.Image.new_from_icon_name("audio-volume-high-symbolic", Gtk.IconSize.BUTTON)
        right_box.pack_start(ic_vol, False, False, 4)

        self.scale_vol = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0, 1.0, 0.05)
        self.scale_vol.set_value(1.0)
        self.scale_vol.set_size_request(80, -1)
        self.scale_vol.set_draw_value(False)
        self.scale_vol.get_style_context().add_class("termius-search")
        self.scale_vol.connect("value-changed", self._on_volume_changed)
        right_box.pack_start(self.scale_vol, False, False, 0)

        if on_download_action:
            btn_dl_action = Gtk.Button(label="🚀 Bu Videoyu İndir")
            btn_dl_action.get_style_context().add_class("btn-primary")
            btn_dl_action.set_valign(Gtk.Align.CENTER)
            def _dl_wrapper(b):
                self._on_cleanup()
                self.response(Gtk.ResponseType.OK)
                if self.on_download_action:
                    self.on_download_action()
            btn_dl_action.connect("clicked", _dl_wrapper)
            right_box.pack_end(btn_dl_action, False, False, 6)

        ctrl_card.pack_end(right_box, False, False, 0)
        content.pack_start(ctrl_card, False, False, 0)
        self.ctrl_card = ctrl_card

        uri = filepath if filepath.startswith("http") else f"file://{os.path.abspath(filepath)}"
        self.player.set_property("uri", uri)
        self.player.set_state(Gst.State.PLAYING)
        if self.visualizer:
            self.visualizer.set_playing(True)

        self.poll_timer_id = GLib.timeout_add(250, self._on_poll_timeline)
        self.add_events(Gdk.EventMask.POINTER_MOTION_MASK)
        self.connect("key-press-event", self._on_key_press)
        self.connect("motion-notify-event", self._on_win_motion)
        self.connect("destroy", self._on_cleanup)
        self.connect("response", lambda d, r: self._on_cleanup())

    # ---------------- Görünüm Modları: Tam Ekran / Tiyatro ----------------
    def _set_content_margins(self, value):
        c = self._content_box
        c.set_margin_top(value)
        c.set_margin_bottom(value)
        c.set_margin_start(value)
        c.set_margin_end(value)

    def _hide_cursor(self):
        gdk_win = self.get_window()
        if gdk_win:
            blank = Gdk.Cursor.new_for_display(Gdk.Display.get_default(), Gdk.CursorType.BLANK_CURSOR)
            gdk_win.set_cursor(blank)

    def _reveal_cursor(self):
        gdk_win = self.get_window()
        if gdk_win:
            gdk_win.set_cursor(None)

    def _save_current_size(self):
        self._saved_size = self.get_size()

    def _refresh_mode_buttons(self):
        if self.view_mode == "fullscreen":
            icon, tip = "view-restore-symbolic", "Tam Ekrandan Çık (Esc / F11)"
        else:
            icon, tip = "view-fullscreen-symbolic", "Tam Ekran (F11)"
        self.btn_fs.set_image(Gtk.Image.new_from_icon_name(icon, Gtk.IconSize.BUTTON))
        self.btn_fs.set_tooltip_text(tip)
        ctx = self.btn_theater.get_style_context()
        ctx.remove_class("btn-primary" if self.view_mode != "theater" else "btn-secondary")
        ctx.add_class("btn-secondary" if self.view_mode != "theater" else "btn-primary")

    def toggle_fullscreen(self):
        if self.view_mode == "fullscreen":
            self._exit_fullscreen()
        else:
            self._enter_fullscreen()

    def _enter_fullscreen(self):
        if self.view_mode == "normal":
            self._save_current_size()
        self._mode_before_fs = self.view_mode
        self.view_mode = "fullscreen"
        self.custom_header.set_no_show_all(True)
        self.custom_header.set_visible(False)
        self.top_bar.set_no_show_all(True)
        self.top_bar.set_visible(False)
        self._set_content_margins(0)
        self.fullscreen()
        self._show_transient_controls()
        self._refresh_mode_buttons()

    def _exit_fullscreen(self):
        self.unfullscreen()
        if self._fs_hide_timer_id:
            GLib.source_remove(self._fs_hide_timer_id)
            self._fs_hide_timer_id = 0
        if self._mode_before_fs == "theater":
            self.view_mode = "theater"
            self.scrub_box.set_visible(True)
            self.ctrl_card.set_visible(True)
            self._reveal_cursor()
        else:
            self._apply_normal_mode()
        self._refresh_mode_buttons()

    def toggle_theater(self):
        if self.view_mode == "theater":
            self._apply_normal_mode()
        elif self.view_mode == "fullscreen":
            self.unfullscreen()
            if self._fs_hide_timer_id:
                GLib.source_remove(self._fs_hide_timer_id)
                self._fs_hide_timer_id = 0
            self._apply_normal_mode()
        else:
            self._save_current_size()
            self.view_mode = "theater"
            self.custom_header.set_no_show_all(True)
            self.custom_header.set_visible(False)
            self.top_bar.set_no_show_all(True)
            self.top_bar.set_visible(False)
            self._set_content_margins(0)
            display = Gdk.Display.get_default()
            gdk_win = self.get_window()
            monitor = (display.get_monitor_at_window(gdk_win) if gdk_win else None) or display.get_primary_monitor() or display.get_monitor(0)
            if monitor:
                geom = monitor.get_geometry()
                tw = int(geom.width * 0.86)
                th = int(geom.height * 0.86)
                self.resize(tw, th)
                self.move(geom.x + (geom.width - tw) // 2, geom.y + (geom.height - th) // 2)
        self._refresh_mode_buttons()

    def _apply_normal_mode(self):
        self.view_mode = "normal"
        self.custom_header.set_no_show_all(False)
        self.custom_header.set_visible(True)
        self.top_bar.set_no_show_all(False)
        self.top_bar.set_visible(True)
        t, b, s, e = self._content_margins
        c = self._content_box
        c.set_margin_top(t)
        c.set_margin_bottom(b)
        c.set_margin_start(s)
        c.set_margin_end(e)
        self.scrub_box.set_visible(True)
        self.ctrl_card.set_visible(True)
        self._reveal_cursor()
        if self._saved_size:
            self.resize(*self._saved_size)

    def _on_win_motion(self, widget, event):
        if self.view_mode == "fullscreen":
            self._show_transient_controls()
        return False

    def _show_transient_controls(self):
        self.scrub_box.set_visible(True)
        self.ctrl_card.set_visible(True)
        self._reveal_cursor()
        if self._fs_hide_timer_id:
            GLib.source_remove(self._fs_hide_timer_id)
        self._fs_hide_timer_id = GLib.timeout_add(2600, self._hide_fs_controls)

    def _hide_fs_controls(self):
        self._fs_hide_timer_id = 0
        if self.view_mode != "fullscreen":
            return False
        self.scrub_box.set_visible(False)
        self.ctrl_card.set_visible(False)
        self._hide_cursor()
        return False

    def _on_key_press(self, widget, event):
        kv = event.keyval
        if kv == Gdk.KEY_Escape:
            if self.view_mode == "fullscreen":
                self._exit_fullscreen()
                return True
            if self.view_mode == "theater":
                self.toggle_theater()
                return True
            return False
        if kv in (Gdk.KEY_F11, Gdk.KEY_f):
            self.toggle_fullscreen()
            return True
        if kv in (Gdk.KEY_t, Gdk.KEY_T):
            self.toggle_theater()
            return True

        focus = self.get_focus()
        if isinstance(focus, (Gtk.Button, Gtk.ComboBox, Gtk.Scale, Gtk.Entry)):
            return False
        if kv in (Gdk.KEY_space, Gdk.KEY_k):
            self._toggle_play_pause(None)
            return True
        if kv == Gdk.KEY_Left:
            self._seek_offset(-10)
            return True
        if kv == Gdk.KEY_Right:
            self._seek_offset(10)
            return True
        if kv in (Gdk.KEY_Up, Gdk.KEY_Down):
            step = 0.05 if kv == Gdk.KEY_Up else -0.05
            self.scale_vol.set_value(max(0.0, min(1.0, self.scale_vol.get_value() + step)))
            return True
        if kv in (Gdk.KEY_m, Gdk.KEY_M):
            cur = self.scale_vol.get_value()
            if cur > 0:
                self._last_volume = cur
                self.scale_vol.set_value(0.0)
            else:
                self.scale_vol.set_value(self._last_volume or 1.0)
            return True
        return False

    def _toggle_loop(self, btn):
        self.is_looping = not self.is_looping
        if self.is_looping:
            btn.get_style_context().remove_class("btn-secondary")
            btn.get_style_context().add_class("btn-primary")
        else:
            btn.get_style_context().remove_class("btn-primary")
            btn.get_style_context().add_class("btn-secondary")

    def _toggle_play_pause(self, widget):
        success, state, pending = self.player.get_state(100 * Gst.MSECOND)
        if state == Gst.State.PLAYING:
            self.player.set_state(Gst.State.PAUSED)
            self.btn_play.set_image(Gtk.Image.new_from_icon_name("media-playback-start-symbolic", Gtk.IconSize.BUTTON))
            self.btn_play.set_tooltip_text("Oynat")
            if self.visualizer:
                self.visualizer.set_playing(False)
        else:
            self.player.set_state(Gst.State.PLAYING)
            self.btn_play.set_image(Gtk.Image.new_from_icon_name("media-playback-pause-symbolic", Gtk.IconSize.BUTTON))
            self.btn_play.set_tooltip_text("Duraklat")
            if self.visualizer:
                self.visualizer.set_playing(True)

    def _seek_offset(self, seconds):
        try:
            ok, pos = self.player.query_position(Gst.Format.TIME)
            if ok:
                new_pos = max(0, pos + int(seconds * Gst.SECOND))
                if self.duration_ns > 0:
                    new_pos = min(new_pos, self.duration_ns)
                self.player.seek(
                    self.current_speed,
                    Gst.Format.TIME,
                    Gst.SeekFlags.FLUSH | Gst.SeekFlags.ACCURATE,
                    Gst.SeekType.SET, new_pos,
                    Gst.SeekType.NONE, 0
                )
        except Exception:
            pass

    def _on_speed_changed(self, combo):
        speed_str = combo.get_active_id() or "1.0"
        try:
            self.current_speed = float(speed_str)
            ok, pos = self.player.query_position(Gst.Format.TIME)
            if ok:
                self.player.seek(
                    self.current_speed,
                    Gst.Format.TIME,
                    Gst.SeekFlags.FLUSH | Gst.SeekFlags.ACCURATE,
                    Gst.SeekType.SET, pos,
                    Gst.SeekType.NONE, 0
                )
        except Exception:
            pass

    def _on_volume_changed(self, scale):
        vol = scale.get_value()
        self.player.set_property("volume", vol)

    def _on_seek_press(self, scale, event):
        self.is_seeking = True

    def _on_seek_release(self, scale, event):
        self._apply_seek(scale.get_value())
        self.is_seeking = False

    def _on_seek_change(self, scale, scroll, value):
        if not self.is_seeking:
            self._apply_seek(value)

    def _apply_seek(self, frac_pct):
        if self.duration_ns > 0:
            target_ns = int((frac_pct / 100.0) * self.duration_ns)
            self.player.seek(
                self.current_speed,
                Gst.Format.TIME,
                Gst.SeekFlags.FLUSH | Gst.SeekFlags.ACCURATE,
                Gst.SeekType.SET, target_ns,
                Gst.SeekType.NONE, 0
            )

    def _on_poll_timeline(self):
        if not self.get_mapped():
            return False

        if self.duration_ns <= 0:
            ok, dur = self.player.query_duration(Gst.Format.TIME)
            if ok and dur > 0:
                self.duration_ns = dur
                dur_sec = int(dur / Gst.SECOND)
                self.lbl_dur.set_text(f"{dur_sec // 60:02d}:{dur_sec % 60:02d}")

        ok, pos = self.player.query_position(Gst.Format.TIME)
        if ok and not self.is_seeking:
            pos_sec = int(pos / Gst.SECOND)
            self.lbl_pos.set_text(f"{pos_sec // 60:02d}:{pos_sec % 60:02d}")
            if self.duration_ns > 0:
                pct = (pos / self.duration_ns) * 100.0
                self.scale_seek.set_value(pct)
                if pos >= self.duration_ns - (300 * Gst.MSECOND):
                    if self.is_looping:
                        self._apply_seek(0)
                    else:
                        self.player.set_state(Gst.State.PAUSED)
                        self.btn_play.set_image(Gtk.Image.new_from_icon_name("media-playback-start-symbolic", Gtk.IconSize.BUTTON))
                        if self.visualizer:
                            self.visualizer.set_playing(False)

        return True

    def _on_cleanup(self, *args):
        if getattr(self, "_fs_hide_timer_id", 0):
            GLib.source_remove(self._fs_hide_timer_id)
            self._fs_hide_timer_id = 0
        self._reveal_cursor()
        if getattr(self, "view_mode", "normal") == "fullscreen":
            self.unfullscreen()
        if getattr(self, "poll_timer_id", 0):
            GLib.source_remove(self.poll_timer_id)
            self.poll_timer_id = 0
        if getattr(self, "visualizer", None):
            self.visualizer.destroy_timer()
        if getattr(self, "player", None):
            self.player.set_state(Gst.State.NULL)
            self.player = None


# -----------------------------------------------------------------------------
# 3. PRE-DOWNLOAD PREVIEW & QUALITY MODAL DIALOG
# -----------------------------------------------------------------------------
class MediaPreDownloadDialog(BentoDialog):
    """
    Rich Pre-download Preview Dialog with real-time feedback, step indicators,
    live activity logs, direct skip, and instant cancel.
    """
    def __init__(self, url, parent=None, on_confirm_download=None):
        super().__init__(title="Medya Önizleme ve İndirme Seçenekleri", parent=parent, icon_name="video-x-generic-symbolic", default_width=640, default_height=650)
        self.url = url
        
        # Tema uyumlu arka plan için CSS sınıfı
        self.get_style_context().add_class("bento-dialog-frame")
        
        self.on_confirm = on_confirm_download
        self.metadata = {}
        self.preview_player = None
        self.preview_timer_id = 0
        self.preview_stream_url = None
        self.probe_proc = None
        self.start_time = time.time()
        self.is_cancelled = False

        content = self.get_bento_content()
        content.set_spacing(12)

        # 1. Loading Banner with Live Progress & Feedback
        self.loading_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        self.loading_box.get_style_context().add_class("settings-card")
        self.loading_box.set_margin_top(28)
        self.loading_box.set_margin_bottom(28)
        self.loading_box.set_margin_start(16)
        self.loading_box.set_margin_end(16)

        # Header: Spinner + Title
        top_load = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        top_load.set_halign(Gtk.Align.CENTER)

        self.spinner = Gtk.Spinner()
        self.spinner.set_size_request(32, 32)
        self.spinner.start()
        top_load.pack_start(self.spinner, False, False, 0)

        self.lbl_load_title = Gtk.Label(label="Medya Akışı Analiz Ediliyor...")
        self.lbl_load_title.get_style_context().add_class("setting-title")
        top_load.pack_start(self.lbl_load_title, False, False, 0)
        self.loading_box.pack_start(top_load, False, False, 0)

        # Current Step Subtitle
        self.lbl_load_step = Gtk.Label(label="🌐 Adım 1/4: Sunucuya bağlanılıyor ve sayfa taranıyor...")
        self.lbl_load_step.get_style_context().add_class("device-name")
        self.lbl_load_step.set_halign(Gtk.Align.CENTER)
        self.loading_box.pack_start(self.lbl_load_step, False, False, 0)

        # Pulsing Progress Bar
        self.load_prog = Gtk.ProgressBar()
        self.load_prog.set_show_text(True)
        self.load_prog.set_text("Bağlantı kuruluyor...")
        self.loading_box.pack_start(self.load_prog, False, False, 0)

        # Live Activity Log Badge
        self.lbl_load_log = Gtk.Label(label="Hedef: " + (url[:60] + ("..." if len(url) > 60 else "")))
        self.lbl_load_log.get_style_context().add_class("device-mac")
        self.lbl_load_log.set_ellipsize(Pango.EllipsizeMode.END)
        self.lbl_load_log.set_halign(Gtk.Align.CENTER)
        self.loading_box.pack_start(self.lbl_load_log, False, False, 0)

        # Timer & Status Pill
        self.lbl_load_timer = Gtk.Label(label="⏱️ Geçen süre: 0 sn")
        self.lbl_load_timer.get_style_context().add_class("badge-active")
        self.lbl_load_timer.set_halign(Gtk.Align.CENTER)
        self.loading_box.pack_start(self.lbl_load_timer, False, False, 0)

        # Quick Actions during Loading: Skip to Download & Cancel
        act_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        act_box.set_halign(Gtk.Align.CENTER)
        act_box.set_margin_top(6)

        btn_cancel_load = Gtk.Button(label="✕ İptal Et")
        btn_cancel_load.get_style_context().add_class("btn-secondary")
        btn_cancel_load.connect("clicked", self._on_cancel_loading)
        act_box.pack_start(btn_cancel_load, False, False, 0)

        btn_skip_load = Gtk.Button(label="⚡ Beklemeden İndirmeye Başla")
        btn_skip_load.get_style_context().add_class("btn-primary")
        btn_skip_load.connect("clicked", self._on_skip_to_download)
        act_box.pack_start(btn_skip_load, False, False, 0)

        self.loading_box.pack_start(act_box, False, False, 0)
        content.pack_start(self.loading_box, True, True, 0)

        # 2. Main Content Container (Hidden until metadata fetched)
        self.details_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        self.details_box.set_no_show_all(True)
        self.details_box.hide()
        content.pack_start(self.details_box, True, True, 0)

        # Pulse timer
        self.load_timer_id = GLib.timeout_add(90, self._on_load_pulse)

        # Start background metadata probe
        threading.Thread(target=self._fetch_metadata_thread, daemon=True).start()
        self.connect("destroy", self._on_dialog_destroy)

    def _on_load_pulse(self):
        if not self.get_mapped():
            return True
        self.load_prog.pulse()
        elapsed = int(time.time() - self.start_time)
        self.lbl_load_timer.set_text(f"⏱️ Geçen süre: {elapsed} sn")

        if elapsed < 2:
            self.lbl_load_step.set_text("🌐 Adım 1/4: Sunucuya bağlanılıyor ve sayfa taranıyor...")
            self.load_prog.set_text("Sayfa doğrulanıyor...")
        elif elapsed < 4:
            self.lbl_load_step.set_text("🔍 Adım 2/4: Video başlığı, kanal ve süre ayrıştırılıyor...")
            self.load_prog.set_text("Meta veriler çözümleniyor...")
        elif elapsed < 6:
            self.lbl_load_step.set_text("📊 Adım 3/4: 4K / 1080p / MP3 ses akış formatları taranıyor...")
            self.load_prog.set_text("Formatlar listeleniyor...")
        else:
            self.lbl_load_step.set_text("🖼️ Adım 4/4: Önizleme kartı ve kapak görseli hazırlanıyor...")
            self.load_prog.set_text("Son kontroller yapılıyor...")
        return True

    def _on_cancel_loading(self, btn):
        self.is_cancelled = True
        if self.probe_proc:
            try:
                self.probe_proc.terminate()
            except Exception:
                pass
        self._stop_load_timer()
        self.response(Gtk.ResponseType.CANCEL)

    def _on_skip_to_download(self, btn):
        self.is_cancelled = True
        if self.probe_proc:
            try:
                self.probe_proc.terminate()
            except Exception:
                pass
        self._stop_load_timer()
        opts = {
            "fmt_key": "mp4_1080",
            "is_playlist": ("list=" in self.url or "playlist" in self.url),
            "is_sub": False,
            "is_id3": True,
            "meta_title": "Video Akışı (" + self.url.split("/")[-1][:30] + ")",
            "uploader": "Web Platformu",
            "thumb_path": None
        }
        if self.on_confirm:
            self.on_confirm(opts)
        self.response(Gtk.ResponseType.OK)

    def _stop_load_timer(self):
        if getattr(self, "load_timer_id", 0):
            GLib.source_remove(self.load_timer_id)
            self.load_timer_id = 0

    def _update_load_log(self, text):
        if hasattr(self, "lbl_load_log"):
            self.lbl_load_log.set_text(text)

    def _fetch_metadata_thread(self):
        import tempfile
        cmd = [
            "yt-dlp",
            "--dump-single-json",
            "--no-download",
            "--playlist-items", "1",
            "--extractor-args", "youtube:player_client=android,web",
            "--js-runtimes", "node:/usr/bin/node",
            self.url
        ]
        data = None
        temp_out = None
        try:
            temp_out = tempfile.NamedTemporaryFile(mode="w+", delete=False)
            proc = subprocess.Popen(cmd, stdout=temp_out, stderr=subprocess.PIPE, text=True, bufsize=1)
            self.probe_proc = proc

            for line in proc.stderr:
                if self.is_cancelled:
                    break
                line = line.strip()
                if line:
                    clean_log = line
                    if len(clean_log) > 65:
                        clean_log = clean_log[:62] + "..."
                    GLib.idle_add(self._update_load_log, clean_log)

            proc.wait()
            temp_out.close()

            if not self.is_cancelled and proc.returncode == 0 and os.path.exists(temp_out.name):
                with open(temp_out.name, "r") as f:
                    content_json = f.read()
                    if content_json:
                        data = json.loads(content_json)
        except Exception as e:
            GLib.idle_add(self._update_load_log, f"Uyarı: {str(e)[:50]}")
        finally:
            if temp_out and os.path.exists(temp_out.name):
                try:
                    os.unlink(temp_out.name)
                except Exception:
                    pass

        if self.is_cancelled:
            return

        if not data:
            data = {
                "title": "Medya Akışı (" + self.url.split("/")[-1][:30] + ")",
                "uploader": "Web Platformu",
                "duration_string": "Bilinmiyor",
                "view_count": 0,
                "like_count": 0,
                "thumbnail": None
            }

        # Cache thumbnail with 2.5s strict timeout
        thumb_url = data.get("thumbnail")
        local_thumb_path = None
        if thumb_url and thumb_url.startswith("http"):
            try:
                local_thumb_path = f"/tmp/ulak_thumb_{int(time.time()*1000)}.jpg"
                req = urllib.request.Request(thumb_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=2.5) as resp, open(local_thumb_path, "wb") as out_t:
                    out_t.write(resp.read())
            except Exception:
                local_thumb_path = None

        data["local_thumb"] = local_thumb_path
        self.metadata = data
        GLib.idle_add(self._render_metadata_ui)

    def _render_metadata_ui(self):
        self._stop_load_timer()
        self.loading_box.set_no_show_all(True)
        self.loading_box.hide()
        data = self.metadata

        # 1. Media Info Banner Card
        banner = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        banner.get_style_context().add_class("settings-card")

        thumb_path = data.get("local_thumb")
        if thumb_path and os.path.exists(thumb_path):
            try:
                pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(thumb_path, 160, 95, True)
                img = Gtk.Image.new_from_pixbuf(pixbuf)
                banner.pack_start(img, False, False, 0)
            except Exception:
                ic = Gtk.Image.new_from_icon_name("video-x-generic-symbolic", Gtk.IconSize.DIALOG)
                ic.set_pixel_size(64)
                banner.pack_start(ic, False, False, 0)
        else:
            ic = Gtk.Image.new_from_icon_name("video-x-generic-symbolic", Gtk.IconSize.DIALOG)
            ic.set_pixel_size(64)
            banner.pack_start(ic, False, False, 0)

        v_meta = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        v_meta.set_valign(Gtk.Align.CENTER)

        raw_title = data.get("title") or "Bilinmeyen Başlık"
        lbl_t = Gtk.Label(label=raw_title)
        lbl_t.get_style_context().add_class("device-name")
        lbl_t.set_halign(Gtk.Align.START)
        lbl_t.set_ellipsize(Pango.EllipsizeMode.END)
        lbl_t.set_max_width_chars(38)
        v_meta.pack_start(lbl_t, False, False, 0)

        channel = data.get("uploader") or data.get("channel") or "Bilinmeyen Kanal"
        lbl_chan = Gtk.Label(label=f"Kanal: {channel}")
        lbl_chan.get_style_context().add_class("setting-subtitle")
        lbl_chan.set_halign(Gtk.Align.START)
        v_meta.pack_start(lbl_chan, False, False, 0)

        pills_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        pills_box.set_margin_top(4)

        dur_text = data.get("duration_string")
        if not dur_text and data.get("duration"):
            d_sec = int(data.get("duration"))
            dur_text = f"{d_sec // 60:02d}:{d_sec % 60:02d}"
        if not dur_text:
            dur_text = "N/A"

        def _format_count(c):
            if not c:
                return "0"
            if c >= 1_000_000_000:
                return f"{c / 1_000_000_000:.1f}B"
            if c >= 1_000_000:
                return f"{c / 1_000_000:.1f}M"
            if c >= 1_000:
                return f"{c / 1_000:.1f}K"
            return str(c)

        views_text = _format_count(data.get("view_count", 0))
        likes_text = _format_count(data.get("like_count", 0))

        for icon_n, text in [("alarm-symbolic", f"⏱ {dur_text}"), ("find-location-symbolic", f"👁 {views_text}"), ("emblem-favorite-symbolic", f"👍 {likes_text}")]:
            pill = Gtk.Label(label=text)
            pill.get_style_context().add_class("badge-active")
            pills_box.pack_start(pill, False, False, 0)

        v_meta.pack_start(pills_box, False, False, 0)
        banner.pack_start(v_meta, True, True, 0)
        self.details_box.pack_start(banner, False, False, 0)

        # 2. Interactive Preview Player Snippet - Bento Card
        preview_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        preview_card.get_style_context().add_class("settings-card")
        preview_card.set_margin_top(2)

        # Sol ikon
        prev_icon = Gtk.Image.new_from_icon_name("media-playback-start-symbolic", Gtk.IconSize.BUTTON)
        preview_card.pack_start(prev_icon, False, False, 0)

        # Orta: başlık + açıklama
        v_prev_desc = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        v_prev_desc.set_valign(Gtk.Align.CENTER)

        lbl_p_title = Gtk.Label(label="Canlı Medya Önizleme & Yönetim Penceresi")
        lbl_p_title.get_style_context().add_class("setting-title")
        lbl_p_title.set_halign(Gtk.Align.START)
        v_prev_desc.pack_start(lbl_p_title, False, False, 0)

        self.lbl_prev_status = Gtk.Label(label="Saydam Bento oynatıcıda sarma çubuğu, ileri/geri sarma, hız ayarı ve ses yönetimi ile izleyin.")
        self.lbl_prev_status.get_style_context().add_class("setting-subtitle")
        self.lbl_prev_status.set_halign(Gtk.Align.START)
        v_prev_desc.pack_start(self.lbl_prev_status, False, False, 0)

        preview_card.pack_start(v_prev_desc, True, True, 0)

        # Sağ: buton
        self.btn_preview_play = Gtk.Button(label="▶ Önizle")
        self.btn_preview_play.get_style_context().add_class("btn-primary")
        self.btn_preview_play.set_valign(Gtk.Align.CENTER)
        self.btn_preview_play.connect("clicked", self._open_preview_player_window)
        preview_card.pack_end(self.btn_preview_play, False, False, 0)

        self.details_box.pack_start(preview_card, False, False, 0)

        formats = data.get("formats", [])
        for f in formats:
            if f.get("url") and f.get("url").startswith("http") and f.get("acodec") != "none":
                self.preview_stream_url = f.get("url")
                break

        # 3. Format and Quality Selection
        fmt_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        fmt_card.get_style_context().add_class("settings-card")

        ic_fmt = Gtk.Image.new_from_icon_name("emblem-documents-symbolic", Gtk.IconSize.BUTTON)
        fmt_card.pack_start(ic_fmt, False, False, 0)

        v_fmt = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        lbl_f_title = Gtk.Label(label="İndirme Formatı ve Kalite Seçimi")
        lbl_f_title.get_style_context().add_class("setting-title")
        lbl_f_title.set_halign(Gtk.Align.START)
        lbl_f_sub = Gtk.Label(label="En yüksek 4K Ultra HD veya 320kbps MP3 stüdyo sesi seçin.")
        lbl_f_sub.get_style_context().add_class("setting-subtitle")
        lbl_f_sub.set_halign(Gtk.Align.START)
        v_fmt.pack_start(lbl_f_title, False, False, 0)
        v_fmt.pack_start(lbl_f_sub, False, False, 0)
        fmt_card.pack_start(v_fmt, True, True, 0)

        self.fmt_combo = Gtk.ComboBoxText()
        self.fmt_combo.append("mp4_4k", "🎬 MP4 Video • 4K Ultra HD (2160p)")
        self.fmt_combo.append("mp4_1080", "🎬 MP4 Video • Full HD (1080p)")
        self.fmt_combo.append("mp4_720", "🎬 MP4 Video • HD (720p Hızlı)")
        self.fmt_combo.append("mp4_480", "🎬 MP4 Video • SD (480p Tasarruflu)")
        self.fmt_combo.append("webm_best", "🎬 WebM Video • En Yüksek Kalite")
        self.fmt_combo.append("mkv_best", "🎬 MKV Video • Evrensel Format")
        self.fmt_combo.append("mp3_320", "🎵 MP3 Ses • 320 kbps Stüdyo Kalitesi")
        self.fmt_combo.append("mp3_192", "🎵 MP3 Ses • 192 kbps Standart")
        self.fmt_combo.append("m4a_audio", "🎵 M4A Ses • Orijinal AAC Akışı")
        self.fmt_combo.append("flac_audio", "🎵 FLAC Ses • Kayıpsız Stüdyo (Lossless)")
        self.fmt_combo.append("wav_audio", "🎵 WAV Ses • Kayıpsız Ham Dalga")
        self.fmt_combo.append("opus_audio", "🎵 OPUS Ses • Yüksek Verimli Akış")
        self.fmt_combo.set_active(1)
        fmt_card.pack_end(self.fmt_combo, False, False, 0)
        self.details_box.pack_start(fmt_card, False, False, 0)

        # 4. Playlist & Additional Toggles
        is_playlist = "list=" in self.url or "playlist" in self.url or data.get("_type") == "playlist"
        self.sw_playlist = self._create_bento_switch_row(
            icon_name="media-playlist-repeat-symbolic",
            title="Tüm Oynatma Listesini İndir (Playlist)",
            subtitle="Tüm seriyi otomatik olarak kendi özel klasörüne sırayla indirir.",
            initial_state=is_playlist
        )
        self.details_box.pack_start(self.sw_playlist, False, False, 0)

        self.sw_sub = self._create_bento_switch_row(
            icon_name="format-text-underline-symbolic",
            title="Otomatik Altyazı İndir (.srt)",
            subtitle="Türkçe ve orijinal altyazı dosyalarını videoyla birlikte kaydeder.",
            initial_state=False
        )
        self.details_box.pack_start(self.sw_sub, False, False, 0)

        self.sw_id3 = self._create_bento_switch_row(
            icon_name="audio-x-generic-symbolic",
            title="ID3 Meta Etiketleri ve Kapak Resmi Göm",
            subtitle="İndirilen dosyalara şarkı adı, sanatçı ve kapak resmini işler.",
            initial_state=True
        )
        self.details_box.pack_start(self.sw_id3, False, False, 0)

        # 5. Bottom Action Buttons
        btn_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        btn_box.set_halign(Gtk.Align.END)
        btn_box.set_margin_top(8)

        btn_cancel = Gtk.Button(label="Vazgeç")
        btn_cancel.get_style_context().add_class("btn-secondary")
        btn_cancel.connect("clicked", lambda b: self.response(Gtk.ResponseType.CANCEL))
        btn_box.pack_start(btn_cancel, False, False, 0)

        btn_start = Gtk.Button(label="🚀 İndirmeyi Başlat")
        btn_start.get_style_context().add_class("btn-primary")
        btn_start.connect("clicked", self._on_confirm_clicked)
        btn_box.pack_start(btn_start, False, False, 0)

        self.details_box.pack_start(btn_box, False, False, 0)
        self.details_box.set_no_show_all(False)
        self.details_box.show_all()

    def _create_bento_switch_row(self, icon_name, title, subtitle, initial_state):
        card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        card.get_style_context().add_class("settings-card")

        icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.BUTTON)
        card.pack_start(icon, False, False, 0)

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        t_lbl = Gtk.Label(label=title)
        t_lbl.get_style_context().add_class("setting-title")
        t_lbl.set_halign(Gtk.Align.START)

        s_lbl = Gtk.Label(label=subtitle)
        s_lbl.get_style_context().add_class("setting-subtitle")
        s_lbl.set_halign(Gtk.Align.START)
        vbox.pack_start(t_lbl, False, False, 0)
        vbox.pack_start(s_lbl, False, False, 0)
        card.pack_start(vbox, True, True, 0)

        switch = Gtk.Switch()
        switch.set_valign(Gtk.Align.CENTER)
        switch.set_active(initial_state)
        card.pack_end(switch, False, False, 0)
        card.switch_widget = switch
        return card

    def _open_preview_player_window(self, btn):
        preview_target = self.preview_stream_url or self.url
        top_window = self.get_toplevel()
        dlg = BentoMediaPlayerDialog(
            filepath=preview_target,
            title=self.metadata.get("title", "Video Önizleme"),
            parent=top_window if isinstance(top_window, Gtk.Window) else None,
            is_audio=False,
            on_download_action=lambda: self._on_confirm_clicked(None)
        )
        dlg.show_all()
        dlg.run()
        dlg.destroy()

    def _toggle_preview_playback(self, btn):
        if not self.preview_stream_url:
            self.lbl_prev_status.set_text("Doğrudan canlı akış URL'si bu kaynak için kısıtlanmış.")
            return

        if self.preview_player is None:
            self.preview_player = Gst.ElementFactory.make("playbin", "preview_bin")
            self.preview_player.set_property("uri", self.preview_stream_url)

        success, state, pending = self.preview_player.get_state(100 * Gst.MSECOND)
        if state == Gst.State.PLAYING:
            self.preview_player.set_state(Gst.State.PAUSED)
            self.btn_preview_play.set_label("▶ Önizle")
            self.lbl_prev_status.set_text("Önizleme duraklatıldı.")
        else:
            self.preview_player.set_state(Gst.State.PLAYING)
            self.btn_preview_play.set_label("⏸ Duraklat")
            self.lbl_prev_status.set_text("Canlı ses/video önizlemesi çalınıyor...")

    def _on_confirm_clicked(self, btn):
        opts = {
            "fmt_key": self.fmt_combo.get_active_id() or "mp4_1080",
            "is_playlist": self.sw_playlist.switch_widget.get_active(),
            "is_sub": self.sw_sub.switch_widget.get_active(),
            "is_id3": self.sw_id3.switch_widget.get_active(),
            "meta_title": self.metadata.get("title", ""),
            "uploader": self.metadata.get("uploader", ""),
            "thumb_path": self.metadata.get("local_thumb")
        }
        if self.on_confirm:
            self.on_confirm(opts)
        self.response(Gtk.ResponseType.OK)

    def _on_dialog_destroy(self, *args):
        self._stop_load_timer()
        if self.probe_proc:
            try:
                self.probe_proc.terminate()
            except Exception:
                pass
        if self.preview_player:
            self.preview_player.set_state(Gst.State.NULL)
            self.preview_player = None


# -----------------------------------------------------------------------------
# 5. STANDALONE BENTO MEDIA PLAYER WINDOW (İndirilenler için yeni pencere)
# -----------------------------------------------------------------------------
class BentoMediaPlayerWindow(Gtk.Window):
    """
    Bağımsız medya oynatıcı penceresi - indirilenler listesindeki 'Oynat' butonundan açılır.
    BentoDialog yerine Gtk.Window kullanır, böylece ana pencereyi bloklamaz.
    """
    def __init__(self, filepath, title="Medya Oynatıcı", parent=None):
        super().__init__()
        self.set_title("ULAK Medya Oynatıcı")
        self.set_default_size(820, 600)
        self.set_resizable(True)
        self.set_position(Gtk.WindowPosition.CENTER)
        self.set_decorated(False)  # Frameless için tema uyumlu
        self.set_app_paintable(True)
        
        # Tema uyumlu arka plan
        screen = self.get_screen()
        if screen and screen.is_composited():
            self.set_visual(screen.get_rgba_visual())
        self.connect("draw", self._on_bg_draw)

        self.filepath = filepath
        self.media_title = title
        self.is_seeking = False
        self.duration_ns = 0
        self.current_speed = 1.0
        self.is_looping = False
        self.poll_timer_id = 0
        self._is_snapped = False
        self._normal_width = 820
        self._normal_height = 600

        # Görünüm modu: "normal" | "theater" | "fullscreen"
        self.view_mode = "normal"
        self._mode_before_fs = "normal"
        self._saved_geometry = None
        self._fs_hide_timer_id = 0
        self._last_volume = 1.0
        self._normal_margin = 12

        audio_exts = (".mp3", ".m4a", ".wav", ".flac", ".ogg", ".opus", ".aac")
        self.is_audio = any(filepath.lower().endswith(ext) for ext in audio_exts)

        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        outer.set_margin_top(12)
        outer.set_margin_bottom(12)
        outer.set_margin_start(12)
        outer.set_margin_end(12)
        outer.get_style_context().add_class("main-frame")
        self.add(outer)
        self.outer_box = outer

        # Başlık çubuğu - tema uyumlu
        titlebar = Gtk.EventBox()
        self.titlebar = titlebar
        titlebar.connect("button-press-event", self._on_drag_start)
        titlebar.connect("button-release-event", self._on_drag_end)
        titlebar.connect("motion-notify-event", self._on_drag_motion)
        titlebar.add_events(Gdk.EventMask.BUTTON_PRESS_MASK | Gdk.EventMask.BUTTON_RELEASE_MASK | Gdk.EventMask.POINTER_MOTION_MASK)
        titlebar.get_style_context().add_class("dialog-header")

        tb_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        tb_box.set_margin_top(4)
        tb_box.set_margin_bottom(8)
        tb_box.set_margin_start(4)
        tb_box.set_margin_end(4)

        ic_type = "audio-x-generic-symbolic" if self.is_audio else "video-x-generic-symbolic"
        tb_ic = Gtk.Image.new_from_icon_name(ic_type, Gtk.IconSize.BUTTON)
        tb_box.pack_start(tb_ic, False, False, 0)

        lbl_t = Gtk.Label(label=title)
        lbl_t.get_style_context().add_class("setting-title")
        lbl_t.set_ellipsize(Pango.EllipsizeMode.END)
        lbl_t.set_max_width_chars(50)
        lbl_t.set_halign(Gtk.Align.START)
        tb_box.pack_start(lbl_t, True, True, 0)

        # Window control buttons (ana uygulama stili)
        actions_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=4)
        actions_box.set_valign(Gtk.Align.CENTER)

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
        btn_close.connect("clicked", lambda b: self._on_cleanup())
        actions_box.pack_start(btn_close, False, False, 0)

        tb_box.pack_end(actions_box, False, False, 0)

        titlebar.add(tb_box)
        outer.pack_start(titlebar, False, False, 0)

        # Display Box
        self.display_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        self.display_box.get_style_context().add_class("card")
        outer.pack_start(self.display_box, True, True, 0)

        self.player = Gst.ElementFactory.make("playbin", "win_player")
        
        # Pitch preservation için scaletempo audio-filter ekle
        self.pitch_filter = Gst.ElementFactory.make("scaletempo", "pitch_filter")
        if self.pitch_filter:
            self.player.set_property("audio-filter", self.pitch_filter)
        
        if not self.is_audio:
            self.vsink = Gst.ElementFactory.make("gtksink", "win_vsink")
            if self.vsink and hasattr(self.vsink.props, "widget"):
                self.player.set_property("video-sink", self.vsink)
                video_widget = self.vsink.props.widget
                video_widget.set_size_request(-1, 360)
                self.display_box.pack_start(video_widget, True, True, 0)
            else:
                self.is_audio = True

        if self.is_audio:
            self.visualizer = AudioVisualizerWidget()
            self.visualizer.set_track_info(title=os.path.basename(filepath), artist="ULAK Medya")
            self.display_box.pack_start(self.visualizer, True, True, 0)
        else:
            self.visualizer = None

        # Scrubber
        scrub_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        scrub_box.set_margin_start(4)
        scrub_box.set_margin_end(4)
        scrub_box.set_margin_top(6)
        scrub_box.get_style_context().add_class("settings-card")

        self.lbl_pos = Gtk.Label(label="00:00")
        self.lbl_pos.get_style_context().add_class("device-mac")
        scrub_box.pack_start(self.lbl_pos, False, False, 0)

        self.scale_seek = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0, 100.0, 0.5)
        self.scale_seek.set_draw_value(False)
        self.scale_seek.set_hexpand(True)
        self.scale_seek.get_style_context().add_class("termius-search")
        self.scale_seek.connect("button-press-event", lambda s, e: setattr(self, "is_seeking", True))
        self.scale_seek.connect("button-release-event", self._on_seek_release)
        self.scale_seek.connect("change-value", self._on_seek_change)
        scrub_box.pack_start(self.scale_seek, True, True, 0)

        self.lbl_dur = Gtk.Label(label="00:00")
        self.lbl_dur.get_style_context().add_class("device-mac")
        scrub_box.pack_start(self.lbl_dur, False, False, 0)
        outer.pack_start(scrub_box, False, False, 0)
        self.scrub_box = scrub_box

        # Control Bar
        ctrl_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        ctrl_card.get_style_context().add_class("settings-card")
        ctrl_card.set_margin_top(6)

        btn_loop = Gtk.Button()
        btn_loop.set_image(Gtk.Image.new_from_icon_name("media-playlist-repeat-symbolic", Gtk.IconSize.BUTTON))
        btn_loop.set_tooltip_text("Tekrar Oynat")
        btn_loop.get_style_context().add_class("btn-secondary")
        btn_loop.connect("clicked", self._toggle_loop)
        ctrl_card.pack_start(btn_loop, False, False, 0)
        self.btn_loop = btn_loop

        mid_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        mid_box.set_halign(Gtk.Align.CENTER)

        btn_rwd = Gtk.Button()
        btn_rwd.set_image(Gtk.Image.new_from_icon_name("media-seek-backward-symbolic", Gtk.IconSize.BUTTON))
        btn_rwd.set_tooltip_text("10 Saniye Geri")
        btn_rwd.get_style_context().add_class("btn-secondary")
        btn_rwd.connect("clicked", lambda b: self._seek_offset(-10))
        mid_box.pack_start(btn_rwd, False, False, 0)

        self.btn_play = Gtk.Button()
        self.btn_play.set_image(Gtk.Image.new_from_icon_name("media-playback-pause-symbolic", Gtk.IconSize.BUTTON))
        self.btn_play.set_tooltip_text("Duraklat")
        self.btn_play.get_style_context().add_class("btn-primary")
        self.btn_play.connect("clicked", self._toggle_play_pause)
        mid_box.pack_start(self.btn_play, False, False, 0)

        btn_fwd = Gtk.Button()
        btn_fwd.set_image(Gtk.Image.new_from_icon_name("media-seek-forward-symbolic", Gtk.IconSize.BUTTON))
        btn_fwd.set_tooltip_text("10 Saniye İleri")
        btn_fwd.get_style_context().add_class("btn-secondary")
        btn_fwd.connect("clicked", lambda b: self._seek_offset(10))
        mid_box.pack_start(btn_fwd, False, False, 0)
        ctrl_card.pack_start(mid_box, True, True, 0)

        right_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        right_box.set_halign(Gtk.Align.END)

        # Tiyatro modu (T)
        self.btn_theater = Gtk.Button()
        self.btn_theater.add(TheaterModeIcon())
        self.btn_theater.set_tooltip_text("Tiyatro Modu (T)")
        self.btn_theater.get_style_context().add_class("btn-secondary")
        self.btn_theater.connect("clicked", lambda b: self.toggle_theater())
        right_box.pack_start(self.btn_theater, False, False, 0)

        # Tam ekran (F11 / F)
        self.btn_fs = Gtk.Button()
        self.btn_fs.set_image(Gtk.Image.new_from_icon_name("view-fullscreen-symbolic", Gtk.IconSize.BUTTON))
        self.btn_fs.set_tooltip_text("Tam Ekran (F11)")
        self.btn_fs.get_style_context().add_class("btn-secondary")
        self.btn_fs.connect("clicked", lambda b: self.toggle_fullscreen())
        right_box.pack_start(self.btn_fs, False, False, 0)

        lbl_sp = Gtk.Label(label="Hız:")
        lbl_sp.get_style_context().add_class("device-mac")
        right_box.pack_start(lbl_sp, False, False, 0)

        self.speed_combo = Gtk.ComboBoxText()
        self.speed_combo.get_style_context().add_class("termius-search")
        for s_val, s_lbl in [("0.5", "0.5x"), ("0.75", "0.75x"), ("1.0", "1.0x"), ("1.25", "1.25x"), ("1.5", "1.5x"), ("2.0", "2.0x")]:
            self.speed_combo.append(s_val, s_lbl)
        self.speed_combo.set_active(2)
        self.speed_combo.connect("changed", self._on_speed_changed)
        right_box.pack_start(self.speed_combo, False, False, 0)

        ic_vol = Gtk.Image.new_from_icon_name("audio-volume-high-symbolic", Gtk.IconSize.BUTTON)
        right_box.pack_start(ic_vol, False, False, 4)

        self.scale_vol = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0, 1.0, 0.05)
        self.scale_vol.set_value(1.0)
        self.scale_vol.set_size_request(80, -1)
        self.scale_vol.set_draw_value(False)
        self.scale_vol.get_style_context().add_class("termius-search")
        self.scale_vol.connect("value-changed", lambda s: self.player.set_property("volume", s.get_value()))
        right_box.pack_start(self.scale_vol, False, False, 0)
        ctrl_card.pack_end(right_box, False, False, 0)
        outer.pack_start(ctrl_card, False, False, 0)
        self.ctrl_card = ctrl_card

        uri = filepath if filepath.startswith("http") else f"file://{os.path.abspath(filepath)}"
        self.player.set_property("uri", uri)
        self.player.set_state(Gst.State.PLAYING)
        if self.visualizer:
            self.visualizer.set_playing(True)

        self.poll_timer_id = GLib.timeout_add(250, self._on_poll_timeline)
        self.add_events(Gdk.EventMask.POINTER_MOTION_MASK)
        self.connect("key-press-event", self._on_key_press)
        self.connect("motion-notify-event", self._on_win_motion)
        self.connect("destroy", self._on_cleanup)

    def _on_bg_draw(self, widget, cr):
        import cairo
        w = widget.get_allocated_width()
        h = widget.get_allocated_height()
        cr.save()
        cr.set_operator(cairo.OPERATOR_SOURCE)
        cr.set_source_rgba(0, 0, 0, 0)
        cr.paint()
        cr.restore()
        return False

    def _on_drag_start(self, widget, event):
        if event.button == 1:
            self._drag_x = event.x_root
            self._drag_y = event.y_root
            self._dragging = True
            # Reset snap state when drag starts
            if self._is_snapped:
                self._is_snapped = False

    def _on_drag_end(self, widget, event):
        self._dragging = False
        # Check for snap on release
        if self._check_and_snap_cursor(event.x_root, event.y_root):
            pass

    def _on_drag_motion(self, widget, event):
        if getattr(self, "_dragging", False):
            dx = event.x_root - self._drag_x
            dy = event.y_root - self._drag_y
            x, y = self.get_position()
            self.move(int(x + dx), int(y + dy))
            self._drag_x = event.x_root
            self._drag_y = event.y_root
            # Check snap during drag
            self._check_and_snap_cursor(event.x_root, event.y_root)

    def _toggle_maximize(self, widget):
        if self.is_maximized():
            self.unmaximize()
            self.btn_max.set_label("▢")
        else:
            self.maximize()
            self.btn_max.set_label("❐")

    # ---------------- Görünüm Modları: Tam Ekran / Tiyatro ----------------
    def _set_outer_margins(self, value):
        self.outer_box.set_margin_top(value)
        self.outer_box.set_margin_bottom(value)
        self.outer_box.set_margin_start(value)
        self.outer_box.set_margin_end(value)

    def _hide_cursor(self):
        gdk_win = self.get_window()
        if gdk_win:
            blank = Gdk.Cursor.new_for_display(Gdk.Display.get_default(), Gdk.CursorType.BLANK_CURSOR)
            gdk_win.set_cursor(blank)

    def _reveal_cursor(self):
        gdk_win = self.get_window()
        if gdk_win:
            gdk_win.set_cursor(None)

    def _save_current_geometry(self):
        if self.get_window():
            x, y = self.get_position()
            w, h = self.get_size()
            self._saved_geometry = (x, y, w, h)

    def _refresh_mode_buttons(self):
        if self.view_mode == "fullscreen":
            icon, tip = "view-restore-symbolic", "Tam Ekrandan Çık (Esc / F11)"
        else:
            icon, tip = "view-fullscreen-symbolic", "Tam Ekran (F11)"
        self.btn_fs.set_image(Gtk.Image.new_from_icon_name(icon, Gtk.IconSize.BUTTON))
        self.btn_fs.set_tooltip_text(tip)
        ctx = self.btn_theater.get_style_context()
        ctx.remove_class("btn-primary" if self.view_mode != "theater" else "btn-secondary")
        ctx.add_class("btn-secondary" if self.view_mode != "theater" else "btn-primary")

    def toggle_fullscreen(self):
        if self.view_mode == "fullscreen":
            self._exit_fullscreen()
        else:
            self._enter_fullscreen()

    def _enter_fullscreen(self):
        if self.view_mode == "normal":
            self._save_current_geometry()
        self._mode_before_fs = self.view_mode
        self.view_mode = "fullscreen"
        self.titlebar.set_no_show_all(True)
        self.titlebar.set_visible(False)
        self._set_outer_margins(0)
        self.fullscreen()
        self._show_transient_controls()
        self._refresh_mode_buttons()

    def _exit_fullscreen(self):
        self.unfullscreen()
        if self._fs_hide_timer_id:
            GLib.source_remove(self._fs_hide_timer_id)
            self._fs_hide_timer_id = 0
        if self._mode_before_fs == "theater":
            self.view_mode = "theater"
            self.scrub_box.set_visible(True)
            self.ctrl_card.set_visible(True)
            self._reveal_cursor()
            self._apply_theater_geometry()
        else:
            self._apply_normal_mode()
        self._refresh_mode_buttons()

    def toggle_theater(self):
        if self.view_mode == "theater":
            self._apply_normal_mode()
        elif self.view_mode == "fullscreen":
            self.unfullscreen()
            if self._fs_hide_timer_id:
                GLib.source_remove(self._fs_hide_timer_id)
                self._fs_hide_timer_id = 0
            self._apply_normal_mode()
        else:
            self._enter_theater()
        self._refresh_mode_buttons()

    def _enter_theater(self):
        self._save_current_geometry()
        self.view_mode = "theater"
        self.titlebar.set_no_show_all(True)
        self.titlebar.set_visible(False)
        self._set_outer_margins(0)
        self._apply_theater_geometry()

    def _apply_theater_geometry(self):
        if self.is_maximized():
            self.unmaximize()
        display = Gdk.Display.get_default()
        gdk_win = self.get_window()
        monitor = (display.get_monitor_at_window(gdk_win) if gdk_win else None) or display.get_primary_monitor() or display.get_monitor(0)
        if monitor:
            geom = monitor.get_geometry()
            tw = int(geom.width * 0.86)
            th = int(geom.height * 0.86)
            self.resize(tw, th)
            self.move(geom.x + (geom.width - tw) // 2, geom.y + (geom.height - th) // 2)

    def _apply_normal_mode(self):
        self.view_mode = "normal"
        self.titlebar.set_no_show_all(False)
        self.titlebar.set_visible(True)
        self._set_outer_margins(self._normal_margin)
        self.scrub_box.set_visible(True)
        self.ctrl_card.set_visible(True)
        self._reveal_cursor()
        if self._saved_geometry:
            x, y, w, h = self._saved_geometry
            self.resize(w, h)
            self.move(x, y)

    def _on_win_motion(self, widget, event):
        if self.view_mode == "fullscreen":
            self._show_transient_controls()
        return False

    def _show_transient_controls(self):
        self.scrub_box.set_visible(True)
        self.ctrl_card.set_visible(True)
        self._reveal_cursor()
        if self._fs_hide_timer_id:
            GLib.source_remove(self._fs_hide_timer_id)
        self._fs_hide_timer_id = GLib.timeout_add(2600, self._hide_fs_controls)

    def _hide_fs_controls(self):
        self._fs_hide_timer_id = 0
        if self.view_mode != "fullscreen":
            return False
        self.scrub_box.set_visible(False)
        self.ctrl_card.set_visible(False)
        self._hide_cursor()
        return False

    def _on_key_press(self, widget, event):
        kv = event.keyval
        if kv == Gdk.KEY_Escape:
            if self.view_mode == "fullscreen":
                self._exit_fullscreen()
                return True
            if self.view_mode == "theater":
                self.toggle_theater()
                return True
            return False
        if kv in (Gdk.KEY_F11, Gdk.KEY_f):
            self.toggle_fullscreen()
            return True
        if kv in (Gdk.KEY_t, Gdk.KEY_T):
            self.toggle_theater()
            return True

        focus = self.get_focus()
        if isinstance(focus, (Gtk.Button, Gtk.ComboBox, Gtk.Scale, Gtk.Entry)):
            return False
        if kv in (Gdk.KEY_space, Gdk.KEY_k):
            self._toggle_play_pause(None)
            return True
        if kv == Gdk.KEY_Left:
            self._seek_offset(-10)
            return True
        if kv == Gdk.KEY_Right:
            self._seek_offset(10)
            return True
        if kv in (Gdk.KEY_Up, Gdk.KEY_Down):
            step = 0.05 if kv == Gdk.KEY_Up else -0.05
            self.scale_vol.set_value(max(0.0, min(1.0, self.scale_vol.get_value() + step)))
            return True
        if kv in (Gdk.KEY_m, Gdk.KEY_M):
            cur = self.scale_vol.get_value()
            if cur > 0:
                self._last_volume = cur
                self.scale_vol.set_value(0.0)
            else:
                self.scale_vol.set_value(self._last_volume or 1.0)
            return True
        return False

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
        if not self._is_snapped:
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
        if not display:
            return False
            
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

    def _toggle_loop(self, btn):
        self.is_looping = not self.is_looping
        ctx = btn.get_style_context()
        if self.is_looping:
            ctx.remove_class("btn-secondary")
            ctx.add_class("btn-primary")
        else:
            ctx.remove_class("btn-primary")
            ctx.add_class("btn-secondary")

    def _toggle_play_pause(self, widget):
        _, state, _ = self.player.get_state(100 * Gst.MSECOND)
        if state == Gst.State.PLAYING:
            self.player.set_state(Gst.State.PAUSED)
            self.btn_play.set_image(Gtk.Image.new_from_icon_name("media-playback-start-symbolic", Gtk.IconSize.BUTTON))
            self.btn_play.set_tooltip_text("Oynat")
            if self.visualizer:
                self.visualizer.set_playing(False)
        else:
            self.player.set_state(Gst.State.PLAYING)
            self.btn_play.set_image(Gtk.Image.new_from_icon_name("media-playback-pause-symbolic", Gtk.IconSize.BUTTON))
            self.btn_play.set_tooltip_text("Duraklat")
            if self.visualizer:
                self.visualizer.set_playing(True)

    def _seek_offset(self, seconds):
        try:
            ok, pos = self.player.query_position(Gst.Format.TIME)
            if ok:
                new_pos = max(0, pos + int(seconds * Gst.SECOND))
                if self.duration_ns > 0:
                    new_pos = min(new_pos, self.duration_ns)
                self.player.seek(self.current_speed, Gst.Format.TIME,
                    Gst.SeekFlags.FLUSH | Gst.SeekFlags.ACCURATE,
                    Gst.SeekType.SET, new_pos, Gst.SeekType.NONE, 0)
        except Exception:
            pass

    def _on_speed_changed(self, combo):
        try:
            self.current_speed = float(combo.get_active_id() or "1.0")
            ok, pos = self.player.query_position(Gst.Format.TIME)
            if ok:
                self.player.seek(self.current_speed, Gst.Format.TIME,
                    Gst.SeekFlags.FLUSH | Gst.SeekFlags.ACCURATE,
                    Gst.SeekType.SET, pos, Gst.SeekType.NONE, 0)
        except Exception:
            pass

    def _on_seek_release(self, scale, event):
        self._apply_seek(scale.get_value())
        self.is_seeking = False

    def _on_seek_change(self, scale, scroll, value):
        if not self.is_seeking:
            self._apply_seek(value)

    def _apply_seek(self, frac_pct):
        if self.duration_ns > 0:
            target_ns = int((frac_pct / 100.0) * self.duration_ns)
            self.player.seek(self.current_speed, Gst.Format.TIME,
                Gst.SeekFlags.FLUSH | Gst.SeekFlags.ACCURATE,
                Gst.SeekType.SET, target_ns, Gst.SeekType.NONE, 0)

    def _on_poll_timeline(self):
        if not self.get_mapped():
            return False
        if self.duration_ns <= 0:
            ok, dur = self.player.query_duration(Gst.Format.TIME)
            if ok and dur > 0:
                self.duration_ns = dur
                dur_sec = int(dur / Gst.SECOND)
                self.lbl_dur.set_text(f"{dur_sec // 60:02d}:{dur_sec % 60:02d}")
        ok, pos = self.player.query_position(Gst.Format.TIME)
        if ok and not self.is_seeking:
            pos_sec = int(pos / Gst.SECOND)
            self.lbl_pos.set_text(f"{pos_sec // 60:02d}:{pos_sec % 60:02d}")
            if self.duration_ns > 0:
                pct = (pos / self.duration_ns) * 100.0
                self.scale_seek.set_value(pct)
                if pos >= self.duration_ns - (300 * Gst.MSECOND):
                    if self.is_looping:
                        self._apply_seek(0)
                    else:
                        self.player.set_state(Gst.State.PAUSED)
                        self.btn_play.set_label("▶ Oynat")
                        if self.visualizer:
                            self.visualizer.set_playing(False)
        return True

    def _on_cleanup(self, *args):
        if self._fs_hide_timer_id:
            GLib.source_remove(self._fs_hide_timer_id)
            self._fs_hide_timer_id = 0
        self._reveal_cursor()
        if getattr(self, "view_mode", "normal") == "fullscreen":
            self.unfullscreen()
        if self.poll_timer_id:
            GLib.source_remove(self.poll_timer_id)
            self.poll_timer_id = 0
        if getattr(self, "visualizer", None):
            self.visualizer.destroy_timer()
        if getattr(self, "player", None):
            self.player.set_state(Gst.State.NULL)
            self.player = None
        self.destroy()


# -----------------------------------------------------------------------------
# 6. MAIN YOUTUBE & MEDIA DOWNLOADER VIEW
# -----------------------------------------------------------------------------
class YouTubeView(Gtk.ScrolledWindow):
    def __init__(self, toast_service=None):
        super().__init__()
        self.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        self.toast_service = toast_service

        home = os.path.expanduser("~")
        self.dl_dir = os.path.join(home, "İndirilenler")
        if not os.path.exists(self.dl_dir):
            self.dl_dir = os.path.join(home, "Downloads")
        os.makedirs(self.dl_dir, exist_ok=True)

        self.active_tasks = {}

        main_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        main_box.set_margin_top(20)
        main_box.set_margin_bottom(24)
        main_box.set_margin_start(32)
        main_box.set_margin_end(32)
        self.add(main_box)

        # Header Bento Card
        header_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        header_card.get_style_context().add_class("settings-card")
        header_card.set_margin_bottom(4)

        header_icon = Gtk.Image.new_from_icon_name("video-x-generic-symbolic", Gtk.IconSize.DIALOG)
        header_icon.set_pixel_size(44)
        header_card.pack_start(header_icon, False, False, 0)

        header_vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        header_vbox.set_valign(Gtk.Align.CENTER)

        lbl_title = Gtk.Label(label="Video & Medya İndirici")
        lbl_title.get_style_context().add_class("device-name")
        lbl_title.set_halign(Gtk.Align.START)
        header_vbox.pack_start(lbl_title, False, False, 0)

        lbl_desc = Gtk.Label(label="YouTube ve web platformlarından 4K video, oynatma listesi (playlist), altyazı ve 320kbps MP3 indirin; yerleşik oynatıcıyla anında dinleyin/izleyin.")
        lbl_desc.get_style_context().add_class("setting-subtitle")
        lbl_desc.set_halign(Gtk.Align.START)
        lbl_desc.set_ellipsize(Pango.EllipsizeMode.END)
        lbl_desc.set_max_width_chars(80)
        header_vbox.pack_start(lbl_desc, False, False, 0)

        header_card.pack_start(header_vbox, True, True, 0)
        main_box.pack_start(header_card, False, False, 0)

        top_grid = Gtk.Grid(column_spacing=16, row_spacing=16)
        top_grid.set_column_homogeneous(True)
        main_box.pack_start(top_grid, False, False, 0)

        card_dl, self.graph_dl, self.lbl_dl_speed = self._create_bento_stat_card(
            "Aktif İndirme Akışı", "network-receive-symbolic", (0.06, 0.72, 0.5, 1.0)
        )
        self.graph_dl.set_fraction(0.0)
        self.lbl_dl_speed.set_text("Boşta • İndirme bekleniyor")
        top_grid.attach(card_dl, 0, 0, 1, 1)

        card_disk, self.graph_disk, self.lbl_disk_free = self._create_bento_stat_card(
            "İndirilenler Depolama Alanı", "drive-harddisk-symbolic", (0.2, 0.6, 1.0, 1.0)
        )
        self._update_disk_stats()
        top_grid.attach(card_disk, 1, 0, 1, 1)

        sec_dl = Gtk.Label(label="YENİ MEDYA / OYNATMA LİSTESİ İNDİRME")
        sec_dl.get_style_context().add_class("nav-section-title")
        sec_dl.set_halign(Gtk.Align.START)
        sec_dl.set_margin_top(8)
        main_box.pack_start(sec_dl, False, False, 0)

        input_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        input_card.get_style_context().add_class("settings-card")

        ic_link = Gtk.Image.new_from_icon_name("video-x-generic-symbolic", Gtk.IconSize.BUTTON)
        input_card.pack_start(ic_link, False, False, 0)

        self.url_entry = Gtk.Entry()
        self.url_entry.set_placeholder_text("YouTube video veya oynatma listesi (playlist) linkini buraya yapıştırın...")
        self.url_entry.get_style_context().add_class("termius-search")
        self.url_entry.set_hexpand(True)
        self.url_entry.connect("activate", self._open_predownload_preview)
        input_card.pack_start(self.url_entry, True, True, 0)

        btn_preview = Gtk.Button(label="Önizle ve İndir")
        self.btn_preview = btn_preview
        btn_preview.get_style_context().add_class("btn-primary")
        btn_preview.connect("clicked", self._open_predownload_preview)
        input_card.pack_start(btn_preview, False, False, 0)

        btn_open_folder = Gtk.Button(label="Klasörü Aç")
        btn_open_folder.get_style_context().add_class("btn-secondary")
        btn_open_folder.connect("clicked", lambda b: self._open_dir(self.dl_dir))
        input_card.pack_start(btn_open_folder, False, False, 0)

        main_box.pack_start(input_card, False, False, 0)

        sec_list = Gtk.Label(label="İNDİRME KUYRUĞU VE GEÇMİŞ")
        sec_list.get_style_context().add_class("nav-section-title")
        sec_list.set_halign(Gtk.Align.START)
        sec_list.set_margin_top(12)
        main_box.pack_start(sec_list, False, False, 0)

        self.search_entry = Gtk.SearchEntry()
        self.search_entry.get_style_context().add_class("termius-search")
        self.search_entry.set_placeholder_text("İndirilen dosyalarda veya listede ara...")
        main_box.pack_start(self.search_entry, False, False, 0)

        self.scroll_list = Gtk.ScrolledWindow()
        self.scroll_list.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        self.scroll_list.set_min_content_height(400)
        self.scroll_list.set_vexpand(True)

        self.listbox = Gtk.ListBox()
        self.listbox.set_selection_mode(Gtk.SelectionMode.NONE)
        self.scroll_list.add(self.listbox)
        main_box.pack_start(self.scroll_list, True, True, 0)

        def filter_func(row):
            q = self.search_entry.get_text().strip().lower()
            return q in getattr(row, "name", "").lower()
        self.listbox.set_filter_func(filter_func)
        self.search_entry.connect("search-changed", lambda e: self.listbox.invalidate_filter())

        self._populate_initial_rows()

    def _update_disk_stats(self):
        try:
            total, used, free = shutil.disk_usage(self.dl_dir)
            fraction = used / max(1, total)
            self.graph_disk.set_fraction(fraction)
            free_gb = free / (1024**3)
            total_gb = total / (1024**3)
            self.lbl_disk_free.set_text(f"{free_gb:.1f} GB Boş / {total_gb:.1f} GB")
        except Exception:
            pass

    def _create_bento_stat_card(self, title, icon_name, color):
        card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        card.get_style_context().add_class("settings-card")
        card.set_margin_top(4)
        card.set_margin_bottom(4)

        # Sol ikon
        ic = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.BUTTON)
        card.pack_start(ic, False, False, 0)

        # Orta: Dairesel grafik + metin
        mid_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        mid_box.set_valign(Gtk.Align.CENTER)

        graph = UsageGraph(color_rgba=color)
        mid_box.pack_start(graph, False, False, 0)

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        vbox.set_valign(Gtk.Align.CENTER)

        t_lbl = Gtk.Label(label=title)
        t_lbl.get_style_context().add_class("setting-title")
        t_lbl.set_halign(Gtk.Align.START)
        vbox.pack_start(t_lbl, False, False, 0)

        val_lbl = Gtk.Label(label="Hesaplanıyor...")
        val_lbl.get_style_context().add_class("setting-subtitle")
        val_lbl.set_halign(Gtk.Align.START)
        vbox.pack_start(val_lbl, False, False, 0)

        mid_box.pack_start(vbox, True, True, 0)
        card.pack_start(mid_box, True, True, 0)

        return card, graph, val_lbl

    def _open_predownload_preview(self, widget):
        url = self.url_entry.get_text().strip()
        if not url:
            if self.toast_service:
                self.toast_service.show("Lütfen geçerli bir video veya oynatma listesi linki girin!", type="warning")
            return

        if hasattr(self, "btn_preview"):
            self.btn_preview.set_label("⏳ Açılıyor...")
            self.btn_preview.set_sensitive(False)

        if self.toast_service:
            self.toast_service.show("Medya bağlantısı analiz ediliyor, önizleme penceresi açılıyor...", type="info")

        top_window = self.get_toplevel()
        dlg = MediaPreDownloadDialog(
            url=url,
            parent=top_window if isinstance(top_window, Gtk.Window) else None,
            on_confirm_download=lambda opts: self._start_download_from_options(url, opts)
        )
        dlg.show_all()
        dlg.run()
        dlg.destroy()

        if hasattr(self, "btn_preview"):
            self.btn_preview.set_label("Önizle ve İndir")
            self.btn_preview.set_sensitive(True)

    def _start_download_from_options(self, url, opts):
        fmt_key = opts.get("fmt_key", "mp4_1080")
        is_playlist = opts.get("is_playlist", False)
        is_sub = opts.get("is_sub", False)
        is_id3 = opts.get("is_id3", True)
        is_audio = "mp3" in fmt_key or "audio" in fmt_key

        cmd = [
            "yt-dlp",
            "--newline",
            "--continue",
            "--ignore-errors",
            "--no-check-certificates",
            "--extractor-args", "youtube:player_client=android,web",
            "--js-runtimes", "node:/usr/bin/node"
        ]

        if is_playlist:
            cmd.append("--yes-playlist")
            out_template = os.path.join(self.dl_dir, "%(playlist_title,Oynatma_Listesi)s", "%(playlist_index,01)s - %(title)s.%(ext)s")
        else:
            cmd.append("--no-playlist")
            out_template = os.path.join(self.dl_dir, "%(title)s.%(ext)s")
        cmd.extend(["-o", out_template])

        if fmt_key == "mp4_4k":
            cmd.extend(["-f", "bv*[height<=2160][ext=mp4]+ba[ext=m4a]/b[height<=2160]/bv*+ba/b", "--merge-output-format", "mp4"])
        elif fmt_key == "mp4_1080":
            cmd.extend(["-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080]/bv*+ba/b", "--merge-output-format", "mp4"])
        elif fmt_key == "mp4_720":
            cmd.extend(["-f", "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720]/bv*+ba/b", "--merge-output-format", "mp4"])
        elif fmt_key == "mp4_480":
            cmd.extend(["-f", "bv*[height<=480][ext=mp4]+ba[ext=m4a]/b[height<=480]/bv*+ba/b", "--merge-output-format", "mp4"])
        elif fmt_key == "webm_best":
            cmd.extend(["-f", "bv*[ext=webm]+ba/b[ext=webm]/bv*+ba/b", "--merge-output-format", "webm"])
        elif fmt_key == "mkv_best":
            cmd.extend(["-f", "bv*+ba/b", "--merge-output-format", "mkv"])
        elif fmt_key == "mp3_320":
            cmd.extend(["-x", "--audio-format", "mp3", "--audio-quality", "320k"])
        elif fmt_key == "mp3_192":
            cmd.extend(["-x", "--audio-format", "mp3", "--audio-quality", "192k"])
        elif fmt_key == "m4a_audio":
            cmd.extend(["-x", "--audio-format", "m4a"])
        elif fmt_key == "flac_audio":
            cmd.extend(["-x", "--audio-format", "flac"])
        elif fmt_key == "wav_audio":
            cmd.extend(["-x", "--audio-format", "wav"])
        elif fmt_key == "opus_audio":
            cmd.extend(["-x", "--audio-format", "opus"])

        if is_sub and not is_audio:
            cmd.extend(["--write-sub", "--sub-lang", "tr,en.*", "--convert-subs", "srt"])
        if is_id3:
            cmd.extend(["--embed-metadata"])

        cmd.append(url)

        task_id = f"task_{time.time()}"
        initial_title = opts.get("meta_title") or ("Oynatma Listesi İndiriliyor..." if is_playlist else "Video İndiriliyor...")
        thumb_path = opts.get("thumb_path")
        row = self._create_row_ui(
            task_id=task_id,
            title=initial_title,
            sub=f"{url[:42]}... • Başlatılıyor",
            icon_name="audio-x-generic-symbolic" if is_audio else "video-x-generic-symbolic",
            is_active=True,
            cmd=cmd,
            url=url,
            is_playlist=is_playlist,
            thumb_path=thumb_path
        )
        self.listbox.insert(row, 0)
        self.listbox.show_all()
        self.url_entry.set_text("")

        if self.toast_service:
            self.toast_service.show("İndirme işlemi kuyruğa eklendi ve başlatıldı.", type="info")

        self._spawn_downloader(task_id, cmd, row, url, is_playlist)

    def _spawn_downloader(self, task_id, cmd, row, url, is_playlist):
        self.active_tasks[task_id] = {
            "proc": None,
            "row": row,
            "cmd": cmd,
            "url": url,
            "is_playlist": is_playlist,
            "paused": False,
            "cancelled": False
        }
        threading.Thread(target=self._run_downloader_thread, args=(task_id, cmd, row, url, is_playlist), daemon=True).start()

    def _run_downloader_thread(self, task_id, cmd, row, url, is_playlist):
        last_error_line = ""
        dest_filepath = None
        try:
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
            if task_id in self.active_tasks:
                self.active_tasks[task_id]["proc"] = proc

            for line in proc.stdout:
                line = line.strip()
                if not line:
                    continue

                if "ERROR:" in line or "error:" in line.lower():
                    last_error_line = line

                if "[download] Destination:" in line:
                    dest = line.split("[download] Destination:")[1].strip()
                    dest_filepath = dest
                    fname = os.path.basename(dest)
                    GLib.idle_add(self._update_row_title, row, fname, dest)
                elif "[ExtractAudio] Destination:" in line:
                    dest = line.split("[ExtractAudio] Destination:")[1].strip()
                    dest_filepath = dest
                    fname = os.path.basename(dest)
                    GLib.idle_add(self._update_row_title, row, fname, dest)
                elif "[Merger] Merging formats into" in line:
                    m_dest = line.split("into")[1].strip().strip("\"'")
                    dest_filepath = m_dest
                    fname = os.path.basename(m_dest)
                    GLib.idle_add(self._update_row_title, row, fname, m_dest)

                m_item = re.search(r"\[download\] Downloading (?:item|video) (\d+) of (\d+)", line)
                if m_item:
                    cur_item = m_item.group(1)
                    tot_item = m_item.group(2)
                    GLib.idle_add(self._update_playlist_item_info, row, cur_item, tot_item)

                pct_m = re.search(r"([0-9\.]+)%", line)
                if pct_m and ("of" in line or "[download]" in line):
                    pct = float(pct_m.group(1)) / 100.0
                    size_m = re.search(r"of\s+~?\s*([0-9\.]+[A-Za-z]+)", line)
                    speed_m = re.search(r"at\s+([~0-9\.]+[A-Za-z/]+)", line)
                    eta_m = re.search(r"ETA\s+([0-9:]+)", line)

                    tot_size = size_m.group(1) if size_m else ""
                    speed = speed_m.group(1) if speed_m else ""
                    eta = eta_m.group(1) if eta_m else ""
                    GLib.idle_add(self._update_progress_ui, row, pct, speed, eta, tot_size)

            proc.wait()
            ret = proc.returncode

            task_info = self.active_tasks.get(task_id, {})
            if task_info.get("paused", False):
                GLib.idle_add(self._on_download_paused_ui, row, task_id)
            elif task_info.get("cancelled", False):
                GLib.idle_add(self._on_download_finished, row, task_id, False, "İptal Edildi", dest_filepath)
            elif ret == 0:
                GLib.idle_add(self._on_download_finished, row, task_id, True, "Tamamlandı", dest_filepath)
            else:
                clean_err = last_error_line.replace("ERROR:", "").strip() if last_error_line else f"Çıkış kodu: {ret}"
                GLib.idle_add(self._on_download_finished, row, task_id, False, clean_err[:50], dest_filepath)

        except Exception as e:
            GLib.idle_add(self._on_download_finished, row, task_id, False, str(e), dest_filepath)

    def _create_row_ui(self, task_id, title, sub, icon_name, is_active=True, cmd=None, url="", is_playlist=False, thumb_path=None):
        row = Gtk.ListBoxRow()
        row.task_id = task_id
        row.name = title
        row.saved_path = None
        row.cmd = cmd
        row.url = url
        row.is_playlist = is_playlist
        row.get_style_context().add_class("card")
        row.set_margin_bottom(8)

        # Outer horizontal box
        box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=0)

        # --- Thumbnail area (YouTube-style) - Clickable ---
        thumb_event = Gtk.EventBox()
        thumb_event.set_size_request(160, 90)
        thumb_event.get_style_context().add_class("card")
        thumb_event.connect("button-press-event", lambda b, e: self._play_row_media(row))

        thumb_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        thumb_box.set_size_request(160, 90)

        thumb_loaded = False
        if thumb_path and os.path.exists(thumb_path):
            try:
                pb = GdkPixbuf.Pixbuf.new_from_file_at_scale(thumb_path, 160, 90, True)
                img = Gtk.Image.new_from_pixbuf(pb)
                img.set_size_request(160, 90)
                thumb_box.pack_start(img, True, True, 0)
                thumb_loaded = True
            except Exception:
                pass

        if not thumb_loaded:
            # Fallback: Cairo drawn thumbnail placeholder
            da = Gtk.DrawingArea()
            da.set_size_request(160, 90)
            is_audio_file = icon_name == "audio-x-generic-symbolic"

            def _draw_thumb(widget, cr, _is_audio=is_audio_file):
                import cairo
                w2 = widget.get_allocated_width()
                h2 = widget.get_allocated_height()
                if _is_audio:
                    grad = cairo.LinearGradient(0, 0, w2, h2)
                    grad.add_color_stop_rgb(0, 0.08, 0.10, 0.20)
                    grad.add_color_stop_rgb(1, 0.15, 0.05, 0.25)
                else:
                    grad = cairo.LinearGradient(0, 0, w2, h2)
                    grad.add_color_stop_rgb(0, 0.06, 0.10, 0.18)
                    grad.add_color_stop_rgb(1, 0.10, 0.14, 0.22)
                cr.set_source(grad)
                cr.paint()
                # Play triangle
                cx2, cy2 = w2 / 2, h2 / 2
                cr.set_source_rgba(1, 1, 1, 0.25)
                cr.arc(cx2, cy2, 22, 0, 2 * math.pi)
                cr.fill()
                cr.set_source_rgba(1, 1, 1, 0.85)
                cr.move_to(cx2 - 8, cy2 - 12)
                cr.line_to(cx2 + 14, cy2)
                cr.line_to(cx2 - 8, cy2 + 12)
                cr.close_path()
                cr.fill()
                return False

            da.connect("draw", _draw_thumb)
            thumb_box.pack_start(da, True, True, 0)

        thumb_event.add(thumb_box)
        box.pack_start(thumb_event, False, False, 0)

        # --- Info area ---
        info_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        info_box.set_margin_start(12)
        info_box.set_margin_end(8)
        info_box.set_margin_top(8)
        info_box.set_margin_bottom(8)
        info_box.set_valign(Gtk.Align.CENTER)

        t_lbl = Gtk.Label(label=title)
        t_lbl.get_style_context().add_class("device-name")
        t_lbl.set_halign(Gtk.Align.START)
        t_lbl.set_ellipsize(Pango.EllipsizeMode.END)
        t_lbl.set_max_width_chars(40)

        s_lbl = Gtk.Label(label=sub)
        s_lbl.get_style_context().add_class("device-mac")
        s_lbl.set_halign(Gtk.Align.START)
        s_lbl.set_ellipsize(Pango.EllipsizeMode.END)
        s_lbl.set_max_width_chars(48)

        # Type badge
        badge_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        badge_row.set_margin_top(2)
        type_badge = Gtk.Label(label="🎵 MÜZİK" if icon_name == "audio-x-generic-symbolic" else "🎬 VİDEO")
        type_badge.get_style_context().add_class("badge-active")
        badge_row.pack_start(type_badge, False, False, 0)
        if is_playlist:
            pl_badge = Gtk.Label(label="📋 LİSTE")
            pl_badge.get_style_context().add_class("badge-active")
            badge_row.pack_start(pl_badge, False, False, 0)

        prog = Gtk.ProgressBar()
        prog.set_show_text(True)
        prog.set_no_show_all(not is_active)
        prog.set_visible(is_active)
        prog.set_fraction(0.0 if is_active else 1.0)
        prog.set_text("0%" if is_active else "Tamamlandı")
        prog.set_margin_top(4)

        info_box.pack_start(t_lbl, False, False, 0)
        info_box.pack_start(badge_row, False, False, 0)
        info_box.pack_start(s_lbl, False, False, 0)
        info_box.pack_start(prog, False, False, 0)
        box.pack_start(info_box, True, True, 0)

        # --- Action buttons ---
        btn_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        btn_box.set_valign(Gtk.Align.CENTER)
        btn_box.set_margin_end(10)
        btn_box.set_margin_start(4)

        if is_active:
            btn_pause = Gtk.Button(label="⏸ Duraklat")
            btn_pause.get_style_context().add_class("btn-secondary")
            btn_pause.connect("clicked", lambda b: self._pause_task(task_id, row))
            btn_box.pack_start(btn_pause, False, False, 0)
            row.btn_pause = btn_pause

            btn_cancel = Gtk.Button(label="✕ İptal")
            btn_cancel.get_style_context().add_class("btn-danger")
            btn_cancel.connect("clicked", lambda b: self._cancel_task(task_id, row))
            btn_box.pack_start(btn_cancel, False, False, 0)
            row.btn_cancel = btn_cancel
        else:
            btn_play = Gtk.Button(label="▶ Oynat")
            btn_play.get_style_context().add_class("btn-primary")
            btn_play.connect("clicked", lambda b: self._play_row_media(row))
            btn_box.pack_start(btn_play, False, False, 0)

            btn_folder = Gtk.Button(label="📁 Klasör")
            btn_folder.get_style_context().add_class("btn-secondary")
            btn_folder.connect("clicked", lambda b: self._open_dir(self.dl_dir))
            btn_box.pack_start(btn_folder, False, False, 0)

        box.pack_end(btn_box, False, False, 0)

        row.add(box)
        row.t_lbl = t_lbl
        row.s_lbl = s_lbl
        row.prog = prog
        row.btn_box = btn_box
        return row

    def _pause_task(self, task_id, row):
        task_info = self.active_tasks.get(task_id)
        if task_info and task_info.get("proc"):
            task_info["paused"] = True
            try:
                task_info["proc"].terminate()
            except Exception:
                pass
            if self.toast_service:
                self.toast_service.show("İndirme duraklatıldı. İstediğiniz zaman devam edebilirsiniz.", type="warning")

    def _cancel_task(self, task_id, row):
        task_info = self.active_tasks.get(task_id)
        if task_info and task_info.get("proc"):
            task_info["cancelled"] = True
            try:
                task_info["proc"].terminate()
            except Exception:
                pass
        self.listbox.remove(row)
        if self.toast_service:
            self.toast_service.show("İndirme iptal edildi ve listeden kaldırıldı.", type="info")

    def _resume_task(self, task_id, row):
        task_info = self.active_tasks.get(task_id)
        cmd = getattr(row, "cmd", None)
        url = getattr(row, "url", "")
        is_playlist = getattr(row, "is_playlist", False)
        if cmd:
            for ch in row.btn_box.get_children():
                row.btn_box.remove(ch)

            btn_pause = Gtk.Button(label="⏸ Duraklat")
            btn_pause.get_style_context().add_class("btn-secondary")
            btn_pause.connect("clicked", lambda b: self._pause_task(task_id, row))
            row.btn_box.pack_start(btn_pause, False, False, 0)

            btn_cancel = Gtk.Button(label="✕ İptal")
            btn_cancel.get_style_context().add_class("btn-danger")
            btn_cancel.connect("clicked", lambda b: self._cancel_task(task_id, row))
            row.btn_box.pack_start(btn_cancel, False, False, 0)
            row.btn_box.show_all()

            row.s_lbl.set_label("Devam ettiriliyor...")
            self._spawn_downloader(task_id, cmd, row, url, is_playlist)
            if self.toast_service:
                self.toast_service.show("İndirmeye devam ediliyor...", type="info")

    def _on_download_paused_ui(self, row, task_id):
        row.s_lbl.set_label("Duraklatıldı • Devam etmek için butona tıklayın")
        for ch in row.btn_box.get_children():
            row.btn_box.remove(ch)

        btn_resume = Gtk.Button(label="▶ Devam Et")
        btn_resume.get_style_context().add_class("btn-primary")
        btn_resume.connect("clicked", lambda b: self._resume_task(task_id, row))
        row.btn_box.pack_start(btn_resume, False, False, 0)

        btn_del = Gtk.Button(label="Kaldır")
        btn_del.get_style_context().add_class("btn-secondary")
        btn_del.connect("clicked", lambda b: self.listbox.remove(row))
        row.btn_box.pack_start(btn_del, False, False, 0)
        row.btn_box.show_all()
    def _play_row_media(self, row):
        target = getattr(row, "saved_path", None)
        if not target or not os.path.exists(target):
            c_name = os.path.join(self.dl_dir, row.name)
            if os.path.exists(c_name):
                target = c_name
        if target and os.path.exists(target):
            top_window = self.get_toplevel()
            win = BentoMediaPlayerWindow(filepath=target, title=os.path.basename(target), parent=top_window if isinstance(top_window, Gtk.Window) else None)
            win.show_all()
        else:
            if self.toast_service:
                self.toast_service.show("Medya dosyası diskte bulunamadı!", type="error")

    def _update_row_title(self, row, title, full_path=None):
        row.t_lbl.set_label(title)
        row.name = title
        if full_path:
            row.saved_path = full_path

    def _update_playlist_item_info(self, row, cur, tot):
        row.t_lbl.set_label(f"Oynatma Listesi: Video {cur} / {tot}")
        row.s_lbl.set_label(f"Liste İndiriliyor • Parça {cur}/{tot}")

    def _update_progress_ui(self, row, pct, speed, eta, tot_size=""):
        pct = max(0.0, min(1.0, pct))
        row.prog.set_fraction(pct)
        pct_int = int(pct * 100)
        row.prog.set_text(f"%{pct_int}")

        sub_parts = []
        if tot_size:
            sub_parts.append(tot_size)
        if speed:
            sub_parts.append(speed)
        if eta:
            sub_parts.append(f"Kalan: {eta}")

        sub_text = " • ".join(sub_parts) if sub_parts else f"%{pct_int} İndiriliyor..."
        row.s_lbl.set_label(sub_text)

        self.graph_dl.set_fraction(pct)
        self.lbl_dl_speed.set_text(f"{speed} • %{pct_int} Tamamlandı" if speed else f"%{pct_int} İndiriliyor")

    def _on_download_finished(self, row, task_id, success, msg, dest_filepath=None):
        self.active_tasks.pop(task_id, None)
        self._update_disk_stats()

        for ch in row.btn_box.get_children():
            row.btn_box.remove(ch)

        if success:
            if dest_filepath:
                row.saved_path = dest_filepath
            row.prog.set_fraction(1.0)
            row.prog.set_text("Tamamlandı")
            row.s_lbl.set_label(f"Başarıyla kaydedildi • {self.dl_dir}")

            btn_play = Gtk.Button(label="▶ Oynat")
            btn_play.get_style_context().add_class("btn-primary")
            btn_play.connect("clicked", lambda b: self._play_row_media(row))
            row.btn_box.pack_start(btn_play, False, False, 0)

            btn_folder = Gtk.Button(label="📁 Klasör")
            btn_folder.get_style_context().add_class("btn-secondary")
            btn_folder.connect("clicked", lambda b: self._open_dir(self.dl_dir))
            row.btn_box.pack_start(btn_folder, False, False, 0)

            btn_del = Gtk.Button(label="✕")
            btn_del.get_style_context().add_class("btn-secondary")
            btn_del.connect("clicked", lambda b: self.listbox.remove(row))
            row.btn_box.pack_start(btn_del, False, False, 0)

            # Thumbnail'i gizle (indirme tamamlandı, artık normal kart)
            row.prog.set_no_show_all(True)
            row.prog.hide()

            self.graph_dl.set_fraction(1.0)
            self.lbl_dl_speed.set_text("Tamamlandı • İndirilenler klasörüne kaydedildi")

            if self.toast_service:
                self.toast_service.show("İndirme başarıyla tamamlandı!", type="success")
        else:
            row.prog.set_fraction(0.0)
            row.prog.set_text("Başarısız")
            row.s_lbl.set_label(f"Hata: {msg}")

            btn_retry = Gtk.Button(label="🔄 Tekrar")
            btn_retry.get_style_context().add_class("btn-secondary")
            btn_retry.connect("clicked", lambda b: self._resume_task(task_id, row))
            row.btn_box.pack_start(btn_retry, False, False, 0)

            btn_del = Gtk.Button(label="Kaldır")
            btn_del.get_style_context().add_class("btn-secondary")
            btn_del.connect("clicked", lambda b: self.listbox.remove(row))
            row.btn_box.pack_start(btn_del, False, False, 0)

            self.graph_dl.set_fraction(0.0)
            self.lbl_dl_speed.set_text("Boşta • İndirme bekleniyor")

            if msg != "İptal Edildi" and self.toast_service:
                self.toast_service.show(f"İndirme başarısız: {msg}", type="error")

        row.btn_box.show_all()

    def _populate_initial_rows(self):
        try:
            entries = []
            for f in os.listdir(self.dl_dir):
                if f.lower().endswith((".mp4", ".mkv", ".webm", ".mp3", ".m4a", ".wav", ".flac")):
                    full_p = os.path.join(self.dl_dir, f)
                    st = os.stat(full_p)
                    entries.append((full_p, f, st.st_size, st.st_mtime))
            entries.sort(key=lambda x: x[3], reverse=True)
            for full_p, fname, fsize, mtime in entries[:20]:
                size_mb = fsize / (1024 * 1024)
                is_audio = fname.lower().endswith((".mp3", ".m4a", ".wav", ".flac", ".opus"))
                row = self._create_row_ui(
                    task_id=f"init_{time.time()}",
                    title=fname,
                    sub=f"{size_mb:.1f} MB • {self.dl_dir}",
                    icon_name="audio-x-generic-symbolic" if is_audio else "video-x-generic-symbolic",
                    is_active=False
                )
                row.saved_path = full_p
                self.listbox.add(row)
        except Exception:
            pass

    def _open_dir(self, directory):
        try:
            subprocess.Popen(["xdg-open", directory])
            if self.toast_service:
                self.toast_service.show("İndirilenler klasörü açıldı.", type="info")
        except Exception as e:
            if self.toast_service:
                self.toast_service.show(f"Klasör açılamadı: {e}", type="warning")
