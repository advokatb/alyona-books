class Book {
    constructor(attributes, customDates) {
        Object.assign(this, attributes);
        this.customDates = customDates || { books: {} }; // Store customDates for calculating reading duration
    }

    async getDisplayAuthor() {
        try {
            const response = await fetch('data/author_mapping.json');
            const AUTHOR_MAPPING = await response.json();
            const baseAuthor = this.Author || this.Authors || (this['Additional Authors'] && this['Additional Authors'].split(',')[0].trim()) || 'No Author';
            return AUTHOR_MAPPING[baseAuthor] || baseAuthor;
        } catch (error) {
            console.error('Failed to load author mapping:', error);
            return this.Author || this.Authors || (this['Additional Authors'] && this['Additional Authors'].split(',')[0].trim()) || 'No Author';
        }
    }

    getCoverUrl() {
        const url = this['Cover URL'] || 'https://placehold.co/100x150?text=Нет+обложки';
        return url.startsWith('http://books.google.com') ? url.replace('http://', 'https://') : url;
    }

    // Calculate the number of days spent reading the book
    getReadingDuration() {
        if (!this['Date Read']) return null;
    
        const endDateStr = this['Date Read'].replace(/\//g, '-');
        const endDate = new Date(endDateStr);
        endDate.setHours(0, 0, 0, 0);
    
        let startDate;
    
        // Safely retrieve customDateInfo
        const customDateInfo = this.customDates?.books?.[this.Title] || {};
    
        if (customDateInfo.custom_start_date) {
            const startDateStr = customDateInfo.custom_start_date.replace(/\//g, '-');
            startDate = new Date(startDateStr);
            startDate.setHours(0, 0, 0, 0);
        } else if (this['Date Added']) {
            const startDateStr = this['Date Added'].replace(/\//g, '-');
            startDate = new Date(startDateStr);
            startDate.setHours(0, 0, 0, 0);
        }
    
        if (isNaN(startDate) || isNaN(endDate)) {
            console.error(`Invalid dates for ${this.Title}: startDate=${startDate}, endDate=${endDate}`);
            return null;
        }
    
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    }
    

    formatDateRead() {
        if (!this['Date Read']) return '';
        const [year, month, day] = this['Date Read'].split('-');
        const days = this.getReadingDuration();
        if (days === null) return `${day}.${month}.${year}`;
        let daysText;
        if (days === 1) {
            daysText = '1 день';
        } else if (days >= 2 && days <= 4) {
            daysText = `${days} дня`;
        } else {
            daysText = `${days} дней`;
        }
        return `${day}.${month}.${year} (${daysText})`;
    }

    getLiveLibBookLink() {
        return this['Book Id'] ? `https://www.livelib.ru/book/${this['Book Id']}` : '#';
    }
    
    getDisplayGenres() {
        return this.Genres?.slice(0, 3) || [];
    }

    async getAnnotation() {
        try {
            const response = await fetch('data/book_annotations.json');
            const annotations = await response.json();
            return this['Annotation'] || 'Нет аннотации';
        } catch (error) {
            console.error('Ошибка загрузки аннотаций:', error);
            return 'Нет аннотации';
        }
    }
    

    async render() {
        const author = await this.getDisplayAuthor();
        const div = document.createElement('div');
        const pages = await this.loadCustomPages();
        const annotationText = await this.getAnnotation();

        const rating = parseFloat(this['My Rating']) || 0;
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5 ? 1 : 0;
        const emptyStars = 5 - fullStars - halfStar;
    
        let starsHtml = '';
        for (let i = 0; i < fullStars; i++) {
            starsHtml += '<i class="fas fa-star text-yellow-400"></i>';
        }
        if (halfStar) {
            starsHtml += '<i class="fas fa-star-half-alt text-yellow-400"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            starsHtml += '<i class="far fa-star text-gray-400"></i>';
        }
    
        div.className = 'book-card bg-gray-50 p-4 rounded-lg shadow relative flex group flip-container';
        div.innerHTML = `
            <div class="book-card-bg absolute inset-0 z-0"></div>
            <div class="relative z-10 w-full h-full">
                <button class="flip-button text-gray-600 hover:text-gray-800 focus:outline-none absolute top-2 right-2 z-20">
                    <i class="fas fa-sync"></i>
                </button>
                <div class="flipper h-full w-full">
                    <!-- Front Side (Book Info) -->
                    <div class="front flex flex-col justify-between w-full h-full overflow-hidden">
                        <div class="flex items-start">
                            <img src="${this.getCoverUrl()}" alt="${this.Title}" class="book-cover mr-4"
                                 onerror="console.error('Failed to load cover for ${this.Title}: ${this.getCoverUrl()}'); this.src='https://placehold.co/100x150?text=Нет+обложки'; this.onerror=null;">
                            <div class="flex-1">
                                <h3 class="text-md font-semibold text-gray-800"><a href="${this.getLiveLibBookLink()}" target="_blank" class="hover:underline">${this.Title}</a></h3>
                                <p class="text-gray-600 text-sm">👤 ${author}</p>
                                <p class="text-gray-500 text-sm">📖 ${pages}</p>
                                ${this.Series ? `<p class="text-gray-500 text-sm">📚 ${this.Series}</p>` : ''}
                                ${this.getDisplayGenres().length > 0 ? `<p class="text-gray-500 text-sm">🎭 ${this.getDisplayGenres().join(', ')}</p>` : ''}
                            </div>
                        </div>
                        <div class="flex justify-between items-end mt-2">
                            ${rating > 0 ? `<div class="rating flex items-center">${starsHtml}</div>` : ''}
                        </div>
                    </div>
                    <!-- Back Side (Annotation) -->
                    <div class="back flex items-center justify-center w-full h-full">
                        <div class="p-1 text-center overflow-y-auto max-h-[180px] custom-scrollbar">
                            <p class="text-gray-800 text-sm text-justify">${annotationText}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    
        // Add flip functionality
        const flipper = div.querySelector('.flipper');
        const flipButtons = div.querySelectorAll('.flip-button');
        flipButtons.forEach(button => {
            button.addEventListener('click', () => {
                flipper.classList.toggle('flipped');
            });
        });
    
        return div;
    }

    async loadCustomPages() {
        try {
            const response = await fetch('data/custom_pages.json');
            const pagesMapping = await response.json();
            return pagesMapping[this.Title] || 'N/A';
        } catch (error) {
            console.error('Ошибка загрузки количества страниц:', error);
            return 'N/A';
        }
    }

    
    async renderCurrent() {
        const pages = await this.loadCustomPages();
        const author = await this.getDisplayAuthor();
        const div = document.createElement('div');
        div.className = 'flex space-x-4';
        const imgSrc = this.getCoverUrl();
        const [readYear, readMonth, readDay] = this['Date Read'] ? this['Date Read'].split('-') : ['', '', ''];
        div.innerHTML = `
            <img src="${imgSrc}" alt="${this.Title}" class="book-cover w-16 h-24 mr-2" 
                 onerror="console.error('Failed to load cover for ${this.Title}: ${imgSrc}'); this.src='https://placehold.co/100x150?text=Нет+обложки'; this.onerror=null;">
            <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-800 inline">${this.Title}</h3>
                <p class="text-gray-600 text-sm">Автор: ${author}</p>
                <p class="text-gray-500 text-sm">Страниц: ${pages}</p>
                ${this.Series ? `<p class="text-gray-500 text-sm">Серия: ${this.Series}</p>` : ''}
                ${this['Date Read'] ? `<p class="text-gray-500 text-sm">Прочитано: ${readDay}.${readMonth}.${readYear}</p>` : ''}
            </div>
        `;
        const img = div.querySelector('img');
        img.addEventListener('error', () => {
            console.error(`Image load failed for ${this.Title}: ${imgSrc}`);
            img.src = 'https://placehold.co/100x150?text=Нет+обложки';
        });
        return div;
    }
}