import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, GLib, Pango
import time, subprocess, threading, urllib.request

from i18n import _
from api_wifi import wifi_api
from ui_shared import storage, BentoDialog

class WifiView(Gtk.Box):
    def _show_wifi_details_window(self, network_data):
        ssid = network_data.get("ssid", "Bilinmeyen Ağ")
        win = Gtk.Window(title=f"Ağ Özellikleri - {ssid}")
        win.set_default_size(480, 520)
        win.set_position(Gtk.WindowPosition.CENTER)
        win.set_modal(False)
        
        main_vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        main_vbox.set_margin_top(20)
        main_vbox.set_margin_bottom(20)
        main_vbox.set_margin_start(20)
        main_vbox.set_margin_end(20)
        win.add(main_vbox)

        # Header with network icon and name
        head = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        head.get_style_context().add_class("card")
        head.set_margin_bottom(4)
        
        ic = Gtk.Image.new_from_icon_name(network_data.get("icon_name", "network-wireless-symbolic"), Gtk.IconSize.DIALOG)
        ic.set_pixel_size(48)
        head.pack_start(ic, False, False, 10)
        
        htxt = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        htxt.set_valign(Gtk.Align.CENTER)
        title_lbl = Gtk.Label(label=ssid)
        title_lbl.get_style_context().add_class("title-label")
        title_lbl.set_halign(Gtk.Align.START)
        htxt.pack_start(title_lbl, False, False, 0)
        
        status_txt = "Bağlı (Aktif)" if network_data.get("active") else "Bağlı Değil"
        color = "#10b981" if network_data.get("active") else "#94a3b8"
        status_lbl = Gtk.Label()
        status_lbl.set_markup(f"<span foreground='{color}'>● {status_txt}</span>")
        status_lbl.set_halign(Gtk.Align.START)
        htxt.pack_start(status_lbl, False, False, 0)
        head.pack_start(htxt, True, True, 0)
        main_vbox.pack_start(head, False, False, 0)

        # Bento Details List
        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        scroll.set_vexpand(True)
        main_vbox.pack_start(scroll, True, True, 0)
        
        details_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        details_box.get_style_context().add_class("card")
        details_box.set_margin_top(6)
        details_box.set_margin_start(6)
        details_box.set_margin_end(6)
        details_box.set_margin_bottom(6)
        scroll.add(details_box)

        # Dynamic diagnostic queries for this SSID/BSSID
        bssid = network_data.get("bssid", "Bilinmiyor")
        channel = str(network_data.get("channel", "Bilinmiyor"))
        security = network_data.get("security", "Açık").upper()
        signal = str(network_data.get("signal", "--")) + " %"
        freq = "5 GHz" if int(network_data.get("channel", 1) or 1) > 14 else "2.4 GHz"
        
        # Extended details via nmcli if possible
        details = [
            ("SSID Adı", ssid),
            ("BSSID / MAC Adresi", bssid),
            ("Sinyal Kalitesi", signal),
            ("Güvenlik Türü", security),
            ("Kanal Numarası", channel),
            ("Frekans Bandı", freq),
            ("Kablosuz Arayüz", getattr(self, 'active_iface', 'wlan0')),
        ]
        
        if network_data.get("active"):
            try:
                ip_addr = subprocess.getoutput("hostname -I").split()[0] if subprocess.getoutput("hostname -I").strip() else ""
                if ip_addr: details.append(("Atanan Yerel IP", ip_addr))
                gw = subprocess.getoutput("ip route | grep default | awk '{print $3}'").strip()
                if gw: details.append(("Varsayılan Ağ Geçidi", gw))
                dns = subprocess.getoutput("grep -m1 'nameserver' /etc/resolv.conf | awk '{print $2}'").strip()
                if dns: details.append(("Aktif DNS Sunucusu", dns))
            except: pass

        for k, v in details:
            row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
            row.set_margin_top(8)
            row.set_margin_bottom(8)
            row.set_margin_start(12)
            row.set_margin_end(12)
            
            klbl = Gtk.Label(label=k)
            klbl.get_style_context().add_class("dim-label")
            klbl.set_halign(Gtk.Align.START)
            row.pack_start(klbl, False, False, 0)
            
            vlbl = Gtk.Label(label=v)
            vlbl.set_halign(Gtk.Align.END)
            vlbl.set_selectable(True)
            row.pack_end(vlbl, False, False, 0)
            details_box.pack_start(row, False, False, 0)

        # Bottom Close Button
        btn_close = Gtk.Button(label="Pencereyi Kapat")
        btn_close.get_style_context().add_class("btn-secondary")
        btn_close.connect("clicked", lambda b: win.destroy())
        main_vbox.pack_end(btn_close, False, False, 0)

        win.show_all()

    def __init__(self, toast_service):
        super().__init__(orientation=Gtk.Orientation.VERTICAL)
        self.toast_service = toast_service
        
        self.active_filter = "all"
        self.search_query = ""
        
        self.last_rx = 0
        self.last_tx = 0
        self.last_traffic_time = time.time()
        self.active_iface = self._get_active_iface()
        
        self._build_ui()
        self._refresh_loop()

    def _get_active_iface(self):
        try:
            with open('/proc/net/dev', 'r') as f:
                for line in f:
                    if 'wl' in line:
                        return line.split(':')[0].strip()
        except: pass
        return "wlan0"

    def _build_ui(self):
        header = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        header.get_style_context().add_class("header")
        
        row1 = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        
        title_stack = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        lbl_title = Gtk.Label(label=_("wifi_title"))
        lbl_title.get_style_context().add_class("header-title")
        lbl_title.set_halign(Gtk.Align.START)
        title_stack.pack_start(lbl_title, False, False, 0)
        
        lbl_sub = Gtk.Label(label=_("wifi_subtitle"))
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
        self.power_switch.set_active(wifi_api.is_powered())
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
            ("open", _("filter_open")),
            ("secure", _("filter_secure"))
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
        self.pack_start(scroll, True, True, 0)
        
        main_content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        main_content.set_margin_top(12)
        main_content.set_margin_bottom(16)
        main_content.set_margin_start(32)
        main_content.set_margin_end(32)
        scroll.add(main_content)
        
        # New Feature 4: Network Config Details
        self.net_details_lbl = Gtk.Label(label="Ağ Detayları Okunuyor...")
        self.net_details_lbl.set_halign(Gtk.Align.START)
        self.net_details_lbl.get_style_context().add_class("device-mac")
        
        net_card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=5)
        net_card.get_style_context().add_class("card")
        net_card.pack_start(self.net_details_lbl, False, False, 5)
        main_content.pack_start(net_card, False, False, 0)

        # Action Bar (Features 1, 2, 3, 5)
        action_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=5)
        
        btn_speed = Gtk.Button(label="Hız Testi")
        btn_speed.get_style_context().add_class("btn-secondary")
        btn_speed.connect("clicked", self._on_speed_test)
        action_row.pack_start(btn_speed, True, True, 0)
        
        btn_saved = Gtk.Button(label="Kayıtlı Şifreler")
        btn_saved.get_style_context().add_class("btn-secondary")
        btn_saved.connect("clicked", self._on_saved_passwords)
        action_row.pack_start(btn_saved, True, True, 0)
        
        btn_hotspot = Gtk.Button(label="M. Erişim (AP)")
        btn_hotspot.get_style_context().add_class("btn-secondary")
        btn_hotspot.connect("clicked", self._on_toggle_hotspot)
        action_row.pack_start(btn_hotspot, True, True, 0)
        
        btn_ports = Gtk.Button(label="Aktif Sockets")
        btn_ports.get_style_context().add_class("btn-secondary")
        btn_ports.connect("clicked", self._on_view_ports)
        action_row.pack_start(btn_ports, True, True, 0)

        btn_proxy = Gtk.Button(label="Proxy Ayarları")
        btn_proxy.get_style_context().add_class("btn-secondary")
        btn_proxy.connect("clicked", self._on_proxy_settings)
        action_row.pack_start(btn_proxy, True, True, 0)

        main_content.pack_start(action_row, False, False, 0)

        self.list_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        main_content.pack_start(self.list_box, True, True, 0)
        
        self.traffic_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        self.traffic_box.get_style_context().add_class("header")
        self.traffic_box.set_margin_top(0)
        
        self.ping_lbl = Gtk.Label(label=f"{_('wifi_ping')}: -- ms")
        self.ping_lbl.get_style_context().add_class("header-sub")
        self.ping_lbl.set_halign(Gtk.Align.START)
        self.traffic_box.pack_start(self.ping_lbl, False, False, 10)
        
        self.traffic_lbl = Gtk.Label(label="↓ 0.00 KB/s   ↑ 0.00 KB/s")
        self.traffic_lbl.get_style_context().add_class("header-sub")
        self.traffic_box.pack_end(self.traffic_lbl, False, False, 10)
        
        self.pack_end(self.traffic_box, False, False, 0)

        self.show_all()

    def _on_filter_clicked(self, btn, f_id):
        if btn.get_active():
            self.active_filter = f_id
            self._refresh_ui()

    def _on_search_changed(self, entry):
        self.search_query = entry.get_text().lower()
        self._refresh_ui()

    def _on_power_toggled(self, switch, pspec):
        wifi_api.set_powered(switch.get_active())
        self._refresh_ui()

    def _on_scan_clicked(self, btn):
        self.toast_service.show(_("scanning"))
        wifi_api.scan()
        # Add scanning animation class
        btn.get_style_context().add_class("scanning")
        GLib.timeout_add_seconds(3, lambda: btn.get_style_context().remove_class("scanning") or False)

    def _on_speed_test(self, btn):
        self.toast_service.show("İndirme Testi Başladı (10MB)... Bekleyiniz.")
        def run_test():
            try:
                start = time.time()
                # Dummy fast 10mb file test
                urllib.request.urlopen("http://speedtest.tele2.net/10MB.zip").read()
                end = time.time()
                speed_mbps = (10 * 8) / (end - start)
                GLib.idle_add(self.toast_service.show, f"İndirme Hızı: {speed_mbps:.2f} Mbps")
            except Exception as e:
                GLib.idle_add(self.toast_service.show, f"Hız Testi Başarısız: {e}")
        threading.Thread(target=run_test, daemon=True).start()

    def _on_saved_passwords(self, btn):
        dialog = BentoDialog(title="Kayıtlı Ağlar", parent=self.get_toplevel(), icon_name="network-wireless-symbolic", default_width=440, default_height=340)
        dialog.add_bento_action_button("Kapat", Gtk.ResponseType.OK, is_primary=True)
        content = dialog.get_bento_content()
        
        tv = Gtk.TextView()
        tv.get_style_context().add_class("log-view")
        tv.set_editable(False)
        try:
            # Note: without sudo, nmcli might not display passwords.
            out = subprocess.getoutput("nmcli -g NAME,TYPE connection show | grep wireless")
            if not out: out = "Kayıtlı ağ bulunamadı."
            tv.get_buffer().set_text(out)
        except Exception as e:
            tv.get_buffer().set_text(str(e))
            
        scroll = Gtk.ScrolledWindow()
        scroll.add(tv)
        content.pack_start(scroll, True, True, 0)
        dialog.show_all()
        dialog.run()
        dialog.destroy()

    def _on_toggle_hotspot(self, btn):
        # Quick toggle for hotspot using nmcli
        self.toast_service.show("Hotspot komutu gönderiliyor...")
        try:
            subprocess.Popen(["nmcli", "device", "wifi", "hotspot", "ifname", self.active_iface, "ssid", "ULAK_AP", "password", "A12345678"])
            self.toast_service.show("Hotspot Activating... SSID: ULAK_AP / Pass: A12345678")
        except Exception as e:
            self.toast_service.show(f"Hotspot Hata: {e}")

    def _on_view_ports(self, btn):
        dialog = BentoDialog(title="Açık Soketler", parent=self.get_toplevel(), icon_name="network-transmit-receive-symbolic", default_width=520, default_height=420)
        dialog.add_bento_action_button("Kapat", Gtk.ResponseType.OK, is_primary=True)
        content = dialog.get_bento_content()
        
        tv = Gtk.TextView()
        tv.get_style_context().add_class("log-view")
        tv.set_editable(False)
        try:
            out = subprocess.getoutput("ss -tulpn | head -n 30")
            tv.get_buffer().set_text(out)
        except Exception as e:
            tv.get_buffer().set_text(str(e))
            
        scroll = Gtk.ScrolledWindow()
        scroll.add(tv)
        content.pack_start(scroll, True, True, 0)
        dialog.show_all()
        dialog.run()
        dialog.destroy()

    def _on_proxy_settings(self, btn):
        dialog = BentoDialog(title="Sistem Proxy Ayarları", parent=self.get_toplevel(), icon_name="preferences-system-network-proxy-symbolic", default_width=460, default_height=530)
        dialog.add_bento_action_button("İptal", Gtk.ResponseType.CANCEL, is_primary=False)
        dialog.add_bento_action_button("Kaydet & Uygula", Gtk.ResponseType.OK, is_primary=True)
        
        box = dialog.get_bento_content()
        
        # Header Box
        head_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        h_icon = Gtk.Image.new_from_icon_name("preferences-system-network-proxy-symbolic", Gtk.IconSize.LARGE_TOOLBAR)
        h_icon.set_pixel_size(28)
        head_box.pack_start(h_icon, False, False, 0)
        
        h_text = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        h_title = Gtk.Label(label="Proxy Yapılandırması")
        h_title.get_style_context().add_class("device-name")
        h_title.set_halign(Gtk.Align.START)
        h_sub = Gtk.Label(label="Sistem ve terminal trafiğini belirtilen ara sunucuya yönlendirir.")
        h_sub.get_style_context().add_class("device-mac")
        h_sub.set_halign(Gtk.Align.START)
        h_sub.set_line_wrap(True)
        h_text.pack_start(h_title, False, False, 0)
        h_text.pack_start(h_sub, False, False, 0)
        head_box.pack_start(h_text, True, True, 0)
        box.pack_start(head_box, False, False, 0)

        # Current proxy settings
        current_ip = subprocess.getoutput("gsettings get org.gnome.system.proxy.http host 2>/dev/null").strip("'")
        current_port = subprocess.getoutput("gsettings get org.gnome.system.proxy.http port 2>/dev/null").strip()
        proxy_mode = subprocess.getoutput("gsettings get org.gnome.system.proxy mode 2>/dev/null").strip("'")

        # 1. Bento Card: Proxy Switch
        card_switch = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        card_switch.get_style_context().add_class("settings-card")
        sw_icon = Gtk.Image.new_from_icon_name("network-server-symbolic", Gtk.IconSize.BUTTON)
        card_switch.pack_start(sw_icon, False, False, 0)
        
        sw_text = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        sw_title = Gtk.Label(label="Proxy Tünelini Aktifleştir")
        sw_title.get_style_context().add_class("setting-title")
        sw_title.set_halign(Gtk.Align.START)
        sw_sub = Gtk.Label(label="Tüm HTTP ve HTTPS isteklerini tünelle")
        sw_sub.get_style_context().add_class("setting-subtitle")
        sw_sub.set_halign(Gtk.Align.START)
        sw_text.pack_start(sw_title, False, False, 0)
        sw_text.pack_start(sw_sub, False, False, 0)
        card_switch.pack_start(sw_text, True, True, 0)
        
        proxy_switch = Gtk.Switch()
        proxy_switch.set_valign(Gtk.Align.CENTER)
        proxy_switch.set_active(proxy_mode == "manual")
        card_switch.pack_end(proxy_switch, False, False, 0)
        box.pack_start(card_switch, False, False, 0)

        # 2. Bento Card: Strict Mode (Kill Switch)
        card_strict = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        card_strict.get_style_context().add_class("settings-card")
        st_icon = Gtk.Image.new_from_icon_name("security-high-symbolic", Gtk.IconSize.BUTTON)
        card_strict.pack_start(st_icon, False, False, 0)
        
        st_text = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        st_title = Gtk.Label(label="Sıkı Mod (Kill Switch)")
        st_title.get_style_context().add_class("setting-title")
        st_title.set_halign(Gtk.Align.START)
        st_sub = Gtk.Label(label="Proxy çevrimdışı ise doğrudan internet erişimini kes")
        st_sub.get_style_context().add_class("setting-subtitle")
        st_sub.set_halign(Gtk.Align.START)
        st_text.pack_start(st_title, False, False, 0)
        st_text.pack_start(st_sub, False, False, 0)
        card_strict.pack_start(st_text, True, True, 0)
        
        strict_switch = Gtk.Switch()
        strict_switch.set_valign(Gtk.Align.CENTER)
        has_fw = storage.get_global("proxy_strict_mode", False)
        strict_switch.set_active(has_fw)
        card_strict.pack_end(strict_switch, False, False, 0)
        box.pack_start(card_strict, False, False, 0)

        # 3. Bento Card: Server Details
        card_details = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        card_details.get_style_context().add_class("settings-card")
        
        det_lbl = Gtk.Label(label="Sunucu ve Port Bilgileri")
        det_lbl.get_style_context().add_class("setting-title")
        det_lbl.set_halign(Gtk.Align.START)
        card_details.pack_start(det_lbl, False, False, 0)

        entry_ip = Gtk.Entry()
        entry_ip.set_placeholder_text("Proxy IP / Host (Örn: 192.168.1.50)")
        if current_ip and current_ip != "''":
            entry_ip.set_text(current_ip)
        card_details.pack_start(entry_ip, False, False, 0)

        entry_port = Gtk.Entry()
        entry_port.set_placeholder_text("Bağlantı Noktası (Port, Örn: 8080 veya 1080)")
        if current_port and current_port != "0":
            entry_port.set_text(current_port)
        card_details.pack_start(entry_port, False, False, 0)
        box.pack_start(card_details, False, False, 0)

        # 4. Bento Card: Bypass Apps
        card_bypass = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        card_bypass.get_style_context().add_class("settings-card")
        bp_icon = Gtk.Image.new_from_icon_name("system-run-symbolic", Gtk.IconSize.BUTTON)
        card_bypass.pack_start(bp_icon, False, False, 0)
        
        bp_text = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        bp_title = Gtk.Label(label="Uygulama Ayrımı (Bypass)")
        bp_title.get_style_context().add_class("setting-title")
        bp_title.set_halign(Gtk.Align.START)
        bp_sub = Gtk.Label(label="Seçili uygulamaların proxy tünelinden muaf olmasını sağla")
        bp_sub.get_style_context().add_class("setting-subtitle")
        bp_sub.set_halign(Gtk.Align.START)
        bp_text.pack_start(bp_title, False, False, 0)
        bp_text.pack_start(bp_sub, False, False, 0)
        card_bypass.pack_start(bp_text, True, True, 0)
        
        btn_exclude = Gtk.Button(label="Uygulamaları Yönet...")
        btn_exclude.get_style_context().add_class("btn-secondary")
        btn_exclude.set_valign(Gtk.Align.CENTER)
        btn_exclude.connect("clicked", self._on_exclude_apps)
        card_bypass.pack_end(btn_exclude, False, False, 0)
        box.pack_start(card_bypass, False, False, 0)

        dialog.show_all()
        res = dialog.run()
        
        if res == Gtk.ResponseType.OK:
            ip = entry_ip.get_text().strip()
            port = entry_port.get_text().strip()
            is_active = proxy_switch.get_active()
            is_strict = strict_switch.get_active()
            
            if is_active and ip and port:
                subprocess.run(f"gsettings set org.gnome.system.proxy mode 'manual'", shell=True)
                subprocess.run(f"gsettings set org.gnome.system.proxy.http host '{ip}'", shell=True)
                subprocess.run(f"gsettings set org.gnome.system.proxy.http port {port}", shell=True)
                subprocess.run(f"gsettings set org.gnome.system.proxy.https host '{ip}'", shell=True)
                subprocess.run(f"gsettings set org.gnome.system.proxy.https port {port}", shell=True)
                self._update_bashrc_proxy(True, ip, port)
                self._update_proxy_firewall(is_strict, ip, port)
                storage.set_global("proxy_strict_mode", is_strict)
                self.toast_service.show("Proxy aktif edildi (GUI ve Terminal).")
            else:
                subprocess.run(f"gsettings set org.gnome.system.proxy mode 'none'", shell=True)
                self._update_bashrc_proxy(False)
                self._update_proxy_firewall(False)
                storage.set_global("proxy_strict_mode", False)
                if is_active:
                    self.toast_service.show("Eksik bilgi! Proxy devre dışı bırakıldı.")
                else:
                    self.toast_service.show("Proxy devre dışı bırakıldı (GUI ve Terminal).")
                
        dialog.destroy()

    def _on_exclude_apps(self, btn):
        import glob, os
        dialog = BentoDialog(title="Hariç Tutulacak Uygulamalar", parent=self.get_toplevel(), icon_name="application-x-executable-symbolic", default_width=520, default_height=600)
        dialog.add_bento_action_button("Tamam", Gtk.ResponseType.OK, is_primary=True)
        
        box = dialog.get_bento_content()
        
        # Header
        h_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        h_ic = Gtk.Image.new_from_icon_name("application-x-executable-symbolic", Gtk.IconSize.LARGE_TOOLBAR)
        h_ic.set_pixel_size(26)
        h_box.pack_start(h_ic, False, False, 0)

        h_texts = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        h_t = Gtk.Label(label="Proxy Bypass - Uygulama Seçimi")
        h_t.get_style_context().add_class("device-name")
        h_t.set_halign(Gtk.Align.START)
        h_d = Gtk.Label(label="Aktif edilen uygulamalar proxy tünelini atlayarak doğrudan yerel ağdan bağlanır.")
        h_d.get_style_context().add_class("device-mac")
        h_d.set_halign(Gtk.Align.START)
        h_d.set_line_wrap(True)
        h_texts.pack_start(h_t, False, False, 0)
        h_texts.pack_start(h_d, False, False, 0)
        h_box.pack_start(h_texts, True, True, 0)
        box.pack_start(h_box, False, False, 0)

        # Real-time search entry
        search_entry = Gtk.SearchEntry()
        search_entry.get_style_context().add_class("termius-search")
        search_entry.set_placeholder_text("Uygulama ara (örn: Chrome, Firefox, Burp)...")
        box.pack_start(search_entry, False, False, 4)

        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        scroll.set_vexpand(True)
        box.pack_start(scroll, True, True, 0)
        
        listbox = Gtk.ListBox()
        listbox.set_selection_mode(Gtk.SelectionMode.NONE)
        scroll.add(listbox)
        
        icon_theme = Gtk.IconTheme.get_default()
        desktop_files = glob.glob("/usr/share/applications/*.desktop")
        
        for df in sorted(desktop_files):
            try:
                name = os.path.basename(df)
                icon_name = "application-x-executable-symbolic"
                exec_cmd = ""
                with open(df, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                if "NoDisplay=true" in content:
                    continue
                
                for line in content.split("\n"):
                    if line.startswith("Name="):
                        name = line.split("=", 1)[1].strip()
                    elif line.startswith("Icon="):
                        icon_name = line.split("=", 1)[1].strip()
                    elif line.startswith("Exec="):
                        exec_cmd = line.split("=", 1)[1].strip()
                
                local_df = os.path.expanduser(f"~/.local/share/applications/{os.path.basename(df)}")
                is_bypassed = False
                if os.path.exists(local_df):
                    try:
                        with open(local_df, "r", encoding="utf-8", errors="ignore") as f:
                            c = f.read()
                            if "dolunay-noproxy" in c or "ulak-noproxy" in c:
                                is_bypassed = True
                    except Exception:
                        pass
                
                row = Gtk.ListBoxRow()
                row.get_style_context().add_class("settings-card")
                row.app_name = name
                row.app_exec = exec_cmd

                row_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
                row_box.set_margin_top(6)
                row_box.set_margin_bottom(6)
                row_box.set_margin_start(10)
                row_box.set_margin_end(10)

                # Icon resolution
                if icon_name and icon_theme.has_icon(icon_name):
                    app_icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.DND)
                    app_icon.set_pixel_size(24)
                elif icon_name and os.path.isabs(icon_name) and os.path.exists(icon_name):
                    try:
                        pb = GdkPixbuf.Pixbuf.new_from_file_at_scale(icon_name, 24, 24, True)
                        app_icon = Gtk.Image.new_from_pixbuf(pb)
                    except Exception:
                        app_icon = Gtk.Image.new_from_icon_name("application-x-executable-symbolic", Gtk.IconSize.DND)
                        app_icon.set_pixel_size(24)
                else:
                    app_icon = Gtk.Image.new_from_icon_name("application-x-executable-symbolic", Gtk.IconSize.DND)
                    app_icon.set_pixel_size(24)
                row_box.pack_start(app_icon, False, False, 0)

                # Labels
                lbl_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
                name_lbl = Gtk.Label(label=name)
                name_lbl.get_style_context().add_class("device-name")
                name_lbl.set_halign(Gtk.Align.START)
                
                cmd_display = exec_cmd if len(exec_cmd) < 45 else exec_cmd[:42] + "..."
                sub_lbl = Gtk.Label(label=cmd_display or os.path.basename(df))
                sub_lbl.get_style_context().add_class("device-mac")
                sub_lbl.set_halign(Gtk.Align.START)
                
                lbl_box.pack_start(name_lbl, False, False, 0)
                lbl_box.pack_start(sub_lbl, False, False, 0)
                row_box.pack_start(lbl_box, True, True, 0)

                # Global Bento Switch
                sw = Gtk.Switch()
                sw.set_valign(Gtk.Align.CENTER)
                sw.set_active(is_bypassed)
                sw.connect("notify::active", lambda s, _, sdf=df, ldf=local_df: self._on_app_bypass_toggled(s, sdf, ldf))
                row_box.pack_end(sw, False, False, 0)

                row.add(row_box)
                listbox.add(row)
            except Exception:
                pass
        
        def filter_apps(row):
            q = search_entry.get_text().strip().lower()
            if not q:
                return True
            r_name = getattr(row, 'app_name', '').lower()
            r_exec = getattr(row, 'app_exec', '').lower()
            return q in r_name or q in r_exec

        listbox.set_filter_func(filter_apps)
        search_entry.connect("search-changed", lambda e: listbox.invalidate_filter())

        dialog.show_all()
        dialog.run()
        dialog.destroy()
        
    def _on_app_bypass_toggled(self, widget, system_df, local_df):
        import os
        is_active = widget.get_active()
        if is_active:
            os.makedirs(os.path.dirname(local_df), exist_ok=True)
            try:
                with open(system_df, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()
                with open(local_df, "w", encoding="utf-8") as f:
                    for line in lines:
                        if line.startswith("Exec="):
                            cmd = line.strip().split("=", 1)[1]
                            if "ulak-noproxy" not in cmd and "dolunay-noproxy" not in cmd:
                                f.write(f"Exec=sg ulak-noproxy -c \"{cmd}\"\n")
                            else:
                                f.write(line)
                        else:
                            f.write(line)
                os.chmod(local_df, 0o755)
            except Exception as e:
                print("Bypass error:", e)
        else:
            if os.path.exists(local_df):
                try:
                    os.remove(local_df)
                except Exception:
                    pass

    def _update_bashrc_proxy(self, active, ip=None, port=None):
        import os
        for rc_file in [".bashrc", ".zshrc"]:
            rc_path = os.path.expanduser(f"~/{rc_file}")
            try:
                with open(rc_path, "r") as f:
                    lines = f.readlines()
            except Exception:
                # If file doesn't exist, we might not want to create it unless it's the active shell,
                # but creating it is fine.
                lines = []
                
            new_lines = []
            in_block = False
            for line in lines:
                if line.strip() == "# --- DOLUNAY PROXY START ---":
                    in_block = True
                elif line.strip() == "# --- DOLUNAY PROXY END ---":
                    in_block = False
                elif not in_block:
                    new_lines.append(line)
                    
            if active and ip and port:
                if new_lines and not new_lines[-1].endswith("\n"):
                    new_lines.append("\n")
                new_lines.append("# --- DOLUNAY PROXY START ---\n")
                new_lines.append(f"export http_proxy=\"http://{ip}:{port}\"\n")
                new_lines.append(f"export https_proxy=\"http://{ip}:{port}\"\n")
                new_lines.append(f"export HTTP_PROXY=\"http://{ip}:{port}\"\n")
                new_lines.append(f"export HTTPS_PROXY=\"http://{ip}:{port}\"\n")
                new_lines.append("# --- DOLUNAY PROXY END ---\n")
                
            try:
                with open(rc_path, "w") as f:
                    f.writelines(new_lines)
            except Exception as e:
                print(f"Error updating {rc_file}:", e)

    def _update_proxy_firewall(self, enable, ip=None, port=None):
        import os
        try:
            subprocess.run("killall redsocks 2>/dev/null", shell=True)
            
            fw_script = "/tmp/dolunay_fw.sh"
            with open(fw_script, "w") as f:
                f.write("#!/bin/bash\n")
                
                # Delete existing dolunay-proxy rules dynamically
                f.write("for num in $(iptables -L OUTPUT --line-numbers -n | grep 'dolunay-proxy' | awk '{print $1}' | tac); do iptables -D OUTPUT $num; done\n")
                f.write("for num in $(ip6tables -L OUTPUT --line-numbers -n | grep 'dolunay-proxy' | awk '{print $1}' | tac); do ip6tables -D OUTPUT $num; done\n")
                f.write("for num in $(iptables -t nat -L OUTPUT --line-numbers -n | grep 'dolunay-proxy' | awk '{print $1}' | tac); do iptables -t nat -D OUTPUT $num; done\n")
                
                # Clear existing NAT REDSOCKS chain
                f.write("iptables -t nat -F REDSOCKS 2>/dev/null\n")
                f.write("iptables -t nat -X REDSOCKS 2>/dev/null\n")
                
                if enable and ip and port:
                    # Setup noproxy group
                    f.write("groupadd -f dolunay-noproxy 2>/dev/null\n")
                    f.write(f"usermod -aG dolunay-noproxy $SUDO_USER 2>/dev/null\n")
                    f.write(f"usermod -aG dolunay-noproxy $(logname) 2>/dev/null\n")
                    
                    # Block UDP 80/443 to force TCP fallback (QUIC blocking)
                    f.write("iptables -I OUTPUT -p udp --dport 443 -m comment --comment 'dolunay-proxy' -j REJECT\n")
                    f.write("iptables -I OUTPUT -p udp --dport 80 -m comment --comment 'dolunay-proxy' -j REJECT\n")
                    f.write("ip6tables -I OUTPUT -p udp --dport 443 -m comment --comment 'dolunay-proxy' -j REJECT\n")
                    f.write("ip6tables -I OUTPUT -p tcp --dport 443 -m comment --comment 'dolunay-proxy' -j REJECT\n")
                    f.write("ip6tables -I OUTPUT -p tcp --dport 80 -m comment --comment 'dolunay-proxy' -j REJECT\n")
                    
                    # Bypass REJECT rules for excluded apps (group dolunay-noproxy)
                    f.write("iptables -I OUTPUT -m owner --gid-owner dolunay-noproxy -j ACCEPT\n")
                    f.write("ip6tables -I OUTPUT -m owner --gid-owner dolunay-noproxy -j ACCEPT\n")
                    
                    # Create NAT Transparent Proxy Rules
                    f.write("iptables -t nat -N REDSOCKS\n")
                    # Bypass REDSOCKS for excluded apps
                    f.write("iptables -t nat -A REDSOCKS -m owner --gid-owner dolunay-noproxy -j RETURN\n")
                    
                    # Ignore Local/Private Networks
                    f.write("iptables -t nat -A REDSOCKS -d 0.0.0.0/8 -j RETURN\n")
                    f.write("iptables -t nat -A REDSOCKS -d 10.0.0.0/8 -j RETURN\n")
                    f.write("iptables -t nat -A REDSOCKS -d 127.0.0.0/8 -j RETURN\n")
                    f.write("iptables -t nat -A REDSOCKS -d 169.254.0.0/16 -j RETURN\n")
                    f.write("iptables -t nat -A REDSOCKS -d 172.16.0.0/12 -j RETURN\n")
                    f.write("iptables -t nat -A REDSOCKS -d 192.168.0.0/16 -j RETURN\n")
                    f.write("iptables -t nat -A REDSOCKS -d 224.0.0.0/4 -j RETURN\n")
                    f.write("iptables -t nat -A REDSOCKS -d 240.0.0.0/4 -j RETURN\n")
                    
                    # Redirect all other TCP to redsocks local port
                    f.write("iptables -t nat -A REDSOCKS -p tcp -j REDIRECT --to-ports 12345\n")
                    
                    # Apply to OUTPUT
                    f.write("iptables -t nat -I OUTPUT -p tcp -m comment --comment 'dolunay-proxy' -j REDSOCKS\n")

            os.chmod(fw_script, 0o755)
            # Only ONE pkexec call for all firewall operations!
            subprocess.run(f"pkexec {fw_script}", shell=True)

            if enable and ip and port:
                # 3. Generate Redsocks Config
                conf_path = "/tmp/dolunay_redsocks.conf"
                with open(conf_path, "w") as f:
                    f.write("base {\n")
                    f.write("  log_debug = off;\n")
                    f.write("  log_info = off;\n")
                    f.write("  daemon = on;\n")
                    f.write("  redirector = iptables;\n")
                    f.write("}\n")
                    f.write("redsocks {\n")
                    f.write("  local_ip = 127.0.0.1;\n")
                    f.write("  local_port = 12345;\n")
                    f.write(f"  ip = {ip};\n")
                    f.write(f"  port = {port};\n")
                    f.write("  type = http-connect;\n")
                    f.write("}\n")
                
                # Start Redsocks
                subprocess.run(f"redsocks -c {conf_path}", shell=True)
                
        except Exception as e:
            print("Error updating proxy firewall:", e)

    def _refresh_ui(self):
        networks = wifi_api.get_networks()
        
        # Details Network Header
        try:
            ip = subprocess.getoutput("ip route get 1.1.1.1 | awk '{print $7}' | head -n 1").strip()
            getway = subprocess.getoutput("ip route | grep default | awk '{print $3}' | head -n 1").strip()
            
            proxy_mode = subprocess.getoutput("gsettings get org.gnome.system.proxy mode 2>/dev/null").strip("'")
            proxy_info = " | Proxy: Kapalı"
            if proxy_mode == "manual":
                p_ip = subprocess.getoutput("gsettings get org.gnome.system.proxy.http host 2>/dev/null").strip("'")
                p_port = subprocess.getoutput("gsettings get org.gnome.system.proxy.http port 2>/dev/null").strip()
                proxy_info = f" | Proxy: {p_ip}:{p_port}"
                
            self.net_details_lbl.set_label(f"Yerel IP: {ip if ip else 'Yok'} | Gateway: {getway if getway else 'Yok'}{proxy_info}")
        except: pass

        if self.active_filter != "all":
            if self.active_filter == "open":
                networks = [n for n in networks if n["security"] == "open"]
            elif self.active_filter == "secure":
                networks = [n for n in networks if n["security"] != "open"]
        if self.search_query:
            networks = [n for n in networks if self.search_query in n["ssid"].lower()]

        for child in self.list_box.get_children(): self.list_box.remove(child)

        for i, n in enumerate(networks):
            ev_card = Gtk.EventBox()
            ev_card.set_visible_window(False)
            ev_card.set_tooltip_text("Ağ detayları ve özellikleri için sağ tıklayın")
            
            def make_wifi_right_click(net_dict):
                def _on_card_press(w, event):
                    if event.button == 3: # Right click
                        self._show_wifi_details_window(net_dict)
                        return True
                    return False
                return _on_card_press
                
            ev_card.connect("button-press-event", make_wifi_right_click(n))

            card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
            card.get_style_context().add_class("card")
            card.get_style_context().add_class("fade-in")
            card.set_margin_bottom(5)
            
            icon = Gtk.Image.new_from_icon_name(n["icon_name"], Gtk.IconSize.DND)
            if n["active"]:
                icon.get_style_context().add_class("signal-strong")
            card.pack_start(icon, False, False, 0)
            
            info = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
            info.set_hexpand(True)
            name_lbl = Gtk.Label(label=n["ssid"])
            name_lbl.get_style_context().add_class("device-name")
            name_lbl.set_halign(Gtk.Align.START)
            name_lbl.set_ellipsize(Pango.EllipsizeMode.END)
            name_lbl.set_max_width_chars(25)
            info.pack_start(name_lbl, False, False, 0)
            
            mac_lbl = Gtk.Label(label=f"{n['bssid']} — Ch {n['channel']} — {n['security'].upper()}")
            mac_lbl.get_style_context().add_class("device-mac")
            mac_lbl.set_halign(Gtk.Align.START)
            info.pack_start(mac_lbl, False, False, 0)
            card.pack_start(info, True, True, 0)

            actions = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
            if n["active"]:
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

                disconnect_btn = Gtk.Button(label=_("disconnect"))
                disconnect_btn.get_style_context().add_class("btn-secondary")
                disconnect_btn.connect("clicked", lambda btn, s=n["ssid"]: wifi_api.disconnect() or self.toast_service.show(_("disconnecting")))
                actions.pack_start(disconnect_btn, False, False, 0)

            else:
                connect_btn = Gtk.Button(label=_("connect"))
                connect_btn.get_style_context().add_class("btn-primary")
                connect_btn.connect("clicked", lambda btn, s=n["ssid"]: self._prompt_password_and_connect(s) if n["security"] != "open" else (wifi_api.connect(s, "") and self.toast_service.show(_("connecting"))))
                actions.pack_start(connect_btn, False, False, 0)

            card.pack_start(actions, False, False, 0)
            ev_card.add(card)
            self.list_box.pack_start(ev_card, False, False, 0)
            
        self.list_box.show_all()

    def _prompt_password_and_connect(self, ssid):
        dialog = BentoDialog(title=f"Ağa Bağlan: {ssid}", parent=self.get_toplevel(), icon_name="dialog-password-symbolic", default_width=380, default_height=220)
        dialog.add_bento_action_button(_("cancel") if _("cancel") != "cancel" else "İptal", Gtk.ResponseType.CANCEL, is_primary=False)
        dialog.add_bento_action_button(_("connect") if _("connect") != "connect" else "Bağlan", Gtk.ResponseType.OK, is_primary=True)
        box = dialog.get_bento_content()
        
        lbl = Gtk.Label(label=_("password_hint"))
        lbl.get_style_context().add_class("setting-subtitle")
        lbl.set_halign(Gtk.Align.START)
        box.pack_start(lbl, False, False, 0)
        
        entry = Gtk.Entry()
        entry.set_visibility(False)
        entry.set_activates_default(True)
        box.pack_start(entry, False, False, 0)
        
        dialog.show_all()
        res = dialog.run()
        pw = entry.get_text()
        dialog.destroy()
        
        if res == Gtk.ResponseType.OK:
            self.toast_service.show(_("connecting"))
            wifi_api.connect(ssid, pw)

    def _update_traffic(self):
        try:
            with open('/proc/net/dev', 'r') as f:
                lines = f.readlines()
            rx, tx = 0, 0
            for line in lines:
                if self.active_iface in line:
                    parts = line.split(':')[1].split()
                    rx = int(parts[0])
                    tx = int(parts[8])
                    break
            
            now = time.time()
            dt = now - self.last_traffic_time
            if dt > 0 and self.last_rx > 0:
                rx_speed = (rx - self.last_rx) / dt / 1024.0
                tx_speed = (tx - self.last_tx) / dt / 1024.0
                self.traffic_lbl.set_label(f"↓ {rx_speed:.2f} KB/s   ↑ {tx_speed:.2f} KB/s")
            self.last_rx, self.last_tx, self.last_traffic_time = rx, tx, now
        except: pass
        
        try:
            ping_out = subprocess.getoutput("ping -c 1 -W 1 8.8.8.8 | grep time=")
            if "time=" in ping_out:
                ms = ping_out.split("time=")[1].split(" ")[0]
                self.ping_lbl.set_label(f"{_('wifi_ping')}: {ms} ms")
            else:
                self.ping_lbl.set_label(f"{_('wifi_ping')}: -- ms")
        except: pass

    def _refresh_loop(self):
        self._refresh_ui()
        self._update_traffic()
        GLib.timeout_add_seconds(5, self._refresh_loop)
