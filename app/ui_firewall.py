import os
import threading
import gi

gi.require_version('Gtk', '3.0')
from gi.repository import Gtk, GLib, Gdk, Pango

from i18n import _
from api_firewall import fw_api
from ui_shared import BentoDialog
from antivirus_engine import av_engine

class FirewallView(Gtk.Box):
    def __init__(self, toast_service):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.toast_service = toast_service

        # Header
        header = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        header.get_style_context().add_class("header")
        header.set_spacing(6)
        
        title = Gtk.Label(label=_("fw_title"))
        title.set_halign(Gtk.Align.START)
        title.get_style_context().add_class("header-title")
        
        subtitle = Gtk.Label(label=_("fw_subtitle"))
        subtitle.set_halign(Gtk.Align.START)
        subtitle.get_style_context().add_class("header-sub")
        
        header.pack_start(title, False, False, 0)
        header.pack_start(subtitle, False, False, 0)
        self.pack_start(header, False, False, 0)

        # Termius Bento Sub-tab Navigation
        subtab_outer = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        subtab_outer.set_margin_start(32)
        subtab_outer.set_margin_end(32)
        subtab_outer.set_margin_top(12)
        subtab_outer.set_margin_bottom(12)
        
        self.subtab_bar = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        self.subtab_bar.get_style_context().add_class("subtab-bar")
        
        self.subtab_buttons = []
        tabs_meta = [
            (0, _("fw_shield"), "security-high-symbolic"),
            (1, _("fw_rules"), "view-list-symbolic"),
            (2, _("fw_apps"), "system-run-symbolic"),
            (3, _("fw_local"), "network-vpn-symbolic"),
            (4, _("fw_threats"), "dialog-warning-symbolic"),
        ]
        
        for idx, tab_label, tab_icon in tabs_meta:
            btn = Gtk.Button()
            btn.get_style_context().add_class("subtab-btn")
            if idx == 0:
                btn.get_style_context().add_class("active")
            
            btn_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
            img = Gtk.Image.new_from_icon_name(tab_icon, Gtk.IconSize.MENU)
            lbl = Gtk.Label(label=tab_label)
            btn_box.pack_start(img, False, False, 0)
            btn_box.pack_start(lbl, False, False, 0)
            btn.add(btn_box)
            
            btn.connect("clicked", self._on_subtab_clicked, idx)
            self.subtab_bar.pack_start(btn, False, False, 0)
            self.subtab_buttons.append(btn)
            
        subtab_outer.pack_start(self.subtab_bar, False, False, 0)
        self.pack_start(subtab_outer, False, False, 0)

        # Notebook (Hidden tabs, driven by subtab_bar)
        self.notebook = Gtk.Notebook()
        self.notebook.set_show_tabs(False)
        self.notebook.set_show_border(False)
        self.pack_start(self.notebook, True, True, 0)

        # Tabs Content
        self.shield_box = ShieldTab(self.toast_service)
        self.notebook.append_page(self.shield_box, Gtk.Label(label=_("fw_shield")))
        
        self.rules_box = RulesTab(self.toast_service)
        self.notebook.append_page(self.rules_box, Gtk.Label(label=_("fw_rules")))
        
        self.apps_box = AppsTab(self.toast_service)
        self.notebook.append_page(self.apps_box, Gtk.Label(label=_("fw_apps")))
        
        self.local_box = LocalTab(self.toast_service)
        self.notebook.append_page(self.local_box, Gtk.Label(label=_("fw_local")))
        
        self.threats_box = ThreatsTab(self.toast_service)
        self.notebook.append_page(self.threats_box, Gtk.Label(label=_("fw_threats")))

        self.notebook.connect("switch-page", self.on_tab_switched)

    def _on_subtab_clicked(self, btn, page_idx):
        self.notebook.set_current_page(page_idx)

    def on_tab_switched(self, notebook, page, page_num):
        for i, btn in enumerate(self.subtab_buttons):
            if i == page_num:
                btn.get_style_context().add_class("active")
            else:
                btn.get_style_context().remove_class("active")
        if page_num == 0:
            self.shield_box.refresh_data()
        elif page_num == 1:
            self.rules_box.refresh_rules()
        elif page_num == 2:
            self.apps_box.refresh_apps()
        elif page_num == 3:
            self.local_box.refresh_data()
        elif page_num == 4:
            self.threats_box.refresh_log()


