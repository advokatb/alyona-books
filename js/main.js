// main.js
import { fetchLiveLibData, loadStaticData } from './dataFetcher.js';
import { loadBooksFromStorage, saveBooksToStorage } from './storage.js';

// Load config dynamically
async function loadConfig() {
    const response = await fetch('data/config.json'); 
    const config = await response.json();
    return config;
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const config = await loadConfig();
        const username = config.livelibUsername;
        const readingChallengeGoal = config.readingChallengeGoal || 50; 
        const currentYear = new Date().getFullYear(); 

        // Load static data
        const { customPages, bookAnnotations, customDates } = await loadStaticData();

        // Load or fetch initial data
        let allBooks, lastUpdated;
        const stored = loadBooksFromStorage(username); // Pass username
        if (stored) {
            allBooks = stored.allBooks;
            lastUpdated = stored.lastUpdated;
            console.log(`Loaded books for ${username} from localStorage:`, allBooks.length, 'Last updated:', lastUpdated);
        } else {
            allBooks = await fetchLiveLibData(username, bookAnnotations, customPages);
            lastUpdated = new Date().toISOString();
            saveBooksToStorage(username, allBooks, lastUpdated); // Pass username
            console.log(`Fetched initial books for ${username} from LiveLib:`, allBooks.length);
        }

        // Categorize books
        let readBooks = allBooks.filter(b => b['Exclusive Shelf'] === 'read');
        let readingBooks = allBooks.filter(b => b['Exclusive Shelf'] === 'currently-reading');
        let wishBooks = allBooks.filter(b => b['Exclusive Shelf'] === 'to-read');

        const books = new BookCollection(readBooks, customDates);
        const currentBooks = new BookCollection(readingBooks, customDates);
        const toReadBooks = new BookCollection(wishBooks, customDates);

        // Populate genre filter
        const genreFilter = document.getElementById('genre-filter');
        if (genreFilter) {
            genreFilter.innerHTML = '<option value="">Все жанры</option>';
            const uniqueGenres = [...new Set(allBooks.flatMap(book => book.Genres || []))].sort();
            // console.log('Unique genres:', uniqueGenres);
            uniqueGenres.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                genreFilter.appendChild(option);
            });
        }

        // Render initial UI and remove skeletons
        const currentBookContainer = document.getElementById('current-book');
        currentBookContainer.innerHTML = '';
        if (currentBooks.models.length > 0) {
            const currentBookDiv = await currentBooks.models[0].renderCurrent();
            currentBookContainer.appendChild(currentBookDiv);
        } else {
            currentBookContainer.innerHTML = '<p class="text-gray-600">Ничего не читаю сейчас</p>';
        }

        const lastReadBook = books.getLastReadBook();
        const lastReadBookContainer = document.getElementById('last-read-book');
        lastReadBookContainer.innerHTML = '';
        if (lastReadBook) {
            const lastReadBookDiv = await lastReadBook.renderCurrent();
            lastReadBookContainer.appendChild(lastReadBookDiv);
        }

        const mostProlificAuthorContainer = document.getElementById('most-prolific-author');
        mostProlificAuthorContainer.innerHTML = '';
        const mostProlificAuthorDiv = await books.renderMostProlificAuthor();
        mostProlificAuthorContainer.appendChild(mostProlificAuthorDiv);

        const totalContainer = document.querySelector('#total-book')?.nextElementSibling;
        if (totalContainer) {
            totalContainer.innerHTML = '';
            totalContainer.innerHTML = `
                <p class="text-lg font-bold">${getBookDeclension(readBooks.length)}</p>
                <p class="text-lg">${readBooks.reduce((sum, b) => sum + (b['Number of Pages'] || 0), 0).toLocaleString('ru-RU')} страниц</p>
                <p class="text-sm text-gray-500">В этом году: <span>${readBooks.filter(b => b['Date Read']?.startsWith('2025')).length}</span></p>
            `;
        }

        const totalBookImage = document.getElementById('total-book-image');
        const randomReadBook = books.getRandomReadBook();

        if (randomReadBook && totalBookImage) {
            const coverUrl = randomReadBook.getCoverUrl();
            totalBookImage.src = coverUrl;
            totalBookImage.alt = randomReadBook.Title;
            totalBookImage.classList.remove('skeleton');
            totalBookImage.onerror = () => {
                totalBookImage.src = 'https://placehold.co/100x150?text=Нет+обложки';
                totalBookImage.onerror = null; // Prevent infinite loop
            };
        } else if (totalBookImage) {
            totalBookImage.src = 'https://placehold.co/100x150?text=Нет+обложки';
            totalBookImage.alt = 'Нет обложки';
            totalBookImage.classList.remove('skeleton');
        } else {
            console.error('Total book image element not found in DOM');
        }

        books.currentPage = 0;
        books.booksPerPage = 9;
        books.sortBy('date-desc');
        const bookListContainer = document.getElementById('book-list');
        bookListContainer.innerHTML = '';
        await books.renderPage('book-list');

        const futureReadsContainer = document.getElementById('future-reads');
        futureReadsContainer.innerHTML = '';
        if (toReadBooks.models.length > 0) {
            await toReadBooks.renderFutureReads('future-reads');
        } else {
            futureReadsContainer.innerHTML = '<p class="text-gray-600">Нет книг для чтения</p>';
        }

        const seriesShelfContainer = document.getElementById('series-shelf');
        seriesShelfContainer.innerHTML = '';
        await books.renderSeriesShelf('series-shelf');

        // Challenge Block
        const booksThisYear = readBooks.filter(b => b['Date Read']?.startsWith(currentYear.toString())).length;
        const progressPercent = Math.min((booksThisYear / readingChallengeGoal) * 100, 100).toFixed(0);
        const challengeContainer = document.getElementById('challenge-container');
        if (challengeContainer) {
            challengeContainer.innerHTML = `
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
        } else {
            console.error('Challenge container not found');
        }

        const longestBook = readBooks.length ? readBooks.reduce((a, b) => (b['Number of Pages'] || 0) > (a['Number of Pages'] || 0) ? b : a) : { Title: 'N/A', 'Number of Pages': 0 };
        const shortestBook = readBooks.length ? readBooks.reduce((a, b) => (b['Number of Pages'] || Infinity) < (a['Number of Pages'] || Infinity) ? b : a) : { Title: 'N/A', 'Number of Pages': 0 };
        document.getElementById('book-records').innerHTML = `
            <p class="text-gray-700 text-base flex items-center">
                <span class="text-indigo-600 mr-2">📏</span>
                <span><strong>Самая длинная:</strong> ${longestBook.Title} <span class="font-semibold text-indigo-600">(${longestBook['Number of Pages']})</span></span>
            </p>
            <p class="text-gray-700 text-base flex items-center">
                <span class="text-indigo-600 mr-2">📖</span>
                <span><strong>Самая короткая:</strong> ${shortestBook.Title} <span class="font-semibold text-indigo-600">(${shortestBook['Number of Pages']})</span></span>
            </p>
        `;

        // Reading Stats
        const seriesCounts = {};
        readBooks.forEach(b => {
            if (b.Series) seriesCounts[b.Series] = (seriesCounts[b.Series] || 0) + 1;
        });
        const totalBooks = readBooks.length;
        const totalPages = readBooks.reduce((sum, b) => sum + (b['Number of Pages'] || 0), 0);
        const months = new Set(readBooks.map(b => b['Date Read']?.slice(0, 7)).filter(Boolean));
        const avgBooksPerMonth = months.size ? (readBooks.length / months.size).toFixed(1) : 0;
        const avgPagesPerMonth = months.size ? (totalPages / months.size).toFixed(0) : 0;
        document.getElementById('reading-stats').innerHTML = `
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

        // New LiveLib Badges
        const livelibChallengeBadge = document.getElementById('livelib-challenge-badge');
        if (livelibChallengeBadge) {
            livelibChallengeBadge.innerHTML = `
                <h2 class="text-2xl font-semibold text-gray-700 mb-4 text-center">Челлендж на LiveLib</h2>
                <div class="flex justify-center"><a target="_blank" rel="nofollow" title="LiveLib" href="https://www.livelib.ru/challenge/${currentYear}/reader/${username}"><img alt="LiveLib" src="https://u.livelib.ru/reader/${username}/challenge${currentYear}.png" style="border: 0;"></a></div>
            `;
        }

        const livelibProfileBadge = document.getElementById('livelib-profile-badge');
        if (livelibProfileBadge) {
            livelibProfileBadge.innerHTML = `
                <h2 class="text-2xl font-semibold text-gray-700 mb-4 text-center">Профиль на LiveLib</h2>
                <div class="flex justify-center"><a target="_blank" rel="nofollow" title="LiveLib" href="https://www.livelib.ru/reader/${username}"><img alt="LiveLib" src="https://u.livelib.ru/reader/${username}/informer-i3.png" style="border: 0;"></a></div>
            `;
        }

        const chartContainers = {
            timelineChart: document.querySelector('#timelineChart'),
            ratingChart: document.querySelector('#ratingChart'),
            genreChart: document.querySelector('#genreChart')
        };
        Object.values(chartContainers).forEach(container => {
            if (container) container.classList.remove('skeleton');
        });
        await Promise.all([
            books.renderTimelineChart(),
            books.renderRatingChart(),
            books.renderGenreChart()
        ]);

        // Refresh button with timestamp
        const container = document.querySelector('.container') || document.body;
        const refreshContainer = document.createElement('div');
        refreshContainer.className = 'refresh-container mt-6 text-center';
        const refreshButton = document.createElement('button');
        refreshButton.textContent = 'Обновить данные с LiveLib';
        refreshButton.className = 'btn bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg';
        const timestampDisplay = document.createElement('p');
        timestampDisplay.className = 'text-gray-500 text-sm mt-2';
        timestampDisplay.textContent = lastUpdated
            ? `Последнее обновление: ${new Date(lastUpdated).toLocaleString('ru-RU')}`
            : 'Данные еще не обновлялись';
        refreshContainer.appendChild(refreshButton);
        refreshContainer.appendChild(timestampDisplay);
        container.appendChild(refreshContainer);

        refreshButton.addEventListener('click', async () => {
            try {
                refreshButton.disabled = true;
                refreshButton.textContent = 'Загрузка...';

                currentBookContainer.innerHTML = '<div class="skeleton skeleton-image mr-4"></div><div class="flex-1"><div class="skeleton skeleton-text w-3/4"></div><div class="skeleton skeleton-text w-1/2"></div><div class="skeleton skeleton-text w-2/3"></div></div>';
                lastReadBookContainer.innerHTML = '<div class="skeleton skeleton-image mr-4"></div><div class="flex-1"><div class="skeleton skeleton-text w-3/4"></div><div class="skeleton skeleton-text w-1/2"></div><div class="skeleton skeleton-text w-2/3"></div></div>';
                mostProlificAuthorContainer.innerHTML = '<div class="skeleton skeleton-image w-16 h-24 mr-2"></div><div class="flex-1"><div class="skeleton skeleton-text w-3/4"></div><div class="skeleton skeleton-text w-1/2"></div></div>';
                totalContainer.innerHTML = '<div class="skeleton skeleton-text w-3/4"></div><div class="skeleton skeleton-text w-1/2"></div><div class="skeleton skeleton-text w-2/3"></div>';
                totalBookImage.classList.add('skeleton');
                bookListContainer.innerHTML = Array(9).fill('').map(() => '<div class="book-card skeleton-card skeleton"></div>').join('');
                futureReadsContainer.innerHTML = Array(3).fill('').map(() => '<div class="book-card skeleton-card skeleton"></div>').join('');
                seriesShelfContainer.innerHTML = Array(3).fill('').map(() => `
                    <div class="series-box">
                        <div class="skeleton skeleton-text w-3/4 mb-2"></div>
                        <div class="skeleton skeleton-text w-1/2 mb-2"></div>
                        <div class="series-row">${Array(3).fill('').map((_, i) => `<div class="series-book" style="left: ${i * 60}px;"><div class="skeleton" style="width: 80px; height: 120px;"></div></div>`).join('')}</div>
                    </div>
                `).join('');
                if (challengeContainer) {
                    challengeContainer.innerHTML = `
                        <h2 class="text-2xl font-semibold text-gray-700 mb-4">Чтение 2025: Challenge</h2>
                        <div class="flex items-center mb-4"><div class="skeleton w-24 h-12 mr-4"></div><div><div class="skeleton skeleton-text w-3/4"></div><div class="skeleton skeleton-text w-1/2"></div></div></div>
                        <div class="skeleton w-full h-2.5 rounded-full"></div><div class="skeleton skeleton-text w-1/4 mt-2 mx-auto"></div>
                    `;
                }
                document.getElementById('book-records').innerHTML = '<div class="skeleton skeleton-text w-3/4 mb-2"></div><div class="skeleton skeleton-text w-3/4"></div>';
                document.getElementById('reading-stats').innerHTML = '<div class="skeleton skeleton-text w-3/4 mb-2"></div><div class="skeleton skeleton-text w-3/4"></div>';
                Object.values(chartContainers).forEach(container => container.classList.add('skeleton'));

                allBooks = await fetchLiveLibData(username, bookAnnotations, customPages);
                lastUpdated = new Date().toISOString();
                saveBooksToStorage(username, allBooks, lastUpdated);

                readBooks = allBooks.filter(b => b['Exclusive Shelf'] === 'read');
                readingBooks = allBooks.filter(b => b['Exclusive Shelf'] === 'currently-reading');
                wishBooks = allBooks.filter(b => b['Exclusive Shelf'] === 'to-read');

                books.models = new BookCollection(readBooks, customDates).models;
                books.allBooks = books.models;
                currentBooks.models = new BookCollection(readingBooks, customDates).models;
                currentBooks.allBooks = currentBooks.models;
                toReadBooks.models = new BookCollection(wishBooks, customDates).models;
                toReadBooks.allBooks = toReadBooks.models;

                currentBookContainer.innerHTML = '';
                if (currentBooks.models.length > 0) {
                    const currentBookDiv = await currentBooks.models[0].renderCurrent();
                    currentBookContainer.appendChild(currentBookDiv);
                } else {
                    currentBookContainer.innerHTML = '<p class="text-gray-600">Ничего не читаю сейчас</p>';
                }

                lastReadBookContainer.innerHTML = '';
                const newLastReadBook = books.getLastReadBook();
                if (newLastReadBook) {
                    const lastReadBookDiv = await newLastReadBook.renderCurrent();
                    lastReadBookContainer.appendChild(lastReadBookDiv);
                }

                mostProlificAuthorContainer.innerHTML = '';
                const newMostProlificAuthorDiv = await books.renderMostProlificAuthor();
                mostProlificAuthorContainer.appendChild(newMostProlificAuthorDiv);

                totalContainer.innerHTML = `
                    <p class="text-lg font-bold">${getBookDeclension(readBooks.length)}</p>
                    <p class="text-lg">${readBooks.reduce((sum, b) => sum + (b['Number of Pages'] || 0), 0).toLocaleString('ru-RU')} страниц</p>
                    <p class="text-sm text-gray-500">В этом году: <span>${readBooks.filter(b => b['Date Read']?.startsWith('2025')).length}</span></p>
                `;
                const refreshedRandomBook = books.getRandomReadBook();
                if (refreshedRandomBook && totalBookImage) {
                    const coverUrl = refreshedRandomBook.getCoverUrl();
                    totalBookImage.src = coverUrl;
                    totalBookImage.alt = refreshedRandomBook.Title;
                    totalBookImage.classList.remove('skeleton');
                    totalBookImage.onerror = () => {
                        console.log('Refreshed image failed, using fallback');
                        totalBookImage.src = 'https://placehold.co/100x150?text=Нет+обложки';
                        totalBookImage.onerror = null;
                    };
                }

                bookListContainer.innerHTML = '';
                await books.renderPage('book-list');

                futureReadsContainer.innerHTML = '';
                if (toReadBooks.models.length > 0) {
                    await toReadBooks.renderFutureReads('future-reads');
                } else {
                    futureReadsContainer.innerHTML = '<p class="text-gray-600">Нет книг для чтения</p>';
                }

                seriesShelfContainer.innerHTML = '';
                await books.renderSeriesShelf('series-shelf');

                const refreshedBooksThisYear = readBooks.filter(b => b['Date Read']?.startsWith(currentYear.toString())).length;
                const refreshedProgressPercent = Math.min((refreshedBooksThisYear / readingChallengeGoal) * 100, 100).toFixed(0);
                if (challengeContainer) {
                    challengeContainer.innerHTML = `
                        <h2 class="text-2xl font-semibold text-gray-700 mb-4">Чтение ${currentYear}: Challenge</h2>
                        <div class="flex items-center mb-4">
                            <img src="assets/images/reading-challenge.jpg" alt="${currentYear} Reading Challenge Badge" class="w-24 h-auto mr-4">
                            <div>
                                <p id="challenge-progress" class="text-gray-600"><strong>${refreshedBooksThisYear} из ${readingChallengeGoal} книг прочитано</strong></p>
                                <p id="challenge-days" class="text-gray-500 text-sm">Осталось ${Math.ceil((new Date(`${currentYear}-12-31`) - new Date()) / (1000 * 60 * 60 * 24))} дней</p>
                            </div>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2.5">
                            <div id="challenge-bar" class="bg-indigo-600 h-2.5 rounded-full" style="width: ${refreshedProgressPercent}%"></div>
                        </div>
                        <p id="challenge-percent" class="text-center text-gray-500 text-sm mt-2">${refreshedProgressPercent}%</p>
                    `;
                }

                const refreshedLongestBook = readBooks.length ? readBooks.reduce((a, b) => (b['Number of Pages'] || 0) > (a['Number of Pages'] || 0) ? b : a) : { Title: 'N/A', 'Number of Pages': 0 };
                const refreshedShortestBook = readBooks.length ? readBooks.reduce((a, b) => (b['Number of Pages'] || Infinity) < (a['Number of Pages'] || Infinity) ? b : a) : { Title: 'N/A', 'Number of Pages': 0 };
                document.getElementById('book-records').innerHTML = `
                    <p class="text-gray-700 text-base flex items-center">
                        <span class="text-indigo-600 mr-2">📏</span>
                        <span><strong>Самая длинная книга:</strong> ${refreshedLongestBook.Title} <span class="font-semibold text-indigo-600">(${refreshedLongestBook['Number of Pages']} стр.)</span></span>
                    </p>
                    <p class="text-gray-700 text-base flex items-center">
                        <span class="text-indigo-600 mr-2">📖</span>
                        <span><strong>Самая короткая книга:</strong> ${refreshedShortestBook.Title} <span class="font-semibold text-indigo-600">(${refreshedShortestBook['Number of Pages']} стр.)</span></span>
                    </p>
                `;

                const refreshedMonths = new Set(readBooks.map(b => b['Date Read']?.slice(0, 7)).filter(Boolean));
                const refreshedTotalBooks = readBooks.length;
                const refreshedTotalPages = readBooks.reduce((sum, b) => sum + (b['Number of Pages'] || 0), 0);
                const refreshedAvgBooksPerMonth = refreshedMonths.size ? (readBooks.length / refreshedMonths.size).toFixed(1) : 0;
                const refreshedAvgPagesPerMonth = refreshedMonths.size ? (refreshedTotalPages / refreshedMonths.size).toFixed(0) : 0;
                document.getElementById('reading-stats').innerHTML = `
                    <p class="text-gray-700 text-base flex items-center">
                        <span class="text-indigo-600 mr-2">📚</span>
                        <span><strong>Всего книг:</strong> <span class="font-semibold text-indigo-600">${refreshedTotalBooks.toLocaleString('ru-RU')}</span></span>
                    </p>
                    <p class="text-gray-700 text-base flex items-center">
                        <span class="text-indigo-600 mr-2">📖</span>
                        <span><strong>Всего страниц:</strong> <span class="font-semibold text-indigo-600">${refreshedTotalPages.toLocaleString('ru-RU')}</span></span>
                    </p>
                    <p class="text-gray-700 text-base flex items-center">
                        <span class="text-indigo-600 mr-2">🔄</span>
                        <span><strong>Циклов прочитано:</strong> <span class="font-semibold text-indigo-600">${Object.keys(seriesCounts).length}</span></span>
                    </p>
                    <p class="text-gray-700 text-base flex items-center">
                        <span class="text-indigo-600 mr-2">📅</span>
                        <span><strong>В среднем в месяц:</strong> <span class="font-semibold text-indigo-600">${refreshedAvgBooksPerMonth} книг</span></span>
                    </p>
                    <p class="text-gray-700 text-base flex items-center">
                        <span class="text-indigo-600 mr-2">📜</span>
                        <span><strong>Страниц в месяц:</strong> <span class="font-semibold text-indigo-600">${refreshedAvgPagesPerMonth.toLocaleString('ru-RU')}</span></span>
                    </p>
                `;

                Object.values(chartContainers).forEach(container => container.classList.remove('skeleton'));
                await Promise.all([
                    books.renderTimelineChart(),
                    books.renderRatingChart(),
                    books.renderGenreChart()
                ]);

                if (genreFilter) {
                    genreFilter.innerHTML = '<option value="">Все жанры</option>';
                    const refreshedGenres = [...new Set(allBooks.flatMap(book => book.Genres || []))].sort();
                    refreshedGenres.forEach(genre => {
                        const option = document.createElement('option');
                        option.value = genre;
                        option.textContent = genre;
                        genreFilter.appendChild(option);
                    });
                }

                if (livelibChallengeBadge) {
                    livelibChallengeBadge.innerHTML = `
                        <h2 class="text-2xl font-semibold text-gray-700 mb-4 text-center">Челлендж на LiveLib</h2>
                        <div class="flex justify-center"><a target="_blank" rel="nofollow" title="LiveLib" href="https://www.livelib.ru/challenge/${currentYear}/reader/${username}"><img alt="LiveLib" src="https://u.livelib.ru/reader/${username}/challenge${currentYear}.png" style="border: 0;"></a></div>
                    `;
                }
        
                if (livelibProfileBadge) {
                    livelibProfileBadge.innerHTML = `
                        <h2 class="text-2xl font-semibold text-gray-700 mb-4 text-center">Профиль на LiveLib</h2>
                        <div class="flex justify-center"><a target="_blank" rel="nofollow" title="LiveLib" href="https://www.livelib.ru/reader/${username}"><img alt="LiveLib" src="https://u.livelib.ru/reader/${username}/informer-i3.png" style="border: 0;"></a></div>
                    `;
                }
                
                timestampDisplay.textContent = `Последнее обновление: ${new Date(lastUpdated).toLocaleString('ru-RU')}`;
                showPopup('Данные успешно обновлены!', 'success'); // Success popup
            } catch (error) {
                console.error('Refresh error:', error);
                showPopup(`Не удалось обновить данные: ${error.message}`, 'error');
            } finally {
                refreshButton.disabled = false;
                refreshButton.textContent = 'Обновить данные с LiveLib';
            }
        });

        // Filter functionality
        const applyFilters = async () => {
            let filteredBooks = books.filterByGenre(genreFilter?.value).sortBy(document.getElementById('sort-by')?.value || 'date-desc');
            filteredBooks.currentPage = 0;
            bookListContainer.innerHTML = '';
            await filteredBooks.renderPage('book-list');
        };
        if (genreFilter) genreFilter.addEventListener('change', applyFilters);
        document.getElementById('sort-by')?.addEventListener('change', applyFilters);

        // Load more
        document.getElementById('load-more')?.addEventListener('click', async () => {
            books.currentPage += 1;
            await books.renderPage('book-list');
        });

        // Tab switching
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanes = document.querySelectorAll('.tab-pane');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                button.classList.add('active');
                const tabId = button.getAttribute('data-tab');
                document.getElementById(tabId)?.classList.add('active');
            });
        });

        // Function to show a styled popup
        function showPopup(message, type = 'error') {
            // Remove any existing popup
            const existingPopup = document.getElementById('notification-popup');
            if (existingPopup) existingPopup.remove();

            // Create popup element
            const popup = document.createElement('div');
            popup.id = 'notification-popup';
            popup.className = `
                fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                bg-white rounded-lg shadow-lg p-6 z-50 max-w-sm w-full 
                border-l-4 ${type === 'error' ? 'border-red-500' : 'border-green-500'} 
                fade-in
            `;

            // Popup content
            popup.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <i class="fas fa-${type === 'error' ? 'exclamation-circle text-red-500' : 'check-circle text-green-500'} mr-3"></i>
                        <p class="text-gray-800 text-sm">${message}</p>
                    </div>
                    <button id="close-popup" class="text-gray-500 hover:text-gray-800 focus:outline-none">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;

            // Append to body
            document.body.appendChild(popup);

            // Close popup on button click
            const closeButton = popup.querySelector('#close-popup');
            closeButton.addEventListener('click', () => popup.remove());

            // Auto-close after 5 seconds
            setTimeout(() => {
                popup.classList.remove('fade-in');
                popup.classList.add('fade-out');
                setTimeout(() => popup.remove(), 300); // Match fade-out duration
            }, 5000);

            // Close on outside click
            const outsideClickListener = (event) => {
                if (!popup.contains(event.target)) {
                    popup.remove();
                    document.removeEventListener('click', outsideClickListener);
                }
            };
            setTimeout(() => document.addEventListener('click', outsideClickListener), 100); // Delay to avoid immediate close
        }

    } catch (error) {
        console.error('Error:', error);
    }
});

import { getBookDeclension } from './utils.js';