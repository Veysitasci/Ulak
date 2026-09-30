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
        
        # Header Box (Horizontal to hold titles and button)
        header_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        
        titles_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        titles_box.get_style_context().add_class("header")
        titles_box.set_margin_top(10)
        titles_box.set_margin_bottom(10)
        
        title = Gtk.Label(label=_("store_title"))
        title.set_halign(Gtk.Align.START)
        title.get_style_context().add_class("header-title")
        
        subtitle = Gtk.Label(label=_("store_subtitle"))
        subtitle.set_halign(Gtk.Align.START)
        subtitle.get_style_context().add_class("header-sub")
        
        titles_box.pack_start(title, False, False, 0)
        titles_box.pack_start(subtitle, False, False, 0)
        
        # Refresh Button
        self.btn_refresh = Gtk.Button()
        icon = Gtk.Image.new_from_icon_name("view-refresh-symbolic", Gtk.IconSize.BUTTON)
        self.btn_refresh.add(icon)
        self.btn_refresh.get_style_context().add_class("action-btn")
        self.btn_refresh.set_valign(Gtk.Align.CENTER)
        self.btn_refresh.connect("clicked", self._on_refresh_clicked)
        self.btn_refresh.set_tooltip_text("Mağazayı Yenile")
        
        header_row.pack_start(titles_box, True, True, 0)
        header_row.pack_end(self.btn_refresh, False, False, 0)
        
        main_box.pack_start(header_row, False, False, 0)
        
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
        # Base modules that come pre-installed
        self.base_modules = [
            {"id": "firewall", "name_key": "module_firewall", "desc_key": "module_firewall_desc", "icon": "security-high-symbolic", "installed": True},
            {"id": "hw", "name_key": "module_hw", "desc_key": "module_hw_desc", "icon": "computer-symbolic", "installed": True},
            {"id": "bt", "name_key": "module_bt", "desc_key": "module_bt_desc", "icon": "bluetooth-symbolic", "installed": True},
            {"id": "wifi", "name_key": "module_wifi", "desc_key": "module_wifi_desc", "icon": "network-wireless-symbolic", "installed": True},
            {"id": "admin", "name_key": "module_admin", "desc_key": "module_admin_desc", "icon": "preferences-system-symbolic", "installed": True}
        ]
        
        self._render_modules(self.base_modules)
        self._on_refresh_clicked(None)

    def _on_refresh_clicked(self, widget):
        if hasattr(self, 'btn_refresh'):
            self.btn_refresh.set_sensitive(False)
        import threading
        threading.Thread(target=self._fetch_remote_modules, daemon=True).start()

    def _fetch_remote_modules(self):
        import urllib.request
        import json
        import os
        import time
        # Append timestamp to bypass caching
        url = f"https://raw.githubusercontent.com/Veysitasci/ulak/main/modules.json?t={time.time()}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ULAK-Store", "Cache-Control": "no-cache"})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                
                # Check installed status for remote modules
                for mod in data:
                    mod_path = os.path.expanduser(f"~/.local/share/ulak/modules/{mod['id']}")
                    mod["installed"] = os.path.exists(mod_path)
                    
                GLib.idle_add(self._on_remote_modules_fetched, data)
        except Exception as e:
            print("Could not fetch remote modules:", e)
            GLib.idle_add(self._on_remote_modules_fetched, [])

    def _on_remote_modules_fetched(self, remote_modules):
        if hasattr(self, 'btn_refresh'):
            self.btn_refresh.set_sensitive(True)
            
        # Combine base modules with new remote modules, avoiding duplicates by id
        existing_ids = {m["id"] for m in self.base_modules}
        all_modules = list(self.base_modules)
        
        for mod in remote_modules:
            if mod["id"] not in existing_ids:
                all_modules.append(mod)
                
        self._render_modules(all_modules)

    def _render_modules(self, modules):
        # Clear existing
        for child in self.flowbox.get_children():
            self.flowbox.remove(child)
            
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
        status_label = Gtk.Label()
        
        if mod["installed"]:
            status_text = _("store_installed")
            # Default theme color (White in dark mode, Dark in light mode)
            status_label.set_markup(f"<b>{status_text}</b>")
        else:
            if mod.get("is_new", False):
                status_text = "✨ YENİ GELDİ (KUR)"
                # Green color for newly added
                status_label.set_markup(f"<span foreground='#10b981'><b>{status_text}</b></span>")
            else:
                status_text = _("store_install")
                # Gray color for uninstalled
                status_label.set_markup(f"<span foreground='#64748b'><b>{status_text}</b></span>")
                
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
