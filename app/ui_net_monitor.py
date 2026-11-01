import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, GLib, Pango
import os
import pwd
import socket
import subprocess
import threading
import time
import urllib.request

from ui_shared import UsageGraph, DeviceDetailsDialog, storage

TCP_STATES = {
    "01": "ESTABLISHED", "02": "SYN_SENT", "03": "SYN_RECV", "04": "FIN_WAIT1",
    "05": "FIN_WAIT2", "06": "TIME_WAIT", "07": "CLOSE", "08": "CLOSE_WAIT",
    "09": "LAST_ACK", "0A": "LISTEN", "0B": "CLOSING",
}

SERVICE_NAMES = {
    20: "FTP-Data", 21: "FTP", 22: "SSH", 25: "SMTP", 53: "DNS", 67: "DHCP",
    68: "DHCP", 69: "TFTP", 80: "HTTP", 110: "POP3", 111: "RPC", 123: "NTP",
    137: "NetBIOS", 138: "NetBIOS", 139: "SMB", 143: "IMAP", 161: "SNMP",
    389: "LDAP", 443: "HTTPS", 445: "SMB", 465: "SMTPS", 514: "Syslog",
    546: "DHCPv6", 547: "DHCPv6", 587: "SMTP", 631: "IPP (Yazıcı)",
    853: "DNS-over-TLS", 993: "IMAPS", 995: "POP3S", 1701: "L2TP",
    1900: "SSDP", 3306: "MySQL", 3389: "RDP", 4353: "mDNS", 5000: "HTTP-UPnP",
    5353: "mDNS / Zeroconf", 5355: "LLMNR", 5432: "PostgreSQL", 5672: "AMQP",
    5900: "VNC", 6379: "Redis", 8080: "HTTP-Alt", 8443: "HTTPS-Alt",
    9000: "HTTP-Dev", 9050: "Tor", 9100: "JetDirect", 11211: "Memcached",
    27017: "MongoDB", 50000: "UPnP",
}

# Sunucu/güvenlik servisleri dışında makbul sayılan sistem portları
KNOWN_SAFE_PORTS = {53, 67, 68, 123, 5353, 546, 547, 631, 1900}


def _hex_to_ip4(h):
    b = bytes.fromhex(h)
    return f"{b[3]}.{b[2]}.{b[1]}.{b[0]}"


def _hex_to_ip6(h):
    raw = bytearray()
    for i in range(0, 32, 8):
        raw += bytes.fromhex(h[i:i + 8])[::-1]
    return socket.inet_ntop(socket.AF_INET6, bytes(raw))


def is_local_bind(addr):
    return addr in ("127.0.0.1", "::1") or addr.startswith("127.")


def human_bytes(n):
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024 or unit == "TB":
            return f"{n:.1f} {unit}"
        n /= 1024.0


def read_net_dev():
    """{iface: (rx_bytes, tx_bytes)} — /proc/net/dev gerçek sayacı."""
    stats = {}
    try:
        with open("/proc/net/dev") as f:
            for line in f:
                if ":" not in line:
                    continue
                name, data = line.split(":", 1)
                name = name.strip()
                cols = data.split()
                if len(cols) >= 9:
                    stats[name] = (int(cols[0]), int(cols[8]))
    except OSError:
        pass
    return stats


def collect_sockets():
    """TCP/UDP soketlerini /proc üzerinden okur (root gerekmez)."""
    out = []
    for family, proto, v6 in (("tcp", "TCP", False), ("tcp6", "TCP", True),
                              ("udp", "UDP", False), ("udp6", "UDP", True)):
        path = f"/proc/net/{family}"
        if not os.path.exists(path):
            continue
        try:
            with open(path) as f:
                next(f, None)
                for line in f:
                    c = line.split()
                    if len(c) < 10:
                        continue
                    la, lp = c[1].rsplit(":", 1)
                    ra, rp = c[2].rsplit(":", 1)
                    ip_conv = _hex_to_ip6 if v6 else _hex_to_ip4
                    out.append({
                        "proto": proto,
                        "laddr": ip_conv(la),
                        "lport": int(lp, 16),
                        "raddr": ip_conv(ra),
                        "rport": int(rp, 16),
                        "state": TCP_STATES.get(c[3].upper(), c[3]),
                        "uid": int(c[7]),
                        "inode": c[9],
                    })
        except OSError:
            continue
    return out


