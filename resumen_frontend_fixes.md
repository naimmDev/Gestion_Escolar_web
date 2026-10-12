# Fixes de frontend — defectos del plan de pruebas (SGE)

Estos son los defectos que te tocan a ti (frontend). Backend los está corrigiendo en paralelo, así que puedes trabajar sin esperar nada de ese lado, salvo donde se indica.

---

## DEF-05 — XSS: escapeHtml no escapa comillas + campo "grado" sin escapar

**Archivos:** `js/admin.js`, `js/profesor.js`, `js/estudiante.js`, `js/login.js`, `js/configurar_preguntas.js`

**Problema real (verificado en código):**
1. La función `escapeHtml()` (se repite en varios archivos) solo reemplaza `&`, `<`, `>`. No escapa comillas dobles ni simples:
   ```js
   function escapeHtml(str) {
       if (!str) return '';
       return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
   }
   ```
2. En `admin.js` línea 371, el campo `grado` del estudiante se imprime **sin pasar por `escapeHtml()`**:
   ```js
   <td>${s.grade || '—'}</td>
   ```
   mientras que las demás columnas de la misma fila sí lo usan (`identificacion`, `initialPassword`, `name`, `email`, `seccion`). Si alguien setea `grado` con un valor malicioso por API directa (no por el `<select>` del formulario), se ejecuta en el panel admin.

**Fix:**
1. Actualizar `escapeHtml()` en los 5 archivos para que también escape comillas:
   ```js
   function escapeHtml(str) {
       if (!str) return '';
       return str.replace(/[&<>"']/g, m => ({
           '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
       }[m]));
   }
   ```
2. En `admin.js` línea 371, envolver `grade` igual que las demás columnas:
   ```js
   <td>${escapeHtml(s.grade) || '—'}</td>
   ```
   (ajusta el orden del `||` según cómo lo tengan ahora, para que siga mostrando `—` si está vacío).

**Nota:** no hace falta tocar nada en `onclick` — revisé y todos pasan solo IDs numéricos, no hay strings de usuario ahí.

---

## DEF-14 — HTML inválido / scripts mal ubicados

**Archivos:** `profesor.php`, `estudiante.php`

**Problema real (verificado):**
- **`profesor.php`**, línea 158: el `</html>` aparece **antes** de los `<script>` y del `</body>`:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  </html> <link rel="stylesheet" href="css/profesor.css">
  <script src="js/reportes.js"></script>
  <script src="js/api.js"></script>
  <script src="js/profesor.js"></script>
  </body>
  ```
  Esto es HTML inválido — el navegador lo "arregla" solo, pero no hay garantía de que todos los navegadores/validadores lo hagan igual.

- **`estudiante.php`**: `SweetAlert2` y `css/estudiante.css` están cargados **dos veces** (una en el `<head>`, otra al final del body):
  ```html
  <!-- en el <head>, líneas 11-12 -->
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <link rel="stylesheet" href="css/estudiante.css">
  ...
  <!-- al final, líneas 132-133, duplicado -->
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <link rel="stylesheet" href="css/estudiante.css">
  ```

- Un `<label>` sin `for` en `estudiante.php` (línea 99, "Tu comentario") — los demás labels sí tienen `for` correctamente asociado.

**Fix:**
1. En `profesor.php`: mover el bloque `<link>` + los 3 `<script>` (líneas 158-161) a **antes** del `</body></html>` final, en el mismo orden en que aparecen en `estudiante.php` (que sí está bien armado al final, solo con la duplicación).
2. En `estudiante.php`: eliminar la segunda carga de `sweetalert2` y de `css/estudiante.css` (líneas 132-133) — dejar solo la del `<head>`.
3. Agregar `for="comment"` (o el id que tenga el textarea) al label de "Tu comentario" en `estudiante.php` línea 99, e id correspondiente al textarea si no lo tiene.

---

## DEF-15 — Documentación de ayuda desactualizada

**Archivo:** `js/ayuda.js` (y `documentacion_frontend.md` si lo tienes a mano — no estaba en el zip que me pasaron)

**Verificado:** `ayuda.js` no menciona "Usuarios" ni "Reportes" en ningún lado — las dos vistas nuevas del panel admin no están documentadas en el centro de ayuda.

**Fix:** agregar sección(es) en `ayuda.js` explicando:
- La vista "Usuarios" (antes Estudiantes/Profesores por separado, ahora con tabs).
- La vista "Reportes" (exportación de boletines/reportes grupales desde admin).
- Si el documento `documentacion_frontend.md` todavía describe el export en el cliente (jsPDF/SheetJS) y páginas `.html` en vez de `.php`, actualízalo también — eso ya no existe, todo es backend y las páginas son `.php` con verificación de sesión.

---

## DEF-16 — Diferencia de redondeo pantalla vs. exportación (trabajo conjunto, al final)

**No lo toques todavía.** Backend define primero la regla de redondeo única (probablemente: redondear una sola vez a 1 decimal, no dos veces como ahora). Cuando eso esté listo te paso el detalle exacto de qué cambiar en `estudiante.js`/`profesor.js` (actualmente usan `.toFixed(1)` directo sobre el valor sin redondear antes — hay que alinear con lo que haga el backend).

---

## Orden sugerido para ti
1. DEF-05 (rápido, 2 archivos de función + 1 línea).
2. DEF-14 (reordenar HTML, quitar duplicados).
3. DEF-15 (documentación).
4. Esperar aviso para DEF-16.
