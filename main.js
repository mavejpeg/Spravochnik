// main.js - полная версия с визуальным редактором и таблицами

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
    const accordions = document.querySelectorAll('.accordion');
    accordions.forEach(acc => {
        if (!acc.classList.contains('converted')) {
            const header = acc.querySelector('.acc-header');
            const body = acc.querySelector('.acc-body');
            if (header && body) {
                const title = header.querySelector('.acc-title')?.innerHTML || '';
                const details = document.createElement('details');
                const summary = document.createElement('summary');
                summary.innerHTML = title + '<span style="float: right;">▼</span>';
                summary.style.cssText = 'cursor: pointer; padding: 12px 16px; font-weight: 600; color: var(--accent); list-style: none;';
                details.appendChild(summary);
                details.appendChild(body.cloneNode(true));
                details.style.cssText = 'background: var(--surface); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 10px;';
                details.open = acc.classList.contains('open');
                acc.parentNode.replaceChild(details, acc);
                details.classList.add('converted');
            }
        }
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
                btn.addEventListener('click', function() {
                    editContent(this.dataset.page, this.dataset.section);
                });
            });
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
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/login.html';
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
            editContent(page, section);
        });
    });
}

// ========== РЕДАКТИРОВАНИЕ КОНТЕНТА ==========

