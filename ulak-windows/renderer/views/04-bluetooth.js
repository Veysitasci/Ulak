// VIEW 04: BLUETOOTH
(function() {
  const view = {
    id: 'bluetooth',
    title: 'Bluetooth',
    icon: 'bluetooth',

    render() {
      const C = window.UlakComponents;
      const I = window.UlakIcons;
      return `
        <div class="bluetooth-view" style="display: flex; flex-direction: column; gap: 16px;">
          ${C.headerCard('Bluetooth Yönetimi', 'Kablosuz Aygıtlar, Gerçek Bağlantı Durumu ve Donanım Kontrolü', 'bluetooth')}

          <!-- Adapter Status Hero Card -->
          <div class="glass-card liquid-glow" style="padding: 18px 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
              <div style="display: flex; align-items: center; gap: 14px;">
                <div id="bt-adapter-icon-wrap" style="width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(59, 130, 246, 0.12); color: var(--accent); border: 1px solid rgba(59, 130, 246, 0.25);">
                  ${I.getIcon('bluetooth', 'icon-mono-lg')}
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                    <span id="bt-adapter-name" style="font-weight: 600; font-size: 15px; color: var(--text-1);">Bluetooth Bağdaştırıcısı</span>
                    <span id="bt-adapter-badge" class="chip chip-accent">
                      <span class="chip-dot"></span>
                      <span id="bt-adapter-status-text">Kontrol ediliyor...</span>
                    </span>
                  </div>
                  <div style="font-size: 12px; color: var(--text-2);">
                    Windows kablosuz radyo hizmeti ve eşleşmiş çevre birimleri
                  </div>
                </div>
              </div>

              <!-- Action Bar -->
              <div class="action-bar glass-soft" style="padding: 4px 6px; display: flex; align-items: center; gap: 6px;">
                <button class="btn btn-primary" id="bt-scan-btn" title="Aygıt listesini yenile">
                  ${I.getIcon('refresh', 'icon-mono-sm')} Yenile
                </button>
                <button class="btn btn-secondary" id="bt-toggle-btn" title="Bluetooth radyosunu aç / kapat">
                  ${I.getIcon('power', 'icon-mono-sm')} <span id="bt-toggle-text">Kapat</span>
                </button>
                <button class="btn btn-secondary" id="bt-pair-wizard-btn" title="Windows Bluetooth Ayarları">
                  ${I.getIcon('settings', 'icon-mono-sm')} Yeni Cihaz Eşleştir
                </button>
              </div>
            </div>
          </div>

          <!-- Connected Devices Section -->
          <div class="view-section glass-card" style="padding: 16px 20px;">
            <div class="view-section-header" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="chip-dot" style="background: #10b981; width: 8px; height: 8px;"></span>
                <span class="view-section-title" style="font-size: 14px; font-weight: 600; color: var(--text-1);">Bağlı ve Aktif Cihazlar</span>
              </div>
              <span id="bt-connected-count" class="chip chip-success" style="font-variant-numeric: tabular-nums;">0 Aktif</span>
            </div>
            <div id="bt-connected-list" style="display: flex; flex-direction: column; gap: 8px;">
              <!-- Connected device cards rendered here -->
            </div>
          </div>

          <!-- Paired / Offline Devices Section -->
          <div class="view-section glass-card" style="padding: 16px 20px;">
            <div class="view-section-header" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="chip-dot" style="background: var(--text-3); width: 8px; height: 8px;"></span>
                <span class="view-section-title" style="font-size: 14px; font-weight: 600; color: var(--text-1);">Kayıtlı ve Eşleşmiş Cihazlar (Çevrimdışı)</span>
              </div>
              <span id="bt-paired-count" class="chip" style="font-variant-numeric: tabular-nums;">0 Kayıtlı</span>
            </div>
            <div id="bt-paired-list" style="display: flex; flex-direction: column; gap: 8px;">
              <!-- Paired offline device cards rendered here -->
            </div>
          </div>

          <!-- Helpful Info / Diagnostics Card -->
          <div class="glass-card" style="padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; background: rgba(255, 255, 255, 0.02);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="color: var(--accent);">${I.getIcon('shield', 'icon-mono-md')}</div>
              <div style="font-size: 12px; color: var(--text-2); line-height: 1.5;">
                <strong style="color: var(--text-1);">Akıllı Aygıt Filtresi:</strong> Windows iç çekirdek sürücüleri, AVRCP alt kanalları ve sanal GATT hizmetleri filtrelendi. Yalnızca gerçek kulaklık, fare, klavye ve bağlı aygıtlarınız listelenir.
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" id="bt-restart-radio-btn" style="white-space: nowrap;">
              ${I.getIcon('zap', 'icon-mono-sm')} Radyoyu Sıfırla
            </button>
          </div>
        </div>
      `;
    },

    async mount(el) {
      const scanBtn = el.querySelector('#bt-scan-btn');
      const toggleBtn = el.querySelector('#bt-toggle-btn');
      const pairBtn = el.querySelector('#bt-pair-wizard-btn');
      const restartBtn = el.querySelector('#bt-restart-radio-btn');

      scanBtn?.addEventListener('click', () => loadAll(el));

      toggleBtn?.addEventListener('click', async () => {
        try {
          toggleBtn.disabled = true;
          window.UlakUI.toast('Bluetooth radyo durumu değiştiriliyor...', 'info');
          await window.ulak.invoke('bluetooth:toggle');
          await loadAll(el);
          window.UlakUI.toast('Bluetooth durumu güncellendi.', 'success');
        } catch (err) {
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        } finally {
          toggleBtn.disabled = false;
        }
      });

      pairBtn?.addEventListener('click', async () => {
        try {
          await window.ulak.invoke('bluetooth:open-settings');
        } catch (err) {
          window.UlakUI.toast('Windows Ayarları açılamadı.', 'error');
        }
      });

      restartBtn?.addEventListener('click', async () => {
        const ok = await window.UlakUI.confirm(
          'Bluetooth Radyosunu Sıfırla',
          'Bluetooth bağdaştırıcısı kapatılıp yeniden başlatılacak ve sürücü önbelleği temizlenecektir. Devam edilsin mi?',
          'Sıfırla'
        );
        if (ok) {
          try {
            restartBtn.disabled = true;
            window.UlakUI.toast('Bluetooth radyo bağdaştırıcısı sıfırlanıyor...', 'info');
            await window.ulak.invoke('bluetooth:restart-radio');
            window.UlakUI.toast('Bluetooth sürücüsü başarıyla sıfırlandı.', 'success');
            await loadAll(el);
          } catch (e) {
            window.UlakUI.toast(`Sıfırlama hatası: ${e.message}`, 'error');
          } finally {
            restartBtn.disabled = false;
          }
        }
      });

      await loadAll(el);
    }
  };

  async function loadAll(el) {
    const connectedContainer = el.querySelector('#bt-connected-list');
    const pairedContainer = el.querySelector('#bt-paired-list');
    const connectedCount = el.querySelector('#bt-connected-count');
    const pairedCount = el.querySelector('#bt-paired-count');
    const adapterName = el.querySelector('#bt-adapter-name');
    const adapterBadge = el.querySelector('#bt-adapter-badge');
    const adapterStatusText = el.querySelector('#bt-adapter-status-text');
    const toggleText = el.querySelector('#bt-toggle-text');

    if (connectedContainer) window.UlakUI.state(connectedContainer, 'loading', { title: 'Aygıtlar kontrol ediliyor...' });
    if (pairedContainer) window.UlakUI.state(pairedContainer, 'loading', { title: 'Eşleşmeler taranıyor...' });

    try {
      const statusRes = await window.ulak.invoke('bluetooth:get-status');
      const isEnabled = !!statusRes?.enabled;
      const adapter = statusRes?.adapter || {};
      const devices = Array.isArray(statusRes?.devices) ? statusRes.devices : [];

      // Update adapter UI
      if (adapterName) adapterName.textContent = adapter.name || 'Bluetooth Bağdaştırıcısı';
      if (adapterBadge && adapterStatusText) {
        if (isEnabled) {
          adapterBadge.className = 'chip chip-success';
          adapterStatusText.textContent = 'Açık (Aktif)';
          if (toggleText) toggleText.textContent = 'Bluetooth Kapat';
        } else {
          adapterBadge.className = 'chip chip-warning';
          adapterStatusText.textContent = 'Kapalı';
          if (toggleText) toggleText.textContent = 'Bluetooth Aç';
        }
      }

      // Filter devices
      const connectedDevices = devices.filter(d => d.connected);
      const pairedDevices = devices.filter(d => !d.connected);

      if (connectedCount) connectedCount.textContent = `${connectedDevices.length} Aktif`;
      if (pairedCount) pairedCount.textContent = `${pairedDevices.length} Kayıtlı`;

      // Render Connected Devices
      if (connectedDevices.length === 0) {
        connectedContainer.innerHTML = `
          <div style="padding: 16px; text-align: center; color: var(--text-3); font-size: 13px; border-radius: 8px; border: 1px dashed var(--glass-border);">
            Şu anda bağlı aktif bir Bluetooth aygıtı bulunmuyor.
          </div>
        `;
      } else {
        connectedContainer.innerHTML = connectedDevices.map(renderDeviceRow).join('');
      }

      // Render Paired / Offline Devices
      if (pairedDevices.length === 0) {
        pairedContainer.innerHTML = `
          <div style="padding: 16px; text-align: center; color: var(--text-3); font-size: 13px; border-radius: 8px; border: 1px dashed var(--glass-border);">
            Kayıtlı çevrimdışı aygıt bulunmuyor.
          </div>
        `;
      } else {
        pairedContainer.innerHTML = pairedDevices.map(renderDeviceRow).join('');
      }

      // Attach Remove Listeners
      el.querySelectorAll('.btn-remove-bt').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const devName = btn.getAttribute('data-name') || 'bu aygıtın';
          const ok = await window.UlakUI.confirm(
            'Eşleşmeyi Kaldır',
            `"${devName}" adlı Bluetooth aygıtının sistem eşleşmesi kaldırılacaktır. Onaylıyor musunuz?`,
            'Kaldır'
          );
          if (ok) {
            try {
              btn.disabled = true;
              btn.textContent = 'Kaldırılıyor...';
              await window.ulak.invoke('bluetooth:remove-device', id);
              window.UlakUI.toast('Aygıt eşleşmesi kaldırıldı.', 'info');
              await loadAll(el);
            } catch (err) {
              window.UlakUI.toast(`Kaldırma başarısız: ${err.message}`, 'error');
              btn.disabled = false;
              btn.textContent = 'Kaldır';
            }
          }
        });
      });

    } catch (err) {
      if (connectedContainer) {
        window.UlakUI.state(connectedContainer, 'error', {
          desc: err.message,
          actionText: 'Tekrar Dene',
          actionFn: () => loadAll(el)
        });
      }
      if (pairedContainer) {
        pairedContainer.innerHTML = '';
      }
    }
  }

  function renderDeviceRow(d) {
    const isConnected = !!d.connected;
    const iconName = d.icon || 'bluetooth';
    const batteryHtml = d.battery != null
      ? `<span class="chip chip-accent" style="font-variant-numeric: tabular-nums;">🔋 %${d.battery}</span>`
      : '';
    const statusBadge = isConnected
      ? `<span class="chip chip-success"><span class="chip-dot"></span> Bağlı</span>`
      : `<span class="chip"><span class="chip-dot"></span> Çevrimdışı</span>`;

    return `
      <div class="list-row glass-soft" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 10px; border: 1px solid var(--glass-border); background: var(--glass-surface); transition: background var(--transition-fast);">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: ${isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)'}; color: ${isConnected ? '#34d399' : 'var(--text-2)'}; border: 1px solid ${isConnected ? 'rgba(16, 185, 129, 0.25)' : 'var(--glass-border)'}; flex-shrink: 0;">
            ${window.UlakIcons.getIcon(iconName, 'icon-mono-md')}
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px; flex-wrap: wrap;">
              <span style="font-weight: 600; font-size: 14px; color: var(--text-1);">${window.UlakUI.escapeHtml(d.name || 'Bilinmeyen Cihaz')}</span>
              ${statusBadge}
              ${batteryHtml}
            </div>
            <div style="font-size: 12px; color: var(--text-2); display: flex; align-items: center; gap: 8px;">
              <span>${window.UlakUI.escapeHtml(d.type || 'Bluetooth Aygıtı')}</span>
              <span>•</span>
              <code style="font-family: monospace; font-size: 11px; color: var(--text-3); font-variant-numeric: tabular-nums;">${window.UlakUI.escapeHtml(d.mac || d.id || '--')}</code>
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
          <button class="btn btn-danger-soft btn-sm btn-remove-bt" data-id="${window.UlakUI.escapeHtml(d.deviceId || d.id)}" data-name="${window.UlakUI.escapeHtml(d.name || '')}" title="Bu cihazın eşleşmesini kaldır">
            Kaldır
          </button>
        </div>
      </div>
    `;
  }

  window.UlakRouter.register(view);
})();
