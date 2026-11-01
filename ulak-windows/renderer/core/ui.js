// UI SERVICES: Toast, Modal, Confirm, Prompt, State
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const UI = {
  escapeHtml,

  _sanitizeToastMessage(msg) {
    if (!msg) return '';
    let text = String(msg);
    // PowerShell / Shell hata stack trace temizleme
    if (text.includes('kullanıldığından') || text.includes('IOException') || text.includes('used by another process')) {
      return 'Dosya şu an başka bir işlem tarafından kullanılıyor. Lütfen açık indirmeleri kapatıp tekrar deneyin.';
    }
    if (text.includes('Command failed:') || text.includes('powershell') || text.includes('Invoke-WebRequest')) {
      return 'İndirme işlemi sırasında bir dosya erişim hatası oluştu. Lütfen tekrar deneyin.';
    }
    if (text.length > 200) {
      return text.substring(0, 197) + '...';
    }
    return text;
  },

  toast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const cleanMsg = this._sanitizeToastMessage(message);
    const toast = document.createElement('div');
    toast.className = `toast glass-dense ${type}`;
    
    let iconName = 'zap';
    let title = 'Bilgi';
    if (type === 'success') { iconName = 'check'; title = 'Başarılı'; }
    if (type === 'error') { iconName = 'x'; title = 'Hata'; }
    if (type === 'warning') { iconName = 'zap'; title = 'Uyarı'; }

    toast.innerHTML = `
      <div class="toast-icon">
        ${window.UlakIcons.getIcon(iconName, 'icon-mono-sm')}
      </div>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${escapeHtml(cleanMsg)}</div>
      </div>
      <button class="toast-close-btn" title="Kapat" aria-label="Kapat">✕</button>
    `;

    const closeBtn = toast.querySelector('.toast-close-btn');
    const dismiss = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px) scale(0.96)';
      toast.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
      setTimeout(() => toast.remove(), 200);
    };

    closeBtn?.addEventListener('click', dismiss);
    container.appendChild(toast);

    setTimeout(dismiss, duration);
  },

  modal(title, bodyHtml, footerHtml = '') {
    const overlay = document.getElementById('modal-container');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const footerEl = document.getElementById('modal-footer');

    if (titleEl) titleEl.innerHTML = title;
    if (bodyEl) bodyEl.innerHTML = bodyHtml;
    if (footerEl) footerEl.innerHTML = footerHtml;

    if (overlay) overlay.style.display = 'flex';
  },

  closeModal() {
    const overlay = document.getElementById('modal-container');
    if (overlay) overlay.style.display = 'none';
  },

  confirm(title, message, confirmText = 'Onayla', cancelText = 'İptal') {
    return new Promise((resolve) => {
      const body = `
        <div class="state-card glass-soft" style="padding: 24px;">
          <div class="state-card-desc" style="font-size: 13px; color: var(--text-1); max-width: 100%;">
            ${escapeHtml(message)}
          </div>
        </div>
      `;
      const footer = `
        <button class="btn btn-secondary" id="modal-cancel-btn">${escapeHtml(cancelText)}</button>
        <button class="btn btn-danger" id="modal-confirm-btn">${escapeHtml(confirmText)}</button>
      `;

      UI.modal(title, body, footer);

      document.getElementById('modal-cancel-btn')?.addEventListener('click', () => {
        UI.closeModal();
        resolve(false);
      });
      document.getElementById('modal-confirm-btn')?.addEventListener('click', () => {
        UI.closeModal();
        resolve(true);
      });
    });
  },

  prompt(title, message, placeholder = '', defaultValue = '', inputType = 'text') {
    return new Promise((resolve) => {
      const body = `
        <div class="field" style="margin-bottom: 8px;">
          <label class="field-label">${escapeHtml(message)}</label>
          <input type="${inputType}" id="modal-prompt-input" class="field-input" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(defaultValue)}">
        </div>
      `;
      const footer = `
        <button class="btn btn-secondary" id="modal-cancel-btn">İptal</button>
        <button class="btn btn-primary" id="modal-confirm-btn">Tamam</button>
      `;

      UI.modal(title, body, footer);

      const input = document.getElementById('modal-prompt-input');
      setTimeout(() => input?.focus(), 50);

      document.getElementById('modal-cancel-btn')?.addEventListener('click', () => {
        UI.closeModal();
        resolve(null);
      });
      document.getElementById('modal-confirm-btn')?.addEventListener('click', () => {
        const val = input ? input.value : null;
        UI.closeModal();
        resolve(val);
      });
    });
  },

  state(containerEl, type = 'loading', options = {}) {
    if (!containerEl) return;
    const { title, desc, actionText, actionFn } = options;

    let icon = 'zap';
    let defaultTitle = 'Veri bulunamadı';
    let defaultDesc = 'Bu kategoride görüntülenecek herhangi bir kayıt mevcut değil.';

    if (type === 'loading') {
      icon = 'refresh';
      defaultTitle = 'Yükleniyor...';
      defaultDesc = 'Veriler sistemden güvenle alınıyor, lütfen bekleyin.';
    } else if (type === 'error') {
      icon = 'x';
      defaultTitle = 'Bir hata oluştu';
      defaultDesc = 'İşlem yürütülürken beklenmeyen bir sorun ile karşılaşıldı.';
    }

    containerEl.innerHTML = `
      <div class="state-card glass-soft">
        <div class="state-card-icon">
          ${window.UlakIcons.getIcon(icon, type === 'loading' ? 'spin-icon' : '')}
        </div>
        <div class="state-card-title">${escapeHtml(title || defaultTitle)}</div>
        <div class="state-card-desc">${escapeHtml(desc || defaultDesc)}</div>
        ${actionText ? `<button class="btn btn-secondary state-action-btn" style="margin-top: 8px;">${escapeHtml(actionText)}</button>` : ''}
      </div>
    `;

    if (actionText && actionFn) {
      containerEl.querySelector('.state-action-btn')?.addEventListener('click', actionFn);
    }
  }
};

window.UlakUI = UI;
