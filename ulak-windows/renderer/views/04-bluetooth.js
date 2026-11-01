// VIEW 04: BLUETOOTH
(function() {
  const view = {
    id: 'bluetooth',
    title: 'Bluetooth',
    icon: 'bluetooth',

    render() {
      const C = window.UlakComponents;
      return `
        <div class="bluetooth-view">
          ${C.headerCard('Bluetooth Yönetimi', 'Kablosuz Aygıtlar, Eşleşmeler ve Sinyal Kontrolü', 'bluetooth')}

          <!-- Adapter Status Section -->
          <div class="view-section glass-card liquid-glow">
            ${C.settingRow(
              'bluetooth',
              'Bluetooth Adaptörü',
              'Kablosuz aygıt iletişimi için Windows Bluetooth hizmeti',
              `<div class="action-bar glass-soft" style="padding: 4px;">
                <button class="btn btn-primary" id="bt-scan-btn">
                  ${window.UlakIcons.getIcon('refresh', 'icon-mono-sm')} Aygıtları Tara
                </button>
              </div>`
            )}
          </div>

          <!-- Paired Devices Section -->
          <div class="view-section glass-card">
            <div class="view-section-header">
              <div class="view-section-title">Eşleşmiş ve Yakındaki Cihazlar</div>
            </div>
            <div id="bt-device-list" style="display: flex; flex-direction: column; gap: 6px;">
              <!-- Device rows rendered here -->
            </div>
          </div>
        </div>
      `;
    },

    async mount(el) {
      el.querySelector('#bt-scan-btn')?.addEventListener('click', () => loadDevices(el));
      await loadDevices(el);
    }
  };

  async function loadDevices(el) {
    const list = el.querySelector('#bt-device-list');
    window.UlakUI.state(list, 'loading', { title: 'Bluetooth aygıtları taranıyor...' });

    try {
      const devices = await window.ulak.invoke('bluetooth:get-paired');
      if (!devices || devices.length === 0) {
        return window.UlakUI.state(list, 'empty', { title: 'Eşleşmiş Bluetooth aygıtı bulunamadı' });
      }

      list.innerHTML = devices.map((d) => {
        return window.UlakComponents.listRow(
          'headphones',
          d.name || 'Bilinmeyen Cihaz',
          `Cihaz ID: ${d.deviceId || d.mac || '--'}`,
          `<button class="btn btn-danger-soft btn-remove-bt" data-id="${window.UlakUI.escapeHtml(d.deviceId)}">Kaldır</button>`
        );
      }).join('');

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

  window.UlakRouter.register(view);
})();
