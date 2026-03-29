// core.js - минимальная рабочая версия

// API Functions
async function getCategory(category) {
  try {
    const response = await fetch(`/api/products/${category}`);
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    return [];
  }
}

async function addItem(category, item) {
  try {
    const response = await fetch(`/api/products/${category}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add');
    }
    return await response.json();
  } catch (error) {
    console.error('Add error:', error);
    throw error;
  }
}

async function deleteItem(category, id) {
  try {
    const response = await fetch(`/api/products/${category}/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete');
    }
    return await response.json();
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}

async function updateItem(category, id, data) {
  try {
    const response = await fetch(`/api/products/${category}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update');
    }
    return await response.json();
  } catch (error) {
    console.error('Update error:', error);
    throw error;
  }
}

async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append('photo', file);
  
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }
    const data = await response.json();
    return data.photoUrl;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Strength labels
const STRENGTH_LABELS = {
  1: 'Очень лёгкий', 2: 'Лёгкий', 3: 'Ниже среднего', 4: 'Средний',
  5: 'Выше среднего', 6: 'Крепкий', 7: 'Очень крепкий',
  8: 'Мощный', 9: 'Экстремальный', 10: 'Убийственный'
};

const STRENGTH_BADGE_CLASS = {
  1: 'badge-strength-1', 2: 'badge-strength-1',
  3: 'badge-strength-2', 4: 'badge-strength-2',
  5: 'badge-strength-3', 6: 'badge-strength-3',
  7: 'badge-strength-4', 8: 'badge-strength-4',
  9: 'badge-strength-5', 10: 'badge-strength-5'
};

// UI Functions
function initAccordions() {
  document.querySelectorAll('.acc-header').forEach(h => {
    h.addEventListener('click', () => {
      h.closest('.accordion').classList.toggle('open');
    });
  });
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const sec = document.getElementById(target);
      if (sec) sec.classList.add('active');
    });
  });
}

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
  (scope || document).querySelectorAll('[data-searchable]').forEach(el => {
    const text = el.textContent.toLowerCase();
    if (text.includes(val)) {
      el.classList.remove('search-hidden');
    } else {
      el.classList.add('search-hidden');
    }
  });
}

function clearSearch(scope) {
  (scope || document).querySelectorAll('.search-hidden').forEach(el => {
    el.classList.remove('search-hidden');
  });
}

function renderEmpty(container, icon, title, sub) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <div class="empty-title">${title}</div>
      <div class="empty-sub">${sub}</div>
    </div>
  `;
}

function renderProductCard(item, category, onDelete, onEdit) {
  const div = document.createElement('div');
  div.className = 'product-card';
  
  const strength = item.strength || 5;
  const badgeClass = STRENGTH_BADGE_CLASS[strength] || 'badge-strength-3';
  
  div.innerHTML = `
    <div class="card-actions">
      <button class="card-action-btn btn-edit">✏️</button>
      <button class="card-action-btn btn-delete">🗑</button>
    </div>
    <div class="card-img ${item.photo_url || item.photoUrl ? '' : 'no-img'}">
      ${(item.photo_url || item.photoUrl) ? `<img src="${item.photo_url || item.photoUrl}" alt="${item.name}">` : '📦'}
    </div>
    <div class="card-body">
      <div class="card-name">${item.name}</div>
      <div class="card-meta">
        <span class="badge ${badgeClass}">${STRENGTH_LABELS[strength]}</span>
        ${item.origin ? `<span class="badge badge-origin">🌍 ${item.origin}</span>` : ''}
      </div>
      <div class="strength-compact">
        <span>Крепость ${strength}/10</span>
        <div class="strength-dots">
          ${Array(10).fill().map((_, i) => `<span class="strength-dot ${i < strength ? 'active' : ''}"></span>`).join('')}
        </div>
      </div>
      ${item.description ? `<div class="card-desc">${item.description.substring(0, 80)}${item.description.length > 80 ? '...' : ''}</div>` : ''}
    </div>
  `;
  
  div.querySelector('.btn-delete').addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm(`Удалить "${item.name}"?`)) {
      try {
        await deleteItem(category, item.product_id || item.id);
        div.remove();
        if (onDelete) onDelete();
      } catch (error) {
        alert('Ошибка: ' + error.message);
      }
    }
  });
  
  div.querySelector('.btn-edit').addEventListener('click', (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(item);
  });
  
  return div;
}

