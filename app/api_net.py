# -*- coding: utf-8 -*-
"""
ULAK - Ağ & Soket Motoru (NetAPI)

"Ağ & Port Takipçisi" modülünün gerçek sistem verisi katmanı.

Felsefe: Bu modül ÖLÇEMEDİĞİ hiçbir değeri uydurmaz. Bir okuma yapılamıyorsa
None / boş liste döndürür ve UI buna göre "bilinmiyor" gösterir.
(Karşılaştırma: eski sürümde %96 güvenlik skoru ve 6.4 MB/s sabit yazılıydı.)

Veri kaynakları:
  - psutil.net_connections()  -> soketler + PID
  - ss -tulnp                 -> soketler + proses adı (root yoksa psutil PID'leri eksik kalır)
  - /etc/services             -> port -> servis adı çözümlemesi
  - psutil.net_io_counters()  -> arayüz bazlı gerçek bayt sayaçları (iki örneklem arası fark)
  - api_firewall.fw_api       -> güvenlik duvarı durumu, kural yazma, bugünkü blok sayısı
"""

import re
import time
import threading
import subprocess

try:
    import psutil
except ImportError:  # psutil bu projenin zorunlu bağımlılığıdır (main.py, api_firewall.py)
    psutil = None

from api_firewall import fw_api


