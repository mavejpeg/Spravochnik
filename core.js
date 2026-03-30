// core.js - полная исправленная версия

// ========== CONSTANTS ==========
const QUALITY_SETTINGS = {
  premium: { name: 'Премиум', icon: '💎', color: 'var(--accent)' },
  medium: { name: 'Средний класс', icon: '⭐', color: 'var(--accent4)' },
  economy: { name: 'Эконом', icon: '📦', color: 'var(--accent3)' }
};

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

// ========== HELPER FUNCTIONS ==========
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}

// ========== API FUNCTIONS ==========
async function getCategory(category) {
  try {
    const response = await fetch(`/api/products/${category}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    console.log(`Loaded ${category}:`, data.length);
    return data;
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
      credentials: 'include',
      body: JSON.stringify({
        id: item.id,
        name: item.name,
        strength: item.strength,
        quality_class: item.quality_class || 'medium',
        origin: item.origin,
        desc: item.desc,
        photoUrl: item.photoUrl
      })
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
      method: 'DELETE',
      credentials: 'include'
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
      credentials: 'include',
      body: JSON.stringify({
        name: data.name,
        strength: data.strength,
        quality_class: data.quality_class || 'medium',
        origin: data.origin,
        desc: data.desc,
        photoUrl: data.photoUrl
      })
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
      credentials: 'include',
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

// ========== UI FUNCTIONS ==========
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
  
  const productId = item.product_id || item.id;
  const strength = item.strength || 5;
  const badgeClass = STRENGTH_BADGE_CLASS[strength] || 'badge-strength-3';
  const photoUrl = item.photo_url || item.photoUrl;
  const qualityClass = item.quality_class || 'medium';
  const quality = QUALITY_SETTINGS[qualityClass] || QUALITY_SETTINGS.medium;
  
  const canEdit = window.isRopGlobal === true;
  
  div.innerHTML = `
    <div class="card-actions" style="${canEdit ? '' : 'display: none !important;'}">
      <button class="card-action-btn btn-edit" data-id="${productId}" title="Редактировать">✏️</button>
      <button class="card-action-btn btn-delete" data-id="${productId}" title="Удалить">🗑</button>
    </div>
    <div class="card-img ${photoUrl ? '' : 'no-img'}">
      ${photoUrl ? `<img src="${photoUrl}" alt="${escapeHtml(item.name)}" loading="lazy">` : '📦'}
    </div>
    <div class="card-body">
      <div class="card-name">${escapeHtml(item.name)}</div>
      <div class="card-meta">
        <span class="badge ${badgeClass}">${STRENGTH_LABELS[strength]}</span>
        <span class="badge quality-badge ${qualityClass}" style="background: ${quality.color}20; color: ${quality.color}; border: 2px solid ${quality.color}; box-shadow: 0 0 4px ${quality.color};">
          ${quality.icon} ${quality.name}
        </span>
        ${item.origin ? `<span class="badge badge-origin">🌍 ${escapeHtml(item.origin)}</span>` : ''}
      </div>
      <div class="strength-compact">
        <span class="strength-label-small">Крепость ${strength}/10</span>
        <div class="strength-dots">
          ${Array(10).fill().map((_, i) => `<span class="strength-dot ${i < strength ? 'active' : ''}"></span>`).join('')}
        </div>
      </div>
      ${item.description ? `<div class="card-desc">${escapeHtml(item.description.substring(0, 80))}${item.description.length > 80 ? '...' : ''}</div>` : ''}
    </div>
  `;
  
  const deleteBtn = div.querySelector('.btn-delete');
  if (deleteBtn && canEdit) {
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`❌ Удалить "${item.name}"?`)) {
        try {
          await deleteItem(category, productId);
          div.remove();
          if (onDelete) onDelete();
        } catch (error) {
          alert('Ошибка удаления: ' + error.message);
        }
      }
    });
  }
  
  const editBtn = div.querySelector('.btn-edit');
  if (editBtn && canEdit) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const editItem = {
        ...item,
        id: productId,
        desc: item.description,
        photoUrl: photoUrl,
        quality_class: qualityClass
      };
      if (onEdit) onEdit(editItem);
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
    this.photoUrl = editItem?.photoUrl || editItem?.photo_url || null;
    this.qualityClass = editItem?.quality_class || 'medium';
    this.isUploading = false;
    this._build();
  }
  
  _build() {
    const existing = document.getElementById('productModal');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'productModal';
    
    const strengthVal = this.editItem?.strength || 5;
    const hasPhoto = this.photoUrl ? true : false;
    
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">${this.editItem ? '✏️ Редактировать' : '➕ ' + this.titleText}</span>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>📸 Фото товара</label>
            <div class="photo-upload-area" id="photoUploadArea">
              <input type="file" id="photoInput" accept="image/*" class="photo-upload-input">
              <div class="photo-upload-icon">📷</div>
              <div class="photo-upload-title">Нажмите или перетащите фото</div>
              <div class="photo-upload-sub">JPG, PNG, WEBP до 5MB</div>
            </div>
            <div class="photo-preview-container" id="photoPreviewContainer" style="${hasPhoto ? 'display:block' : 'display:none'}">
              <img class="photo-preview" id="photoPreview" src="${this.photoUrl || ''}">
              <button class="photo-remove-btn" id="removePhotoBtn">✕</button>
            </div>
          </div>
          
          <div class="field">
            <label>📝 Название *</label>
            <input type="text" id="fieldName" value="${escapeHtml(this.editItem?.name || '')}" placeholder="Введите название">
          </div>
          
          <div class="row" style="display: flex; gap: 16px; flex-wrap: wrap;">
            <div class="field" style="flex: 1;">
              <label>⚡ Крепость (1-10)</label>
              <input type="range" id="fieldStrength" min="1" max="10" value="${strengthVal}" style="width:100%">
              <span id="strengthValue">${strengthVal}/10 - ${STRENGTH_LABELS[strengthVal]}</span>
            </div>
            
            <div class="field" style="flex: 1;">
              <label>🏷️ Класс качества</label>
              <select id="fieldQuality" style="width:100%; padding: 10px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;">
                <option value="premium" ${this.qualityClass === 'premium' ? 'selected' : ''}>💎 Премиум</option>
                <option value="medium" ${this.qualityClass === 'medium' ? 'selected' : ''}>⭐ Средний класс</option>
                <option value="economy" ${this.qualityClass === 'economy' ? 'selected' : ''}>📦 Эконом</option>
              </select>
            </div>
          </div>
          
          <div class="field">
            <label>🏭 Производитель / Страна</label>
            <input type="text" id="fieldOrigin" value="${escapeHtml(this.editItem?.origin || '')}" placeholder="Например: Россия, Швеция">
          </div>
          
          <div class="field">
            <label>📋 Описание</label>
            <textarea id="fieldDesc" rows="4" placeholder="Особенности вкуса, формат, советы">${escapeHtml(this.editItem?.desc || this.editItem?.description || '')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel">Отмена</button>
          <button class="btn-save">${this.editItem ? '💾 Сохранить' : '➕ Добавить'}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('open'), 10);
    
    const slider = overlay.querySelector('#fieldStrength');
    const strengthSpan = overlay.querySelector('#strengthValue');
    if (slider) {
      slider.addEventListener('input', () => {
        const val = slider.value;
        strengthSpan.textContent = `${val}/10 - ${STRENGTH_LABELS[val]}`;
      });
    }
    
    const photoInput = overlay.querySelector('#photoInput');
    const photoPreview = overlay.querySelector('#photoPreview');
    const previewContainer = overlay.querySelector('#photoPreviewContainer');
    const removePhotoBtn = overlay.querySelector('#removePhotoBtn');
    
    if (photoInput) {
      const uploadArea = overlay.querySelector('#photoUploadArea');
      uploadArea.addEventListener('click', () => photoInput.click());
      
      photoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          alert('Файл слишком большой! Максимум 5MB');
          return;
        }
        try {
          const photoUrl = await uploadPhoto(file);
          this.photoUrl = photoUrl;
          photoPreview.src = photoUrl;
          previewContainer.style.display = 'block';
        } catch (error) {
          alert('Ошибка загрузки: ' + error.message);
        }
      });
    }
    
    if (removePhotoBtn) {
      removePhotoBtn.addEventListener('click', () => {
        this.photoUrl = null;
        photoPreview.src = '';
        previewContainer.style.display = 'none';
      });
    }
    
    const closeModal = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 300);
    };
    
    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.querySelector('.btn-cancel').addEventListener('click', closeModal);
    
    overlay.querySelector('.btn-save').addEventListener('click', async () => {
      const name = overlay.querySelector('#fieldName').value.trim();
      if (!name) {
        alert('Введите название');
        return;
      }
      
      const item = {
        id: this.editItem?.id || Date.now().toString(),
        name: name,
        strength: parseInt(overlay.querySelector('#fieldStrength').value),
        quality_class: overlay.querySelector('#fieldQuality').value,
        origin: overlay.querySelector('#fieldOrigin').value.trim(),
        desc: overlay.querySelector('#fieldDesc').value.trim(),
        photoUrl: this.photoUrl
      };
      
      try {
        await this.onSave(item);
        closeModal();
      } catch (err) {
        alert('Ошибка: ' + err.message);
      }
    });
  }
}

function initPageElements() {
    // Инициализация табов
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.removeEventListener('click', handleTabClick);
        btn.addEventListener('click', handleTabClick);
    });
    
    // Инициализация аккордеонов
    const accordions = document.querySelectorAll('.accordion');
    accordions.forEach(acc => {
        const header = acc.querySelector('.acc-header');
        if (header && !acc.classList.contains('converted')) {
            header.removeEventListener('click', handleAccordionClick);
            header.addEventListener('click', handleAccordionClick);
        }
    });
}

function handleTabClick(e) {
    const btn = e.currentTarget;
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    const sec = document.getElementById(target);
    if (sec) sec.classList.add('active');
}

function handleAccordionClick(e) {
    const header = e.currentTarget;
    header.closest('.accordion').classList.toggle('open');
}

window.initPageElements = initPageElements;

// ========== EXPORTS ==========
window.getCategory = getCategory;
window.addItem = addItem;
window.deleteItem = deleteItem;
window.updateItem = updateItem;
window.uploadPhoto = uploadPhoto;
window.renderProductCard = renderProductCard;
window.renderEmpty = renderEmpty;
window.ProductModal = ProductModal;
window.STRENGTH_LABELS = STRENGTH_LABELS;
window.STRENGTH_BADGE_CLASS = STRENGTH_BADGE_CLASS;
window.QUALITY_SETTINGS = QUALITY_SETTINGS;
window.escapeHtml = escapeHtml;
window.isRopGlobal = false;
