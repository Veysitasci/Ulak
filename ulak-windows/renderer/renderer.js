// ULAK WINDOWS RENDERER ENTRY POINT
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Theme & Liquid pointer tracking
  window.UlakTheme.init();

  // 2. Setup Window Controls
  setupWindowControls();

  // 3. Setup Navigation & Sidebar
  setupNavigation();
  updateSidebarModules();

  window.addEventListener('ulak-modules-updated', () => {
    updateSidebarModules();
  });

  // 4. Navigate to Home View immediately so view is mounted behind splash
  window.UlakRouter.navigate('home');

  // 5. Run Intro Splash Overlay (Session aware)
  await runIntroSplash();

  // 6. Global Telemetry ticker for footer
  updateFooterTelemetry();
  const footerPollRate = parseInt(localStorage.getItem('ulak-telemetry-rate') || '3000', 10);
  setInterval(updateFooterTelemetry, footerPollRate);
});

function setupWindowControls() {
  const btnMin = document.getElementById('btn-minimize');
  const btnMax = document.getElementById('btn-maximize');
  const btnClose = document.getElementById('btn-close');
  const btnTheme = document.getElementById('btn-theme-toggle');
  const btnSidebar = document.getElementById('btn-sidebar-toggle');
  const sidebar = document.getElementById('sidebar-box');

  if (btnMin) btnMin.addEventListener('click', () => window.ulak.invoke('window:minimize'));
  if (btnMax) {
    btnMax.addEventListener('click', async () => {
      const isMax = await window.ulak.invoke('window:maximize');
      btnMax.innerHTML = isMax 
        ? window.UlakIcons.getIcon('restore', 'icon-mono-sm')
        : window.UlakIcons.getIcon('maximize', 'icon-mono-sm');
    });
  }
  if (btnClose) btnClose.addEventListener('click', () => window.ulak.invoke('window:close'));
  if (btnTheme) btnTheme.addEventListener('click', () => window.UlakTheme.toggle());

  if (btnSidebar && sidebar) {
    btnSidebar.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // Listen for maximize change events from main process
  window.ulak.on('window:maximized-change', (isMax) => {
    if (btnMax) {
      btnMax.innerHTML = isMax 
        ? window.UlakIcons.getIcon('restore', 'icon-mono-sm')
        : window.UlakIcons.getIcon('maximize', 'icon-mono-sm');
    }
  });
}

function setupNavigation() {
  // Sidebar clicks
  document.querySelectorAll('.sidebar-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pageId = btn.getAttribute('data-page');
      window.UlakRouter.navigate(pageId);
    });
  });

  // Header quick tabs
  document.querySelectorAll('.segmented-btn[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const navTarget = btn.getAttribute('data-nav');
      window.UlakRouter.navigate(navTarget);
    });
  });

  // Global search input
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.sidebar-btn').forEach((b) => {
        if (!query) {
          b.style.display = 'flex';
        } else {
          const match = b.innerText.toLowerCase().includes(query);
          b.style.display = match ? 'flex' : 'none';
        }
      });
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const visible = Array.from(document.querySelectorAll('.sidebar-btn')).filter(b => b.style.display !== 'none');
        if (visible.length > 0) {
          window.UlakRouter.navigate(visible[0].getAttribute('data-page'));
          searchInput.blur();
        }
      }
    });

    // Ctrl+K Shortcut to focus search
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });
  }
}

function updateSidebarModules() {
  const modMap = {
    'sys_cleaner': 'nav-btn-cleaner',
    'youtube': 'nav-btn-youtube',
    'net_monitor': 'nav-btn-net_monitor',
    'backup_tool': 'nav-btn-backup',
    'pkg_installer': 'nav-btn-pkg_installer'
  };

  const defaultAllModules = ['youtube', 'sys_cleaner', 'net_monitor', 'backup_tool', 'pkg_installer'];
  if (localStorage.getItem('ulak-modules') === null) {
    localStorage.setItem('ulak-modules', JSON.stringify(defaultAllModules));
  }
  const installed = JSON.parse(localStorage.getItem('ulak-modules') || '[]');

  let anyAddonInstalled = false;
  for (const [id, btnId] of Object.entries(modMap)) {
    const el = document.getElementById(btnId);
    if (el) {
      const isVisible = installed.includes(id);
      el.style.display = isVisible ? 'flex' : 'none';
      if (isVisible) anyAddonInstalled = true;
    }
  }

  const modTitle = document.getElementById('sidebar-mod-section-title');
  if (modTitle) {
    modTitle.style.display = anyAddonInstalled ? 'block' : 'none';
  }

  const toolsTitle = document.getElementById('sidebar-tools-section-title');
  if (toolsTitle) {
    toolsTitle.style.display = installed.includes('pkg_installer') ? 'block' : 'none';
  }
}

async function runIntroSplash() {
  const overlay = document.getElementById('intro-overlay');
  const bar = document.getElementById('intro-progress-bar');
  const step1 = document.getElementById('intro-step-1');
  const step2 = document.getElementById('intro-step-2');
  const step3 = document.getElementById('intro-step-3');

  if (!overlay) return;

  if (sessionStorage.getItem('ulak-intro-done') === '1') {
    overlay.style.display = 'none';
    return;
  }

  // Step 1: Donanım ve Bellek
  if (step1) step1.classList.add('active');
  if (bar) bar.style.width = '35%';
  await new Promise(r => setTimeout(r, 250));

  // Step 2: Güvenlik Duvarı & Ağ
  if (step1) step1.classList.remove('active');
  if (step2) step2.classList.add('active');
  if (bar) bar.style.width = '70%';
  await new Promise(r => setTimeout(r, 250));

  // Step 3: Modül Motoru
  if (step2) step2.classList.remove('active');
  if (step3) step3.classList.add('active');
  if (bar) bar.style.width = '100%';
  await new Promise(r => setTimeout(r, 250));

  overlay.style.opacity = '0';
  sessionStorage.setItem('ulak-intro-done', '1');
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 300);
}

async function updateFooterTelemetry() {
  try {
    const [cpu, mem, fw] = await Promise.all([
      window.ulak.invoke('system:get-cpu-info').catch(() => ({ usage: 0 })),
      window.ulak.invoke('system:get-memory-info').catch(() => ({ usagePercent: 0 })),
      window.ulak.invoke('firewall:get-status').catch(() => ({ enabled: true }))
    ]);

    const footerCpu = document.getElementById('footer-cpu');
    const footerRam = document.getElementById('footer-ram');
    const footerFw = document.getElementById('footer-fw');

    if (footerCpu) footerCpu.textContent = `CPU: ${Math.round(cpu.usage || 0)}%`;
    if (footerRam) footerRam.textContent = `RAM: ${Math.round(mem.usagePercent || 0)}%`;
    if (footerFw) footerFw.textContent = `FW: ${fw.enabled !== false ? 'Aktif' : 'Kapalı'}`;
  } catch (err) {
    // Suppress background ticker error
  }
}
