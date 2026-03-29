// core.js - полная рабочая версия с красивой загрузкой фото

// ========== API FUNCTIONS ==========

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
  
  const productId = item.product_id || item.id;
  const strength = item.strength || 5;
  const badgeClass = STRENGTH_BADGE_CLASS[strength] || 'badge-strength-3';
  const photoUrl = item.photo_url || item.photoUrl;
  
  div.innerHTML = `
    <div class="card-actions">
      <button class="card-action-btn btn-edit" data-id="${productId}">✏️</button>
      <button class="card-action-btn btn-delete" data-id="${productId}">🗑</button>
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
  
  // Delete button
  const deleteBtn = div.querySelector('.btn-delete');
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const id = deleteBtn.dataset.id;
    if (confirm(`❌ Удалить "${item.name}"?`)) {
      try {
        await deleteItem(category, id);
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
  
  // Edit button
  const editBtn = div.querySelector('.btn-edit');
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
  
  return div;
}

// ========== PRODUCT MODAL WITH BEAUTIFUL PHOTO UPLOAD ==========

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
          <!-- PHOTO UPLOAD SECTION -->
          <div class="field">
            <label>📸 Фото товара</label>
            
            ${hasPhoto ? `<div class="current-photo-badge">📷 Текущее фото</div>` : ''}
            
            <div class="photo-upload-area" id="photoUploadArea">
              <input type="file" id="photoInput" accept="image/jpeg,image/png,image/webp" class="photo-upload-input">
              <div class="photo-upload-icon">📷</div>
              <div class="photo-upload-title">Нажмите или перетащите фото</div>
              <div class="photo-upload-sub">Поддерживаются <strong>JPG, PNG, WEBP</strong> до <strong>5MB</strong></div>
            </div>
            
            <div class="photo-upload-progress" id="uploadProgress">
              <div class="progress-bar-container">
                <div class="progress-bar" id="progressBar"></div>
              </div>
              <span class="progress-text" id="progressText">Загрузка...</span>
            </div>
            
            <div class="photo-preview-container" id="photoPreviewContainer">
              <img class="photo-preview" id="photoPreview" src="${this.photoUrl || ''}">
              <button class="photo-remove-btn" id="removePhotoBtn" title="Удалить фото">✕</button>
            </div>
          </div>
          
          <!-- OTHER FIELDS -->
          <div class="field">
            <label>📝 Название *</label>
            <input type="text" id="fieldName" value="${escapeHtml(this.editItem?.name || '')}" placeholder="Например: Siberia White Dry">
          </div>
          
          <div class="field">
            <label>⚡ Крепость</label>
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
            <input type="text" id="fieldOrigin" value="${escapeHtml(this.editItem?.origin || '')}" placeholder="Например: Россия, Швеция, Китай...">
          </div>
          
          <div class="field">
            <label>📋 Описание</label>
            <textarea id="fieldDesc" placeholder="Особенности вкуса, формат, советы продавцу...">${escapeHtml(this.editItem?.desc || this.editItem?.description || '')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" id="modalCancelBtn">Отмена</button>
          <button class="btn-save" id="modalSaveBtn">${this.editItem ? '💾 Сохранить' : '➕ Добавить'}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('open'), 10);
    
    // Show preview if has photo
    const previewContainer = overlay.querySelector('#photoPreviewContainer');
    if (this.photoUrl && previewContainer) {
      previewContainer.classList.add('active');
    }
    
    // Strength slider
    const slider = overlay.querySelector('#fieldStrength');
    const valDisp = overlay.querySelector('#strengthValDisplay');
    const labelDisp = overlay.querySelector('#strengthLabelDisplay');
    
    slider.addEventListener('input', () => {
      valDisp.textContent = slider.value;
      labelDisp.textContent = STRENGTH_LABELS[slider.value] || '';
      const val = parseInt(slider.value);
      valDisp.style.color = val <= 3 ? 'var(--accent3)' : val <= 6 ? 'var(--accent4)' : 'var(--accent2)';
    });
    
    // Photo upload with drag & drop
    const uploadArea = overlay.querySelector('#photoUploadArea');
    const photoInput = overlay.querySelector('#photoInput');
    const uploadProgress = overlay.querySelector('#uploadProgress');
    const progressBar = overlay.querySelector('#progressBar');
    const progressText = overlay.querySelector('#progressText');
    const photoPreview = overlay.querySelector('#photoPreview');
    const removePhotoBtn = overlay.querySelector('#removePhotoBtn');
    
    // Drag & drop events
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', async (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        await this.uploadFile(file, uploadProgress, progressBar, progressText, photoPreview, previewContainer);
      } else {
        alert('❌ Пожалуйста, перетащите изображение (JPG, PNG, WEBP)');
      }
    });
    
    // Click to upload
    uploadArea.addEventListener('click', () => {
      photoInput.click();
    });
    
    photoInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await this.uploadFile(file, uploadProgress, progressBar, progressText, photoPreview, previewContainer);
      }
    });
    
    // Remove photo
    if (removePhotoBtn) {
      removePhotoBtn.addEventListener('click', () => {
        this.photoUrl = null;
        photoPreview.src = '';
        previewContainer.classList.remove('active');
        uploadArea.style.display = 'flex';
      });
    }
    
    // Close modal
    const closeModal = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 300);
    };
    
    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.querySelector('#modalCancelBtn').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    
    // Save
    const saveBtn = overlay.querySelector('#modalSaveBtn');
    saveBtn.addEventListener('click', async () => {
      if (this.isUploading) {
        alert('⏳ Подождите, фото загружается...');
        return;
      }
      
      const nameInput = overlay.querySelector('#fieldName');
      const name = nameInput.value.trim();
      
      if (!name) {
        alert('❌ Введите название товара');
        nameInput.focus();
        nameInput.style.borderColor = 'var(--accent2)';
        setTimeout(() => nameInput.style.borderColor = '', 2000);
        return;
      }
      
      const item = {
        id: this.editItem?.id || (Date.now() + Math.random()).toString(),
        name: name,
        strength: parseInt(slider.value),
        origin: overlay.querySelector('#fieldOrigin').value.trim(),
        desc: overlay.querySelector('#fieldDesc').value.trim(),
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
  
  async uploadFile(file, progressContainer, progressBar, progressText, preview, previewContainer) {
    if (file.size > 5 * 1024 * 1024) {
      alert('❌ Файл слишком большой! Максимум 5MB');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      alert('❌ Пожалуйста, выберите изображение');
      return;
    }
    
    this.isUploading = true;
    progressContainer.classList.add('active');
    
    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress = Math.min(progress + 10, 90);
      progressBar.style.width = progress + '%';
      progressText.textContent = `Загрузка ${progress}%...`;
    }, 100);
    
    try {
      const photoUrl = await uploadPhoto(file);
      this.photoUrl = photoUrl;
      
      clearInterval(interval);
      progressBar.style.width = '100%';
      progressText.textContent = '✅ Готово!';
      
      setTimeout(() => {
        progressContainer.classList.remove('active');
        progressBar.style.width = '0%';
      }, 1000);
      
      preview.src = photoUrl;
      previewContainer.classList.add('active');
      
    } catch (error) {
      clearInterval(interval);
      progressText.textContent = '❌ Ошибка загрузки';
      setTimeout(() => {
        progressContainer.classList.remove('active');
      }, 2000);
      alert('❌ Ошибка загрузки фото: ' + error.message);
    } finally {
      this.isUploading = false;
    }
  }
}

// ========== MAKE GLOBAL ==========

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
window.uploadPhoto = uploadPhoto;
window.STRENGTH_LABELS = STRENGTH_LABELS;
window.STRENGTH_BADGE_CLASS = STRENGTH_BADGE_CLASS;
window.escapeHtml = escapeHtml;
