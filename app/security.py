import os
import hashlib
import json
import pathlib
import binascii

class DolunaySecurity:
    """
    Dolunay LnxKit tersine mühendislik ve kurcalama koruması (anti-tamper) modülü.
    Çalışma zamanı (runtime) güvenlik kontrolleri sağlar.
    """
    DEFAULT_KEY = b"dolunay_lnxkit_secret_key_1337"
    MANIFEST_PATH = pathlib.Path.home() / ".config" / "dolunay" / "integrity.json"

    def check_debugger(self) -> bool:
        """
        Sisteme bir hata ayıklayıcı (debugger) bağlı olup olmadığını kontrol eder.
        
        Returns:
            bool: Hata ayıklayıcı bağlıysa True, değilse False döner.
        """
        try:
            with open("/proc/self/status", "r") as f:
                for line in f:
                    if line.startswith("TracerPid:"):
                        pid = int(line.split()[1])
                        if pid != 0:
                            return True
            
            # Ayrıca kendisini başlatan yürütülebilir dosyaya da bakabiliriz (isteğe bağlı)
            exe_path = os.readlink("/proc/self/exe")
            if "gdb" in exe_path or "strace" in exe_path or "ltrace" in exe_path:
                return True
                
        except Exception:
            # Hata durumunda güvenli varsay
            pass
            
        return False

    def verify_integrity(self, file_paths: list) -> bool:
        """
        Belirtilen dosyaların bütünlüğünü, önceden kaydedilmiş SHA-256 hash'leri ile doğrular.
        
        Args:
            file_paths (list): Kontrol edilecek dosya yolları listesi.
            
        Returns:
            bool: Bütünlük korunmuşsa True, dosyalarda değişiklik varsa False döner.
        """
        try:
            if not self.MANIFEST_PATH.exists():
                return True  # Manifest yoksa kontrol yapamıyoruz, güvenli varsay

            with open(self.MANIFEST_PATH, "r") as f:
                manifest = json.load(f)

            for file_path in file_paths:
                path_str = str(file_path)
                if path_str not in manifest:
                    continue
                
                if not os.path.exists(path_str):
                    return False
                    
                sha256_hash = hashlib.sha256()
                with open(path_str, "rb") as f:
                    for byte_block in iter(lambda: f.read(4096), b""):
                        sha256_hash.update(byte_block)
                
                if sha256_hash.hexdigest() != manifest[path_str]:
                    return False
                    
            return True
        except Exception:
            return True

    def generate_integrity_manifest(self, file_paths: list):
        """
        Belirtilen dosyalar için SHA-256 bütünlük manifestosu oluşturur ve kaydeder.
        
        Args:
            file_paths (list): Hash'i alınacak dosya yolları listesi.
        """
        try:
            self.MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
            manifest = {}
            
            for file_path in file_paths:
                path_str = str(file_path)
                if os.path.exists(path_str):
                    sha256_hash = hashlib.sha256()
                    with open(path_str, "rb") as f:
                        for byte_block in iter(lambda: f.read(4096), b""):
                            sha256_hash.update(byte_block)
                    manifest[path_str] = sha256_hash.hexdigest()
            
            with open(self.MANIFEST_PATH, "w") as f:
                json.dump(manifest, f, indent=4)
        except Exception:
            pass

    def check_environment(self) -> bool:
        """
        Çalışma ortamında (sistemde çalışan işlemler arasında) bilinen araçların 
        (strace, ltrace, frida-server vb.) olup olmadığını kontrol eder.
        
        Returns:
            bool: Ortam temizse True, bilinen zararlı/izleme araçları varsa False döner.
        """
        suspicious_tools = {"strace", "ltrace", "frida-server", "frida", "gdb", "radare2", "ida"}
        
        try:
            for pid_dir in os.listdir("/proc"):
                if not pid_dir.isdigit():
                    continue
                    
                comm_path = f"/proc/{pid_dir}/comm"
                if os.path.exists(comm_path):
                    try:
                        with open(comm_path, "r") as f:
                            comm_name = f.read().strip()
                            if comm_name in suspicious_tools:
                                return False
                    except (IOError, PermissionError):
                        continue
        except Exception:
            pass
            
        return True

    def encrypt_string(self, data: str, key: bytes = None) -> str:
        """
        Hassas verileri XOR tabanlı şifreler ve hexadecimal formata çevirir.
        
        Args:
            data (str): Şifrelenecek metin.
            key (bytes, optional): Kullanılacak anahtar. None ise varsayılan kullanılır.
            
        Returns:
            str: Hex kodlanmış şifreli metin.
        """
        try:
            if not data:
                return ""
                
            key = key or self.DEFAULT_KEY
            data_bytes = data.encode("utf-8")
            
            encrypted_bytes = bytearray(
                b ^ key[i % len(key)] for i, b in enumerate(data_bytes)
            )
            return binascii.hexlify(encrypted_bytes).decode("utf-8")
        except Exception:
            return ""

    def decrypt_string(self, encrypted: str, key: bytes = None) -> str:
        """
        XOR tabanlı şifrelenmiş hexadecimal metni çözer.
        
        Args:
            encrypted (str): Hex kodlu şifreli metin.
            key (bytes, optional): Çözme anahtarı. None ise varsayılan kullanılır.
            
        Returns:
            str: Çözülmüş orijinal metin.
        """
        try:
            if not encrypted:
                return ""
                
            key = key or self.DEFAULT_KEY
            encrypted_bytes = binascii.unhexlify(encrypted)
            
            decrypted_bytes = bytearray(
                b ^ key[i % len(key)] for i, b in enumerate(encrypted_bytes)
            )
            return decrypted_bytes.decode("utf-8")
        except Exception:
            return ""

    def run_all_checks(self, check_files: list = None) -> dict:
        """
        Tüm güvenlik kontrollerini çalıştırır ve sonuçlarını döner.
        
        Args:
            check_files (list, optional): Bütünlük kontrolü yapılacak dosyalar.
            
        Returns:
            dict: Kontrol sonuçlarını içeren sözlük.
        """
        if check_files is None:
            check_files = []
            
        return {
            "debugger_detected": self.check_debugger(),
            "environment_clean": self.check_environment(),
            "integrity_verified": self.verify_integrity(check_files)
        }

# Singleton instance
security_guard = DolunaySecurity()
