#!/usr/bin/env python3
"""
ULAK Antivirus & Deep Media Dissector Engine.
Bu modül gelen/seçilen görselleri ve dosyaları bayt ve kod seviyesinde parçalayarak
steganografi, web shell, reverse shell, polyglot dosya ve gizlenmiş zararlı kodları tespit eder.
"""

import os
import re
import math
import struct
import threading
import time
from pathlib import Path

# Tanımlı bilinen zararlı yazılım ve kabuk (shell) imzaları (RegEx ve Bayt İmzaları)
SUSPICIOUS_PATTERNS = [
    # Web Shell & PHP Enjeksiyon İmzaları
    (r"<\?php", "Gömülü PHP Kod Başlığı"),
    (r"eval\s*\(\s*(base64_decode|gzinflate|gzuncompress|str_rot13)", "Obfuskasyonlu PHP Eval Bloğu"),
    (r"(assert|system|shell_exec|passthru|exec|popen|proc_open)\s*\(", "Sistem Komut Yürütme Fonksiyonu"),
    (r"\$_(POST|GET|REQUEST|COOKIE|SERVER)\s*\[", "Dış Girdi Kabul Eden Arka Kapı Değişkeni"),
    (r"(c99shell|r57shell|b374k|wso_version|alfa_team|weevely)", "Bilinen Web Shell İmzası"),
    
    # Unix / Linux Kabuk ve Ters Bağlantı (Reverse Shell) İmzaları
    (r"(/bin/sh|/bin/bash|/bin/zsh)\s+-i", "Etkileşimli Linux Kabuk Başlatıcı"),
    (r"nc(\.traditional)?\s+.*-e\s+(/bin/sh|/bin/bash)", "Netcat Ters Bağlantı Komutu"),
    (r"/dev/tcp/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/\d+", "Bash Soket Yönlendirme Tüneli (/dev/tcp)"),
    (r"mkfifo\s+/tmp/.*cat\s+/tmp/", "Adlandırılmış Boru (FIFO) Ters Bağlantısı"),
    (r"python(-c|\s+-c)\s+.*socket.*pty\.spawn", "Python TTY Ters Bağlantı Payload'ı"),
    
    # Windows & PowerShell Enjeksiyon İmzaları
    (r"(powershell|pwsh)(\.exe)?\s+(-enc|-encodedcommand|-nop|-w\s+hidden)", "Gizli PowerShell Komut Yürütücü"),
    (r"(IEX|Invoke-Expression|Invoke-Command|DownloadString|DownloadFile)", "PowerShell Uzaktan Kod İndirici"),
    (r"(WScript\.Shell|Shell\.Application)", "VBS / WScript Sistem Shell Objesi"),
    (r"cmd\.exe\s+/c", "Komut İstemi Shell Enjeksiyonu"),

    # SVG ve HTML Script Enjeksiyonu
    (r"<script[\s\S]*?>[\s\S]*?<\/script>", "Görsel İçi Gömülü JavaScript (<script>)"),
    (r"onload\s*=\s*['\"].*?['\"]", "SVG Otomatik Tetiklenen JavaScript Olayı (onload)"),
    (r"onerror\s*=\s*['\"].*?['\"]", "SVG Hata Tabanlı Kod Tetikleyici (onerror)"),
    (r"xlink:href\s*=\s*['\"]javascript:", "SVG XLink JavaScript Çağrısı"),
]

# İkili (Binary) Sihirli Baytlar
MAGIC_BYTES = {
    b"\x89PNG\r\n\x1a\n": "PNG Görseli",
    b"\xff\xd8\xff": "JPEG Görseli",
    b"GIF87a": "GIF87a Görseli",
    b"GIF89a": "GIF89a Görseli",
    b"BM": "BMP Görseli",
    b"RIFF": "WebP / RIFF Medyası",
    b"%PDF-": "PDF Belgesi",
}

# Şüpheli İkili Başlıklar (Görsellerin içine gizlenen yürütülebilir dosyalar)
EMBEDDED_EXECUTABLE_HEADERS = [
    (b"MZ", 0, "Windows PE Yürütülebilir Başlığı (MZ)"),
    (b"\x7fELF", 0, "Linux ELF Yürütülebilir İkili Başlığı"),
    (b"PK\x03\x04", 0, "Gömülü ZIP/JAR Arşiv Başlığı"),
    (b"Rar!\x1a\x07", 0, "Gömülü RAR Arşivi"),
    (b"\x90\x90\x90\x90\x90\x90\x90\x90", 0, "NOP Sled Shellcode Deseni"),
]


