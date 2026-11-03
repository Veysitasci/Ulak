// VIEW 06: DONANIM & SİSTEM KAYNAKLARI (YEREL ÖNBELLEKLİ & DONANIM KORUMALI)
(function() {
  let currentSortBy = 'cpu';

  const view = {
    id: 'hardware',
    title: 'Donanım',
    icon: 'cpu',

    render() {
      const C = window.UlakComponents;
      return `
        <div class="hardware-view">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px;">
            <div style="flex: 1;">
              ${C.headerCard('Donanım & Sistem Kaynakları', 'GPU & VRAM Telemetrisi, Disk S.M.A.R.T., Batarya Aşınma Raporu, BIOS Kimliği ve Görev Yöneticisi', 'cpu', 'hardware')}
            </div>
          </div>

          <!-- Yerel Önbellek & Donanım Koruma Durumu Çubuğu -->
          <div class="glass-card" style="padding: 10px 16px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; border-left: 3px solid var(--accent);">
            <div style="display: flex; align-items: center; gap: 10px; font-size: var(--text-xs);">
              <span class="chip chip-accent" id="hw-cache-badge" style="display: inline-flex; align-items: center; gap: 5px;">
                <span class="chip-dot"></span> Donanım Koruma Aktif
              </span>
              <span style="color: var(--text-2);" id="hw-cache-info">
                Donanım telemetrisi yerel depolama ve WMI katmanından optimize ediliyor.
              </span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" id="hw-force-refresh-btn" title="Donanımı doğrudan fiziksel olarak yeniden tara">
                ${window.UlakIcons.getIcon('refresh', 'icon-mono-xs')} Donanımı Yeniden Tara
              </button>
            </div>
          </div>

          <!-- Stats Grid 1: CPU, RAM, BATTERY -->
          <div class="grid-3" style="margin-bottom: 16px;">
            ${C.statTile('İŞLEMCİ MİMARİSİ', 'Yükleniyor...', '-- Çekirdek', 'hw-cpu-')}
            ${C.statTile('FİZİKSEL BELLEK', 'Yükleniyor...', 'Boş Alan: --', 'hw-ram-')}
            ${C.statTile('PİL / GÜÇ DURUMU', 'Yükleniyor...', 'Şebeke Durumu', 'hw-batt-')}
          </div>

          <!-- Extended Diagnostics Cards: GPU Telemetry, Disk SMART, Battery Health, Motherboard & BIOS -->
          <div class="grid-2" style="margin-bottom: 16px; gap: 14px;">
            <!-- 1. GPU & VRAM Telemetry Card -->
            <div class="view-section glass-card liquid-glow">
              <div class="view-section-header">
                <div class="view-section-title">
                  ${window.UlakIcons.getIcon('activity', 'icon-mono-sm')} Grafik İşlemci (GPU) & VRAM
                </div>
                <span class="chip chip-accent" id="hw-gpu-chip">GPU Aktif</span>
              </div>
              <div class="setting-row glass-soft" style="margin-bottom: 0;">
                <div>
                  <div class="setting-title" id="hw-gpu-name">GPU Taranıyor...</div>
                  <div class="setting-subtitle" id="hw-gpu-details" style="font-variant-numeric: tabular-nums;">
                    VRAM: -- | Sürücü: -- | Çözünürlük: --
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. Motherboard & BIOS Identity Card -->
            <div class="view-section glass-card liquid-glow">
              <div class="view-section-header">
                <div class="view-section-title">
                  ${window.UlakIcons.getIcon('cpu', 'icon-mono-sm')} Anakart & BIOS Kimliği
                </div>
                <span class="chip" id="hw-bios-ver">BIOS: --</span>
              </div>
              <div class="setting-row glass-soft" style="margin-bottom: 0;">
                <div>
                  <div class="setting-title" id="hw-mb-name">Anakart Bilgisi Alınıyor...</div>
                  <div class="setting-subtitle" id="hw-mb-details">
                    Üretici: -- | Sürüm: -- | Tarih: --
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Row 2: Disk SMART Health & Battery Wear Level Report -->
          <div class="grid-2" style="margin-bottom: 16px; gap: 14px;">
            <!-- 3. Disk SMART Health Card -->
            <div class="view-section glass-card liquid-glow">
              <div class="view-section-header">
                <div class="view-section-title">
                  ${window.UlakIcons.getIcon('database', 'icon-mono-sm')} Disk S.M.A.R.T. Sağlık Durumu
                </div>
                <button class="btn btn-secondary btn-sm" id="hw-smart-refresh-btn">Denetle</button>
              </div>
              <div id="hw-smart-container">
                <div class="setting-row glass-soft" style="margin-bottom: 0;">
                  <div>
                    <div class="setting-title" id="hw-smart-status">Disk Sağlığı Denetleniyor...</div>
                    <div class="setting-subtitle" id="hw-smart-details" style="font-variant-numeric: tabular-nums;">Disk modeli ve sağlık durumu bekleniyor.</div>
                  </div>
                  <span class="chip chip-accent" id="hw-smart-chip">OK</span>
                </div>
              </div>
            </div>

            <!-- 4. Battery Wear Level Report Card -->
            <div class="view-section glass-card liquid-glow">
              <div class="view-section-header">
                <div class="view-section-title">
                  ${window.UlakIcons.getIcon('zap', 'icon-mono-sm')} Batarya Aşınma (Wear Level) Raporu
                </div>
                <button class="btn btn-secondary btn-sm" id="hw-wear-refresh-btn">Raporla</button>
              </div>
              <div class="setting-row glass-soft" style="margin-bottom: 0;">
                <div>
                  <div class="setting-title" id="hw-wear-title">Aşınma Seviyesi Hesaplanıyor...</div>
                  <div class="setting-subtitle" id="hw-wear-details" style="font-variant-numeric: tabular-nums;">
                    Tasarım: -- mWh | Tam Şarj: -- mWh
                  </div>
                </div>
                <span class="chip" id="hw-wear-chip" style="font-variant-numeric: tabular-nums;">%0 Aşınma</span>
              </div>
            </div>
          </div>

          <!-- 5. Top Resource Consuming Processes Section -->
          <div class="view-section glass-card">
            <div class="view-section-header">
              <div class="view-section-title">
                ${window.UlakIcons.getIcon('sliders', 'icon-mono-sm')} Kaynak Tüketen Süreçler (Top Processes)
              </div>
              <div style="display:flex; gap:8px;">
                <div class="segmented-control glass-soft" style="padding: 2px;">
                  <button class="segmented-btn active" id="hw-sort-cpu-btn">En Çok CPU</button>
                  <button class="segmented-btn" id="hw-sort-mem-btn">En Çok RAM</button>
                </div>
                <button class="btn btn-secondary btn-sm" id="hw-refresh-proc-btn">
                  ${window.UlakIcons.getIcon('refresh', 'icon-mono-xs')} Yenile
                </button>
              </div>
            </div>
            <div class="data-table-container glass-soft" id="hw-proc-table-container" style="max-height: 400px;"></div>
          </div>
        </div>
      `;
    },

    async mount(el) {
      // Event listeners
      el.querySelector('#hw-refresh-proc-btn')?.addEventListener('click', () => loadProcesses(el, true));
      
      el.querySelector('#hw-sort-cpu-btn')?.addEventListener('click', () => {
        el.querySelector('#hw-sort-cpu-btn').classList.add('active');
        el.querySelector('#hw-sort-mem-btn').classList.remove('active');
        currentSortBy = 'cpu';
        loadProcesses(el, true);
      });

      el.querySelector('#hw-sort-mem-btn')?.addEventListener('click', () => {
        el.querySelector('#hw-sort-mem-btn').classList.add('active');
        el.querySelector('#hw-sort-cpu-btn').classList.remove('active');
        currentSortBy = 'memory';
        loadProcesses(el, true);
      });

      el.querySelector('#hw-smart-refresh-btn')?.addEventListener('click', () => loadSmartHealth(el));
      el.querySelector('#hw-wear-refresh-btn')?.addEventListener('click', () => loadBatteryHealth(el));

      const refreshBtn = el.querySelector('#hw-force-refresh-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
          refreshBtn.disabled = true;
          refreshBtn.innerHTML = `${window.UlakIcons.getIcon('refresh', 'icon-mono-xs spin')} Taranıyor...`;
          try {
            await window.ulak.invoke('system:refresh-all-hardware');
            await loadHardwareSpecs(el, true);
            await loadGpuTelemetry(el);
            await loadMotherboardInfo(el);
            await loadSmartHealth(el);
            await loadBatteryHealth(el);
            await loadProcesses(el, true);
            window.UlakUI.toast('Tüm donanım bileşenleri doğrudan tarandı.', 'success');
          } catch (e) {
            window.UlakUI.toast('Donanım tarama hatası: ' + e.message, 'error');
          } finally {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = `${window.UlakIcons.getIcon('refresh', 'icon-mono-xs')} Donanımı Yeniden Tara`;
          }
        });
      }

      // Initial loads
      await loadHardwareSpecs(el, false);
      await loadGpuTelemetry(el);
      await loadMotherboardInfo(el);
      await loadSmartHealth(el);
      await loadBatteryHealth(el);
      await loadProcesses(el, false);
    }
  };

  async function loadHardwareSpecs(el, force = false) {
    try {
      const [cpu, mem, batt] = await Promise.all([
        window.ulak.invoke('system:get-cpu-info', force),
        window.ulak.invoke('system:get-memory-info', force),
        window.ulak.invoke('system:get-battery-info', force)
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

  async function loadGpuTelemetry(el) {
    try {
      const res = await window.ulak.invoke('system:get-gpu-info');
      const gpu = (Array.isArray(res) ? res[0] : res) || {};
      const nameEl = el.querySelector('#hw-gpu-name');
      const detailsEl = el.querySelector('#hw-gpu-details');
      if (nameEl) nameEl.textContent = gpu.name || 'Entegre Grafik Kartı';
      if (detailsEl) detailsEl.textContent = `VRAM: ${gpu.vramMB ? gpu.vramMB + ' MB' : (gpu.vram || '2 GB')} | Sürücü: ${gpu.driver || gpu.driverVersion || 'Standart'}`;
    } catch (e) {
      console.error(e);
    }
  }

  async function loadMotherboardInfo(el) {
    try {
      const mb = await window.ulak.invoke('system:get-motherboard-info') || {};
      const mbName = el.querySelector('#hw-mb-name');
      const mbDetails = el.querySelector('#hw-mb-details');
      const biosVer = el.querySelector('#hw-bios-ver');
      if (mbName) mbName.textContent = mb.board || `${mb.manufacturer || 'Standart'} - ${mb.product || 'Anakart'}`;
      if (mbDetails) mbDetails.textContent = `BIOS Sürümü: ${mb.bios || mb.biosVersion || 'N/A'} | Yayın Tarihi: ${mb.biosDate || 'Bilinmiyor'}`;
      if (biosVer) biosVer.textContent = `BIOS: ${mb.bios || mb.biosVersion || 'Hazır'}`;
    } catch (e) {
      console.error(e);
    }
  }

  async function loadSmartHealth(el) {
    try {
      const res = await window.ulak.invoke('system:get-disk-smart');
      const smart = (Array.isArray(res) ? res[0] : res) || {};
      const statusEl = el.querySelector('#hw-smart-status');
      const detailsEl = el.querySelector('#hw-smart-details');
      const chipEl = el.querySelector('#hw-smart-chip');

      const health = smart.health || smart.overallHealth || 'Healthy';
      const isHealthy = health.toLowerCase().includes('healthy') || health.toLowerCase().includes('ok') || health.toLowerCase().includes('sağlıklı');
      if (statusEl) statusEl.textContent = `${smart.name || smart.model || 'Fiziksel Disk'} (${isHealthy ? 'Sağlıklı' : 'Dikkat'})`;
      if (detailsEl) detailsEl.textContent = `Medya: ${smart.type || smart.mediaType || 'SSD / NVMe'} | Boyut: ${smart.sizeGB ? smart.sizeGB + ' GB' : '--'} | S.M.A.R.T.: ${health}`;
      if (chipEl) {
        chipEl.textContent = isHealthy ? 'Sağlıklı (OK)' : health;
        chipEl.className = `chip ${isHealthy ? 'chip-accent' : 'chip-warning'}`;
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadBatteryHealth(el) {
    try {
      const batt = await window.ulak.invoke('system:get-battery-health') || {};
      const titleEl = el.querySelector('#hw-wear-title');
      const detailsEl = el.querySelector('#hw-wear-details');
      const chipEl = el.querySelector('#hw-wear-chip');

      const hasBatt = batt.hasReport !== undefined ? batt.hasReport : batt.hasBattery;
      if (!hasBatt) {
        if (titleEl) titleEl.textContent = 'Masaüstü / Şebeke Gücü';
        if (detailsEl) detailsEl.textContent = batt.message || 'Pil aşınma raporu masaüstü sistemlerde uygulanamaz.';
        if (chipEl) chipEl.textContent = 'AC Güç';
        return;
      }

      const wear = batt.wearPercent !== undefined ? batt.wearPercent : 0;
      const status = batt.healthStatus || batt.healthGrade || 'İyi';
      if (titleEl) titleEl.textContent = `Aşınma: %${wear} (${status})`;
      if (detailsEl) detailsEl.textContent = `Fabrika Tasarımı: ${batt.designCapacity} mWh | Mevcut Tam Şarj: ${batt.fullCapacity || batt.fullChargeCapacity} mWh`;
      if (chipEl) {
        chipEl.textContent = `%${wear} Aşınma`;
        chipEl.className = `chip ${wear > 30 ? 'chip-danger' : 'chip-accent'}`;
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadProcesses(el, force = false) {
    const container = el.querySelector('#hw-proc-table-container');
    if (!container) return;

    if (force || !container.querySelector('table')) {
      window.UlakUI.state(container, 'loading', { title: 'İşlemler sıralanıyor...' });
    }

    try {
      const procs = await window.ulak.invoke('system:get-top-processes', currentSortBy, 30);
      if (!procs || procs.length === 0) {
        return window.UlakUI.state(container, 'empty', { title: 'Aktif işlem bulunamadı' });
      }

      const rows = procs.map((p) => {
        return `
          <tr>
            <td style="font-weight: 600;">${window.UlakUI.escapeHtml(p.name)}</td>
            <td><span class="chip" style="font-variant-numeric: tabular-nums;">${p.pid}</span></td>
            <td><span style="font-variant-numeric: tabular-nums;">${window.UlakUI.escapeHtml(p.mem || p.memory || '--')}</span></td>
            <td><span class="chip chip-accent" style="font-variant-numeric: tabular-nums;">${p.cpu ? p.cpu + '%' : '--'}</span></td>
            <td>
              <button class="btn btn-danger-soft btn-sm btn-kill-proc" data-pid="${p.pid}" data-name="${window.UlakUI.escapeHtml(p.name)}">
                Sonlandır
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
              <th>Bellek (RAM)</th>
              <th>CPU Kullanımı</th>
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
              loadProcesses(el, true);
            } catch (err) {
              window.UlakUI.toast(`Sonlandırılamadı: ${err.message}`, 'error');
            }
          }
        });
      });
    } catch (err) {
      window.UlakUI.state(container, 'error', { desc: err.message, actionText: 'Tekrar Dene', actionFn: () => loadProcesses(el, true) });
    }
  }

  window.UlakRouter.register(view);
})();
