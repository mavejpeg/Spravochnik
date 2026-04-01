// editor.js v3.0 - исправлен race condition, добавлен drag-and-drop, фолбэк для инициализации

// Слушаем событие от main.js
window.addEventListener('authReady', function(e) {
    const { isRop } = e.detail;
    console.log('Editor.js: authReady received, isRop:', isRop);
    setupEditButtons(isRop);
});

// На случай если editor.js загружен позже чем authReady сработал
document.addEventListener('DOMContentLoaded', function() {
    console.log('Editor.js: DOMContentLoaded, checking auth state');
    // Если main.js уже закончил и установил флаг
    if (window._authLoaded === true) {
        console.log('Editor.js: auth already loaded, isRop:', window.isRopGlobal);
        setupEditButtons(window.isRopGlobal);
    }
    // Иначе ждём события authReady (уже подписаны выше)
});

// ========== НАСТРОЙКА КНОПОК ==========
function setupEditButtons(isRop) {
    const editBtns = document.querySelectorAll('.btn-edit-content');
    console.log('Editor.js v3: Found edit buttons:', editBtns.length, '| isRop:', isRop);
    editBtns.forEach(btn => {
        btn.removeEventListener('click', handleEditClick);
        btn.addEventListener('click', handleEditClick);
        btn.style.display = isRop ? 'inline-flex' : 'none';
    });
}

window.setupEditButtons = setupEditButtons;
window.refreshEditButtons = function() { setupEditButtons(window.isRopGlobal); };

function handleEditClick(e) {
    const btn = e.currentTarget;
    const page = btn.dataset.page;
    const section = btn.dataset.section;
    console.log('Editor.js: Edit clicked for:', page, section);
    openVisualEditor(page, section);
}

// ========== TITLE MAP ==========
function getSectionTitle(section) {
    const titles = {
        'parts': 'Комплектация кальяна', 'bowls': 'Чаши', 'coal': 'Уголь и управление', 'clean': 'Обслуживание и чистка',
        'info': 'Общая информация', 'alternatives': 'Альтернативы', 'coils': 'Совместимость испарителей',
        'howto': 'Как применять', 'formats': 'Форматы паучей', 'strength': 'Классификация по крепости',
        'returns': 'Возврат картриджа', 'price': 'Отработка возражения по цене', 'color': 'Цвет жидкости',
        'upsell': 'Добивание комбо', 'official': 'Официальная инструкция', 'practical': 'Практические советы',
        'after': 'По окончании проверки', 'types': 'Типы товаров', 'qr': 'Работа с QR-кодами',
        'register': 'Кассовый аппарат', 'syrye': 'Типы сырья', 'tips': 'Советы продавцу', 'guide': 'Гид по брендам',
        'day1': 'День 1: Основы', 'day2': 'День 2: Кальянная тематика', 'day3': 'День 3: Касса и маркировка',
        'day4': 'День 4: Закрепление', 'scripts': 'Скрипты продаж', 'security': 'Безопасность'
    };
    return titles[section] || section;
}

// ========== ВИЗУАЛЬНЫЙ РЕДАКТОР ==========
function openVisualEditor(page, section) {
    const contentDiv = document.getElementById(`${section}-content`);
    if (!contentDiv) {
        console.error('Content div not found:', `${section}-content`);
        alert('Не удалось найти контент для редактирования. Возможно, раздел не поддерживает редактирование.');
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
        <div class="modal" style="max-width: 960px; max-height: 92vh; overflow: hidden; display: flex; flex-direction: column;">
            <div class="modal-header" style="flex-shrink: 0;">
                <span class="modal-title">✏️ Редактировать: ${getSectionTitle(section)}</span>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body" style="overflow-y: auto; flex: 1; padding-bottom: 0;">
                <div class="editor-toolbar" style="display: flex; flex-wrap: wrap; gap: 6px; padding: 12px; background: var(--surface2); border-radius: 10px; margin-bottom: 14px; position: sticky; top: 0; z-index: 10;">
                    <button class="tool-btn" data-action="add-text">📝 Текст</button>
                    <button class="tool-btn" data-action="add-list">📋 Список</button>
                    <button class="tool-btn" data-action="add-numbered-list">🔢 Шаги</button>
                    <button class="tool-btn" data-action="add-table">📊 Таблица</button>
                    <button class="tool-btn" data-action="add-alert">⚠️ Предупреждение</button>
                    <button class="tool-btn" data-action="add-note">💡 Примечание</button>
                    <button class="tool-btn" data-action="add-dropdown">📁 Выпадающий</button>
                    <button class="tool-btn" data-action="add-card">🃏 Карточка</button>
                    <button class="tool-btn" data-action="add-quiz">📋 Опросник</button>
                </div>
                <div class="editor-hint" style="font-size: 11px; color: var(--muted); margin-bottom: 10px; padding: 0 2px;">
                    💡 Перетаскивайте блоки за иконку ☰ для изменения порядка
                </div>
                <div class="editor-area" id="editorArea" style="min-height: 200px;">
                    ${parseContentToEditor(currentHtml)}
                </div>
            </div>
            <div class="modal-footer" style="flex-shrink: 0;">
                <button class="btn-cancel">Отмена</button>
                <button class="btn-save">💾 Сохранить</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('open'), 10);

    const editorArea = modal.querySelector('#editorArea');

    // Инициализируем таблицы
    editorArea.querySelectorAll('.table-editor').forEach(te => initTableEditor(te));

    // Инициализируем обработчики
    setupRemoveButtons(editorArea);
    setupRichEditors(editorArea);
    setupListEditors(editorArea);
    setupStepsEditors(editorArea);
    setupQuizEditors(editorArea);
    setupDragAndDrop(editorArea);

    // Кнопки тулбара
    modal.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => addElementToEditor(editorArea, btn.dataset.action));
    });

    const closeModal = () => {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 300);
    };

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    modal.querySelector('.btn-save').addEventListener('click', async () => {
        const newContent = convertEditorToHtml(editorArea);
        const url = `/api/content/${page}/${section}`;
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
                if (typeof initAccordionsToDetails === 'function') initAccordionsToDetails();
            } else {
                const error = await response.json();
                alert('❌ Ошибка сохранения: ' + (error.error || 'Неизвестная ошибка'));
            }
        } catch (error) {
            alert('❌ Ошибка: ' + error.message);
        }
    });
}

