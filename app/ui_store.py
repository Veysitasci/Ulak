import os
import json
import time
import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, Gdk, GLib

from i18n import _
from theme import theme_mgr
from ui_shared import storage, BentoDialog
from ui_pkg_installer import open_package_installer

TR_MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
             "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]


def human_size(nbytes):
    if nbytes >= 1024 * 1024:
        return f"{nbytes / (1024 * 1024):.1f} MB"
    return f"{max(1, nbytes // 1024)} KB"


def tr_rel_date(ts):
    days = (time.time() - ts) / 86400.0
    if days < 1:
        return "Bugün"
    if days < 2:
        return "Dün"
    if days < 30:
        return f"{int(days)} gün önce"
    lt = time.localtime(ts)
    return f"{lt.tm_mday:02d} {TR_MONTHS[lt.tm_mon - 1]} {lt.tm_year}"

class StoreView(Gtk.ScrolledWindow):
    def __init__(self, toast_service):
        super().__init__()
        self.toast_service = toast_service
        self._stats_cache = {}
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

        # Canlı GitHub istatistikleri (gerçek indirme sayısı / sürüm)
        self.lbl_live = Gtk.Label(label="")
        self.lbl_live.set_halign(Gtk.Align.START)
        self.lbl_live.get_style_context().add_class("header-sub")
        self.lbl_live.set_visible(False)
        titles_box.pack_start(self.lbl_live, False, False, 0)
        
        # Package Installer Action Button
        self.btn_pkg_installer = Gtk.Button(label="Yerel Paket Yükle (.deb)")
        btn_icon = Gtk.Image.new_from_icon_name("system-software-install-symbolic", Gtk.IconSize.BUTTON)
        self.btn_pkg_installer.set_image(btn_icon)
        self.btn_pkg_installer.get_style_context().add_class("btn-secondary")
        self.btn_pkg_installer.set_valign(Gtk.Align.CENTER)
        self.btn_pkg_installer.set_margin_end(8)
        self.btn_pkg_installer.connect("clicked", lambda b: open_package_installer(parent=self.get_toplevel()))
        self.btn_pkg_installer.set_tooltip_text("Harici .deb, .rpm, .AppImage veya arşiv dosyasını yeni pencerede incele ve kur")

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
        header_row.pack_end(self.btn_pkg_installer, False, False, 0)
        
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
            {"id": "pkg_installer", "name_key": "pkg_installer_title", "desc_key": "pkg_installer_subtitle", "icon": "system-software-install-symbolic", "installed": True},
            {"id": "hw", "name_key": "module_hw", "desc_key": "module_hw_desc", "icon": "computer-symbolic", "installed": True},
            {"id": "bt", "name_key": "module_bt", "desc_key": "module_bt_desc", "icon": "bluetooth-symbolic", "installed": True},
            {"id": "wifi", "name_key": "module_wifi", "desc_key": "module_wifi_desc", "icon": "network-wireless-symbolic", "installed": True},
            {"id": "admin", "name_key": "module_admin", "desc_key": "module_admin_desc", "icon": "preferences-system-symbolic", "installed": True}
        ]

        # Store catalog comes from the real modules.json manifest (local copy),
        # merged with the live GitHub copy on refresh.
        self.catalog_modules = self._load_local_catalog()

        # Check installed status on disk for catalog modules
        for mod in self.catalog_modules:
            mod_path = os.path.expanduser(f"~/.local/share/ulak/modules/{mod['id']}")
            mod["installed"] = os.path.exists(mod_path)

        # Combine base and catalog
        all_mods = list(self.base_modules) + list(self.catalog_modules)
        self._render_modules(all_mods)
        self._on_refresh_clicked(None)

    def _load_local_catalog(self):
        path = os.path.join(os.path.dirname(__file__), "..", "modules.json")
        try:
            with open(path, "r") as f:
                data = json.load(f)
            if isinstance(data, list):
                return data
        except Exception:
            pass
        return []

    # ---------------- Gerçek modül verileri (dosya boyutu / git geçmişi) ----------------
    def _module_source_files(self, mod_id):
        app_dir = os.path.dirname(os.path.abspath(__file__))
        names = [f"ui_{mod_id}.py", f"api_{mod_id}.py"]
        extra = {"pkg_installer": ["pkg_engine.py"]}.get(mod_id, [])
        return [os.path.join(app_dir, n) for n in names + extra if os.path.exists(os.path.join(app_dir, n))]

    def _real_module_stats(self, mod_id):
        cached = self._stats_cache.get(mod_id)
        if cached:
            return cached
        files = self._module_source_files(mod_id)
        if not files:
            stats = ("—", "—")
        else:
            total = sum(os.path.getsize(f) for f in files)
            ts = self._git_last_change(files)
            if ts is None:
                ts = int(max(os.path.getmtime(f) for f in files))
            stats = (human_size(total), tr_rel_date(ts))
        self._stats_cache[mod_id] = stats
        return stats

    def _git_last_change(self, files):
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        try:
            import subprocess
            rel = [os.path.relpath(f, repo_root) for f in files]
            out = subprocess.run(
                ["git", "-C", repo_root, "log", "-1", "--format=%ct", "--"] + rel,
                capture_output=True, text=True, timeout=6)
            if out.returncode == 0 and out.stdout.strip():
                return int(out.stdout.strip().splitlines()[0])
        except Exception:
            pass
        return None

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
        
        # First check local modules.json
        local_json_path = os.path.join(os.path.dirname(__file__), "..", "modules.json")
        local_data = []
        if os.path.exists(local_json_path):
            try:
                with open(local_json_path, "r") as f:
                    local_data = json.load(f)
            except Exception:
                pass

        url = f"https://raw.githubusercontent.com/Veysitasci/ulak/main/modules.json?t={time.time()}"
        remote_data = []
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ULAK-Store", "Cache-Control": "no-cache"})
            with urllib.request.urlopen(req, timeout=4) as response:
                remote_data = json.loads(response.read().decode())
        except Exception:
            pass

        combined_remote = {m["id"]: m for m in local_data}
        for rm in remote_data:
            combined_remote[rm["id"]] = rm

        data = list(combined_remote.values())
        base_ids = {m["id"] for m in self.base_modules}
        removed_mods = storage.get_global("removed_modules", [])
        for mod in data:
            if mod["id"] in base_ids:
                mod["installed"] = (mod["id"] not in removed_mods)
            else:
                mod_path = os.path.expanduser(f"~/.local/share/ulak/modules/{mod['id']}")
                mod["installed"] = os.path.exists(mod_path) and (mod["id"] not in removed_mods)

        # Gerçek modül istatistikleri: dosya boyutlari + git guncelleme tarihi
        for mod in data + list(self.base_modules):
            self._real_module_stats(mod["id"])

        # Canli GitHub verisi: son surum ve gercek indirme sayisi
        live_info = self._fetch_github_release_info()

        GLib.idle_add(self._on_remote_modules_fetched, data, live_info)

    def _fetch_github_release_info(self):
        import urllib.request
        try:
            req = urllib.request.Request(
                "https://api.github.com/repos/Veysitasci/Ulak/releases/latest",
                headers={"User-Agent": "ULAK-Store", "Accept": "application/vnd.github+json"})
            with urllib.request.urlopen(req, timeout=5) as response:
                rel = json.loads(response.read().decode())
            version = rel.get("tag_name", "").lstrip("v")
            dl_total = sum(a.get("download_count", 0) for a in rel.get("assets", []))
            pub = (rel.get("published_at") or "")[:10]
            return {"version": version, "downloads": dl_total, "published_at": pub}
        except Exception:
            return None

    def _on_remote_modules_fetched(self, remote_modules, live_info=None):
        if hasattr(self, 'btn_refresh'):
            self.btn_refresh.set_sensitive(True)

        if live_info and live_info.get("version"):
            dl = live_info.get("downloads", 0)
            self.lbl_live.set_text(
                f"Canlı: GitHub sürüm v{live_info['version']} • {dl} indirme • yayın: {live_info.get('published_at', '—')}")
            self.lbl_live.set_visible(True)
            
        existing_ids = {m["id"] for m in self.base_modules}
        all_modules = list(self.base_modules)

        # Merge catalog modules
        for mod in getattr(self, "catalog_modules", []):
            if mod["id"] not in existing_ids:
                all_modules.append(mod)
                existing_ids.add(mod["id"])

        # Merge remote modules
        for mod in remote_modules:
            if mod["id"] not in existing_ids:
                all_modules.append(mod)
                existing_ids.add(mod["id"])
            else:
                # Update info if exists
                for m in all_modules:
                    if m["id"] == mod["id"]:
                        m.update(mod)
                
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
        # 3 Durum: Yüklü (Beyaz), Yüklenmeye Hazır (Yeşil), Kaldırılanlar (Kırmızı)
        removed_mods = storage.get_global("removed_modules", [])
        is_removed = mod["id"] in removed_mods
        is_installed = mod.get("installed", False) and not is_removed
        is_ready = not is_installed and not is_removed

        event_box = Gtk.EventBox()
        card_id = f"store-card-{mod['id'].replace('-', '_')}"

        # Card Container (Horizontal Bento)
        box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        box.get_style_context().add_class("settings-card")
        box.set_name(card_id)
        box.set_margin_top(4)
        box.set_margin_bottom(4)
        box.set_margin_start(4)
        box.set_margin_end(4)

        # RENK KURALLARI (Global Theme Class + Inline Overrides):
        # Yüklü -> BEYAZ (#ffffff)
        # Yüklenmeye Hazır -> YEŞİL (#059669)
        # Kaldırılanlar -> KIRMIZI (#dc2626)
        if is_installed:
            box.get_style_context().add_class("card-status-installed")
            bg_css = f"""
            #{card_id} {{
                background-color: #ffffff;
                border: 1.5px solid #cbd5e1;
                border-radius: 14px;
            }}
            #{card_id} label {{
                color: #0f172a;
            }}
            """
            title_color = "#0f172a"
            sub_color = "#475569"
            badge_bg = "#f1f5f9"
            badge_fg = "#334155"
            status_markup = "<span background='#dcfce7' foreground='#15803d' size='small'><b>  ● Yüklü  </b></span>"
            action_btn_text = "Kaldır"
            action_btn_class = "btn-card-danger"
        elif is_ready:
            box.get_style_context().add_class("card-status-ready")
            bg_css = f"""
            #{card_id} {{
                background-color: #059669;
                border: 2px solid #10b981;
                border-radius: 14px;
            }}
            #{card_id} label {{
                color: #ffffff;
            }}
            """
            title_color = "#ffffff"
            sub_color = "#ecfdf5"
            badge_bg = "#047857"
            badge_fg = "#ffffff"
            status_markup = "<span background='white' foreground='#047857' size='small'><b>  ＋ Yüklemeye Hazır  </b></span>"
            action_btn_text = "Kur"
            action_btn_class = "btn-card-action"
        else: # is_removed
            box.get_style_context().add_class("card-status-removed")
            bg_css = f"""
            #{card_id} {{
                background-color: #dc2626;
                border: 2px solid #ef4444;
                border-radius: 14px;
            }}
            #{card_id} label {{
                color: #ffffff;
            }}
            """
            title_color = "#ffffff"
            sub_color = "#fef2f2"
            badge_bg = "#991b1b"
            badge_fg = "#ffffff"
            status_markup = "<span background='white' foreground='#b91c1c' size='small'><b>  ✕ Kaldırıldı  </b></span>"
            action_btn_text = "Tekrar Kur"
            action_btn_class = "btn-card-action"

        provider = Gtk.CssProvider()
        provider.load_from_data(bg_css.encode("utf-8"))
        box.get_style_context().add_provider(provider, Gtk.STYLE_PROVIDER_PRIORITY_USER + 100)

        # Sol: İkon (48px)
        icon_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        icon_box.set_valign(Gtk.Align.CENTER)
        icon_box.set_size_request(68, -1)
        icon = Gtk.Image.new_from_icon_name(mod["icon"], Gtk.IconSize.DIALOG)
        icon.set_pixel_size(44)
        icon_box.pack_start(icon, True, True, 0)
        box.pack_start(icon_box, False, False, 0)

        # Orta: Başlık & Açıklama / Özellikler
        center_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=5)
        center_box.set_valign(Gtk.Align.CENTER)

        # Başlık ve Kategori Satırı
        title_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        name = Gtk.Label()
        safe_name = GLib.markup_escape_text(_(mod['name_key']))
        name.set_markup(f"<span foreground='{title_color}'><b>{safe_name}</b></span>")
        title_row.pack_start(name, False, False, 0)

        if "category" in mod:
            cat_lbl = Gtk.Label()
            cat_lbl.set_markup(f"<span background='{badge_bg}' foreground='{badge_fg}' size='x-small'>  {GLib.markup_escape_text(mod['category'])}  </span>")
            title_row.pack_start(cat_lbl, False, False, 0)

        center_box.pack_start(title_row, False, False, 0)

        # Özellikler / Açıklama
        if "features" in mod:
            for feat in mod["features"][:2]:
                feat_lbl = Gtk.Label()
                safe_feat = GLib.markup_escape_text(feat)
                feat_lbl.set_markup(f"<span foreground='{sub_color}' size='small'>• {safe_feat}</span>")
                feat_lbl.set_halign(Gtk.Align.START)
                center_box.pack_start(feat_lbl, False, False, 0)
        else:
            desc_lbl = Gtk.Label()
            safe_desc = GLib.markup_escape_text(_(mod['desc_key']))
            desc_lbl.set_markup(f"<span foreground='{sub_color}' size='small'>{safe_desc}</span>")
            desc_lbl.set_halign(Gtk.Align.START)
            desc_lbl.set_line_wrap(True)
            desc_lbl.set_max_width_chars(32)
            center_box.pack_start(desc_lbl, False, False, 0)

        # Gerçek veriler: diskteki dosya boyutu + git güncelleme tarihi
        stats = self._stats_cache.get(mod["id"])
        if stats and stats[0] != "—":
            meta_lbl = Gtk.Label()
            meta_lbl.set_markup(
                f"<span foreground='{sub_color}' size='x-small'>{GLib.markup_escape_text(stats[0])}  •  Güncelleme: {GLib.markup_escape_text(stats[1])}</span>")
            meta_lbl.set_halign(Gtk.Align.START)
            center_box.pack_start(meta_lbl, False, False, 0)

        box.pack_start(center_box, True, True, 0)

        # Sağ: Bento Buton & Durum Rozeti (Kural 1 & 2)
        right_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        right_box.set_valign(Gtk.Align.CENTER)
        right_box.set_size_request(130, -1)

        # Durum Rozeti
        status_label = Gtk.Label()
        status_label.set_halign(Gtk.Align.END)
        status_label.set_markup(status_markup)
        right_box.pack_start(status_label, False, False, 0)

        # Doğrudan Kart Üzeri Aksiyon Butonu
        btn_action = Gtk.Button()
        btn_action.get_style_context().add_class(action_btn_class)
        btn_action.set_halign(Gtk.Align.END)
        btn_lbl = Gtk.Label()
        if is_installed:
            btn_lbl.set_markup("<span foreground='#dc2626'><b>Kaldır</b></span>")
        elif is_removed:
            btn_lbl.set_markup("<span foreground='#b91c1c'><b>Tekrar Kur</b></span>")
        else:
            btn_lbl.set_markup("<span foreground='#047857'><b>＋ Kur</b></span>")
        btn_action.add(btn_lbl)

        if is_installed:
            btn_action.connect("clicked", lambda b, m=mod: self._quick_uninstall_module(m))
        elif is_removed:
            btn_action.connect("clicked", lambda b, m=mod: self._quick_install_module(m, is_reinstall=True))
        else:
            btn_action.connect("clicked", lambda b, m=mod: self._quick_install_module(m, is_reinstall=False))
        right_box.pack_start(btn_action, False, False, 0)

        box.pack_start(right_box, False, False, 0)

        event_box.add(box)
        event_box.connect("button-press-event", self._on_card_clicked, mod)

        return event_box

    def _write_module_manifest(self, mod):
        mod_dir = os.path.expanduser(f"~/.local/share/ulak/modules/{mod['id']}")
        os.makedirs(mod_dir, exist_ok=True)
        size_str, date_str = self._real_module_stats(mod["id"])
        manifest = {k: v for k, v in mod.items() if k not in ("popularity", "downloads", "is_new", "installed")}
        manifest.update({
            "size": size_str,
            "update_date": date_str,
            "installed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "source_files": [os.path.basename(f) for f in self._module_source_files(mod["id"])],
        })
        try:
            from updater import CURRENT_VERSION
            manifest["app_version"] = CURRENT_VERSION
        except Exception:
            pass
        with open(os.path.join(mod_dir, "manifest.json"), "w") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        return mod_dir

    def _quick_install_module(self, mod, is_reinstall=False):
        """Kart üzerindeki Kur / Tekrar Kur butonuna tıklandığında hızlı kurulum."""
        cur_removed = storage.get_global("removed_modules", [])
        if mod["id"] in cur_removed:
            cur_removed.remove(mod["id"])
            storage.set_global("removed_modules", cur_removed)

        self._write_module_manifest(mod)

        mod["installed"] = True
        self.toast_service.show(f"{_(mod['name_key'])} başarıyla kuruldu!", type="success")
        self._load_modules()

        main_window = self.get_toplevel()
        if hasattr(main_window, "_load_module_view_by_id"):
            main_window._load_module_view_by_id(mod["id"])
        if hasattr(main_window, "rebuild_sidebar"):
            main_window.rebuild_sidebar()

    def _quick_uninstall_module(self, mod):
        """Kart üzerindeki Kaldır butonuna tıklandığında hızlı kaldırma."""
        cur_removed = storage.get_global("removed_modules", [])
        if mod["id"] not in cur_removed:
            cur_removed.append(mod["id"])
            storage.set_global("removed_modules", cur_removed)

        mod_dir = os.path.expanduser(f"~/.local/share/ulak/modules/{mod['id']}")
        if os.path.exists(mod_dir):
            import shutil
            shutil.rmtree(mod_dir, ignore_errors=True)

        mod["installed"] = False
        self.toast_service.show(f"{_(mod['name_key'])} kaldırıldı.", type="warning")
        self._load_modules()

        main_window = self.get_toplevel()
        if hasattr(main_window, "rebuild_sidebar"):
            main_window.rebuild_sidebar()

    def _on_card_clicked(self, widget, event, mod):
        removed_mods = storage.get_global("removed_modules", [])
        is_removed = mod["id"] in removed_mods
        is_installed = mod.get("installed", False) and not is_removed
        is_ready = not is_installed and not is_removed

        dialog = BentoDialog(title=_(mod["name_key"]), parent=self.get_toplevel(), icon_name=mod["icon"], default_width=400, default_height=340)
        dialog.add_bento_action_button("Kapat", Gtk.ResponseType.CANCEL, is_primary=False)

        # Duruma göre butonlar:
        if is_installed:
            # Kaldır Butonu (Kırmızı)
            btn_uninstall = dialog.add_bento_action_button("Kaldır", 999, is_primary=False)
            btn_uninstall.get_style_context().add_class("btn-danger")
            btn_action = dialog.add_bento_action_button(_("store_launch"), Gtk.ResponseType.OK, is_primary=True)
        elif is_removed:
            btn_action = dialog.add_bento_action_button("Tekrar Kur", Gtk.ResponseType.OK, is_primary=True)
        else: # is_ready
            btn_action = dialog.add_bento_action_button(_("store_install"), Gtk.ResponseType.OK, is_primary=True)

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

        # Meta Info (gerçek dosya verileri)
        size_str, date_str = self._real_module_stats(mod["id"])
        meta_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=20)
        meta_box.set_halign(Gtk.Align.CENTER)
        meta_box.set_margin_top(10)

        lbl_size = Gtk.Label()
        lbl_size.set_markup(f"<span foreground='#64748b' size='small'>Boyut: {size_str}</span>")
        meta_box.pack_start(lbl_size, False, False, 0)

        lbl_upd = Gtk.Label()
        lbl_upd.set_markup(f"<span foreground='#64748b' size='small'>Son güncelleme: {date_str}</span>")
        meta_box.pack_start(lbl_upd, False, False, 0)

        lbl_date = Gtk.Label()
        if is_installed:
            date_text = "Durum: Sistemde Yüklü"
        elif is_removed:
            date_text = "Durum: Kaldırıldı"
        else:
            date_text = "Durum: Yüklemeye Hazır"
        lbl_date.set_markup(f"<span foreground='#64748b' size='small'>{date_text}</span>")
        meta_box.pack_start(lbl_date, False, False, 0)
        content.pack_start(meta_box, False, False, 0)

        # Progress Box
        prog_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        prog_box.set_margin_top(15)
        prog_lbl = Gtk.Label(label="İşlem Yapılıyor...")
        prog_lbl.set_halign(Gtk.Align.START)
        prog_lbl.get_style_context().add_class("status-dot")
        prog = Gtk.ProgressBar()
        prog_box.pack_start(prog_lbl, False, False, 0)
        prog_box.pack_start(prog, False, False, 0)

        dialog.show_all()

        def _run_installation(is_reinstall=False):
            btn_action.set_sensitive(False)
            content.pack_start(prog_box, False, False, 0)
            prog_box.show_all()
            self.install_step = 0

            def _step():
                self.install_step += 0.08
                prog.set_fraction(self.install_step)
                if self.install_step < 0.5:
                    prog_lbl.set_label("Bileşenler hazırlanıyor...")
                elif self.install_step < 0.8:
                    prog_lbl.set_label("Bağımlılıklar yapılandırılıyor...")
                else:
                    prog_lbl.set_label("Sisteme entegre ediliyor...")

                if self.install_step >= 1.0:
                    dialog.destroy()
                    # Kaldırılanlar listesinden temizle
                    cur_removed = storage.get_global("removed_modules", [])
                    if mod["id"] in cur_removed:
                        cur_removed.remove(mod["id"])
                        storage.set_global("removed_modules", cur_removed)

                    # Manifest yaz (gerçek boyut / tarih / sürüm bilgisiyle)
                    self._write_module_manifest(mod)
                    
                    mod["installed"] = True
                    self.toast_service.show(f"{_(mod['name_key'])} başarıyla kuruldu!", type="success")
                    self._load_modules()

                    # Ana pencere sidebar güncelle
                    main_window = self.get_toplevel()
                    if hasattr(main_window, "_load_module_view_by_id"):
                        main_window._load_module_view_by_id(mod["id"])
                    if hasattr(main_window, "rebuild_sidebar"):
                        main_window.rebuild_sidebar()
                    return False
                return True

            GLib.timeout_add(80, _step)

        def _run_uninstallation():
            dialog.destroy()
            cur_removed = storage.get_global("removed_modules", [])
            if mod["id"] not in cur_removed:
                cur_removed.append(mod["id"])
                storage.set_global("removed_modules", cur_removed)

            # Modül dizinini sil
            mod_dir = os.path.expanduser(f"~/.local/share/ulak/modules/{mod['id']}")
            if os.path.exists(mod_dir):
                import shutil
                shutil.rmtree(mod_dir, ignore_errors=True)

            mod["installed"] = False
            self.toast_service.show(f"{_(mod['name_key'])} kaldırıldı.", type="warning")
            self._load_modules()

            # Ana pencere sidebar güncelle
            main_window = self.get_toplevel()
            if hasattr(main_window, "rebuild_sidebar"):
                main_window.rebuild_sidebar()

        res = dialog.run()
        if res == 999: # Kaldır
            _run_uninstallation()
        elif res == Gtk.ResponseType.OK:
            if is_installed:
                dialog.destroy()
                if mod.get("id") == "pkg_installer":
                    open_package_installer(parent=self.get_toplevel())
                else:
                    main_window = self.get_toplevel()
                    if hasattr(main_window, "select_tab"):
                        main_window.select_tab(mod["id"])
                    self.toast_service.show(f"{_(mod['name_key'])} açıldı.", type="info")
            elif is_removed:
                _run_installation(is_reinstall=True)
            else: # is_ready
                _run_installation(is_reinstall=False)
        else:
            dialog.destroy()
