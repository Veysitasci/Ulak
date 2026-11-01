# ULAK Windows — Sürüm & Modül Değişiklik Günlüğü (Changelog)

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
- Sayısal değerler için layout shift'i engelleyen `font-variant-numeric: tabular-nums` entegrasyonu.
- Altın Oranlı butonlarda dokunsal basma hissi sağlayan `:active { transform: scale(0.96); }` davranışı.
- Bento grid kartlarında konsantrik border-radius uyumu (`R_dış = R_iç + padding`).
- Sonner esintili akıllı toast bildirimleri ve yüklenme/hata durum kartları.
- Tüm 5 modülün varsayılan olarak aktif gelmesini sağlayan oturum yönetimi.
