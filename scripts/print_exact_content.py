import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

with open('public/reporte-tipificacion-v2.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Find Section 3 start
idx = text.find('3. Como Funcionan')
if idx != -1:
    section_text = text[idx:]
    # remove base64
    section_text = re.sub(r'data:image/png;base64,[^"]+', '[BASE64]', section_text)
    print(section_text[:3500])
else:
    print("Section 3 not found")
