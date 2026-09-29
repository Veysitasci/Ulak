# 🦅 ULAK — Ağ, Donanım & Güvenlik Kiti

<p align="center">
  <img src="assets/ulak_logo.png" alt="ULAK Logo" width="160" height="160" />
</p>

<p align="center">
  <b>Linux sistemleri için Termius Bento Grid tasarım dilinde modern, modüler ve yüksek performanslı ağ, telemetri ve güvenlik yönetim istasyonu.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.0.0-white?style=for-the-badge&logo=linux&logoColor=black" alt="Version 2.0.0" />
  <img src="https://img.shields.io/badge/GTK-3.0-171a26?style=for-the-badge&logo=gnome&logoColor=white" alt="GTK 3.0" />
  <img src="https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.8+" />
  <img src="https://img.shields.io/badge/Debian%20Package-Ready-A81D33?style=for-the-badge&logo=debian&logoColor=white" alt="Debian Ready" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License MIT" />
</p>

---

## 📖 Genel Bakış

**ULAK**, geleneksel Linux ağ ve donanım araçlarının karmaşık arayüzlerini ve dağınık terminal komutlarını tek bir çatı altında birleştiren yeni nesil bir masaüstü uygulamasıdır. 

Adını Anadolu ve Türk haberleşme kültürünün simgesi olan **"Ulak"**tan alan sistem; **Termius Bento Grid** mimarisi, saf monokrom (siyah-beyaz) ikon dili, çerçevesiz pencere tasarımı ve entegre monospaced geliştirici konsolları ile donatılmıştır.

---

## ✨ Öne Çıkan Özellikler

### 🛡️ 1. ULAK Güvenlik Duvarı (`ui_firewall.py` & `api_firewall.py`)
- **Termius Bento Alt Sekme Navigasyonu:** Özel olarak tasarlanmış segmented alt sekme çubuğu (`[Kalkan]`, `[Kurallar]`, `[Uygulama FW]`, `[Yerel Koruma]`, `[Tehdit Günlüğü]`).
- **Segmented Güvenlik Seviyesi:** Sarı radyo butonları yerine monokrom filtre çipleri (`[ Düşük ]`, `[ Orta ]`, `[ Yüksek ]`, `[ Paranoid ]`).
- **Bento Sayaç Kartları:** Bugün engellenen paketler, açık portlar ve canlı bağlantılar için 26px kalın fontlu göstergeler.
- **Canlı Ağ Konsolu:** Terminal formatında zaman damgalı, protokol rozetli (`TCP`/`UDP`) ve yönlendirmeli canlı güvenlik akışı (`.terminal-container`).
- **Uygulama Filtreleme:** Dış dünyaya açık port dinleyen uygulamaları (PID bazında) otomatik tespit etme ve tek tıkla engelleme.
- **Localhost Modu & Whitelist:** Tek anahtarla dış dünyadan tamamen izole olma veya izinli IP/Port listesi yönetme.

### 📶 2. Bluetooth Yöneticisi (`ui_bt.py` & `api_bt.py`)
- **BlueZ D-Bus Entegrasyonu:** Gerçek zamanlı cihaz tarama, eşleştirme, güvenme ve bağlantı yönetimi.
- **Kategori Filtre Çipleri:** Ses, Giriş (Klavye/Fare), Oyun Kolları, Giyilebilir Cihazlar, IoT ve Medya filtreleri.
- **Canlı RSSI Telemetrisi:** Bağlı cihazların anlık sinyal seviyeleri ve pil durumları.

### 📡 3. Wi-Fi İstasyonu (`ui_wifi.py` & `api_wifi.py`)
- **NetworkManager Entegrasyonu:** Çevredeki Wi-Fi ağlarını anlık tarama ve sinyal kalitesine göre listeleme.
- **Tek Tıkla Hotspot:** `ULAK_AP` adıyla anında taşınabilir erişim noktası oluşturma.
- **Kayıtlı Parolalar & Ağlar:** Sistemdeki kayıtlı bağlantıları ve açık soketleri terminal görünümünde listeleme.

