// VIEW 14: AYARLAR & HAKKINDA — ALTIN ORAN LIQUID GLASS
(function() {
  const view = {
    id: 'settings',
    title: 'Ayarlar',
    icon: 'settings',

    render() {
      const C = window.UlakComponents;
      const curTheme = window.UlakTheme.currentTheme === 'dark' ? 'Koyu Tema (Obsidian)' : 'Açık Tema (Frost)';

      return `
        <div class="settings-view">
          ${C.headerCard('Ayarlar & Sistem Hakkında', 'Kullanıcı Tercihleri, Tema, Windows Entegrasyonu ve İstasyon Bilgileri', 'settings')}

          <!-- Golden Split Grid (1.618fr : 1fr) -->
          <div class="grid-golden" style="margin-bottom: var(--space-13);">
            <!-- Appearance & Integration (Golden Major) -->
            <div>
              <!-- Görünüm & Tema -->
              <div class="view-section glass-card liquid-glow">
                <div class="view-section-header">
                  <div class="view-section-title">
                    ${window.UlakIcons.getIcon('moon', 'icon-mono-xs')} Görünüm & Liquid Glass
                  </div>
                </div>
                <div class="setting-row glass-soft">
                  <div class="setting-row-left">
                    <div class="setting-row-icon">${window.UlakIcons.getIcon('moon', 'icon-mono-xs')}</div>
                    <div>
                      <div class="setting-title">Arayüz Teması</div>
                      <div class="setting-subtitle" id="settings-theme-desc">Şu anki mod: ${curTheme}</div>
                    </div>
                  </div>
                  <button class="btn btn-secondary btn-sm" id="settings-btn-theme-toggle">
                    Temayı Değiştir
                  </button>
                </div>

                <div class="setting-row glass-soft">
                  <div class="setting-row-left">
                    <div class="setting-row-icon">${window.UlakIcons.getIcon('activity', 'icon-mono-xs')}</div>
                    <div>
                      <div class="setting-title">Telemetri Güncelleme Sıklığı</div>
                      <div class="setting-subtitle">Canlı CPU, Bellek ve Donanım telemetrisinin yenilenme periyodu</div>
                    </div>
                  </div>
                  <div class="select-encased has-icon" style="width: 175px;">
                    <div class="select-icon">${window.UlakIcons.getIcon('clock', 'icon-mono-xs')}</div>
                    <select id="settings-telemetry-rate" class="field-input select-custom">
                      <option value="1500">1.5 sn (Hassas)</option>
                      <option value="3000">3.0 sn (Dengeli)</option>
                      <option value="5000">5.0 sn (Eko / Pil Dostu)</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Windows Sistem Entegrasyonu -->
              <div class="view-section glass-card liquid-glow">
                <div class="view-section-header">
                  <div class="view-section-title">
                    ${window.UlakIcons.getIcon('sliders', 'icon-mono-xs')} Windows Entegrasyonu
                  </div>
                </div>
                <div class="setting-row glass-soft">
                  <div class="setting-row-left">
                    <div class="setting-row-icon">${window.UlakIcons.getIcon('zap', 'icon-mono-xs')}</div>
                    <div>
                      <div class="setting-title">Windows ile Birlikte Başlat</div>
                      <div class="setting-subtitle">Kullanıcı oturumu açıldığında arka planda hazır bekle</div>
                    </div>
                  </div>
                  <label class="switch">
                    <input type="checkbox" id="settings-autostart-toggle">
                    <span class="switch-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <!-- About ULAK Station (Golden Minor) -->
            <div class="view-section glass-card liquid-glow" style="display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div class="view-section-header">
                  <div class="view-section-title">
                    ${window.UlakIcons.getIcon('info', 'icon-mono-xs')} ULAK Hakkında
                  </div>
                </div>
                <div style="text-align: center; padding: var(--space-21) 0;">
                  <img src="../assets/ulak_logo.png" style="width: 56px; height: 56px; margin-bottom: 8px; object-fit: contain;">
                  <div style="font-size: var(--text-md); font-weight: 800; color: var(--text-1);">ULAK v2.0.0</div>
                  <div style="font-size: var(--text-2xs); color: var(--accent); font-weight: 700; letter-spacing: 1px; margin-top: 2px;">WINDOWS EDITION</div>
                </div>
                <div class="setting-row glass-soft" style="font-size: var(--text-2xs); line-height: 1.5; color: var(--text-2);">
                  Windows 10 ve 11 için optimize edilmiş modern CSD pencere mimarisi, WMI/PowerShell telemetrisi ve derinlemesine ağ güvenlik kalkanı.
                </div>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; padding-top: var(--space-13); border-top: 1px solid var(--glass-border);">
                <span class="chip" style="font-size: 9px;">Fluent Acrylic Material</span>
                <span style="font-size: var(--text-2xs); color: var(--text-3); font-family: var(--font-mono);">Build 2026.10</span>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    async mount(el) {
      const themeBtn = el.querySelector('#settings-btn-theme-toggle');
      const autostartToggle = el.querySelector('#settings-autostart-toggle');
      const themeDesc = el.querySelector('#settings-theme-desc');
      const telemetrySelect = el.querySelector('#settings-telemetry-rate');

      if (telemetrySelect) {
        const savedRate = localStorage.getItem('ulak-telemetry-rate') || '3000';
        telemetrySelect.value = savedRate;
        telemetrySelect.addEventListener('change', (e) => {
          localStorage.setItem('ulak-telemetry-rate', e.target.value);
          window.UlakUI.toast(`Telemetri periyodu ${e.target.value} ms olarak güncellendi.`, 'success');
        });
      }

      if (themeBtn) {
        themeBtn.addEventListener('click', () => {
          window.UlakTheme.toggle();
          const cur = window.UlakTheme.currentTheme === 'dark' ? 'Koyu Tema (Obsidian)' : 'Açık Tema (Frost)';
          if (themeDesc) themeDesc.textContent = `Şu anki mod: ${cur}`;
        });
      }

      if (autostartToggle) {
        try {
          const isEnabled = await window.ulak.invoke('app:get-autostart');
          autostartToggle.checked = !!isEnabled;
        } catch (e) {}

        autostartToggle.addEventListener('change', async (e) => {
          try {
            await window.ulak.invoke('app:set-autostart', e.target.checked);
            window.UlakUI.toast(`Otomatik başlatma ${e.target.checked ? 'aktif' : 'kapatıldı'}.`, 'success');
          } catch (err) {
            window.UlakUI.toast(`Hata: ${err.message}`, 'error');
            e.target.checked = !e.target.checked;
          }
        });
      }
    }
  };

  window.UlakRouter.register(view);
})();
