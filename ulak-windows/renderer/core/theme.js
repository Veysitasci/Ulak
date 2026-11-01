// THEME & LIQUID POINTER GLOW SYSTEM
const Theme = {
  currentTheme: 'dark',

  init() {
    this.currentTheme = localStorage.getItem('ulak-theme') || 'dark';
    this.apply(this.currentTheme);

    // Setup interactive liquid glow tracking
    window.addEventListener('pointermove', (e) => {
      document.querySelectorAll('.liquid-glow').forEach((el) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        el.style.setProperty('--mouse-x', `${x}px`);
        el.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  },

  apply(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ulak-theme', theme);

    const btn = document.getElementById('btn-theme-toggle');
    if (btn) {
      btn.innerHTML = theme === 'dark' 
        ? window.UlakIcons.getIcon('moon', 'icon-mono-sm')
        : window.UlakIcons.getIcon('sun', 'icon-mono-sm');
    }

    const headerLogo = document.getElementById('header-brand-logo');
    const heroLogo = document.getElementById('home-hero-logo');
    const introLogo = document.getElementById('intro-logo');
    const logoSrc = theme === 'dark' ? '../assets/ulak_logo.png' : '../assets/ulak_logo_dark.png';

    if (headerLogo) headerLogo.src = logoSrc;
    if (heroLogo) heroLogo.src = logoSrc;
    if (introLogo) introLogo.src = logoSrc;
  },

  toggle() {
    this.apply(this.currentTheme === 'dark' ? 'light' : 'dark');
  }
};

window.UlakTheme = Theme;
