import json
import os
import requests
import time
import re
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxzTdo297yeLns95JN_h8xCKfIKNNvqKg8bk5NXrEOxeRD-gbQAqgxiB18IDDG2WbOO/exec'

def fetch_livelib_books(username):
    """
    Fetch book data from Google Apps Script for all shelves.
    Returns a list of books with titles and URLs.
    """
    shelves = ['read', 'reading', 'wish']
    include_columns = ['title', 'bookHref']
    all_books = []

    headers = {'User-Agent': 'Mozilla/5.0'}

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

def load_custom_pages(filepath='data/custom_pages.json'):
    """
    Load existing custom_pages.json, return dict.
    """
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_custom_pages(data, filepath='data/custom_pages.json'):
    """
    Save updated custom_pages to JSON.
    """
    os.makedirs('data', exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def fetch_page_count(book_url):
    """
    Scrape the number of pages from a LiveLib book page using Selenium.
    Looks for various page-related keywords and extracts the first number after them.
    Returns None if not found or invalid.
    """
    options = Options()
    options.headless = True
    options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    driver = webdriver.Chrome(options=options)

    try:
        driver.get(book_url)
        time.sleep(2)  # Wait for page to load
        soup = BeautifulSoup(driver.page_source, 'html.parser')

        # Find ul.book-page__info.bc-info
        info_section = soup.select_one('ul.book-page__info.bc-info')
        if not info_section:
            print(f"No book-page__info found at {book_url}")
            return None

        # Look for 'Дополнительная информация об издании' section
        for li in info_section.select('li.bc-info__item'):
            summary = li.select_one('summary.bc-info__title')
            if summary and 'Дополнительная информация об издании' in summary.get_text(strip=True):
                content_div = li.select_one('div.bc-info__content')
                if content_div:
                    for p_tag in content_div.select('p.bc-info__txt'):
                        text = p_tag.get_text(strip=True).lower()
                        print(f"Parsing text in 'Дополнительная информация': '{text}'")
                        
                        # Define keywords to look for
                        keywords = ['страниц:', 'страниц', 'стр.', 'количество страниц:']
                        for keyword in keywords:
                            if keyword in text:
                                # Extract number after the keyword
                                match = re.search(rf'{keyword}\s*(\d+)', text)
                                if match:
                                    return int(match.group(1))
                                print(f"No valid number found after '{keyword}' in '{text}' at {book_url}")
                                break  # Move to next p_tag if keyword found but no number
                        else:
                            # If no keywords matched, log and continue to next p_tag
                            print(f"No page-related keywords found in '{text}' at {book_url}")

                    print(f"No page count found in 'Дополнительная информация' at {book_url}")
                    return None

        print(f"No 'Дополнительная информация' section with page count at {book_url}")
        return None

    except Exception as e:
        print(f"Error fetching or parsing {book_url}: {e}")
        return None
    finally:
        driver.quit()

def process_book_pages(username):
    """
    Fetch books, check custom_pages.json, scrape page counts, and update JSON.
    Only adds books with valid page counts.
    """
    custom_pages = load_custom_pages()
    books = fetch_livelib_books(username)
    print(f"Fetched {len(books)} books from LiveLib")

    for book in books:
        title = book.get('title')
        book_url = book.get('bookHref')

        if not title or not book_url:
            print(f"Skipping book with missing title or URL: {book}")
            continue

        if title in custom_pages:
            print(f"Skipping {title} (already in custom_pages.json)")
            continue

        print(f"Fetching page count for {title} from {book_url}")
        page_count = fetch_page_count(book_url)
        if page_count is not None:
            custom_pages[title] = page_count
            print(f"Added {title}: {page_count} pages")
        else:
            print(f"Skipping {title} (no valid page count found)")

        time.sleep(5)

    save_custom_pages(custom_pages)
    print("Updated data/custom_pages.json")

if __name__ == '__main__':
    # Prefer environment variable, fall back to config.json
    username = os.getenv('LIVELIB_USERNAME')
    if not username and os.path.exists('data/config.json'):  # Fixed path
        with open('data/config.json', 'r', encoding='utf-8') as f:  # Fixed syntax
            config = json.load(f)
            username = config.get('livelibUsername', 'AlyonaRanneva')
    if not username:
        username = 'AlyonaRanneva'  # Final default

    process_book_pages(username)