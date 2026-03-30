// ════════════════════════════════════════════════
//  app.js — shared frontend module
// ════════════════════════════════════════════════

// ── Global state ─────────────────────────────────
window.APP = {
  role: null,
  ROLE_LEVEL: { staff: 1, rop: 2, root: 3 }
};

// ── API helper ────────────────────────────────────
const api = {
  async req(method, url, body, isForm = false) {
    const opts = { method, headers: {} };
    if (body) {
      if (isForm) {
        opts.body = body; // FormData
      } else {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }
    const r = await fetch(url, opts);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  },
  get: (url) => api.req('GET', url),
  post: (url, body) => api.req('POST', url, body),
  postForm: (url, fd) => api.req('POST', url, fd, true),
  put: (url, body) => api.req('PUT', url, body),
  putForm: (url, fd) => api.req('PUT', url, fd, true),
  del: (url) => api.req('DELETE', url)
};

// ── Toast ─────────────────────────────────────────
function toast(msg, type = 'info') {
  let container = document.getElementById('toast');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  el.className = `toast-item ${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 350);
  }, 3000);
}

// ── Confirm dialog ────────────────────────────────
function confirmDialog(msg) {
  return new Promise(resolve => {
    // Simple native confirm for now; could be custom
    resolve(confirm(msg));
  });
}

// ── Auth / role helpers ───────────────────────────
function canEdit() {
  return APP.ROLE_LEVEL[APP.role] >= APP.ROLE_LEVEL['rop'];
}
function isRoot() { return APP.role === 'root'; }

async function loadMe() {
  try {
    const me = await api.get('/api/me');
    APP.role = me.role;
    // Update role badge
    const badge = document.getElementById('roleBadge');
    if (badge) {
      badge.textContent = me.role.toUpperCase();
      badge.className = `role-badge ${me.role}`;
    }
    // Show/hide editor controls
    if (canEdit()) {
      document.querySelectorAll('.editor-only').forEach(el => el.style.display = '');
    }
    if (isRoot()) {
      document.querySelectorAll('.root-only').forEach(el => el.style.display = '');
    }
  } catch {
    window.location.href = '/login';
  }
}

// ── Tab switching ─────────────────────────────────
function initTabs() {
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.tab;
      document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const sec = document.getElementById(id);
      if (sec) sec.classList.add('active');
    });
  });
}

// ── Accordion ────────────────────────────────────
function initAccordions(root = document) {
  root.querySelectorAll('.acc-head').forEach(h => {
    if (h._accInited) return;
    h._accInited = true;
    h.addEventListener('click', () => h.closest('.accordion').classList.toggle('open'));
  });
}

// ── Logout ───────────────────────────────────────
async function logout() {
  await api.post('/logout');
  window.location.href = '/login';
}

// ── Strength helpers ──────────────────────────────
const STRENGTH_LABELS = {
  1:'Очень лёгкий',2:'Лёгкий',3:'Ниже среднего',4:'Средний',
  5:'Выше среднего',6:'Крепкий',7:'Очень крепкий',8:'Мощный',
  9:'Экстремальный',10:'Убийственный'
};
const TIER_LABELS = { premium: 'Премиум', mid: 'Средний класс', budget: 'Эконом' };
const TIER_BADGE  = { premium: 'badge-premium', mid: 'badge-mid', budget: 'badge-budget' };

function strengthColor(v) {
  if (v <= 3) return 'var(--accent3)';
  if (v <= 6) return 'var(--accent4)';
  return 'var(--accent2)';
}

function renderPips(strength) {
  return Array.from({ length: 10 }, (_, i) => {
    const on = i < strength;
    const hi = strength >= 7;
    return `<div class="pip${on ? ' on' : ''}${on && hi ? ' hi' : ''}"></div>`;
  }).join('');
}

// ── Product card renderer ─────────────────────────
function buildProductCard(item, onEdit, onDelete) {
  const div = document.createElement('div');
  div.className = 'product-card';
  div.dataset.id = item.id;

  const s = item.strength || 0;
  const tierBadge = item.tier ? `<span class="badge ${TIER_BADGE[item.tier] || ''}">${TIER_LABELS[item.tier] || item.tier}</span>` : '';
  const sBadge = s ? `<span class="badge badge-s${s}">${STRENGTH_LABELS[s] || s}</span>` : '';

  div.innerHTML = `
    ${canEdit() ? `
    <div class="card-actions">
      <button class="icon-btn icon-btn-edit" title="Редактировать">✏️</button>
      <button class="icon-btn icon-btn-del" title="Удалить">🗑️</button>
    </div>` : ''}
    <div class="card-img${item.photo_url ? '' : ' no-img'}">
      ${item.photo_url ? `<img src="${item.photo_url}" alt="${item.name}" loading="lazy">` : '📦'}
    </div>
    <div class="card-body">
      <div class="card-name">${item.name}</div>
      <div class="card-meta">${sBadge}${tierBadge}</div>
      ${s ? `<div class="strength-row">
        <span class="strength-lbl">${s}/10</span>
        <div class="pips">${renderPips(s)}</div>
      </div>` : ''}
      ${item.origin ? `<div class="card-desc">🌍 ${item.origin}</div>` : ''}
      ${item.description ? `<div class="card-desc" style="margin-top:4px">${item.description}</div>` : ''}
    </div>`;

  if (canEdit()) {
    div.querySelector('.icon-btn-edit')?.addEventListener('click', e => { e.stopPropagation(); onEdit && onEdit(item); });
    div.querySelector('.icon-btn-del')?.addEventListener('click', async e => {
      e.stopPropagation();
      if (!await confirmDialog(`Удалить «${item.name}»?`)) return;
      try {
        await api.del(`/api/products/${item.id}`);
        div.style.cssText = 'opacity:0;transform:scale(.9);transition:all .2s';
        setTimeout(() => { div.remove(); onDelete && onDelete(); }, 220);
        toast('Позиция удалена', 'success');
      } catch (err) { toast(err.message, 'error'); }
    });
  }
  return div;
}

// ── Product modal ─────────────────────────────────
class ProductModal {
  constructor({ title, item = null, category, brandId = null, onSave }) {
    this.item = item;
    this.category = category;
    this.brandId = brandId;
    this.onSave = onSave;
    this.photoFile = null;
    this._build(title);
  }

  _build(title) {
    document.getElementById('productModal')?.remove();

    const s = this.item?.strength || 5;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'productModal';

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <span class="modal-title">${title}</span>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Фото товара</label>
            <div class="photo-drop" id="pDrop">
              <input type="file" id="pFile" accept="image/*">
              <div class="photo-drop-icon">📷</div>
              <p>Нажмите или перетащите<br><strong>JPG, PNG, WEBP до 10 МБ</strong></p>
            </div>
            <img class="photo-preview" id="pPreview"
              ${this.item?.photo_url ? `src="${this.item.photo_url}" style="display:block"` : ''}>
          </div>
          <div class="field">
            <label>Название *</label>
            <input id="pName" type="text" placeholder="Например: Siberia White Dry"
              value="${this.item?.name || ''}">
          </div>
          <div class="field">
            <label>Описание</label>
            <textarea id="pDesc">${this.item?.description || ''}</textarea>
          </div>
          <div class="field">
            <label>Крепость</label>
            <div class="strength-wrap">
              <div class="strength-top">
                <span class="strength-num" id="sNum" style="color:${strengthColor(s)}">${s}</span>
                <span class="strength-text" id="sText">${STRENGTH_LABELS[s]}</span>
              </div>
              <input type="range" id="pStrength" min="1" max="10" value="${s}">
            </div>
          </div>
          <div class="field">
            <label>Статус</label>
            <select id="pTier">
              <option value="">— не указан —</option>
              <option value="premium" ${this.item?.tier === 'premium' ? 'selected' : ''}>Премиум</option>
              <option value="mid"     ${this.item?.tier === 'mid'     ? 'selected' : ''}>Средний класс</option>
              <option value="budget"  ${this.item?.tier === 'budget'  ? 'selected' : ''}>Эконом</option>
            </select>
          </div>
          <div class="field">
            <label>Происхождение аромки / Производитель</label>
            <input id="pOrigin" type="text" placeholder="Россия, Швеция, Япония..."
              value="${this.item?.origin || ''}">
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-secondary" id="pCancel">Отмена</button>
          <button class="btn btn-primary" id="pSave">
            ${this.item ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    const close = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 260);
    };

    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('#pCancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    // Strength slider
    const slider = overlay.querySelector('#pStrength');
    const sNum = overlay.querySelector('#sNum');
    const sText = overlay.querySelector('#sText');
    slider.addEventListener('input', () => {
      const v = parseInt(slider.value);
      sNum.textContent = v;
      sNum.style.color = strengthColor(v);
      sText.textContent = STRENGTH_LABELS[v] || '';
    });

    // Photo
    const fileInput = overlay.querySelector('#pFile');
    const preview = overlay.querySelector('#pPreview');
    fileInput.addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      this.photoFile = f;
      const reader = new FileReader();
      reader.onload = ev => { preview.src = ev.target.result; preview.style.display = 'block'; };
      reader.readAsDataURL(f);
    });

    // Save
    overlay.querySelector('#pSave').addEventListener('click', async () => {
      const name = overlay.querySelector('#pName').value.trim();
      if (!name) {
        overlay.querySelector('#pName').classList.add('error');
        return;
      }

      const fd = new FormData();
      fd.append('name', name);
      fd.append('category', this.category);
      if (this.brandId) fd.append('brand_id', this.brandId);
      fd.append('description', overlay.querySelector('#pDesc').value.trim());
      fd.append('strength', overlay.querySelector('#pStrength').value);
      fd.append('tier', overlay.querySelector('#pTier').value);
      fd.append('origin', overlay.querySelector('#pOrigin').value.trim());
      if (this.photoFile) fd.append('photo', this.photoFile);

      const btn = overlay.querySelector('#pSave');
      btn.disabled = true;
      btn.textContent = 'Сохраняем...';

      try {
        let saved;
        if (this.item) {
          saved = await api.putForm(`/api/products/${this.item.id}`, fd);
        } else {
          saved = await api.postForm('/api/products', fd);
        }
        this.onSave && this.onSave(saved);
        close();
        toast(this.item ? 'Обновлено' : 'Добавлено', 'success');
      } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = this.item ? 'Сохранить' : 'Добавить';
      }
    });
  }
}

// ── Brand modal ───────────────────────────────────
class BrandModal {
  constructor({ brand = null, onSave }) {
    this.brand = brand;
    this.onSave = onSave;
    this.photoFile = null;
    this._build();
  }
  _build() {
    document.getElementById('brandModal')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'brandModal';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <span class="modal-title">${this.brand ? '✏️ Редактировать бренд' : '➕ Добавить бренд'}</span>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Логотип бренда</label>
            <div class="photo-drop" id="bDrop">
              <input type="file" id="bFile" accept="image/*">
              <div class="photo-drop-icon">🏷️</div>
              <p>Нажмите для загрузки логотипа</p>
            </div>
            <img class="photo-preview" id="bPreview"
              ${this.brand?.logo_url ? `src="${this.brand.logo_url}" style="display:block"` : ''}>
          </div>
          <div class="field">
            <label>Название бренда *</label>
            <input id="bName" type="text" placeholder="Например: Dark Side"
              value="${this.brand?.name || ''}">
          </div>
          <div class="field">
            <label>Описание</label>
            <textarea id="bDesc">${this.brand?.description || ''}</textarea>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-secondary" id="bCancel">Отмена</button>
          <button class="btn btn-primary" id="bSave">${this.brand ? 'Сохранить' : 'Добавить'}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    const close = () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 260); };
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('#bCancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('#bFile').addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      this.photoFile = f;
      const r = new FileReader(); r.onload = ev => { const p = overlay.querySelector('#bPreview'); p.src = ev.target.result; p.style.display = 'block'; }; r.readAsDataURL(f);
    });
    overlay.querySelector('#bSave').addEventListener('click', async () => {
      const name = overlay.querySelector('#bName').value.trim();
      if (!name) { overlay.querySelector('#bName').classList.add('error'); return; }
      const fd = new FormData();
      fd.append('name', name);
      fd.append('description', overlay.querySelector('#bDesc').value.trim());
      if (this.photoFile) fd.append('photo', this.photoFile);
      const btn = overlay.querySelector('#bSave');
      btn.disabled = true; btn.textContent = 'Сохраняем...';
      try {
        const saved = this.brand
          ? await api.putForm(`/api/brands/${this.brand.id}`, fd)
          : await api.postForm('/api/brands', fd);
        this.onSave && this.onSave(saved);
        close(); toast(this.brand ? 'Бренд обновлён' : 'Бренд добавлен', 'success');
      } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = this.brand ? 'Сохранить' : 'Добавить'; }
    });
  }
}

// ── Change password modal ─────────────────────────
function openChangePasswordModal() {
  document.getElementById('pwModal')?.remove();
  const canTargets = APP.role === 'root'
    ? [{ v: 'staff', l: 'Сотрудник' }, { v: 'rop', l: 'ROP' }, { v: 'root', l: 'ROOT' }]
    : [{ v: 'staff', l: 'Сотрудник' }];

  const opts = canTargets.map(t => `<option value="${t.v}">${t.l}</option>`).join('');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'pwModal';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <span class="modal-title">🔑 Смена пароля</span>
        <button class="modal-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Роль</label>
          <select id="pwRole">${opts}</select>
        </div>
        <div class="field">
          <label>Новый пароль *</label>
          <input id="pwNew" type="password" placeholder="Минимум 4 символа">
        </div>
        <div class="field">
          <label>Повторите пароль *</label>
          <input id="pwConfirm" type="password" placeholder="">
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-secondary" id="pwCancel">Отмена</button>
        <button class="btn btn-primary" id="pwSave">Сохранить</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  const close = () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 260); };
  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.querySelector('#pwCancel').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#pwSave').addEventListener('click', async () => {
    const targetRole = overlay.querySelector('#pwRole').value;
    const np = overlay.querySelector('#pwNew').value;
    const nc = overlay.querySelector('#pwConfirm').value;
    if (np.length < 4) { toast('Пароль слишком короткий', 'error'); return; }
    if (np !== nc) { toast('Пароли не совпадают', 'error'); return; }
    try {
      await api.post('/api/change-password', { targetRole, newPassword: np });
      toast('Пароль изменён', 'success');
      close();
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ── Content block editor ──────────────────────────
const CB_TYPES = [
  { type: 'text',      icon: '📝', label: 'Текст/Заметка' },
  { type: 'highlight', icon: '💡', label: 'Выделение' },
  { type: 'alert',     icon: '⚠️', label: 'Предупреждение' },
  { type: 'table',     icon: '📊', label: 'Таблица' },
  { type: 'list',      icon: '📋', label: 'Список' },
  { type: 'steps',     icon: '🔢', label: 'Шаги' },
];

function renderContentBlock(block, onUpdate, onDelete) {
  const wrap = document.createElement('div');
  wrap.className = 'content-block';
  wrap.dataset.id = block.id;

  const typeInfo = CB_TYPES.find(t => t.type === block.block_type) || CB_TYPES[0];
  wrap.innerHTML = `
    <div class="cb-head">
      ${canEdit() ? '<span class="cb-handle">⠿</span>' : ''}
      <span class="cb-type-badge">${typeInfo.icon} ${typeInfo.label}</span>
      <span class="cb-title-text">${block.title || ''}</span>
      ${canEdit() ? `<div class="cb-actions">
        <button class="icon-btn icon-btn-edit" title="Редактировать">✏️</button>
        <button class="icon-btn icon-btn-del" title="Удалить">🗑️</button>
      </div>` : ''}
    </div>
    <div class="cb-body">${renderBlockContent(block)}</div>`;

  if (canEdit()) {
    wrap.querySelector('.icon-btn-edit')?.addEventListener('click', () => openBlockEditor(block, onUpdate));
    wrap.querySelector('.icon-btn-del')?.addEventListener('click', async () => {
      if (!await confirmDialog('Удалить блок?')) return;
      await api.del(`/api/content/${block.id}`);
      wrap.remove();
      onDelete && onDelete();
      toast('Блок удалён', 'success');
    });
  }
  return wrap;
}

function renderBlockContent(block) {
  const c = block.content || {};
  switch (block.block_type) {
    case 'text':
      return `<p style="font-size:13px;line-height:1.7;color:var(--text)">${(c.text || '').replace(/\n/g, '<br>')}</p>`;
    case 'highlight':
      return `<div class="hl ${c.variant || ''}">${c.text || ''}</div>`;
    case 'alert':
      return `<div class="alert alert-${c.variant || 'info'}"><span>${c.icon || 'ℹ'}</span><span>${c.text || ''}</span></div>`;
    case 'table': {
      const cols = c.columns || [];
      const rows = c.rows || [];
      return `<table class="ref-table"><thead><tr>${cols.map(col => `<th>${col}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    case 'list':
      return `<ul style="list-style:none;padding:0">${(c.items || []).map(i => `<li style="font-size:12.5px;padding:5px 0;border-bottom:1px solid var(--border);color:var(--text)">${i}</li>`).join('')}</ul>`;
    case 'steps':
      return `<div class="steps">${(c.steps || []).map((s, i) => `<div class="step"><div class="step-num">${i+1}</div><div class="step-body"><strong>${s.title || ''}</strong><span>${s.desc || ''}</span></div></div>`).join('')}</div>`;
    default:
      return `<pre style="font-size:11px;color:var(--muted)">${JSON.stringify(c, null, 2)}</pre>`;
  }
}

function openBlockEditor(block = null, onSave) {
  document.getElementById('cbModal')?.remove();
  const type = block?.block_type || 'text';
  const c = block?.content || {};

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'cbModal';

  overlay.innerHTML = `
    <div class="modal" style="max-width:600px">
      <div class="modal-head">
        <span class="modal-title">${block ? '✏️ Редактировать блок' : '➕ Новый блок'}</span>
        <button class="modal-close">✕</button>
      </div>
      <div class="modal-body">
        ${!block ? `<div class="field"><label>Тип блока</label><select id="cbType">${CB_TYPES.map(t => `<option value="${t.type}">${t.icon} ${t.label}</option>`).join('')}</select></div>` : ''}
        <div class="field"><label>Заголовок (необязательно)</label><input id="cbTitle" type="text" value="${block?.title || ''}"></div>
        <div id="cbFields"></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-secondary" id="cbCancel">Отмена</button>
        <button class="btn btn-primary" id="cbSave">${block ? 'Сохранить' : 'Добавить'}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  const close = () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 260); };
  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.querySelector('#cbCancel').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  const renderFields = (t) => {
    const container = overlay.querySelector('#cbFields');
    container.innerHTML = '';
    const fields = getBlockFields(t, block?.content || {});
    container.innerHTML = fields;
  };

  const typeSelect = overlay.querySelector('#cbType');
  if (typeSelect) {
    typeSelect.addEventListener('change', () => renderFields(typeSelect.value));
    renderFields(typeSelect.value);
  } else {
    renderFields(type);
  }

  overlay.querySelector('#cbSave').addEventListener('click', async () => {
    const curType = block?.block_type || overlay.querySelector('#cbType')?.value;
    const title = overlay.querySelector('#cbTitle').value.trim();
    const content = collectBlockContent(curType, overlay);
    const btn = overlay.querySelector('#cbSave');
    btn.disabled = true; btn.textContent = 'Сохраняем...';
    try {
      let saved;
      if (block) {
        saved = await api.put(`/api/content/${block.id}`, { title, content });
      } else {
        const page = document.body.dataset.page;
        const section = document.body.dataset.section || 'main';
        saved = await api.post('/api/content', { page, section, block_type: curType, title, content });
      }
      onSave && onSave(saved);
      close();
      toast(block ? 'Блок обновлён' : 'Блок добавлен', 'success');
    } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = block ? 'Сохранить' : 'Добавить'; }
  });
}

