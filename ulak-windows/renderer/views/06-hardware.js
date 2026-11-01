// VIEW 06: DONANIM & SİSTEM KAYNAKLARI
(function() {
  const view = {
    id: 'hardware',
    title: 'Donanım',
    icon: 'cpu',

    render() {
      const C = window.UlakComponents;
      return `
        <div class="hardware-view">
          ${C.headerCard('Donanım & Sistem Kaynakları', 'İşlemci Mimarisi, Bellek, Güç ve Görev Yöneticisi', 'cpu')}

          <!-- Stats Grid -->
          <div class="grid-3" style="margin-bottom: 20px;">
            ${C.statTile('İŞLEMCİ MİMARİSİ', 'Yükleniyor...', '-- Çekirdek', 'hw-cpu-')}
            ${C.statTile('FİZİKSEL BELLEK', 'Yükleniyor...', 'Boş Alan: --', 'hw-ram-')}
            ${C.statTile('PİL / GÜÇ DURUMU', 'Yükleniyor...', 'Şebeke Durumu', 'hw-batt-')}
          </div>

          <!-- Process Manager Section -->
          <div class="view-section glass-card">
            <div class="view-section-header">
              <div class="view-section-title">Çalışan İşlemler (Process Manager)</div>
              <button class="btn btn-secondary" id="hw-refresh-proc-btn">
                ${window.UlakIcons.getIcon('refresh', 'icon-mono-sm')} Listeyi Yenile
              </button>
            </div>
            <div class="data-table-container glass-soft" id="hw-proc-table-container" style="max-height: 400px;"></div>
          </div>
        </div>
      `;
    },

    async mount(el) {
      el.querySelector('#hw-refresh-proc-btn')?.addEventListener('click', () => loadProcesses(el));
      await loadHardwareSpecs(el);
      await loadProcesses(el);
    }
  };

  async function loadHardwareSpecs(el) {
    try {
      const [cpu, mem, batt] = await Promise.all([
        window.ulak.invoke('system:get-cpu-info'),
        window.ulak.invoke('system:get-memory-info'),
        window.ulak.invoke('system:get-battery-info')
      ]);

      const cpuVal = el.querySelector('#hw-cpu-val');
      const cpuSub = el.querySelector('#hw-cpu-sub');
      if (cpuVal) cpuVal.textContent = cpu.model || 'Intel / AMD CPU';
      if (cpuSub) cpuSub.textContent = `${cpu.cores || 4} Çekirdek | ${cpu.speed || '2.4 GHz'}`;

      const ramVal = el.querySelector('#hw-ram-val');
      const ramSub = el.querySelector('#hw-ram-sub');
      if (ramVal) ramVal.textContent = `${mem.totalGB || '8'} GB RAM`;
      if (ramSub) ramSub.textContent = `Boş: ${mem.freeGB || '4'} GB (%${Math.round(mem.usagePercent || 0)} dolu)`;

      const battVal = el.querySelector('#hw-batt-val');
      const battSub = el.querySelector('#hw-batt-sub');
      if (battVal) battVal.textContent = batt.hasBattery ? `%${batt.percent}` : 'Masaüstü (AC Güç)';
      if (battSub) battSub.textContent = batt.hasBattery ? (batt.isCharging ? 'Şarj Ediliyor' : 'Pilde Çalışıyor') : 'Doğrudan Şebeke Beslemesi';
    } catch (e) {
      console.error(e);
    }
  }

  async function loadProcesses(el) {
    const container = el.querySelector('#hw-proc-table-container');
    window.UlakUI.state(container, 'loading', { title: 'İşlemler listeleniyor...' });

    try {
      const procs = await window.ulak.invoke('system:get-processes', 40);
      if (!procs || procs.length === 0) {
        return window.UlakUI.state(container, 'empty', { title: 'Aktif işlem bulunamadı' });
      }

      const rows = procs.map((p) => {
        return `
          <tr>
            <td style="font-weight: 600;">${window.UlakUI.escapeHtml(p.name)}</td>
            <td><span class="chip">${p.pid}</span></td>
            <td>${window.UlakUI.escapeHtml(p.mem || p.memory || '--')}</td>
            <td>
              <button class="btn btn-danger-soft btn-kill-proc" data-pid="${p.pid}" data-name="${window.UlakUI.escapeHtml(p.name)}">
                Görevi Sonlandır
              </button>
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>İşlem Adı</th>
              <th>PID</th>
              <th>Bellek Kullanımı</th>
              <th>Eylem</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;

      container.querySelectorAll('.btn-kill-proc').forEach((b) => {
        b.addEventListener('click', async () => {
          const pid = b.getAttribute('data-pid');
          const name = b.getAttribute('data-name');
          const ok = await window.UlakUI.confirm('İşlemi Sonlandır', `'${name}' (PID: ${pid}) işlemini sonlandırmak istediğinize emin misiniz?`, 'Sonlandır');
          if (ok) {
            try {
              await window.ulak.invoke('system:kill-process', pid);
              window.UlakUI.toast(`İşlem sonlandırıldı: ${name}`, 'info');
              loadProcesses(el);
            } catch (err) {
              window.UlakUI.toast(`Sonlandırılamadı: ${err.message}`, 'error');
            }
          }
        });
      });
    } catch (err) {
      window.UlakUI.state(container, 'error', { desc: err.message, actionText: 'Tekrar Dene', actionFn: () => loadProcesses(el) });
    }
  }

  window.UlakRouter.register(view);
})();
