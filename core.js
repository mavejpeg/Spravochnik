// core.js - упрощенная версия с отладкой

async function apiFetchProducts(category) {
  try {
    const response = await fetch(`/api/products/${category}`);
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    console.error('API fetch error:', error);
    return [];
  }
}

async function apiAddProduct(category, product) {
  console.log('Adding product:', category, product);
  
  try {
    const response = await fetch(`/api/products/${category}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add');
    }
    
    const data = await response.json();
    console.log('Success:', data);
    return data;
  } catch (error) {
    console.error('API add error:', error);
    throw error;
  }
}

async function apiDeleteProduct(category, id) {
  console.log('Deleting:', category, id);
  
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
    console.error('API delete error:', error);
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

async function getCategory(cat) {
  return await apiFetchProducts(cat);
}

async function addItem(cat, item) {
  const product = {
    id: item.id || (Date.now() + Math.random()).toString(),
    name: item.name,
    strength: item.strength || 5,
    origin: item.origin || '',
    desc: item.desc || '',
    photoUrl: item.photoUrl || null
  };
  return await apiAddProduct(cat, product);
}

async function deleteItem(cat, id) {
  return await apiDeleteProduct(cat, id);
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
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

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
  div.dataset.id = item.id;

  const strength = item.strength || 5;
  const badgeClass = STRENGTH_BADGE_CLASS[strength] || 'badge-strength-3';

  div.innerHTML = `
    <div class="card-actions">
      <button class="card-action-btn btn-edit">✏️</button>
      <button class="card-action-btn btn-delete">🗑</button>
    </div>
    <div class="card-img ${item.photoUrl ? '' : 'no-img'}">
      ${item.photoUrl ? `<img src="${item.photoUrl}" alt="${item.name}">` : '📦'}
    </div>
    <div class="card-body">
      <div class="card-name">${item.name}</div>
      <div class="card-meta">
        <span class="badge ${badgeClass}">${STRENGTH_LABELS[strength] || strength}</span>
        ${item.origin ? `<span class="badge badge-origin">🌍 ${item.origin}</span>` : ''}
      </div>
      <div class="strength-compact">
        <span class="strength-label-small">Крепость ${strength}/10</span>
        <div class="strength-dots">
          ${Array.from({length: 10}, (_, i) => `<span class="strength-dot ${i < strength ? 'active' : ''}"></span>`).join('')}
        </div>
      </div>
      ${item.desc ? `<div class="card-desc">${item.desc.substring(0, 80)}${item.desc.length > 80 ? '...' : ''}</div>` : ''}
    </div>
  `;

  div.querySelector('.btn-delete').addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm(`Удалить "${item.name}"?`)) {
      try {
        await deleteItem(category, item.id);
        div.remove();
        if (onDelete) onDelete();
      } catch (error) {
        alert('Ошибка удаления: ' + error.message);
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
    this.photoUrl = editItem?.photoUrl || null;
    this._build();
  }

  _build() {
    const existingModal = document.getElementById('productModal');
    if (existingModal) existingModal.remove();

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
            <label>📷 Фото товара</label>
            <div class="photo-upload">
              <input type="file" id="photoInput" accept="image/*">
              <div class="photo-upload-icon">📷</div>
              <p>Нажмите для выбора фото<br><strong>JPG, PNG до 5MB</strong></p>
            </div>
            <img class="photo-preview" id="photoPreview" ${this.photoUrl ? `src="${this.photoUrl}" style="display:block"` : ''}>
          </div>
          <div class="field">
            <label>Название *</label>
            <input type="text" id="fieldName" placeholder="Название" value="${this.editItem?.name || ''}">
          </div>
          <div class="field">
            <label>Крепость (1-10)</label>
            <input type="range" id="fieldStrength" min="1" max="10" value="${strengthVal}">
            <span id="strengthValue">${strengthVal}</span>
          </div>
          <div class="field">
            <label>Производитель</label>
            <input type="text" id="fieldOrigin" value="${this.editItem?.origin || ''}">
          </div>
          <div class="field">
            <label>Описание</label>
            <textarea id="fieldDesc">${this.editItem?.desc || ''}</textarea>
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
    const strengthSpan = overlay.querySelector('#strengthValue');
    slider.addEventListener('input', () => {
      strengthSpan.textContent = slider.value;
    });

    // Photo upload
    const photoInput = overlay.querySelector('#photoInput');
    const photoPreview = overlay.querySelector('#photoPreview');
    photoInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const photoUrl = await uploadPhoto(file);
        this.photoUrl = photoUrl;
        photoPreview.src = photoUrl;
        photoPreview.style.display = 'block';
      } catch (error) {
        alert('Ошибка загрузки фото: ' + error.message);
      }
    });

    // Close
    const closeModal = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 300);
    };
    
    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.querySelector('.btn-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Save
    overlay.querySelector('.btn-save').addEventListener('click', async () => {
      const name = overlay.querySelector('#fieldName').value.trim();
      if (!name) {
        alert('Введите название');
        return;
      }
      
      const item = {
        id: this.editItem?.id || (Date.now() + Math.random()).toString(),
        name: name,
        strength: parseInt(overlay.querySelector('#fieldStrength').value),
        origin: overlay.querySelector('#fieldOrigin').value.trim(),
        desc: overlay.querySelector('#fieldDesc').value.trim(),
        photoUrl: this.photoUrl
      };
      
      try {
        await this.onSave(item);
        closeModal();
      } catch (error) {
        alert('Ошибка: ' + error.message);
      }
    });
  }
}

// Make global
window.getCategory = getCategory;
window.addItem = addItem;
window.deleteItem = deleteItem;
window.initAccordions = initAccordions;
window.initTabs = initTabs;
window.initSearch = initSearch;
window.renderProductCard = renderProductCard;
window.renderEmpty = renderEmpty;
window.ProductModal = ProductModal;
