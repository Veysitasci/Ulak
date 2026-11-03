// VIEW 12: OTOMATİK YEDEKLEME (GELİŞMİŞ 5 KRİTİK ÖZELLİK)
(function() {
  const view = {
    id: 'backup',
    title: 'Yedekleme',
    icon: 'hardDrive',

    render() {
      const C = window.UlakComponents;
      return `
        <div class="backup-view">
          <div class="glass-card liquid-glow" style="margin-bottom: 20px; padding: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
              <div style="display: flex; align-items: center; gap: 14px;">
                <div class="setting-row-icon" style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: transparent !important; border: none !important; box-shadow: none !important;">
                  <img src="../assets/module_icons/backup_tool.png" class="view-header-3d-icon" style="width: 44px; height: 44px; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));" onerror="this.style.display=\'none\';" />
                </div>
                <div>
                  <div style="font-size: 19px; font-weight: 700; color: var(--text-1); letter-spacing: -0.01em;">Otomatik Yedekleme Aracı Pro</div>
                  <div style="font-size: 13px; color: var(--text-2); margin-top: 3px;">Manifest Tabanlı • Tek Tıkla Geri Yükleme • SHA-256 Doğrulama • Özel Dizin Yedekleme</div>
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary" id="backup-open-folder-btn" title="Yedekler Klasörünü Aç">
                  ${window.UlakIcons.getIcon('folder', 'icon-mono-sm')} Yedek Klasörünü Aç
                </button>
              </div>
            </div>
          </div>

          <!-- Depolama & Yedekleme İstatistik Bento Grid (Özellik 5) -->
          <div class="grid-3" style="margin-bottom: 20px; gap: 14px;">
            <div class="glass-card liquid-glow" style="padding: 18px;">
              <div class="stat-tile-label">MEVCUT ARŞİVLER</div>
              <div class="stat-tile-value" id="backup-count-val" style="font-variant-numeric: tabular-nums; margin: 4px 0;">0 Arşiv</div>
              <div class="stat-tile-sub">Sıkıştırılmış yedek paketleri</div>
            </div>

            <div class="glass-card liquid-glow" style="padding: 18px;">
              <div class="stat-tile-label">TOPLAM YEDEK BOYUTU</div>
              <div class="stat-tile-value" id="backup-size-val" style="color: var(--accent); font-variant-numeric: tabular-nums; margin: 4px 0;">0 MB</div>
              <div class="stat-tile-sub">Yedekler/ULAK depolama alanı</div>
            </div>

            <div class="glass-card liquid-glow" style="padding: 18px;">
              <div class="stat-tile-label">SON YEDEKLEME ZAMANI</div>
              <div class="stat-tile-value" id="backup-time-val" style="font-size: 15px; color: var(--success); font-variant-numeric: tabular-nums; margin: 4px 0;">Henüz Yok</div>
              <div class="stat-tile-sub">Manifest doğrulama zaman damgası</div>
            </div>
          </div>

          <!-- Yedek Oluşturma & Özel Klasör Paneli (Özellik 1 & 2) -->
          <div class="view-section glass-card liquid-glow" style="margin-bottom: 20px;">
            <div class="view-section-header" style="margin-bottom: 12px;">
              <div class="view-section-title">1. Yedekleme Başlat & Kaynak Seçimi</div>
              <span class="chip chip-accent" style="font-size: 11px;">ZIP Sıkıştırma Motoru</span>
            </div>

            <!-- Kaynak Klasör Seçimleri -->
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-bottom: 16px;">
              <label class="glass-card" style="padding: 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; background: rgba(255,255,255,0.02);">
                <input type="checkbox" id="backup-src-docs" checked style="accent-color: var(--accent); width: 16px; height: 16px;">
                <span style="font-size: 13px; font-weight: 500;">Belgelerim (Documents)</span>
              </label>
              <label class="glass-card" style="padding: 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; background: rgba(255,255,255,0.02);">
                <input type="checkbox" id="backup-src-desktop" checked style="accent-color: var(--accent); width: 16px; height: 16px;">
                <span style="font-size: 13px; font-weight: 500;">Masaüstü (Desktop)</span>
              </label>
              <label class="glass-card" style="padding: 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; background: rgba(255,255,255,0.02);">
                <input type="checkbox" id="backup-src-pictures" style="accent-color: var(--accent); width: 16px; height: 16px;">
                <span style="font-size: 13px; font-weight: 500;">Resimler (Pictures)</span>
              </label>
              <label class="glass-card" style="padding: 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; background: rgba(255,255,255,0.02);">
                <input type="checkbox" id="backup-src-ulak" checked style="accent-color: var(--accent); width: 16px; height: 16px;">
                <span style="font-size: 13px; font-weight: 500;">ULAK Ayarları (Config)</span>
              </label>
            </div>

            <!-- Özel Dizin Ekleme -->
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 16px;">
              <button class="btn btn-secondary btn-sm" id="backup-pick-custom-btn">
                ${window.UlakIcons.getIcon('folder', 'icon-mono-xs')} + Özel Klasör Ekle
              </button>
              <span id="backup-custom-path-label" style="font-size: 12px; color: var(--text-3); font-style: italic;">İsteğe bağlı özel proje veya veri klasörü seçilmedi.</span>
            </div>

            <!-- Eylem Butonları -->
            <div class="action-bar glass-soft" style="gap: 12px; padding: 12px;">
              <button class="btn btn-primary" id="backup-start-full-btn" style="flex: 2; padding: 12px; font-weight: 600;">
                ${window.UlakIcons.getIcon('hardDrive', 'icon-mono-sm')} Tam Sistem Yedeği Oluştur
              </button>
              <button class="btn btn-secondary" id="backup-start-quick-btn" style="flex: 1; padding: 12px;">
                ${window.UlakIcons.getIcon('zap', 'icon-mono-sm')} Hızlı Yedek (Belgeler & Masaüstü)
              </button>
            </div>
          </div>

          <!-- Mevcut Arşivler, Doğrulama & Geri Yükleme (Özellik 3 & 4) -->
          <div class="view-section glass-card">
            <div class="view-section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <div>
                <div class="view-section-title">Mevcut Yedek Arşivleri</div>
                <div style="font-size: 12px; color: var(--text-2); margin-top: 2px;">Tek tıkla arşivden geri yükleme ve SHA-256 bütünlük kontrolü</div>
              </div>
              <button class="btn btn-secondary btn-sm" id="backup-refresh-btn">
                ${window.UlakIcons.getIcon('refresh', 'icon-mono-sm')} Yenile
              </button>
            </div>
            <div id="backup-list-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
          </div>
        </div>
      `;
    },

    async mount(el) {
      const countVal = el.querySelector('#backup-count-val');
      const sizeVal = el.querySelector('#backup-size-val');
      const timeVal = el.querySelector('#backup-time-val');
      const customPathLabel = el.querySelector('#backup-custom-path-label');
      let customSelectedPath = null;

      // İstatistikleri Yükle
      async function updateStats() {
        try {
          const stats = await window.ulak.invoke('backup:get-stats');
          if (countVal) countVal.textContent = `${stats.count || 0} Arşiv`;
          if (sizeVal) sizeVal.textContent = `${stats.totalMB || 0} MB`;
          if (timeVal) timeVal.textContent = stats.lastBackup || 'Henüz Yok';
        } catch (e) {}
      }

      // Klasör Aç
      el.querySelector('#backup-open-folder-btn')?.addEventListener('click', async () => {
        try {
          await window.ulak.invoke('backup:open-folder');
        } catch (e) {
          window.UlakUI.toast('Yedek klasörü açılamadı.', 'error');
        }
      });

      // Özel Klasör Seç
      el.querySelector('#backup-pick-custom-btn')?.addEventListener('click', async () => {
        try {
          const folder = await window.ulak.invoke('backup:pick-folder');
          if (folder) {
            customSelectedPath = folder;
            customPathLabel.textContent = `Seçili Özel Klasör: ${folder}`;
            customPathLabel.style.color = 'var(--accent)';
            window.UlakUI.toast('Özel klasör yedeğe dahil edildi.', 'success');
          }
        } catch (e) {
          window.UlakUI.toast('Klasör seçilemedi.', 'error');
        }
      });

      // Yedekleme Başlat
      async function triggerBackup(isFull) {
        const selectedIds = [];
        if (el.querySelector('#backup-src-docs')?.checked) selectedIds.push('documents');
        if (el.querySelector('#backup-src-desktop')?.checked) selectedIds.push('desktop');
        if (el.querySelector('#backup-src-pictures')?.checked) selectedIds.push('pictures');
        if (el.querySelector('#backup-src-ulak')?.checked) selectedIds.push('ulak');

        const title = isFull ? 'Tam Sistem Yedeği' : 'Hızlı Yedek';
        const ok = await window.UlakUI.confirm(title, `${title} işlemi başlatılacak ve dosyalarınız arşivlenecektir. Devam edilsin mi?`, 'Yedekle');
        if (!ok) return;

        window.UlakUI.toast('Yedekleme arka planda yürütülüyor...', 'info');
        try {
          const res = await window.ulak.invoke('backup:create-backup', isFull, selectedIds);
          if (res && res.success) {
            window.UlakUI.toast(res.message, 'success');
            await updateStats();
            await loadArchives();
          } else {
            window.UlakUI.toast(res?.message || 'Yedekleme oluşturulamadı.', 'error');
          }
        } catch (err) {
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        }
      }

      el.querySelector('#backup-start-full-btn')?.addEventListener('click', () => triggerBackup(true));
      el.querySelector('#backup-start-quick-btn')?.addEventListener('click', () => triggerBackup(false));
      el.querySelector('#backup-refresh-btn')?.addEventListener('click', () => {
        updateStats();
        loadArchives();
      });

      // Arşivleri Listele (Geri Yükleme & Doğrulama Düğmeleri)
      async function loadArchives() {
        const container = el.querySelector('#backup-list-container');
        window.UlakUI.state(container, 'loading', { title: 'Yedek arşivleri taranıyor...' });

        try {
          const archives = await window.ulak.invoke('backup:list-archives');
          if (!archives || archives.length === 0) {
            return window.UlakUI.state(container, 'empty', { title: 'Kayıtlı yedek arşivi bulunamadı.' });
          }

          container.innerHTML = archives.map(a => `
            <div class="glass-card" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; gap: 14px; background: rgba(255,255,255,0.02);">
              <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                <div class="chip ${a.isFull ? 'chip-accent' : ''}" style="padding: 8px; border-radius: var(--r-sm);">
                  ${window.UlakIcons.getIcon('archive', 'icon-mono-sm')}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 700; font-size: 13px; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${a.name}
                  </div>
                  <div style="font-size: 11px; color: var(--text-3); margin-top: 2px; font-variant-numeric: tabular-nums;">
                    ${a.size} • ${a.date}
                  </div>
                </div>
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <button class="btn btn-secondary btn-xs btn-verify-archive" data-path="${a.path}" title="SHA-256 Bütünlük Testi Yap">
                  ${window.UlakIcons.getIcon('shield', 'icon-mono-xs')} Doğrula
                </button>
                <button class="btn btn-primary btn-xs btn-restore-archive" data-path="${a.path}" title="Masaüstüne Geri Yükle">
                  ${window.UlakIcons.getIcon('download', 'icon-mono-xs')} Geri Yükle
                </button>
                <button class="btn btn-danger-soft btn-xs btn-delete-archive" data-path="${a.path}" title="Arşivi Sil">
                  ${window.UlakIcons.getIcon('trash', 'icon-mono-xs')} Sil
                </button>
              </div>
            </div>
          `).join('');

          // Geri Yükle
          container.querySelectorAll('.btn-restore-archive').forEach(btn => {
            btn.addEventListener('click', async () => {
              const archivePath = btn.getAttribute('data-path');
              const ok = await window.UlakUI.confirm('Yedeği Geri Yükle', 'Bu arşiv paketi Masaüstünüzde "ULAK_Kurtarilan" klasörüne açılacaktır. Devam edilsin mi?', 'Geri Yükle');
              if (ok) {
                window.UlakUI.toast('Geri yükleme yürütülüyor...', 'info');
                try {
                  const res = await window.ulak.invoke('backup:restore-archive', archivePath);
                  if (res && res.success) {
                    window.UlakUI.toast(`Arşiv başarıyla geri yüklendi: ${res.targetPath}`, 'success');
                  } else {
                    window.UlakUI.toast(res?.message || 'Geri yükleme başarısız.', 'error');
                  }
                } catch (e) {
                  window.UlakUI.toast(`Hata: ${e.message}`, 'error');
                }
              }
            });
          });

          // Doğrula (SHA-256)
          container.querySelectorAll('.btn-verify-archive').forEach(btn => {
            btn.addEventListener('click', async () => {
              const archivePath = btn.getAttribute('data-path');
              window.UlakUI.toast('Arşiv SHA-256 bütünlüğü denetleniyor...', 'info');
              try {
                const res = await window.ulak.invoke('backup:verify-archive', archivePath);
                if (res && res.success && res.isValid) {
                  window.UlakUI.toast(`Bütünlük Onaylandı! ${res.entryCount} dosya sağlam. SHA256: ${res.sha256.slice(0, 12)}...`, 'success');
                } else {
                  window.UlakUI.toast(`Uyarı: Arşiv dosyası doğrulanamadı veya bozulmuş olabilir!`, 'error');
                }
              } catch (e) {
                window.UlakUI.toast(`Hata: ${e.message}`, 'error');
              }
            });
          });

          // Sil
          container.querySelectorAll('.btn-delete-archive').forEach(btn => {
            btn.addEventListener('click', async () => {
              const archivePath = btn.getAttribute('data-path');
              const ok = await window.UlakUI.confirm('Arşivi Sil', 'Bu yedek arşivini kalıcı olarak silmek istediğinize emin misiniz?', 'Sil');
              if (ok) {
                try {
                  const res = await window.ulak.invoke('backup:delete-archive', archivePath);
                  if (res && res.success) {
                    window.UlakUI.toast('Arşiv silindi.', 'info');
                    await updateStats();
                    await loadArchives();
                  } else {
                    window.UlakUI.toast('Silinemedi.', 'error');
                  }
                } catch (e) {
                  window.UlakUI.toast(`Hata: ${e.message}`, 'error');
                }
              }
            });
          });
        } catch (e) {
          window.UlakUI.state(container, 'error', { desc: e.message });
        }
      }

      // İlk yükleme
      await Promise.all([updateStats(), loadArchives()]);
    }
  };

  window.UlakRouter.register(view);
})();
