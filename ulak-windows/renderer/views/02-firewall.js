// VIEW 02: GÜVENLİK DUVARI (FIREWALL)
(function() {
  let allRules = [];

  const view = {
    id: 'firewall',
    title: 'Güvenlik Duvarı',
    icon: 'shield',

    render() {
      const C = window.UlakComponents;
      return `
        <div class="firewall-view">
          ${C.headerCard('Güvenlik Duvarı', 'Windows Gelişmiş Güvenlikli Güvenlik Duvarı Yönetimi, ICMP Gizleme ve Kural Denetimi', 'shield')}

          <!-- Subtab Segmented Bar -->
          <div class="view-section glass-card" style="padding: 10px 14px; margin-bottom: 16px;">
            <div class="segmented-control glass-soft">
              <button class="segmented-btn active" data-sub="shield">Kalkan Profilleri</button>
              <button class="segmented-btn" data-sub="rules">Kural Denetimi</button>
              <button class="segmented-btn" data-sub="apps">Uygulama Bağlantıları</button>
              <button class="segmented-btn" data-sub="local">Gizli Kalkan & Savunma</button>
              <button class="segmented-btn" data-sub="logs">Güvenlik Günlüğü</button>
            </div>
          </div>

          <!-- SUBTAB: SHIELD -->
          <div class="subtab-pane active" id="subpane-shield">
            <div class="view-section glass-card liquid-glow">
              <div class="view-section-header">
                <div class="view-section-title">Ağ Profili Kalkanları & Dışa Aktarma</div>
                <button class="btn btn-secondary btn-sm" id="fw-export-policy-btn">
                  ${window.UlakIcons.getIcon('download', 'icon-mono-xs')} Politikayı Dışa Aktar (.wfw)
                </button>
              </div>
              <div class="grid-3" style="margin-bottom: 16px;">
                <div class="setting-row glass-soft" style="flex-direction: column; align-items: flex-start;">
                  <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                    <span class="setting-title">Etki Alanı (Domain)</span>
                    <label class="switch">
                      <input type="checkbox" id="fw-domain-toggle" checked>
                      <span class="switch-slider"></span>
                    </label>
                  </div>
                  <span class="setting-subtitle">Kurumsal etki alanı güvenlik koruması</span>
                </div>

                <div class="setting-row glass-soft" style="flex-direction: column; align-items: flex-start;">
                  <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                    <span class="setting-title">Özel (Private)</span>
                    <label class="switch">
                      <input type="checkbox" id="fw-private-toggle" checked>
                      <span class="switch-slider"></span>
                    </label>
                  </div>
                  <span class="setting-subtitle">Ev ve işyeri yerel ağ kalkanı</span>
                </div>

                <div class="setting-row glass-soft" style="flex-direction: column; align-items: flex-start;">
                  <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                    <span class="setting-title">Ortak (Public)</span>
                    <label class="switch">
                      <input type="checkbox" id="fw-public-toggle" checked>
                      <span class="switch-slider"></span>
                    </label>
                  </div>
                  <span class="setting-subtitle">Açık hava ve kafe ağları kalkanı</span>
                </div>
              </div>

              <!-- Quick Port Block Section -->
              <div class="view-section-header">
                <div class="view-section-title">Hızlı Port Karantinası & İzin Verme</div>
              </div>
              <div class="action-bar glass-soft" style="gap: 12px; flex-wrap: wrap;">
                <div class="field" style="width: 180px;">
                  <input type="number" id="fw-quick-port" class="field-input" placeholder="Port (örn: 8080)">
                </div>
                <button class="btn btn-danger" id="fw-block-port-btn">Portu Kilitle</button>
                <button class="btn btn-secondary" id="fw-allow-port-btn">Erişime İzin Ver</button>
              </div>
            </div>
          </div>

          <!-- SUBTAB: RULES -->
          <div class="subtab-pane" id="subpane-rules" style="display: none;">
            <div class="view-section glass-card">
              <div class="view-section-header">
                <div class="field" style="width: 280px;">
                  <input type="text" id="fw-rules-filter" class="field-input" placeholder="Windows güvenlik kurallarında ara...">
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-secondary btn-sm" id="fw-refresh-rules-btn">Yenile</button>
                  <button class="btn btn-primary btn-sm" id="fw-add-rule-btn">+ Yeni Kural Ekle</button>
                </div>
              </div>
              <div class="data-table-container glass-soft" id="fw-rules-table-container" style="max-height: 440px;">
                <!-- Table rendered here -->
              </div>
            </div>
          </div>

          <!-- SUBTAB: APPS -->
          <div class="subtab-pane" id="subpane-apps" style="display: none;">
            <div class="view-section glass-card">
              <div class="view-section-header">
                <div class="view-section-title">Aktif Bağlantı Açan İşlemler & Soketler</div>
                <button class="btn btn-secondary btn-sm" id="fw-refresh-apps-btn">Yenile</button>
              </div>
              <div id="fw-apps-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
            </div>
          </div>

          <!-- SUBTAB: LOCAL / STEALTH & DEFENSE -->
          <div class="subtab-pane" id="subpane-local" style="display: none;">
            <div class="view-section glass-card liquid-glow">
              <div class="view-section-header">
                <div class="view-section-title">Gelişmiş Gizli Kalkan & Savunma Parametreleri</div>
              </div>
              ${C.settingRow(
                'shield',
                'ICMP Ping Gizleme (Stealth Ping - Sessiz Düşürme)',
                'Dış dünyadan gelen ICMP Echo (ping) isteklerini yanıtsız bırakarak sistemi görünmez kılar.',
                `<div style="display:flex; gap:8px;">
                   <button class="btn btn-primary btn-sm" id="fw-stealth-ping-enable-btn">Gizlemeyi Aç</button>
                   <button class="btn btn-secondary btn-sm" id="fw-stealth-ping-disable-btn">İzin Ver</button>
                 </div>`
              )}
              ${C.settingRow(
                'zap',
                'Paranoid Dışa Gidiş Kalkanı (Outbound Lockdown)',
                'Bilinmeyen veya yetkilendirilmemiş tüm dışa giden gidiş paketlerini engeller.',
                `<div style="display:flex; gap:8px;">
                   <button class="btn btn-danger-soft btn-sm" id="fw-paranoid-enable-btn">Paranoid Kilidi Aç</button>
                   <button class="btn btn-secondary btn-sm" id="fw-paranoid-disable-btn">Normal Moda Dön</button>
                 </div>`
              )}
            </div>
          </div>

          <!-- SUBTAB: LOGS -->
          <div class="subtab-pane" id="subpane-logs" style="display: none;">
            <div class="view-section glass-card">
              ${C.consoleCard('Windows Güvenlik Olay Günlüğü', 'Kayıtlar yükleniyor...', 'fw-logs-')}
            </div>
          </div>
        </div>
      `;
    },

    async mount(el) {
      // Subtab switcher
      el.querySelectorAll('.segmented-btn[data-sub]').forEach((btn) => {
        btn.addEventListener('click', () => {
          el.querySelectorAll('.segmented-btn[data-sub]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const target = btn.getAttribute('data-sub');
          el.querySelectorAll('.subtab-pane').forEach((p) => {
            p.style.display = p.id === `subpane-${target}` ? 'block' : 'none';
          });
          if (target === 'rules') loadRules(el);
          if (target === 'apps') loadApps(el);
          if (target === 'logs') loadLogs(el);
        });
      });

      // Profile toggles
      ['domain', 'private', 'public'].forEach((prof) => {
        const toggle = el.querySelector(`#fw-${prof}-toggle`);
        toggle?.addEventListener('change', async (e) => {
          try {
            const state = e.target.checked ? 'on' : 'off';
            await window.ulak.invoke('firewall:set-profile-state', prof, state);
            window.UlakUI.toast(`${prof.toUpperCase()} kalkanı ${state.toUpperCase()} konumuna getirildi.`, e.target.checked ? 'success' : 'warning');
          } catch (err) {
            window.UlakUI.toast(`Profil hatası: ${err.message}`, 'error');
            e.target.checked = !e.target.checked;
          }
        });
      });

      // Quick Block & Allow
      el.querySelector('#fw-block-port-btn')?.addEventListener('click', async () => {
        const port = parseInt(el.querySelector('#fw-quick-port').value);
        if (!port) return window.UlakUI.toast('Lütfen bir port numarası girin!', 'warning');
        try {
          await window.ulak.invoke('firewall:block-port', port, 'TCP');
          window.UlakUI.toast(`Port ${port} kilitlendi.`, 'success');
          el.querySelector('#fw-quick-port').value = '';
        } catch (err) {
          window.UlakUI.toast(`Engelleme hatası: ${err.message}`, 'error');
        }
      });

      el.querySelector('#fw-allow-port-btn')?.addEventListener('click', async () => {
        const port = parseInt(el.querySelector('#fw-quick-port').value);
        if (!port) return window.UlakUI.toast('Lütfen bir port numarası girin!', 'warning');
        try {
          await window.ulak.invoke('firewall:allow-port', port, 'TCP');
          window.UlakUI.toast(`Port ${port} erişimine izin verildi.`, 'info');
          el.querySelector('#fw-quick-port').value = '';
        } catch (err) {
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        }
      });

      // Feature 1: Export Firewall Policy
      el.querySelector('#fw-export-policy-btn')?.addEventListener('click', async () => {
        try {
          window.UlakUI.toast('Güvenlik duvarı ilkesi dışa aktarılıyor...', 'info');
          const res = await window.ulak.invoke('firewall:export-policy');
          window.UlakUI.toast(`İlke kaydedildi: ${res.path}`, 'success');
        } catch (err) {
          window.UlakUI.toast(`Dışa aktarma hatası: ${err.message}`, 'error');
        }
      });

      // Feature 2: Stealth Ping ICMP drop
      el.querySelector('#fw-stealth-ping-enable-btn')?.addEventListener('click', async () => {
        try {
          await window.ulak.invoke('firewall:set-stealth-ping', true);
          window.UlakUI.toast('Stealth Ping aktif: Dış gelen ICMP istekleri sessizce yutuluyor.', 'success');
        } catch (err) {
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        }
      });

      el.querySelector('#fw-stealth-ping-disable-btn')?.addEventListener('click', async () => {
        try {
          await window.ulak.invoke('firewall:set-stealth-ping', false);
          window.UlakUI.toast('ICMP yankı paketlerine izin verildi.', 'info');
        } catch (err) {
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        }
      });

      // Feature 3: Paranoid Outbound
      el.querySelector('#fw-paranoid-enable-btn')?.addEventListener('click', async () => {
        const ok = await window.UlakUI.confirm('Paranoid Kalkanı Aç', 'Dışarıya giden tüm yetkisiz ağ trafiği kilitlenecektir. Emin misiniz?', 'Etkinleştir');
        if (ok) {
          try {
            await window.ulak.invoke('firewall:set-paranoid-outbound', true);
            window.UlakUI.toast('Paranoid dış kalkanı devrede! Yalnızca kurallı bağlantılar izinli.', 'warning');
          } catch (err) {
            window.UlakUI.toast(`Hata: ${err.message}`, 'error');
          }
        }
      });

      el.querySelector('#fw-paranoid-disable-btn')?.addEventListener('click', async () => {
        try {
          await window.ulak.invoke('firewall:set-paranoid-outbound', false);
          window.UlakUI.toast('Dış gidiş trafiği varsayılan izinli moda alındı.', 'info');
        } catch (err) {
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        }
      });

      // Rules refresh & filter
      el.querySelector('#fw-refresh-rules-btn')?.addEventListener('click', () => loadRules(el));
      el.querySelector('#fw-add-rule-btn')?.addEventListener('click', () => showAddRuleDialog(el));
      el.querySelector('#fw-rules-filter')?.addEventListener('input', (e) => {
        filterRules(el, e.target.value.toLowerCase());
      });

      // Console Card copy & clear
      el.querySelector('#fw-logs-copy-btn')?.addEventListener('click', () => {
        const txt = el.querySelector('#fw-logs-body').innerText;
        navigator.clipboard.writeText(txt);
        window.UlakUI.toast('Günlük panoya kopyalandı.', 'info');
      });
      el.querySelector('#fw-logs-clear-btn')?.addEventListener('click', () => {
        el.querySelector('#fw-logs-body').textContent = 'Temizlendi.';
      });

      // Initial shield state
      try {
        const status = await window.ulak.invoke('firewall:get-status');
        if (el.querySelector('#fw-domain-toggle')) el.querySelector('#fw-domain-toggle').checked = status.profiles?.domain !== false;
        if (el.querySelector('#fw-private-toggle')) el.querySelector('#fw-private-toggle').checked = status.profiles?.private !== false;
        if (el.querySelector('#fw-public-toggle')) el.querySelector('#fw-public-toggle').checked = status.profiles?.public !== false;
      } catch (e) {
        console.error(e);
      }
    }
  };

  async function loadRules(el) {
    const tableContainer = el.querySelector('#fw-rules-table-container');
    window.UlakUI.state(tableContainer, 'loading', { title: 'Windows güvenlik duvarı kuralları denetleniyor...' });

    try {
      allRules = await window.ulak.invoke('firewall:get-system-rules', 120, '');
      renderRulesTable(el, allRules);
    } catch (err) {
      window.UlakUI.state(tableContainer, 'error', { desc: err.message, actionText: 'Tekrar Dene', actionFn: () => loadRules(el) });
    }
  }

  function renderRulesTable(el, rules) {
    const tableContainer = el.querySelector('#fw-rules-table-container');
    if (!rules || rules.length === 0) {
      return window.UlakUI.state(tableContainer, 'empty', { title: 'Kural bulunamadı' });
    }

    const rows = rules.slice(0, 100).map((r) => {
      const isAllow = (r.action || 'allow').toLowerCase().includes('allow');
      const isEnabled = r.enabled !== false;
      return `
        <tr>
          <td style="font-weight: 600;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="chip-dot" style="background: ${isEnabled ? 'var(--accent)' : 'var(--text-3)'}"></span>
              <span>${window.UlakUI.escapeHtml(r.name || 'İsimsiz Kural')}</span>
            </div>
          </td>
          <td><span class="chip ${isAllow ? 'chip-accent' : 'chip-danger'}">${window.UlakUI.escapeHtml(r.action || 'Allow')}</span></td>
          <td><span class="chip" style="font-variant-numeric: tabular-nums;">${window.UlakUI.escapeHtml(r.direction || 'In')}</span></td>
          <td><span style="font-variant-numeric: tabular-nums;">${window.UlakUI.escapeHtml(r.protocol || 'TCP')}</span></td>
          <td>
            <button class="btn btn-danger-soft btn-sm btn-del-rule" data-name="${window.UlakUI.escapeHtml(r.name)}">Sil</button>
          </td>
        </tr>
      `;
    }).join('');

    tableContainer.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Kural Adı</th>
            <th>Eylem</th>
            <th>Yön</th>
            <th>Protokol</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    tableContainer.querySelectorAll('.btn-del-rule').forEach((b) => {
      b.addEventListener('click', async () => {
        const name = b.getAttribute('data-name');
        const ok = await window.UlakUI.confirm('Kuralı Sil', `'${name}' kuralı kalıcı olarak silinecektir. Emin misiniz?`, 'Sil');
        if (ok) {
          try {
            await window.ulak.invoke('firewall:remove-rule', name);
            window.UlakUI.toast(`Kural silindi: ${name}`, 'info');
            loadRules(el);
          } catch (e) {
            window.UlakUI.toast(`Hata: ${e.message}`, 'error');
          }
        }
      });
    });
  }

  function filterRules(el, query) {
    const filtered = allRules.filter(r => (r.name && r.name.toLowerCase().includes(query)));
    renderRulesTable(el, filtered);
  }

  function showAddRuleDialog(el) {
    const body = `
      <div class="field" style="margin-bottom: 12px;">
        <label class="field-label">Kural Tanımı / Adı</label>
        <input type="text" id="dlg-rule-name" class="field-input" placeholder="Örn: Özel Veritabanı Portu">
      </div>
      <div class="grid-2" style="margin-bottom: 12px;">
        <div class="field">
          <label class="field-label">Port Numarası</label>
          <input type="number" id="dlg-rule-port" class="field-input" placeholder="3306">
        </div>
        <div class="field">
          <label class="field-label">Protokol</label>
          <select id="dlg-rule-proto" class="field-input">
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label class="field-label">Erişim Eylemi</label>
        <select id="dlg-rule-action" class="field-input">
          <option value="allow">Erişime İzin Ver (Allow)</option>
          <option value="block">Engelle ve Kapat (Block)</option>
        </select>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="window.UlakUI.closeModal()">İptal</button>
      <button class="btn btn-primary" id="dlg-rule-submit">Kuralı Oluştur</button>
    `;

    window.UlakUI.modal('Yeni Güvenlik Kuralı', body, footer);

    document.getElementById('dlg-rule-submit')?.addEventListener('click', async () => {
      const name = document.getElementById('dlg-rule-name').value.trim();
      const port = parseInt(document.getElementById('dlg-rule-port').value);
      const protocol = document.getElementById('dlg-rule-proto').value;
      const action = document.getElementById('dlg-rule-action').value;

      if (!name || !port) return window.UlakUI.toast('Lütfen kural adı ve geçerli bir port girin!', 'warning');

      try {
        await window.ulak.invoke('firewall:add-rule', { name, port, protocol, action, dir: 'in' });
        window.UlakUI.toast(`'${name}' kuralı oluşturuldu.`, 'success');
        window.UlakUI.closeModal();
        loadRules(el);
      } catch (err) {
        window.UlakUI.toast(`Hata: ${err.message}`, 'error');
      }
    });
  }

  async function loadApps(el) {
    const list = el.querySelector('#fw-apps-list');
    window.UlakUI.state(list, 'loading', { title: 'Açık bağlantılar alınıyor...' });

    try {
      const conns = await window.ulak.invoke('firewall:get-connections');
      if (!conns || conns.length === 0) {
        return window.UlakUI.state(list, 'empty', { title: 'Harici bağlantı bulunamadı' });
      }

      list.innerHTML = conns.slice(0, 50).map((c) => {
        return window.UlakComponents.listRow(
          'globe',
          `${c.localAddress}:${c.localPort} ➔ ${c.foreignAddress}:${c.foreignPort}`,
          `Protokol: ${c.protocol || 'TCP'} | Durum: ${c.state || 'ESTABLISHED'}`,
          `<span class="chip chip-accent" style="font-variant-numeric: tabular-nums;">${c.protocol || 'TCP'}</span>`
        );
      }).join('');
    } catch (err) {
      window.UlakUI.state(list, 'error', { desc: err.message });
    }
  }

  async function loadLogs(el) {
    const body = el.querySelector('#fw-logs-body');
    body.textContent = 'Güvenlik günlüğü sorgulanıyor...';
    try {
      const res = await window.ulak.invoke('hacker:run-tool', 'security_log');
      body.textContent = res.output || 'Kayıt bulunamadı.';
    } catch (err) {
      body.textContent = `Hata: ${err.message}`;
    }
  }

  window.UlakRouter.register(view);
})();