// ========== DRAG AND DROP ==========
function setupDragAndDrop(editorArea) {
    let draggedItem = null;
    let dragOverItem = null;

    function onDragStart(e) {
        draggedItem = e.currentTarget.closest('.editor-item');
        if (draggedItem) {
            draggedItem.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        }
    }
    function onDragEnd(e) {
        if (draggedItem) draggedItem.classList.remove('dragging');
        editorArea.querySelectorAll('.editor-item').forEach(i => i.classList.remove('drag-over'));
        draggedItem = null;
        dragOverItem = null;
    }
    function onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const item = e.currentTarget.closest('.editor-item');
        if (item && item !== draggedItem) {
            editorArea.querySelectorAll('.editor-item').forEach(i => i.classList.remove('drag-over'));
            item.classList.add('drag-over');
            dragOverItem = item;
        }
    }
    function onDrop(e) {
        e.preventDefault();
        if (draggedItem && dragOverItem && draggedItem !== dragOverItem) {
            const items = [...editorArea.querySelectorAll('.editor-item')];
            const fromIdx = items.indexOf(draggedItem);
            const toIdx = items.indexOf(dragOverItem);
            if (fromIdx < toIdx) {
                dragOverItem.after(draggedItem);
            } else {
                dragOverItem.before(draggedItem);
            }
        }
        editorArea.querySelectorAll('.editor-item').forEach(i => i.classList.remove('drag-over'));
    }

    function attachDragHandlers() {
        editorArea.querySelectorAll('.editor-item').forEach(item => {
            if (item.getAttribute('data-drag-init')) return;
            item.setAttribute('data-drag-init', '1');
            item.setAttribute('draggable', 'true');
            const handle = item.querySelector('.drag-handle');
            if (handle) {
                handle.addEventListener('mousedown', () => item.setAttribute('draggable', 'true'));
            }
            item.addEventListener('dragstart', onDragStart);
            item.addEventListener('dragend', onDragEnd);
            item.addEventListener('dragover', onDragOver);
            item.addEventListener('drop', onDrop);
        });
    }

    attachDragHandlers();
    // Наблюдатель для новых элементов
    const observer = new MutationObserver(attachDragHandlers);
    observer.observe(editorArea, { childList: true });
}

// ========== ПАРСИНГ HTML → РЕДАКТОР ==========
function parseContentToEditor(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    let result = '';
    for (let i = 0; i < tempDiv.children.length; i++) {
        result += convertElementToEditorItem(tempDiv.children[i]);
    }
    return result || '<div class="editor-empty">Нажмите кнопку выше, чтобы добавить элемент</div>';
}

function itemWrapper(icon, label, inner, type) {
    return `
        <div class="editor-item ${type}-item" data-type="${type}" draggable="true">
            <div class="editor-item-header">
                <span class="drag-handle" title="Перетащить">☰</span>
                <span>${icon} ${label}</span>
                <button class="remove-editor-item">🗑</button>
            </div>
            <div class="editor-item-content">
                ${inner}
            </div>
        </div>
    `;
}

function richEditorBlock(content = '') {
    return `
        <div class="rich-editor-container">
            <div class="format-toolbar">
                <button class="format-btn" data-format="bold"><b>B</b></button>
                <button class="format-btn" data-format="italic"><i>I</i></button>
                <button class="format-btn" data-format="underline"><u>U</u></button>
                <button class="format-btn" data-format="h3">H3</button>
                <button class="format-btn" data-format="insertUnorderedList">• Список</button>
                <button class="format-btn" data-format="insertOrderedList">1. Нумер.</button>
            </div>
            <div class="rich-editor" contenteditable="true">${content}</div>
        </div>
    `;
}

