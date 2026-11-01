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
          ${C.headerCard('Wi-Fi & Kablosuz Ağlar', 'Kanal Spektrum Analizi, Kayıtlı Parola Kasası, Dolaşım Telemetrisi ve Mobil Hotspot', 'wifi')}

          <!-- Bento Golden Split: Active Conn (1.618fr) & Hotspot (1fr) -->
          <div class="grid-golden" style="margin-bottom: var(--space-13);">
            <!-- Active Connection & Roaming Telemetry -->
            <div class="view-section glass-card liquid-glow" style="display: flex; flex-direction: column; justify-content: space-between;">
              <div class="view-section-header">
                <div class="view-section-title">
                  ${window.UlakIcons.getIcon('wifi')} Aktif Kablosuz Bağlantı & Dolaşım
                </div>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-secondary btn-sm" id="wifi-roaming-btn" title="Detaylı BSSID ve Dolaşım Telemetrisini Göster">
                    ${window.UlakIcons.getIcon('activity', 'icon-mono-xs')} Telemetri
                  </button>
                  <button class="btn btn-danger-soft btn-sm" id="wifi-disconnect-btn">Bağlantıyı Kes</button>
                </div>
              </div>
              <div class="setting-row glass-soft" style="margin-bottom: 0;">
                <div class="setting-row-left">
                  <div class="setting-row-icon">${window.UlakIcons.getIcon('wifi')}</div>
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

          <!-- Feature Cards Row: Spectrum Analysis & Saved Passwords Vault & XML Export -->
          <div class="grid-3" style="margin-bottom: var(--space-13); gap: 12px;">
            <!-- 1. Spectrum Analysis Card -->
            <div class="glass-card liquid-glow" style="padding: 14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-1); display:flex; align-items:center; gap:6px;">
                  ${window.UlakIcons.getIcon('activity', 'icon-mono-xs')} Spektrum Analizi
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
                  ${window.UlakIcons.getIcon('lock', 'icon-mono-xs')} Parola Kasası
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
                  ${window.UlakIcons.getIcon('download', 'icon-mono-xs')} Profil Yedekleme
                </div>
                <button class="btn btn-secondary btn-sm" id="wifi-export-btn">XML Dışa Aktar</button>
              </div>
              <div style="font-size: var(--text-2xs); color: var(--text-2);">
                Tüm Wi-Fi profillerini XML dosyaları halinde masaüstüne/belgelere yedekler.
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
          
          summary.textContent = `2.4 GHz En Temiz Kanal: ${spec.recommended24GHz} | 5 GHz En Temiz: ${spec.recommended5GHz}`;
          badge.style.display = 'inline-block';
          badge.textContent = `Önerilen Kanal: ${spec.recommended24GHz}`;
          window.UlakUI.toast(`En az parazitli kanal önerisi: Kanal ${spec.recommended24GHz}`, 'success');
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
          const telemetry = await window.ulak.invoke('wifi:get-roaming-telemetry');
          const body = `
            <div style="display:flex; flex-direction:column; gap:8px; font-variant-numeric: tabular-nums;">
              <div class="setting-row glass-soft"><span>BSSID (Erişim Noktası MAC):</span> <strong>${telemetry.bssid || 'Belirlenemedi'}</strong></div>
              <div class="setting-row glass-soft"><span>Sinyal Gücü:</span> <strong>%${telemetry.signal || 0} (${telemetry.rssi ? telemetry.rssi + ' dBm' : 'İyi'})</strong></div>
              <div class="setting-row glass-soft"><span>İletim / Alım Hızı:</span> <strong>${telemetry.txRate || telemetry.rxRate || 'Otomatik'} Mbps</strong></div>
              <div class="setting-row glass-soft"><span>Radyo Tipi (PHY):</span> <strong>${telemetry.radioType || '802.11ax / ac'}</strong></div>
              <div class="setting-row glass-soft"><span>Kanal:</span> <strong>${telemetry.channel || '--'}</strong></div>
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
          window.UlakUI.toast(`Profiller kaydedildi: ${res.targetDir}`, 'success');
        } catch (e) {
          window.UlakUI.toast(`Dışa aktarma hatası: ${e.message}`, 'error');
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
