// VIEW 03: HACKER & AĞ TEŞHİS ARAÇLARI — ALTIN ORAN KARTLARI
(function() {
  const tools = [
    { id: 'open_ports', title: 'Açık Port Tarayıcı', desc: 'Yerel sistemde dinleyen servis ve portları tara', icon: 'search' },
    { id: 'interfaces', title: 'Ağ Arabirimleri', desc: 'Tüm ağ kartlarını ve IP konfigürasyonlarını listele', icon: 'network' },
    { id: 'routes', title: 'Yönlendirme Tablosu', desc: 'Windows ağ geçidi ve rota tablosunu dök', icon: 'routes' },
    { id: 'dns', title: 'DNS & Önbellek', desc: 'DNS sunucuları ve önbellek sorgularını incele', icon: 'globe' },
    { id: 'security_log', title: 'Güvenlik Olay Günlüğü', desc: 'Son güvenlik uyarılarını ve oturumları getir', icon: 'fileText' },
    { id: 'mac_changer', title: 'MAC Adresi Analizi', desc: 'Ağ adaptörlerinin donanım adreslerini listele', icon: 'key' },
    { id: 'arp_table', title: 'ARP Tablosu', desc: 'Yerel ağdaki aktif IP ve MAC eşleşmelerini dök', icon: 'table' },
    { id: 'ssl_check', title: 'SSL/TLS Sertifika', desc: 'Global servislerin SSL geçerlilik durumunu denetle', icon: 'lock' },
    { id: 'ping_test', title: 'Ping & Gecikme Testi', desc: 'Global DNS omurgalarına paket gecikmesini ölç', icon: 'activity' }
  ];

  const view = {
    id: 'hacker',
    title: 'Hacker Araçları',
    icon: 'zap',

    render() {
      const C = window.UlakComponents;

      const toolsGrid = tools.map((t) => {
        return `
          <div class="glass-card liquid-glow" style="padding: var(--space-13); display: flex; flex-direction: column; justify-content: space-between; min-height: 120px;">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div class="setting-row-icon" style="width: 28px; height: 28px;">
                    ${window.UlakIcons.getIcon(t.icon, 'icon-mono-xs')}
                  </div>
                  <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-1);">
                    ${window.UlakUI.escapeHtml(t.title)}
                  </div>
                </div>
                <span class="chip" style="font-size: 9px; padding: 2px 6px;">Hazır</span>
              </div>
              <div style="font-size: var(--text-2xs); color: var(--text-2); line-height: 1.4; padding-left: 36px; margin-bottom: var(--space-8);">
                ${window.UlakUI.escapeHtml(t.desc)}
              </div>
            </div>
            <div style="display: flex; justify-content: flex-end;">
              <button class="btn btn-primary btn-sm btn-run-tool" data-tool="${t.id}">
                ${window.UlakIcons.getIcon('play', 'icon-mono-xs')} Çalıştır
              </button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="hacker-view">
          ${C.headerCard('Hacker & Ağ Teşhis Araçları', '9 Güvenlik ve Ağ Teşhis Aracıyla Gerçek Zamanlı Analiz', 'zap')}

          <!-- 3x3 Tools Grid in Golden Harmony -->
          <div class="grid-3" style="margin-bottom: var(--space-13);">
            ${toolsGrid}
          </div>

          <!-- Encased Terminal Console -->
          <div class="view-section glass-card" style="padding: 0;">
            ${C.consoleCard('Araç Komut Çıktısı & Log Konsolu', 'Bir teşhis aracı seçip "Çalıştır" butonuna basın.', 'hacker-term-')}
          </div>
        </div>
      `;
    },

    mount(el) {
      const termBody = el.querySelector('#hacker-term-body');

      el.querySelectorAll('.btn-run-tool').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const toolId = btn.getAttribute('data-tool');
          const tool = tools.find(t => t.id === toolId);
          termBody.textContent = `[+] '${tool.title}' yürütülüyor, lütfen bekleyin...\n`;
          btn.disabled = true;

          try {
            const res = await window.ulak.invoke('hacker:run-tool', toolId);
            termBody.textContent = res.output || '[Bilgi] Komut tamamlandı, çıktı boş.';
            window.UlakUI.toast(`${tool.title} tamamlandı.`, 'info');
          } catch (err) {
            termBody.textContent = `[-] Hata oluştu: ${err.message}`;
            window.UlakUI.toast(`Hata: ${err.message}`, 'error');
          } finally {
            btn.disabled = false;
          }
        });
      });

      el.querySelector('#hacker-term-copy-btn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(termBody.innerText);
        window.UlakUI.toast('Terminal çıktısı panoya kopyalandı.', 'info');
      });

      el.querySelector('#hacker-term-clear-btn')?.addEventListener('click', () => {
        termBody.textContent = 'Hazır.';
      });
    }
  };

  window.UlakRouter.register(view);
})();
