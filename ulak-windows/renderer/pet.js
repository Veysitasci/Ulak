// ============================================================================
// ULAK MASAÜSTÜ MASKOTU — QODER DESKTOP-PET RUNTIME & 16-YÖNLÜ BAKIŞ MOTORU
// ============================================================================
(function() {
  const root = document.getElementById('desktop-pet-root');
  const hitTarget = document.getElementById('desktop-pet-hit-target');
  const spriteStage = document.getElementById('pet-sprite-stage');
  const mascotOwl = document.getElementById('mascot-owl');
  const mascotDove = document.getElementById('mascot-dove');

  const bubble = document.getElementById('pet-bubble');
  const bubbleOpenBtn = document.getElementById('bubble-open-btn');
  const bubbleTitle = document.getElementById('bubble-title-text');
  const bubbleMsg = document.getElementById('bubble-msg-text');
  const bubbleReplyToggle = document.getElementById('bubble-reply-toggle');
  const bubbleCloseBtn = document.getElementById('bubble-close-btn');
  const iconReplyMsg = document.getElementById('icon-reply-msg');
  const iconReplyChevron = document.getElementById('icon-reply-chevron');
  const statusIconOk = document.getElementById('status-icon-ok');
  const statusIconWarn = document.getElementById('status-icon-warn');

  const statNet = document.getElementById('stat-net');
  const statCpu = document.getElementById('stat-cpu');
  const statMem = document.getElementById('stat-mem');

  const petCmdForm = document.getElementById('pet-cmd-form');
  const petCmdInput = document.getElementById('pet-cmd-input');

  const toolbar = document.getElementById('desktop-pet-toolbar');
  const btnToolbarScan = document.getElementById('desktop-pet-scan-btn');
  const btnToolbarSwitch = document.getElementById('desktop-pet-switch-btn');
  const btnToolbarToggleActivity = document.getElementById('desktop-pet-toggle-activity');
  const toolbarChevron = document.getElementById('toolbar-expand-chevron');

  // Baykuş Göz Elemanları (100x100 SVG Koordinatları)
  const owlLeftPupil = document.getElementById('owl-left-pupil');
  const owlLeftCore = document.getElementById('owl-left-core');
  const owlRightPupil = document.getElementById('owl-right-pupil');
  const owlRightCore = document.getElementById('owl-right-core');
  const owlLeftEyelid = document.getElementById('owl-left-eyelid');
  const owlRightEyelid = document.getElementById('owl-right-eyelid');

  // Barış Kuşu Göz Elemanları (100x100 SVG Koordinatları)
  const dovePupil = document.getElementById('dove-pupil');
  const doveCore = document.getElementById('dove-core');
  const doveEyelid = document.getElementById('dove-eyelid');

  // Qoder Sabitleri
  const GREETING_DURATION_MS = 2600;
  const DRAG_THRESHOLD = 4;
  const DRAG_DIRECTION_THRESHOLD = 4;
  const LOOK_TRACKING_MIN_DISTANCE = 36;
  const POINTER_LOOK_TRACKING_SIZE = 420;

  // Maskot Katalog 메타verisi
  const PET_CATALOG = {
    owl: {
      id: 'owl',
      title: 'Gözcü Baykuş • Gözetleme',
      greeting: 'Gözetleme kalkanları aktif! Ağ izleniyor.',
      idleDetail: 'Ağ gözetleniyor • Kalkanlar aktif',
      leftEye: { cx: 53.8, cy: 24.8, maxOffset: 1.9 },
      rightEye: { cx: 69.6, cy: 25.2, maxOffset: 1.55 }
    },
    dove: {
      id: 'dove',
      title: 'Barış Kuşu • Güvenli İletişim',
      greeting: 'Şifreli iletişim hattı hazır ve güvenli.',
      idleDetail: 'Güvenli iletişim • Veri hattı korunuyor',
      eye: { cx: 29.7, cy: 36.6, maxOffset: 0.85 }
    }
  };

  let petSettings = {
    enabled: true,
    activePetId: 'owl',
    sizePercent: 100,
    lookTracking: true,
    reactionsEnabled: true
  };

  let currentPhase = 'idle'; // 'idle' | 'running' | 'failed'
  let isGreeting = false;
  let isHovering = false;
  let isTracking = false;
  let lookDirection = 0;
  let dragDirection = null; // 'left' | 'right' | null
  let isDragging = false;
  let isReplyExpanded = false;

  let greetingTimer = null;
  let bubbleTimer = null;
  let trackingTimer = null;
  let idleFidgetTimer = null;

  let lastCursorX = 0;
  let lastCursorY = 0;
  let lastMouseMoveTime = Date.now();
  let isFidgeting = false;
  let isClicked = false;

  // 1. BAŞLATMA
  async function init() {
    try {
      if (window.ulak) {
        const loaded = await window.ulak.invoke('pet:get-settings');
        if (loaded) {
          petSettings = { ...petSettings, ...loaded };
        }

        window.ulak.on('pet:theme-changed', (theme) => applyTheme(theme));
        window.ulak.on('pet:settings-changed', (newSettings) => {
          const prevPet = petSettings.activePetId;
          petSettings = { ...petSettings, ...newSettings };
          if (newSettings.sizePercent !== undefined) applySize(petSettings.sizePercent);
          if (newSettings.activePetId && newSettings.activePetId !== prevPet) {
            applyActivePet(newSettings.activePetId, true);
          }
          if (newSettings.lookTracking !== undefined) {
            startLookTracking();
          }
        });

        window.ulak.on('pet:state-changed', (stateName) => {
          if (stateName === 'running') {
            triggerScanSequence();
          } else if (stateName === 'failed' || stateName === 'alert') {
            triggerAlertSequence();
          }
        });
      }
    } catch (err) {
      console.warn('[PET] Başlatma uyarısı:', err);
    }

    applySize(petSettings.sizePercent);
    applyActivePet(petSettings.activePetId || 'owl', false);
    playGreeting();
    startLookTracking();
    startBlinking();
    startIdleFidgetEngine();
    setupInteractions();
    refreshTelemetry();
  }

  // 2. AKTİF MASKOT DEĞİŞİMİ (OWL <-> DOVE)
  function applyActivePet(petId, withGreeting = false) {
    const validId = PET_CATALOG[petId] ? petId : 'owl';
    petSettings.activePetId = validId;
    root.setAttribute('data-active-pet', validId);

    if (mascotOwl) mascotOwl.classList.toggle('active', validId === 'owl');
    if (mascotDove) mascotDove.classList.toggle('active', validId === 'dove');

    const meta = PET_CATALOG[validId];
    if (bubbleTitle) bubbleTitle.textContent = meta.title;
    if (bubbleMsg) bubbleMsg.textContent = meta.idleDetail;

    if (withGreeting) {
      playGreeting();
    }
  }

  // 3. QODER GREETING MOTION (2600ms) & KANAT ÇIRPMA
  let flapTimer = null;
  function triggerWingFlapSequence(durationMs = 1400) {
    root.removeAttribute('data-flapping');
    void root.offsetWidth; // DOM reflow zorlayarak animasyonu anında baştan başlatır
    root.setAttribute('data-flapping', 'true');

    if (flapTimer) clearTimeout(flapTimer);
    flapTimer = setTimeout(() => {
      root.removeAttribute('data-flapping');
    }, durationMs);
  }

  function playGreeting() {
    isGreeting = true;
    updateMotionAttribute();
    triggerWingFlapSequence(1600);
    // Üst aktivite baloncuğu başlangıçta otomatik kapalı kalır, ekranı işgal etmez.
    if (bubble) {
      bubble.classList.remove('visible');
      syncToolbarChevron();
    }

    if (greetingTimer) clearTimeout(greetingTimer);
    greetingTimer = setTimeout(() => {
      isGreeting = false;
      updateMotionAttribute();
    }, GREETING_DURATION_MS);
  }

  // 4. QODER MOTION PHASE RESOLVER
  function resolveDesktopPetMotionPhase() {
    if (dragDirection) return `running-${dragDirection}`;
    if (isHovering) return 'jumping';
    if (isGreeting) return 'waving';
    if (isTracking && currentPhase === 'idle') return 'look';
    return currentPhase;
  }

  function updateMotionAttribute() {
    const motion = resolveDesktopPetMotionPhase();
    root.setAttribute('data-phase', currentPhase);
    root.setAttribute('data-motion', motion);
    if (motion === 'look') {
      root.setAttribute('data-look-direction', String(lookDirection));
    } else {
      root.removeAttribute('data-look-direction');
      if (spriteStage && !dragDirection) {
        spriteStage.style.transform = '';
      }
    }
  }

  // 5. QODER 16-DIRECTION LOOK TRACKING ENGINE
  function resolveLookSample(dx, dy, minDistance) {
    const angleDeg = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
    const distance = Math.hypot(dx, dy);
    const halfBox = POINTER_LOOK_TRACKING_SIZE / 2;
    const tracking = distance >= minDistance && Math.abs(dx) <= halfBox && Math.abs(dy) <= halfBox;
    return {
      direction: Math.round(angleDeg / 22.5) % 16,
      tracking,
      distance,
      rad: Math.atan2(dy, dx)
    };
  }

  function startLookTracking() {
    if (trackingTimer) clearInterval(trackingTimer);
    if (!petSettings.lookTracking) {
      isTracking = false;
      resetPupils();
      updateMotionAttribute();
      return;
    }

    trackingTimer = setInterval(async () => {
      if (isDragging || !window.ulak) return;
      try {
        const res = await window.ulak.invoke('pet:get-cursor-pos');
        if (!res || !res.cursor || !res.windowBounds) return;

        const cursor = res.cursor;
        const bounds = res.windowBounds;

        if (Math.abs(cursor.x - lastCursorX) > 2 || Math.abs(cursor.y - lastCursorY) > 2) {
          lastMouseMoveTime = Date.now();
          lastCursorX = cursor.x;
          lastCursorY = cursor.y;
          if (isFidgeting) {
            root.removeAttribute('data-fidget');
            isFidgeting = false;
          }
        }

        // Maskot karakterinin pencere içindeki merkezi (alt yarıda yer alır)
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height - 96;

        const dx = cursor.x - centerX;
        const dy = cursor.y - centerY;

        // Hover durumunda gözler sevimli şekilde merkeze/hafif yukarı odaklanır
        if (isHovering) {
          isTracking = false;
          setPupilDirection(0, -0.35, 0, 0);
          updateMotionAttribute();
          return;
        }

        const sample = resolveLookSample(dx, dy, LOOK_TRACKING_MIN_DISTANCE);
        lookDirection = sample.direction;
        isTracking = sample.tracking;

        const intensity = Math.min(sample.distance / 190, 1.0);
        const unitX = Math.cos(sample.rad) * intensity;
        const unitY = Math.sin(sample.rad) * intensity;

        setPupilDirection(unitX, unitY, dx, dy);
        updateMotionAttribute();
      } catch (e) {}
    }, 50);
  }

  function setPupilDirection(unitX, unitY, rawDx, rawDy) {
    if (petSettings.activePetId === 'owl') {
      const L = PET_CATALOG.owl.leftEye;
      const R = PET_CATALOG.owl.rightEye;

      const lx = L.cx + unitX * L.maxOffset;
      const ly = L.cy + unitY * L.maxOffset;
      const rx = R.cx + unitX * R.maxOffset;
      const ry = R.cy + unitY * R.maxOffset;

      if (owlLeftPupil) {
        owlLeftPupil.setAttribute('cx', lx.toFixed(2));
        owlLeftPupil.setAttribute('cy', ly.toFixed(2));
      }
      if (owlLeftCore) {
        owlLeftCore.setAttribute('cx', (lx - 0.65).toFixed(2));
        owlLeftCore.setAttribute('cy', (ly - 0.65).toFixed(2));
      }
      if (owlRightPupil) {
        owlRightPupil.setAttribute('cx', rx.toFixed(2));
        owlRightPupil.setAttribute('cy', ry.toFixed(2));
      }
      if (owlRightCore) {
        owlRightCore.setAttribute('cx', (rx - 0.55).toFixed(2));
        owlRightCore.setAttribute('cy', (ry - 0.55).toFixed(2));
      }
    } else {
      const E = PET_CATALOG.dove.eye;
      const ex = E.cx + unitX * E.maxOffset;
      const ey = E.cy + unitY * E.maxOffset;

      if (dovePupil) {
        dovePupil.setAttribute('cx', ex.toFixed(2));
        dovePupil.setAttribute('cy', ey.toFixed(2));
      }
      if (doveCore) {
        doveCore.setAttribute('cx', (ex - 0.35).toFixed(2));
        doveCore.setAttribute('cy', (ey - 0.35).toFixed(2));
      }
    }

    // Qoder 16-Direction Look: Karakterin kendisi de imlece doğru zarif 3B perspektif dönüşü yapar
    if (spriteStage && isTracking && !isHovering && !isDragging && !isGreeting) {
      const tiltX = Math.max(-6, Math.min(6, unitX * 6));
      const tiltY = Math.max(-4, Math.min(4, unitY * 4));
      spriteStage.style.transform = `translate3d(${(unitX * 2.5).toFixed(1)}px, ${(unitY * 2.0).toFixed(1)}px, 0) rotate(${(tiltX * 0.45).toFixed(1)}deg)`;
    }
  }

  function resetPupils() {
    setPupilDirection(0, 0, 0, 0);
  }

  // 6. DOĞAL GÖZ KIRPMA DÖNGÜSÜ (Tek ve Çift Kırpma Çeşitliliği)
  function startBlinking() {
    function blink() {
      if (!isDragging) {
        if (owlLeftEyelid) owlLeftEyelid.classList.add('blinking');
        if (owlRightEyelid) owlRightEyelid.classList.add('blinking');
        if (doveEyelid) doveEyelid.classList.add('blinking');

        const isDouble = Math.random() < 0.32;

        setTimeout(() => {
          if (owlLeftEyelid) owlLeftEyelid.classList.remove('blinking');
          if (owlRightEyelid) owlRightEyelid.classList.remove('blinking');
          if (doveEyelid) doveEyelid.classList.remove('blinking');

          // Doğal sevimli çift kırpma
          if (isDouble && !isDragging) {
            setTimeout(() => {
              if (owlLeftEyelid) owlLeftEyelid.classList.add('blinking');
              if (owlRightEyelid) owlRightEyelid.classList.add('blinking');
              if (doveEyelid) doveEyelid.classList.add('blinking');
              setTimeout(() => {
                if (owlLeftEyelid) owlLeftEyelid.classList.remove('blinking');
                if (owlRightEyelid) owlRightEyelid.classList.remove('blinking');
                if (doveEyelid) doveEyelid.classList.remove('blinking');
              }, 95);
            }, 120);
          }
        }, 110);
      }
      setTimeout(blink, Math.random() * 3000 + 2400);
    }
    setTimeout(blink, 1800);
  }

  // 6.1. OTONOM CANLI DAVRANIŞ MOTORU (IDLE FIDGETS)
  function startIdleFidgetEngine() {
    if (idleFidgetTimer) clearInterval(idleFidgetTimer);

    idleFidgetTimer = setInterval(() => {
      if (isDragging || isHovering || isGreeting || isFidgeting || isClicked || currentPhase === 'failed') return;

      const idleDuration = Date.now() - lastMouseMoveTime;
      // Kullanıcı fareyi 3.2 saniyedir hareket ettirmiyorsa maskot etrafı keşfeder
      if (idleDuration < 3200) return;

      const roll = Math.random();
      isFidgeting = true;

      if (roll < 0.40) {
        // A. Etrafı merakla inceleme (Glance)
        const glanceDir = Math.random() < 0.5 ? -1 : 1;
        setPupilDirection(glanceDir * 0.72, 0.35, 0, 0);
        setTimeout(() => {
          if (isFidgeting) {
            setPupilDirection(0, 0, 0, 0);
            isFidgeting = false;
          }
        }, 1400);
      } else if (roll < 0.75) {
        // B. Meraklı Baş Eğme (Head Tilt)
        const tilt = Math.random() < 0.5 ? 'tilt-left' : 'tilt-right';
        root.setAttribute('data-fidget', tilt);
        setTimeout(() => {
          root.removeAttribute('data-fidget');
          isFidgeting = false;
        }, 1500);
      } else {
        // C. Neşeli Kanat / Gövde Yaylanması (Flutter)
        root.setAttribute('data-fidget', 'flutter');
        setTimeout(() => {
          root.removeAttribute('data-fidget');
          isFidgeting = false;
        }, 550);
      }
    }, 4500);
  }

  // 7. TEMA & BOYUT UYARLAMA
  function applyTheme(theme) {
    if (!theme) return;
    const docRoot = document.documentElement;
    if (theme.accent) docRoot.style.setProperty('--accent', theme.accent);
    if (theme.accentSoft) docRoot.style.setProperty('--accent-soft', theme.accentSoft);
    if (theme.accentGlow) docRoot.style.setProperty('--accent-glow', theme.accentGlow);
    if (theme.glassSurface) docRoot.style.setProperty('--glass-surface', theme.glassSurface);
    if (theme.glassBorder) docRoot.style.setProperty('--glass-border', theme.glassBorder);
    if (theme.text1) docRoot.style.setProperty('--text-1', theme.text1);
    if (theme.text2) docRoot.style.setProperty('--text-2', theme.text2);
  }

  function applySize(percent) {
    const clamped = Math.max(50, Math.min(150, percent || 100));
    const scale = clamped / 100;
    const baseSize = 132;
    const px = Math.round(baseSize * scale);
    document.documentElement.style.setProperty('--pet-size', `${px}px`);
    document.documentElement.style.setProperty('--pet-scale', String(scale));
  }

  // 8. QODER SQUIRCLE ACTIVITY BUBBLE & TELEMETRİ YÖNETİMİ
  async function refreshTelemetry() {
    if (!window.ulak) return;
    try {
      const st = await window.ulak.invoke('pet:get-system-status');
      if (st) {
        if (statCpu) {
          statCpu.textContent = `CPU %${st.cpu}`;
          statCpu.className = `stat-pill ${st.cpu > 80 ? 'negative' : 'neutral'}`;
        }
        if (statMem) {
          statMem.textContent = `RAM %${st.mem}`;
          statMem.className = `stat-pill ${st.mem > 85 ? 'negative' : 'neutral'}`;
        }
        if (statNet) {
          statNet.textContent = currentPhase === 'failed' ? 'Risk Algılandı' : 'Ağ Güvenli';
          statNet.className = `stat-pill ${currentPhase === 'failed' ? 'negative' : 'positive'}`;
        }
      }
    } catch (e) {}
  }

  function showBubble(title, detail, status = 'completed', autoHideMs = 4800) {
    const meta = PET_CATALOG[petSettings.activePetId] || PET_CATALOG.owl;
    if (bubbleTitle) bubbleTitle.textContent = title || meta.title;
    if (bubbleMsg) bubbleMsg.textContent = detail || meta.idleDetail;

    bubble.setAttribute('data-status', status);
    if (statusIconOk) statusIconOk.style.display = status === 'failed' ? 'none' : 'block';
    if (statusIconWarn) statusIconWarn.style.display = status === 'failed' ? 'block' : 'none';

    bubble.classList.add('visible');
    syncToolbarChevron();
    refreshTelemetry();

    if (bubbleTimer) clearTimeout(bubbleTimer);
    if (autoHideMs > 0 && !isReplyExpanded) {
      bubbleTimer = setTimeout(() => {
        if (!isReplyExpanded) {
          bubble.classList.remove('visible');
          syncToolbarChevron();
        }
      }, autoHideMs);
    }
  }

  function setReplyExpanded(expanded) {
    isReplyExpanded = !!expanded;
    bubble.setAttribute('data-expanded', isReplyExpanded ? 'true' : 'false');
    if (iconReplyMsg) iconReplyMsg.style.display = isReplyExpanded ? 'none' : 'block';
    if (iconReplyChevron) iconReplyChevron.style.display = isReplyExpanded ? 'block' : 'none';

    if (isReplyExpanded) {
      bubble.classList.add('visible');
      if (bubbleTimer) clearTimeout(bubbleTimer);
      setTimeout(() => {
        if (petCmdInput) petCmdInput.focus();
      }, 90);
    }
    syncToolbarChevron();
  }

  function syncToolbarChevron() {
    const isVis = bubble.classList.contains('visible');
    if (btnToolbarToggleActivity) {
      btnToolbarToggleActivity.setAttribute('aria-expanded', isVis ? 'true' : 'false');
    }
    if (toolbarChevron) {
      toolbarChevron.classList.toggle('rotate-180', !isVis);
    }
  }

  // 9. TARAMA VE ALARM SENARYOLARI
  function triggerScanSequence() {
    currentPhase = 'running';
    updateMotionAttribute();
    const meta = PET_CATALOG[petSettings.activePetId] || PET_CATALOG.owl;
    showBubble(meta.title, 'Ağ portları ve bellek taranıyor...', 'running', 0);

    setTimeout(async () => {
      currentPhase = 'idle';
      updateMotionAttribute();
      await refreshTelemetry();
      showBubble(meta.title, 'Tarama tamamlandı • Tehdit bulunamadı', 'completed', 4500);
    }, 3000);
  }

  function triggerAlertSequence() {
    currentPhase = 'failed';
    updateMotionAttribute();
    const meta = PET_CATALOG[petSettings.activePetId] || PET_CATALOG.owl;
    showBubble('Siber Güvenlik Uyarısı!', 'Şüpheli paket engellendi • Kalkanlar tam güçte', 'failed', 5500);

    setTimeout(() => {
      currentPhase = 'idle';
      updateMotionAttribute();
      refreshTelemetry();
    }, 5500);
  }

  // 10. ETKİLEŞİMLER, DRAG-MOVE VE FLOATING TOOLBAR
  function setupInteractions() {
    // Pencere üzerinde hover olduğunda Qoder FloatingIconToolbar görünür olur
    root.addEventListener('pointerenter', () => {
      root.setAttribute('data-controls-visible', 'true');
    });

    root.addEventListener('pointerleave', () => {
      if (!isReplyExpanded) {
        root.setAttribute('data-controls-visible', 'false');
      }
      isHovering = false;
      updateMotionAttribute();
    });

    // Maskot üzerine gelindiğinde (Qoder jumping / hover)
    hitTarget.addEventListener('pointerenter', () => {
      if (!isDragging) {
        isHovering = true;
        updateMotionAttribute();
      }
    });

    hitTarget.addEventListener('pointerleave', () => {
      isHovering = false;
      updateMotionAttribute();
    });

    function spawnSparkle() {
      if (!hitTarget) return;
      const sparkle = document.createElement('span');
      sparkle.className = 'pet-sparkle-burst';
      const icons = ['✨', '💎', '🛡️', '⚡', '🌟'];
      sparkle.textContent = icons[Math.floor(Math.random() * icons.length)];
      sparkle.style.left = '50%';
      sparkle.style.top = '10%';
      hitTarget.appendChild(sparkle);
      setTimeout(() => sparkle.remove(), 850);
    }

    // Maskota tıklandığında hafif yaylanma tepkisi & basınca kanat çırpma
    hitTarget.addEventListener('mousedown', (e) => {
      if (e.button === 0 && spriteStage) {
        triggerWingFlapSequence(1300);
      }
    });

    // Maskota tek tıklama: Aktivite balonunu aç/göster & Neşeli sevilme yaylanması ve kanat çırpma
    hitTarget.addEventListener('click', async () => {
      if (isDragging) return;

      isClicked = true;
      root.setAttribute('data-motion', 'clicked');
      triggerWingFlapSequence(1300);
      spawnSparkle();
      setTimeout(() => {
        isClicked = false;
        if (!isDragging) {
          updateMotionAttribute();
        }
      }, 750);

      const meta = PET_CATALOG[petSettings.activePetId] || PET_CATALOG.owl;
      if (bubble.classList.contains('visible') && !isReplyExpanded) {
        bubble.classList.remove('visible');
        syncToolbarChevron();
      } else {
        await refreshTelemetry();
        showBubble(meta.title, meta.idleDetail, currentPhase === 'failed' ? 'failed' : 'completed', 5000);
      }
    });

    // Maskota çift tıklama: Ana Ulak penceresini aç (Qoder openWorkbench)
    hitTarget.addEventListener('dblclick', () => {
      if (window.ulak) window.ulak.invoke('pet:action', 'open-main-window');
    });

    // Sağ tıklama: Maskot değiştir veya baloncuğu aç
    hitTarget.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const isVis = bubble.classList.contains('visible');
      if (!isVis) {
        const meta = PET_CATALOG[petSettings.activePetId] || PET_CATALOG.owl;
        showBubble(meta.title, meta.idleDetail, 'completed', 0);
        setReplyExpanded(true);
      } else {
        setReplyExpanded(!isReplyExpanded);
      }
    });

    // Qoder Drag-Move & Drag Direction Resolver (running-left / running-right)
    let pointerState = null;
    hitTarget.addEventListener('pointerdown', async (e) => {
      if (e.button !== 0) return;
      isDragging = false;
      dragDirection = null;

      let winX = 0, winY = 0;
      if (window.ulak) {
        const pos = await window.ulak.invoke('pet:get-position');
        if (pos) { winX = pos.x; winY = pos.y; }
      }

      pointerState = {
        pointerId: e.pointerId,
        startScreenX: e.screenX,
        startScreenY: e.screenY,
        lastScreenX: e.screenX,
        lastScreenY: e.screenY,
        winStartX: winX,
        winStartY: winY
      };
      try { hitTarget.setPointerCapture(e.pointerId); } catch (err) {}
    });

    hitTarget.addEventListener('pointermove', (e) => {
      if (!pointerState || pointerState.pointerId !== e.pointerId) return;

      const totalDx = e.screenX - pointerState.startScreenX;
      const totalDy = e.screenY - pointerState.startScreenY;

      if (!isDragging && Math.hypot(totalDx, totalDy) > DRAG_THRESHOLD) {
        isDragging = true;
        isHovering = false;
        setReplyExpanded(false);
        bubble.classList.remove('visible');
        syncToolbarChevron();
      }

      if (isDragging) {
        const stepDx = e.screenX - pointerState.lastScreenX;
        const stepDy = e.screenY - pointerState.lastScreenY;

        if (Math.abs(stepDx) >= DRAG_DIRECTION_THRESHOLD || Math.abs(stepDy) >= DRAG_DIRECTION_THRESHOLD) {
          if (stepDx >= DRAG_DIRECTION_THRESHOLD) dragDirection = 'right';
          else if (stepDx <= -DRAG_DIRECTION_THRESHOLD) dragDirection = 'left';
          pointerState.lastScreenX = e.screenX;
          pointerState.lastScreenY = e.screenY;
          updateMotionAttribute();
        }

        if (window.ulak) {
          window.ulak.invoke('pet:set-position', {
            x: Math.round(pointerState.winStartX + totalDx),
            y: Math.round(pointerState.winStartY + totalDy)
          });
        }
      }
    });

    function finishPointerDrag(e) {
      if (!pointerState || pointerState.pointerId !== e.pointerId) return;
      try { hitTarget.releasePointerCapture(e.pointerId); } catch (err) {}
      pointerState = null;
      dragDirection = null;
      updateMotionAttribute();
      setTimeout(() => { isDragging = false; }, 60);
    }

    hitTarget.addEventListener('pointerup', finishPointerDrag);
    hitTarget.addEventListener('pointercancel', finishPointerDrag);

    // ==================== FLOATING TOOLBAR BUTONLARI ====================
    // 1. Hızlı Siber Tarama Butonu
    if (btnToolbarScan) {
      btnToolbarScan.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerScanSequence();
      });
    }

    // 2. Maskot Değiştir Butonu (Baykuş <-> Barış Kuşu)
    if (btnToolbarSwitch) {
      btnToolbarSwitch.addEventListener('click', async (e) => {
        e.stopPropagation();
        const nextPet = petSettings.activePetId === 'owl' ? 'dove' : 'owl';
        applyActivePet(nextPet, true);
        if (window.ulak) {
          await window.ulak.invoke('pet:set-settings', { activePetId: nextPet });
        }
      });
    }

    // 3. Aktivite Baloncuğu Aç / Kapa Butonu
    if (btnToolbarToggleActivity) {
      btnToolbarToggleActivity.addEventListener('click', async (e) => {
        e.stopPropagation();
        const isVis = bubble.classList.contains('visible');
        if (isVis) {
          setReplyExpanded(false);
          bubble.classList.remove('visible');
          syncToolbarChevron();
        } else {
          const meta = PET_CATALOG[petSettings.activePetId] || PET_CATALOG.owl;
          await refreshTelemetry();
          showBubble(meta.title, meta.idleDetail, currentPhase === 'failed' ? 'failed' : 'completed', 0);
        }
      });
    }

    // ==================== ACTIVITY BUBBLE ETKİLEŞİMLERİ ====================
    if (bubbleOpenBtn) {
      bubbleOpenBtn.addEventListener('click', () => {
        if (window.ulak) window.ulak.invoke('pet:action', 'open-main-window');
      });
    }

    if (bubbleReplyToggle) {
      bubbleReplyToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        setReplyExpanded(!isReplyExpanded);
      });
    }

    if (bubbleCloseBtn) {
      bubbleCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setReplyExpanded(false);
        bubble.classList.remove('visible');
        syncToolbarChevron();
      });
    }

    // Hızlı Komut Çipleri
    document.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-quick-cmd');
        if (cmd) executePetCommand(cmd);
      });
    });

    // Textarea Enter ile gönderim
    if (petCmdInput) {
      petCmdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          petCmdForm.requestSubmit();
        }
      });
    }

    if (petCmdForm) {
      petCmdForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const raw = (petCmdInput.value || '').trim();
        if (!raw) return;
        petCmdInput.value = '';
        executePetCommand(raw);
      });
    }
  }

  async function executePetCommand(rawCmd) {
    const cmd = rawCmd.toLowerCase();
    const meta = PET_CATALOG[petSettings.activePetId] || PET_CATALOG.owl;

    if (cmd.includes('tara') || cmd.includes('scan')) {
      setReplyExpanded(false);
      triggerScanSequence();
    } else if (cmd.includes('durum') || cmd.includes('stat') || cmd.includes('sistem')) {
      await refreshTelemetry();
      setReplyExpanded(false);
      showBubble(meta.title, 'Canlı sistem telemetrisi güncellendi.', 'completed', 4500);
    } else if (cmd.includes('kuş') && !cmd.includes('baykuş')) {
      setReplyExpanded(false);
      applyActivePet('dove', true);
      if (window.ulak) window.ulak.invoke('pet:set-settings', { activePetId: 'dove' });
    } else if (cmd.includes('baykuş') || cmd.includes('owl')) {
      setReplyExpanded(false);
      applyActivePet('owl', true);
      if (window.ulak) window.ulak.invoke('pet:set-settings', { activePetId: 'owl' });
    } else if (cmd.includes('alarm') || cmd.includes('tehdit')) {
      setReplyExpanded(false);
      triggerAlertSequence();
    } else if (cmd.includes('kapat') || cmd.includes('gizle')) {
      setReplyExpanded(false);
      bubble.classList.remove('visible');
      syncToolbarChevron();
    } else if (cmd.includes('kalkan') || cmd.includes('firewall')) {
      setReplyExpanded(false);
      showBubble(meta.title, 'Güvenlik duvarı kalkanı tam kapasite aktif 🛡️', 'completed', 4500);
    } else if (cmd.includes('yardım') || cmd.includes('help')) {
      setReplyExpanded(false);
      showBubble(meta.title, 'Komutlar: tara, durum, baykuş, kuş, alarm, kalkan, aç, gizle', 'completed', 6000);
    } else if (cmd.includes('aç') || cmd.includes('open') || cmd.includes('ulak')) {
      setReplyExpanded(false);
      if (window.ulak) window.ulak.invoke('pet:action', 'open-main-window');
      showBubble(meta.title, 'Ulak ana istasyonu öne getirildi.', 'completed', 3000);
    } else {
      setReplyExpanded(false);
      showBubble(meta.title, `Komut işlendi: "${rawCmd}"`, 'completed', 4000);
    }
  }

  init();
})();
