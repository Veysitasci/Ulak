const fs = require('fs');
const path = require('path');
const os = require('os');

class LocalHardwareCache {
  constructor(options = {}) {
    // Depolama dizini belirleme
    this.storageDir = options.storageDir || path.join(os.homedir(), '.config', 'ulak');
    this.storageFile = path.join(this.storageDir, 'hardware_cache.json');
    
    // Bellek içi önbellek
    this.memoryCache = new Map();
    
    // Varsayılan TTL süreleri (milisaniye)
    this.defaultTTLs = {
      cpuStatic: 24 * 60 * 60 * 1000,    // 24 saat (CPU adı, çekirdek, mimari)
      cpuUsage: 2000,                    // 2 saniye (Anlık CPU yükü)
      memory: 2500,                      // 2.5 saniye (RAM kullanımı)
      memoryStatic: 24 * 60 * 60 * 1000, // 24 saat (Toplam RAM)
      disk: 30000,                       // 30 saniye (Disk alanları)
      network: 15000,                    // 15 saniye (Ağ adaptörleri & IP)
      battery: 45000,                    // 45 saniye (Pil durumu)
      platform: 24 * 60 * 60 * 1000,     // 24 saat (OS, sürüm, hostname)
      processes: 5000                    // 5 saniye (İşlemler)
    };

    // İstatistikler (Donanıma gitmeden cache'den sağlanan tasarruf)
    this.stats = {
      hits: 0,
      misses: 0,
      diskSaves: 0,
      lastSaved: null
    };

    this._initStorage();
  }

  _initStorage() {
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }

      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf8');
        const diskData = JSON.parse(raw);
        
        // Yerel diskten kalıcı donanım verilerini belleğe yükle
        if (diskData && typeof diskData === 'object') {
          for (const [key, entry] of Object.entries(diskData)) {
            // Statik verileri geçerli kıl
            this.memoryCache.set(key, {
              data: entry.data,
              timestamp: entry.timestamp || Date.now(),
              ttl: entry.ttl || this.defaultTTLs[key] || 60000,
              isFromDisk: true
            });
          }
        }
      }
    } catch (err) {
      console.warn('[ULAK Cache] Yerel depolama başlatma uyarısı:', err.message);
    }
  }

  get(key, maxAge = null) {
    if (!this.memoryCache.has(key)) {
      this.stats.misses++;
      return null;
    }

    const entry = this.memoryCache.get(key);
    const ttl = maxAge !== null ? maxAge : entry.ttl;
    const isExpired = (Date.now() - entry.timestamp) > ttl;

    if (isExpired) {
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  set(key, data, ttl = null, persistToDisk = true) {
    const itemTtl = ttl || this.defaultTTLs[key] || 30000;
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: itemTtl,
      isFromDisk: false
    });

    if (persistToDisk) {
      this._scheduleSave();
    }
  }

  invalidate(key) {
    if (key) {
      this.memoryCache.delete(key);
    } else {
      this.memoryCache.clear();
    }
  }

  _scheduleSave() {
    if (this._saveTimeout) return;
    this._saveTimeout = setTimeout(() => {
      this._saveTimeout = null;
      this.persistNow();
    }, 1000);
  }

  persistNow() {
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }

      const exportData = {};
      // Sadece kalıcı kılınmaya değer donanım ve sistem verilerini diske kaydet
      const persistentKeys = ['cpuStatic', 'memoryStatic', 'disk', 'network', 'battery', 'platform'];

      for (const [key, entry] of this.memoryCache.entries()) {
        if (persistentKeys.includes(key)) {
          exportData[key] = {
            data: entry.data,
            timestamp: entry.timestamp,
            ttl: entry.ttl
          };
        }
      }

      fs.writeFileSync(this.storageFile, JSON.stringify(exportData, null, 2), 'utf8');
      this.stats.diskSaves++;
      this.stats.lastSaved = new Date().toISOString();
    } catch (err) {
      console.error('[ULAK Cache] Diske yazma hatası:', err.message);
    }
  }

  getAllCachedData() {
    const result = {};
    for (const [key, entry] of this.memoryCache.entries()) {
      result[key] = {
        data: entry.data,
        ageMs: Date.now() - entry.timestamp,
        ttl: entry.ttl,
        isExpired: (Date.now() - entry.timestamp) > entry.ttl
      };
    }
    return {
      cache: result,
      stats: this.stats,
      storageFile: this.storageFile
    };
  }
}

module.exports = LocalHardwareCache;
