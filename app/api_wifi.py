import dbus
import time

class WifiAPI:
    def __init__(self):
        self.bus = dbus.SystemBus()
        self.nm = self.bus.get_object("org.freedesktop.NetworkManager", "/org/freedesktop/NetworkManager")
        self.nm_iface = dbus.Interface(self.nm, "org.freedesktop.NetworkManager")
        self.props_iface = dbus.Interface(self.nm, "org.freedesktop.DBus.Properties")
        
        self.device_path = self._find_wifi_device()
        self.iface_name = "wlan0"
        self.wifi_iface = None
        
        if self.device_path:
            self.dev_obj = self.bus.get_object("org.freedesktop.NetworkManager", self.device_path)
            self.wifi_iface = dbus.Interface(self.dev_obj, "org.freedesktop.NetworkManager.Device.Wireless")
            dev_props = dbus.Interface(self.dev_obj, "org.freedesktop.DBus.Properties")
            self.iface_name = str(dev_props.Get("org.freedesktop.NetworkManager.Device", "Interface"))
            
    def _find_wifi_device(self):
        try:
            devices = self.nm_iface.GetDevices()
            for d in devices:
                dev_obj = self.bus.get_object("org.freedesktop.NetworkManager", d)
                dev_props = dbus.Interface(dev_obj, "org.freedesktop.DBus.Properties")
                dtype = dev_props.Get("org.freedesktop.NetworkManager.Device", "DeviceType")
                if dtype == 2: # WIFI
                    return d
        except Exception:
            pass
        return None

    def is_powered(self):
        try:
            status = self.props_iface.Get("org.freedesktop.NetworkManager", "WirelessEnabled")
            return bool(status)
        except: return False

    def set_powered(self, state):
        try:
            self.props_iface.Set("org.freedesktop.NetworkManager", "WirelessEnabled", dbus.Boolean(state))
        except Exception:
            pass

    def get_networks(self):
        if not self.wifi_iface: 
            return []
        try:
            dev_props = dbus.Interface(self.dev_obj, "org.freedesktop.DBus.Properties")
            active_ap_path = dev_props.Get("org.freedesktop.NetworkManager.Device.Wireless", "ActiveAccessPoint")
            
            aps = self.wifi_iface.GetAllAccessPoints()
            
            unique_networks = {}
            for ap_path in aps:
                try:
                    ap_obj = self.bus.get_object("org.freedesktop.NetworkManager", ap_path)
                    ap_props_iface = dbus.Interface(ap_obj, "org.freedesktop.DBus.Properties")
                    all_props = ap_props_iface.GetAll("org.freedesktop.NetworkManager.AccessPoint")
                    
                    ssid_bytes = all_props.get("Ssid", [])
                    ssid = bytes(ssid_bytes).decode('utf-8', 'replace')
                    if not ssid: ssid = "[Hidden Network]"
                    
                    strength = int(all_props.get("Strength", 0))
                    freq = int(all_props.get("Frequency", 0))
                    hw_addr = str(all_props.get("HwAddress", "00:00:00:00:00:00"))
                    
                    wpa_flags = int(all_props.get("WpaFlags", 0))
                    rsn_flags = int(all_props.get("RsnFlags", 0))
                    security = "open"
                    if wpa_flags or rsn_flags: security = "wpa-psk"
                    
                    connected = (ap_path == active_ap_path)
                    
                    # Calculate channel and icon
                    channel = self._freq_to_channel(freq)
                    icon_name = self._get_icon_name(strength, security)

                    if ssid not in unique_networks or strength > unique_networks[ssid]["strength"] or connected:
                        unique_networks[ssid] = {
                            "ssid": ssid,
                            "bssid": hw_addr,
                            "strength": strength,
                            "frequency": freq,
                            "channel": channel,
                            "security": security,
                            "active": connected or unique_networks.get(ssid, {}).get("active", False),
                            "icon_name": icon_name,
                            "path": ap_path
                        }
                except Exception:
                    continue
            
            return list(unique_networks.values())
        except Exception:
            return []

    def _freq_to_channel(self, freq):
        if freq == 2484: return 14
        if 2407 < freq < 2484: return (freq - 2407) // 5
        if 5170 <= freq <= 5825: return (freq - 5170) // 5 + 34
        return 0

    def _get_icon_name(self, strength, security):
        level = "excellent"
        if strength < 20: level = "none"
        elif strength < 40: level = "weak"
        elif strength < 60: level = "ok"
        elif strength < 80: level = "good"
        
        suffix = "-secure" if security != "open" else ""
        return f"network-wireless-signal-{level}{suffix}-symbolic"

    def request_scan(self):
        if self.wifi_iface:
            try: self.wifi_iface.RequestScan({})
            except: pass

    def disconnect(self):
        try:
            dev_iface = dbus.Interface(self.dev_obj, "org.freedesktop.NetworkManager.Device")
            dev_iface.Disconnect()
            return True
        except: return False

    def connect(self, ssid, password):
        try:
            # Simple connection management - finding or creating
            connection = {
                '802-11-wireless': {'ssid': dbus.ByteArray(ssid.encode('utf-8')), 'mode': 'infrastructure'},
                'connection': {'id': ssid, 'type': '802-11-wireless'}
            }
            if password:
                connection['802-11-wireless-security'] = {'key-mgmt': 'wpa-psk'}
                connection['802-11-wireless']['security'] = '802-11-wireless-security'
                connection['wpa-psk'] = {'psk': password}

            self.nm_iface.AddAndActivateConnection(connection, self.device_path, "/")
            return True
        except Exception as e:
            print(f"Connect error: {e}")
            return False

    def get_active_connection_info(self):
        try:
            if not self.device_path:
                return None
            dev_props = dbus.Interface(self.dev_obj, "org.freedesktop.DBus.Properties")
            active_ap_path = dev_props.Get("org.freedesktop.NetworkManager.Device.Wireless", "ActiveAccessPoint")
            if str(active_ap_path) == "/":
                return None

            ap_obj = self.bus.get_object("org.freedesktop.NetworkManager", active_ap_path)
            ap_props = dbus.Interface(ap_obj, "org.freedesktop.DBus.Properties")
            all_props = ap_props.GetAll("org.freedesktop.NetworkManager.AccessPoint")

            ssid_bytes = all_props.get("Ssid", [])
            ssid = bytes(ssid_bytes).decode('utf-8', 'replace') if ssid_bytes else "[Hidden Network]"

            return {
                "ssid": ssid,
                "bssid": str(all_props.get("HwAddress", "00:00:00:00:00:00")),
                "strength": int(all_props.get("Strength", 0)),
                "frequency": int(all_props.get("Frequency", 0)),
                "channel": self._freq_to_channel(int(all_props.get("Frequency", 0))),
                "path": active_ap_path
            }
        except Exception:
            return None

    def list_saved_connections(self):
        try:
            settings_obj = self.bus.get_object(
                "org.freedesktop.NetworkManager",
                "/org/freedesktop/NetworkManager/Settings"
            )
            settings_iface = dbus.Interface(settings_obj, "org.freedesktop.NetworkManager.Settings")
            conns = settings_iface.ListConnections()

            result = []
            for conn_path in conns:
                try:
                    conn_obj = self.bus.get_object("org.freedesktop.NetworkManager", conn_path)
                    conn_iface = dbus.Interface(conn_obj, "org.freedesktop.NetworkManager.Settings.Connection")
                    cfg = conn_iface.GetSettings()

                    conn_type = str(cfg.get("connection", {}).get("type", ""))
                    if conn_type != "802-11-wireless":
                        continue

                    ssid_bytes = cfg.get("802-11-wireless", {}).get("ssid", [])
                    ssid = bytes(ssid_bytes).decode('utf-8', 'replace') if ssid_bytes else "[Hidden Network]"
                    result.append({
                        "path": conn_path,
                        "id": str(cfg.get("connection", {}).get("id", "")),
                        "uuid": str(cfg.get("connection", {}).get("uuid", "")),
                        "ssid": ssid
                    })
                except Exception:
                    continue
            return result
        except Exception:
            return []

    def forget_connection(self, ssid):
        try:
            target = str(ssid).strip()
            if not target:
                return False
            for conn in self.list_saved_connections():
                if conn.get("ssid") == target or conn.get("id") == target:
                    conn_obj = self.bus.get_object("org.freedesktop.NetworkManager", conn["path"])
                    conn_iface = dbus.Interface(conn_obj, "org.freedesktop.NetworkManager.Settings.Connection")
                    conn_iface.Delete()
                    return True
            return False
        except Exception:
            return False

    def toggle_airplane_like(self, mode):
        # mode=True -> wifi kapalı, mode=False -> wifi açık
        try:
            self.props_iface.Set(
                "org.freedesktop.NetworkManager",
                "WirelessEnabled",
                dbus.Boolean(not bool(mode))
            )
            return True
        except Exception:
            return False

    def request_scan_and_wait(self, timeout=3, interval=0.5):
        if not self.wifi_iface:
            return []
        try:
            self.wifi_iface.RequestScan({})
        except Exception:
            pass

        deadline = time.time() + max(0.1, float(timeout))
        step = max(0.1, float(interval))
        while time.time() < deadline:
            time.sleep(step)

        return self.get_networks()

wifi_api = WifiAPI()