def build_inode_map():
    """socket inode -> (pid, süreç adı). Başkasına ait süreçler okunamayabilir."""
    m = {}
    for pid in os.listdir("/proc"):
        if not pid.isdigit():
            continue
        try:
            with open(f"/proc/{pid}/comm") as f:
                comm = f.read().strip()
            fd_dir = f"/proc/{pid}/fd"
            for fd in os.listdir(fd_dir):
                try:
                    link = os.readlink(os.path.join(fd_dir, fd))
                except OSError:
                    continue
                if link.startswith("socket:["):
                    m[link[8:-1]] = (int(pid), comm)
        except OSError:
            continue
    return m


def uid_name(uid):
    try:
        return pwd.getpwuid(uid).pw_name
    except KeyError:
        return str(uid)


def get_route_info():
    """Varsayılan arayüz, gateway ve IPv4 bilgisi (ip route)."""
    iface, gw = None, None
    try:
        out = subprocess.run(["ip", "route", "show", "default"],
                             stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                             text=True, timeout=5).stdout
        for line in out.splitlines():
            parts = line.split()
            if "dev" in parts:
                iface = parts[parts.index("dev") + 1]
            if "via" in parts:
                gw = parts[parts.index("via") + 1]
            break
    except Exception:
        pass
    ipv4 = None
    if iface:
        try:
            out = subprocess.run(["ip", "-br", "addr", "show", iface],
                                 stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                 text=True, timeout=5).stdout
            for tok in out.split():
                if "/" in tok and ":" not in tok:
                    ipv4 = tok
                    break
        except Exception:
            pass
    return iface, gw, ipv4


def get_iface_hw_speed(iface):
    mac = speed = None
    if iface:
        try:
            with open(f"/sys/class/net/{iface}/address") as f:
                mac = f.read().strip()
        except OSError:
            pass
        try:
            with open(f"/sys/class/net/{iface}/speed") as f:
                s = f.read().strip()
            if s.isdigit() and int(s) > 0:
                speed = f"{int(s)} Mbps"
        except OSError:
            pass
    return mac, speed


def ping_host(host, count=3):
    try:
        out = subprocess.run(["ping", "-c", str(count), "-W", "1", host],
                             stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                             text=True, timeout=count * 2 + 4).stdout
        times = [float(t.split("=")[1].split()[0])
                 for t in out.split() if t.startswith("time=")]
        return sum(times) / len(times) if times else None
    except Exception:
        return None


