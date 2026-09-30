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
        self.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        
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
        
        # Bento Grid Container for Modules
        self.bento_grid = Gtk.Grid(column_spacing=18, row_spacing=18)
        self.bento_grid.set_column_homogeneous(True)
        main_box.pack_start(self.bento_grid, False, False, 0)
        main_box.connect('size-allocate', self._on_store_size_allocate)
        
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

    def _on_store_size_allocate(self, widget, allocation):
        cols = 1 if allocation.width < 620 else 2
        if hasattr(self, 'current_cols') and self.current_cols == cols:
            return
        self.current_cols = cols
        if hasattr(self, 'last_rendered_modules'):
            self._do_layout_modules(self.last_rendered_modules, cols)

    def _render_modules(self, modules):
        self.last_rendered_modules = modules
        cols = getattr(self, 'current_cols', 2)
        self._do_layout_modules(modules, cols)

    def _do_layout_modules(self, modules, cols):
        for child in self.bento_grid.get_children():
            self.bento_grid.remove(child)
            
        for idx, mod in enumerate(modules):
            c = idx % cols
            r = idx // cols
            card = self._create_module_card(mod)
            self.bento_grid.attach(card, c, r, 1, 1)
            
        self.show_all()


    def _create_module_card(self, mod):
        # We'll use an EventBox as the base for clicking and background color styling
        event_box = Gtk.EventBox()
        
        # Determine background color classes or direct CSS
        bg_css = ""
        if mod["installed"]:
            # Default theme card style
            bg_css = ""
        else:
            if mod.get("is_new", False):
                # Greenish background
                bg_css = "box.card { background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.4); }"
            else:
                # Grayish background
                bg_css = "box.card { background-color: rgba(100, 116, 139, 0.05); border: 1px solid rgba(100, 116, 139, 0.2); }"

        # Card Container (Horizontal Bento)
        box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=16)
        box.get_style_context().add_class("settings-card")
        box.set_margin_top(4)
        box.set_margin_bottom(4)
        box.set_margin_start(4)
        box.set_margin_end(4)
        
        if bg_css:
            provider = Gtk.CssProvider()
            provider.load_from_data(bg_css.encode("utf-8"))
            box.get_style_context().add_provider(provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
            
        # Left: Icon
        icon_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        icon_box.set_valign(Gtk.Align.CENTER)
        icon_box.set_size_request(80, -1)
        icon = Gtk.Image.new_from_icon_name(mod["icon"], Gtk.IconSize.DIALOG)
        icon.set_pixel_size(48)
        icon_box.pack_start(icon, True, True, 0)
        box.pack_start(icon_box, False, False, 0)
        
        # Center: Info & Features
        center_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        center_box.set_valign(Gtk.Align.CENTER)
        
        # Title and Category Row
        title_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        name = Gtk.Label()
        name.set_markup(f"<b>{_(mod['name_key'])}</b>")
        title_row.pack_start(name, False, False, 0)
        
        if "category" in mod:
            cat_lbl = Gtk.Label()
            cat_lbl.set_markup(f"<span background='#334155' foreground='white' size='x-small'>  {mod['category']}  </span>")
            title_row.pack_start(cat_lbl, False, False, 0)
            
        center_box.pack_start(title_row, False, False, 0)
        
        # Features List
        if "features" in mod:
            for feat in mod["features"][:3]: # Max 3 features
                feat_lbl = Gtk.Label()
                feat_lbl.set_markup(f"<span size='small'>• {feat}</span>")
                feat_lbl.set_halign(Gtk.Align.START)
                center_box.pack_start(feat_lbl, False, False, 0)
        else:
            desc_lbl = Gtk.Label()
            desc_lbl.set_markup(f"<span size='small'>{_(mod['desc_key'])}</span>")
            desc_lbl.set_halign(Gtk.Align.START)
            desc_lbl.set_line_wrap(True)
            desc_lbl.set_max_width_chars(30)
            center_box.pack_start(desc_lbl, False, False, 0)
            
        box.pack_start(center_box, True, True, 0)
        
        # Right: Popularity & Status
        right_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        right_box.set_valign(Gtk.Align.CENTER)
        right_box.set_size_request(100, -1)
        
        if "popularity" in mod:
            pop_lbl = Gtk.Label()
            pop_lbl.set_markup(f"<span foreground='#eab308'>★ {mod['popularity']}</span>")
            pop_lbl.set_halign(Gtk.Align.END)
            right_box.pack_start(pop_lbl, False, False, 0)
            
        if "downloads" in mod:
            dl_lbl = Gtk.Label()
            dl_lbl.set_markup(f"<span size='x-small' foreground='#64748b'>↓ {mod['downloads']}</span>")
            dl_lbl.set_halign(Gtk.Align.END)
            right_box.pack_start(dl_lbl, False, False, 0)
            
        status_label = Gtk.Label()
        status_label.set_halign(Gtk.Align.END)
        
        if mod["installed"]:
            status_label.set_markup(f"<b>{_('store_installed')}</b>")
            status_label.get_style_context().add_class("status-connected")
        else:
            if mod.get("is_new", False):
                status_label.set_markup(f"<span foreground='#10b981'><b>YENİ (KUR)</b></span>")
            else:
                status_label.set_markup(f"<span foreground='#64748b'><b>{_('store_install')}</b></span>")
                
        right_box.pack_end(status_label, False, False, 0)
        box.pack_start(right_box, False, False, 0)
        
        event_box.add(box)
        event_box.connect("button-press-event", self._on_card_clicked, mod)
        
        return event_box

    def _on_card_clicked(self, widget, event, mod):
        dialog = BentoDialog(title=_(mod["name_key"]), parent=self.get_toplevel(), icon_name=mod["icon"], default_width=380, default_height=320)
        dialog.add_bento_action_button("Kapat", Gtk.ResponseType.CANCEL, is_primary=False)
        btn_action = dialog.add_bento_action_button(_("store_launch") if mod["installed"] else _("store_install"), Gtk.ResponseType.OK, is_primary=True)
        
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
        
        # Meta Info
        meta_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=20)
        meta_box.set_halign(Gtk.Align.CENTER)
        meta_box.set_margin_top(10)
        
        lbl_size = Gtk.Label()
        lbl_size.set_markup(f"<span foreground='#64748b' size='small'>Boyut: {mod.get('size', '2.4 MB')}</span>")
        meta_box.pack_start(lbl_size, False, False, 0)
        
        lbl_date = Gtk.Label()
        date_text = "Kurulma Zamanı: " + mod.get("installed_date", "Bilinmiyor") if mod["installed"] else "Güncellenme: " + mod.get("update_date", "Bugün")
        lbl_date.set_markup(f"<span foreground='#64748b' size='small'>{date_text}</span>")
        meta_box.pack_start(lbl_date, False, False, 0)
        content.pack_start(meta_box, False, False, 0)
        
        # Progress Bar for installation
        prog_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        prog_box.set_margin_top(15)
        prog_lbl = Gtk.Label(label="Modül İndiriliyor...")
        prog_lbl.set_halign(Gtk.Align.START)
        prog_lbl.get_style_context().add_class("status-dot")
        prog = Gtk.ProgressBar()
        prog_box.pack_start(prog_lbl, False, False, 0)
        prog_box.pack_start(prog, False, False, 0)
        
        dialog.show_all()
        
        def _run_installation():
            btn_action.set_sensitive(False)
            content.pack_start(prog_box, False, False, 0)
            prog_box.show_all()
            
            self.install_step = 0
            
            def _step():
                self.install_step += 0.05
                prog.set_fraction(self.install_step)
                if self.install_step < 0.5:
                    prog_lbl.set_label("Uzak sunucudan indiriliyor...")
                elif self.install_step < 0.8:
                    prog_lbl.set_label("Bağımlılıklar çözümleniyor...")
                else:
                    prog_lbl.set_label("Sisteme entegre ediliyor...")
                    
                if self.install_step >= 1.0:
                    dialog.destroy()
                    self.toast_service.show(f"{_(mod['name_key'])} başarıyla kuruldu!", type="success")
                    # Fake install success, trigger refresh and save manifest
                    import os, json
                    mod_dir = os.path.expanduser(f"~/.local/share/ulak/modules/{mod['id']}")
                    os.makedirs(mod_dir, exist_ok=True)
                    with open(os.path.join(mod_dir, "manifest.json"), "w") as f:
                        json.dump(mod, f)
                    self._on_refresh_clicked(None)
                    # Trigger sidebar rebuild via main window
                    main_window = self.get_toplevel()
                    if hasattr(main_window, "rebuild_sidebar"):
                        main_window.rebuild_sidebar()
                    return False
                return True
                
            GLib.timeout_add(100, _step)
        
        res = dialog.run()
        if res == Gtk.ResponseType.OK:
            if not mod["installed"]:
                _run_installation()
                return # Don't destroy dialog yet
            else:
                self.toast_service.show(f"{_(mod['name_key'])} başlatılıyor...", type="info")
                dialog.destroy()
        else:
            dialog.destroy()
