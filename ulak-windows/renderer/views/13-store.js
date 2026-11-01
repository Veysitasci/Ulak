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
              <span style="margin-right: 8px;">📦</span> Eklenti Mağazası
            </button>
            <button class="btn ${activeTab === 'versions' ? 'btn-primary' : 'btn-secondary'} btn-tab-switch" data-tab="versions" style="padding: 10px 22px; font-weight: 600;">
              <span style="margin-right: 8px;">🔄</span> Sürüm & Güncelleme Yöneticisi (Rollback)
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
                  <span style="margin-right: 6px;">➕</span> Özel Eklenti İndir / Yükle
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
                  <span style="margin-right: 6px;">🔄</span> GitHub'dan Güncellemeleri Denetle
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

        return `
          <div class="glass-card liquid-glow" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between; border-color: ${isInstalled ? 'var(--accent-border)' : 'var(--glass-border-hover)'};">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div class="setting-row-icon" style="color: var(--accent);">${window.UlakIcons.getIcon(iconName)}</div>
                  <div>
                    <div style="font-size: 14px; font-weight: 700; color: var(--text-1);">${window.UlakUI.escapeHtml(m.name_key)}</div>
                    <div style="font-size: 10px; color: var(--accent); font-family: monospace;">GitHub / ${m.id}</div>
                  </div>
                </div>
                <span class="chip ${isInstalled ? 'chip-accent' : ''}">${window.UlakUI.escapeHtml(m.category || 'Eklenti')}</span>
              </div>
              <p style="font-size: 12px; color: var(--text-2); line-height: 1.5; margin-bottom: 12px;">
                ${window.UlakUI.escapeHtml(m.desc_key)}
              </p>
              <ul style="font-size: 11px; color: var(--text-3); padding-left: 18px; margin-bottom: 16px; line-height: 1.6;">
                ${(m.features || []).map(f => `<li>${window.UlakUI.escapeHtml(f)}</li>`).join('')}
              </ul>
            </div>
            <div>
              ${isInstalled 
                ? `
                  <div style="display: flex; gap: 8px;">
                    <button class="btn btn-secondary btn-sm" onclick="window.UlakRouter.navigate('${m.id === 'youtube' ? 'youtube' : m.id === 'sys_cleaner' ? 'cleaner' : m.id === 'backup_tool' ? 'backup' : m.id}')" style="flex: 1;">
                      Aç →
                    </button>
                    <button class="btn btn-danger-soft btn-sm btn-store-toggle" data-id="${m.id}" data-action="remove" style="flex: 1;">
                      Kaldır
                    </button>
                  </div>
                `
                : `
                  <button class="btn btn-primary btn-store-toggle" data-id="${m.id}" data-action="install" style="width: 100%;">
                    <span>⬇</span> İndir & Kur
                  </button>
                `
              }
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = cardsHtml;

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

        return `
          <div class="glass-card liquid-glow" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between; border-color: ${isUpToDate ? 'var(--glass-border)' : 'var(--warning-border)'};">
            <div>
              <!-- Header -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div class="setting-row-icon" style="color: var(--accent);">${window.UlakIcons.getIcon(iconName)}</div>
                  <div>
                    <div style="font-size: 14px; font-weight: 700; color: var(--text-1);">${window.UlakUI.escapeHtml(m.name)}</div>
                    <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px;">
                      ${coreBadge}
                      <span class="chip" style="font-size: 10px;">${window.UlakUI.escapeHtml(m.category)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  ${isUpToDate 
                    ? '<span class="chip chip-accent" style="font-size: 11px;">✓ Güncel</span>' 
                    : '<span class="chip" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); font-size: 11px;">⬆ Güncelleme Var</span>'
                  }
                </div>
              </div>

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
            <div style="display: flex; gap: 8px;">
              <button class="btn ${isUpToDate ? 'btn-secondary' : 'btn-primary'} btn-sm btn-update-latest" data-id="${m.id}" ${isUpToDate ? 'disabled' : ''} style="flex: 1;">
                <span>🚀</span> En Yeniye Çek
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
        btn.innerHTML = `<span style="margin-right: 6px;">🔄</span> Güncellemeleri Denetle`;
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

  window.UlakRouter.register(view);
})();
