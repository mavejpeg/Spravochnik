// editor.js - полная версия визуального редактора

let isRop = false;

async function getUserRole() {
    try {
        const response = await fetch('/api/check-auth', { credentials: 'include' });
        const data = await response.json();
        if (data.authenticated) {
            isRop = (data.user.role === 'rop' || data.user.role === 'root');
            window.isRopGlobal = isRop;
            return isRop;
        }
        return false;
    } catch (error) {
        console.error('Error getting user role:', error);
        return false;
    }
}

function setupEditButtons() {
    const editBtns = document.querySelectorAll('.btn-edit-content');
    console.log('Editor.js: Found edit buttons:', editBtns.length);
    
    editBtns.forEach(btn => {
        btn.removeEventListener('click', handleEditClick);
        btn.addEventListener('click', handleEditClick);
        btn.style.display = isRop ? 'inline-flex' : 'none';
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
        console.error('Content div not found:', `${section}-content`);
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
                    ${parseContentToEditor(currentHtml)}
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
    
    const editorArea = modal.querySelector('#editorArea');
    
    const toolBtns = modal.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = btn.dataset.action;
            addElementToEditor(editorArea, action);
        });
    });
    
    setupRemoveButtons(editorArea);
    setupRichEditors(editorArea);
    setupListEditors(editorArea);
    setupStepsEditors(editorArea);
    setupQuizEditors(editorArea);
    
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
        const newContent = convertEditorToHtml(editorArea);
        
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

function parseContentToEditor(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    let result = '';
    
    const elements = tempDiv.children;
    for (let i = 0; i < elements.length; i++) {
        result += convertElementToEditorItem(elements[i]);
    }
    return result || '<div class="editor-empty">Нажмите кнопку выше, чтобы добавить элемент</div>';
}

