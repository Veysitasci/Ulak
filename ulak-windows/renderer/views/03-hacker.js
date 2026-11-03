// VIEW 03: HACKER & AĞ TEŞHİS ARAÇLARI — ALTIN ORAN KARTLARI
(function() {
  const tools = [
    { id: 'open_ports', title: 'Yerel Port Tarayıcı', desc: 'Sistemde dinleyen servis ve portları tara', icon: 'search' },
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
          ${C.headerCard('Hacker & Ağ Teşhis Araçları', 'Gelişmiş Port Tarayıcı, Alt Ağ Keşfi, DNS Sızıntı Testi ve Olay Günlüğü Tehdit Avcısı', 'zap', 'hacker')}

          <!-- 5 NEW CRITICAL DIAGNOSTIC SUITES -->
          <div class="view-section glass-card liquid-glow" style="margin-bottom: var(--space-13);">
            <div class="view-section-header">
              <div class="view-section-title">
                ${window.UlakIcons.getIcon('shield', 'icon-mono-sm')} Gelişmiş Güvenlik Teşhis & Tehdit İstihbarat Merkezi
              </div>
              <span class="chip chip-accent">v2.5 Aktif</span>
            </div>
            <div class="grid-2" style="gap: 12px; margin-bottom: 12px;">
              <!-- 1. Target Port Scanner -->
              <div class="setting-row glass-soft" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                <div style="display:flex; justify-content: space-between; width: 100%; align-items: center;">
                  <span class="setting-title" style="display:flex; align-items:center; gap:6px;">
                    ${window.UlakIcons.getIcon('search', 'icon-mono-xs')} Hedef Port Tarayıcı (SYN/Connect)
                  </span>
                  <button class="btn btn-primary btn-sm" id="hk-btn-scan-ports">Portları Tara</button>
                </div>
                <div style="display:flex; gap:8px; width: 100%;">
                  <input type="text" id="hk-port-host" class="field-input" placeholder="Hedef Host (örn: 127.0.0.1 veya google.com)" value="127.0.0.1" style="flex:1;">
                  <input type="text" id="hk-port-list" class="field-input" placeholder="Portlar (örn: 80,443,8080)" value="21,22,80,443,3389,8080" style="width: 160px;">
                </div>
              </div>

              <!-- 2. Subnet Discovery -->
              <div class="setting-row glass-soft" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                <div style="display:flex; justify-content: space-between; width: 100%; align-items: center;">
                  <span class="setting-title" style="display:flex; align-items:center; gap:6px;">
                    ${window.UlakIcons.getIcon('network', 'icon-mono-xs')} Yerel Alt Ağ & ARP Radar
                  </span>
                  <button class="btn btn-secondary btn-sm" id="hk-btn-discover-subnet">Ağı Tara</button>
                </div>
                <div style="display:flex; gap:8px; width: 100%;">
                  <input type="text" id="hk-subnet-base" class="field-input" placeholder="Alt Ağ Tabanı (boş bırakılırsa otomatik algılanır)" style="flex:1;">
                </div>
              </div>
            </div>

            <!-- Row 2: DNS Leak, TLS Inspector, Threat Hunter -->
            <div class="grid-3" style="gap: 12px;">
              <div class="setting-row glass-soft" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                <span class="setting-title" style="display:flex; align-items:center; gap:6px;">
                  ${window.UlakIcons.getIcon('globe', 'icon-mono-xs')} DNS Sızıntı & Zehirlenme
                </span>
                <span class="setting-subtitle">DNS sunucularını ve sızıntı/hijack durumunu test et</span>
                <button class="btn btn-secondary btn-sm" id="hk-btn-dns-leak" style="width:100%;">Testi Başlat</button>
              </div>

              <div class="setting-row glass-soft" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                <span class="setting-title" style="display:flex; align-items:center; gap:6px;">
                  ${window.UlakIcons.getIcon('lock', 'icon-mono-xs')} SSL/TLS Şifreleme Denetimi
                </span>
                <input type="text" id="hk-tls-domain" class="field-input" placeholder="Domain (örn: google.com)" value="google.com" style="width: 100%;">
                <button class="btn btn-secondary btn-sm" id="hk-btn-inspect-tls" style="width:100%;">Sertifikayı İncele</button>
              </div>

              <div class="setting-row glass-soft" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                <span class="setting-title" style="display:flex; align-items:center; gap:6px;">
                  ${window.UlakIcons.getIcon('fileText', 'icon-mono-xs')} Tehdit Avcısı (EventLog 4625)
                </span>
                <span class="setting-subtitle">Kaba kuvvet parola denemeleri ve yetki yükseltmeleri</span>
                <button class="btn btn-danger-soft btn-sm" id="hk-btn-threat-hunter" style="width:100%;">Olayları Avla</button>
              </div>
            </div>
          </div>

          <!-- 3x3 Classic Tools Grid in Golden Harmony -->
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

      const appendLog = (title, output) => {
        termBody.textContent = `=== [ ${title.toUpperCase()} ] ===\n${output}\n\n`;
        termBody.scrollTop = 0;
      };

      // 1. Target Port Scanner
      el.querySelector('#hk-btn-scan-ports')?.addEventListener('click', async () => {
        const host = el.querySelector('#hk-port-host').value.trim() || '127.0.0.1';
        const portStr = el.querySelector('#hk-port-list').value.trim();
        const ports = portStr ? portStr.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p)) : [80, 443];

        termBody.textContent = `[+] '${host}' üzerinde ${ports.join(', ')} portları taranıyor...\n`;
        try {
          const res = await window.ulak.invoke('hacker:scan-ports', host, ports);
          let out = `Hedef: ${res.host}\n`;
          out += `Taranan Port Sayısı: ${res.scanned}\n`;
          out += `Açık Portlar (${res.openPorts.length}):\n`;
          res.openPorts.forEach(p => {
            out += `  [+] Port ${p.port} (${p.service || 'Bilinmiyor'}) -> AÇIK\n`;
          });
          if (res.openPorts.length === 0) {
            out += `  [-] Belirtilen portlar arasında açık port bulunamadı.\n`;
          }
          appendLog('Hedef Port Taraması', out);
          window.UlakUI.toast('Port taraması tamamlandı.', 'success');
        } catch (e) {
          termBody.textContent = `[-] Hata: ${e.message}`;
          window.UlakUI.toast(`Port tarama hatası: ${e.message}`, 'error');
        }
      });

      // 2. Subnet Discovery
      el.querySelector('#hk-btn-discover-subnet')?.addEventListener('click', async () => {
        const baseIp = el.querySelector('#hk-subnet-base').value.trim();
        termBody.textContent = `[+] Alt ağ cihazları ve ARP tablosu taranıyor...\n`;
        try {
          const res = await window.ulak.invoke('hacker:discover-subnet', baseIp || null);
          let out = `Alt Ağ Taraması Tamamlandı.\nBulunan Cihaz Sayısı: ${res.devices?.length || 0}\n\n`;
          (res.devices || []).forEach((d, idx) => {
            out += `[#${idx + 1}] IP: ${d.ip.padEnd(16)} MAC: ${d.mac.padEnd(20)} Tip: ${d.type || 'Dynamic'}\n`;
          });
          appendLog('Yerel Alt Ağ & ARP Radar', out);
          window.UlakUI.toast('Alt ağ keşfi tamamlandı.', 'success');
        } catch (e) {
          termBody.textContent = `[-] Hata: ${e.message}`;
          window.UlakUI.toast(`Alt ağ keşif hatası: ${e.message}`, 'error');
        }
      });

      // 3. DNS Leak Test
      el.querySelector('#hk-btn-dns-leak')?.addEventListener('click', async () => {
        termBody.textContent = `[+] DNS sunucuları ve sızıntı/zehirlenme test ediliyor...\n`;
        try {
          const res = await window.ulak.invoke('hacker:test-dns-leak');
          let out = `DNS Test Sonuçları:\n`;
          out += `Tespit Edilen DNS Sunucuları: ${(res.detectedDnsServers || []).join(', ') || 'Belirlenemedi'}\n`;
          out += `Güvenli / Güvenilmez Durumu: ${res.leakSuspected ? 'ŞÜPHELİ / SIZINTI OLABİLİR' : 'GÜVENLİ (Tutarlı Yanıtlar)'}\n\n`;
          out += `Sorgu Yanıtları:\n`;
          (res.results || []).forEach(r => {
            out += `  - Sunucu: ${r.server} -> ${r.success ? r.ip : 'Hata: ' + r.error}\n`;
          });
          appendLog('DNS Sızıntı & Hijack Testi', out);
          window.UlakUI.toast('DNS analizi tamamlandı.', res.leakSuspected ? 'warning' : 'success');
        } catch (e) {
          termBody.textContent = `[-] Hata: ${e.message}`;
          window.UlakUI.toast(`DNS testi hatası: ${e.message}`, 'error');
        }
      });

      // 4. TLS Inspector
      el.querySelector('#hk-btn-inspect-tls')?.addEventListener('click', async () => {
        const domain = el.querySelector('#hk-tls-domain').value.trim() || 'google.com';
        termBody.textContent = `[+] '${domain}' için SSL/TLS sertifikası ve şifreleme paketleri inceleniyor...\n`;
        try {
          const res = await window.ulak.invoke('hacker:inspect-tls', domain, 443);
          let out = `Domain: ${res.host}:${res.port}\n`;
          out += `Yetkili Makam (Issuer): ${res.issuer}\n`;
          out += `Özne (Subject): ${res.subject}\n`;
          out += `Geçerlilik Başlangıcı: ${res.validFrom}\n`;
          out += `Geçerlilik Bitişi: ${res.validTo}\n`;
          out += `Kalan Gün: ${res.daysRemaining}\n`;
          out += `Protokol & Şifre: ${res.protocol} | ${res.cipher?.name || 'N/A'}\n`;
          appendLog('SSL/TLS Sertifika & Şifreleme İncelemesi', out);
          window.UlakUI.toast('TLS sertifikası başarıyla doğrulandı.', 'info');
        } catch (e) {
          termBody.textContent = `[-] Hata: ${e.message}`;
          window.UlakUI.toast(`TLS denetim hatası: ${e.message}`, 'error');
        }
      });

      // 5. Threat Hunter (EventLog 4625)
      el.querySelector('#hk-btn-threat-hunter')?.addEventListener('click', async () => {
        termBody.textContent = `[+] Windows Güvenlik Olay Günlüğü taranıyor (Event ID 4625 / 4672)...\n`;
        try {
          const res = await window.ulak.invoke('hacker:hunt-security-events', 15);
          let out = `Tehdit Avcısı Bulguları:\n`;
          out += `Başarısız Oturum Denemesi (4625): ${res.failedLogons?.length || 0}\n\n`;
          (res.failedLogons || []).forEach((ev, i) => {
            out += `[#${i + 1}] Zaman: ${ev.TimeCreated || '--'} | Hesap: ${ev.TargetUserName || '--'} | IP: ${ev.IpAddress || 'Yerel'}\n`;
            if (ev.Message) out += `    Mesaj: ${ev.Message.slice(0, 100)}...\n`;
          });
          if (!res.failedLogons || res.failedLogons.length === 0) {
            out += `  [✓] Yakın zamanda şüpheli oturum açma veya kaba kuvvet denemesi bulunamadı.\n`;
          }
          appendLog('Güvenlik Olay Günlüğü Tehdit Avı', out);
          window.UlakUI.toast('Tehdit avı tamamlandı.', 'info');
        } catch (e) {
          termBody.textContent = `[-] Hata: ${e.message}`;
          window.UlakUI.toast(`Tehdit avı hatası: ${e.message}`, 'error');
        }
      });

      // Classic tools runner
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
