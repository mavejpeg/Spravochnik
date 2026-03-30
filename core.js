// core.js - только основные функции

// ========== API FUNCTIONS ==========

async function getCategory(category) {
  try {
    const response = await fetch(`/api/products/${category}`, { credentials: 'include' });
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
      credentials: 'include',
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

function renderEmpty(container, icon, title, sub) {
  container.innerHTML = `
    <div class="empty-state">
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
  
  const productId = item.product_id || item.id;
  const strength = item.strength || 5;
  const badgeClass = STRENGTH_BADGE_CLASS[strength] || 'badge-strength-3';
  const photoUrl = item.photo_url || item.photoUrl;
  
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
          div.style.transition = 'all 0.3s ease';
          div.style.opacity = '0';
          div.style.transform = 'scale(0.8)';
          setTimeout(() => {
            div.remove();
            if (onDelete) onDelete();
          }, 300);
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
        photoUrl: photoUrl
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
              <input type="file" id="photoInput" accept="image/jpeg,image/png,image/webp" class="photo-upload-input">
              <div class="photo-upload-icon">📷</div>
              <div class="photo-upload-title">Нажмите или перетащите фото</div>
              <div class="photo-upload-sub">Поддерживаются <strong>JPG, PNG, WEBP</strong> до <strong>5MB</strong></div>
            </div>
            <div class="photo-upload-progress" id="uploadProgress" style="display:none;">
              <div class="progress-bar-container">
                <div class="progress-bar" id="progressBar"></div>
              </div>
              <span class="progress-text">Загрузка...</span>
            </div>
            <div class="photo-preview-container" id="photoPreviewContainer" style="${hasPhoto ? 'display:block' : 'display:none'}">
              <img class="photo-preview" id="photoPreview" src="${this.photoUrl || ''}">
              <button class="photo-remove-btn" id="removePhotoBtn" title="Удалить фото">✕</button>
            </div>
          </div>
          
          <div class="field">
            <label>📝 Название *</label>
            <input type="text" id="fieldName" value="${escapeHtml(this.editItem?.name || '')}" placeholder="Введите название">
          </div>
          
          <div class="field">
            <label>⚡ Крепость (1-10)</label>
            <div class="strength-slider-wrap">
              <div class="strength-display">
                <span class="strength-val" id="strengthValDisplay">${strengthVal}</span>
                <span class="strength-label-text" id="strengthLabelDisplay">${STRENGTH_LABELS[strengthVal]}</span>
              </div>
              <input type="range" id="fieldStrength" min="1" max="10" value="${strengthVal}">
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
    const valDisp = overlay.querySelector('#strengthValDisplay');
    const labelDisp = overlay.querySelector('#strengthLabelDisplay');
    
    if (slider) {
      slider.addEventListener('input', () => {
        valDisp.textContent = slider.value;
        labelDisp.textContent = STRENGTH_LABELS[slider.value] || '';
      });
    }
    
    const photoInput = overlay.querySelector('#photoInput');
    const uploadProgress = overlay.querySelector('#uploadProgress');
    const progressBar = overlay.querySelector('#progressBar');
    const progressText = overlay.querySelector('.progress-text');
    const photoPreview = overlay.querySelector('#photoPreview');
    const previewContainer = overlay.querySelector('#photoPreviewContainer');
    const removePhotoBtn = overlay.querySelector('#removePhotoBtn');
    
    if (photoInput) {
      const uploadArea = overlay.querySelector('#photoUploadArea');
      uploadArea.addEventListener('click', () => {
        photoInput.click();
      });
      
      photoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
          alert('❌ Файл слишком большой! Максимум 5MB');
          return;
        }
        
        uploadProgress.style.display = 'block';
        this.isUploading = true;
        
        let progress = 0;
        const interval = setInterval(() => {
          progress = Math.min(progress + 10, 90);
          if (progressBar) progressBar.style.width = progress + '%';
          if (progressText) progressText.textContent = `Загрузка ${progress}%...`;
        }, 100);
        
        try {
          const photoUrl = await uploadPhoto(file);
          this.photoUrl = photoUrl;
          photoPreview.src = photoUrl;
          previewContainer.style.display = 'block';
          
          clearInterval(interval);
          if (progressBar) progressBar.style.width = '100%';
          if (progressText) progressText.textContent = '✅ Готово!';
          
          setTimeout(() => {
            uploadProgress.style.display = 'none';
            if (progressBar) progressBar.style.width = '0%';
          }, 1000);
        } catch (error) {
          clearInterval(interval);
          alert('❌ Ошибка загрузки: ' + error.message);
          uploadProgress.style.display = 'none';
        } finally {
          this.isUploading = false;
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
    
    const closeBtn = overlay.querySelector('.modal-close');
    const cancelBtn = overlay.querySelector('.btn-cancel');
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    
    const saveBtn = overlay.querySelector('.btn-save');
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
        } catch (err) {
          alert('❌ Ошибка: ' + err.message);
        }
      });
    }
  }
}

// ========== EXPORT GLOBALS ==========

window.getCategory = getCategory;
window.addItem = addItem;
window.deleteItem = deleteItem;
window.updateItem = updateItem;
window.renderProductCard = renderProductCard;
window.renderEmpty = renderEmpty;
window.ProductModal = ProductModal;
window.uploadPhoto = uploadPhoto;
window.STRENGTH_LABELS = STRENGTH_LABELS;
window.STRENGTH_BADGE_CLASS = STRENGTH_BADGE_CLASS;
window.escapeHtml = escapeHtml;
window.isRopGlobal = false;