function getBlockFields(type, c = {}) {
  switch (type) {
    case 'text':
      return `<div class="field"><label>Текст</label><textarea id="f_text" style="min-height:120px">${c.text || ''}</textarea></div>`;
    case 'highlight':
      return `<div class="field"><label>Текст</label><textarea id="f_text">${c.text || ''}</textarea></div>
        <div class="field"><label>Стиль</label><select id="f_variant"><option value="">Обычный</option><option value="ok" ${c.variant==='ok'?'selected':''}>✅ Зелёный</option><option value="warn" ${c.variant==='warn'?'selected':''}>⚠️ Красный</option><option value="info" ${c.variant==='info'?'selected':''}>ℹ️ Синий</option></select></div>`;
    case 'alert':
      return `<div class="field"><label>Иконка</label><input id="f_icon" type="text" value="${c.icon || 'ℹ️'}" style="max-width:80px"></div>
        <div class="field"><label>Текст</label><textarea id="f_text">${c.text || ''}</textarea></div>
        <div class="field"><label>Вид</label><select id="f_variant"><option value="info" ${c.variant==='info'?'selected':''}>Инфо</option><option value="danger" ${c.variant==='danger'?'selected':''}>Опасность</option><option value="success" ${c.variant==='success'?'selected':''}>Успех</option></select></div>`;
    case 'table':
      return `<div class="field"><label>Колонки (через запятую)</label><input id="f_cols" type="text" value="${(c.columns||[]).join(',')}"></div>
        <div class="field"><label>Строки (каждая строка = одна запись, ячейки через |)</label><textarea id="f_rows">${(c.rows||[]).map(r=>r.join('|')).join('\n')}</textarea></div>`;
    case 'list':
      return `<div class="field"><label>Элементы (по одному на строку)</label><textarea id="f_items">${(c.items||[]).join('\n')}</textarea></div>`;
    case 'steps':
      return `<div class="field"><label>Шаги (каждая строка: Заголовок | Описание)</label><textarea id="f_steps" style="min-height:120px">${(c.steps||[]).map(s=>s.title+'|'+s.desc).join('\n')}</textarea></div>`;
    default: return '';
  }
}

