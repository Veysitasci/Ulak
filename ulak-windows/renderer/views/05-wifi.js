// VIEW 05: WI-FI & KABLOSUZ AĞLAR — ALTIN ORAN LIQUID GLASS
(function() {
  const view = {
    id: 'wifi',
    title: 'Wi-Fi',
    icon: 'wifi',

    render() {
      const C = window.UlakComponents;
      const I = window.UlakIcons;
      return `
        <div class="wifi-view">
          ${C.headerCard('Wi-Fi, Proxy & Ağ Kalkanı', 'Kablosuz Ağlar, Sistem Proxy Yönetimi, Güvenli DNS Değiştirici ve Spektrum Analizi', 'wifi')}

          <!-- Bento Golden Split: Active Conn (1.618fr) & Hotspot (1fr) -->
          <div class="grid-golden" style="margin-bottom: var(--space-13);">
            <!-- Active Connection & Roaming Telemetry -->
            <div class="view-section glass-card liquid-glow" style="display: flex; flex-direction: column; justify-content: space-between;">
              <div class="view-section-header">
                <div class="view-section-title">
                  ${I.getIcon('wifi')} Aktif Kablosuz Bağlantı & Dolaşım
                </div>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-secondary btn-sm" id="wifi-roaming-btn" title="Detaylı BSSID ve Dolaşım Telemetrisini Göster">
                    ${I.getIcon('activity', 'icon-mono-xs')} Telemetri
                  </button>
                  <button class="btn btn-danger-soft btn-sm" id="wifi-disconnect-btn">Bağlantıyı Kes</button>
                </div>
              </div>
              <div class="setting-row glass-soft" style="margin-bottom: 0;">
                <div class="setting-row-left">
                  <div class="setting-row-icon">${I.getIcon('wifi')}</div>
                  <div>
                    <div class="setting-title" id="wifi-active-ssid">Bağlantı Taranıyor...</div>
                    <div class="setting-subtitle" id="wifi-active-details" style="font-variant-numeric: tabular-nums;">
                      Sinyal: -- | BSSID: -- | Hız: --
                    </div>
                  </div>
                </div>
                <span class="chip chip-accent" id="wifi-active-chip">Bağlı</span>
              </div>
            </div>

            <!-- Hotspot Card -->
            <div class="view-section glass-card liquid-glow">
              <div class="view-section-header">
                <div class="view-section-title">
                  ${I.getIcon('zap')} Mobil Erişim Noktası
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
                  ${I.getIcon('zap', 'icon-mono-xs')} Hotspot Başlat
                </button>
              </div>
            </div>
          </div>

          <!-- Feature Cards Row: Spectrum Analysis & Saved Passwords Vault & XML Export -->
          <div class="grid-3" style="margin-bottom: var(--space-13); gap: 12px;">
            <!-- 1. Spectrum Analysis Card -->
            <div class="glass-card liquid-glow" style="padding: 14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-1); display:flex; align-items:center; gap:6px;">
                  ${I.getIcon('activity', 'icon-mono-xs')} Spektrum Analizi
                </div>
                <button class="btn btn-secondary btn-sm" id="wifi-spectrum-btn">Analiz Et</button>
              </div>
              <div style="font-size: var(--text-2xs); color: var(--text-2); margin-bottom: 8px;" id="wifi-spectrum-summary">
                Kanal yoğunluğunu ölçerek en temiz Wi-Fi kanalını önerir.
              </div>
              <div id="wifi-spectrum-badge" class="chip chip-accent" style="display:none; font-variant-numeric: tabular-nums;">
                Öneri: Kanal 6
              </div>
            </div>

            <!-- 2. Saved Passwords Vault Card -->
            <div class="glass-card liquid-glow" style="padding: 14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-1); display:flex; align-items:center; gap:6px;">
                  ${I.getIcon('lock', 'icon-mono-xs')} Parola Kasası
                </div>
                <button class="btn btn-primary btn-sm" id="wifi-vault-btn">Kasayı Aç</button>
              </div>
              <div style="font-size: var(--text-2xs); color: var(--text-2);">
                Sistemde önceden kaydedilmiş tüm Wi-Fi ağlarının şifrelerini güvenle listeler.
              </div>
            </div>

            <!-- 3. Export XML Profiles Card -->
            <div class="glass-card liquid-glow" style="padding: 14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-1); display:flex; align-items:center; gap:6px;">
                  ${I.getIcon('download', 'icon-mono-xs')} Profil Yedekleme
                </div>
                <button class="btn btn-secondary btn-sm" id="wifi-export-btn">XML Dışa Aktar</button>
              </div>
              <div style="font-size: var(--text-2xs); color: var(--text-2);">
                Tüm Wi-Fi profillerini XML dosyaları halinde masaüstüne/belgelere yedekler.
              </div>
            </div>
          </div>

          <!-- PROXY & SECURE DNS GRID (Golden Split) -->
          <div class="grid-golden" style="margin-bottom: var(--space-13); gap: 14px;">
            <!-- 1. System Proxy Manager Card -->
            <div class="view-section glass-card liquid-glow" style="display: flex; flex-direction: column; justify-content: space-between; padding: 18px;">
              <div>
                <div class="view-section-header" style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                  <div class="view-section-title" style="display: flex; align-items: center; gap: 8px;">
                    ${I.getIcon('server')} Sistem Proxy Kalkanı
                  </div>
                  <span id="wifi-proxy-status-chip" class="chip">Kapalı</span>
                </div>
                
                <div style="font-size: 12px; color: var(--text-2); margin-bottom: 12px;">
                  Windows genel ağ trafiğini HTTP, HTTPS veya SOCKS5 proxy tüneline yönlendirin.
                </div>

                <div style="display: grid; grid-template-columns: 110px 1fr 90px; gap: 8px; margin-bottom: 10px;">
                  <div class="field" style="margin: 0;">
                    <label class="field-label" style="font-size: 11px;">Protokol</label>
                    <select id="wifi-proxy-proto" class="field-input" style="padding: 6px 8px; font-size: 12px;">
                      <option value="http">HTTP</option>
                      <option value="both">HTTP + HTTPS</option>
                      <option value="socks5">SOCKS5</option>
                    </select>
                  </div>
                  <div class="field" style="margin: 0;">
                    <label class="field-label" style="font-size: 11px;">Sunucu Adresi / IP</label>
                    <input type="text" id="wifi-proxy-host" class="field-input" placeholder="127.0.0.1" style="padding: 6px 10px; font-size: 12px; font-family: monospace;">
                  </div>
                  <div class="field" style="margin: 0;">
                    <label class="field-label" style="font-size: 11px;">Port</label>
                    <input type="number" id="wifi-proxy-port" class="field-input" placeholder="8080" style="padding: 6px 10px; font-size: 12px; font-family: monospace;">
                  </div>
                </div>

                <div class="field" style="margin-bottom: 12px;">
                  <label class="field-label" style="font-size: 11px;">Bypass (Yerel Adresleri Atla)</label>
                  <input type="text" id="wifi-proxy-bypass" class="field-input" value="<local>;127.0.0.1;localhost" style="padding: 6px 10px; font-size: 12px; font-family: monospace;">
                </div>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; border-top: 1px solid var(--glass-border); padding-top: 10px;">
                <button class="btn btn-secondary btn-sm" id="wifi-proxy-test-btn" title="Proxy sunucusuna TCP bağlantısını test et">
                  ${I.getIcon('activity', 'icon-mono-xs')} Bağlantıyı Sına
                </button>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-danger-soft btn-sm" id="wifi-proxy-disable-btn">Devre Dışı Bırak</button>
                  <button class="btn btn-primary btn-sm" id="wifi-proxy-save-btn">Kaydet & Uygula</button>
                </div>
              </div>
            </div>

            <!-- 2. Secure DNS Switcher & IP Telemetry Card -->
            <div class="view-section glass-card liquid-glow" style="display: flex; flex-direction: column; justify-content: space-between; padding: 18px;">
              <div>
                <div class="view-section-header" style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                  <div class="view-section-title" style="display: flex; align-items: center; gap: 8px;">
                    ${I.getIcon('shield')} Güvenli DNS & Ağ Kalkanı
                  </div>
                  <span id="wifi-dns-provider-chip" class="chip chip-accent" style="font-size: 11px;">Otomatik (DHCP)</span>
                </div>

                <div style="font-size: 12px; color: var(--text-2); margin-bottom: 10px;">
                  DNS sızıntılarını önleyin, reklam ve zararlı yazılımları ağ düzeyinde engelleyin.
                </div>

                <!-- Quick DNS Preset Buttons -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px;">
                  <button class="btn btn-secondary btn-sm btn-dns-preset" data-preset="cloudflare" style="justify-content: flex-start; text-align: left; padding: 6px 10px;">
                    <div>
                      <div style="font-weight: 600; font-size: 12px;">⚡ Cloudflare</div>
                      <div style="font-size: 10px; color: var(--text-3); font-family: monospace;">1.1.1.1 / 1.0.0.1</div>
                    </div>
                  </button>
                  <button class="btn btn-secondary btn-sm btn-dns-preset" data-preset="google" style="justify-content: flex-start; text-align: left; padding: 6px 10px;">
                    <div>
                      <div style="font-weight: 600; font-size: 12px;">🌐 Google DNS</div>
                      <div style="font-size: 10px; color: var(--text-3); font-family: monospace;">8.8.8.8 / 8.8.4.4</div>
                    </div>
                  </button>
                  <button class="btn btn-secondary btn-sm btn-dns-preset" data-preset="adguard" style="justify-content: flex-start; text-align: left; padding: 6px 10px;">
                    <div>
                      <div style="font-weight: 600; font-size: 12px;">🛡️ AdGuard DNS</div>
                      <div style="font-size: 10px; color: var(--text-3); font-family: monospace;">Reklam & Takip Blok</div>
                    </div>
                  </button>
                  <button class="btn btn-secondary btn-sm btn-dns-preset" data-preset="quad9" style="justify-content: flex-start; text-align: left; padding: 6px 10px;">
                    <div>
                      <div style="font-weight: 600; font-size: 12px;">🔒 Quad9</div>
                      <div style="font-size: 10px; color: var(--text-3); font-family: monospace;">Zararlı Yazılım Blok</div>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Bottom Actions: Flush DNS & DHCP Reset -->
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px solid var(--glass-border); padding-top: 10px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 11px; color: var(--text-2);">Dış IP:</span>
                  <code id="wifi-public-ip-badge" style="font-family: monospace; font-size: 11px; color: var(--text-1); font-variant-numeric: tabular-nums;">Sorgulanıyor...</code>
                  <button class="btn btn-sm" id="wifi-public-ip-refresh-btn" style="padding: 2px 6px;" title="Dış IP adresini yenile">
                    ${I.getIcon('refresh', 'icon-mono-xs')}
                  </button>
                </div>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-secondary btn-sm" id="wifi-flush-dns-btn" title="Windows DNS önbelleğini temizler">
                    Önbelleği Temizle
                  </button>
                  <button class="btn btn-secondary btn-sm btn-dns-preset" data-preset="dhcp" title="Modem varsayılan DNS adresine dön">
                    Sıfırla (DHCP)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Discovered Networks Section -->
          <div class="view-section glass-card">
            <div class="view-section-header">
              <div class="view-section-title">
                ${I.getIcon('globe')} Kapsama Alanındaki Ağlar
              </div>
              <button class="btn btn-secondary btn-sm" id="wifi-rescan-btn">
                ${I.getIcon('refresh', 'icon-mono-xs')} Ağları Yenile
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
      
      // Disconnect
      el.querySelector('#wifi-disconnect-btn')?.addEventListener('click', async () => {
        try {
          await window.ulak.invoke('wifi:disconnect');
          window.UlakUI.toast('Wi-Fi bağlantısı kesildi.', 'info');
          loadCurrent(el);
        } catch (e) {
          window.UlakUI.toast(`Hata: ${e.message}`, 'error');
        }
      });

      // Hotspot
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

      // 1. Spectrum Analysis
      el.querySelector('#wifi-spectrum-btn')?.addEventListener('click', async () => {
        const btn = el.querySelector('#wifi-spectrum-btn');
        btn.disabled = true;
        try {
          window.UlakUI.toast('Kanal spektrumu analiz ediliyor...', 'info');
          const spec = await window.ulak.invoke('wifi:get-channel-spectrum');
          const summary = el.querySelector('#wifi-spectrum-summary');
          const badge = el.querySelector('#wifi-spectrum-badge');
          
          const ch24 = spec.bestChannel || spec.recommended24GHz || 6;
          summary.textContent = spec.recommendation || `En temiz 2.4 GHz kanalı: Kanal ${ch24}`;
          badge.style.display = 'inline-block';
          badge.textContent = `Öneri: Kanal ${ch24}`;
          window.UlakUI.toast(`En az çakışan kanal: Kanal ${ch24}`, 'success');
        } catch (e) {
          window.UlakUI.toast(`Spektrum analizi hatası: ${e.message}`, 'error');
        } finally {
          btn.disabled = false;
        }
      });

      // 2. Saved Passwords Vault
      el.querySelector('#wifi-vault-btn')?.addEventListener('click', async () => {
        try {
          window.UlakUI.toast('Kayıtlı parolalar çözülüyor...', 'info');
          const profiles = await window.ulak.invoke('wifi:get-saved-passwords');
          
          if (!profiles || profiles.length === 0) {
            return window.UlakUI.modal('Wi-Fi Parola Kasası', '<p>Kayıtlı profil bulunamadı.</p>', '<button class="btn btn-primary" onclick="window.UlakUI.closeModal()">Kapat</button>');
          }

          let modalBody = `
            <div style="max-height: 380px; overflow-y: auto; display:flex; flex-direction:column; gap:6px;">
          `;
          profiles.forEach(p => {
            modalBody += `
              <div class="setting-row glass-soft" style="margin-bottom:0; justify-content:space-between;">
                <div>
                  <div style="font-weight:700; font-size:13px;">${window.UlakUI.escapeHtml(p.ssid)}</div>
                  <div style="font-size:11px; color:var(--text-2);">Güvenlik: ${p.auth || 'WPA2-Personal'}</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="chip" style="font-variant-numeric: tabular-nums; font-family: monospace;">${window.UlakUI.escapeHtml(p.password || '(Şifresiz)')}</span>
                  <button class="btn btn-secondary btn-sm btn-copy-pwd" data-pwd="${window.UlakUI.escapeHtml(p.password || '')}">Kopyala</button>
                </div>
              </div>
            `;
          });
          modalBody += `</div>`;

          window.UlakUI.modal('Kayıtlı Wi-Fi Parolaları Kasası', modalBody, '<button class="btn btn-primary" onclick="window.UlakUI.closeModal()">Tamam</button>');

          document.querySelectorAll('.btn-copy-pwd').forEach(b => {
            b.addEventListener('click', () => {
              const pwd = b.getAttribute('data-pwd');
              navigator.clipboard.writeText(pwd);
              window.UlakUI.toast('Parola panoya kopyalandı.', 'success');
            });
          });
        } catch (e) {
          window.UlakUI.toast(`Kasa hatası: ${e.message}`, 'error');
        }
      });

      // 3. Roaming Telemetry Modal
      el.querySelector('#wifi-roaming-btn')?.addEventListener('click', async () => {
        try {
          const telemetry = await window.ulak.invoke('wifi:get-roaming-telemetry') || {};
          const speedText = telemetry.speed || telemetry.txRate || telemetry.rxRate || 'Otomatik';
          const radioText = telemetry.radio || telemetry.radioType || '802.11ax / ac';
          const body = `
            <div style="display:flex; flex-direction:column; gap:8px; font-variant-numeric: tabular-nums;">
              <div class="setting-row glass-soft"><span>BSSID (Erişim Noktası MAC):</span> <strong>${telemetry.bssid || 'Belirlenemedi'}</strong></div>
              <div class="setting-row glass-soft"><span>Sinyal Gücü:</span> <strong>${telemetry.signal || '%85 (İyi)'}</strong></div>
              <div class="setting-row glass-soft"><span>Aktarım Hızı:</span> <strong>${speedText}</strong></div>
              <div class="setting-row glass-soft"><span>Radyo Tipi (PHY):</span> <strong>${radioText}</strong></div>
            </div>
          `;
          window.UlakUI.modal('Wi-Fi Dolaşım & BSSID Telemetrisi', body, '<button class="btn btn-primary" onclick="window.UlakUI.closeModal()">Kapat</button>');
        } catch (e) {
          window.UlakUI.toast(`Telemetri hatası: ${e.message}`, 'error');
        }
      });

      // 4. Export XML Profiles
      el.querySelector('#wifi-export-btn')?.addEventListener('click', async () => {
        try {
          window.UlakUI.toast('Wi-Fi profilleri dışa aktarılıyor...', 'info');
          const res = await window.ulak.invoke('wifi:export-profiles');
          const target = res.path || res.targetDir || 'Masaüstü';
          window.UlakUI.toast(`Profiller kaydedildi: ${target}`, 'success');
        } catch (e) {
          window.UlakUI.toast(`Dışa aktarma hatası: ${e.message}`, 'error');
        }
      });

      // 5. Proxy Management Listeners
      const proxyTestBtn = el.querySelector('#wifi-proxy-test-btn');
      const proxySaveBtn = el.querySelector('#wifi-proxy-save-btn');
      const proxyDisableBtn = el.querySelector('#wifi-proxy-disable-btn');

      proxyTestBtn?.addEventListener('click', async () => {
        const host = el.querySelector('#wifi-proxy-host')?.value.trim();
        const port = el.querySelector('#wifi-proxy-port')?.value.trim();
        if (!host || !port) {
          return window.UlakUI.toast('Lütfen test edilecek Proxy Host ve Port girin.', 'warning');
        }
        try {
          proxyTestBtn.disabled = true;
          window.UlakUI.toast(`Proxy sunucusu (${host}:${port}) test ediliyor...`, 'info');
          const res = await window.ulak.invoke('wifi:test-proxy', host, port);
          if (res.success) {
            window.UlakUI.toast(`Proxy Erişilebilir: ${res.message}`, 'success');
          } else {
            window.UlakUI.toast(`Proxy Erişilemedi: ${res.message}`, 'error');
          }
        } catch (err) {
          window.UlakUI.toast(`Test hatası: ${err.message}`, 'error');
        } finally {
          proxyTestBtn.disabled = false;
        }
      });

      proxySaveBtn?.addEventListener('click', async () => {
        const host = el.querySelector('#wifi-proxy-host')?.value.trim();
        const port = el.querySelector('#wifi-proxy-port')?.value.trim();
        const protocol = el.querySelector('#wifi-proxy-proto')?.value || 'http';
        const bypass = el.querySelector('#wifi-proxy-bypass')?.value.trim() || '<local>;127.0.0.1;localhost';

        if (!host || !port) {
          return window.UlakUI.toast('Lütfen geçerli bir Proxy Host ve Port girin.', 'warning');
        }
        try {
          proxySaveBtn.disabled = true;
          const res = await window.ulak.invoke('wifi:set-proxy-settings', {
            enabled: true,
            host,
            port,
            protocol,
            bypass
          });
          if (res.success) {
            window.UlakUI.toast('Windows Sistem Proxy ayarları uygulandı.', 'success');
            await loadProxy(el);
          } else {
            window.UlakUI.toast(`Ayar uygulanamadı: ${res.message}`, 'error');
          }
        } catch (err) {
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        } finally {
          proxySaveBtn.disabled = false;
        }
      });

      proxyDisableBtn?.addEventListener('click', async () => {
        try {
          proxyDisableBtn.disabled = true;
          const res = await window.ulak.invoke('wifi:set-proxy-settings', { enabled: false });
          if (res.success) {
            window.UlakUI.toast('Sistem Proxy devre dışı bırakıldı.', 'info');
            await loadProxy(el);
          }
        } catch (err) {
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        } finally {
          proxyDisableBtn.disabled = false;
        }
      });

      // 6. DNS Preset Buttons Listeners
      el.querySelectorAll('.btn-dns-preset').forEach(btn => {
        btn.addEventListener('click', async () => {
          const preset = btn.getAttribute('data-preset');
          try {
            btn.disabled = true;
            window.UlakUI.toast(`DNS '${preset}' profiline ayarlanıyor...`, 'info');
            const res = await window.ulak.invoke('wifi:set-dns-settings', preset);
            if (res.success) {
              window.UlakUI.toast(res.message, 'success');
              await loadDns(el);
            } else {
              window.UlakUI.toast(`DNS değiştirilemedi: ${res.message}`, 'error');
            }
          } catch (err) {
            window.UlakUI.toast(`Hata: ${err.message}`, 'error');
          } finally {
            btn.disabled = false;
          }
        });
      });

      // Flush DNS
      el.querySelector('#wifi-flush-dns-btn')?.addEventListener('click', async () => {
        try {
          const res = await window.ulak.invoke('wifi:flush-dns');
          window.UlakUI.toast(res.message, 'success');
        } catch (err) {
          window.UlakUI.toast(`Önbellek temizleme hatası: ${err.message}`, 'error');
        }
      });

      // Public IP Refresh
      el.querySelector('#wifi-public-ip-refresh-btn')?.addEventListener('click', () => loadPublicIp(el));

      // Initial Loads
      await Promise.all([
        loadCurrent(el),
        loadNetworks(el),
        loadProxy(el),
        loadDns(el),
        loadPublicIp(el)
      ]);
    }
  };

  async function loadProxy(el) {
    try {
      const p = await window.ulak.invoke('wifi:get-proxy-settings');
      const chip = el.querySelector('#wifi-proxy-status-chip');
      const hostInput = el.querySelector('#wifi-proxy-host');
      const portInput = el.querySelector('#wifi-proxy-port');
      const protoSelect = el.querySelector('#wifi-proxy-proto');
      const bypassInput = el.querySelector('#wifi-proxy-bypass');

      if (chip) {
        if (p.enabled) {
          chip.className = 'chip chip-success';
          chip.innerHTML = '<span class="chip-dot"></span> Aktif';
        } else {
          chip.className = 'chip';
          chip.innerHTML = '<span class="chip-dot"></span> Kapalı';
        }
      }

      if (hostInput && p.host) hostInput.value = p.host;
      if (portInput && p.port) portInput.value = p.port;
      if (protoSelect && p.protocol) protoSelect.value = p.protocol;
      if (bypassInput && p.bypass) bypassInput.value = p.bypass;
    } catch (e) {
      console.error('[WiFi] Proxy load error:', e);
    }
  }

  async function loadDns(el) {
    try {
      const dns = await window.ulak.invoke('wifi:get-dns-settings');
      const chip = el.querySelector('#wifi-dns-provider-chip');
      if (chip) {
        chip.textContent = dns.provider || 'Otomatik (DHCP)';
        if (dns.isDhcp) {
          chip.className = 'chip';
        } else {
          chip.className = 'chip chip-accent';
        }
      }
    } catch (e) {
      console.error('[WiFi] DNS load error:', e);
    }
  }

  async function loadPublicIp(el) {
    const badge = el.querySelector('#wifi-public-ip-badge');
    if (badge) badge.textContent = '...';
    try {
      const res = await window.ulak.invoke('wifi:get-public-ip');
      if (badge) badge.textContent = res.ip || 'Bilinmiyor';
    } catch (e) {
      if (badge) badge.textContent = 'Bağlantı Yok';
    }
  }

  async function loadCurrent(el) {
    try {
      const conn = await window.ulak.invoke('wifi:get-connection');
      const ssidEl = el.querySelector('#wifi-active-ssid');
      const detailsEl = el.querySelector('#wifi-active-details');
      const chipEl = el.querySelector('#wifi-active-chip');

      if (conn && conn.ssid) {
        if (ssidEl) ssidEl.textContent = conn.ssid;
        if (detailsEl) detailsEl.textContent = `Sinyal: %${conn.signal || 0} | BSSID: ${conn.bssid || 'Bilinmiyor'} | Radyo: ${conn.radioType || 'Wi-Fi'}`;
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
                <div class="setting-subtitle" style="font-variant-numeric: tabular-nums;">
                  Sinyal: %${n.signal || 0} | Kanal: ${n.channel || '-'} | Güvenlik: ${n.security || 'Açık'}
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="chip" style="font-variant-numeric: tabular-nums;">${n.signal || 0}%</span>
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
          window.UlakUI.modal(
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