function convertElementToEditorItem(el) {
    const className = el.className || '';
    const tagName = el.tagName.toLowerCase();

    if (tagName === 'details') {
    // Получаем заголовок из summary (убираем стрелку)
        const summaryEl = el.querySelector('summary');
        let title = '';
        if (summaryEl) {
            // Убираем возможные span со стрелкой
            title = summaryEl.innerHTML.replace(/<span[^>]*>.*?<\/span>/g, '').trim();
        }
    
        // Получаем содержимое body (все что не summary)
        const bodyEl = el.querySelector('.acc-body') || el;
        const content = Array.from(bodyEl.children).map(c => c.outerHTML).join('');
    
        return itemWrapper('📁', 'Выпадающий список', `
            <input type="text" class="dropdown-title" placeholder="Заголовок" value="${escapeHtml(title)}" style="width:100%; margin-bottom:8px;">
            ${richEditorBlock(content || '<ul><li>Пункт списка</li></ul>')}
        `, 'dropdown');
    }
    if (className.includes('quiz-block')) {
        return itemWrapper('📋', 'Опросник', `<div class="quiz-editor" data-questions='${escapeAttr(extractQuizData(el))}'></div><button class="add-quiz-question">➕ Добавить вопрос</button>`, 'quiz');
    }
    if (className.includes('info-card')) {
        const title = el.querySelector('h3')?.textContent || '';
        const items = Array.from(el.querySelectorAll('ul li')).map(li => li.textContent.trim());
        return itemWrapper('🃏', 'Карточка', `
            <input type="text" class="card-title" placeholder="Заголовок" value="${escapeHtml(title)}" style="width:100%; margin-bottom:8px;">
            <div class="list-editor" data-type="unordered">
                <div class="list-items">${items.map(i => `<div class="list-item"><input type="text" value="${escapeHtml(i)}" placeholder="Пункт списка"><button class="remove-list-item">✕</button></div>`).join('')}</div>
                <button class="add-list-item">➕ Добавить пункт</button>
            </div>
        `, 'card');
    }
    if (tagName === 'table' || (tagName === 'div' && el.querySelector('table'))) {
        const tbl = tagName === 'table' ? el : el.querySelector('table');
        const rows = [];
        tbl.querySelectorAll('tr').forEach(tr => {
            rows.push(Array.from(tr.querySelectorAll('th,td')).map(c => c.textContent.trim()));
        });
        return itemWrapper('📊', 'Таблица', `
            <div class="table-editor" data-rows='${escapeAttr(JSON.stringify(rows))}'></div>
            <div class="table-buttons" style="margin-top:8px; display:flex; gap:8px;">
                <button class="add-table-row">➕ Добавить строку</button>
                <button class="add-table-col">➕ Добавить столбец</button>
            </div>
        `, 'table');
    }
    if (className.includes('alert-bar')) {
        const text = el.querySelector('span:last-child')?.textContent || el.textContent;
        const type = className.includes('danger') ? 'danger' : (className.includes('success') ? 'success' : 'info');
        return itemWrapper('⚠️', 'Предупреждение', `
            <select class="alert-type" style="width:100%; margin-bottom:8px; padding:8px; background:var(--surface2); border:1px solid var(--border); border-radius:8px; color:var(--text);">
                <option value="danger" ${type==='danger'?'selected':''}>🔴 Важное</option>
                <option value="success" ${type==='success'?'selected':''}>🟢 Успех</option>
                <option value="info" ${type==='info'?'selected':''}>🔵 Информация</option>
            </select>
            <textarea class="alert-text" rows="2" placeholder="Текст" style="width:100%;">${escapeHtml(text)}</textarea>
        `, 'alert');
    }
    if (className.includes('hl')) {
        const text = el.textContent;
        const type = className.includes('warn') ? 'warn' : (className.includes('ok') ? 'ok' : 'info');
        return itemWrapper('💡', 'Примечание', `
            <select class="note-type" style="width:100%; margin-bottom:8px; padding:8px; background:var(--surface2); border:1px solid var(--border); border-radius:8px; color:var(--text);">
                <option value="info" ${type==='info'?'selected':''}>📘 Обычное</option>
                <option value="ok" ${type==='ok'?'selected':''}>✅ Успех</option>
                <option value="warn" ${type==='warn'?'selected':''}>⚠️ Важное</option>
            </select>
            <textarea class="note-text" rows="2" placeholder="Текст" style="width:100%;">${escapeHtml(text)}</textarea>
        `, 'note');
    }
    if (className.includes('steps') || el.querySelector?.('.step-num')) {
        const steps = [];
        el.querySelectorAll('.step').forEach(s => {
            steps.push({
                title: s.querySelector('.step-body strong')?.textContent || '',
                desc: s.querySelector('.step-body span')?.textContent || ''
            });
        });
        const stepsHtml = steps.map((s, i) => `
            <div class="step-item" style="background:var(--surface2); border-radius:8px; padding:12px; margin-bottom:8px;">
                <div class="step-header" style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                    <span class="step-num-display" style="background:var(--accent); color:white; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0;">${i+1}</span>
                    <input type="text" class="step-title" value="${escapeHtml(s.title)}" placeholder="Заголовок" style="flex:1; padding:6px 10px; background:var(--surface); border:1px solid var(--border); border-radius:6px; color:var(--text);">
                </div>
                <textarea class="step-desc" rows="2" placeholder="Описание" style="width:100%; padding:8px; background:var(--surface); border:1px solid var(--border); border-radius:6px; color:var(--text); resize:vertical;">${escapeHtml(s.desc)}</textarea>
                <button class="remove-step-btn" style="margin-top:6px; background:rgba(252,92,124,0.15); border:1px solid rgba(252,92,124,0.3); border-radius:6px; padding:4px 10px; color:var(--accent2); cursor:pointer; font-size:12px;">🗑 Удалить шаг</button>
            </div>
        `).join('');
        return itemWrapper('🔢', 'Нумерованные шаги', `
            <div class="steps-editor">${stepsHtml}</div>
            <button class="add-step-btn" style="margin-top:6px; background:var(--accent-glow); border:1px solid var(--accent); border-radius:6px; padding:6px 12px; color:var(--accent); cursor:pointer; font-size:12px;">➕ Добавить шаг</button>
        `, 'steps');
    }
    if (el.querySelector?.('ul') && !className.includes('info-card')) {
        const items = Array.from(el.querySelectorAll('li')).map(li => li.textContent.trim());
        return itemWrapper('📋', 'Маркированный список', `
            <div class="list-editor" data-type="unordered">
                <div class="list-items">${items.map(i => `<div class="list-item"><input type="text" value="${escapeHtml(i)}" placeholder="Пункт"><button class="remove-list-item">✕</button></div>`).join('')}</div>
                <button class="add-list-item">➕ Добавить пункт</button>
            </div>
        `, 'list');
    }
    // Default: rich text
    return itemWrapper('📝', 'Текст', richEditorBlock(el.innerHTML), 'text');
}

