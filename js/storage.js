// storage.js
export function loadBooksFromStorage(username) {
    const key = `livelibBooks_${username}`; // Unique key per username
    const storedData = localStorage.getItem(key);
    if (storedData) {
        const data = JSON.parse(storedData);
        if (Array.isArray(data)) {
            // Old format: just an array of books (migrate to new format)
            const allBooks = data;
            const lastUpdated = null;
            localStorage.setItem(key, JSON.stringify({ books: allBooks, timestamp: lastUpdated }));
            return { allBooks, lastUpdated };
        } else {
            // New format: object with books and timestamp
            const allBooks = data.books || [];
            const lastUpdated = data.timestamp || null;
            return { allBooks, lastUpdated };
        }
    }

    // Check for old global key (without username) and migrate if found
    const oldData = localStorage.getItem('livelibBooks');
    if (oldData && !storedData) {
        const data = JSON.parse(oldData);
        let allBooks, lastUpdated;
        if (Array.isArray(data)) {
            allBooks = data;
            lastUpdated = null;
        } else {
            allBooks = data.books || [];
            lastUpdated = data.timestamp || null;
        }
        // Migrate to new username-specific key
        localStorage.setItem(key, JSON.stringify({ books: allBooks, timestamp: lastUpdated }));
        localStorage.removeItem('livelibBooks'); // Clean up old key
        return { allBooks, lastUpdated };
    }

    return null;
}

export function saveBooksToStorage(username, allBooks, lastUpdated) {
    const key = `livelibBooks_${username}`; // Unique key per username
    localStorage.setItem(key, JSON.stringify({ books: allBooks, timestamp: lastUpdated }));
}