// editor.js - отдельный файл для функционала редактирования

// ========== РЕДАКТИРОВАНИЕ КОНТЕНТА ==========

function setupEditButtons() {
    const editBtns = document.querySelectorAll('.btn-edit-content');
    console.log('Editor.js: Found edit buttons:', editBtns.length);
    
    editBtns.forEach(btn => {
        btn.removeEventListener('click', handleEditClick);
        btn.addEventListener('click', handleEditClick);
        btn.style.display = window.isRopGlobal ? 'inline-flex' : 'none';
    });
}

function handleEditClick(e) {
    const btn = e.currentTarget;
    const page = btn.dataset.page;
    const section = btn.dataset.section;
    console.log('Editor.js: Edit clicked for:', page, section);
    openVisualEditor(page, section);
}

function openVisualEditor(page, section) {
    const contentDiv = document.getElementById(`${section}-content`);
    if (!contentDiv) {
        console.error('Editor.js: Content div not found:', `${section}-content`);
        return;
    }
    
    const existingModal = document.getElementById('visualEditorModal');
    if (existingModal) existingModal.remove();
    
    const currentHtml = contentDiv.innerHTML;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'visualEditorModal';
    modal.style.zIndex = '2000';
    modal.innerHTML = `
        <div class="modal" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <span class="modal-title">✏️ Редактировать: ${getSectionTitle(section)}</span>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                <div class="editor-toolbar">
                    <button class="tool-btn" data-action="add-text">📝 Добавить текст</button>
                    <button class="tool-btn" data-action="add-list">📋 Добавить список</button>
                    <button class="tool-btn" data-action="add-numbered-list">🔢 Нумерованный список</button>
                    <button class="tool-btn" data-action="add-table">📊 Добавить таблицу</button>
                    <button class="tool-btn" data-action="add-alert">⚠️ Предупреждение</button>
                    <button class="tool-btn" data-action="add-note">💡 Примечание</button>
                    <button class="tool-btn" data-action="add-dropdown">📁 Выпадающий список</button>
                    <button class="tool-btn" data-action="add-card">🃏 Карточка</button>
                    <button class="tool-btn" data-action="add-quiz">📋 Опросник</button>
                </div>
                <div class="editor-area" id="editorArea">
                    <textarea id="contentEditor" style="width:100%; min-height:400px; font-family:monospace; font-size:13px; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 12px; color: var(--text);">${escapeHtml(currentHtml)}</textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel">Отмена</button>
                <button class="btn-save">💾 Сохранить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('open'), 10);
    
    const textarea = modal.querySelector('#contentEditor');
    
    const toolBtns = modal.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = btn.dataset.action;
            addHtmlToEditor(textarea, action);
        });
    });
    
    const closeModal = () => {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 300);
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    modal.querySelector('.btn-save').addEventListener('click', async () => {
        const newContent = textarea.value;
        
        let url = `/api/content/${page}/${section}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content: newContent })
            });
            
            if (response.ok) {
                contentDiv.innerHTML = newContent;
                alert('✅ Сохранено успешно!');
                closeModal();
                // Переинициализируем аккордеоны
                if (typeof initAccordionsToDetails === 'function') {
                    initAccordionsToDetails();
                }
            } else {
                alert('❌ Ошибка сохранения');
            }
        } catch (error) {
            alert('❌ Ошибка: ' + error.message);
        }
    });
}

function addHtmlToEditor(textarea, action) {
    let html = '';
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;
    
    switch(action) {
        case 'add-text':
            html = '<div>Новый текст</div>\n';
            break;
        case 'add-list':
            html = '<ul>\n  <li>Пункт списка</li>\n  <li>Пункт списка</li>\n</ul>\n';
            break;
        case 'add-numbered-list':
            html = '<div class="steps">\n  <div class="step">\n    <div class="step-num">1</div>\n    <div class="step-body">\n      <strong>Заголовок</strong>\n      <span>Описание</span>\n    </div>\n  </div>\n</div>\n';
            break;
        case 'add-table':
            html = '<table class="ref-table">\n  <thead>\n      <tr><th>Заголовок 1</th><th>Заголовок 2</th></tr>\n  </thead>\n  <tbody>\n      <tr><td>Данные 1</td><td>Данные 2</td></tr>\n  </tbody>\n</table>\n';
            break;
        case 'add-alert':
            html = '<div class="alert-bar info">\n  <span>ℹ️</span>\n  <span>Текст предупреждения</span>\n</div>\n';
            break;
        case 'add-note':
            html = '<div class="hl info">Текст примечания</div>\n';
            break;
        case 'add-dropdown':
            html = '<details>\n  <summary>Заголовок</summary>\n  <div class="acc-body">Содержимое</div>\n</details>\n';
            break;
        case 'add-card':
            html = '<div class="info-card">\n  <h3>Заголовок</h3>\n  <ul>\n    <li>Пункт 1</li>\n    <li>Пункт 2</li>\n  </ul>\n</div>\n';
            break;
        case 'add-quiz':
            html = '<div class="quiz-block">\n  <div class="quiz-title">📋 Опросник</div>\n  <div class="quiz-question">\n    <div class="quiz-question-text">Вопрос?</div>\n    <div class="quiz-options">\n      <label class="quiz-option"><input type="radio" name="q1"><span>Ответ 1</span></label>\n      <label class="quiz-option"><input type="radio" name="q1"><span>Ответ 2</span></label>\n    </div>\n    <div class="quiz-answer"></div>\n  </div>\n  <button class="quiz-btn" onclick="checkQuiz(this)">✅ Проверить</button>\n  <div class="quiz-result"></div>\n</div>\n';
            break;
    }
    
    textarea.value = text.slice(0, cursorPos) + html + text.slice(cursorPos);
    textarea.focus();
    textarea.setSelectionRange(cursorPos + html.length, cursorPos + html.length);
}

function getSectionTitle(section) {
    const titles = {
        'parts': 'Комплектация кальяна',
        'bowls': 'Чаши',
        'coal': 'Уголь и управление',
        'clean': 'Обслуживание и чистка',
        'info': 'Общая информация',
        'alternatives': 'Альтернативы',
        'coils': 'Совместимость испарителей',
        'howto': 'Как применять',
        'formats': 'Форматы паучей',
        'strength': 'Классификация по крепости',
        'returns': 'Возврат картриджа',
        'price': 'Отработка возражения по цене',
        'color': 'Цвет жидкости',
        'upsell': 'Добивание комбо',
        'official': 'Официальная инструкция',
        'practical': 'Практические советы',
        'after': 'По окончании проверки',
        'types': 'Типы товаров',
        'qr': 'Работа с QR-кодами',
        'register': 'Кассовый аппарат',
        'syrye': 'Типы сырья',
        'tips': 'Советы продавцу',
        'guide': 'Гид по брендам'
    };
    return titles[section] || section;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Ждем пока установится isRopGlobal
        setTimeout(() => {
            setupEditButtons();
        }, 100);
    });
} else {
    setTimeout(() => {
        setupEditButtons();
    }, 100);
}
