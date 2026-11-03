// VIEW 14: AYARLAR & SİSTEM YÖNETİMİ — NATIVE ULAK LIQUID GLASS (RENKSİZ İKONLAR & TOGGLE SWITCH MASKOT SEÇİMİ)
(function() {
  const view = {
    id: 'settings',
    title: 'Ayarlar',
    icon: 'settings',

    render() {
      const families = window.UlakTheme.families || {};
      const curFam = window.UlakTheme.currentFamily || 'nord';
      const curMode = window.UlakTheme.currentMode || 'dark';
      const activeVariant = families[curFam] ? families[curFam][curMode] : null;
      const curThemeName = activeVariant ? activeVariant.name : 'Nord';

      // Tema seçenek kartları (İkonsuz, saf renk ve tipografi)
      const themeOptionsHtml = Object.entries(families).map(([key, fam]) => {
        const isActive = curFam === key;
        const variant = fam[curMode] || fam.dark;
        const swatches = (variant.preview || []).map(c => `<span style="display:inline-block; width:9px; height:14px; border-radius:2px; background:${c}; margin-right:2px;"></span>`).join('');
        return `
          <button class="btn btn-secondary btn-sm theme-choice-btn ${isActive ? 'active' : ''}" data-family-id="${key}" style="flex-direction: column; align-items: flex-start; height: auto; padding: 10px 12px; width: 100%; border-color: ${isActive ? 'var(--accent)' : 'var(--glass-border)'}; background: ${isActive ? 'var(--accent-soft)' : 'var(--glass-surface)'}; border-radius: var(--r-sm); cursor: pointer; transition: all var(--transition-fast);">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 6px;">
              <span style="font-weight: 700; font-size: 11px; color: ${isActive ? 'var(--accent)' : 'var(--text-1)'};">${fam.name}</span>
              ${isActive ? `<span style="color: var(--accent); font-weight: 900; font-size: 11px;">✓</span>` : ''}
            </div>
            <div style="display: flex; align-items: center;">${swatches}</div>
            <div style="font-size: 9.5px; color: var(--text-3); margin-top: 5px;">${variant.subtitle}</div>
          </button>
        `;
      }).join('');

      return `
        <div class="settings-full-view" style="display: flex; flex-direction: column; height: 100%; width: 100%; position: relative;">
          
          <!-- ÜST GERİ ÇUBUĞU (ARKASI OLMAYAN ŞEFFAF GERİ İKONU VE ANA SAYFAYA DÖN) -->
          <div class="settings-top-header" style="display: flex; align-items: center; justify-content: space-between; padding: 0 0 var(--space-13) 0; border-bottom: 1px solid var(--glass-border); margin-bottom: var(--space-13);">
            <button id="btn-settings-back-home" class="settings-back-link" title="Ana Sayfaya Dön" style="background: none; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; gap: var(--space-8); color: var(--text-2); outline: none; transition: color var(--transition-fast);">
              <!-- Arkasında kutu/buton çerçevesi olmayan saf SVG geri oku -->
              <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span style="font-size: var(--text-sm); font-weight: 700; color: var(--text-1);">Ana Sayfaya Dön</span>
            </button>
            <span class="chip chip-accent" style="font-size: 10px; font-weight: 700;">AYARLAR</span>
          </div>

          <!-- MASTER-DETAIL ANA GÖVDE -->
          <div class="settings-master-detail-body" style="display: flex; gap: var(--space-13); flex: 1; min-height: 0;">
            
            <!-- SOL PANEL: AYARLARIN ÖN KATEGORİLERİ (RENKSİZ VEKTÖR İKONLAR & NATIVE ULAK SIDEBAR STİLİ) -->
            <aside class="settings-nav-sidebar glass-card" style="width: 220px; flex-shrink: 0; padding: var(--space-8) 0; border-radius: var(--r-md); display: flex; flex-direction: column; gap: 2px;">
              <div class="sidebar-section-title" style="padding: 0 var(--space-13); margin-bottom: var(--space-5);">KATEGORİLER</div>
              
              <button class="sidebar-btn settings-category-btn active" data-tab="general">
                <span class="sidebar-btn-icon">${window.UlakIcons.getIcon('sliders', 'icon-mono-sm')}</span>
                <span class="sidebar-btn-text">Genel & Sistem</span>
              </button>
              <button class="sidebar-btn settings-category-btn" data-tab="appearance">
                <span class="sidebar-btn-icon">${window.UlakIcons.getIcon('palette', 'icon-mono-sm')}</span>
                <span class="sidebar-btn-text">Görünüm & Tema</span>
              </button>
              <button class="sidebar-btn settings-category-btn" data-tab="pet">
                <span class="sidebar-btn-icon">${window.UlakIcons.getIcon('pet', 'icon-mono-sm')}</span>
                <span class="sidebar-btn-text">Masaüstü Maskotu</span>
              </button>
              <button class="sidebar-btn settings-category-btn" data-tab="security">
                <span class="sidebar-btn-icon">${window.UlakIcons.getIcon('shield', 'icon-mono-sm')}</span>
                <span class="sidebar-btn-text">Modül Yetki Matrisi</span>
              </button>
              <button class="sidebar-btn settings-category-btn" data-tab="about">
                <span class="sidebar-btn-icon">${window.UlakIcons.getIcon('info', 'icon-mono-sm')}</span>
                <span class="sidebar-btn-text">İstasyon Hakkında</span>
              </button>
            </aside>

            <!-- SAĞ ALAN: DETAY VE FORM ELEMANLARI (RENKSİZ İKONLAR & WINDOWS 11 TOGGLE SWITCHLER) -->
            <main class="settings-details-panel" style="flex: 1; overflow-y: auto; padding-right: 4px;">

              <!-- ==================== TAB 1: GENEL & SİSTEM ==================== -->
              <div class="settings-panel active" id="panel-general" style="display: flex; flex-direction: column; gap: var(--space-13);">
                <div class="view-section glass-card liquid-glow">
                  <div class="view-section-header" style="display: flex; align-items: center; gap: 8px;">
                    ${window.UlakIcons.getIcon('cpu', 'icon-mono')}
                    <div class="view-section-title">Windows Sistem Entegrasyonu</div>
                  </div>
                  
                  <div class="setting-row glass-soft">
                    <div class="setting-row-left" style="gap: 0;">
                      <div>
                        <div class="setting-title">Windows ile Otomatik Başlat</div>
                        <div class="setting-subtitle">Bilgisayar açıldığında ULAK arka planda sessizce hazır konuma geçer</div>
                      </div>
                    </div>
                    <label class="switch">
                      <input type="checkbox" id="settings-autostart-toggle">
                      <span class="switch-slider"></span>
                    </label>
                  </div>

                  <div class="setting-row glass-soft">
                    <div class="setting-row-left" style="gap: 0;">
                      <div>
                        <div class="setting-title">Telemetri Güncelleme Sıklığı</div>
                        <div class="setting-subtitle">Canlı CPU, Bellek ve Donanım telemetrisinin yenilenme periyodu</div>
                      </div>
                    </div>
                    <div class="select-encased" style="width: 175px;">
                      <select id="settings-telemetry-rate" class="field-input select-custom" style="padding: 6px 10px; border-radius: var(--r-xs); border: 1px solid var(--glass-border); background: var(--glass-surface); color: var(--text-1); font-size: 11px; width: 100%;">
                        <option value="1500">1.5 sn (Hassas)</option>
                        <option value="3000" selected>3.0 sn (Dengeli)</option>
                        <option value="5000">5.0 sn (Eko / Pil Dostu)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ==================== TAB 2: GÖRÜNÜM & TEMA ==================== -->
              <div class="settings-panel" id="panel-appearance" style="display: none; flex-direction: column; gap: var(--space-13);">
                <div class="view-section glass-card liquid-glow">
                  <div class="view-section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      ${window.UlakIcons.getIcon('palette', 'icon-mono')}
                      <div class="view-section-title">Görünüm & Renk Paletleri</div>
                    </div>
                    <div class="theme-mode-segmented" style="display: flex; gap: 4px; background: var(--glass-surface); padding: 3px; border-radius: var(--r-xs); border: 1px solid var(--glass-border);">
                      <button class="theme-mode-btn ${curMode === 'dark' ? 'active' : ''}" data-settings-mode="dark" style="padding: 4px 10px; font-size: 11px; border: none; border-radius: 4px; background: ${curMode === 'dark' ? 'var(--accent)' : 'transparent'}; color: ${curMode === 'dark' ? '#0e111a' : 'var(--text-2)'}; cursor: pointer;">
                        Koyu
                      </button>
                      <button class="theme-mode-btn ${curMode === 'light' ? 'active' : ''}" data-settings-mode="light" style="padding: 4px 10px; font-size: 11px; border: none; border-radius: 4px; background: ${curMode === 'light' ? 'var(--accent)' : 'transparent'}; color: ${curMode === 'light' ? '#0e111a' : 'var(--text-2)'}; cursor: pointer;">
                        Açık
                      </button>
                    </div>
                  </div>
                  <div style="font-size: 11px; color: var(--text-3); margin-bottom: 10px;">Şu anki aktif tema: <strong style="color: var(--accent);">${curThemeName}</strong></div>
                  <div id="settings-theme-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px;">
                    ${themeOptionsHtml}
                  </div>
                </div>
              </div>

              <!-- ==================== TAB 3: MASAÜSTÜ MASKOTU (KRİSTAL BAYKUŞ & BARIŞ KUŞU) ==================== -->
              <div class="settings-panel" id="panel-pet" style="display: none; flex-direction: column; gap: var(--space-13);">
                <div class="view-section glass-card liquid-glow">
                  <div class="view-section-header" style="display: flex; align-items: center; gap: 8px;">
                    ${window.UlakIcons.getIcon('pet', 'icon-mono')}
                    <div class="view-section-title">Ulak Masaüstü Maskotu</div>
                  </div>

                  <!-- 1. Maskot Genel Aç/Kapa Toggle Switch -->
                  <div class="setting-row glass-soft">
                    <div class="setting-row-left" style="gap: 0;">
                      <div>
                        <div class="setting-title">Masaüstü Maskotunu Etkinleştir</div>
                        <div class="setting-subtitle">Masaüstünde bağımsız yüzen, şeffaf koruyucu asistan penceresi</div>
                      </div>
                    </div>
                    <label class="switch">
                      <input type="checkbox" id="settings-pet-toggle" checked>
                      <span class="switch-slider"></span>
                    </label>
                  </div>

                  <!-- 2. AKTİF MASKOT SEÇİMİ: TOGGLE SWITCHLER VE MODAL -->
                  <div class="setting-row glass-soft" style="flex-direction: column; align-items: stretch; gap: 12px;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <div>
                        <div class="setting-title">Aktif Maskot Seçimi</div>
                        <div class="setting-subtitle">Masaüstünde görev yapacak kristal siber muhafızı toggle ile seçin</div>
                      </div>
                      <button type="button" id="btn-toggle-pet-modal" class="btn btn-secondary btn-sm" style="padding: 5px 12px; font-size: 11px; display: inline-flex; align-items: center; gap: 6px;">
                        ${window.UlakIcons.getIcon('sparkles', 'icon-mono-xs')}
                        <span>Maskot Galerisi Modalı</span>
                      </button>
                    </div>

                    <!-- İki Maskot İçin Birebir Toggle Switch Satırları -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                      
                      <!-- Baykuş Toggle Kartı -->
                      <div class="pet-choice-card active" id="card-pet-owl" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: var(--r-sm); border: 1px solid var(--accent); background: var(--accent-soft); transition: all var(--transition-fast);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                          <img src="assets/pets/owl.png" alt="Baykuş" style="width: 38px; height: 38px; object-fit: contain; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));">
                          <div>
                            <div style="font-size: 12px; font-weight: 700; color: var(--text-1);">Gözetleme (Baykuş)</div>
                            <div style="font-size: 9.5px; color: var(--text-3);">16 Yönlü Çift Siber Mercek</div>
                          </div>
                        </div>
                        <label class="switch">
                          <input type="checkbox" id="toggle-pet-choice-owl" checked>
                          <span class="switch-slider"></span>
                        </label>
                      </div>

                      <!-- Barış Kuşu Toggle Kartı -->
                      <div class="pet-choice-card" id="card-pet-dove" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: var(--r-sm); border: 1px solid var(--glass-border); background: var(--glass-surface); transition: all var(--transition-fast);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                          <img src="assets/pets/dove.png" alt="Barış Kuşu" style="width: 38px; height: 38px; object-fit: contain; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));">
                          <div>
                            <div style="font-size: 12px; font-weight: 700; color: var(--text-1);">Güvenli İletişim (Barış Kuşu)</div>
                            <div style="font-size: 9.5px; color: var(--text-3);">Şifreli Fiber-Optik Veri Hattı</div>
                          </div>
                        </div>
                        <label class="switch">
                          <input type="checkbox" id="toggle-pet-choice-dove">
                          <span class="switch-slider"></span>
                        </label>
                      </div>

                    </div>
                  </div>

                  <!-- 3. Boyut Kaydırıcısı (Slider) ve Konum Sıfırlama -->
                  <div class="setting-row glass-soft">
                    <div class="setting-row-left" style="gap: 0;">
                      <div>
                        <div class="setting-title">Maskot Boyutu (Ölçek)</div>
                        <div class="setting-subtitle">Masaüstündeki maskotun görünüm ölçeği (%50 - %150)</div>
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span id="settings-pet-size-label" style="font-size: 11px; font-weight: 700; color: var(--accent); min-width: 38px; text-align: right;">%100</span>
                      <input type="range" id="settings-pet-size" min="50" max="150" step="10" value="100" style="width: 110px; accent-color: var(--accent); cursor: pointer;">
                      <button id="btn-reset-pet-pos" class="btn btn-secondary btn-sm" style="padding: 6px 10px; font-size: 11px;">Konumu Sıfırla</button>
                    </div>
                  </div>

                  <!-- 4. Akıllı Fare Takibi Toggle Switch -->
                  <div class="setting-row glass-soft">
                    <div class="setting-row-left" style="gap: 0;">
                      <div>
                        <div class="setting-title">Akıllı Fare Takibi (16-Yönlü Look Tracking)</div>
                        <div class="setting-subtitle">Maskotun siber mercekleri ve gövdesi 16 pusula açısında fare imlecinizi takip eder</div>
                      </div>
                    </div>
                    <label class="switch">
                      <input type="checkbox" id="settings-pet-look-toggle" checked>
                      <span class="switch-slider"></span>
                    </label>
                  </div>

                  <!-- 5. Sistem Alarmlarına Canlı Tepki Toggle Switch -->
                  <div class="setting-row glass-soft">
                    <div class="setting-row-left" style="gap: 0;">
                      <div>
                        <div class="setting-title">Canlı Sistem Alarmlarına Reaksiyon</div>
                        <div class="setting-subtitle">Güvenlik duvarı engellemelerinde ve ağır yüklerde maskot kırmızı alarma geçsin</div>
                      </div>
                    </div>
                    <label class="switch">
                      <input type="checkbox" id="settings-pet-reactions-toggle" checked>
                      <span class="switch-slider"></span>
                    </label>
                  </div>
                </div>

                <!-- Test Butonları -->
                <div class="view-section glass-card" style="padding: 12px 14px; display: flex; align-items: center; justify-content: space-between;">
                  <div style="font-size: 11px; color: var(--text-2);">Masaüstündeki maskotun Qoder aktivite balonunu ve tepkilerini canlı test edin:</div>
                  <div style="display: flex; gap: 8px;">
                    <button id="btn-test-pet-working" class="btn btn-secondary btn-sm" style="padding: 6px 12px; font-size: 11px;">Tarama Modu</button>
                    <button id="btn-test-pet-alert" class="btn btn-secondary btn-sm" style="padding: 6px 12px; font-size: 11px; color: var(--alert-red); border-color: rgba(255,85,85,0.3);">Alarm Testi</button>
                  </div>
                </div>
              </div>

              <!-- ==================== TAB 4: MODÜL YETKİ MATRİSİ (TAM TOGGLE SWITCHLER) ==================== -->
              <div class="settings-panel" id="panel-security" style="display: none; flex-direction: column; gap: var(--space-13);">
                <div class="view-section glass-card liquid-glow">
                  <div class="view-section-header" style="display: flex; align-items: center; gap: 8px;">
                    ${window.UlakIcons.getIcon('shield', 'icon-mono')}
                    <div class="view-section-title">Modül İzin & Güvenlik Politikası Matrisi</div>
                  </div>
                  
                  <!-- Firewall Yetkisi Toggle Switch -->
                  <div class="setting-row glass-soft">
                    <div class="setting-row-left" style="gap: 0;">
                      <div>
                        <div class="setting-title">Güvenlik Duvarı Kural Değişiklikleri</div>
                        <div class="setting-subtitle">Port engelleme ve kural işlemlerinde kullanıcıdan açık onay iste</div>
                      </div>
                    </div>
                    <label class="switch">
                      <input type="checkbox" id="settings-firewall-confirm-toggle" checked>
                      <span class="switch-slider"></span>
                    </label>
                  </div>

                  <!-- Hacker Araçları Koruma Toggle Switch -->
                  <div class="setting-row glass-soft">
                    <div class="setting-row-left" style="gap: 0;">
                      <div>
                        <div class="setting-title">Hacker Araçları Yerel Ağ Kalkanı</div>
                        <div class="setting-subtitle">Port taraması yapılırken yerel ağ geçidinin kilitlenmesini engelle</div>
                      </div>
                    </div>
                    <label class="switch">
                      <input type="checkbox" id="settings-hacker-shield-toggle" checked>
                      <span class="switch-slider"></span>
                    </label>
                  </div>

                  <!-- Antivirüs Otomatik Karantina Toggle Switch -->
                  <div class="setting-row glass-soft">
                    <div class="setting-row-left" style="gap: 0;">
                      <div>
                        <div class="setting-title">Antivirüs Otomatik Karantina</div>
                        <div class="setting-subtitle">Yüksek riskli imza tespit edildiğinde dosyayı anında güvenli alana taşı</div>
                      </div>
                    </div>
                    <label class="switch">
                      <input type="checkbox" id="settings-antivirus-auto-toggle" checked>
                      <span class="switch-slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- ==================== TAB 5: İSTASYON HAKKINDA ==================== -->
              <div class="settings-panel" id="panel-about" style="display: none; flex-direction: column; gap: var(--space-13);">
                <div class="view-section glass-card liquid-glow">
                  <div class="view-section-header" style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      ${window.UlakIcons.getIcon('info', 'icon-mono')}
                      <div class="view-section-title">İstasyon & Sürüm Bilgileri</div>
                    </div>
                    <span id="about-update-badge" class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 11px; padding: 3px 8px; border-radius: 6px;">
                      ● Kararlı Sürüm
                    </span>
                  </div>
                  
                  <div class="setting-row glass-soft" style="padding: 16px; margin-bottom: 14px; flex-direction: column; align-items: flex-start; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px; width: 100%; flex-wrap: wrap;">
                      <div style="font-size: 16px; font-weight: 800; color: var(--accent);">ULAK Network & Security Station</div>
                      <span id="about-version-tag" class="badge badge-accent" style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">v2.5.0</span>
                      <span id="about-edition-tag" class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-2); border: 1px solid var(--glass-border); font-size: 10.5px; padding: 2px 8px; border-radius: 4px;">Windows x64 Edition</span>
                    </div>
                    <div style="font-size: 11.5px; color: var(--text-2); line-height: 1.6;">
                      Ulak; modern yerel ağ takibi, gelişmiş güvenlik duvarı kontrolü, siber teşhis ve steganografi laboratuvarı ile donatılmış bağımsız Windows güvenlik istasyonudur.
                    </div>
                  </div>

                  <!-- Canlı Sistem Telemetrisi Tablosu -->
                  <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                    
                    <div class="setting-row glass-soft" style="padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
                      <span style="font-size: 12px; color: var(--text-2);">İşletim Sistemi</span>
                      <span id="about-os-val" style="font-size: 12px; font-weight: 600; color: var(--text-1);">Yükleniyor...</span>
                    </div>

                    <div class="setting-row glass-soft" style="padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
                      <span style="font-size: 12px; color: var(--text-2);">İşletim Sistemi Derlemesi</span>
                      <span id="about-build-val" style="font-size: 11.5px; font-family: monospace; color: var(--accent);">Yükleniyor...</span>
                    </div>

                    <div class="setting-row glass-soft" style="padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
                      <span style="font-size: 12px; color: var(--text-2);">Çalışma Zamanı (Runtime)</span>
                      <span id="about-runtime-val" style="font-size: 11.5px; font-family: monospace; color: var(--text-1);">Electron • Chromium • Node.js</span>
                    </div>

                    <div class="setting-row glass-soft" style="padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
                      <span style="font-size: 12px; color: var(--text-2);">İşlemci Mimarisi & Donanım</span>
                      <span id="about-cpu-val" style="font-size: 11.5px; color: var(--text-1); text-align: right; max-width: 60%;">Yükleniyor...</span>
                    </div>

                    <div class="setting-row glass-soft" style="padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
                      <span style="font-size: 12px; color: var(--text-2);">Sistem Belleği (RAM)</span>
                      <span id="about-ram-val" style="font-size: 11.5px; font-family: monospace; color: var(--text-1);">Yükleniyor...</span>
                    </div>

                    <div class="setting-row glass-soft" style="padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
                      <span style="font-size: 12px; color: var(--text-2);">Aygıt & Aktif Oturum</span>
                      <span id="about-device-val" style="font-size: 11.5px; color: var(--text-2);">Yükleniyor...</span>
                    </div>

                    <div class="setting-row glass-soft" style="padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
                      <span style="font-size: 12px; color: var(--text-2);">Liquid Glass / Akrilik Desteği</span>
                      <span id="about-acrylic-val" style="font-size: 11.5px; color: #10b981;">Donanımsal Aktif</span>
                    </div>

                  </div>

                  <!-- Güncelleme & Değişiklik Bildirim Kutusu -->
                  <div id="about-update-status-box" style="display: none; padding: 12px 14px; border-radius: var(--r-sm); background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.3); margin-bottom: 14px; font-size: 12px; color: var(--text-1); line-height: 1.5;">
                  </div>

                  <!-- Eylem Butonları -->
                  <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="btn-check-station-updates" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 11.5px;">
                      ${window.UlakIcons.getIcon('sparkles', 'icon-mono')}
                      <span id="btn-check-text">Güncellemeleri Denetle</span>
                    </button>
                    <button id="btn-view-changelog" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 11.5px;">
                      ${window.UlakIcons.getIcon('info', 'icon-mono')}
                      <span>Sürüm Değişiklik Günlüğü</span>
                    </button>
                    <button id="btn-reset-all-settings" class="btn btn-secondary btn-sm" style="padding: 8px 14px; font-size: 11.5px; color: var(--alert-red); margin-left: auto;">
                      Fabrika Ayarlarına Sıfırla
                    </button>
                  </div>
                </div>
              </div>

            </main>
          </div>

          <!-- ==================== MASKOT SEÇİMİ TOGGLE MODALI ==================== -->
          <div id="pet-selection-modal" style="display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); z-index: 1000; align-items: center; justify-content: center; padding: 20px;">
            <div class="glass-card liquid-glow" style="width: 580px; max-width: 95vw; border-radius: var(--r-md); border: 1px solid var(--glass-border); background: var(--glass-surface); padding: 22px; box-shadow: 0 24px 56px rgba(0,0,0,0.75); display: flex; flex-direction: column; gap: 16px;">
              
              <!-- Modal Başlık -->
              <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--glass-border); padding-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  ${window.UlakIcons.getIcon('pet', 'icon-mono')}
                  <span style="font-size: 14px; font-weight: 800; color: var(--text-1);">Kristal Siber Maskot Kataloğu</span>
                </div>
                <button type="button" id="btn-close-pet-modal" style="background: none; border: none; color: var(--text-2); font-size: 16px; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: color var(--transition-fast);">✕</button>
              </div>

              <!-- İki Maskotun Yan Yana Kartları (Her birinde Toggle Switch) -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                
                <!-- 1. Gözetleme (Baykuş) -->
                <div class="modal-pet-card" id="modal-card-owl" style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 16px 14px; border-radius: var(--r-sm); border: 1px solid var(--accent); background: var(--accent-soft); transition: all var(--transition-fast);">
                  <img src="assets/pets/owl.png" alt="Gözetleme (Baykuş)" style="width: 96px; height: 96px; object-fit: contain; margin-bottom: 10px; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.55));">
                  <div style="font-size: 13px; font-weight: 800; color: var(--text-1); margin-bottom: 4px;">Gözetleme (Baykuş)</div>
                  <div style="font-size: 10.5px; color: var(--text-3); line-height: 1.4; margin-bottom: 14px;">16 yönlü çift siber kamera merceği, göğüs CPU çekirdeği ve aktif radar tarayıcı</div>
                  <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 6px 10px; background: rgba(0,0,0,0.25); border-radius: 6px;">
                    <span id="modal-owl-status-text" style="font-size: 11px; font-weight: 700; color: var(--accent);">Aktif Maskot</span>
                    <label class="switch">
                      <input type="checkbox" id="modal-toggle-owl" checked>
                      <span class="switch-slider"></span>
                    </label>
                  </div>
                </div>

                <!-- 2. Güvenli İletişim (Barış Kuşu) -->
                <div class="modal-pet-card" id="modal-card-dove" style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 16px 14px; border-radius: var(--r-sm); border: 1px solid var(--glass-border); background: var(--glass-surface); transition: all var(--transition-fast);">
                  <img src="assets/pets/dove.png" alt="Güvenli İletişim (Barış Kuşu)" style="width: 96px; height: 96px; object-fit: contain; margin-bottom: 10px; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.55));">
                  <div style="font-size: 13px; font-weight: 800; color: var(--text-1); margin-bottom: 4px;">Güvenli İletişim (Barış Kuşu)</div>
                  <div style="font-size: 10.5px; color: var(--text-3); line-height: 1.4; margin-bottom: 14px;">Şifreli fiber-optik veri hattı, kripto çip çekirdeği ve kanat rotoru</div>
                  <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 6px 10px; background: rgba(0,0,0,0.25); border-radius: 6px;">
                    <span id="modal-dove-status-text" style="font-size: 11px; font-weight: 700; color: var(--text-3);">Devre Dışı</span>
                    <label class="switch">
                      <input type="checkbox" id="modal-toggle-dove">
                      <span class="switch-slider"></span>
                    </label>
                  </div>
                </div>

              </div>

              <!-- Modal Alt Bilgi -->
              <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid var(--glass-border);">
                <div style="font-size: 10px; color: var(--text-3);">Masaüstündeki maskot toggle anında güncellenir ve ayarlarınız saklanır.</div>
                <button type="button" id="btn-modal-done" class="btn btn-secondary btn-sm" style="padding: 5px 14px; font-size: 11px;">Kapat</button>
              </div>

            </div>
          </div>

          <!-- ==================== SÜRÜM DEĞİŞİKLİK GÜNLÜĞÜ MODALI ==================== -->
          <div id="station-changelog-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.78); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); z-index: 99999; align-items: center; justify-content: center; padding: 20px;">
            <div class="glass-card modal-changelog-card" style="width: 720px; max-width: 95vw; height: 620px; max-height: 88vh; border-radius: var(--r-md); border: 1px solid var(--glass-border); background: var(--glass-surface); padding: 22px; box-shadow: 0 24px 56px rgba(0,0,0,0.85); display: flex; flex-direction: column; gap: 14px; position: relative; overflow: hidden;">
              <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--glass-border); padding-bottom: 12px; flex-shrink: 0;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  ${window.UlakIcons.getIcon('info', 'icon-mono')}
                  <span style="font-size: 14px; font-weight: 800; color: var(--text-1);">Sürüm Değişiklik Günlüğü</span>
                  <span class="badge badge-accent" style="font-size: 10px; padding: 2px 7px; border-radius: 4px;">v2.5.0</span>
                </div>
                <button type="button" id="btn-close-changelog-modal" style="background: none; border: none; color: var(--text-2); font-size: 16px; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: color var(--transition-fast);">✕</button>
              </div>
              <div id="station-changelog-content" tabindex="0" style="flex: 1 1 0%; min-height: 0; height: 100%; overflow-y: scroll !important; overflow-x: hidden; padding-right: 8px; display: flex; flex-direction: column; gap: 12px; outline: none;">
                <div style="color: var(--text-3); text-align: center; padding: 24px; font-size: 12px;">Yükleniyor...</div>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--glass-border); padding-top: 12px; flex-shrink: 0;">
                <span style="font-size: 11px; color: var(--text-3);">ULAK Network & Security Station • Yerel Sürüm Günlüğü</span>
                <button type="button" id="btn-changelog-done" class="btn btn-secondary btn-sm" style="padding: 6px 18px; font-size: 11.5px;">Kapat</button>
              </div>
            </div>
          </div>

        </div>
      `;
    },

    async mount(el) {
      // 1. SOL ANA MENÜYÜ GİZLE
      const mainSidebar = document.getElementById('sidebar-box');
      if (mainSidebar) {
        mainSidebar.style.display = 'none';
      }

      // 2. EN ÜSTTEKİ GERİ TUŞU: ANA SAYFAYA DÖN (SOL PANELİ GERİ GETİR)
      const btnBackHome = el.querySelector('#btn-settings-back-home');
      if (btnBackHome) {
        btnBackHome.addEventListener('click', () => {
          if (mainSidebar) {
            mainSidebar.style.display = '';
          }
          if (window.UlakRouter) {
            window.UlakRouter.navigate('home');
          }
        });

        btnBackHome.addEventListener('mouseenter', () => {
          btnBackHome.style.color = 'var(--accent)';
          const text = btnBackHome.querySelector('span');
          if (text) text.style.color = 'var(--accent)';
        });
        btnBackHome.addEventListener('mouseleave', () => {
          btnBackHome.style.color = 'var(--text-2)';
          const text = btnBackHome.querySelector('span');
          if (text) text.style.color = 'var(--text-1)';
        });
      }

      // 3. MASTER KATEGORİ TAB GEÇİŞLERİ (ULAK SIDEBAR STİLİ)
      const tabBtns = el.querySelectorAll('.settings-category-btn');
      const panels = el.querySelectorAll('.settings-panel');

      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetTab = btn.getAttribute('data-tab');
          tabBtns.forEach(b => {
            const isTarget = b === btn;
            b.classList.toggle('active', isTarget);
          });

          panels.forEach(p => {
            p.style.display = p.id === `panel-${targetTab}` ? 'flex' : 'none';
          });
        });
      });

      // 4. TEMA SEÇİMİ DİNLENMESİ
      const themeBtns = el.querySelectorAll('.theme-choice-btn');
      themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const famId = btn.getAttribute('data-family-id');
          if (window.UlakTheme && famId) {
            window.UlakTheme.setFamily(famId);
            if (window.UlakUI && window.UlakUI.toast) {
              window.UlakUI.toast(`Tema uygulandı: ${window.UlakTheme.families[famId].name}`, 'success');
            }
          }
        });
      });

      const modeBtns = el.querySelectorAll('[data-settings-mode]');
      modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.getAttribute('data-settings-mode');
          if (window.UlakTheme && mode) {
            window.UlakTheme.setMode(mode);
          }
        });
      });

      // 5. AUTOSTART TOGGLE
      const autostartToggle = el.querySelector('#settings-autostart-toggle');
      if (autostartToggle && window.ulak) {
        try {
          const isEnabled = await window.ulak.invoke('app:get-autostart');
          autostartToggle.checked = !!isEnabled;
        } catch(e) {}

        autostartToggle.addEventListener('change', async (e) => {
          try {
            await window.ulak.invoke('app:set-autostart', e.target.checked);
            if (window.UlakUI) window.UlakUI.toast(`Otomatik başlatma ${e.target.checked ? 'aktif' : 'kapatıldı'}.`, 'info');
          } catch(err) {
            e.target.checked = !e.target.checked;
          }
        });
      }

      // 6. MASAÜSTÜ MASKOTU (PET) AYARLARI, TOGGLE VE MODAL YÖNETİMİ
      const petToggle = el.querySelector('#settings-pet-toggle');
      const petSizeInput = el.querySelector('#settings-pet-size');
      const petSizeLabel = el.querySelector('#settings-pet-size-label');
      const petLookToggle = el.querySelector('#settings-pet-look-toggle');
      const petReactionsToggle = el.querySelector('#settings-pet-reactions-toggle');
      const btnResetPetPos = el.querySelector('#btn-reset-pet-pos');
      const btnTestWorking = el.querySelector('#btn-test-pet-working');
      const btnTestAlert = el.querySelector('#btn-test-pet-alert');

      // Maskot Toggle Switch Elemanları
      const toggleOwl = el.querySelector('#toggle-pet-choice-owl');
      const toggleDove = el.querySelector('#toggle-pet-choice-dove');
      const cardOwl = el.querySelector('#card-pet-owl');
      const cardDove = el.querySelector('#card-pet-dove');

      // Modal Elemanları
      const btnToggleModal = el.querySelector('#btn-toggle-pet-modal');
      const petModal = el.querySelector('#pet-selection-modal');
      const btnCloseModal = el.querySelector('#btn-close-pet-modal');
      const btnModalDone = el.querySelector('#btn-modal-done');
      const modalCardOwl = el.querySelector('#modal-card-owl');
      const modalCardDove = el.querySelector('#modal-card-dove');
      const modalToggleOwl = el.querySelector('#modal-toggle-owl');
      const modalToggleDove = el.querySelector('#modal-toggle-dove');
      const modalOwlText = el.querySelector('#modal-owl-status-text');
      const modalDoveText = el.querySelector('#modal-dove-status-text');

      function syncAllPetSwitches(activeId) {
        const isOwl = activeId === 'owl' || activeId !== 'dove';

        // 1. Ayarlar panelindeki iki toggle switch
        if (toggleOwl) toggleOwl.checked = isOwl;
        if (toggleDove) toggleDove.checked = !isOwl;

        if (cardOwl) {
          cardOwl.classList.toggle('active', isOwl);
          cardOwl.style.borderColor = isOwl ? 'var(--accent)' : 'var(--glass-border)';
          cardOwl.style.background = isOwl ? 'var(--accent-soft)' : 'var(--glass-surface)';
        }
        if (cardDove) {
          cardDove.classList.toggle('active', !isOwl);
          cardDove.style.borderColor = !isOwl ? 'var(--accent)' : 'var(--glass-border)';
          cardDove.style.background = !isOwl ? 'var(--accent-soft)' : 'var(--glass-surface)';
        }

        // 2. Modaldaki iki toggle switch
        if (modalToggleOwl) modalToggleOwl.checked = isOwl;
        if (modalToggleDove) modalToggleDove.checked = !isOwl;

        if (modalOwlText) {
          modalOwlText.textContent = isOwl ? 'Aktif Maskot ✓' : 'Devre Dışı';
          modalOwlText.style.color = isOwl ? 'var(--accent)' : 'var(--text-3)';
        }
        if (modalDoveText) {
          modalDoveText.textContent = !isOwl ? 'Aktif Maskot ✓' : 'Devre Dışı';
          modalDoveText.style.color = !isOwl ? 'var(--accent)' : 'var(--text-3)';
        }

        if (modalCardOwl) {
          modalCardOwl.style.borderColor = isOwl ? 'var(--accent)' : 'var(--glass-border)';
          modalCardOwl.style.background = isOwl ? 'var(--accent-soft)' : 'var(--glass-surface)';
        }
        if (modalCardDove) {
          modalCardDove.style.borderColor = !isOwl ? 'var(--accent)' : 'var(--glass-border)';
          modalCardDove.style.background = !isOwl ? 'var(--accent-soft)' : 'var(--glass-surface)';
        }
      }

      async function setMascotChoice(petId) {
        syncAllPetSwitches(petId);
        if (window.ulak) {
          await window.ulak.invoke('pet:set-settings', { activePetId: petId });
          if (window.UlakUI) {
            const name = petId === 'dove' ? 'Güvenli İletişim (Barış Kuşu)' : 'Gözetleme (Baykuş)';
            window.UlakUI.toast(`Aktif maskot toggle edildi: ${name}`, 'success');
          }
        }
      }

      // Panel içi Toggle dinleyicileri
      if (toggleOwl) {
        toggleOwl.addEventListener('change', (e) => {
          if (e.target.checked) setMascotChoice('owl');
          else setMascotChoice('dove');
        });
      }

      if (toggleDove) {
        toggleDove.addEventListener('change', (e) => {
          if (e.target.checked) setMascotChoice('dove');
          else setMascotChoice('owl');
        });
      }

      // Modal içi Toggle dinleyicileri
      if (modalToggleOwl) {
        modalToggleOwl.addEventListener('change', (e) => {
          if (e.target.checked) setMascotChoice('owl');
          else setMascotChoice('dove');
        });
      }

      if (modalToggleDove) {
        modalToggleDove.addEventListener('change', (e) => {
          if (e.target.checked) setMascotChoice('dove');
          else setMascotChoice('owl');
        });
      }

      // Modal Aç / Kapat Fonksiyonu
      function togglePetModal(show) {
        if (!petModal) return;
        const willShow = show !== undefined ? show : (petModal.style.display === 'none' || !petModal.style.display);
        petModal.style.display = willShow ? 'flex' : 'none';
      }

      if (btnToggleModal) btnToggleModal.addEventListener('click', () => togglePetModal());
      if (btnCloseModal) btnCloseModal.addEventListener('click', () => togglePetModal(false));
      if (btnModalDone) btnModalDone.addEventListener('click', () => togglePetModal(false));
      if (petModal) {
        petModal.addEventListener('click', (e) => {
          if (e.target === petModal) togglePetModal(false);
        });
      }

      // Başlangıç Ayarlarını Çek
      if (window.ulak) {
        try {
          const petSettings = await window.ulak.invoke('pet:get-settings');
          if (petSettings) {
            if (petToggle) petToggle.checked = petSettings.enabled !== false;
            if (petSizeInput) petSizeInput.value = String(petSettings.sizePercent || 100);
            if (petSizeLabel) petSizeLabel.textContent = `%${petSettings.sizePercent || 100}`;
            if (petLookToggle) petLookToggle.checked = petSettings.lookTracking !== false;
            if (petReactionsToggle) petReactionsToggle.checked = petSettings.reactionsEnabled !== false;
            syncAllPetSwitches(petSettings.activePetId || 'owl');
          }
        } catch(e) {}
      }

      if (petToggle) {
        petToggle.addEventListener('change', async (e) => {
          if (window.ulak) {
            await window.ulak.invoke('pet:set-settings', { enabled: e.target.checked });
            if (window.UlakUI) {
              window.UlakUI.toast(`Masaüstü maskotu ${e.target.checked ? 'etkinleştirildi' : 'gizlendi'}.`, 'info');
            }
          }
        });
      }

      if (petSizeInput) {
        petSizeInput.addEventListener('input', (e) => {
          if (petSizeLabel) petSizeLabel.textContent = `%${e.target.value}`;
        });
        petSizeInput.addEventListener('change', async (e) => {
          if (window.ulak) {
            const size = parseInt(e.target.value, 10);
            await window.ulak.invoke('pet:set-settings', { sizePercent: size });
            if (window.UlakUI) window.UlakUI.toast(`Maskot boyutu güncellendi: %${size}`, 'info');
          }
        });
      }

      if (petLookToggle) {
        petLookToggle.addEventListener('change', async (e) => {
          if (window.ulak) {
            await window.ulak.invoke('pet:set-settings', { lookTracking: e.target.checked });
            if (window.UlakUI) window.UlakUI.toast(`Akıllı fare takibi ${e.target.checked ? 'açıldı' : 'kapatıldı'}.`, 'info');
          }
        });
      }

      if (petReactionsToggle) {
        petReactionsToggle.addEventListener('change', async (e) => {
          if (window.ulak) {
            await window.ulak.invoke('pet:set-settings', { reactionsEnabled: e.target.checked });
          }
        });
      }

      if (btnResetPetPos) {
        btnResetPetPos.addEventListener('click', async () => {
          if (window.ulak) {
            await window.ulak.invoke('pet:set-position', { x: -1, y: -1 });
            if (window.UlakUI) window.UlakUI.toast('Maskot varsayılan sağ alt köşeye taşındı.', 'success');
          }
        });
      }

      // Canlı Test Butonları
      if (btnTestWorking) {
        btnTestWorking.addEventListener('click', async () => {
          if (window.ulak) {
            await window.ulak.invoke('pet:action', 'test-working');
            if (window.UlakUI) window.UlakUI.toast('Tarama durumu maskota iletildi.', 'info');
          }
        });
      }

      if (btnTestAlert) {
        btnTestAlert.addEventListener('click', async () => {
          if (window.ulak) {
            await window.ulak.invoke('pet:action', 'test-alert');
            if (window.UlakUI) window.UlakUI.toast('Siber alarm maskota iletildi.', 'warning');
          }
        });
      }

      // 7. İSTASYON HAKKINDA TELEMETRİ VE GERÇEK SÜRÜM YÖNETİMİ
      const aboutVersionTag = el.querySelector('#about-version-tag');
      const aboutEditionTag = el.querySelector('#about-edition-tag');
      const aboutOsVal = el.querySelector('#about-os-val');
      const aboutBuildVal = el.querySelector('#about-build-val');
      const aboutRuntimeVal = el.querySelector('#about-runtime-val');
      const aboutCpuVal = el.querySelector('#about-cpu-val');
      const aboutRamVal = el.querySelector('#about-ram-val');
      const aboutDeviceVal = el.querySelector('#about-device-val');
      const aboutAcrylicVal = el.querySelector('#about-acrylic-val');
      const btnCheckUpdates = el.querySelector('#btn-check-station-updates');
      const btnCheckText = el.querySelector('#btn-check-text');
      const updateStatusBox = el.querySelector('#about-update-status-box');
      const btnViewChangelog = el.querySelector('#btn-view-changelog');
      const changelogModal = el.querySelector('#station-changelog-modal');
      const changelogContent = el.querySelector('#station-changelog-content');
      const btnCloseChangelog = el.querySelector('#btn-close-changelog-modal');
      const btnChangelogDone = el.querySelector('#btn-changelog-done');

      async function loadRealPlatformInfo() {
        if (!window.ulak) return;
        try {
          const info = await window.ulak.invoke('app:get-platform-info');
          if (!info) return;

          if (aboutVersionTag) aboutVersionTag.textContent = `v${info.appVersion || '2.5.0'}`;
          if (aboutEditionTag) aboutEditionTag.textContent = `${info.osName || 'Windows'} ${info.arch || 'x64'} Liquid Edition`;
          if (aboutOsVal) aboutOsVal.textContent = `${info.osName || 'Windows'} (${info.arch || 'x64'})`;
          if (aboutBuildVal) aboutBuildVal.textContent = info.fullOsDescription || info.release || 'Bilinmiyor';
          if (aboutRuntimeVal) {
            aboutRuntimeVal.textContent = `Electron v${info.electronVersion || '28.0.0'} • Chrome v${info.chromeVersion || '120.0'} • Node.js v${info.nodeVersion || '18.18'}`;
          }
          if (aboutCpuVal) {
            aboutCpuVal.textContent = `${info.cpuModel || 'Bilinmiyor'} (${info.cpuCores || 4} Çekirdek)`;
          }
          if (aboutRamVal) {
            aboutRamVal.textContent = `Kullanılabilir: ${info.freeMemory || 'N/A'} / Toplam: ${info.totalMemory || 'N/A'}`;
          }
          if (aboutDeviceVal) {
            aboutDeviceVal.textContent = `${info.hostname || 'İstasyon'} (Oturum: ${info.username || 'Kullanıcı'})`;
          }
          if (aboutAcrylicVal) {
            aboutAcrylicVal.textContent = info.isAcrylicSupported ? 'Donanımsal Hızlandırma & Akrilik Aktif' : 'Standart Saydamlık';
            aboutAcrylicVal.style.color = info.isAcrylicSupported ? '#10b981' : 'var(--text-2)';
          }
        } catch (e) {
          console.error('İstasyon telemetri hatası:', e);
        }
      }

      loadRealPlatformInfo();

      // Güncellemeleri Denetle Butonu
      if (btnCheckUpdates) {
        btnCheckUpdates.addEventListener('click', async () => {
          if (!window.ulak) return;
          try {
            if (btnCheckText) btnCheckText.textContent = 'Denetleniyor...';
            btnCheckUpdates.disabled = true;

            const res = await window.ulak.invoke('version:check-updates');
            if (updateStatusBox) {
              updateStatusBox.style.display = 'block';
              if (res && res.updatesAvailable > 0) {
                updateStatusBox.style.background = 'rgba(245, 158, 11, 0.15)';
                updateStatusBox.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                updateStatusBox.innerHTML = `<strong>Güncelleme Mevcut!</strong> ${res.updatesAvailable} modül için yeni sürüm bulundu. Modül Mağazası üzerinden güncelleyebilirsiniz. (Kontrol zamanı: ${res.checkedAt})`;
              } else {
                updateStatusBox.style.background = 'rgba(16, 185, 129, 0.15)';
                updateStatusBox.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                updateStatusBox.innerHTML = `<strong>Tüm Sistem Güncel!</strong> ULAK Çekirdek v2.5.0 ve tüm modüller en son kararlı sürümde çalışıyor. (Son kontrol: ${res ? res.checkedAt : new Date().toLocaleTimeString('tr-TR')})`;
              }
            }
            if (window.UlakUI) {
              window.UlakUI.toast('Güncelleme denetimi tamamlandı.', 'success');
            }
          } catch (err) {
            if (window.UlakUI) window.UlakUI.toast('Güncelleme denetimi gerçekleştirilemedi: ' + err.message, 'error');
          } finally {
            if (btnCheckText) btnCheckText.textContent = 'Güncellemeleri Denetle';
            btnCheckUpdates.disabled = false;
          }
        });
      }

      // Sürüm Günlüğü Biçimlendirici (Sade, Modern ve Kart Mimarili)
      function formatChangelogHtml(rawMarkdown) {
        if (!rawMarkdown) return '<div style="color: var(--text-3); text-align: center; padding: 24px; font-size: 12px;">Değişiklik günlüğü bulunamadı.</div>';

        const versionBlocks = rawMarkdown.split(/(?=##\s*\[v\d+)/gi);
        let renderedCount = 0;

        const cardsHtml = versionBlocks.map(block => {
          const trimmed = block.trim();
          if (!trimmed || !trimmed.startsWith('##')) return '';

          const titleMatch = trimmed.match(/^##\s*\[(v[\d\.]+)\]\s*-\s*([^\n\r]+)/i);
          const version = titleMatch ? titleMatch[1] : 'Sürüm';
          const date = titleMatch ? titleMatch[2].trim() : '';

          const isCurrent = renderedCount === 0;
          renderedCount++;

          // Özet paragrafını ayıkla
          const summaryMatch = trimmed.match(/###\s*🚀\s*Özet\s*\n+([\s\S]*?)(?=\n+---|\n+###|$)/i);
          let summaryText = summaryMatch ? summaryMatch[1].trim() : '';
          summaryText = summaryText
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-1); font-weight: 600;">$1</strong>')
            .replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px; font-size: 11px; color: var(--accent); font-family: var(--font-mono);">$1</code>');

          // Maddeleri ve öne çıkanları ayıkla
          const lines = trimmed.split('\n');
          const highlights = [];
          for (const line of lines) {
            const l = line.trim();
            const m = l.match(/^(?:\d+\.|\-)\s*\*\*([^:]+?):?\*\*:?\s*(.*)$/);
            if (m && m[1]) {
              let title = m[1].replace(/\[Yeni\]/gi, '').replace(/\[İyileştirme\]/gi, '').trim();
              let desc = m[2] ? m[2].trim() : '';
              desc = desc
                .replace(/\*\*(.*?)\*\*/g, '$1')
                .replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.06); padding: 1px 4px; border-radius: 3px; font-size: 10.5px; color: var(--accent); font-family: var(--font-mono);">$1</code>');

              highlights.push({ title, desc });
            }
          }

          const highlightsHtml = highlights.slice(0, 6).map(h => `
            <div style="display: flex; align-items: flex-start; gap: 8px; font-size: 11.5px; line-height: 1.5;">
              <span style="color: var(--accent); font-size: 13px; line-height: 1.2;">•</span>
              <div>
                <strong style="color: var(--text-1); font-weight: 600;">${h.title}:</strong>
                ${h.desc ? ` <span style="color: var(--text-2);">${h.desc}</span>` : ''}
              </div>
            </div>
          `).join('');

          return `
            <div class="glass-card" style="padding: 16px 18px; border-radius: var(--r-sm); border: 1px solid ${isCurrent ? 'var(--accent)' : 'var(--glass-border)'}; background: ${isCurrent ? 'rgba(0, 210, 255, 0.04)' : 'var(--glass-surface)'}; display: flex; flex-direction: column; gap: 10px; flex-shrink: 0;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 13.5px; font-weight: 800; color: ${isCurrent ? 'var(--accent)' : 'var(--text-1)'};">${version}</span>
                  ${isCurrent ? '<span class="badge badge-accent" style="font-size: 10px; padding: 1px 7px; border-radius: 4px;">Aktif Sürüm</span>' : ''}
                </div>
                <span style="font-size: 11px; color: var(--text-3); font-family: var(--font-mono);">${date}</span>
              </div>
              ${summaryText ? `<div style="font-size: 11.5px; color: var(--text-2); line-height: 1.6;">${summaryText}</div>` : ''}
              ${highlights.length ? `<div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px; padding-top: 8px; border-top: 1px solid var(--glass-border-subtle);">${highlightsHtml}</div>` : ''}
            </div>
          `;
        }).filter(Boolean).join('');

        return cardsHtml || '<div style="color: var(--text-3); text-align: center; padding: 24px; font-size: 12px;">Günlük içeriği boş.</div>';
      }

      // Sürüm Günlüğü Modal
      function toggleChangelogModal(show) {
        if (!changelogModal) return;
        const willShow = show !== undefined ? show : (changelogModal.style.display === 'none' || !changelogModal.style.display);
        if (willShow) {
          if (changelogModal.parentElement !== document.body) {
            document.body.appendChild(changelogModal);
          }
          changelogModal.style.display = 'flex';
          setTimeout(() => {
            if (changelogContent) {
              changelogContent.focus();
            }
          }, 60);
        } else {
          changelogModal.style.display = 'none';
        }
      }

      // Fare tekerleği (wheel) olayını doğrudan dinleyip kaydır
      if (changelogContent) {
        changelogContent.addEventListener('wheel', (e) => {
          changelogContent.scrollTop += e.deltaY;
          e.preventDefault();
          e.stopPropagation();
        }, { passive: false });
      }

      if (btnViewChangelog) {
        btnViewChangelog.addEventListener('click', async () => {
          toggleChangelogModal(true);
          if (window.ulak && changelogContent) {
            try {
              changelogContent.innerHTML = '<div style="color: var(--text-3); text-align: center; padding: 24px; font-size: 12px;">Yükleniyor...</div>';
              const text = await window.ulak.invoke('app:get-changelog');
              changelogContent.innerHTML = formatChangelogHtml(text);
              changelogContent.scrollTop = 0;
            } catch (e) {
              changelogContent.innerHTML = '<div style="color: var(--alert-red); text-align: center; padding: 24px; font-size: 12px;">Günlük yüklenirken hata oluştu.</div>';
            }
          }
        });
      }

      if (btnCloseChangelog) btnCloseChangelog.addEventListener('click', () => toggleChangelogModal(false));
      if (btnChangelogDone) btnChangelogDone.addEventListener('click', () => toggleChangelogModal(false));
      if (changelogModal) {
        changelogModal.addEventListener('click', (e) => {
          if (e.target === changelogModal) toggleChangelogModal(false);
        });
      }

      // Sıfırlama butonu
      const btnResetAll = el.querySelector('#btn-reset-all-settings');
      if (btnResetAll) {
        btnResetAll.addEventListener('click', () => {
          if (confirm('Tüm ayarları ve tema tercihlerini sıfırlamak istediğinize emin misiniz?')) {
            localStorage.clear();
            if (window.UlakTheme) window.UlakTheme.init();
            if (window.UlakUI) window.UlakUI.toast('Ayarlar fabrika varsayılanına döndürüldü.', 'info');
            setTimeout(() => location.reload(), 600);
          }
        });
      }
    },

    unmount() {
      // Body'ye taşınmış modal varsa temizle
      const modal = document.getElementById('station-changelog-modal');
      if (modal) {
        modal.remove();
      }

      // Ayarlardan başka bir sayfaya geçildiğinde ana sol paneli geri getir
      const mainSidebar = document.getElementById('sidebar-box');
      if (mainSidebar) {
        mainSidebar.style.display = '';
      }
    }
  };

  window.UlakRouter.register(view);
})();
