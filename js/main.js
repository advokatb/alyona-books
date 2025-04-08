import { fetchLiveLibData, loadStaticData } from './dataFetcher.js';
import { loadBooksFromStorage, saveBooksToStorage } from './storage.js';
import { loadClippings } from './clippings.js';
import { renderNotesSlider } from './slider.js';
import { showPopup } from './popup.js';
import { initCopyListButton } from './copyList.js';
import { getBookDeclension, setupTabSwitching } from './utils.js';

// Load config dynamically
async function loadConfig() {
    const response = await fetch('data/config.json');
    return await response.json();
}

// Fetch and categorize books
async function fetchAndCategorizeBooks(username, bookAnnotations, customPages, customDates) {
    let allBooks, lastUpdated;
    const stored = loadBooksFromStorage(username);
    if (stored) {
        allBooks = stored.allBooks;
        lastUpdated = stored.lastUpdated;
        console.log(`Loaded books for ${username} from localStorage:`, allBooks.length, 'Last updated:', lastUpdated);
    } else {
        allBooks = await fetchLiveLibData(username, bookAnnotations, customPages);
        lastUpdated = new Date().toISOString();
        saveBooksToStorage(username, allBooks, lastUpdated);
        console.log(`Fetched initial books for ${username} from LiveLib:`, allBooks.length);
    }

    const readBooks = allBooks.filter(b => b['Exclusive Shelf'] === 'read');
    const readingBooks = allBooks.filter(b => b['Exclusive Shelf'] === 'currently-reading');
    const wishBooks = allBooks.filter(b => b['Exclusive Shelf'] === 'to-read');

    return {
        allBooks,
        lastUpdated,
        books: new BookCollection(readBooks, customDates),
        currentBooks: new BookCollection(readingBooks, customDates),
        toReadBooks: new BookCollection(wishBooks, customDates)
    };
}

// Apply skeleton loaders to UI elements
function applySkeletonLoaders(containers) {
    const {
        currentBookContainer, lastReadBookContainer, mostProlificAuthorContainer, totalStatsContainer,
        totalBookImage, bookListContainer, futureReadsContainer, cycleShelfContainer, seriesShelfContainer,
        challengeContainer, bookRecordsContainer, readingStatsContainer, chartContainers
    } = containers;

    if (currentBookContainer) currentBookContainer.innerHTML = '<div class="skeleton skeleton-image mr-4"></div><div class="flex-1"><div class="skeleton skeleton-text w-3/4"></div><div class="skeleton skeleton-text w-1/2"></div><div class="skeleton skeleton-text w-2/3"></div></div>';
    if (lastReadBookContainer) lastReadBookContainer.innerHTML = '<div class="skeleton skeleton-image mr-4"></div><div class="flex-1"><div class="skeleton skeleton-text w-3/4"></div><div class="skeleton skeleton-text w-1/2"></div><div class="skeleton skeleton-text w-2/3"></div></div>';
    if (mostProlificAuthorContainer) mostProlificAuthorContainer.innerHTML = '<div class="skeleton skeleton-image w-16 h-24 mr-2"></div><div class="flex-1"><div class="skeleton skeleton-text w-3/4"></div><div class="skeleton skeleton-text w-1/2"></div></div>';
    if (totalStatsContainer) totalStatsContainer.innerHTML = '<div class="skeleton skeleton-text w-3/4"></div><div class="skeleton skeleton-text w-1/2"></div><div class="skeleton skeleton-text w-2/3"></div>';
    if (totalBookImage) totalBookImage.classList.add('skeleton');
    if (bookListContainer) bookListContainer.innerHTML = Array(9).fill('').map(() => '<div class="book-card skeleton-card skeleton"></div>').join('');
    if (futureReadsContainer) futureReadsContainer.innerHTML = Array(3).fill('').map(() => '<div class="book-card skeleton-card skeleton"></div>').join('');
    if (cycleShelfContainer) cycleShelfContainer.innerHTML = `<div class="series-box"><div class="skeleton skeleton-text w-3/4 mb-2"></div><div class="skeleton skeleton-text w-1/2 mb-2"></div><div class="series-row">${Array(3).fill('').map((_, i) => `<div class="series-book" style="left: ${i * 60}px;"><div class="skeleton" style="width: 80px; height: 120px;"></div></div>`).join('')}</div></div>`;
    if (seriesShelfContainer) seriesShelfContainer.innerHTML = `<div class="series-box"><div class="skeleton skeleton-text w-3/4 mb-2"></div><div class="skeleton skeleton-text w-1/2 mb-2"></div><div class="series-row">${Array(3).fill('').map((_, i) => `<div class="series-book" style="left: ${i * 60}px;"><div class="skeleton" style="width: 80px; height: 120px;"></div></div>`).join('')}</div></div>`;
    if (challengeContainer) challengeContainer.innerHTML = `<h2 class="text-2xl font-semibold text-gray-700 mb-4">Чтение 2025: Challenge</h2><div class="flex items-center mb-4"><div class="skeleton w-24 h-12 mr-4"></div><div><div class="skeleton skeleton-text w-3/4"></div><div class="skeleton skeleton-text w-1/2"></div></div></div><div class="skeleton w-full h-2.5 rounded-full"></div><div class="skeleton skeleton-text w-1/4 mt-2 mx-auto"></div>`;
    if (bookRecordsContainer) bookRecordsContainer.innerHTML = '<div class="skeleton skeleton-text w-3/4 mb-2"></div><div class="skeleton skeleton-text w-3/4"></div>';
    if (readingStatsContainer) readingStatsContainer.innerHTML = '<div class="skeleton skeleton-text w-3/4 mb-2"></div><div class="skeleton skeleton-text w-3/4"></div>';
    Object.values(chartContainers).forEach(container => container?.classList.add('skeleton'));
}

