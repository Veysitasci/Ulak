const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const https = require('https');

let appUserDataDir = null;
try {
  const { app } = require('electron');
  if (app) appUserDataDir = app.getPath('userData');
} catch (e) {
  appUserDataDir = path.join(require('os').homedir(), 'AppData', 'Roaming', 'ulak-windows');
}

const execAsync = promisify(exec);

class YouTubeDownloader {
  constructor() {
    this.downloadPath = path.join(require('os').homedir(), 'Downloads', 'ULAK');
    this.ensureDownloadDir();
  }

  async ensureDownloadDir() {
    if (!fs.existsSync(this.downloadPath)) {
      fs.mkdirSync(this.downloadPath, { recursive: true });
    }
  }

  _getYtDlpCmd() {
    // 1. Check userData/bin/yt-dlp.exe (downloaded from GitHub via Store)
    if (appUserDataDir) {
      const userBin = path.join(appUserDataDir, 'bin', 'yt-dlp.exe');
      if (fs.existsSync(userBin)) {
        return `"${userBin}"`;
      }
    }
    // 2. Check local Downloads/ULAK/yt-dlp.exe
    const localExe = path.join(this.downloadPath, 'yt-dlp.exe');
    if (fs.existsSync(localExe)) {
      return `"${localExe}"`;
    }
    // 3. Check resources/bin/yt-dlp.exe (if packaged)
    if (process.resourcesPath) {
      const packagedBin = path.join(process.resourcesPath, 'bin', 'yt-dlp.exe');
      if (fs.existsSync(packagedBin)) {
        return `"${packagedBin}"`;
      }
    }
    // 4. Fallback to system yt-dlp
    return 'yt-dlp';
  }

