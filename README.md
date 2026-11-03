# 🛡️ ULAK - Ağ, Donanım ve Güvenlik İstasyonu
### *Next-Gen Multi-Platform Network, Hardware & Security Station*

<p align="center">
  <img src="assets/ulak_logo.png" alt="ULAK Logo" width="140" />
</p>

<p align="center">
  <a href="https://github.com/Veysitasci/Ulak/releases"><img src="https://img.shields.io/github/v/release/Veysitasci/Ulak?style=for-the-badge&color=38bdf8&logo=github" alt="Latest Release" /></a>
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20Android-emerald?style=for-the-badge&logo=windows" alt="Platforms" />
  <img src="https://img.shields.io/badge/UI-Bento%20Grid%20%26%20Liquid%20Glass-blueviolet?style=for-the-badge" alt="UI Style" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-amber?style=for-the-badge" alt="License" /></a>
</p>

<p align="center">
  <a href="#-türkçe-tr">🇹🇷 Türkçe Dokümantasyon</a> &nbsp;•&nbsp; <a href="#-windows-sürümü-detayları">🪟 Windows Rehberi</a> &nbsp;•&nbsp; <a href="#-english-en">🇬🇧 English Documentation</a> &nbsp;•&nbsp; <a href="#-sürümler--releases">📦 İndir / Releases</a>
</p>

---

## 🇹🇷 Türkçe (TR)

**ULAK**, siber güvenlik uzmanları, sistem yöneticileri ve ileri düzey kullanıcılar için geliştirilmiş; modern **Bento Grid** ve **Canlı Sıvı Cam (Liquid Glassmorphism)** tasarımına sahip hepsi bir arada Ağ, Donanım ve Güvenlik İstasyonudur.

Hem **Windows (10/11)** hem de **Linux (Debian/Ubuntu/Kali/Pardus)** üzerinde yerel sistem API'leri ile tam entegre çalışır.

---

### 🌐 Desteklenen Platformlar

| Platform | Altyapı | Biçim / Format | Durum |
| :--- | :--- | :--- | :--- |
| **🪟 Windows** | Electron + Node.js + C# WPF Setup | `.exe` Özel Kurulum Sihirbazı & Portable | ✅ Kararlı (v2.5.0) |
| **🐧 Linux** | Python 3 + GTK3 / PyQt | `.deb` Paketi & APT Deposu | ✅ Kararlı (v2.5.0) |
| **🤖 Android** | Kotlin + Jetpack Compose | `.apk` Paketi | 📱 Aktif Geliştirme |

---

<h2 id="-windows-sürümü-detayları">🪟 ULAK Windows Sürümü</h2>

ULAK Windows sürümü (`ulak-windows`), Windows 10 ve Windows 11 için optimize edilmiş Electron çekirdeği ve C# WPF tabanlı özel kurulum altyapısına sahiptir.

### ✨ Windows'a Özel Yetenekler ve Modüller

1. **🎨 Bento Grid Liquid Glass Arayüzü:**
   - Windows 11 Akrilik (Acrylic), Mica ve bulanıklık (glassmorphism) efektleriyle modern karanlık/aydınlık tema motoru.
   - Akıcı animasyonlar, altın oranlı kart yerleşimleri ve özel CSD pencere kontrolleri.

2. **📡 Process Radar (Süreç Radarı):**
   - Windows üzerinde çalışan tüm işlemleri canlı bir radar ekranında görselleştirir.
   - Aşırı CPU/RAM tüketen veya şüpheli ağ trafiği oluşturan süreçleri tespit edip tek tıkla sonlandırma (`taskkill`).

3. **🦉 Masaüstü Koruyucu Asistanı (Desktop Pet):**
   - Masaüstünüzde serbestçe gezen, CPU, RAM ve Güvenlik Duvarı durumunuza göre animasyonlar sergileyen interaktif maskot (Baykuş / Güvercin).
   - Sistem yükü arttığında veya tehdit algılandığında kullanıcıyı görsel olarak uyarır.

