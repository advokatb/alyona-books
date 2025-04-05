// slider.js
export async function renderNotesSlider(books, clippings) {
    const container = document.querySelector('.container');
    const notesBlock = document.createElement('div');
    notesBlock.className = 'bg-white p-6 rounded-lg shadow-lg mb-12 fade-in notes-block';
    notesBlock.innerHTML = `
        <h2 class="text-2xl font-semibold text-gray-700 mb-6 text-center">Мои заметки из книг</h2>
        <div class="notes-slider relative">
            <button class="prev-slide absolute top-1/2 left-2 transform -translate-y-1/2 bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 transition-all duration-300 shadow-md z-10">
                <i class="fas fa-chevron-left"></i>
            </button>
            <div class="notes-slides flex transition-transform duration-500 ease-in-out"></div>
            <button class="next-slide absolute top-1/2 right-2 transform -translate-y-1/2 bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 transition-all duration-300 shadow-md z-10">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    container.insertBefore(notesBlock, container.querySelector('.refresh-container') || container.lastChild);

    const slidesContainer = notesBlock.querySelector('.notes-slides');
    const readBookTitles = new Set(books.allBooks.map(b => b.Title.toLowerCase().trim()));
    const matchingNotes = clippings.filter(note => readBookTitles.has(note.title.toLowerCase().trim()));

    if (matchingNotes.length === 0) {
        slidesContainer.innerHTML = '<p class="text-gray-600 text-center w-full py-4">Нет заметок для прочитанных книг</p>';
        return;
    }

    const slideGroups = [];
    for (let i = 0; i < matchingNotes.length; i += 2) {
        slideGroups.push(matchingNotes.slice(i, i + 2));
    }

    for (const group of slideGroups) {
        const slide = document.createElement('div');
        slide.className = 'notes-slide flex-shrink-0 w-full flex flex-col md:flex-row items-start gap-6 p-4';

        for (const note of group) {
            const book = books.allBooks.find(b => b.Title.toLowerCase().trim() === note.title.toLowerCase().trim());
            if (book) {
                const author = await book.getDisplayAuthor();
                const noteDiv = document.createElement('div');
                noteDiv.className = 'flex-1 bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 flex items-start note-card';
                noteDiv.innerHTML = `
                    <img src="${book.getCoverUrl()}" alt="${book.Title}" class="w-16 h-24 object-cover rounded-md mr-4 flex-shrink-0"
                         onerror="this.src='https://placehold.co/100x150?text=Нет+обложки'; this.onerror=null;">
                    <div class="flex-1">
                        <blockquote class="text-gray-800 text-sm italic mb-3 leading-relaxed">"${note.citation}"</blockquote>
                        <p class="text-gray-600 text-sm font-medium">— ${author}, <a href="${book.getLiveLibBookLink()}" target="_blank" class="text-indigo-600 hover:underline">${book.Title}</a></p>
                    </div>
                `;
                slide.appendChild(noteDiv);
            }
        }

        slidesContainer.appendChild(slide);
    }

    const slides = slidesContainer.querySelectorAll('.notes-slide');
    const prevButton = notesBlock.querySelector('.prev-slide');
    const nextButton = notesBlock.querySelector('.next-slide');

    if (slides.length <= 1) {
        prevButton.style.display = 'none';
        nextButton.style.display = 'none';
        return;
    }

    let currentIndex = 0;
    const totalSlides = slides.length;

    function updateSlider() {
        const offset = -currentIndex * 100;
        slidesContainer.style.transform = `translateX(${offset}%)`;
        prevButton.disabled = currentIndex === 0;
        nextButton.disabled = currentIndex === totalSlides - 1;
    }

    prevButton.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateSlider();
        }
    });

    nextButton.addEventListener('click', () => {
        if (currentIndex < totalSlides - 1) {
            currentIndex++;
            updateSlider();
        }
    });

    updateSlider();
}