function convertElementToEditorItem(el) {
    const className = el.className;
    const tagName = el.tagName.toLowerCase();
    
    if (tagName === 'details') {
        const title = el.querySelector('summary')?.innerHTML.replace(/<span.*<\/span>/, '').trim() || '';
        const content = Array.from(el.querySelectorAll(':scope > :not(summary)')).map(c => c.outerHTML).join('');
        return `
            <div class="editor-item dropdown-item" data-type="dropdown">
                <div class="editor-item-header"><span>📁 Выпадающий список</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <input type="text" class="dropdown-title" placeholder="Заголовок" value="${escapeHtml(title)}">
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
                </div>
            </div>
        `;
    }
    else if (className.includes('info-card')) {
        const title = el.querySelector('h3')?.innerHTML || '';
        const items = Array.from(el.querySelectorAll('ul li')).map(li => li.innerHTML).join('\n');
        return `
            <div class="editor-item card-item" data-type="card">
                <div class="editor-item-header"><span>🃏 Карточка</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <input type="text" class="card-title" placeholder="Заголовок" value="${escapeHtml(title)}">
                    <div class="list-editor" data-type="unordered">
                        <div class="list-items">${items.split('\n').filter(i => i.trim()).map(item => `<div class="list-item"><input type="text" value="${escapeHtml(item)}" placeholder="Пункт списка"><button class="remove-list-item">✕</button></div>`).join('')}</div>
                        <button class="add-list-item">➕ Добавить пункт</button>
                    </div>
                </div>
            </div>
        `;
    }
    else if (tagName === 'table') {
        const rows = [];
        const trs = el.querySelectorAll('tr');
        trs.forEach(tr => {
            const cells = Array.from(tr.querySelectorAll('th, td')).map(cell => cell.innerHTML);
            rows.push(cells);
        });
        return `
            <div class="editor-item table-item" data-type="table">
                <div class="editor-item-header"><span>📊 Таблица</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <div class="table-editor" data-rows='${JSON.stringify(rows)}'></div>
                    <div class="table-buttons">
                        <button class="add-table-row">➕ Добавить строку</button>
                        <button class="add-table-col">➕ Добавить столбец</button>
                    </div>
                </div>
            </div>
        `;
    }
    else if (className.includes('alert-bar')) {
        const text = el.querySelector('span:last-child')?.innerHTML || el.innerHTML;
        const type = className.includes('danger') ? 'danger' : (className.includes('success') ? 'success' : 'info');
        return `
            <div class="editor-item alert-item" data-type="alert">
                <div class="editor-item-header"><span>⚠️ Предупреждение</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <select class="alert-type">
                        <option value="danger" ${type === 'danger' ? 'selected' : ''}>🔴 Важное</option>
                        <option value="success" ${type === 'success' ? 'selected' : ''}>🟢 Успех</option>
                        <option value="info" ${type === 'info' ? 'selected' : ''}>🔵 Информация</option>
                    </select>
                    <textarea class="alert-text" rows="2" placeholder="Текст">${escapeHtml(text)}</textarea>
                </div>
            </div>
        `;
    }
    else if (className.includes('hl')) {
        const text = el.innerHTML;
        const type = className.includes('warn') ? 'warn' : (className.includes('ok') ? 'ok' : 'info');
        return `
            <div class="editor-item note-item" data-type="note">
                <div class="editor-item-header"><span>💡 Примечание</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <select class="note-type">
                        <option value="info" ${type === 'info' ? 'selected' : ''}>📘 Обычное</option>
                        <option value="ok" ${type === 'ok' ? 'selected' : ''}>✅ Успех</option>
                        <option value="warn" ${type === 'warn' ? 'selected' : ''}>⚠️ Важное</option>
                    </select>
                    <textarea class="note-text" rows="2" placeholder="Текст">${escapeHtml(text)}</textarea>
                </div>
            </div>
        `;
    }
    else if (className.includes('steps') || (el.querySelector('.step') && el.querySelector('.step-num'))) {
        const steps = [];
        const stepDivs = el.querySelectorAll('.step');
        stepDivs.forEach(step => {
            const num = step.querySelector('.step-num')?.textContent.trim() || '';
            const title = step.querySelector('.step-body strong')?.innerHTML || '';
            const desc = step.querySelector('.step-body span')?.innerHTML || '';
            steps.push({ num, title, desc });
        });
        let stepsHtml = '';
        steps.forEach((step, idx) => {
            stepsHtml += `
                <div class="step-item">
                    <div class="step-header"><span class="step-num-display">${step.num || idx+1}</span><input type="text" class="step-title" value="${escapeHtml(step.title)}" placeholder="Заголовок"></div>
                    <textarea class="step-desc" rows="2" placeholder="Описание">${escapeHtml(step.desc)}</textarea>
                    <button class="remove-step-btn">🗑 Удалить шаг</button>
                </div>
            `;
        });
        return `
            <div class="editor-item steps-item" data-type="steps">
                <div class="editor-item-header"><span>🔢 Нумерованный список</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <div class="steps-editor">${stepsHtml}</div>
                    <button class="add-step-btn">➕ Добавить шаг</button>
                </div>
            </div>
        `;
    }
    else if (el.querySelector('ul') && !className.includes('info-card')) {
        const items = Array.from(el.querySelectorAll('li')).map(li => li.innerHTML);
        return `
            <div class="editor-item list-item" data-type="list">
                <div class="editor-item-header"><span>📋 Маркированный список</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <div class="list-editor" data-type="unordered">
                        <div class="list-items">${items.map(item => `<div class="list-item"><input type="text" value="${escapeHtml(item)}" placeholder="Пункт списка"><button class="remove-list-item">✕</button></div>`).join('')}</div>
                        <button class="add-list-item">➕ Добавить пункт</button>
                    </div>
                </div>
            </div>
        `;
    }
    else {
        return `
            <div class="editor-item text-item" data-type="text">
                <div class="editor-item-header"><span>📝 Текст</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <div class="rich-editor-container">
                        <div class="format-toolbar">
                            <button class="format-btn" data-format="bold"><b>B</b></button>
                            <button class="format-btn" data-format="italic"><i>I</i></button>
                            <button class="format-btn" data-format="underline"><u>U</u></button>
                            <button class="format-btn" data-format="h3">H3</button>
                            <button class="format-btn" data-format="insertUnorderedList">• Список</button>
                            <button class="format-btn" data-format="insertOrderedList">1. Нумер.</button>
                        </div>
                        <div class="rich-editor" contenteditable="true">${el.innerHTML}</div>
                    </div>
                </div>
            </div>
        `;
    }
}