class NetAPI:
    WILDCARD_ADDRS = ("0.0.0.0", "::", "*", "[::]", "[*]", "")
    # Sistem servisleri: bunlar "bilinmeyen/şüpheli servis" sayılmaz
    TRUSTED_PROCESSES = (
        "systemd-resolved", "avahi-daemon", "cupsd", "sshd", "dbus-daemon",
        "NetworkManager", "chronyd", "systemd", "snapd", "colord", "gvfsd",
        "xdg-desktop-portal", "pipewire", "pulseaudio", "wireplumber", "polkitd",
    )

    def __init__(self):
        self._service_map = None
        self._lock = threading.Lock()

    # ------------------------------------------------------------------ #
    # Servis veritabanı (/etc/services)
    # ------------------------------------------------------------------ #
    def _load_service_map(self):
        if self._service_map is not None:
            return self._service_map
        mapping = {}
        try:
            with open("/etc/services", "r", errors="replace") as fh:
                for line in fh:
                    if not line.strip() or line.startswith("#"):
                        continue
                    parts = line.split("#")[0].split()
                    if len(parts) < 2 or "/" not in parts[1]:
                        continue
                    name, spec = parts[0], parts[1]
                    try:
                        port = int(spec.split("/", 1)[0])
                    except ValueError:
                        continue
                    mapping.setdefault(port, name)  # aynı portun ilk (otoriter) adını koru
        except Exception:
            pass
        self._service_map = mapping
        return mapping

    def service_name(self, port):
        return self._load_service_map().get(port, "")

    # ------------------------------------------------------------------ #
    # Adres yardımcıları
    # ------------------------------------------------------------------ #
    @staticmethod
    def split_addr(addr):
        """'127.0.0.1:22' | '[::1]:22' | '*:80' -> (ip, port)"""
        a = (addr or "").strip()
        if not a:
            return "", 0
        if a.startswith("["):
            end = a.find("]")
            if end == -1:
                return a, 0
            ip = a[1:end]
            port_s = a[end + 1:].lstrip(":")
        else:
            ip, _, port_s = a.rpartition(":")
        ip = ip.split("%")[0]
        port_s = port_s.split("%")[0]
        try:
            return (ip or "*"), int(port_s)
        except ValueError:
            return (ip or "*"), 0

    def classify_scope(self, ip):
        """loopback (sadece kendi makinen) | wildcard (tüm arayüzlere açık) | interface"""
        ip = (ip or "").strip()
        if ip.startswith("::ffff:"):
            ip = ip.split("::ffff:", 1)[1]
        if ip.startswith("127.") or ip == "::1":
            return "loopback"

    # ------------------------------------------------------------------ #
    # Soket toplama
    # ------------------------------------------------------------------ #
    def _sockets_from_ss(self):
        """`ss -tulnp` çıktısını ayrıştırır. Komut yoksa boş liste döner."""
        try:
            res = subprocess.run(["ss", "-tulnp"], capture_output=True, text=True,
                                 shell=False, timeout=8)
            if res.returncode != 0:
                return []
        except Exception:
            return []

        out = []
        for line in res.stdout.splitlines():
            fields = line.split()
            if len(fields) < 5 or fields[0] not in ("tcp", "udp"):
                continue
            proto = fields[0]
            ip, port = self.split_addr(fields[4])
            if not port:
                continue
            pid, pname = None, ""
            proc_blob = " ".join(fields[6:]) if len(fields) > 6 else ""
            m = re.search(r'\(\("([^"]+)",pid=(\d+)', proc_blob)
            if m:
                pname, pid = m.group(1), int(m.group(2))
            out.append({"proto": proto, "ip": ip, "port": port, "pid": pid, "pname": pname})
        return out

    def _listen_pids_from_psutil(self):
        """(proto, ip, port) -> pid eşlemesi. Root yokken AccessDenied olur: sessiz geçilir."""
        pid_map = {}
        if psutil is None:
            return pid_map
        try:
            for conn in psutil.net_connections(kind="inet"):
                laddr = conn.laddr
                if not laddr or not getattr(laddr, "port", 0):
                    continue
                proto = "tcp" if conn.type == getattr(psutil, "SOCK_STREAM", 1) else "udp"
                pid_map.setdefault((proto, laddr.ip, laddr.port), conn.pid)
        except Exception:
            pass
        return pid_map

    def _sockets_from_psutil(self):
        """psutil yedek kanalı (ss kurulu değilse)."""
        if psutil is None:
            return []
        out = []
        try:
            for conn in psutil.net_connections(kind="inet"):
                laddr = conn.laddr
                if not laddr or not getattr(laddr, "port", 0):
                    continue
                if conn.status not in ("LISTEN", "NONE", "UNCONN", ""):
                    continue
                proto = "tcp" if conn.type == getattr(psutil, "SOCK_STREAM", 1) else "udp"
                pname = ""
                if conn.pid:
                    try:
                        pname = psutil.Process(conn.pid).name()
                    except Exception:
                        pname = ""
                out.append({"proto": proto, "ip": laddr.ip, "port": laddr.port,
                            "pid": conn.pid, "pname": pname})
        except Exception:
            pass
        return out

    @staticmethod
    def _pid_name(pid, fallback=""):
        if fallback:
            return fallback
        if psutil is None or not pid:
            return ""
        try:
            return psutil.Process(pid).name()
        except Exception:
            return ""

    def get_listening_sockets(self):
        """
        Dinleyen tüm TCP/UDP soketleri. Her öge:
          proto, ip, port, pid, pname, service, scope, exposed, risky, note
        Kaynak: ss (proses adı için) + psutil (PID yaması / yedek kanal).
        """
        with self._lock:
            rows = self._sockets_from_ss()
            pid_map = self._listen_pids_from_psutil()
            if not rows:
                rows = self._sockets_from_psutil()
            else:
                for r in rows:
                    if not r.get("pid"):
                        r["pid"] = pid_map.get((r["proto"], r["ip"], r["port"]))

            svc = self._load_service_map()
            merged = {}
            for r in rows:
                key = (r["proto"], r["ip"], r["port"], r.get("pid"))
                if key in merged:  # ss aynı servisi v4/v6 veya çok fd için tekrarlar
                    continue
                scope = self.classify_scope(r["ip"])
                pname = self._pid_name(r.get("pid"), r.get("pname", ""))
                service = svc.get(r["port"], "")
                trusted = any(t in (pname or "") for t in self.TRUSTED_PROCESSES)
                exposed = scope in ("wildcard", "interface")
                # Risk: dışa açık + bilinen servis adı olmayan + sistem servisi olmayan
                risky = exposed and not service and not trusted
                if risky:
                    note = "Dışa açık, servis adı bilinmiyor"
                elif exposed and not trusted:
                    note = "Dışa açık kullanıcı süreci"
                elif exposed:
                    note = "Dışa açık sistem servisi"
                else:
                    note = "Yalnızca yerel (loopback)"

    # ------------------------------------------------------------------ #
    # Güvenlik skoru — uydurulmaz, hesaplanır
    # ------------------------------------------------------------------ #
    def _failed_login_count_24h(self):
        """journalctl'den 24 saatlik başarısız giriş denemesi. Günlük yoksa None."""
        try:
            res = subprocess.run(
                ["journalctl", "-u", "sshd", "-u", "ssh", "--since", "yesterday",
                 "--no-pager", "--grep", "Failed password"],
                capture_output=True, text=True, shell=False, timeout=15)
            if res.returncode not in (0, 1):  # 1 = eşleşme yok
                return None
            return len([l for l in res.stdout.splitlines() if l.strip()])
        except Exception:
            return None

    def compute_security_score(self, sockets=None):
        """
        0-100 arası GERÇEK bir skor + gerekçeleri.
        Not: fw_api.get_failed_logins() içindeki regex bozuk (escape hatası) olduğu için
        başarısız giriş sayısını burada kendi ayrıştırmamızla alıyoruz.
        """
        if sockets is None:
            sockets = self.get_listening_sockets()

        score = 100
        reasons = []

        exposed = [s for s in sockets if s["exposed"]]
        risky = [s for s in sockets if s["risky"]]

        if risky:
            pen = min(48, len(risky) * 12)
            score -= pen
            reasons.append(("Dışa açık, kimliği bilinmeyen %d servis" % len(risky), -pen))
        if exposed:
            pen = min(24, len(exposed) * 4)
            score -= pen
            reasons.append(("Arayüze bağlı %d dinleyen soket" % len(exposed), -pen))

        fw_ok, fw_enabled, _err = self.firewall_status()
        if not fw_ok:
            reasons.append(("Güvenlik duvarı durumu okunamadı (nft erişilemiyor)", 0))
        elif not fw_enabled:
            score -= 25
            reasons.append(("Güvenlik duvarı devre dışı", -25))
        else:
            reasons.append(("Güvenlik duvarı etkin", 0))

        fails = self._failed_login_count_24h()
        if fails:
            pen = min(20, fails)
            score -= pen
            reasons.append(("Son 24 saatte %d başarısız giriş denemesi" % fails, -pen))
        elif fails == 0:
            reasons.append(("Son 24 saatte başarısız giriş yok", 0))

        try:
            blocked = fw_api.get_blocked_count_today()
            if blocked:
                reasons.append(("Bugün engellenen paket: %d" % blocked, 0))
        except Exception:
            pass

        score = max(5, min(100, score))
        if score >= 90:
            label, color = "Güvenli", "#10b981"
        elif score >= 70:
            label, color = "İyi, birkaç nokta var", "#84cc16"
        elif score >= 50:
            label, color = "Dikkatli olunmalı", "#f59e0b"
        else:
            label, color = "Riskli", "#ef4444"

        return {"score": score, "label": label, "color": color, "reasons": reasons,
                "exposed_count": len(exposed), "risky_count": len(risky),
                "total": len(sockets), "fw_enabled": fw_enabled if fw_ok else None,
                "failed_logins_24h": fails}

    def firewall_status(self):
        """(ok, enabled, hata_mesaji) — ok=False ise durum BİLİNMİYOR demektir."""
        try:
            return True, bool(fw_api.is_enabled()), ""
        except Exception as e:
            return False, False, str(e)

    # ------------------------------------------------------------------ #
    # Port kapatma — gerçekten kural yazar (pkexec ile root ister)
    # ------------------------------------------------------------------ #
    def close_port(self, port, protocol="tcp"):
        try:
            ok, msg = fw_api.add_rule("input", protocol, str(port), "", "drop",
                                      "ULAK Ag Port Takipcisi")
            return bool(ok), msg
        except Exception as e:
            return False, str(e)

                merged[key] = {
                    "proto": r["proto"], "ip": r["ip"], "port": r["port"],
                    "pid": r.get("pid"), "pname": pname or "Bilinmiyor",
                    "service": service, "scope": scope, "exposed": exposed,
                    "risky": risky, "note": note,
                }
            # Dışa açıklıklar üstte, sonra port numarası
            return sorted(merged.values(),
                          key=lambda s: (not s["risky"], not s["exposed"], s["port"]))

        if ip in self.WILDCARD_ADDRS:
            return "wildcard"
        return "interface"
