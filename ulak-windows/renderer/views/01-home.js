// VIEW 01: ANA SAYFA (HOME) — LINUX STİLİ KUTUSUZ BÜYÜK HERO & GEÇİŞLİ CANLI ANİMASYON MOTORU
(function() {
  let interval = null;
  let canvasAnimationId = null;
  let currentAnimMode = localStorage.getItem('ulak-home-anim') || 'mesh'; // 'mesh' | 'waves' | 'matrix'

  const ANIM_MODES = [
    { id: 'mesh', label: 'Parçacık Ağı' },
    { id: 'waves', label: 'Siber Dalga' },
    { id: 'matrix', label: 'Siber Akış' }
  ];

  const view = {
    id: 'home',
    title: 'Ana Sayfa',
    icon: 'home',

    render() {
      const C = window.UlakComponents;
      const currentModeObj = ANIM_MODES.find(m => m.id === currentAnimMode) || ANIM_MODES[0];
      const isDark = window.UlakTheme ? window.UlakTheme.currentTheme === 'dark' : true;
      const logoSrc = isDark ? '../assets/ulak_logo.png' : '../assets/ulak_logo_dark.png';

      return `
        <div class="home-container" style="position: relative;">
          <!-- Canlı Arka Plan Animasyonu (Tüm Hero ve sayfa boyunca kesintisiz geçer) -->
          <canvas id="home-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0;"></canvas>
          
          <div style="position: relative; z-index: 1;">
            <!-- 1. EN ÜSTTE BÜYÜK VE TEK HERO (KUTUSUZ / ÇERÇEVESİZ — Linux ui_home.py Doğrudan Süzülen Hero) -->
            <div class="home-hero-floating" id="home-hero-card" style="text-align: center; padding: 34px 20px 24px 20px; margin-bottom: var(--space-13); position: relative; background: transparent; border: none; box-shadow: none;">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <!-- Büyük Logo -->
                <div style="position: relative; width: 84px; height: 84px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                  <img src="${logoSrc}" id="home-hero-logo" style="width: 76px; height: 76px; object-fit: contain; filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.45));">
                </div>

                <!-- Durum Çipleri & Animasyon Geçiş Butonu -->
                <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--space-8); margin-bottom: 8px;">
                  <span class="chip chip-accent"><span class="chip-dot"></span> SİSTEM ÇEVRİMİÇİ</span>
                  <span class="chip">v2.0.0 Windows</span>
                  <span class="chip chip-accent" id="home-fw-status-chip">Kalkan: Aktif</span>
                  
                  <!-- Animasyon Modu Değiştirici -->
                  <button class="chip" id="home-toggle-anim-btn" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px; background: var(--accent-soft); border: 1px solid var(--accent-border); color: var(--accent); font-weight: 600; padding: 3px 10px; border-radius: var(--r-full);" title="Arka plan animasyonunu değiştir (Tıkla)">
                    <svg class="icon-mono icon-mono-xs" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span id="home-anim-name">${currentModeObj.label}</span>
                  </button>
                </div>

                <!-- Başlık -->
                <div style="font-size: 32px; font-weight: 900; letter-spacing: 5px; color: var(--text-1); line-height: 1.1; margin: 4px 0 6px 0;">
                  ULAK
                </div>

                <!-- Alt Başlık / Hostname -->
                <div style="font-size: var(--text-sm); font-weight: 500; color: var(--text-2); max-width: 540px; margin: 0 auto 18px auto;" id="home-hero-host">
                  Windows Ağ, Güvenlik ve Donanım Yönetim Merkezi
                </div>

                <!-- Hızlı Eylem Butonları -->
                <div class="action-bar glass-soft" style="display: inline-flex; justify-content: center; gap: var(--space-13); padding: 8px 18px; border-radius: var(--r-full);">
                  <button class="btn btn-secondary btn-sm" id="home-go-firewall-btn">
                    ${window.UlakIcons.getIcon('shield', 'icon-mono-xs')} Güvenlik Kalkanı
                  </button>
                  <button class="btn btn-secondary btn-sm" id="home-go-wifi-btn">
                    ${window.UlakIcons.getIcon('wifi', 'icon-mono-xs')} Wi-Fi Ağları
                  </button>
                  <button class="btn btn-secondary btn-sm" id="home-go-hacker-btn">
                    ${window.UlakIcons.getIcon('zap', 'icon-mono-xs')} Teşhis & Portlar
                  </button>
                </div>
              </div>
            </div>

            <!-- 2. CANLI SİSTEM GÖSTERGELERİ (4 Ring Gauges) -->
            <div class="grid-4" style="margin-bottom: var(--space-13);">
              ${C.gaugeTile('İŞLEMCİ (CPU)', '0%', '0.0 GHz | 0 Çekirdek', 'home-gauge-cpu', 'home-cpu-text')}
              ${C.gaugeTile('BELLEK (RAM)', '0%', '0 GB / 0 GB', 'home-gauge-ram', 'home-ram-text')}
              ${C.gaugeTile('DİSK ALANI (C:)', '0%', 'Kullanılan Alan', 'home-gauge-disk', 'home-disk-text')}
              ${C.gaugeTile('GÜVENLİK (FW)', 'AKTİF', 'Windows Defender', 'home-gauge-fw', 'home-fw-text')}
            </div>

            <!-- 3. ALT BENTO BÖLÜMÜ (Ağ & Hızlı Araçlar) -->
            <div class="grid-2">
              <!-- Canlı Ağ Kartı -->
              <div class="view-section glass-card liquid-glow">
                <div class="view-section-header">
                  <div class="view-section-title">
                    ${window.UlakIcons.getIcon('wifi')} Canlı Ağ Bağlantısı
                  </div>
                  <button class="btn btn-secondary btn-sm" id="home-sub-wifi-btn">Yönet</button>
                </div>
                <div class="setting-row glass-soft">
                  <div class="setting-row-left">
                    <div class="setting-row-icon">${window.UlakIcons.getIcon('globe')}</div>
                    <div>
                      <div class="setting-title" id="home-net-ip">Yerel IP: Bağlantı taranıyor...</div>
                      <div class="setting-subtitle" id="home-net-status">Durum: İnternet erişimi kontrol ediliyor</div>
                    </div>
                  </div>
                  <span class="chip chip-accent" id="home-net-chip">Çevrimiçi</span>
                </div>
              </div>

              <!-- Hızlı Güvenlik Eylemleri -->
              <div class="view-section glass-card liquid-glow">
                <div class="view-section-header">
                  <div class="view-section-title">
                    ${window.UlakIcons.getIcon('zap')} Hızlı İşlemler
                  </div>
                  <button class="btn btn-secondary btn-sm" id="home-sub-hacker-btn">Tüm Araçlar</button>
                </div>
                <div style="display: flex; gap: var(--space-8);">
                  <button class="btn btn-primary" id="home-quick-port-btn" style="flex: 1;">
                    ${window.UlakIcons.getIcon('search', 'icon-mono-sm')} Portları Tara
                  </button>
                  <button class="btn btn-secondary" id="home-quick-clean-btn" style="flex: 1;">
                    ${window.UlakIcons.getIcon('trash', 'icon-mono-sm')} Temp Temizle
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    async mount(el) {
      el.querySelector('#home-go-wifi-btn')?.addEventListener('click', () => window.UlakRouter.navigate('wifi'));
      el.querySelector('#home-sub-wifi-btn')?.addEventListener('click', () => window.UlakRouter.navigate('wifi'));
      el.querySelector('#home-go-firewall-btn')?.addEventListener('click', () => window.UlakRouter.navigate('firewall'));
      el.querySelector('#home-go-hacker-btn')?.addEventListener('click', () => window.UlakRouter.navigate('hacker'));
      el.querySelector('#home-sub-hacker-btn')?.addEventListener('click', () => window.UlakRouter.navigate('hacker'));
      el.querySelector('#home-quick-port-btn')?.addEventListener('click', () => window.UlakRouter.navigate('hacker'));
      el.querySelector('#home-quick-clean-btn')?.addEventListener('click', () => window.UlakRouter.navigate('cleaner'));

      const canvas = el.querySelector('#home-canvas');
      const animEngine = initHomeAnimationEngine(canvas, el.querySelector('.home-container'));

      // Animasyon Geçiş Butonu
      const toggleBtn = el.querySelector('#home-toggle-anim-btn');
      const animLabel = el.querySelector('#home-anim-name');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          const currentIndex = ANIM_MODES.findIndex(m => m.id === currentAnimMode);
          const nextIndex = (currentIndex + 1) % ANIM_MODES.length;
          currentAnimMode = ANIM_MODES[nextIndex].id;
          localStorage.setItem('ulak-home-anim', currentAnimMode);
          if (animLabel) animLabel.textContent = ANIM_MODES[nextIndex].label;
          animEngine.setMode(currentAnimMode);
        });
      }

      await updateStats(el);
      interval = setInterval(() => {
        updateStats(el);
      }, 3000);
    },

    unmount() {
      if (interval) clearInterval(interval);
      if (canvasAnimationId) cancelAnimationFrame(canvasAnimationId);
    }
  };

  async function updateStats(el) {
    try {
      const [cpu, mem, disk, fw, net, plat] = await Promise.all([
        window.ulak.invoke('system:get-cpu-info').catch(() => ({ usage: 0, speed: '0 GHz', cores: 0 })),
        window.ulak.invoke('system:get-memory-info').catch(() => ({ usagePercent: 0, usedGB: '0', totalGB: '0' })),
        window.ulak.invoke('system:get-disk-info').catch(() => ([{ usePercent: 0, drive: 'C:' }])),
        window.ulak.invoke('firewall:get-status').catch(() => ({ enabled: true })),
        window.ulak.invoke('system:get-network-info').catch(() => ({ ip: '127.0.0.1', isConnected: true })),
        window.ulak.invoke('app:get-platform-info').catch(() => ({ hostname: 'Windows PC', username: 'User' }))
      ]);

      if (!el.isConnected) return;

      const hostEl = el.querySelector('#home-hero-host');
      if (hostEl) hostEl.textContent = `${plat.hostname} (${plat.username}) — Windows 11 Acrylic & Liquid Glass İstasyonu`;

      // CPU
      const cpuUsage = Math.round(cpu.usage || 0);
      const ringCpu = el.querySelector('#home-gauge-cpu');
      const textCpu = el.querySelector('#home-cpu-text');
      const textRingCpu = el.querySelector('#home-gauge-cpu-text');
      if (ringCpu) ringCpu.setAttribute('stroke-dasharray', `${cpuUsage}, 100`);
      if (textCpu) textCpu.textContent = `${cpuUsage}%`;
      if (textRingCpu) textRingCpu.textContent = `${cpuUsage}%`;

      // RAM
      const ramUsage = Math.round(mem.usagePercent || 0);
      const ringRam = el.querySelector('#home-gauge-ram');
      const textRam = el.querySelector('#home-ram-text');
      const textRingRam = el.querySelector('#home-gauge-ram-text');
      if (ringRam) ringRam.setAttribute('stroke-dasharray', `${ramUsage}, 100`);
      if (textRam) textRam.textContent = `${ramUsage}%`;
      if (textRingRam) textRingRam.textContent = `${ramUsage}%`;

      // Disk
      const mainDisk = Array.isArray(disk) && disk.length > 0 ? disk[0] : { usePercent: 0 };
      const diskUsage = Math.round(mainDisk.usePercent || 0);
      const ringDisk = el.querySelector('#home-gauge-disk');
      const textDisk = el.querySelector('#home-disk-text');
      const textRingDisk = el.querySelector('#home-gauge-disk-text');
      if (ringDisk) ringDisk.setAttribute('stroke-dasharray', `${diskUsage}, 100`);
      if (textDisk) textDisk.textContent = `${diskUsage}%`;
      if (textRingDisk) textRingDisk.textContent = `${diskUsage}%`;

      // FW
      const fwActive = fw.enabled !== false;
      const ringFw = el.querySelector('#home-gauge-fw');
      const textFw = el.querySelector('#home-fw-text');
      const textRingFw = el.querySelector('#home-gauge-fw-text');
      const chipFw = el.querySelector('#home-fw-status-chip');
      if (ringFw) ringFw.setAttribute('stroke-dasharray', fwActive ? '100, 100' : '0, 100');
      if (textFw) textFw.textContent = fwActive ? 'AKTİF' : 'KAPALI';
      if (textRingFw) textRingFw.textContent = fwActive ? '100%' : '0%';
      if (chipFw) {
        chipFw.textContent = fwActive ? 'Kalkan: Aktif' : 'Kalkan: Pasif';
        chipFw.className = fwActive ? 'chip chip-accent' : 'chip chip-danger';
      }

      // Network
      const netIp = el.querySelector('#home-net-ip');
      const netChip = el.querySelector('#home-net-chip');
      if (netIp) netIp.textContent = `Yerel IP: ${net.ip || '127.0.0.1'}`;
      if (netChip) {
        netChip.textContent = net.isConnected ? 'Çevrimiçi' : 'Çevrimdışı';
        netChip.className = net.isConnected ? 'chip chip-accent' : 'chip chip-danger';
      }
    } catch (err) {
      console.error(err);
    }
  }

  // ==========================================================================
  // ÇOK MODLU CANLI ARKA PLAN MOTORU (LINUX PARÇACIK, SİBER DALGA & SİBER AKIŞ)
  // Tüm Hero ve sayfa üzerinden kesintisiz geçer, imlece doğrudan tepki verir
  // ==========================================================================
  function initHomeAnimationEngine(canvas, container) {
    if (!canvas || !container) return { setMode: () => {} };
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let mouseX = null;
    let mouseY = null;
    let particles = [];
    let waveTick = 0;
    let activeMode = currentAnimMode;

    const MAX_DIST = 115.0;
    const REPEL_R = 130.0;
    const REPEL_F = 5.2;
    const BASE_SPEED = 1.15;

    function resize() {
      width = canvas.width = container.clientWidth;
      height = canvas.height = container.clientHeight || 700;
      syncPopulation();
    }

    function targetCount() {
      return Math.max(40, Math.min(90, Math.floor(75.0 * (width * height) / (1280.0 * 760.0))));
    }

    function spawnParticle() {
      const ang = Math.random() * 2 * Math.PI;
      const spd = BASE_SPEED * (0.35 + Math.random() * 0.65);
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: 1.6 + Math.random() * 1.8,
        isAccent: Math.random() < 0.24,
        speedY: (0.4 + Math.random() * 1.2), // matrix mode
        alpha: Math.random() * 0.7 + 0.3
      };
    }

    function syncPopulation() {
      const want = targetCount();
      while (particles.length < want) {
        particles.push(spawnParticle());
      }
      if (particles.length > want) {
        particles.length = want;
      }
    }

    resize();
    window.addEventListener('resize', resize);

    // Fare takibi — Hero üzerinden geçerken de imleç algılanır
    container.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });

    container.addEventListener('mouseleave', () => {
      mouseX = null;
      mouseY = null;
    });

    let lastTime = performance.now();

    // 1. Mod Fizik Adımı: Parçacık Ağı (Mesh)
    function stepMesh(dt) {
      const k = Math.max(0.2, Math.min(3.0, dt / (1000 / 60)));

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // İmleç itme kuvveti
        if (mouseX !== null && mouseY !== null) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const d2 = dx * dx + dy * dy;
          if (d2 > 0.0001 && d2 < REPEL_R * REPEL_R) {
            const d = Math.sqrt(d2);
            const f = (1.0 - d / REPEL_R) * REPEL_F * 0.16 * k;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
        }

        // Hız sönümlenme
        const sp = Math.hypot(p.vx, p.vy);
        const maxSp = BASE_SPEED * 2.5;
        if (sp > maxSp) {
          p.vx *= maxSp / sp;
          p.vy *= maxSp / sp;
        } else if (sp > BASE_SPEED) {
          const decay = 1.0 - 0.02 * k;
          p.vx *= decay;
          p.vy *= decay;
        }

        p.x += p.vx * k;
        p.y += p.vy * k;

        // Kenarlardan sekme
        if (p.x <= 0) { p.x = 0; p.vx = Math.abs(p.vx); }
        else if (p.x >= width) { p.x = width; p.vx = -Math.abs(p.vx); }
        if (p.y <= 0) { p.y = 0; p.vy = Math.abs(p.vy); }
        else if (p.y >= height) { p.y = height; p.vy = -Math.abs(p.vy); }
      }
    }

    // 2. Mod Fizik Adımı: Siber Akış (Matrix / Drift)
    function stepMatrix(dt) {
      const k = Math.max(0.2, Math.min(3.0, dt / (1000 / 60)));
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.speedY * 1.5 * k;
        if (mouseX !== null && mouseY !== null) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const d2 = dx * dx + dy * dy;
          if (d2 < 100 * 100) {
            p.x += (dx / 100) * 2 * k;
          }
        }
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
      }
    }

    // Çizim: Mesh (Parçacık Ağı)
    function drawMesh(isDark, cyanLine, cyanDot, emeraldAccent) {
      // 1. Merkez Radyal Işık
      const glow = ctx.createRadialGradient(width * 0.5, height * 0.25, 0, width * 0.5, height * 0.25, Math.max(width, height) * 0.65);
      glow.addColorStop(0, isDark ? 'rgba(0, 199, 255, 0.07)' : 'rgba(16, 185, 129, 0.05)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // 2. Parçacıklar Arası Bağlantı Çizgileri
      ctx.lineWidth = 1.0;
      for (let i = 0; i < particles.length; i++) {
        const ax = particles[i].x;
        const ay = particles[i].y;
        for (let j = i + 1; j < particles.length; j++) {
          const bx = particles[j].x;
          const by = particles[j].y;
          const dx = ax - bx;
          const dy = ay - by;
          if (Math.abs(dx) > MAX_DIST || Math.abs(dy) > MAX_DIST) continue;
          const d2 = dx * dx + dy * dy;
          if (d2 > MAX_DIST * MAX_DIST) continue;
          const d = Math.sqrt(d2);
          const a = (isDark ? 0.42 : 0.32) * (1.0 - d / MAX_DIST);
          if (a < 0.012) continue;

          ctx.strokeStyle = `rgba(${cyanLine[0]}, ${cyanLine[1]}, ${cyanLine[2]}, ${a})`;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      }

      // 3. İmleç Çekim ve Bağlantı Çizgileri
      if (mouseX !== null && mouseY !== null) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const d2 = dx * dx + dy * dy;
          if (d2 > MAX_DIST * MAX_DIST * 1.5) continue;
          const d = Math.sqrt(d2);
          const a = (isDark ? 0.50 : 0.40) * (1.0 - d / (MAX_DIST * 1.22));
          if (a <= 0) continue;

          ctx.strokeStyle = `rgba(${emeraldAccent[0]}, ${emeraldAccent[1]}, ${emeraldAccent[2]}, ${a})`;
          ctx.beginPath();
          ctx.moveTo(mouseX, mouseY);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }

      // 4. Parçacık Noktaları
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const col = p.isAccent ? emeraldAccent : cyanDot;
        ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${isDark ? 0.90 : 0.70})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Çizim: Siber Dalga (Waves)
    function drawWaves(isDark, cyanLine, emeraldAccent) {
      waveTick += 0.02;

      // Merkez Işıltı
      const glow = ctx.createRadialGradient(width * 0.5, height * 0.25, 0, width * 0.5, height * 0.25, width * 0.5);
      glow.addColorStop(0, isDark ? 'rgba(16, 185, 129, 0.07)' : 'rgba(0, 199, 255, 0.05)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      const wavesCount = 5;
      for (let w = 0; w < wavesCount; w++) {
        const baseHeight = height * (0.15 + w * 0.16);
        const col = w % 2 === 0 ? emeraldAccent : cyanLine;
        ctx.strokeStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${0.18 + w * 0.06})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();

        for (let x = 0; x <= width; x += 16) {
          const freq = 0.005 + w * 0.002;
          const amp = 18 + w * 8;
          let y = baseHeight + Math.sin(x * freq + waveTick + w) * amp + Math.cos(x * 0.003 - waveTick * 0.5) * (amp * 0.5);

          // İmleç dalga çekimi
          if (mouseX !== null && mouseY !== null) {
            const dist = Math.hypot(x - mouseX, y - mouseY);
            if (dist < 140) {
              const pull = (1 - dist / 140) * 28;
              y += (mouseY > y ? pull : -pull);
            }
          }

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // Çizim: Siber Akış (Matrix / Stream)
    function drawMatrix(isDark, emeraldAccent, cyanDot) {
      // Dikey akıcı çizgiler ve süzülen neon damlalar
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const col = p.isAccent ? emeraldAccent : cyanDot;
        
        ctx.strokeStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${p.alpha * 0.35})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + p.speedY * 18);
        ctx.stroke();

        ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop(now) {
      const dt = now - lastTime;
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      const isDark = window.UlakTheme ? window.UlakTheme.currentTheme === 'dark' : true;
      const cyanLine = isDark ? [0, 199, 255] : [13, 148, 136];
      const cyanDot = isDark ? [0, 224, 255] : [13, 148, 136];
      const emeraldAccent = isDark ? [16, 185, 129] : [5, 150, 105];

      if (activeMode === 'mesh') {
        stepMesh(dt);
        drawMesh(isDark, cyanLine, cyanDot, emeraldAccent);
      } else if (activeMode === 'waves') {
        drawWaves(isDark, cyanLine, emeraldAccent);
      } else if (activeMode === 'matrix') {
        stepMatrix(dt);
        drawMatrix(isDark, emeraldAccent, cyanDot);
      }

      canvasAnimationId = requestAnimationFrame(loop);
    }

    canvasAnimationId = requestAnimationFrame(loop);

    return {
      setMode(mode) {
        activeMode = mode;
      }
    };
  }

  window.UlakRouter.register(view);
})();
