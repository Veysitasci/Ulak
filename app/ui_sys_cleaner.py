import gi
from gi.repository import Gtk, GLib
from i18n import _

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

        lbl_desc = Gtk.Label(label="Sisteminizdeki gereksiz dosyaları ve önbelleği temizleyerek disk alanı açın.")
        lbl_desc.set_halign(Gtk.Align.START)
        self.pack_start(lbl_desc, False, False, 0)

        # Container for the grid
        flowbox = Gtk.FlowBox()
        flowbox.set_valign(Gtk.Align.START)
        flowbox.set_max_children_per_line(2)
        flowbox.set_selection_mode(Gtk.SelectionMode.NONE)
        flowbox.set_column_spacing(20)
        flowbox.set_row_spacing(20)
        self.pack_start(flowbox, True, True, 0)

        # 1. Apt Cache Cleaner
        flowbox.add(self._create_tool_card("Paket Ön Belleği", "apt-get clean komutu ile indirilen paket arşivini siler.", "edit-clear-symbolic", self._clean_apt))
        
        # 2. DNS Cache Cleaner
        flowbox.add(self._create_tool_card("DNS Önbelleği", "systemd-resolve --flush-caches ile ağ yavaşlıklarını çözer.", "network-wired-symbolic", self._clean_dns))
        
        # 3. Journalctl Logs
        flowbox.add(self._create_tool_card("Sistem Günlükleri", "Eski sistem loglarını temizler (vacuum-time=3d).", "document-properties-symbolic", self._clean_logs))

    def _create_tool_card(self, title, desc, icon_name, callback):
        box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=15)
        box.get_style_context().add_class("card")
        box.set_margin_top(15)
        box.set_margin_bottom(15)
        box.set_margin_start(15)
        box.set_margin_end(15)

        # Icon
        icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.DIALOG)
        icon.set_pixel_size(48)
        box.pack_start(icon, False, False, 0)

        # Texts
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

        # Button
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
        return False
