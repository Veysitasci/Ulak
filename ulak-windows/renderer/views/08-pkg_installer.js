// VIEW 08: EVRENSEL PAKET YÜKLEYİCİ & YAZILIM YÖNETİCİSİ (GELİŞMİŞ 5 KRİTİK ÖZELLİK)
(function() {
  let activeTab = 'local'; // 'local' | 'online' | 'installed'

  const view = {
    id: 'pkg_installer',
    title: 'Paket Yükleyici',
    icon: 'package',

    render() {
      const C = window.UlakComponents;
      return `
        <div class="pkg-installer-view">
          <div class="glass-card liquid-glow" style="margin-bottom: 20px; padding: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
              <div style="display: flex; align-items: center; gap: 14px;">
                <div class="setting-row-icon" style="width: 50px; height: 50px; border-radius: var(--r-md);">
                  ${window.UlakIcons.getIcon('package', 'icon-mono-lg')}
                </div>
                <div>
                  <div style="font-size: 19px; font-weight: 700; color: var(--text-1); letter-spacing: -0.01em;">Evrensel Paket & Yazılım İstasyonu</div>
                  <div style="font-size: 13px; color: var(--text-2); margin-top: 3px;">Shannon Entropisi • Authenticode İmza Doğrulama • Winget/Choco • Katılımsız Kurulum</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modül Sekmeleri (Segmented Navigation) -->
          <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <button class="btn ${activeTab === 'local' ? 'btn-primary' : 'btn-secondary'} btn-tab-pkg" data-tab="local" style="padding: 10px 20px; font-weight: 600;">
              ${window.UlakIcons.getIcon('shield', 'icon-mono-xs')} Yerel Paket & Güvenlik Analizi
            </button>
            <button class="btn ${activeTab === 'online' ? 'btn-primary' : 'btn-secondary'} btn-tab-pkg" data-tab="online" style="padding: 10px 20px; font-weight: 600;">
              ${window.UlakIcons.getIcon('download', 'icon-mono-xs')} Winget & Choco Paket Deposu
            </button>
            <button class="btn ${activeTab === 'installed' ? 'btn-primary' : 'btn-secondary'} btn-tab-pkg" data-tab="installed" style="padding: 10px 20px; font-weight: 600;">
              ${window.UlakIcons.getIcon('settings', 'icon-mono-xs')} Yüklü Programlar & Kaldırıcı
            </button>
          </div>

          <!-- SEKME 1: YEREL DOSYA, İMZA & ENTROPİ ANALİZİ (Özellik 1, 2, 4) -->
          <div id="pkg-tab-local" style="display: ${activeTab === 'local' ? 'block' : 'none'};">
            <div class="view-section glass-card liquid-glow" style="margin-bottom: 20px;">
              <div class="dropzone" id="pkg-dropzone" style="padding: 30px 20px; text-align: center; border: 2px dashed var(--glass-border); border-radius: var(--r-md); background: rgba(255,255,255,0.01);">
                <div class="state-card-icon" style="width: 54px; height: 54px; margin: 0 auto 12px auto;">
                  ${window.UlakIcons.getIcon('package', 'icon-mono-lg')}
                </div>
                <div style="font-size: 16px; font-weight: 700; color: var(--text-1); margin-bottom: 4px;">
                  İncelemek veya Kurmak İstediğiniz Paketi Seçin
                </div>
                <div style="font-size: 12px; color: var(--text-2); max-width: 460px; margin: 0 auto 16px auto;">
                  .exe, .msi, .zip, .tar.gz dosyalarını Microsoft Authenticode imzası, Shannon entropisi ve kötü amaçlı yazılım desenleriyle denetler.
                </div>
                <div class="action-bar glass-soft" style="display: inline-flex; gap: 10px;">
                  <button class="btn btn-primary" id="pkg-pick-btn">
                    ${window.UlakIcons.getIcon('folder', 'icon-mono-sm')} Paket Seç & İncele
                  </button>
                  <button class="btn btn-secondary" id="pkg-scan-av-btn">
                    ${window.UlakIcons.getIcon('shield', 'icon-mono-sm')} Görsel / Belge Gizli Kod Tara
                  </button>
                </div>
              </div>
            </div>

            <div class="view-section glass-card">
              <div class="view-section-header" style="margin-bottom: 12px;">
                <div class="view-section-title">Güvenlik & İmza İnceleme Raporu</div>
              </div>
              <div id="pkg-report-container">
                <div class="state-card glass-soft" style="padding: 24px; text-align: center;">
                  <div class="state-card-desc" style="color: var(--text-3); font-size: 13px;">Henüz incelenmiş bir dosya bulunmamaktadır.</div>
                </div>
              </div>
            </div>
          </div>

          <!-- SEKME 2: ÇEVRİMİÇİ WINGET & CHOCO DEPO ARAMA & KURULUM (Özellik 3) -->
          <div id="pkg-tab-online" style="display: ${activeTab === 'online' ? 'block' : 'none'};">
            <div class="view-section glass-card liquid-glow" style="margin-bottom: 20px;">
              <div class="view-section-header" style="margin-bottom: 12px;">
                <div class="view-section-title">Windows Paket Yöneticisi (Winget & Chocolatey)</div>
                <span class="chip chip-accent" style="font-size: 10px;">5000+ Resmi Uygulama</span>
              </div>
              <div class="field-group" style="margin-bottom: 12px;">
                <input type="text" id="pkg-online-search-input" class="field-input" placeholder="Yazılım adı yazın (ör: git, vlc, vscode, 7zip, chrome, nodejs)..." style="flex: 1; font-size: 13px;">
                <select id="pkg-online-source-select" class="field-input" style="width: 140px; font-size: 13px;">
                  <option value="winget" selected>Winget Deposu</option>
                  <option value="choco">Chocolatey</option>
                </select>
                <button class="btn btn-primary" id="pkg-online-search-btn">
                  ${window.UlakIcons.getIcon('search', 'icon-mono-sm')} Ara
                </button>
              </div>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-2); cursor: pointer;">
                <input type="checkbox" id="pkg-online-silent-check" checked style="accent-color: var(--accent); width: 15px; height: 15px;">
                <span>Katılımsız / Sessiz Kurulum (Arka planda kullanıcı müdahalesi olmadan kur)</span>
              </label>
            </div>

            <div class="view-section glass-card">
              <div class="view-section-header" style="margin-bottom: 12px;">
                <div class="view-section-title">Depo Sonuçları</div>
              </div>
              <div id="pkg-online-results-container" style="min-height: 120px;">
                <div class="state-card glass-soft" style="padding: 24px; text-align: center;">
                  <div class="state-card-desc" style="color: var(--text-3); font-size: 13px;">Yukarıdan bir yazılım adı aratarak doğrudan resmi kaynağından tek tıkla kurabilirsiniz.</div>
                </div>
              </div>
            </div>
          </div>

          <!-- SEKME 3: YÜKLÜ PROGRAMLAR & KALDIRICI (Özellik 5) -->
          <div id="pkg-tab-installed" style="display: ${activeTab === 'installed' ? 'block' : 'none'};">
            <div class="view-section glass-card">
              <div class="view-section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <div>
                  <div class="view-section-title">Yüklü Windows Uygulamaları</div>
                  <div style="font-size: 12px; color: var(--text-2); margin-top: 2px;">Sistemde kayıtlı yazılımlar ve güvenli kaldırma (Uninstaller) motoru</div>
                </div>
                <button class="btn btn-secondary btn-sm" id="pkg-refresh-installed-btn">
                  ${window.UlakIcons.getIcon('refresh', 'icon-mono-sm')} Listeyi Yenile
                </button>
              </div>
              <div id="pkg-installed-container" style="max-height: 480px; overflow-y: auto;"></div>
            </div>
          </div>
        </div>
      `;
    },

    mount(el) {
      // Sekme Geçişleri
      el.querySelectorAll('.btn-tab-pkg').forEach(btn => {
        btn.addEventListener('click', () => {
          activeTab = btn.getAttribute('data-tab');
          el.querySelectorAll('.btn-tab-pkg').forEach(b => {
            b.className = (b.getAttribute('data-tab') === activeTab) ? 'btn btn-primary btn-tab-pkg' : 'btn btn-secondary btn-tab-pkg';
          });
          el.querySelector('#pkg-tab-local').style.display = (activeTab === 'local') ? 'block' : 'none';
          el.querySelector('#pkg-tab-online').style.display = (activeTab === 'online') ? 'block' : 'none';
          el.querySelector('#pkg-tab-installed').style.display = (activeTab === 'installed') ? 'block' : 'none';

          if (activeTab === 'installed') loadInstalledApps(el);
        });
      });

      // 1. Yerel Paket Seç ve Analiz Et
      el.querySelector('#pkg-pick-btn')?.addEventListener('click', async () => {
        const container = el.querySelector('#pkg-report-container');
        window.UlakUI.state(container, 'loading', { title: 'Dosya seçimi ve güvenlik analizi bekleniyor...' });

        try {
          const report = await window.ulak.invoke('pkg:select-file');
          if (!report) {
            return window.UlakUI.state(container, 'empty', { title: 'Dosya seçilmedi' });
          }
          // Authenticode İmza Sorgula
          let sigInfo = null;
          try {
            sigInfo = await window.ulak.invoke('pkg:verify-signature', report.filePath);
          } catch (e) {}

          renderPackageReport(el, report, sigInfo);
        } catch (err) {
          window.UlakUI.state(container, 'error', { desc: err.message });
        }
      });

      // Görsel / Belge Gizli Kod Tara
      el.querySelector('#pkg-scan-av-btn')?.addEventListener('click', async () => {
        const container = el.querySelector('#pkg-report-container');
        window.UlakUI.state(container, 'loading', { title: 'Görsel / Belge seçimi bekleniyor...' });

        try {
          const report = await window.ulak.invoke('antivirus:select-and-scan');
          if (!report) {
            return window.UlakUI.state(container, 'empty', { title: 'Dosya seçilmedi' });
          }
          renderAntivirusReport(el, report);
        } catch (err) {
          window.UlakUI.state(container, 'error', { desc: err.message });
        }
      });

      // 2. Çevrimiçi Paket Ara
      const searchInput = el.querySelector('#pkg-online-search-input');
      const searchBtn = el.querySelector('#pkg-online-search-btn');

      async function triggerSearch() {
        const q = searchInput?.value.trim();
        if (!q) return window.UlakUI.toast('Lütfen aramak istediğiniz bir yazılım yazın!', 'warning');

        const source = el.querySelector('#pkg-online-source-select')?.value || 'winget';
        const resContainer = el.querySelector('#pkg-online-results-container');
        window.UlakUI.state(resContainer, 'loading', { title: `${source.toUpperCase()} deposu sorgulanıyor...` });

        try {
          const results = await window.ulak.invoke('pkg:search-online', q, source);
          if (!results || results.length === 0) {
            return window.UlakUI.state(resContainer, 'empty', { title: `"${q}" için eşleşen paket bulunamadı.` });
          }

          resContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${results.map(r => `
                <div class="glass-card" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.02);">
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; font-size: 13px; color: var(--text-1);">${r.name}</div>
                    <div style="font-size: 11px; color: var(--text-3); margin-top: 2px; font-variant-numeric: tabular-nums;">
                      ID: <span style="color: var(--text-2);">${r.id}</span> • Sürüm: ${r.version}
                    </div>
                  </div>
                  <button class="btn btn-primary btn-sm btn-install-online" data-id="${r.id}" data-source="${r.source}">
                    ${window.UlakIcons.getIcon('download', 'icon-mono-xs')} Kur
                  </button>
                </div>
              `).join('')}
            </div>
          `;

          resContainer.querySelectorAll('.btn-install-online').forEach(btn => {
            btn.addEventListener('click', async () => {
              const pkgId = btn.getAttribute('data-id');
              const src = btn.getAttribute('data-source');
              const isSilent = el.querySelector('#pkg-online-silent-check')?.checked !== false;

              btn.disabled = true;
              btn.innerHTML = `<span class="spinner-inline"></span> Kuruluyor...`;
              window.UlakUI.toast(`${pkgId} kurulumu arka planda başlatıldı...`, 'info');

              try {
                const res = await window.ulak.invoke('pkg:install-online', pkgId, src, isSilent);
                if (res && res.success) {
                  window.UlakUI.toast(`${pkgId} başarıyla kuruldu!`, 'success');
                  btn.innerHTML = `✔ Yüklendi`;
                } else {
                  window.UlakUI.toast(`Kurulum tamamlanamadı: ${res?.message || ''}`, 'error');
                  btn.disabled = false;
                  btn.innerHTML = `Tekrar Dene`;
                }
              } catch (e) {
                window.UlakUI.toast(`Hata: ${e.message}`, 'error');
                btn.disabled = false;
                btn.innerHTML = `Kur`;
              }
            });
          });
        } catch (e) {
          window.UlakUI.state(resContainer, 'error', { desc: e.message });
        }
      }

      searchBtn?.addEventListener('click', triggerSearch);
      searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') triggerSearch();
      });

      // 3. Yüklü Uygulamaları Yükle
      el.querySelector('#pkg-refresh-installed-btn')?.addEventListener('click', () => loadInstalledApps(el));

      async function loadInstalledApps(containerEl) {
        const box = containerEl.querySelector('#pkg-installed-container');
        if (!box) return;
        window.UlakUI.state(box, 'loading', { title: 'Yüklü programlar taranıyor...' });

        try {
          const apps = await window.ulak.invoke('pkg:get-installed-apps');
          if (!apps || apps.length === 0) {
            return window.UlakUI.state(box, 'empty', { title: 'Yüklü uygulama kaydı bulunamadı.' });
          }

          box.innerHTML = `
            <table class="data-table" style="width: 100%; font-size: 12px;">
              <thead>
                <tr>
                  <th>Yazılım Adı</th>
                  <th>Geliştirici</th>
                  <th>Sürüm</th>
                  <th style="text-align: right;">Eylem</th>
                </tr>
              </thead>
              <tbody>
                ${apps.map(a => `
                  <tr>
                    <td style="font-weight: 600; color: var(--text-1);">${a.name}</td>
                    <td style="color: var(--text-2);">${a.publisher}</td>
                    <td style="font-variant-numeric: tabular-nums;">${a.version}</td>
                    <td style="text-align: right;">
                      ${a.uninstallString ? `
                        <button class="btn btn-danger-soft btn-xs btn-uninstall-app" data-cmd="${encodeURIComponent(a.uninstallString)}" title="Programı Kaldır">
                          ${window.UlakIcons.getIcon('trash', 'icon-mono-xs')} Kaldır
                        </button>
                      ` : '<span style="color: var(--text-3); font-size: 10px;">Sistem Bileşeni</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;

          box.querySelectorAll('.btn-uninstall-app').forEach(btn => {
            btn.addEventListener('click', async () => {
              const cmd = decodeURIComponent(btn.getAttribute('data-cmd'));
              const ok = await window.UlakUI.confirm('Uygulamayı Kaldır', 'Bu yazılım için Windows kaldırıcı motoru başlatılacaktır. Emin misiniz?', 'Kaldır');
              if (ok) {
                try {
                  const res = await window.ulak.invoke('pkg:uninstall-app', cmd);
                  if (res && res.success) {
                    window.UlakUI.toast(res.message, 'info');
                  } else {
                    window.UlakUI.toast('Kaldırma başlatılamadı.', 'error');
                  }
                } catch (e) {
                  window.UlakUI.toast(`Hata: ${e.message}`, 'error');
                }
              }
            });
          });
        } catch (e) {
          window.UlakUI.state(box, 'error', { desc: e.message });
        }
      }
    }
  };

  function renderPackageReport(el, report, sigInfo) {
    const container = el.querySelector('#pkg-report-container');
    const isHighRisk = report.riskLevel === 'HIGH';
    const isMediumRisk = report.riskLevel === 'MEDIUM';

    let chipClass = 'chip-accent';
    let riskBadgeText = 'Düşük / Güvenli';
    if (isHighRisk) {
      chipClass = 'chip-danger';
      riskBadgeText = 'Yüksek Risk!';
    } else if (isMediumRisk) {
      chipClass = 'chip-warning';
      riskBadgeText = 'Orta Risk / Şüpheli';
    }

    const sigBadge = (sigInfo && sigInfo.isValid)
      ? '<span class="chip chip-accent" style="font-size: 11px;">✔ Geçerli Microsoft Authenticode İmzası</span>'
      : '<span class="chip chip-warning" style="font-size: 11px;">⚠ İmzasız veya Bilinmeyen Yayıncı</span>';

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div class="glass-card" style="padding: 18px; background: rgba(255,255,255,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
            <div>
              <div style="font-size: 16px; font-weight: 700; color: var(--text-1);">${report.fileName}</div>
              <div style="font-size: 12px; color: var(--text-3); margin-top: 2px;">${report.filePath}</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <span class="chip ${chipClass}">${riskBadgeText}</span>
              ${sigBadge}
            </div>
          </div>

          <div class="grid-3" style="gap: 10px; margin-top: 14px;">
            <div class="glass-card" style="padding: 10px 14px;">
              <div class="stat-tile-label">PAKET BOYUTU</div>
              <div style="font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums;">${report.fileSize}</div>
            </div>
            <div class="glass-card" style="padding: 10px 14px;">
              <div class="stat-tile-label">SHANNON ENTROPİSİ</div>
              <div style="font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums;">${(report.entropy || 0).toFixed(2)} / 8.0</div>
            </div>
            <div class="glass-card" style="padding: 10px 14px;">
              <div class="stat-tile-label">YAYINCI (PUBLISHER)</div>
              <div style="font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${sigInfo?.publisher || 'Bilinmiyor'}</div>
            </div>
          </div>

          <div style="margin-top: 14px; font-size: 11px; color: var(--text-3); font-family: var(--font-mono);">
            SHA-256: ${report.sha256Full || report.sha256}
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <button class="btn btn-primary" id="btn-run-local-installer" style="flex: 2; padding: 12px;">
            ${window.UlakIcons.getIcon('zap', 'icon-mono-sm')} Paketi Şimdi Kur
          </button>
        </div>
      </div>
    `;

    container.querySelector('#btn-run-local-installer')?.addEventListener('click', async () => {
      const ok = await window.UlakUI.confirm('Paketi Kur', `${report.fileName} çalıştırılacaktır. Devam edilsin mi?`, 'Kur');
      if (ok) {
        window.UlakUI.toast('Kurulum başlatıldı...', 'info');
        try {
          const res = await window.ulak.invoke('pkg:install-file', report.filePath, {});
          window.UlakUI.toast(res.message || 'Tamamlandı.', 'success');
        } catch (e) {
          window.UlakUI.toast(`Hata: ${e.message}`, 'error');
        }
      }
    });
  }

  function renderAntivirusReport(el, report) {
    const container = el.querySelector('#pkg-report-container');
    const isClean = !report.threats || report.threats.length === 0;

    container.innerHTML = `
      <div class="glass-card" style="padding: 18px; background: rgba(255,255,255,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="font-size: 15px; font-weight: 700; color: var(--text-1);">${report.fileName || 'Belge/Görsel Analizi'}</div>
          <span class="chip ${isClean ? 'chip-accent' : 'chip-danger'}">${isClean ? 'Temiz / Gizli Kod Yok' : 'Tehdit Tespit Edildi!'}</span>
        </div>
        <div style="font-size: 12px; color: var(--text-2); margin-bottom: 8px;">
          Entropi: <strong style="font-variant-numeric: tabular-nums;">${(report.entropy || 0).toFixed(2)}</strong> • Boyut: ${report.fileSize || '--'}
        </div>
        ${!isClean ? `
          <div style="margin-top: 10px; padding: 10px; border-radius: var(--r-sm); background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.2);">
            ${report.threats.map(t => `<div style="font-size: 12px; color: var(--danger);">• ${t.name || t.type}: ${t.description}</div>`).join('')}
          </div>
        ` : `
          <div style="color: var(--success); font-size: 13px;">Görsel veya belge içerisinde gizlenmiş kabuk kodu veya polimorfik şüpheli yük bulunamadı.</div>
        `}
      </div>
    `;
  }

  window.UlakRouter.register(view);
})();
