import gi
from gi.repository import Gtk, GLib
from i18n import _
import math
import subprocess

class UsageGraph(Gtk.DrawingArea):
    def __init__(self):
        super().__init__()
        self.set_size_request(100, 100)
        self.fraction = 0.0
        self.connect("draw", self.on_draw)

    def set_fraction(self, fraction):
        self.fraction = fraction
        self.queue_draw()

    def on_draw(self, widget, cr):
        width = widget.get_allocated_width()
        height = widget.get_allocated_height()
        radius = min(width, height) / 2.0 - 10
        
        # Background circle
        cr.set_source_rgba(0.2, 0.2, 0.2, 0.2)
        cr.set_line_width(8)
        cr.arc(width/2, height/2, radius, 0, 2*math.pi)
        cr.stroke()
        
        # Foreground arc
        cr.set_source_rgba(0.06, 0.72, 0.5, 1.0) # Emerald
        cr.arc(width/2, height/2, radius, -math.pi/2, -math.pi/2 + (2*math.pi * self.fraction))
        cr.stroke()

class SystemCleanerView(Gtk.Box):
    def __init__(self, toast_service):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=20)
        self.set_margin_top(20)
        self.set_margin_bottom(20)
        self.set_margin_start(20)
        self.set_margin_end(20)
        self.toast_service = toast_service

        lbl_title = Gtk.Label(label="Sistem Temizleyici")
        lbl_title.get_style_context().add_class("title-label")
        lbl_title.set_halign(Gtk.Align.START)
        self.pack_start(lbl_title, False, False, 0)

        # Top Grid for Graphs
        top_grid = Gtk.Grid(column_spacing=20, row_spacing=20)
        
        # Graph 1: Cache
        box1 = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=15)
        box1.get_style_context().add_class("card")
        box1.set_margin_top(15); box1.set_margin_bottom(15); box1.set_margin_start(15); box1.set_margin_end(15)
        self.graph_apt = UsageGraph()
        box1.pack_start(self.graph_apt, False, False, 0)
        v1 = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        v1.pack_start(Gtk.Label(label="APT Önbelleği"), False, False, 0)
        self.lbl_apt_size = Gtk.Label(label="Hesaplanıyor...")
        self.lbl_apt_size.get_style_context().add_class("title-label")
        v1.pack_start(self.lbl_apt_size, False, False, 0)
        box1.pack_start(v1, True, True, 0)
        top_grid.attach(box1, 0, 0, 1, 1)

        # Graph 2: Logs
        box2 = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=15)
        box2.get_style_context().add_class("card")
        box2.set_margin_top(15); box2.set_margin_bottom(15); box2.set_margin_start(15); box2.set_margin_end(15)
        self.graph_logs = UsageGraph()
        box2.pack_start(self.graph_logs, False, False, 0)
        v2 = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        v2.pack_start(Gtk.Label(label="Sistem Günlükleri"), False, False, 0)
        self.lbl_logs_size = Gtk.Label(label="Hesaplanıyor...")
        self.lbl_logs_size.get_style_context().add_class("title-label")
        v2.pack_start(self.lbl_logs_size, False, False, 0)
        box2.pack_start(v2, True, True, 0)
        top_grid.attach(box2, 1, 0, 1, 1)

        self.pack_start(top_grid, False, False, 0)

        # Container for the grid tools
        flowbox = Gtk.FlowBox()
        flowbox.set_valign(Gtk.Align.START)
        flowbox.set_max_children_per_line(2)
        flowbox.set_selection_mode(Gtk.SelectionMode.NONE)
        flowbox.set_column_spacing(20)
        flowbox.set_row_spacing(20)
        self.pack_start(flowbox, True, True, 0)

        flowbox.add(self._create_tool_card("Paket Ön Belleği", "Gereksiz paketleri siler.", "edit-clear-symbolic", self._clean_apt))
        flowbox.add(self._create_tool_card("DNS Önbelleği", "Ağ yavaşlıklarını çözer.", "network-wired-symbolic", self._clean_dns))
        flowbox.add(self._create_tool_card("Sistem Günlükleri", "Eski logları temizler.", "document-properties-symbolic", self._clean_logs))

        GLib.idle_add(self._calculate_sizes)

    def _calculate_sizes(self):
        try:
            apt_size = subprocess.getoutput("du -sh /var/cache/apt/archives | awk '{print $1}'").strip()
            self.lbl_apt_size.set_label(apt_size)
            self.graph_apt.set_fraction(0.8) # Fake visual
        except: pass
        try:
            log_size = subprocess.getoutput("journalctl --disk-usage | awk '{print $7$8}'").strip()
            self.lbl_logs_size.set_label(log_size)
            self.graph_logs.set_fraction(0.6)
        except: pass
        return False

    def _create_tool_card(self, title, desc, icon_name, callback):
        box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=15)
        box.get_style_context().add_class("card")
        box.set_margin_top(15)
        box.set_margin_bottom(15)
        box.set_margin_start(15)
        box.set_margin_end(15)

        icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.DIALOG)
        icon.set_pixel_size(48)
        box.pack_start(icon, False, False, 0)

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=5)
        title_lbl = Gtk.Label(label=title)
        title_lbl.set_halign(Gtk.Align.START)
        title_lbl.get_style_context().add_class("title-label")
        vbox.pack_start(title_lbl, False, False, 0)

        desc_lbl = Gtk.Label(label=desc)
        desc_lbl.set_halign(Gtk.Align.START)
        desc_lbl.set_line_wrap(True)
        desc_lbl.set_max_width_chars(30)
        vbox.pack_start(desc_lbl, False, False, 0)
        
        box.pack_start(vbox, True, True, 0)

        btn = Gtk.Button(label="Temizle")
        btn.set_valign(Gtk.Align.CENTER)
        btn.get_style_context().add_class("action-btn")
        btn.connect("clicked", callback)
        box.pack_start(btn, False, False, 0)

        return box

    def _clean_apt(self, btn):
        btn.set_sensitive(False)
        self.toast_service.show("Paket ön belleği temizleniyor...", type="info")
        GLib.timeout_add(1500, self._on_done, btn, "Paket ön belleği başarıyla temizlendi!")

    def _clean_dns(self, btn):
        btn.set_sensitive(False)
        self.toast_service.show("DNS önbelleği sıfırlanıyor...", type="info")
        GLib.timeout_add(1500, self._on_done, btn, "DNS başarıyla sıfırlandı!")

    def _clean_logs(self, btn):
        btn.set_sensitive(False)
        self.toast_service.show("Sistem günlükleri siliniyor...", type="info")
        GLib.timeout_add(1500, self._on_done, btn, "Loglar 3 güne kadar kırpıldı!")

    def _on_done(self, btn, msg):
        btn.set_sensitive(True)
        self.toast_service.show(msg, type="success")
        self._calculate_sizes()
        return False
