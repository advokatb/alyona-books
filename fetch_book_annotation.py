import requests
import json
from bs4 import BeautifulSoup
import os
import time

def get_annotation(book_id):
    url = f'https://www.livelib.ru/book/{book_id}'
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, 'html.parser')

    annotation_div = soup.find('div', class_='bc-about__annotation')
    if annotation_div:
        annotation_p = annotation_div.find('p', class_='bc-about__txt')
        if annotation_p:
            for br in annotation_p.find_all('br'):
                br.replace_with('\n')
            annotation_text = annotation_p.get_text(strip=True, separator='\n')
            return annotation_text
    return None

def fetch_annotations(stats_file='reading_stats.json', output_file='data/book_annotations.json'):
    with open(stats_file, 'r', encoding='utf-8') as f:
        stats = json.load(f)

    annotations = {}
    for book in stats['book_list']:
        book_id = book.get('Book Id')
        title = book['Title']
        if not book_id:
            print(f'Skipping {title}, no Book ID found.')
            continue
        try:
            print(f'Fetching annotation for {title}...')
            annotation = get_annotation(book_id)
            annotations[book_id] = annotation or "Нет аннотации"
            time.sleep(1)  # Be gentle to the website
        except Exception as e:
            print(f'Failed to fetch for {title}: {e}')
            annotations[book_id] = "Нет аннотации"

    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(annotations, f, ensure_ascii=False, indent=2)

    print(f'Annotations saved to {output_file}')

if __name__ == '__main__':
    fetch_annotations()
