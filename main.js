// main.js - с визуальным редактором

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Main.js loaded');
    
    initTabs();
    initAccordions();
    initSearch();
    loadUserInfo();
    setupLogout();
    setupRopPanel();
    setupEditButtons();
});

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const target = this.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const sec = document.getElementById(target);
            if (sec) sec.classList.add('active');
        });
    });
}

function initAccordions() {
    const accordionHeaders = document.querySelectorAll('.acc-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            this.closest('.accordion').classList.toggle('open');
        });
    });
}

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const val = this.value.toLowerCase();
            document.querySelectorAll('[data-searchable]').forEach(el => {
                if (el.textContent.toLowerCase().includes(val)) {
                    el.classList.remove('search-hidden');
                } else {
                    el.classList.add('search-hidden');
                }
            });
        });
    }
}

async function loadUserInfo() {
    try {
        const response = await fetch('/api/check-auth', { credentials: 'include' });
        const data = await response.json();
        
        const userNameSpan = document.getElementById('userName');
        const ropBtn = document.getElementById('ropBtn');
        
        if (data.authenticated) {
            if (userNameSpan) userNameSpan.textContent = data.user.full_name;
            
            const isRop = (data.user.role === 'rop' || data.user.role === 'root');
            window.isRopGlobal = isRop;
            
            if (ropBtn) ropBtn.style.display = isRop ? 'block' : 'none';
            
            const editBtns = document.querySelectorAll('.btn-edit-content');
            editBtns.forEach(btn => {
                btn.style.display = isRop ? 'inline-flex' : 'none';
            });
            
            const addBtn = document.querySelector('.btn-add');
            if (addBtn) addBtn.style.display = isRop ? 'flex' : 'none';
        } else {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/login.html';
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            fetch('/api/logout', { method: 'POST', credentials: 'include' })
                .then(() => window.location.href = '/login.html');
        });
    }
}

function setupRopPanel() {
    const ropBtn = document.getElementById('ropBtn');
    if (ropBtn) {
        ropBtn.addEventListener('click', openRopPanel);
    }
}

function setupEditButtons() {
    const editBtns = document.querySelectorAll('.btn-edit-content');
    editBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.dataset.page;
            const section = this.dataset.section;
            openVisualEditor(page, section);
        });
    });
}

// ========== ВИЗУАЛЬНЫЙ РЕДАКТОР ==========

