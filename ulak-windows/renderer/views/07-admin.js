// VIEW 07: SİSTEM YÖNETİMİ & SERVİSLER (ADMIN)
(function() {
  const view = {
    id: 'admin',
    title: 'Sistem Yönetimi',
    icon: 'sliders',

    render() {
      const C = window.UlakComponents;
      return `
        <div class="admin-view">
          ${C.headerCard('Sistem Yönetimi & Servisler', 'Windows Servis Yöneticisi, Sistem Dosyası Onarımı (SFC), Güç Planı Optimizasyonu ve Winget', 'sliders')}

          <!-- Actions Grid -->
          <div class="grid-2" style="margin-bottom: 16px; gap: 14px;">
            <!-- Left: PowerShell Interactive Terminal Runner -->
            <div class="view-section glass-card liquid-glow">
              <div class="view-section-header">
                <div class="view-section-title">PowerShell Yönetici Konsolu</div>
              </div>
              <div class="field-group">
                <input type="text" id="admin-ps-input" class="field-input" placeholder="Get-Process, ipconfig /all, netstat vb..." style="flex: 1;">
                <button class="btn btn-primary" id="admin-ps-run-btn">
                  ${window.UlakIcons.getIcon('play', 'icon-mono-sm')} Çalıştır
                </button>
              </div>
            </div>

            <!-- Right: Quick Diagnostic & Power Tweaks -->
            <div class="view-section glass-card liquid-glow">
              <div class="view-section-header">
                <div class="view-section-title">Gelişmiş Sistem Araçları</div>
              </div>
              <div class="action-bar glass-soft" style="gap: 8px; flex-wrap: wrap;">
                <button class="btn btn-primary" id="admin-high-power-btn" style="flex: 1; min-width: 140px;" title="Nihai / Yüksek Performans Güç Planını Devreye Al">
                  ${window.UlakIcons.getIcon('zap', 'icon-mono-sm')} Yüksek Performans
                </button>
                <button class="btn btn-secondary" id="admin-sfc-btn" style="flex: 1; min-width: 140px;" title="Sistem Dosyası Doğrulayıcısını (SFC) Çalıştır">
                  ${window.UlakIcons.getIcon('shield', 'icon-mono-sm')} SFC Onarımı
                </button>
                <button class="btn btn-secondary" id="admin-users-detailed-btn" style="flex: 1; min-width: 140px;" title="Yerel Kullanıcılar ve Yönetici Rollerini İncele">
                  ${window.UlakIcons.getIcon('users', 'icon-mono-sm')} Kullanıcı Denetimi
                </button>
                <button class="btn btn-secondary" id="admin-winget-update-btn" style="flex: 1; min-width: 140px;" title="Tüm Uygulamaları Winget ile Güncelle">
                  ${window.UlakIcons.getIcon('download', 'icon-mono-sm')} Paketleri Güncelle
                </button>
              </div>
            </div>
          </div>

          <!-- Windows Services Management Section -->
          <div class="view-section glass-card" style="margin-bottom: 16px;">
            <div class="view-section-header">
              <div class="view-section-title">
                ${window.UlakIcons.getIcon('sliders', 'icon-mono-sm')} Windows Hizmetleri (Services Manager)
              </div>
              <div style="display:flex; gap:8px;">
                <input type="text" id="admin-services-search" class="field-input" placeholder="Servis adı ara..." style="width: 200px;">
                <button class="btn btn-secondary btn-sm" id="admin-refresh-services-btn">
                  ${window.UlakIcons.getIcon('refresh', 'icon-mono-xs')} Yenile
                </button>
              </div>
            </div>
            <div class="data-table-container glass-soft" id="admin-services-container" style="max-height: 320px;">
              <!-- Services rendered here -->
            </div>
          </div>

          <!-- Console Terminal Section -->
          <div class="view-section glass-card" style="padding: 0;">
            ${C.consoleCard('PowerShell Yönetici Konsol Çıktısı', 'Hazır.', 'admin-term-')}
          </div>
        </div>
      `;
    },

    mount(el) {
      const termBody = el.querySelector('#admin-term-body');
      const psInput = el.querySelector('#admin-ps-input');

      const printOutput = (out) => {
        const text = typeof out === 'string' ? out : (out?.output || out?.message || JSON.stringify(out, null, 2));
        termBody.textContent += text + '\n';
        termBody.scrollTop = termBody.scrollHeight;
      };

      const runPs = async () => {
        const cmd = psInput.value.trim();
        if (!cmd) return;
        termBody.textContent += `\nPS> ${cmd}\n`;
        psInput.value = '';

        try {
          const res = await window.ulak.invoke('admin:exec-cmd', cmd);
          printOutput(res);
        } catch (err) {
          termBody.textContent += `[-] Hata: ${err.message}\n`;
        }
      };

      el.querySelector('#admin-ps-run-btn')?.addEventListener('click', runPs);
      psInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') runPs();
      });

      // 1. High Performance Power Plan
      el.querySelector('#admin-high-power-btn')?.addEventListener('click', async () => {
        try {
          window.UlakUI.toast('Yüksek performans güç planı aktif ediliyor...', 'info');
          const res = await window.ulak.invoke('admin:set-power-plan', 'high');
          printOutput(`[+] Güç Planı Güncellendi: ${res.planName || 'Yüksek Performans'}`);
          window.UlakUI.toast('Yüksek Performans güç planı devrede!', 'success');
        } catch (e) {
          window.UlakUI.toast(`Hata: ${e.message}`, 'error');
        }
      });

      // 2. System File Check (SFC)
      el.querySelector('#admin-sfc-btn')?.addEventListener('click', async () => {
        const ok = await window.UlakUI.confirm('Sistem Dosyalarını Onar', 'sfc /scannow arka planda çalıştırılacaktır. Bu işlem birkaç dakika sürebilir. Başlatılsın mı?', 'Başlat');
        if (ok) {
          termBody.textContent += '\n[+] sfc /scannow başlatıldı...\n';
          window.UlakUI.toast('Sistem dosyası denetimi arka planda başlatıldı.', 'info');
          try {
            const res = await window.ulak.invoke('admin:run-sfc');
            printOutput(res);
            window.UlakUI.toast('SFC denetimi tamamlandı.', 'success');
          } catch (e) {
            printOutput(`[-] Hata: ${e.message}`);
          }
        }
      });

      // 3. User Accounts Detailed Audit
      el.querySelector('#admin-users-detailed-btn')?.addEventListener('click', async () => {
        termBody.textContent += '\n[+] Sistem kullanıcıları ve yetki düzeyleri sorgulanıyor...\n';
        try {
          const res = await window.ulak.invoke('admin:get-users-detailed');
          const users = Array.isArray(res) ? res : (res.users || []);
          let out = `Yerel Kullanıcı Hesapları (${users.length}):\n\n`;
          users.forEach(u => {
            out += `Kullanıcı: ${u.name.padEnd(20)} Yönetici: ${u.isAdmin ? '[EVET]' : '[HAYIR]'} Aktif: ${u.enabled ? 'Açık' : 'Devre Dışı'}\n`;
            if (u.description || u.desc) out += `  Açıklama: ${u.description || u.desc}\n`;
          });
          printOutput(out);
          window.UlakUI.toast('Kullanıcı denetimi tamamlandı.', 'info');
        } catch (e) {
          printOutput(`[-] Hata: ${e.message}`);
        }
      });

      // 4. Winget Update All
      el.querySelector('#admin-winget-update-btn')?.addEventListener('click', async () => {
        const ok = await window.UlakUI.confirm('Tüm Paketleri Güncelle', 'Winget ile tespit edilen tüm güncellemeler yüklenecektir. Devam edilsin mi?', 'Güncelle');
        if (ok) {
          termBody.textContent += '\n[+] winget upgrade --all çalıştırılıyor...\n';
          window.UlakUI.toast('Güncelleme arka planda başlatıldı...', 'info');
          try {
            const res = await window.ulak.invoke('admin:pkg-update-all');
            printOutput(res);
            window.UlakUI.toast('Güncellemeler tamamlandı!', 'success');
          } catch (err) {
            termBody.textContent += `[-] Hata: ${err.message}\n`;
          }
        }
      });

      // 5. Windows Services Management
      el.querySelector('#admin-refresh-services-btn')?.addEventListener('click', () => loadServices(el));
      el.querySelector('#admin-services-search')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        el.querySelectorAll('#admin-services-container tbody tr').forEach(row => {
          const txt = row.textContent.toLowerCase();
          row.style.display = txt.includes(q) ? '' : 'none';
        });
      });

      el.querySelector('#admin-term-copy-btn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(termBody.innerText);
        window.UlakUI.toast('Konsol çıktısı kopyalandı.', 'info');
      });

      el.querySelector('#admin-term-clear-btn')?.addEventListener('click', () => {
        termBody.textContent = 'Hazır.';
      });

      // Initial load
      loadServices(el);
    }
  };

  async function loadServices(el) {
    const container = el.querySelector('#admin-services-container');
    if (!container) return;
    window.UlakUI.state(container, 'loading', { title: 'Windows servisleri listeleniyor...' });

    try {
      const res = await window.ulak.invoke('admin:get-services', 'all');
      const services = Array.isArray(res) ? res : (res.services || []);

      if (services.length === 0) {
        return window.UlakUI.state(container, 'empty', { title: 'Servis bulunamadı' });
      }

      const rows = services.slice(0, 150).map(s => {
        const isRunning = s.status === 'Running';
        return `
          <tr>
            <td style="font-weight: 600;">
              <div>${window.UlakUI.escapeHtml(s.displayName || s.name)}</div>
              <div style="font-size: 11px; color: var(--text-3);">${window.UlakUI.escapeHtml(s.name)}</div>
            </td>
            <td><span class="chip ${isRunning ? 'chip-accent' : ''}">${isRunning ? 'Çalışıyor' : 'Durduruldu'}</span></td>
            <td><span style="font-size: 12px; color: var(--text-2);">${s.startType || 'Manuel'}</span></td>
            <td>
              <div style="display:flex; gap:6px;">
                ${isRunning 
                  ? `<button class="btn btn-danger-soft btn-sm btn-svc-action" data-name="${window.UlakUI.escapeHtml(s.name)}" data-act="stop">Durdur</button>`
                  : `<button class="btn btn-primary btn-sm btn-svc-action" data-name="${window.UlakUI.escapeHtml(s.name)}" data-act="start">Başlat</button>`}
                <button class="btn btn-secondary btn-sm btn-svc-action" data-name="${window.UlakUI.escapeHtml(s.name)}" data-act="restart">Yeniden Başlat</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Hizmet Adı</th>
              <th>Durum</th>
              <th>Başlangıç Türü</th>
              <th>Eylem</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;

      container.querySelectorAll('.btn-svc-action').forEach(b => {
        b.addEventListener('click', async () => {
          const name = b.getAttribute('data-name');
          const act = b.getAttribute('data-act');
          b.disabled = true;
          try {
            window.UlakUI.toast(`'${name}' servisi için '${act}' işlemi yürütülüyor...`, 'info');
            await window.ulak.invoke('admin:control-service', name, act);
            window.UlakUI.toast(`Servis işlemi başarıyla tamamlandı.`, 'success');
            loadServices(el);
          } catch (e) {
            window.UlakUI.toast(`Servis işlemi hatası: ${e.message}`, 'error');
            b.disabled = false;
          }
        });
      });
    } catch (err) {
      window.UlakUI.state(container, 'error', { desc: err.message, actionText: 'Tekrar Dene', actionFn: () => loadServices(el) });
    }
  }

  window.UlakRouter.register(view);
})();
