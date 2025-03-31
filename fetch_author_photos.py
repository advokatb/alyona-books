import json
import os
import requests
import time
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxzTdo297yeLns95JN_h8xCKfIKNNvqKg8bk5NXrEOxeRD-gbQAqgxiB18IDDG2WbOO/exec'

def fetch_livelib_books(username):
    """
    Fetch book data from Google Apps Script for all shelves.
    Returns a list of books with titles and author details.
    """
    shelves = ['read', 'reading', 'wish']
    include_columns = ['title', 'authors', 'bookHref']
    all_books = []

    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}

    for shelf in shelves:
        params = {
            'username': username,
            'pagename': shelf,
            'includeColumns': ','.join(include_columns)
        }
        try:
            response = requests.get(GOOGLE_SCRIPT_URL, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

            if not data.get('bookArray') or not isinstance(data['bookArray'], list):
                print(f"Invalid data format for {shelf}")
                continue

            all_books.extend(data['bookArray'])
        except requests.RequestException as e:
            print(f"Error fetching {shelf}: {e}")
        except ValueError as e:
            print(f"Error parsing JSON for {shelf}: {e}")

    return all_books

def load_author_photos(filepath='data/author_photos.json'):
    """
    Load existing author_photos.json, return dict.
    """
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_author_photos(data, filepath='data/author_photos.json'):
    """
    Save updated author_photos to JSON.
    """
    os.makedirs('data', exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def fetch_author_photo(author_url):
    """
    Scrape the author's photo from their LiveLib profile page using Selenium.
    Returns None if not found or invalid.
    """
    options = Options()
    options.headless = True
    options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    driver = webdriver.Chrome(options=options)

    try:
        driver.get(author_url)
        time.sleep(2)  # Wait for page to load
        soup = BeautifulSoup(driver.page_source, 'html.parser')

        # Look for img#profile-avatar
        img_tag = soup.select_one('img#profile-avatar')
        if img_tag and 'src' in img_tag.attrs:
            photo_url = img_tag['src']
            if photo_url and photo_url.startswith('http'):
                return photo_url
            print(f"Invalid photo URL found at {author_url}: {photo_url}")
            return None

        print(f"No profile-avatar image found at {author_url}")
        return None

    except Exception as e:
        print(f"Error fetching or parsing {author_url}: {e}")
        return None
    finally:
        driver.quit()

def process_author_photos(username):
    """
    Fetch books, extract authors, check author_photos.json, scrape photos, and update JSON.
    Only adds authors with valid photo URLs.
    """
    author_photos = load_author_photos()
    books = fetch_livelib_books(username)
    print(f"Fetched {len(books)} books from LiveLib")

    # Extract unique authors
    authors = {}
    for book in books:
        for author in book.get('authors', []):
            name = author.get('name')
            href = author.get('href')
            if name and href:
                authors[name] = href

    print(f"Found {len(authors)} unique authors")

    for author_name, author_url in authors.items():
        # Normalize author name to lowercase for consistency
        normalized_name = author_name.lower()
        
        if normalized_name in author_photos:
            print(f"Skipping {author_name} (already in author_photos.json)")
            continue

        print(f"Fetching photo for {author_name} from {author_url}")
        photo_url = fetch_author_photo(author_url)
        if photo_url is not None:
            author_photos[normalized_name] = photo_url
            print(f"Added {author_name}: {photo_url}")
        else:
            print(f"Skipping {author_name} (no valid photo found)")

        time.sleep(5)  # Delay to avoid overwhelming the server

    save_author_photos(author_photos)
    print("Updated data/author_photos.json")

if __name__ == '__main__':
    # Prefer environment variable, fall back to config.json
    username = os.getenv('LIVELIB_USERNAME')
    if not username and os.path.exists('data/config.json'):  # Fixed path
        with open('data/config.json', 'r', encoding='utf-8') as f:  # Fixed syntax
            config = json.load(f)
            username = config.get('livelibUsername', 'AlyonaRanneva')
    if not username:
        username = 'AlyonaRanneva'  # Final default

    process_author_photos(username)