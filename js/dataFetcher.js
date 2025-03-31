// dataFetcher.js
export const fetchLiveLibData = async (username, bookAnnotations, customPages) => {
    const shelves = [
        { pagename: 'read', elementId: 'read-books' },
        { pagename: 'reading', elementId: 'last-read-book' },
        { pagename: 'wish', elementId: 'future-books-tab' }
    ];
    const includeColumns = ['title', 'authors', 'readDate', 'ratingUser', 'isbn', 'genres', 'series', 'bookHref', 'coverHref', 'annotation'];
    const updatedBooks = [];

    for (const shelf of shelves) {
        const url = new URL('https://script.google.com/macros/s/AKfycbyLfdrpkPx-LKs3jr1uwKs-4xPEY8ELNQcZIhfuUAh2cnL4_sZgpuEz6KZVKg95B_-I/exec');
        url.searchParams.append('username', username);
        url.searchParams.append('pagename', shelf.pagename);
        url.searchParams.append('includeColumns', includeColumns.join(','));

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Ошибка загрузки ${shelf.pagename}: ${response.status}`);

        const data = await response.json();
        if (!data.bookArray || !Array.isArray(data.bookArray)) {
            throw new Error(`Некорректный формат данных для ${shelf.pagename}`);
        }

        const booksData = data.bookArray.map(book => ({
            ...book,
            'Exclusive Shelf': shelf.pagename === 'reading' ? 'currently-reading' : (shelf.pagename === 'wish' ? 'to-read' : 'read'),
            'Book Id': book.bookHref.split('/').pop(),
            'Annotation': bookAnnotations[book.bookHref.split('/').pop()] || book.annotation || 'Нет аннотации',
            'Authors': Array.isArray(book.authors) ? book.authors.map(a => a.name).join(', ') : 'Неизвестный автор',
            'Genres': Array.isArray(book.genres) ? book.genres.map(g => g.name) : [],
            'Series': book.details?.series || null,
            'My Rating': parseFloat(book.rating?.user) || 0,
            'Cover URL': book.coverHref || 'https://placehold.co/100x150?text=Нет+обложки',
            'Title': book.title,
            'ISBN': book.details?.isbn || 'Не указан',
            'Date Read': book.readDate ? parseDate(book.readDate) : null,
            'Number of Pages': customPages[book.title] || book.details?.pages || 0
        }));
        updatedBooks.push(...booksData);
    }
    return updatedBooks;
};

export const loadStaticData = async () => {
    const customPagesResponse = await fetch('data/custom_pages.json');
    const customPages = await customPagesResponse.json();
    const annotationsResponse = await fetch('data/book_annotations.json');
    const bookAnnotations = await annotationsResponse.json();
    let customDates = {};
    try {
        const customDatesResponse = await fetch('data/custom_dates.json');
        customDates = await customDatesResponse.json();
    } catch (e) {
        console.warn('Failed to load custom_dates.json:', e);
    }
    return { customPages, bookAnnotations, customDates };
};

import { parseDate } from './utils.js';