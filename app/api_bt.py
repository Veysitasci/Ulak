import dbus

class BluetoothAPI:
    def __init__(self):
        self.bus = dbus.SystemBus()
        self.manager = dbus.Interface(
            self.bus.get_object("org.bluez", "/"),
            "org.freedesktop.DBus.ObjectManager"
        )
        self.adapter_path = self._find_adapter()
        self.adapter = dbus.Interface(
            self.bus.get_object("org.bluez", self.adapter_path),
            "org.bluez.Adapter1"
        )
        self.props = dbus.Interface(
            self.bus.get_object("org.bluez", self.adapter_path),
            "org.freedesktop.DBus.Properties"
        )

    def _find_adapter(self):
        objects = self.manager.GetManagedObjects()
        for path, interfaces in objects.items():
            if "org.bluez.Adapter1" in interfaces:
                return path
        return "/org/bluez/hci0"

    def is_powered(self):
        return bool(self.props.Get("org.bluez.Adapter1", "Powered"))

    def set_powered(self, state):
        self.props.Set("org.bluez.Adapter1", "Powered", dbus.Boolean(state))

    def get_discoverable(self):
        return bool(self.props.Get("org.bluez.Adapter1", "Discoverable"))

    def set_discoverable(self, state):
        self.props.Set("org.bluez.Adapter1", "Discoverable", dbus.Boolean(state))

    def set_discoverable_timeout(self, seconds):
        try:
            self.props.Set("org.bluez.Adapter1", "DiscoverableTimeout", dbus.UInt32(max(0, int(seconds))))
            return True
        except Exception:
            return False

    def get_pairable(self):
        try:
            return bool(self.props.Get("org.bluez.Adapter1", "Pairable"))
        except Exception:
            return False

    def set_pairable(self, state):
        try:
            self.props.Set("org.bluez.Adapter1", "Pairable", dbus.Boolean(state))
            return True
        except Exception:
            return False

    def set_pairable_timeout(self, seconds):
        try:
            self.props.Set("org.bluez.Adapter1", "PairableTimeout", dbus.UInt32(max(0, int(seconds))))
            return True
        except Exception:
            return False

    def get_adapter_info(self):
        try:
            return {
                "path": self.adapter_path,
                "address": str(self.props.Get("org.bluez.Adapter1", "Address")),
                "name": str(self.props.Get("org.bluez.Adapter1", "Alias")),
                "powered": bool(self.props.Get("org.bluez.Adapter1", "Powered")),
                "discoverable": bool(self.props.Get("org.bluez.Adapter1", "Discoverable")),
                "pairable": bool(self.props.Get("org.bluez.Adapter1", "Pairable")),
                "class": int(self.props.Get("org.bluez.Adapter1", "Class")),
            }
        except Exception:
            return {
                "path": self.adapter_path,
                "address": "",
                "name": "",
                "powered": False,
                "discoverable": False,
                "pairable": False,
                "class": 0,
            }

    def get_name(self):
        return str(self.props.Get("org.bluez.Adapter1", "Alias"))

    def set_name(self, name):
        self.props.Set("org.bluez.Adapter1", "Alias", dbus.String(name))

    def get_uuids(self, path):
        try:
            props = dbus.Interface(self.bus.get_object("org.bluez", path), "org.freedesktop.DBus.Properties")
            return list(props.Get("org.bluez.Device1", "UUIDs"))
        except:
            return []

    def start_discovery(self):
        try:
            self.adapter.StartDiscovery()
            return True
        except Exception:
            return False

    def stop_discovery(self):
        try:
            self.adapter.StopDiscovery()
            return True
        except Exception:
            return False

    def get_devices(self, i18n_func):
        objects = self.manager.GetManagedObjects()
        devices = []
        for path, interfaces in objects.items():
            if "org.bluez.Device1" in interfaces:
                props = interfaces["org.bluez.Device1"]
                battery_props = interfaces.get("org.bluez.Battery1", {})
                
                # Fetch Icon and Name
                icon = str(props.get("Icon", "")).lower()
                name = str(props.get("Name", props.get("Alias", ""))).lower()
                
                type_name, icon_name = self._get_device_type(icon, name, i18n_func)
                
                devices.append({
                    "path": path,
                    "address": str(props.get("Address")),
                    "name": str(props.get("Name", props.get("Alias", props.get("Address")))),
                    "connected": bool(props.get("Connected")),
                    "paired": bool(props.get("Paired")),
                    "trusted": bool(props.get("Trusted")),
                    "icon": str(props.get("Icon", "bluetooth")),
                    "battery": int(battery_props.get("Percentage", -1)),
                    "rssi": int(props.get("RSSI", -100)),
                    "type_name": type_name,
                    "icon_name": icon_name
                })
        return devices

    def _get_device_type(self, icon, name, _):
        if "mouse" in icon or "mouse" in name or "fare" in name:
            return _("input"), "input-mouse-symbolic"
        if "audio" in icon or "headset" in icon or "headphone" in icon or "kulaklık" in name:
            return _("audio"), "audio-headset-symbolic"
        if "keyboard" in icon or "keyboard" in name or "klavye" in name:
            return _("input"), "input-keyboard-symbolic"
        if "input" in icon:
            return _("input"), "input-mouse-symbolic"
        if "phone" in icon or "phone" in name or "telefon" in name:
            return _("phone"), "phone-symbolic"
        if "computer" in icon or "laptop" in icon or "bilgisayar" in name:
            return _("computer"), "computer-symbolic"
        if "gamepad" in icon or "joystick" in icon or "game" in name or "controller" in name or "dualshock" in name or "dualsense" in name or "xbox" in name or "joycon" in name or "kumanda" in name:
            return _("gamepad"), "input-mouse-symbolic"
        if "watch" in icon or "watch" in name or "wearable" in name or "fitness" in name or "band" in name or "saat" in name:
            return _("wearable"), "preferences-system-time-symbolic"
        if "sensor" in name or "beacon" in name or "iot" in name or "smart" in name or "bulb" in name or "light" in name or "switch" in name or "plug" in name or "ampul" in name:
            return _("iot"), "preferences-system-network-symbolic"
        sym_icon = f"{icon}-symbolic" if (icon and not icon.endswith("-symbolic")) else (icon or "bluetooth-symbolic")
        return _("unknown"), sym_icon

    def connect_device(self, path):
        device = dbus.Interface(self.bus.get_object("org.bluez", path), "org.bluez.Device1")
        device.Connect()

    def disconnect_device(self, path):
        device = dbus.Interface(self.bus.get_object("org.bluez", path), "org.bluez.Device1")
        device.Disconnect()

    def pair_device(self, path):
        device = dbus.Interface(self.bus.get_object("org.bluez", path), "org.bluez.Device1")
        device.Pair()

    def trust_device(self, path, state):
        props = dbus.Interface(self.bus.get_object("org.bluez", path), "org.freedesktop.DBus.Properties")
        props.Set("org.bluez.Device1", "Trusted", dbus.Boolean(state))

    def find_device_by_address(self, address):
        target = str(address).strip().lower()
        if not target:
            return None
        objects = self.manager.GetManagedObjects()
        for path, interfaces in objects.items():
            if "org.bluez.Device1" in interfaces:
                dev_addr = str(interfaces["org.bluez.Device1"].get("Address", "")).lower()
                if dev_addr == target:
                    return path
        return None

    def remove_device(self, path):
        self.adapter.RemoveDevice(path)

bt_api = BluetoothAPI()
