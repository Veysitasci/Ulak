// VIEW 05: WI-FI & KABLOSUZ AĞLAR — ALTIN ORAN LIQUID GLASS
(function() {
  const view = {
    id: 'wifi',
    title: 'Wi-Fi',
    icon: 'wifi',

    render() {
      const C = window.UlakComponents;
      return `
        <div class="wifi-view">
          ${C.headerCard('Wi-Fi & Kablosuz Ağlar', 'Kablosuz Ağ Keşfi, Sinyal Gücü ve Mobil Erişim Noktası', 'wifi')}

          <!-- Bento Golden Split: Active Conn (1.618fr) & Hotspot (1fr) -->
          <div class="grid-golden" style="margin-bottom: var(--space-13);">
            <!-- Active Connection -->
            <div class="view-section glass-card liquid-glow" style="display: flex; flex-direction: column; justify-content: space-between;">
              <div class="view-section-header">
                <div class="view-section-title">
                  ${window.UlakIcons.getIcon('wifi')} Aktif Kablosuz Bağlantı
                </div>
                <button class="btn btn-danger-soft btn-sm" id="wifi-disconnect-btn">Bağlantıyı Kes</button>
              </div>
              <div class="setting-row glass-soft" style="margin-bottom: 0;">
                <div class="setting-row-left">
                  <div class="setting-row-icon">${window.UlakIcons.getIcon('wifi')}</div>
                  <div>
                    <div class="setting-title" id="wifi-active-ssid">Bağlantı Taranıyor...</div>
                    <div class="setting-subtitle" id="wifi-active-details">Sinyal: -- | BSSID: --</div>
                  </div>
                </div>
                <span class="chip chip-accent" id="wifi-active-chip">Bağlı</span>
              </div>
            </div>

            <!-- Hotspot Card -->
            <div class="view-section glass-card liquid-glow">
              <div class="view-section-header">
                <div class="view-section-title">
                  ${window.UlakIcons.getIcon('zap')} Mobil Erişim Noktası
                </div>
              </div>
              <div class="field-group" style="margin-bottom: var(--space-8);">
                <div class="field" style="flex: 1;">
                  <label class="field-label">Ağ Adı (SSID)</label>
                  <input type="text" id="wifi-hotspot-ssid" class="field-input" placeholder="ULAK_Hotspot">
                </div>
                <div class="field" style="flex: 1;">
                  <label class="field-label">Parola</label>
                  <input type="password" id="wifi-hotspot-pass" class="field-input" placeholder="********">
                </div>
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <button class="btn btn-primary" id="wifi-hotspot-toggle-btn">
                  ${window.UlakIcons.getIcon('zap', 'icon-mono-xs')} Hotspot Başlat
                </button>
              </div>
            </div>
          </div>

          <!-- Discovered Networks Section -->
          <div class="view-section glass-card">
            <div class="view-section-header">
              <div class="view-section-title">
                ${window.UlakIcons.getIcon('globe')} Kapsama Alanındaki Ağlar
              </div>
              <button class="btn btn-secondary btn-sm" id="wifi-rescan-btn">
                ${window.UlakIcons.getIcon('refresh', 'icon-mono-xs')} Ağları Yenile
              </button>
            </div>
            <div id="wifi-networks-list" style="display: flex; flex-direction: column; gap: var(--space-5);">
              <div class="setting-row glass-soft" style="justify-content: center; color: var(--text-3); font-size: var(--text-xs);">
                Ağlar taranıyor...
              </div>
            </div>
          </div>
        </div>
      `;
    },

    async mount(el) {
      el.querySelector('#wifi-rescan-btn')?.addEventListener('click', () => loadNetworks(el));
      el.querySelector('#wifi-disconnect-btn')?.addEventListener('click', async () => {
        try {
          await window.ulak.invoke('wifi:disconnect');
          window.UlakUI.toast('Wi-Fi bağlantısı kesildi.', 'info');
          loadCurrent(el);
        } catch (e) {
          window.UlakUI.toast(`Hata: ${e.message}`, 'error');
        }
      });

      el.querySelector('#wifi-hotspot-toggle-btn')?.addEventListener('click', async () => {
        const ssid = el.querySelector('#wifi-hotspot-ssid').value.trim();
        const pass = el.querySelector('#wifi-hotspot-pass').value.trim();
        if (!ssid || pass.length < 8) {
          return window.UlakUI.toast('Lütfen geçerli bir SSID ve en az 8 karakterli parola girin!', 'warning');
        }
        try {
          await window.ulak.invoke('wifi:create-hotspot', ssid, pass);
          window.UlakUI.toast(`Hotspot '${ssid}' aktif edildi.`, 'success');
        } catch (err) {
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        }
      });

      await loadCurrent(el);
      await loadNetworks(el);
    }
  };

  async function loadCurrent(el) {
    try {
      const conn = await window.ulak.invoke('wifi:get-connection');
      const ssidEl = el.querySelector('#wifi-active-ssid');
      const detailsEl = el.querySelector('#wifi-active-details');
      const chipEl = el.querySelector('#wifi-active-chip');

      if (conn && conn.ssid) {
        if (ssidEl) ssidEl.textContent = conn.ssid;
        if (detailsEl) detailsEl.textContent = `Sinyal: %${conn.signal || 0} | BSSID: ${conn.bssid || 'Bilinmiyor'}`;
        if (chipEl) {
          chipEl.textContent = 'Bağlı';
          chipEl.className = 'chip chip-accent';
        }
      } else {
        if (ssidEl) ssidEl.textContent = 'Bağlı Bir Ağ Yok';
        if (detailsEl) detailsEl.textContent = 'Kapsama alanındaki ağlardan birine bağlanabilirsiniz.';
        if (chipEl) {
          chipEl.textContent = 'Bağlı Değil';
          chipEl.className = 'chip chip-warning';
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadNetworks(el) {
    const list = el.querySelector('#wifi-networks-list');
    if (!list) return;

    try {
      const nets = await window.ulak.invoke('wifi:get-networks');
      if (!nets || nets.length === 0) {
        list.innerHTML = `<div class="setting-row glass-soft" style="justify-content: center; color: var(--text-3); font-size: var(--text-xs);">Yakında kablosuz ağ bulunamadı.</div>`;
        return;
      }

      list.innerHTML = nets.map((n) => {
        const isLocked = n.security && n.security !== 'Open';
        return `
          <div class="setting-row glass-soft">
            <div class="setting-row-left">
              <div class="setting-row-icon">
                ${window.UlakIcons.getIcon(isLocked ? 'lock' : 'wifi', 'icon-mono-xs')}
              </div>
              <div>
                <div class="setting-title">${window.UlakUI.escapeHtml(n.ssid || 'Gizli Ağ')}</div>
                <div class="setting-subtitle">Sinyal: %${n.signal || 0} | Kanal: ${n.channel || '-'} | Güvenlik: ${n.security || 'Açık'}</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="chip">${n.signal || 0}%</span>
              <button class="btn btn-secondary btn-sm btn-connect-wifi" data-ssid="${window.UlakUI.escapeHtml(n.ssid)}">
                Bağlan
              </button>
            </div>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.btn-connect-wifi').forEach((btn) => {
        btn.addEventListener('click', () => {
          const ssid = btn.getAttribute('data-ssid');
          window.UlakUI.openModal(
            `Wi-Fi Ağına Bağlan: ${ssid}`,
            `
              <div class="field">
                <label class="field-label">Ağ Parolası</label>
                <input type="password" id="modal-wifi-pass" class="field-input" placeholder="Parolayı girin">
              </div>
            `,
            `
              <button class="btn btn-secondary" onclick="window.UlakUI.closeModal()">İptal</button>
              <button class="btn btn-primary" id="modal-btn-confirm-wifi">Bağlan</button>
            `
          );

          document.getElementById('modal-btn-confirm-wifi')?.addEventListener('click', async () => {
            const pass = document.getElementById('modal-wifi-pass').value;
            window.UlakUI.closeModal();
            try {
              window.UlakUI.toast(`'${ssid}' ağına bağlanılıyor...`, 'info');
              await window.ulak.invoke('wifi:connect', ssid, pass);
              window.UlakUI.toast(`'${ssid}' ağına başarıyla bağlanıldı.`, 'success');
              loadCurrent(el);
            } catch (e) {
              window.UlakUI.toast(`Bağlantı hatası: ${e.message}`, 'error');
            }
          });
        });
      });
    } catch (err) {
      list.innerHTML = `<div class="setting-row glass-soft" style="justify-content: center; color: var(--danger); font-size: var(--text-xs);">Ağlar taranamadı: ${err.message}</div>`;
    }
  }

  window.UlakRouter.register(view);
})();