function openVisualEditor(page, section) {
    const contentDiv = document.getElementById(`${section}-content`);
    if (!contentDiv) return;
    
    const currentContent = contentDiv.innerHTML;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '2000';
    modal.innerHTML = `
        <div class="modal" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <span class="modal-title">✏️ Редактировать: ${getSectionTitle(section)}</span>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                <!-- Панель инструментов -->
                <div class="editor-toolbar">
                    <button class="tool-btn" data-action="add-text">📝 Добавить текст</button>
                    <button class="tool-btn" data-action="add-list">📋 Добавить список</button>
                    <button class="tool-btn" data-action="add-table">📊 Добавить таблицу</button>
                    <button class="tool-btn" data-action="add-alert">⚠️ Добавить предупреждение</button>
                    <button class="tool-btn" data-action="add-note">💡 Добавить примечание</button>
                    <button class="tool-btn" data-action="add-accordion">📁 Добавить аккордеон</button>
                    <button class="tool-btn" data-action="add-card">🃏 Добавить карточку</button>
                </div>
                
                <!-- Область редактирования -->
                <div class="editor-area" id="editorArea">
                    ${parseContentToEditor(currentContent)}
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
    
    // Обработчики кнопок инструментов
    const toolBtns = modal.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = btn.dataset.action;
            addElementToEditor(editorArea, action);
        });
    });
    
    // Обработчики кнопок удаления
    setupRemoveButtons(editorArea);
    
    const closeModal = () => {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 300);
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
    
    modal.querySelector('.btn-save').addEventListener('click', async () => {
        const newContent = convertEditorToHtml(editorArea);
        
        try {
            const response = await fetch(`/api/content/${page}/${section}`, {
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
                initAccordions();
            } else {
                alert('❌ Ошибка сохранения');
            }
        } catch (error) {
            alert('❌ Ошибка: ' + error.message);
        }
    });
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

function parseContentToEditor(html) {
    // Простой парсер для отображения контента в редакторе
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    let result = '';
    
    // Парсим элементы
    const elements = tempDiv.children;
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        result += convertElementToEditorItem(el);
    }
    
    return result || '<div class="editor-empty">Нажмите кнопку выше, чтобы добавить элемент</div>';
}

function convertElementToEditorItem(el) {
    const className = el.className;
    const tagName = el.tagName.toLowerCase();
    
    if (className.includes('info-card')) {
        // Карточка
        const title = el.querySelector('h3')?.innerHTML || '';
        const items = Array.from(el.querySelectorAll('ul li')).map(li => li.innerHTML).join('\n');
        return `
            <div class="editor-item card-item" data-type="card">
                <div class="editor-item-header">
                    <span>📄 Карточка</span>
                    <button class="remove-editor-item">🗑</button>
                </div>
                <div class="editor-item-content">
                    <input type="text" class="card-title" placeholder="Заголовок" value="${escapeHtml(title)}">
                    <textarea class="card-items" rows="4" placeholder="Пункты списка (каждый с новой строки)">${escapeHtml(items)}</textarea>
                </div>
            </div>
        `;
    }
    else if (className.includes('accordion')) {
        // Аккордеон
        const title = el.querySelector('.acc-header .acc-title')?.innerHTML || '';
        const body = el.querySelector('.acc-body')?.innerHTML || '';
        return `
            <div class="editor-item accordion-item" data-type="accordion">
                <div class="editor-item-header">
                    <span>📁 Аккордеон</span>
                    <button class="remove-editor-item">🗑</button>
                </div>
                <div class="editor-item-content">
                    <input type="text" class="accordion-title" placeholder="Заголовок" value="${escapeHtml(title)}">
                    <textarea class="accordion-body" rows="6" placeholder="Содержимое (HTML)">${escapeHtml(body)}</textarea>
                </div>
            </div>
        `;
    }
    else if (tagName === 'table') {
        // Таблица
        const rows = [];
        const trs = el.querySelectorAll('tr');
        trs.forEach(tr => {
            const cells = Array.from(tr.querySelectorAll('th, td')).map(cell => cell.innerHTML);
            rows.push(cells);
        });
        return `
            <div class="editor-item table-item" data-type="table">
                <div class="editor-item-header">
                    <span>📊 Таблица</span>
                    <button class="remove-editor-item">🗑</button>
                </div>
                <div class="editor-item-content">
                    <div class="table-editor" data-rows='${JSON.stringify(rows)}'></div>
                    <button class="add-table-row">➕ Добавить строку</button>
                </div>
            </div>
        `;
    }
    else if (className.includes('alert-bar')) {
        // Предупреждение
        const text = el.querySelector('span:last-child')?.innerHTML || el.innerHTML;
        const type = className.includes('danger') ? 'danger' : (className.includes('success') ? 'success' : 'info');
        return `
            <div class="editor-item alert-item" data-type="alert">
                <div class="editor-item-header">
                    <span>⚠️ Предупреждение</span>
                    <button class="remove-editor-item">🗑</button>
                </div>
                <div class="editor-item-content">
                    <select class="alert-type">
                        <option value="danger" ${type === 'danger' ? 'selected' : ''}>🔴 Важное</option>
                        <option value="success" ${type === 'success' ? 'selected' : ''}>🟢 Успех</option>
                        <option value="info" ${type === 'info' ? 'selected' : ''}>🔵 Информация</option>
                    </select>
                    <textarea class="alert-text" rows="2" placeholder="Текст предупреждения">${escapeHtml(text)}</textarea>
                </div>
            </div>
        `;
    }
    else if (className.includes('hl')) {
        // Примечание
        const text = el.innerHTML;
        const type = className.includes('warn') ? 'warn' : (className.includes('ok') ? 'ok' : 'info');
        return `
            <div class="editor-item note-item" data-type="note">
                <div class="editor-item-header">
                    <span>💡 Примечание</span>
                    <button class="remove-editor-item">🗑</button>
                </div>
                <div class="editor-item-content">
                    <select class="note-type">
                        <option value="info" ${type === 'info' ? 'selected' : ''}>📘 Обычное</option>
                        <option value="ok" ${type === 'ok' ? 'selected' : ''}>✅ Успех</option>
                        <option value="warn" ${type === 'warn' ? 'selected' : ''}>⚠️ Важное</option>
                    </select>
                    <textarea class="note-text" rows="2" placeholder="Текст примечания">${escapeHtml(text)}</textarea>
                </div>
            </div>
        `;
    }
    else if (tagName === 'div' && !className) {
        // Обычный текст
        return `
            <div class="editor-item text-item" data-type="text">
                <div class="editor-item-header">
                    <span>📝 Текст</span>
                    <button class="remove-editor-item">🗑</button>
                </div>
                <div class="editor-item-content">
                    <textarea class="text-content" rows="3" placeholder="Текст">${escapeHtml(el.innerHTML)}</textarea>
                </div>
            </div>
        `;
    }
    else {
        // Неизвестный элемент
        return `
            <div class="editor-item unknown-item" data-type="unknown">
                <div class="editor-item-header">
                    <span>📄 HTML блок</span>
                    <button class="remove-editor-item">🗑</button>
                </div>
                <div class="editor-item-content">
                    <textarea class="html-content" rows="4" placeholder="HTML код">${escapeHtml(el.outerHTML)}</textarea>
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
                    <div class="editor-item-header">
                        <span>📝 Текст</span>
                        <button class="remove-editor-item">🗑</button>
                    </div>
                    <div class="editor-item-content">
                        <textarea class="text-content" rows="3" placeholder="Введите текст"></textarea>
                    </div>
                </div>
            `;
            break;
        case 'add-list':
            html = `
                <div class="editor-item list-item" data-type="list">
                    <div class="editor-item-header">
                        <span>📋 Список</span>
                        <button class="remove-editor-item">🗑</button>
                    </div>
                    <div class="editor-item-content">
                        <input type="text" class="list-title" placeholder="Заголовок списка (необязательно)">
                        <textarea class="list-items" rows="4" placeholder="Пункты списка (каждый с новой строки)"></textarea>
                    </div>
                </div>
            `;
            break;
        case 'add-table':
            html = `
                <div class="editor-item table-item" data-type="table">
                    <div class="editor-item-header">
                        <span>📊 Таблица</span>
                        <button class="remove-editor-item">🗑</button>
                    </div>
                    <div class="editor-item-content">
                        <div class="table-editor" data-rows='[["Заголовок 1", "Заголовок 2"]]'></div>
                        <button class="add-table-row">➕ Добавить строку</button>
                    </div>
                </div>
            `;
            break;
        case 'add-alert':
            html = `
                <div class="editor-item alert-item" data-type="alert">
                    <div class="editor-item-header">
                        <span>⚠️ Предупреждение</span>
                        <button class="remove-editor-item">🗑</button>
                    </div>
                    <div class="editor-item-content">
                        <select class="alert-type">
                            <option value="danger">🔴 Важное</option>
                            <option value="success">🟢 Успех</option>
                            <option value="info">🔵 Информация</option>
                        </select>
                        <textarea class="alert-text" rows="2" placeholder="Текст предупреждения"></textarea>
                    </div>
                </div>
            `;
            break;
        case 'add-note':
            html = `
                <div class="editor-item note-item" data-type="note">
                    <div class="editor-item-header">
                        <span>💡 Примечание</span>
                        <button class="remove-editor-item">🗑</button>
                    </div>
                    <div class="editor-item-content">
                        <select class="note-type">
                            <option value="info">📘 Обычное</option>
                            <option value="ok">✅ Успех</option>
                            <option value="warn">⚠️ Важное</option>
                        </select>
                        <textarea class="note-text" rows="2" placeholder="Текст примечания"></textarea>
                    </div>
                </div>
            `;
            break;
        case 'add-accordion':
            html = `
                <div class="editor-item accordion-item" data-type="accordion">
                    <div class="editor-item-header">
                        <span>📁 Аккордеон</span>
                        <button class="remove-editor-item">🗑</button>
                    </div>
                    <div class="editor-item-content">
                        <input type="text" class="accordion-title" placeholder="Заголовок аккордеона">
                        <textarea class="accordion-body" rows="6" placeholder="Содержимое аккордеона (HTML)"></textarea>
                    </div>
                </div>
            `;
            break;
        case 'add-card':
            html = `
                <div class="editor-item card-item" data-type="card">
                    <div class="editor-item-header">
                        <span>🃏 Карточка</span>
                        <button class="remove-editor-item">🗑</button>
                    </div>
                    <div class="editor-item-content">
                        <input type="text" class="card-title" placeholder="Заголовок карточки">
                        <textarea class="card-items" rows="4" placeholder="Пункты списка (каждый с новой строки)"></textarea>
                    </div>
                </div>
            `;
            break;
    }
    
    // Удаляем сообщение о пустом редакторе
    const emptyMsg = editorArea.querySelector('.editor-empty');
    if (emptyMsg) emptyMsg.remove();
    
    editorArea.insertAdjacentHTML('beforeend', html);
    setupRemoveButtons(editorArea);
    
    // Инициализируем таблицу если нужно
    const newTable = editorArea.querySelector('.table-item:last-child .table-editor');
    if (newTable) {
        initTableEditor(newTable);
    }
}

function setupRemoveButtons(container) {
    const removeBtns = container.querySelectorAll('.remove-editor-item');
    removeBtns.forEach(btn => {
        btn.removeEventListener('click', handleRemove);
        btn.addEventListener('click', handleRemove);
    });
    
    // Обработчики для добавления строк в таблицу
    const addRowBtns = container.querySelectorAll('.add-table-row');
    addRowBtns.forEach(btn => {
        btn.removeEventListener('click', handleAddTableRow);
        btn.addEventListener('click', handleAddTableRow);
    });
}

function handleRemove(e) {
    e.target.closest('.editor-item').remove();
    const editorArea = e.target.closest('#editorArea');
    if (editorArea && editorArea.children.length === 0) {
        editorArea.innerHTML = '<div class="editor-empty">Нажмите кнопку выше, чтобы добавить элемент</div>';
    }
}

function handleAddTableRow(e) {
    const tableItem = e.target.closest('.table-item');
    const tableEditor = tableItem.querySelector('.table-editor');
    const rows = JSON.parse(tableEditor.dataset.rows || '[]');
    const cols = rows[0]?.length || 2;
    const newRow = Array(cols).fill('');
    rows.push(newRow);
    tableEditor.dataset.rows = JSON.stringify(rows);
    initTableEditor(tableEditor);
}

function initTableEditor(container) {
    const rows = JSON.parse(container.dataset.rows || '[]');
    if (rows.length === 0) rows.push(['', '']);
    
    let html = '<table class="editor-table">';
    // Заголовки
    html += '<thead><tr>';
    for (let i = 0; i < rows[0].length; i++) {
        html += `<th><input type="text" class="table-header" value="${escapeHtml(rows[0][i] || '')}" placeholder="Заголовок ${i+1}"></th>`;
    }
    html += '</tr></thead><tbody>';
    // Строки данных
    for (let i = 1; i < rows.length; i++) {
        html += '<tr>';
        for (let j = 0; j < rows[i].length; j++) {
            html += `<td><input type="text" class="table-cell" value="${escapeHtml(rows[i][j] || '')}" placeholder="Значение"></td>`;
        }
        html += `<td><button class="remove-table-row">🗑</button></td>`;
        html += '</tr>';
    }
    html += '</tbody></table>';
    container.innerHTML = html;
    
    // Обработчики удаления строк
    container.querySelectorAll('.remove-table-row').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            row.remove();
            updateTableData(container);
        });
    });
    
    // Обработчики изменения данных
    const inputs = container.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('change', () => updateTableData(container));
    });
}

function updateTableData(container) {
    const rows = [];
    const headers = container.querySelectorAll('thead input');
    const headerRow = Array.from(headers).map(h => h.value);
    rows.push(headerRow);
    
    const bodyRows = container.querySelectorAll('tbody tr');
    bodyRows.forEach(row => {
        const cells = row.querySelectorAll('td input');
        const rowData = Array.from(cells).map(c => c.value);
        rows.push(rowData);
    });
    
    container.dataset.rows = JSON.stringify(rows);
}

function convertEditorToHtml(editorArea) {
    const items = editorArea.querySelectorAll('.editor-item');
    let html = '';
    
    items.forEach(item => {
        const type = item.dataset.type;
        
        switch(type) {
            case 'text':
                const text = item.querySelector('.text-content')?.value || '';
                if (text) html += `<div>${escapeHtml(text)}</div>`;
                break;
                
            case 'list':
                const listTitle = item.querySelector('.list-title')?.value || '';
                const listItems = (item.querySelector('.list-items')?.value || '').split('\n').filter(l => l.trim());
                if (listItems.length) {
                    let listHtml = '';
                    if (listTitle) listHtml += `<h3>${escapeHtml(listTitle)}</h3>`;
                    listHtml += `<ul>${listItems.map(li => `<li>${escapeHtml(li)}</li>`).join('')}</ul>`;
                    html += `<div class="info-card">${listHtml}</div>`;
                }
                break;
                
            case 'table':
                const tableData = JSON.parse(item.querySelector('.table-editor')?.dataset.rows || '[]');
                if (tableData.length > 1) {
                    let tableHtml = '<table class="ref-table"><thead><tr>';
                    tableData[0].forEach(cell => {
                        tableHtml += `<th>${escapeHtml(cell)}</th>`;
                    });
                    tableHtml += '</tr></thead><tbody>';
                    for (let i = 1; i < tableData.length; i++) {
                        tableHtml += '<tr>';
                        tableData[i].forEach(cell => {
                            tableHtml += `<td>${escapeHtml(cell)}</td>`;
                        });
                        tableHtml += '</tr>';
                    }
                    tableHtml += '</tbody></table>';
                    html += tableHtml;
                }
                break;
                
            case 'alert':
                const alertType = item.querySelector('.alert-type')?.value || 'info';
                const alertText = item.querySelector('.alert-text')?.value || '';
                if (alertText) {
                    const icon = alertType === 'danger' ? '🚨' : (alertType === 'success' ? '✅' : 'ℹ️');
                    html += `<div class="alert-bar ${alertType}"><span>${icon}</span><span>${escapeHtml(alertText)}</span></div>`;
                }
                break;
                
            case 'note':
                const noteType = item.querySelector('.note-type')?.value || 'info';
                const noteText = item.querySelector('.note-text')?.value || '';
                if (noteText) {
                    const className = noteType === 'warn' ? 'hl warn' : (noteType === 'ok' ? 'hl ok' : 'hl info');
                    html += `<div class="${className}">${escapeHtml(noteText)}</div>`;
                }
                break;
                
            case 'accordion':
                const accordionTitle = item.querySelector('.accordion-title')?.value || '';
                const accordionBody = item.querySelector('.accordion-body')?.value || '';
                if (accordionTitle && accordionBody) {
                    html += `
                        <div class="accordion">
                            <div class="acc-header"><span class="acc-title">${escapeHtml(accordionTitle)}</span><span class="acc-arrow">▼</span></div>
                            <div class="acc-body">${accordionBody}</div>
                        </div>
                    `;
                }
                break;
                
            case 'card':
                const cardTitle = item.querySelector('.card-title')?.value || '';
                const cardItems = (item.querySelector('.card-items')?.value || '').split('\n').filter(l => l.trim());
                if (cardTitle || cardItems.length) {
                    let cardHtml = '<div class="info-card">';
                    if (cardTitle) cardHtml += `<h3>${escapeHtml(cardTitle)}</h3>`;
                    if (cardItems.length) {
                        cardHtml += `<ul>${cardItems.map(li => `<li>${escapeHtml(li)}</li>`).join('')}</ul>`;
                    }
                    cardHtml += '</div>';
                    html += cardHtml;
                }
                break;
                
            case 'unknown':
                const unknownHtml = item.querySelector('.html-content')?.value || '';
                if (unknownHtml) html += unknownHtml;
                break;
        }
    });
    
    return html;
}

// ========== ПАНЕЛЬ УПРАВЛЕНИЯ РОП ==========

async function openRopPanel() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 600px;">
            <div class="modal-header">
                <span class="modal-title">👑 Панель управления</span>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                <div class="field">
                    <label>➕ Добавить пользователя</label>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <input type="text" id="newUsername" placeholder="Логин" style="flex:1">
                        <input type="text" id="newPassword" placeholder="Пароль (4 цифры)" maxlength="4" style="width: 120px">
                        <input type="text" id="newFullName" placeholder="ФИО" style="flex:1">
                        <button id="addUserBtn" class="btn-add">Добавить</button>
                    </div>
                </div>
                <div class="field">
                    <label>📋 Список пользователей</label>
                    <div id="usersList" style="max-height: 300px; overflow-y: auto;"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel">Закрыть</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('open'), 10);
    
    const closeModal = () => {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 300);
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
    
    await loadUsersList(modal);
    
    document.getElementById('addUserBtn').addEventListener('click', async () => {
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;
        const full_name = document.getElementById('newFullName').value.trim();
        
        if (!username || !password || !full_name) {
            alert('Заполните все поля');
            return;
        }
        if (!/^\d{4}$/.test(password)) {
            alert('Пароль должен состоять из 4 цифр');
            return;
        }
        
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password, full_name, role: 'user' })
        });
        
        if (response.ok) {
            alert('Пользователь добавлен');
            document.getElementById('newUsername').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('newFullName').value = '';
            await loadUsersList(modal);
        } else {
            const error = await response.json();
            alert(error.error);
        }
    });
}

async function loadUsersList(modal) {
    const response = await fetch('/api/users', { credentials: 'include' });
    const users = await response.json();
    const meResponse = await fetch('/api/check-auth', { credentials: 'include' });
    const me = await meResponse.json();
    
    const container = modal.querySelector('#usersList');
    if (!container) return;
    
    container.innerHTML = users.map(user => {
        let canChange = false;
        if (me.user.role === 'root') canChange = true;
        else if (me.user.role === 'rop' && user.role === 'user') canChange = true;
        
        let canDelete = false;
        if (me.user.role === 'root' && user.username !== 'root' && user.id !== me.user.id) canDelete = true;
        
        return `
            <div style="background: var(--surface2); border-radius: 10px; padding: 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <strong>${escapeHtml(user.full_name)}</strong><br>
                        <span style="font-size: 11px;">Логин: ${user.username} | Роль: ${user.role === 'root' ? 'ROOT' : (user.role === 'rop' ? 'РОП' : 'Пользователь')}</span>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        ${canChange ? `<button onclick="window.changePasswordUser(${user.id}, '${escapeHtml(user.full_name)}')" class="btn-edit" style="padding: 4px 12px;">🔑 Сменить пароль</button>` : ''}
                        ${canDelete ? `<button onclick="window.deleteUserById(${user.id})" class="btn-delete" style="padding: 4px 12px;">🗑 Удалить</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.changePasswordUser = async function(userId, userName) {
    const newPassword = prompt(`Введите новый пароль (4 цифры) для пользователя ${userName}`);
    if (!newPassword) return;
    if (!/^\d{4}$/.test(newPassword)) {
        alert('Пароль должен состоять из 4 цифр');
        return;
    }
    const response = await fetch(`/api/users/${userId}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword })
    });
    if (response.ok) alert('Пароль успешно изменен');
    else alert('Ошибка смены пароля');
};

window.deleteUserById = async function(userId) {
    if (confirm('Удалить пользователя?')) {
        const response = await fetch(`/api/users/${userId}`, { method: 'DELETE', credentials: 'include' });
        if (response.ok) {
            alert('Пользователь удален');
            location.reload();
        } else alert('Ошибка удаления');
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}
