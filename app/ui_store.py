import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, Gdk, GLib

from i18n import _
from theme import theme_mgr
from ui_shared import storage, BentoDialog

class StoreView(Gtk.ScrolledWindow):
    def __init__(self, toast_service):
        super().__init__()
        self.toast_service = toast_service
        self.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        
        main_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=20)
        main_box.set_margin_top(10)
        main_box.set_margin_bottom(20)
        main_box.set_margin_start(20)
        main_box.set_margin_end(20)
        self.add(main_box)
        
        # Header
        header_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        header_box.get_style_context().add_class("header")
        header_box.set_margin_top(10)
        header_box.set_margin_bottom(10)
        
        title = Gtk.Label(label=_("store_title"))
        title.set_halign(Gtk.Align.START)
        title.get_style_context().add_class("header-title")
        
        subtitle = Gtk.Label(label=_("store_subtitle"))
        subtitle.set_halign(Gtk.Align.START)
        subtitle.get_style_context().add_class("header-sub")
        
        header_box.pack_start(title, False, False, 0)
        header_box.pack_start(subtitle, False, False, 0)
        main_box.pack_start(header_box, False, False, 0)
        
        # FlowBox for Apps
        self.flowbox = Gtk.FlowBox()
        self.flowbox.set_valign(Gtk.Align.START)
        self.flowbox.set_max_children_per_line(3)
        self.flowbox.set_selection_mode(Gtk.SelectionMode.NONE)
        self.flowbox.set_row_spacing(15)
        self.flowbox.set_column_spacing(15)
        
        main_box.pack_start(self.flowbox, False, False, 0)
        
        self._load_modules()
        
    def _load_modules(self):
        # We define a static list of modules.
        modules = [
            {"id": "firewall", "name_key": "module_firewall", "desc_key": "module_firewall_desc", "icon": "security-high-symbolic", "installed": True},
            {"id": "hw", "name_key": "module_hw", "desc_key": "module_hw_desc", "icon": "computer-symbolic", "installed": True},
            {"id": "bt", "name_key": "module_bt", "desc_key": "module_bt_desc", "icon": "bluetooth-symbolic", "installed": True},
            {"id": "wifi", "name_key": "module_wifi", "desc_key": "module_wifi_desc", "icon": "network-wireless-symbolic", "installed": True},
            {"id": "admin", "name_key": "module_admin", "desc_key": "module_admin_desc", "icon": "preferences-system-symbolic", "installed": True},
            {"id": "youtube", "name_key": "module_youtube", "desc_key": "module_youtube_desc", "icon": "video-display-symbolic", "installed": False},
            {"id": "quran", "name_key": "module_quran", "desc_key": "module_quran_desc", "icon": "accessories-dictionary-symbolic", "installed": False},
            {"id": "fikir", "name_key": "module_fikir", "desc_key": "module_fikir_desc", "icon": "utilities-system-monitor-symbolic", "installed": False}
        ]
        
        for mod in modules:
            card = self._create_module_card(mod)
            self.flowbox.add(card)
            
        self.show_all()

    def _create_module_card(self, mod):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        box.get_style_context().add_class("card")
        box.set_size_request(200, 160)
        
        icon = Gtk.Image.new_from_icon_name(mod["icon"], Gtk.IconSize.DIALOG)
        icon.set_pixel_size(48)
        icon.set_margin_top(15)
        box.pack_start(icon, False, False, 0)
        
        name = Gtk.Label(label=_(mod["name_key"]))
        name.get_style_context().add_class("device-name")
        box.pack_start(name, False, False, 0)
        
        status_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        status_box.set_halign(Gtk.Align.CENTER)
        status_label = Gtk.Label(label=_("store_installed") if mod["installed"] else _("store_install"))
        status_label.get_style_context().add_class("status-tag")
        if mod["installed"]:
            status_label.get_style_context().add_class("status-connected")
        status_box.pack_start(status_label, False, False, 0)
        
        box.pack_start(status_box, False, False, 0)
        
        # Add event box for click
        event_box = Gtk.EventBox()
        event_box.add(box)
        event_box.connect("button-press-event", self._on_card_clicked, mod)
        
        return event_box

    def _on_card_clicked(self, widget, event, mod):
        dialog = BentoDialog(title=_(mod["name_key"]), parent=self.get_toplevel(), icon_name=mod["icon"], default_width=380, default_height=290)
        dialog.add_bento_action_button("Kapat", Gtk.ResponseType.CANCEL, is_primary=False)
        dialog.add_bento_action_button(_("store_launch") if mod["installed"] else _("store_install"), Gtk.ResponseType.OK, is_primary=True)
        
        content = dialog.get_bento_content()
        content.set_spacing(12)
        
        icon = Gtk.Image.new_from_icon_name(mod["icon"], Gtk.IconSize.DIALOG)
        icon.set_pixel_size(56)
        content.pack_start(icon, False, False, 0)
        
        name = Gtk.Label(label=_(mod["name_key"]))
        name.get_style_context().add_class("header-title")
        content.pack_start(name, False, False, 0)
        
        desc = Gtk.Label(label=_(mod["desc_key"]))
        desc.set_line_wrap(True)
        desc.set_justify(Gtk.Justification.CENTER)
        content.pack_start(desc, False, False, 0)
        
        dialog.show_all()
        res = dialog.run()
        if res == Gtk.ResponseType.OK:
            if not mod["installed"]:
                self.toast_service.show(f"{_(mod['name_key'])} {str(_('store_install_success'))}")
            else:
                self.toast_service.show(f"{_(mod['name_key'])} başlatılıyor...")
        dialog.destroy()
