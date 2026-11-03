// VIEW 15: ANTİVİRÜS & TEHDİT AVCISI (ANTIVIRUS & THREAT DEFENSE)
(function() {
  let lastScannedResult = null;

  const view = {
    id: 'antivirus',
    title: 'Antivirüs & Tehdit',
    icon: 'shield',

    render() {
      const C = window.UlakComponents;
      return `
        <div class="antivirus-view">
          ${C.headerCard('Antivirüs & Tehdit Avcısı', 'Heuristik Dosya Analizi, Shannon Entropisi, Windows Defender Kalkanı ve Güvenli Dosya Parçalayıcı', 'shield', 'antivirus')}

          <!-- Live Defense Bento Stats -->
          <div class="grid-3" style="margin-bottom: var(--space-13);">
            ${C.statTile('DEFENDER KALKANI', 'Sorgulanıyor...', 'Gerçek Zamanlı Koruma', 'av-defender-')}
            ${C.statTile('KARANTİNA KASASI', '0 Dosya', 'İzole Edilmiş Tehditler', 'av-quarantine-')}
            ${C.statTile('HEURİSTİK ENTROPİ', '0.00 / 8.00', 'Polimorfik Kod Analizi', 'av-entropy-')}
          </div>

          <!-- Deep File Inspection & Drop Zone -->
          <div class="view-section glass-card liquid-glow" style="margin-bottom: var(--space-13);">
            <div class="view-section-header">
              <div class="view-section-title">
                ${window.UlakIcons.getIcon('search', 'icon-mono-sm')} Derin Dosya & Heuristik Kod Analiz Laboratuvarı
              </div>
              <button class="btn btn-primary" id="av-btn-choose-file">
                ${window.UlakIcons.getIcon('folder', 'icon-mono-xs')} Analiz İçin Dosya Seç
              </button>
            </div>

            <!-- Drag & Drop Visual Box -->
            <div id="av-drop-zone" class="glass-soft" style="border: 2px dashed var(--glass-border); border-radius: var(--radius-md); padding: 28px 20px; text-align: center; cursor: pointer; transition: all 0.2s ease;">
              <div style="color: var(--accent); margin-bottom: 8px;">
                ${window.UlakIcons.getIcon('shield', 'icon-mono-lg')}
              </div>
              <div style="font-weight: 700; font-size: var(--text-sm); color: var(--text-1); margin-bottom: 4px;">
                Taranacak Dosyayı Buraya Sürükleyip Bırakın
              </div>
              <div style="font-size: var(--text-xs); color: var(--text-2);">
                PNG/JPEG Steganografi, PDF, PE/EXE, Shellcode, PowerShell Gizli Kodları ve Poliglot İkilileri Anında Tespit Eder
              </div>
            </div>

            <!-- Analysis Report Container -->
            <div id="av-scan-report" style="display: none; margin-top: 16px;"></div>
          </div>

          <!-- 3 Advanced Security Centers (Defender, Shredder, USB Radar) -->
          <div class="grid-3" style="margin-bottom: var(--space-13); gap: 12px;">
            <!-- 1. Windows Defender System Scan -->
            <div class="glass-card liquid-glow" style="padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-1); display: flex; align-items: center; gap: 6px;">
                    ${window.UlakIcons.getIcon('zap', 'icon-mono-xs')} Defender Hızlı Tarama
                  </div>
                  <span class="chip chip-accent" id="av-defender-status-badge">Aktif</span>
                </div>
                <div style="font-size: var(--text-2xs); color: var(--text-2); line-height: 1.5; margin-bottom: 12px;">
                  Windows Defender güvenlik motorunu doğrudan tetikleyerek çalışan belleği ve sistem başlangıç dosyalarını tarar.
                </div>
              </div>
              <button class="btn btn-primary btn-sm" id="av-btn-quick-scan" style="width: 100%;">
                ${window.UlakIcons.getIcon('play', 'icon-mono-xs')} Sistemi Şimdi Tara
              </button>
            </div>

            <!-- 2. Secure File Shredder (DoD 5220.22-M) -->
            <div class="glass-card liquid-glow" style="padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-1); display: flex; align-items: center; gap: 6px;">
                    ${window.UlakIcons.getIcon('trash', 'icon-mono-xs')} Güvenli Dosya Parçalayıcı
                  </div>
                  <span class="chip chip-warning">DoD 5220.22-M</span>
                </div>
                <div style="font-size: var(--text-2xs); color: var(--text-2); line-height: 1.5; margin-bottom: 12px;">
                  Gizli veya tehlikeli dosyaları kurtarılamaz biçimde 3 aşamalı (rastgele, ters ve sıfır) üzerine yazarak yok eder.
                </div>
              </div>
              <button class="btn btn-danger-soft btn-sm" id="av-btn-open-shredder" style="width: 100%;">
                ${window.UlakIcons.getIcon('trash', 'icon-mono-xs')} Dosya Seç ve Parçala
              </button>
            </div>

            <!-- 3. USB Autorun & Shortcut Shield -->
            <div class="glass-card liquid-glow" style="padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-1); display: flex; align-items: center; gap: 6px;">
                    ${window.UlakIcons.getIcon('database', 'icon-mono-xs')} USB Sürücü Tehdit Radarı
                  </div>
                  <span class="chip">Removable</span>
                </div>
                <div style="font-size: var(--text-2xs); color: var(--text-2); line-height: 1.5; margin-bottom: 12px;">
                  Takılı harici bellekleri autorun.inf, gizli .vbs, .lnk kısayol virüslerine ve kök dizin zafiyetlerine karşı denetler.
                </div>
              </div>
              <button class="btn btn-secondary btn-sm" id="av-btn-scan-usb" style="width: 100%;">
                ${window.UlakIcons.getIcon('refresh', 'icon-mono-xs')} USB Sürücüleri Tara
              </button>
            </div>
          </div>

          <!-- Quarantine Vault Section -->
          <div class="view-section glass-card">
            <div class="view-section-header">
              <div class="view-section-title">
                ${window.UlakIcons.getIcon('lock', 'icon-mono-sm')} İzole Karantina Kasası
              </div>
              <button class="btn btn-secondary btn-sm" id="av-btn-refresh-quarantine">
                ${window.UlakIcons.getIcon('refresh', 'icon-mono-xs')} Kasayı Yenile
              </button>
            </div>
            <div class="data-table-container glass-soft" id="av-quarantine-container" style="max-height: 300px;"></div>
          </div>
        </div>
      `;
    },

    async mount(el) {
      // 1. Initial status telemetry
      await loadDefenderStatus(el);
      await loadQuarantine(el);

      // 2. File Scan triggers
      const chooseBtn = el.querySelector('#av-btn-choose-file');
      chooseBtn?.addEventListener('click', async () => {
        try {
          const res = await window.ulak.invoke('antivirus:select-and-scan');
          if (res) renderScanReport(el, res);
        } catch (e) {
          window.UlakUI.toast(`Tarama hatası: ${e.message}`, 'error');
        }
      });

      // Drag and drop handling
      const dropZone = el.querySelector('#av-drop-zone');
      if (dropZone) {
        dropZone.addEventListener('click', () => chooseBtn.click());
        dropZone.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropZone.style.borderColor = 'var(--accent)';
          dropZone.style.background = 'var(--glass-surface-hover)';
        });
        dropZone.addEventListener('dragleave', () => {
          dropZone.style.borderColor = 'var(--glass-border)';
          dropZone.style.background = '';
        });
        dropZone.addEventListener('drop', async (e) => {
          e.preventDefault();
          dropZone.style.borderColor = 'var(--glass-border)';
          dropZone.style.background = '';
          const files = e.dataTransfer.files;
          if (files.length > 0) {
            const filePath = files[0].path;
            try {
              window.UlakUI.toast(`'${files[0].name}' analiz ediliyor...`, 'info');
              const res = await window.ulak.invoke('antivirus:scan-file', filePath);
              renderScanReport(el, res);
            } catch (err) {
              window.UlakUI.toast(`Analiz hatası: ${err.message}`, 'error');
            }
          }
        });
      }

      // 3. Defender Quick Scan
      el.querySelector('#av-btn-quick-scan')?.addEventListener('click', async () => {
        const btn = el.querySelector('#av-btn-quick-scan');
        btn.disabled = true;
        btn.innerHTML = `${window.UlakIcons.getIcon('refresh', 'icon-mono-xs spin')} Taranıyor...`;
        window.UlakUI.toast('Windows Defender hızlı sistem taraması arka planda başlatıldı.', 'info');
        try {
          const res = await window.ulak.invoke('antivirus:quick-scan');
          window.UlakUI.toast(res.message, res.success ? 'success' : 'warning');
        } catch (e) {
          window.UlakUI.toast(`Hata: ${e.message}`, 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = `${window.UlakIcons.getIcon('play', 'icon-mono-xs')} Sistemi Şimdi Tara`;
          await loadDefenderStatus(el);
        }
      });

      // 4. File Shredder trigger
      el.querySelector('#av-btn-open-shredder')?.addEventListener('click', async () => {
        const ok = await window.UlakUI.confirm(
          'Kalıcı Dosya Parçalayıcı (Shredder)',
          'Seçeceğiniz dosya DoD 5220.22-M standardına uygun olarak 3 aşamalı (rastgele baytlar, 0xFF ve 0x00) ile ezilerek yok edilecektir. Geri getirilmesi imkansızdır. Devam etmek istiyor musunuz?',
          'Dosya Seç & Yok Et'
        );
        if (ok) {
          try {
            window.UlakUI.toast('Parçalama işlemi başlatılıyor...', 'info');
            const res = await window.ulak.invoke('antivirus:select-and-shred', 3);
            if (res) {
              window.UlakUI.toast(res.message, res.success ? 'success' : 'error');
            }
          } catch (e) {
            window.UlakUI.toast(`Parçalama hatası: ${e.message}`, 'error');
          }
        }
      });

      // 5. USB Scan
      el.querySelector('#av-btn-scan-usb')?.addEventListener('click', async () => {
        try {
          window.UlakUI.toast('Takılı USB bellekler taranıyor...', 'info');
          const res = await window.ulak.invoke('antivirus:scan-usb');
          if (!res.drives || res.drives.length === 0) {
            return window.UlakUI.toast('Sistemde takılı çıkarılabilir USB sürücü bulunamadı.', 'info');
          }
          let out = `<div style="display:flex; flex-direction:column; gap:8px;">`;
          res.drives.forEach(d => {
            out += `
              <div class="setting-row glass-soft" style="margin-bottom:0;">
                <div>
                  <div style="font-weight:700;">${d.driveLetter}: [${window.UlakUI.escapeHtml(d.label)}]</div>
                  <div style="font-size:11px; color:var(--text-2);">Boyut: ${d.sizeGB} GB | Durum: ${d.status}</div>
                  ${d.threats.length > 0 ? `<div style="color:var(--danger); font-size:11px; margin-top:4px;">Bulgular: ${d.threats.join(', ')}</div>` : ''}
                </div>
                <span class="chip ${d.threats.length > 0 ? 'chip-danger' : 'chip-accent'}">${d.status}</span>
              </div>
            `;
          });
          out += `</div>`;
          window.UlakUI.modal('USB Sürücü Tehdit Raporu', out, '<button class="btn btn-primary" onclick="window.UlakUI.closeModal()">Kapat</button>');
        } catch (e) {
          window.UlakUI.toast(`USB tarama hatası: ${e.message}`, 'error');
        }
      });

      // 6. Quarantine Refresh
      el.querySelector('#av-btn-refresh-quarantine')?.addEventListener('click', () => loadQuarantine(el));
    }
  };

  async function loadDefenderStatus(el) {
    try {
      const def = await window.ulak.invoke('antivirus:get-defender-status');
      const valEl = el.querySelector('#av-defender-val');
      const subEl = el.querySelector('#av-defender-sub');
      const badge = el.querySelector('#av-defender-status-badge');

      if (def && def.realTimeProtection) {
        if (valEl) valEl.textContent = 'Gerçek Zamanlı Aktif';
        if (subEl) subEl.textContent = `İmza Sürümü: ${def.signatureVersion || 'Güncel'}`;
        if (badge) {
          badge.textContent = 'Korunuyor';
          badge.className = 'chip chip-accent';
        }
      } else {
        if (valEl) valEl.textContent = 'Kalkan Kapalı';
        if (subEl) subEl.textContent = 'Windows Defender pasif durumda';
        if (badge) {
          badge.textContent = 'Devre Dışı';
          badge.className = 'chip chip-warning';
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  function renderScanReport(el, res) {
    lastScannedResult = res;
    const reportBox = el.querySelector('#av-scan-report');
    if (!reportBox) return;

    if (!res || !res.success) {
      window.UlakUI.toast(res?.message || 'Tarama başarısız.', 'error');
      return;
    }

    const entropyEl = el.querySelector('#av-entropy-val');
    const entropySub = el.querySelector('#av-entropy-sub');
    if (entropyEl) entropyEl.textContent = `${res.entropy} / 8.00`;
    if (entropySub) entropySub.textContent = res.entropy > 7.7 ? 'Yüksek Entropi (Şüpheli)' : 'Normal Entropi Aralığı';

    const isThreat = (res.threats && res.threats.length > 0) || res.entropy > 7.7;
    const sizeKB = Math.round(res.fileSize / 1024);

    let threatsListHtml = '';
    if (res.threats && res.threats.length > 0) {
      threatsListHtml = `
        <div style="margin-top: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); padding: 10px 14px;">
          <div style="font-weight: 700; color: var(--danger); font-size: 12px; margin-bottom: 6px;">Tespit Edilen Güvenlik Tehditleri:</div>
          <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: var(--text-1);">
            ${res.threats.map(t => `<li><strong>[${t.severity}]</strong> ${window.UlakUI.escapeHtml(t.description)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    reportBox.style.display = 'block';
    reportBox.innerHTML = `
      <div class="glass-card" style="padding: 16px; border-left: 4px solid ${res.verdictColor || 'var(--accent)'};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div>
            <div style="font-size: var(--text-sm); font-weight: 700; color: var(--text-1);">${window.UlakUI.escapeHtml(res.fileName)}</div>
            <div style="font-size: var(--text-2xs); color: var(--text-2); font-family: monospace;">${window.UlakUI.escapeHtml(res.filePath)}</div>
          </div>
          <span class="chip" style="background: ${res.verdictColor || 'var(--accent)'}; color: #fff; font-weight: 700;">
            ${res.verdict}
          </span>
        </div>

        <div class="grid-3" style="margin-bottom: 12px; gap: 8px;">
          <div class="setting-row glass-soft" style="margin-bottom:0; flex-direction:column; align-items:flex-start;">
            <span style="font-size:11px; color:var(--text-3);">Dosya Türü & Yapı</span>
            <span style="font-weight:600; font-size:12px;">${res.detectedFormat}</span>
          </div>
          <div class="setting-row glass-soft" style="margin-bottom:0; flex-direction:column; align-items:flex-start;">
            <span style="font-size:11px; color:var(--text-3);">Boyut & Entropi Skoru</span>
            <span style="font-weight:600; font-size:12px; font-variant-numeric: tabular-nums;">${sizeKB} KB | ${res.entropy}</span>
          </div>
          <div class="setting-row glass-soft" style="margin-bottom:0; flex-direction:column; align-items:flex-start;">
            <span style="font-size:11px; color:var(--text-3);">Bölümler / Segmentler</span>
            <span style="font-weight:600; font-size:11px;">${res.chunksOrSegments || 'Normal'}</span>
          </div>
        </div>

        <div style="margin-bottom: 12px; font-size: 11px; color: var(--text-2); font-variant-numeric: tabular-nums; font-family: monospace; word-break: break-all;">
          SHA-256: ${res.sha256}<br>
          MD5: ${res.md5}
        </div>

        ${threatsListHtml}

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px;">
          <button class="btn btn-secondary btn-sm" id="av-btn-quarantine-scanned">
            ${window.UlakIcons.getIcon('lock', 'icon-mono-xs')} Karantinaya Al
          </button>
          <button class="btn btn-danger-soft btn-sm" id="av-btn-shred-scanned">
            ${window.UlakIcons.getIcon('trash', 'icon-mono-xs')} Kalıcı Parçala (DoD)
          </button>
        </div>
      </div>
    `;

    // Wire action buttons
    reportBox.querySelector('#av-btn-quarantine-scanned')?.addEventListener('click', async () => {
      try {
        const qRes = await window.ulak.invoke('antivirus:quarantine-file', res.filePath);
        window.UlakUI.toast(qRes.message, qRes.success ? 'success' : 'error');
        reportBox.style.display = 'none';
        await loadQuarantine(el);
      } catch (e) {
        window.UlakUI.toast(`Karantina hatası: ${e.message}`, 'error');
      }
    });

    reportBox.querySelector('#av-btn-shred-scanned')?.addEventListener('click', async () => {
      const ok = await window.UlakUI.confirm('Dosyayı Parçala', `'${res.fileName}' dosyası 3 aşamalı DoD standardında kalıcı olarak silinecektir. Emin misiniz?`, 'Parçala ve Yok Et');
      if (ok) {
        try {
          const sRes = await window.ulak.invoke('antivirus:shred-file', res.filePath, 3);
          window.UlakUI.toast(sRes.message, sRes.success ? 'success' : 'error');
          reportBox.style.display = 'none';
        } catch (e) {
          window.UlakUI.toast(`Hata: ${e.message}`, 'error');
        }
      }
    });
  }

  async function loadQuarantine(el) {
    const container = el.querySelector('#av-quarantine-container');
    const badgeVal = el.querySelector('#av-quarantine-val');
    if (!container) return;

    window.UlakUI.state(container, 'loading', { title: 'Karantina kasası kontrol ediliyor...' });

    try {
      const list = await window.ulak.invoke('antivirus:get-quarantine');
      if (badgeVal) badgeVal.textContent = `${list.length} Dosya`;

      if (!list || list.length === 0) {
        return window.UlakUI.state(container, 'empty', { title: 'Karantina kasası boş — Tehdit bulunmuyor' });
      }

      const rows = list.map(item => {
        const sizeKB = Math.round((item.fileSize || 0) / 1024);
        return `
          <tr>
            <td style="font-weight: 600;">
              <div>${window.UlakUI.escapeHtml(item.originalName)}</div>
              <div style="font-size: 11px; color: var(--text-3); font-family: monospace;">${window.UlakUI.escapeHtml(item.originalPath)}</div>
            </td>
            <td><span class="chip" style="font-variant-numeric: tabular-nums;">${sizeKB} KB</span></td>
            <td><span style="font-size: 12px; color: var(--text-2); font-variant-numeric: tabular-nums;">${item.quarantineDate}</span></td>
            <td>
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-secondary btn-sm btn-q-restore" data-id="${item.id}">Geri Yükle</button>
                <button class="btn btn-danger-soft btn-sm btn-q-delete" data-id="${item.id}">Kalıcı Sil</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>İzole Dosya Adı & Konumu</th>
              <th>Boyut</th>
              <th>Karantina Tarihi</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;

      container.querySelectorAll('.btn-q-restore').forEach(b => {
        b.addEventListener('click', async () => {
          const id = b.getAttribute('data-id');
          try {
            const res = await window.ulak.invoke('antivirus:restore-quarantine', id);
            window.UlakUI.toast(res.message, res.success ? 'success' : 'error');
            await loadQuarantine(el);
          } catch (e) {
            window.UlakUI.toast(`Hata: ${e.message}`, 'error');
          }
        });
      });

      container.querySelectorAll('.btn-q-delete').forEach(b => {
        b.addEventListener('click', async () => {
          const id = b.getAttribute('data-id');
          const ok = await window.UlakUI.confirm('Karantina Dosyasını Sil', 'Bu izole dosya kalıcı olarak sistemden silinecektir. Emin misiniz?', 'Kalıcı Sil');
          if (ok) {
            try {
              const res = await window.ulak.invoke('antivirus:delete-quarantine', id);
              window.UlakUI.toast(res.message, res.success ? 'info' : 'error');
              await loadQuarantine(el);
            } catch (e) {
              window.UlakUI.toast(`Hata: ${e.message}`, 'error');
            }
          }
        });
      });
    } catch (err) {
      window.UlakUI.state(container, 'error', { desc: err.message });
    }
  }

  window.UlakRouter.register(view);
})();