function extractQuizData(el) {
    const questions = [];
    el.querySelectorAll('.quiz-question').forEach(q => {
        const text = q.querySelector('.quiz-question-text')?.textContent?.replace(/^\d+\.\s*/, '') || '';
        const options = Array.from(q.querySelectorAll('.quiz-option span')).map(s => s.textContent.trim());
        questions.push({ text, options, correct: 0 });
    });
    return JSON.stringify(questions);
}

function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

// ========== ДОБАВЛЕНИЕ НОВОГО ЭЛЕМЕНТА ==========
function addElementToEditor(editorArea, action) {
    const emptyMsg = editorArea.querySelector('.editor-empty');
    if (emptyMsg) emptyMsg.remove();

    let html = '';
    switch(action) {
        case 'add-text':
            html = itemWrapper('📝', 'Текст', richEditorBlock(), 'text');
            break;
        case 'add-list':
            html = itemWrapper('📋', 'Маркированный список', `
                <div class="list-editor" data-type="unordered">
                    <div class="list-items"><div class="list-item"><input type="text" placeholder="Пункт списка"><button class="remove-list-item">✕</button></div></div>
                    <button class="add-list-item">➕ Добавить пункт</button>
                </div>
            `, 'list');
            break;
        case 'add-numbered-list':
            html = itemWrapper('🔢', 'Нумерованные шаги', `
                <div class="steps-editor">
                    <div class="step-item" style="background:var(--surface2); border-radius:8px; padding:12px; margin-bottom:8px;">
                        <div class="step-header" style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                            <span class="step-num-display" style="background:var(--accent); color:white; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0;">1</span>
                            <input type="text" class="step-title" placeholder="Заголовок" style="flex:1; padding:6px 10px; background:var(--surface); border:1px solid var(--border); border-radius:6px; color:var(--text);">
                        </div>
                        <textarea class="step-desc" rows="2" placeholder="Описание" style="width:100%; padding:8px; background:var(--surface); border:1px solid var(--border); border-radius:6px; color:var(--text); resize:vertical;"></textarea>
                        <button class="remove-step-btn" style="margin-top:6px; background:rgba(252,92,124,0.15); border:1px solid rgba(252,92,124,0.3); border-radius:6px; padding:4px 10px; color:var(--accent2); cursor:pointer; font-size:12px;">🗑 Удалить шаг</button>
                    </div>
                </div>
                <button class="add-step-btn" style="margin-top:6px; background:var(--accent-glow); border:1px solid var(--accent); border-radius:6px; padding:6px 12px; color:var(--accent); cursor:pointer; font-size:12px;">➕ Добавить шаг</button>
            `, 'steps');
            break;
        case 'add-table':
            html = itemWrapper('📊', 'Таблица', `
                <div class="table-editor" data-rows='[["Заголовок 1","Заголовок 2"],["Данные 1","Данные 2"]]'></div>
                <div class="table-buttons" style="margin-top:8px; display:flex; gap:8px;">
                    <button class="add-table-row">➕ Добавить строку</button>
                    <button class="add-table-col">➕ Добавить столбец</button>
                </div>
            `, 'table');
            break;
        case 'add-alert':
            html = itemWrapper('⚠️', 'Предупреждение', `
                <select class="alert-type" style="width:100%; margin-bottom:8px; padding:8px; background:var(--surface2); border:1px solid var(--border); border-radius:8px; color:var(--text);">
                    <option value="danger">🔴 Важное</option>
                    <option value="success">🟢 Успех</option>
                    <option value="info">🔵 Информация</option>
                </select>
                <textarea class="alert-text" rows="2" placeholder="Текст" style="width:100%;"></textarea>
            `, 'alert');
            break;
        case 'add-note':
            html = itemWrapper('💡', 'Примечание', `
                <select class="note-type" style="width:100%; margin-bottom:8px; padding:8px; background:var(--surface2); border:1px solid var(--border); border-radius:8px; color:var(--text);">
                    <option value="info">📘 Обычное</option>
                    <option value="ok">✅ Успех</option>
                    <option value="warn">⚠️ Важное</option>
                </select>
                <textarea class="note-text" rows="2" placeholder="Текст" style="width:100%;"></textarea>
            `, 'note');
            break;
        case 'add-dropdown':
            html = itemWrapper('📁', 'Выпадающий список', `
                <input type="text" class="dropdown-title" placeholder="Заголовок" style="width:100%; margin-bottom:8px;">
                ${richEditorBlock()}
            `, 'dropdown');
            break;
        case 'add-card':
            html = itemWrapper('🃏', 'Карточка', `
                <input type="text" class="card-title" placeholder="Заголовок карточки" style="width:100%; margin-bottom:8px;">
                <div class="list-editor" data-type="unordered">
                    <div class="list-items"><div class="list-item"><input type="text" placeholder="Пункт списка"><button class="remove-list-item">✕</button></div></div>
                    <button class="add-list-item">➕ Добавить пункт</button>
                </div>
            `, 'card');
            break;
        case 'add-quiz':
            html = itemWrapper('📋', 'Опросник', `
                <div class="quiz-editor" data-questions='[]'></div>
                <button class="add-quiz-question" style="margin-top:8px; background:var(--accent-glow); border:1px solid var(--accent); border-radius:6px; padding:6px 12px; color:var(--accent); cursor:pointer;">➕ Добавить вопрос</button>
            `, 'quiz');
            break;
    }

    editorArea.insertAdjacentHTML('beforeend', html);
    const lastItem = editorArea.lastElementChild;
    if (lastItem) {
        const te = lastItem.querySelector('.table-editor');
        if (te) initTableEditor(te);
        setupRemoveButtons(editorArea);
        setupRichEditors(lastItem);
        setupListEditors(lastItem);
        setupStepsEditors(lastItem);
        setupQuizEditors(lastItem);
        setupDragAndDrop(editorArea);
        lastItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ========== RICH EDITORS ==========
function setupRichEditors(container) {
    container.querySelectorAll('.rich-editor').forEach(editor => {
        const toolbar = editor.closest('.rich-editor-container')?.querySelector('.format-toolbar');
        if (toolbar) {
            toolbar.querySelectorAll('.format-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const format = btn.dataset.format;
                    if (format === 'h3') {
                        document.execCommand('formatBlock', false, 'h3');
                    } else {
                        document.execCommand(format, false, null);
                    }
                    editor.focus();
                });
            });
        }
    });
}

