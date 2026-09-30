# ULAK - Ağ ve Güvenlik İstasyonu / Network & Security Station

[🇹🇷 Türkçe](#türkçe-tr) | [🇬🇧 English](#english-en)

---

<h2 id="türkçe-tr">🇹🇷 Türkçe (TR)</h2>

ULAK, Termius tarzı modern "Bento Grid" arayüzüne sahip, Linux sistemler için geliştirilmiş hepsi bir arada bir Ağ, Donanım ve Güvenlik İstasyonudur. Cihazınızı, ağınızı ve güvenlik ayarlarınızı tek bir merkezden, şık ve anlık tepki veren bir masaüstü uygulaması ile yönetmenizi sağlar.

### ✨ Öne Çıkan Özellikler

- **🛡️ ULAK Güvenlik Duvarı:** Düşük, Orta, Yüksek ve Paranoid modlar. Canlı bağlantı ve açık port takibi.
- **📶 Bluetooth & Wi-Fi:** BlueZ ve NetworkManager entegrasyonu ile cihaz eşleştirme, sinyal takibi ve anında Hotspot kurma.
- **📊 Donanım Monitörü:** CPU, RAM ve Pil durumunu canlı izleme, sistemi yoran işlemleri tek tıkla sonlandırma.
- **🛒 Mağaza ve Eklentiler (YENİ!):** Modüller GitHub üzerinden dinamik çekilir. İstediğiniz modülü kurup kaldırabilirsiniz.
- **🔄 Otomatik Güncelleme (YENİ!):** GitHub Releases üzerinden otomatik versiyon kontrolü ve arkaplanda güncellenme desteği.
- **🎨 Bento Grid Teması:** Aydınlık, Karanlık ve Sistem teması ile tamamen modern bir arayüz deneyimi.

### 🚀 Kurulum

Sisteminize kurmak için tek yapmanız gereken:
```bash
sudo ./install.sh
```
Kurulum bittikten sonra başlatmak için terminale `ulak` yazın veya uygulamalar menüsünden başlatın.

### 🛠️ Geliştirici - Paketleme

Kendi `.deb` paketinizi oluşturmak için:
```bash
./scripts/build_deb.sh 2.0.0
```

---

<h2 id="english-en">🇬🇧 English (EN)</h2>

ULAK is an all-in-one Network, Hardware, and Security Station for Linux systems, featuring a modern "Bento Grid" interface inspired by Termius. It allows you to manage your device, network, and security settings from a single, sleek, and highly responsive desktop application.

### ✨ Key Features

- **🛡️ ULAK Firewall:** Low, Medium, High, and Paranoid security modes. Live connection and open port tracking.
- **📶 Bluetooth & Wi-Fi:** BlueZ and NetworkManager integration for device pairing, signal monitoring, and instant Hotspot creation.
- **📊 Hardware Monitor:** Live monitoring of CPU, RAM, and Battery status, plus one-click process termination.
- **🛒 Store & Plugins (NEW!):** Modules are fetched dynamically from GitHub. Install and manage plugins easily.
- **🔄 Auto-Updater (NEW!):** Automatic version checking via GitHub Releases with background updates.
- **🎨 Bento Grid Theme:** Fully modern UI experience with Light, Dark, and System theme support.

### 🚀 Installation

To install on your system, simply run:
```bash
sudo ./install.sh
```
Once installed, type `ulak` in your terminal or launch it from your application menu.

### 🛠️ Developer - Packaging

To build your own `.deb` package:
```bash
./scripts/build_deb.sh 2.0.0
```