4. **🛡️ Windows Defender & Güvenlik Duvarı Entegrasyonu:**
   - Windows Güvenlik Duvarı ile tam entegrasyon (`netsh advfirewall` & PowerShell).
   - Düşük, Orta, Yüksek ve **Paranoid** güvenlik seviyeleri.
   - Açık portları canlı tarama, yetkisiz gelen/giden bağlantıları engelleme.

5. **📶 Wi-Fi & Sanal Hotspot İstasyonu:**
   - Çevredeki kablosuz ağları tarama, sinyal kalitesi (RSSI) ve şifreleme analizi.
   - Windows'ta kayıtlı Wi-Fi şifrelerini görüntüleme.
   - Tek tıkla güvenli sanal **Wi-Fi Hotspot (Erişim Noktası)** oluşturma.

6. **🔒 Kripto Kasa & Steganografi:**
   - Hassas dosyalar için askeri düzeyde **AES-256-GCM** şifreleme.
   - **PNG Steganografi:** Gizli metin ve verileri resim piksellerine fark edilmeyecek şekilde gömme ve çıkarma.

7. **📦 WinGet Paket Yöneticisi & Sistem Temizleyici:**
   - Windows Package Manager (WinGet) ve Chocolatey üzerinden tek tıkla uygulama arama, yükleme ve kaldırma.
   - `%TEMP%`, Prefetch, Windows Update kalıntıları, DNS önbelleği (`FlushDNS`) ve çöp kutusu temizliği.

8. **🎥 Medya & YouTube İndirici:**
   - 4K video, yüksek kaliteli MP3 çıkarma, çalma listesi (playlist) indirme ve hız limiti kontrolü.

---

### 🚀 Windows Kurulumu

