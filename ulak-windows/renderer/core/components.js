// HTML GENERATORS ENSURING NO ELEMENT IS NAKED
const Components = {
  headerCard(title, subtitle, iconName) {
    return `
      <div class="view-header-card glass-card">
        <div class="view-header-left">
          <div class="view-header-icon-box">
            ${window.UlakIcons.getIcon(iconName)}
          </div>
          <div>
            <div class="view-title">${window.UlakUI.escapeHtml(title)}</div>
            <div class="view-subtitle">${window.UlakUI.escapeHtml(subtitle)}</div>
          </div>
        </div>
      </div>
    `;
  },

  section(title, contentHtml, rightActionHtml = '') {
    return `
      <div class="view-section glass-card">
        <div class="view-section-header">
          <div class="view-section-title">${title}</div>
          ${rightActionHtml}
        </div>
        <div class="view-section-content">
          ${contentHtml}
        </div>
      </div>
    `;
  },

  settingRow(iconName, title, subtitle, rightControlHtml) {
    return `
      <div class="setting-row glass-soft">
        <div class="setting-row-left">
          <div class="setting-row-icon">
            ${window.UlakIcons.getIcon(iconName)}
          </div>
          <div>
            <div class="setting-row-title">${window.UlakUI.escapeHtml(title)}</div>
            <div class="setting-row-subtitle">${window.UlakUI.escapeHtml(subtitle)}</div>
          </div>
        </div>
        <div class="setting-row-right">
          ${rightControlHtml}
        </div>
      </div>
    `;
  },

  listRow(iconName, title, meta, rightActionHtml) {
    return `
      <div class="list-row glass-soft">
        <div class="list-row-left">
          <div class="setting-row-icon" style="width: 26px; height: 26px;">
            ${window.UlakIcons.getIcon(iconName)}
          </div>
          <div>
            <div class="list-row-title">${window.UlakUI.escapeHtml(title)}</div>
            ${meta ? `<div class="list-row-meta">${window.UlakUI.escapeHtml(meta)}</div>` : ''}
          </div>
        </div>
        <div class="list-row-right">
          ${rightActionHtml}
        </div>
      </div>
    `;
  },

  statTile(label, value, sub, idPrefix = '') {
    return `
      <div class="stat-tile glass-card">
        <div class="stat-tile-label">${window.UlakUI.escapeHtml(label)}</div>
        <div class="stat-tile-value" id="${idPrefix}val">${window.UlakUI.escapeHtml(value)}</div>
        <div class="stat-tile-sub" id="${idPrefix}sub">${window.UlakUI.escapeHtml(sub)}</div>
      </div>
    `;
  },

  gaugeTile(label, value, sub, ringId, textId) {
    return `
      <div class="gauge-tile glass-card">
        <div>
          <div class="stat-tile-label">${window.UlakUI.escapeHtml(label)}</div>
          <div class="stat-tile-value" id="${textId}">${window.UlakUI.escapeHtml(value)}</div>
          <div class="stat-tile-sub">${window.UlakUI.escapeHtml(sub)}</div>
        </div>
        <div class="gauge-svg-box">
          <svg class="gauge-svg" viewBox="0 0 36 36">
            <path class="gauge-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            <path class="gauge-bar" id="${ringId}" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
          </svg>
          <span class="gauge-center-text" id="${ringId}-text">0%</span>
        </div>
      </div>
    `;
  },

  consoleCard(headerTitle, content, idPrefix = '') {
    return `
      <div class="console-card glass-card">
        <div class="console-card-header">
          <span>${window.UlakUI.escapeHtml(headerTitle)}</span>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-ghost" id="${idPrefix}copy-btn" title="Kopyala" aria-label="Günlüğü Kopyala">
              ${window.UlakIcons.getIcon('copy', 'icon-mono-sm')} Kopyala
            </button>
            <button class="btn btn-ghost" id="${idPrefix}clear-btn" title="Temizle" aria-label="Günlüğü Temizle">
              ${window.UlakIcons.getIcon('x', 'icon-mono-sm')} Temizle
            </button>
          </div>
        </div>
        <div class="console-card-body" id="${idPrefix}body">${window.UlakUI.escapeHtml(content || 'Hazır.')}</div>
      </div>
    `;
  },

  selectField(id, label, options, selectedValue = '', iconName = null, extraClass = '') {
    const optsHtml = options.map(opt => {
      const val = typeof opt === 'object' ? opt.value : opt;
      const text = typeof opt === 'object' ? opt.label : opt;
      const isSel = String(val) === String(selectedValue) ? 'selected' : '';
      return `<option value="${window.UlakUI.escapeHtml(val)}" ${isSel}>${window.UlakUI.escapeHtml(text)}</option>`;
    }).join('');

    const iconHtml = iconName 
      ? `<div class="select-icon">${window.UlakIcons.getIcon(iconName, 'icon-mono-xs')}</div>` 
      : '';

    const hasIconClass = iconName ? 'has-icon' : '';

    return `
      <div class="field ${extraClass}">
        ${label ? `<label class="field-label" for="${id}">${window.UlakUI.escapeHtml(label)}</label>` : ''}
        <div class="select-encased ${hasIconClass}">
          ${iconHtml}
          <select id="${id}" class="field-input select-custom">
            ${optsHtml}
          </select>
        </div>
      </div>
    `;
  }
};

// Global Otomatik Kopyalama & Temizleme Dinleyicisi
document.addEventListener('click', async (e) => {
  const copyBtn = e.target.closest('[id$="copy-btn"]');
  if (copyBtn) {
    const card = copyBtn.closest('.console-card');
    const body = card ? card.querySelector('.console-card-body') : null;
    const text = body ? (body.innerText || body.textContent || '').trim() : '';
    if (!text || text === 'Hazır.' || text === 'Bir bağlantı girip indirme başlatın.') {
      return window.UlakUI?.toast('Kopyalanacak günlük içeriği bulunmuyor.', 'warning');
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
      window.UlakUI?.toast('Günlük çıktısı panoya kopyalandı.', 'success');
    } catch (err) {
      window.UlakUI?.toast('Kopyalama işlemi başarısız oldu.', 'error');
    }
    return;
  }

  const clearBtn = e.target.closest('[id$="clear-btn"]');
  if (clearBtn) {
    const card = clearBtn.closest('.console-card');
    const body = card ? card.querySelector('.console-card-body') : null;
    if (body) {
      body.textContent = 'Günlük temizlendi. Yeni işlem bekleniyor...';
      window.UlakUI?.toast('Konsol çıktısı temizlendi.', 'info');
    }
  }
});

window.UlakComponents = Components;
