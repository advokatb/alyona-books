// storage.js
export function loadBooksFromStorage(username) {
    const key = `livelibBooks_${username}`;
    const resetKey = `livelibBooks_reset_${username}`;
    
    // Check if reset is needed
    const lastReset = localStorage.getItem(resetKey);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    if (lastReset) {
        const lastResetDate = new Date(parseInt(lastReset));
        const lastResetDay = new Date(lastResetDate.getFullYear(), lastResetDate.getMonth(), lastResetDate.getDate()).getTime();
        const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (today > lastResetDay) {
            // New day, reset localStorage
            localStorage.removeItem(key);
            localStorage.setItem(resetKey, now.getTime().toString());
            console.log(`localStorage for ${username} reset on ${now.toLocaleDateString('ru-RU')}`);
        }
    } else {
        // No reset timestamp, set it now
        localStorage.setItem(resetKey, now.getTime().toString());
    }

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
        localStorage.removeItem('livelibBooks');
        return { allBooks, lastUpdated };
    }

    return null;
}

export function saveBooksToStorage(username, allBooks, lastUpdated) {
    const key = `livelibBooks_${username}`;
    localStorage.setItem(key, JSON.stringify({ books: allBooks, timestamp: lastUpdated }));
}