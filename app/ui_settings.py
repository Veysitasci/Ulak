#!/usr/bin/env python3
import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, Gdk, GLib, GObject
import os
import json
from pathlib import Path

from i18n import _, i18n_instance
from theme import theme_mgr, THEMES
from ui_shared import storage

class SettingsView(Gtk.Box):
    def __init__(self, toast_service):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.toast_service = toast_service
        self._build_ui()
        self._load_settings()
        
    def _build_ui(self):
        # Header
        header = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        header.get_style_context().add_class("header")
        header.set_spacing(8)
        
        title = Gtk.Label(label=_("settings_title"))
        title.get_style_context().add_class("header-title")
        title.set_halign(Gtk.Align.START)
        
        subtitle = Gtk.Label(label=_("settings_subtitle"))
        subtitle.get_style_context().add_class("header-sub")
        subtitle.set_halign(Gtk.Align.START)
        
        header.pack_start(title, False, False, 0)
        header.pack_start(subtitle, False, False, 0)
        self.pack_start(header, False, False, 0)
        
        # Scrollable content
        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        
        self.content_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        self.content_box.set_margin_top(16)
        self.content_box.set_margin_start(32)
        self.content_box.set_margin_end(32)
        self.content_box.set_margin_bottom(24)
        
        # === SECTION 1: General ===
        self._add_section_title(_("settings_general"))
        
        # Language
        lang_card = self._create_card()
        lang_row = self._create_setting_row(
            _("settings_language"),
            _("settings_language_desc"),
            "preferences-desktop-locale-symbolic"
        )
        self.lang_combo = Gtk.ComboBoxText()
        self.lang_combo.append("tr", "Türkçe")
        self.lang_combo.append("en", "English")
        self.lang_combo.connect("changed", self._on_language_changed)
        lang_row.pack_end(self.lang_combo, False, False, 0)
        lang_card.pack_start(lang_row, False, False, 0)
        self.content_box.pack_start(lang_card, False, False, 0)

        # Theme Mode (Koyu / Açık / Sistem Bento Selector)
        theme_card = self._create_card()
        theme_inner = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        theme_inner.set_margin_start(16)
        theme_inner.set_margin_end(16)
        theme_inner.set_margin_top(14)
        theme_inner.set_margin_bottom(14)

        theme_head = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        th_icon = Gtk.Image.new_from_icon_name("preferences-color-symbolic", Gtk.IconSize.LARGE_TOOLBAR)
        th_icon.set_pixel_size(24)
        th_icon.get_style_context().add_class("setting-icon")
        theme_head.pack_start(th_icon, False, False, 0)

        th_text_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        th_title = Gtk.Label(label="Görünüm Teması")
        th_title.get_style_context().add_class("setting-title")
        th_title.set_halign(Gtk.Align.START)
        th_sub = Gtk.Label(label="Koyu, Açık veya sistem temasına göre otomatik uyum sağla")
        th_sub.get_style_context().add_class("setting-subtitle")
        th_sub.set_halign(Gtk.Align.START)
        th_text_box.pack_start(th_title, False, False, 0)
        th_text_box.pack_start(th_sub, False, False, 0)
        theme_head.pack_start(th_text_box, True, True, 0)
        theme_inner.pack_start(theme_head, False, False, 0)

        self.theme_options = {}
        options_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        options_box.set_homogeneous(True)
        options_box.set_margin_top(6)

        modes = [
            ("dark", "Koyu", "Siyah & beyaz kontrast", "weather-clear-night-symbolic"),
            ("light", "Açık", "Aydınlık gri & beyaz zemin", "weather-clear-symbolic"),
            ("auto", "Sistem", "İşletim sistemine göre uyar", "preferences-desktop-display-symbolic")
        ]

        for mode_key, mode_title, mode_desc, mode_icon in modes:
            opt_btn = Gtk.Button()
            opt_btn.get_style_context().add_class("theme-mode-option")

            b_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
            b_box.set_halign(Gtk.Align.CENTER)

            top_h = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
            top_h.set_halign(Gtk.Align.CENTER)

            ic = Gtk.Image.new_from_icon_name(mode_icon, Gtk.IconSize.BUTTON)
            ic.set_pixel_size(18)
            t_lbl = Gtk.Label(label=mode_title)
            t_lbl.get_style_context().add_class("theme-mode-title")
            top_h.pack_start(ic, False, False, 0)
            top_h.pack_start(t_lbl, False, False, 0)

            d_lbl = Gtk.Label(label=mode_desc)
            d_lbl.get_style_context().add_class("theme-mode-desc")
            d_lbl.set_halign(Gtk.Align.CENTER)

            b_box.pack_start(top_h, False, False, 0)
            b_box.pack_start(d_lbl, False, False, 0)
            opt_btn.add(b_box)

            opt_btn.connect("clicked", lambda b, mk=mode_key: self._set_theme_mode(mk))
            options_box.pack_start(opt_btn, True, True, 0)
            self.theme_options[mode_key] = opt_btn

        theme_inner.pack_start(options_box, False, False, 0)
        theme_card.pack_start(theme_inner, False, False, 0)
        self.content_box.pack_start(theme_card, False, False, 0)

        # Auto Start
        autostart_card = self._create_card()
        autostart_row = self._create_setting_row(
            _("settings_autostart"),
            _("settings_autostart_desc"),
            "system-run-symbolic"
        )
        self.autostart_switch = Gtk.Switch()
        self.autostart_switch.connect("notify::active", self._on_autostart_toggled)
        autostart_row.pack_end(self.autostart_switch, False, False, 0)
        autostart_card.pack_start(autostart_row, False, False, 0)
        self.content_box.pack_start(autostart_card, False, False, 0)
        
        # Minimize to Tray
        tray_card = self._create_card()
        tray_row = self._create_setting_row(
            _("settings_tray"),
            _("settings_tray_desc"),
            "view-paged-symbolic"
        )
        self.tray_switch = Gtk.Switch()
        self.tray_switch.connect("notify::active", self._on_tray_toggled)
        tray_row.pack_end(self.tray_switch, False, False, 0)
        tray_card.pack_start(tray_row, False, False, 0)
        self.content_box.pack_start(tray_card, False, False, 0)
        
        # === SECTION 2: Notifications ===
        self._add_section_title(_("settings_notifications"))
        
        # Master Notification Toggle
        notif_master_card = self._create_card()
        notif_master_row = self._create_setting_row(
            _("settings_notifications_master"),
            _("settings_notifications_master_desc"),
            "preferences-system-notifications-symbolic"
        )
        self.notif_master_switch = Gtk.Switch()
        self.notif_master_switch.connect("notify::active", self._on_notif_master_toggled)
        notif_master_row.pack_end(self.notif_master_switch, False, False, 0)
        notif_master_card.pack_start(notif_master_row, False, False, 0)
        self.content_box.pack_start(notif_master_card, False, False, 0)
        
        # BT Notifications
        bt_notif_card = self._create_card()
        bt_notif_row = self._create_setting_row(
            _("settings_bt_notifications"),
            _("settings_bt_notifications_desc"),
            "bluetooth-symbolic"
        )
        self.bt_notif_switch = Gtk.Switch()
        bt_notif_row.pack_end(self.bt_notif_switch, False, False, 0)
        bt_notif_card.pack_start(bt_notif_row, False, False, 0)
        self.content_box.pack_start(bt_notif_card, False, False, 0)
        
        # WiFi Notifications  
        wifi_notif_card = self._create_card()
        wifi_notif_row = self._create_setting_row(
            _("settings_wifi_notifications"),
            _("settings_wifi_notifications_desc"),
            "network-wireless-symbolic"
        )
        self.wifi_notif_switch = Gtk.Switch()
        wifi_notif_row.pack_end(self.wifi_notif_switch, False, False, 0)
        wifi_notif_card.pack_start(wifi_notif_row, False, False, 0)
        self.content_box.pack_start(wifi_notif_card, False, False, 0)
        
        # Sound Effects
        sound_card = self._create_card()
        sound_row = self._create_setting_row(
            _("settings_sound_effects"),
            _("settings_sound_effects_desc"),
            "audio-volume-high-symbolic"
        )
        self.sound_switch = Gtk.Switch()
        self.sound_switch.connect("notify::active", self._on_sound_toggled)
        sound_row.pack_end(self.sound_switch, False, False, 0)
        sound_card.pack_start(sound_row, False, False, 0)
        self.content_box.pack_start(sound_card, False, False, 0)
        
        # === SECTION 3: Scanning ===
        self._add_section_title(_("settings_scanning"))
        
        # Auto Scan
        autoscan_card = self._create_card()
        autoscan_row = self._create_setting_row(
            _("settings_auto_scan"),
            _("settings_auto_scan_desc"),
            "view-refresh-symbolic"
        )
        self.autoscan_switch = Gtk.Switch()
        self.autoscan_switch.connect("notify::active", self._on_autoscan_toggled)
        autoscan_row.pack_end(self.autoscan_switch, False, False, 0)
        autoscan_card.pack_start(autoscan_row, False, False, 0)
        self.content_box.pack_start(autoscan_card, False, False, 0)
        
        # Scan Interval
        interval_card = self._create_card()
        interval_row = self._create_setting_row(
            _("settings_scan_interval"),
            _("settings_scan_interval_desc"),
            "alarm-symbolic"
        )
        self.interval_spin = Gtk.SpinButton.new_with_range(5, 300, 5)
        self.interval_spin.set_value(30)
        self.interval_spin.set_numeric(True)
        self.interval_spin.connect("value-changed", self._on_interval_changed)
        interval_row.pack_end(self.interval_spin, False, False, 0)
        interval_card.pack_start(interval_row, False, False, 0)
        self.content_box.pack_start(interval_card, False, False, 0)
        
        # === SECTION 4: Privacy & Power ===
        self._add_section_title(_("settings_privacy_power"))
        
        # Privacy Mode
        privacy_card = self._create_card()
        privacy_row = self._create_setting_row(
            _("settings_privacy_mode"),
            _("settings_privacy_mode_desc"),
            "security-high-symbolic"
        )
        self.privacy_switch = Gtk.Switch()
        self.privacy_switch.connect("notify::active", self._on_privacy_toggled)
        privacy_row.pack_end(self.privacy_switch, False, False, 0)
        privacy_card.pack_start(privacy_row, False, False, 0)
        self.content_box.pack_start(privacy_card, False, False, 0)
        
        # Power Saving Mode
        power_card = self._create_card()
        power_row = self._create_setting_row(
            _("settings_power_save"),
            _("settings_power_save_desc"),
            "battery-good-symbolic"
        )
        self.power_switch = Gtk.Switch()
        self.power_switch.connect("notify::active", self._on_power_toggled)
        power_row.pack_end(self.power_switch, False, False, 0)
        power_card.pack_start(power_row, False, False, 0)
        self.content_box.pack_start(power_card, False, False, 0)
        
        # Data Usage Tracking
        data_card = self._create_card()
        data_row = self._create_setting_row(
            _("settings_data_usage"),
            _("settings_data_usage_desc"),
            "network-transmit-receive-symbolic"
        )
        self.data_switch = Gtk.Switch()
        self.data_switch.connect("notify::active", self._on_data_toggled)
        data_row.pack_end(self.data_switch, False, False, 0)
        data_card.pack_start(data_row, False, False, 0)
        self.content_box.pack_start(data_card, False, False, 0)
        
        # === SECTION 5: Advanced ===
        self._add_section_title(_("settings_advanced"))
        
        # Debug Mode
        debug_card = self._create_card()
        debug_row = self._create_setting_row(
            _("settings_debug_mode"),
            _("settings_debug_mode_desc"),
            "applications-engineering-symbolic"
        )
        self.debug_switch = Gtk.Switch()
        self.debug_switch.connect("notify::active", self._on_debug_toggled)
        debug_row.pack_end(self.debug_switch, False, False, 0)
        debug_card.pack_start(debug_row, False, False, 0)
        self.content_box.pack_start(debug_card, False, False, 0)
        
        # Backup Settings
        backup_card = self._create_card()
        backup_row = self._create_setting_row(
            _("settings_backup"),
            _("settings_backup_desc"),
            "document-save-symbolic"
        )
        backup_btn = Gtk.Button(label=_("btn_backup"))
        backup_btn.get_style_context().add_class("btn-secondary")
        backup_btn.connect("clicked", self._on_backup_clicked)
        backup_row.pack_end(backup_btn, False, False, 0)
        backup_card.pack_start(backup_row, False, False, 0)
        self.content_box.pack_start(backup_card, False, False, 0)
        
        # Restore Settings
        restore_card = self._create_card()
        restore_row = self._create_setting_row(
            _("settings_restore"),
            _("settings_restore_desc"),
            "document-open-symbolic"
        )
        restore_btn = Gtk.Button(label=_("btn_restore"))
        restore_btn.get_style_context().add_class("btn-secondary")
        restore_btn.connect("clicked", self._on_restore_clicked)
        restore_row.pack_end(restore_btn, False, False, 0)
        restore_card.pack_start(restore_row, False, False, 0)
        self.content_box.pack_start(restore_card, False, False, 0)
        
        # Reset to Defaults
        reset_card = self._create_card()
        reset_row = self._create_setting_row(
            _("settings_reset"),
            _("settings_reset_desc"),
            "edit-delete-symbolic"
        )
        reset_btn = Gtk.Button(label=_("btn_reset"))
        reset_btn.get_style_context().add_class("btn-danger")
        reset_btn.connect("clicked", self._on_reset_clicked)
        reset_row.pack_end(reset_btn, False, False, 0)
        reset_card.pack_start(reset_row, False, False, 0)
        self.content_box.pack_start(reset_card, False, False, 0)
        
        scroll.add(self.content_box)
        self.pack_start(scroll, True, True, 0)
        
    def _add_section_title(self, title):
        lbl = Gtk.Label(label=title)
        lbl.get_style_context().add_class("section-title")
        lbl.set_halign(Gtk.Align.START)
        lbl.set_margin_top(10)
        self.content_box.pack_start(lbl, False, False, 0)
        
    def _create_card(self):
        card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        card.get_style_context().add_class("settings-card")
        return card
        
    def _create_setting_row(self, title, subtitle, icon_name):
        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        row.set_margin_start(16)
        row.set_margin_end(16)
        row.set_margin_top(12)
        row.set_margin_bottom(12)
        
        # Icon (Monochrome)
        icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.LARGE_TOOLBAR)
        icon.set_pixel_size(24)
        icon.get_style_context().add_class("setting-icon")
        row.pack_start(icon, False, False, 0)
        
        # Text container
        text_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        title_lbl = Gtk.Label(label=title)
        title_lbl.get_style_context().add_class("setting-title")
        title_lbl.set_halign(Gtk.Align.START)
        
        sub_lbl = Gtk.Label(label=subtitle)
        sub_lbl.get_style_context().add_class("setting-subtitle")
        sub_lbl.set_halign(Gtk.Align.START)
        sub_lbl.set_line_wrap(True)
        sub_lbl.set_max_width_chars(40)
        
        text_box.pack_start(title_lbl, False, False, 0)
        text_box.pack_start(sub_lbl, False, False, 0)
        row.pack_start(text_box, True, True, 0)
        
        return row
        
    def _set_theme_mode(self, mode_key):
        """Switch appearance mode (dark, light, auto)"""
        theme_mgr.apply_mode(mode_key)
        storage.set_global("theme_mode", mode_key)
        self._update_theme_mode_ui(mode_key)
        mode_names = {
            "dark": "Koyu Mod Aktif",
            "light": "Açık Mod Aktif",
            "auto": "Sistem (Otomatik) Mod Aktif"
        }
        self.toast_service.show(mode_names.get(mode_key, mode_key))

    def _update_theme_mode_ui(self, active_mode):
        if not hasattr(self, 'theme_options'):
            return
        for mk, btn in self.theme_options.items():
            if mk == active_mode:
                btn.get_style_context().add_class("active")
            else:
                btn.get_style_context().remove_class("active")
        
    def _load_settings(self):
        # Language
        current_lang = storage.get_global("language", "tr")
        self.lang_combo.set_active_id(current_lang)
        
        # Theme Mode
        current_theme_mode = storage.get_global("theme_mode", "dark")
        self._update_theme_mode_ui(current_theme_mode)

        # Other settings
        self.autostart_switch.set_active(storage.get_global("autostart", False))
        self.tray_switch.set_active(storage.get_global("minimize_tray", True))
        self.notif_master_switch.set_active(storage.get_global("notifications_enabled", True))
        self.bt_notif_switch.set_active(storage.get_global("bt_notifications", True))
        self.wifi_notif_switch.set_active(storage.get_global("wifi_notifications", True))
        self.sound_switch.set_active(storage.get_global("sound_effects", False))
        self.autoscan_switch.set_active(storage.get_global("auto_scan", True))
        self.interval_spin.set_value(storage.get_global("scan_interval", 30))
        self.privacy_switch.set_active(storage.get_global("privacy_mode", False))
        self.power_switch.set_active(storage.get_global("power_save", False))
        self.data_switch.set_active(storage.get_global("track_data_usage", True))
        self.debug_switch.set_active(storage.get_global("debug_mode", False))
        
    # --- Event Handlers ---

    def _on_theme_mode_changed(self, combo):
        mode = combo.get_active_id()
        if mode:
            theme_mgr.apply_mode(mode)
            storage.set_global("theme_mode", mode)
            names = {"dark": "Koyu Mod", "light": "Açık Mod", "auto": "Sistem (Otomatik) Mod"}
            self.toast_service.show(names.get(mode, mode))
    
    def _on_language_changed(self, combo):
        lang = combo.get_active_id()
        if lang:
            storage.set_global("language", lang)
            self.toast_service.show(_("msg_restart_for_language"))
            
    def _on_theme_toggled(self, switch, gparam):
        theme_mgr.toggle_mode()
        storage.set_global("light_mode", theme_mgr.is_light_mode)
        
    def _on_theme_selected_handler(self, theme_key):
        """Handler for theme selection from settings"""
        self._on_theme_selected(theme_key)
            
    def _on_autostart_toggled(self, switch, gparam):
        enabled = switch.get_active()
        storage.set_global("autostart", enabled)
        self._setup_autostart(enabled)
        self.toast_service.show(_("msg_autostart_enabled") if enabled else _("msg_autostart_disabled"))
        
    def _on_tray_toggled(self, switch, gparam):
        storage.set_global("minimize_tray", switch.get_active())
        
    def _on_notif_master_toggled(self, switch, gparam):
        enabled = switch.get_active()
        storage.set_global("notifications_enabled", enabled)
        self.bt_notif_switch.set_sensitive(enabled)
        self.wifi_notif_switch.set_sensitive(enabled)
        
    def _on_sound_toggled(self, switch, gparam):
        storage.set_global("sound_effects", switch.get_active())
        
    def _on_autoscan_toggled(self, switch, gparam):
        storage.set_global("auto_scan", switch.get_active())
        
    def _on_interval_changed(self, spin):
        storage.set_global("scan_interval", int(spin.get_value()))
        
    def _on_privacy_toggled(self, switch, gparam):
        enabled = switch.get_active()
        storage.set_global("privacy_mode", enabled)
        if enabled:
            self.toast_service.show(_("msg_privacy_enabled"))
            
    def _on_power_toggled(self, switch, gparam):
        enabled = switch.get_active()
        storage.set_global("power_save", enabled)
        self.toast_service.show(_("msg_power_save_on") if enabled else _("msg_power_save_off"))
        
    def _on_data_toggled(self, switch, gparam):
        storage.set_global("track_data_usage", switch.get_active())
        
    def _on_debug_toggled(self, switch, gparam):
        storage.set_global("debug_mode", switch.get_active())
        self.toast_service.show(_("msg_debug_on") if switch.get_active() else _("msg_debug_off"))
        
    def _on_backup_clicked(self, btn):
        dialog = Gtk.FileChooserDialog(
            title=_("dialog_backup_title"),
            parent=self.get_toplevel(),
            action=Gtk.FileChooserAction.SAVE
        )
        dialog.add_button(_("cancel"), Gtk.ResponseType.CANCEL)
        dialog.add_button(_("save"), Gtk.ResponseType.OK)
        
        # Default filename with timestamp
        from datetime import datetime
        default_name = f"dolunay_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        dialog.set_current_name(default_name)
        
        filter_json = Gtk.FileFilter()
        filter_json.set_name("JSON files")
        filter_json.add_pattern("*.json")
        dialog.add_filter(filter_json)
        
        response = dialog.run()
        if response == Gtk.ResponseType.OK:
            filepath = dialog.get_filename()
            try:
                data = storage.load()
                with open(filepath, 'w') as f:
                    json.dump(data, f, indent=2)
                self.toast_service.show(_("msg_backup_success"))
            except Exception as e:
                self.toast_service.show(_("msg_backup_failed"))
        dialog.destroy()
        
    def _on_restore_clicked(self, btn):
        dialog = Gtk.FileChooserDialog(
            title=_("dialog_restore_title"),
            parent=self.get_toplevel(),
            action=Gtk.FileChooserAction.OPEN
        )
        dialog.add_button(_("cancel"), Gtk.ResponseType.CANCEL)
        dialog.add_button(_("restore"), Gtk.ResponseType.OK)
        
        filter_json = Gtk.FileFilter()
        filter_json.set_name("JSON files")
        filter_json.add_pattern("*.json")
        dialog.add_filter(filter_json)
        
        response = dialog.run()
        if response == Gtk.ResponseType.OK:
            filepath = dialog.get_filename()
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                storage.save(data)
                self.toast_service.show(_("msg_restore_success"))
                self._load_settings()  # Reload UI
            except Exception as e:
                self.toast_service.show(_("msg_restore_failed"))
        dialog.destroy()
        
    def _on_reset_clicked(self, btn):
        dialog = Gtk.MessageDialog(
            transient_for=self.get_toplevel(),
            message_type=Gtk.MessageType.WARNING,
            buttons=Gtk.ButtonsType.YES_NO,
            text=_("confirm_reset_title")
        )
        dialog.format_secondary_text(_("confirm_reset_desc"))
        
        response = dialog.run()
        if response == Gtk.ResponseType.YES:
            # Reset all settings
            storage.save({"bt": {}, "wifi": {}, "global": {}})
            self._load_settings()
            self.toast_service.show(_("msg_reset_complete"))
        dialog.destroy()
        
    def _setup_autostart(self, enabled):
        autostart_dir = Path.home() / ".config" / "autostart"
        desktop_file = autostart_dir / "ulak.desktop"
        
        if enabled:
            autostart_dir.mkdir(parents=True, exist_ok=True)
            desktop_content = """[Desktop Entry]
Type=Application
Name=ULAK
Comment=Bluetooth, WiFi, Donanim ve Guvenlik Duvari Yoneticisi
Exec=/usr/bin/python3 {}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
""".format(Path(__file__).parent / "main.py")
            with open(desktop_file, 'w') as f:
                f.write(desktop_content)
        else:
            if desktop_file.exists():
                desktop_file.unlink()
            # Also clean up legacy file if present
            legacy = autostart_dir / "dolunay.desktop"
            if legacy.exists():
                legacy.unlink()
