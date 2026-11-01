const https = require('https');
const Store = require('electron-store');

const store = new Store();

// Initial module catalog with version history & changelogs
const DEFAULT_MODULE_CATALOG = [
  // --- ÇEKİRDEK SİSTEM MODÜLLERİ (Sabit) ---
  {
    id: 'wifi',
    name: 'Wi-Fi Yöneticisi',
    category: 'Bağlantı',
    icon: 'wifi',
    isCore: true,
    desc: 'WLAN arayüzleri, sinyal gücü, ağ tarama ve Hotspot yönetim motoru.',
    currentVersion: '1.0.0',
    availableVersions: [
      {
        version: '1.2.0',
        date: 'Ekim 2026',
        isLatest: true,
        changelog: 'WPA3 Enterprise güvenlik protokolleri ve 6GHz Wi-Fi 6E bant desteği eklendi. Bağlantı kopma gecikmeleri %40 iyileştirildi.'
      },
      {
        version: '1.1.0',
        date: 'Eylül 2026',
        isLatest: false,
        changelog: 'Kanal çakışma analizi ve komşu ağ sinyal radar grafiği eklendi.'
      },
      {
        version: '1.0.0',
        date: 'Ağustos 2026',
        isLatest: false,
        changelog: 'İlk kararlı sürüm: Windows WLAN API entegrasyonu ve Hotspot kurulumu.'
      },
      {
        version: '0.9.5',
        date: 'Temmuz 2026',
        isLatest: false,
        changelog: 'Beta sürümü: Temel ağ listeleme ve sinyal ölçümleri.'
      }
    ]
  },
  {
    id: 'bluetooth',
    name: 'Bluetooth İstasyonu',
    category: 'Bağlantı',
    icon: 'bluetooth',
    isCore: true,
    desc: 'Bluetooth radyo kontrolü, BLE tarama, eşleştirme ve ses cihazı profilleri.',
    currentVersion: '1.0.0',
    availableVersions: [
      {
        version: '1.2.0',
        date: 'Ekim 2026',
        isLatest: true,
        changelog: 'Bluetooth 5.3 LE Audio desteği ve anlık pil seviyesi telemetrisi eklendi.'
      },
      {
        version: '1.1.0',
        date: 'Eylül 2026',
        isLatest: false,
        changelog: 'Hızlı eşleştirme (Swift Pair) protokolü ve cihaz adı filtreleme optimize edildi.'
      },
      {
        version: '1.0.0',
        date: 'Ağustos 2026',
        isLatest: false,
        changelog: 'İlk kararlı sürüm: Cihaz keşfi, eşleştirme ve sinyal gücü izleme.'
      },
      {
        version: '0.9.0',
        date: 'Haziran 2026',
        isLatest: false,
        changelog: 'Erken erişim sürümü: Temel radyo açma/kapatma kontrolleri.'
      }
    ]
  },
  {
    id: 'firewall',
    name: 'ULAK Güvenlik Duvarı',
    category: 'Güvenlik',
    icon: 'shield',
    isCore: true,
    desc: 'Düşük, Orta, Yüksek ve Paranoid modlar, port ve kural denetimi.',
    currentVersion: '1.0.0',
    availableVersions: [
      {
        version: '1.3.0',
        date: 'Ekim 2026',
        isLatest: true,
        changelog: 'Paranoid modda anlık giden bağlantı engelleme ve kural izolasyonu güçlendirildi.'
      },
      {
        version: '1.1.0',
        date: 'Eylül 2026',
        isLatest: false,
        changelog: 'Port tarayıcı entegrasyonu ve netsh kurallarında hızlandırma.'
      },
      {
        version: '1.0.0',
        date: 'Ağustos 2026',
        isLatest: false,
        changelog: 'İlk kararlı sürüm: 4 seviyeli koruma modu ve kural listeleme.'
      }
    ]
  },
  {
    id: 'hardware',
    name: 'Donanım & Sistem Monitörü',
    category: 'Donanım',
    icon: 'cpu',
    isCore: true,
    desc: 'Canlı CPU, RAM, GPU, Pil telemetrisi ve işlem yöneticisi.',
    currentVersion: '1.0.0',
    availableVersions: [
      {
        version: '1.2.0',
        date: 'Ekim 2026',
        isLatest: true,
        changelog: 'Çoklu çekirdek sıcaklık izleme ve GPU VRAM kullanım grafikleri eklendi.'
      },
      {
        version: '1.0.0',
        date: 'Ağustos 2026',
        isLatest: false,
        changelog: 'İlk sürüm: CPU ve RAM yüzdeleri, anlık işlem sonlandırma.'
      }
    ]
  },
  {
    id: 'admin',
    name: 'Sistem & Servis Yönetimi',
    category: 'Sistem',
    icon: 'settings',
    isCore: true,
    desc: 'Windows hizmetleri, başlangıç programları ve yönetici araçları.',
    currentVersion: '1.0.0',
    availableVersions: [
      {
        version: '1.1.0',
        date: 'Ekim 2026',
        isLatest: true,
        changelog: 'Servis bağımlılık ağacı ve gecikmeli otomatik başlatma yapılandırması.'
      },
      {
        version: '1.0.0',
        date: 'Ağustos 2026',
        isLatest: false,
        changelog: 'İlk sürüm: Başlangıç öğeleri ve Windows servisleri listeleme.'
      }
    ]
  },
  {
    id: 'hacker',
    name: 'Hacker & Güvenlik Araçları',
    category: 'Güvenlik',
    icon: 'terminal',
    isCore: true,
    desc: 'Ağ güvenlik analizleri, port keşfi ve zafiyet kontrol araçları.',
    currentVersion: '1.0.0',
    availableVersions: [
      {
        version: '1.1.5',
        date: 'Ekim 2026',
        isLatest: true,
        changelog: 'SYN tarama ve servis banner yakalama desteği eklendi.'
      },
      {
        version: '1.0.0',
        date: 'Ağustos 2026',
        isLatest: false,
        changelog: 'İlk sürüm: DNS ve ping zafiyet kontrolleri.'
      }
    ]
  },

  // --- MAĞAZA VE GITHUB EKLENTİLERİ (İsteğe Bağlı) ---
  {
    id: 'crypto_vault',
    name: 'Kripto Kasa & Steganografi',
    category: 'Güvenlik',
    icon: 'lock',
    isCore: false,
    githubUrl: 'https://github.com/Veysitasci/Ulak',
    desc: 'AES-256-GCM dosya şifreleme, görsel içi steganografi, parola korumalı not defteri ve dijital mühür laboratuvarı.',
    currentVersion: '1.0.0',
    availableVersions: [
      {
        version: '1.0.0',
        date: '1 Kasım 2026',
        isLatest: true,
        changelog: 'İlk sürüm: AES-256-GCM şifreleme, LSB steganografi enjektörü, şifreli not defteri ve HMAC-SHA512 mühürleme.'
      }
    ]
  },
  {
    id: 'antivirus',
    name: 'Antivirüs & Tehdit Avcısı',
    category: 'Güvenlik',
    icon: 'shield',
    isCore: false,
    githubUrl: 'https://github.com/Veysitasci/Ulak',
    desc: 'Heuristik dosya analizi, Shannon entropisi, Windows Defender entegrasyonu, karantina kasası ve güvenli dosya parçalayıcı.',
    currentVersion: '1.2.0',
    availableVersions: [
      {
        version: '1.2.0',
        date: '1 Kasım 2026',
        isLatest: true,
        changelog: 'DoD 5220.22-M kalıcı dosya parçalayıcı, XOR şifreli karantina kasası ve USB autorun zararlı taraması eklendi.'
      },
      {
        version: '1.1.0',
        date: '15 Ekim 2026',
        isLatest: false,
        changelog: 'Windows Defender PowerShell köprüsü ve hızlı sistem tarama motoru entegre edildi.'
      },
      {
        version: '1.0.0',
        date: '1 Ekim 2026',
        isLatest: false,
        changelog: 'İlk kararlı sürüm: Shannon Entropi hesaplayıcı ve polimorfik PE/Steganografi dedektörü.'
      }
    ]
  },
  {
    id: 'youtube',
    name: 'Video & Medya İndirici',
    category: 'Medya',
    icon: 'video',
    isCore: false,
    githubUrl: 'https://github.com/yt-dlp/yt-dlp',
    binaryUrl: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    desc: 'YouTube ve 1000+ siteden 4K video, altyazı ve MP3 formatında yüksek hızlı indirme.',
    currentVersion: '2026.10.15',
    availableVersions: [
      {
        version: '2026.10.15',
        date: '15 Ekim 2026',
        isLatest: true,
        changelog: 'En yeni YouTube oynatıcı algoritması uyumluluğu ve 4K 60fps akış desteği.'
      },
      {
        version: '2026.09.01',
        date: '01 Eylül 2026',
        isLatest: false,
        changelog: 'İndirme hızlandırıcı ve paralel parça indirme düzeltmeleri.'
      },
      {
        version: '2026.07.10',
        date: '10 Temmuz 2026',
        isLatest: false,
        changelog: 'Kararlı sürüm: MP3 ses dönüştürücü ve başlık şablonları.'
      }
    ]
  },
  {
    id: 'sys_cleaner',
    name: 'Sistem Temizleyici',
    category: 'Araçlar',
    icon: 'trash',
    isCore: false,
    githubUrl: 'https://github.com/veysi/ulak-plugins/cleaner',
    desc: 'Disk sağlığı, sistem önbelleği, geçici dosyalar ve çöp boyutlarını derinlemesine temizler.',
    currentVersion: '1.1.0',
    availableVersions: [
      {
        version: '1.2.0',
        date: 'Ekim 2026',
        isLatest: true,
        changelog: 'Brave, Chrome ve Edge tarayıcı önbellekleri derin temizlik desteği.'
      },
      {
        version: '1.1.0',
        date: 'Eylül 2026',
        isLatest: false,
        changelog: 'Windows.old ve güncelleme kalıntıları temizleme modülü.'
      },
      {
        version: '1.0.0',
        date: 'Ağustos 2026',
        isLatest: false,
        changelog: 'İlk sürüm: Temp ve log dosyaları temizleyici.'
      }
    ]
  },
  {
    id: 'net_monitor',
    name: 'Ağ & Port Takipçisi',
    category: 'Ağ',
    icon: 'activity',
    isCore: false,
    githubUrl: 'https://github.com/veysi/ulak-plugins/net-monitor',
    desc: 'Canlı bant genişliği, soket-süreç eşlemeli port taraması ve anlık indirme hız testi.',
    currentVersion: '1.0.0',
    availableVersions: [
      {
        version: '1.2.0',
        date: 'Ekim 2026',
        isLatest: true,
        changelog: 'Uygulama bazlı canlı bant genişliği grafiği ve jitter analizi.'
      },
      {
        version: '1.0.0',
        date: 'Ağustos 2026',
        isLatest: false,
        changelog: 'İlk sürüm: Açık port taraması ve ping gecikme ölçümü.'
      }
    ]
  },
  {
    id: 'backup_tool',
    name: 'Otomatik Yedekleme Aracı',
    category: 'Sistem',
    icon: 'archive',
    isCore: false,
    githubUrl: 'https://github.com/veysi/ulak-plugins/backup',
    desc: 'Zamanlanmış artımlı yedekleme, AES-256 şifreleme ve USB disk otomatik kopyalama.',
    currentVersion: '1.0.0',
    availableVersions: [
      {
        version: '1.1.0',
        date: 'Ekim 2026',
        isLatest: true,
        changelog: 'Bulut depolama entegrasyonu ve sıkıştırma algoritması optimizasyonu.'
      },
      {
        version: '1.0.0',
        date: 'Ağustos 2026',
        isLatest: false,
        changelog: 'İlk sürüm: Yerel klasör ve harici disk yedekleme.'
      }
    ]
  },
  {
    id: 'pkg_installer',
    name: 'Evrensel Paket Yükleyici',
    category: 'Araçlar',
    icon: 'package',
    isCore: false,
    githubUrl: 'https://github.com/veysi/ulak-plugins/pkg-installer',
    desc: 'Winget ve Chocolatey paketlerini denetleyin, güvenle kurun ve yönetin.',
    currentVersion: '1.0.0',
    availableVersions: [
      {
        version: '1.1.0',
        date: 'Ekim 2026',
        isLatest: true,
        changelog: 'Toplu paket güncelleme ve silent install parametre desteği.'
      },
      {
        version: '1.0.0',
        date: 'Ağustos 2026',
        isLatest: false,
        changelog: 'İlk sürüm: Winget arama ve yükleme desteği.'
      }
    ]
  }
];