  _getNodeRuntimeArg() {
    const candidates = [
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Program Files (x86)\\nodejs\\node.exe'
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return `--js-runtimes "node:${c}"`;
      }
    }
    return '--js-runtimes node';
  }

  _getFfmpegPath() {
    if (appUserDataDir) {
      const userBin = path.join(appUserDataDir, 'bin', 'ffmpeg.exe');
      if (fs.existsSync(userBin)) return userBin;
    }
    const localExe = path.join(this.downloadPath, 'ffmpeg.exe');
    if (fs.existsSync(localExe)) return localExe;

    const wsBin = path.join(__dirname, '..', 'bin', 'ffmpeg.exe');
    if (fs.existsSync(wsBin)) return wsBin;

    if (process.resourcesPath) {
      const packagedBin = path.join(process.resourcesPath, 'bin', 'ffmpeg.exe');
      if (fs.existsSync(packagedBin)) return packagedBin;
    }
    return null;
  }

  async checkFfmpeg() {
    if (this._getFfmpegPath()) return true;
    try {
      await execAsync('ffmpeg -version');
      return true;
    } catch (e) {
      return false;
    }
  }

  async checkYtDlp() {
    const cmd = this._getYtDlpCmd();
    try {
      const { stdout } = await execAsync(`${cmd} --version`);
      return { installed: true, version: stdout.trim(), message: `yt-dlp hazır (${stdout.trim()})` };
    } catch (error) {
      return { installed: false, message: 'yt-dlp henüz kurulu değil. Mağaza üzerinden indirebilirsiniz.' };
    }
  }

  async installYtDlp() {
    try {
      // 0. Öncelikli kontrol: yt-dlp zaten kurulu ve sağlıklı çalışıyorsa tekrar indirmeye çalışma
      const check = await this.checkYtDlp();
      if (check.installed) {
        return { success: true, message: `yt-dlp bileşeni hazır (${check.version}).`, path: this._getYtDlpCmd() };
      }

      // 1. Çalışan kilitli yt-dlp süreci varsa güvenle sonlandır
      try {
        await execAsync('taskkill /F /IM yt-dlp.exe /T');
      } catch (e) {
        // Zaten çalışmıyorsa hata vermesi normal
      }

      await this.ensureDownloadDir();
      const targetDir = appUserDataDir ? path.join(appUserDataDir, 'bin') : path.join(__dirname, '..', 'bin');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const targetPath = path.join(targetDir, 'yt-dlp.exe');

      // Yerel pakette veya Downloads klasöründe varsa anında kopyala
      const localCandidates = [
        path.join(__dirname, '..', 'bin', 'yt-dlp.exe'),
        path.join(this.downloadPath, 'yt-dlp.exe'),
        path.join(require('os').homedir(), 'Downloads', 'ULAK', 'yt-dlp.exe')
      ];
      for (const cand of localCandidates) {
        if (cand !== targetPath && fs.existsSync(cand) && fs.statSync(cand).size > 1000000) {
          try {
            fs.copyFileSync(cand, targetPath);
            return { success: true, message: 'yt-dlp bileşeni başarıyla kuruldu.', path: targetPath };
          } catch (e) {}
        }
      }

      const tempPath = path.join(targetDir, `yt-dlp-${Date.now()}.tmp`);
      const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';

      // 2. Geçici dosyaya güvenle indir
      await execAsync(`powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('${url}', '${tempPath}')"`);

      // 3. Dosya boyutunu kontrol et (boş veya hatalı dosya inmesin)
      if (!fs.existsSync(tempPath) || fs.statSync(tempPath).size < 1000000) {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        throw new Error('İndirilen dosya doğrulanamadı.');
      }

      // 4. Eski hedef dosya varsa sil veya üzerine yaz
      if (fs.existsSync(targetPath)) {
        try {
          fs.unlinkSync(targetPath);
        } catch (e) {
          // Eğer hala kilitliyse kısa bir bekleme
          await new Promise(r => setTimeout(r, 600));
          try { fs.unlinkSync(targetPath); } catch (e2) {}
        }
      }

      // 5. Geçici dosyayı asıl hedefe taşı
      try {
        fs.renameSync(tempPath, targetPath);
      } catch (renameErr) {
        fs.copyFileSync(tempPath, targetPath);
        fs.unlinkSync(tempPath);
      }

      return { success: true, message: 'yt-dlp bileşeni başarıyla indirildi ve kuruldu.', path: targetPath };
    } catch (error) {
      let friendlyMessage = 'İndirme sırasında bir hata oluştu.';
      const raw = String(error.message || '');
      if (raw.includes('kullanıldığından') || raw.includes('IOException') || raw.includes('used by another process')) {
        friendlyMessage = 'Dosya şu an başka bir işlem tarafından kullanılıyor. Lütfen açık indirmeleri kapatıp tekrar deneyin.';
      } else if (raw.includes('WebClient') || raw.includes('NameResolutionFailure') || raw.includes('ConnectFailure') || raw.includes('timeout')) {
        friendlyMessage = 'İndirme sunucusuna erişilemedi. Lütfen internet bağlantınızı kontrol edin.';
      } else if (raw.includes('doğrulanamadı')) {
        friendlyMessage = 'İndirme tamamlanamadı. Lütfen tekrar deneyin.';
      }
      return { success: false, message: friendlyMessage };
    }
  }

  async uninstallYtDlp() {
    try {
      if (appUserDataDir) {
        const userBin = path.join(appUserDataDir, 'bin', 'yt-dlp.exe');
        if (fs.existsSync(userBin)) {
          fs.unlinkSync(userBin);
        }
      }
      const localExe = path.join(this.downloadPath, 'yt-dlp.exe');
      if (fs.existsSync(localExe)) {
        fs.unlinkSync(localExe);
      }
      return { success: true, message: 'yt-dlp kaldırıldı.' };
    } catch (error) {
      return { success: false, message: `Kaldırma hatası: ${error.message}` };
    }
  }

  async fetchOembedInfo(url) {
    return new Promise((resolve) => {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const req = https.get(oembedUrl, { timeout: 6000 }, (res) => {
          if (res.statusCode !== 200) {
            return resolve(null);
          }
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(null);
            }
          });
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  async getVideoInfo(url) {
    const oembedPromise = this.fetchOembedInfo(url);
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 8000));

    const ytdlpPromise = (async () => {
      try {
        const cmd = this._getYtDlpCmd();
        const jsRuntime = this._getNodeRuntimeArg();
        const { stdout } = await execAsync(`${cmd} ${jsRuntime} --dump-json --no-playlist "${url}"`, { maxBuffer: 15 * 1024 * 1024 });
        const jsonStart = stdout.indexOf('{');
        const jsonEnd = stdout.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const info = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
          const allFormats = Array.isArray(info.formats) ? info.formats : [];
          const progVideo = allFormats.find(f => f.format_id === '18' && f.url) ||
                            allFormats.find(f => f.vcodec && f.vcodec !== 'none' && f.acodec && f.acodec !== 'none' && f.url && !f.url.includes('.m3u8'));
          const directAudio = allFormats.find(f => f.format_id === '140' && f.url) ||
                              allFormats.find(f => f.format_id === '251' && f.url) ||
                              allFormats.find(f => (!f.vcodec || f.vcodec === 'none') && f.acodec && f.acodec !== 'none' && f.url && !f.url.includes('.m3u8'));
          return {
            success: true,
            title: info.title || 'Video',
            duration: info.duration ? Math.round(info.duration) : '--',
            uploader: info.uploader || info.channel || 'Bilinmeyen Kanal',
            thumbnail: info.thumbnail || (info.thumbnails?.length ? info.thumbnails[info.thumbnails.length - 1].url : ''),
            previewVideoUrl: progVideo ? progVideo.url : (info.url || ''),
            previewAudioUrl: directAudio ? directAudio.url : (progVideo ? progVideo.url : ''),
            formats: this.parseFormats(info.formats)
          };
        }
      } catch (e) {
        return null;
      }
      return null;
    })();

    // yt-dlp'nin eksiksiz süre ve kalite bilgisi getirmesi için 8 saniyeye kadar bekle
    const fastResult = await Promise.race([ytdlpPromise, timeoutPromise]);
    if (fastResult && fastResult.success) {
      return fastResult;
    }

    // Fallback: oEmbed
    const oembed = await oembedPromise;
    if (oembed) {
      return {
        success: true,
        title: oembed.title || 'Video',
        duration: '--',
        uploader: oembed.author_name || 'YouTube',
        thumbnail: oembed.thumbnail_url || '',
        formats: []
      };
    }

    const ytdlpResult = await ytdlpPromise;
    if (ytdlpResult && ytdlpResult.success) return ytdlpResult;

    return { success: false, message: 'Video bilgisi alınamadı. Lütfen bağlantıyı kontrol edin.' };
  }

  parseFormats(formats) {
    if (!formats) return [];

    return formats
      .filter(f => f.ext && (f.vcodec !== 'none' || f.acodec !== 'none'))
      .map(f => ({
        id: f.format_id,
        ext: f.ext,
        quality: f.format_note || f.resolution || 'Bilinmiyor',
        size: f.filesize ? Math.round(f.filesize / 1024 / 1024) + ' MB' : (f.filesize_approx ? '~' + Math.round(f.filesize_approx / 1024 / 1024) + ' MB' : '--'),
        fps: f.fps || 0
      }))
      .slice(0, 20);
  }

  async downloadVideo(url, options = {}) {
    try {
      await this.ensureDownloadDir();
      const cmd = this._getYtDlpCmd();
      const ffmpegPath = this._getFfmpegPath();
      const hasFfmpeg = !!ffmpegPath || (await this.checkFfmpeg());

      const quality = options.quality || 'best';
      const isAudio = options.audioOnly || options.extractAudio || options.format === 'mp3' || quality.startsWith('audio');
      const outputTemplate = `"${this.downloadPath}/%(title)s.%(ext)s"`;
      const jsRuntime = this._getNodeRuntimeArg();

      let command = `${cmd} --no-playlist --no-mtime -o ${outputTemplate} ${jsRuntime}`;

      if (ffmpegPath) {
        command += ` --ffmpeg-location "${path.dirname(ffmpegPath)}"`;
      }

      // 1. Kalite & Format Seçimi (H.264 + AAC evrensel kodek önceliği)
      if (isAudio) {
        if (quality === 'audio-flac' && hasFfmpeg) {
          command += ' -x --audio-format flac';
        } else if (quality === 'audio-wav' && hasFfmpeg) {
          command += ' -x --audio-format wav';
        } else if (quality === 'audio-aac' && hasFfmpeg) {
          command += ' -x --audio-format aac';
        } else if (hasFfmpeg) {
          command += ' -x --audio-format mp3 --audio-quality 0'; // 320k en yüksek kalite MP3
        } else {
          command += ' -f "ba/bestaudio/best"';
        }
      } else {
        if (hasFfmpeg) {
          command += ' -S "vcodec:h264,res,acodec:m4a"';
          if (quality === '4k' || quality === '2160p') {
            command += ' -f "bestvideo[height<=2160]+bestaudio/best[height<=2160]/best" --merge-output-format mp4';
          } else if (quality === '2k' || quality === '1440p') {
            command += ' -f "bestvideo[height<=1440]+bestaudio/best[height<=1440]/best" --merge-output-format mp4';
          } else if (quality === '1080p') {
            command += ' -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best" --merge-output-format mp4';
          } else if (quality === '720p') {
            command += ' -f "bestvideo[height<=720]+bestaudio/best[height<=720]/best" --merge-output-format mp4';
          } else if (quality === '480p') {
            command += ' -f "bestvideo[height<=480]+bestaudio/best[height<=480]/best" --merge-output-format mp4';
          } else {
            command += ' -f "bestvideo+bestaudio/best" --merge-output-format mp4';
          }
        } else {
          command += ' -f "best[ext=mp4]/best"';
        }
      }

      // 2. Altyazı Desteği (Türkçe & İngilizce SRT/VTT)
      if (options.downloadSubtitles) {
        command += hasFfmpeg 
          ? ' --write-sub --write-auto-sub --sub-lang "tr,en" --convert-subs srt' 
          : ' --write-sub --write-auto-sub --sub-lang "tr,en"';
      }

      // 3. Hız Sınırlandırıcı (Rate Limit)
      if (options.rateLimit && options.rateLimit !== 'unlimited') {
        command += ` --limit-rate ${options.rateLimit}`;
      }

      // 4. Eşzamanlı Parça İndirme (Hızlandırıcı)
      if (options.concurrentChunks && parseInt(options.concurrentChunks) > 1) {
        command += ` -N ${parseInt(options.concurrentChunks)}`;
      }

      command += ` "${url}"`;

      const { stdout } = await execAsync(command, { maxBuffer: 15 * 1024 * 1024 });

      // Son indirilen dosyayı bul (isAudio durumuna göre ses veya video uzantısını önceliklendir)
      let targetFile = '';
      try {
        const audioExts = ['.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg', '.opus'];
        const videoExts = ['.mp4', '.mkv', '.webm', '.mov'];
        const files = fs.readdirSync(this.downloadPath);
        const candidates = files
          .filter(f => f !== 'yt-dlp.exe' && f !== 'ffmpeg.exe' && f !== 'ffprobe.exe' && !f.endsWith('.tmp') && !f.endsWith('.part') && !f.endsWith('.ytdl') && !f.endsWith('.srt') && !f.endsWith('.vtt'))
          .map(f => ({
            name: f,
            ext: path.extname(f).toLowerCase(),
            time: fs.statSync(path.join(this.downloadPath, f)).mtime
          }))
          .sort((a, b) => b.time - a.time);

        const typeMatched = candidates.filter(c => isAudio ? audioExts.includes(c.ext) : videoExts.includes(c.ext));
        if (typeMatched.length > 0) {
          targetFile = path.join(this.downloadPath, typeMatched[0].name);
        } else if (candidates.length > 0) {
          targetFile = path.join(this.downloadPath, candidates[0].name);
        }
      } catch (e) {}

      return {
        success: true,
        message: 'İndirme başarıyla tamamlandı.',
        filePath: targetFile || this.downloadPath,
        output: stdout
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async downloadPlaylist(url, options = {}) {
    try {
      await this.ensureDownloadDir();
      const cmd = this._getYtDlpCmd();
      const ffmpegPath = this._getFfmpegPath();
      const hasFfmpeg = !!ffmpegPath || (await this.checkFfmpeg());

      const isAudio = options.audioOnly || options.extractAudio;
      const jsRuntime = this._getNodeRuntimeArg();
      let command = `${cmd} --no-mtime -o "${this.downloadPath}/%(playlist_title)s/%(playlist_index)s - %(title)s.%(ext)s" ${jsRuntime}`;

      if (ffmpegPath) {
        command += ` --ffmpeg-location "${path.dirname(ffmpegPath)}"`;
      }

      if (isAudio) {
        if (hasFfmpeg) command += ' -x --audio-format mp3 --audio-quality 0';
        else command += ' -f "ba/bestaudio/best"';
      } else {
        if (hasFfmpeg) command += ' -S "vcodec:h264,res,acodec:m4a" -f "bestvideo+bestaudio/best" --merge-output-format mp4';
        else command += ' -f "best[ext=mp4]/best"';
      }

      if (options.start && options.start > 1) {
        command += ` --playlist-start ${options.start}`;
      }
      if (options.end) {
        command += ` --playlist-end ${options.end}`;
      }

      command += ` "${url}"`;

      const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });

      return {
        success: true,
        message: 'Oynatma listesi indirmesi tamamlandı.',
        output: stdout,
        path: this.downloadPath
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  openFolder() {
    const { shell } = require('electron');
    if (fs.existsSync(this.downloadPath)) {
      shell.openPath(this.downloadPath);
      return { success: true };
    }
    return { success: false, message: 'Klasör bulunamadı.' };
  }

  async getDownloads() {
    try {
      if (!fs.existsSync(this.downloadPath)) return [];
      const files = fs.readdirSync(this.downloadPath);
      const downloads = [];

      for (const file of files) {
        if (file === 'yt-dlp.exe' || file === 'ffmpeg.exe' || file === 'ffprobe.exe' || file.endsWith('.tmp') || file.endsWith('.part') || file.endsWith('.ytdl')) continue;
        const filePath = path.join(this.downloadPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
          downloads.push({
            name: file,
            size: Math.round(stats.size / 1024 / 1024),
            path: filePath,
            modified: stats.mtime
          });
        }
      }

      return downloads.sort((a, b) => b.modified - a.modified);
    } catch (error) {
      return [];
    }
  }

  async deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true, message: 'Dosya silindi.' };
      }
      return { success: false, message: 'Dosya bulunamadı.' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async extractAudio(videoPath) {
    try {
      const cmd = this._getYtDlpCmd();
      const ffmpegPath = this._getFfmpegPath();
      const outputPath = videoPath.replace(/\.[^.]+$/, '.mp3');
      let command = `${cmd} -x --audio-format mp3 -o "${outputPath}"`;
      if (ffmpegPath) {
        command += ` --ffmpeg-location "${path.dirname(ffmpegPath)}"`;
      }
      command += ` "${videoPath}"`;
      await execAsync(command);

      return {
        success: true,
        message: 'Ses ayrıştırıldı.',
        path: outputPath
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async convertToMp4(videoPath) {
    try {
      const cmd = this._getYtDlpCmd();
      const outputPath = videoPath.replace(/\.[^.]+$/, '.mp4');
      await execAsync(`${cmd} -o "${outputPath}" "${videoPath}"`);

      return {
        success: true,
        message: 'MP4 formatına dönüştürüldü.',
        path: outputPath
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = YouTubeDownloader;
