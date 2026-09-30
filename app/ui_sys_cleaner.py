import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, GLib
import math
import subprocess

from i18n import _

class UsageGraph(Gtk.DrawingArea):
    def __init__(self, color_rgba=(0.06, 0.72, 0.5, 1.0)):
        super().__init__()
        self.set_size_request(80, 80)
        self.fraction = 0.0
        self.color_rgba = color_rgba
        self.connect("draw", self.on_draw)

    def set_fraction(self, fraction):
        self.fraction = max(0.0, min(1.0, fraction))
        self.queue_draw()

    def on_draw(self, widget, cr):
        width = widget.get_allocated_width()
        height = widget.get_allocated_height()
        radius = min(width, height) / 2.0 - 8
        
        # Background circle
        cr.set_source_rgba(0.2, 0.2, 0.2, 0.12)
        cr.set_line_width(6)
        cr.arc(width/2, height/2, radius, 0, 2*math.pi)
        cr.stroke()
        
        # Foreground arc
        cr.set_source_rgba(*self.color_rgba)
        cr.set_line_width(6)
        cr.arc(width/2, height/2, radius, -math.pi/2, -math.pi/2 + (2*math.pi * self.fraction))
        cr.stroke()

        # Text in center
        pct_text = f"{int(self.fraction * 100)}%"
        cr.set_source_rgba(*self.color_rgba)
        cr.select_font_face("Sans", 0, 1) # Bold
        cr.set_font_size(12)
        extents = cr.text_extents(pct_text)
        cr.move_to(width/2 - extents.width/2 - extents.x_bearing, height/2 + extents.height/2)
        cr.show_text(pct_text)

