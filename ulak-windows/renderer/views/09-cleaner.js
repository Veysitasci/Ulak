// VIEW 09: SİSTEM TEMİZLEYİCİ (GELİŞMİŞ 5 KRİTİK ÖZELLİK)
(function() {
  const view = {
    id: 'cleaner',
    title: 'Sistem Temizleyici',
    icon: 'trash',

    render() {
      const C = window.UlakComponents;
      return `
        <div class="cleaner-view">
          <div class="glass-card liquid-glow" style="margin-bottom: 20px; padding: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
              <div style="display: flex; align-items: center; gap: 14px;">
                <div class="setting-row-icon" style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: transparent !important; border: none !important; box-shadow: none !important;">
                  <img src="../assets/module_icons/sys_cleaner.png" class="view-header-3d-icon" style="width: 44px; height: 44px; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));" onerror="this.style.display=\'none\';" />
                </div>
                <div>
                  <div style="font-size: 19px; font-weight: 700; color: var(--text-1); letter-spacing: -0.01em;">Sistem & Disk Temizleyici Pro</div>
                  <div style="font-size: 13px; color: var(--text-2); margin-top: 3px;">Disk Sağlığı • Tarayıcı Verileri • Windows Update • DNS • Önbellek Sıfırlayıcı</div>
                </div>
              </div>
              <button class="btn btn-primary" id="cleaner-smart-deep-btn" style="padding: 12px 20px; font-weight: 700; box-shadow: 0 4px 14px rgba(var(--accent-rgb, 80,120,240), 0.35);">
                ${window.UlakIcons.getIcon('zap', 'icon-mono-sm')} Akıllı Tek Tıkla Derin Temizlik
              </button>
            </div>
          </div>

          <!-- 5 KRİTİK TEMİZLİK BİLEŞENİ (BENTO GRID) -->
          <div class="grid-3" style="margin-bottom: 20px; gap: 14px;">
            <!-- 1. Temp Dosyaları -->
            <div class="glass-card liquid-glow" style="padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div class="stat-tile-label">1. SİSTEM & KULLANICI TEMP</div>
                  <span class="chip" style="font-size: 10px;">Geçici</span>
                </div>
                <div class="stat-tile-value" id="cleaner-temp-val" style="font-variant-numeric: tabular-nums; margin: 8px 0;">Ölçülüyor...</div>
                <div class="stat-tile-sub">Windows AppData ve Temp dizinleri</div>
              </div>
              <button class="btn btn-primary btn-sm" id="cleaner-clean-temp-btn" style="margin-top: 14px; width: 100%;">
                ${window.UlakIcons.getIcon('trash', 'icon-mono-xs')} Temp Klasörünü Temizle
              </button>
            </div>

            <!-- 2. Çoklu Tarayıcı Önbelleği -->
            <div class="glass-card liquid-glow" style="padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div class="stat-tile-label">2. TARAYICI ÖNBELLEKLERİ</div>
                  <span class="chip chip-info" style="font-size: 10px;">Çoklu Web</span>
                </div>
                <div class="stat-tile-value" style="margin: 8px 0; font-size: 20px; color: var(--info);">Chrome & Edge</div>
                <div class="stat-tile-sub">Brave, Firefox ve Chromium Code Cache</div>
              </div>
              <button class="btn btn-secondary btn-sm" id="cleaner-clean-browser-btn" style="margin-top: 14px; width: 100%;">
                ${window.UlakIcons.getIcon('globe', 'icon-mono-xs')} Tarayıcıları Temizle
              </button>
            </div>

            <!-- 3. Windows Update Kalıntıları -->
            <div class="glass-card liquid-glow" style="padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div class="stat-tile-label">3. GÜNCELLEME KALINTILARI</div>
                  <span class="chip chip-accent" style="font-size: 10px;">Windows</span>
                </div>
                <div class="stat-tile-value" style="margin: 8px 0; font-size: 20px; color: var(--accent);">SoftwareDistribution</div>
                <div class="stat-tile-sub">İndirilmiş eski güncelleme paketleri</div>
              </div>
              <button class="btn btn-secondary btn-sm" id="cleaner-clean-update-btn" style="margin-top: 14px; width: 100%;">
                ${window.UlakIcons.getIcon('download', 'icon-mono-xs')} Güncelleme Alanını Boşalt
              </button>
            </div>

            <!-- 4. DNS Önbelleği & Ağ Sıfırlama -->
            <div class="glass-card liquid-glow" style="padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div class="stat-tile-label">4. DNS & SOKET ÖNBELLEĞİ</div>
                  <span class="chip chip-warning" style="font-size: 10px;">Ağ</span>
                </div>
                <div class="stat-tile-value" style="margin: 8px 0; font-size: 20px; color: var(--warning);">FlushDNS</div>
                <div class="stat-tile-sub">Bozuk DNS önbelleği & Netsh soket sıfırlama</div>
              </div>
              <button class="btn btn-secondary btn-sm" id="cleaner-flush-dns-btn" style="margin-top: 14px; width: 100%;">
                ${window.UlakIcons.getIcon('refresh', 'icon-mono-xs')} DNS Önbelleğini Sıfırla
              </button>
            </div>

            <!-- 5. Küçük Resim & Simge Önbelleği -->
            <div class="glass-card liquid-glow" style="padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div class="stat-tile-label">5. RESİM & SİMGE ÖNBELLEĞİ</div>
                  <span class="chip" style="font-size: 10px;">Görsel</span>
                </div>
                <div class="stat-tile-value" style="margin: 8px 0; font-size: 20px;">Thumbnails</div>
                <div class="stat-tile-sub">Bozuk simge ve explorer önizlemelerini onarır</div>
              </div>
              <button class="btn btn-secondary btn-sm" id="cleaner-clean-thumbs-btn" style="margin-top: 14px; width: 100%;">
                ${window.UlakIcons.getIcon('image', 'icon-mono-xs')} Simge Önbelleğini Onar
              </button>
            </div>

            <!-- Geri Dönüşüm Kutusu -->
            <div class="glass-card liquid-glow" style="padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div class="stat-tile-label">GERİ DÖNÜŞÜM KUTUSU</div>
                  <span class="chip chip-danger" style="font-size: 10px;">Kalıcı Silme</span>
                </div>
                <div class="stat-tile-value" style="margin: 8px 0; font-size: 20px; color: var(--danger);">Çöp Kutusu</div>
                <div class="stat-tile-sub">Tüm disklerdeki geri dönüşüm dosyaları</div>
              </div>
              <button class="btn btn-danger-soft btn-sm" id="cleaner-empty-recycle-btn" style="margin-top: 14px; width: 100%;">
                ${window.UlakIcons.getIcon('trash', 'icon-mono-xs')} Çöpü Tamamen Boşalt
              </button>
            </div>
          </div>

          <!-- Rapor Konsol Alanı -->
          <div class="view-section glass-card" style="padding: 0;">
            ${C.consoleCard('Sistem Temizleyici İşlem Raporu', 'Hazır. İstenen modülü veya Akıllı Derin Temizliği başlatın.', 'cleaner-rep-')}
          </div>
        </div>
      `;
    },

    async mount(el) {
      const repBody = el.querySelector('#cleaner-rep-body');
      const tempVal = el.querySelector('#cleaner-temp-val');

      // Temp boyutunu çek
      async function updateTempSize() {
        try {
          const sizeRes = await window.ulak.invoke('cleaner:get-temp-size');
          if (tempVal) tempVal.textContent = sizeRes.totalSizeMB ? `${sizeRes.totalSizeMB} MB` : '0 MB';
        } catch (e) {
          if (tempVal) tempVal.textContent = '0 MB';
        }
      }
      await updateTempSize();

      // 1. Temp Temizle
      el.querySelector('#cleaner-clean-temp-btn')?.addEventListener('click', async () => {
        repBody.textContent = '[+] Temp klasörleri taranıyor ve siliniyor...\n';
        window.UlakUI.toast('Temp temizliği başlatıldı...', 'info');
        try {
          const res = await window.ulak.invoke('cleaner:clean-temp');
          repBody.textContent += `[✔] Temp Temizliği Tamamlandı!\n    Silinen Dosya: ${res.deletedCount || 0}\n    Kurtarılan Alan: ${res.freedMB || 0} MB\n`;
          window.UlakUI.toast('Temp klasörü başarıyla temizlendi!', 'success');
          await updateTempSize();
        } catch (err) {
          repBody.textContent += `[-] Hata: ${err.message}\n`;
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        }
      });

      // 2. Tarayıcıları Temizle
      el.querySelector('#cleaner-clean-browser-btn')?.addEventListener('click', async () => {
        repBody.textContent = '[+] Chrome, Edge, Brave ve Firefox önbellekleri taranıyor...\n';
        window.UlakUI.toast('Tarayıcı önbellek temizliği yürütülüyor...', 'info');
        try {
          const res = await window.ulak.invoke('cleaner:clean-browser');
          repBody.textContent += `[✔] ${res.message}\n`;
          window.UlakUI.toast('Tarayıcı önbellekleri temizlendi!', 'success');
          await updateTempSize();
        } catch (err) {
          repBody.textContent += `[-] Hata: ${err.message}\n`;
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        }
      });

      // 3. Windows Update Temizle
      el.querySelector('#cleaner-clean-update-btn')?.addEventListener('click', async () => {
        repBody.textContent = '[+] Windows Update servisi durdurulup indirme önbelleği boşaltılıyor...\n';
        window.UlakUI.toast('Windows Update kalıntıları temizleniyor...', 'info');
        try {
          const res = await window.ulak.invoke('cleaner:clean-win-update');
          repBody.textContent += `[✔] ${res.message}\n`;
          window.UlakUI.toast('Windows Update önbelleği temizlendi!', 'success');
        } catch (err) {
          repBody.textContent += `[-] Hata: ${err.message}\n`;
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        }
      });

      // 4. DNS Sıfırla (FlushDNS)
      el.querySelector('#cleaner-flush-dns-btn')?.addEventListener('click', async () => {
        repBody.textContent = '[+] ipconfig /flushdns komutu yürütülüyor...\n';
        window.UlakUI.toast('DNS önbelleği sıfırlanıyor...', 'info');
        try {
          const res = await window.ulak.invoke('cleaner:flush-dns');
          repBody.textContent += `[✔] ${res.message}\n`;
          window.UlakUI.toast('DNS önbelleği başarıyla sıfırlandı!', 'success');
        } catch (err) {
          repBody.textContent += `[-] Hata: ${err.message}\n`;
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        }
      });

      // 5. Küçük Resim & Simge Önbelleği
      el.querySelector('#cleaner-clean-thumbs-btn')?.addEventListener('click', async () => {
        repBody.textContent = '[+] Windows simge ve küçük resim önbelleği sıfırlanıyor...\n';
        window.UlakUI.toast('Simge önbelleği temizleniyor...', 'info');
        try {
          const res = await window.ulak.invoke('cleaner:clean-thumbnails');
          repBody.textContent += `[✔] ${res.message}\n`;
          window.UlakUI.toast('Simge önbelleği başarıyla temizlendi!', 'success');
        } catch (err) {
          repBody.textContent += `[-] Hata: ${err.message}\n`;
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        }
      });

      // Geri Dönüşüm Kutusunu Boşalt
      el.querySelector('#cleaner-empty-recycle-btn')?.addEventListener('click', async () => {
        const ok = await window.UlakUI.confirm('Geri Dönüşüm Kutusunu Boşalt', 'Geri dönüşüm kutusundaki tüm dosyalar kalıcı olarak silinecektir. Emin misiniz?', 'Boşalt');
        if (ok) {
          repBody.textContent = '[+] Geri dönüşüm kutusu boşaltılıyor...\n';
          try {
            await window.ulak.invoke('cleaner:empty-recycle');
            repBody.textContent += '[✔] Geri dönüşüm kutusu başarıyla tamamen boşaltıldı.\n';
            window.UlakUI.toast('Çöp kutusu boşaltıldı!', 'success');
          } catch (err) {
            repBody.textContent += `[-] Hata: ${err.message}\n`;
            window.UlakUI.toast(`Hata: ${err.message}`, 'error');
          }
        }
      });

      // Akıllı Tek Tıkla Derin Temizlik (Smart Deep Clean)
      el.querySelector('#cleaner-smart-deep-btn')?.addEventListener('click', async () => {
        const ok = await window.UlakUI.confirm('Akıllı Derin Temizlik', 'Temp dosyaları, tüm tarayıcı önbellekleri, Windows Update indirmeleri ve DNS önbelleği tek seferde temizlenecektir. Devam edilsin mi?', 'Derin Temizlik Yap');
        if (!ok) return;

        repBody.textContent = '==========================================\n';
        repBody.textContent += '  AKILLI DERİN SİSTEM TEMİZLİĞİ BAŞLADI  \n';
        repBody.textContent += '==========================================\n';
        window.UlakUI.toast('Akıllı derin temizlik yürütülüyor...', 'info');

        try {
          const res = await window.ulak.invoke('cleaner:smart-deep');
          repBody.textContent += `[✔] ${res.message}\n`;
          repBody.textContent += `[+] Toplam Kurtarılan Disk Alanı: ~${res.freedMB || 0} MB\n`;
          repBody.textContent += `[+] Temp, Tarayıcılar, DNS, Güncellemeler ve İkonlar optimize edildi.\n`;
          window.UlakUI.toast(`Derin temizlik tamamlandı! ~${res.freedMB} MB alan kazanıldı.`, 'success');
          await updateTempSize();
        } catch (err) {
          repBody.textContent += `[-] Derin temizlik hatası: ${err.message}\n`;
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        }
      });

      // Kopyala & Temizle butonları
      el.querySelector('#cleaner-rep-copy-btn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(repBody.innerText);
        window.UlakUI.toast('Rapor panoya kopyalandı.', 'info');
      });
      el.querySelector('#cleaner-rep-clear-btn')?.addEventListener('click', () => {
        repBody.textContent = 'Hazır.';
      });
    }
  };

  window.UlakRouter.register(view);
})();
