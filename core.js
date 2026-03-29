// core.js - обновленная версия для работы с API
const DB_KEY = 'spravochnik_products';
const API_URL = window.location.origin;

// API Functions
async function apiFetchProducts(category) {
  try {
    const response = await fetch(`${API_URL}/api/products/${category}`);
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    console.error('API fetch error:', error);
    return [];
  }
}

async function apiAddProduct(category, product) {
  try {
    const response = await fetch(`${API_URL}/api/products/${category}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!response.ok) throw new Error('Failed to add');
    return await response.json();
  } catch (error) {
    console.error('API add error:', error);
    throw error;
  }
}

async function apiUpdateProduct(category, id, product) {
  try {
    const response = await fetch(`${API_URL}/api/products/${category}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!response.ok) throw new Error('Failed to update');
    return await response.json();
  } catch (error) {
    console.error('API update error:', error);
    throw error;
  }
}

async function apiDeleteProduct(category, id) {
  try {
    const response = await fetch(`${API_URL}/api/products/${category}/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete');
    return await response.json();
  } catch (error) {
    console.error('API delete error:', error);
    throw error;
  }
}

// Storage functions (now using API)
async function getCategory(cat) {
  return await apiFetchProducts(cat);
}

async function saveCategory(cat, items) {
  // This function is no longer needed for API mode
  // Products are saved individually
}

async function addItem(cat, item) {
  const product = {
    id: item.id || (Date.now() + Math.random()).toString(),
    name: item.name,
    strength: item.strength,
    origin: item.origin || '',
    desc: item.desc || '',
    photo: item.photo || null
  };
  return await apiAddProduct(cat, product);
}

async function deleteItem(cat, id) {
  return await apiDeleteProduct(cat, id);
}

async function updateItem(cat, id, data) {
  const product = {
    name: data.name,
    strength: data.strength,
    origin: data.origin || '',
    desc: data.desc || '',
    photo: data.photo || null
  };
  return await apiUpdateProduct(cat, id, product);
}

// Load initial data for empty database
async function loadInitialData() {
  // Initial tobacco data
  const initialTobacco = [
    {
      id: 'init_tobacco_1',
      name: 'Siberia White Dry',
      strength: 9,
      origin: 'Швеция',
      desc: 'Очень крепкий, ментоловый удар. Требует аккуратного нагрева.'
    },
    {
      id: 'init_tobacco_2',
      name: 'Darkside',
      strength: 7,
      origin: 'Россия',
      desc: 'Линейка с насыщенными вкусами. Хорошо переносит нагрев.'
    },
    {
      id: 'init_tobacco_3',
      name: 'Element Air',
      strength: 3,
      origin: 'Россия',
      desc: 'Лёгкий, воздушный табак на Virginia. Фруктовые линейки.'
    }
  ];

  // Initial liquids data
  const initialLiquids = [
    {
      id: 'init_liquid_1',
      name: 'Хром Розовая',
      strength: 20,
      origin: 'Россия',
      desc: 'Сладкая, ягодная. Солевая жидкость 20 мг.'
    },
    {
      id: 'init_liquid_2',
      name: 'Black Jack',
      strength: 50,
      origin: 'Россия',
      desc: 'Табачная нота на первом плане. Щелочная.'
    }
  ];

  // Initial snus data
  const initialSnus = [
    {
      id: 'init_snus_1',
      name: 'Siberia -80°C',
      strength: 43,
      origin: 'Швеция',
      desc: 'Очень крепкий. Белый, порционный.'
    },
    {
      id: 'init_snus_2',
      name: 'Husky Strong',
      strength: 20,
      origin: 'Швеция',
      desc: 'Средней крепости. Мятный.'
    }
  ];

  // Check if categories are empty and add initial data
  const tobaccoCount = await getCategory('tobacco');
  if (tobaccoCount.length === 0) {
    for (const item of initialTobacco) {
      await addItem('tobacco', item);
    }
  }

  const liquidsCount = await getCategory('liquids');
  if (liquidsCount.length === 0) {
    for (const item of initialLiquids) {
      await addItem('liquids', item);
    }
  }

  const snusCount = await getCategory('snus');
  if (snusCount.length === 0) {
    for (const item of initialSnus) {
      await addItem('snus', item);
    }
  }
}

// ── STRENGTH LABELS (unchanged) ──
const STRENGTH_LABELS = {
  1: 'Очень лёгкий',
  2: 'Лёгкий',
  3: 'Ниже среднего',
  4: 'Средний',
  5: 'Выше среднего',
  6: 'Крепкий',
  7: 'Очень крепкий',
  8: 'Мощный',
  9: 'Экстремальный',
  10: 'Убийственный'
};

const STRENGTH_BADGE_CLASS = {
  1: 'badge-strength-1', 2: 'badge-strength-1',
  3: 'badge-strength-2', 4: 'badge-strength-2',
  5: 'badge-strength-3', 6: 'badge-strength-3',
  7: 'badge-strength-4', 8: 'badge-strength-4',
  9: 'badge-strength-5', 10: 'badge-strength-5'
};

// ── ACCORDION (unchanged) ──
function initAccordions() {
  document.querySelectorAll('.acc-header').forEach(h => {
    h.addEventListener('click', () => {
      h.closest('.accordion').classList.toggle('open');
    });
  });
}

// ── TAB SWITCHING (unchanged) ──
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const sec = document.getElementById(target);
      if (sec) sec.classList.add('active');
      const si = document.getElementById('searchInput');
      if (si) { si.value = ''; clearSearch(); }
    });
  });
}

// ── SEARCH (unchanged) ──
function initSearch(scope) {
  const input = document.getElementById('searchInput');
  if (!input) return;
  input.addEventListener('input', () => {
    const val = input.value.trim().toLowerCase();
    if (!val) { clearSearch(scope); return; }
    doSearch(val, scope);
  });
}

function doSearch(val, scope) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  let anyResult = false;

  (scope || document).querySelectorAll('[data-searchable]').forEach(el => {
    const text = el.textContent.toLowerCase();
    if (text.includes(val)) {
      el.classList.remove('search-hidden');
      anyResult = true;
    } else {
      el.classList.add('search-hidden');
    }
  });

  document.querySelectorAll('.accordion').forEach(acc => {
    const hasMatch = acc.querySelector('[data-searchable]:not(.search-hidden)');
    if (hasMatch) acc.classList.add('open');
  });
}

function clearSearch(scope) {
  (scope || document).querySelectorAll('.search-hidden').forEach(el => {
    el.classList.remove('search-hidden');
  });
  document.querySelectorAll('.accordion').forEach(acc => acc.classList.remove('open'));
}

// ── MODAL (unchanged) ──
class ProductModal {
  constructor({ category, title, onSave, editItem = null }) {
    this.category = category;
    this.titleText = title;
    this.onSave = onSave;
    this.editItem = editItem;
    this.photoData = editItem?.photo || null;
    this._build();
  }

  _build() {
    document.getElementById('productModal')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'productModal';

    const strengthVal = this.editItem?.strength || 5;

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">${this.editItem ? '✏️ Редактировать' : '➕ ' + this.titleText}</span>
          <button class="modal-close" id="modalCloseBtn">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Фото товара</label>
            <div class="photo-upload" id="photoZone">
              <input type="file" id="photoInput" accept="image/*">
              <div class="photo-upload-icon">📷</div>
              <p>Нажмите или перетащите фото<br><strong>JPG, PNG, WEBP</strong></p>
            </div>
            <img class="photo-preview" id="photoPreview" ${this.photoData ? `src="${this.photoData}" style="display:block"` : ''}>
          </div>
          <div class="field">
            <label>Название *</label>
            <input type="text" id="fieldName" placeholder="Например: Siberia White Dry" value="${this.editItem?.name || ''}">
          </div>
          <div class="field">
            <label>Крепость</label>
            <div class="strength-slider-wrap">
              <div class="strength-display">
                <span class="strength-val" id="strengthValDisplay">${strengthVal}</span>
                <span class="strength-label-text" id="strengthLabelDisplay">${STRENGTH_LABELS[strengthVal]}</span>
              </div>
              <input type="range" id="fieldStrength" min="1" max="10" value="${strengthVal}">
            </div>
          </div>
          <div class="field">
            <label>Происхождение аромки / Производитель</label>
            <input type="text" id="fieldOrigin" placeholder="Например: Россия, Швеция, Япония..." value="${this.editItem?.origin || ''}">
          </div>
          <div class="field">
            <label>Описание</label>
            <textarea id="fieldDesc" placeholder="Особенности вкуса, формат, совет продавцу...">${this.editItem?.desc || ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" id="modalCancelBtn">Отмена</button>
          <button class="btn-save" id="modalSaveBtn">${this.editItem ? 'Сохранить' : 'Добавить'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    const slider = overlay.querySelector('#fieldStrength');
    const valDisp = overlay.querySelector('#strengthValDisplay');
    const labelDisp = overlay.querySelector('#strengthLabelDisplay');
    slider.addEventListener('input', () => {
      valDisp.textContent = slider.value;
      labelDisp.textContent = STRENGTH_LABELS[slider.value] || '';
      const v = parseInt(slider.value);
      valDisp.style.color = v <= 3 ? 'var(--accent3)' : v <= 5 ? 'var(--accent4)' : 'var(--accent2)';
    });

    const photoInput = overlay.querySelector('#photoInput');
    const photoPreview = overlay.querySelector('#photoPreview');
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.photoData = ev.target.result;
        photoPreview.src = this.photoData;
        photoPreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });

    const close = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 300);
    };
    overlay.querySelector('#modalCloseBtn').addEventListener('click', close);
    overlay.querySelector('#modalCancelBtn').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.querySelector('#modalSaveBtn').addEventListener('click', () => {
      const name = overlay.querySelector('#fieldName').value.trim();
      if (!name) {
        overlay.querySelector('#fieldName').style.borderColor = 'var(--accent2)';
        overlay.querySelector('#fieldName').focus();
        return;
      }
      const item = {
        id: this.editItem?.id || (Date.now() + Math.random()).toString(),
        name,
        strength: parseInt(overlay.querySelector('#fieldStrength').value),
        origin: overlay.querySelector('#fieldOrigin').value.trim(),
        desc: overlay.querySelector('#fieldDesc').value.trim(),
        photo: this.photoData
      };
      this.onSave(item);
      close();
    });
  }
}

// ── RENDER CARD (unchanged) ──
function renderProductCard(item, category, onDelete, onEdit) {
  const div = document.createElement('div');
  div.className = 'product-card';
  div.dataset.searchable = '';
  div.dataset.id = item.id;

  const strength = item.strength || 5;
  const badgeClass = STRENGTH_BADGE_CLASS[strength] || 'badge-strength-3';

  const pips = Array.from({length:10}, (_,i) => {
    const on = i < strength;
    const high = strength >= 7;
    return `<div class="pip ${on ? 'on' : ''} ${on && high ? 'high' : ''}"></div>`;
  }).join('');

  div.innerHTML = `
    <div class="card-actions">
      <button class="card-action-btn btn-edit" title="Редактировать">✏️</button>
      <button class="card-action-btn btn-delete" title="Удалить">🗑</button>
    </div>
    <div class="card-img ${item.photo ? '' : 'no-img'}">
      ${item.photo ? `<img src="${item.photo}" alt="${item.name}">` : '📦'}
    </div>
    <div class="card-body">
      <div class="card-name">${item.name}</div>
      <div class="card-meta">
        <span class="badge ${badgeClass}">${STRENGTH_LABELS[strength] || strength}</span>
        ${item.origin ? `<span class="badge badge-origin">🌍 ${item.origin}</span>` : ''}
      </div>
      <div class="strength-row">
        <span class="strength-label">Крепость ${strength}/10</span>
        <div class="strength-pips">${pips}</div>
      </div>
      ${item.desc ? `<div class="card-desc">${item.desc}</div>` : ''}
    </div>
  `;

  div.querySelector('.btn-delete').addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm(`Удалить "${item.name}"?`)) {
      await deleteItem(category, item.id);
      div.style.opacity = '0';
      div.style.transform = 'scale(0.9)';
      div.style.transition = 'all 0.2s';
      setTimeout(() => { div.remove(); onDelete && onDelete(); }, 200);
    }
  });

  div.querySelector('.btn-edit').addEventListener('click', (e) => {
    e.stopPropagation();
    onEdit && onEdit(item);
  });

  return div;
}

// ── RENDER EMPTY STATE (unchanged) ──
function renderEmpty(container, icon, title, sub) {
  container.innerHTML = `
    <div class="empty-state" data-empty>
      <div class="empty-icon">${icon}</div>
      <div class="empty-title">${title}</div>
      <div class="empty-sub">${sub}</div>
    </div>
  `;
}

// Load initial data on page load
if (typeof window !== 'undefined') {
  loadInitialData();
}