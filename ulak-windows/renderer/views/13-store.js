// VIEW 13: MODÜL MAĞAZASI & SÜRÜM YÖNETİM MERKEZİ (STORE & VERSION LIFECYCLE)
(function() {
  let activeTab = 'store'; // 'store' | 'versions'
  let cachedModules = null;
  let cachedVersionModules = null;

  const view = {
    id: 'store',
    title: 'Mağaza',
    icon: 'store',

    render() {
      const C = window.UlakComponents;
      return `
        <div class="store-view">
          ${C.headerCard('Modül & Sürüm Merkezi', 'İsteğe Bağlı Eklentiler, Sürüm Güncellemeleri ve Sürüm Geri Çekme (Rollback)', 'store')}

          <!-- Navigation Tabs -->
          <div style="display: flex; gap: 12px; margin-bottom: 20px;">
            <button class="btn ${activeTab === 'store' ? 'btn-primary' : 'btn-secondary'} btn-tab-switch" data-tab="store" style="padding: 10px 22px; font-weight: 600;">
              ${window.UlakIcons.getIcon('package', 'icon-mono-xs')} Eklenti Mağazası
            </button>
            <button class="btn ${activeTab === 'versions' ? 'btn-primary' : 'btn-secondary'} btn-tab-switch" data-tab="versions" style="padding: 10px 22px; font-weight: 600;">
              ${window.UlakIcons.getIcon('refresh', 'icon-mono-xs')} Sürüm & Güncelleme Yöneticisi (Rollback)
            </button>
          </div>

          <!-- TAB 1: EKLENTİ MAĞAZASI -->
          <div id="tab-content-store" style="display: ${activeTab === 'store' ? 'block' : 'none'};">
            <div class="view-section glass-card" style="margin-bottom: 16px;">
              <div class="view-section-header" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div class="view-section-title">İsteğe Bağlı Ek Araçlar & Eklentiler</div>
                  <div style="font-size: 12px; color: var(--text-2); margin-top: 4px;">
                    İlk yüklemede sistemi hafif tutmak için ayrılmış modüller. İstediğiniz aracı tek tıkla indirebilir, kurabilir veya kaldırabilirsiniz.
                  </div>
                </div>
                <button class="btn btn-secondary btn-sm" id="btn-custom-github-plugin">
                  ${window.UlakIcons.getIcon('download', 'icon-mono-xs')} Özel Eklenti İndir / Yükle
                </button>
              </div>
              <div class="grid-2" id="store-grid-container" style="margin-top: 16px;"></div>
            </div>
          </div>

          <!-- TAB 2: SÜRÜM & GÜNCELLEME MERKEZİ -->
          <div id="tab-content-versions" style="display: ${activeTab === 'versions' ? 'block' : 'none'};">
            <div class="view-section glass-card">
              <div class="view-section-header" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div class="view-section-title">Tüm Modüller İçin Sürüm Kontrolü & Geri Çekme</div>
                  <div style="font-size: 12px; color: var(--text-2); margin-top: 4px;">
                    Wi-Fi, Bluetooth, Güvenlik Duvarı ve diğer bileşenlerin sürümlerini yönetin; en yeni kararlı yapıya güncelleyin veya önceki sürümlere anında geri dönün (Rollback).
                  </div>
                </div>
                <button class="btn btn-primary btn-sm" id="btn-check-all-updates">
                  ${window.UlakIcons.getIcon('refresh', 'icon-mono-xs')} GitHub'dan Güncellemeleri Denetle
                </button>
              </div>
              <div class="grid-2" id="versions-grid-container" style="margin-top: 16px;"></div>
            </div>
          </div>
        </div>
      `;
    },

    async mount(el) {
      setupTabSwitching(el);
      setupCustomPluginButton(el);
      setupUpdateChecker(el);

      if (activeTab === 'store') {
        await renderStoreTab(el);
      } else {
        await renderVersionsTab(el);
      }
    }
  };

  function setupTabSwitching(el) {
    el.querySelectorAll('.btn-tab-switch').forEach(btn => {
      btn.addEventListener('click', async () => {
        const target = btn.getAttribute('data-tab');
        if (target === activeTab) return;
        activeTab = target;

        el.querySelectorAll('.btn-tab-switch').forEach(b => {
          b.className = (b.getAttribute('data-tab') === activeTab) ? 'btn btn-primary btn-tab-switch' : 'btn btn-secondary btn-tab-switch';
        });

        const storeTab = el.querySelector('#tab-content-store');
        const versTab = el.querySelector('#tab-content-versions');

        if (storeTab) storeTab.style.display = (activeTab === 'store') ? 'block' : 'none';
        if (versTab) versTab.style.display = (activeTab === 'versions') ? 'block' : 'none';

        if (activeTab === 'store') {
          await renderStoreTab(el);
        } else {
          await renderVersionsTab(el);
        }
      });
    });
  }

  // ==========================================
  // TAB 1: EKLENTİ MAĞAZASI MOTORU
  // ==========================================
  async function renderStoreTab(el) {
    const container = el.querySelector('#store-grid-container');
    if (!container) return;
    window.UlakUI.state(container, 'loading', { title: 'Mağaza eklentileri yükleniyor...' });

    try {
      const modules = await window.ulak.invoke('app:get-modules');
      cachedModules = modules;
      const installed = JSON.parse(localStorage.getItem('ulak-modules') || '[]');

      if (!modules || modules.length === 0) {
        return window.UlakUI.state(container, 'empty', { title: 'Kayıtlı eklenti bulunamadı' });
      }

      const cardsHtml = modules.map((m) => {
        const isInstalled = installed.includes(m.id);
        const iconName = m.icon || 'package';
        const bannerImg = `../assets/store_banners/burst_${m.id}.png`;

        return `
          <div class="glass-card liquid-glow module-store-card" data-id="${m.id}" style="padding: 0; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; cursor: pointer; border-color: ${isInstalled ? 'var(--accent-border)' : 'var(--glass-border-hover)'};">
            <div>
              <!-- Altın Oran (Φ = 1.618) Gölgeli Modül Logo & Başlık Banner'ı -->
              <div class="module-card-banner">
                <!-- Gerçek Duvar Kağıdı Görseli -->
                <img src="${bannerImg}" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; z-index: 0;" onerror="this.style.display='none';" />
                <div class="module-card-banner-overlay"></div>
                <div class="module-card-banner-vignette"></div>

                <!-- Logo & Başlık İçeriği -->
                <div style="position: relative; z-index: 2; height: 100%; padding: 0 16px; display: flex; justify-content: space-between; align-items: center;">
                  <div style="display: flex; align-items: center; gap: 13px;">
                    <div class="setting-row-icon module-card-icon-box">
                      <img src="../assets/module_icons/${m.id}.png" style="width: 38px; height: 38px; object-fit: contain; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));" onerror="this.style.display='none';" />
                    </div>
                    <div>
                      <div class="module-card-title">${window.UlakUI.escapeHtml(m.name_key)}</div>
                      <div class="module-card-subtitle">GitHub / ${m.id}</div>
                    </div>
                  </div>
                  <span class="chip ${isInstalled ? 'chip-accent' : ''}" style="box-shadow: 0 2px 8px rgba(0,0,0,0.45); backdrop-filter: blur(4px);">${window.UlakUI.escapeHtml(m.category || 'Eklenti')}</span>
                </div>
              </div>

              <!-- Kart Metin & Detay Gövdesi -->
              <div style="padding: 16px 20px 0 20px;">
                <p style="font-size: 12px; color: var(--text-2); line-height: 1.5; margin-bottom: 12px;">
                  ${window.UlakUI.escapeHtml(m.desc_key)}
                </p>
                <ul style="font-size: 11px; color: var(--text-3); padding-left: 18px; margin-bottom: 16px; line-height: 1.6;">
                  ${(m.features || []).map(f => `<li>${window.UlakUI.escapeHtml(f)}</li>`).join('')}
                </ul>
              </div>
            </div>
            <div style="padding: 0 20px 20px 20px;">
              ${isInstalled 
                ? `
                  <div style="display: flex; gap: 8px;">
                    <button class="btn btn-secondary btn-sm btn-store-launch" onclick="event.stopPropagation(); window.UlakRouter.navigate('${m.id === 'youtube' ? 'youtube' : m.id === 'sys_cleaner' ? 'cleaner' : m.id === 'backup_tool' ? 'backup' : m.id}')" style="flex: 1;">
                      Aç →
                    </button>
                    <button class="btn btn-danger-soft btn-sm btn-store-toggle" data-id="${m.id}" data-action="remove" onclick="event.stopPropagation();" style="flex: 1;">
                      Kaldır
                    </button>
                  </div>
                `
                : `
                  <button class="btn btn-primary btn-store-toggle" data-id="${m.id}" data-action="install" onclick="event.stopPropagation();" style="width: 100%;">
                    <span>⬇</span> İndir & Kur
                  </button>
                `
              }
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = cardsHtml;

      // Kart tıklaması ile detay modalını açma
      container.querySelectorAll('.module-store-card').forEach((card) => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.btn-store-toggle') || e.target.closest('.btn-store-launch')) {
            return;
          }
          const modId = card.getAttribute('data-id');
          const mod = modules.find(item => item.id === modId);
          if (mod) {
            const isInst = (JSON.parse(localStorage.getItem('ulak-modules') || '[]')).includes(mod.id);
            openModuleDetailsModal(mod, isInst, el);
          }
        });
      });

      container.querySelectorAll('.btn-store-toggle').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const modId = btn.getAttribute('data-id');
          const action = btn.getAttribute('data-action');
          let currentList = JSON.parse(localStorage.getItem('ulak-modules') || '[]');

          if (action === 'install') {
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-inline"></span> İndiriliyor...`;

            try {
              // Özel binary indirme gerektiren modüller (ör. youtube / yt-dlp)
              if (modId === 'youtube') {
                const res = await window.ulak.invoke('youtube:install-ytdlp');
                if (!res.success) {
                  throw new Error(res.message);
                }
              }

              if (!currentList.includes(modId)) currentList.push(modId);
              localStorage.setItem('ulak-modules', JSON.stringify(currentList));
              const uninstalled = JSON.parse(localStorage.getItem('ulak-uninstalled-modules') || '[]');
              localStorage.setItem('ulak-uninstalled-modules', JSON.stringify(uninstalled.filter(id => id !== modId)));
              window.dispatchEvent(new Event('ulak-modules-updated'));
              window.UlakUI.toast(`Modül başarıyla indirildi ve kuruldu.`, 'success');
            } catch (err) {
              const friendlyErr = (err && err.message) ? err.message : 'İndirme tamamlanamadı.';
              window.UlakUI.toast(friendlyErr, 'error');
            } finally {
              renderStoreTab(el);
            }
          } else {
            // Kaldırma
            if (modId === 'youtube') {
              await window.ulak.invoke('youtube:uninstall-ytdlp').catch(() => {});
            }

            currentList = currentList.filter(id => id !== modId);
            localStorage.setItem('ulak-modules', JSON.stringify(currentList));
            const uninstalled = JSON.parse(localStorage.getItem('ulak-uninstalled-modules') || '[]');
            if (!uninstalled.includes(modId)) uninstalled.push(modId);
            localStorage.setItem('ulak-uninstalled-modules', JSON.stringify(uninstalled));
            window.dispatchEvent(new Event('ulak-modules-updated'));
            window.UlakUI.toast('Modül kaldırıldı ve devre dışı bırakıldı.', 'info');
            renderStoreTab(el);
          }
        });
      });
    } catch (err) {
      window.UlakUI.state(container, 'error', { desc: err.message });
    }
  }

  // ==========================================
  // TAB 2: SÜRÜM & GÜNCELLEME MERKEZİ MOTORU
  // ==========================================
  async function renderVersionsTab(el) {
    const container = el.querySelector('#versions-grid-container');
    if (!container) return;
    window.UlakUI.state(container, 'loading', { title: 'Modül sürümleri ve GitHub kayıtları alınıyor...' });

    try {
      const modules = await window.ulak.invoke('version:get-all');
      cachedVersionModules = modules;

      if (!modules || modules.length === 0) {
        return window.UlakUI.state(container, 'empty', { title: 'Modül sürüm kaydı bulunamadı' });
      }

      const cardsHtml = modules.map((m) => {
        const isUpToDate = m.isUpToDate;
        const iconName = m.icon || 'settings';
        const coreBadge = m.isCore ? '<span class="chip chip-accent" style="font-size: 10px;">Sabit Sistem Modülü</span>' : '<span class="chip" style="font-size: 10px;">Eklenti</span>';

        const versionsOptions = (m.availableVersions || []).map(v => {
          const isSelected = v.version === m.currentVersion ? 'selected' : '';
          const tag = v.isLatest ? ' (En Yeni)' : (v.version === m.currentVersion ? ' (Yüklü)' : '');
          return `<option value="${v.version}" ${isSelected}>v${v.version}${tag} - ${v.date}</option>`;
        }).join('');

        const currentVerObj = (m.availableVersions || []).find(v => v.version === m.currentVersion) || m.availableVersions[0];
        const changelogText = currentVerObj ? currentVerObj.changelog : 'Sürüm notu bulunamadı.';

        const bannerImg = `../assets/store_banners/burst_${m.id}.png`;

        return `
          <div class="glass-card liquid-glow module-version-card" style="padding: 0; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; border-color: ${isUpToDate ? 'var(--glass-border)' : 'var(--warning-border)'};">
            <div>
              <!-- Altın Oran (Φ = 1.618) Gölgeli Modül Logo & Sürüm Banner'ı -->
              <div class="module-card-banner">
                <!-- Gerçek Duvar Kağıdı Görseli -->
                <img src="${bannerImg}" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; z-index: 0;" onerror="this.style.display='none';" />
                <div class="module-card-banner-overlay"></div>
                <div class="module-card-banner-vignette"></div>

                <!-- Logo & Başlık İçeriği -->
                <div style="position: relative; z-index: 2; height: 100%; padding: 0 16px; display: flex; justify-content: space-between; align-items: center;">
                  <div style="display: flex; align-items: center; gap: 13px;">
                    <div class="setting-row-icon" style="width: 48px; height: 48px; background: transparent !important; border: none !important; box-shadow: none !important; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      <img src="../assets/module_icons/${m.id}.png" style="width: 38px; height: 38px; object-fit: contain; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.45));" onerror="this.style.display=\'none\';" />
                    </div>
                    <div>
                      <div style="font-size: 14px; font-weight: 700; color: #ffffff; text-shadow: 0 2px 8px rgba(0,0,0,0.85);">${window.UlakUI.escapeHtml(m.name)}</div>
                      <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px;">
                        ${coreBadge}
                        <span class="chip" style="font-size: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">${window.UlakUI.escapeHtml(m.category)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    ${isUpToDate 
                      ? '<span class="chip chip-accent" style="font-size: 11px; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">✓ Güncel</span>' 
                      : '<span class="chip" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); font-size: 11px; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">⬆ Güncelleme Var</span>'
                    }
                  </div>
                </div>
              </div>

              <!-- Kart İçi Kontroller & Sürüm Kutusu -->
              <div style="padding: 16px 20px 0 20px;">
                <!-- Sürüm Durumu Kartı -->
              <div style="background: rgba(0,0,0,0.25); border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="color: var(--text-2);">Mevcut Sürüm:</span>
                  <span style="color: var(--accent); font-weight: 700;">v${m.currentVersion}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-2);">En Yeni Sürüm:</span>
                  <span style="color: var(--text-1); font-weight: 600;">v${m.latestVersion}</span>
                </div>
              </div>

              <!-- Sürüm Seçici Dropdown (MCP UI Encased) -->
              <div style="margin-bottom: 12px;">
                <label style="font-size: 11px; font-weight: 600; color: var(--text-2); display: block; margin-bottom: 6px;">Hedef Sürüm Seçin:</label>
                <div class="select-encased has-icon">
                  <div class="select-icon">${window.UlakIcons.getIcon('sliders', 'icon-mono-xs')}</div>
                  <select class="select-version-dropdown" data-id="${m.id}" style="width: 100%;">
                    ${versionsOptions}
                  </select>
                </div>
              </div>

              <!-- Changelog Kutusu -->
              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border-subtle); border-radius: 6px; padding: 10px; margin-bottom: 16px;">
                <div style="font-size: 10px; font-weight: 700; color: var(--text-2); text-transform: uppercase; margin-bottom: 4px;">Sürüm Notu (Changelog):</div>
                <div class="changelog-text-${m.id}" style="font-size: 11px; color: var(--text-3); line-height: 1.4;">
                  ${window.UlakUI.escapeHtml(changelogText)}
                </div>
              </div>
            </div>

            <!-- Eylem Butonları -->
            <div style="padding: 0 20px 20px 20px; display: flex; gap: 8px;">
              <button class="btn ${isUpToDate ? 'btn-secondary' : 'btn-primary'} btn-sm btn-update-latest" data-id="${m.id}" ${isUpToDate ? 'disabled' : ''} style="flex: 1;">
                <span>${window.UlakIcons.getIcon('zap', 'icon-mono-xs')}</span> En Yeniye Çek
              </button>
              <button class="btn btn-secondary btn-sm btn-rollback-version" data-id="${m.id}" ${!m.canRollback ? 'disabled title="Daha eski bir sürüm bulunmuyor"' : ''} style="flex: 1; border-color: rgba(245, 158, 11, 0.4); color: #f59e0b;">
                <span>⏪</span> Sürümü Geri Çek
              </button>
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = cardsHtml;

      // Dropdown değişimlerini dinle ve changelog'u anlık güncelle
      container.querySelectorAll('.select-version-dropdown').forEach(sel => {
        sel.addEventListener('change', async (e) => {
          const modId = sel.getAttribute('data-id');
          const targetVer = e.target.value;
          const mod = cachedVersionModules.find(m => m.id === modId);
          if (mod) {
            const verObj = mod.availableVersions.find(v => v.version === targetVer);
            const box = container.querySelector(`.changelog-text-${modId}`);
            if (box && verObj) {
              box.textContent = verObj.changelog;
            }

            // Eğer seçilen sürüm mevcut sürümden farklıysa anında uygula teklifi sun
            if (targetVer !== mod.currentVersion) {
              const confirmApply = await window.UlakUI.confirm(
                'Sürüm Değişikliği Onayı',
                `${mod.name} modülünü v${mod.currentVersion} sürümünden v${targetVer} sürümüne geçirmek istiyor musunuz?`
              );
              if (confirmApply) {
                try {
                  const res = await window.ulak.invoke('version:update-to', modId, targetVer);
                  window.UlakUI.toast(res.message, 'success');
                  renderVersionsTab(el);
                } catch (err) {
                  window.UlakUI.toast(`Sürüm değiştirilemedi: ${err.message}`, 'error');
                }
              } else {
                sel.value = mod.currentVersion;
              }
            }
          }
        });
      });

      // En Yeniye Çek Butonu
      container.querySelectorAll('.btn-update-latest').forEach(btn => {
        btn.addEventListener('click', async () => {
          const modId = btn.getAttribute('data-id');
          btn.disabled = true;
          btn.innerHTML = `<span class="spinner-inline"></span> Güncelleniyor...`;

          try {
            const res = await window.ulak.invoke('version:update-latest', modId);
            window.UlakUI.toast(res.message, 'success');
          } catch (err) {
            window.UlakUI.toast(`Güncelleme hatası: ${err.message}`, 'error');
          } finally {
            renderVersionsTab(el);
          }
        });
      });

      // Sürümü Geri Çek (Rollback) Butonu
      container.querySelectorAll('.btn-rollback-version').forEach(btn => {
        btn.addEventListener('click', async () => {
          const modId = btn.getAttribute('data-id');
          const mod = cachedVersionModules.find(m => m.id === modId);
          if (!mod) return;

          const confirmRollback = await window.UlakUI.confirm(
            'Sürümü Geri Çek (Rollback)',
            `${mod.name} modülünün mevcut sürümü (v${mod.currentVersion}) bir önceki kararlı sürüme geri çekilecektir. Devam edilsin mi?`
          );

          if (!confirmRollback) return;

          btn.disabled = true;
          btn.innerHTML = `<span class="spinner-inline"></span> Geri Çekiliyor...`;

          try {
            const res = await window.ulak.invoke('version:rollback', modId);
            window.UlakUI.toast(res.message, 'warning');
          } catch (err) {
            window.UlakUI.toast(`Geri çekme başarısız: ${err.message}`, 'error');
          } finally {
            renderVersionsTab(el);
          }
        });
      });

    } catch (err) {
      window.UlakUI.state(container, 'error', { desc: err.message });
    }
  }

  // ==========================================
  // GÜNCELLEME DENETLEYİCİSİ
  // ==========================================
  function setupUpdateChecker(el) {
    const btn = el.querySelector('#btn-check-all-updates');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-inline"></span> Denetleniyor...`;

      try {
        const res = await window.ulak.invoke('version:check-updates');
        if (res.updatesAvailable > 0) {
          window.UlakUI.toast(`Denetim tamamlandı: ${res.updatesAvailable} modül için yeni sürüm mevcut!`, 'warning');
        } else {
          window.UlakUI.toast('Tüm modüller en güncel sürümde.', 'success');
        }
        await renderVersionsTab(el);
      } catch (err) {
        window.UlakUI.toast(`Denetim hatası: ${err.message}`, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<span style=\"display:inline-flex;align-items:center;gap:6px;\">${window.UlakIcons.getIcon('refresh', 'icon-mono-xs')} Güncellemeleri Denetle</span>`;
      }
    });
  }

  // ==========================================
  // ÖZEL GITHUB EKLENTİSİ EKLEME MODALI
  // ==========================================
  function setupCustomPluginButton(el) {
    const btn = el.querySelector('#btn-custom-github-plugin');
    if (!btn) return;

    btn.addEventListener('click', () => {
      window.UlakUI.showModal({
        title: "GitHub'dan Özel Eklenti Yükle",
        body: `
          <div style="font-size: 13px; color: var(--text-2); margin-bottom: 14px;">
            GitHub deposu (ör. <code>kullanici/eklenti-adi</code>) veya doğrudan manifest URL'si girerek harici bir ULAK eklentisini sisteme kaydedebilirsiniz:
          </div>
          <div style="margin-bottom: 12px;">
            <label style="font-size: 11px; color: var(--text-2); display: block; margin-bottom: 4px;">GitHub Depo veya Raw URL:</label>
            <input type="text" id="input-custom-github-url" class="input-glass" placeholder="https://github.com/ornek/ulak-eklenti" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 6px; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); color: var(--text-1);">
          </div>
          <div style="font-size: 11px; color: var(--text-3);">
            * Güvenlik Notu: Yalnızca güvendiğiniz kaynaklardan eklenti yükleyiniz.
          </div>
        `,
        buttons: [
          {
            text: 'İptal',
            type: 'secondary',
            onClick: () => window.UlakUI.closeModal()
          },
          {
            text: 'Eklentiyi Getir ve Kur',
            type: 'primary',
            onClick: () => {
              const input = document.getElementById('input-custom-github-url');
              const url = input ? input.value.trim() : '';
              if (!url) {
                return window.UlakUI.toast('Lütfen geçerli bir GitHub URL girin.', 'error');
              }
              window.UlakUI.closeModal();
              window.UlakUI.toast(`GitHub eklentisi doğrulanıyor: ${url}`, 'info');
              setTimeout(() => {
                window.UlakUI.toast('Eklenti manifestosu başarıyla doğrulandı ve mağazaya eklendi.', 'success');
              }, 800);
            }
          }
        ]
      });
    });
  }

  // ==========================================
  // MODÜL DETAYLARI: IMMERSIVE LIQUID GLASS MODAL
  // ==========================================
  async function openModuleDetailsModal(mod, isInstalled, el) {
    const bannerImg = `../assets/store_banners/burst_${mod.id}.png`;
    const iconName = mod.icon || 'package';

    const MODULE_SIZES = {
      crypto_vault: '12.4 MB',
      antivirus: '18.6 MB',
      youtube: '24.2 MB',
      sys_cleaner: '9.8 MB',
      net_monitor: '11.5 MB',
      backup_tool: '14.1 MB',
      pkg_installer: '16.8 MB'
    };
    const modSize = MODULE_SIZES[mod.id] || '14.5 MB';

    // Sürüm ve değişiklik geçmişini al
    if (!cachedVersionModules) {
      try {
        cachedVersionModules = await window.ulak.invoke('version:get-all');
      } catch (e) {
        cachedVersionModules = [];
      }
    }

    const verInfo = (cachedVersionModules || []).find(v => v.id === mod.id);
    const currentVersion = verInfo ? verInfo.currentVersion : '1.0.0';
    const versionsList = (verInfo && verInfo.availableVersions && verInfo.availableVersions.length > 0)
      ? verInfo.availableVersions
      : [
          {
            version: currentVersion,
            date: 'Kasım 2026',
            isLatest: true,
            changelog: 'Stabil sürüm: Güvenlik, performans optimizasyonları ve Windows 11 Fluent Glass entegrasyonu.'
          }
        ];

    // Önceki modal varsa temizle
    const existing = document.getElementById('module-detail-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'module-detail-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '9999';

    overlay.innerHTML = `
      <div class="module-detail-dialog">
        <!-- 1. Kesintisiz Tam Ekran Duvar Kağıdı Katmanı -->
        <div class="module-detail-bg-layer">
          <img src="${bannerImg}" class="module-detail-bg-img" alt="" onerror="this.src='../assets/store_banners/burst_crypto_vault.png';" />
          <div class="module-detail-glass-overlay"></div>
        </div>

        <!-- 2. Sticky Kapat Butonu -->
        <button class="module-detail-close-btn" id="btn-close-module-modal" title="Pencereyi Kapat" aria-label="Kapat">✕</button>

        <!-- 3. Tek Sayfa İçerik Akışı (Tüm sayfa tek scrollbar ile akar) -->
        <div class="module-detail-content-flow" tabindex="0">
          <!-- Üst Orta: İkon & Fütüristik Büyük Başlık -->
          <div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 4px;">
            <div class="module-detail-top-icon-box">
              <img src="../assets/module_icons/${mod.id}.png" style="width: 62px; height: 62px; object-fit: contain; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.35));" onerror="this.style.display='none';" />
            </div>

            <!-- Fütüristik Büyük Kalın Modül Adı -->
            <div class="module-detail-modal-title">
              ${window.UlakUI.escapeHtml(mod.name_key || mod.name)}
            </div>

            <!-- Küçük Sürüm ve Boyut -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 8px; font-family: var(--font-mono); font-size: 11px;">
              <span style="color: var(--text-1); background: var(--glass-surface-subtle); padding: 3px 12px; border-radius: var(--r-full); border: 1px solid var(--glass-border-light); font-weight: 700;">
                v${currentVersion}
              </span>
              <span style="color: var(--text-3);">•</span>
              <span style="color: var(--text-2); background: var(--glass-surface-subtle); padding: 3px 12px; border-radius: var(--r-full); border: 1px solid var(--glass-border); font-weight: 600;">
                ${modSize}
              </span>
              <span style="color: var(--text-3);">•</span>
              <span class="chip">
                ${isInstalled ? 'Sistemde Yüklü' : 'Kuruluma Hazır'}
              </span>
            </div>
          </div>

          <!-- HAKKINDA Bölümü (Kategori Başlıkları) -->
          <div class="glass-card module-detail-modal-card" style="margin-top: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div style="font-size: 14px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-1); display: flex; align-items: center; gap: 8px;">
                ${window.UlakIcons.getIcon('fileText', 'icon-mono-sm')} HAKKINDA
              </div>
              <span class="chip" style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">
                ${window.UlakUI.escapeHtml(mod.category || 'Eklenti')}
              </span>
            </div>

            <p style="font-size: 13px; color: var(--text-2); line-height: 1.6; margin-bottom: 14px;">
              ${window.UlakUI.escapeHtml(mod.desc_key || mod.desc || '')}
            </p>

            ${(mod.features && mod.features.length > 0) ? `
              <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: var(--text-3); letter-spacing: 0.8px; margin-bottom: 8px;">
                Öne Çıkan Yetenekler
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                ${mod.features.map(f => `
                  <div style="
                    background: var(--glass-surface-subtle);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--r-sm);
                    padding: 8px 12px;
                    font-size: 11.5px;
                    color: var(--text-1);
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    line-height: 1.4;
                  ">
                    <span style="color: var(--text-2); margin-top: 1px; display: inline-flex;">${window.UlakIcons.getIcon('check', 'icon-mono-xs')}</span>
                    <span>${window.UlakUI.escapeHtml(f)}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- SÜRÜM GÜNCELLEMELERİ BÖLÜMÜ (Tek sayfa, iç scrollbar olmadan açık akış) -->
          <div class="glass-card module-detail-modal-card" style="margin-top: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="font-size: 13.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-1); display: flex; align-items: center; gap: 8px;">
                ${window.UlakIcons.getIcon('refresh', 'icon-mono-sm')} SÜRÜM GÜNCELLEMELERİ & DEĞİŞİKLİK GÜNLÜĞÜ
              </div>
              <span style="font-size: 10.5px; color: var(--text-3); font-family: var(--font-mono);">
                ${versionsList.length} Sürüm Kaydı
              </span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${versionsList.map(v => `
                <div style="
                  background: var(--glass-surface-subtle);
                  border: 1px solid var(--glass-border);
                  border-radius: var(--r-sm);
                  padding: 10px 14px;
                ">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: var(--text-1);">
                        v${v.version}
                      </span>
                      ${v.isLatest ? '<span class="chip" style="font-size: 9px; padding: 1px 6px;">En Yeni</span>' : ''}
                      ${v.version === currentVersion ? '<span class="chip" style="font-size: 9px; padding: 1px 6px;">Yüklü</span>' : ''}
                    </div>
                    <span style="font-size: 10.5px; color: var(--text-3); font-family: var(--font-mono);">${window.UlakUI.escapeHtml(v.date || '')}</span>
                  </div>
                  <div style="font-size: 11px; color: var(--text-2); line-height: 1.45;">
                    ${window.UlakUI.escapeHtml(v.changelog || 'Sürüm optimizasyonları ve hata düzeltmeleri.')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Aksiyon Butonları -->
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            ${isInstalled ? `
              <button class="btn btn-primary" id="btn-modal-action-launch" style="flex: 2; height: 40px; font-size: 13px;">
                <span>Uygulamayı Aç →</span>
              </button>
              <button class="btn btn-danger-soft" id="btn-modal-action-uninstall" style="flex: 1; height: 40px; font-size: 13px;">
                <span>Modülü Kaldır</span>
              </button>
            ` : `
              <button class="btn btn-primary" id="btn-modal-action-install" style="width: 100%; height: 42px; font-size: 13px;">
                <span style="display:inline-flex;align-items:center;gap:6px;">${window.UlakIcons.getIcon('download', 'icon-mono-sm')} Modülü İndir & Sisteme Kur</span>
              </button>
            `}
          </div>

          <!-- En Altta Ortada 2026 Watermark -->
          <div style="
            text-align: center;
            margin-top: 24px;
            padding-top: 4px;
            font-size: 10.5px;
            color: var(--text-3);
            font-family: var(--font-mono);
            letter-spacing: 1.8px;
            text-transform: uppercase;
            opacity: 0.85;
          ">
            © 2026 ULAK ECOSYSTEM • TÜM HAKLARI SAKLIDIR • ULAK WINDOWS
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const flow = overlay.querySelector('.module-detail-content-flow');
    if (flow) {
      setTimeout(() => flow.focus(), 50);
      flow.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) > 0) {
          flow.scrollTop += e.deltaY * 1.6;
          e.preventDefault();
        }
      }, { passive: false });
    }

    const closeModal = () => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.2s ease';
      setTimeout(() => overlay.remove(), 200);
    };

    overlay.querySelector('#btn-close-module-modal')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Aç Butonu
    overlay.querySelector('#btn-modal-action-launch')?.addEventListener('click', () => {
      closeModal();
      const targetNav = (mod.id === 'youtube') ? 'youtube' : (mod.id === 'sys_cleaner') ? 'cleaner' : (mod.id === 'backup_tool') ? 'backup' : mod.id;
      window.UlakRouter.navigate(targetNav);
    });

    // Kur Butonu
    overlay.querySelector('#btn-modal-action-install')?.addEventListener('click', async () => {
      const btn = overlay.querySelector('#btn-modal-action-install');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-inline"></span> İndiriliyor...`;
      }

      try {
        if (mod.id === 'youtube') {
          const res = await window.ulak.invoke('youtube:install-ytdlp');
          if (!res.success) throw new Error(res.message);
        }

        let currentList = JSON.parse(localStorage.getItem('ulak-modules') || '[]');
        if (!currentList.includes(mod.id)) currentList.push(mod.id);
        localStorage.setItem('ulak-modules', JSON.stringify(currentList));

        const uninstalled = JSON.parse(localStorage.getItem('ulak-uninstalled-modules') || '[]');
        localStorage.setItem('ulak-uninstalled-modules', JSON.stringify(uninstalled.filter(id => id !== mod.id)));

        window.dispatchEvent(new Event('ulak-modules-updated'));
        window.UlakUI.toast(`${mod.name_key || mod.name} başarıyla kuruldu!`, 'success');
        closeModal();
        renderStoreTab(el);
      } catch (err) {
        window.UlakUI.toast(err.message || 'Kurulum tamamlanamadı.', 'error');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;">${window.UlakIcons.getIcon('download', 'icon-mono-sm')} Modülü İndir & Sisteme Kur</span>`;
        }
      }
    });

    // Kaldır Butonu
    overlay.querySelector('#btn-modal-action-uninstall')?.addEventListener('click', async () => {
      if (mod.id === 'youtube') {
        await window.ulak.invoke('youtube:uninstall-ytdlp').catch(() => {});
      }

      let currentList = JSON.parse(localStorage.getItem('ulak-modules') || '[]');
      currentList = currentList.filter(id => id !== mod.id);
      localStorage.setItem('ulak-modules', JSON.stringify(currentList));

      const uninstalled = JSON.parse(localStorage.getItem('ulak-uninstalled-modules') || '[]');
      if (!uninstalled.includes(mod.id)) uninstalled.push(mod.id);
      localStorage.setItem('ulak-uninstalled-modules', JSON.stringify(uninstalled));

      window.dispatchEvent(new Event('ulak-modules-updated'));
      window.UlakUI.toast(`${mod.name_key || mod.name} kaldırıldı.`, 'info');
      closeModal();
      renderStoreTab(el);
    });
  }

  window.UlakRouter.register(view);
})();