function addElementToEditor(editorArea, type) {
    let html = '';
    
    switch(type) {
        case 'add-text':
            html = `
                <div class="editor-item text-item" data-type="text">
                    <div class="editor-item-header"><span>📝 Текст</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <div class="rich-editor-container">
                            <div class="format-toolbar">
                                <button class="format-btn" data-format="bold"><b>B</b></button>
                                <button class="format-btn" data-format="italic"><i>I</i></button>
                                <button class="format-btn" data-format="underline"><u>U</u></button>
                                <button class="format-btn" data-format="h3">H3</button>
                                <button class="format-btn" data-format="insertUnorderedList">• Список</button>
                                <button class="format-btn" data-format="insertOrderedList">1. Нумер.</button>
                            </div>
                            <div class="rich-editor" contenteditable="true"></div>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'add-list':
            html = `
                <div class="editor-item list-item" data-type="list">
                    <div class="editor-item-header"><span>📋 Маркированный список</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <div class="list-editor" data-type="unordered">
                            <div class="list-items"><div class="list-item"><input type="text" placeholder="Пункт списка"><button class="remove-list-item">✕</button></div></div>
                            <button class="add-list-item">➕ Добавить пункт</button>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'add-numbered-list':
            html = `
                <div class="editor-item steps-item" data-type="steps">
                    <div class="editor-item-header"><span>🔢 Нумерованный список</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <div class="steps-editor">
                            <div class="step-item">
                                <div class="step-header"><span class="step-num-display">1</span><input type="text" class="step-title" placeholder="Заголовок"></div>
                                <textarea class="step-desc" rows="2" placeholder="Описание"></textarea>
                                <button class="remove-step-btn">🗑 Удалить шаг</button>
                            </div>
                        </div>
                        <button class="add-step-btn">➕ Добавить шаг</button>
                    </div>
                </div>
            `;
            break;
        case 'add-table':
            html = `
                <div class="editor-item table-item" data-type="table">
                    <div class="editor-item-header"><span>📊 Таблица</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <div class="table-editor" data-rows='[["Заголовок 1", "Заголовок 2"], ["Данные 1", "Данные 2"]]'></div>
                        <div class="table-buttons">
                            <button class="add-table-row">➕ Добавить строку</button>
                            <button class="add-table-col">➕ Добавить столбец</button>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'add-alert':
            html = `
                <div class="editor-item alert-item" data-type="alert">
                    <div class="editor-item-header"><span>⚠️ Предупреждение</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <select class="alert-type">
                            <option value="danger">🔴 Важное</option>
                            <option value="success">🟢 Успех</option>
                            <option value="info">🔵 Информация</option>
                        </select>
                        <textarea class="alert-text" rows="2" placeholder="Текст"></textarea>
                    </div>
                </div>
            `;
            break;
        case 'add-note':
            html = `
                <div class="editor-item note-item" data-type="note">
                    <div class="editor-item-header"><span>💡 Примечание</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <select class="note-type">
                            <option value="info">📘 Обычное</option>
                            <option value="ok">✅ Успех</option>
                            <option value="warn">⚠️ Важное</option>
                        </select>
                        <textarea class="note-text" rows="2" placeholder="Текст"></textarea>
                    </div>
                </div>
            `;
            break;
        case 'add-dropdown':
            html = `
                <div class="editor-item dropdown-item" data-type="dropdown">
                    <div class="editor-item-header"><span>📁 Выпадающий список</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <input type="text" class="dropdown-title" placeholder="Заголовок">
                        <div class="rich-editor-container">
                            <div class="format-toolbar">
                                <button class="format-btn" data-format="bold"><b>B</b></button>
                                <button class="format-btn" data-format="italic"><i>I</i></button>
                                <button class="format-btn" data-format="underline"><u>U</u></button>
                                <button class="format-btn" data-format="h3">H3</button>
                                <button class="format-btn" data-format="insertUnorderedList">• Список</button>
                                <button class="format-btn" data-format="insertOrderedList">1. Нумер.</button>
                            </div>
                            <div class="rich-editor" contenteditable="true"></div>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'add-card':
            html = `
                <div class="editor-item card-item" data-type="card">
                    <div class="editor-item-header"><span>🃏 Карточка</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <input type="text" class="card-title" placeholder="Заголовок">
                        <div class="list-editor" data-type="unordered">
                            <div class="list-items"><div class="list-item"><input type="text" placeholder="Пункт списка"><button class="remove-list-item">✕</button></div></div>
                            <button class="add-list-item">➕ Добавить пункт</button>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'add-quiz':
            html = `
                <div class="editor-item quiz-item" data-type="quiz">
                    <div class="editor-item-header"><span>📋 Опросник</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <div class="quiz-editor" data-questions='[]'></div>
                        <button class="add-quiz-question">➕ Добавить вопрос</button>
                    </div>
                </div>
            `;
            break;
    }
    
    const emptyMsg = editorArea.querySelector('.editor-empty');
    if (emptyMsg) emptyMsg.remove();
    
    editorArea.insertAdjacentHTML('beforeend', html);
    setupRemoveButtons(editorArea);
    setupRichEditors(editorArea);
    setupListEditors(editorArea);
    setupStepsEditors(editorArea);
    setupQuizEditors(editorArea);
    
    const newTable = editorArea.querySelector('.table-item:last-child .table-editor');
    if (newTable) initTableEditor(newTable);
}

function setupRichEditors(container) {
    const richEditors = container.querySelectorAll('.rich-editor');
    richEditors.forEach(editor => {
        const toolbar = editor.closest('.rich-editor-container')?.querySelector('.format-toolbar');
        if (toolbar) {
            toolbar.querySelectorAll('.format-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const format = btn.dataset.format;
                    document.execCommand(format, false, null);
                    editor.focus();
                });
            });
        }
    });
}

function setupListEditors(container) {
    const listEditors = container.querySelectorAll('.list-editor');
    listEditors.forEach(editor => {
        const addBtn = editor.querySelector('.add-list-item');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const itemsContainer = editor.querySelector('.list-items');
                const newItem = document.createElement('div');
                newItem.className = 'list-item';
                newItem.innerHTML = `<input type="text" placeholder="Пункт списка"><button class="remove-list-item">✕</button>
