# ULAK Windows — Sürüm & Modül Değişiklik Günlüğü (Changelog)

## [v2.4.0] - 2026-11-01

### 🚀 Özet
ULAK platformuna tam entegre yeni bir güvenlik ve gizlilik modülü eklendi: **Kripto Kasa & Steganografi (`crypto_vault`)**. Modül askeri düzeyde AES-256-GCM dosya şifreleme, görsel içine veri gizleme (steganografi), şifreli gizli not defteri, yüksek entropili parola üreticisi ve HMAC-SHA512 bütünlük mührü içerir.

---

### 📦 Yeni Eklenen Modül: Kripto Kasa & Steganografi (`crypto_vault`)

1. **AES-256-GCM Askeri Standartta Dosya Şifreleme & Çözme:**
   - 100.000 iterasyonlu PBKDF2 anahtar türetme, rastgele tuz (salt) ve başlatma vektörü (IV) ile dosya şifreleme.
   - Doğrulama etiketi (Auth Tag) ile kurcalamaya karşı %100 dayanıklı, şifresi çözülürken bütünlük garantisi veren `.ulak` kasa formatı.

2. **Görsel İçi Steganografi Laboratuvarı (Image Steganography):**
   - Gizli mesajları veya parolaları PNG, JPG ve BMP görsellerinin piksel arkasına görünmez biçimde gömme.
   - İsteğe bağlı ek parola katmanı (AES-CBC) ile çift katmanlı gizleme ve görselden gizli veriyi anında çıkarma.

3. **Şifreli Kasa Gizli Not Defteri:**
   - Kasa Ana Parolası (Master Password) ile korunan, AES-256-GCM ile disk üzerinde şifreli saklanan (`%USERPROFILE%\.ulak\vault\notes.enc`) gizli notlar ve kimlik bilgileri kasası.

4. **Kriptografik Güçlü Parola & Token Üreticisi:**
   - 8-64 karakter arası dinamik uzunluk, büyük/küçük harf, rakam ve sembol filtreleri.
   - Shannon bit entropisi hesabı (`tabular-nums`) ve panoya tek tıkla kopyalama desteği.

5. **HMAC-SHA512 Dijital Bütünlük Mührü:**
   - Önemli dosyaların gelecekte en ufak bir bit dahi değiştirilip değiştirilmediğini kanıtlayan HMAC-SHA512 dijital mühürleme ve SHA-256 sağlama motoru.

---

## [v2.3.0] - 2026-11-01

### 🚀 Özet
ULAK Modül Mağazası'na (Store) tam destekli yeni bir güvenlik modülü eklendi: **Antivirüs & Tehdit Avcısı (`antivirus`)**. Modül hem backend hem de renderer katmanında tam entegre edilmiş; UI Skills MCP standartlarına (konsantrik border-radius, dokunsal basma tepkileri, tabular sayısal hizalama, drag-and-drop görsel yükleme alanı ve Sonner bildirim mimarisi) uygun olarak inşa edilmiştir.

---

### 📦 Yeni Eklenen Mağaza Modülü: Antivirüs & Tehdit Avcısı (`antivirus`)

1. **Derin Dosya & Heuristik Kod Analiz Laboratuvarı:**
   - Sürükle-bırak (drag-and-drop) veya dosya seçici ile herhangi bir dosya üzerinde anlık derin güvenlik incelemesi.
   - Shannon Entropi hesaplayıcısı (0.00 - 8.00) ile sıkıştırılmış/şifrelenmiş zararlı yük tespiti.
   - Görsel steganografi analizi (PNG IEND sonrası trailing baytlar, JPEG EOI kalıntıları).
   - Poliglot ikili analizi (görsel/belge içine gizlenmiş MZ/ELF çalıştırılabilir kodları).
   - Webshell, Base64 eval kalıpları, gizlenmiş PowerShell komutları ve Reverse Shell kalıp denetleyicisi.
   - Kriptografik MD5 ve SHA-256 sağlama toplamı hesaplayıcı.

2. **Windows Defender Kalkan Entegrasyonu:**
   - Windows Defender gerçek zamanlı koruma, davranış izleme ve virüsten koruma servis durumunu anlık sorgulama.
   - Tek tıkla arka planda Windows Defender Hızlı Sistem Taraması (QuickScan) başlatabilme yeteneği.