class NetMonitorView(Gtk.ScrolledWindow):
    """
    Tamamen CANLI veriyle çalışan Ağ & Port Takipçisi:
    /proc/net/dev (trafik), /proc/net/tcp|udp (port/soket), ip route (arayüz),
    ping (geçikme) ve indirme tabanlı gerçek hız testi.
    """
    def __init__(self, toast_service):
        super().__init__()
        self.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        self.toast_service = toast_service

        self._prev_net = read_net_dev()
        self._peak_rate = 1_000_000.0
        self._known_listen = None
        self._scanning = False
        self._pinging = False
        self._speedtesting = False
        self._tick_count = 0
        self._last_latency = None

        main_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        main_box.set_margin_top(20)
        main_box.set_margin_bottom(24)
        main_box.set_margin_start(32)
        main_box.set_margin_end(32)
        self.add(main_box)

        header = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        lbl_title = Gtk.Label(label="Ağ & Port Takipçisi")
        lbl_title.get_style_context().add_class("header-title")
        lbl_title.set_halign(Gtk.Align.START)
        header.pack_start(lbl_title, False, False, 0)

        lbl_desc = Gtk.Label(label="Veriler doğrudan /proc, ip route ve canlı ping/indirme testlerinden gelir (root gerekmez).")
        lbl_desc.get_style_context().add_class("header-sub")
        lbl_desc.set_halign(Gtk.Align.START)
        lbl_desc.set_line_wrap(True)
        header.pack_start(lbl_desc, False, False, 0)
        main_box.pack_start(header, False, False, 0)

        # 1. BENTO DASHBOARD: 4 canlı ölçüm kartı
        top_grid = Gtk.Grid(column_spacing=16, row_spacing=16)
        top_grid.set_column_homogeneous(True)
        main_box.pack_start(top_grid, False, False, 0)

        card, self.graph_load, self.lbl_load = self._create_bento_stat_card(
            "Canlı Ağ Trafiği", "network-transmit-receive-symbolic", (0.06, 0.72, 0.5, 1.0))
        top_grid.attach(card, 0, 0, 1, 1)

        card, self.graph_sec, self.lbl_sec = self._create_bento_stat_card(
            "Güvenlik Skoru", "security-high-symbolic", (0.2, 0.6, 1.0, 1.0))
        top_grid.attach(card, 1, 0, 1, 1)

        card, self.graph_conn, self.lbl_conn = self._create_bento_stat_card(
            "Etkin Soketler", "network-workgroup-symbolic", (0.99, 0.65, 0.14, 1.0))
        top_grid.attach(card, 2, 0, 1, 1)

        card, self.graph_ping, self.lbl_ping = self._create_bento_stat_card(
            "Canlı Gecikme (Ping)", "network-vpn-symbolic", (0.55, 0.35, 0.95, 1.0))
        top_grid.attach(card, 3, 0, 1, 1)

        # 2. ARAYÜZ BİLGİ KARTI (gerçek ip route / sysfs verisi)
        self.iface_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        self.iface_card.get_style_context().add_class("settings-card")
        self.iface_card.set_margin_top(8)
        ic = Gtk.Image.new_from_icon_name("network-wired-symbolic", Gtk.IconSize.BUTTON)
        self.iface_card.pack_start(ic, False, False, 0)
        vbox_if = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        self.lbl_iface_title = Gtk.Label(label="Ağ Arayüzü")
        self.lbl_iface_title.get_style_context().add_class("setting-title")
        self.lbl_iface_title.set_halign(Gtk.Align.START)
        self.lbl_iface_sub = Gtk.Label(label="Bilgi alınıyor...")
        self.lbl_iface_sub.get_style_context().add_class("setting-subtitle")
        self.lbl_iface_sub.set_halign(Gtk.Align.START)
        vbox_if.pack_start(self.lbl_iface_title, False, False, 0)
        vbox_if.pack_start(self.lbl_iface_sub, False, False, 0)
        self.iface_card.pack_start(vbox_if, True, True, 0)

        self.btn_speedtest = Gtk.Button(label="Hız Testi Başlat")
        self.btn_speedtest.get_style_context().add_class("btn-secondary")
        self.btn_speedtest.set_valign(Gtk.Align.CENTER)
        self.btn_speedtest.connect("clicked", lambda b: self._run_speed_test())
        self.iface_card.pack_end(self.btn_speedtest, False, False, 0)
        main_box.pack_start(self.iface_card, False, False, 0)

        # 3. TARAMA KARTI
        action_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        action_card.get_style_context().add_class("settings-card")
        ic_scan = Gtk.Image.new_from_icon_name("system-search-symbolic", Gtk.IconSize.BUTTON)
        action_card.pack_start(ic_scan, False, False, 0)
        vbox_act = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        act_title = Gtk.Label(label="Canlı Port ve Soket Taraması")
        act_title.get_style_context().add_class("setting-title")
        act_title.set_halign(Gtk.Align.START)
        act_sub = Gtk.Label(label="TCP/UDP dinleyen soketler, süreç eşlemesi ve dışa açıklık analiziyle yeniden tarar.")
        act_sub.get_style_context().add_class("setting-subtitle")
        act_sub.set_halign(Gtk.Align.START)
        vbox_act.pack_start(act_title, False, False, 0)
        vbox_act.pack_start(act_sub, False, False, 0)
        action_card.pack_start(vbox_act, True, True, 0)
        btn_scan = Gtk.Button(label="Taramayı Başlat")
        btn_scan.get_style_context().add_class("btn-primary")
        btn_scan.connect("clicked", lambda b: self._rescan(user_initiated=True))
        action_card.pack_end(btn_scan, False, False, 0)
        self.btn_scan = btn_scan
        main_box.pack_start(action_card, False, False, 0)

        # 4. GERÇEK DAVRANIŞLI AYAR KARTLARI
        sec_settings = Gtk.Label(label="İZLEME AYARLARI")
        sec_settings.get_style_context().add_class("nav-section-title")
        sec_settings.set_halign(Gtk.Align.START)
        sec_settings.set_margin_top(8)
        main_box.pack_start(sec_settings, False, False, 0)

        settings_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        main_box.pack_start(settings_box, False, False, 0)

        settings_box.pack_start(self._create_bento_switch_card(
            icon_name="view-refresh-symbolic",
            title="Otomatik Yenileme",
            subtitle="Port/soket listesi ve gecikme ölçümü her 10 saniyede bir canlı tazelenir.",
            key="netmon_autorefresh", default=True,
            callback=lambda s: self.toast_service.show(
                "Otomatik yenileme açıldı." if s else "Otomatik yenileme kapatıldı.", type="info")
        ), False, False, 0)

        settings_box.pack_start(self._create_bento_switch_card(
            icon_name="preferences-system-notifications-symbolic",
            title="Yeni Port Bildirimleri",
            subtitle="Yeni bir servis dinlemeye geçtiğinde gerçek zamanlı masaüstü bildirimi alır.",
            key="netmon_port_notify", default=True,
            callback=lambda s: self.toast_service.show(
                "Port bildirimleri açıldı." if s else "Port bildirimleri kapatıldı.", type="info")
        ), False, False, 0)

        settings_box.pack_start(self._create_bento_switch_card(
            icon_name="changes-prevent-symbolic",
            title="Yalnızca Dışa Açık Portları Göster",
            subtitle="Listede 0.0.0.0 / :: üzerinden dışarıya açık dinleyen portları filtreler.",
            key="netmon_external_only", default=False,
            callback=lambda s: self.listbox.invalidate_filter()
        ), False, False, 0)

        # 5. ARAMALI PORT LİSTESİ (Kural 3)
        sec_list = Gtk.Label(label="DİNLENEN PORTLAR VE SOKETLER")
        sec_list.get_style_context().add_class("nav-section-title")
        sec_list.set_halign(Gtk.Align.START)
        sec_list.set_margin_top(12)
        main_box.pack_start(sec_list, False, False, 0)

        self.search_entry = Gtk.SearchEntry()
        self.search_entry.get_style_context().add_class("termius-search")
        self.search_entry.set_placeholder_text("Port, süreç, adres veya servis ara (ör: 22, sshd, 0.0.0.0)...")
        main_box.pack_start(self.search_entry, False, False, 0)

        scroll_list = Gtk.ScrolledWindow()
        scroll_list.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        scroll_list.set_min_content_height(220)
        self.listbox = Gtk.ListBox()
        self.listbox.set_selection_mode(Gtk.SelectionMode.NONE)
        scroll_list.add(self.listbox)
        main_box.pack_start(scroll_list, True, True, 0)

        def filter_func(row):
            q = self.search_entry.get_text().strip().lower()
            if q and q not in getattr(row, "name", "").lower():
                return False
            if storage.get_global("netmon_external_only", False) and not getattr(row, "external", False):
                return False
            return True
        self.listbox.set_filter_func(filter_func)
        self.search_entry.connect("search-changed", lambda e: self.listbox.invalidate_filter())

        self._refresh_iface_info()
        self._rescan()

        self._timer = GLib.timeout_add_seconds(2, self._tick)
        self.connect("destroy", lambda w: GLib.source_remove(self._timer))

    # ---------- BENTO YARDIMCILARI ----------
    def _create_bento_stat_card(self, title, icon_name, color):
        card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=16)
        card.get_style_context().add_class("card")
        card.set_margin_top(4)
        card.set_margin_bottom(4)
        card.set_margin_start(4)
        card.set_margin_end(4)

        graph = UsageGraph(color_rgba=color)
        card.pack_start(graph, False, False, 8)

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        vbox.set_valign(Gtk.Align.CENTER)
        head = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        ic = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.MENU)
        head.pack_start(ic, False, False, 0)
        t_lbl = Gtk.Label(label=title)
        t_lbl.get_style_context().add_class("device-name")
        head.pack_start(t_lbl, False, False, 0)
        vbox.pack_start(head, False, False, 0)

        val_lbl = Gtk.Label(label="Ölçülüyor...")
        val_lbl.get_style_context().add_class("title-label")
        val_lbl.set_halign(Gtk.Align.START)
        val_lbl.set_line_wrap(True)
        vbox.pack_start(val_lbl, False, False, 0)

        card.pack_start(vbox, True, True, 0)
        return card, graph, val_lbl

    def _create_bento_switch_card(self, icon_name, title, subtitle, key, default, callback):
        card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        card.get_style_context().add_class("settings-card")
        icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.BUTTON)
        card.pack_start(icon, False, False, 0)

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        t_lbl = Gtk.Label(label=title)
        t_lbl.get_style_context().add_class("setting-title")
        t_lbl.set_halign(Gtk.Align.START)
        s_lbl = Gtk.Label(label=subtitle)
        s_lbl.get_style_context().add_class("setting-subtitle")
        s_lbl.set_halign(Gtk.Align.START)
        s_lbl.set_line_wrap(True)
        s_lbl.set_max_width_chars(60)
        vbox.pack_start(t_lbl, False, False, 0)
        vbox.pack_start(s_lbl, False, False, 0)
        card.pack_start(vbox, True, True, 0)

        switch = Gtk.Switch()
        switch.set_valign(Gtk.Align.CENTER)
        switch.set_active(storage.get_global(key, default))
        def _toggled(sw, _p, k=key, cb=callback):
            storage.set_global(k, sw.get_active())
            cb(sw.get_active())
        switch.connect("notify::active", _toggled)
        card.pack_end(switch, False, False, 0)
        return card

    # ---------- CANLI DÖNGÜ ----------
    def _tick(self):
        self._tick_count += 1
        self._update_traffic()
        if self._tick_count % 5 == 0 and storage.get_global("netmon_autorefresh", True):
            self._rescan()
            self._refresh_iface_info()
        if self._tick_count % 5 == 2 and not self._pinging:
            self._start_ping()
        return True

    def _update_traffic(self):
        cur = read_net_dev()
        rx = tx = 0
        for iface, (r, t) in cur.items():
            if iface == "lo":
                continue
            pr, pt = self._prev_net.get(iface, (r, t))
            rx += max(0, r - pr)
            tx += max(0, t - pt)
        self._prev_net = cur
        rps, tps = rx / 2.0, tx / 2.0
        total = max(rps, tps)
        self._peak_rate = max(self._peak_rate * 0.98, total, 1_000_000.0)
        self.graph_load.set_fraction(min(1.0, total / self._peak_rate))
        self.lbl_load.set_text(f"↓ {human_bytes(rps)}/s  ↑ {human_bytes(tps)}/s")

    def _refresh_iface_info(self):
        iface, gw, ipv4 = get_route_info()
        mac, speed = get_iface_hw_speed(iface)
        if not iface:
            self.lbl_iface_title.set_label("Ağ Arayüzü: Bağlantı Yok")
            self.lbl_iface_sub.set_label("Varsayılan rota bulunamadı.")
            return
        parts = [f"IPv4: {ipv4 or '-'}", f"MAC: {mac or '-'}",
                 f"Hız: {speed or '-'}", f"Gateway: {gw or '-'}"]
        self.lbl_iface_title.set_label(f"Aktif Arayüz: {iface}")
        self.lbl_iface_sub.set_label("  •  ".join(parts))

    def _start_ping(self):
        _, gw, _ = get_route_info()
        target = gw or "1.1.1.1"
        self._pinging = True
        self.lbl_ping.set_text(f"ping {target} ...")

        def _work():
            lat = ping_host(target)
            GLib.idle_add(self._apply_ping, target, lat)
        threading.Thread(target=_work, daemon=True).start()

    def _apply_ping(self, target, lat):
        self._pinging = False
        self._last_latency = lat
        if lat is None:
            self.graph_ping.set_fraction(0.0)
            self.lbl_ping.set_text(f"{target} yanıt vermiyor")
        else:
            self.graph_ping.set_fraction(max(0.0, 1.0 - min(lat, 200.0) / 200.0))
            q = "Çok iyi" if lat < 15 else ("İyi" if lat < 40 else ("Orta" if lat < 90 else "Yüksek"))
            self.lbl_ping.set_text(f"{lat:.1f} ms • {target} • {q}")
        return False

    # ---------- HIZ TESTİ (gerçek indirme) ----------
    def _run_speed_test(self):
        if self._speedtesting:
            return
        self._speedtesting = True
        self.btn_speedtest.set_sensitive(False)
        self.btn_speedtest.set_label("Test ediliyor...")
        self.toast_service.show("Canlı hız testi başlatıldı (25 MB indirme)...", type="info")

        def _work():
            url = "https://speed.cloudflare.com/__down?bytes=25000000"
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "ULAK"})
                t0 = time.time()
                n = 0
                with urllib.request.urlopen(req, timeout=30) as resp:
                    while True:
                        chunk = resp.read(131072)
                        if not chunk:
                            break
                        n += len(chunk)
                        if time.time() - t0 > 25:
                            break
                dt = time.time() - t0
                mbps = (n * 8) / dt / 1_000_000 if dt > 0 else 0
                GLib.idle_add(self._apply_speed_test, mbps, True)
            except Exception:
                GLib.idle_add(self._apply_speed_test, 0, False)
        threading.Thread(target=_work, daemon=True).start()

    def _apply_speed_test(self, mbps, ok):
        self._speedtesting = False
        self.btn_speedtest.set_sensitive(True)
        self.btn_speedtest.set_label("Hız Testi Başlat")
        if ok:
            self.toast_service.show(f"İndirme hızı: {mbps:.1f} Mbps", type="success")
        else:
            self.toast_service.show("Hız testi başarısız: sunucuya ulaşılamadı.", type="error")
        return False

    # ---------- GERÇEK TARAMA ----------
    def _rescan(self, user_initiated=False):
        if self._scanning:
            return
        self._scanning = True
        if user_initiated:
            self.btn_scan.set_sensitive(False)
            self.toast_service.show("Canlı soket taraması başlatıldı...", type="info")

        def _work():
            socks = collect_sockets()
            imap = build_inode_map()
            merged = []
            for s in socks:
                pid, comm = imap.get(s["inode"], (None, None))
                s["pid"] = pid
                s["comm"] = comm
                merged.append(s)
            GLib.idle_add(self._apply_scan, merged, user_initiated)
        threading.Thread(target=_work, daemon=True).start()

    def _apply_scan(self, socks, user_initiated):
        self._scanning = False
        if user_initiated:
            self.btn_scan.set_sensitive(True)

        listeners = [s for s in socks if s["proto"] == "TCP" and s["state"] == "LISTEN"]
        listeners += [s for s in socks if s["proto"] == "UDP" and s["lport"] > 0
                      and s["rport"] == 0 and s["raddr"] in ("0.0.0.0", "::")]
        established = [s for s in socks if s["state"] == "ESTABLISHED"]

        # Güvenlik skoru: dışa açık + tanımsız servisler puan kırar
        score = 100
        risky = 0
        for s in listeners:
            if is_local_bind(s["laddr"]):
                continue
            if s["lport"] in KNOWN_SAFE_PORTS:
                continue
            if s["lport"] in SERVICE_NAMES:
                score -= 4
            else:
                score -= 12
                risky += 1
        score = max(0, score)
        self.graph_sec.set_fraction(score / 100.0)
        if score >= 90:
            verdict = "Güvenli"
        elif score >= 70:
            verdict = "Dikkatli"
        else:
            verdict = "Riskli"
        self.lbl_sec.set_text(f"%{score} • {verdict}" + (f" • {risky} şüpheli dış port" if risky else ""))

        self.graph_conn.set_fraction(min(1.0, len(established) / 25.0))
        self.lbl_conn.set_text(f"{len(established)} etkin bağlantı • {len(listeners)} dinleyen port")

        # Yeni port bildirimi (gerçek tespitleme)
        current = {(s["proto"], s["lport"]) for s in listeners}
        if self._known_listen is not None and storage.get_global("netmon_port_notify", True):
            for proto, port in current - self._known_listen:
                owner = next((s["comm"] for s in listeners if s["lport"] == port), "?")
                self.toast_service.show(f"Yeni port dinlemeye geçti: {port}/{proto.lower()} ({owner})", type="warning")
        self._known_listen = current

        self._populate_rows(listeners, established)
        self.listbox.invalidate_filter()

        if user_initiated:
            if risky:
                self.toast_service.show(f"Tarama bitti: {risky} dışa açık tanımsız port bulundu!", type="warning")
            else:
                self.toast_service.show("Tarama bitti: şüpheli dışa açık port yok.", type="success")
        return False

    def _populate_rows(self, listeners, established):
        for child in self.listbox.get_children():
            self.listbox.remove(child)

        for s in sorted(listeners, key=lambda x: x["lport"]):
            external = not is_local_bind(s["laddr"])
            svc = SERVICE_NAMES.get(s["lport"])
            proc = s["comm"] or "bilinmeyen süreç"
            user = uid_name(s["uid"])
            safe = (not external) or (s["lport"] in KNOWN_SAFE_PORTS or svc is not None)
            title = f"Port {s['lport']} / {s['proto']}"
            detail = f"{s['laddr']}  •  {svc or 'Tanımsız servis'}  •  {proc} (PID {s['pid'] or '?'}, {user})"
            icon = "security-high-symbolic" if safe else "dialog-warning-symbolic"
            self._add_row(title, detail, icon, safe, s,
                          external=external,
                          btn_lbl="İncele" if safe else "Kapat",
                          btn_cls="btn-secondary" if safe else "btn-danger")

        if established:
            sep = Gtk.ListBoxRow()
            sep.get_style_context().add_class("nav-section-title")
            sep_lbl = Gtk.Label(label="ETKİN DIŞ BAĞLANTILAR")
            sep_lbl.get_style_context().add_class("nav-section-title")
            sep_lbl.set_halign(Gtk.Align.START)
            sep.add(sep_lbl)
            self.listbox.add(sep)

            seen = set()
            for s in sorted(established, key=lambda x: (x["proto"], x["lport"])):
                key = (s["proto"], s["laddr"], s["lport"], s["raddr"], s["rport"])
                if key in seen:
                    continue
                seen.add(key)
                proc = s["comm"] or "?"
                title = f"{s['raddr']}:{s['rport']}"
                detail = f"{s['proto']} • yerel {s['laddr']}:{s['lport']} • {proc} (PID {s['pid'] or '?'}, {uid_name(s['uid'])})"
                self._add_row(title, detail, "network-transmit-receive-symbolic",
                              True, s, external=False, btn_lbl="İncele", btn_cls="btn-secondary")

        self.listbox.show_all()

    def _add_row(self, title, detail, icon_name, safe, sock, external, btn_lbl, btn_cls):
        row = Gtk.ListBoxRow()
        row.name = f"{title} {detail}".lower()
        row.external = external
        row.get_style_context().add_class("settings-card")
        row.set_margin_bottom(6)

        box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.BUTTON)
        box.pack_start(icon, False, False, 0)

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        t_lbl = Gtk.Label(label=title)
        t_lbl.get_style_context().add_class("device-name")
        t_lbl.set_halign(Gtk.Align.START)
        d_lbl = Gtk.Label(label=detail)
        d_lbl.get_style_context().add_class("device-mac")
        d_lbl.set_halign(Gtk.Align.START)
        d_lbl.set_ellipsize(Pango.EllipsizeMode.END)
        vbox.pack_start(t_lbl, False, False, 0)
        vbox.pack_start(d_lbl, False, False, 0)
        box.pack_start(vbox, True, True, 0)

        btn = Gtk.Button(label=btn_lbl)
        btn.get_style_context().add_class(btn_cls)
        btn.set_valign(Gtk.Align.CENTER)
        if btn_lbl == "Kapat":
            btn.connect("clicked", lambda b: self._kill_port_process(sock))
        else:
            btn.connect("clicked", lambda b: self._show_socket_details(sock))
        box.pack_end(btn, False, False, 0)

        row.add(box)
        self.listbox.add(row)

    def _show_socket_details(self, s):
        svc = SERVICE_NAMES.get(s["lport"], "Tanımsız servis")
        external = not is_local_bind(s["laddr"])
        dialog = DeviceDetailsDialog(
            title=f"Soket Detayı — {s['proto']} {s['lport']}",
            parent=self.get_toplevel(),
            icon_name="network-workgroup-symbolic",
            default_width=470, default_height=540)
        dialog.set_header_info(
            icon_name="network-workgroup-symbolic",
            title=f"{svc} (Port {s['lport']}/{s['proto'].lower()})",
            subtitle=f"{s['laddr']}  •  {s['state']}",
            status_active=True,
            status_text="Dışa Açık" if external else "Yalnızca Yerel")
        items = [
            ("Durum", s["state"], "emblem-system-symbolic"),
            ("Yerel Adres", f"{s['laddr']}:{s['lport']}", "network-server-symbolic"),
            ("Karşı Taraf", f"{s['raddr']}:{s['rport']}" if s["raddr"] not in ("0.0.0.0", "::") else "-", "network-workgroup-symbolic"),
            ("Servis", svc, "application-x-executable-symbolic"),
            ("Süreç", f"{s['comm'] or 'bilinmiyor'} (PID {s['pid'] or '?'})", "system-run-symbolic"),
            ("Kullanıcı", uid_name(s["uid"]), "avatar-default-symbolic"),
            ("Soket Inode", s["inode"], "text-x-generic-symbolic"),
            ("Erişim Kapsamı", "Dış ağa açık" if external else "Yalnızca loopback/yerel",
             "changes-prevent-symbolic"),
        ]
        dialog.set_items_list(items)
        dialog.show_all()
        dialog.run()
        dialog.destroy()

    def _kill_port_process(self, s):
        pid = s.get("pid")
        if not pid:
            self.toast_service.show("Süreç bilgisi alınamadı (root yetkisi gerekir).", type="error")
            return
        try:
            os.kill(pid, 15)  # SIGTERM
            self.toast_service.show(f"PID {pid} ({s['comm']}) sonlandırıldı, port {s['lport']} kapanacak.", type="success")
            GLib.timeout_add_seconds(2, lambda: (self._rescan(), False)[1])
        except PermissionError:
            self.toast_service.show(f"PID {pid} sizin kullanıcınıza ait değil — yetki reddedildi.", type="error")
        except OSError as e:
            self.toast_service.show(f"Süreç sonlandırılamadı: {e}", type="error")
