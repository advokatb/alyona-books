// dataFetcher.js
export const fetchLiveLibData = async (username, bookAnnotations, customPages) => {
    const shelves = [
        { pagename: 'read', elementId: 'read-books' },
        { pagename: 'reading', elementId: 'last-read-book' },
        { pagename: 'wish', elementId: 'future-books-tab' }
    ];
    const includeColumns = ['title', 'authors', 'readDate', 'ratingUser', 'isbn', 'genres', 'series', 'bookHref', 'coverHref', 'annotation', 'cycle'];
    const updatedBooks = [];

    const seriesMappingResponse = await fetch('../data/series_mapping.json');
    const seriesMapping = await seriesMappingResponse.json();
    const cyclesMappingResponse = await fetch('../data/cycles_mapping.json');
    const cyclesMapping = await cyclesMappingResponse.json();

    for (const shelf of shelves) {
        const url = new URL('https://script.google.com/macros/s/AKfycbxjgPUw5W1ehF74VwGmemLCeS9l6Z_w9z8qcMp_zcm_BZAHtI14gMyloic5_lmXmLwl/exec');
        url.searchParams.append('username', username);
        url.searchParams.append('pagename', shelf.pagename);
        url.searchParams.append('includeColumns', includeColumns.join(','));

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Ошибка загрузки ${shelf.pagename}: ${response.status}`);

        const data = await response.json();
        if (!data.bookArray || !Array.isArray(data.bookArray)) {
            throw new Error(`Некорректный формат данных для ${shelf.pagename}`);
        }

const booksData = data.bookArray.map(book => {
            const bookTitle = book.title;
            const bookId = book.bookHref.split('/').pop();

            // Apply series mapping
            let mappedSeries = book.details?.series || null;
            for (const [seriesName, titles] of Object.entries(seriesMapping)) {
                if (titles.includes(bookTitle)) {
                    mappedSeries = seriesName;
                    break;
                }
            }

            // Apply cycle mapping
            let mappedCycle = book.details?.cycle || null;
            for (const [cycleName, cycleBooks] of Object.entries(cyclesMapping)) {
                const matchingBook = cycleBooks.find(cb => cb.title === bookTitle);
                if (matchingBook) {
                    mappedCycle = { name: cycleName, number: matchingBook.number };
                    break;
                }
            }

            return {
                ...book,
                'Exclusive Shelf': shelf.pagename === 'reading' ? 'currently-reading' : (shelf.pagename === 'wish' ? 'to-read' : 'read'),
                'Book Id': bookId,
                'Annotation': bookAnnotations[bookId] || book.annotation || 'Нет аннотации',
                'Authors': Array.isArray(book.authors) ? book.authors.map(a => a.name).join(', ') : 'Неизвестный автор',
                'Genres': Array.isArray(book.genres) ? book.genres.map(g => g.name) : [],
                'Series': mappedSeries, // Use mapped series if available
                'Cycle': mappedCycle,   // Use mapped cycle if available
                'My Rating': parseFloat(book.rating?.user) || 0,
                'Cover URL': book.coverHref || 'https://placehold.co/100x150?text=Нет+обложки',
                'Title': bookTitle,
                'ISBN': book.details?.isbn || 'Не указан',
                'Date Read': book.readDate ? parseDate(book.readDate) : null,
                'Number of Pages': customPages[bookTitle] || book.details?.pages || 0
            };
        });
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