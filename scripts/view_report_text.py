import sys
import re

# Reconfigure stdout to use utf-8
sys.stdout.reconfigure(encoding='utf-8')

with open('public/reporte-tipificacion-v2.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Print lines 350 to 784 (using 0-based indexing: 349 to 783) but replace long base64 strings
for i in range(349, min(784, len(lines))):
    line = lines[i]
    if 'data:image/png;base64' in line:
        line = re.sub(r'src="data:image/png;base64,[^"]+"', 'src="[BASE64_IMAGE_TRUNCATED]"', line)
    print(f"{i+1}: {line.rstrip()}")
