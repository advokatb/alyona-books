import json
import os
from datetime import datetime

MONTHS = {
    'Январь': 'January', 'Февраль': 'February', 'Март': 'March', 'Апрель': 'April',
    'Май': 'May', 'Июнь': 'June', 'Июль': 'July', 'Август': 'August',
    'Сентябрь': 'September', 'Октябрь': 'October', 'Ноябрь': 'November', 'Декабрь': 'December'
}

def parse_date(date_str):
    if not date_str or 'г.' not in date_str:
        return None
    month, year = date_str.replace(' г.', '').split()
    month_eng = MONTHS.get(month, month)
    try:
        return datetime.strptime(f"{month_eng} {year}", '%B %Y').strftime('%Y-%m-%d')
    except ValueError as e:
        print(f"Error parsing date '{date_str}': {e}")
        return None

def load_json_file(filepath):
    if filepath and os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as file:
            return json.load(file)
    return []

def load_custom_pages(filepath='data/custom_pages.json'):
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as file:
            return json.load(file)
    return {}

def process_livelib_files(username="AlyonaRanneva"):
    export_dir = 'export'
    os.makedirs(export_dir, exist_ok=True)

    read_file = next((f for f in os.listdir(export_dir) if f.startswith(f'livelib-{username}-read-')), None)
    reading_file = next((f for f in os.listdir(export_dir) if f.startswith(f'livelib-{username}-reading-')), None)
    wish_file = next((f for f in os.listdir(export_dir) if f.startswith(f'livelib-{username}-wish-')), None)

    read_data = load_json_file(os.path.join(export_dir, read_file))
    reading_data = load_json_file(os.path.join(export_dir, reading_file))
    wish_data = load_json_file(os.path.join(export_dir, wish_file))
    custom_pages = load_custom_pages()

    all_books = []

    def create_book_entry(book, shelf):
        rating = book['rating'].get('user', '0')
        title = book['title']
        return {
            'Title': title,
            'Author': book['authors'][0]['name'] if book['authors'] else 'Unknown',
            'Additional Authors': ', '.join(a['name'] for a in book['authors'][1:]) if len(book['authors']) > 1 else '',
            'Date Read': parse_date(book.get('readDate')) if shelf == 'read' else None,
            'My Rating': float(rating) if rating else 0.0,
            'Cover URL': book.get('coverHref', ''),
            'Genres': [g['name'] for g in book.get('genres', [])],
            'Series': book['details'].get('series'),
            'Exclusive Shelf': shelf,
            'Book Id': book.get('bookHref', '').split('/')[-1] if 'bookHref' in book else title.replace(' ', '-').lower(),
            'Number of Pages': custom_pages.get(title, int(book['details'].get('pages', 0)))
        }

    for book in read_data:
        all_books.append(create_book_entry(book, 'read'))

    for book in reading_data:
        all_books.append(create_book_entry(book, 'currently-reading'))

    for book in wish_data:
        all_books.append(create_book_entry(book, 'to-read'))

    read_books = [b for b in all_books if b['Exclusive Shelf'] == 'read']
    total_books = len(read_books)
    books_2025 = len([b for b in read_books if b['Date Read'] and b['Date Read'].startswith('2025')])
    timeline = {}
    for book in read_books:
        if book['Date Read']:
            month = book['Date Read'][:7]
            timeline[month] = timeline.get(month, 0) + 1
    timeline_data = [{'Date': k, 'Books': v} for k, v in sorted(timeline.items())]

    total_pages = sum(book['Number of Pages'] for book in read_books)

    stats = {
        'total_books': total_books,
        'books_2025': books_2025,
        'total_pages': total_pages,
        'book_list': all_books,
        'timeline': timeline_data,
        'series_counts': {s: sum(1 for b in read_books if b['Series'] == s) for s in set(b['Series'] for b in read_books if b['Series'])},
        'longest_book': max(read_books, key=lambda b: b['Number of Pages'], default={}),
        'shortest_book': min(read_books, key=lambda b: b['Number of Pages'], default={})
    }

    with open('reading_stats.json', 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    username = os.getenv('LIVELIB_USERNAME', 'AlyonaRanneva')
    process_livelib_files(username)