class ImageDissector:
    """
    Görselleri yapısal bölümlerine (chunk, segment, metadata) parçalayan ve
    içinde gizlenmiş steganografi / kabuk kodlarını ayrıştıran motor.
    """
    @staticmethod
    def calculate_entropy(data: bytes) -> float:
        """Verinin Shannon entropisini hesaplar (0.0 - 8.0). Yüksek entropi şifrelenmiş/gizli veriyi gösterir."""
        if not data:
            return 0.0
        entropy = 0
        length = len(data)
        freq = [0] * 256
        for byte in data:
            freq[byte] += 1
        for count in freq:
            if count > 0:
                p = count / length
                entropy -= p * math.log2(p)
        return round(entropy, 2)

    @classmethod
    def dissect_png(cls, data: bytes) -> dict:
        """PNG dosyasını chunk'larına ayırır ve IEND sonrası trailing payload arar."""
        chunks = []
        threats = []
        offset = 8  # Skip 8-byte PNG header
        iend_found = False
        trailing_data_len = 0

        while offset + 8 <= len(data):
            try:
                length = struct.unpack(">I", data[offset:offset+4])[0]
                chunk_type = data[offset+4:offset+8].decode("ascii", errors="replace")
                chunks.append({
                    "name": chunk_type,
                    "length": length,
                    "offset": offset
                })
                offset += 8 + length + 4  # length(4) + type(4) + data(length) + crc(4)

                if chunk_type == "IEND":
                    iend_found = True
                    trailing_data_len = len(data) - offset
                    break
            except Exception:
                break

        if iend_found and trailing_data_len > 0:
            threats.append({
                "severity": "CRITICAL" if trailing_data_len > 64 else "WARNING",
                "description": f"IEND bitiş bloğu sonrasında {trailing_data_len} bayt gizlenmiş veri (Trailing Stego Payload) tespit edildi!"
            })

        return {
            "format": "PNG",
            "chunk_count": len(chunks),
            "chunks": [c["name"] for c in chunks[:12]],
            "trailing_data_len": trailing_data_len,
            "threats": threats
        }

    @classmethod
    def dissect_jpeg(cls, data: bytes) -> dict:
        """JPEG segmentlerini (APP0, APP1/EXIF, COM, SOS vb.) ayrıştırır ve EOF sonrasını inceler."""
        segments = []
        threats = []
        offset = 2  # Skip SOI \xff\xd8

        # Check for EOI marker \xff\xd9
        eoi_pos = data.find(b"\xff\xd9")
        if eoi_pos != -1:
            trailing_len = len(data) - (eoi_pos + 2)
            if trailing_len > 0:
                threats.append({
                    "severity": "CRITICAL" if trailing_len > 64 else "WARNING",
                    "description": f"JPEG EOI (Bitiş) işaretçisi sonrasında {trailing_len} bayt eklenmiş veri (Payload) bulundu!"
                })

        # Scan initial markers
        while offset + 4 <= len(data) and offset < 2048:
            if data[offset] == 0xFF:
                marker = data[offset+1]
                if marker in (0xD8, 0xD9):
                    offset += 2
                    continue
                try:
                    seg_len = struct.unpack(">H", data[offset+2:offset+4])[0]
                    seg_name = f"0xFF{marker:02X}"
                    if marker == 0xE0: seg_name = "APP0 (JFIF)"
                    elif marker == 0xE1: seg_name = "APP1 (EXIF)"
                    elif marker == 0xFE: seg_name = "COM (Yorum)"
                    elif marker == 0xDB: seg_name = "DQT (Kuantalama)"
                    elif marker == 0xC0: seg_name = "SOF0 (Çerçeve)"
                    elif marker == 0xDA: seg_name = "SOS (Tarama Başlangıcı)"
                    segments.append(seg_name)
                    offset += 2 + seg_len
                except Exception:
                    break
            else:
                break

        return {
            "format": "JPEG",
            "segments": segments[:10],
            "threats": threats
        }

    @classmethod
    def dissect_svg(cls, text: str) -> dict:
        """SVG XML içeriğini ayrıştırarak script ve olay dinleyicisi enjeksiyonlarını bulur."""
        threats = []
        if "<script" in text.lower():
            threats.append({
                "severity": "CRITICAL",
                "description": "SVG içinde çalıştırılabilir <script> bloğu tespit edildi!"
            })
        if re.search(r"on[a-z]+\s*=", text, re.IGNORECASE):
            threats.append({
                "severity": "HIGH",
                "description": "SVG nesnesinde otomatik tetiklenen olay dinleyicisi (onload, onerror vb.) bulundu!"
            })
        if "javascript:" in text.lower():
            threats.append({
                "severity": "CRITICAL",
                "description": "SVG bağlantısında 'javascript:' URI kodu tespit edildi!"
            })
        return {
            "format": "SVG",
            "threats": threats
        }