// Render the UI with book data
async function renderUI({ books, currentBooks, toReadBooks, lastUpdated, username, readingChallengeGoal, currentYear }) {
    const containers = {
        currentBookContainer: document.getElementById('current-book'),
        noReadingMessage: document.getElementById('no-reading-message'),
        lastReadBookContainer: document.getElementById('last-read-book'),
        mostProlificAuthorContainer: document.getElementById('most-prolific-author'),
        totalBooksEl: document.getElementById('total-books'),
        totalPagesEl: document.getElementById('total-pages'),
        totalThisYearCountEl: document.getElementById('total-this-year-count'),
        totalBookImage: document.getElementById('total-book-image'),
        bookListContainer: document.getElementById('book-list'),
        futureReadsContainer: document.getElementById('future-reads'),
        cycleShelfContainer: document.getElementById('cycle-shelf'),
        seriesShelfContainer: document.getElementById('series-shelf'),
        challengeContainer: document.getElementById('challenge-container'),
        bookRecordsContainer: document.getElementById('book-records'),
        readingStatsContainer: document.getElementById('reading-stats'),
        livelibChallengeBadge: document.getElementById('livelib-challenge-badge'),
        livelibProfileBadge: document.getElementById('livelib-profile-badge'),
        chartContainers: {
            timelineChart: document.querySelector('#timelineChart'),
            ratingChart: document.querySelector('#ratingChart'),
            genreChart: document.querySelector('#genreChart')
        }
    };

    // Current Book
    if (containers.currentBookContainer && containers.noReadingMessage) {
        containers.currentBookContainer.innerHTML = '';
        if (currentBooks.models.length > 0) {
            const currentBookDiv = await currentBooks.models[0].renderCurrent();
            containers.currentBookContainer.appendChild(currentBookDiv);
            containers.noReadingMessage.classList.add('hidden');
        } else {
            containers.noReadingMessage.classList.remove('hidden');
        }
    }

    // Last Read Book
    if (containers.lastReadBookContainer) {
        containers.lastReadBookContainer.innerHTML = '';
        const lastReadBook = books.getLastReadBook();
        if (lastReadBook) {
            const lastReadBookDiv = await lastReadBook.renderCurrent();
            containers.lastReadBookContainer.appendChild(lastReadBookDiv);
        }
    }

    // Most Prolific Author
    if (containers.mostProlificAuthorContainer) {
        containers.mostProlificAuthorContainer.innerHTML = '';
        const mostProlificAuthorDiv = await books.renderMostProlificAuthor();
        containers.mostProlificAuthorContainer.appendChild(mostProlificAuthorDiv);
    }

    // Total Stats
    if (containers.totalBooksEl && containers.totalPagesEl && containers.totalThisYearCountEl && containers.totalBookImage) {
        const totalBooks = books.models.length;
        const totalPages = books.models.reduce((sum, b) => sum + (b['Number of Pages'] || 0), 0);
        const booksThisYear = books.models.filter(b => b['Date Read']?.startsWith(currentYear.toString())).length;

        containers.totalBooksEl.textContent = getBookDeclension(totalBooks);
        containers.totalPagesEl.textContent = `${totalPages.toLocaleString('ru-RU')} страниц`;
        containers.totalThisYearCountEl.textContent = booksThisYear;

        const randomReadBook = books.getRandomReadBook();
        if (randomReadBook) {
            const coverUrl = randomReadBook.getCoverUrl();
            containers.totalBookImage.src = coverUrl;
            containers.totalBookImage.alt = randomReadBook.Title;
            containers.totalBookImage.classList.remove('skeleton');
            containers.totalBookImage.onerror = () => {
                containers.totalBookImage.src = 'https://placehold.co/100x150?text=Нет+обложки';
                containers.totalBookImage.onerror = null;
            };
        } else {
            containers.totalBookImage.src = 'https://placehold.co/100x150?text=Нет+обложки';
            containers.totalBookImage.alt = 'Нет обложки';
            containers.totalBookImage.classList.remove('skeleton');
        }
    }

    // Book List
    if (containers.bookListContainer) {
        books.currentPage = 0;
        books.booksPerPage = 9;
        books.sortBy('date-desc');
        containers.bookListContainer.innerHTML = '';
        await books.renderPage('book-list');
    }

    // Future Reads
    if (containers.futureReadsContainer) {
        containers.futureReadsContainer.innerHTML = '';
        if (toReadBooks.models.length > 0) {
            await toReadBooks.renderFutureReads('future-reads');
        } else {
            containers.futureReadsContainer.innerHTML = '<p class="text-gray-600">Нет книг для чтения</p>';
        }
    }

    // Cycle and Series Shelves
    if (containers.cycleShelfContainer) {
        containers.cycleShelfContainer.innerHTML = '';
        await books.renderCycleShelf('cycle-shelf');
    }
    if (containers.seriesShelfContainer) {
        containers.seriesShelfContainer.innerHTML = '';
        await books.renderSeriesShelf('series-shelf');
    }

    // Challenge Block
    if (containers.challengeContainer) {
        const booksThisYear = books.models.filter(b => b['Date Read']?.startsWith(currentYear.toString())).length;
        const progressPercent = Math.min((booksThisYear / readingChallengeGoal) * 100, 100).toFixed(0);
        containers.challengeContainer.innerHTML = `
            <h2 class="text-2xl font-semibold text-gray-700 mb-4">Чтение ${currentYear}: Challenge</h2>
            <div class="flex items-center mb-4">
                <img src="assets/images/reading-challenge.jpg" alt="${currentYear} Reading Challenge Badge" class="w-24 h-auto mr-4">
                <div>
                    <p id="challenge-progress" class="text-gray-600"><strong>${booksThisYear} из ${readingChallengeGoal} книг прочитано</strong></p>
                    <p id="challenge-days" class="text-gray-500 text-sm">Осталось ${Math.ceil((new Date(`${currentYear}-12-31`) - new Date()) / (1000 * 60 * 60 * 24))} дней</p>
                </div>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
                <div id="challenge-bar" class="bg-indigo-600 h-2.5 rounded-full" style="width: ${progressPercent}%"></div>
            </div>
            <p id="challenge-percent" class="text-center text-gray-500 text-sm mt-2">${progressPercent}%</p>
        `;
    }

    // Book Records
    if (containers.bookRecordsContainer) {
        const longestBook = books.models.length ? books.models.reduce((a, b) => (b['Number of Pages'] || 0) > (a['Number of Pages'] || 0) ? b : a) : { Title: 'N/A', 'Number of Pages': 0 };
        const shortestBook = books.models.length ? books.models.reduce((a, b) => (b['Number of Pages'] || Infinity) < (a['Number of Pages'] || Infinity) ? b : a) : { Title: 'N/A', 'Number of Pages': 0 };
        containers.bookRecordsContainer.innerHTML = `
            <p class="text-gray-700 text-base flex items-center">
                <span class="text-indigo-600 mr-2">📏</span>
                <span><strong>Самая длинная:</strong> ${longestBook.Title} <span class="font-semibold text-indigo-600">(${longestBook['Number of Pages']})</span></span>
            </p>
            <p class="text-gray-700 text-base flex items-center">
                <span class="text-indigo-600 mr-2">📖</span>
                <span><strong>Самая короткая:</strong> ${shortestBook.Title} <span class="font-semibold text-indigo-600">(${shortestBook['Number of Pages']})</span></span>
            </p>
        `;
    }

    // Reading Stats
    if (containers.readingStatsContainer) {
        const seriesCounts = {};
        books.models.forEach(b => { if (b.Series) seriesCounts[b.Series] = (seriesCounts[b.Series] || 0) + 1; });
        const totalBooks = books.models.length;
        const totalPages = books.models.reduce((sum, b) => sum + (b['Number of Pages'] || 0), 0);
        const months = new Set(books.models.map(b => b['Date Read']?.slice(0, 7)).filter(Boolean));
        const avgBooksPerMonth = months.size ? (totalBooks / months.size).toFixed(1) : 0;
        const avgPagesPerMonth = months.size ? (totalPages / months.size).toFixed(0) : 0;
        containers.readingStatsContainer.innerHTML = `
            <p class="text-gray-700 text-base flex items-center">
                <span class="text-indigo-600 mr-2">📚</span>
                <span><strong>Всего книг:</strong> <span class="font-semibold text-indigo-600">${totalBooks.toLocaleString('ru-RU')}</span></span>
            </p>
            <p class="text-gray-700 text-base flex items-center">
                <span class="text-indigo-600 mr-2">📖</span>
                <span><strong>Всего страниц:</strong> <span class="font-semibold text-indigo-600">${totalPages.toLocaleString('ru-RU')}</span></span>
            </p>
            <p class="text-gray-700 text-base flex items-center">
                <span class="text-indigo-600 mr-2">🔄</span>
                <span><strong>Циклов прочитано:</strong> <span class="font-semibold text-indigo-600">${Object.keys(seriesCounts).length}</span></span>
            </p>
            <p class="text-gray-700 text-base flex items-center">
                <span class="text-indigo-600 mr-2">📅</span>
                <span><strong>В среднем в месяц:</strong> <span class="font-semibold text-indigo-600">${avgBooksPerMonth} книг</span></span>
            </p>
            <p class="text-gray-700 text-base flex items-center">
                <span class="text-indigo-600 mr-2">📜</span>
                <span><strong>Страниц в месяц:</strong> <span class="font-semibold text-indigo-600">${avgPagesPerMonth.toLocaleString('ru-RU')}</span></span>
            </p>
        `;
    }

    // LiveLib Badges
    if (containers.livelibChallengeBadge) {
        containers.livelibChallengeBadge.innerHTML = `
            <h2 class="text-2xl font-semibold text-gray-700 mb-4 text-center">Челлендж на LiveLib</h2>
            <div class="flex justify-center"><a target="_blank" rel="nofollow" title="LiveLib" href="https://www.livelib.ru/challenge/${currentYear}/reader/${username}"><img alt="LiveLib" src="https://u.livelib.ru/reader/${username}/challenge${currentYear}.png" style="border: 0;"></a></div>
        `;
    }
    if (containers.livelibProfileBadge) {
        containers.livelibProfileBadge.innerHTML = `
            <h2 class="text-2xl font-semibold text-gray-700 mb-4 text-center">Профиль на LiveLib</h2>
            <div class="flex justify-center"><a target="_blank" rel="nofollow" title="LiveLib" href="https://www.livelib.ru/reader/${username}"><img alt="LiveLib" src="https://u.livelib.ru/reader/${username}/informer-i3.png" style="border: 0;"></a></div>
        `;
    }

    // Charts
    Object.values(containers.chartContainers).forEach(container => container?.classList.remove('skeleton'));
    await Promise.all([
        books.renderTimelineChart(),
        books.renderRatingChart(),
        books.renderGenreChart()
    ]);
}