class ShieldTab(Gtk.Box):
    def __init__(self, toast_service):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        self.toast_service = toast_service
        self.set_margin_start(32)
        self.set_margin_end(32)
        self.set_margin_top(4)
        self.set_margin_bottom(24)
        
        # 1. Power Switch Bento Card
        power_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        power_box.get_style_context().add_class("card")
        
        shield_icon = Gtk.Image.new_from_icon_name("security-high-symbolic", Gtk.IconSize.DND)
        power_box.pack_start(shield_icon, False, False, 0)
        
        power_text_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        self.power_label = Gtk.Label(label=_("fw_enabled"))
        self.power_label.set_halign(Gtk.Align.START)
        self.power_label.get_style_context().add_class("device-name")
        power_sub = Gtk.Label(label=_("fw_subtitle"))
        power_sub.set_halign(Gtk.Align.START)
        power_sub.get_style_context().add_class("device-mac")
        power_text_box.pack_start(self.power_label, False, False, 0)
        power_text_box.pack_start(power_sub, False, False, 0)
        power_box.pack_start(power_text_box, True, True, 0)
        
        self.power_switch = Gtk.Switch()
        self.power_switch.set_valign(Gtk.Align.CENTER)
        self.power_switch.connect("notify::active", self.on_power_toggled)
        power_box.pack_end(self.power_switch, False, False, 0)
        self.pack_start(power_box, False, False, 0)

        # 2. Security Level Bento Card (Segmented Filter Chips)
        sec_card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        sec_card.get_style_context().add_class("card")
        
        sec_header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        sec_icon = Gtk.Image.new_from_icon_name("security-medium-symbolic", Gtk.IconSize.LARGE_TOOLBAR)
        sec_header.pack_start(sec_icon, False, False, 0)
        
        sec_titles = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        lbl_sec_title = Gtk.Label(label=_("fw_security_level"))
        lbl_sec_title.set_halign(Gtk.Align.START)
        lbl_sec_title.get_style_context().add_class("device-name")
        lbl_sec_desc = Gtk.Label(label=_("fw_security_level_desc"))
        lbl_sec_desc.set_halign(Gtk.Align.START)
        lbl_sec_desc.get_style_context().add_class("device-mac")
        sec_titles.pack_start(lbl_sec_title, False, False, 0)
        sec_titles.pack_start(lbl_sec_desc, False, False, 0)
        sec_header.pack_start(sec_titles, True, True, 0)
        sec_card.pack_start(sec_header, False, False, 0)
        
        # Segmented Filter-Chip Buttons (Termius Bento Style)
        sec_chips_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        self.radio_low = Gtk.RadioButton.new_with_label_from_widget(None, _("fw_security_low"))
        self.radio_med = Gtk.RadioButton.new_with_label_from_widget(self.radio_low, _("fw_security_medium"))
        self.radio_high = Gtk.RadioButton.new_with_label_from_widget(self.radio_low, _("fw_security_high"))
        self.radio_paranoid = Gtk.RadioButton.new_with_label_from_widget(self.radio_low, _("fw_security_paranoid"))
        
        self.sec_radios = [self.radio_low, self.radio_med, self.radio_high, self.radio_paranoid]
        for r in self.sec_radios:
            r.set_mode(False)  # Remove raw yellow radio dot
            r.get_style_context().add_class("filter-chip")
            sec_chips_box.pack_start(r, False, False, 0)
            
        # Önceden kayıtlı seviyeyi sinyal tetiklemeden (sessizce) seç
        saved_preset = fw_api.get_preset()
        if saved_preset == "low":
            self.radio_low.set_active(True)
        elif saved_preset == "high":
            self.radio_high.set_active(True)
        elif saved_preset == "paranoid":
            self.radio_paranoid.set_active(True)
        else:
            self.radio_med.set_active(True)

        # Sinyalleri seçim yapıldıktan SONRA bağla (böylece açılışta kendi kendine açılmaz!)
        for r in self.sec_radios:
            r.connect("toggled", self.on_security_level_changed)

        sec_card.pack_start(sec_chips_box, False, False, 0)
        self.pack_start(sec_card, False, False, 0)

        # 3. Derin Görsel & Dosya Antivirüs Ayrıştırıcısı (Bento Card)
        scan_card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        scan_card.get_style_context().add_class("card")
        
        scan_head = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        sc_icon = Gtk.Image.new_from_icon_name("security-high-symbolic", Gtk.IconSize.LARGE_TOOLBAR)
        sc_icon.set_pixel_size(24)
        scan_head.pack_start(sc_icon, False, False, 0)
        
        sc_titles = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        lbl_sc_title = Gtk.Label(label=_("fw_scanner_title"))
        lbl_sc_title.set_halign(Gtk.Align.START)
        lbl_sc_title.get_style_context().add_class("device-name")
        lbl_sc_desc = Gtk.Label(label=_("fw_scanner_desc"))
        lbl_sc_desc.set_halign(Gtk.Align.START)
        lbl_sc_desc.get_style_context().add_class("device-mac")
        sc_titles.pack_start(lbl_sc_title, False, False, 0)
        sc_titles.pack_start(lbl_sc_desc, False, False, 0)
        scan_head.pack_start(sc_titles, True, True, 0)
        
        btn_scan = Gtk.Button(label=_("fw_scanner_btn"))
        btn_scan.get_style_context().add_class("btn-secondary")
        btn_scan.set_valign(Gtk.Align.CENTER)
        btn_scan.connect("clicked", self._on_deep_scan_clicked)
        scan_head.pack_end(btn_scan, False, False, 0)
        scan_card.pack_start(scan_head, False, False, 0)

        # Sonuç Alanı (Inline Sonuç Kartı)
        self.scan_result_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        self.scan_result_box.set_no_show_all(True)
        scan_card.pack_start(self.scan_result_box, False, False, 0)
        
        self.pack_start(scan_card, False, False, 0)

        # 3. Stats Row (Bento Metric Tiles)
        stats_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        self.lbl_blocked = self.create_stat_card(stats_box, _("fw_blocked_today"), "0", "action-unavailable-symbolic")
        self.lbl_ports = self.create_stat_card(stats_box, _("fw_open_ports"), "0", "network-workgroup-symbolic")
        self.lbl_conns = self.create_stat_card(stats_box, _("fw_active_conns"), "0", "network-transmit-receive-symbolic")
        self.pack_start(stats_box, False, False, 0)

        # 4. Recent Events (Termius Terminal Console)
        terminal_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        terminal_box.get_style_context().add_class("terminal-container")
        
        term_header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        term_icon = Gtk.Image.new_from_icon_name("utilities-terminal-symbolic", Gtk.IconSize.MENU)
        term_title = Gtk.Label(label=_("fw_recent_events").upper())
        term_title.get_style_context().add_class("terminal-header")
        term_badge = Gtk.Label(label="CANLI AKIŞ")
        term_badge.get_style_context().add_class("terminal-status-badge")
        
        self.events_count_lbl = Gtk.Label(label="0 olay")
        self.events_count_lbl.get_style_context().add_class("terminal-header")
        
        term_header.pack_start(term_icon, False, False, 0)
        term_header.pack_start(term_title, False, False, 0)
        term_header.pack_start(term_badge, False, False, 4)
        term_header.pack_end(self.events_count_lbl, False, False, 0)
        terminal_box.pack_start(term_header, False, False, 0)
        
        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        scroll.set_size_request(-1, 220)
        self.events_list = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        scroll.add(self.events_list)
        terminal_box.pack_start(scroll, True, True, 4)
        
        self.pack_start(terminal_box, True, True, 0)
        
        self.refresh_data()
        GLib.timeout_add_seconds(3, self.on_auto_refresh)

    def create_stat_card(self, parent_box, title, default_val, icon_name="security-high-symbolic"):
        card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        card.get_style_context().add_class("card")
        card.get_style_context().add_class("fw-stat-card")
        
        top_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.MENU)
        lbl_title = Gtk.Label(label=title)
        lbl_title.get_style_context().add_class("fw-stat-label")
        lbl_title.set_halign(Gtk.Align.START)
        top_row.pack_start(icon, False, False, 0)
        top_row.pack_start(lbl_title, False, False, 0)
        
        lbl_val = Gtk.Label(label=default_val)
        lbl_val.get_style_context().add_class("fw-stat-value")
        lbl_val.set_halign(Gtk.Align.START)
        
        card.pack_start(top_row, False, False, 0)
        card.pack_start(lbl_val, False, False, 0)
        parent_box.pack_start(card, True, True, 0)
        return lbl_val

    def on_power_toggled(self, switch, gparam):
        active = switch.get_active()
        threading.Thread(target=self._do_toggle, args=(active,), daemon=True).start()
        
    def _do_toggle(self, active):
        try:
            if active:
                fw_api.enable()
            else:
                fw_api.disable()
            GLib.idle_add(self.refresh_data)
        except Exception as e:
            GLib.idle_add(self.toast_service.show, f"Error: {e}")

    def on_security_level_changed(self, button):
        if not button.get_active():
            return
        level = "medium"
        if self.radio_low.get_active(): level = "low"
        elif self.radio_med.get_active(): level = "medium"
        elif self.radio_high.get_active(): level = "high"
        elif self.radio_paranoid.get_active(): level = "paranoid"
        threading.Thread(target=self._do_set_level, args=(level,), daemon=True).start()

    def _do_set_level(self, level):
        try:
            success, msg = fw_api.set_security_level(level)
            level_names = {
                "low": _("fw_security_low"),
                "medium": _("fw_security_medium"),
                "high": _("fw_security_high"),
                "paranoid": _("fw_security_paranoid")
            }
            display_name = level_names.get(level, level.capitalize())
            GLib.idle_add(self.toast_service.show, f"Güvenlik seviyesi: {display_name}")
        except Exception:
            pass

    def _on_deep_scan_clicked(self, btn):
        dialog = Gtk.FileChooserDialog(
            title=_("fw_scanner_btn"),
            parent=self.get_toplevel(),
            action=Gtk.FileChooserAction.OPEN
        )
        dialog.add_button("İptal", Gtk.ResponseType.CANCEL)
        dialog.add_button("Parçala ve Tara", Gtk.ResponseType.OK)
        
        filter_img = Gtk.FileFilter()
        filter_img.set_name("Görseller (PNG, JPG, SVG, GIF)")
        filter_img.add_mime_type("image/png")
        filter_img.add_mime_type("image/jpeg")
        filter_img.add_mime_type("image/svg+xml")
        filter_img.add_mime_type("image/gif")
        filter_img.add_pattern("*.png")
        filter_img.add_pattern("*.jpg")
        filter_img.add_pattern("*.jpeg")
        filter_img.add_pattern("*.svg")
        filter_img.add_pattern("*.gif")
        dialog.add_filter(filter_img)

        filter_all = Gtk.FileFilter()
        filter_all.set_name("Tüm Dosyalar")
        filter_all.add_pattern("*")
        dialog.add_filter(filter_all)

        res = dialog.run()
        selected_file = dialog.get_filename() if res == Gtk.ResponseType.OK else None
        dialog.destroy()

        if selected_file:
            self.toast_service.show(f"Parçalanıyor: {os.path.basename(selected_file)}...")
            threading.Thread(target=self._run_file_dissection, args=(selected_file,), daemon=True).start()

    def _run_file_dissection(self, filepath):
        report = av_engine.scan_file(filepath)
        GLib.idle_add(self._display_scan_report, report)

    def _display_scan_report(self, report):
        for child in self.scan_result_box.get_children():
            self.scan_result_box.remove(child)

        self.scan_result_box.set_no_show_all(False)
        self.scan_result_box.show()

        res_card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        res_card.get_style_context().add_class("terminal-container")
        res_card.set_margin_top(4)

        top_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        lbl_file = Gtk.Label(label=f"📄 {report.get('filename', '')} ({report.get('detected_format', '')}, {report.get('file_size', 0)} bayt, Entropi: {report.get('entropy', 0)})")
        lbl_file.get_style_context().add_class("terminal-header")
        lbl_file.set_halign(Gtk.Align.START)
        top_row.pack_start(lbl_file, True, True, 0)

        lbl_badge = Gtk.Label(label=f"● {report.get('verdict', '')}")
        lbl_badge.get_style_context().add_class("terminal-status-badge")
        top_row.pack_end(lbl_badge, False, False, 0)
        res_card.pack_start(top_row, False, False, 0)

        dissect = report.get("dissection", {})
        if dissect:
            fmt = dissect.get("format", "Bilinmeyen")
            chunks_str = ", ".join(dissect.get("chunks", [])) or ", ".join(dissect.get("segments", [])) or "Standart veri akışı"
            lbl_chunks = Gtk.Label(label=f"🧩 Ayrıştırılan Bloklar ({fmt}): {chunks_str}")
            lbl_chunks.get_style_context().add_class("device-mac")
            lbl_chunks.set_halign(Gtk.Align.START)
            res_card.pack_start(lbl_chunks, False, False, 0)

        threats = report.get("threats", [])
        if not threats:
            lbl_clean = Gtk.Label(label="✓ Kod ve bayt analizi tamamlandı. Herhangi bir steganografi, web shell veya zararlı kod bulunamadı.")
            lbl_clean.get_style_context().add_class("terminal-empty")
            lbl_clean.set_halign(Gtk.Align.START)
            res_card.pack_start(lbl_clean, False, False, 0)
        else:
            for t in threats:
                row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
                lbl_warn = Gtk.Label(label=f"⚠️ [{t.get('severity', 'WARN')}] {t.get('description', '')}")
                lbl_warn.get_style_context().add_class("terminal-line")
                lbl_warn.set_halign(Gtk.Align.START)
                lbl_warn.set_line_wrap(True)
                row.pack_start(lbl_warn, True, True, 0)
                res_card.pack_start(row, False, False, 0)

        self.scan_result_box.pack_start(res_card, True, True, 0)
        self.scan_result_box.show_all()

        if threats:
            self.toast_service.show(f"🚨 ZARARLI KOD BULUNDU: {len(threats)} tehdit tespit edildi!")
        else:
            self.toast_service.show(f"✓ {report.get('filename', '')} temiz — zararlı kod yok.")

    def on_auto_refresh(self):
        self.refresh_data()
        return True

    def refresh_data(self):
        threading.Thread(target=self._do_refresh_data, daemon=True).start()

    def _do_refresh_data(self):
        try:
            status = fw_api.get_status()
            stats = fw_api.get_stats()
            events = fw_api.get_recent_events()
            GLib.idle_add(self._update_ui, status, stats, events)
        except Exception:
            pass

    def _update_ui(self, status, stats, events):
        is_active = status.get("enabled", False)
        self.power_switch.handler_block_by_func(self.on_power_toggled)
        self.power_switch.set_active(is_active)
        self.power_switch.handler_unblock_by_func(self.on_power_toggled)
        self.power_label.set_text(_("fw_enabled") if is_active else _("fw_disabled"))
        
        self.lbl_blocked.set_text(str(stats.get("blocked_today", 0)))
        self.lbl_ports.set_text(str(stats.get("open_ports", 0)))
        self.lbl_conns.set_text(str(stats.get("active_connections", 0)))
        
        for child in self.events_list.get_children():
            self.events_list.remove(child)
            
        if not events:
            lbl = Gtk.Label(label="● " + _("fw_no_events"))
            lbl.get_style_context().add_class("terminal-empty")
            lbl.set_halign(Gtk.Align.CENTER)
            self.events_list.pack_start(lbl, True, True, 20)
            self.events_count_lbl.set_text("0 olay")
        else:
            self.events_count_lbl.set_text(f"{len(events)} olay")
            for ev in events[:15]:
                row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
                row.get_style_context().add_class("terminal-line")
                
                time_str = ev.get('time', '') or ev.get('timestamp', '')
                lbl_time = Gtk.Label(label=f"[{time_str}]" if time_str else "[LOG]")
                lbl_time.get_style_context().add_class("device-mac")
                
                proto = str(ev.get('protocol', 'NFT')).upper()
                lbl_proto = Gtk.Label(label=proto)
                lbl_proto.get_style_context().add_class("terminal-status-badge")
                
                src = ev.get('src_ip', '') or ev.get('service', 'system')
                dst_port = ev.get('dst_port', '')
                msg = ev.get('message', '')
                
                if dst_port:
                    detail = f"{src} ➜ Port: {dst_port}"
                elif msg:
                    detail = f"{src}: {msg}"
                else:
                    detail = f"{src}"
                    
                lbl_msg = Gtk.Label(label=detail)
                lbl_msg.set_halign(Gtk.Align.START)
                
                row.pack_start(lbl_time, False, False, 0)
                row.pack_start(lbl_proto, False, False, 4)
                row.pack_start(lbl_msg, True, True, 0)
                self.events_list.pack_start(row, False, False, 0)
                
        self.events_list.show_all()


