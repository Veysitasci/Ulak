# ULAK Windows Sürümü

ULAK'ın Windows için Electron tabanlı sürümü.

## Kurulum

1. Node.js yüklü olduğundan emin olun: https://nodejs.org/

2. Bağımlılıkları yükleyin:
```bash
cd ulak-windows
npm install
```

3. Uygulamayı çalıştırın:
```bash
npm start
```

## .exe Oluşturma

Windows için kurulum dosyası oluşturmak için:

```bash
npm run build-win
```

Oluşturulan .exe dosyası `dist` klasöründe bulunur.

## Özellikler

- ✅ Modern Bento Grid Liquid Glass arayüzü (Altın Oranlı CSD Pencere)
- ✅ Canlı Sistem & Donanım İzleme (CPU, RAM, GPU, Pil telemetrisi)
- ✅ Windows Güvenlik Duvarı (Düşük, Orta, Yüksek, Paranoid Modları & Port Engelleme)
- ✅ Wi-Fi & Hotspot Yöneticisi (WLAN Ağ Taraması & Bağlantı Kontrolü)
- ✅ Bluetooth Radyo & Cihaz Eşleştirme İstasyonu
- ✅ Hacker & Güvenlik Analiz Araçları
- ✅ **Video & Medya İndirici (4K, MP3, Altyazı, Playlist, Hız Limiti)**
- ✅ **Sistem Temizleyici (Temp, Tarayıcılar, Windows Update, FlushDNS, Thumbnails)**
- ✅ **Ağ & Port Takipçisi (Soket-Süreç Eşleme, Canlı Trafik, Traceroute, WHOIS)**
- ✅ **Otomatik Yedekleme Aracı (Manifest, Özel Dizin, Geri Yükleme, SHA-256)**
- ✅ **Evrensel Paket Yükleyici (Authenticode İmza, Winget, Choco, Uninstaller)**
- ✅ Modül & Sürüm Yöneticisi (Rollback ve Dinamik Eklenti Yönetimi)

## Geliştirme

Linux sürümü (`ulak/`) GTK3 + Python kullanır ve Linux'a özgü bileşenlere bağımlıdır.
Windows sürümü (`ulak-windows/`) Electron + JavaScript kullanır ve cross-platform'dur.

İki sürüm birbirinden bağımsız geliştirilir.
