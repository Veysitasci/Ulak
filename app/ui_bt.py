import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, GLib, Pango
import subprocess

from i18n import _
from api_bt import bt_api
from ui_shared import storage, DeviceDetailsDialog

class BluetoothView(Gtk.Box):
    def _show_bt_details_window(self, dev_data):
        name = dev_data.get("name", "Bilinmeyen Cihaz")
        dialog = DeviceDetailsDialog(title=f"Bluetooth - {name}", parent=self.get_toplevel(), icon_name=dev_data.get("icon_name", "bluetooth-symbolic"), default_width=470, default_height=560)
        
        addr = dev_data.get("address", "Bilinmiyor")
        rssi = str(dev_data.get("rssi", "--")) + " dBm"
        bat = f"%{dev_data.get('battery')}" if dev_data.get("battery", -1) != -1 else "Desteklenmiyor"
        paired = "Evet (Eşleşti)" if dev_data.get("paired") else "Hayır"
        trusted = "Evet (Güvenilir)" if dev_data.get("trusted") else "Hayır"
        blocked = "Evet (Engellendi)" if dev_data.get("blocked") else "Hayır"
        dev_type = dev_data.get("type_name", "Bilinmeyen Tip")

        dialog.set_header_info(
            icon_name=dev_data.get("icon_name", "bluetooth-symbolic"),
            title=name,
            subtitle=f"{addr} • {dev_type}",
            status_active=dev_data.get("connected", False)
        )

        items = [
            ("Aygıt Tanımı", name, "bluetooth-symbolic"),
            ("MAC Donanım Adresi", addr, "network-wired-symbolic"),
            ("Aygıt Sınıfı / Profil", dev_type, "preferences-system-symbolic"),
            ("Sinyal Gücü (RSSI)", rssi, "network-wireless-signal-excellent-symbolic"),
            ("Pil / Batarya Düzeyi", bat, "battery-good-symbolic"),
            ("Eşleşme Kaydı", paired, "changes-prevent-symbolic"),
            ("Otomatik Güvenilirlik", trusted, "security-high-symbolic"),
            ("Erişim Engeli", blocked, "dialog-warning-symbolic"),
            ("D-Bus Bağlantı Yolu", str(dev_data.get("path", "-")), "computer-symbolic"),
        ]
        
        if dev_data.get("connected"):
            try:
                mac_str = addr.replace(":", "_")
                audio_sink = subprocess.getoutput(f"pactl list sinks short | grep {mac_str}").strip()
                if audio_sink:
                    items.append(("Ses Çıkışı", "Aktif Pulse/PipeWire", "audio-speakers-symbolic"))
            except: pass
            
        dialog.set_items_list(items)
        dialog.show_all()
        dialog.run()
        dialog.destroy()

    def __init__(self, toast_service):
        super().__init__(orientation=Gtk.Orientation.VERTICAL)
        self.toast_service = toast_service
        self.active_filter = "all"
        self.search_query = ""
        self.session_startup_logged = set()
        
        self._build_ui()
        self._refresh_loop()

    def _build_ui(self):
        header = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        header.get_style_context().add_class("header")
        
        row1 = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        
        title_stack = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        lbl_title = Gtk.Label(label=_("bt_title"))
        lbl_title.get_style_context().add_class("header-title")
        lbl_title.set_halign(Gtk.Align.START)
        title_stack.pack_start(lbl_title, False, False, 0)
        
        lbl_sub = Gtk.Label(label=_("bt_subtitle"))
        lbl_sub.get_style_context().add_class("header-sub")
        lbl_sub.set_halign(Gtk.Align.START)
        title_stack.pack_start(lbl_sub, False, False, 0)
        row1.pack_start(title_stack, True, True, 0)
        
        scan_btn = Gtk.Button()
        scan_btn.set_image(Gtk.Image.new_from_icon_name("view-refresh-symbolic", Gtk.IconSize.BUTTON))
        scan_btn.get_style_context().add_class("btn-secondary")
        scan_btn.connect("clicked", self._on_scan_clicked)
        row1.pack_end(scan_btn, False, False, 0)

        self.power_switch = Gtk.Switch()
        self.power_switch.set_active(bt_api.is_powered())
        self.power_switch.set_valign(Gtk.Align.CENTER)
        self.power_switch.connect("notify::active", self._on_power_toggled)
        row1.pack_end(self.power_switch, False, False, 12)
        
        header.pack_start(row1, False, False, 0)

        search_entry = Gtk.SearchEntry()
        search_entry.set_placeholder_text(_("search_hint"))
        search_entry.set_margin_top(12)
        search_entry.connect("search-changed", self._on_search_changed)
        header.pack_start(search_entry, False, False, 0)
        
        filter_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        filter_box.set_margin_top(12)
        filters = [
            ("all", _("filter_all")),
            ("audio", _("filter_audio")),
            ("input", _("filter_input")),
            ("game", _("filter_game")),
            ("wearable", _("filter_wearable")),
            ("iot", _("filter_iot")),
            ("media", _("filter_media"))
        ]
        self.filter_buttons = {}
        for f_id, f_label in filters:
            btn = Gtk.RadioButton.new_with_label_from_widget(None if not self.filter_buttons else next(iter(self.filter_buttons.values())), f_label)
            btn.set_mode(False)
            btn.get_style_context().add_class("filter-chip")
            btn.connect("toggled", self._on_filter_clicked, f_id)
            filter_box.pack_start(btn, False, False, 0)
            self.filter_buttons[f_id] = btn
        header.pack_start(filter_box, False, False, 0)
        
        self.pack_start(header, False, False, 0)

        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        scroll.set_margin_start(32)
        scroll.set_margin_end(32)
        scroll.set_margin_top(12)
        scroll.set_margin_bottom(20)
        self.pack_start(scroll, True, True, 0)
        
        self.list_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        scroll.add(self.list_box)
        self.show_all()

    def _on_filter_clicked(self, btn, f_id):
        if btn.get_active():
            self.active_filter = f_id
            self._refresh_ui()

    def _on_search_changed(self, entry):
        self.search_query = entry.get_text().lower()
        self._refresh_ui()

    def _on_power_toggled(self, switch, pspec):
        bt_api.set_powered(switch.get_active())
        self._refresh_ui()

    def _on_scan_clicked(self, btn):
        self.toast_service.show(_("scanning"))
        bt_api.start_discovery()
        # Add scanning animation class
        btn.get_style_context().add_class("scanning")
        GLib.timeout_add_seconds(3, lambda: btn.get_style_context().remove_class("scanning") or False)

    def _on_send_file(self, btn, address):
        try:
            subprocess.Popen(["bluetooth-sendto", f"--device={address}"])
        except Exception as e:
            self.toast_service.show(f"File transfer err: {e}")

    def _on_switch_profile(self, btn, address, profile):
        try:
            # Requires pulse/pipewire
            mac_str = address.replace(":", "_")
            sink_name = f"bluez_card.{mac_str}"
            subprocess.run(["pactl", "set-card-profile", sink_name, profile])
            self.toast_service.show(f"Profile switched to {profile.upper()}")
        except Exception as e:
            self.toast_service.show(f"Profile switch err: {e}")

    def _refresh_loop(self):
        self._refresh_ui()
        GLib.timeout_add_seconds(5, self._refresh_loop)

    def _refresh_ui(self):
        devices = bt_api.get_devices(lambda k: _(k))
        
        if self.active_filter != "all":
            devices = [d for d in devices if self.active_filter in d["type_name"].lower() or self.active_filter in d["icon_name"].lower()]
        if self.search_query:
            devices = [d for d in devices if self.search_query in d["name"].lower()]

        devices.sort(key=lambda d: not d["connected"])

        for child in self.list_box.get_children(): self.list_box.remove(child)

        for i, d in enumerate(devices):
            ev_card = Gtk.EventBox()
            ev_card.set_visible_window(False)
            ev_card.set_tooltip_text("Cihaz detayları ve özellikleri için sağ tıklayın")
            
            def make_bt_right_click(dev_dict):
                def _on_card_press(w, event):
                    if event.button == 3: # Right click
                        self._show_bt_details_window(dev_dict)
                        return True
                    return False
                return _on_card_press
                
            ev_card.connect("button-press-event", make_bt_right_click(d))

            card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
            card.get_style_context().add_class("card")
            card.get_style_context().add_class("fade-in")
            card.set_margin_bottom(5)
            
            # Left Icon
            icon_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=5)
            icon_box.set_valign(Gtk.Align.CENTER)
            icon = Gtk.Image.new_from_icon_name(d["icon_name"], Gtk.IconSize.DND)
            icon_box.pack_start(icon, False, False, 0)
            
            # Phase 2 Feature: Battery % & RSSI DBm
            if d.get("battery", -1) != -1:
                bat_lbl = Gtk.Label(label=f" {d['battery']}%")
                bat_lbl.get_style_context().add_class("battery-text")
                icon_box.pack_start(bat_lbl, False, False, 0)
            
            card.pack_start(icon_box, False, False, 0)
            
            # Info
            info = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
            info.set_hexpand(True)
            
            name_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
            name_lbl = Gtk.Label(label=d["name"])
            name_lbl.get_style_context().add_class("device-name")
            name_lbl.set_halign(Gtk.Align.START)
            name_lbl.set_ellipsize(Pango.EllipsizeMode.END)
            name_lbl.set_max_width_chars(25)
            name_row.pack_start(name_lbl, False, False, 0)

            if d.get("paired", False):
                sec_icon = Gtk.Image.new_from_icon_name("changes-prevent-symbolic", Gtk.IconSize.MENU)
                sec_icon.set_tooltip_text("Paired & Secured")
                name_row.pack_start(sec_icon, False, False, 0)

            info.pack_start(name_row, False, False, 0)
            
            mac_txt = d["address"]
            if d.get("rssi", -100) != -100:
                mac_txt += f"  (RSSI: {d['rssi']} dBm)"
            mac_lbl = Gtk.Label(label=mac_txt)
            mac_lbl.get_style_context().add_class("device-mac")
            mac_lbl.set_halign(Gtk.Align.START)
            info.pack_start(mac_lbl, False, False, 0)
            card.pack_start(info, True, True, 0)

            # Operations / Actions
            ops_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=5)
            ops_box.set_valign(Gtk.Align.CENTER)
            
            # Trust Toggle (Phase 2)
            trust_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=5)
            trust_lbl = Gtk.Label(label=_("auto_connect"))
            trust_lbl.get_style_context().add_class("device-mac")
            trust_box.pack_start(trust_lbl, False, False, 0)
            trust_sw = Gtk.Switch()
            trust_sw.set_active(d.get("trusted", False))
            trust_sw.connect("notify::active", lambda sw, pspec, path=d["path"]: bt_api.trust_device(path, sw.get_active()))
            trust_box.pack_start(trust_sw, False, False, 0)
            ops_box.pack_start(trust_box, False, False, 0)
            
            actions = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
            if d["connected"]:
                status_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
                status_box.get_style_context().add_class("status-tag")
                status_box.get_style_context().add_class("status-connected")
                status_box.get_style_context().add_class("pulse")
                
                dot = Gtk.Label(label="●")
                dot.get_style_context().add_class("status-dot")
                dot.get_style_context().add_class("active")
                status_box.pack_start(dot, False, False, 0)
                
                lbl = Gtk.Label(label=_("connected"))
                status_box.pack_start(lbl, False, False, 0)
                actions.pack_start(status_box, False, False, 0)

                # Send File (Phase 2)
                send_btn = Gtk.Button()
                send_btn.set_image(Gtk.Image.new_from_icon_name("document-send-symbolic", Gtk.IconSize.BUTTON))
                send_btn.get_style_context().add_class("btn-secondary")
                send_btn.connect("clicked", self._on_send_file, d["address"])
                actions.pack_start(send_btn, False, False, 0)
                
                # Audio profiles (Phase 2)
                if "audio" in d["type_name"].lower() or "audio" in d["icon_name"]:
                    a2dp_btn = Gtk.Button(label="HQ")
                    a2dp_btn.get_style_context().add_class("btn-secondary")
                    a2dp_btn.connect("clicked", self._on_switch_profile, d["address"], "a2dp_sink")
                    
                    hsp_btn = Gtk.Button(label="Mic")
                    hsp_btn.get_style_context().add_class("btn-secondary")
                    hsp_btn.connect("clicked", self._on_switch_profile, d["address"], "headset_head_unit")
                    
                    actions.pack_start(a2dp_btn, False, False, 0)
                    actions.pack_start(hsp_btn, False, False, 0)

                disconnect_btn = Gtk.Button(label=_("disconnect"))
                disconnect_btn.get_style_context().add_class("btn-secondary")
                disconnect_btn.connect("clicked", lambda btn, path=d["path"]: bt_api.disconnect_device(path) or self.toast_service.show(_("disconnecting")))
                actions.pack_start(disconnect_btn, False, False, 0)
                
                if d["address"] not in self.session_startup_logged:
                    storage.add_log("bt", d["address"], "Connected")
                    self.session_startup_logged.add(d["address"])

            else:
                connect_btn = Gtk.Button(label=_("connect"))
                connect_btn.get_style_context().add_class("btn-primary")
                connect_btn.connect("clicked", lambda btn, path=d["path"]: bt_api.connect_device(path) or self.toast_service.show(_("connecting")))
                actions.pack_start(connect_btn, False, False, 0)

            ops_box.pack_start(actions, False, False, 0)
            card.pack_start(ops_box, False, False, 0)
            ev_card.add(card)
            self.list_box.pack_start(ev_card, False, False, 0)
            
        self.list_box.show_all()
