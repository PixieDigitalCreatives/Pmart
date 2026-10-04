import zipfile
import xml.etree.ElementTree as ET
import os

def read_docx(path):
    try:
        with zipfile.ZipFile(path) as z:
            xml_content = z.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            paragraphs = []
            for p in tree.findall('.//w:p', ns):
                texts = [node.text for node in p.findall('.//w:t', ns) if node.text]
                if texts:
                    paragraphs.append(''.join(texts))
                else:
                    paragraphs.append('')
            return '\n'.join(paragraphs)
    except Exception as e:
        return str(e)

docs = [
    "PMart_Backend_PRD.docx",
    "PMart_Backend_TRD.docx",
    "PMart_Frontend_PRD.docx",
    "PMart_Frontend_TRD.docx"
]

with open(r"c:\Users\SHYAM MOHAN\Desktop\Pmart\scratch\docx_contents.txt", "w", encoding="utf-8") as f:
    for doc in docs:
        p = os.path.join(r"c:\Users\SHYAM MOHAN\Desktop\Pmart\docs\tasks", doc)
        f.write(f"\n--- {doc} ---\n\n")
        f.write(read_docx(p))
        f.write("\n")