function editContent(page, section) {
    const contentDiv = document.getElementById(`${section}-content`);
    if (!contentDiv) return;
    
    const currentHtml = contentDiv.innerHTML;
    
    // Проверяем, есть ли в секции таблица
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentHtml;
    const hasTable = tempDiv.querySelector('table');
    
    if (hasTable && (section === 'bowls' || section === 'coal' || section === 'clean')) {
        editTableContent(contentDiv, section, page);
        return;
    }
    
    // Обычное редактирование HTML
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <span class="modal-title">✏️ Редактировать: ${getSectionTitle(section)}</span>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                <div class="field">
                    <label>📝 Содержимое (HTML)</label>
                    <textarea id="contentEditor" style="width:100%; min-height:400px; font-family:monospace; font-size:13px; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 12px; color: var(--text);">${escapeHtml(currentHtml)}</textarea>
                </div>
                <div class="alert-bar info">
                    <span>💡</span>
                    <span>Вы можете использовать HTML теги: &lt;div&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;table&gt;, &lt;h3&gt; и т.д.</span>
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
    
    const closeModal = () => {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 300);
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
    
    modal.querySelector('.btn-save').addEventListener('click', async () => {
        const newContent = modal.querySelector('#contentEditor').value;
        
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

// ========== РЕДАКТИРОВАНИЕ ТАБЛИЦ ==========

function editTableContent(contentDiv, section, page) {
    const currentHtml = contentDiv.innerHTML;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentHtml;
    
    // Извлекаем таблицу
    const table = tempDiv.querySelector('table');
    if (!table) return;
    
    const headers = [];
    const headerCells = table.querySelectorAll('thead th');
    headerCells.forEach(th => headers.push(th.textContent.trim()));
    
    const rows = [];
    const bodyRows = table.querySelectorAll('tbody tr');
    bodyRows.forEach(tr => {
        const cells = tr.querySelectorAll('td');
        const rowData = [];
        cells.forEach(td => rowData.push(td.innerHTML));
        rows.push(rowData);
    });
    
    let additionalHtml = '';
    let alertText = '';
    
    if (section === 'bowls') {
        const alertDiv = tempDiv.querySelector('.alert-bar.info');
        if (alertDiv) {
            alertText = alertDiv.querySelector('span:last-child')?.textContent.trim() || '';
        }
        additionalHtml = `
            <div class="field">
                <label>💡 Заголовок-подсказка</label>
                <input type="text" id="alertText" value="${escapeHtml(alertText)}" style="width:100%; padding: 10px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; color: var(--text);">
            </div>
        `;
    } else if (section === 'coal') {
        const sizesCard = tempDiv.querySelector('.info-card');
        if (sizesCard) {
            const sizes = [];
            const sizesList = sizesCard.querySelectorAll('ul li');
            sizesList.forEach(li => sizes.push(li.textContent.trim()));
            let sizesHtml = '';
            sizes.forEach((size, idx) => {
                sizesHtml += `
                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <input type="text" class="size-item" value="${escapeHtml(size)}" style="flex:1; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 8px;">
                        <button class="remove-size-btn" style="background: rgba(252,92,124,0.2); border: none; border-radius: 6px; padding: 4px 10px; color: var(--accent2); cursor: pointer;">🗑</button>
                    </div>
                `;
            });
            additionalHtml = `
                <div class="field" style="margin-top: 20px;">
                    <label>⚫ Размеры углей</label>
                    <div id="sizesList">${sizesHtml}</div>
                    <button id="addSizeBtn" class="btn-add" style="margin-top: 8px;">➕ Добавить размер</button>
                </div>
            `;
        }
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <span class="modal-title">✏️ Редактировать: ${getSectionTitle(section)}</span>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                ${additionalHtml}
                <div class="field">
                    <label>📊 Редактирование таблицы</label>
                    <div class="table-editor-container">
                        <div class="format-toolbar">
                            <button class="format-btn" data-format="bold"><b>B</b></button>
                            <button class="format-btn" data-format="italic"><i>I</i></button>
                            <button class="format-btn" data-format="underline"><u>U</u></button>
                        </div>
                        <div class="table-editor" data-headers='${JSON.stringify(headers)}' data-rows='${JSON.stringify(rows)}'></div>
                        <div class="table-buttons">
                            <button class="add-table-row">➕ Добавить строку</button>
                            <button class="add-table-col">➕ Добавить столбец</button>
                        </div>
                    </div>
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
    
    initTableEditorWithFormat(modal);
    
    // Обработчики для размеров углей
    if (section === 'coal') {
        const addSizeBtn = modal.querySelector('#addSizeBtn');
        if (addSizeBtn) {
            addSizeBtn.addEventListener('click', () => {
                const container = modal.querySelector('#sizesList');
                const newDiv = document.createElement('div');
                newDiv.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px;';
                newDiv.innerHTML = `
                    <input type="text" class="size-item" style="flex:1; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 8px;" placeholder="Размер угля">
                    <button class="remove-size-btn" style="background: rgba(252,92,124,0.2); border: none; border-radius: 6px; padding: 4px 10px; color: var(--accent2); cursor: pointer;">🗑</button>
                `;
                newDiv.querySelector('.remove-size-btn').addEventListener('click', () => newDiv.remove());
                container.appendChild(newDiv);
            });
        }
        
        modal.querySelectorAll('.remove-size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('div').remove();
            });
        });
    }
    
    const closeModal = () => {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 300);
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
    
    modal.querySelector('.btn-save').addEventListener('click', async () => {
        const newTableHtml = getTableHtmlFromEditor(modal);
        
        let newContent = '';
        if (section === 'bowls') {
            const alertTextValue = modal.querySelector('#alertText')?.value || '';
            newContent = `
                <div class="alert-bar info"><span>💡</span><span>${escapeHtml(alertTextValue)}</span></div>
                ${newTableHtml}
            `;
        } else if (section === 'coal') {
            const sizes = [];
            modal.querySelectorAll('.size-item').forEach(input => {
                const val = input.value.trim();
                if (val) sizes.push(val);
            });
            let sizesHtml = '';
            if (sizes.length > 0) {
                sizesHtml = `<div class="info-card"><h3>⚫ Размеры углей</h3><ul>${sizes.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul></div>`;
            }
            newContent = `${newTableHtml}${sizesHtml}`;
        } else {
            newContent = newTableHtml;
        }
        
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
            } else {
                alert('❌ Ошибка сохранения');
            }
        } catch (error) {
            alert('❌ Ошибка: ' + error.message);
        }
    });
}