3. **DoD 5220.22-M Standardında Güvenli Dosya Parçalayıcı (File Shredder):**
   - Şüpheli veya hassas dosyaları kurtarılamaz biçimde yok etmek için 3 aşamalı (rastgele baytlar, 0xFF ve 0x00 ile ezme) fiziksel disk parçalama motoru.

4. **Şifreli Karantina Kasası & Geri Yükleme Motoru:**
   - Tespit edilen tehditleri XOR/AES karartma algoritmasıyla çalıştırılamaz hale getirerek `%USERPROFILE%\.ulak\quarantine` kasasında izole etme.
   - İstenildiğinde karantinadaki dosyayı orijinal konumuna geri yükleme veya kalıcı olarak yok etme.

5. **USB & Harici Bellek Tehdit Radarı:**
   - Sisteme takılan çıkarılabilir USB sürücüleri otomatik algılama, kök dizindeki `autorun.inf` ve gizli `.vbs`, `.lnk` kısayol virüslerini tarama.

---

## [v2.2.0] - 2026-11-01

### 🚀 Özet
ULAK Windows platformundaki diğer 6 çekirdek modülün tamamına (`firewall`, `hacker`, `bluetooth`, `wifi`, `hardware`, `admin`) 5'er adet yeni kritik önemli özellik eklendi. Tüm arayüz bileşenleri **UI Skills MCP Design Engineering** standartlarına uygun olarak mikro etkileşimler, dokunsal basma tepkileri (`:active { transform: scale(0.96); }`), `tabular-nums` sayısal tipografi, konsantrik border-radius ve anlık Sonner toast bildirimleriyle donatıldı.

---

### 📦 Yeni Eklenen Kritik Özellikler ve Modül Günlükleri

#### 1. 🛡️ Güvenlik Duvarı Modülü (`firewall`)
- **[Yeni] ICMP Ping Gizleme & Sessiz Düşürme (Stealth Ping):** Dış ağlardan gelen ICMP Echo (ping) isteklerini yanıtsız bırakıp yok sayarak bilgisayarı harici port tarayıcılardan tamamen görünmez kılar.
- **[Yeni] Gelişmiş Kural Denetleyicisi & Arama Motoru:** Windows Güvenlik Duvarı'ndaki kuralları PowerShell seviyesinde sorgulayarak yön, protokol, eylem ve etkin durumuna göre arar ve yönetir.
- **[Yeni] Ağ Profili Durum Yöneticisi:** Etki Alanı (Domain), Özel (Private) ve Ortak (Public) ağ profillerini bağımsız olarak açıp kapatabilen modern anahtarlar.
- **[Yeni] Paranoid Dışa Gidiş Kalkanı (Outbound Lockdown):** Yalnızca açıkça izin verilmiş kurallara izin verip diğer tüm şüpheli dış gidiş bağlantılarını engelleyen yüksek güvenlik modu.
- **[Yeni] Güvenlik Duvarı İlkesi Dışa Aktarma (.wfw):** Geçerli tüm güvenlik duvarı yapılandırmasını tek tıkla `.wfw` formatında yedekler.

#### 2. ⚡ Hacker & Ağ Teşhis Araçları Modülü (`hacker`)
- **[Yeni] Hedef Port Tarayıcı (Target SYN/Connect Scanner):** İstenen IP veya alan adı için hedef portları (örn: 21, 22, 80, 443, 3389, 8080) eşzamanlı soketlerle tarar ve açık portların servis adlarını tespit eder.
- **[Yeni] Yerel Alt Ağ & ARP Radarı (Subnet Sweep):** Yerel ağ segmentindeki tüm aktif cihazları IP, MAC adresi ve arayüz türüyle birlikte anlık olarak haritalandırır.
- **[Yeni] DNS Sızıntı & Hijack Testi:** Birden fazla bağımsız global DNS omurgasını (Cloudflare, Google, Quad9) sorgulayarak yerel DNS sızıntılarını ve zehirlenmelerini denetler.
- **[Yeni] SSL/TLS Şifreleme & Sertifika Denetimi:** Herhangi bir hedefin SSL/TLS sertifika zincirini, geçerlilik tarihlerini, kalan gün sayısını ve şifreleme paketini (cipher suite) analiz eder.
- **[Yeni] Tehdit Avcısı (EventLog 4625 & 4672 Hunter):** Windows Güvenlik Olay Günlüğü'nü derinlemesine tarayarak başarısız oturum açma denemelerini (kaba kuvvet saldırıları) ve yetki yükseltmelerini raporlar.