// ========== LIST EDITORS ==========
function setupListEditors(container) {
    container.querySelectorAll('.list-editor').forEach(editor => {
        const addBtn = editor.querySelector('.add-list-item');
        if (addBtn && !addBtn._listInit) {
            addBtn._listInit = true;
            addBtn.addEventListener('click', () => {
                const itemsContainer = editor.querySelector('.list-items');
                const newItem = document.createElement('div');
                newItem.className = 'list-item';
                newItem.innerHTML = `<input type="text" placeholder="Пункт списка"><button class="remove-list-item">✕</button>`;
                newItem.querySelector('.remove-list-item').addEventListener('click', () => newItem.remove());
                itemsContainer.appendChild(newItem);
                newItem.querySelector('input').focus();
            });
        }
        editor.querySelectorAll('.remove-list-item').forEach(btn => {
            if (!btn._rmInit) {
                btn._rmInit = true;
                btn.addEventListener('click', () => btn.closest('.list-item').remove());
            }
        });
    });
}

// ========== STEPS EDITORS ==========
function setupStepsEditors(container) {
    container.querySelectorAll('.steps-editor').forEach(editor => {
        const addBtn = editor.closest('.editor-item-content')?.querySelector('.add-step-btn');
        if (addBtn && !addBtn._stepInit) {
            addBtn._stepInit = true;
            addBtn.addEventListener('click', () => {
                const stepNum = editor.querySelectorAll('.step-item').length + 1;
                const newStep = document.createElement('div');
                newStep.className = 'step-item';
                newStep.style.cssText = 'background:var(--surface2); border-radius:8px; padding:12px; margin-bottom:8px;';
                newStep.innerHTML = `
                    <div class="step-header" style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <span class="step-num-display" style="background:var(--accent); color:white; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0;">${stepNum}</span>
                        <input type="text" class="step-title" placeholder="Заголовок" style="flex:1; padding:6px 10px; background:var(--surface); border:1px solid var(--border); border-radius:6px; color:var(--text);">
                    </div>
                    <textarea class="step-desc" rows="2" placeholder="Описание" style="width:100%; padding:8px; background:var(--surface); border:1px solid var(--border); border-radius:6px; color:var(--text); resize:vertical;"></textarea>
                    <button class="remove-step-btn" style="margin-top:6px; background:rgba(252,92,124,0.15); border:1px solid rgba(252,92,124,0.3); border-radius:6px; padding:4px 10px; color:var(--accent2); cursor:pointer; font-size:12px;">🗑 Удалить шаг</button>
                `;
                const removeBtn = newStep.querySelector('.remove-step-btn');
                removeBtn.addEventListener('click', () => { newStep.remove(); updateStepNumbers(editor); });
                editor.appendChild(newStep);
                updateStepNumbers(editor);
            });
        }
        editor.querySelectorAll('.remove-step-btn').forEach(btn => {
            if (!btn._rmInit) {
                btn._rmInit = true;
                btn.addEventListener('click', () => { btn.closest('.step-item').remove(); updateStepNumbers(editor); });
            }
        });
    });
}

function updateStepNumbers(editor) {
    editor.querySelectorAll('.step-item').forEach((step, idx) => {
        const num = step.querySelector('.step-num-display');
        if (num) num.textContent = idx + 1;
    });
}

// ========== REMOVE BUTTONS ==========
function setupRemoveButtons(container) {
    container.querySelectorAll('.remove-editor-item').forEach(btn => {
        if (!btn._rmInit) {
            btn._rmInit = true;
            btn.addEventListener('click', (e) => {
                const item = e.target.closest('.editor-item');
                if (item) item.remove();
                const editorArea = container.id === 'editorArea' ? container : container.querySelector('#editorArea');
                const area = editorArea || document.getElementById('editorArea');
                if (area && area.querySelectorAll('.editor-item').length === 0) {
                    area.innerHTML = '<div class="editor-empty">Нажмите кнопку выше, чтобы добавить элемент</div>';
                }
            });
        }
    });

    // Table row/col buttons
    container.querySelectorAll('.add-table-row').forEach(btn => {
        if (btn._tableInit) return;
        btn._tableInit = true;
        btn.addEventListener('click', (e) => {
            const te = e.target.closest('.editor-item-content').querySelector('.table-editor');
            const rows = JSON.parse(te.dataset.rows || '[]');
            const cols = rows[0]?.length || 2;
            rows.push(Array(cols).fill(''));
            te.dataset.rows = JSON.stringify(rows);
            initTableEditor(te);
        });
    });

    container.querySelectorAll('.add-table-col').forEach(btn => {
        if (btn._tableInit) return;
        btn._tableInit = true;
        btn.addEventListener('click', (e) => {
            const te = e.target.closest('.editor-item-content').querySelector('.table-editor');
            let rows = JSON.parse(te.dataset.rows || '[]');
            rows = rows.map(row => [...row, '']);
            te.dataset.rows = JSON.stringify(rows);
            initTableEditor(te);
        });
    });
}

