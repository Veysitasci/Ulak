# 🛡️ ULAK - Ağ, Donanım ve Güvenlik İstasyonu
### *Next-Gen Multi-Platform Network, Hardware & Security Station*

<p align="center">
  <img src="assets/ulak_logo.png" alt="ULAK Logo" width="140" />
</p>

<p align="center">
  <a href="https://github.com/Veysitasci/Ulak/releases"><img src="https://img.shields.io/github/v/release/Veysitasci/Ulak?style=for-the-badge&color=38bdf8&logo=github" alt="Latest Release" /></a>
  <img src="https://img.shields.io/badge/Platform-Linux%20%7C%20Windows%20%7C%20Android-emerald?style=for-the-badge&logo=linux" alt="Platforms" />
  <img src="https://img.shields.io/badge/UI-Bento%20Grid%20%26%20Glassmorphism-blueviolet?style=for-the-badge" alt="UI Style" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-amber?style=for-the-badge" alt="License" /></a>
</p>

<p align="center">
  <a href="#-türkçe-tr">🇹🇷 Türkçe Dokümantasyon</a> &nbsp;•&nbsp; <a href="#-english-en">🇬🇧 English Documentation</a> &nbsp;•&nbsp; <a href="#-sürümler--releases">📦 İndir / Releases</a>
</p>

---

## 🇹🇷 Türkçe (TR)

**ULAK**, siber güvenlik uzmanları, sistem yöneticileri ve ileri düzey kullanıcılar için geliştirilmiş; modern **Bento Grid** ve **Canlı Cam (Glassmorphism)** arayüzüne sahip hepsi bir arada bir Ağ, Donanım ve Güvenlik İstasyonudur.

Linux, Windows ve Android platformlarında cihazınızı, açık portlarınızı, kablosuz bağlantılarınızı ve şifreli veri kasanızı tek bir merkezden yönetmenizi sağlar.

### 🌐 Desteklenen Platformlar

| Platform | Altyapı | Format | Durum |
| :--- | :--- | :--- | :--- |
| **🐧 Linux** | Python 3 + GTK / Qt | `.deb` (Debian, Ubuntu, Kali, Pardus) | ✅ Kararlı (v2.5.0) |
| **🪟 Windows** | Electron + Node.js + C# WPF Setup | `.exe` Installer & Portable (Win 10/11 x64) | ✅ Kararlı (v2.5.0) |
| **🤖 Android** | Kotlin + Jetpack Compose | `.apk` (Android 10+) | 📱 Aktif Geliştirme |

---

### ✨ Temel Modüller ve Özellikler

#### 🛡️ 1. ULAK Güvenlik Duvarı (Firewall)
- Düşük, Orta, Yüksek ve **Paranoid** koruma seviyeleri.
- Canlı giden/gelen ağ bağlantılarını izleme ve tek tıkla şüpheli soketleri düşürme.
- Açık port tarayıcı ve Linux `nftables`/`iptables` ile Windows Defender kurallarının dinamik yönetimi.

#### 📶 2. Wi-Fi & Bluetooth İstasyonu
- **Wi-Fi:** Çevredeki ağların sinyal gücü (RSSI), frekans bandı (2.4GHz / 5GHz) ve şifreleme türü (WPA2/WPA3) analizi.
- **Hotspot:** Tek tıkla güvenli kablosuz erişim noktası oluşturma ve bağlanan istemcileri listeleme.
- **Bluetooth:** BlueZ ve Windows Bluetooth API'leri ile aygıt keşfi, eşleştirme ve sinyal telemetrisi.

#### 🔒 3. Kripto Kasa & Steganografi (Crypto Vault)
- **AES-256-GCM Kasa:** Hassas dosyalarınızı endüstri standardı şifreleme ile kilitleyin.
- **Görsel Steganografi (PNG):** Gizli mesajları veya dosyaları resim pikselleri içerisine görünmez şekilde gizleyin ve çıkarın.
- **Parola Üreteci:** Yüksek entropili, kırılması imkansız rastgele parolalar oluşturma.

#### 🛡️ 4. Antivirüs & Tehdit Avcısı (Threat Hunter)
- Canlı bellek ve dosya sistemi tehdit taraması.
- EICAR test virüsü ile antivirüs motoru doğrulama.
- Tehlikeli port ve yetkisiz arka plan süreç tespiti.

#### 📊 5. Donanım & Süreç Monitörü
- Canlı CPU frekansı, sıcaklığı, çekirdek yükü, RAM, Disk I/O ve Batarya takibi.
- Kaynak tüketen işlemleri filtreleme ve tek tıkla sonlandırma (`SIGKILL` / `taskkill`).

#### 📦 6. Paket Yöneticisi & Sistem Temizleyici
- APT ve WinGet entegrasyonu ile tek merkezden uygulama arama, kurma ve kaldırma.
- Geçici dosyalar (`/tmp`, `%TEMP%`), çöp kutusu, sistem logları ve tarayıcı önbelleklerini temizleme.

#### 🛒 7. ULAK Dinamik Mağaza (Store)
- Modüller GitHub üzerinden dinamik olarak listelenir ve tek tıkla kurulup güncellenebilir.
- Modüler mimari sayesinde sadece ihtiyacınız olan araçları yükleyin.