class RulesTab(Gtk.Box):
    def __init__(self, toast_service):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        self.toast_service = toast_service
        self.set_margin_start(32)
        self.set_margin_end(32)
        self.set_margin_top(4)
        self.set_margin_bottom(24)

        # Top Bar
        top_bar = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        
        btn_add = Gtk.Button()
        btn_add_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        btn_add_icon = Gtk.Image.new_from_icon_name("list-add-symbolic", Gtk.IconSize.BUTTON)
        btn_add_lbl = Gtk.Label(label=_("fw_add_rule"))
        btn_add_box.pack_start(btn_add_icon, False, False, 0)
        btn_add_box.pack_start(btn_add_lbl, False, False, 0)
        btn_add.add(btn_add_box)
        btn_add.get_style_context().add_class("btn-primary")
        btn_add.connect("clicked", self.on_add_rule)
        
        self.preset_combo = Gtk.ComboBoxText()
        self.preset_combo.append_text("Web Server (80/443)")
        self.preset_combo.append_text("SSH (22)")
        self.preset_combo.append_text("FTP (21)")
        self.preset_combo.append_text("DNS (53)")
        self.preset_combo.set_active(0)
        
        btn_preset = Gtk.Button(label=_("fw_apply_preset"))
        btn_preset.get_style_context().add_class("btn-secondary")
        btn_preset.connect("clicked", self.on_apply_preset)
        
        top_bar.pack_start(btn_add, False, False, 0)
        top_bar.pack_end(btn_preset, False, False, 0)
        top_bar.pack_end(self.preset_combo, False, False, 0)
        
        self.pack_start(top_bar, False, False, 0)

        # Rules List
        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.rules_list = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        scroll.add(self.rules_list)
        self.pack_start(scroll, True, True, 0)

    def on_add_rule(self, button):
        dialog = AddRuleDialog(self.get_toplevel())
        response = dialog.run()
        if response == Gtk.ResponseType.OK:
            rule = dialog.get_rule()
            threading.Thread(target=self._do_add_rule, args=(rule,), daemon=True).start()
        dialog.destroy()

    def _do_add_rule(self, rule):
        try:
            fw_api.add_rule(rule)
            GLib.idle_add(self.toast_service.show, "Kural başarıyla eklendi")
            GLib.idle_add(self.refresh_rules)
        except Exception as e:
            GLib.idle_add(self.toast_service.show, f"Error: {e}")

    def on_apply_preset(self, button):
        idx = self.preset_combo.get_active()
        if idx == -1: return
        threading.Thread(target=self._do_apply_preset, args=(idx,), daemon=True).start()

    def _do_apply_preset(self, idx):
        try:
            if idx == 0:
                fw_api.add_rule({"port": "80", "protocol": "tcp", "action": "accept", "direction": "input"})
                fw_api.add_rule({"port": "443", "protocol": "tcp", "action": "accept", "direction": "input"})
            elif idx == 1:
                fw_api.add_rule({"port": "22", "protocol": "tcp", "action": "accept", "direction": "input"})
            elif idx == 2:
                fw_api.add_rule({"port": "21", "protocol": "tcp", "action": "accept", "direction": "input"})
            elif idx == 3:
                fw_api.add_rule({"port": "53", "protocol": "udp", "action": "accept", "direction": "input"})
            GLib.idle_add(self.toast_service.show, "Şablon kuralları uygulandı")
            GLib.idle_add(self.refresh_rules)
        except Exception:
            pass

    def refresh_rules(self):
        threading.Thread(target=self._do_refresh_rules, daemon=True).start()

    def _do_refresh_rules(self):
        try:
            rules = fw_api.get_rules()
            GLib.idle_add(self._update_rules, rules)
        except Exception:
            pass

    def _update_rules(self, rules):
        for child in self.rules_list.get_children():
            self.rules_list.remove(child)
            
        if not rules:
            empty_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
            empty_box.get_style_context().add_class("terminal-container")
            lbl_empty = Gtk.Label(label="● Kayıtlı kural bulunamadı. Yukarıdan şablon seçebilir veya kural ekleyebilirsiniz.")
            lbl_empty.get_style_context().add_class("terminal-empty")
            lbl_empty.set_halign(Gtk.Align.CENTER)
            empty_box.pack_start(lbl_empty, True, True, 20)
            self.rules_list.pack_start(empty_box, False, False, 0)
        else:
            for rule in rules:
                row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
                row.get_style_context().add_class("card")
                
                # Direction badge
                direction = rule.get('direction', 'IN').upper()
                lbl_dir = Gtk.Label(label=direction)
                lbl_dir.get_style_context().add_class("terminal-status-badge")
                
                # Protocol badge
                proto = rule.get('protocol', 'TCP').upper()
                lbl_proto = Gtk.Label(label=proto)
                lbl_proto.get_style_context().add_class("filter-chip")
                
                # Info
                port = rule.get('port', 'Tümü')
                ip = rule.get('ip', 'Tümü')
                comment = rule.get('comment', '')
                detail = f"Port: {port}  |  IP: {ip}"
                if comment:
                    detail += f"  ({comment})"
                lbl_info = Gtk.Label(label=detail)
                lbl_info.set_halign(Gtk.Align.START)
                lbl_info.get_style_context().add_class("device-name")
                
                # Action badge
                action = rule.get('action', 'ACCEPT').upper()
                lbl_action = Gtk.Label(label=action)
                if action == "ACCEPT":
                    lbl_action.get_style_context().add_class("terminal-status-badge")
                else:
                    lbl_action.get_style_context().add_class("badge-signal-weak")
                
                # Delete button
                btn_del = Gtk.Button()
                btn_del.set_image(Gtk.Image.new_from_icon_name("edit-delete-symbolic", Gtk.IconSize.BUTTON))
                btn_del.get_style_context().add_class("btn-danger")
                btn_del.set_tooltip_text(_("fw_remove_rule"))
                btn_del.connect("clicked", self.on_del_rule, rule.get("id"))
                
                row.pack_start(lbl_dir, False, False, 0)
                row.pack_start(lbl_proto, False, False, 0)
                row.pack_start(lbl_info, True, True, 0)
                row.pack_end(btn_del, False, False, 0)
                row.pack_end(lbl_action, False, False, 8)
                self.rules_list.pack_start(row, False, False, 0)
                
        self.rules_list.show_all()

    def on_del_rule(self, button, rule_id):
        threading.Thread(target=self._do_del_rule, args=(rule_id,), daemon=True).start()
        
    def _do_del_rule(self, rule_id):
        try:
            fw_api.delete_rule(rule_id)
            GLib.idle_add(self.refresh_rules)
        except Exception as e:
            GLib.idle_add(self.toast_service.show, f"Error: {e}")


