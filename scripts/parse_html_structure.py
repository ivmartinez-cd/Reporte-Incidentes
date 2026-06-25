import re

with open('public/reporte-tipificacion-v2.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's remove script and style blocks
html = re.sub(r'<style.*?</style>', '', html, flags=re.DOTALL)
html = re.sub(r'<script.*?</script>', '', html, flags=re.DOTALL)

# Let's find tags
lines = html.split('\n')
for i, line in enumerate(lines):
    line_stripped = line.strip()
    if not line_stripped:
        continue
    # If it contains header or page definition
    if any(tag in line_stripped for tag in ['<h1', '<h2', '<h3', 'class="page"', 'class="cover"']):
        clean_line = re.sub(r'<[^>]*>', ' ', line_stripped)
        clean_line = " ".join(clean_line.split())
        print(f"Line {i+1}: {clean_line}")