#### 3. 📶 Bluetooth İstasyonu & Radarı (`bluetooth`)
- **[Yeni] Canlı BLE Radarı (Bluetooth Low Energy Discovery):** Çevrede yayın yapan aktif BLE cihazlarını sinyal gücü (RSSI) ve MAC adresleriyle gerçek zamanlı tespit eder.
- **[Yeni] Doğrudan Aygıt Bağlantı Yönetimi:** Eşleşmiş Bluetooth cihazlarına arayüzden tek tıkla doğrudan bağlantı kurma özelliği.
- **[Yeni] Pil & Ses (A2DP) Telemetrisi:** Bağlı cihazların pil yüzdesini ve A2DP yüksek kaliteli ses profili aktiflik durumunu sorgulayan telemetri penceresi.
- **[Yeni] Bluetooth Gizli Mod (Stealth Mode):** Bilgisayarın diğer cihazlar tarafından görünürlüğünü kapatarak yetkisiz eşleşme ve izleme girişimlerini engeller.
- **[Yeni] Bluetooth Radyo & Sürücü Sıfırlama:** Takılan veya donan Bluetooth yığınını (`bthserv`) ve radyo arabirimini tek tıkla yeniden başlatan acil kurtarma aracı.

#### 4. 🌐 Wi-Fi & Kablosuz Ağlar Modülü (`wifi`)
- **[Yeni] Kanal Spektrum Analizi & Akıllı Öneri:** 2.4 GHz ve 5 GHz frekanslarındaki kanal yoğunluğunu hesaplayarak en az parazitli, en temiz kanalı önerir.
- **[Yeni] Kayıtlı Wi-Fi Parolaları Kasası:** Sistemde daha önce bağlanılmış tüm Wi-Fi profillerinin şifrelerini yetkilendirmeyle çözer ve panoya tek tıkla kopyalama imkanı sunar.
- **[Yeni] Detaylı BSSID & Dolaşım (Roaming) Telemetrisi:** Aktif erişim noktasının BSSID'si, dBm cinsinden gerçek sinyal gücü, TX/RX aktarım hızları ve 802.11 radyo standardı (PHY) dökümü.
- **[Yeni] Wi-Fi Profilleri XML Dışa Aktarma:** Sistemdeki tüm kablosuz bağlantı ayarlarını ve profillerini XML dosyaları halinde tek tıkla dışa aktarır.
- **[Yeni] Gelişmiş Hotspot & Ağ Yönetimi:** Mobil erişim noktası başlatma, anlık bağlantı kesme ve sinyal kalitesine göre ağ listeleme.

#### 5. 💻 Donanım & Sistem Kaynakları Modülü (`hardware`)
- **[Yeni] GPU & VRAM Telemetrisi:** Grafik işlemci modeli, ayrılmış VRAM boyutu, sürücü sürümü ve anlık ekran çözünürlüğünü gösteren canlı telemetri kartı.
- **[Yeni] Disk S.M.A.R.T. Sağlık Denetimi:** Fiziksel depolama birimlerinin (NVMe/SSD/HDD) sağlık durumunu, medya türünü ve S.M.A.R.T. öngörülerini denetleme.
- **[Yeni] Batarya Aşınma (Wear Level) Raporu:** Fabrika tasarım kapasitesi ile mevcut tam şarj kapasitesini kıyaslayarak pilin aşınma yüzdesini ve sağlık derecesini hesaplama.
- **[Yeni] Anakart & BIOS Kimliği:** Anakart üreticisi, model adı, BIOS sürümü ve yayınlanma tarihini gösteren donanım kimlik paneli.
- **[Yeni] Kaynak Tüketen Süreçler (Top Processes):** CPU ve RAM kullanımına göre sıralanabilen ve istenen görevi doğrudan sonlandıran görev yöneticisi tablosu.

