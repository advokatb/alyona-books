export function getBookDeclension(count) {
    if (count % 10 === 1 && count % 100 !== 11) {
        return `${count} книга`;
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return `${count} книги`;
    } else {
        return `${count} книг`;
    }
}

export function parseDate(dateStr) {
    if (!dateStr || !dateStr.includes('г.')) return null;
    const [month, year] = dateStr.replace(' г.', '').split(' ');
    const monthMap = {
        'Январь': '01', 'Февраль': '02', 'Март': '03', 'Апрель': '04',
        'Май': '05', 'Июнь': '06', 'Июль': '07', 'Август': '08',
        'Сентябрь': '09', 'Октябрь': '10', 'Ноябрь': '11', 'Декабрь': '12'
    };
    return `${year}-${monthMap[month] || '01'}-01`;
}