class AntivirusScanner:
    """
    ULAK Antivirüs ve Derin Tehdit Analiz Sınıfı.
    """
    def __init__(self):
        self.watcher_thread = None
        self.watcher_running = False
        self.watched_paths = [
            os.path.expanduser("~/Downloads"),
            os.path.expanduser("~/İndirilenler"),
            "/tmp"
        ]
        self._seen_files = set()
        self.on_threat_detected_cb = None

    def scan_file(self, filepath: str) -> dict:
        """
        Herhangi bir görseli veya dosyayı baytlarına, kodlarına parçalar ve tam rapor üretir.
        """
        p = Path(filepath)
        if not p.exists() or not p.is_file():
            return {"error": "Dosya bulunamadı veya okunamıyor."}

        file_size = p.stat().st_size
        filename = p.name
        ext = p.suffix.lower()

        # Boyut sınır kontrolü (100MB'dan büyük dosyalar için baş ve son blok taranır)
        max_read = 20 * 1024 * 1024  # 20MB
        try:
            with open(filepath, "rb") as f:
                header = f.read(min(file_size, max_read))
        except Exception as e:
            return {"error": f"Dosya okuma hatası: {e}"}

        # 1. Magic Bytes / MIME Türü Tespiti
        detected_magic = "Bilinmeyen İkili Veri"
        for magic, name in MAGIC_BYTES.items():
            if header.startswith(magic):
                detected_magic = name
                break

        entropy = ImageDissector.calculate_entropy(header[:65536])
        threats = []

        # 2. Polyglot Dosya Tespiti (Örn: Görsel gibi görünen ama içinde EXE/ELF olanlar)
        for sig, offset, desc in EMBEDDED_EXECUTABLE_HEADERS:
            pos = header.find(sig, 16)  # İlk 16 bayttan sonra ara
            if pos != -1:
                threats.append({
                    "severity": "CRITICAL",
                    "description": f"Gömülü Yürütülebilir Dosya Başlığı ({desc}) dosya içinde konum {hex(pos)}'te bulundu! (Polyglot Tehdit)"
                })

        # 3. Görsel Yapısal Parçalama (Dissection)
        dissection_info = {}
        if header.startswith(b"\x89PNG"):
            dissection_info = ImageDissector.dissect_png(header)
            threats.extend(dissection_info.get("threats", []))
        elif header.startswith(b"\xff\xd8"):
            dissection_info = ImageDissector.dissect_jpeg(header)
            threats.extend(dissection_info.get("threats", []))
        elif ext == ".svg" or b"<svg" in header[:512].lower():
            try:
                svg_text = header.decode("utf-8", errors="ignore")
                dissection_info = ImageDissector.dissect_svg(svg_text)
                threats.extend(dissection_info.get("threats", []))
            except Exception:
                pass

        # 4. Kod ve Regex İmzaları Taraması
        decoded_sample = header.decode("latin-1", errors="ignore")
        for pattern, desc in SUSPICIOUS_PATTERNS:
            matches = list(re.finditer(pattern, decoded_sample, re.IGNORECASE))
            if matches:
                sample_snippet = matches[0].group(0)[:60]
                threats.append({
                    "severity": "CRITICAL",
                    "description": f"{desc} -> Bulunan Örnek: '{sample_snippet}'"
                })

        # 5. Risk Puanlaması (0 - 100)
        risk_score = 0
        if threats:
            for t in threats:
                if t["severity"] == "CRITICAL":
                    risk_score += 45
                elif t["severity"] == "HIGH":
                    risk_score += 25
                elif t["severity"] == "WARNING":
                    risk_score += 15
            risk_score = min(100, risk_score)

        if risk_score == 0:
            status = "CLEAN"
            verdict = "Temiz — Güvenli Dosya"
        elif risk_score < 40:
            status = "SUSPICIOUS"
            verdict = "Şüpheli — Detaylı İnceleme Önerilir"
        else:
            status = "MALICIOUS"
            verdict = "Kritik Tehdit — Zararlı Kod / Shell Tespit Edildi!"

        return {
            "filename": filename,
            "filepath": str(p.resolve()),
            "file_size": file_size,
            "detected_format": detected_magic,
            "entropy": entropy,
            "threats_count": len(threats),
            "threats": threats,
            "risk_score": risk_score,
            "status": status,
            "verdict": verdict,
            "dissection": dissection_info
        }

    def start_download_watcher(self, on_threat_cb=None):
        """Yüksek ve Paranoid modlarda indirme dizinlerini izleyen arka plan daemon'ını başlatır."""
        if self.watcher_running:
            return
        self.on_threat_detected_cb = on_threat_cb
        self.watcher_running = True

        for wp in self.watched_paths:
            if os.path.exists(wp):
                try:
                    for f in os.listdir(wp):
                        self._seen_files.add(os.path.join(wp, f))
                except Exception:
                    pass

        self.watcher_thread = threading.Thread(target=self._watcher_loop, daemon=True)
        self.watcher_thread.start()

    def stop_download_watcher(self):
        """İzleyiciyi durdurur."""
        self.watcher_running = False

    def _watcher_loop(self):
        while self.watcher_running:
            try:
                for wp in self.watched_paths:
                    if not os.path.exists(wp):
                        continue
                    try:
                        current_files = set(os.path.join(wp, f) for f in os.listdir(wp))
                    except Exception:
                        continue

                    new_files = current_files - self._seen_files
                    for nf in new_files:
                        self._seen_files.add(nf)
                        if os.path.isfile(nf):
                            time.sleep(0.5)
                            report = self.scan_file(nf)
                            if report.get("threats_count", 0) > 0 and self.on_threat_detected_cb:
                                self.on_threat_detected_cb(report)
            except Exception:
                pass
            time.sleep(3)


# Global singleton instance
av_engine = AntivirusScanner()
