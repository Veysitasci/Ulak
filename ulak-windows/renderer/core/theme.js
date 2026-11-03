// THEME & LIQUID POINTER GLOW SYSTEM — GOLDEN RATIO & DUAL-MODE (DARK / LIGHT) PALETTES
const Theme = {
  currentFamily: 'nord',
  currentMode: 'dark',
  currentTheme: 'nord-dark',

  families: {
    nord: {
      name: 'Nord',
      dark: {
        id: 'nord-dark',
        name: 'Nord (Koyu)',
        subtitle: 'Soğuk, sakin buz mavisi',
        preview: ['#2E3440', '#3B4252', '#88C0D0', '#81A1C1', '#ECEFF4']
      },
      light: {
        id: 'nord-light',
        name: 'Nord (Açık)',
        subtitle: 'Snow Storm buz beyazı',
        preview: ['#ECEFF4', '#E5E9F0', '#5E81AC', '#88C0D0', '#2E3440']
      }
    },
    dracula: {
      name: 'Dracula',
      dark: {
        id: 'dracula-dark',
        name: 'Dracula (Koyu)',
        subtitle: 'Neon mor ve pembe kontrast',
        preview: ['#282A36', '#44475A', '#BD93F9', '#FF79C6', '#50FA7B']
      },
      light: {
        id: 'dracula-light',
        name: 'Dracula (Açık)',
        subtitle: 'Alucard açık mor ve pembe',
        preview: ['#F8F8F2', '#EAEAE0', '#9546E8', '#FF79C6', '#282A36']
      }
    },
    catppuccin: {
      name: 'Catppuccin',
      dark: {
        id: 'catppuccin-dark',
        name: 'Catppuccin Mocha (Koyu)',
        subtitle: 'Mocha pastel sıcak koyu',
        preview: ['#1E1E2E', '#313244', '#CBA6F7', '#89B4FA', '#F38BA8']
      },
      light: {
        id: 'catppuccin-light',
        name: 'Catppuccin Latte (Açık)',
        subtitle: 'Latte yumuşak ferah açık',
        preview: ['#EFF1F5', '#E6E9EF', '#8839EF', '#1E66F5', '#4C4F69']
      }
    },
    gruvbox: {
      name: 'Gruvbox',
      dark: {
        id: 'gruvbox-dark',
        name: 'Gruvbox (Koyu)',
        subtitle: 'Retro toprak ve sıcak turuncu',
        preview: ['#282828', '#504945', '#FE8019', '#FABD2F', '#B8BB26']
      },
      light: {
        id: 'gruvbox-light',
        name: 'Gruvbox (Açık)',
        subtitle: 'Retro açık parşömen ve toprak',
        preview: ['#FBF1C7', '#EBDBB2', '#D65D0E', '#D79921', '#282828']
      }
    },
    rosePine: {
      name: 'Rosé Pine',
      dark: {
        id: 'rosePine-dark',
        name: 'Rosé Pine (Koyu)',
        subtitle: 'Zarif gül ve çam esintisi',
        preview: ['#191724', '#26233A', '#EBBCBA', '#C4A7E7', '#9CCFD8']
      },
      light: {
        id: 'rosePine-light',
        name: 'Rosé Pine Dawn (Açık)',
        subtitle: 'Dawn açık şafak ve gül',
        preview: ['#FAF4ED', '#F2E9DE', '#B4637A', '#907AA9', '#575279']
      }
    },
    ulak: {
      name: 'Obsidian / Frosted',
      dark: {
        id: 'dark',
        name: 'Obsidian Cam (Koyu)',
        subtitle: 'ULAK varsayılan obsidyen koyu',
        preview: ['#090C13', '#131A2A', '#10B981', '#06B6D4', '#FFFFFF']
      },
      light: {
        id: 'light',
        name: 'Frosted Cam (Açık)',
        subtitle: 'ULAK varsayılan buzlu açık',
        preview: ['#F3F5F9', '#FFFFFF', '#10B981', '#06B6D4', '#0F172A']
      }
    }
  },

  // Flat theme lookup
  get themes() {
    const list = {};
    Object.entries(this.families).forEach(([famKey, fam]) => {
      list[`${famKey}-dark`] = { ...fam.dark, family: famKey, mode: 'dark' };
      list[`${famKey}-light`] = { ...fam.light, family: famKey, mode: 'light' };
    });
    list['dark'] = list['ulak-dark'];
    list['light'] = list['ulak-light'];
    return list;
  },

  init() {
    let savedFamily = localStorage.getItem('ulak-theme-family');
    let savedMode = localStorage.getItem('ulak-theme-mode') || 'dark';

    // Ana tema varsayilani Nord (eski ulak varsayilanindan nord'a gecis)
    if (!savedFamily || savedFamily === 'ulak') {
      savedFamily = 'nord';
      localStorage.setItem('ulak-theme-family', 'nord');
    }

    this.currentFamily = savedFamily;
    this.currentMode = savedMode;

    // Backwards compatibility check
    const legacy = localStorage.getItem('ulak-theme');
    if (legacy && !localStorage.getItem('ulak-theme-family')) {
      if (legacy.includes('light')) {
        this.currentMode = 'light';
      }
      for (const fam of Object.keys(this.families)) {
        if (fam !== 'ulak' && legacy.toLowerCase().includes(fam.toLowerCase())) {
          this.currentFamily = fam;
          break;
        }
      }
    }
    if (!this.families[this.currentFamily] || this.currentFamily === 'ulak') {
      this.currentFamily = 'nord';
    }

    this.applyTheme(this.currentFamily, this.currentMode);
    this.setupFlyout();

    // Setup interactive liquid glow & 3D tilt tracking
    let rafPending = false;
    let lastClientX = -500;
    let lastClientY = -500;

    window.addEventListener('pointermove', (e) => {
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      if (rafPending) return;
      rafPending = true;

      requestAnimationFrame(() => {
        rafPending = false;
        document.querySelectorAll('.liquid-glow').forEach((el) => {
          const rect = el.getBoundingClientRect();
          const x = lastClientX - rect.left;
          const y = lastClientY - rect.top;
          el.style.setProperty('--mouse-x', `${x}px`);
          el.style.setProperty('--mouse-y', `${y}px`);

          if (el.classList.contains('tilt-card')) {
            const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
            if (inside && rect.width > 0 && rect.height > 0) {
              const nx = (x / rect.width) - 0.5;
              const ny = (y / rect.height) - 0.5;
              el.style.setProperty('--tilt-x', `${(-ny * 7.5).toFixed(2)}deg`);
              el.style.setProperty('--tilt-y', `${(nx * 7.5).toFixed(2)}deg`);
            } else {
              el.style.setProperty('--tilt-x', '0deg');
              el.style.setProperty('--tilt-y', '0deg');
            }
          }
        });
      });
    });
  },

  setupFlyout() {
    const wrapper = document.getElementById('sidebar-theme-wrapper');
    const triggerBtn = document.getElementById('btn-theme-flyout');
    const flyoutList = document.getElementById('theme-flyout-list');
    const modeBtns = document.querySelectorAll('.theme-mode-btn');

    if (!wrapper || !triggerBtn) return;

    if (flyoutList) {
      this.renderFlyoutItems(flyoutList);
    }

    // Mode buttons (Koyu / Açık)
    modeBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = btn.getAttribute('data-mode');
        if (mode && mode !== this.currentMode) {
          this.setMode(mode);
          if (window.UlakUI && window.UlakUI.toast) {
            window.UlakUI.toast(`${mode === 'dark' ? 'Koyu' : 'Açık'} mod aktif: ${this.families[this.currentFamily].name}`, 'info');
          }
        }
      });
    });

    // Toggle flyout on button click
    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = wrapper.classList.toggle('open');
      triggerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (wrapper.classList.contains('open') && !wrapper.contains(e.target)) {
        wrapper.classList.remove('open');
        triggerBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && wrapper.classList.contains('open')) {
        wrapper.classList.remove('open');
        triggerBtn.setAttribute('aria-expanded', 'false');
      }
    });
  },

  renderFlyoutItems(container) {
    if (!container) return;
    const checkIcon = window.UlakIcons ? window.UlakIcons.getIcon('check', 'icon-mono-xs') : '✓';

    container.innerHTML = Object.entries(this.families).map(([famKey, fam]) => {
      const isActive = this.currentFamily === famKey;
      const variant = fam[this.currentMode] || fam.dark;
      const swatches = (variant.preview || []).map(c => `<span class="theme-swatch" style="background: ${c};"></span>`).join('');
      return `
        <div class="theme-flyout-item ${isActive ? 'active' : ''}" data-family="${famKey}" role="menuitem">
          <div class="theme-flyout-item-preview">${swatches}</div>
          <div class="theme-flyout-item-info">
            <div class="theme-flyout-item-name">${fam.name}</div>
            <div class="theme-flyout-item-desc">${variant.subtitle}</div>
          </div>
          <div class="theme-flyout-item-check">${checkIcon}</div>
        </div>
      `;
    }).join('');

    // Attach click handlers
    container.querySelectorAll('.theme-flyout-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const famKey = item.getAttribute('data-family');
        if (famKey && this.families[famKey]) {
          this.setFamily(famKey);
          const wrapper = document.getElementById('sidebar-theme-wrapper');
          if (wrapper) wrapper.classList.remove('open');
          const triggerBtn = document.getElementById('btn-theme-flyout');
          if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'false');
          if (window.UlakUI && window.UlakUI.toast) {
            const vName = this.families[famKey][this.currentMode].name;
            window.UlakUI.toast(`Tema uygulandı: ${vName}`, 'success');
          }
        }
      });
    });
  },

  applyTheme(family, mode) {
    if (!this.families[family]) family = 'nord';
    if (mode !== 'light' && mode !== 'dark') mode = 'dark';

    this.currentFamily = family;
    this.currentMode = mode;

    const variant = this.families[family][mode];
    this.currentTheme = variant.id;

    document.documentElement.setAttribute('data-theme', variant.id);
    document.documentElement.setAttribute('data-mode', mode);

    localStorage.setItem('ulak-theme-family', family);
    localStorage.setItem('ulak-theme-mode', mode);
    localStorage.setItem('ulak-theme', variant.id);

    // Update top header button
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) {
      btn.innerHTML = mode === 'light' 
        ? (window.UlakIcons ? window.UlakIcons.getIcon('moon', 'icon-mono-sm') : '')
        : (window.UlakIcons ? window.UlakIcons.getIcon('sun', 'icon-mono-sm') : '');
      btn.title = `${mode === 'light' ? 'Koyu Moda Geç' : 'Açık Moda Geç'} (Şu anki: ${variant.name})`;
    }

    // Update sidebar theme badge
    const badge = document.getElementById('sidebar-theme-badge');
    if (badge) {
      badge.textContent = `${this.families[family].name.split(' ')[0]} • ${mode === 'dark' ? 'Koyu' : 'Açık'}`;
    }

    // Update flyout mode buttons
    document.querySelectorAll('.theme-mode-btn').forEach(b => {
      const bMode = b.getAttribute('data-mode');
      b.classList.toggle('active', bMode === mode);
    });

    // Re-render flyout list items to reflect current mode swatches & active family
    const flyoutList = document.getElementById('theme-flyout-list');
    if (flyoutList) {
      this.renderFlyoutItems(flyoutList);
    }

    // Update logos
    const headerLogo = document.getElementById('header-brand-logo');
    const heroLogo = document.getElementById('home-hero-logo');
    const introLogo = document.getElementById('intro-logo');
    const logoSrc = mode === 'light' ? '../assets/ulak_logo_dark.png' : '../assets/ulak_logo.png';

    if (headerLogo) headerLogo.src = logoSrc;
    if (heroLogo) heroLogo.src = logoSrc;
    if (introLogo) introLogo.src = logoSrc;

    // Dispatch global event for other components/views
    window.dispatchEvent(new CustomEvent('ulak-theme-changed', {
      detail: {
        family,
        mode,
        themeId: variant.id,
        themeInfo: variant
      }
    }));

    // Broadcast theme to Pet Window
    if (window.ulak && typeof window.ulak.invoke === 'function') {
      setTimeout(() => {
        try {
          const cs = getComputedStyle(document.documentElement);
          window.ulak.invoke('settings:theme-changed', {
            accent: cs.getPropertyValue('--accent').trim(),
            accentSoft: cs.getPropertyValue('--accent-soft').trim(),
            accentGlow: cs.getPropertyValue('--accent-glow').trim(),
            glassSurface: cs.getPropertyValue('--glass-surface').trim(),
            glassBorder: cs.getPropertyValue('--glass-border').trim(),
            text1: cs.getPropertyValue('--text-1').trim(),
            text2: cs.getPropertyValue('--text-2').trim()
          });
        } catch (e) {}
      }, 60);
    }
  },

  apply(themeOrFamily) {
    if (themeOrFamily in this.families) {
      this.applyTheme(themeOrFamily, this.currentMode);
    } else if (themeOrFamily.includes('-light') || themeOrFamily === 'light') {
      const fam = themeOrFamily.replace('-light', '');
      this.applyTheme(fam in this.families ? fam : this.currentFamily, 'light');
    } else if (themeOrFamily.includes('-dark') || themeOrFamily === 'dark') {
      const fam = themeOrFamily.replace('-dark', '');
      this.applyTheme(fam in this.families ? fam : this.currentFamily, 'dark');
    } else {
      this.applyTheme(themeOrFamily in this.families ? themeOrFamily : 'nord', this.currentMode);
    }
  },

  setMode(mode) {
    this.applyTheme(this.currentFamily, mode);
  },

  setFamily(family) {
    this.applyTheme(family, this.currentMode);
  },

  toggle() {
    this.setMode(this.currentMode === 'dark' ? 'light' : 'dark');
  }
};

window.UlakTheme = Theme;
window.ULAK_THEMES = Theme.families;