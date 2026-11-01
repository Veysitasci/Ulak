// ROUTER: View lifecycle, mounting, intervals and search
const Router = {
  views: {},
  currentViewId: null,
  activeMount: null,

  register(viewObj) {
    this.views[viewObj.id] = viewObj;
  },

  async navigate(viewId) {
    if (!this.views[viewId]) return;

    // Unmount previous view
    if (this.activeMount && typeof this.activeMount.unmount === 'function') {
      try {
        this.activeMount.unmount();
      } catch (e) {
        console.error('Error unmounting view:', e);
      }
    }

    this.currentViewId = viewId;
    const viewObj = this.views[viewId];
    this.activeMount = viewObj;

    // Update sidebar buttons
    document.querySelectorAll('.sidebar-btn').forEach((btn) => {
      if (btn.getAttribute('data-page') === viewId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update quick tabs in header
    document.querySelectorAll('.segmented-btn[data-nav]').forEach((btn) => {
      if (btn.getAttribute('data-nav') === viewId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const root = document.getElementById('view-root');
    if (!root) return;

    // Render HTML inside container
    root.innerHTML = `<div class="page-view active" id="view-${viewId}">${viewObj.render()}</div>`;

    // Mount logic and listeners
    if (typeof viewObj.mount === 'function') {
      try {
        await viewObj.mount(root.firstElementChild);
      } catch (err) {
        console.error(`Mounting error in view ${viewId}:`, err);
      }
    }

    // Scroll to top
    root.scrollTop = 0;
  }
};

window.UlakRouter = Router;
