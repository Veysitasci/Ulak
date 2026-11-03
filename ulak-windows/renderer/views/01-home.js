// VIEW 01: ANA SAYFA (HOME) — LINUX STİLİ KUTUSUZ BÜYÜK HERO & FİZİK TABANLI FARE ETKİLEŞİMLİ SİBER ANİMASYON MOTORU
(function() {
  let interval = null;
  let canvasAnimationId = null;
  let resizeCleanup = null;
  let currentAnimMode = localStorage.getItem('ulak-home-anim') || 'mesh'; // 'mesh' | 'waves' | 'matrix' | 'vortex'

  const ANIM_MODES = [
    { id: 'mesh', label: 'Parçacık Ağı' },
    { id: 'waves', label: 'Siber Dalga' },
    { id: 'matrix', label: 'Siber Akış' },
    { id: 'vortex', label: 'Siber Radar' }
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
        <div class="home-container" style="position: relative; width: 100%; min-height: 100%; overflow: hidden;">
          <!-- Canlı Arka Plan Animasyonu (Tüm Anasayfa boyunca sınırsız, kenardan kenara geçer) -->
          <canvas id="home-canvas" style="position: absolute; top: 0; left: 0; pointer-events: none; z-index: 0;"></canvas>
          
          <div class="home-content-wrap" style="position: relative; z-index: 1; max-width: 1360px; margin: 0 auto; padding: var(--space-21) var(--space-34) var(--space-34) var(--space-34);">
            <!-- 1. EN ÜSTTE BÜYÜK VE TEK HERO (KUTUSUZ / ÇERÇEVESİZ — Linux ui_home.py Doğrudan Süzülen Hero) -->
            <div class="home-hero-floating" id="home-hero-card" style="text-align: center; padding: 28px 20px 22px 20px; margin-bottom: var(--space-13); position: relative; background: transparent; border: none; box-shadow: none;">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <!-- Büyük Logo & Siber Yörünge Halkası (Fareye Duyarlı 3B Tilt + Tıklama Şok Dalgası) -->
                <div class="home-logo-stage" id="home-logo-stage" title="Siber Nabız Dalgası Gönder (Tıkla)">
                  <svg class="home-orbit-svg" viewBox="0 0 108 108">
                    <circle class="home-orbit-ring-outer" cx="54" cy="54" r="49" />
                    <circle class="home-orbit-ring-inner" cx="54" cy="54" r="41" />
                    <circle cx="54" cy="5" r="2.6" fill="var(--accent)" />
                    <circle cx="95" cy="54" r="2.0" fill="var(--info)" />
                  </svg>
                  <img src="${logoSrc}" id="home-hero-logo" style="width: 74px; height: 74px; object-fit: contain; filter: drop-shadow(0 0 22px rgba(16, 185, 129, 0.50)); transition: filter 0.2s ease-out;">
                </div>

                <!-- Durum Çipleri & Animasyon Geçiş Butonu -->
                <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--space-8); margin-bottom: 8px;">
                  <span class="chip chip-accent"><span class="chip-dot"></span> SİSTEM ÇEVRİMİÇİ</span>
                  <span class="chip">v2.5.0 Windows</span>
                  <span class="chip chip-accent" id="home-fw-status-chip">Kalkan: Aktif</span>
                  
                  <!-- Animasyon Modu Değiştirici -->
                  <button class="chip magnetic-btn" id="home-toggle-anim-btn" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px; background: var(--accent-soft); border: 1px solid var(--accent-border); color: var(--accent); font-weight: 600; padding: 3px 11px; border-radius: var(--r-full);" title="Arka plan etkileşim modunu değiştir (Tıkla)">
                    <svg class="icon-mono icon-mono-xs" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span id="home-anim-name">${currentModeObj.label}</span>
                  </button>
                </div>

                <!-- Başlık -->
                <div id="home-hero-title" style="font-size: 32px; font-weight: 900; letter-spacing: 5px; color: var(--text-1); line-height: 1.1; margin: 4px 0 6px 0; transition: text-shadow 0.2s ease;">
                  ULAK
                </div>

                <!-- Alt Başlık / Hostname -->
                <div style="font-size: var(--text-sm); font-weight: 500; color: var(--text-2); max-width: 540px; margin: 0 auto 18px auto;" id="home-hero-host">
                  Windows Ağ, Güvenlik ve Donanım Yönetim Merkezi
                </div>

                <!-- Hızlı Eylem Butonları (Manyetik İmleç Çekimli) -->
                <div class="action-bar glass-soft liquid-glow" style="display: inline-flex; justify-content: center; gap: var(--space-13); padding: 8px 18px; border-radius: var(--r-full);">
                  <button class="btn btn-secondary btn-sm magnetic-btn" id="home-go-firewall-btn">
                    ${window.UlakIcons.getIcon('shield', 'icon-mono-xs')} Güvenlik Kalkanı
                  </button>
                  <button class="btn btn-secondary btn-sm magnetic-btn" id="home-go-wifi-btn">
                    ${window.UlakIcons.getIcon('wifi', 'icon-mono-xs')} Wi-Fi Ağları
                  </button>
                  <button class="btn btn-secondary btn-sm magnetic-btn" id="home-go-hacker-btn">
                    ${window.UlakIcons.getIcon('zap', 'icon-mono-xs')} Teşhis & Portlar
                  </button>
                </div>
              </div>
            </div>

            <!-- 2. CANLI SİSTEM GÖSTERGELERİ (4 Ring Gauges — 3B Tilt & Specular Glow) -->
            <div class="grid-4" style="margin-bottom: var(--space-13);">
              ${C.gaugeTile('İŞLEMCİ (CPU)', '0%', '0.0 GHz | 0 Çekirdek', 'home-gauge-cpu', 'home-cpu-text')}
              ${C.gaugeTile('BELLEK (RAM)', '0%', '0 GB / 0 GB', 'home-gauge-ram', 'home-ram-text')}
              ${C.gaugeTile('DİSK ALANI (C:)', '0%', 'Kullanılan Alan', 'home-gauge-disk', 'home-disk-text')}
              ${C.gaugeTile('GÜVENLİK (FW)', 'AKTİF', 'Windows Defender', 'home-gauge-fw', 'home-fw-text')}
            </div>

            <!-- 3. ALT BENTO BÖLÜMÜ (Ağ & Hızlı Araçlar) -->
            <div class="grid-2">
              <!-- Canlı Ağ Kartı -->
              <div class="view-section glass-card liquid-glow tilt-card">
                <div class="view-section-header" style="position: relative; z-index: 3;">
                  <div class="view-section-title">
                    ${window.UlakIcons.getIcon('wifi')} Canlı Ağ Bağlantısı
                  </div>
                  <button class="btn btn-secondary btn-sm magnetic-btn" id="home-sub-wifi-btn">Yönet</button>
                </div>
                <div class="setting-row glass-soft" style="position: relative; z-index: 3;">
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
              <div class="view-section glass-card liquid-glow tilt-card">
                <div class="view-section-header" style="position: relative; z-index: 3;">
                  <div class="view-section-title">
                    ${window.UlakIcons.getIcon('zap')} Hızlı İşlemler
                  </div>
                  <button class="btn btn-secondary btn-sm magnetic-btn" id="home-sub-hacker-btn">Tüm Araçlar</button>
                </div>
                <div style="display: flex; gap: var(--space-8); position: relative; z-index: 3;">
                  <button class="btn btn-primary magnetic-btn" id="home-quick-port-btn" style="flex: 1;">
                    ${window.UlakIcons.getIcon('search', 'icon-mono-sm')} Portları Tara
                  </button>
                  <button class="btn btn-secondary magnetic-btn" id="home-quick-clean-btn" style="flex: 1;">
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
      const container = el.querySelector('.home-container');
      const animEngine = initHomeAnimationEngine(canvas, container, el);
      resizeCleanup = animEngine.cleanup;

      // Logo Tıklama: Güçlü Siber Nabız Dalgası (Mega Pulse)
      const logoStage = el.querySelector('#home-logo-stage');
      if (logoStage) {
        logoStage.addEventListener('click', (e) => {
          e.stopPropagation();
          const rect = canvas.getBoundingClientRect();
          const scaleX = rect.width > 0 ? (canvas.width / rect.width) : 1;
          const scaleY = rect.height > 0 ? (canvas.height / rect.height) : 1;
          const lRect = logoStage.getBoundingClientRect();
          const cx = ((lRect.left + lRect.width * 0.5) - rect.left) * scaleX;
          const cy = ((lRect.top + lRect.height * 0.5) - rect.top) * scaleY;
          animEngine.triggerShockwave(cx, cy, 1.45);
        });
      }

      // Manyetik Buton (Magnetic Pull) Etkileşimi
      el.querySelectorAll('.magnetic-btn').forEach((btn) => {
        btn.addEventListener('mousemove', (e) => {
          const r = btn.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width * 0.5);
          const dy = e.clientY - (r.top + r.height * 0.5);
          btn.style.setProperty('--mag-x', `${(dx * 0.22).toFixed(1)}px`);
          btn.style.setProperty('--mag-y', `${(dy * 0.28).toFixed(1)}px`);
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.setProperty('--mag-x', '0px');
          btn.style.setProperty('--mag-y', '0px');
        });
      });

      // Animasyon Geçiş Butonu
      const toggleBtn = el.querySelector('#home-toggle-anim-btn');
      const animLabel = el.querySelector('#home-anim-name');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const currentIndex = ANIM_MODES.findIndex(m => m.id === currentAnimMode);
          const nextIndex = (currentIndex + 1) % ANIM_MODES.length;
          currentAnimMode = ANIM_MODES[nextIndex].id;
          localStorage.setItem('ulak-home-anim', currentAnimMode);
          if (animLabel) animLabel.textContent = ANIM_MODES[nextIndex].label;
          animEngine.setMode(currentAnimMode);

          const rect = canvas.getBoundingClientRect();
          const scaleX = rect.width > 0 ? (canvas.width / rect.width) : 1;
          const scaleY = rect.height > 0 ? (canvas.height / rect.height) : 1;
          const bRect = toggleBtn.getBoundingClientRect();
          animEngine.triggerShockwave(
            ((bRect.left + bRect.width * 0.5) - rect.left) * scaleX,
            ((bRect.top + bRect.height * 0.5) - rect.top) * scaleY,
            1.15
          );
        });
      }

      await updateStats(el);
      const pollRate = parseInt(localStorage.getItem('ulak-telemetry-rate') || '3000', 10);
      interval = setInterval(() => {
        updateStats(el);
      }, pollRate);
    },

    unmount() {
      if (interval) clearInterval(interval);
      if (canvasAnimationId) cancelAnimationFrame(canvasAnimationId);
      if (typeof resizeCleanup === 'function') resizeCleanup();
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
  // 4 MODLU SPESİFİK FARE ETKİLEŞİMLİ SİBER ANİMASYON MOTORU
  // - Yay/Atalet (Spring-Interpolated) İmleç & Hız Vektörü
  // - İmleç Kuyruğu (Laser Comet Trail) & Tıklama Şok Dalgası (Shockwave Ripples)
  // - Mod 1 (mesh): Üçgen Ağ Yüzeyi (Triadic Shimmer) + Girdap İtme/Çekme
  // - Mod 2 (waves): Frekans Sıkışmalı Harmonik Kırılma + Faz Köprüleri
  // - Mod 3 (matrix): Elektromanyetik Saptırma Kalkanı + Kıvılcım Halkası
  // - Mod 4 (vortex): İmleç Merkezli Dönen Siber Radar & Yörünge Çekimi
  // ==========================================================================
  function initHomeAnimationEngine(canvas, container, rootEl) {
    if (!canvas || !container) return { setMode: () => {}, triggerShockwave: () => {}, cleanup: () => {} };
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;

    // Ham ve yay-yumuşatmalı (Spring) imleç koordinatları
    let rawMouseX = null;
    let rawMouseY = null;
    let mouseX = null;
    let mouseY = null;
    let prevMouseX = null;
    let prevMouseY = null;
    let mouseVx = 0;
    let mouseVy = 0;
    let mouseSpeed = 0;

    let particles = [];
    let trail = [];       // İmleç ışık kuyruğu (Comet Trail)
    let shockwaves = [];  // Tıklama şok dalgaları (Ripples)
    let sparks = [];      // Etkileşim kıvılcımları
    let waveTick = 0;
    let radarAngle = 0;
    let activeMode = currentAnimMode;

    const MAX_DIST = 122.0;
    const REPEL_R = 145.0;
    const REPEL_F = 5.6;
    const BASE_SPEED = 1.15;

    const logoStage = rootEl ? rootEl.querySelector('#home-logo-stage') : null;
    const heroLogo = rootEl ? rootEl.querySelector('#home-hero-logo') : null;
    const heroTitle = rootEl ? rootEl.querySelector('#home-hero-title') : null;

    function resize() {
      const rect = container.getBoundingClientRect();
      const root = document.getElementById('view-root');
      const w = Math.round(Math.max(rect.width, container.scrollWidth, root ? root.clientWidth : 0, window.innerWidth || 1024));
      const h = Math.round(Math.max(rect.height, container.scrollHeight, root ? root.clientHeight : 0, window.innerHeight || 768));

      width = canvas.width = w;
      height = canvas.height = h;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      syncPopulation();
    }

    function targetCount() {
      return Math.max(65, Math.min(130, Math.floor(95.0 * (width * height) / (1280.0 * 760.0))));
    }

    function spawnParticle() {
      const ang = Math.random() * 2 * Math.PI;
      const spd = BASE_SPEED * (0.35 + Math.random() * 0.65);
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: 1.6 + Math.random() * 1.9,
        isAccent: Math.random() < 0.28,
        speedY: 0.55 + Math.random() * 1.35,
        alpha: Math.random() * 0.65 + 0.35,
        orbitR: 28 + Math.random() * 180,
        orbitAng: Math.random() * Math.PI * 2,
        orbitSpd: (0.008 + Math.random() * 0.018) * (Math.random() < 0.5 ? 1 : -1),
        energy: 0
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

    function triggerShockwave(x, y, power = 1.0) {
      shockwaves.push({
        x,
        y,
        r: 8,
        maxR: 230 * power,
        alpha: 0.92,
        power
      });

      // Kıvılcım parçacıkları fırlat
      const sparkCount = Math.floor(14 * power);
      for (let i = 0; i < sparkCount; i++) {
        const ang = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.35;
        const spd = (2.8 + Math.random() * 4.2) * power;
        sparks.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 1.0,
          decay: 0.024 + Math.random() * 0.018,
          isAccent: i % 2 === 0
        });
      }

      // Yakındaki ana parçacıklara radyal şok ivmesi uygula
      const blastR = 240 * power;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = p.x - x;
        const dy = p.y - y;
        const d = Math.hypot(dx, dy);
        if (d > 0.1 && d < blastR) {
          const impulse = (1 - d / blastR) * 7.5 * power;
          p.vx += (dx / d) * impulse;
          p.vy += (dy / d) * impulse;
          p.energy = Math.min(1, p.energy + 0.9);
        }
      }
    }

    resize();
    window.addEventListener('resize', resize);

    let resizeObserver = null;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        resize();
      });
      if (container) resizeObserver.observe(container);
      const root = document.getElementById('view-root');
      if (root) resizeObserver.observe(root);
    }

    // Fare takibi — pencere genelinde tam, kesintisiz ve 1:1 anlık takip
    const onPointerMove = (e) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? (canvas.width / rect.width) : 1;
      const scaleY = rect.height > 0 ? (canvas.height / rect.height) : 1;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;

      // Pencere ve canvas sınırları kontrolü
      if (e.clientX >= rect.left - 20 && e.clientX <= rect.right + 20 &&
          e.clientY >= rect.top - 20 && e.clientY <= rect.bottom + 20) {
        rawMouseX = Math.max(0, Math.min(canvas.width, cx));
        rawMouseY = Math.max(0, Math.min(canvas.height, cy));
      } else {
        rawMouseX = null;
        rawMouseY = null;
      }

      // Hero Logo ve Yörünge Halkası 3B Manyetik Takibi (Gecikmesiz, anında takip)
      if (logoStage && heroLogo) {
        const lRect = logoStage.getBoundingClientRect();
        const lcx = lRect.left + lRect.width * 0.5;
        const lcy = lRect.top + lRect.height * 0.5;
        const dx = e.clientX - lcx;
        const dy = e.clientY - lcy;
        const dist = Math.hypot(dx, dy);
        const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        logoStage.style.setProperty('--orbit-angle', `${angleDeg.toFixed(1)}deg`);

        if (dist < 320) {
          const factor = (1 - dist / 320);
          const rx = (-dy / 320) * 18 * factor;
          const ry = (dx / 320) * 18 * factor;
          const sx = (-dx / 320) * 14 * factor;
          const sy = (-dy / 320) * 14 * factor;
          heroLogo.style.transform = `perspective(500px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) translateZ(6px)`;
          heroLogo.style.filter = `drop-shadow(${sx.toFixed(1)}px ${sy.toFixed(1)}px 24px rgba(16, 185, 129, ${(0.45 + factor * 0.35).toFixed(2)}))`;
          if (heroTitle) {
            heroTitle.style.textShadow = `0 0 ${(18 * factor).toFixed(0)}px rgba(16, 185, 129, ${(0.38 * factor).toFixed(2)})`;
          }
        } else {
          heroLogo.style.transform = 'perspective(500px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
          heroLogo.style.filter = 'drop-shadow(0 0 22px rgba(16, 185, 129, 0.50))';
          if (heroTitle) heroTitle.style.textShadow = 'none';
        }
      }
    };

    const onPointerLeave = () => {
      rawMouseX = null;
      rawMouseY = null;
      if (heroLogo) {
        heroLogo.style.transform = 'perspective(500px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
        heroLogo.style.filter = 'drop-shadow(0 0 22px rgba(16, 185, 129, 0.50))';
      }
      if (heroTitle) heroTitle.style.textShadow = 'none';
    };

    const onPointerDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? (canvas.width / rect.width) : 1;
      const scaleY = rect.height > 0 ? (canvas.height / rect.height) : 1;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      triggerShockwave(x, y, 0.9);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave);
    container.addEventListener('pointerdown', onPointerDown);

    let lastTime = performance.now();

    function updatePointerPhysics(k) {
      if (rawMouseX !== null && rawMouseY !== null) {
        if (mouseX === null || mouseY === null) {
          mouseX = rawMouseX;
          mouseY = rawMouseY;
          prevMouseX = rawMouseX;
          prevMouseY = rawMouseY;
        }

        // Fareyi tam, gecikmesiz (0ms gecikme) 1:1 takip et
        mouseVx = rawMouseX - mouseX;
        mouseVy = rawMouseY - mouseY;
        prevMouseX = mouseX;
        prevMouseY = mouseY;
        mouseX = rawMouseX;
        mouseY = rawMouseY;

        const instSpeed = Math.hypot(mouseVx, mouseVy);
        mouseSpeed = Math.max(instSpeed, mouseSpeed * Math.pow(0.80, k));

        if (instSpeed > 0.8) {
          trail.unshift({ x: mouseX, y: mouseY, alpha: 1.0 });
          if (trail.length > 18) trail.pop();
        }
      } else {
        prevMouseX = null;
        prevMouseY = null;
        mouseX = null;
        mouseY = null;
        mouseVx = 0;
        mouseVy = 0;
        mouseSpeed *= Math.pow(0.82, k);
        if (trail.length > 0) trail.pop();
      }

      for (let i = 0; i < trail.length; i++) {
        trail[i].alpha *= Math.pow(0.88, k);
      }

      // Şok dalgalarını güncelle
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.r += (sw.maxR - sw.r) * 0.11 * k + 2.2 * k;
        sw.alpha *= Math.pow(0.92, k);
        if (sw.alpha < 0.02 || sw.r >= sw.maxR) {
          shockwaves.splice(i, 1);
        }
      }

      // Kıvılcımları güncelle
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx * k;
        sp.y += sp.vy * k;
        sp.vx *= Math.pow(0.95, k);
        sp.vy *= Math.pow(0.95, k);
        sp.life -= sp.decay * k;
        if (sp.life <= 0) sparks.splice(i, 1);
      }
    }

    // 1. Mod Fizik Adımı: Parçacık Ağı (Mesh + Anında Hızlı Girdap & İtme)
    function stepMesh(k) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.energy *= Math.pow(0.92, k);

        if (mouseX !== null && mouseY !== null) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const d2 = dx * dx + dy * dy;
          const dynamicRepelR = REPEL_R + Math.min(50, mouseSpeed * 1.5);
          if (d2 > 0.0001 && d2 < dynamicRepelR * dynamicRepelR) {
            const d = Math.sqrt(d2);
            const norm = 1.0 - d / dynamicRepelR;
            // Radyal itme + imleç hızına bağlı teğetsel girdap kuvveti (anında ve dinamik)
            const radialF = norm * (REPEL_F * 0.26 + mouseSpeed * 0.05) * k;
            const swirlF = norm * (0.05 + mouseSpeed * 0.008) * k;
            const nx = dx / d;
            const ny = dy / d;

            p.vx += nx * radialF - ny * swirlF + mouseVx * 0.035 * norm;
            p.vy += ny * radialF + nx * swirlF + mouseVy * 0.035 * norm;
            p.energy = Math.max(p.energy, norm * 0.95);
          }
        }

        const sp = Math.hypot(p.vx, p.vy);
        const maxSp = BASE_SPEED * 3.5;
        if (sp > maxSp) {
          p.vx *= maxSp / sp;
          p.vy *= maxSp / sp;
        } else if (sp > BASE_SPEED) {
          const decay = 1.0 - 0.026 * k;
          p.vx *= decay;
          p.vy *= decay;
        }

        p.x += p.vx * k;
        p.y += p.vy * k;

        const bleedMargin = 28;
        if (p.x <= -bleedMargin) { p.x = -bleedMargin; p.vx = Math.abs(p.vx); }
        else if (p.x >= width + bleedMargin) { p.x = width + bleedMargin; p.vx = -Math.abs(p.vx); }
        if (p.y <= -bleedMargin) { p.y = -bleedMargin; p.vy = Math.abs(p.vy); }
        else if (p.y >= height + bleedMargin) { p.y = height + bleedMargin; p.vy = -Math.abs(p.vy); }
      }
    }

    // 2. Mod Fizik Adımı: Siber Akış (Matrix Elektromanyetik Saptırma Kalkanı)
    function stepMatrix(k) {
      const shieldR = 132;
      const bleedMargin = 28;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.energy *= Math.pow(0.92, k);
        p.y -= p.speedY * 1.65 * k;

        if (mouseX !== null && mouseY !== null) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const d2 = dx * dx + dy * dy;
          if (d2 > 0.01 && d2 < shieldR * shieldR) {
            const d = Math.sqrt(d2);
            const push = (1 - d / shieldR);
            // Akış damlaları imleç kalkanının etrafından kavis çizerek kayar
            p.x += (dx / d) * push * 4.5 * k + mouseVx * 0.12 * push;
            p.y += (dy / d) * push * 1.8 * k;
            p.energy = Math.max(p.energy, push);
          }
        }

        if (p.y < -35) {
          p.y = height + 25;
          p.x = Math.random() * width;
        }
        if (p.x < -bleedMargin) p.x = width + bleedMargin;
        if (p.x > width + bleedMargin) p.x = -bleedMargin;
      }
    }

    // 3. Mod Fizik Adımı: Siber Radar & Girdap (Vortex Orbital Gravity)
    function stepVortex(k) {
      radarAngle += 0.032 * k;
      const cx = mouseX !== null ? mouseX : width * 0.5;
      const cy = mouseY !== null ? mouseY : height * 0.36;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // İmleç hareket ederken parçacık kümesini doğrudan imleçle birlikte taşı
        if (mouseX !== null && (mouseVx !== 0 || mouseVy !== 0)) {
          p.x += mouseVx * 0.90;
          p.y += mouseVy * 0.90;
        }

        p.orbitAng += p.orbitSpd * (1 + mouseSpeed * 0.08) * k;
        const targetX = cx + Math.cos(p.orbitAng) * p.orbitR;
        const targetY = cy + Math.sin(p.orbitAng) * (p.orbitR * 0.72);

        // Hızlı, atik ve tam takip çekim kuvveti
        p.vx += (targetX - p.x) * 0.16 * k;
        p.vy += (targetY - p.y) * 0.16 * k;
        p.vx *= Math.pow(0.78, k);
        p.vy *= Math.pow(0.78, k);
        p.x += p.vx * k;
        p.y += p.vy * k;

        const dToMouse = Math.hypot(p.x - cx, p.y - cy);
        p.energy = dToMouse < 200 ? (1 - dToMouse / 200) : 0.15;
      }
    }

    // Ortak Görsel Efekt Katmanı: İmleç Işık Kuyruğu, Şok Dalgaları ve Kıvılcımlar
    function drawInteractiveOverlays(isDark, cyanDot, emeraldAccent) {
      // 1. İmleç Spot Işığı (Cursor Aura)
      if (mouseX !== null && mouseY !== null) {
        const auraR = 150 + mouseSpeed * 2.5;
        const aura = ctx.createRadialGradient(mouseX, mouseY, 2, mouseX, mouseY, auraR);
        aura.addColorStop(0, isDark ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.10)');
        aura.addColorStop(0.45, isDark ? 'rgba(0, 224, 255, 0.06)' : 'rgba(13, 148, 136, 0.05)');
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, auraR, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. İmleç Lazer Kuyruğu (Comet Trail)
      if (trail.length > 2) {
        for (let i = 0; i < trail.length - 1; i++) {
          const curr = trail[i];
          const next = trail[i + 1];
          const ratio = 1 - i / trail.length;
          ctx.strokeStyle = `rgba(${emeraldAccent[0]}, ${emeraldAccent[1]}, ${emeraldAccent[2]}, ${( ratio * 0.42 * curr.alpha ).toFixed(3)})`;
          ctx.lineWidth = Math.max(0.8, ratio * 3.2);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(curr.x, curr.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
        }
      }

      // 3. İmleç Merkez Çekirdeği (Cyber Reticle - Tam fare ucunda kilitli)
      if (rawMouseX !== null && rawMouseY !== null) {
        const spotX = rawMouseX;
        const spotY = rawMouseY;
        ctx.strokeStyle = `rgba(${cyanDot[0]}, ${cyanDot[1]}, ${cyanDot[2]}, ${isDark ? 0.65 : 0.55})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(spotX, spotY, 6 + Math.min(8, mouseSpeed * 0.35), 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(${emeraldAccent[0]}, ${emeraldAccent[1]}, ${emeraldAccent[2]}, 0.95)`;
        ctx.beginPath();
        ctx.arc(spotX, spotY, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Tıklama Şok Dalgaları (Shockwave Ripples)
      for (let i = 0; i < shockwaves.length; i++) {
        const sw = shockwaves[i];
        ctx.strokeStyle = `rgba(${emeraldAccent[0]}, ${emeraldAccent[1]}, ${emeraldAccent[2]}, ${sw.alpha.toFixed(3)})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.stroke();

        if (sw.r > 18) {
          ctx.strokeStyle = `rgba(${cyanDot[0]}, ${cyanDot[1]}, ${cyanDot[2]}, ${(sw.alpha * 0.55).toFixed(3)})`;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.r * 0.72, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 5. Etkileşim Kıvılcımları (Sparks)
      for (let i = 0; i < sparks.length; i++) {
        const sp = sparks[i];
        const col = sp.isAccent ? emeraldAccent : cyanDot;
        ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${sp.life.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 1.8 * sp.life + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Çizim Mod 1: Mesh (Parçacık Ağı + Triadic Poligon Yüzey Dolgusu)
    function drawMesh(isDark, cyanLine, cyanDot, emeraldAccent) {
      const glow = ctx.createRadialGradient(width * 0.5, height * 0.25, 0, width * 0.5, height * 0.25, Math.max(width, height) * 0.65);
      glow.addColorStop(0, isDark ? 'rgba(0, 199, 255, 0.07)' : 'rgba(16, 185, 129, 0.05)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 1.0;
      for (let i = 0; i < particles.length; i++) {
        const pA = particles[i];
        const ax = pA.x;
        const ay = pA.y;

        for (let j = i + 1; j < particles.length; j++) {
          const pB = particles[j];
          const bx = pB.x;
          const by = pB.y;
          const dx = ax - bx;
          const dy = ay - by;
          if (Math.abs(dx) > MAX_DIST || Math.abs(dy) > MAX_DIST) continue;
          const d2 = dx * dx + dy * dy;
          if (d2 > MAX_DIST * MAX_DIST) continue;
          const d = Math.sqrt(d2);
          const energyBoost = (pA.energy + pB.energy) * 0.22;
          const a = Math.min(0.85, (isDark ? 0.42 : 0.30) * (1.0 - d / MAX_DIST) + energyBoost);
          if (a < 0.012) continue;

          ctx.strokeStyle = `rgba(${cyanLine[0]}, ${cyanLine[1]}, ${cyanLine[2]}, ${a.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();

          // İmleç yakınındaki birbirine bağlı üçlü parçacıklar arasında Siber Üçgen Yüzey (Triadic Shimmer) oluştur
          if (mouseX !== null && mouseY !== null && d < MAX_DIST * 0.78) {
            const mDist = Math.hypot((ax + bx) * 0.5 - mouseX, (ay + by) * 0.5 - mouseY);
            if (mDist < REPEL_R * 1.25) {
              for (let m = j + 1; m < particles.length; m++) {
                const pC = particles[m];
                const dBC = Math.hypot(bx - pC.x, by - pC.y);
                if (dBC < MAX_DIST * 0.72) {
                  const dAC = Math.hypot(ax - pC.x, ay - pC.y);
                  if (dAC < MAX_DIST * 0.72) {
                    const triAlpha = (1 - mDist / (REPEL_R * 1.25)) * (isDark ? 0.085 : 0.06);
                    ctx.fillStyle = `rgba(${emeraldAccent[0]}, ${emeraldAccent[1]}, ${emeraldAccent[2]}, ${triAlpha.toFixed(3)})`;
                    ctx.beginPath();
                    ctx.moveTo(ax, ay);
                    ctx.lineTo(bx, by);
                    ctx.lineTo(pC.x, pC.y);
                    ctx.closePath();
                    ctx.fill();
                    break;
                  }
                }
              }
            }
          }
        }
      }

      // İmleç Çekim Ağı Bağlantıları
      if (mouseX !== null && mouseY !== null) {
        const reach = MAX_DIST * 1.35;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const d2 = dx * dx + dy * dy;
          if (d2 > reach * reach) continue;
          const d = Math.sqrt(d2);
          const a = (isDark ? 0.58 : 0.45) * (1.0 - d / reach);
          if (a <= 0) continue;

          ctx.strokeStyle = `rgba(${emeraldAccent[0]}, ${emeraldAccent[1]}, ${emeraldAccent[2]}, ${a.toFixed(3)})`;
          ctx.lineWidth = 1.15;
          ctx.beginPath();
          ctx.moveTo(mouseX, mouseY);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }

      // Parçacık Noktaları ve Enerji Haleleri
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const col = p.isAccent ? emeraldAccent : cyanDot;
        const radius = p.r + p.energy * 1.6;

        if (p.energy > 0.15) {
          ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${(p.energy * 0.28).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius * 2.4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${isDark ? 0.92 : 0.74})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Çizim Mod 2: Siber Dalga (Waves + Harmonik İmleç Kırılması & Faz Köprüleri)
    function drawWaves(isDark, cyanLine, emeraldAccent) {
      waveTick += 0.022 + Math.min(0.03, mouseSpeed * 0.0012);

      const glow = ctx.createRadialGradient(width * 0.5, height * 0.25, 0, width * 0.5, height * 0.25, width * 0.55);
      glow.addColorStop(0, isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0, 199, 255, 0.05)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      const wavesCount = 5;
      const stepX = 14;
      const prevWaveY = [];

      for (let w = 0; w < wavesCount; w++) {
        const baseHeight = height * (0.16 + w * 0.16);
        const col = w % 2 === 0 ? emeraldAccent : cyanLine;
        ctx.strokeStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${0.22 + w * 0.065})`;
        ctx.lineWidth = 1.75;
        ctx.beginPath();

        let idx = 0;
        for (let x = 0; x <= width; x += stepX, idx++) {
          const freq = 0.005 + w * 0.0018;
          const amp = 18 + w * 7;
          let y = baseHeight
            + Math.sin(x * freq + waveTick + w) * amp
            + Math.cos(x * 0.0032 - waveTick * 0.6) * (amp * 0.48);

          // İmleç dalga kırılması + lokal harmonik dalgalanma
          if (mouseX !== null && mouseY !== null) {
            const dx = x - mouseX;
            const dy = y - mouseY;
            const dist = Math.hypot(dx, dy);
            const influenceR = 175;
            if (dist < influenceR) {
              const factor = 1 - dist / influenceR;
              const ripple = Math.sin(dist * 0.08 - waveTick * 4.0) * (16 + mouseSpeed * 0.65) * factor;
              const pull = (mouseY - y) * 0.32 * factor;
              y += pull + ripple;
            }
          }

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          // İmleç yakınında dalgalar arası dikey faz köprüleri ve tepe düğümleri
          if (mouseX !== null && Math.abs(x - mouseX) < 150 && idx % 2 === 0) {
            const prox = 1 - Math.abs(x - mouseX) / 150;
            if (w > 0 && prevWaveY[idx] !== undefined) {
              ctx.save();
              ctx.strokeStyle = `rgba(${emeraldAccent[0]}, ${emeraldAccent[1]}, ${emeraldAccent[2]}, ${(prox * 0.22).toFixed(3)})`;
              ctx.lineWidth = 1.0;
              ctx.beginPath();
              ctx.moveTo(x, prevWaveY[idx]);
              ctx.lineTo(x, y);
              ctx.stroke();
              ctx.restore();
            }
          }
          prevWaveY[idx] = y;
        }
        ctx.stroke();
      }
    }

    // Çizim Mod 3: Siber Akış (Matrix + Elektromanyetik Kalkan Halkası)
    function drawMatrix(isDark, emeraldAccent, cyanDot) {
      if (mouseX !== null && mouseY !== null) {
        const shieldGrad = ctx.createRadialGradient(mouseX, mouseY, 18, mouseX, mouseY, 128);
        shieldGrad.addColorStop(0, 'rgba(16, 185, 129, 0.02)');
        shieldGrad.addColorStop(0.75, isDark ? 'rgba(0, 224, 255, 0.08)' : 'rgba(13, 148, 136, 0.07)');
        shieldGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = shieldGrad;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 128, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(5, 150, 105, 0.24)';
        ctx.lineWidth = 1.1;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 118, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const col = (p.isAccent || p.energy > 0.25) ? emeraldAccent : cyanDot;
        const tailLen = p.speedY * (18 + p.energy * 16);

        const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + tailLen);
        grad.addColorStop(0, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${Math.min(1, p.alpha + p.energy * 0.4).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${col[0]}, ${col[1]}, ${col[2]}, 0)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4 + p.energy * 1.1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + tailLen);
        ctx.stroke();

        ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${Math.min(1, p.alpha + p.energy * 0.4).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.95 + p.energy * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Çizim Mod 4: Siber Radar & Girdap (Vortex Orbital Scanner)
    function drawVortex(isDark, cyanLine, cyanDot, emeraldAccent) {
      const cx = mouseX !== null ? mouseX : width * 0.5;
      const cy = mouseY !== null ? mouseY : height * 0.36;

      // Radar konsantrik halkaları
      const rings = [55, 110, 170];
      ctx.lineWidth = 1.0;
      for (let r = 0; r < rings.length; r++) {
        ctx.strokeStyle = `rgba(${cyanLine[0]}, ${cyanLine[1]}, ${cyanLine[2]}, ${isDark ? 0.16 - r * 0.03 : 0.13 - r * 0.02})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rings[r], rings[r] * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Dönen radar tarama kolu
      const scanX = cx + Math.cos(radarAngle) * 175;
      const scanY = cy + Math.sin(radarAngle) * (175 * 0.72);
      const scanGrad = ctx.createLinearGradient(cx, cy, scanX, scanY);
      scanGrad.addColorStop(0, `rgba(${emeraldAccent[0]}, ${emeraldAccent[1]}, ${emeraldAccent[2]}, 0.55)`);
      scanGrad.addColorStop(1, `rgba(${emeraldAccent[0]}, ${emeraldAccent[1]}, ${emeraldAccent[2]}, 0)`);
      ctx.strokeStyle = scanGrad;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(scanX, scanY);
      ctx.stroke();

      // Yörünge parçacıkları ve hız izleri
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const col = p.isAccent ? emeraldAccent : cyanDot;
        const alpha = (isDark ? 0.82 : 0.68) * (0.45 + p.energy * 0.55);

        ctx.strokeStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${(alpha * 0.45).toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2.6, p.y - p.vy * 2.6);
        ctx.stroke();

        ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop(now) {
      const dt = now - lastTime;
      lastTime = now;
      const k = Math.max(0.2, Math.min(3.0, dt / (1000 / 60)));

      ctx.clearRect(0, 0, width, height);

      const isDark = window.UlakTheme ? window.UlakTheme.currentTheme === 'dark' : true;
      const cyanLine = isDark ? [0, 199, 255] : [13, 148, 136];
      const cyanDot = isDark ? [0, 224, 255] : [13, 148, 136];
      const emeraldAccent = isDark ? [16, 185, 129] : [5, 150, 105];

      updatePointerPhysics(k);

      if (activeMode === 'mesh') {
        stepMesh(k);
        drawMesh(isDark, cyanLine, cyanDot, emeraldAccent);
      } else if (activeMode === 'waves') {
        drawWaves(isDark, cyanLine, emeraldAccent);
      } else if (activeMode === 'matrix') {
        stepMatrix(k);
        drawMatrix(isDark, emeraldAccent, cyanDot);
      } else if (activeMode === 'vortex') {
        stepVortex(k);
        drawVortex(isDark, cyanLine, cyanDot, emeraldAccent);
      }

      drawInteractiveOverlays(isDark, cyanDot, emeraldAccent);

      canvasAnimationId = requestAnimationFrame(loop);
    }

    canvasAnimationId = requestAnimationFrame(loop);

    return {
      setMode(mode) {
        activeMode = mode;
      },
      triggerShockwave,
      cleanup() {
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('mouseleave', onPointerLeave);
        container.removeEventListener('pointerdown', onPointerDown);
        if (resizeObserver) resizeObserver.disconnect();
      }
    };
  }

  window.UlakRouter.register(view);
})();