// ========== TABLE EDITOR ==========
function initTableEditor(container) {
    let rows = JSON.parse(container.dataset.rows || '[]');
    if (rows.length === 0) rows.push(['Заголовок', ''], ['', '']);

    let html = '<table class="editor-table" style="width:100%; border-collapse:collapse; font-size:13px;"><thead><tr>';
    for (let i = 0; i < rows[0].length; i++) {
        html += `<th style="border:1px solid var(--border); padding:6px; background:var(--surface2);">
            <input type="text" class="table-header" value="${escapeHtml(rows[0][i]||'')}" placeholder="Заголовок ${i+1}"
                style="width:100%; background:transparent; border:none; padding:2px; color:var(--text); font-weight:600;">
        </th>`;
    }
    html += `<th style="width:36px; border:1px solid var(--border);"></th></tr></thead><tbody>`;
    for (let i = 1; i < rows.length; i++) {
        html += '<tr>';
        for (let j = 0; j < rows[i].length; j++) {
            html += `<td style="border:1px solid var(--border); padding:6px;">
                <input type="text" class="table-cell" value="${escapeHtml(rows[i][j]||'')}" placeholder="Значение"
                    style="width:100%; background:transparent; border:none; padding:2px; color:var(--text);">
                </td>`;
        }
        html += `<td style="border:1px solid var(--border); text-align:center; padding:4px;">
            <button class="remove-table-row" style="background:rgba(252,92,124,0.15); border:none; border-radius:4px; padding:3px 7px; cursor:pointer; color:var(--accent2);">🗑</button>
        </td></tr>`;
    }
    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll('.remove-table-row').forEach(btn => {
        btn.addEventListener('click', (e) => { e.target.closest('tr').remove(); updateTableData(container); });
    });
    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => updateTableData(container));
    });
}

function updateTableData(container) {
    const rows = [];
    const headers = Array.from(container.querySelectorAll('thead input')).map(h => h.value);
    rows.push(headers);
    container.querySelectorAll('tbody tr').forEach(row => {
        const cells = Array.from(row.querySelectorAll('td input')).map(c => c.value);
        if (cells.length) rows.push(cells);
    });
    container.dataset.rows = JSON.stringify(rows);
}

// ========== QUIZ EDITOR ==========
function setupQuizEditors(container) {
    container.querySelectorAll('.quiz-editor').forEach(editor => {
        initQuizEditor(editor);
        const addBtn = editor.closest('.editor-item-content')?.querySelector('.add-quiz-question');
        if (addBtn && !addBtn._quizInit) {
            addBtn._quizInit = true;
            addBtn.addEventListener('click', () => handleAddQuestion(editor));
        }
    });
}

function initQuizEditor(editor) {
    let questions = [];
    try { questions = JSON.parse(editor.dataset.questions || '[]'); } catch(e) {}
    editor.innerHTML = '';
    if (questions.length === 0) {
        editor.innerHTML = `<div style="color:var(--muted); font-size:12px; padding:12px; text-align:center; background:var(--surface2); border-radius:8px;">📋 Нажмите "Добавить вопрос" чтобы создать опросник</div>`;
    } else {
        questions.forEach((q, idx) => {
            const qId = Date.now() + idx;
            const qDiv = document.createElement('div');
            qDiv.className = 'quiz-question-editor';
            qDiv.style.cssText = 'background:var(--surface2); border-radius:12px; padding:16px; margin-bottom:12px; border-left:3px solid var(--accent);';
            qDiv.innerHTML = `
                <div style="margin-bottom:10px;">
                    <label style="display:block; margin-bottom:5px; font-size:11px; color:var(--muted);">📝 Вопрос:</label>
                    <input type="text" class="quiz-question-text" value="${escapeHtml(q.text)}" placeholder="Введите вопрос"
                        style="width:100%; padding:8px; background:var(--surface); border:1px solid var(--border); border-radius:6px; color:var(--text);">
                </div>
                <div class="quiz-options-editor" style="margin-bottom:8px;">
                    ${(q.options || []).map((opt, oi) => `
                        <div class="quiz-option-editor" style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
                            <input type="text" value="${escapeHtml(opt)}" placeholder="Вариант"
                                style="flex:1; padding:7px; background:var(--surface); border:1px solid var(--border); border-radius:6px; color:var(--text);">
                            <label style="display:flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap; font-size:11px; color:var(--accent3);">
                                <input type="radio" name="correct_${qId}" value="${oi}" ${q.correct===oi?'checked':''}>✓ Верный
                            </label>
                            <button class="remove-option-btn" style="background:rgba(252,92,124,0.15); border:none; border-radius:5px; padding:5px 8px; color:var(--accent2); cursor:pointer;">🗑</button>
                        </div>
                    `).join('')}
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="add-option-btn" style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:5px 10px; color:var(--text); cursor:pointer; font-size:12px;">➕ Вариант</button>
                    <button class="remove-question-btn" style="background:rgba(252,92,124,0.15); border:1px solid rgba(252,92,124,0.3); border-radius:6px; padding:5px 10px; color:var(--accent2); cursor:pointer; font-size:12px;">🗑 Вопрос</button>
                </div>
            `;
            editor.appendChild(qDiv);
            setupQuestionHandlers(qDiv, qId);
        });
    }
}

