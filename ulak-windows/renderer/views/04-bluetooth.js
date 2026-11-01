// VIEW 04: BLUETOOTH İSTASYONU & RADAR
(function() {
  const view = {
    id: 'bluetooth',
    title: 'Bluetooth',
    icon: 'bluetooth',

    render() {
      const C = window.UlakComponents;
      return `
        <div class="bluetooth-view">
          ${C.headerCard('Bluetooth İstasyonu', 'Canlı BLE Radarı, Pil Telemetrisi, Gizli Mod ve Radyo Kontrolü', 'bluetooth')}

          <!-- Bluetooth Control & Stealth Center -->
          <div class="view-section glass-card liquid-glow" style="margin-bottom: var(--space-13);">
            <div class="view-section-header">
              <div class="view-section-title">
                ${window.UlakIcons.getIcon('bluetooth', 'icon-mono-sm')} Radyo & Gizlilik Parametreleri
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn btn-secondary btn-sm" id="bt-restart-radio-btn" title="Bluetooth yığınını ve sürücüyü yeniden başlat">
                  ${window.UlakIcons.getIcon('refresh', 'icon-mono-xs')} Radyoyu Sıfırla
                </button>
              </div>
            </div>

            <div class="grid-2" style="gap: 12px;">
              <div class="setting-row glass-soft" style="margin-bottom: 0;">
                <div class="setting-row-left">
                  <div class="setting-row-icon">${window.UlakIcons.getIcon('shield', 'icon-mono-xs')}</div>
                  <div>
                    <div class="setting-title">Bluetooth Gizli Mod (Stealth)</div>
                    <div class="setting-subtitle">Cihazın yabancılar tarafından keşfedilmesini engeller</div>
                  </div>
                </div>
                <label class="switch">
                  <input type="checkbox" id="bt-stealth-toggle">
                  <span class="switch-slider"></span>
                </label>
              </div>

              <div class="setting-row glass-soft" style="margin-bottom: 0;">
                <div class="setting-row-left">
                  <div class="setting-row-icon">${window.UlakIcons.getIcon('activity', 'icon-mono-xs')}</div>
                  <div>
                    <div class="setting-title">Canlı BLE Radarı</div>
                    <div class="setting-subtitle">Çevredeki aktif Bluetooth Düşük Enerji aygıtlarını tara</div>
                  </div>
                </div>
                <button class="btn btn-primary btn-sm" id="bt-radar-scan-btn">
                  ${window.UlakIcons.getIcon('search', 'icon-mono-xs')} Radar Tara
                </button>
              </div>
            </div>
          </div>

          <!-- Paired Devices Section -->
          <div class="view-section glass-card" style="margin-bottom: var(--space-13);">
            <div class="view-section-header">
              <div class="view-section-title">
                ${window.UlakIcons.getIcon('headphones', 'icon-mono-sm')} Eşleşmiş Bluetooth Cihazları
              </div>
              <button class="btn btn-secondary btn-sm" id="bt-refresh-paired-btn">
                ${window.UlakIcons.getIcon('refresh', 'icon-mono-xs')} Yenile
              </button>
            </div>
            <div id="bt-device-list" style="display: flex; flex-direction: column; gap: 8px;">
              <!-- Device rows rendered here -->
            </div>
          </div>

          <!-- Live BLE Radar Discovered Section -->
          <div class="view-section glass-card" id="bt-radar-section" style="display: none;">
            <div class="view-section-header">
              <div class="view-section-title">
                ${window.UlakIcons.getIcon('zap', 'icon-mono-sm')} BLE Radarında Tespit Edilen Aygıtlar
              </div>
              <span class="chip chip-accent" id="bt-radar-count">0 Cihaz</span>
            </div>
            <div id="bt-radar-list" style="display: flex; flex-direction: column; gap: 8px;">
              <!-- Radar devices rendered here -->
            </div>
          </div>
        </div>
      `;
    },

    async mount(el) {
      // 1. Radar Scan
      el.querySelector('#bt-radar-scan-btn')?.addEventListener('click', () => scanLiveBleRadar(el));
      
      // 2. Refresh Paired
      el.querySelector('#bt-refresh-paired-btn')?.addEventListener('click', () => loadDevices(el));

      // 3. Stealth Mode Toggle
      const stealthToggle = el.querySelector('#bt-stealth-toggle');
      stealthToggle?.addEventListener('change', async (e) => {
        try {
          await window.ulak.invoke('bluetooth:set-stealth', e.target.checked);
          window.UlakUI.toast(e.target.checked ? 'Bluetooth Gizli Mod aktif (Keşfedilemez).' : 'Bluetooth görünür konuma alındı.', 'info');
        } catch (err) {
          window.UlakUI.toast(`Gizli mod hatası: ${err.message}`, 'error');
          e.target.checked = !e.target.checked;
        }
      });

      // 4. Restart Radio Stack
      el.querySelector('#bt-restart-radio-btn')?.addEventListener('click', async () => {
        const ok = await window.UlakUI.confirm('Bluetooth Yığınını Sıfırla', 'Windows Bluetooth sürücüsü ve servisleri yeniden başlatılacaktır. Bağlantılar anlık kesilebilir.', 'Yeniden Başlat');
        if (ok) {
          try {
            window.UlakUI.toast('Bluetooth radyo yığını yeniden başlatılıyor...', 'info');
            await window.ulak.invoke('bluetooth:restart-radio');
            window.UlakUI.toast('Bluetooth radyo yığını başarıyla sıfırlandı.', 'success');
            await loadDevices(el);
          } catch (err) {
            window.UlakUI.toast(`Sıfırlama hatası: ${err.message}`, 'error');
          }
        }
      });

      await loadDevices(el);
    }
  };

  async function loadDevices(el) {
    const list = el.querySelector('#bt-device-list');
    window.UlakUI.state(list, 'loading', { title: 'Bluetooth aygıtları listeleniyor...' });

    try {
      const devices = await window.ulak.invoke('bluetooth:get-paired');
      if (!devices || devices.length === 0) {
        return window.UlakUI.state(list, 'empty', { title: 'Eşleşmiş Bluetooth aygıtı bulunamadı' });
      }

      list.innerHTML = devices.map((d) => {
        const devId = d.deviceId || d.mac || 'UNKNOWN';
        const isConnected = d.connected === true || (d.status && d.status.toLowerCase().includes('ok'));

        return `
          <div class="setting-row glass-soft">
            <div class="setting-row-left">
              <div class="setting-row-icon">
                ${window.UlakIcons.getIcon('headphones', 'icon-mono-xs')}
              </div>
              <div>
                <div class="setting-title">${window.UlakUI.escapeHtml(d.name || 'Bilinmeyen Cihaz')}</div>
                <div class="setting-subtitle" style="font-variant-numeric: tabular-nums;">
                  ID: ${window.UlakUI.escapeHtml(devId)} ${d.class ? '| ' + d.class : ''}
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="chip ${isConnected ? 'chip-accent' : ''}">${isConnected ? 'Hazır / Eşleşti' : 'Çevrimdışı'}</span>
              <button class="btn btn-secondary btn-sm btn-bt-battery" data-id="${window.UlakUI.escapeHtml(devId)}" data-name="${window.UlakUI.escapeHtml(d.name || '')}">
                ${window.UlakIcons.getIcon('zap', 'icon-mono-xs')} Pil & Durum
              </button>
              <button class="btn btn-primary btn-sm btn-bt-connect" data-id="${window.UlakUI.escapeHtml(devId)}">
                Bağlan
              </button>
              <button class="btn btn-danger-soft btn-sm btn-remove-bt" data-id="${window.UlakUI.escapeHtml(devId)}">
                Kaldır
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Wire Connect Button
      list.querySelectorAll('.btn-bt-connect').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          btn.disabled = true;
          try {
            window.UlakUI.toast('Cihaza bağlanılıyor...', 'info');
            await window.ulak.invoke('bluetooth:connect', id);
            window.UlakUI.toast('Cihaz başarıyla bağlandı!', 'success');
            loadDevices(el);
          } catch (e) {
            window.UlakUI.toast(`Bağlantı hatası: ${e.message}`, 'error');
          } finally {
            btn.disabled = false;
          }
        });
      });

      // Wire Battery & Telemetry Button
      list.querySelectorAll('.btn-bt-battery').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          try {
            const telemetry = await window.ulak.invoke('bluetooth:get-battery', id);
            let msg = `Aygıt: ${name || id}\n`;
            if (telemetry.batteryPercent !== null) {
              msg += `Pil Durumu: %${telemetry.batteryPercent}\n`;
            } else {
              msg += `Pil Durumu: Standart telemetri desteği yok veya şarjda.\n`;
            }
            msg += `Ses (A2DP) / Ahizesiz Profil: ${telemetry.audioProfileActive ? 'Aktif' : 'Pasif'}`;
            window.UlakUI.modal('Bluetooth Cihaz Telemetrisi', `<pre style="font-size:13px; font-variant-numeric: tabular-nums;">${msg}</pre>`, `<button class="btn btn-primary" onclick="window.UlakUI.closeModal()">Kapat</button>`);
          } catch (e) {
            window.UlakUI.toast(`Telemetri hatası: ${e.message}`, 'error');
          }
        });
      });

      // Wire Remove Button
      list.querySelectorAll('.btn-remove-bt').forEach((b) => {
        b.addEventListener('click', async () => {
          const id = b.getAttribute('data-id');
          const ok = await window.UlakUI.confirm('Aygıtı Kaldır', 'Bu Bluetooth aygıtının eşleşmesi kaldırılacaktır. Emin misiniz?', 'Kaldır');
          if (ok) {
            try {
              await window.ulak.invoke('bluetooth:remove-device', id);
              window.UlakUI.toast('Aygıt kaldırıldı.', 'info');
              loadDevices(el);
            } catch (err) {
              window.UlakUI.toast(`Hata: ${err.message}`, 'error');
            }
          }
        });
      });
    } catch (err) {
      window.UlakUI.state(list, 'error', { desc: err.message, actionText: 'Tekrar Dene', actionFn: () => loadDevices(el) });
    }
  }

  async function scanLiveBleRadar(el) {
    const radarSec = el.querySelector('#bt-radar-section');
    const radarList = el.querySelector('#bt-radar-list');
    const countBadge = el.querySelector('#bt-radar-count');
    radarSec.style.display = 'block';
    window.UlakUI.state(radarList, 'loading', { title: 'BLE dalgaları dinleniyor...' });

    try {
      const radar = await window.ulak.invoke('bluetooth:get-live-radar');
      const devices = radar.devices || [];
      countBadge.textContent = `${devices.length} Cihaz Bulundu`;

      if (devices.length === 0) {
        return window.UlakUI.state(radarList, 'empty', { title: 'Yakında aktif BLE yayını yapan cihaz bulunamadı' });
      }

      radarList.innerHTML = devices.map(d => {
        return `
          <div class="setting-row glass-soft">
            <div class="setting-row-left">
              <div class="setting-row-icon">
                ${window.UlakIcons.getIcon('activity', 'icon-mono-xs')}
              </div>
              <div>
                <div class="setting-title">${window.UlakUI.escapeHtml(d.name || 'BLE Reklam Aygıtı')}</div>
                <div class="setting-subtitle" style="font-variant-numeric: tabular-nums;">
                  MAC: ${d.mac || '--'} | Sinyal (RSSI): ${d.rssi || '-65'} dBm
                </div>
              </div>
            </div>
            <span class="chip chip-accent">BLE Aktif</span>
          </div>
        `;
      }).join('');
      window.UlakUI.toast('BLE Radarı taramayı tamamladı.', 'success');
    } catch (err) {
      window.UlakUI.state(radarList, 'error', { desc: err.message });
    }
  }

  window.UlakRouter.register(view);
})();