function collectBlockContent(type, overlay) {
  const g = id => overlay.querySelector(`#f_${id}`)?.value?.trim() || '';
  switch (type) {
    case 'text': return { text: g('text') };
    case 'highlight': return { text: g('text'), variant: g('variant') };
    case 'alert': return { text: g('text'), icon: g('icon'), variant: g('variant') };
    case 'table': {
      const cols = g('cols').split(',').map(s=>s.trim()).filter(Boolean);
      const rows = g('rows').split('\n').filter(Boolean).map(r => r.split('|').map(s=>s.trim()));
      return { columns: cols, rows };
    }
    case 'list': return { items: g('items').split('\n').filter(Boolean) };
    case 'steps': return { steps: g('steps').split('\n').filter(Boolean).map(l => { const [title,...rest] = l.split('|'); return { title: title?.trim(), desc: rest.join('|').trim() }; }) };
    default: return {};
  }
}

// ── Load and render content blocks for a section ──
async function loadContentSection(containerId, page, section) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const blocks = await api.get(`/api/content?page=${page}&section=${section}`);
    container.innerHTML = '';
    blocks.forEach(b => {
      container.appendChild(renderContentBlock(b, updatedBlock => {
        const existing = container.querySelector(`[data-id="${updatedBlock.id}"] .cb-body`);
        if (existing) existing.innerHTML = renderBlockContent(updatedBlock);
        const titleEl = container.querySelector(`[data-id="${updatedBlock.id}"] .cb-title-text`);
        if (titleEl) titleEl.textContent = updatedBlock.title || '';
      }, null));
    });
    if (canEdit()) {
      const addWrap = document.createElement('div');
      addWrap.innerHTML = `<div class="add-block-menu">${CB_TYPES.map(t => `<button class="add-block-btn" data-type="${t.type}">${t.icon} ${t.label}</button>`).join('')}</div>`;
      addWrap.querySelectorAll('.add-block-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.body.dataset.page = page;
          document.body.dataset.section = section;
          // override type
          openBlockEditor(null, (saved) => loadContentSection(containerId, page, section));
        });
      });
      container.appendChild(addWrap);
    }
    initAccordions(container);
  } catch (err) {
    container.innerHTML = `<div class="loader"><span style="color:var(--accent2)">${err.message}</span></div>`;
  }
}

// ── Empty state ───────────────────────────────────
function showEmpty(container, icon, title, sub) {
  container.innerHTML = `
    <div class="empty">
      <div class="empty-icon">${icon}</div>
      <div class="empty-title">${title}</div>
      <div class="empty-sub">${sub}</div>
    </div>`;
}

// ── Init on every page ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadMe();
  initTabs();
  initAccordions();

  // Logout buttons
  document.querySelectorAll('[data-logout]').forEach(el => {
    el.addEventListener('click', logout);
  });
  // Change password buttons
  document.querySelectorAll('[data-change-pw]').forEach(el => {
    el.addEventListener('click', openChangePasswordModal);
  });
});