---

### 🚀 Hızlı Kurulum

#### 🐧 Linux Kurulumu
**1. APT Deposu Üzerinden (Önerilen):**
```bash
curl -sS https://veysitasci.github.io/Ulak/apt/public.key | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/ulak.gpg
echo "deb [signed-by=/etc/apt/trusted.gpg.d/ulak.gpg] https://veysitasci.github.io/Ulak/apt stable main" | sudo tee /etc/apt/sources.list.d/ulak.list
sudo apt update
sudo apt install ulak
```

**2. `.deb` Paketi ile:**
[Releases](https://github.com/Veysitasci/Ulak/releases) sayfasından en son `ulak_2.5.0_all.deb` paketini indirin:
```bash
sudo dpkg -i ulak_2.5.0_all.deb
sudo apt install -f  # Eksik bağımlılıkları tamamlar
```

**3. Kaynak Koddan:**
```bash
git clone https://github.com/Veysitasci/Ulak.git
cd Ulak
sudo ./install.sh
ulak
```

#### 🪟 Windows Kurulumu
1. [Releases](https://github.com/Veysitasci/Ulak/releases) sayfasından `ULAK-Setup-2.5.0.exe` dosyasını indirin.
2. Özel arayüzlü kurulum sihirbazını başlatıp kurulumu tamamlayın.
3. Masaüstü kısayolundan veya Başlat menüsünden `ULAK`'ı açın.

Geliştirici modu için:
```powershell
cd ulak-windows
npm install
npm start
```

---

<h2 id="-english-en">🇬🇧 English (EN)</h2>

**ULAK** is an all-in-one Network, Hardware, and Security Station built for cybersecurity analysts, system administrators, and power users, featuring a high-aesthetic **Bento Grid** and **Glassmorphism** interface.

Manage devices, firewall rules, live packet telemetry, hardware statistics, and encrypted vaults across Linux, Windows, and Android.

### ✨ Key Capabilities
- **🛡️ Next-Gen Firewall:** Low, Medium, High & Paranoid profiles. Real-time socket tracking and active port lockdown.
- **📶 Wireless & Bluetooth Station:** Live RSSI analyzer, 2.4/5GHz spectrum inspection, instant Hotspot AP setup.
- **🔒 Crypto Vault & Steganography:** Military-grade AES-256-GCM file vault, PNG image steganography, and entropy password generator.
- **🛡️ Threat Hunter & Antivirus:** Process heuristics, memory scanning, EICAR test integration, and vulnerability auditing.
- **📊 Hardware Telemetry:** Dynamic CPU, GPU, RAM, Disk I/O & Battery metrics with one-click task termination.
- **📦 Package Manager & Cleaner:** Centralized APT/WinGet GUI and deep cache/temp cleaner.
- **🛒 Dynamic Store:** On-demand modular architecture loaded dynamically from GitHub.

---

### 📁 Proje Dizin Yapısı / Project Directory Structure

```plaintext
ulak/
├── app/                      # Linux Python (PyQt/GTK) masaüstü çekirdeği
│   ├── main.py               # Ana uygulama giriş noktası
│   ├── security.py           # Güvenlik ve yetki yönetimi
│   └── ui_*.py               # Modül arayüzleri (Firewall, Wi-Fi, Donanım, Kasa...)
├── ulak-windows/             # Windows Electron masaüstü sürümü
│   ├── main.js               # Electron ana süreç
│   ├── preload.js            # Güvenli IPC köprüsü
│   ├── backend/              # Node.js yerel sistem servisleri
│   ├── renderer/             # Bento Grid & Glassmorphism UI
│   └── package.json          # Windows yapılandırması
├── ulak-android/             # Android Kotlin / Jetpack Compose projesi
├── packaging/                # Linux (.desktop) ve Windows özel kurulum araçları
│   └── windows/              # C# WPF tabanlı özel kurulum sihirbazı
├── tools/                    # Banner ve görsel üretim scriptleri
├── docs/                     # Tasarım rehberleri ve dokümantasyon
│   └── design_guidelines/    # UI/UX ilkeleri ve tipografi rehberleri
└── .github/workflows/        # Otomatik senkronize çoklu platform CI/CD (release.yml)
```

---

<h2 id="-sürümler--releases">📦 Otomatik Senkronize Yayınlar / Releases</h2>

ULAK, **GitHub Actions** ile tam senkronize bir yayın mekanizmasına (`release.yml`) sahiptir. Her sürüm etiketinde (`v*`):
1. 🐧 **Linux:** `.deb` paketi derlenir ve APT deposuna (`gh-pages`) gönderilir.
2. 🪟 **Windows:** Electron derleyicisi ile `.exe` kurulum paketi hazırlanır.
3. 🚀 **Unified Release:** Tüm platform ikilileri SHA-256 doğrulamaları ile birlikte tek bir resmi [GitHub Release](https://github.com/Veysitasci/Ulak/releases) altında yayınlanır.

---

### 📄 Lisans / License

Bu proje [MIT Lisansı](LICENSE) kapsamında açık kaynak olarak geliştirilmektedir.
Her türlü katkı ve geri bildirime açıktır.