#### Yöntem 1: Hazır Kurulum Sihirbazı ile (.exe) - *Önerilen*
1. [Releases](https://github.com/Veysitasci/Ulak/releases) sayfasından en son **`ULAK-Setup-2.5.0.exe`** dosyasını indirin.
2. Özel arayüzlü C# WPF kurulum sihirbazını başlatın; uygulama otomatik olarak `%LocalAppData%\Programs\ULAK` dizinine kurulur ve masaüstü kısayolu oluşturulur.
3. Uygulama ile birlikte özel arayüzlü kaldırıcı (`uninstall.exe`) da gelir.

#### Yöntem 2: Kaynak Koddan Geliştirici Modunda Çalıştırma
```powershell
# 1. Depoyu klonlayın
git clone https://github.com/Veysitasci/Ulak.git
cd Ulak/ulak-windows

# 2. Bağımlılıkları yükleyin
npm install

# 3. Uygulamayı başlatın
npm start
```

#### Yöntem 3: Windows Kurulum Paketini (.exe) Kendi Başınıza Derleme
Kendi `setup.exe` kurulum paketinizi oluşturmak için:
```powershell
# Electron paketini oluşturun:
cd ulak-windows
npm run build-win

# Veya özel C# WPF Setup sihirbazını tek adımda derleyin:
cd ../packaging/windows
.\build_setup.bat
```

---

<h2 id="-linux-sürümü-detayları">🐧 ULAK Linux Sürümü</h2>

Linux sürümü, Debian, Ubuntu, Kali Linux ve Pardus dağıtımları için Python 3 ve GTK3/Qt mimarisiyle geliştirilmiştir.

### 🚀 Linux Kurulumu

#### 1. APT Deposu Üzerinden (Önerilen)
```bash
curl -sS https://veysitasci.github.io/Ulak/apt/public.key | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/ulak.gpg
echo "deb [signed-by=/etc/apt/trusted.gpg.d/ulak.gpg] https://veysitasci.github.io/Ulak/apt stable main" | sudo tee /etc/apt/sources.list.d/ulak.list
sudo apt update
sudo apt install ulak
```

#### 2. `.deb` Paketi ile
[Releases](https://github.com/Veysitasci/Ulak/releases) sayfasından en güncel `ulak_2.5.0_all.deb` paketini indirin:
```bash
sudo dpkg -i ulak_2.5.0_all.deb
sudo apt install -f
```

#### 3. Kaynak Koddan Çalıştırma
```bash
git clone https://github.com/Veysitasci/Ulak.git
cd Ulak
sudo ./install.sh
ulak
```

---

<h2 id="-english-en">🇬🇧 English (EN)</h2>

**ULAK** is an all-in-one Network, Hardware, and Security Station built for cybersecurity analysts, system administrators, and power users, featuring a high-aesthetic **Bento Grid** and **Liquid Glassmorphism** interface.

Supported natively on both **Windows 10/11** and **Linux (Debian/Ubuntu/Kali/Pardus)**.

### 🪟 Windows Specific Features
- **Bento Grid Liquid Glass UI:** Windows 11 Acrylic & Mica translucency themes with golden-ratio cards.
- **Process Radar:** Real-time circular radar scanning suspicious and resource-heavy background processes.
- **Desktop Companion (Pet):** Live animated mascot (Owl / Dove) reacting dynamically to CPU, RAM, and network status.
- **Windows Firewall Integration:** Native `netsh advfirewall` controls, socket inspection, and Paranoid lockdown mode.
- **Wi-Fi & Virtual Hotspot:** Live RSSI signal charts, stored password extraction, and one-click Access Point creation.
- **Crypto Vault & Steganography:** AES-256-GCM encrypted file storage and invisible PNG payload embedding.
- **WinGet Store & System Cleaner:** Integrated package installer with deep cache, temp, and DNS flushing.
- **Custom C# WPF Installer:** Beautiful installer and uninstaller wizard.

### 🚀 Quick Start (Windows)
```powershell
git clone https://github.com/Veysitasci/Ulak.git
cd Ulak/ulak-windows
npm install
npm start
```

---

### 📁 Proje Dizin Yapısı / Project Directory Structure

```plaintext
ulak/
├── app/                      # Linux Python (GTK3/PyQt) masaüstü çekirdeği
│   ├── main.py               # Ana uygulama giriş noktası
│   ├── security.py           # Güvenlik ve yetki yönetimi
│   └── ui_*.py               # Modül arayüzleri (Firewall, Wi-Fi, Donanım, Kasa...)
├── ulak-windows/             # Windows Electron masaüstü sürümü
│   ├── main.js               # Electron ana süreç
│   ├── preload.js            # Güvenli IPC köprüsü
│   ├── backend/              # Node.js yerel sistem servisleri (ProcessRadar, Wifi, Firewall...)
│   ├── renderer/             # Bento Grid, Pet ve Glassmorphism UI
│   └── package.json          # Windows bağımlılık ve derleme yapılandırması
├── ulak-android/             # Android Kotlin / Jetpack Compose projesi
├── assets/                   # Uygulama ikonları, logolar ve modül banner kaynakları
├── packaging/                # Paketleme araçları
│   └── windows/              # C# WPF tabanlı özel kurulum sihirbazı ve build_setup.bat
├── docs/                     # Tasarım ve geliştirici kılavuzları
└── .github/workflows/        # Otomatik senkronize çoklu platform CI/CD (release.yml)
```

---

<h2 id="-sürümler--releases">📦 Otomatik Senkronize Yayınlar / Releases</h2>

ULAK, **GitHub Actions** ile tam senkronize bir yayın mekanizmasına (`release.yml`) sahiptir. Her sürüm etiketinde (`v*`):
1. 🪟 **Windows:** `ULAK-Setup-${version}.exe` kurulum paketi derlenir.
2. 🐧 **Linux:** `ulak_${version}_all.deb` paketi derlenir ve APT deposuna (`gh-pages`) gönderilir.
3. 🚀 **Unified GitHub Release:** Her iki platform ikilisi SHA-256 doğrulama kodları ile tek bir resmi [GitHub Release](https://github.com/Veysitasci/Ulak/releases) altında aynı anda yayınlanır.

---

### 📄 Lisans / License

Bu proje [MIT Lisansı](LICENSE) kapsamında açık kaynak olarak sunulmaktadır.