#### 6. ⚙️ Sistem Yönetimi & Servisler Modülü (`admin`)
- **[Yeni] Windows Hizmetleri (Services Manager):** Sistem servislerini arama, anlık durumunu izleme ve tek tıkla Başlat / Durdur / Yeniden Başlat yapabilme yeteneği.
- **[Yeni] Sistem Dosyası Onarımı (SFC & DISM Engine):** Bozuk veya hasarlı Windows çekirdek dosyalarını tespit edip onaran `sfc /scannow` aracını tek tıkla yürütme.
- **[Yeni] Yüksek Performans Güç Planı:** Donanım gecikmelerini sıfırlamak için Windows Nihai/Yüksek Performans güç planını anında aktif etme.
- **[Yeni] Detaylı Kullanıcı & Yönetici Rol Denetimi:** Yerel kullanıcı hesaplarını, SID'leri, etkin durumlarını ve yerel yönetici (Administrators) yetkilerini denetleme.
- **[Yeni] Winget Bulut Güncelleme & PowerShell Konsolu:** Tüm yüklü yazılımları tek hamlede güncelleme (`winget upgrade --all`) ve etkileşimli PS yönetim terminali.

---

## [v2.1.0] - 2026-11-01

### 🚀 Özet
ULAK Windows platformundaki 5 aktif modülün tümüne 5'er adet yeni kritik önemli özellik eklendi. Arayüz tarafında **UI Skills MCP Design Engineering** standartları (Emil Kowalski, Jakub Krehel, Dammyjay Interface Design) uygulanarak mikro etkileşimler, dokunsal basma tepkileri (`scale(0.96)`), `tabular-nums` sayısal tipografi, konsantrik border-radius ve Sonner bildirim mimarisi entegre edildi.

---

### 📦 Aktif Modüllere Eklenen Kritik Özellikler

#### 1. 🎬 Video & Medya İndirici Modülü (`youtube`)
- **[Yeni] Çoklu Video Çözünürlüğü & Format Matrisi:** 4K Ultra HD (2160p), 2K Quad HD (1440p), 1080p FHD 60fps, 720p HD ve 480p format seçenekleri.
- **[Yeni] Stüdyo Kalitesinde Ses Dönüştürücü:** 320 kbps MP3, FLAC (Kayıpsız / Lossless), WAV ve AAC ses çıkarma motoru.
- **[Yeni] Oynatma Listesi (Playlist) & Aralık İndirme:** Playlist URL'si ile toplu video indirme ve başlangıç-bitiş video aralığı belirleme (örn: 1-10 arası).
- **[Yeni] Çok Dilli Altyazı Ayrıştırıcı:** Videolardaki Türkçe ve İngilizce altyazıları otomatik algılayıp `.srt` formatında dönüştürerek indirme.
- **[Yeni] Bant Genişliği Hız Sınırlandırıcı & Eşzamanlı Parça:** Arka planda ağ trafiğini boğmamak için hız limiti (1M, 2M, 5M, 10M veya limitsiz) ve paralel iş parçacığı (`-N 4`, `-N 8`) yönetimi.
- **[Yeni] İndirilenler Kütüphanesi & Dosya Yöneticisi:** İndirilen medyaların boyut, tarih ve tür bazında canlı listelenmesi, doğrudan klasörde açılması ve silinmesi.

#### 2. 🧹 Sistem & Disk Temizleyici Modülü (`cleaner`)
- **[Yeni] Çoklu Tarayıcı Önbellek & Çerez Temizleyici:** Chrome, Edge, Brave, Firefox ve Chromium Code Cache alanlarını derinlemesine temizleme.
- **[Yeni] Windows Update & Dağıtım Kalıntıları:** `SoftwareDistribution\Download` ve teslimat optimizasyonu dosyalarını güvenle boşaltarak gigabaytlarca yer açma.
- **[Yeni] DNS & Ağ Soket Temizliği (FlushDNS):** Bozuk DNS çözümleyici önbelleğini sıfırlayıp bağlantı kopmalarını gideren ağ temizleme aracı.
- **[Yeni] Bozuk Simge & Küçük Resim (Thumbnails) Onarıcısı:** Explorer simge ve resim önizlemelerini onarmak için Windows thumbnail önbelleğini sıfırlama.
- **[Yeni] Akıllı Tek Tıkla Derin Temizlik (Smart Deep Clean):** Tüm temizleme bileşenlerini tek hamlede çalıştıran ve kurtarılan alanı MB olarak hesaplayan akıllı motor.

