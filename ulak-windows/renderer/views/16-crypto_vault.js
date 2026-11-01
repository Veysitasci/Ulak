// VIEW 16: KRİPTO KASA & STEGANOGRAFİ (CRYPTO VAULT & STEGANOGRAPHY)
(function() {
  let activeSubtab = 'encrypt'; // 'encrypt' | 'stego' | 'notes' | 'passgen' | 'seal'
  let cachedNotes = [];
  let currentMasterPassword = '';

  const view = {
    id: 'crypto_vault',
    title: 'Kripto Kasa',
    icon: 'lock',

    render() {
      const C = window.UlakComponents;
      return `
        <div class="crypto-vault-view">
          ${C.headerCard('Kripto Kasa & Steganografi', 'AES-256-GCM Dosya Şifreleme, Görsel İçi Steganografi, Gizli Notlar ve Dijital Mühür', 'lock')}

          <!-- Subtab Segmented Bar -->
          <div class="view-section glass-card" style="padding: 10px 14px; margin-bottom: 16px;">
            <div class="segmented-control glass-soft" style="flex-wrap: wrap; gap: 4px;">
              <button class="segmented-btn active" data-sub="encrypt">Dosya Şifreleme</button>
              <button class="segmented-btn" data-sub="stego">Görsel Steganografi</button>
              <button class="segmented-btn" data-sub="notes">Gizli Not Defteri</button>
              <button class="segmented-btn" data-sub="passgen">Parola Üretici</button>
              <button class="segmented-btn" data-sub="seal">Dijital Mühür</button>
            </div>
          </div>

          <!-- SUBTAB 1: AES-256-GCM FILE ENCRYPTION -->
          <div class="subtab-pane active" id="vault-subpane-encrypt">
            <div class="grid-2" style="gap: 14px; margin-bottom: 16px;">
              <!-- Encrypt Card -->
              <div class="view-section glass-card liquid-glow">
                <div class="view-section-header">
                  <div class="view-section-title">
                    ${window.UlakIcons.getIcon('lock', 'icon-mono-xs')} Dosya Şifreleme (AES-256-GCM)
                  </div>
                  <span class="chip chip-accent">Askeri Düzey</span>
                </div>
                <p style="font-size: 12px; color: var(--text-2); margin-bottom: 14px;">
                  Herhangi bir belge, arşiv veya medyayı 100.000 iterasyonlu PBKDF2 ve AES-256-GCM ile parola korumalı <code>.ulak</code> konteynerine dönüştürür.
                </p>
                <div class="field" style="margin-bottom: 12px;">
                  <label class="field-label">Şifreleme Parolası</label>
                  <input type="password" id="vault-enc-pass" class="field-input" placeholder="Güçlü bir parola belirleyin">
                </div>
                <button class="btn btn-primary" id="vault-btn-select-encrypt" style="width: 100%;">
                  ${window.UlakIcons.getIcon('lock', 'icon-mono-xs')} Dosya Seç ve Şifrele
                </button>
              </div>

              <!-- Decrypt Card -->
              <div class="view-section glass-card liquid-glow">
                <div class="view-section-header">
                  <div class="view-section-title">
                    ${window.UlakIcons.getIcon('key', 'icon-mono-xs')} Kasa Çözme (.ulak Dosyası)
                  </div>
                  <span class="chip">Orijinale Dönüştür</span>
                </div>
                <p style="font-size: 12px; color: var(--text-2); margin-bottom: 14px;">
                  Daha önce şifrelenmiş <code>.ulak</code> kasa dosyasını seçip doğru parolayı girerek orijinal durumuna geri döndürün.
                </p>
                <div class="field" style="margin-bottom: 12px;">
                  <label class="field-label">Kasa Parolası</label>
                  <input type="password" id="vault-dec-pass" class="field-input" placeholder="Dosyanın parolasını girin">
                </div>
                <button class="btn btn-secondary" id="vault-btn-select-decrypt" style="width: 100%;">
                  ${window.UlakIcons.getIcon('key', 'icon-mono-xs')} .ulak Kasası Seç ve Çöz
                </button>
              </div>
            </div>
          </div>

          <!-- SUBTAB 2: STEGANOGRAPHY LABORATORY -->
          <div class="subtab-pane" id="vault-subpane-stego" style="display: none;">
            <div class="view-section glass-card liquid-glow" style="margin-bottom: 16px;">
              <div class="view-section-header">
                <div class="view-section-title">
                  ${window.UlakIcons.getIcon('video', 'icon-mono-xs')} Görsel İçi Steganografi Laboratuvarı
                </div>
                <span class="chip chip-accent">Görünmez Mesaj</span>
              </div>
              <p style="font-size: 12px; color: var(--text-2); margin-bottom: 14px;">
                Gizli mesajlarınızı veya şifrelerinizi bir görselin (PNG/JPG/BMP) içine gömün. Görsel normal açılır ve dışarıdan bakıldığında hiçbir fark anlaşılmaz.
              </p>

              <div class="grid-2" style="gap: 14px;">
                <!-- Embed Side -->
                <div class="setting-row glass-soft" style="flex-direction: column; align-items: flex-start; gap: 10px;">
                  <span class="setting-title">Görsele Gizli Mesaj Göm</span>
                  <div style="display:flex; gap:8px; width: 100%;">
                    <input type="text" id="stego-embed-file-path" class="field-input" placeholder="Görsel yolu seçilmedi" readonly style="flex:1;">
                    <button class="btn btn-secondary btn-sm" id="stego-btn-pick-embed">Görsel Seç</button>
                  </div>
                  <textarea id="stego-embed-text" class="field-input" rows="3" placeholder="Görsel içine gizlenecek metin veya parola..." style="width: 100%;"></textarea>
                  <input type="password" id="stego-embed-pass" class="field-input" placeholder="İsteğe bağlı ek şifreleme parolası" style="width: 100%;">
                  <button class="btn btn-primary btn-sm" id="stego-btn-run-embed" style="width: 100%;">
                    Görselin İçine Gizle
                  </button>
                </div>

                <!-- Extract Side -->
                <div class="setting-row glass-soft" style="flex-direction: column; align-items: flex-start; gap: 10px;">
                  <span class="setting-title">Görseldeki Gizli Mesajı Çıkar</span>
                  <div style="display:flex; gap:8px; width: 100%;">
                    <input type="text" id="stego-extract-file-path" class="field-input" placeholder="Görsel yolu seçilmedi" readonly style="flex:1;">
                    <button class="btn btn-secondary btn-sm" id="stego-btn-pick-extract">Görsel Seç</button>
                  </div>
                  <input type="password" id="stego-extract-pass" class="field-input" placeholder="Varsa şifreleme parolasını girin" style="width: 100%;">
                  <button class="btn btn-secondary btn-sm" id="stego-btn-run-extract" style="width: 100%;">
                    Gizli Veriyi Çıkar
                  </button>
                  <textarea id="stego-extracted-result" class="field-input" rows="3" placeholder="Çıkarılan gizli mesaj burada görünecektir..." readonly style="width: 100%; background: var(--glass-surface);"></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- SUBTAB 3: ENCRYPTED SECRET NOTES -->
          <div class="subtab-pane" id="vault-subpane-notes" style="display: none;">
            <div class="view-section glass-card liquid-glow">
              <div class="view-section-header">
                <div class="view-section-title">
                  ${window.UlakIcons.getIcon('fileText', 'icon-mono-xs')} Kasa Gizli Not Defteri
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                  <input type="password" id="vault-master-pass" class="field-input" placeholder="Kasa Ana Parolası" style="width: 180px;">
                  <button class="btn btn-primary btn-sm" id="vault-btn-unlock-notes">Kasayı Aç</button>
                </div>
              </div>
              
              <div id="vault-notes-content" style="display: none;">
                <div style="display:flex; gap:8px; margin-bottom: 12px;">
                  <input type="text" id="vault-note-title" class="field-input" placeholder="Not Başlığı (örn: Sunucu SSH Anahtarı)" style="flex:1;">
                  <button class="btn btn-primary btn-sm" id="vault-btn-add-note">+ Not Ekle</button>
                </div>
                <textarea id="vault-note-body" class="field-input" rows="3" placeholder="Gizli notunuzun içeriği..." style="width:100%; margin-bottom:12px;"></textarea>

                <div id="vault-notes-list" style="display:flex; flex-direction:column; gap:8px;"></div>
              </div>

              <div id="vault-notes-locked-msg" style="text-align:center; padding: 24px; color: var(--text-2);">
                Notlarınızı görüntülemek ve düzenlemek için lütfen yukarıya Kasa Ana Parolanızı girip "Kasayı Aç" butonuna basın.
              </div>
            </div>
          </div>

          <!-- SUBTAB 4: PASSWORD GENERATOR -->
          <div class="subtab-pane" id="vault-subpane-passgen" style="display: none;">
            <div class="view-section glass-card liquid-glow">
              <div class="view-section-header">
                <div class="view-section-title">
                  ${window.UlakIcons.getIcon('key', 'icon-mono-xs')} Kriptografik Güçlü Parola Üretici
                </div>
                <span class="chip chip-accent" id="passgen-strength-chip">Çok Güçlü</span>
              </div>

              <div class="setting-row glass-soft" style="align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <div id="passgen-display" style="font-family: monospace; font-size: 18px; font-weight: 700; color: var(--accent); letter-spacing: 1px; font-variant-numeric: tabular-nums;">
                  Tıklayarak üretin
                </div>
                <div style="display:flex; gap:8px;">
                  <button class="btn btn-secondary btn-sm" id="passgen-btn-copy">Kopyala</button>
                  <button class="btn btn-primary btn-sm" id="passgen-btn-generate">Yeni Parola</button>
                </div>
              </div>

              <div class="grid-2" style="gap: 12px;">
                <div class="field">
                  <label class="field-label">Karakter Uzunluğu: <strong id="passgen-len-label" style="font-variant-numeric: tabular-nums;">20</strong></label>
                  <input type="range" id="passgen-len-slider" min="8" max="64" value="20" style="width: 100%;">
                </div>
                <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; font-size:12px;">
                  <label style="display:flex; align-items:center; gap:4px;"><input type="checkbox" id="passgen-opt-upper" checked> Büyük Harf (A-Z)</label>
                  <label style="display:flex; align-items:center; gap:4px;"><input type="checkbox" id="passgen-opt-lower" checked> Küçük Harf (a-z)</label>
                  <label style="display:flex; align-items:center; gap:4px;"><input type="checkbox" id="passgen-opt-nums" checked> Rakamlar (0-9)</label>
                  <label style="display:flex; align-items:center; gap:4px;"><input type="checkbox" id="passgen-opt-syms" checked> Semboller (!@#$)</label>
                </div>
              </div>
            </div>
          </div>

          <!-- SUBTAB 5: DIGITAL SEAL -->
          <div class="subtab-pane" id="vault-subpane-seal" style="display: none;">
            <div class="view-section glass-card liquid-glow">
              <div class="view-section-header">
                <div class="view-section-title">
                  ${window.UlakIcons.getIcon('shield', 'icon-mono-xs')} HMAC-SHA512 Bütünlük Mührü
                </div>
                <span class="chip">Değiştirilemezlik Garantisi</span>
              </div>
              <p style="font-size: 12px; color: var(--text-2); margin-bottom: 14px;">
                Önemli bir dosyanın gelecekte en ufak bir bitinin dahi değiştirilip değiştirilmediğini kanıtlamak için gizli anahtarınızla kriptografik bir mühür üretin.
              </p>
              <div class="field" style="margin-bottom: 12px;">
                <label class="field-label">Gizli Mühür Anahtarı (Secret Salt)</label>
                <input type="text" id="seal-secret-key" class="field-input" placeholder="Gizli anahtarınız (örn: ULAK_SECRET_KEY)" value="ULAK_SEAL_V1">
              </div>
              <button class="btn btn-primary" id="seal-btn-select-file" style="margin-bottom: 14px;">
                ${window.UlakIcons.getIcon('folder', 'icon-mono-xs')} Dosya Seç ve Mühürle
              </button>

              <div id="seal-result-box" style="display:none;" class="setting-row glass-soft">
                <div style="font-family: monospace; font-size: 11px; word-break: break-all; width:100%;" id="seal-result-text"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    mount(el) {
      // 1. Subtab Switcher
      el.querySelectorAll('.segmented-btn[data-sub]').forEach(btn => {
        btn.addEventListener('click', () => {
          el.querySelectorAll('.segmented-btn[data-sub]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const target = btn.getAttribute('data-sub');
          activeSubtab = target;
          el.querySelectorAll('.subtab-pane').forEach(p => {
            p.style.display = p.id === `vault-subpane-${target}` ? 'block' : 'none';
          });
          if (target === 'passgen') generateAndShowPassword(el);
        });
      });

      // 2. File Encrypt & Decrypt
      el.querySelector('#vault-btn-select-encrypt')?.addEventListener('click', async () => {
        const pass = el.querySelector('#vault-enc-pass').value;
        if (!pass || pass.length < 4) {
          return window.UlakUI.toast('Lütfen en az 4 karakterli bir şifreleme parolası girin!', 'warning');
        }
        try {
          window.UlakUI.toast('Dosya seçiliyor ve AES-256-GCM ile şifreleniyor...', 'info');
          const res = await window.ulak.invoke('vault:select-and-encrypt', pass);
          if (res) {
            window.UlakUI.toast(res.message, res.success ? 'success' : 'error');
            if (res.success) el.querySelector('#vault-enc-pass').value = '';
          }
        } catch (e) {
          window.UlakUI.toast(`Hata: ${e.message}`, 'error');
        }
      });

      el.querySelector('#vault-btn-select-decrypt')?.addEventListener('click', async () => {
        const pass = el.querySelector('#vault-dec-pass').value;
        if (!pass) {
          return window.UlakUI.toast('Lütfen kasa parolasını girin!', 'warning');
        }
        try {
          window.UlakUI.toast('Kasa dosyası çözülüyor...', 'info');
          const res = await window.ulak.invoke('vault:select-and-decrypt', pass);
          if (res) {
            window.UlakUI.toast(res.message, res.success ? 'success' : 'error');
            if (res.success) el.querySelector('#vault-dec-pass').value = '';
          }
        } catch (e) {
          window.UlakUI.toast(`Hata: ${e.message}`, 'error');
        }
      });

      // 3. Steganography Embed & Extract
      el.querySelector('#stego-btn-pick-embed')?.addEventListener('click', async () => {
        const path = await window.ulak.invoke('vault:select-image-for-stego');
        if (path) el.querySelector('#stego-embed-file-path').value = path;
      });

      el.querySelector('#stego-btn-run-embed')?.addEventListener('click', async () => {
        const imgPath = el.querySelector('#stego-embed-file-path').value;
        const text = el.querySelector('#stego-embed-text').value;
        const pass = el.querySelector('#stego-embed-pass').value;
        if (!imgPath || !text) {
          return window.UlakUI.toast('Lütfen görsel seçin ve gizlenecek mesajı yazın!', 'warning');
        }
        try {
          const res = await window.ulak.invoke('vault:embed-stego', imgPath, text, pass);
          window.UlakUI.toast(res.message, res.success ? 'success' : 'error');
          if (res.success) {
            el.querySelector('#stego-embed-text').value = '';
          }
        } catch (e) {
          window.UlakUI.toast(`Steganografi hatası: ${e.message}`, 'error');
        }
      });

      el.querySelector('#stego-btn-pick-extract')?.addEventListener('click', async () => {
        const path = await window.ulak.invoke('vault:select-image-for-stego');
        if (path) el.querySelector('#stego-extract-file-path').value = path;
      });

      el.querySelector('#stego-btn-run-extract')?.addEventListener('click', async () => {
        const imgPath = el.querySelector('#stego-extract-file-path').value;
        const pass = el.querySelector('#stego-extract-pass').value;
        if (!imgPath) {
          return window.UlakUI.toast('Lütfen incelenecek görseli seçin!', 'warning');
        }
        try {
          const res = await window.ulak.invoke('vault:extract-stego', imgPath, pass);
          if (res.success) {
            el.querySelector('#stego-extracted-result').value = res.secretMessage;
            window.UlakUI.toast('Gizli mesaj başarıyla çıkarıldı!', 'success');
          } else {
            window.UlakUI.toast(res.message, 'warning');
          }
        } catch (e) {
          window.UlakUI.toast(`Hata: ${e.message}`, 'error');
        }
      });

      // 4. Encrypted Secret Notes
      el.querySelector('#vault-btn-unlock-notes')?.addEventListener('click', async () => {
        const masterPass = el.querySelector('#vault-master-pass').value;
        if (!masterPass) return window.UlakUI.toast('Lütfen kasa ana parolasını girin!', 'warning');

        try {
          const res = await window.ulak.invoke('vault:get-notes', masterPass);
          if (res.success) {
            currentMasterPassword = masterPass;
            cachedNotes = res.notes || [];
            el.querySelector('#vault-notes-locked-msg').style.display = 'none';
            el.querySelector('#vault-notes-content').style.display = 'block';
            renderNotesList(el);
            window.UlakUI.toast('Kasa notları açıldı.', 'success');
          } else {
            window.UlakUI.toast(res.message, 'error');
          }
        } catch (e) {
          window.UlakUI.toast(`Hata: ${e.message}`, 'error');
        }
      });

      el.querySelector('#vault-btn-add-note')?.addEventListener('click', async () => {
        const title = el.querySelector('#vault-note-title').value.trim();
        const body = el.querySelector('#vault-note-body').value.trim();
        if (!title || !body) return window.UlakUI.toast('Not başlığı ve içeriği boş olamaz!', 'warning');

        cachedNotes.unshift({
          id: 'note_' + Date.now(),
          title,
          body,
          date: new Date().toLocaleString('tr-TR')
        });

        try {
          await window.ulak.invoke('vault:save-notes', cachedNotes, currentMasterPassword);
          el.querySelector('#vault-note-title').value = '';
          el.querySelector('#vault-note-body').value = '';
          renderNotesList(el);
          window.UlakUI.toast('Not şifrelenerek kaydedildi.', 'success');
        } catch (e) {
          window.UlakUI.toast(`Kaydetme hatası: ${e.message}`, 'error');
        }
      });

      // 5. Password Generator
      el.querySelector('#passgen-btn-generate')?.addEventListener('click', () => generateAndShowPassword(el));
      el.querySelector('#passgen-len-slider')?.addEventListener('input', (e) => {
        el.querySelector('#passgen-len-label').textContent = e.target.value;
        generateAndShowPassword(el);
      });
      ['upper', 'lower', 'nums', 'syms'].forEach(opt => {
        el.querySelector(`#passgen-opt-${opt}`)?.addEventListener('change', () => generateAndShowPassword(el));
      });
      el.querySelector('#passgen-btn-copy')?.addEventListener('click', () => {
        const pwd = el.querySelector('#passgen-display').innerText;
        navigator.clipboard.writeText(pwd);
        window.UlakUI.toast('Parola panoya kopyalandı.', 'success');
      });

      // 6. HMAC-SHA512 Seal
      el.querySelector('#seal-btn-select-file')?.addEventListener('click', async () => {
        const key = el.querySelector('#seal-secret-key').value || 'ULAK_SEAL_V1';
        try {
          window.UlakUI.toast('Dosya mühürleniyor...', 'info');
          const res = await window.ulak.invoke('vault:select-for-seal', key);
          if (res && res.success) {
            const box = el.querySelector('#seal-result-box');
            const txt = el.querySelector('#seal-result-text');
            box.style.display = 'block';
            txt.innerHTML = `
              <strong>Dosya:</strong> ${window.UlakUI.escapeHtml(res.fileName)} (${Math.round(res.fileSize / 1024)} KB)<br>
              <strong>HMAC-SHA512 Mührü:</strong><br><span style="color:var(--accent); font-variant-numeric:tabular-nums;">${res.seal}</span><br><br>
              <strong>SHA-256 Sağlama:</strong> ${res.sha256}<br>
              <strong>Zaman:</strong> ${res.timestamp}
            `;
            window.UlakUI.toast('Dijital mühür oluşturuldu.', 'success');
          }
        } catch (e) {
          window.UlakUI.toast(`Hata: ${e.message}`, 'error');
        }
      });
    }
  };

  async function generateAndShowPassword(el) {
    const len = parseInt(el.querySelector('#passgen-len-slider').value, 10) || 20;
    const upper = el.querySelector('#passgen-opt-upper').checked;
    const lower = el.querySelector('#passgen-opt-lower').checked;
    const nums = el.querySelector('#passgen-opt-nums').checked;
    const syms = el.querySelector('#passgen-opt-syms').checked;

    try {
      const res = await window.ulak.invoke('vault:generate-password', {
        length: len,
        uppercase: upper,
        lowercase: lower,
        numbers: nums,
        symbols: syms
      });

      el.querySelector('#passgen-display').textContent = res.password;
      const chip = el.querySelector('#passgen-strength-chip');
      chip.textContent = `${res.strength} (${res.entropyBits} bit)`;
      chip.className = `chip ${res.entropyBits > 70 ? 'chip-accent' : 'chip-warning'}`;
    } catch (e) {
      console.error(e);
    }
  }

  function renderNotesList(el) {
    const list = el.querySelector('#vault-notes-list');
    if (!list) return;

    if (cachedNotes.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:12px; color:var(--text-3); font-size:12px;">Henüz kaydedilmiş not yok.</div>`;
      return;
    }

    list.innerHTML = cachedNotes.map(n => {
      return `
        <div class="setting-row glass-soft" style="justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="font-weight:700; font-size:13px; color:var(--text-1);">${window.UlakUI.escapeHtml(n.title)}</div>
            <div style="font-size:12px; color:var(--text-2); margin-top:4px; white-space:pre-wrap;">${window.UlakUI.escapeHtml(n.body)}</div>
            <div style="font-size:10px; color:var(--text-3); margin-top:4px; font-variant-numeric:tabular-nums;">${n.date}</div>
          </div>
          <button class="btn btn-danger-soft btn-sm btn-del-note" data-id="${n.id}">Sil</button>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.btn-del-note').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-id');
        cachedNotes = cachedNotes.filter(n => n.id !== id);
        await window.ulak.invoke('vault:save-notes', cachedNotes, currentMasterPassword);
        renderNotesList(el);
        window.UlakUI.toast('Not silindi.', 'info');
      });
    });
  }

  window.UlakRouter.register(view);
})();
