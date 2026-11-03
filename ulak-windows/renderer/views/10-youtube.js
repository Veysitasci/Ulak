// VIEW 10: VİDEO & MEDYA İNDİRİCİ (GELİŞMİŞ 5 KRİTİK ÖZELLİK)
(function() {
  const view = {
    id: 'youtube',
    title: 'Video İndirici',
    icon: 'video',

    render() {
      const C = window.UlakComponents;
      return `
        <div class="youtube-view">
          <div class="glass-card liquid-glow" style="margin-bottom: 20px; padding: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
              <div style="display: flex; align-items: center; gap: 14px;">
                <div class="setting-row-icon" style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: transparent !important; border: none !important; box-shadow: none !important;">
                  <img src="../assets/module_icons/youtube.png" class="view-header-3d-icon" style="width: 44px; height: 44px; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));" onerror="this.style.display=\'none\';" />
                </div>
                <div>
                  <div style="font-size: 19px; font-weight: 700; color: var(--text-1); letter-spacing: -0.01em;">Video & Medya İndirici Pro</div>
                  <div style="font-size: 13px; color: var(--text-2); margin-top: 3px;">yt-dlp Entegrasyonu • 4K HDR • Stüdyo Sesi • Oynatma Listesi • Altyazı Motoru</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span class="chip chip-accent" id="yt-engine-chip">yt-dlp Motoru Hazır</span>
                <button class="btn btn-secondary" id="yt-open-folder-btn" title="İndirilenler Klasörünü Aç">
                  ${window.UlakIcons.getIcon('folder', 'icon-mono-sm')} Klasörü Aç
                </button>
              </div>
            </div>
          </div>

          <!-- URL & Ana Yapılandırma Kartı -->
          <div class="view-section glass-card liquid-glow" style="margin-bottom: 20px;">
            <div class="view-section-header" style="margin-bottom: 14px;">
              <div class="view-section-title">Medya Bağlantısı ve Yapılandırma</div>
              <div class="chip" style="font-size: 11px;">1000+ Video & Müzik Platformu Desteklenir</div>
            </div>

            <div class="field-group" style="margin-bottom: 16px;">
              <input type="text" id="yt-url-input" class="field-input" placeholder="YouTube, X, Vimeo veya herhangi bir video bağlantısı yapıştırın..." style="flex: 1; font-size: 14px;">
              <button class="btn btn-secondary" id="yt-paste-btn" title="Panodan Yapıştır">
                ${window.UlakIcons.getIcon('clipboard', 'icon-mono-sm')} Yapıştır
              </button>
              <button class="btn btn-primary" id="yt-fetch-btn" title="Videoyu veya sesi önizle">
                ${window.UlakIcons.getIcon('play', 'icon-mono-sm')} Önizle
              </button>
            </div>

            <!-- 5 KRİTİK ÖZELLİK AYAR PANELİ (BENTO GRID) -->
            <div class="grid-3" style="gap: 12px; margin-bottom: 16px;">
              <!-- 1. Kalite & Format (MCP UI Encased) -->
              <div class="glass-card" style="padding: 14px; background: var(--glass-surface-subtle);">
                <label style="font-size: 11px; font-weight: 700; color: var(--text-2); text-transform: uppercase; display: block; margin-bottom: 8px;">
                  1. Format & Kalite
                </label>
                <div class="select-encased has-icon">
                  <div class="select-icon">${window.UlakIcons.getIcon('film', 'icon-mono-xs')}</div>
                  <select id="yt-opt-quality" class="field-input select-custom" style="width: 100%;">
                    <option value="best">En Yüksek Kalite (Otomatik)</option>
                    <option value="4k">4K Ultra HD (2160p)</option>
                    <option value="2k">2K Quad HD (1440p)</option>
                    <option value="1080p" selected>Full HD (1080p 60fps)</option>
                    <option value="720p">HD (720p)</option>
                    <option value="480p">Düşük Boyut (480p)</option>
                    <option value="audio-mp3">MP3 320 kbps (Stüdyo Sesi)</option>
                    <option value="audio-flac">FLAC Kayıpsız (Lossless)</option>
                    <option value="audio-wav">WAV Ham Ses</option>
                    <option value="audio-aac">AAC Optimize Ses</option>
                  </select>
                </div>
              </div>

              <!-- 2. Hız Sınırı & Paralel Parça (MCP UI Encased) -->
              <div class="glass-card" style="padding: 14px; background: var(--glass-surface-subtle);">
                <label style="font-size: 11px; font-weight: 700; color: var(--text-2); text-transform: uppercase; display: block; margin-bottom: 8px;">
                  2. Bant Genişliği & Parça
                </label>
                <div style="display: flex; gap: 8px;">
                  <div class="select-encased has-icon" style="flex: 1;">
                    <div class="select-icon">${window.UlakIcons.getIcon('activity', 'icon-mono-xs')}</div>
                    <select id="yt-opt-rate" class="field-input select-custom">
                      <option value="unlimited" selected>Limitsiz Hız</option>
                      <option value="10M">Maks 10 MB/s</option>
                      <option value="5M">Maks 5 MB/s</option>
                      <option value="2M">Maks 2 MB/s</option>
                      <option value="1M">Maks 1 MB/s</option>
                    </select>
                  </div>
                  <div class="select-encased has-icon" style="width: 105px;">
                    <div class="select-icon">${window.UlakIcons.getIcon('cpu', 'icon-mono-xs')}</div>
                    <select id="yt-opt-threads" class="field-input select-custom" title="Eşzamanlı Parça">
                      <option value="1">1 Parça</option>
                      <option value="4" selected>4 Parça</option>
                      <option value="8">8 Parça</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- 3. Altyazı & Playlist Seçenekleri -->
              <div class="glass-card" style="padding: 14px; background: var(--glass-surface-subtle); display: flex; flex-direction: column; justify-content: center; gap: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; color: var(--text-1); font-weight: 500;">
                  <input type="checkbox" id="yt-opt-subtitles" style="accent-color: var(--accent); width: 16px; height: 16px;">
                  <span>Türkçe/İngilizce Altyazı (.srt) İndir</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; color: var(--text-1); font-weight: 500;">
                  <input type="checkbox" id="yt-opt-is-playlist" style="accent-color: var(--accent); width: 16px; height: 16px;">
                  <span>Oynatma Listesi (Playlist) Modu</span>
                </label>
              </div>
            </div>

            <!-- Playlist Aralık Girişi (Koşullu Açılır) -->
            <div id="yt-playlist-range-box" style="display: none; margin-bottom: 16px; padding: 12px; border-radius: var(--r-sm); background: var(--accent-tint); border: 1px solid var(--accent-border);">
              <div style="font-size: 12px; font-weight: 600; color: var(--accent); margin-bottom: 8px;">Oynatma Listesi Video Aralığı:</div>
              <div style="display: flex; gap: 10px; align-items: center;">
                <span style="font-size: 12px; color: var(--text-2);">Başlangıç:</span>
                <input type="number" id="yt-playlist-start" class="field-input" value="1" min="1" style="width: 80px; padding: 6px 10px;">
                <span style="font-size: 12px; color: var(--text-2);">Bitiş:</span>
                <input type="number" id="yt-playlist-end" class="field-input" placeholder="Tümü" min="1" style="width: 90px; padding: 6px 10px;">
                <span style="font-size: 11px; color: var(--text-3);">(Boş bırakılırsa tüm liste sırayla indirilir)</span>
              </div>
            </div>

            <!-- Eylem Butonları -->
            <div class="action-bar glass-soft" style="gap: 10px; padding: 12px;">
              <button class="btn btn-primary" id="yt-start-download-btn" style="flex: 2; padding: 12px 20px; font-weight: 600;">
                ${window.UlakIcons.getIcon('download', 'icon-mono-sm')} Seçili Yapılandırma ile İndir
              </button>
              <button class="btn btn-secondary" id="yt-dl-mp3-quick-btn" style="flex: 1; padding: 12px 16px;">
                ${window.UlakIcons.getIcon('headphones', 'icon-mono-sm')} Hızlı MP3 Ses
              </button>
            </div>
          </div>

          <!-- Video Önizleme Kartı (Sade İndirme Düzeyleri ve Modal Önizleme Tetikleyicileri) -->
          <div class="view-section glass-card" id="yt-preview-card" style="display: none; margin-bottom: 20px;">
            <div style="display: flex; gap: 18px; align-items: center; flex-wrap: wrap;">
              <div style="position: relative; width: 190px; height: 108px; border-radius: var(--r-sm); overflow: hidden; background: var(--glass-surface-subtle); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow-sm); cursor: pointer;" id="yt-thumb-container" title="ULAK Medya Oynatıcıda Önizle">
                <img id="yt-thumb" src="" alt="Thumbnail" style="width: 100%; height: 100%; object-fit: cover;">
                <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                  <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center;">
                    ${window.UlakIcons.getIcon('play', 'icon-mono-sm')}
                  </div>
                </div>
                <span id="yt-duration-badge" class="chip" style="position: absolute; bottom: 6px; right: 6px; font-size: 10px; background: rgba(0,0,0,0.85); color: #ffffff; padding: 2px 6px; font-variant-numeric: tabular-nums;">--:--</span>
              </div>
              <div style="flex: 1; min-width: 250px;">
                <div style="font-size: 16px; font-weight: 700; color: var(--text-1); line-height: 1.4;" id="yt-title">Video Başlığı</div>
                <div style="font-size: 13px; color: var(--accent); margin-top: 6px; font-weight: 600;" id="yt-author">Kanal: --</div>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap;">
                  <span style="font-size: 12px; color: var(--text-3); font-variant-numeric: tabular-nums;" id="yt-duration-text">Toplam Süre: --</span>
                  <button class="btn btn-secondary btn-sm" id="yt-btn-toggle-embed" style="padding: 3px 10px; font-size: 11px;" aria-label="Video Olarak Önizle">
                    ${window.UlakIcons.getIcon('play', 'icon-mono-xs')} Video Önizle
                  </button>
                  <button class="btn btn-secondary btn-sm" id="yt-btn-toggle-audio-preview" style="padding: 3px 10px; font-size: 11px;" aria-label="Ses Olarak Önizle">
                    ${window.UlakIcons.getIcon('headphones', 'icon-mono-xs')} MP3 / Ses Önizle
                  </button>
                </div>
              </div>
            </div>

            <!-- Sade Hızlı İndirme Düzeyleri Çubuğu -->
            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase;">İndirme Düzeyi:</span>
                <span style="font-size: 11px; color: var(--text-3);">(Tek tıkla indir)</span>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;" id="yt-quick-level-buttons">
                <button class="btn btn-secondary btn-sm yt-level-btn" data-quality="1080p" data-label="Full HD 1080p" title="1080p kalitede indir">
                  ${window.UlakIcons.getIcon('download', 'icon-mono-xs')} 1080p
                </button>
                <button class="btn btn-secondary btn-sm yt-level-btn" data-quality="720p" data-label="HD 720p" title="720p kalitede indir">
                  ${window.UlakIcons.getIcon('download', 'icon-mono-xs')} 720p
                </button>
                <button class="btn btn-secondary btn-sm yt-level-btn" data-quality="480p" data-label="SD 480p" title="480p kalitede indir">
                  ${window.UlakIcons.getIcon('download', 'icon-mono-xs')} 480p
                </button>
                <button class="btn btn-secondary btn-sm yt-level-btn" data-quality="audio-mp3" data-label="MP3 Ses" title="MP3 formatında ses indir">
                  ${window.UlakIcons.getIcon('headphones', 'icon-mono-xs')} MP3
                </button>
                <button class="btn btn-primary btn-sm yt-level-btn" data-quality="best" data-label="En İyi Kalite" title="Mevcut en yüksek kalitede indir">
                  ${window.UlakIcons.getIcon('zap', 'icon-mono-xs')} En İyi Kalite
                </button>
              </div>
            </div>
          </div>

          <!-- ULAK ÖZEL MEDYA OYNATICI MODALI (UI Skills Baseline-UI & Liquid Glass) -->
          <div class="ulak-media-modal-overlay" id="ulak-media-modal" role="dialog" aria-modal="true" aria-labelledby="ulak-modal-title">
            <div class="ulak-media-dialog">
              <!-- Modal Üst Başlık Barı -->
              <div class="ulak-media-header">
                <div class="ulak-media-header-left">
                  <span class="chip chip-accent" id="ulak-modal-badge" style="font-size: 10.5px; font-weight: 700;">ULAK OYNATICI</span>
                  <div class="ulak-media-title" id="ulak-modal-title">Medya Oynatılıyor</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                  <div id="ulak-modal-preview-switch" style="display: none; gap: 6px;">
                    <button class="btn btn-secondary btn-sm" id="ulak-modal-switch-video" style="padding: 3px 9px; font-size: 11px;">Video</button>
                    <button class="btn btn-secondary btn-sm" id="ulak-modal-switch-audio" style="padding: 3px 9px; font-size: 11px;">MP3 Ses</button>
                  </div>
                  <button class="btn btn-secondary btn-sm" id="ulak-modal-open-system-btn" style="display: none; padding: 4px 10px; font-size: 11px;" title="Varsayılan Windows Oynatıcısında Aç" aria-label="Sistem Oynatıcısında Aç">
                    ${window.UlakIcons.getIcon('external-link', 'icon-mono-xs')} Sistemde Aç
                  </button>
                  <button class="btn btn-secondary btn-sm" id="ulak-modal-fullscreen-btn" style="display: none; padding: 4px 8px; font-size: 11px;" title="Tam Ekran" aria-label="Tam Ekran">
                    ${window.UlakIcons.getIcon('maximize', 'icon-mono-xs')}
                  </button>
                  <button class="btn btn-ghost btn-sm" id="ulak-modal-close-btn" title="Oynatıcıyı Kapat (ESC)" aria-label="Oynatıcıyı Kapat" style="padding: 4px 8px; font-weight: 700;">✕</button>
                </div>
              </div>

              <!-- Medya Sahnesi (Video veya Ses Deck) -->
              <div class="ulak-media-stage" id="ulak-media-stage">
                <!-- Video Sahnesi -->
                <div class="ulak-media-video-wrap" id="ulak-modal-video-wrap" style="display: none;" title="Oynat / Duraklat (Çift tıkla: Tam Ekran)">
                  <video id="ulak-modal-video" preload="metadata"></video>
                </div>

                <!-- Ses (MP3 / Audio) Sahnesi -->
                <div class="ulak-media-audio-stage" id="ulak-modal-audio-stage" style="display: none;">
                  <div class="ulak-audio-disc" id="ulak-audio-disc">
                    ${window.UlakIcons.getIcon('headphones', 'icon-mono-lg')}
                  </div>
                  <div class="ulak-audio-meta">
                    <div class="ulak-audio-track-name" id="ulak-audio-track-name">Ses Dosyası</div>
                    <div class="ulak-audio-track-sub" id="ulak-audio-track-sub">ULAK Stüdyo Ses Motoru • 320 kbps</div>
                  </div>
                  <div class="ulak-eq-bars is-paused" id="ulak-eq-bars" aria-hidden="true">
                    <span class="ulak-eq-bar"></span>
                    <span class="ulak-eq-bar"></span>
                    <span class="ulak-eq-bar"></span>
                    <span class="ulak-eq-bar"></span>
                  </div>
                  <audio id="ulak-modal-audio" preload="metadata" style="display: none;"></audio>
                </div>
              </div>

              <!-- Özel ULAK Oynatıcı Kontrolleri (İleri/Geri Sayma & Zaman Çizelgesi) -->
              <div class="ulak-media-controls">
                <!-- Zaman Çizelgesi (Seek Bar) ve Saniye Sayaçları -->
                <div class="ulak-seek-row">
                  <span class="ulak-time-label current" id="ulak-player-current-time">00:00</span>
                  <input type="range" class="ulak-range" id="ulak-player-seek" min="0" max="1000" value="0" step="1" aria-label="Medya Zaman Çizelgesi">
                  <span class="ulak-time-label" id="ulak-player-total-time">00:00</span>
                </div>

                <!-- Alt Kontrol Satırı: Ses, İleri/Geri Sarma (-10sn / +10sn) ve Hız -->
                <div class="ulak-transport-row">
                  <!-- Sol: Ses Kontrolü -->
                  <div class="ulak-transport-left">
                    <button class="btn btn-ghost btn-sm" id="ulak-btn-mute" title="Sesi Kapat / Aç" aria-label="Sesi Kapat veya Aç" style="padding: 5px 8px;">
                      ${window.UlakIcons.getIcon('volume-2', 'icon-mono-sm')}
                    </button>
                    <input type="range" class="ulak-range" id="ulak-player-volume" min="0" max="100" value="100" step="1" style="width: 84px; --seek-pct: 100%;" aria-label="Ses Seviyesi">
                    <span id="ulak-player-vol-label" style="font-size: 11px; color: var(--text-3); font-variant-numeric: tabular-nums; min-width: 32px;">100%</span>
                  </div>

                  <!-- Orta: -10sn Geri Sar | Oynat/Duraklat | +10sn İleri Sar | Başa Sar -->
                  <div class="ulak-transport-center">
                    <button class="ulak-seek-step-btn" id="ulak-btn-restart" title="Başa Sar (00:00)" aria-label="Başa Sar">
                      00:00
                    </button>
                    <button class="ulak-seek-step-btn" id="ulak-btn-rewind-10" title="10 Saniye Geri Sar (Sol Ok)" aria-label="10 Saniye Geri Sar">
                      −10 sn
                    </button>
                    <button class="ulak-play-main-btn" id="ulak-btn-play-toggle" title="Oynat / Duraklat (Boşluk)" aria-label="Oynat veya Duraklat">
                      ${window.UlakIcons.getIcon('play', 'icon-mono-sm')}
                    </button>
                    <button class="ulak-seek-step-btn" id="ulak-btn-forward-10" title="10 Saniye İleri Sar (Sağ Ok)" aria-label="10 Saniye İleri Sar">
                      +10 sn
                    </button>
                  </div>

                  <!-- Sağ: Oynatma Hızı -->
                  <div class="ulak-transport-right">
                    <span style="font-size: 11px; color: var(--text-3);">Hız:</span>
                    <button class="ulak-seek-step-btn" id="ulak-btn-speed" title="Oynatma Hızını Değiştir" aria-label="Oynatma Hızı">
                      1.0x
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- İndirilenler Kütüphanesi & Dosya Yöneticisi -->
          <div class="view-section glass-card" style="margin-bottom: 20px;">
            <div class="view-section-header" style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="view-section-title">İndirilen Medyalar Kütüphanesi</div>
                <div style="font-size: 12px; color: var(--text-2); margin-top: 2px;">Cihazınıza kaydedilmiş medya dosyaları ve depolama boyutu</div>
              </div>
              <button class="btn btn-secondary btn-sm" id="yt-refresh-library-btn">
                ${window.UlakIcons.getIcon('refresh', 'icon-mono-sm')} Yenile
              </button>
            </div>
            <div id="yt-library-container" style="margin-top: 12px; min-height: 80px;"></div>
          </div>

          <!-- İndirme Günlüğü & Terminal Çıktısı -->
          <div class="view-section glass-card" style="padding: 0;">
            ${C.consoleCard('İndirme Motoru Çıktı Günlüğü', 'Bir bağlantı girip indirme başlatın.', 'yt-log-')}
          </div>
        </div>
      `;
    },

    mount(el) {
      const urlInput = el.querySelector('#yt-url-input');
      const logBody = el.querySelector('#yt-log-body');
      const previewCard = el.querySelector('#yt-preview-card');
      const fetchBtn = el.querySelector('#yt-fetch-btn');
      const pasteBtn = el.querySelector('#yt-paste-btn');
      const startDlBtn = el.querySelector('#yt-start-download-btn');
      const dlMp3QuickBtn = el.querySelector('#yt-dl-mp3-quick-btn');
      const isPlaylistCheckbox = el.querySelector('#yt-opt-is-playlist');
      const playlistRangeBox = el.querySelector('#yt-playlist-range-box');
      const refreshLibBtn = el.querySelector('#yt-refresh-library-btn');

      // Playlist toggle
      isPlaylistCheckbox?.addEventListener('change', () => {
        playlistRangeBox.style.display = isPlaylistCheckbox.checked ? 'block' : 'none';
      });

      // Panodan Yapıştır
      pasteBtn?.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            urlInput.value = text.trim();
            window.UlakUI.toast('Bağlantı panodan yapıştırıldı.', 'info');
          }
        } catch (e) {
          window.UlakUI.toast('Pano okunamadı.', 'warning');
        }
      });

      function formatDuration(sec) {
        if (!sec || isNaN(sec)) return '--';
        sec = parseInt(sec, 10);
        const hrs = Math.floor(sec / 3600);
        const mins = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        if (hrs > 0) return `${hrs} sa ${mins} dk ${s} sn`;
        if (mins > 0) return `${mins} dk ${s} sn`;
        return `${s} sn`;
      }

      function formatDurationShort(sec) {
        if (sec === undefined || sec === null || isNaN(sec) || !isFinite(sec) || sec < 0) return '00:00';
        sec = Math.floor(Number(sec));
        const hrs = Math.floor(sec / 3600);
        const mins = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        const pad = (n) => n.toString().padStart(2, '0');
        if (hrs > 0) return `${hrs}:${pad(mins)}:${pad(s)}`;
        return `${pad(mins)}:${pad(s)}`;
      }

      // Check engine status
      window.ulak.invoke('youtube:check-ytdlp').then((st) => {
        const chip = el.querySelector('#yt-engine-chip');
        if (chip) {
          chip.textContent = st.installed ? `yt-dlp Motoru Hazır` : 'yt-dlp Yüklü Değil';
          chip.className = st.installed ? 'chip chip-accent' : 'chip chip-warning';
        }
      }).catch(() => {});

      // Open Downloads Folder
      el.querySelector('#yt-open-folder-btn')?.addEventListener('click', async () => {
        try {
          await window.ulak.invoke('youtube:open-folder');
        } catch (e) {
          window.UlakUI.toast('Klasör açılamadı.', 'error');
        }
      });

      let lastPreviewInfo = null;
      let currentPlayingFile = '';

      // =========================================================================
      // ULAK STUDIO MEDIA PLAYER MODAL (UI Skills Baseline-UI & Liquid Glass)
      // =========================================================================
      const modalOverlay = el.querySelector('#ulak-media-modal');
      const modalBadge = el.querySelector('#ulak-modal-badge');
      const modalTitle = el.querySelector('#ulak-modal-title');
      const modalPreviewSwitch = el.querySelector('#ulak-modal-preview-switch');
      const modalSwitchVideoBtn = el.querySelector('#ulak-modal-switch-video');
      const modalSwitchAudioBtn = el.querySelector('#ulak-modal-switch-audio');
      const modalOpenSystemBtn = el.querySelector('#ulak-modal-open-system-btn');
      const modalFullscreenBtn = el.querySelector('#ulak-modal-fullscreen-btn');
      const modalCloseBtn = el.querySelector('#ulak-modal-close-btn');

      const modalVideoWrap = el.querySelector('#ulak-modal-video-wrap');
      const modalVideoEl = el.querySelector('#ulak-modal-video');
      const modalAudioStage = el.querySelector('#ulak-modal-audio-stage');
      const modalAudioEl = el.querySelector('#ulak-modal-audio');
      const audioTrackName = el.querySelector('#ulak-audio-track-name');
      const audioTrackSub = el.querySelector('#ulak-audio-track-sub');
      const eqBars = el.querySelector('#ulak-eq-bars');

      const seekSlider = el.querySelector('#ulak-player-seek');
      const currentTimeEl = el.querySelector('#ulak-player-current-time');
      const totalTimeEl = el.querySelector('#ulak-player-total-time');

      const btnRestart = el.querySelector('#ulak-btn-restart');
      const btnRewind10 = el.querySelector('#ulak-btn-rewind-10');
      const btnPlayToggle = el.querySelector('#ulak-btn-play-toggle');
      const btnForward10 = el.querySelector('#ulak-btn-forward-10');

      const btnMute = el.querySelector('#ulak-btn-mute');
      const volumeSlider = el.querySelector('#ulak-player-volume');
      const volLabel = el.querySelector('#ulak-player-vol-label');
      const btnSpeed = el.querySelector('#ulak-btn-speed');

      let activeMediaEl = null;
      let isSeekingDrag = false;
      let currentSpeedIdx = 1; // 1.0x
      const speedSteps = [0.75, 1.0, 1.25, 1.5, 2.0];
      let savedVolume = 1.0;

      function updatePlayButtonIcon(isPlaying) {
        if (!btnPlayToggle) return;
        btnPlayToggle.innerHTML = window.UlakIcons.getIcon(isPlaying ? 'pause' : 'play', 'icon-mono-sm');
        if (eqBars) {
          eqBars.classList.toggle('is-paused', !isPlaying);
        }
      }

      function updateSeekVisuals(currentSec, durationSec) {
        if (currentTimeEl) currentTimeEl.textContent = formatDurationShort(currentSec);
        const validDur = durationSec && isFinite(durationSec) && durationSec > 0 ? durationSec : 0;
        if (totalTimeEl && validDur > 0) {
          totalTimeEl.textContent = formatDurationShort(validDur);
        }
        if (seekSlider && !isSeekingDrag) {
          if (validDur > 0) {
            const val = Math.min(1000, Math.max(0, Math.round((currentSec / validDur) * 1000)));
            seekSlider.value = val;
            seekSlider.style.setProperty('--seek-pct', `${(val / 10).toFixed(1)}%`);
          } else {
            seekSlider.value = 0;
            seekSlider.style.setProperty('--seek-pct', '0%');
          }
        }
      }

      function bindMediaElementEvents(mediaEl) {
        if (!mediaEl) return;
        mediaEl.addEventListener('loadedmetadata', () => {
          if (mediaEl !== activeMediaEl) return;
          updateSeekVisuals(mediaEl.currentTime || 0, mediaEl.duration || 0);
        });
        mediaEl.addEventListener('durationchange', () => {
          if (mediaEl !== activeMediaEl) return;
          updateSeekVisuals(mediaEl.currentTime || 0, mediaEl.duration || 0);
        });
        mediaEl.addEventListener('timeupdate', () => {
          if (mediaEl !== activeMediaEl) return;
          updateSeekVisuals(mediaEl.currentTime || 0, mediaEl.duration || 0);
        });
        mediaEl.addEventListener('play', () => {
          if (mediaEl !== activeMediaEl) return;
          updatePlayButtonIcon(true);
        });
        mediaEl.addEventListener('pause', () => {
          if (mediaEl !== activeMediaEl) return;
          updatePlayButtonIcon(false);
        });
        mediaEl.addEventListener('ended', () => {
          if (mediaEl !== activeMediaEl) return;
          updatePlayButtonIcon(false);
          updateSeekVisuals(mediaEl.duration || 0, mediaEl.duration || 0);
        });
      }

      bindMediaElementEvents(modalVideoEl);
      bindMediaElementEvents(modalAudioEl);

      function stopAllModalMedia() {
        if (modalVideoEl) {
          modalVideoEl.pause();
          modalVideoEl.removeAttribute('src');
          modalVideoEl.load();
        }
        if (modalAudioEl) {
          modalAudioEl.pause();
          modalAudioEl.removeAttribute('src');
          modalAudioEl.load();
        }
        activeMediaEl = null;
        updatePlayButtonIcon(false);
        updateSeekVisuals(0, 0);
      }

      function closeMediaModal() {
        stopAllModalMedia();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        if (modalOverlay) {
          modalOverlay.classList.remove('is-open');
        }
      }

      function openMediaModal(opts = {}) {
        const {
          type = 'video', // 'video' | 'audio'
          src = '',
          title = 'Medya Oynatılıyor',
          subtitle = 'ULAK Stüdyo Medya Motoru',
          badge = 'ULAK OYNATICI',
          isPreview = false,
          localFilePath = '',
          fallbackDuration = 0
        } = opts;

        if (!src || !modalOverlay) return;

        stopAllModalMedia();
        currentPlayingFile = localFilePath || '';

        if (modalBadge) modalBadge.textContent = badge;
        if (modalTitle) modalTitle.textContent = title;
        if (modalPreviewSwitch) {
          modalPreviewSwitch.style.display = isPreview ? 'flex' : 'none';
        }
        if (modalOpenSystemBtn) {
          modalOpenSystemBtn.style.display = localFilePath ? 'inline-flex' : 'none';
        }
        if (modalFullscreenBtn) {
          modalFullscreenBtn.style.display = type === 'video' ? 'inline-flex' : 'none';
        }

        if (totalTimeEl) {
          totalTimeEl.textContent = fallbackDuration > 0 ? formatDurationShort(fallbackDuration) : '00:00';
        }
        if (currentTimeEl) currentTimeEl.textContent = '00:00';
        if (seekSlider) {
          seekSlider.value = 0;
          seekSlider.style.setProperty('--seek-pct', '0%');
        }

        if (type === 'audio') {
          if (modalVideoWrap) modalVideoWrap.style.display = 'none';
          if (modalAudioStage) modalAudioStage.style.display = 'flex';
          if (audioTrackName) audioTrackName.textContent = title;
          if (audioTrackSub) audioTrackSub.textContent = subtitle;
          activeMediaEl = modalAudioEl;
        } else {
          if (modalAudioStage) modalAudioStage.style.display = 'none';
          if (modalVideoWrap) modalVideoWrap.style.display = 'flex';
          activeMediaEl = modalVideoEl;
        }

        modalOverlay.classList.add('is-open');

        if (activeMediaEl) {
          const volVal = volumeSlider ? Number(volumeSlider.value) / 100 : 1;
          activeMediaEl.volume = Math.max(0, Math.min(1, volVal));
          activeMediaEl.playbackRate = speedSteps[currentSpeedIdx] || 1.0;
          activeMediaEl.src = src;
          activeMediaEl.load();
          activeMediaEl.play().catch((err) => {
            console.warn('Media play warning:', err);
          });
        }
      }

      // Seek Slider (İleri / Geri Sarma Çubuğu)
      seekSlider?.addEventListener('mousedown', () => { isSeekingDrag = true; });
      seekSlider?.addEventListener('touchstart', () => { isSeekingDrag = true; }, { passive: true });

      seekSlider?.addEventListener('input', () => {
        isSeekingDrag = true;
        const val = Number(seekSlider.value);
        seekSlider.style.setProperty('--seek-pct', `${(val / 10).toFixed(1)}%`);
        if (activeMediaEl && isFinite(activeMediaEl.duration) && activeMediaEl.duration > 0) {
          const targetSec = (val / 1000) * activeMediaEl.duration;
          if (currentTimeEl) currentTimeEl.textContent = formatDurationShort(targetSec);
          activeMediaEl.currentTime = targetSec;
        }
      });

      seekSlider?.addEventListener('change', () => {
        if (activeMediaEl && isFinite(activeMediaEl.duration) && activeMediaEl.duration > 0) {
          const val = Number(seekSlider.value);
          activeMediaEl.currentTime = (val / 1000) * activeMediaEl.duration;
        }
        isSeekingDrag = false;
      });

      // Oynat / Duraklat Butonu
      function togglePlayPause() {
        if (!activeMediaEl) return;
        if (activeMediaEl.paused || activeMediaEl.ended) {
          activeMediaEl.play().catch(() => {});
        } else {
          activeMediaEl.pause();
        }
      }

      btnPlayToggle?.addEventListener('click', togglePlayPause);

      // Video Sahnesine Tıklayınca Oynat/Duraklat, Çift Tıklayınca Tam Ekran
      modalVideoWrap?.addEventListener('click', () => {
        togglePlayPause();
      });
      modalVideoWrap?.addEventListener('dblclick', () => {
        if (!document.fullscreenElement) {
          modalVideoWrap.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      });

      // -10 sn, +10 sn ve 00:00 Başa Sarma Butonları
      function seekByOffset(offsetSec) {
        if (!activeMediaEl) return;
        const dur = isFinite(activeMediaEl.duration) && activeMediaEl.duration > 0 ? activeMediaEl.duration : 999999;
        const nextTime = Math.max(0, Math.min(dur, (activeMediaEl.currentTime || 0) + offsetSec));
        activeMediaEl.currentTime = nextTime;
        updateSeekVisuals(nextTime, activeMediaEl.duration || 0);
      }

      btnRewind10?.addEventListener('click', () => seekByOffset(-10));
      btnForward10?.addEventListener('click', () => seekByOffset(10));
      btnRestart?.addEventListener('click', () => {
        if (!activeMediaEl) return;
        activeMediaEl.currentTime = 0;
        updateSeekVisuals(0, activeMediaEl.duration || 0);
        if (activeMediaEl.paused) activeMediaEl.play().catch(() => {});
      });

      // Ses Seviyesi ve Sessize Alma
      function syncVolumeUI(vol, muted) {
        const effectiveVol = muted ? 0 : Math.round(vol * 100);
        if (volumeSlider) {
          volumeSlider.value = effectiveVol;
          volumeSlider.style.setProperty('--seek-pct', `${effectiveVol}%`);
        }
        if (volLabel) volLabel.textContent = `${effectiveVol}%`;
        if (btnMute) {
          btnMute.innerHTML = window.UlakIcons.getIcon(effectiveVol === 0 ? 'volume-x' : 'volume-2', 'icon-mono-sm');
        }
      }

      volumeSlider?.addEventListener('input', () => {
        const val = Number(volumeSlider.value) / 100;
        savedVolume = val > 0 ? val : savedVolume;
        if (activeMediaEl) {
          activeMediaEl.muted = val === 0;
          activeMediaEl.volume = val;
        }
        syncVolumeUI(val, val === 0);
      });

      btnMute?.addEventListener('click', () => {
        if (!activeMediaEl) return;
        activeMediaEl.muted = !activeMediaEl.muted;
        if (!activeMediaEl.muted && activeMediaEl.volume === 0) {
          activeMediaEl.volume = savedVolume || 0.8;
        }
        syncVolumeUI(activeMediaEl.volume, activeMediaEl.muted);
      });

      // Hız Değiştirme (0.75x - 2.0x)
      btnSpeed?.addEventListener('click', () => {
        currentSpeedIdx = (currentSpeedIdx + 1) % speedSteps.length;
        const rate = speedSteps[currentSpeedIdx];
        if (btnSpeed) btnSpeed.textContent = `${rate.toFixed(rate % 1 === 0 ? 1 : 2)}x`;
        if (activeMediaEl) activeMediaEl.playbackRate = rate;
      });

      // Tam Ekran, Sistemde Aç ve Kapat
      modalFullscreenBtn?.addEventListener('click', () => {
        const target = modalVideoWrap || el.querySelector('.ulak-media-dialog');
        if (!document.fullscreenElement) {
          target?.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      });

      modalOpenSystemBtn?.addEventListener('click', async () => {
        if (currentPlayingFile) {
          await window.ulak.invoke('youtube:open-file', currentPlayingFile);
        }
      });

      modalCloseBtn?.addEventListener('click', closeMediaModal);
      modalOverlay?.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeMediaModal();
      });

      // Klavye Kısayolları (Modal Açıkken: Boşluk = Oynat/Durdur, Sol/Sağ Ok = -5/+5 sn, ESC = Kapat)
      const onModalKeyDown = (e) => {
        if (!modalOverlay || !modalOverlay.classList.contains('is-open')) return;
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag === 'input' && e.target.type === 'text') return;

        if (e.key === 'Escape') {
          e.preventDefault();
          closeMediaModal();
        } else if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          togglePlayPause();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          seekByOffset(-5);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          seekByOffset(5);
        }
      };
      window.addEventListener('keydown', onModalKeyDown);

      // Canlı Önizleme Başlatıcı (Modal İçinde)
      function startLivePreview(mode = 'video') {
        if (!lastPreviewInfo) return;
        const videoStream = lastPreviewInfo.previewVideoUrl || '';
        const audioStream = lastPreviewInfo.previewAudioUrl || videoStream;
        const fallbackDur = Number(lastPreviewInfo.duration) || 0;

        if (mode === 'audio' && audioStream) {
          openMediaModal({
            type: 'audio',
            src: audioStream,
            title: lastPreviewInfo.title || 'Canlı Ses Önizleme',
            subtitle: `Kanal: ${lastPreviewInfo.uploader || 'YouTube'} • Canlı Ses Akışı`,
            badge: 'CANLI SES ÖNİZLEME',
            isPreview: true,
            fallbackDuration: fallbackDur
          });
        } else if (videoStream) {
          openMediaModal({
            type: 'video',
            src: videoStream,
            title: lastPreviewInfo.title || 'Canlı Video Önizleme',
            subtitle: `Kanal: ${lastPreviewInfo.uploader || 'YouTube'}`,
            badge: 'CANLI VİDEO ÖNİZLEME',
            isPreview: true,
            fallbackDuration: fallbackDur
          });
        } else {
          window.UlakUI.toast('Bu medya için doğrudan önizleme akışı bulunamadı.', 'info');
        }
      }

      modalSwitchVideoBtn?.addEventListener('click', () => startLivePreview('video'));
      modalSwitchAudioBtn?.addEventListener('click', () => startLivePreview('audio'));

      // İndirilen Dosyayı Oynatıcı Modalında Aç
      function playDownloadedMedia(filePath) {
        if (!filePath) return;
        const mediaUrl = `media-file://local/?path=${encodeURIComponent(filePath)}`;
        const fileName = filePath.split(/[/\\]/).pop() || 'Medya Dosyası';
        const ext = fileName.split('.').pop().toLowerCase();
        const isAudio = ['mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg', 'opus'].includes(ext);

        openMediaModal({
          type: isAudio ? 'audio' : 'video',
          src: mediaUrl,
          title: fileName,
          subtitle: isAudio ? `Yerel Ses Dosyası (${ext.toUpperCase()}) • ULAK Stüdyo` : `Yerel Video Dosyası (${ext.toUpperCase()})`,
          badge: isAudio ? 'ULAK SES OYNATICI' : 'ULAK VİDEO OYNATICI',
          isPreview: false,
          localFilePath: filePath
        });
      }

      // Windows Arka Plan Bildirimine Tıklandığında Oynatıcıyı Aç
      if (window.ulak && typeof window.ulak.on === 'function') {
        window.ulak.on('youtube:play-downloaded', (filePath) => {
          if (filePath) {
            loadLibrary(el);
            playDownloadedMedia(filePath);
          }
        });
      }

      // Thumbnail veya Butona Tıklanınca Canlı Önizle
      el.querySelector('#yt-thumb-container')?.addEventListener('click', () => {
        const selectedQuality = el.querySelector('#yt-opt-quality')?.value || 'best';
        startLivePreview(selectedQuality.startsWith('audio') ? 'audio' : 'video');
      });
      el.querySelector('#yt-btn-toggle-embed')?.addEventListener('click', () => {
        startLivePreview('video');
      });
      el.querySelector('#yt-btn-toggle-audio-preview')?.addEventListener('click', () => {
        startLivePreview('audio');
      });

      // Önizle (Eski Adı: Bilgi Getir)
      fetchBtn?.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) return window.UlakUI.toast('Lütfen bir video veya müzik bağlantısı girin!', 'warning');

        fetchBtn.disabled = true;
        fetchBtn.innerHTML = `<span class="spinner-inline"></span> Önizleniyor...`;
        window.UlakUI.toast('Medya önizleme akışı hazırlanıyor...', 'info');

        try {
          const info = await window.ulak.invoke('youtube:get-info', url);
          if (!info || !info.success) {
            logBody.textContent += `\n[-] Bilgi alınamadı: ${info?.message || 'Video bulunamadı.'}\n`;
            window.UlakUI.toast(`Önizleme alınamadı: ${info?.message || 'Hata'}`, 'error');
            previewCard.style.display = 'none';
            return;
          }

          lastPreviewInfo = info;
          previewCard.style.display = 'block';
          const thumbEl = el.querySelector('#yt-thumb');
          if (thumbEl) thumbEl.src = info.thumbnail || '';
          el.querySelector('#yt-title').textContent = info.title || 'Video';
          el.querySelector('#yt-author').textContent = `Kanal: ${info.uploader || 'YouTube'}`;

          const durationText = el.querySelector('#yt-duration-text');
          const durationBadge = el.querySelector('#yt-duration-badge');
          const hasValidDuration = info.duration && info.duration !== '--' && !isNaN(info.duration) && parseInt(info.duration) > 0;

          if (hasValidDuration) {
            durationText.textContent = `Toplam Süre: ${formatDuration(info.duration)}`;
            if (durationBadge) {
              durationBadge.textContent = formatDurationShort(info.duration);
              durationBadge.style.display = 'inline-block';
            }
          } else {
            durationText.textContent = 'Toplam Süre: Çevrimiçi Medya';
            if (durationBadge) durationBadge.style.display = 'none';
          }

          // Seçili formata göre (Video veya Ses/MP3) otomatik canlı önizlemeyi başlat
          const selectedQuality = el.querySelector('#yt-opt-quality')?.value || 'best';
          const previewMode = selectedQuality.startsWith('audio') ? 'audio' : 'video';
          startLivePreview(previewMode);

          const durStr = hasValidDuration ? formatDuration(info.duration) : 'Mevcut';
          logBody.textContent += `\n[✔] Medya tespit edildi ve canlı önizleme başlatıldı:\n    Başlık: ${info.title}\n    Kanal: ${info.uploader}\n    Süre: ${durStr}\n`;
          logBody.scrollTop = logBody.scrollHeight;
          window.UlakUI.toast('Canlı önizleme oynatılıyor!', 'success');
        } catch (err) {
          logBody.textContent += `\n[-] İstek hatası: ${err.message}\n`;
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        } finally {
          fetchBtn.disabled = false;
          fetchBtn.innerHTML = `${window.UlakIcons.getIcon('play', 'icon-mono-sm')} Önizle`;
        }
      });

      // Ana İndirme İşlemi
      startDlBtn?.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) return window.UlakUI.toast('Lütfen bir video bağlantısı girin!', 'warning');

        const quality = el.querySelector('#yt-opt-quality')?.value || 'best';
        const rateLimit = el.querySelector('#yt-opt-rate')?.value || 'unlimited';
        const concurrentChunks = el.querySelector('#yt-opt-threads')?.value || '4';
        const downloadSubtitles = el.querySelector('#yt-opt-subtitles')?.checked || false;
        const isPlaylist = el.querySelector('#yt-opt-is-playlist')?.checked || false;

        startDlBtn.disabled = true;
        startDlBtn.innerHTML = `<span class="spinner-inline"></span> İndiriliyor...`;

        const options = {
          quality,
          rateLimit,
          concurrentChunks,
          downloadSubtitles
        };

        if (isPlaylist) {
          options.start = parseInt(el.querySelector('#yt-playlist-start')?.value) || 1;
          const endVal = el.querySelector('#yt-playlist-end')?.value;
          if (endVal) options.end = parseInt(endVal);
        }

        logBody.textContent += `\n[+] İndirme başlatıldı...\n    URL: ${url}\n    Kalite: ${quality}\n    Hız Sınırı: ${rateLimit}\n    Altyazı: ${downloadSubtitles ? 'Evet' : 'Hayır'}\n`;
        logBody.scrollTop = logBody.scrollHeight;
        window.UlakUI.toast('İndirme işlemi arka planda yürütülüyor...', 'info');

        try {
          let res;
          if (isPlaylist) {
            res = await window.ulak.invoke('youtube:download-playlist', url, options);
          } else {
            res = await window.ulak.invoke('youtube:download', url, options);
          }

          if (!res || !res.success) {
            logBody.textContent += `[-] İndirme başarısız: ${res?.message || 'Bilinmeyen hata'}\n`;
            window.UlakUI.toast(`Hata: ${res?.message || 'İndirme tamamlanamadı.'}`, 'error');
          } else {
            const targetPath = res.filePath || res.path;
            logBody.textContent += `[✔] İndirme başarıyla tamamlandı!\n    Dosya: ${targetPath}\n`;
            window.UlakUI.toast('İndirme başarıyla tamamlandı! Oynatıcı başlatılıyor...', 'success');
            loadLibrary(el);
            playDownloadedMedia(targetPath);
          }
        } catch (err) {
          logBody.textContent += `[-] Sistem hatası: ${err.message}\n`;
          window.UlakUI.toast(`Hata: ${err.message}`, 'error');
        } finally {
          startDlBtn.disabled = false;
          startDlBtn.innerHTML = `${window.UlakIcons.getIcon('download', 'icon-mono-sm')} Seçili Yapılandırma ile İndir`;
          logBody.scrollTop = logBody.scrollHeight;
        }
      });

      // Hızlı MP3 İndir
      dlMp3QuickBtn?.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) return window.UlakUI.toast('Lütfen bir video bağlantısı girin!', 'warning');

        dlMp3QuickBtn.disabled = true;
        dlMp3QuickBtn.innerHTML = `<span class="spinner-inline"></span> Ses Ayrıştırılıyor...`;
        window.UlakUI.toast('MP3 ses indirme başladı...', 'info');

        try {
          const res = await window.ulak.invoke('youtube:download', url, { quality: 'audio-mp3', audioOnly: true });
          if (res && res.success) {
            const targetPath = res.filePath || res.path;
            logBody.textContent += `\n[✔] MP3 Ses başarıyla indirildi!\n    Konum: ${targetPath}\n`;
            window.UlakUI.toast('MP3 sesi indirildi ve çalınıyor!', 'success');
            loadLibrary(el);
            playDownloadedMedia(targetPath);
          } else {
            window.UlakUI.toast(res?.message || 'Ses indirilemedi.', 'error');
          }
        } catch (e) {
          window.UlakUI.toast(`Hata: ${e.message}`, 'error');
        } finally {
          dlMp3QuickBtn.disabled = false;
          dlMp3QuickBtn.innerHTML = `${window.UlakIcons.getIcon('headphones', 'icon-mono-sm')} Hızlı MP3 Ses`;
          logBody.scrollTop = logBody.scrollHeight;
        }
      });

      // Sade Hızlı İndirme Düzeyleri (Tek Tıkla İndirme Butonları)
      el.querySelectorAll('.yt-level-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const url = urlInput.value.trim();
          if (!url) return window.UlakUI.toast('Lütfen bir video bağlantısı girin!', 'warning');

          const quality = btn.getAttribute('data-quality') || 'best';
          const label = btn.getAttribute('data-label') || quality;
          const origHtml = btn.innerHTML;
          btn.disabled = true;
          btn.innerHTML = `<span class="spinner-inline"></span> İndiriliyor...`;

          logBody.textContent += `\n[+] Hızlı Düzey İndirme Başlatıldı:\n    URL: ${url}\n    Seçilen Düzey: ${label}\n`;
          logBody.scrollTop = logBody.scrollHeight;
          window.UlakUI.toast(`${label} indirme işlemi başlatıldı...`, 'info');

          try {
            const isAudio = quality.startsWith('audio');
            const res = await window.ulak.invoke('youtube:download', url, {
              quality,
              audioOnly: isAudio,
              downloadSubtitles: false
            });

            if (!res || !res.success) {
              logBody.textContent += `[-] İndirme başarısız: ${res?.message || 'Bilinmeyen hata'}\n`;
              window.UlakUI.toast(`Hata: ${res?.message || 'İndirme tamamlanamadı.'}`, 'error');
            } else {
              const targetPath = res.filePath || res.path;
              logBody.textContent += `[✔] İndirme başarıyla tamamlandı!\n    Dosya: ${targetPath}\n`;
              window.UlakUI.toast(`${label} başarıyla indirildi! Oynatılıyor...`, 'success');
              loadLibrary(el);
              playDownloadedMedia(targetPath);
            }
          } catch (err) {
            logBody.textContent += `[-] Sistem hatası: ${err.message}\n`;
            window.UlakUI.toast(`Hata: ${err.message}`, 'error');
          } finally {
            btn.disabled = false;
            btn.innerHTML = origHtml;
            logBody.scrollTop = logBody.scrollHeight;
          }
        });
      });

      // Konsol Kopyalama & Temizleme Butonları
      const copyLogBtn = el.querySelector('#yt-log-copy-btn');
      const clearLogBtn = el.querySelector('#yt-log-clear-btn');

      copyLogBtn?.addEventListener('click', async () => {
        const text = logBody ? (logBody.innerText || logBody.textContent || '').trim() : '';
        if (!text || text === 'Hazır.' || text === 'Bir bağlantı girip indirme başlatın.') {
          return window.UlakUI.toast('Kopyalanacak günlük içeriği bulunmuyor.', 'warning');
        }
        try {
          await window.ulak.invoke('system:copy-clipboard', text);
          window.UlakUI.toast('Günlük çıktısı panoya kopyalandı.', 'success');
        } catch (e) {
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(text);
              window.UlakUI.toast('Günlük çıktısı panoya kopyalandı.', 'success');
            } else {
              const ta = document.createElement('textarea');
              ta.value = text;
              ta.style.position = 'fixed';
              ta.style.opacity = '0';
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              document.body.removeChild(ta);
              window.UlakUI.toast('Günlük çıktısı panoya kopyalandı.', 'success');
            }
          } catch (e2) {
            window.UlakUI.toast('Kopyalama başarısız oldu.', 'error');
          }
        }
      });

      clearLogBtn?.addEventListener('click', () => {
        if (logBody) {
          logBody.textContent = 'Günlük temizlendi. Yeni indirme bekleniyor...';
          window.UlakUI.toast('Konsol çıktısı temizlendi.', 'info');
        }
      });

      // Kütüphane Yenile
      refreshLibBtn?.addEventListener('click', () => loadLibrary(el));

      // Kütüphane Yükleme Fonksiyonu
      async function loadLibrary(containerEl) {
        const listDiv = containerEl.querySelector('#yt-library-container');
        if (!listDiv) return;
        window.UlakUI.state(listDiv, 'loading', { title: 'İndirilen dosyalar taranıyor...' });

        try {
          const downloads = await window.ulak.invoke('youtube:get-downloads');
          if (!downloads || downloads.length === 0) {
            return window.UlakUI.state(listDiv, 'empty', { title: 'Henüz indirilmiş bir dosya bulunmamaktadır.' });
          }

          listDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${downloads.map(d => {
                const isAudio = d.name.endsWith('.mp3') || d.name.endsWith('.flac') || d.name.endsWith('.wav') || d.name.endsWith('.m4a');
                const isSub = d.name.endsWith('.srt') || d.name.endsWith('.vtt');
                const icon = isAudio ? 'headphones' : isSub ? 'file' : 'video';
                return `
                  <div class="glass-card" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; gap: 12px; background: var(--glass-surface-subtle);">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                      <div class="chip" style="padding: 6px; border-radius: var(--r-sm);">
                        ${window.UlakIcons.getIcon(icon, 'icon-mono-sm')}
                      </div>
                      <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 13px; font-weight: 600; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${d.name}</div>
                        <div style="font-size: 11px; color: var(--text-3); margin-top: 2px; font-variant-numeric: tabular-nums;">${d.size} MB • ${new Date(d.modified).toLocaleString('tr-TR')}</div>
                      </div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                      <button class="btn btn-primary btn-sm yt-btn-play-lib" data-path="${d.path}" title="Uygulama İçinde Oynat / Dinle">
                        ${window.UlakIcons.getIcon('play', 'icon-mono-xs')} Oynat
                      </button>
                      <button class="btn btn-secondary btn-sm yt-btn-open-system" data-path="${d.path}" title="Varsayılan Windows Oynatıcısında Aç">
                        ${window.UlakIcons.getIcon('external-link', 'icon-mono-xs')}
                      </button>
                      <button class="btn btn-danger-soft btn-sm yt-btn-delete" data-path="${d.path}" title="Dosyayı Sil">
                        ${window.UlakIcons.getIcon('trash', 'icon-mono-xs')}
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `;

          // Oynat Butonları
          listDiv.querySelectorAll('.yt-btn-play-lib').forEach(btn => {
            btn.addEventListener('click', () => {
              const filePath = btn.getAttribute('data-path');
              if (filePath) playDownloadedMedia(filePath);
            });
          });

          // Sistemde Aç Butonları
          listDiv.querySelectorAll('.yt-btn-open-system').forEach(btn => {
            btn.addEventListener('click', async () => {
              const filePath = btn.getAttribute('data-path');
              if (filePath) await window.ulak.invoke('youtube:open-file', filePath);
            });
          });

          // Silme Butonları
          listDiv.querySelectorAll('.yt-btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
              const filePath = btn.getAttribute('data-path');
              const ok = await window.UlakUI.confirm('Dosyayı Sil', 'Bu medya dosyasını silmek istediğinize emin misiniz?', 'Sil');
              if (ok) {
                const res = await window.ulak.invoke('youtube:delete-file', filePath);
                if (res && res.success) {
                  window.UlakUI.toast('Dosya silindi.', 'info');
                  loadLibrary(containerEl);
                } else {
                  window.UlakUI.toast('Dosya silinemedi.', 'error');
                }
              }
            });
          });
        } catch (e) {
          window.UlakUI.state(listDiv, 'error', { desc: e.message });
        }
      }

      // İlk açılışta kütüphaneyi yükle
      loadLibrary(el);
    }
  };

  window.UlakRouter.register(view);
})();