function handleAddQuestion(editor) {
    const placeholder = editor.querySelector('div[style*="text-align:center"]');
    if (placeholder) placeholder.remove();
    const qId = Date.now();
    const qDiv = document.createElement('div');
    qDiv.className = 'quiz-question-editor';
    qDiv.style.cssText = 'background:var(--surface2); border-radius:12px; padding:16px; margin-bottom:12px; border-left:3px solid var(--accent);';
    qDiv.innerHTML = `
        <div style="margin-bottom:10px;">
            <label style="display:block; margin-bottom:5px; font-size:11px; color:var(--muted);">📝 Вопрос:</label>
            <input type="text" class="quiz-question-text" placeholder="Введите вопрос"
                style="width:100%; padding:8px; background:var(--surface); border:1px solid var(--border); border-radius:6px; color:var(--text);">
        </div>
        <div class="quiz-options-editor" style="margin-bottom:8px;">
            <div class="quiz-option-editor" style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
                <input type="text" placeholder="Вариант ответа" style="flex:1; padding:7px; background:var(--surface); border:1px solid var(--border); border-radius:6px; color:var(--text);">
                <label style="display:flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap; font-size:11px; color:var(--accent3);">
                    <input type="radio" name="correct_${qId}" value="0" checked>✓ Верный
                </label>
                <button class="remove-option-btn" style="background:rgba(252,92,124,0.15); border:none; border-radius:5px; padding:5px 8px; color:var(--accent2); cursor:pointer;">🗑</button>
            </div>
        </div>
        <div style="display:flex; gap:8px;">
            <button class="add-option-btn" style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:5px 10px; color:var(--text); cursor:pointer; font-size:12px;">➕ Вариант</button>
            <button class="remove-question-btn" style="background:rgba(252,92,124,0.15); border:1px solid rgba(252,92,124,0.3); border-radius:6px; padding:5px 10px; color:var(--accent2); cursor:pointer; font-size:12px;">🗑 Вопрос</button>
        </div>
    `;
    editor.appendChild(qDiv);
    setupQuestionHandlers(qDiv, qId);
    qDiv.querySelector('input').focus();
}

function setupQuestionHandlers(qDiv, qId) {
    qDiv.querySelector('.add-option-btn')?.addEventListener('click', () => {
        const optCont = qDiv.querySelector('.quiz-options-editor');
        const count = optCont.querySelectorAll('.quiz-option-editor').length;
        const newOpt = document.createElement('div');
        newOpt.className = 'quiz-option-editor';
        newOpt.style.cssText = 'display:flex; gap:8px; align-items:center; margin-bottom:6px;';
        newOpt.innerHTML = `
            <input type="text" placeholder="Вариант ответа" style="flex:1; padding:7px; background:var(--surface); border:1px solid var(--border); border-radius:6px; color:var(--text);">
            <label style="display:flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap; font-size:11px; color:var(--accent3);">
                <input type="radio" name="correct_${qId}" value="${count}">✓ Верный
            </label>
            <button class="remove-option-btn" style="background:rgba(252,92,124,0.15); border:none; border-radius:5px; padding:5px 8px; color:var(--accent2); cursor:pointer;">🗑</button>
        `;
        optCont.appendChild(newOpt);
        newOpt.querySelector('.remove-option-btn').addEventListener('click', () => newOpt.remove());
        newOpt.querySelector('input[type=text]').focus();
    });
    qDiv.querySelector('.remove-question-btn')?.addEventListener('click', () => qDiv.remove());
    qDiv.querySelectorAll('.remove-option-btn').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.quiz-option-editor').remove());
    });
}