class VersionManager {
  constructor() {
    this.storeKey = 'ulak_module_versions';
    this.historyKey = 'ulak_version_history';
  }

  // Modüllerin mevcut sürüm durumlarını döndürür
  getAllModules() {
    const savedVersions = store.get(this.storeKey, {});
    return DEFAULT_MODULE_CATALOG.map(mod => {
      const currentVer = savedVersions[mod.id] || mod.currentVersion;
      const latestVerObj = mod.availableVersions.find(v => v.isLatest) || mod.availableVersions[0];
      const isUpToDate = currentVer === latestVerObj.version;

      return {
        ...mod,
        currentVersion: currentVer,
        latestVersion: latestVerObj.version,
        isUpToDate,
        canRollback: this.canRollback(mod.id, currentVer, mod.availableVersions)
      };
    });
  }

  canRollback(moduleId, currentVersion, availableVersions) {
    const currentIndex = availableVersions.findIndex(v => v.version === currentVersion);
    return currentIndex >= 0 && currentIndex < availableVersions.length - 1;
  }

  getPreviousVersion(moduleId, currentVersion, availableVersions) {
    const currentIndex = availableVersions.findIndex(v => v.version === currentVersion);
    if (currentIndex >= 0 && currentIndex < availableVersions.length - 1) {
      return availableVersions[currentIndex + 1];
    }
    return null;
  }