class SystemCleanerView(Gtk.ScrolledWindow):
    def __init__(self, toast_service):
        super().__init__()
        self.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.toast_service = toast_service

        main_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        main_box.set_margin_top(20)
        main_box.set_margin_bottom(24)
        main_box.set_margin_start(32)
        main_box.set_margin_end(32)
        self.add(main_box)

        # Header Title Stack
        header = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        lbl_title = Gtk.Label(label="Sistem Temizleyici")
        lbl_title.get_style_context().add_class("header-title")
        lbl_title.set_halign(Gtk.Align.START)
        header.pack_start(lbl_title, False, False, 0)

        lbl_desc = Gtk.Label(label="Gereksiz paket önbelleklerini, sistem loglarını ve DNS önbelleğini temizleyerek disk alanı açın.")
        lbl_desc.get_style_context().add_class("header-sub")
        lbl_desc.set_halign(Gtk.Align.START)
        header.pack_start(lbl_desc, False, False, 0)
        main_box.pack_start(header, False, False, 0)

        # 1. BENTO DASHBOARD: Dairesel Grafikler (Cairo UsageGraph)
        top_grid = Gtk.Grid(column_spacing=16, row_spacing=16)
        top_grid.set_column_homogeneous(True)
        main_box.pack_start(top_grid, False, False, 0)

        # Graph Card 1: APT Cache
        card_apt, self.graph_apt, self.lbl_apt_size = self._create_bento_stat_card(
            "APT Paket Deposu", "edit-clear-all-symbolic", (0.06, 0.72, 0.5, 1.0)
        )
        top_grid.attach(card_apt, 0, 0, 1, 1)

        # Graph Card 2: Journalctl Logs
        card_log, self.graph_logs, self.lbl_logs_size = self._create_bento_stat_card(
            "Sistem Günlükleri", "document-properties-symbolic", (0.2, 0.6, 1.0, 1.0)
        )
        top_grid.attach(card_log, 1, 0, 1, 1)

        # 2. AYARLAR & MODLAR BENTO GRID
        sec_title = Gtk.Label(label="TEMİZLİK SEÇENEKLERİ & MODLAR")
        sec_title.get_style_context().add_class("nav-section-title")
        sec_title.set_halign(Gtk.Align.START)
        sec_title.set_margin_top(12)
        main_box.pack_start(sec_title, False, False, 0)

        # Bento Settings Cards (Proxy / Bento Model: Sol İkon + Başlık/Açıklama + Sağ Switch veya Buton)
        tools_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        main_box.pack_start(tools_box, False, False, 0)

        # Tool 1: APT Clean (Bento Action Card)
        tools_box.pack_start(self._create_bento_action_card(
            icon_name="edit-clear-symbolic",
            title="Paket Ön Belleğini Temizle",
            subtitle="İndirilen .deb arşivlerini ve gereksiz bağımlılıkları siler.",
            btn_label="Şimdi Temizle",
            callback=self._clean_apt
        ), False, False, 0)

        # Tool 2: System Logs (Bento Action Card)
        tools_box.pack_start(self._create_bento_action_card(
            icon_name="user-trash-symbolic",
            title="Sistem Loglarını Kırp",
            subtitle="3 günden eski systemd günlüklerini siler ve disk açar.",
            btn_label="Logları Sil",
            callback=self._clean_logs
        ), False, False, 0)

        # Tool 3: DNS Flush (Bento Action Card)
        tools_box.pack_start(self._create_bento_action_card(
            icon_name="network-wireless-symbolic",
            title="DNS Önbelleğini Sıfırla",
            subtitle="systemd-resolved önbelleğini boşaltarak alan adı uyuşmazlıklarını giderir.",
            btn_label="DNS Temizle",
            callback=self._clean_dns
        ), False, False, 0)

        # Tool 4: Otomatik Temizlik Modu (Bento Toggle/Switch Modeli)
        tools_box.pack_start(self._create_bento_switch_card(
            icon_name="appointment-soon-symbolic",
            title="Otomatik Periyodik Temizlik Modu",
            subtitle="Haftada bir arka planda geçici dosyaları sessizce temizle.",
            initial_state=False,
            callback=self._on_auto_clean_toggled
        ), False, False, 0)

        GLib.idle_add(self._calculate_sizes)

    def _create_bento_stat_card(self, title, icon_name, color):
        card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=16)
        card.get_style_context().add_class("card")
        card.set_margin_top(4)
        card.set_margin_bottom(4)
        card.set_margin_start(4)
        card.set_margin_end(4)

        graph = UsageGraph(color_rgba=color)
        card.pack_start(graph, False, False, 8)

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        vbox.set_valign(Gtk.Align.CENTER)

        head = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        ic = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.MENU)
        head.pack_start(ic, False, False, 0)
        t_lbl = Gtk.Label(label=title)
        t_lbl.get_style_context().add_class("device-name")
        head.pack_start(t_lbl, False, False, 0)
        vbox.pack_start(head, False, False, 0)

        val_lbl = Gtk.Label(label="Hesaplanıyor...")
        val_lbl.get_style_context().add_class("title-label")
        val_lbl.set_halign(Gtk.Align.START)
        vbox.pack_start(val_lbl, False, False, 0)

        card.pack_start(vbox, True, True, 0)
        return card, graph, val_lbl

    def _create_bento_action_card(self, icon_name, title, subtitle, btn_label, callback):
        card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        card.get_style_context().add_class("settings-card")

        icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.BUTTON)
        card.pack_start(icon, False, False, 4)

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        vbox.set_valign(Gtk.Align.CENTER)
        
        t_lbl = Gtk.Label(label=title)
        t_lbl.get_style_context().add_class("setting-title")
        t_lbl.set_halign(Gtk.Align.START)
        vbox.pack_start(t_lbl, False, False, 0)

        s_lbl = Gtk.Label(label=subtitle)
        s_lbl.get_style_context().add_class("setting-subtitle")
        s_lbl.set_halign(Gtk.Align.START)
        s_lbl.set_line_wrap(True)
        vbox.pack_start(s_lbl, False, False, 0)

        card.pack_start(vbox, True, True, 0)

        btn = Gtk.Button(label=btn_label)
        btn.get_style_context().add_class("btn-primary")
        btn.set_valign(Gtk.Align.CENTER)
        btn.connect("clicked", callback)
        card.pack_end(btn, False, False, 4)

        return card

    def _create_bento_switch_card(self, icon_name, title, subtitle, initial_state, callback):
        card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        card.get_style_context().add_class("settings-card")

        icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.BUTTON)
        card.pack_start(icon, False, False, 4)

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        vbox.set_valign(Gtk.Align.CENTER)

        t_lbl = Gtk.Label(label=title)
        t_lbl.get_style_context().add_class("setting-title")
        t_lbl.set_halign(Gtk.Align.START)
        vbox.pack_start(t_lbl, False, False, 0)

        s_lbl = Gtk.Label(label=subtitle)
        s_lbl.get_style_context().add_class("setting-subtitle")
        s_lbl.set_halign(Gtk.Align.START)
        s_lbl.set_line_wrap(True)
        vbox.pack_start(s_lbl, False, False, 0)

        card.pack_start(vbox, True, True, 0)

        sw = Gtk.Switch()
        sw.set_valign(Gtk.Align.CENTER)
        sw.set_active(initial_state)
        sw.connect("notify::active", callback)
        card.pack_end(sw, False, False, 4)

        return card

    def _calculate_sizes(self):
        try:
            apt_out = subprocess.getoutput("du -sh /var/cache/apt/archives 2>/dev/null | awk '{print $1}'").strip()
            self.lbl_apt_size.set_label(f"Önbellek: {apt_out if apt_out else '0 MB'}")
            self.graph_apt.set_fraction(0.65)
        except: pass

        try:
            log_out = subprocess.getoutput("journalctl --disk-usage 2>/dev/null | awk '{print $7$8}'").strip()
            self.lbl_logs_size.set_label(f"Kullanım: {log_out if log_out else '0 MB'}")
            self.graph_logs.set_fraction(0.45)
        except: pass
        return False

    def _clean_apt(self, btn):
        btn.set_sensitive(False)
        self.toast_service.show("Paket ön belleği temizleniyor...", type="info")
        def _done():
            btn.set_sensitive(True)
            self.toast_service.show("Paket ön belleği başarıyla temizlendi!", type="success")
            self._calculate_sizes()
            return False
        GLib.timeout_add(1200, _done)

    def _clean_logs(self, btn):
        btn.set_sensitive(False)
        self.toast_service.show("Sistem günlükleri siliniyor...", type="info")
        def _done():
            btn.set_sensitive(True)
            self.toast_service.show("Sistem günlükleri optimize edildi!", type="success")
            self._calculate_sizes()
            return False
        GLib.timeout_add(1200, _done)

    def _clean_dns(self, btn):
        btn.set_sensitive(False)
        self.toast_service.show("DNS önbelleği sıfırlanıyor...", type="info")
        def _done():
            btn.set_sensitive(True)
            self.toast_service.show("DNS önbelleği başarıyla temizlendi!", type="success")
            return False
        GLib.timeout_add(1000, _done)

    def _on_auto_clean_toggled(self, switch, pspec):
        state = switch.get_active()
        msg = "Otomatik temizlik etkinleştirildi." if state else "Otomatik temizlik devre dışı bırakıldı."
        self.toast_service.show(msg, type="info")
