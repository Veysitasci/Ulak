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
                <div class="setting-row-icon" style="width: 50px; height: 50px; border-radius: var(--r-md);">
                  ${window.UlakIcons.getIcon('video', 'icon-mono-lg')}
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
              <div class="glass-card" style="padding: 14px; background: rgba(255,255,255,0.02);">
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
              <div class="glass-card" style="padding: 14px; background: rgba(255,255,255,0.02);">
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
              <div class="glass-card" style="padding: 14px; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; justify-content: center; gap: 8px;">
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
            <div id="yt-playlist-range-box" style="display: none; margin-bottom: 16px; padding: 12px; border-radius: var(--r-sm); background: rgba(var(--accent-rgb, 100, 150, 255), 0.08); border: 1px solid var(--glass-border);">
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

          <!-- Video Önizleme Kartı (Sade İndirme Düzeyleri ve Canlı Oynatıcı) -->
          <div class="view-section glass-card" id="yt-preview-card" style="display: none; margin-bottom: 20px;">
            <!-- Canlı Embed Oynatıcı (YouTube veya Harici) -->
            <div id="yt-embed-player-wrap" style="display: none; width: 100%; aspect-ratio: 16/9; max-height: 380px; border-radius: var(--r-md); overflow: hidden; margin-bottom: 14px; background: #000; border: 1px solid var(--glass-border);">
              <iframe id="yt-embed-iframe" src="" style="width: 100%; height: 100%; border: none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>

            <div style="display: flex; gap: 18px; align-items: center; flex-wrap: wrap;">
              <div style="position: relative; width: 190px; height: 108px; border-radius: var(--r-sm); overflow: hidden; background: var(--glass-bg-soft); border: 1px solid var(--glass-border); box-shadow: 0 4px 14px rgba(0,0,0,0.3); cursor: pointer;" id="yt-thumb-container" title="Canlı Önizlemeyi Başlat">
                <img id="yt-thumb" src="" alt="Thumbnail" style="width: 100%; height: 100%; object-fit: cover;">
                <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; transition: background var(--transition-fast);">
                  <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px var(--accent-glow);">
                    ${window.UlakIcons.getIcon('play', 'icon-mono-sm')}
                  </div>
                </div>
                <span id="yt-duration-badge" class="chip" style="position: absolute; bottom: 6px; right: 6px; font-size: 10px; background: rgba(0,0,0,0.85); padding: 2px 6px; font-variant-numeric: tabular-nums;">--:--</span>
              </div>
              <div style="flex: 1; min-width: 250px;">
                <div style="font-size: 16px; font-weight: 700; color: var(--text-1); line-height: 1.4;" id="yt-title">Video Başlığı</div>
                <div style="font-size: 13px; color: var(--accent); margin-top: 6px; font-weight: 600;" id="yt-author">Kanal: --</div>
                <div style="display: flex; align-items: center; gap: 12px; margin-top: 6px;">
                  <span style="font-size: 12px; color: var(--text-3); font-variant-numeric: tabular-nums;" id="yt-duration-text">Toplam Süre: --</span>
                  <button class="btn btn-secondary btn-sm" id="yt-btn-toggle-embed" style="padding: 2px 8px; font-size: 11px;">
                    ${window.UlakIcons.getIcon('play', 'icon-mono-xs')} Canlı Önizle
                  </button>
                </div>
              </div>
            </div>

            <!-- Sade Hızlı İndirme Düzeyleri Çubuğu -->
            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.5px; color: var(--text-2); text-transform: uppercase;">İndirme Düzeyi:</span>
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

          <!-- İndirilen Medya Oynatıcısı (İndirildikten Sonra Video ise Video, MP3 ise Ses Çalar) -->
          <div class="view-section glass-card liquid-glow" id="yt-downloaded-player-card" style="display: none; margin-bottom: 20px; border-color: var(--accent-border);">
            <div class="view-section-header" style="margin-bottom: 12px;">
              <div class="view-section-title" style="color: var(--accent);">
                ${window.UlakIcons.getIcon('play', 'icon-mono-sm')} <span id="yt-player-header-title">Oynatılıyor</span>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary btn-sm" id="yt-player-open-system-btn" title="Varsayılan Windows Oynatıcısında Aç">
                  ${window.UlakIcons.getIcon('external-link', 'icon-mono-xs')} Sistem Oynatıcısında Aç
                </button>
                <button class="btn btn-ghost btn-sm" id="yt-player-close-btn" title="Oynatıcıyı Kapat">✕</button>
              </div>
            </div>

            <!-- Video Player -->
            <div id="yt-player-video-box" style="display: none; width: 100%; border-radius: var(--r-sm); overflow: hidden; background: #000; border: 1px solid var(--glass-border);">
              <video id="yt-player-video" controls autoplay style="width: 100%; max-height: 400px; display: block;"></video>
            </div>

            <!-- Audio Player (MP3 / Ses) -->
            <div id="yt-player-audio-box" style="display: none; padding: 14px 18px; border-radius: var(--r-sm); background: var(--glass-surface-dense); border: 1px solid var(--glass-border);">
              <div style="display: flex; align-items: center; gap: 14px;">
                <div class="chip chip-accent" style="width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  ${window.UlakIcons.getIcon('headphones', 'icon-mono-md')}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div id="yt-player-audio-title" style="font-weight: 700; font-size: 13.5px; color: var(--text-1); margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Şarkı Başlığı</div>
                  <audio id="yt-player-audio" controls autoplay style="width: 100%; height: 38px; outline: none;"></audio>
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
        if (!sec || isNaN(sec)) return '--:--';
        sec = parseInt(sec, 10);
        const hrs = Math.floor(sec / 3600);
        const mins = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        const pad = (n) => n.toString().padStart(2, '0');
        if (hrs > 0) return `${hrs}:${pad(mins)}:${pad(s)}`;
        return `${mins}:${pad(s)}`;
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

      function extractYouTubeId(url) {
        if (!url) return null;
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        return match ? match[1] : null;
      }

      function toggleLiveEmbed(url) {
        const embedWrap = el.querySelector('#yt-embed-player-wrap');
        const iframe = el.querySelector('#yt-embed-iframe');
        const ytid = extractYouTubeId(url);
        if (!embedWrap || !iframe) return;

        if (embedWrap.style.display === 'block') {
          embedWrap.style.display = 'none';
          iframe.src = '';
        } else {
          if (ytid) {
            embedWrap.style.display = 'block';
            iframe.src = `https://www.youtube-nocookie.com/embed/${ytid}?autoplay=1`;
            embedWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            window.UlakUI.toast('Bu bağlantı için gömülü web oynatıcısı desteklenmiyor.', 'info');
          }
        }
      }

      let currentPlayingFile = '';
      function playDownloadedMedia(filePath) {
        if (!filePath) return;
        const card = el.querySelector('#yt-downloaded-player-card');
        const titleHeader = el.querySelector('#yt-player-header-title');
        const videoBox = el.querySelector('#yt-player-video-box');
        const videoEl = el.querySelector('#yt-player-video');
        const audioBox = el.querySelector('#yt-player-audio-box');
        const audioEl = el.querySelector('#yt-player-audio');
        const audioTitle = el.querySelector('#yt-player-audio-title');

        if (!card) return;
        currentPlayingFile = filePath;

        const normalized = filePath.replace(/\\/g, '/');
        const mediaUrl = `media-file://${normalized}`;
        const fileName = filePath.split(/[/\\]/).pop() || 'Medya Dosyası';
        const ext = fileName.split('.').pop().toLowerCase();
        const isAudio = ['mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg', 'opus'].includes(ext);

        card.style.display = 'block';
        if (titleHeader) {
          titleHeader.textContent = isAudio ? `Oynatılıyor (Ses): ${fileName}` : `Oynatılıyor (Video): ${fileName}`;
        }

        // Önceki medyayı durdur
        if (videoEl) { videoEl.pause(); videoEl.src = ''; }
        if (audioEl) { audioEl.pause(); audioEl.src = ''; }

        if (isAudio) {
          if (videoBox) videoBox.style.display = 'none';
          if (audioBox) audioBox.style.display = 'block';
          if (audioTitle) audioTitle.textContent = fileName;
          if (audioEl) {
            audioEl.src = mediaUrl;
            audioEl.play().catch(() => {});
          }
        } else {
          if (audioBox) audioBox.style.display = 'none';
          if (videoBox) videoBox.style.display = 'block';
          if (videoEl) {
            videoEl.src = mediaUrl;
            videoEl.play().catch(() => {});
          }
        }

        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // Oynatıcı Kontrolleri (Sistemde Aç / Kapat)
      el.querySelector('#yt-player-close-btn')?.addEventListener('click', () => {
        const card = el.querySelector('#yt-downloaded-player-card');
        const videoEl = el.querySelector('#yt-player-video');
        const audioEl = el.querySelector('#yt-player-audio');
        if (videoEl) { videoEl.pause(); videoEl.src = ''; }
        if (audioEl) { audioEl.pause(); audioEl.src = ''; }
        if (card) card.style.display = 'none';
      });

      el.querySelector('#yt-player-open-system-btn')?.addEventListener('click', async () => {
        if (currentPlayingFile) {
          await window.ulak.invoke('youtube:open-file', currentPlayingFile);
        }
      });

      // Thumbnail veya Butona Tıklanınca Canlı Önizle
      el.querySelector('#yt-thumb-container')?.addEventListener('click', () => {
        toggleLiveEmbed(urlInput.value.trim());
      });
      el.querySelector('#yt-btn-toggle-embed')?.addEventListener('click', () => {
        toggleLiveEmbed(urlInput.value.trim());
      });

      // Önizle (Eski Adı: Bilgi Getir)
      fetchBtn?.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) return window.UlakUI.toast('Lütfen bir video veya müzik bağlantısı girin!', 'warning');

        fetchBtn.disabled = true;
        fetchBtn.innerHTML = `<span class="spinner-inline"></span> Önizleniyor...`;
        window.UlakUI.toast('Medya önizleme bilgileri alınıyor...', 'info');

        try {
          const info = await window.ulak.invoke('youtube:get-info', url);
          if (!info || !info.success) {
            logBody.textContent += `\n[-] Bilgi alınamadı: ${info?.message || 'Video bulunamadı.'}\n`;
            window.UlakUI.toast(`Önizleme alınamadı: ${info?.message || 'Hata'}`, 'error');
            previewCard.style.display = 'none';
            return;
          }

          previewCard.style.display = 'block';
          const thumbEl = el.querySelector('#yt-thumb');
          if (thumbEl) thumbEl.src = info.thumbnail || '';
          el.querySelector('#yt-title').textContent = info.title || 'Video';
          el.querySelector('#yt-author').textContent = `Kanal: ${info.uploader || 'YouTube'}`;
          el.querySelector('#yt-duration-text').textContent = `Toplam Süre: ${formatDuration(info.duration)}`;
          el.querySelector('#yt-duration-badge').textContent = formatDurationShort(info.duration);

          // İframe'i sıfırla
          const embedWrap = el.querySelector('#yt-embed-player-wrap');
          const iframe = el.querySelector('#yt-embed-iframe');
          if (embedWrap) embedWrap.style.display = 'none';
          if (iframe) iframe.src = '';

          logBody.textContent += `\n[✔] Medya tespit edildi:\n    Başlık: ${info.title}\n    Kanal: ${info.uploader}\n    Süre: ${formatDuration(info.duration)}\n`;
          logBody.scrollTop = logBody.scrollHeight;
          window.UlakUI.toast('Önizleme hazır!', 'success');
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
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
          } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          }
          window.UlakUI.toast('Günlük çıktısı panoya kopyalandı.', 'success');
        } catch (e) {
          window.UlakUI.toast('Kopyalama başarısız oldu.', 'error');
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
                  <div class="glass-card" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; gap: 12px; background: rgba(255,255,255,0.02);">
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
