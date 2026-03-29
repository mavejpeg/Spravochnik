// core.js - упрощенная версия
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const API_URL = isBrowser ? window.location.origin : '';

// ========== API FUNCTIONS ==========

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
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add');
    }
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
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update');
    }
    return await response.json();
  } catch (error) {
    console.error('API update error:', error);
    throw error;
  }
}

async function apiDeleteProduct(category, id) {
  try {
    console.log(`Deleting: ${category}/${id}`);
    const response = await fetch(`${API_URL}/api/products/${category}/${id}`, {
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
    console.log('Uploading photo...', file.name, Math.round(file.size / 1024), 'KB');
    
    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }
    
    const data = await response.json();
    console.log('Upload success, size:', Math.round(data.photoUrl.length / 1024), 'KB');
    return data.photoUrl;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// ========== STORAGE FUNCTIONS ==========

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

async function updateItem(cat, id, data) {
  const product = {
    name: data.name,
    strength: data.strength || 5,
    origin: data.origin || '',
    desc: data.desc || '',
    photoUrl: data.photoUrl || null
  };
  return await apiUpdateProduct(cat, id, product);
}

// ========== STRENGTH LABELS ==========

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

// ========== HELPER FUNCTIONS ==========

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ========== UI FUNCTIONS ==========

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
      const si = document.getElementById('searchInput');
      if (si) { si.value = ''; clearSearch(); }
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

function renderEmpty(container, icon, title, sub) {
  container.innerHTML = `
    <div class="empty-state" data-empty>
      <div class="empty-icon">${icon}</div>
      <div class="empty-title">${title}</div>
      <div class="empty-sub">${sub}</div>
    </div>
  `;
}

// ========== PRODUCT CARD ==========

function renderProductCard(item, category, onDelete, onEdit) {
  const div = document.createElement('div');
  div.className = 'product-card';
  div.dataset.searchable = '';
  div.dataset.id = item.id;
  div.dataset.category = category;

  const strength = item.strength || 5;
  const badgeClass = STRENGTH_BADGE_CLASS[strength] || 'badge-strength-3';

  const strengthDots = Array.from({length: 10}, (_, i) => {
    const isActive = i < strength;
    return `<span class="strength-dot ${isActive ? 'active' : ''}" title="${i+1}/10"></span>`;
  }).join('');

  div.innerHTML = `
    <div class="card-actions">
      <button class="card-action-btn btn-edit" data-action="edit" title="Редактировать">✏️</button>
      <button class="card-action-btn btn-delete" data-action="delete" title="Удалить">🗑</button>
    </div>
    <div class="card-img ${item.photoUrl ? '' : 'no-img'}">
      ${item.photoUrl ? `<img src="${item.photoUrl}" alt="${escapeHtml(item.name)}" loading="lazy">` : '📦'}
    </div>
    <div class="card-body">
      <div class="card-name">${escapeHtml(item.name)}</div>
      <div class="card-meta">
        <span class="badge ${badgeClass}">${STRENGTH_LABELS[strength] || strength}</span>
        ${item.origin ? `<span class="badge badge-origin">🌍 ${escapeHtml(item.origin)}</span>` : ''}
      </div>
      <div class="strength-compact">
        <span class="strength-label-small">Крепость ${strength}/10</span>
        <div class="strength-dots">${strengthDots}</div>
      </div>
      ${item.desc ? `<div class="card-desc">${escapeHtml(item.desc.substring(0, 80))}${item.desc.length > 80 ? '...' : ''}</div>` : ''}
    </div>
  `;

  // Delete button
  const deleteBtn = div.querySelector('.btn-delete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      if (confirm(`❌ Удалить "${item.name}"?`)) {
        try {
          div.style.opacity = '0.5';
          div.style.pointerEvents = 'none';
          
          await deleteItem(category, item.id);
          
          div.style.transition = 'all 0.3s ease';
          div.style.opacity = '0';
          div.style.transform = 'scale(0.8)';
          
          setTimeout(() => {
            div.remove();
            if (onDelete) onDelete();
          }, 300);
          
        } catch (error) {
          alert('Ошибка при удалении: ' + error.message);
          div.style.opacity = '1';
          div.style.pointerEvents = 'auto';
        }
      }
    });
  }

  // Edit button
  const editBtn = div.querySelector('.btn-edit');
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (onEdit) onEdit(item);
    });
  }

  return div;
}

// ========== PRODUCT MODAL ==========

