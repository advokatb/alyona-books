import { showPopup } from './popup.js';

export function initCopyListButton(readBooks) {
    const copyButton = document.getElementById('copy-book-list');
    if (!copyButton) {
        console.error('Copy button (#copy-book-list) not found in DOM');
        return;
    }

    copyButton.addEventListener('click', () => {
        console.log('Copy button clicked');
        const uniqueYears = [...new Set(readBooks.map(b => b['Date Read']?.slice(0, 4)).filter(Boolean))].sort().reverse();
        const popupContent = `
            <div class="space-y-4">
                <div>
                    <label for="copy-year" class="text-gray-600 text-sm font-medium">Фильтр по году:</label>
                    <select id="copy-year" class="btn text-left w-full mt-1">
                        <option value="">Все годы</option>
                        ${uniqueYears.map(year => `<option value="${year}">${year}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label for="label-style" class="text-gray-600 text-sm font-medium">Стиль оформления:</label>
                    <select id="label-style" class="btn text-left w-full mt-1">
                        <option value="labels" selected>Текстовые метки</option>
                        <option value="emojis">Эмодзи</option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div class="flex items-center">
                        <input type="checkbox" id="include-author" class="mr-2" checked>
                        <label for="include-author" class="text-gray-600 text-sm">Автор</label>
                    </div>
                    <div class="flex items-center">
                        <input type="checkbox" id="include-title" class="mr-2" checked>
                        <label for="include-title" class="text-gray-600 text-sm">Название</label>
                    </div>
                    <div class="flex items-center">
                        <input type="checkbox" id="include-cycle" class="mr-2">
                        <label for="include-cycle" class="text-gray-600 text-sm">Цикл</label>
                    </div>
                    <div class="flex items-center">
                        <input type="checkbox" id="include-date" class="mr-2">
                        <label for="include-date" class="text-gray-600 text-sm">Дата прочтения</label>
                    </div>
                    <div class="flex items-center">
                        <input type="checkbox" id="include-pages" class="mr-2">
                        <label for="include-pages" class="text-gray-600 text-sm">Страницы</label>
                    </div>
                </div>
            </div>
        `;

        showPopup({
            message: 'Настройка списка книг для копирования',
            type: 'info',
            content: popupContent,
            onConfirm: async () => {
                try {
                    const yearFilter = document.getElementById('copy-year').value;
                    const labelStyle = document.getElementById('label-style').value;
                    const includeAuthor = document.getElementById('include-author').checked;
                    const includeTitle = document.getElementById('include-title').checked;
                    const includeCycle = document.getElementById('include-cycle').checked;
                    const includeDate = document.getElementById('include-date').checked;
                    const includePages = document.getElementById('include-pages').checked;

                    const filteredBooks = yearFilter
                        ? readBooks.filter(b => b['Date Read']?.startsWith(yearFilter))
                        : readBooks;

                    const labels = {
                        author: labelStyle === 'emojis' ? '👤 ' : 'Автор: ',
                        title: labelStyle === 'emojis' ? '📘 ' : 'Название: ',
                        cycle: labelStyle === 'emojis' ? '🔄 ' : 'Цикл: ',
                        date: labelStyle === 'emojis' ? '📅 ' : 'Дата: ',
                        pages: labelStyle === 'emojis' ? '📖 ' : ''
                    };

                    const bookList = filteredBooks.map((book, index) => {
                        const parts = [];
                        if (includeAuthor) parts.push(`${labels.author}${book.Author || book.Authors || 'Неизвестный автор'}`);
                        if (includeTitle) parts.push(`${labels.title}${book.Title}`);
                        if (includeCycle) {
                            const cycleDisplay = book.Cycle?.name;
                            if (cycleDisplay) parts.push(`${labels.cycle}${cycleDisplay}`);
                        }
                        if (includeDate && book['Date Read']) parts.push(`${labels.date}${book.formatReadDate()}`);
                        if (includePages) parts.push(`${labels.pages}${book['Number of Pages'] || 0} стр.`);
                        return `${index + 1}. ${parts.join(' ')}`; // Numbered, single line
                    }).join('\n');

                    await navigator.clipboard.writeText(bookList || 'Нет книг для копирования');
                    showPopup({ message: 'Список книг скопирован в буфер обмена!', type: 'success' });
                } catch (error) {
                    console.error('Error copying book list:', error);
                    showPopup({ message: `Не удалось скопировать список: ${error.message}`, type: 'error' });
                }
            }
        });
    });
}