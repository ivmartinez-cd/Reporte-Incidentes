import zipfile
import xml.etree.ElementTree as ET
import re

pptx_path = 'public/Manual de marca.pptx'

def extract_text():
    try:
        with zipfile.ZipFile(pptx_path, 'r') as zip_ref:
            namelist = zip_ref.namelist()
            slides = [f for f in namelist if re.match(r'ppt/slides/slide\d+\.xml', f)]
            slides.sort(key=lambda f: int(re.search(r'\d+', f).group()))
            
            for slide in slides:
                print(f"=== {slide} ===")
                xml_content = zip_ref.read(slide)
                root = ET.fromstring(xml_content)
                texts = []
                for elem in root.iter():
                    if elem.tag.endswith('}t'):
                        if elem.text:
                            texts.append(elem.text.strip())
                print(" | ".join(texts))
                print()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    extract_text()