class AddRuleDialog(BentoDialog):
    def __init__(self, parent):
        super().__init__(title=_("fw_add_rule"), parent=parent, icon_name="list-add-symbolic", default_width=400, default_height=520)
        self.add_bento_action_button("İptal", Gtk.ResponseType.CANCEL, is_primary=False)
        self.add_bento_action_button(_("fw_add_rule"), Gtk.ResponseType.OK, is_primary=True)
        
        box = self.get_bento_content()

        # Direction
        self.combo_dir = Gtk.ComboBoxText()
        self.combo_dir.append_text(_("fw_input"))
        self.combo_dir.append_text(_("fw_output"))
        self.combo_dir.set_active(0)
        box.pack_start(Gtk.Label(label=_("fw_direction"), halign=Gtk.Align.START), False, False, 0)
        box.pack_start(self.combo_dir, False, False, 0)

        # Protocol
        self.combo_proto = Gtk.ComboBoxText()
        self.combo_proto.append_text("tcp")
        self.combo_proto.append_text("udp")
        self.combo_proto.append_text("both")
        self.combo_proto.set_active(0)
        box.pack_start(Gtk.Label(label=_("fw_protocol"), halign=Gtk.Align.START), False, False, 0)
        box.pack_start(self.combo_proto, False, False, 0)

        # Port
        self.ent_port = Gtk.Entry()
        self.ent_port.set_placeholder_text("80, 443, etc.")
        box.pack_start(Gtk.Label(label=_("fw_port"), halign=Gtk.Align.START), False, False, 0)
        box.pack_start(self.ent_port, False, False, 0)

        # IP
        self.ent_ip = Gtk.Entry()
        self.ent_ip.set_text("0.0.0.0/0")
        box.pack_start(Gtk.Label(label=_("fw_ip"), halign=Gtk.Align.START), False, False, 0)
        box.pack_start(self.ent_ip, False, False, 0)

        # Action
        self.combo_action = Gtk.ComboBoxText()
        self.combo_action.append_text(_("fw_accept"))
        self.combo_action.append_text(_("fw_drop"))
        self.combo_action.set_active(0)
        box.pack_start(Gtk.Label(label=_("fw_action"), halign=Gtk.Align.START), False, False, 0)
        box.pack_start(self.combo_action, False, False, 0)

        # Comment
        self.ent_comment = Gtk.Entry()
        box.pack_start(Gtk.Label(label=_("fw_comment"), halign=Gtk.Align.START), False, False, 0)
        box.pack_start(self.ent_comment, False, False, 0)

        self.show_all()

    def get_rule(self):
        d = "input" if self.combo_dir.get_active() == 0 else "output"
        a = "accept" if self.combo_action.get_active() == 0 else "drop"
        p = self.combo_proto.get_active_text()
        return {
            "direction": d,
            "protocol": p,
            "port": self.ent_port.get_text().strip(),
            "ip": self.ent_ip.get_text().strip(),
            "action": a,
            "comment": self.ent_comment.get_text().strip()
        }


