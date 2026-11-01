// VIEW 07: SİSTEM YÖNETİMİ (ADMIN)
(function() {
  const view = {
    id: 'admin',
    title: 'Sistem Yönetimi',
    icon: 'sliders',

    render() {
      const C = window.UlakComponents;
      return `
        <div class="admin-view">
          ${C.headerCard('Sistem Yönetimi', 'PowerShell Komut Konsolu, Winget Güncelleme ve Başlangıç Servisleri', 'sliders')}

          <!-- Actions Grid -->
          <div class="grid-2" style="margin-bottom: 20px;">
            <div class="view-section glass-card liquid-glow">
              <div class="view-section-header">
                <div class="view-section-title">PowerShell Komut Çalıştırıcı</div>
              </div>
              <div class="field-group">
                <input type="text" id="admin-ps-input" class="field-input" placeholder="Get-Service, winget list, ipconfig vb..." style="flex: 1;">
                <button class="btn btn-primary" id="admin-ps-run-btn">
                  ${window.UlakIcons.getIcon('play', 'icon-mono-sm')} Çalıştır
                </button>
              </div>
            </div>

            <div class="view-section glass-card liquid-glow">
              <div class="view-section-header">
                <div class="view-section-title">Hızlı Sistem Yönetimi</div>
              </div>
              <div class="action-bar glass-soft" style="gap: 8px; flex-wrap: wrap;">
                <button class="btn btn-secondary" id="admin-winget-check-btn" style="flex: 1; min-width: 140px;">
                  ${window.UlakIcons.getIcon('refresh', 'icon-mono-sm')} Güncellemeleri Tara
                </button>
                <button class="btn btn-primary" id="admin-winget-update-btn" style="flex: 1; min-width: 140px;">
                  ${window.UlakIcons.getIcon('download', 'icon-mono-sm')} Tümünü Güncelle
                </button>
                <button class="btn btn-secondary" id="admin-autostart-btn" style="flex: 1; min-width: 140px;">
                  ${window.UlakIcons.getIcon('sliders', 'icon-mono-sm')} Başlangıç Servisleri
                </button>
                <button class="btn btn-secondary" id="admin-users-btn" style="flex: 1; min-width: 140px;">
                  ${window.UlakIcons.getIcon('users', 'icon-mono-sm')} Sistem Kullanıcıları
                </button>
              </div>
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

      el.querySelector('#admin-winget-check-btn')?.addEventListener('click', async () => {
        termBody.textContent += '\n[+] Winget paket güncellemeleri kontrol ediliyor...\n';
        try {
          const res = await window.ulak.invoke('admin:pkg-check');
          printOutput(res);
        } catch (err) {
          termBody.textContent += `[-] Hata: ${err.message}\n`;
        }
      });

      el.querySelector('#admin-winget-update-btn')?.addEventListener('click', async () => {
        const ok = await window.UlakUI.confirm('Tümünü Güncelle', 'Winget ile tespit edilen tüm yazılımlar güncellenecektir. Devam edilsin mi?', 'Güncelle');
        if (ok) {
          termBody.textContent += '\n[+] winget upgrade --all çalıştırılıyor...\n';
          window.UlakUI.toast('Paket güncellemesi arka planda başlatıldı...', 'info');
          try {
            const res = await window.ulak.invoke('admin:pkg-update-all');
            printOutput(res);
            window.UlakUI.toast('Güncelleme tamamlandı!', 'success');
          } catch (err) {
            termBody.textContent += `[-] Hata: ${err.message}\n`;
          }
        }
      });

      el.querySelector('#admin-autostart-btn')?.addEventListener('click', async () => {
        termBody.textContent += '\n[+] Başlangıç servisleri sorgulanıyor...\n';
        try {
          const res = await window.ulak.invoke('admin:autostart');
          printOutput(res);
        } catch (err) {
          termBody.textContent += `[-] Hata: ${err.message}\n`;
        }
      });

      el.querySelector('#admin-users-btn')?.addEventListener('click', async () => {
        termBody.textContent += '\n[+] Sistem kullanıcıları listeleniyor...\n';
        try {
          const res = await window.ulak.invoke('admin:users');
          printOutput(res);
        } catch (err) {
          termBody.textContent += `[-] Hata: ${err.message}\n`;
        }
      });

      el.querySelector('#admin-term-copy-btn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(termBody.innerText);
        window.UlakUI.toast('Konsol çıktısı kopyalandı.', 'info');
      });

      el.querySelector('#admin-term-clear-btn')?.addEventListener('click', () => {
        termBody.textContent = 'Hazır.';
      });
    }
  };

  window.UlakRouter.register(view);
})();
