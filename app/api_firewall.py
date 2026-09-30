import subprocess
import os
import json
import pathlib
import time
import re
import psutil

from antivirus_engine import av_engine

CONFIG_DIR = pathlib.Path(os.path.expanduser("~/.config/dolunay"))
CONFIG_FILE = CONFIG_DIR / "firewall.json"

class DolunayFirewall:
    """
    Dolunay Güvenlik Duvarı Yönetim Sınıfı.
    nftables kurallarını yönetir, dinleyen uygulamaları izler ve tehdit tespiti sağlar.
    """
    def __init__(self):
        self._ensure_config()

    def _ensure_config(self):
        """Yapılandırma dizinini ve dosyasını oluşturur."""
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        if not CONFIG_FILE.exists():
            with open(CONFIG_FILE, "w") as f:
                json.dump({"whitelist": [], "enabled": False, "preset": "medium"}, f)

    def _load_config(self):
        """Yapılandırmayı yükler."""
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {"whitelist": [], "enabled": False, "preset": "medium"}

    def _save_config(self, data):
        """Yapılandırmayı kaydeder."""
        try:
            with open(CONFIG_FILE, "w") as f:
                json.dump(data, f)
        except Exception:
            pass

    def is_enabled(self) -> bool:
        """Güvenlik duvarının etkin olup olmadığını kontrol eder."""
        conf = self._load_config()
        return conf.get("enabled", False)

    def get_preset(self) -> str:
        """Kayıtlı güvenlik seviyesini döndürür."""
        conf = self._load_config()
        return conf.get("preset", "medium")

    def enable_firewall(self) -> tuple:
        """Güvenlik duvarını kullanıcı talebiyle etkinleştirir."""
        conf = self._load_config()
        preset = conf.get("preset", "medium")
        success, msg = self._apply_ruleset(preset)
        if success:
            conf["enabled"] = True
            self._save_config(conf)
            if preset in ("high", "paranoid"):
                av_engine.start_download_watcher()
            return True, f"Güvenlik duvarı etkinleştirildi ({preset.capitalize()} Seviyesi)."
        return False, msg

    def disable_firewall(self) -> tuple:
        """Güvenlik duvarını devre dışı bırakır."""
        av_engine.stop_download_watcher()
        try:
            res = subprocess.run(["pkexec", "nft", "delete", "table", "inet", "dolunay_fw"], capture_output=True, text=True, shell=False)
            conf = self._load_config()
            conf["enabled"] = False
            self._save_config(conf)
            return True, "Güvenlik duvarı başarıyla devre dışı bırakıldı."
        except Exception as e:
            conf = self._load_config()
            conf["enabled"] = False
            self._save_config(conf)
            return False, str(e)

    # UI ile tam uyumluluk sağlayan takma adlar (Aliases)
    def enable(self):
        return self.enable_firewall()

    def disable(self):
        return self.disable_firewall()

    def get_stats(self) -> dict:
        return {
            "blocked_today": self.get_blocked_count_today(),
            "open_ports": len(self.get_listening_apps()),
            "active_connections": len(psutil.net_connections(kind='inet'))
        }

    def get_recent_events(self) -> list:
        return self.get_threat_log(max_entries=20)

    def set_security_level(self, level: str) -> tuple:
        return self.apply_preset(level)

    def get_status(self) -> dict:
        """Güvenlik duvarının genel durumunu döndürür."""
        enabled = self.is_enabled()
        rules_count = len(self.get_rules()) if enabled else 0
        
        return {
            "enabled": enabled,
            "rules_count": rules_count,
            "blocked_today": self.get_blocked_count_today(),
            "open_ports": len(self.get_listening_apps()),
            "active_connections": len(psutil.net_connections(kind='inet')),
            "security_level": "Aktif" if enabled else "Devre Dışı"
        }

    def get_rules(self) -> list:
        """dolunay_fw tablosundaki kuralları yapılandırılmış bir liste olarak döndürür."""
        if not self.is_enabled():
            return []
        
        rules = []
        try:
            res = subprocess.run(["nft", "-a", "list", "table", "inet", "dolunay_fw"], capture_output=True, text=True, shell=False)
            if res.returncode == 0:
                current_chain = None
                for line in res.stdout.splitlines():
                    line = line.strip()
                    if line.startswith("chain"):
                        parts = line.split()
                        if len(parts) >= 2:
                            current_chain = parts[1]
                    elif "handle" in line and current_chain:
                        handle_match = re.search(r"handle (\d+)", line)
                        if handle_match:
                            rules.append({
                                "id": handle_match.group(1),
                                "chain": current_chain,
                                "raw": line,
                                "protocol": "tcp" if "tcp" in line else "udp" if "udp" in line else "any",
                                "port": "", 
                                "ip": "",
                                "action": "accept" if "accept" in line else "drop" if "drop" in line else "unknown",
                                "enabled": True,
                                "comment": ""
                            })
        except Exception:
            pass
        return rules

    def add_rule(self, direction, protocol, port, ip_addr, action, comment) -> tuple:
        """Yeni bir kural ekler."""
        chain = "input_filter" if direction == "input" else "output_filter"
        cmd = ["pkexec", "nft", "add", "rule", "inet", "dolunay_fw", chain]
        
        rule_parts = []
        if ip_addr:
            rule_parts.extend(["ip", "saddr" if direction == "input" else "daddr", ip_addr])
        if protocol and protocol != "any":
            rule_parts.extend([protocol])
            if port:
                rule_parts.extend(["dport", str(port)])
        
        rule_parts.append(action)
        
        if comment:
            rule_parts.extend(["comment", f'"{comment}"'])
            
        try:
            res = subprocess.run(cmd + rule_parts, capture_output=True, text=True, shell=False)
            if res.returncode == 0:
                return True, "Kural başarıyla eklendi."
            return False, f"Hata: {res.stderr}"
        except Exception as e:
            return False, str(e)

    def remove_rule(self, rule_handle) -> tuple:
        """Belirtilen id (handle) değerine sahip kuralı siler."""
        chain_name = None
        for rule in self.get_rules():
            if rule["id"] == str(rule_handle):
                chain_name = rule["chain"]
                break
        
        if not chain_name:
            return False, "Kural bulunamadı."
            
        try:
            res = subprocess.run(["pkexec", "nft", "delete", "rule", "inet", "dolunay_fw", chain_name, "handle", str(rule_handle)], capture_output=True, text=True, shell=False)
            if res.returncode == 0:
                return True, "Kural başarıyla silindi."
            return False, f"Hata: {res.stderr}"
        except Exception as e:
            return False, str(e)

    def apply_preset(self, preset_name: str) -> tuple:
        """
        Önceden tanımlanmış kural setlerinden birini seçer veya uygular.
        Eğer güvenlik duvarı kapalıysa SADECE konfigürasyona kaydeder, firewall'u ASLA kendiliğinden açmaz!
        """
        p = self._normalize_preset(preset_name)
        conf = self._load_config()
        conf["preset"] = p
        self._save_config(conf)

        if not self.is_enabled():
            return True, f"{p.capitalize()} seviyesi seçildi (Güvenlik duvarı açıldığında devreye girecek)."

        success, msg = self._apply_ruleset(p)
        if p in ("high", "paranoid"):
            av_engine.start_download_watcher()
        else:
            av_engine.stop_download_watcher()
        return success, msg

    def _normalize_preset(self, preset_name: str) -> str:
        p = preset_name.lower().strip()
        if p in ("low", "minimal", "dusuk", "düşük"):
            return "low"
        elif p in ("medium", "standard", "orta", "standart"):
            return "medium"
        elif p in ("high", "strict", "yuksek", "yüksek"):
            return "high"
        elif p in ("paranoid", "isolation", "airgap", "izolasyon"):
            return "paranoid"
        elif p in ("local", "lan", "yerel"):
            return "local"
        return "medium"

    def _apply_ruleset(self, p: str) -> tuple:
        """Belirtilen seviyenin nftables kurallarını tek bir atomik işlemde yükler."""
        if p == "paranoid":
            # Paranoid: %100 Air-Gap İzolasyonu (Yalnızca 127.0.0.1 lo serbest, tüm dış ağ kilitli)
            ruleset = """
table inet dolunay_fw {
    chain input_filter {
        type filter hook input priority 0; policy drop;
        iifname "lo" accept
    }
    chain output_filter {
        type filter hook output priority 0; policy drop;
        oifname "lo" accept
    }
}
"""
        elif p == "high":
            # Yüksek Seviye: Sıkı Web (80/443), DNS (53), DHCP, NTP (123) + Hacker/Tarama Koruması
            ruleset = """
table inet dolunay_fw {
    chain input_filter {
        type filter hook input priority 0; policy drop;
        iifname "lo" accept
        ct state established,related accept
        ct state invalid drop
        tcp flags syn / fin,syn,rst,ack limit rate 25/second burst 50 packets accept
        icmp type echo-request limit rate 2/second accept
        tcp dport { 23, 135, 139, 445, 3389, 5900 } drop
        meta l4proto icmp accept
        meta l4proto ipv6-icmp accept
        udp sport 67 udp dport 68 accept
        udp sport 547 udp dport 546 accept
        udp sport 53 accept
    }
    chain output_filter {
        type filter hook output priority 0; policy drop;
        oifname "lo" accept
        ct state established,related accept
        tcp dport { 80, 443 } accept
        udp dport 53 accept
        tcp dport 53 accept
        udp sport 68 udp dport 67 accept
        udp sport 546 udp dport 547 accept
        udp dport 123 accept
        meta l4proto icmp accept
        meta l4proto ipv6-icmp accept
    }
}
"""
        elif p == "local":
            # Tam Yerel (LAN): Sadece yerel ağ IP blokları ve localhost serbest
            ruleset = """
table inet dolunay_fw {
    chain input_filter {
        type filter hook input priority 0; policy drop;
        iifname "lo" accept
        ct state established,related accept
        ip saddr { 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16 } accept
        ip6 saddr fe80::/10 accept
        meta l4proto icmp accept
        meta l4proto ipv6-icmp accept
        udp sport 67 udp dport 68 accept
        udp sport 547 udp dport 546 accept
    }
    chain output_filter {
        type filter hook output priority 0; policy drop;
        oifname "lo" accept
        ct state established,related accept
        ip daddr { 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16 } accept
        ip6 daddr fe80::/10 accept
        meta l4proto icmp accept
        meta l4proto ipv6-icmp accept
        udp sport 68 udp dport 67 accept
        udp sport 546 udp dport 547 accept
    }
}
"""
        elif p == "low":
            # Düşük Seviye: Temel ağ koruması (İnternet ve yerel ağ sınırsız açık)
            ruleset = """
table inet dolunay_fw {
    chain input_filter {
        type filter hook input priority 0; policy drop;
        iifname "lo" accept
        ct state established,related accept
        ct state invalid drop
        meta l4proto icmp accept
        meta l4proto ipv6-icmp accept
        udp sport 67 udp dport 68 accept
        udp sport 547 udp dport 546 accept
        udp sport 53 accept
    }
    chain output_filter {
        type filter hook output priority 0; policy accept;
    }
}
"""
        else: # medium (Orta - Standart Hacker & Port Scan Koruması)
            ruleset = """
table inet dolunay_fw {
    chain input_filter {
        type filter hook input priority 0; policy drop;
        iifname "lo" accept
        ct state established,related accept
        ct state invalid drop
        tcp flags syn / fin,syn,rst,ack limit rate 25/second burst 50 packets accept
        icmp type echo-request limit rate 2/second accept
        tcp dport { 23, 135, 139, 445, 3389, 5900 } drop
        meta l4proto icmp accept
        meta l4proto ipv6-icmp accept
        udp sport 67 udp dport 68 accept
        udp sport 547 udp dport 546 accept
        udp sport 53 accept
    }
    chain output_filter {
        type filter hook output priority 0; policy accept;
    }
}
"""
        try:
            res = subprocess.run(["pkexec", "nft", "-f", "-"], input=ruleset, capture_output=True, text=True, shell=False)
            if res.returncode == 0:
                return True, f"{p.capitalize()} seviyesi başarıyla uygulandı."
            return False, f"Hata: {res.stderr}"
        except subprocess.CalledProcessError as e:
            return False, f"Hata oluştu: {e.stderr}"
        except Exception as e:
            return False, str(e)

    def get_listening_apps(self) -> list:
        """Sistemde dinleyen (LISTEN) durumdaki uygulamaları döndürür."""
        apps = []
        try:
            for conn in psutil.net_connections(kind='inet'):
                if conn.status == psutil.CONN_LISTEN:
                    try:
                        proc = psutil.Process(conn.pid)
                        name = proc.name()
                        exe = proc.exe()
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        name = "Bilinmiyor"
                        exe = "Bilinmiyor"
                        
                    ip = conn.laddr.ip
                    port = conn.laddr.port
                    is_exposed = ip not in ('127.0.0.1', '::1', '0.0.0.0')
                    
                    if ip == '0.0.0.0':
                        is_exposed = True
                        
                    apps.append({
                        "pid": conn.pid,
                        "name": name,
                        "exe": exe,
                        "ip": ip,
                        "port": port,
                        "is_exposed": is_exposed
                    })
        except Exception:
            pass
        return apps

    def block_app_network(self, pid) -> tuple:
        """Belirtilen uygulamanın (PID) ağ erişimini sahibinin UID'si üzerinden engeller."""
        try:
            proc = psutil.Process(pid)
            uids = proc.uids()
            uid = uids.real
            cmd = ["pkexec", "nft", "add", "rule", "inet", "dolunay_fw", "output_filter", "meta", "skuid", str(uid), "drop"]
            res = subprocess.run(cmd, capture_output=True, text=True, shell=False)
            if res.returncode == 0:
                return True, f"Uygulama (PID: {pid}, UID: {uid}) başarıyla engellendi."
            return False, f"Engelleme başarısız: {res.stderr}"
        except psutil.NoSuchProcess:
            return False, "Süreç bulunamadı."
        except Exception as e:
            return False, str(e)

    def enable_localhost_only(self) -> tuple:
        """Tüm yerel ağ dışı trafiği keser."""
        return self.apply_preset("local")

    def disable_localhost_only(self) -> tuple:
        """Sadece localhost kısıtlamasını kaldırır."""
        return self.apply_preset("standard")

    def get_whitelist(self) -> list:
        """İzin verilen IP/port listesini döndürür."""
        config = self._load_config()
        return config.get("whitelist", [])

    def add_whitelist(self, ip, port) -> bool:
        """İzin verilenler listesine IP/port ekler."""
        config = self._load_config()
        whitelist = config.get("whitelist", [])
        entry = {"ip": ip, "port": port}
        if entry not in whitelist:
            whitelist.append(entry)
            config["whitelist"] = whitelist
            self._save_config(config)
        return True

    def remove_whitelist(self, ip, port) -> bool:
        """İzin verilenler listesinden IP/port siler."""
        config = self._load_config()
        whitelist = config.get("whitelist", [])
        entry = {"ip": ip, "port": port}
        if entry in whitelist:
            whitelist.remove(entry)
            config["whitelist"] = whitelist
            self._save_config(config)
        return True

    def get_threat_log(self, max_entries=50) -> list:
        """Güvenlik olayları için journalctl günlüklerini ayrıştırır."""
        logs = []
        try:
            cmd = ["journalctl", "-u", "ssh", "-u", "sshd", "-n", str(max_entries), "--output=json"]
            res = subprocess.run(cmd, capture_output=True, text=True, shell=False)
            for line in res.stdout.splitlines():
                try:
                    entry = json.loads(line)
                    logs.append({
                        "timestamp": entry.get("__REALTIME_TIMESTAMP", ""),
                        "message": entry.get("MESSAGE", ""),
                        "service": entry.get("SYSLOG_IDENTIFIER", "")
                    })
                except json.JSONDecodeError:
                    continue
        except Exception:
            pass
        return logs

    def get_failed_logins(self) -> dict:
        """Başarısız SSH/Giriş denemelerini bulur."""
        result = {"total": 0, "last_24h": 0, "top_ips": {}}
        try:
            cmd = ["journalctl", "-u", "sshd", "--since", "yesterday", "--grep", "Failed password"]
            res = subprocess.run(cmd, capture_output=True, text=True, shell=False)
            
            lines = res.stdout.splitlines()
            result["last_24h"] = len(lines)
            
            ip_counts = {}
            for line in lines:
                match = re.search(r"from (\\d+\\.\\d+\\.\\d+\\.\\d+)", line)
                if match:
                    ip = match.group(1)
                    ip_counts[ip] = ip_counts.get(ip, 0) + 1
                    
            result["top_ips"] = dict(sorted(ip_counts.items(), key=lambda item: item[1], reverse=True)[:5])
        except Exception:
            pass
        return result

    def get_blocked_count_today(self) -> int:
        """Bugün engellenen paket sayısını döndürür."""
        try:
            res = subprocess.run(["nft", "list", "counters", "inet", "dolunay_fw"], capture_output=True, text=True, shell=False)
            if res.returncode == 0:
                count = 0
                for line in res.stdout.splitlines():
                    if "packets" in line:
                        m = re.search(r"packets (\d+)", line)
                        if m:
                            count += int(m.group(1))
                return count
        except Exception:
            pass
        return 0

fw_api = DolunayFirewall()