class AppsTab(Gtk.Box):
    def __init__(self, toast_service):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        self.toast_service = toast_service
        self.set_margin_start(32)
        self.set_margin_end(32)
        self.set_margin_top(4)
        self.set_margin_bottom(24)
        
        btn_refresh = Gtk.Button()
        btn_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        btn_box.pack_start(Gtk.Image.new_from_icon_name("view-refresh-symbolic", Gtk.IconSize.BUTTON), False, False, 0)
        btn_box.pack_start(Gtk.Label(label=_("fw_refresh")), False, False, 0)
        btn_refresh.add(btn_box)
        btn_refresh.get_style_context().add_class("btn-secondary")
        btn_refresh.connect("clicked", lambda x: self.refresh_apps())
        
        top = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        top.pack_end(btn_refresh, False, False, 0)
        self.pack_start(top, False, False, 0)
        
        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.apps_list = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        scroll.add(self.apps_list)
        self.pack_start(scroll, True, True, 0)

    def refresh_apps(self):
        threading.Thread(target=self._do_refresh_apps, daemon=True).start()

    def _do_refresh_apps(self):
        try:
            apps = fw_api.get_listening_apps()
            GLib.idle_add(self._update_apps, apps)
        except Exception:
            pass

    def _update_apps(self, apps):
        for child in self.apps_list.get_children():
            self.apps_list.remove(child)
            
        if not apps:
            empty_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
            empty_box.get_style_context().add_class("terminal-container")
            lbl_empty = Gtk.Label(label="● Dinleme yapan harici uygulama bulunamadı.")
            lbl_empty.get_style_context().add_class("terminal-empty")
            lbl_empty.set_halign(Gtk.Align.CENTER)
            empty_box.pack_start(lbl_empty, True, True, 20)
            self.apps_list.pack_start(empty_box, False, False, 0)
        else:
            for app in apps:
                row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
                row.get_style_context().add_class("card")
                
                app_icon = Gtk.Image.new_from_icon_name("system-run-symbolic", Gtk.IconSize.DND)
                row.pack_start(app_icon, False, False, 0)
                
                info_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
                lbl_name = Gtk.Label(label=f"{app.get('name', 'Bilinmeyen')} (PID: {app.get('pid', '')})")
                lbl_name.set_halign(Gtk.Align.START)
                lbl_name.get_style_context().add_class("device-name")
                
                lbl_addr = Gtk.Label(label=f"Soket: {app.get('ip', '')}:{app.get('port', '')}  |  {app.get('protocol', 'TCP').upper()}")
                lbl_addr.set_halign(Gtk.Align.START)
                lbl_addr.get_style_context().add_class("device-mac")
                
                info_box.pack_start(lbl_name, False, False, 0)
                info_box.pack_start(lbl_addr, False, False, 0)
                row.pack_start(info_box, True, True, 0)
                
                if app.get('is_exposed', False):
                    lbl_warn = Gtk.Label(label=_("fw_app_exposed"))
                    lbl_warn.get_style_context().add_class("badge-signal-weak") 
                    row.pack_end(lbl_warn, False, False, 6)
                    
                    btn_block = Gtk.Button(label=_("fw_block_app"))
                    btn_block.get_style_context().add_class("btn-danger")
                    btn_block.connect("clicked", self.on_block_app, app)
                    row.pack_end(btn_block, False, False, 0)
                else:
                    lbl_safe = Gtk.Label(label=_("fw_app_safe"))
                    lbl_safe.get_style_context().add_class("terminal-status-badge")
                    row.pack_end(lbl_safe, False, False, 6)
                    
                self.apps_list.pack_start(row, False, False, 0)
                
        self.apps_list.show_all()

    def on_block_app(self, button, app):
        port = app.get("port")
        proto = app.get("protocol", "tcp")
        rule = {"direction": "input", "protocol": proto, "port": str(port), "ip": "0.0.0.0/0", "action": "drop"}
        threading.Thread(target=self._do_block, args=(rule,), daemon=True).start()

    def _do_block(self, rule):
        try:
            fw_api.add_rule(rule)
            GLib.idle_add(self.toast_service.show, "Uygulama portu engellendi")
            GLib.idle_add(self.refresh_apps)
        except Exception as e:
            GLib.idle_add(self.toast_service.show, f"Error: {e}")


