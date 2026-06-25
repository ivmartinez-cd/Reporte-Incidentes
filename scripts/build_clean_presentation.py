import re

input_path = 'public/reporte-tipificacion-v2.html'
output_path = 'Presentacion-Tipificacion.html'

def main():
    with open(input_path, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Modify the CSS style section
    # Let's replace the existing styles with premium corporate desktop page styling
    styles_pattern = r'<style>(.*?)</style>'
    
    new_css = """
  @page {
    size: A4;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  /* Tema corporativo */
  body {
    font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
    color: #333;
    background: #1c1d2e; /* Fondo oscuro premium para resaltar las hojas en PC */
    font-size: 11pt;
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Vista de páginas centradas (efecto PDF / Slide en PC) */
  .cover, .page {
    width: 820px;
    min-height: 1160px;
    background: #ffffff;
    margin-bottom: 2.5rem;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    border-radius: 6px;
    position: relative;
    padding: 60px 80px;
    overflow: hidden;
  }

  @media print {
    body {
      background: #fff;
      padding: 0;
    }
    .cover, .page {
      width: 100%;
      min-height: 100vh;
      margin-bottom: 0;
      box-shadow: none;
      border-radius: 0;
      page-break-after: always;
    }
  }

  /* PORTADA */
  .cover-top-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 8px;
    background: linear-gradient(to right, #662D91, #E32D91, #F7941D, #58595B, #3DB1CA);
  }
  .cover-side {
    position: absolute;
    top: 0;
    left: 0;
    width: 120px;
    bottom: 0;
    background: #58595B;
  }
  .cover-side::after {
    content: '';
    position: absolute;
    top: 50%;
    right: -60px;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: rgba(247, 148, 29, 0.15);
    transform: translateY(-50%);
  }
  .cover-content {
    position: relative;
    z-index: 1;
    margin-left: 80px;
    text-align: left;
    max-width: 520px;
  }
  .cover-logo {
    width: 300px;
    margin-bottom: 50px;
  }
  .cover-stripe {
    width: 80px;
    height: 5px;
    background: #F7941D;
    margin-bottom: 30px;
    border-radius: 3px;
  }
  .cover h1 {
    font-family: 'Montserrat', sans-serif;
    font-weight: 800;
    font-size: 30pt;
    color: #58595B;
    margin-bottom: 15px;
    line-height: 1.2;
  }
  .cover h1 span {
    color: #F7941D;
  }
  .cover h2 {
    font-family: 'Source Sans 3', sans-serif;
    font-weight: 400;
    font-size: 13pt;
    color: #888;
    margin-bottom: 50px;
    line-height: 1.6;
  }
  .cover-footer {
    position: absolute;
    bottom: 40px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 10pt;
    color: #999;
  }
  .cover-bottom-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 80px;
    background: linear-gradient(to top, rgba(247, 148, 29, 0.1), transparent);
  }

  /* PAGINAS INTERIORES */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 35px;
    padding-bottom: 15px;
    border-bottom: 2px solid #F7941D;
    font-size: 10pt;
    color: #666;
  }
  .header-logo {
    height: 22px;
    width: auto;
  }
  .page-footer {
    position: absolute;
    bottom: 30px;
    left: 80px;
    right: 80px;
    display: flex;
    justify-content: space-between;
    font-size: 9pt;
    color: #999;
  }

  h1 {
    font-family: 'Montserrat', sans-serif;
    font-size: 18pt;
    color: #58595B;
    margin-bottom: 20px;
    border-bottom: 3px solid #F7941D;
    padding-bottom: 10px;
  }
  h2 {
    font-family: 'Montserrat', sans-serif;
    font-size: 13pt;
    color: #58595B; /* Modificado a gris corporativo */
    margin-top: 20px;
    margin-bottom: 12px;
  }
  p {
    margin-bottom: 12px;
    text-align: justify;
  }

  .highlight-box {
    background: #FFF8F0;
    border-left: 4px solid #F7941D;
    padding: 12px;
    margin: 15px 0;
    font-size: 10pt;
    border-radius: 0 4px 4px 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
    font-size: 9.5pt;
  }
  thead {
    background: #58595B;
    color: white;
  }
  th, td {
    padding: 8px 10px;
    text-align: left;
    border: 1px solid #DDD;
  }
  th {
    font-weight: bold;
  }
  tbody tr:nth-child(even) {
    background: #F9F9F9;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin: 15px 0;
  }
  .stat-box {
    background: #FFF8F0;
    border: 1px solid #F7941D;
    padding: 12px;
    border-radius: 4px;
    text-align: center;
  }
  .stat-box .number {
    font-size: 18pt;
    font-weight: bold;
    color: #F7941D;
    margin-bottom: 4px;
  }
  .stat-box .label {
    font-size: 9pt;
    color: #666;
  }

  .form-mockup {
    background: #FFF;
    border: 1px solid #DDD;
    border-radius: 6px;
    padding: 20px;
    margin: 15px 0;
    font-size: 9.5pt;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }
  .form-mockup .form-header {
    background: #58595B;
    color: white;
    padding: 10px 12px;
    margin: -20px -20px 15px -20px;
    border-radius: 5px 5px 0 0;
    font-weight: bold;
  }
  .form-field {
    margin-bottom: 12px;
  }
  .form-field label {
    display: block;
    font-weight: bold;
    margin-bottom: 5px;
    color: #333;
    font-size: 9pt;
  }
  .form-field input,
  .form-field select,
  .form-field textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #CCC;
    border-radius: 3px;
    font-family: inherit;
    font-size: 9.5pt;
  }
  .form-field textarea {
    resize: vertical;
    min-height: 60px;
  }

  .result-box {
    background: #FFF8F0;
    border: 2px solid #F7941D;
    padding: 15px;
    margin: 15px 0;
    border-radius: 4px;
    font-size: 9.5pt;
    transition: all 0.3s ease;
  }

  .process-flow {
    background: #F5F5F5;
    padding: 15px;
    border-radius: 4px;
    margin: 15px 0;
    font-size: 9.5pt;
  }
  .process-flow p {
    margin: 4px 0;
  }
  .process-flow .arrow {
    text-align: center;
    margin: 4px 0;
    color: #F7941D;
    font-weight: bold;
    font-size: 14pt;
  }

  /* Buscador Interactivo */
  .search-container {
    margin: 15px 0;
    display: flex;
    gap: 10px;
  }
  .search-input {
    flex-grow: 1;
    padding: 8px 12px;
    border: 1px solid #CCC;
    border-radius: 4px;
    font-family: inherit;
    font-size: 9.5pt;
  }
  .search-input:focus {
    border-color: #F7941D;
    outline: none;
  }
"""
    
    html = re.sub(styles_pattern, f"<style>{new_css}</style>", html, flags=re.DOTALL)

    # 2. Add an ID to the tasks table on Page 3
    # Let's find the table that follows '2.3 Resultado: 18 Tareas Principales'
    # We can inject a search bar and give the table an ID
    table_index = html.find('<h2>2.3 Resultado: 18 Tareas Principales</h2>')
    if table_index != -1:
        # Find the next <table> tag after this heading
        table_tag_index = html.find('<table>', table_index)
        if table_tag_index != -1:
            # Replace <table> with <table id="tasksTable">
            html = html[:table_tag_index] + '<table id="tasksTable">' + html[table_tag_index + len('<table>'):]
            
            # Inject a search input right before the table container
            search_html = """
  <div class="search-container">
    <input type="text" id="taskSearch" class="search-input" placeholder="🔍 Escribe para buscar una tarea (ej: fusor, rodillos, red)..." onkeyup="filterTasks()">
  </div>
            """
            html = html[:table_tag_index] + search_html + html[table_tag_index:]

    # 3. Modify the select element and the result-box in the mockup form
    # We'll give them IDs so they can be easily targeted by JavaScript
    select_pattern = r'<select style="background: #FFF8F0; border: 2px solid #F7941D;">'
    html = html.replace(select_pattern, '<select id="taskSelector" style="background: #FFF8F0; border: 2px solid #F7941D;" onchange="runSimulation()">')

    # Replace options inside taskSelector to map to the values we need in JS
    html = html.replace('<option value="cambio-fusor" selected>Cambio de fusor</option>', '<option value="1" selected>Cambio de fusor</option>')
    html = html.replace('<option value="cambio-rodillos">Cambio de rodillos/pickup</option>', '<option value="2">Cambio de rodillos/pickup</option>')
    html = html.replace('<option value="cambio-bandeja">Cambio de bandeja</option>', '<option value="3">Cambio de bandeja</option>')
    html = html.replace('<option value="limpieza">Limpieza del equipo</option>', '<option value="9">Limpieza del equipo</option>')
    html = html.replace('<option value="mantenimiento">Mantenimiento preventivo</option>', '<option value="11">Mantenimiento preventivo</option>')
    html = html.replace('<option value="reset">Reset de equipo</option>', '<option value="12">Reset de equipo</option>')
    html = html.replace('<option value="config-red">Configuracion de red/IP</option>', '<option value="13">Configuracion de red/IP</option>')
    html = html.replace('<option value="diagnostico">Diagnostico/Sin falla</option>', '<option value="17">Diagnostico/Sin falla</option>')

    result_box_pattern = r'<div class="result-box">(.*?)</div>'
    new_result_box = """<div class="result-box" id="resultBox">
      <strong>TIPIFICACION AUTOMATICA:</strong><br>
      Categoria: <strong id="resCategory">Hardware y Desgaste</strong><br>
      Subcategoria: <strong id="resSubcategory">Fusor / Kit de mantenimiento</strong>
    </div>"""
    html = re.sub(result_box_pattern, new_result_box, html, flags=re.DOTALL)

    # 4. Inject JavaScript right before </body> to run the interactivity
    js_code = """
  <script>
    // 18 Tareas Normalizadas
    const TAREAS = {
      "1": { category: "Hardware y Desgaste", subcategory: "Fusor / Kit de mantenimiento" },
      "2": { category: "Hardware y Desgaste", subcategory: "Rodillos / Pickup / Separación" },
      "3": { category: "Medio de Impresión", subcategory: "Ajuste de bandejas / guías" },
      "4": { category: "Insumos y Toner", subcategory: "Toner / Cartucho" },
      "5": { category: "Insumos y Toner", subcategory: "Drum / Unidad de imagen / Revelador" },
      "6": { category: "Hardware y Desgaste", subcategory: "Escáner / ADF" },
      "7": { category: "Hardware y Desgaste", subcategory: "Parte / Panel / Botonera rota" },
      "8": { category: "Hardware y Desgaste", subcategory: "Otros - Hardware y Desgaste" },
      "9": { category: "Gestión de Soporte", subcategory: "Mantenimiento / Limpieza general" },
      "10": { category: "Gestión de Soporte", subcategory: "Mantenimiento / Limpieza general" },
      "11": { category: "Gestión de Soporte", subcategory: "Mantenimiento / Limpieza general" },
      "12": { category: "Gestión de Soporte", subcategory: "Mantenimiento / Limpieza general" },
      "13": { category: "Software, Firmware y Red", subcategory: "Configuración de red / IP" },
      "14": { category: "Medio de Impresión", subcategory: "Ajuste de bandejas / guías" },
      "15": { category: "Software, Firmware y Red", subcategory: "Firmware" },
      "16": { category: "Medio de Impresión", subcategory: "Atasco de papel (común)" },
      "17": { category: "Gestión de Soporte", subcategory: "Diagnóstico / Sin falla" },
      "18": { category: "Gestión de Soporte", subcategory: "Instructivo / Autoresolución" }
    };

    // Filtrar tareas por buscador
    function filterTasks() {
      const q = document.getElementById("taskSearch").value.toLowerCase();
      const table = document.getElementById("tasksTable");
      const rows = table.getElementsByTagName("tbody")[0].getElementsByTagName("tr");
      
      for (let i = 0; i < rows.length; i++) {
        const text = rows[i].textContent.toLowerCase();
        if (text.includes(q)) {
          rows[i].style.display = "";
        } else {
          row = rows[i];
          row.style.display = "none";
        }
      }
    }

    // Ejecutar simulación del formulario
    function runSimulation() {
      const val = document.getElementById("taskSelector").value;
      const resCategory = document.getElementById("resCategory");
      const resSubcategory = document.getElementById("resSubcategory");
      const resultBox = document.getElementById("resultBox");

      if (!val) {
        resCategory.innerText = "—";
        resSubcategory.innerText = "—";
        resultBox.style.borderColor = "#DDD";
        resultBox.style.background = "#FAFAFA";
        return;
      }

      const task = TAREAS[val];
      if (task) {
        resCategory.innerText = task.category;
        resSubcategory.innerText = task.subcategory;
        
        // Poner color naranja corporativo si es Medio de Impresion, si no gris
        if (task.category === "Medio de Impresión") {
          resultBox.style.borderColor = "#F7941D";
          resultBox.style.background = "#FFF8F0";
        } else {
          resultBox.style.borderColor = "#58595B";
          resultBox.style.background = "#F9F9F9";
        }
      }
    }

    // Inicializar simulación con el valor cargado por defecto (id=1)
    window.onload = function() {
      runSimulation();
    };
  </script>
</body>
    """
    
    html = html.replace('</body>', js_code)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)
        
    print(f"Generated standalone matching HTML at: {output_path}")

if __name__ == '__main__':
    main()
