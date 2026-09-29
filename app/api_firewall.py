import subprocess
import os
import json
import pathlib
import time
import re
import psutil

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
                json.dump({"whitelist": []}, f)

    def _load_config(self):
        """Yapılandırmayı yükler."""
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {"whitelist": []}

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
        # Eğer config'de kayıtlı ise öncelikle oradan doğrula
        if conf.get("enabled", False):
            return True
        try:
            res = subprocess.run(["nft", "list", "table", "inet", "dolunay_fw"], capture_output=True, text=True, shell=False)
            if res.returncode == 0:
                conf["enabled"] = True
                self._save_config(conf)
                return True
        except Exception:
            pass
        return False

    def enable_firewall(self) -> tuple:
        """Güvenlik duvarını etkinleştirir. Standart tabloları ve kuralları tek seferde atomik oluşturur."""
        ruleset = """
table inet dolunay_fw {
    chain input_filter {
        type filter hook input priority 0; policy drop;
        ct state established,related accept
        iifname "lo" accept
        meta l4proto icmp accept
    }
    chain output_filter {
        type filter hook output priority 0; policy accept;
    }
}
"""
        try:
            res = subprocess.run(["pkexec", "nft", "-f", "-"], input=ruleset, capture_output=True, text=True, shell=False)
            if res.returncode == 0:
                conf = self._load_config()
                conf["enabled"] = True
                self._save_config(conf)
                return True, "Güvenlik duvarı başarıyla etkinleştirildi."
            return False, f"Hata: {res.stderr}"
        except subprocess.CalledProcessError as e:
            return False, f"Hata oluştu: {e.stderr}"
        except Exception as e:
            return False, str(e)

    def disable_firewall(self) -> tuple:
        """Güvenlik duvarını devre dışı bırakır."""
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

    def apply_preset(self, preset_name) -> tuple:
        """Önceden tanımlanmış kural setlerinden birini uygular."""
        if not self.is_enabled():
            self.enable_firewall()
            
        try:
            subprocess.run(["pkexec", "nft", "flush", "chain", "inet", "dolunay_fw", "input_filter"], capture_output=True, text=True, shell=False)
            subprocess.run(["pkexec", "nft", "flush", "chain", "inet", "dolunay_fw", "output_filter"], capture_output=True, text=True, shell=False)
            
            subprocess.run(["pkexec", "nft", "add", "rule", "inet", "dolunay_fw", "input_filter", "iifname", "lo", "accept"], capture_output=True, text=True, shell=False)
            
            if preset_name == "paranoid":
                # Drop all incoming (already policy), Drop all outgoing (change policy)
                subprocess.run(["pkexec", "nft", "chain", "inet", "dolunay_fw", "output_filter", "{", "policy", "drop;", "}"], capture_output=True, text=True, shell=False)
            elif preset_name == "strict":
                subprocess.run(["pkexec", "nft", "chain", "inet", "dolunay_fw", "output_filter", "{", "policy", "drop;", "}"], capture_output=True, text=True, shell=False)
                subprocess.run(["pkexec", "nft", "add", "rule", "inet", "dolunay_fw", "input_filter", "ct", "state", "established,related", "accept"], capture_output=True, text=True, shell=False)
                subprocess.run(["pkexec", "nft", "add", "rule", "inet", "dolunay_fw", "output_filter", "udp", "dport", "53", "accept"], capture_output=True, text=True, shell=False)
                subprocess.run(["pkexec", "nft", "add", "rule", "inet", "dolunay_fw", "output_filter", "tcp", "dport", "53", "accept"], capture_output=True, text=True, shell=False)
            elif preset_name == "standard":
                subprocess.run(["pkexec", "nft", "chain", "inet", "dolunay_fw", "output_filter", "{", "policy", "drop;", "}"], capture_output=True, text=True, shell=False)
                subprocess.run(["pkexec", "nft", "add", "rule", "inet", "dolunay_fw", "input_filter", "ct", "state", "established,related", "accept"], capture_output=True, text=True, shell=False)
                for p in ["53", "80", "443"]:
                    subprocess.run(["pkexec", "nft", "add", "rule", "inet", "dolunay_fw", "output_filter", "tcp", "dport", p, "accept"], capture_output=True, text=True, shell=False)
                    subprocess.run(["pkexec", "nft", "add", "rule", "inet", "dolunay_fw", "output_filter", "udp", "dport", p, "accept"], capture_output=True, text=True, shell=False)
            elif preset_name == "minimal":
                subprocess.run(["pkexec", "nft", "chain", "inet", "dolunay_fw", "input_filter", "{", "policy", "accept;", "}"], capture_output=True, text=True, shell=False)
                subprocess.run(["pkexec", "nft", "chain", "inet", "dolunay_fw", "output_filter", "{", "policy", "accept;", "}"], capture_output=True, text=True, shell=False)
            else:
                return False, "Bilinmeyen preset adı."
                
            return True, f"{preset_name} profili başarıyla uygulandı."
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
        if not self.is_enabled():
            self.enable_firewall()
        
        try:
            subprocess.run(["pkexec", "nft", "insert", "rule", "inet", "dolunay_fw", "input_filter", "position", "0", "iifname", "!=", "lo", "drop"], capture_output=True, text=True, shell=False)
            subprocess.run(["pkexec", "nft", "insert", "rule", "inet", "dolunay_fw", "output_filter", "position", "0", "oifname", "!=", "lo", "drop"], capture_output=True, text=True, shell=False)
            return True, "Sadece localhost kısıtlaması etkinleştirildi."
        except Exception as e:
            return False, str(e)

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