class LocalTab(Gtk.Box):
    def __init__(self, toast_service):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        self.toast_service = toast_service
        self.set_margin_start(32)
        self.set_margin_end(32)
        self.set_margin_top(4)
        self.set_margin_bottom(24)
        
        # 1. Localhost Only Switch Bento Card
        hbox = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        hbox.get_style_context().add_class("card")
        
        vpn_icon = Gtk.Image.new_from_icon_name("network-vpn-symbolic", Gtk.IconSize.DND)
        hbox.pack_start(vpn_icon, False, False, 0)
        
        vbox_lbls = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        lbl_title = Gtk.Label(label=_("fw_localhost_only"))
        lbl_title.set_halign(Gtk.Align.START)
        lbl_title.get_style_context().add_class("device-name")
        lbl_desc = Gtk.Label(label=_("fw_localhost_desc"))
        lbl_desc.set_halign(Gtk.Align.START)
        lbl_desc.get_style_context().add_class("device-mac")
        vbox_lbls.pack_start(lbl_title, False, False, 0)
        vbox_lbls.pack_start(lbl_desc, False, False, 0)
        hbox.pack_start(vbox_lbls, True, True, 0)
        
        self.local_switch = Gtk.Switch()
        self.local_switch.set_valign(Gtk.Align.CENTER)
        self.local_switch.connect("notify::active", self.on_local_toggled)
        hbox.pack_end(self.local_switch, False, False, 0)
        self.pack_start(hbox, False, False, 0)
        
        # 2. Whitelist Bento Section
        wl_card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        wl_card.get_style_context().add_class("card")
        
        lbl_wl = Gtk.Label(label=_("fw_whitelist"))
        lbl_wl.set_halign(Gtk.Align.START)
        lbl_wl.get_style_context().add_class("device-name")
        wl_card.pack_start(lbl_wl, False, False, 0)
        
        wl_add_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        self.ent_wl_ip = Gtk.Entry()
        self.ent_wl_ip.set_placeholder_text("IP Adresi (Örn: 192.168.1.50)")
        self.ent_wl_port = Gtk.Entry()
        self.ent_wl_port.set_placeholder_text("Port (İsteğe bağlı)")
        
        btn_add = Gtk.Button()
        btn_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        btn_box.pack_start(Gtk.Image.new_from_icon_name("list-add-symbolic", Gtk.IconSize.BUTTON), False, False, 0)
        btn_box.pack_start(Gtk.Label(label=_("fw_add_whitelist")), False, False, 0)
        btn_add.add(btn_box)
        btn_add.get_style_context().add_class("btn-primary")
        btn_add.connect("clicked", self.on_add_whitelist)
        
        wl_add_box.pack_start(self.ent_wl_ip, True, True, 0)
        wl_add_box.pack_start(self.ent_wl_port, False, False, 0)
        wl_add_box.pack_start(btn_add, False, False, 0)
        wl_card.pack_start(wl_add_box, False, False, 0)
        self.pack_start(wl_card, False, False, 0)
        
        # Whitelist Items
        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.wl_list = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        scroll.add(self.wl_list)
        self.pack_start(scroll, True, True, 0)

    def on_local_toggled(self, switch, gparam):
        active = switch.get_active()
        threading.Thread(target=self._do_toggle_local, args=(active,), daemon=True).start()

    def _do_toggle_local(self, active):
        try:
            fw_api.set_localhost_only(active)
            GLib.idle_add(self.toast_service.show, "Localhost modu güncellendi")
        except Exception as e:
            GLib.idle_add(self.toast_service.show, f"Error: {e}")

    def on_add_whitelist(self, button):
        ip = self.ent_wl_ip.get_text().strip()
        port = self.ent_wl_port.get_text().strip()
        if ip:
            threading.Thread(target=self._do_add_whitelist, args=(ip, port), daemon=True).start()
            
    def _do_add_whitelist(self, ip, port):
        try:
            fw_api.add_whitelist(ip, port)
            GLib.idle_add(self.ent_wl_ip.set_text, "")
            GLib.idle_add(self.ent_wl_port.set_text, "")
            GLib.idle_add(self.refresh_data)
        except Exception as e:
            GLib.idle_add(self.toast_service.show, f"Error: {e}")

    def refresh_data(self):
        threading.Thread(target=self._do_refresh, daemon=True).start()

    def _do_refresh(self):
        try:
            status = fw_api.get_local_status()
            wl = fw_api.get_whitelist()
            GLib.idle_add(self._update_ui, status, wl)
        except Exception:
            pass

    def _update_ui(self, status, wl):
        self.local_switch.handler_block_by_func(self.on_local_toggled)
        self.local_switch.set_active(status.get("localhost_only", False))
        self.local_switch.handler_unblock_by_func(self.on_local_toggled)
        
        for child in self.wl_list.get_children():
            self.wl_list.remove(child)
            
        if not wl:
            empty_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
            empty_box.get_style_context().add_class("terminal-container")
            lbl_empty = Gtk.Label(label="● Beyaz listede kayıtlı IP veya port bulunmuyor.")
            lbl_empty.get_style_context().add_class("terminal-empty")
            lbl_empty.set_halign(Gtk.Align.CENTER)
            empty_box.pack_start(lbl_empty, True, True, 20)
            self.wl_list.pack_start(empty_box, False, False, 0)
        else:
            for item in wl:
                row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
                row.get_style_context().add_class("card")
                lbl = Gtk.Label(label=f"İzinli IP: {item.get('ip', '')}  |  Port: {item.get('port', 'Tümü')}")
                lbl.set_halign(Gtk.Align.START)
                lbl.get_style_context().add_class("device-name")
                
                btn_rm = Gtk.Button()
                btn_rm.set_image(Gtk.Image.new_from_icon_name("edit-delete-symbolic", Gtk.IconSize.BUTTON))
                btn_rm.get_style_context().add_class("btn-danger")
                btn_rm.connect("clicked", self.on_rm_whitelist, item.get("id"))
                
                row.pack_start(lbl, True, True, 0)
                row.pack_end(btn_rm, False, False, 0)
                self.wl_list.pack_start(row, False, False, 0)
        self.wl_list.show_all()

    def on_rm_whitelist(self, button, wid):
        threading.Thread(target=self._do_rm_whitelist, args=(wid,), daemon=True).start()

    def _do_rm_whitelist(self, wid):
        try:
            fw_api.remove_whitelist(wid)
            GLib.idle_add(self.refresh_data)
        except Exception:
            pass


