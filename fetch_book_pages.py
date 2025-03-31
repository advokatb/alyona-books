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
    Looks for various page-related keywords and extracts the first number around them.
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

        info_section = soup.select_one('ul.book-page__info.bc-info')
        if not info_section:
            print(f"No book-page__info found at {book_url}")
            return None

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
                                # Look for a number immediately before, after, or near the keyword
                                match = re.search(rf'(?:\d+\s*{keyword})|(?:{keyword}\s*\d+)|(\d+{keyword})', text)
                                if match:
                                    # Extract the number from the match
                                    number_match = re.search(r'\d+', match.group(0))
                                    if number_match:
                                        return int(number_match.group(0))
                                    print(f"No valid number extracted from match '{match.group(0)}' in '{text}' at {book_url}")
                                print(f"No valid number found near '{keyword}' in '{text}' at {book_url}")
                                break
                        else:
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

def process_book_pages(username, batch_size=10):
    """
    Fetch books, check custom_pages.json, scrape page counts, and update JSON in batches.
    Processes 10-15 items at a time with a 5-minute pause between batches.
    """
    custom_pages = load_custom_pages()
    books = fetch_livelib_books(username)
    print(f"Fetched {len(books)} books from LiveLib")

    books_to_process = [(book['title'], book['bookHref']) for book in books 
                        if book.get('title') and book.get('bookHref') and book['title'] not in custom_pages]
    print(f"Found {len(books_to_process)} books to process")

    if not books_to_process:
        print("No new books to process")
        return

    for i in range(0, len(books_to_process), batch_size):
        batch = books_to_process[i:i + batch_size]
        print(f"Processing batch {i // batch_size + 1} ({len(batch)} books)")

        for title, book_url in batch:
            print(f"Fetching page count for {title} from {book_url}")
            page_count = fetch_page_count(book_url)
            if page_count is not None:
                custom_pages[title] = page_count
                print(f"Added {title}: {page_count} pages")
            else:
                print(f"Skipping {title} (no valid page count found)")
            time.sleep(5)

        save_custom_pages(custom_pages)
        print(f"Saved progress after batch {i // batch_size + 1}")

        if i + batch_size < len(books_to_process):
            print("Pausing for 2 minutes...")
            time.sleep(120)

    print("Updated data/custom_pages.json")

if __name__ == '__main__':
    username = os.getenv('LIVELIB_USERNAME')
    if not username and os.path.exists('data/config.json'):
        with open('data/config.json', 'r', encoding='utf-8') as f:
            config = json.load(f)
            username = config.get('livelibUsername', 'AlyonaRanneva')
    if not username:
        username = 'AlyonaRanneva'  # Final default

    process_book_pages(username)