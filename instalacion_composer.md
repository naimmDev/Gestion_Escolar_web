# Instalación de Composer — Guía para el equipo

Composer es necesario para las librerías de exportación (DomPDF y PhpSpreadsheet). Esta guía es para quien no lo tenga instalado todavía.

---

## Windows (caso más probable con XAMPP)

1. Ir a **https://getcomposer.org/download/** y descargar `Composer-Setup.exe` (instalador oficial).
2. Ejecutar el instalador.
3. Durante la instalación, pedirá la ruta del ejecutable de PHP. Debe apuntar al PHP de XAMPP, normalmente:
   ```
   C:\xampp\php\php.exe
   ```
   Si no aparece automáticamente, hay que buscarlo manualmente en esa ruta.
4. Terminar la instalación con las opciones por defecto.
5. Abrir una **terminal nueva** (CMD o PowerShell) — importante abrir una nueva, no reusar una que ya estaba abierta antes de instalar, porque no reconocerá el comando.
6. Verificar que quedó instalado:
   ```
   composer --version
   ```
   Debe mostrar un número de versión, no un error de "comando no reconocido".

---

## Mac / Linux (por si alguien del equipo usa otro entorno)

```bash
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php
php -r "unlink('composer-setup.php');"
sudo mv composer.phar /usr/local/bin/composer
```

Verificar con `composer --version` igual que en Windows.

---

## Extensión `gd` de PHP (necesaria para PhpSpreadsheet)

XAMPP trae la extensión `gd` pero **desactivada por defecto**. Sin ella, `phpoffice/phpspreadsheet` no se puede instalar.

1. Abrir `php.ini`. En XAMPP normalmente está en:
   ```
   C:\xampp\php\php.ini
   ```
   (Se puede confirmar la ruta exacta desde el Panel de Control de XAMPP → botón "Config" en la fila de Apache → PHP (php.ini), o revisando el resultado de `phpinfo()`.)

2. Buscar la línea (Ctrl+F):
   ```
   ;extension=gd
   ```

3. Quitar el punto y coma del inicio:
   ```
   extension=gd
   ```

4. Guardar el archivo.

5. **Reiniciar Apache** desde el Panel de Control de XAMPP (Stop → Start). Los cambios en `php.ini` no aplican sin reiniciar.

6. Confirmar que quedó activa:
   ```
   php -m
   ```
   Debe aparecer `gd` en la lista de módulos.

---

## Instalar las dependencias del proyecto (después de clonar el repo)

**Importante:** no hay que instalar los paquetes uno por uno otra vez — como `composer.json` y `composer.lock` ya están en el repositorio, basta con reconstruir `vendor/` a partir de ahí.

1. Clonar el repositorio normalmente.
2. Abrir terminal **dentro de la carpeta `api/`** (ahí vive el `composer.json` del proyecto).
3. Ejecutar:
   ```
   composer install
   ```
   Esto lee `composer.json` y `composer.lock`, y genera automáticamente la carpeta `vendor/` con las versiones exactas de DomPDF y PhpSpreadsheet ya usadas en el proyecto.

---

## Cosas a tener en cuenta

- **`vendor/` no se sube a Git.** Está en `.gitignore` a propósito porque es pesada y regenerable. Si Git muestra `vendor/` como carpeta nueva para commitear, algo salió mal — no debe agregarse.
- **`composer.json` y `composer.lock` sí se suben a Git.** Son los que permiten reconstruir `vendor/` exacto en cualquier máquina.
- **No usar `composer require` de nuevo** para las mismas librerías después de clonar — eso podría instalar versiones más nuevas y romper compatibilidad. Usar `composer install`, que respeta las versiones fijadas en `composer.lock`.
- Si aparece un error de extensión faltante (como pasó con `gd`), no es un problema del proyecto ni de Composer — es una extensión de PHP que hay que activar en `php.ini` como se explicó arriba, y luego reintentar.
- Verificar que la ruta de PHP usada por Composer sea la de XAMPP y no otra instalación de PHP que pueda existir en la máquina (esto se define durante la instalación de Composer, paso 3 de la sección Windows).