// Main execution
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const config = await loadConfig();
        const username = config.livelibUsername;
        const readingChallengeGoal = config.readingChallengeGoal || 50;
        const currentYear = new Date().getFullYear();

        // Update heading
        const heading = document.getElementById('site-heading');
        if (username && heading) heading.textContent = `Книжный путь на LiveLib: ${username}`;

        // Load static data
        const { customPages, bookAnnotations, customDates } = await loadStaticData();

        // Fetch and categorize books
        let { allBooks, lastUpdated, books, currentBooks, toReadBooks } = await fetchAndCategorizeBooks(username, bookAnnotations, customPages, customDates);

        // Load clippings and render slider
        const clippings = await loadClippings();
        if (clippings) await renderNotesSlider(books, clippings);

        // Populate genre filter
        const genreFilter = document.getElementById('genre-filter');
        if (genreFilter) {
            genreFilter.innerHTML = '<option value="">Все жанры</option>';
            const uniqueGenres = [...new Set(allBooks.flatMap(book => book.Genres || []))].sort();
            uniqueGenres.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                genreFilter.appendChild(option);
            });
        }

        // Initial UI render
        await renderUI({ books, currentBooks, toReadBooks, lastUpdated, username, readingChallengeGoal, currentYear });

        // Setup actions block
        const actionsContainer = document.getElementById('actions-container');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <div class="flex flex-col items-center">
                    <button id="refresh-button" class="btn bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-3 rounded-lg shadow-md transition-all duration-300">Обновить данные с LiveLib</button>
                    <p class="text-gray-500 text-sm mt-2">Последнее обновление: <span id="last-updated-timestamp">${lastUpdated ? new Date(lastUpdated).toLocaleString('ru-RU') : 'Данные еще не обновлялись'}</span></p>
                </div>
                <div class="flex flex-col items-center">
                    <button id="copy-book-list" class="btn bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-3 rounded-lg shadow-md transition-all duration-300">Скопировать список книг</button>
                    <p class="text-gray-500 text-sm mt-2">Позволяет выбрать формат списка и скопировать в буфер обмена</p>
                </div>
            `;

            const refreshButton = document.getElementById('refresh-button');
            initCopyListButton(books.models);

            refreshButton.addEventListener('click', async () => {
                try {
                    refreshButton.disabled = true;
                    refreshButton.textContent = 'Загрузка...';

                    // Apply skeleton loaders
                    applySkeletonLoaders({
                        currentBookContainer: document.getElementById('current-book'),
                        lastReadBookContainer: document.getElementById('last-read-book'),
                        mostProlificAuthorContainer: document.getElementById('most-prolific-author'),
                        totalStatsContainer: document.getElementById('total-stats'),
                        totalBookImage: document.getElementById('total-book-image'),
                        bookListContainer: document.getElementById('book-list'),
                        futureReadsContainer: document.getElementById('future-reads'),
                        cycleShelfContainer: document.getElementById('cycle-shelf'),
                        seriesShelfContainer: document.getElementById('series-shelf'),
                        challengeContainer: document.getElementById('challenge-container'),
                        bookRecordsContainer: document.getElementById('book-records'),
                        readingStatsContainer: document.getElementById('reading-stats'),
                        chartContainers: {
                            timelineChart: document.querySelector('#timelineChart'),
                            ratingChart: document.querySelector('#ratingChart'),
                            genreChart: document.querySelector('#genreChart')
                        }
                    });

                    // Refresh data
                    const refreshedData = await fetchAndCategorizeBooks(username, bookAnnotations, customPages, customDates);
                    allBooks = refreshedData.allBooks;
                    lastUpdated = refreshedData.lastUpdated;
                    books = refreshedData.books;
                    currentBooks = refreshedData.currentBooks;
                    toReadBooks = refreshedData.toReadBooks;

                    // Re-render UI
                    await renderUI({ books, currentBooks, toReadBooks, lastUpdated, username, readingChallengeGoal, currentYear });

                    // Update timestamp
                    document.getElementById('last-updated-timestamp').textContent = new Date(lastUpdated).toLocaleString('ru-RU');
                    showPopup({ message: 'Данные успешно обновлены!', type: 'success' });
                } catch (error) {
                    console.error('Refresh error:', error);
                    showPopup({ message: `Не удалось обновить данные: ${error.message}`, type: 'error' });
                } finally {
                    refreshButton.disabled = false;
                    refreshButton.textContent = 'Обновить данные с LiveLib';
                }
            });
        }

        // Filter functionality
        const applyFilters = async () => {
            let filteredBooks = books.filterByGenre(genreFilter?.value).sortBy(document.getElementById('sort-by')?.value || 'date-desc');
            filteredBooks.currentPage = 0;
            document.getElementById('book-list').innerHTML = '';
            await filteredBooks.renderPage('book-list');
        };
        if (genreFilter) genreFilter.addEventListener('change', applyFilters);
        document.getElementById('sort-by')?.addEventListener('change', applyFilters);

        // Load more
        document.getElementById('load-more')?.addEventListener('click', async () => {
            books.currentPage += 1;
            await books.renderPage('book-list');
        });

        // Tab switching for Main Tabs
        setupTabSwitching({ buttonClass: 'main-tab-button', paneClass: 'main-tab-pane' });
        setupTabSwitching({ buttonClass: 'series-tab-button', paneClass: 'series-tab-pane' });

    } catch (error) {
        console.error('Error:', error);
    }
});