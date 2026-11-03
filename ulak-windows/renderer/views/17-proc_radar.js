// VIEW 17: SÜREÇ & TEHDİT RADARI (PROCESS RADAR & TASK HUNTER) — v2.5.0
// Tamamen Renksiz (Monochrome Nord), Gerçek Toggle Seçim Alanları & Sıfır Kasma / Yüksek Performans Motoru
(function() {
  let processes = [];
  let searchQuery = '';
  let autoRefreshInterval = null;
  let isAutoRefresh = true;
  let selectedPid = null;
  let searchDebounceTimer = null;
  let displayLimit = 100;

  // Gerçek Toggle Seçim Durumları
  const toggles = {
    suspiciousOnly: false,
    hideSystem: false,
    highRamOnly: false
  };

  const view = {
    id: 'proc_radar',
    title: 'Süreçler',
    icon: 'activity',

    render() {
      const C = window.UlakComponents;
      return `
        <div class="proc-radar-view">
          ${C.headerCard(
            'Süreçler',
            'Windows Çalışma Zamanı Süreçleri, Anomali Tespiti, Bellek Telemetrisi ve Donanım Denetçisi',
            'activity',
            'proc_radar'
          )}

          <!-- 1. METRİK TELEMETRİ KARTLARI (Renksiz / Monochrome Nord Mimarisi) -->
          <div class="grid-4" style="margin-bottom: 16px; gap: 14px;">
            <div class="stat-tile liquid-glow">
              <div class="stat-tile-label">TOPLAM AKTİF SÜREÇ</div>
              <div class="stat-tile-value" id="radar-stat-total" style="color: var(--text-1); font-family: var(--font-mono); font-weight: 800;">--</div>
              <div class="stat-tile-sub" style="color: var(--text-3);">Windows İşlemleri</div>
            </div>

            <div class="stat-tile liquid-glow">
              <div class="stat-tile-label">ŞÜPHELİ / ANOMALİ</div>
              <div class="stat-tile-value" id="radar-stat-threats" style="color: var(--text-1); font-family: var(--font-mono); font-weight: 800;">0</div>
              <div class="stat-tile-sub" id="radar-stat-threats-sub" style="color: var(--text-3);">Heuristik İzleme</div>
            </div>

            <div class="stat-tile liquid-glow">
              <div class="stat-tile-label">YÜKSEK RAM KULLANAN</div>
              <div class="stat-tile-value" id="radar-stat-highram" style="color: var(--text-1); font-family: var(--font-mono); font-weight: 800;">--</div>
              <div class="stat-tile-sub" style="color: var(--text-3);">> 1.5 GB Tüketim</div>
            </div>

            <div class="stat-tile liquid-glow">
              <div class="stat-tile-label">TOPLAM SÜREÇ BELLEĞİ</div>
              <div class="stat-tile-value" id="radar-stat-totalram" style="color: var(--text-1); font-family: var(--font-mono); font-weight: 800;">-- GB</div>
              <div class="stat-tile-sub" style="color: var(--text-3);">Fiziksel RAM Yükü</div>
            </div>
          </div>

          <!-- 2. KONTROL, ARAMA VE GERÇEK TOGGLE SEÇİM ALANLARI -->
          <div class="view-section glass-card" style="padding: 14px 18px; margin-bottom: 16px;">
            <div style="display: flex; flex-direction: column; gap: 14px;">
              
              <!-- Üst Satır: Canlı Arama ve Yenile Eylemi -->
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 260px; max-width: 480px;">
                  <div style="position: relative; width: 100%;">
                    <input
                      type="text"
                      id="radar-search-input"
                      class="field-input"
                      placeholder="Süreç adı, PID veya dosya yolu ara..."
                      style="padding: 7px 12px 7px 32px; font-size: 11.5px; width: 100%; border-radius: var(--r-sm);"
                    >
                    <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; opacity: 0.5;">
                      ${window.UlakIcons.getIcon('search', 'icon-mono-xs')}
                    </span>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 12px;">
                  <!-- Canlı Otomatik Radar Toggle Switch -->
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <label class="switch" title="Otomatik Canlı Telemetri">
                      <input type="checkbox" id="radar-toggle-autorefresh" checked>
                      <span class="switch-slider"></span>
                    </label>
                    <span style="font-size: 11.5px; color: var(--text-2); font-weight: 500;">Canlı Radar</span>
                  </div>

                  <!-- Manuel Tara Butonu -->
                  <button class="btn btn-secondary btn-sm" id="radar-btn-refresh" style="display: flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 11.5px;">
                    ${window.UlakIcons.getIcon('refresh', 'icon-mono-xs')}
                    <span>Tara</span>
                  </button>
                </div>
              </div>

              <!-- Alt Satır: Gerçek Toggle Seçim Alanları (Selection Toggles) -->
              <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding-top: 10px; border-top: 1px solid var(--glass-border-subtle);">
                <span style="font-size: 10.5px; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px;">Filtre Toggle:</span>
                
                <!-- Toggle 1: Şüpheli / Anomali -->
                <div style="display: flex; align-items: center; gap: 8px;">
                  <label class="switch">
                    <input type="checkbox" id="toggle-filter-suspicious">
                    <span class="switch-slider"></span>
                  </label>
                  <span style="font-size: 11px; color: var(--text-2); cursor: pointer;" id="label-toggle-suspicious">Şüpheli / Anomali</span>
                </div>

                <!-- Toggle 2: Sistem Süreçlerini Gizle -->
                <div style="display: flex; align-items: center; gap: 8px;">
                  <label class="switch">
                    <input type="checkbox" id="toggle-filter-hidesystem">
                    <span class="switch-slider"></span>
                  </label>
                  <span style="font-size: 11px; color: var(--text-2); cursor: pointer;" id="label-toggle-hidesystem">Sistem Süreçlerini Gizle</span>
                </div>

                <!-- Toggle 3: Yüksek RAM Tüketenler -->
                <div style="display: flex; align-items: center; gap: 8px;">
                  <label class="switch">
                    <input type="checkbox" id="toggle-filter-highram">
                    <span class="switch-slider"></span>
                  </label>
                  <span style="font-size: 11px; color: var(--text-2); cursor: pointer;" id="label-toggle-highram">Yüksek Bellek (>1.5 GB)</span>
                </div>
              </div>

            </div>
          </div>

          <!-- 3. SÜREÇ LİSTESİ TABLOSU (Monochrome & Yüksek Performans) -->
          <div class="view-section glass-card liquid-glow" style="padding: 0; overflow: hidden; border-radius: var(--r-md);">
            <div style="padding: 12px 18px; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between;">
              <div style="font-size: 12.5px; font-weight: 700; color: var(--text-1); display: flex; align-items: center; gap: 8px;">
                ${window.UlakIcons.getIcon('cpu', 'icon-mono-xs')}
                <span>Windows Çalışma Zamanı Süreçleri</span>
              </div>
              <span id="radar-count-label" style="font-size: 11px; color: var(--text-3); font-family: var(--font-mono);">0 süreç listeleniyor</span>
            </div>

            <!-- Tablo Başlıkları -->
            <div style="display: grid; grid-template-columns: 80px 2.4fr 120px 140px 110px; padding: 10px 18px; background: rgba(0,0,0,0.18); font-size: 10px; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--glass-border-subtle);">
              <div>PID</div>
              <div>Süreç & Yürütülebilir Yol</div>
              <div>Durum</div>
              <div>Bellek (RAM)</div>
              <div style="text-align: right;">Eylemler</div>
            </div>

            <!-- Tablo Gövdesi (Scroll) -->
            <div id="radar-process-table-body" style="max-height: 520px; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column;">
              <div style="color: var(--text-3); text-align: center; padding: 40px; font-size: 12px;">
                Süreçler taranıyor, lütfen bekleyin...
              </div>
            </div>

            <!-- Tablo Altı: Daha Fazla Göster Butonu (Gerektiğinde görünür) -->
            <div id="radar-more-container" style="display: none; padding: 10px; text-align: center; border-top: 1px solid var(--glass-border-subtle); background: rgba(0,0,0,0.12);">
              <button class="btn btn-secondary btn-sm" id="radar-btn-showmore" style="font-size: 11px; padding: 4px 16px;">Daha Fazla Göster</button>
            </div>
          </div>

          <!-- 4. SÜREÇ DETAY MODALI (INSPECTOR) -->
          <div id="radar-detail-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.78); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); z-index: 99999; align-items: center; justify-content: center; padding: 20px;">
            <div class="glass-card" style="width: 680px; max-width: 95vw; height: 560px; max-height: 85vh; border-radius: var(--r-md); border: 1px solid var(--glass-border); background: var(--glass-surface-dense, #1a2233); padding: 22px; box-shadow: 0 24px 56px rgba(0,0,0,0.85); display: flex; flex-direction: column; gap: 14px; overflow: hidden;">
              <!-- Modal Başlık -->
              <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--glass-border); padding-bottom: 12px; flex-shrink: 0;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  ${window.UlakIcons.getIcon('search', 'icon-mono')}
                  <span id="modal-proc-title" style="font-size: 14px; font-weight: 800; color: var(--text-1);">Süreç İnceleme</span>
                  <span id="modal-proc-pid-badge" class="badge" style="background: rgba(255,255,255,0.08); color: var(--text-2); border: 1px solid var(--glass-border); font-size: 10px; padding: 2px 7px; font-family: var(--font-mono);">PID: --</span>
                </div>
                <button type="button" id="btn-close-radar-modal" style="background: none; border: none; color: var(--text-2); font-size: 16px; cursor: pointer; padding: 4px 8px; border-radius: 4px;">✕</button>
              </div>

              <!-- Modal İçerik Akışı -->
              <div id="modal-proc-content" style="flex: 1; overflow-y: auto; padding-right: 6px; display: flex; flex-direction: column; gap: 12px;">
                <div style="color: var(--text-3); text-align: center; padding: 24px;">Yükleniyor...</div>
              </div>

              <!-- Modal Alt Eylemler -->
              <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--glass-border); padding-top: 12px; flex-shrink: 0;">
                <div style="display: flex; gap: 8px;">
                  <button type="button" id="btn-modal-kill-single" class="btn btn-secondary btn-sm" style="color: var(--text-1); border-color: var(--glass-border);">
                    Görevi Sonlandır
                  </button>
                  <button type="button" id="btn-modal-kill-tree" class="btn btn-secondary btn-sm" style="color: var(--text-1); border-color: var(--glass-border);">
                    Ağacıyla Birlikte Sonlandır (Tree Kill)
                  </button>
                </div>
                <button type="button" id="btn-modal-close-done" class="btn btn-secondary btn-sm" style="padding: 6px 18px;">Kapat</button>
              </div>
            </div>
          </div>

        </div>
      `;
    },

    async mount(el) {
      const tableBody = el.querySelector('#radar-process-table-body');
      const searchInput = el.querySelector('#radar-search-input');
      const refreshBtn = el.querySelector('#radar-btn-refresh');
      const autoToggle = el.querySelector('#radar-toggle-autorefresh');
      const countLabel = el.querySelector('#radar-count-label');
      const moreContainer = el.querySelector('#radar-more-container');
      const btnShowMore = el.querySelector('#radar-btn-showmore');

      const statTotal = el.querySelector('#radar-stat-total');
      const statThreats = el.querySelector('#radar-stat-threats');
      const statThreatsSub = el.querySelector('#radar-stat-threats-sub');
      const statHighRam = el.querySelector('#radar-stat-highram');
      const statTotalRam = el.querySelector('#radar-stat-totalram');

      const detailModal = el.querySelector('#radar-detail-modal');
      const modalTitle = el.querySelector('#modal-proc-title');
      const modalPidBadge = el.querySelector('#modal-proc-pid-badge');
      const modalContent = el.querySelector('#modal-proc-content');
      const btnCloseModal = el.querySelector('#btn-close-radar-modal');
      const btnCloseDone = el.querySelector('#btn-modal-close-done');
      const btnKillSingle = el.querySelector('#btn-modal-kill-single');
      const btnKillTree = el.querySelector('#btn-modal-kill-tree');

      // Toggle Elemanları
      const toggleSuspicious = el.querySelector('#toggle-filter-suspicious');
      const toggleHideSystem = el.querySelector('#toggle-filter-hidesystem');
      const toggleHighRam = el.querySelector('#toggle-filter-highram');
      const labelSuspicious = el.querySelector('#label-toggle-suspicious');
      const labelHideSystem = el.querySelector('#label-toggle-hidesystem');
      const labelHighRam = el.querySelector('#label-toggle-highram');

      async function fetchProcesses(forceRefresh = false) {
        if (!window.ulak) return;
        try {
          const list = await window.ulak.invoke('proc-radar:get-processes', forceRefresh);
          processes = list || [];
          updateTelemetryMetrics();
          renderProcessRows();
        } catch (err) {
          console.error('[ProcessRadar] Veri çekilemedi:', err);
        }
      }

      function updateTelemetryMetrics() {
        const total = processes.length;
        const threats = processes.filter(p => p.riskLevel === 'high').length;
        const warnings = processes.filter(p => p.riskLevel === 'warning').length;
        const highRam = processes.filter(p => p.memoryMB > 1500).length;
        const totalRamMB = processes.reduce((acc, p) => acc + (p.memoryMB || 0), 0);

        if (statTotal) statTotal.textContent = total;
        if (statThreats) {
          statThreats.textContent = threats + warnings;
          if (statThreatsSub) {
            if (threats > 0) {
              statThreatsSub.textContent = `${threats} Yüksek / ${warnings} Uyarı`;
            } else if (warnings > 0) {
              statThreatsSub.textContent = `${warnings} Anomali Uyarısı`;
            } else {
              statThreatsSub.textContent = 'Heuristik Temiz';
            }
          }
        }
        if (statHighRam) statHighRam.textContent = highRam;
        if (statTotalRam) statTotalRam.textContent = `${(totalRamMB / 1024).toFixed(1)} GB`;
      }

      function getFilteredList() {
        return processes.filter(p => {
          // Arama filtresi
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchName = p.name.toLowerCase().includes(q);
            const matchPid = String(p.pid).includes(q);
            const matchPath = (p.path || '').toLowerCase().includes(q);
            if (!matchName && !matchPid && !matchPath) return false;
          }

          // Toggle 1: Yalnızca Şüpheli / Riskli
          if (toggles.suspiciousOnly && !p.isSuspicious) {
            return false;
          }

          // Toggle 2: Sistem Süreçlerini Gizle
          if (toggles.hideSystem) {
            const lPath = (p.path || '').toLowerCase();
            if (lPath.includes('c:\\windows\\') || p.path === 'Erişim Kısıtlı / Sistem Korumalı') {
              return false;
            }
          }

          // Toggle 3: Yüksek Bellek (>1.5 GB)
          if (toggles.highRamOnly && p.memoryMB <= 1500) {
            return false;
          }

          return true;
        });
      }

      function renderProcessRows() {
        if (!tableBody) return;
        const fullList = getFilteredList();

        if (countLabel) {
          countLabel.textContent = `${fullList.length} / ${processes.length} süreç gösteriliyor`;
        }

        if (fullList.length === 0) {
          tableBody.innerHTML = `
            <div style="color: var(--text-3); text-align: center; padding: 48px 24px; font-size: 12px;">
              Filtreye uygun süreç bulunamadı.
            </div>
          `;
          if (moreContainer) moreContainer.style.display = 'none';
          return;
        }

        // Performans: DOM kasmaması için ilk partiyi renderla
        const visibleSlice = fullList.slice(0, displayLimit);
        if (moreContainer) {
          moreContainer.style.display = fullList.length > displayLimit ? 'block' : 'none';
        }

        // Renksiz / Monochrome Nord Badge Mimarisi
        tableBody.innerHTML = visibleSlice.map(p => {
          let riskBadge = '<span class="badge" style="background: transparent; color: var(--text-3); border: 1px solid var(--glass-border-subtle); font-size: 10px; padding: 1.5px 6px;">Normal</span>';
          if (p.riskLevel === 'high') {
            riskBadge = '<span class="badge" style="background: rgba(255, 255, 255, 0.08); color: var(--text-1); border: 1px solid var(--glass-border); font-size: 10px; padding: 1.5px 6px; font-weight: 700;">Kritik</span>';
          } else if (p.riskLevel === 'warning') {
            riskBadge = '<span class="badge" style="background: rgba(255, 255, 255, 0.04); color: var(--text-2); border: 1px solid var(--glass-border-subtle); font-size: 10px; padding: 1.5px 6px;">Uyarı</span>';
          }

          const ramPercent = Math.min(100, Math.round((p.memoryMB / 2048) * 100));

          return `
            <div class="proc-table-row" data-pid="${p.pid}" style="display: grid; grid-template-columns: 80px 2.4fr 120px 140px 110px; padding: 9px 18px; align-items: center; border-bottom: 1px solid var(--glass-border-subtle); font-size: 11.5px; transition: background 120ms ease;">
              <div style="font-family: var(--font-mono); font-weight: 700; color: var(--text-2);">${p.pid}</div>
              <div style="min-width: 0; padding-right: 12px;">
                <div style="font-weight: 700; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${p.name}
                </div>
                <div style="font-size: 10px; color: var(--text-3); font-family: var(--font-mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.path}">
                  ${p.path}
                </div>
              </div>
              <div>${riskBadge}</div>
              <div>
                <div style="font-family: var(--font-mono); font-weight: 600; color: var(--text-1); font-size: 11px;">
                  ${p.memoryMB} MB
                </div>
                <div style="width: 80px; height: 3px; background: rgba(255,255,255,0.08); border-radius: 2px; margin-top: 3px; overflow: hidden;">
                  <div style="width: ${ramPercent}%; height: 100%; background: var(--text-2); border-radius: 2px; opacity: 0.6;"></div>
                </div>
              </div>
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                <button class="btn btn-secondary btn-sm btn-proc-inspect" data-pid="${p.pid}" title="Detayları İncele" style="padding: 3px 8px; font-size: 10.5px;">
                  İncele
                </button>
                <button class="btn btn-secondary btn-sm btn-proc-kill" data-pid="${p.pid}" data-name="${p.name}" title="Süreci Sonlandır" style="padding: 3px 8px; font-size: 10.5px; color: var(--text-2);">
                  ✕
                </button>
              </div>
            </div>
          `;
        }).join('');
      }

      // Performans: Tek bir Event Delegation dinleyicisi (500 ayrı listener yerine 1 listener)
      tableBody.addEventListener('click', async (e) => {
        const inspectBtn = e.target.closest('.btn-proc-inspect');
        if (inspectBtn) {
          e.stopPropagation();
          const pid = parseInt(inspectBtn.getAttribute('data-pid'));
          openProcessDetails(pid);
          return;
        }

        const killBtn = e.target.closest('.btn-proc-kill');
        if (killBtn) {
          e.stopPropagation();
          const pid = parseInt(killBtn.getAttribute('data-pid'));
          const name = killBtn.getAttribute('data-name');
          if (confirm(`'${name}' (PID: ${pid}) sürecini sonlandırmak istediğinize emin misiniz?`)) {
            await killProcessDirect(pid, false);
          }
        }
      });

      // Daha Fazla Göster Butonu
      if (btnShowMore) {
        btnShowMore.addEventListener('click', () => {
          displayLimit += 100;
          renderProcessRows();
        });
      }

      async function openProcessDetails(pid) {
        selectedPid = pid;
        const p = processes.find(item => item.pid === pid);
        if (!p || !detailModal) return;

        if (modalTitle) modalTitle.textContent = `${p.name} İncelemesi`;
        if (modalPidBadge) modalPidBadge.textContent = `PID: ${p.pid}`;
        if (modalContent) modalContent.innerHTML = '<div style="color: var(--text-3); text-align: center; padding: 30px;">Modül telemetrisi taranıyor...</div>';

        if (detailModal.parentElement !== document.body) {
          document.body.appendChild(detailModal);
        }
        detailModal.style.display = 'flex';

        try {
          const details = await window.ulak.invoke('proc-radar:get-details', pid);
          let reasonSection = '';
          if (p.reasons && p.reasons.length > 0) {
            reasonSection = `
              <div class="glass-card" style="padding: 12px 14px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.03); margin-bottom: 12px;">
                <div style="font-size: 11px; font-weight: 700; color: var(--text-1); margin-bottom: 6px;">Heuristik Tehdit İpuçları:</div>
                ${p.reasons.map(r => `<div style="font-size: 11px; color: var(--text-2); margin-bottom: 3px;">• ${r}</div>`).join('')}
              </div>
            `;
          }

          const modulesHtml = (details.modules || []).map(m => `
            <div style="font-size: 10.5px; font-family: var(--font-mono); color: var(--text-2); padding: 4px 6px; border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; justify-content: space-between;">
              <span style="color: var(--text-1); font-weight: 600;">${m.name}</span>
              <span style="color: var(--text-3); overflow: hidden; text-overflow: ellipsis; max-width: 60%;">${m.path}</span>
            </div>
          `).join('');

          if (modalContent) {
            modalContent.innerHTML = `
              ${reasonSection}
              <div class="setting-row glass-soft" style="flex-direction: column; align-items: flex-start; gap: 4px; padding: 10px 14px;">
                <div style="font-size: 10px; color: var(--text-3); text-transform: uppercase; font-weight: 700;">Dosya Yolu (Executable):</div>
                <div style="font-size: 11px; color: var(--text-1); font-family: var(--font-mono); word-break: break-all;">${p.path}</div>
              </div>

              <div class="setting-row glass-soft" style="flex-direction: column; align-items: flex-start; gap: 4px; padding: 10px 14px;">
                <div style="font-size: 10px; color: var(--text-3); text-transform: uppercase; font-weight: 700;">Komut Satırı:</div>
                <div style="font-size: 10.5px; color: var(--text-2); font-family: var(--font-mono); word-break: break-all;">${details.commandLine}</div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="setting-row glass-soft" style="padding: 10px 14px;">
                  <span style="font-size: 11px; color: var(--text-3);">Thread Sayısı</span>
                  <span style="font-size: 12px; font-weight: 700; color: var(--text-1); font-family: var(--font-mono);">${details.threadCount}</span>
                </div>
                <div class="setting-row glass-soft" style="padding: 10px 14px;">
                  <span style="font-size: 11px; color: var(--text-3);">Aktif RAM</span>
                  <span style="font-size: 12px; font-weight: 700; color: var(--text-1); font-family: var(--font-mono);">${p.memoryMB} MB</span>
                </div>
              </div>

              <div class="view-section glass-card" style="padding: 12px 14px; margin-top: 4px;">
                <div style="font-size: 11px; font-weight: 700; color: var(--text-1); margin-bottom: 8px;">Yüklü DLL Modülleri (${(details.modules || []).length}):</div>
                <div style="max-height: 140px; overflow-y: auto;">
                  ${modulesHtml || '<div style="color: var(--text-3); font-size: 11px;">Modül bilgisi alınamadı.</div>'}
                </div>
              </div>
            `;
          }
        } catch (e) {
          if (modalContent) modalContent.innerHTML = `<div style="color: var(--text-2); text-align: center; padding: 20px;">Hata: ${e.message}</div>`;
        }
      }

      function closeModal() {
        if (detailModal) detailModal.style.display = 'none';
        selectedPid = null;
      }

      async function killProcessDirect(pid, forceTree) {
        if (!window.ulak || !pid) return;
        try {
          const res = await window.ulak.invoke('proc-radar:kill-process', pid, forceTree);
          if (res && res.success) {
            if (window.UlakUI) window.UlakUI.toast(res.message, 'success');
            closeModal();
            await fetchProcesses(true);
          } else {
            if (window.UlakUI) window.UlakUI.toast(res.message || 'Süreç sonlandırılamadı.', 'error');
          }
        } catch (e) {
          if (window.UlakUI) window.UlakUI.toast(`Hata: ${e.message}`, 'error');
        }
      }

      // Debounced Arama Girişi (Kasmayı önler)
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          clearTimeout(searchDebounceTimer);
          searchDebounceTimer = setTimeout(() => {
            searchQuery = e.target.value.trim();
            displayLimit = 100;
            renderProcessRows();
          }, 180);
        });
      }

      // Manuel Yenile Butonu
      if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
          await fetchProcesses(true);
          if (window.UlakUI) window.UlakUI.toast('Süreç tablosu güncellendi.', 'info');
        });
      }

      // Gerçek Toggle Seçim Alanları Bağlantıları
      if (toggleSuspicious) {
        toggleSuspicious.addEventListener('change', (e) => {
          toggles.suspiciousOnly = e.target.checked;
          displayLimit = 100;
          renderProcessRows();
        });
      }
      if (labelSuspicious && toggleSuspicious) {
        labelSuspicious.addEventListener('click', () => {
          toggleSuspicious.checked = !toggleSuspicious.checked;
          toggleSuspicious.dispatchEvent(new Event('change'));
        });
      }

      if (toggleHideSystem) {
        toggleHideSystem.addEventListener('change', (e) => {
          toggles.hideSystem = e.target.checked;
          displayLimit = 100;
          renderProcessRows();
        });
      }
      if (labelHideSystem && toggleHideSystem) {
        labelHideSystem.addEventListener('click', () => {
          toggleHideSystem.checked = !toggleHideSystem.checked;
          toggleHideSystem.dispatchEvent(new Event('change'));
        });
      }

      if (toggleHighRam) {
        toggleHighRam.addEventListener('change', (e) => {
          toggles.highRamOnly = e.target.checked;
          displayLimit = 100;
          renderProcessRows();
        });
      }
      if (labelHighRam && toggleHighRam) {
        labelHighRam.addEventListener('click', () => {
          toggleHighRam.checked = !toggleHighRam.checked;
          toggleHighRam.dispatchEvent(new Event('change'));
        });
      }

      // Otomatik Yenile Toggle
      if (autoToggle) {
        autoToggle.addEventListener('change', (e) => {
          isAutoRefresh = e.target.checked;
          if (isAutoRefresh) {
            startAutoRefresh();
          } else {
            stopAutoRefresh();
          }
        });
      }

      // Modal Kapatma
      if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
      if (btnCloseDone) btnCloseDone.addEventListener('click', closeModal);
      if (detailModal) {
        detailModal.addEventListener('click', (e) => {
          if (e.target === detailModal) closeModal();
        });
      }

      // Modal Kill Butonları
      if (btnKillSingle) {
        btnKillSingle.addEventListener('click', async () => {
          if (selectedPid && confirm(`PID ${selectedPid} sürecini sonlandırmak istiyor musunuz?`)) {
            await killProcessDirect(selectedPid, false);
          }
        });
      }

      if (btnKillTree) {
        btnKillTree.addEventListener('click', async () => {
          if (selectedPid && confirm(`PID ${selectedPid} sürecini ve tüm alt dallarını (Process Tree) ZORLA sonlandırmak istiyor musunuz?`)) {
            await killProcessDirect(selectedPid, true);
          }
        });
      }

      function startAutoRefresh() {
        stopAutoRefresh();
        // 8 saniyede bir hafif yenileme
        autoRefreshInterval = setInterval(() => {
          if (isAutoRefresh && !selectedPid) {
            fetchProcesses();
          }
        }, 8000);
      }

      function stopAutoRefresh() {
        if (autoRefreshInterval) {
          clearInterval(autoRefreshInterval);
          autoRefreshInterval = null;
        }
      }

      // İlk yükleme
      await fetchProcesses();
      startAutoRefresh();
    },

    unmount() {
      // 1. KRİTİK PERFORMANS FİX: Sayfadan çıkıldığında arka plan interval'ini kesinlikle durdur!
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
      }
      clearTimeout(searchDebounceTimer);

      // 2. Body'ye taşınmış modal varsa temizle
      const modal = document.getElementById('radar-detail-modal');
      if (modal) modal.remove();
    }
  };

  window.UlakRouter.register(view);
})();
