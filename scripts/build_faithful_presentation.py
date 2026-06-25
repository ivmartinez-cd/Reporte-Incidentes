import os
from bs4 import BeautifulSoup

logo_path = 'public/logo_canal_directo_b64.txt'
input_html_path = 'public/reporte-tipificacion-v2.html'
output_path = 'Presentacion-Tipificacion.html'

def read_logo():
    if os.path.exists(logo_path):
        with open(logo_path, 'r', encoding='utf-8') as f:
            return f.read().strip()
    return ""

def main():
    logo_b64 = read_logo()
    
    with open(input_html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
        
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Extract cover content
    cover_div = soup.find('div', class_='cover')
    cover_content_div = cover_div.find('div', class_='cover-content') if cover_div else None
    
    # We want to extract the children of cover-content, excluding cover-stripe (which we will style with CSS)
    cover_html = ""
    if cover_content_div:
        # We can reconstruct it or clean it up
        # Replace the img tag src with our base64 logo if logo_b64 is present
        img_tag = cover_content_div.find('img', class_='cover-logo')
        if img_tag and logo_b64:
            img_tag['src'] = f"data:image/png;base64,{logo_b64}"
            img_tag['class'] = 'cover-logo-img'
        
        stripe = cover_content_div.find('div', class_='cover-stripe')
        if stripe:
            stripe.decompose() # We will render our own stripe via CSS
            
        cover_html = str(cover_content_div)
    else:
        cover_html = "<h1>Tipificación Automática</h1>"
        
    # Extract page contents
    page_divs = soup.find_all('div', class_='page')
    pages_html = []
    
    for idx, page in enumerate(page_divs):
        # Clone page
        p_copy = BeautifulSoup(str(page), 'html.parser').find('div', class_='page')
        
        # Remove page-header and page-footer
        header = p_copy.find('div', class_='page-header')
        if header:
            header.decompose()
            
        footer = p_copy.find('div', class_='page-footer')
        if footer:
            footer.decompose()
            
        # Get clean inner HTML
        p_html = "".join([str(child) for child in p_copy.children])
        pages_html.append(p_html)
        
    # Inject search bar in Page 3 (which is index 2 of pages_html, "2. Analisis: De 500 Soluciones a 18 Tareas Normalizadas")
    # Let's target the table of 18 tasks on Page 3 and add filter input
    p3_soup = BeautifulSoup(pages_html[2], 'html.parser')
    table = p3_soup.find('table')
    if table:
        table['id'] = 'tasksTable'
        table['class'] = 'table'
        
        # Wrap table in tableContainer
        container_div = p3_soup.new_tag('div', attrs={"class": "tableContainer"})
        table.replace_with(container_div)
        container_div.append(table)
        
        # Add search bar before container
        search_div = BeautifulSoup("""
        <div class="searchBar">
          <input type="text" id="taskSearch" class="searchInput" placeholder="Escribe para buscar una tarea (ej: fusor, rodillos, red)..." onkeyup="filterTasks()">
        </div>
        """, 'html.parser')
        container_div.insert_before(search_div)
        
        # We need to make sure each row in the tbody has an ID or class we can target
        rows = table.find_all('tr')
        # Skip header row (first tr)
        for r_idx, r in enumerate(rows[1:], start=1):
            r['id'] = f"task-row-{r_idx}"
            r['class'] = 'tr'
            # Also add class tdHighlight to the second column (Tarea) and td to others
            cells = r.find_all('td')
            for c_idx, cell in enumerate(cells):
                if c_idx == 1:
                    cell['class'] = 'tdHighlight'
                else:
                    cell['class'] = 'td'
                    
        # Update our list
        pages_html[2] = str(p3_soup)
        
    # Inject simulator in Page 6 (which is index 5 of pages_html, "4. Ejemplo: Formulario de Cierre con Tipificacion Automatica")
    p6_soup = BeautifulSoup(pages_html[5], 'html.parser')
    
    # We want to find the select element that has the Tareas options
    selects = p6_soup.find_all('select')
    # The third select (index 2) is the Tareas selector
    if len(selects) >= 3:
        sel = selects[2]
        sel['id'] = 'taskSelector'
        sel['onchange'] = 'runSimulation()'
        sel['style'] = 'border: 2px solid var(--cd-orange); font-weight: 700;'
        
    # Give an ID to the textarea so we can dynamically change its value in runSimulation
    txt_area = p6_soup.find('textarea')
    if txt_area:
        txt_area['id'] = 'obsText'
        
    # We want to find the result-box and make it interactive
    res_box = p6_soup.find('div', class_='result-box')
    if res_box:
        interactive_res_box = BeautifulSoup("""
        <div class="result-box" id="resultBox">
          <strong>TIPIFICACIÓN AUTOMÁTICA (Simulador):</strong>
          <div style="display: flex; gap: 2rem; margin-top: 1rem; flex-wrap: wrap;">
            <div>
              <span style="font-size: 0.8rem; color: var(--text-muted); display: block; text-transform: uppercase; font-weight:700;">Categoría</span>
              <span id="resCategory" class="badge" style="display: inline-flex; align-items: center; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 700; color: #fff; background: var(--cd-grey); box-shadow: 0 4px 12px rgba(88, 89, 91, 0.25);">Hardware y Desgaste</span>
            </div>
            <div>
              <span style="font-size: 0.8rem; color: var(--text-muted); display: block; text-transform: uppercase; font-weight:700;">Subcategoría</span>
              <span id="resSubcategory" style="display: inline-flex; align-items: center; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 700; border: 2px solid var(--cd-grey); color: var(--text); background: var(--bg-deep);">Fusor / Kit de mantenimiento</span>
            </div>
          </div>
        </div>
        """, 'html.parser')
        res_box.replace_with(interactive_res_box)
        
    pages_html[5] = str(p6_soup)

    # Let's build the complete HTML presentation
    presentation_html = f"""<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Metodología de Tipificación de Incidentes - Canal Directo</title>
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  
  <style>
    /* CSS Variables */
    :root {{
      --bg-base: #131520;
      --bg-deep: #0b0c13;
      --surface: #1a1c2b;
      --surface-2: #24273c;
      --border: rgba(255, 255, 255, 0.06);
      --border-strong: rgba(255, 255, 255, 0.12);
      --text: #e2e4f0;
      --text-soft: #a9adc5;
      --text-muted: #727694;
      --input-bg: rgba(0, 0, 0, 0.25);
      
      --cd-orange: #F7941D;
      --cd-grey: #58595B;
      
      --radius: 12px;
      --radius-sm: 8px;
      --shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
      --ease: cubic-bezier(0.25, 0.8, 0.25, 1);
    }}

    [data-theme="light"] {{
      --bg-base: #f4f5f8;
      --bg-deep: #e9ebf0;
      --surface: #ffffff;
      --surface-2: #f1f3f7;
      --border: rgba(0, 0, 0, 0.08);
      --border-strong: rgba(0, 0, 0, 0.15);
      --text: #1e202c;
      --text-soft: #4a4e69;
      --text-muted: #7b809a;
      --input-bg: #f8f9fa;
      --shadow: 0 12px 30px rgba(0, 0, 0, 0.05);
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      font-family: 'Source Sans 3', sans-serif;
      background-color: var(--bg-base);
      color: var(--text);
      line-height: 1.6;
      transition: background-color 0.3s ease, color 0.3s ease;
      overflow-x: hidden;
    }}

    /* Header Bar */
    .headerBar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.9rem 2rem;
      background: var(--bg-deep);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: var(--shadow);
    }}

    .logoArea {{
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }}

    .logoArea img, .cover-logo-img {{
      height: 35px;
      width: auto;
    }}

    .logoTitle {{
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      font-size: 1.1rem;
      color: var(--text);
      letter-spacing: 0.5px;
    }}

    .themeToggleBtn {{
      background: var(--surface);
      border: 1px solid var(--border-strong);
      color: var(--text);
      padding: 0.5rem 1rem;
      border-radius: var(--radius-sm);
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      transition: all 0.2s ease;
    }}

    .themeToggleBtn:hover {{
      background: var(--surface-2);
      border-color: var(--cd-orange);
    }}

    /* Container */
    .container {{
      display: flex;
      max-width: 1440px;
      margin: 0 auto;
      min-height: calc(100vh - 65px);
    }}

    /* Sidebar indices */
    .sidebar {{
      width: 320px;
      background: var(--bg-deep);
      border-right: 1px solid var(--border);
      padding: 2.5rem 1.5rem;
      position: sticky;
      top: 65px;
      height: calc(100vh - 65px);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      flex-shrink: 0;
    }}

    @media (max-width: 1024px) {{
      .sidebar {{
        display: none;
      }}
    }}

    .sidebarTitle {{
      font-family: 'Montserrat', sans-serif;
      font-size: 1rem;
      font-weight: 800;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--cd-orange);
    }}

    .navList {{
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }}

    .navItem {{
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      text-align: left;
      padding: 0.8rem 1rem;
      border-radius: var(--radius-sm);
      color: var(--text-soft);
      border: 1px solid transparent;
      background: transparent;
      font-family: 'Source Sans 3', sans-serif;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s var(--ease);
    }}

    .navItem:hover {{
      background: var(--surface-2);
      color: var(--text);
    }}

    .navItemActive {{
      background: var(--surface);
      color: var(--cd-orange) !important;
      border-color: var(--cd-orange);
      box-shadow: 0 4px 12px rgba(247, 148, 29, 0.1);
    }}

    .navDot {{
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-muted);
      transition: transform 0.2s ease, background-color 0.2s ease;
    }}

    .navItemActive .navDot {{
      background: var(--cd-orange);
      transform: scale(1.2);
    }}

    .sidebarFooter {{
      margin-top: auto;
      font-size: 0.8rem;
      color: var(--text-muted);
      line-height: 1.5;
      background: rgba(255, 255, 255, 0.02);
      padding: 1rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
    }}

    /* Content Area */
    .content {{
      flex-grow: 1;
      padding: 3rem 4rem;
      max-width: 1000px;
      margin: 0 auto;
    }}

    @media (max-width: 768px) {{
      .content {{
        padding: 2rem 1.5rem;
      }}
    }}

    /* Orange and Grey Corporate Stripe */
    .brandLine {{
      height: 4px;
      width: 100%;
      background: linear-gradient(
        to right,
        var(--cd-orange) 0%,
        var(--cd-orange) 65%,
        var(--cd-grey) 65%,
        var(--cd-grey) 100%
      );
      border-radius: 3px;
      margin-bottom: 3rem;
    }}

    /* Section layout */
    .section {{
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 3rem;
      margin-bottom: 4rem;
      box-shadow: var(--shadow);
      animation: fadeInUp 0.6s var(--ease) both;
    }}

    /* TYPOGRAPHY OVERRIDES FOR VERBATIM HTML CONTENT */
    .section h1 {{
      font-family: 'Montserrat', sans-serif;
      font-size: 2.2rem;
      font-weight: 800;
      color: var(--text);
      margin-bottom: 2rem;
      border-bottom: 3px solid var(--cd-orange);
      padding-bottom: 0.75rem;
    }}

    .section h2 {{
      font-family: 'Montserrat', sans-serif;
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--cd-orange);
      margin-top: 2rem;
      margin-bottom: 1.25rem;
    }}

    .section p {{
      margin-bottom: 1.25rem;
      color: var(--text-soft);
      line-height: 1.7;
      text-align: justify;
    }}

    .section p strong {{
      color: var(--text);
    }}

    .section ul, .section ol {{
      margin-left: 2rem;
      margin-bottom: 1.5rem;
      color: var(--text-soft);
    }}

    .section li {{
      margin-bottom: 0.5rem;
      line-height: 1.6;
    }}

    /* Tables from PDF */
    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 2rem 0;
      font-size: 10pt;
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid var(--border);
    }}

    thead {{
      background: var(--bg-deep);
    }}

    th, td {{
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }}

    th {{
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      color: var(--text);
    }}

    td {{
      color: var(--text-soft);
    }}

    tbody tr:hover {{
      background: rgba(247, 148, 29, 0.04);
    }}

    /* Highlight box style from HTML */
    .highlight-box {{
      background: var(--bg-deep);
      border-left: 5px solid var(--cd-orange);
      padding: 1.5rem;
      margin: 2rem 0;
      font-size: 10.5pt;
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      color: var(--text);
      line-height: 1.65;
    }}

    .highlight-box strong {{
      color: var(--cd-orange);
    }}

    /* Stats grid from PDF */
    .stats-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1.25rem;
      margin: 2rem 0;
    }}

    .stat-box {{
      background: var(--bg-deep);
      border: 1px solid var(--border-strong);
      padding: 1.5rem;
      border-radius: var(--radius-sm);
      text-align: center;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }}

    .stat-box:hover {{
      transform: translateY(-3px);
      border-color: var(--cd-orange);
    }}

    .stat-box .number {{
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--cd-orange);
      margin-bottom: 0.5rem;
      font-family: 'Montserrat', sans-serif;
    }}

    .stat-box .label {{
      font-size: 0.9rem;
      color: var(--text-soft);
      font-weight: 600;
    }}

    /* Process flow from PDF */
    .process-flow {{
      background: var(--bg-deep);
      padding: 2rem;
      border-radius: var(--radius);
      margin: 2rem 0;
      border: 1px solid var(--border);
    }}

    .process-flow p {{
      margin: 0.5rem 0;
      font-size: 1.05rem;
    }}

    .process-flow p strong {{
      font-family: 'Montserrat', sans-serif;
      color: var(--text);
    }}

    .process-flow .arrow {{
      text-align: center;
      margin: 0.75rem 0;
      color: var(--cd-orange);
      font-weight: 800;
      font-size: 1.8rem;
    }}

    /* Form mockup from PDF */
    .form-mockup {{
      background: var(--bg-deep);
      border: 2px solid var(--cd-orange);
      border-radius: var(--radius);
      padding: 2.5rem;
      margin: 2rem 0;
      box-shadow: var(--shadow);
    }}

    .form-mockup .form-header {{
      background: var(--surface-2);
      color: var(--text);
      padding: 1.25rem 1.5rem;
      margin: -2.5rem -2.5rem 2rem -2.5rem;
      border-radius: calc(var(--radius) - 2px) calc(var(--radius) - 2px) 0 0;
      font-weight: 800;
      font-family: 'Montserrat', sans-serif;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}

    .form-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }}

    @media (max-width: 768px) {{
      .form-grid {{
        grid-template-columns: 1fr;
      }}
    }}

    .form-field {{
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }}

    .form-field-full {{
      grid-column: span 2;
    }}

    @media (max-width: 768px) {{
      .form-field-full {{
        grid-column: span 1;
      }}
    }}

    .form-field label {{
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}

    .form-field input,
    .form-field select,
    .form-field textarea {{
      background: var(--input-bg);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      padding: 0.8rem 1rem;
      color: var(--text);
      font-family: inherit;
      font-size: 0.95rem;
      transition: all 0.2s ease;
    }}

    .form-field select option {{
      background-color: var(--surface) !important;
      color: var(--text) !important;
    }}

    .form-field input:focus,
    .form-field select:focus,
    .form-field textarea:focus {{
      border-color: var(--cd-orange);
      outline: none;
      box-shadow: 0 0 0 3px rgba(247, 148, 29, 0.15);
    }}

    .form-field textarea {{
      resize: vertical;
      min-height: 80px;
    }}

    /* Result Box style for simulator */
    .result-box {{
      background: rgba(255, 255, 255, 0.03);
      border: 1.5px dashed var(--border-strong);
      padding: 1.5rem;
      margin-top: 1.5rem;
      border-radius: var(--radius-sm);
      font-size: 10pt;
      line-height: 1.6;
    }}

    .result-box strong {{
      color: var(--text);
    }}

    /* Interactive Enhancements style */
    .searchBar {{
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }}

    .searchInput {{
      flex-grow: 1;
      background: var(--input-bg);
      border: 1.5px solid var(--border-strong);
      border-radius: var(--radius-sm);
      padding: 0.8rem 1.2rem;
      color: var(--text);
      font-family: inherit;
      font-size: 1rem;
      transition: all 0.2s ease;
    }}

    .searchInput:focus {{
      border-color: var(--cd-orange);
      outline: none;
      box-shadow: 0 0 0 3px rgba(247, 148, 29, 0.15);
    }}

    .tableContainer {{
      overflow-x: auto;
      margin: 1.5rem 0;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
    }}

    .table {{
      width: 100%;
      border-collapse: collapse;
    }}

    .tr {{
      border-bottom: 1px solid var(--border);
      transition: background-color 0.2s ease;
    }}

    .td {{
      padding: 10px 14px;
      color: var(--text-soft);
    }}

    .tdHighlight {{
      padding: 10px 14px;
      color: var(--text);
      font-weight: 600;
    }}

    .badge {{
      transition: all 0.3s ease;
    }}

    /* Cover styling */
    #cover .cover-logo-img {{
      width: 320px;
      margin-bottom: 2.5rem;
    }}

    #cover h1 {{
      font-family: 'Montserrat', sans-serif;
      font-size: 3.5rem;
      font-weight: 900;
      line-height: 1.15;
      margin-bottom: 1.5rem;
      border-bottom: none;
      padding-bottom: 0;
      color: var(--text);
    }}

    #cover h1 span {{
      color: var(--cd-orange);
    }}

    #cover h2 {{
      font-family: 'Source Sans 3', sans-serif;
      font-size: 1.3rem;
      font-weight: 400;
      color: var(--text-soft);
      margin-bottom: 2.5rem;
      line-height: 1.6;
      margin-top: 0;
    }}

    /* Animations */
    @keyframes fadeInUp {{
      from {{
        opacity: 0;
        transform: translateY(20px);
      }}
      to {{
        opacity: 1;
        transform: translateY(0);
      }}
    }}

    /* Footer styling */
    .mainFooter {{
      margin-top: 4rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border);
      text-align: center;
      color: var(--text-muted);
      font-size: 0.9rem;
    }}
  </style>
</head>
<body>

  <!-- Header Bar -->
  <header class="headerBar">
    <div class="logoArea">
      <img src="data:image/png;base64,{logo_b64}" alt="Canal Directo">
      <span class="logoTitle">Metodología de Tipificación</span>
    </div>
    <div>
      <button class="themeToggleBtn" id="themeToggle">
        <span id="themeToggleText">☀️ Modo Claro</span>
      </button>
    </div>
  </header>

  <div class="container">
    <!-- Sidebar Navigation -->
    <aside class="sidebar">
      <div class="sidebarTitle">Índice</div>
      <ul class="navList">
        <li>
          <button class="navItem navItemActive" onclick="scrollToSection('cover')">
            <span class="navDot"></span>
            Portada
          </button>
        </li>
        <li>
          <button class="navItem" onclick="scrollToSection('page1')">
            <span class="navDot"></span>
            1. Categorías Principales
          </button>
        </li>
        <li>
          <button class="navItem" onclick="scrollToSection('page2')">
            <span class="navDot"></span>
            1.4 Las 25 Subcategorías
          </button>
        </li>
        <li>
          <button class="navItem" onclick="scrollToSection('page3')">
            <span class="navDot"></span>
            2. 18 Tareas Normalizadas
          </button>
        </li>
        <li>
          <button class="navItem" onclick="scrollToSection('page4')">
            <span class="navDot"></span>
            2.4 Criterios de Selección
          </button>
        </li>
        <li>
          <button class="navItem" onclick="scrollToSection('page5')">
            <span class="navDot"></span>
            3. Flujo e Integración
          </button>
        </li>
        <li>
          <button class="navItem" onclick="scrollToSection('page6')">
            <span class="navDot"></span>
            4. Ejemplo y Simulador
          </button>
        </li>
      </ul>
    </aside>

    <!-- Main Content Area -->
    <main class="content">
      <div class="brandLine"></div>

      <!-- PORTADA -->
      <section id="cover" class="section">
        {cover_html}
      </section>

      <!-- PAGINA 1 -->
      <section id="page1" class="section">
        {pages_html[0]}
      </section>

      <!-- PAGINA 2 -->
      <section id="page2" class="section">
        {pages_html[1]}
      </section>

      <!-- PAGINA 3 -->
      <section id="page3" class="section">
        {pages_html[2]}
      </section>

      <!-- PAGINA 4 -->
      <section id="page4" class="section">
        {pages_html[3]}
      </section>

      <!-- PAGINA 5 -->
      <section id="page5" class="section">
        {pages_html[4]}
      </section>

      <!-- PAGINA 6 -->
      <section id="page6" class="section">
        {pages_html[5]}
      </section>

      <footer class="mainFooter">
        <p>Canal Directo S.A. — Metodología de Clasificación Inteligente de Incidentes</p>
        <p style="margin-top: 0.5rem;">Diseñado para lectura conjunta en PC</p>
      </footer>
    </main>
  </div>

  <script>
    // Simulator Mappings
    const TAREAS_SIM = {{
      "cambio-fusor": {{ 
        category: "Hardware y Desgaste", 
        subcategory: "Fusor / Kit de mantenimiento", 
        observation: "Fusor con altas temperaturas durante calentamiento. Se reemplazo por uno nuevo. Se realizo mantenimiento preventivo de rodillos. Equipo en funcionamiento correcto." 
      }},
      "cambio-rodillos": {{ 
        category: "Hardware y Desgaste", 
        subcategory: "Rodillos / Pickup / Separación", 
        observation: "Desgaste en rodillos de toma de papel (pickup y separación) causando problemas de alimentación. Se realiza reemplazo de rodillos de bandeja 1 y limpieza de sensor." 
      }},
      "cambio-bandeja": {{ 
        category: "Medio de Impresión", 
        subcategory: "Ajuste de bandejas / guías", 
        observation: "La guía de la bandeja 2 está rota, impidiendo que el papel se alinee correctamente. Se reemplaza la bandeja completa y se reconfigura el tamaño en sistema." 
      }},
      "limpieza": {{ 
        category: "Gestión de Soporte", 
        subcategory: "Mantenimiento / Limpieza general", 
        observation: "Se realiza limpieza profunda de la platina del escáner y espejos ópticos debido a líneas negras en copias. Pruebas de impresión salen limpias." 
      }},
      "mantenimiento": {{ 
        category: "Gestión de Soporte", 
        subcategory: "Mantenimiento / Limpieza general", 
        observation: "Mantenimiento preventivo programado realizado con éxito. Se limpian rodillos de paso y tolva de residuos. Impresora funcionando de forma óptima." 
      }},
      "reset": {{ 
        category: "Gestión de Soporte", 
        subcategory: "Mantenimiento / Limpieza general", 
        observation: "Equipo bloqueado en pantalla de inicio. Se procede a realizar reset general de valores de fábrica e inicialización de red. Sistema restablecido." 
      }},
      "config-red": {{ 
        category: "Software, Firmware y Red", 
        subcategory: "Configuración de red / IP", 
        observation: "Equipo fuera de línea. Se reasigna dirección IP fija en red del cliente y se actualizan los drivers del spooler en la terminal de administración." 
      }},
      "diagnostico": {{ 
        category: "Gestión de Soporte", 
        subcategory: "Diagnóstico / Sin falla", 
        observation: "Se realiza prueba de impresión por reporte de atasco, pero no se constata falla física. Se realizan 50 impresiones de prueba sin incidencias. Equipo operativo." 
      }}
    }};

    // Theme Selector Color Constants
    const CATEGORY_COLORS = {{
      "Hardware y Desgaste": "var(--cd-grey)",
      "Software, Firmware y Red": "var(--cd-grey)",
      "Insumos y Toner": "var(--cd-grey)",
      "Gestión de Soporte": "var(--cd-grey)",
      "Medio de Impresión": "var(--cd-orange)"
    }};

    // Theme Switcher
    const themeBtn = document.getElementById("themeToggle");
    const themeText = document.getElementById("themeToggleText");
    themeBtn.addEventListener("click", () => {{
      const currentTheme = document.documentElement.getAttribute("data-theme");
      if (currentTheme === "dark") {{
        document.documentElement.setAttribute("data-theme", "light");
        themeText.innerText = "🌙 Modo Oscuro";
      }} else {{
        document.documentElement.setAttribute("data-theme", "dark");
        themeText.innerText = "☀️ Modo Claro";
      }}
    }});

    // Smooth scroll to section
    function scrollToSection(id) {{
      const target = document.getElementById(id);
      if (target) {{
        target.scrollIntoView({{ behavior: "smooth", block: "start" }});
      }}
    }}

    // Scroll Spy active navigation item update
    const sections = document.querySelectorAll(".section");
    const navItems = document.querySelectorAll(".navItem");
    const SECTIONS_NAV = ["cover", "page1", "page2", "page3", "page4", "page5", "page6"];

    window.addEventListener("scroll", () => {{
      let current = "cover";
      sections.forEach(sec => {{
        const sectionTop = sec.offsetTop;
        if (pageYOffset >= (sectionTop - 250)) {{
          current = sec.getAttribute("id");
        }}
      }});

      navItems.forEach((btn, index) => {{
        btn.classList.remove("navItemActive");
        const secId = SECTIONS_NAV[index];
        if (secId === current) {{
          btn.classList.add("navItemActive");
        }}
      }});
    }});

    // Keyboard Arrow Controls
    window.addEventListener("keydown", (e) => {{
      let current = "cover";
      sections.forEach(sec => {{
        if (pageYOffset >= (sec.offsetTop - 250)) {{
          current = sec.getAttribute("id");
        }}
      }});
      const currentIndex = SECTIONS_NAV.indexOf(current);

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {{
        if (currentIndex < SECTIONS_NAV.length - 1) {{
          e.preventDefault();
          scrollToSection(SECTIONS_NAV[currentIndex + 1]);
        }}
      }} else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {{
        if (currentIndex > 0) {{
          e.preventDefault();
          scrollToSection(SECTIONS_NAV[currentIndex - 1]);
        }}
      }}
    }});

    // Instant filter of the 18 tasks table on Page 3
    function filterTasks() {{
      const q = document.getElementById("taskSearch").value.toLowerCase();
      const rows = document.querySelectorAll("#tasksTable tbody tr");
      
      rows.forEach(row => {{
        const text = row.textContent.toLowerCase();
        if (text.includes(q)) {{
          row.style.display = "";
        }} else {{
          row.style.display = "none";
        }}
      }});
    }}

    // Real-time closure simulator
    function runSimulation() {{
      const selector = document.getElementById("taskSelector");
      const val = selector.value;
      
      const resCategory = document.getElementById("resCategory");
      const resSubcategory = document.getElementById("resSubcategory");
      const resultBox = document.getElementById("resultBox");
      const obsText = document.getElementById("obsText");
      
      if (!val) {{
        resCategory.innerText = "—";
        resCategory.style.background = "var(--border-strong)";
        resCategory.style.boxShadow = "none";
        resSubcategory.innerText = "—";
        resSubcategory.style.borderColor = "var(--border-strong)";
        if (obsText) obsText.value = "";
        return;
      }}
      
      const mapping = TAREAS_SIM[val];
      if (mapping) {{
        resCategory.innerText = mapping.category;
        resSubcategory.innerText = mapping.subcategory;
        if (obsText) obsText.value = mapping.observation;
        
        const color = CATEGORY_COLORS[mapping.category];
        resCategory.style.background = color;
        resCategory.style.boxShadow = `0 4px 12px ${{color === "var(--cd-orange)" ? "rgba(247, 148, 29, 0.25)" : "rgba(88, 89, 91, 0.25)"}}`;
        resSubcategory.style.borderColor = color;
      }}
    }}

    // Initialize simulation on load
    window.onload = function() {{
      runSimulation();
    }};
  </script>

</body>
</html>
"""

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(presentation_html)
    print(f"Successfully generated verbatim-faithful interactive presentation at: {output_path}")

if __name__ == '__main__':
    main()