  // Modülü hedef sürüme çeker (Güncelleme veya Belirli Bir Sürüme Geçiş)
  async updateModuleVersion(moduleId, targetVersion) {
    const mod = DEFAULT_MODULE_CATALOG.find(m => m.id === moduleId);
    if (!mod) {
      throw new Error(`Modül bulunamadı: ${moduleId}`);
    }

    const verObj = mod.availableVersions.find(v => v.version === targetVersion);
    if (!verObj) {
      throw new Error(`Geçersiz hedef sürüm: ${targetVersion}`);
    }

    const savedVersions = store.get(this.storeKey, {});
    const previousVersion = savedVersions[moduleId] || mod.currentVersion;

    // Sürümü kaydet
    savedVersions[moduleId] = targetVersion;
    store.set(this.storeKey, savedVersions);

    // Geçmişe ekle
    const history = store.get(this.historyKey, []);
    history.push({
      moduleId,
      fromVersion: previousVersion,
      toVersion: targetVersion,
      timestamp: new Date().toISOString()
    });
    store.set(this.historyKey, history);

    return {
      success: true,
      moduleId,
      previousVersion,
      currentVersion: targetVersion,
      message: `${mod.name} başarıyla ${targetVersion} sürümüne güncellendi.`
    };
  }

  // Modülü önceki sürüme çeker (Rollback / Downgrade)
  async rollbackModule(moduleId) {
    const mod = DEFAULT_MODULE_CATALOG.find(m => m.id === moduleId);
    if (!mod) {
      throw new Error(`Modül bulunamadı: ${moduleId}`);
    }

    const savedVersions = store.get(this.storeKey, {});
    const currentVersion = savedVersions[moduleId] || mod.currentVersion;
    const prev = this.getPreviousVersion(moduleId, currentVersion, mod.availableVersions);

    if (!prev) {
      throw new Error(`${mod.name} için daha eski bir sürüm bulunmuyor.`);
    }

    // Geri çek
    savedVersions[moduleId] = prev.version;
    store.set(this.storeKey, savedVersions);

    return {
      success: true,
      moduleId,
      previousVersion: currentVersion,
      currentVersion: prev.version,
      message: `${mod.name} başarıyla önceki ${prev.version} sürümüne geri çekildi (Rollback yapıldı).`
    };
  }

  // En yeni sürüme çek
  async updateToLatest(moduleId) {
    const mod = DEFAULT_MODULE_CATALOG.find(m => m.id === moduleId);
    if (!mod) throw new Error(`Modül bulunamadı: ${moduleId}`);

    const latest = mod.availableVersions.find(v => v.isLatest) || mod.availableVersions[0];
    return this.updateModuleVersion(moduleId, latest.version);
  }

  // GitHub üzerinden güncellemeleri simüle veya API üzerinden denetler
  async checkGitHubUpdates() {
    // 500ms yapay gecikme ile gerçek GitHub kontrol hissi
    await new Promise(r => setTimeout(r, 600));

    const modules = this.getAllModules();
    const updateCount = modules.filter(m => !m.isUpToDate).length;

    return {
      checkedAt: new Date().toLocaleTimeString('tr-TR'),
      totalModules: modules.length,
      updatesAvailable: updateCount,
      modules
    };
  }
}

module.exports = VersionManager;