### 📊 4. Canlı Donanım & Sistem Monitörü (`ui_hw.py`)
- **İşlemci (CPU), Bellek (RAM), Disk & Takas (Swap):** İnteraktif açılır-kapanır detay kartları.
- **Akıllı Pil Algılama:** AC adaptör ve pil durumunu canlı izler; şarjdan çıkarıldığında anında dinamik olarak güncellenir.
- **Top 5 İşlem Sonlandırıcı:** Sistemi aşırı yoran işlemleri listeleme ve tek tıkla sonlandırma (`kill`).
- **Gelişmiş Uçbirim Sekmeleri:** `lscpu`, `lsblk`, `free`, `sensors`, `systemctl` ve `ip link` çıktıları.

### ⚡ 5. Sistem Yöneticisi (`ui_admin.py`)
- **Kök Uçbirim (Root Console):** `pkexec` üzerinden yetkilendirilmiş hızlı komut yürütme konsolu.
- **UFW & Paket Güncelleyici:** Sistem güvenlik duvarını kontrol etme ve `apt update && apt upgrade` çalıştırma.
- **Systemd & Hesap Yöneticisi:** Otomatik başlayan servisleri ve kullanıcı hesaplarını denetleme.

### 🕵️ 6. Güvenlik & Ağ Analiz Araçları (`ui_hacker.py`)
- **Salt-Okunur Ağ Denetimi:** Açık soket özeti (`ss -tulpen`), ağ arayüzleri (`ip -brief addr`) ve rotalar.
- **Geliştirici Uçbirim Kutuları:** Komut başlıkları (`$ ss...`) ve monospaced kod blokları.

### 🎨 7. Bento Grid Tema & Görsel Özelleştirme (`theme.py` & `ui_settings.py`)
- **3 Modlu İnteraktif Seçici:**
  - 🌙 **Koyu:** Saf siyah & antrasit Bento kontrastı.
  - ☀️ **Açık:** Aydınlık gri & beyaz zemin, koyu tipografi.
  - 💻 **Sistem (Otomatik):** Masaüstü temasını anlık izler; tema değiştiğinde uygulamayı otomatik senkronize eder.
- **%100 Vektörel Monokrom İkonlar:** Tüm renkli ikonlar kaldırılmış, resmi GTK `-symbolic` ikonları kullanılmıştır.
- **Özel Çerçevesiz Pencere:** Kavisli kenarlar (border-radius: 14px), modern pencere kontrol butonları ve minimal başlık çubuğu.

---

## 🏗️ Modüler Proje Mimarisi

ULAK, sorumlulukların net olarak ayrıldığı modüler bir dizin yapısına sahiptir:

```text
ulak/
├── app/
│   ├── __init__.py          # Python paket başlatıcı
│   ├── main.py              # Uygulama gövdesi, özel başlık çubuğu, kenar çubuğu & splash
│   ├── theme.py             # Termius Bento CSS motoru (Koyu/Açık/Sistem temaları)
│   ├── i18n.py              # Çok dilli yerelleştirme (Türkçe & İngilizce)
│   ├── security.py          # Bütünlük denetimi & Anti-tamper güvenlik koruması
│   ├── api_bt.py            # BlueZ D-Bus Bluetooth arayüzü
│   ├── api_wifi.py          # NetworkManager Wi-Fi kontrol katmanı
│   ├── api_firewall.py      # nftables & UFW Güvenlik Duvarı yönetim motoru
│   ├── ui_bt.py             # Bluetooth Bento arayüzü
│   ├── ui_wifi.py           # Wi-Fi Bento arayüzü
│   ├── ui_firewall.py       # Güvenlik Duvarı (Kalkan, Kurallar, Uygulamalar, Tehditler)
│   ├── ui_hw.py             # Donanım & Sistem Monitörü
│   ├── ui_admin.py          # Kök Uçbirim ve Sistem Yönetimi
│   ├── ui_hacker.py         # Ağ analiz ve güvenlik araçları
│   ├── ui_store.py          # Modül mağazası & eklenti yönetimi
│   ├── ui_settings.py       # Uygulama ayarları (3'lü Bento tema seçici vb.)
│   └── ui_shared.py         # Paylaşılan UI bileşenleri ve kartlar
├── assets/
│   ├── ulak_logo.png        # 512x512 yüksek çözünürlüklü monokrom logo
│   └── bg_moon.jpg          # Splash ekranı arka plan görseli
├── packaging/
│   └── ulak.desktop         # Standart Linux masaüstü kısayolu (XDG)
├── scripts/
│   ├── build_deb.sh         # Debian (.deb) paketleme betiği
│   ├── release_check.sh     # Release doğrulama ve bütünlük test betiği
│   ├── build_protected.sh   # Nuitka korumalı ikili derleme
│   └── cython_build.py      # Cython C-Extension derleyicisi
├── dist/
│   └── ulak_2.0.0_all.deb   # Hazır derlenmiş Debian paketi
├── .github/workflows/
│   └── publish-apt.yml      # CI/CD APT dağıtım iş akışı
├── install.sh               # Tek tıkla kurulum, derleme ve kaldırma betiği
├── start.sh                 # Taşınabilir / Geliştirici başlatıcı
├── LICENSE                  # MIT Lisansı
└── README.md                # Proje dokümantasyonu
```

---

## 🚀 Kurulum ve Çalıştırma

### Yöntem 1: Tek Komutla Otomatik Kurulum (Önerilen)
Sistem bağımlılıklarını kurar, `.deb` paketini derler ve sisteme yükler:
```bash
sudo ./install.sh
```

Kurulum tamamlandıktan sonra uygulamayı başlatmak için:
```bash
ulak
```
veya uygulama menüsünden **ULAK** simgesine tıklayabilirsiniz.

---

### Yöntem 2: Debian (.deb) Paketinden Kurulum
Doğrudan `dist/` klasöründeki paketi yükleyebilirsiniz:
```bash
sudo apt install ./dist/ulak_2.0.0_all.deb
```

---

### Yöntem 3: Geliştirici Modunda (Kurulumsuz) Çalıştırma
Sisteme kurmadan doğrudan kaynak koddan çalıştırmak için:
```bash
./start.sh
```

---

## 🛠️ Paketleme ve Doğrulama Betikleri

- **Yeni bir `.deb` paketi derlemek için:**
  ```bash
  ./scripts/build_deb.sh 2.0.0
  ```
- **Sürüm doğrulama testlerini çalıştırmak için:**
  ```bash
  ./scripts/release_check.sh 2.0.0
  ```
- **Uygulamayı sistemden kaldırmak için:**
  ```bash
  sudo ./install.sh --uninstall
  ```

---

## 📋 Sistem Gereksinimleri

| Bileşen | Minimum Sürüm / Paket |
| :--- | :--- |
| **İşletim Sistemi** | Debian 11+, Ubuntu 20.04+, Kali Linux, Linux Mint, Pardus |
| **Python** | Python 3.8 veya üzeri |
| **GUI Toolkit** | GTK+ 3.0 (`gir1.2-gtk-3.0`, `python3-gi`) |
| **Ağ Servisleri** | `network-manager`, `bluez`, `nftables`, `iptables` |
| **Python Paketleri**| `psutil`, `dbus-python`, `pillow` |

---

## ⌨️ Klavye Kısayolları

- `F5` / `Ctrl + R`: Aktif sekmedeki verileri anlık yenile
- `Ctrl + Q`: Uygulamadan çık
- `Ctrl + 1-8`: Sekmeler arası hızlı geçiş (Wi-Fi, Bluetooth, Donanım, Güvenlik Duvarı vb.)

---

## 📜 Lisans

Bu proje [MIT Lisansı](LICENSE) kapsamında lisanslanmıştır.