#### 3. 🌐 Ağ & Port Takipçisi Modülü (`net_monitor`)
- **[Yeni] Canlı Adaptör Veri Trafiği Monitörü:** Ağ kartlarının gönderilen ve alınan veri miktarını (MB) ve paket sayılarını anlık gösteren canlı akış.
- **[Yeni] Görsel Traceroute (ICMP Hop & Jitter):** Hedef sunucuya giden ara ağ geçitlerini (hops) ve milisaniye bazında dalgalanmaları görselleştirme.
- **[Yeni] IP WHOIS & Ters DNS (rDNS) İstihbaratı:** Dış dünyaya bağlanan IP adreslerinin sunucu sahibi ve yerel/genel düğüm analizini yapma.
- **[Yeni] Tek Tıkla Şüpheli Süreç Kapatma & Port Engelleme:** Riskli açık portun ilişkili Windows sürecini (PID) sonlandırıp güvenlik duvarında kural ekleme.
- **[Yeni] Ağ Bağdaştırıcıları & Gateway/DNS Sağlık Taraması:** Aktif fiziksel adaptörlerin IPv4, Ağ Geçidi ve DNS sunucularını denetleme.

#### 4. 💾 Otomatik Yedekleme Aracı Modülü (`backup`)
- **[Yeni] Modüler Kaynak Seçimi:** Belgeler, Masaüstü, Resimler ve ULAK sistem ayarlarını ayrı ayrı seçebilme.
- **[Yeni] Özel Dizin & Proje Seçici:** Kullanıcının bilgisayarından seçtiği herhangi bir özel klasörü yedek paketine ekleme.
- **[Yeni] Tek Tıkla Geri Yükleme Motoru (One-Click Restore):** Arşivlenmiş `.zip` paketlerini Masaüstündeki güvenli kurtarma klasörüne tek tıkla açma.
- **[Yeni] Kriptografik SHA-256 Checksum Doğrulaması:** Arşiv dosyasının bozulup bozulmadığını ve bütünlüğünü denetleme.
- **[Yeni] Depolama Kapasitesi & Manifest İstatistikleri:** Toplam yedek boyutunu ve son yedekleme zaman damgasını gösteren canlı izleme kartları.

#### 5. 📦 Evrensel Paket Yükleyici Modülü (`pkg_installer`)
- **[Yeni] Microsoft Authenticode Dijital İmza Denetimi:** `.exe` ve `.msi` dosyalarının yayıncı sertifikasını doğrulayarak imzasız tehlikeli yazılımları işaretleme.
- **[Yeni] Canlı Winget & Chocolatey Bulut Deposu:** 5.000+ resmi yazılımı doğrudan arama ve tek tıkla kurma.
- **[Yeni] Katılımsız / Sessiz (Silent) Kurulum Desteği:** Kullanıcı müdahalesi gerektirmeden arka planda otomatik kurulum parametreleri.
- **[Yeni] Shannon Entropisi & Poliglot Kod Dedektörü:** Dosya içindeki gizli shellcode ve zararlı yükleri tespit eden güvenlik motoru.
- **[Yeni] Yüklü Windows Programları Listesi & Kaldırıcı:** Sistemdeki 32/64 bit yazılımları listeleyip kaldırma işlemini başlatma.

---

### 🎨 UI / UX & Tasarım Mühendisliği Geliştirmeleri
- **Mikro Etkileşimler:** Tüm interaktif butonlar ve kartlar dokunsal geri bildirim için `:active { transform: scale(0.96); }` fiziksel tepki motoruyla donatıldı.
- **Konsantrik Border Radius:** İç bileşenlerin köşe yuvarlaklıkları dış kartın yarıçapına orantılı olarak (`radius_inner = radius_outer - padding`) dengelendi.
- **Tabular Numerics:** Hızlar, megabaytlar, portlar, PID'ler, RSSI sinyalleri ve IP adresleri için `font-variant-numeric: tabular-nums` sabit genişlikli hizalama etkinleştirildi.
- **Sonner Bildirimleri:** Her kritik işlem (engelleme, tarama, yedekleme, onarım) için durum bildiren modern renkli bildirimler (success, warning, error, info) entegre edildi.