class ProductModal {
  constructor({ category, title, onSave, editItem = null }) {
    this.category = category;
    this.titleText = title;
    this.onSave = onSave;
    this.editItem = editItem;
    this.photoUrl = editItem?.photo_url || editItem?.photoUrl || null;
    this._build();
  }
  
  _build() {
    const existing = document.getElementById('productModal');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'productModal';
    
    const strengthVal = this.editItem?.strength || 5;
    
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">${this.editItem ? '✏️ Редактировать' : '➕ ' + this.titleText}</span>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>📷 Фото</label>
            <input type="file" id="photoInput" accept="image/*">
            <div id="uploadProgress" style="display:none">Загрузка...</div>
            ${this.photoUrl ? `<img src="${this.photoUrl}" style="max-width:100%; margin-top:10px">` : ''}
          </div>
          <div class="field">
            <label>Название *</label>
            <input type="text" id="fieldName" value="${this.editItem?.name || ''}">
          </div>
          <div class="field">
            <label>Крепость (1-10): <span id="strengthVal">${strengthVal}</span></label>
            <input type="range" id="fieldStrength" min="1" max="10" value="${strengthVal}">
          </div>
          <div class="field">
            <label>Производитель</label>
            <input type="text" id="fieldOrigin" value="${this.editItem?.origin || ''}">
          </div>
          <div class="field">
            <label>Описание</label>
            <textarea id="fieldDesc">${this.editItem?.description || this.editItem?.desc || ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel">Отмена</button>
          <button class="btn-save">${this.editItem ? 'Сохранить' : 'Добавить'}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('open'), 10);
    
    // Strength slider
    const slider = overlay.querySelector('#fieldStrength');
    const strengthSpan = overlay.querySelector('#strengthVal');
    slider.addEventListener('input', () => {
      strengthSpan.textContent = slider.value;
    });
    
    // Photo upload
    const photoInput = overlay.querySelector('#photoInput');
    const progress = overlay.querySelector('#uploadProgress');
    photoInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      progress.style.display = 'block';
      try {
        this.photoUrl = await uploadPhoto(file);
      } catch (err) {
        alert('Ошибка: ' + err.message);
      } finally {
        progress.style.display = 'none';
      }
    });
    
    // Close
    const close = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 300);
    };
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('.btn-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    
    // Save
    overlay.querySelector('.btn-save').addEventListener('click', async () => {
      const name = overlay.querySelector('#fieldName').value.trim();
      if (!name) {
        alert('Введите название');
        return;
      }
      
      const item = {
        id: this.editItem?.product_id || this.editItem?.id || (Date.now() + Math.random()).toString(),
        name: name,
        strength: parseInt(overlay.querySelector('#fieldStrength').value),
        origin: overlay.querySelector('#fieldOrigin').value.trim(),
        desc: overlay.querySelector('#fieldDesc').value.trim(),
        photoUrl: this.photoUrl
      };
      
      try {
        await this.onSave(item);
        close();
      } catch (err) {
        alert('Ошибка: ' + err.message);
      }
    });
  }
}

// Make global
window.getCategory = getCategory;
window.addItem = addItem;
window.deleteItem = deleteItem;
window.updateItem = updateItem;
window.initAccordions = initAccordions;
window.initTabs = initTabs;
window.initSearch = initSearch;
window.renderProductCard = renderProductCard;
window.renderEmpty = renderEmpty;
window.ProductModal = ProductModal;