function initTableEditorWithFormat(modal) {
    const container = modal.querySelector('.table-editor');
    if (!container) return;
    
    const headers = JSON.parse(container.dataset.headers || '[]');
    const rows = JSON.parse(container.dataset.rows || '[]');
    
    let html = '<table class="editor-table" style="width:100%; border-collapse: collapse;">';
    html += '<thead> <tr>';
    headers.forEach((header, idx) => {
        html += `<th style="border: 1px solid var(--border); padding: 8px;">
                    <div class="cell-editor" contenteditable="true" data-row="-1" data-col="${idx}">${escapeHtml(header)}</div>
                 </th>`;
    });
    html += '<th style="width:40px; border: 1px solid var(--border);">✕</th> </tr> </thead><tbody>';
    
    rows.forEach((row, rowIdx) => {
        html += ' <tr>';
        row.forEach((cell, colIdx) => {
            html += `<td style="border: 1px solid var(--border); padding: 8px;">
                        <div class="cell-editor" contenteditable="true" data-row="${rowIdx}" data-col="${colIdx}">${cell}</div>
                      </td>`;
        });
        html += `<td style="border: 1px solid var(--border); text-align: center;">
                    <button class="remove-table-row-btn" data-row="${rowIdx}">🗑</button>
                  </td>`;
        html += ' </tr>';
    });
    html += '</tbody> </table>';
    container.innerHTML = html;
    
    // Обработчики форматирования
    const formatBtns = modal.querySelectorAll('.format-btn');
    let activeCell = null;
    
    container.querySelectorAll('.cell-editor').forEach(cell => {
        cell.addEventListener('focus', () => { activeCell = cell; });
        cell.addEventListener('blur', () => { activeCell = null; });
    });
    
    formatBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (activeCell) {
                const format = btn.dataset.format;
                document.execCommand(format, false, null);
                activeCell.focus();
            } else {
                alert('Нажмите на ячейку, которую хотите отформатировать');
            }
        });
    });
    
    // Добавление строки
    const addRowBtn = modal.querySelector('.add-table-row');
    if (addRowBtn) {
        addRowBtn.addEventListener('click', () => {
            const colCount = headers.length;
            const tbody = container.querySelector('tbody');
            const newRow = document.createElement('tr');
            for (let i = 0; i < colCount; i++) {
                const td = document.createElement('td');
                td.style.cssText = 'border: 1px solid var(--border); padding: 8px;';
                td.innerHTML = '<div class="cell-editor" contenteditable="true"></div>';
                td.querySelector('.cell-editor').addEventListener('focus', () => { activeCell = td.querySelector('.cell-editor'); });
                newRow.appendChild(td);
            }
            const deleteTd = document.createElement('td');
            deleteTd.style.cssText = 'border: 1px solid var(--border); text-align: center;';
            deleteTd.innerHTML = '<button class="remove-table-row-btn">🗑</button>';
            newRow.appendChild(deleteTd);
            tbody.appendChild(newRow);
            updateRowIndices(container);
        });
    }
    
    // Добавление столбца
    const addColBtn = modal.querySelector('.add-table-col');
    if (addColBtn) {
        addColBtn.addEventListener('click', () => {
            const allRows = container.querySelectorAll('tr');
            allRows.forEach(row => {
                const isHeader = row.parentElement?.tagName === 'THEAD';
                const newCell = document.createElement(isHeader ? 'th' : 'td');
                newCell.style.cssText = 'border: 1px solid var(--border); padding: 8px;';
                if (!isHeader) {
                    newCell.innerHTML = '<div class="cell-editor" contenteditable="true"></div>';
                    newCell.querySelector('.cell-editor').addEventListener('focus', () => { activeCell = newCell.querySelector('.cell-editor'); });
                } else {
                    newCell.innerHTML = '<div class="cell-editor" contenteditable="true"></div>';
                }
                const deleteCell = row.querySelector('td:last-child, th:last-child');
                row.insertBefore(newCell, deleteCell);
            });
            // Обновляем headers
            const newHeaders = [];
            container.querySelectorAll('thead .cell-editor').forEach(cell => newHeaders.push(cell.innerHTML));
            container.dataset.headers = JSON.stringify(newHeaders);
        });
    }
    
    // Удаление строк
    container.querySelectorAll('.remove-table-row-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('tr').remove();
            updateRowIndices(container);
        });
    });
}

function updateRowIndices(container) {
    const rows = container.querySelectorAll('tbody tr');
    rows.forEach((row, idx) => {
        const deleteBtn = row.querySelector('.remove-table-row-btn');
        if (deleteBtn) deleteBtn.setAttribute('data-row', idx);
    });
}

function getTableHtmlFromEditor(modal) {
    const container = modal.querySelector('.table-editor');
    if (!container) return '';
    
    const headers = [];
    const headerCells = container.querySelectorAll('thead .cell-editor');
    headerCells.forEach(cell => headers.push(cell.innerHTML));
    
    const rows = [];
    const bodyRows = container.querySelectorAll('tbody tr');
    bodyRows.forEach(tr => {
        const cells = tr.querySelectorAll('td .cell-editor');
        const rowData = [];
        cells.forEach(cell => rowData.push(cell.innerHTML));
        if (rowData.length > 0) rows.push(rowData);
    });
    
    let tableHtml = '<table class="ref-table"><thead><tr>';
    headers.forEach(header => {
        tableHtml += `<th>${header}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';
    rows.forEach(row => {
        tableHtml += '<tr>';
        row.forEach(cell => {
            tableHtml += `<td>${cell}</td>`;
        });
        tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';
    
    return tableHtml;
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