class ThreatsTab(Gtk.Box):
    def __init__(self, toast_service):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        self.toast_service = toast_service
        self.set_margin_start(32)
        self.set_margin_end(32)
        self.set_margin_top(4)
        self.set_margin_bottom(24)
        
        # 1. Summary Card
        summary = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        summary.get_style_context().add_class("card")
        
        warn_icon = Gtk.Image.new_from_icon_name("dialog-warning-symbolic", Gtk.IconSize.DND)
        summary.pack_start(warn_icon, False, False, 0)
        
        vbox_summary = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        lbl_fail = Gtk.Label(label=_("fw_failed_logins"))
        lbl_fail.set_halign(Gtk.Align.START)
        lbl_fail.get_style_context().add_class("device-name")
        self.lbl_fail_total = Gtk.Label(label=f"{_('fw_total')}: 0 | {_('fw_last_24h')}: 0")
        self.lbl_fail_total.set_halign(Gtk.Align.START)
        self.lbl_fail_total.get_style_context().add_class("device-mac")
        
        vbox_summary.pack_start(lbl_fail, False, False, 0)
        vbox_summary.pack_start(self.lbl_fail_total, False, False, 0)
        summary.pack_start(vbox_summary, True, True, 0)
        self.pack_start(summary, False, False, 0)
        
        # 2. Top Attackers Section
        lbl_top = Gtk.Label(label=_("fw_top_ips"))
        lbl_top.set_halign(Gtk.Align.START)
        lbl_top.get_style_context().add_class("header-sub")
        lbl_top.set_margin_top(4)
        self.pack_start(lbl_top, False, False, 0)
        
        self.top_ips_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        self.pack_start(self.top_ips_box, False, False, 0)
        
        # 3. Full Log (Termius Developer Console)
        terminal_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        terminal_box.get_style_context().add_class("terminal-container")
        
        term_top = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        t_icon = Gtk.Image.new_from_icon_name("utilities-terminal-symbolic", Gtk.IconSize.MENU)
        lbl_log = Gtk.Label(label=_("fw_threat_log").upper())
        lbl_log.get_style_context().add_class("terminal-header")
        t_badge = Gtk.Label(label="SSH & AUTH")
        t_badge.get_style_context().add_class("terminal-status-badge")
        
        btn_refresh = Gtk.Button()
        btn_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        btn_box.pack_start(Gtk.Image.new_from_icon_name("view-refresh-symbolic", Gtk.IconSize.MENU), False, False, 0)
        btn_box.pack_start(Gtk.Label(label=_("fw_refresh")), False, False, 0)
        btn_refresh.add(btn_box)
        btn_refresh.get_style_context().add_class("btn-secondary")
        btn_refresh.connect("clicked", lambda x: self.refresh_log())
        
        term_top.pack_start(t_icon, False, False, 0)
        term_top.pack_start(lbl_log, False, False, 0)
        term_top.pack_start(t_badge, False, False, 4)
        term_top.pack_end(btn_refresh, False, False, 0)
        terminal_box.pack_start(term_top, False, False, 0)
        
        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        self.textview = Gtk.TextView()
        self.textview.set_editable(False)
        self.textview.set_cursor_visible(False)
        self.textview.set_left_margin(12)
        self.textview.set_top_margin(10)
        self.textview.set_bottom_margin(10)
        self.textview.get_style_context().add_class("log-view")
        scroll.add(self.textview)
        terminal_box.pack_start(scroll, True, True, 4)
        
        self.pack_start(terminal_box, True, True, 0)

    def refresh_log(self):
        threading.Thread(target=self._do_refresh_log, daemon=True).start()

    def _do_refresh_log(self):
        try:
            threats = fw_api.get_threat_summary()
            logs = fw_api.get_threat_logs()
            GLib.idle_add(self._update_ui, threats, logs)
        except Exception:
            pass

    def _update_ui(self, threats, logs):
        total = threats.get("total_failed_logins", 0)
        last_24 = threats.get("failed_logins_24h", 0)
        self.lbl_fail_total.set_text(f"{_('fw_total')}: {total} | {_('fw_last_24h')}: {last_24}")
        
        for child in self.top_ips_box.get_children():
            self.top_ips_box.remove(child)
            
        top_ips = threats.get("top_attacking_ips", [])
        if not top_ips:
            lbl_none = Gtk.Label(label="● Kayıtlı saldırgan IP tespit edilmedi.")
            lbl_none.get_style_context().add_class("device-mac")
            lbl_none.set_halign(Gtk.Align.START)
            self.top_ips_box.pack_start(lbl_none, False, False, 4)
        else:
            for ip_info in top_ips:
                row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
                row.get_style_context().add_class("card")
                lbl = Gtk.Label(label=f"IP: {ip_info.get('ip')}  |  Deneme: {ip_info.get('count')}")
                lbl.set_halign(Gtk.Align.START)
                lbl.get_style_context().add_class("device-name")
                row.pack_start(lbl, True, True, 0)
                
                btn_block = Gtk.Button(label="IP'yi Engelle")
                btn_block.get_style_context().add_class("btn-danger")
                btn_block.connect("clicked", self.on_block_ip, ip_info.get("ip"))
                row.pack_end(btn_block, False, False, 0)
                self.top_ips_box.pack_start(row, False, False, 0)
                
        self.top_ips_box.show_all()
        
        buf = self.textview.get_buffer()
        buf.set_text(logs if logs else "Henüz güvenlik günlüğü kaydı bulunamadı.")

    def on_block_ip(self, button, ip):
        rule = {"direction": "input", "protocol": "both", "port": "", "ip": ip, "action": "drop"}
        threading.Thread(target=self._do_block_ip, args=(rule,), daemon=True).start()

    def _do_block_ip(self, rule):
        try:
            fw_api.add_rule(rule)
            GLib.idle_add(self.toast_service.show, "IP başarıyla engellendi")
        except Exception as e:
            GLib.idle_add(self.toast_service.show, f"Error: {e}")