class ProductModal {
  constructor({ category, title, onSave, editItem = null }) {
    this.category = category;
    this.titleText = title;
    this.onSave = onSave;
    this.editItem = editItem;
    this.photoUrl = editItem?.photoUrl || null;
    this.isUploading = false;
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
          <button class="modal-close" id="modalCloseBtn">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>📷 Фото товара</label>
            <div class="photo-upload" id="photoZone">
              <input type="file" id="photoInput" accept="image/jpeg,image/png,image/webp">
              <div class="photo-upload-icon">📷</div>
              <p>Нажмите или перетащите фото<br><strong>JPG, PNG, WEBP до 5MB</strong></p>
            </div>
            <div id="uploadProgress" style="display:none; margin-top:10px;">
              <span style="font-size:12px">⏳ Загрузка...</span>
            </div>
            <img class="photo-preview" id="photoPreview" ${this.photoUrl ? `src="${this.photoUrl}" style="display:block"` : ''}>
          </div>
          <div class="field">
            <label>Название *</label>
            <input type="text" id="fieldName" placeholder="Например: Siberia White Dry" value="${escapeHtml(this.editItem?.name || '')}">
          </div>
          <div class="field">
            <label>Крепость (1-10)</label>
            <div class="strength-slider-wrap">
              <div class="strength-display">
                <span class="strength-val" id="strengthValDisplay">${strengthVal}</span>
                <span class="strength-label-text" id="strengthLabelDisplay">${STRENGTH_LABELS[strengthVal]}</span>
              </div>
              <input type="range" id="fieldStrength" min="1" max="10" value="${strengthVal}">
            </div>
          </div>
          <div class="field">
            <label>Производитель / Страна</label>
            <input type="text" id="fieldOrigin" placeholder="Например: Россия, Швеция..." value="${escapeHtml(this.editItem?.origin || '')}">
          </div>
          <div class="field">
            <label>Описание</label>
            <textarea id="fieldDesc" placeholder="Особенности вкуса, формат, совет...">${escapeHtml(this.editItem?.desc || '')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" id="modalCancelBtn">Отмена</button>
          <button class="btn-save" id="modalSaveBtn">${this.editItem ? 'Сохранить' : 'Добавить'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('open'), 10);

    // Strength slider
    const slider = overlay.querySelector('#fieldStrength');
    const valDisp = overlay.querySelector('#strengthValDisplay');
    const labelDisp = overlay.querySelector('#strengthLabelDisplay');
    
    if (slider) {
      slider.addEventListener('input', () => {
        valDisp.textContent = slider.value;
        labelDisp.textContent = STRENGTH_LABELS[slider.value] || '';
      });
    }

    // Photo upload
    const photoInput = overlay.querySelector('#photoInput');
    const photoPreview = overlay.querySelector('#photoPreview');
    const uploadProgress = overlay.querySelector('#uploadProgress');
    
    if (photoInput) {
      photoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
          alert('❌ Файл слишком большой! Максимум 5MB');
          return;
        }
        
        if (!file.type.startsWith('image/')) {
          alert('❌ Пожалуйста, выберите изображение (JPG, PNG, WEBP)');
          return;
        }
        
        if (uploadProgress) uploadProgress.style.display = 'block';
        this.isUploading = true;
        
        try {
          const photoUrl = await uploadPhoto(file);
          this.photoUrl = photoUrl;
          if (photoPreview) {
            photoPreview.src = photoUrl;
            photoPreview.style.display = 'block';
          }
        } catch (error) {
          alert('❌ Ошибка загрузки фото: ' + error.message);
        } finally {
          if (uploadProgress) uploadProgress.style.display = 'none';
          this.isUploading = false;
        }
      });
    }

    // Close modal
    const closeModal = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 300);
    };
    
    const closeBtn = overlay.querySelector('#modalCloseBtn');
    const cancelBtn = overlay.querySelector('#modalCancelBtn');
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Save
    const saveBtn = overlay.querySelector('#modalSaveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        if (this.isUploading) {
          alert('⏳ Подождите, фото загружается...');
          return;
        }
        
        const nameInput = overlay.querySelector('#fieldName');
        const name = nameInput ? nameInput.value.trim() : '';
        
        if (!name) {
          alert('❌ Введите название товара');
          if (nameInput) nameInput.focus();
          return;
        }
        
        const item = {
          id: this.editItem?.id || (Date.now() + Math.random()).toString(),
          name: name,
          strength: parseInt(overlay.querySelector('#fieldStrength')?.value || 5),
          origin: overlay.querySelector('#fieldOrigin')?.value.trim() || '',
          desc: overlay.querySelector('#fieldDesc')?.value.trim() || '',
          photoUrl: this.photoUrl
        };
        
        try {
          await this.onSave(item);
          closeModal();
        } catch (error) {
          alert('❌ Ошибка сохранения: ' + error.message);
        }
      });
    }
  }
}

// ========== INITIAL DATA ==========

async function loadInitialData() {
  const categories = ['tobacco', 'liquids', 'snus', 'disposables'];
  
  for (const cat of categories) {
    try {
      const items = await getCategory(cat);
      if (items.length === 0 && cat === 'disposables') {
        const initialData = [
          { id: 'disp_1', name: 'Husky', strength: 7, origin: 'Россия', desc: 'Крепкие, со льдом' },
          { id: 'disp_2', name: 'Lost Mary', strength: 4, origin: 'Китай', desc: 'Лёгкие, фруктовые' },
          { id: 'disp_3', name: 'Plonk', strength: 3, origin: 'Россия', desc: 'Премиальные лёгкие' }
        ];
        for (const item of initialData) {
          await addItem(cat, item);
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }
}

// Initialize
if (isBrowser) {
  document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
  });
}

// Make functions global
if (typeof window !== 'undefined') {
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
}