// ========== HTML → СОХРАНЕНИЕ ==========
function convertEditorToHtml(editorArea) {
    let html = '';
    editorArea.querySelectorAll('.editor-item').forEach(item => {
        const type = item.dataset.type;
        switch(type) {
            case 'text': {
                const content = item.querySelector('.rich-editor')?.innerHTML || '';
                if (content.trim()) html += `<div>${content}</div>`;
                break;
            }
            case 'list': {
                const items = Array.from(item.querySelectorAll('.list-item input')).map(i => i.value.trim()).filter(Boolean);
                if (items.length) html += `<ul>${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
                break;
            }
            case 'steps': {
                const steps = [];
                item.querySelectorAll('.step-item').forEach(s => {
                    const title = s.querySelector('.step-title')?.value.trim() || '';
                    const desc = s.querySelector('.step-desc')?.value.trim() || '';
                    if (title || desc) steps.push({ title, desc });
                });
                if (steps.length) {
                    html += '<div class="steps">' + steps.map((s, i) => `
                        <div class="step">
                            <div class="step-num">${i+1}</div>
                            <div class="step-body">
                                <strong>${escapeHtml(s.title)}</strong>
                                <span>${escapeHtml(s.desc)}</span>
                            </div>
                        </div>`).join('') + '</div>';
                }
                break;
            }
            case 'table': {
                updateTableData(item.querySelector('.table-editor'));
                const rows = JSON.parse(item.querySelector('.table-editor')?.dataset.rows || '[]');
                if (rows.length > 1) {
                    html += `<table class="ref-table"><thead> <tr>${rows[0].map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr> </thead><tbody>`;
                    for (let i = 1; i < rows.length; i++) {
                        html += `<tr>${rows[i].map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`;
                    }
                    html += '</tbody></table>';
                }
                break;
            }
            case 'alert': {
                const alertType = item.querySelector('.alert-type')?.value || 'info';
                const alertText = item.querySelector('.alert-text')?.value || '';
                if (alertText) {
                    const icon = alertType === 'danger' ? '🚨' : (alertType === 'success' ? '✅' : 'ℹ️');
                    html += `<div class="alert-bar ${alertType}"><span>${icon}</span><span>${escapeHtml(alertText)}</span></div>`;
                }
                break;
            }
            case 'note': {
                const noteType = item.querySelector('.note-type')?.value || 'info';
                const noteText = item.querySelector('.note-text')?.value || '';
                if (noteText) {
                    const cls = noteType === 'warn' ? 'hl warn' : (noteType === 'ok' ? 'hl ok' : 'hl info');
                    html += `<div class="${cls}">${escapeHtml(noteText)}</div>`;
                }
                break;
            }
            case 'dropdown': {
                const dtitle = item.querySelector('.dropdown-title')?.value || '';
                    // Получаем контент из rich-editor и преобразуем его в правильную структуру
                let dcontent = item.querySelector('.rich-editor')?.innerHTML || '';
    
                    // Если контент пустой, создаем структуру по умолчанию
                    if (!dcontent.trim()) {
                        dcontent = '<ul><li><strong>Пример пункта 1</strong> — описание</li><li><strong>Пример пункта 2</strong> — описание</li><li><strong>Пример пункта 3</strong> — описание</li></ul>';
                    }
    
                    if (dtitle || dcontent) {
                        html += `<details>
                            <summary>${escapeHtml(dtitle)}</summary>
                            <div class="acc-body">
                                ${dcontent}
                            </div>
                        </details>`;
                    }
                    break;
                }
            case 'card': {
                const ctitle = item.querySelector('.card-title')?.value || '';
                const citems = Array.from(item.querySelectorAll('.list-item input')).map(i => i.value.trim()).filter(Boolean);
                if (ctitle || citems.length) {
                    html += `<div class="info-card">${ctitle ? `<h3>${escapeHtml(ctitle)}</h3>` : ''}${citems.length ? `<ul>${citems.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` : ''}</div>`;
                }
                break;
            }
            case 'quiz': {
                const questions = [];
                item.querySelectorAll('.quiz-question-editor').forEach(q => {
                    const text = q.querySelector('.quiz-question-text')?.value.trim() || '';
                    const options = Array.from(q.querySelectorAll('.quiz-option-editor input[type=text]')).map(i => i.value.trim());
                    const correctR = q.querySelector('input[type=radio]:checked');
                    const correct = correctR ? parseInt(correctR.value) : 0;
                    if (text && options.length >= 2) questions.push({ text, options, correct });
                });
                if (questions.length) {
                    const ts = Date.now();
                    html += `<div class="quiz-block"><div class="quiz-title">📋 Опросник</div>` +
                        questions.map((q, qi) => `
                            <div class="quiz-question">
                                <div class="quiz-question-text">${qi+1}. ${escapeHtml(q.text)}</div>
                                <div class="quiz-options">
                                    ${q.options.map((opt, oi) => `
                                        <label class="quiz-option">
                                            <input type="radio" name="quiz_${ts}_${qi}" value="${oi}">
                                            <span>${escapeHtml(opt)}</span>
                                        </label>`).join('')}
                                </div>
                                <div class="quiz-answer" id="qa_${ts}_${qi}"></div>
                            </div>`).join('') +
                        `<button class="quiz-btn" onclick="checkQuizInline(this)">✅ Проверить</button>
                         <button class="quiz-btn quiz-reset" onclick="resetQuizInline(this)">🔄 Сбросить</button>
                         <div class="quiz-result"></div></div>`;
                }
                break;
            }
        }
    });
    return html;
}

// ========== QUIZ RUNTIME ==========
window.checkQuizInline = function(btn) {
    const quizBlock = btn.closest('.quiz-block');
    let correctCount = 0;
    quizBlock.querySelectorAll('.quiz-question').forEach(q => {
        const selected = q.querySelector('input[type=radio]:checked');
        const ansDiv = q.querySelector('.quiz-answer');
        const isCorrect = selected && selected.value === '0';
        if (isCorrect) correctCount++;
        if (ansDiv) {
            ansDiv.innerHTML = isCorrect ? '✅ Правильно!' : '❌ Неправильно.';
            ansDiv.className = 'quiz-answer show ' + (isCorrect ? 'correct' : 'incorrect');
        }
    });
    const questions = quizBlock.querySelectorAll('.quiz-question');
    const pct = Math.round((correctCount / questions.length) * 100);
    const resultDiv = quizBlock.querySelector('.quiz-result');
    resultDiv.innerHTML = `Результат: ${correctCount} из ${questions.length} (${pct}%)`;
    resultDiv.className = 'quiz-result show ' + (pct >= 70 ? 'success' : 'fail');
};

window.resetQuizInline = function(btn) {
    const quizBlock = btn.closest('.quiz-block');
    quizBlock.querySelectorAll('input[type=radio]').forEach(r => r.checked = false);
    quizBlock.querySelectorAll('.quiz-answer').forEach(a => { a.innerHTML = ''; a.className = 'quiz-answer'; });
    const r = quizBlock.querySelector('.quiz-result');
    if (r) { r.innerHTML = ''; r.className = 'quiz-result'; }
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}
