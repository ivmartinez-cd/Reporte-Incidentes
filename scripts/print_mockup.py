import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('public/reporte-tipificacion-v2.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Find Form Mockup start
idx = text.find('class="form-mockup"')
if idx != -1:
    print(text[idx:idx+2500])
else:
    print("Form mockup not found")
