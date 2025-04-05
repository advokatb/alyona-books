// js/clippings.js
export async function loadClippings() {
    try {
        const response = await fetch('data/My Clippings.txt');
        if (!response.ok) throw new Error(`Clippings file fetch failed: ${response.status} ${response.statusText}`);
        const text = await response.text();
        const notes = parseClippings(text);
        return notes;
    } catch (error) {
        console.warn('No clippings file found or error parsing:', error);
        return null;
    }
}

function parseClippings(text) {
    // Normalize line endings and remove BOM
    const normalizedText = text.replace(/^\ufeff/, '').replace(/\r\n|\r|\n/g, '\n');
    const entries = normalizedText.split('==========').map(entry => entry.trim()).filter(entry => entry);

    const notes = entries.map((entry, index) => {
        const lines = entry.split('\n').map(line => line.trim()).filter(line => line);

        if (lines.length < 3) {
            return null;
        }

        const titleAuthorMatch = lines[0].match(/^(.*?)\s*\((.*?)\)$/);
        if (!titleAuthorMatch) {
            return null;
        }
        let [, rawTitle, author] = titleAuthorMatch;

        // Normalize the title by removing prefixes like "Crime fiction - 01 -" or "Соглашение - 03 -"
        const normalizedTitle = normalizeTitle(rawTitle);

        const metadata = lines[1].match(/Добавлено:\s*(.*?)\s*в\s*(\d{2}:\d{2}:\d{2})/);
        if (!metadata) {
            return null;
        }
        const dateStr = metadata[1];
        const citation = lines.slice(2).join(' ').trim();

        return {
            title: normalizedTitle.trim(), // Use normalized title for matching
            originalTitle: rawTitle.trim(), // Keep original for debugging/display if needed
            author: author.trim(),
            citation,
            dateAdded: dateStr ? parseClippingsDate(dateStr) : null
        };
    }).filter(note => note && note.citation);

    return notes;
}

function normalizeTitle(title) {
    // Remove prefixes like "Crime fiction - 01 -" or "Соглашение - 03 -"
    // Pattern: [Series or Category] - [Number] - [Core Title]
    const prefixPattern = /^(.*?)\s*-\s*\d+\s*-\s*(.*)$/;
    const match = title.match(prefixPattern);
    if (match) {
        return match[2]; // Return the core title (e.g., "Вторая сестра" from "Crime fiction - 01 - Вторая сестра")
    }
    
    // Handle cases without a clear number prefix (e.g., "Канашибари - Пока не погаснет последний фонарь. Том 2")
    const simplePrefixPattern = /^(.*?)\s*-\s*(.*)$/;
    const simpleMatch = title.match(simplePrefixPattern);
    if (simpleMatch && simpleMatch[2].includes('.')) { // Check if it looks like a title with a subtitle (e.g., "Том 2")
        return simpleMatch[2]; // Return the part after the prefix
    }

    // If no prefix is detected, return the original title
    return title;
}

function parseClippingsDate(dateStr) {
    // Example: "пятница, 6 декабря 2024 г." -> "2024-12-06"
    const dayMap = {
        'понедельник': 'Mon', 'вторник': 'Tue', 'среда': 'Wed', 'четверг': 'Thu',
        'пятница': 'Fri', 'суббота': 'Sat', 'воскресенье': 'Sun'
    };
    const monthMap = {
        'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04', 'мая': '05', 'июня': '06',
        'июля': '07', 'августа': '08', 'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12'
    };

    const [dayName, day, monthStr, year] = dateStr.split(/,\s*|\s+/);
    const month = monthMap[monthStr.toLowerCase()];
    return `${year}-${month}-${day.padStart(2, '0')}`;
}