import os

# Paths
logo_path = 'public/logo_canal_directo_b64.txt'
output_path = 'Presentacion-Tipificacion.html'

def read_logo():
    if os.path.exists(logo_path):
        with open(logo_path, 'r', encoding='utf-8') as f:
            return f.read().strip()
    return ""

def generate_html():
    logo_b64 = read_logo()
    
    html_content = f"""<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tipificación Automática - Canal Directo</title>
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  
  <style>
    /* variables de tema corporativo */
    :root {{
      --bg-base: #24263b;
      --bg-deep: #1c1d2e;
      --surface: #2c2f47;
      --surface-2: #363955;
      --border: rgba(255, 255, 255, 0.08);
      --border-strong: rgba(255, 255, 255, 0.16);
      --text: #eef0f8;
      --text-soft: #bcc1d8;
      --text-muted: #939ab6;
      --input-bg: rgba(0, 0, 0, 0.2);
      
      /* Colores Oficiales del Manual de Marca Corporativo */
      --cd-orange: #F7941D;
      --cd-grey: #58595B;
      
      --radius: 14px;
      --radius-sm: 8px;
      --shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      --ease: cubic-bezier(0.25, 0.8, 0.25, 1);
    }}

    [data-theme="light"] {{
      --bg-base: #f5f6e6;
      --bg-deep: #e8e9d8;
      --surface: #ffffff;
      --surface-2: #fcfcf2;
      --border: rgba(54, 57, 85, 0.12);
      --border-strong: rgba(54, 57, 85, 0.22);
      --text: #363955;
      --text-soft: #4c5578;
      --text-muted: #69739a;
      --input-bg: #ffffff;
      --shadow: 0 10px 25px rgba(54, 57, 85, 0.1);
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
    }}

    /* Header Bar */
    .headerBar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.9rem 2rem;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: var(--shadow);
    }}

    .logoArea {{
      display: flex;
      align-items: center;
      gap: 1rem;
    }}

    .logoArea img {{
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
      background: var(--bg-deep);
      border: 1px solid var(--border);
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
      border-color: var(--border-strong);
    }}

    /* Main Container */
    .container {{
      display: flex;
      max-width: 1400px;
      margin: 0 auto;
      min-height: calc(100vh - 65px);
    }}

    /* Sidebar indices */
    .sidebar {{
      width: 300px;
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

    /* Content Area */
    .content {{
      flex-grow: 1;
      padding: 3rem 4rem;
      max-width: 960px;
      margin: 0 auto;
    }}

    @media (max-width: 768px) {{
      .content {{
        padding: 2rem 1.5rem;
      }}
    }}

    /* Franja de colores corporativos (Naranja y Gris) */
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

    .sectionHeader {{
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
    }}

    .sectionKicker {{
      font-size: 0.85rem;
      text-transform: uppercase;
      color: var(--cd-orange);
      font-weight: 700;
      letter-spacing: 2px;
      display: block;
      margin-bottom: 0.5rem;
    }}

    .sectionTitle {{
      font-family: 'Montserrat', sans-serif;
      font-size: 2.2rem;
      font-weight: 800;
      color: var(--text);
      line-height: 1.25;
    }}

    .sectionSubtitle {{
      font-size: 1.1rem;
      color: var(--text-soft);
      margin-top: 0.5rem;
    }}

    /* Typography */
    h2.subTitle {{
      font-family: 'Montserrat', sans-serif;
      font-size: 1.5rem;
      color: var(--text);
      margin-top: 2rem;
      margin-bottom: 1rem;
      font-weight: 700;
    }}

    p.text {{
      font-size: 1.05rem;
      line-height: 1.7;
      color: var(--text-soft);
      margin-bottom: 1.5rem;
      text-align: justify;
    }}

    .bold {{
      color: var(--text);
      font-weight: 700;
    }}

    /* Highlight box */
    .highlightBox {{
      background: var(--bg-deep);
      border-left: 5px solid var(--cd-orange);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      padding: 1.5rem;
      margin: 2rem 0;
      color: var(--text);
      font-size: 1.05rem;
      line-height: 1.65;
    }}

    /* Grid */
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0;
    }}

    .card {{
      background: var(--bg-deep);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 1.5rem;
      transition: all 0.3s var(--ease);
      cursor: pointer;
      position: relative;
    }}

    .card:hover {{
      transform: translateY(-4px);
      border-color: var(--cd-orange);
      box-shadow: var(--shadow);
    }}

    .cardTitle {{
      font-family: 'Montserrat', sans-serif;
      font-size: 1.2rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}

    .cardText {{
      font-size: 0.95rem;
      color: var(--text-soft);
      line-height: 1.45;
      margin-bottom: 1rem;
    }}

    .cardAction {{
      font-size: 0.85rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: auto;
      color: var(--cd-orange) !important;
    }}

    /* Subcategories List container */
    .subcatContainer {{
      margin-top: 1rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      border-top: 1px solid var(--border);
      padding-top: 1rem;
      animation: fadeIn 0.3s ease;
    }}

    .subcatBadge {{
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text-soft);
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }}

    /* Tables */
    .tableContainer {{
      overflow-x: auto;
      margin: 2rem 0;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--bg-deep);
    }}

    .table {{
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.95rem;
    }}

    .thead {{
      background: rgba(0,0,0,0.15);
      border-bottom: 2px solid var(--border);
    }}

    .th {{
      padding: 1rem 1.25rem;
      font-weight: 700;
      color: var(--text);
      font-family: 'Montserrat', sans-serif;
    }}

    .tr {{
      border-bottom: 1px solid var(--border);
      transition: background-color 0.2s ease;
    }}

    .tr:hover {{
      background-color: rgba(255,255,255,0.02);
    }}

    .td {{
      padding: 1rem 1.25rem;
      color: var(--text-soft);
    }}

    .tdHighlight {{
      color: var(--text);
      font-weight: 600;
    }}

    /* Search bar */
    .searchBar {{
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }}

    .searchInput {{
      flex-grow: 1;
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0.8rem 1.2rem;
      color: var(--text);
      font-family: inherit;
      font-size: 1rem;
      transition: border-color 0.2s ease;
    }}

    .searchInput:focus {{
      border-color: var(--cd-orange);
      outline: none;
    }}

    /* Steps list (verbatim from PDF) */
    .stepList {{
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin: 2rem 0;
    }}

    .step {{
      display: flex;
      align-items: flex-start;
      gap: 1.5rem;
      padding: 1.5rem;
      background: var(--bg-deep);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.3s var(--ease);
    }}

    .stepActive {{
      border-color: var(--cd-orange);
      background: var(--surface-2);
      box-shadow: 0 0 15px rgba(247, 148, 29, 0.15);
    }}

    .stepNum {{
      background: var(--border-strong);
      color: var(--text);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-family: 'Montserrat', sans-serif;
      flex-shrink: 0;
      transition: background-color 0.3s ease;
    }}

    .stepActive .stepNum {{
      background: var(--cd-orange);
      color: white;
    }}

    .stepContent {{
      flex-grow: 1;
    }}

    .stepTitle {{
      font-family: 'Montserrat', sans-serif;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 0.4rem;
    }}

    .stepText {{
      color: var(--text-soft);
      font-size: 0.95rem;
      line-height: 1.5;
    }}

    .arrow {{
      text-align: center;
      margin: 4px 0;
      color: var(--cd-orange);
      font-weight: bold;
      font-size: 14pt;
    }}

    /* Interactive Simulator */
    .simulator {{
      background: var(--bg-deep);
      border: 2px solid var(--cd-orange);
      border-radius: var(--radius);
      padding: 2rem;
      margin-top: 2rem;
      box-shadow: var(--shadow);
    }}

    .simHeader {{
      background: var(--surface);
      margin: -2rem -2rem 2rem -2rem;
      padding: 1.25rem 2rem;
      border-radius: calc(var(--radius) - 2px) calc(var(--radius) - 2px) 0 0;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}

    .simTitle {{
      font-family: 'Montserrat', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text);
    }}

    .formGrid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }}

    @media (max-width: 768px) {{
      .formGrid {{
        grid-template-columns: 1fr;
      }}
    }}

    .field {{
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }}

    .fieldFull {{
      grid-column: span 2;
    }}

    @media (max-width: 768px) {{
      .fieldFull {{
        grid-column: span 1;
      }}
    }}

    .label {{
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}

    .input,
    .select,
    .textarea {{
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0.8rem 1rem;
      color: var(--text);
      font-family: inherit;
      font-size: 1rem;
      transition: all 0.2s ease;
    }}

    .input:focus,
    .select:focus,
    .textarea:focus {{
      border-color: var(--cd-orange);
      outline: none;
      box-shadow: 0 0 0 3px rgba(247, 148, 29, 0.15);
    }}

    .textarea {{
      min-height: 100px;
      resize: vertical;
    }}

    /* Simulator Output Box */
    .simResultBox {{
      margin-top: 2rem;
      padding: 1.5rem;
      border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.03);
      border: 1px dashed var(--border-strong);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }}

    .resultTitle {{
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
    }}

    .resultRow {{
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.5rem;
    }}

    .resultItem {{
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }}

    .resultLabel {{
      font-size: 0.8rem;
      color: var(--text-soft);
    }}

    .badge {{
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 1rem;
      color: #fff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
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

    @keyframes fadeIn {{
      from {{ opacity: 0; }}
      to {{ opacity: 1; }}
    }}
  </style>
</head>
<body>

  <!-- Cabecera de marca -->
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
    <!-- Navegación lateral de lectura -->
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
          <button class="navItem" onclick="scrollToSection('sec1')">
            <span class="navDot"></span>
            1. Categorías
          </button>
        </li>
        <li>
          <button class="navItem" onclick="scrollToSection('sec2')">
            <span class="navDot"></span>
            2. Tareas Normalizadas
          </button>
        </li>
        <li>
          <button class="navItem" onclick="scrollToSection('sec3')">
            <span class="navDot"></span>
            3. Integración y Flujo
          </button>
        </li>
        <li>
          <button class="navItem" onclick="scrollToSection('sec4')">
            <span class="navDot"></span>
            4. Simulador de Cierre
          </button>
        </li>
      </ul>
      <div style="margin-top: auto; font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">
        <p><strong>Navegación PC:</strong></p>
        <p>Puedes usar las flechas del teclado (← / → / ↑ / ↓) para deslizarte entre las secciones mientras presentas con el gerente.</p>
      </div>
    </aside>

    <!-- Contenido principal -->
    <main class="content">
      <div class="brandLine"></div>

      <!-- ============ PORTADA ============ -->
      <section id="cover" class="section" style="min-height: 60vh; display: flex; flex-direction: column; justify-content: center;">
        <span class="sectionKicker">Metodología de Análisis</span>
        <h1 class="sectionTitle" style="font-size: 3rem; margin: 1.5rem 0;">
          Tipificación <span style="color: var(--cd-orange);">Automatática</span>
        </h1>
        <p class="sectionSubtitle" style="font-size: 1.3rem; line-height: 1.5; margin-bottom: 2rem;">
          Extracción de tareas normalizadas a partir de 500 incidentes reales.
        </p>
        <div class="highlightBox" style="margin: 1rem 0;">
          Un sistema de clasificación determinístico, 100% reproducible y auditable, estructurado bajo la identidad de marca corporativa de Canal Directo.
        </div>
        <div style="marginTop: 3rem; display: flex; gap: 2rem; color: var(--text-muted); font-size: 0.95rem;">
          <span>Período: Junio 2026</span>
          <span>Confidencial</span>
        </div>
      </section>

      <!-- ============ CATEGORÍAS ============ -->
      <section id="sec1" class="section">
        <div class="sectionHeader">
          <span class="sectionKicker">Sección 1</span>
          <h2 class="sectionTitle">1. Análisis: De 500 Incidentes a 5 Categorías</h2>
          <p class="sectionSubtitle">Definición de la taxonomía del servicio de soporte técnico</p>
        </div>

        <p class="text">
          Para organizar de forma estructurada los reportes, se definieron 5 categorías mutuamente excluyentes, alineadas corporativamente bajo la identidad de Canal Directo:
        </p>

        <!-- Grilla de Categorías -->
        <div class="grid">
          
          <div class="card" onclick="toggleCat('cat-hardware')">
            <div class="cardTitle">
              <span style="display: flex; align-items: center; gap: 0.5rem;">
                💻 <strong>Hardware y Desgaste</strong>
              </span>
            </div>
            <p class="cardText">Reparación o sustitución de componentes físicos de la impresora por desgaste (fusores, rodillos, ADF).</p>
            <div class="cardAction">
              <span id="cat-hardware-action">▶ Ver subcategorías</span>
            </div>
            <div class="subcatContainer" id="cat-hardware-subcats" style="display: none;">
              <span class="subcatBadge">Fusor / Kit de mantenimiento</span>
              <span class="subcatBadge">Rodillos / Pickup / Separación</span>
              <span class="subcatBadge">Escáner / ADF</span>
              <span class="subcatBadge">Parte / Panel / Botonera rota</span>
              <span class="subcatBadge">Otros - Hardware y Desgaste</span>
            </div>
          </div>

          <div class="card" onclick="toggleCat('cat-software')">
            <div class="cardTitle">
              <span style="display: flex; align-items: center; gap: 0.5rem;">
                🌐 <strong>Software, Firmware y Red</strong>
              </span>
            </div>
            <p class="cardText">Configuración de red/IP, driver, spooler, reinstalación de firmware o ajuste de imagen.</p>
            <div class="cardAction">
              <span id="cat-software-action">▶ Ver subcategorías</span>
            </div>
            <div class="subcatContainer" id="cat-software-subcats" style="display: none;">
              <span class="subcatBadge">Configuración de red / IP</span>
              <span class="subcatBadge">Driver / PC / Spooler</span>
              <span class="subcatBadge">Firmware</span>
              <span class="subcatBadge">Calibración / Ajuste de imagen</span>
              <span class="subcatBadge">Otros - Software, Firmware y Red</span>
            </div>
          </div>

          <div class="card" onclick="toggleCat('cat-insumos')">
            <div class="cardTitle">
              <span style="display: flex; align-items: center; gap: 0.5rem;">
                🗂️ <strong>Insumos y Toner</strong>
              </span>
            </div>
            <p class="cardText">Toner agotado, vaciado de contenedores residuales, drum/revelador o manchas del cartucho.</p>
            <div class="cardAction">
              <span id="cat-insumos-action">▶ Ver subcategorías</span>
            </div>
            <div class="subcatContainer" id="cat-insumos-subcats" style="display: none;">
              <span class="subcatBadge">Toner / Cartucho</span>
              <span class="subcatBadge">Tolva / Contenedor residual</span>
              <span class="subcatBadge">Drum / Unidad de imagen / Revelador</span>
              <span class="subcatBadge">Calidad por insumo (manchas / clara)</span>
              <span class="subcatBadge">Otros - Insumos y Toner</span>
            </div>
          </div>

          <div class="card" onclick="toggleCat('cat-soporte')">
            <div class="cardTitle">
              <span style="display: flex; align-items: center; gap: 0.5rem;">
                🖨️ <strong>Gestión de Soporte</strong>
              </span>
            </div>
            <p class="cardText">Tickets sin reparación de fondo: sin respuesta del cliente, auto-resoluciones, mal uso, limpieza o diagnósticos sin falla.</p>
            <div class="cardAction">
              <span id="cat-soporte-action">▶ Ver subcategorías</span>
            </div>
            <div class="subcatContainer" id="cat-soporte-subcats" style="display: none;">
              <span class="subcatBadge">Mesa de ayuda / Sin respuesta</span>
              <span class="subcatBadge">Instructivo / Autoresolución</span>
              <span class="subcatBadge">Mal uso / Negligencia</span>
              <span class="subcatBadge">Diagnóstico / Sin falla</span>
              <span class="subcatBadge">Mantenimiento / Limpieza general</span>
              <span class="subcatBadge">Problema externo / Red cliente</span>
              <span class="subcatBadge">Recambio Definitivo</span>
            </div>
          </div>

          <div class="card" onclick="toggleCat('cat-medio')">
            <div class="cardTitle">
              <span style="display: flex; align-items: center; gap: 0.5rem;">
                📄 <strong>Medio de Impresión</strong>
              </span>
            </div>
            <p class="cardText">Problemas físicos con papel (humedad, atascos) y ajuste físico de bandejas/guías.</p>
            <div class="cardAction">
              <span id="cat-medio-action">▶ Ver subcategorías</span>
            </div>
            <div class="subcatContainer" id="cat-medio-subcats" style="display: none;">
              <span class="subcatBadge">Atasco de papel (común)</span>
              <span class="subcatBadge">Papel especial / Troquelado</span>
              <span class="subcatBadge">Papel inadecuado / humedad / mala calidad</span>
              <span class="subcatBadge">Arruga / Toma de varias hojas</span>
              <span class="subcatBadge">Ajuste de bandejas / guías</span>
            </div>
          </div>

        </div>

        <div class="highlightBox">
          <span class="bold">¿Por qué es importante?</span> Separar los problemas físicos de desgaste de los problemas de papel (medio de impresión) o conectividad le da al gerente herramientas claras para resolver incidencias de calidad con el cliente de forma objetiva.
        </div>
      </section>

      <!-- ============ TAREAS NORMALIZADAS ============ -->
      <section id="sec2" class="section">
        <div class="sectionHeader">
          <span class="sectionKicker">Sección 2</span>
          <h2 class="sectionTitle">2. De 500 Soluciones a 18 Tareas Normalizadas</h2>
          <p class="sectionSubtitle">Simplificación científica de los inputs del técnico</p>
        </div>

        <p class="text">
          A partir del análisis de 500 incidentes reales, se identificaron 18 tareas normalizadas que abarcan más del 95% de las soluciones aplicadas por los técnicos de Canal Directo.
        </p>

        <div class="searchBar">
          <input type="text" id="taskSearch" class="searchInput" placeholder="🔍 Escribe para buscar una tarea (ej: fusor, rodillos, red)..." onkeyup="filterTasks()">
        </div>

        <div class="tableContainer">
          <table class="table" id="tasksTable">
            <thead class="thead">
              <tr>
                <th class="th">ID</th>
                <th class="th">Tarea Normalizada</th>
                <th class="th">Categoría Resultante</th>
                <th class="th">Frecuencia</th>
                <th class="th">% Casos</th>
              </tr>
            </thead>
            <tbody id="tasksTableBody">
              <!-- Creado dinámicamente en JS -->
            </tbody>
          </table>
        </div>
      </section>

      <!-- ============ INTEGRACIÓN Y FLUJO ============ -->
      <section id="sec3" class="section">
        <div class="sectionHeader">
          <span class="sectionKicker">Sección 3</span>
          <h2 class="sectionTitle">3. Cómo Funcionan las Categorías y Tareas Juntas</h2>
          <p class="sectionSubtitle">El flujo y las ventajas del sistema de tipificación</p>
        </div>

        <h3 class="h2">3.1 El Flujo de Tipificación</h3>
        <p class="text">
          El proceso de tipificación automática sigue los siguientes pasos exactos:
        </p>

        <div class="stepList">
          <div class="step stepActive" onclick="activateStep(1)">
            <div class="stepNum">1</div>
            <div class="stepContent">
              <h4 class="stepTitle">TECNICO SELECCIONA TAREA</h4>
              <p class="stepText">Dropdown con las 18 tareas (ej: "Cambio de fusor")</p>
            </div>
          </div>
          
          <div class="arrow">↓</div>

          <div class="step" onclick="activateStep(2)">
            <div class="stepNum">2</div>
            <div class="stepContent">
              <h4 class="stepTitle">TECNICO ESCRIBE OBSERVACIONES (opcional)</h4>
              <p class="stepText">Campo de texto libre para contexto (ej: "con mantenimiento preventivo")</p>
            </div>
          </div>
          
          <div class="arrow">↓</div>

          <div class="step" onclick="activateStep(3)">
            <div class="stepNum">3</div>
            <div class="stepContent">
              <h4 class="stepTitle">SISTEMA TIPIFICA AUTOMATICAMENTE</h4>
              <p class="stepText">Mapeo directo y consistente: Tarea "Cambio de fusor" → Categoria: Hardware y Desgaste | Subcategoria: Fusor</p>
            </div>
          </div>
          
          <div class="arrow">↓</div>

          <div class="step" onclick="activateStep(4)">
            <div class="stepNum">4</div>
            <div class="stepContent">
              <h4 class="stepTitle">INCIDENTE TIPIFICADO Y CERRADO</h4>
              <p class="stepText">El incidente queda guardado en la base de datos clasificado de manera permanente.</p>
            </div>
          </div>
        </div>

        <h3 class="h2">3.2 Ventajas del Sistema</h3>
        <ul style="margin: 0 0 15px 25px; line-height: 1.8; color: var(--text-soft);">
          <li><strong>Determinístico:</strong> Mismo tarea siempre mapea a misma categoría.</li>
          <li><strong>Rápido:</strong> Seleccionar de lista es más rápido que escribir descripción libre.</li>
          <li><strong>Reproducible:</strong> Mismos casos se clasifican idénticamente.</li>
          <li><strong>Auditable:</strong> Fácil de verificar y corregir si hay errores de mapeo.</li>
          <li><strong>Bajo costo:</strong> No requiere procesamiento complejo.</li>
        </ul>

        <h3 class="h2">3.3 Casos Edge: Rol de Observaciones</h3>
        <p class="text">
          Si el técnico selecciona "Cambio de rodillos" pero escribe "fue por papel mojado que no era del rollo", las observaciones se pueden usar para refinar la subcategoría a nivel administrativo.
        </p>
        <p class="text">
          Pero la tipificación base sigue siendo: <strong>Hardware y Desgaste &gt; Rodillos</strong>.
        </p>
      </section>

      <!-- ============ SIMULADOR DE CIERRE ============ -->
      <section id="sec4" class="section">
        <div class="sectionHeader">
          <span class="sectionKicker">Sección 4</span>
          <h2 class="sectionTitle">4. Ejemplo: Formulario de Cierre con Tipificación Automática</h2>
          <p class="sectionSubtitle">Simulador interactivo en tiempo real para presentar al gerente</p>
        </div>

        <p class="text">
          A continuación se muestra un caso real: el formulario que completa el técnico al cerrar un incidente. La tarea seleccionada se mapea automáticamente a categoría y subcategoría:
        </p>

        <div class="simulator">
          <div class="simHeader">
            <div class="simTitle">📝 Registrar Cierre de Incidente</div>
            <span style="font-size: 0.8rem; font-weight: 700; opacity: 0.7;">SIMULADOR</span>
          </div>

          <div class="formGrid">
            <div class="field">
              <label class="label">Estado Instancia *</label>
              <select class="select">
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>

            <div class="field">
              <label class="label">Fecha *</label>
              <input type="text" class="input" value="25/06/2026 13:35" readonly>
            </div>

            <div class="field">
              <label class="label">Técnico *</label>
              <select class="select">
                <option>PST Tucumán - NAPA Tucumán</option>
              </select>
            </div>

            <div class="field">
              <label class="label">Contador (mono)</label>
              <input type="text" class="input" placeholder="Ingresar contador...">
            </div>

            <div class="field">
              <label class="label" style="color: var(--cd-orange);">Tareas *</label>
              <select class="select" id="taskSelector" style="border: 2px solid var(--cd-orange); font-weight: 700;" onchange="runSimulation()">
                <option value="">-- Seleccionar tarea realizada --</option>
                <!-- Carga dinámica por JS -->
              </select>
            </div>

            <div class="field">
              <label class="label">Tiempo estimado</label>
              <input type="text" class="input" value="1.5 horas" readonly>
            </div>

            <div class="field fieldFull">
              <label class="label">Observaciones</label>
              <textarea class="textarea" id="obsText">Fusor con altas temperaturas durante calentamiento. Se reemplazo por uno nuevo. Se realizo mantenimiento preventivo de rodillos. Equipo en funcionamiento correcto.</textarea>
            </div>
          </div>

          <!-- Resultado del simulador -->
          <div class="simResultBox">
            <div class="resultTitle">Tipificación Automática (Simulado)</div>
            <div id="simEmpty" style="color: var(--text-muted); font-size: 0.95rem; font-style: italic;">
              Por favor, seleccione una Tarea Realizada arriba para observar la tipificación determinística.
            </div>
            
            <div id="simResults" style="display: none;" class="resultRow">
              <div class="resultItem">
                <span class="resultLabel">Categoría</span>
                <span class="badge" id="resCategoryBadge"></span>
              </div>
              <div class="resultItem">
                <span class="resultLabel">Subcategoría</span>
                <span class="badge" id="resSubcategoryBadge" style="background: var(--surface); color: var(--text); border: 2px solid var(--border-strong);"></span>
              </div>
            </div>
          </div>

        </div>

        <h3 class="h2" style="margin-top: 2rem;">Explicación del Ejemplo</h3>
        <ul style="margin: 0 0 15px 25px; line-height: 1.8; color: var(--text-soft);">
          <li><strong>Tarea seleccionada:</strong> &quot;Cambio de fusor&quot; (dato clave)</li>
          <li><strong>Observaciones:</strong> Detalles adicionales (contexto, mantenimiento preventivo, etc.)</li>
          <li><strong>Tipificación:</strong> Automática y consistente</li>
          <li><strong>Resultado final:</strong> Incidente clasificado como Hardware &gt; Fusor</li>
        </ul>
      </section>

      <footer style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--border); text-align: center; color: var(--text-muted); font-size: 0.9rem;">
        <p>Canal Directo S.A. — Metodología de Clasificación Inteligente de Incidentes</p>
        <p style="margin-top: 0.5rem;">Diseñado para lectura conjunta en PC</p>
      </footer>
    </main>
  </div>

  <script>
    // 18 Tareas Normalizadas
    const TAREAS = [
      {{ id: 1, name: "Cambio de fusor", frequency: 82, percentage: "21.6%", emoji: "🔧", category: "Hardware y Desgaste", subcategory: "Fusor / Kit de mantenimiento" }},
      {{ id: 2, name: "Cambio de rodillos/pickup", frequency: 27, percentage: "7.1%", emoji: "🔧", category: "Hardware y Desgaste", subcategory: "Rodillos / Pickup / Separación" }},
      {{ id: 3, name: "Cambio de bandeja", frequency: 17, percentage: "4.5%", emoji: "🔧", category: "Medio de Impresión", subcategory: "Ajuste de bandejas / guías" }},
      {{ id: 4, name: "Cambio de toner/cartucho", frequency: 7, percentage: "1.8%", emoji: "🔧", category: "Insumos y Toner", subcategory: "Toner / Cartucho" }},
      {{ id: 5, name: "Cambio de drum/revelador", frequency: 4, percentage: "1.1%", emoji: "🔧", category: "Insumos y Toner", subcategory: "Drum / Unidad de imagen / Revelador" }},
      {{ id: 6, name: "Cambio de ADF/escáner", frequency: 3, percentage: "0.8%", emoji: "🔧", category: "Hardware y Desgaste", subcategory: "Escáner / ADF" }},
      {{ id: 7, name: "Cambio de panel/display", frequency: 2, percentage: "0.5%", emoji: "🔧", category: "Hardware y Desgaste", subcategory: "Parte / Panel / Botonera rota" }},
      {{ id: 8, name: "Cambio de cable/conector", frequency: 1, percentage: "0.3%", emoji: "🔧", category: "Hardware y Desgaste", subcategory: "Otros - Hardware y Desgaste" }},
      {{ id: 9, name: "Limpieza del equipo", frequency: 40, percentage: "10.5%", emoji: "🧹", category: "Gestión de Soporte", subcategory: "Mantenimiento / Limpieza general" }},
      {{ id: 10, name: "Limpieza de rodillos", frequency: 11, percentage: "2.9%", emoji: "🧹", category: "Gestión de Soporte", subcategory: "Mantenimiento / Limpieza general" }},
      {{ id: 11, name: "Mantenimiento preventivo", frequency: 68, percentage: "17.9%", emoji: "⚙️", category: "Gestión de Soporte", subcategory: "Mantenimiento / Limpieza general" }},
      {{ id: 12, name: "Reset de equipo", frequency: 11, percentage: "2.9%", emoji: "↻", category: "Gestión de Soporte", subcategory: "Mantenimiento / Limpieza general" }},
      {{ id: 13, name: "Configuración de red/IP", frequency: 10, percentage: "2.6%", emoji: "🌐", category: "Software, Firmware y Red", subcategory: "Configuración de red / IP" }},
      {{ id: 14, name: "Configuración de bandejas", frequency: 13, percentage: "3.4%", emoji: "⚙️", category: "Medio de Impresión", subcategory: "Ajuste de bandejas / guías" }},
      {{ id: 15, name: "Actualización de firmware", frequency: 4, percentage: "1.1%", emoji: "💾", category: "Software, Firmware y Red", subcategory: "Firmware" }},
      {{ id: 16, name: "Retiro de papel atascado", frequency: 15, percentage: "3.9%", emoji: "📄", category: "Medio de Impresión", subcategory: "Atasco de papel (común)" }},
      {{ id: 17, name: "Diagnóstico/Sin falla", frequency: 65, percentage: "17.1%", emoji: "🔍", category: "Gestión de Soporte", subcategory: "Diagnóstico / Sin falla" }},
      {{ id: 18, name: "Soporte técnico remoto", frequency: 1, percentage: "0.3%", emoji: "📞", category: "Gestión de Soporte", subcategory: "Instructivo / Autoresolución" }}
    ];

    const CATEGORIES = {{
      "Hardware y Desgaste": {{ color: "var(--cd-grey)", emoji: "💻" }},
      "Software, Firmware y Red": {{ color: "var(--cd-grey)", emoji: "📺" }},
      "Insumos y Toner": {{ color: "var(--cd-grey)", emoji: "🗂️" }},
      "Gestión de Soporte": {{ color: "var(--cd-grey)", emoji: "🖨️" }},
      "Medio de Impresión": {{ color: "var(--cd-orange)", emoji: "📄" }}
    }};

    // Inicializar tablas y dropdowns
    function init() {{
      const tbody = document.getElementById("tasksTableBody");
      const selector = document.getElementById("taskSelector");
      
      tbody.innerHTML = "";
      selector.innerHTML = '<option value="">-- Seleccionar tarea realizada --</option>';

      TAREAS.forEach(t => {{
        // Cargar fila de tabla
        const tr = document.createElement("tr");
        tr.className = "tr";
        tr.id = "task-row-" + t.id;
        
        const catDetails = CATEGORIES[t.category];
        const color = t.category === "Medio de Impresión" ? "var(--cd-orange)" : "var(--text)";
        
        tr.innerHTML = `
          <td class="td">${{t.id}}</td>
          <td class="tdHighlight">${{t.emoji}} ${{t.name}}</td>
          <td class="td">
            <span style="color: ${{color}}; font-weight: 700; border-left: 3px solid ${{color}}; padding-left: 8px;">
              ${{t.category}}
            </span>
          </td>
          <td class="td">${{t.frequency}}</td>
          <td class="td" style="font-weight: 600;">${{t.percentage}}</td>
        `;
        tbody.appendChild(tr);

        // Cargar opción en selector
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.innerText = t.emoji + " " + t.name;
        selector.appendChild(opt);
      }});
    }}

    // Cambiar Tema (Claro/Oscuro)
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

    // Scroll suave a sección
    function scrollToSection(id) {{
      const target = document.getElementById(id);
      if (target) {{
        target.scrollIntoView({{ behavior: "smooth", block: "start" }});
      }}
    }}

    // Sincronizar sidebar activando botones según scroll
    const sections = document.querySelectorAll(".section");
    const navItems = document.querySelectorAll(".navItem");

    window.addEventListener("scroll", () => {{
      let current = "cover";
      sections.forEach(sec => {{
        const sectionTop = sec.offsetTop;
        const sectionHeight = sec.clientHeight;
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

    const SECTIONS_NAV = ["cover", "sec1", "sec2", "sec3", "sec4"];

    // Atajos de teclado (flechas)
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

    // Alternar subcategorías
    function toggleCat(catId) {{
      const subcats = document.getElementById(catId + "-subcats");
      const action = document.getElementById(catId + "-action");
      if (subcats.style.display === "none") {{
        subcats.style.display = "flex";
        action.innerText = "▼ Ocultar subcategorías";
      }} else {{
        subcats.style.display = "none";
        action.innerText = "▶ Ver subcategorías";
      }}
    }}

    // Filtrar tareas por buscador
    function filterTasks() {{
      const q = document.getElementById("taskSearch").value.toLowerCase();
      TAREAS.forEach(t => {{
        const row = document.getElementById("task-row-" + t.id);
        const match = t.name.toLowerCase().includes(q) || 
                      t.category.toLowerCase().includes(q) || 
                      t.subcategory.toLowerCase().includes(q);
        if (match) {{
          row.style.display = "";
        }} else {{
          row.style.display = "none";
        }}
      }});
    }}

    // Pasos del flujo interactivo
    function activateStep(stepNum) {{
      const steps = document.querySelectorAll(".step");
      steps.forEach((s, idx) => {{
        if (idx === (stepNum - 1)) {{
          s.classList.add("stepActive");
        }} else {{
          s.classList.remove("stepActive");
        }}
      }});
    }}

    // Simulador
    function runSimulation() {{
      const taskId = document.getElementById("taskSelector").value;
      const emptyDiv = document.getElementById("simEmpty");
      const resultsDiv = document.getElementById("simResults");
      
      if (!taskId) {{
        emptyDiv.style.display = "block";
        resultsDiv.style.display = "none";
        return;
      }}

      const task = TAREAS.find(t => t.id === Number(taskId));
      if (!task) return;

      const catDetails = CATEGORIES[task.category];
      const color = task.category === "Medio de Impresión" ? "var(--cd-orange)" : "var(--cd-grey)";

      // Actualizar badges
      const catBadge = document.getElementById("resCategoryBadge");
      catBadge.innerText = catDetails.emoji + " " + task.category;
      catBadge.style.background = color;
      catBadge.style.boxShadow = `0 4px 12px ${{color}}33`;

      const subcatBadge = document.getElementById("resSubcategoryBadge");
      subcatBadge.innerText = task.subcategory;
      subcatBadge.style.borderColor = color;

      emptyDiv.style.display = "none";
      resultsDiv.style.display = "flex";
    }}

    // Lanzar
    window.onload = init;
  </script>
</body>
</html>"""
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"Generated beautiful slide-sidebar layout presentation with exact PDF texts at: {output_path}")

if __name__ == '__main__':
    generate_html()
