import re
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('public/reporte-tipificacion-v2.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Parse using BeautifulSoup
soup = BeautifulSoup(html, 'html.parser')

# Find cover and pages
pages = []
cover = soup.find('div', class_='cover')
if cover:
    pages.append(('Portada', cover))

page_divs = soup.find_all('div', class_='page')
for i, p in enumerate(page_divs):
    pages.append((f'Página {i+1}', p))

for name, page in pages:
    print("=" * 80)
    print(f" {name.upper()} ")
    print("=" * 80)
    
    # We want to print headers, paragraphs, lists, and tables in order
    for elem in page.descendants:
        if elem.name in ['h1', 'h2', 'h3', 'h4', 'p', 'li']:
            text = elem.get_text().strip()
            # ignore header and footer standard lines
            if 'Metodologia de Tipificacion' in text or 'Canal Directo' in text or 'Pagina' in text:
                continue
            if text:
                print(f"[{elem.name.upper()}]: {text}")
        elif elem.name == 'table':
            print("[TABLE]:")
            rows = elem.find_all('tr')
            for r in rows:
                cols = [td.get_text().strip() for td in r.find_all(['td', 'th'])]
                print("  |  ".join(cols))
            print()
