# Documentación Backend — Sistema de Gestión Escolar
**Versión:** 2.3
**Stack:** PHP 8.2 · MariaDB 10.4 · XAMPP
**Fecha de inicio:** Junio 2026

---

## Índice
1. [Estructura del Proyecto](#1-estructura-del-proyecto)
2. [Base de Datos](#2-base-de-datos)
3. [Autenticación y Flujo de Primer Ingreso](#3-autenticación-y-flujo-de-primer-ingreso)
4. [Endpoints de la API](#4-endpoints-de-la-api)
5. [Roles y Permisos](#5-roles-y-permisos)
6. [Formato de Respuestas](#6-formato-de-respuestas)
7. [Paginación y Búsqueda](#7-paginación-y-búsqueda)
8. [Sistema de Notas](#8-sistema-de-notas)
9. [Credenciales Iniciales](#9-credenciales-iniciales)
10. [Pendiente](#10-pendiente)
11. [Decisiones registradas](#11-decisiones-registradas)

---

## 1. Estructura del Proyecto

```
gestion_escolar/
├── api/
│   ├── config/
│   │   ├── db.php
│   │   ├── auth_middleware.php
│   │   ├── verificar_sesion_pagina.php  # gate de sesión para páginas .php del frontend
│   │   └── response.php
│   ├── auth/
│   │   ├── login.php                    # POST
│   │   ├── logout.php                   # POST
│   │   ├── cambiar_password.php         # POST — requiere sesión
│   │   ├── recuperar_password.php       # POST — sin sesión (recuperación por pregunta de seguridad)
│   │   ├── preguntas_seguridad.php      # GET  — lista las 8 preguntas predefinidas
│   │   ├── preguntas_usuario.php        # GET  — sin sesión, por identificación
│   │   └── configurar_preguntas.php     # POST — requiere sesión
│   ├── estudiantes/
│   │   ├── index.php                    # GET · POST · PUT
│   │   └── delete.php                   # DELETE
│   ├── profesores/
│   │   ├── index.php                    # GET · POST · PUT
│   │   └── delete.php                   # DELETE
│   ├── materias/
│   │   ├── index.php                    # GET · POST · PUT
│   │   └── delete.php                   # DELETE
│   ├── matriculas/
│   │   └── index.php                    # GET · POST · DELETE
│   ├── notas/
│   │   ├── index.php                    # GET (listado/resumen) · POST · PUT · DELETE
│   │   └── exportar.php                 # GET — exportación de reportes PDF/Excel
│   ├── helpers/
│   │   ├── notas_calculo.php            # cálculo de resumen por trimestre — única fuente de verdad
│   │   ├── reporte_data.php             # consultas a BD para armar reportes (individual/boletín/grupal)
│   │   ├── reporte_documento.php        # construye el documento genérico (título, info, columnas, filas, pie)
│   │   ├── pdf_reporte.php              # renderiza el documento genérico a PDF (DomPDF, con escape HTML)
│   │   └── excel_reporte.php            # renderiza el documento genérico a Excel (PhpSpreadsheet, sin fórmulas)
│   └── comentarios/
│       └── index.php                    # GET · POST
└── frontend/
    (documentación a cargo de otro integrante del equipo)
```

---

## 2. Base de Datos

**Nombre:** `gestion_escolar`
**Motor:** InnoDB · Charset: utf8mb4

### Tablas

#### `usuario`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| email | VARCHAR(100) UNIQUE | Correo de acceso |
| password_hash | VARCHAR(255) | bcrypt (cost 12) |
| rol | ENUM('admin','profesor','estudiante') | Rol del usuario |
| nombre | VARCHAR(100) | Nombre completo |
| id_referencia | INT NULL | FK a `estudiante.id` o `profesor.id` (NULL para admin) |
| password_cambiada | TINYINT(1) DEFAULT 0 | 1 si ya cambió su contraseña inicial |
| preguntas_configuradas | TINYINT(1) DEFAULT 0 | 1 si ya configuró sus 3 preguntas de seguridad |
| intentos_fallidos | INT(11) DEFAULT 0 | Contador de logins fallidos consecutivos |
| bloqueado_hasta | DATETIME NULL | Si está en el futuro, el login se rechaza (429) aunque la contraseña sea correcta |

> Ver sección 3 — Protección contra fuerza bruta.

#### `sesion`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| usuario_id | INT FK | Referencia a `usuario` |
| token | VARCHAR(64) UNIQUE | Token de sesión (hex 32 bytes) — viaja en la cookie `sesion_token`, nunca en el JSON de login |
| expires_at | DATETIME | Expiración (8 horas desde login) |
| activa | TINYINT(1) | 1 = activa, 0 = cerrada |
| created_at | DATETIME | Fecha de creación |

#### `estudiante`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| nombre | VARCHAR(100) | Nombre completo |
| email | VARCHAR(100) UNIQUE | Correo |
| identificacion | VARCHAR(20) UNIQUE | Cédula o código |
| grado | VARCHAR(10) NULL | Ej: 10°, 11° |
| seccion | VARCHAR(10) NULL | Ej: A, B |
| password_inicial | VARCHAR(100) NULL | Contraseña en texto plano, solo para que el admin la visualice |

#### `profesor`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| nombre | VARCHAR(100) | Nombre completo |
| email | VARCHAR(100) UNIQUE | Correo |
| identificacion | VARCHAR(20) UNIQUE | Cédula |
| especialidad | VARCHAR(100) NULL | Área académica |
| password_inicial | VARCHAR(100) NULL | Contraseña en texto plano, solo para que el admin la visualice |

#### `materia`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| codigo | VARCHAR(20) UNIQUE | Código único Ej: MAT101 |
| nombre | VARCHAR(100) | Nombre de la materia |
| creditos | INT | Número de créditos (default 3) |
| profesor_id | INT FK NULL | Profesor asignado |

#### `matricula`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| estudiante_id | INT FK | Referencia a `estudiante` |
| materia_id | INT FK | Referencia a `materia` |
| fecha_asignacion | DATE | Fecha de matrícula |

> Restricción única: `(estudiante_id, materia_id)`.

#### `nota`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| estudiante_id | INT FK | Referencia a `estudiante` |
| materia_id | INT FK | Referencia a `materia` |
| profesor_id | INT FK | Referencia a `profesor` |
| tipo | ENUM('PARCIAL','EXAMEN_TRIMESTRAL','APRECIACION') | Categoría de evaluación (usada para el cálculo) |
| tipo_actividad | VARCHAR(50) NULL | Subtipo descriptivo: Quiz, Parcial, Taller, Tarea, Proyecto, Investigacion, Exposicion, Laboratorio, Participacion, Otro |
| nombre | VARCHAR(100) NULL | Nombre libre de la evaluación (ej: "Parcial 1") |
| puntaje | DECIMAL(3,1) | Rango: 1.0 – 5.0 |
| trimestre | ENUM('I Trimestre','II Trimestre','III Trimestre') | Período |
| comentario | VARCHAR(255) NULL | Observación opcional |
| fecha_registro | DATETIME | Fecha de registro |

> Solo puede existir **un** registro `EXAMEN_TRIMESTRAL` por combinación estudiante/materia/trimestre.

#### `nota_auditoria`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| nota_id | INT FK | Nota modificada |
| editor_id | INT FK | Profesor que editó (usuario_id del editor) |
| puntaje_anterior | DECIMAL(3,1) | Valor previo |
| puntaje_nuevo | DECIMAL(3,1) | Valor nuevo |
| fecha_cambio | DATETIME | Fecha del cambio |

#### `comentario`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| estudiante_id | INT FK | Referencia a `estudiante` |
| materia_id | INT FK | Referencia a `materia` |
| comentario | TEXT | Contenido del comentario |
| fecha | DATETIME | Fecha de envío |

#### `pregunta_seguridad`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| pregunta | VARCHAR(255) | Texto de la pregunta |

> 8 preguntas predefinidas, fijas en la base de datos.

#### `usuario_pregunta`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| usuario_id | INT FK | Referencia a `usuario` |
| pregunta_id | INT FK | Referencia a `pregunta_seguridad` |
| respuesta_hash | VARCHAR(255) | bcrypt de la respuesta (normalizada a minúsculas y sin espacios extremos) |

> Restricción única: `(usuario_id, pregunta_id)`. Cada usuario configura exactamente 3 filas.

---

## 3. Autenticación y Flujo de Primer Ingreso

### Mecanismo de sesión: cookie httpOnly

La sesión viaja en una cookie `sesion_token`:
- `httpOnly` (no legible por JavaScript — mitiga robo de sesión por XSS)
- `path=/`, `samesite=Lax`
- Expira a las 8 horas

El navegador la adjunta automáticamente en cada petición al mismo origen; el frontend solo necesita mandar `credentials: 'include'` en cada `fetch()`. `db.php` refleja el header `Origin` de la petición y manda `Access-Control-Allow-Credentials: true` (nunca usa `Access-Control-Allow-Origin: *`, incompatible con cookies).

### Login

```
POST /api/auth/login.php
Body: { "email": "...", "password": "..." }
```

1. Busca el usuario por email.
2. Si la cuenta está bloqueada (`bloqueado_hasta` en el futuro), rechaza con **429** sin verificar la contraseña — ver "Protección contra fuerza bruta" abajo.
3. Verifica con `password_verify()` (bcrypt); si falla, intenta SHA256 (legado) y migra el hash automáticamente.
4. Si la contraseña es incorrecta, incrementa `intentos_fallidos` (o bloquea si llega al umbral) y devuelve 401.
5. Si es correcta: resetea `intentos_fallidos`/`bloqueado_hasta`, invalida sesiones previas del usuario, genera token (`bin2hex(random_bytes(32))`, sesión válida 8 horas) y lo pone en la cookie `sesion_token`.

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "rol": "admin",
    "nombre": "Administrador",
    "id_referencia": null,
    "password_cambiada": true,
    "preguntas_configuradas": true
  }
}
```
> El `token` **no se incluye en el JSON** — vive solo en la cookie `httpOnly`, inaccesible desde JS.

> `password_cambiada` y `preguntas_configuradas` indican al frontend si debe redirigir al flujo de primer ingreso. El rol `admin` siempre tiene ambos en `true` y omite ese flujo.

### Protección contra fuerza bruta

- **Umbral:** 5 intentos fallidos consecutivos por cuenta → bloqueo de 15 minutos.
- Al llegar al umbral, `intentos_fallidos` se resetea a 0 y `bloqueado_hasta` se fija a `NOW() + 15 min`; así, al terminar el bloqueo, la cuenta vuelve a tener 5 intentos frescos.
- Un login exitoso limpia ambos campos sin importar cuántos intentos fallidos acumulados hubiera.
- **Por cuenta, no por IP:** decisión deliberada — bloquear por IP protegería además contra ataques que rotan de cuenta en cuenta desde una sola IP, pero en una red compartida (laboratorio, biblioteca) castigaría a usuarios legítimos distintos tras el error de uno solo. Queda anotado como posible mejora futura si se observan patrones de ataque reales.
- Respuesta de bloqueo: `429` con mensaje `"Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en N minuto(s)."` — no revela si la cuenta existe o no más allá de lo que ya revelaba el flujo normal.

### Logout
```
POST /api/auth/logout.php
```
Lee el token desde la cookie `sesion_token`, marca la sesión como inactiva (`activa = 0`) y limpia la cookie.

### Cambio de contraseña (usuario autenticado)
```
POST /api/auth/cambiar_password.php
Body: { "password_actual": "...", "password_nueva": "..." }
```
- Verifica la contraseña actual con `password_verify()`.
- Rechaza si la nueva es igual a la actual o tiene menos de 6 caracteres.
- Actualiza `password_hash` y marca `password_cambiada = 1`.

### Preguntas de seguridad

**Listar las 8 preguntas predefinidas:**
```
GET /api/auth/preguntas_seguridad.php
```

**Configurar 3 preguntas (usuario autenticado):**
```
POST /api/auth/configurar_preguntas.php
Body: { "preguntas": [ {"pregunta_id": 1, "respuesta": "..."}, ... ] }  // exactamente 3, sin repetir
```
- Borra configuraciones previas del usuario y guarda las nuevas (`respuesta_hash` con bcrypt, respuesta normalizada a minúsculas).
- Marca `preguntas_configuradas = 1`.

### Recuperación de contraseña (sin sesión)

**1. Obtener las preguntas configuradas de un usuario por identificación:**
```
GET /api/auth/preguntas_usuario.php?identificacion=12345678
```
Devuelve las preguntas que ese usuario configuró (404 si no tiene ninguna).

**2. Responder y establecer nueva contraseña:**
```
POST /api/auth/recuperar_password.php
Body: { "identificacion": "...", "pregunta_id": 1, "respuesta": "...", "password_nueva": "..." }
```
- Busca el usuario (estudiante o profesor) por identificación.
- Verifica la respuesta con `password_verify()` (case-insensitive).
- Actualiza `password_hash` directamente (no afecta `password_cambiada` ni `intentos_fallidos`).

### Protección de endpoints
Todos los endpoints (excepto login, recuperar_password y preguntas_usuario) incluyen:
```php
require '../config/db.php';
require '../config/auth_middleware.php';
```
`auth_middleware.php` valida el token contra `sesion` (activa y no expirada) y deja disponible `$authUser`. El token se lee de `$_COOKIE['sesion_token']`.

### Protección de páginas del frontend

Las páginas internas (`admin.php`, `profesor.php`, `estudiante.php`, `cambiar_password.php`, `configurar_preguntas.php`) son `.php` que, como primera línea, llaman a `verificarSesionPagina($rolPermitido)` (en `api/config/verificar_sesion_pagina.php`). Esa función valida la cookie `sesion_token` contra la tabla `sesion` antes de dejar pasar el resto del archivo; si no hay sesión válida o el rol no coincide, redirige a `index.html` sin servir nada del panel. Los `.html` equivalentes de esas 5 páginas ya no existen — se eliminaron a propósito para no dejar una vía sin protección en paralelo.

### Flujo de primer ingreso (referencia para frontend)
`login` → si `!password_cambiada` → pantalla cambiar contraseña → si `!preguntas_configuradas` → pantalla configurar preguntas → panel según rol. El admin omite ambos pasos.

---

## 4. Endpoints de la API

**URL base:** `http://localhost/gestion_escolar/api`

### Autenticación
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/login.php` | No | Iniciar sesión (sujeto a bloqueo por fuerza bruta) |
| POST | `/auth/logout.php` | Sí | Cerrar sesión |
| POST | `/auth/cambiar_password.php` | Sí | Cambiar contraseña propia |
| GET | `/auth/preguntas_seguridad.php` | Sí | Listar las 8 preguntas predefinidas |
| POST | `/auth/configurar_preguntas.php` | Sí | Configurar 3 preguntas de seguridad |
| GET | `/auth/preguntas_usuario.php?identificacion=` | No | Obtener preguntas configuradas por un usuario |
| POST | `/auth/recuperar_password.php` | No | Recuperar contraseña respondiendo pregunta de seguridad |

> "Sí" en Auth significa: requiere la cookie `sesion_token` válida (ver sección 3).

### Estudiantes
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/estudiantes/` | admin | Listar (paginado) |
| POST | `/estudiantes/` | admin | Crear + cuenta de usuario |
| PUT | `/estudiantes/` | admin | Editar |
| DELETE | `/estudiantes/delete.php` | admin | Eliminar |

**PUT — Body:**
```json
{ "id": 5, "name": "...", "email": "...", "identificacion": "...", "grade": "...", "seccion": "...", "initialPassword": "opcional" }
```
> Si se envía `initialPassword`, se regenera el hash en `usuario` y se resetean `password_cambiada = 0`, `preguntas_configuradas = 0`, además de borrarse sus `usuario_pregunta` (flujo de "restablecer acceso"). También resetea `intentos_fallidos` y `bloqueado_hasta`.

### Profesores
Igual estructura que Estudiantes (`/profesores/`, `/profesores/delete.php`), mismo comportamiento de `initialPassword` en PUT.

### Materias
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/materias/` | admin, profesor, estudiante | admin: paginado; profesor/estudiante: lista completa |
| POST | `/materias/` | admin | Crear |
| PUT | `/materias/` | admin | Editar |
| DELETE | `/materias/delete.php` | admin | Eliminar |

### Matrículas
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/matriculas/` | admin, profesor, estudiante | Filtrado por rol; admin paginado |
| POST | `/matriculas/` | admin | Asignar materia |
| DELETE | `/matriculas/` | admin | Eliminar matrícula |

### Notas
Ver sección 8 (Sistema de Notas).

### Exportación de reportes

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/notas/exportar.php` | profesor, estudiante, admin | Genera y descarga un reporte de notas en PDF o Excel |

**Parámetros (query string):**

| Parámetro | Obligatorio | Descripción |
|---|---|---|
| `format` | Sí | `pdf` o `excel` |
| `materia_id` | Profesor: sí. Estudiante: no. Admin: ver tabla abajo | Materia a exportar |
| `estudiante_id` | No (profesor/admin) | Si se envía → reporte individual de ese alumno |
| `trimestre` | No | `I Trimestre` / `II Trimestre` / `III Trimestre` — filtra el reporte a ese trimestre; si se omite, incluye los 3 + totales |
| `grado` | No (profesor/admin, en grupal) | Filtra el reporte grupal a un solo grado (ej. `10°`) |

**Qué devuelve cada combinación:**

| Rol | Parámetros | Reporte |
|---|---|---|
| Estudiante | `format` | Boletín completo: todas sus materias matriculadas, columnas I/II/III + Nota Final |
| Estudiante | `format` + `trimestre` | Todas sus materias, detalle de ese trimestre |
| Estudiante | `format` + `materia_id` | Una materia, un renglón por trimestre + Nota Final del Curso |
| Profesor | `format` + `materia_id` + `estudiante_id` | Individual de un alumno en su materia |
| Profesor | `format` + `materia_id` | Grupal de la materia (todos los grados) |
| Profesor | `format` + `materia_id` + `grado` | Grupal de un grado específico |
| **Admin** | `format` + `estudiante_id` (sin `materia_id`) | Boletín completo de cualquier estudiante |
| **Admin** | `format` + `estudiante_id` + `materia_id` | Individual de ese estudiante en esa materia |
| **Admin** | `format` + `materia_id` (sin `estudiante_id`) | Grupal de cualquier materia (todos los grados) |
| **Admin** | `format` + `materia_id` + `grado` | Grupal de un grado específico, de cualquier materia |

**Reglas de permisos:**
- Estudiante: solo puede exportar su propio reporte (`estudiante_id` se ignora y se fuerza al propio); si especifica `materia_id`, debe estar matriculado en ella (403 si no).
- Profesor: solo materias donde es `profesor_id` (403 si no es dueño); si pide un `estudiante_id` específico, debe estar matriculado en la materia (404 si no).
- **Admin: sin restricción de materia propia** (a diferencia del profesor) — puede exportar cualquier combinación válida de estudiante/materia/grado. Debe indicar al menos `estudiante_id` o `materia_id` (400 si omite ambos). Las validaciones de matrícula (que la combinación estudiante+materia exista) se mantienen igual que para los demás roles.

**Respuesta:**
- Éxito: archivo binario con headers `Content-Type` (`application/pdf` o `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) y `Content-Disposition: attachment; filename="..."`.
- Error: JSON estándar `{success:false, error, code}` (400 formato/parámetro inválido o faltante, 403 sin permiso, 404 materia/matrícula/datos inexistentes).

**Dependencias (Composer):**
- `dompdf/dompdf` — generación de PDF
- `phpoffice/phpspreadsheet` — generación de Excel (requiere extensión PHP `gd` activa)

**Arquitectura interna:**
```
api/helpers/notas_calculo.php     → cálculo de resumen por trimestre (única fuente; también usado por /notas/ modo resumen)
api/helpers/reporte_data.php      → consultas a BD: individual, boletín multi-materia, grupal (con filtro de grado)
api/helpers/reporte_documento.php → construye un documento genérico (título, info, subtítulo, columnas, filas, pie)
api/helpers/pdf_reporte.php       → renderiza el documento genérico a PDF — escapa toda salida con htmlspecialchars()
api/helpers/excel_reporte.php     → renderiza el documento genérico a Excel — escribe celdas con setCellValueExplicit() para que ningún valor (ej. un nombre que empiece con "=") se interprete como fórmula
api/notas/exportar.php            → endpoint: permisos (una rama por rol) + selección del tipo de reporte + orquestación
```
Separación deliberada: cambiar el formato de salida o agregar uno nuevo no requiere tocar el cálculo de notas, y un reporte nuevo solo necesita un constructor nuevo en `reporte_documento.php` — los renderizadores no cambian. Habilitar `admin` fue agregar una rama de permisos nueva (`elseif ($authUser['rol'] === 'admin')`) sin tocar ninguna de las funciones de `reporte_data.php`/`reporte_documento.php` — confirma la separación.

> **Nota de seguridad:** la primera versión de este endpoint no escapaba la salida en PDF ni prevenía la inyección de fórmulas en Excel; ambos se corrigieron antes de la versión actual.

> **Pendiente de frontend:** el panel de admin todavía no tiene una vista/UI que llame a este endpoint con rol admin — el backend ya lo soporta, falta la pantalla (ver documento de rediseño de navegación entregado a frontend).

### Comentarios
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/comentarios/` | admin, profesor, estudiante | Filtrado por rol |
| POST | `/comentarios/` | estudiante | Enviar comentario (requiere matrícula en la materia) |

---

## 5. Roles y Permisos

| Acción | Admin | Profesor | Estudiante |
|---|:---:|:---:|:---:|
| Ver/gestionar estudiantes | ✅ | ❌ | ❌ |
| Ver/gestionar profesores | ✅ | ❌ | ❌ |
| Ver/gestionar materias | ✅ | 👁️ | 👁️ |
| Gestionar matrículas | ✅ | ❌ | ❌ |
| Ver matrículas propias | ❌ | 👁️ | 👁️ |
| Registrar/editar/eliminar notas | ❌ | ✅ | ❌ |
| Ver notas propias / resumen | ❌ | 👁️ | 👁️ |
| Exportar reportes propios/de su materia | ❌ | ✅ | ✅ |
| Exportar cualquier reporte (sin restricción de materia propia) | ✅ | ❌ | ❌ |
| Enviar comentarios | ❌ | ❌ | ✅ |
| Ver comentarios de sus materias | ❌ | 👁️ | ❌ |
| Ver todos los comentarios | ✅ | ❌ | ❌ |
| Restablecer acceso de usuario | ✅ | ❌ | ❌ |

---

## 6. Formato de Respuestas

### Éxito (200)
```json
{ "success": true, "data": { } }
```

### Creación exitosa (201)
```json
{ "success": true, "data": { "id": 5, "message": "Recurso creado" } }
```

### Error
```json
{ "success": false, "error": "Descripción del error", "code": 400 }
```

### Error con detalle (validación)
```json
{ "success": false, "error": "Campos obligatorios faltantes", "code": 400, "details": { "campos": ["name", "email"] } }
```

### Códigos de estado usados
| Código | Significado |
|---|---|
| 200 | Éxito |
| 201 | Creado correctamente |
| 400 | Datos inválidos o faltantes |
| 401 | No autenticado / sesión inválida o expirada / respuesta de seguridad incorrecta |
| 403 | Sin permisos para esta acción |
| 404 | Recurso no encontrado |
| 405 | Método HTTP no permitido |
| 409 | Conflicto (duplicado, restricción, examen trimestral ya registrado) |
| 429 | Cuenta bloqueada temporalmente por intentos fallidos de login |
| 500 | Error interno del servidor |

---

## 7. Paginación y Búsqueda

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| page | int | 1 | Página actual |
| per_page | int | 10 | Registros por página (máx. 100) |
| search | string | "" | Búsqueda por LIKE |

**Respuesta paginada:**
```json
{ "success": true, "data": { "items": [], "total": 45, "page": 2, "per_page": 10, "total_pages": 5 } }
```

> **Nota técnica:** `LIMIT`/`OFFSET` se interpolan como enteros castados (`intval`) directamente en el SQL, no como parámetros preparados, debido a un error 1064 de MariaDB con `LIMIT`/`OFFSET` parametrizados.

| Endpoint | Campos de búsqueda |
|---|---|
| `/estudiantes/` | nombre, email, identificacion |
| `/profesores/` | nombre, email, especialidad |
| `/materias/` | nombre, codigo |
| `/matriculas/` | nombre del estudiante, nombre de la materia (solo admin) |

---

## 8. Sistema de Notas

**Valores válidos de `tipo`:** `PARCIAL` · `EXAMEN_TRIMESTRAL` · `APRECIACION`
**Valores válidos de `tipo_actividad` (opcional):** Quiz, Parcial, Taller, Tarea, Proyecto, Investigacion, Exposicion, Laboratorio, Participacion, Otro
**Puntaje:** 1.0 – 5.0
**Trimestre:** `I Trimestre` · `II Trimestre` · `III Trimestre`

### Listado normal
```
GET /api/notas/?materia_id=&estudiante_id=&trimestre=&profesor_id=
```
Filtrado automático por rol (profesor solo ve sus notas, estudiante solo las propias).

### Modo resumen (cálculo de promedios)
```
GET /api/notas/?resumen=1&estudiante_id=X&materia_id=Y
```
Calculado por `helpers/notas_calculo.php` (`calcularResumenNotas()`), la misma función que usa `notas/exportar.php`. Por cada trimestre calcula:
- `promedio_parciales`: media de todas las notas `PARCIAL`
- `promedio_apreciacion`: media de todas las notas `APRECIACION`
- `examen_trimestral`: puntaje del único `EXAMEN_TRIMESTRAL` (si existe)
- `nota_trimestral` = `(promedio_parciales + promedio_apreciacion + examen_trimestral) / 3`, solo si los tres componentes existen; si no, `null`.

`promedio_final` = media de las 3 `nota_trimestral`, solo si las 3 existen; si no, `null`.

### Registrar nota
```
POST /api/notas/
Body: { "estudiante_id", "materia_id", "tipo", "puntaje", "trimestre", "tipo_actividad"?, "nombre"?, "comentario"? }
```
- `profesor_id` se extrae de la sesión, nunca del body.
- Valida que la materia pertenezca al profesor y que el estudiante esté matriculado.
- Si `tipo = EXAMEN_TRIMESTRAL`: rechaza con 409 si ya existe uno para ese estudiante/materia/trimestre.

### Editar nota
```
PUT /api/notas/
Body: { "id", "puntaje", "tipo"?, "tipo_actividad"?, "trimestre"?, "nombre"?, "comentario"? }
```
- Solo el profesor propietario puede editar.
- Genera un registro en `nota_auditoria` con el puntaje anterior y nuevo.
- Misma validación de unicidad de `EXAMEN_TRIMESTRAL` al cambiar tipo/trimestre.

### Eliminar nota
```
DELETE /api/notas/
Body: { "id" }
```
Solo el profesor propietario puede eliminar.

---

## 9. Credenciales Iniciales

| Usuario | Email | Contraseña inicial |
|---|---|---|
| Administrador | `admin@escuela.edu` | `admin123` |
| Profesor/Estudiante nuevo | email registrado | generada automáticamente o personalizada (visible en `password_inicial`) |

> Al iniciar sesión con un hash SHA256 legado, el sistema migra automáticamente a bcrypt.

---

## 10. Pendiente

| Funcionalidad | Descripción |
|---|---|
| **Panel de períodos** | Tabla `periodo` + endpoints para abrir/cerrar trimestres. El profesor solo podría registrar notas en el período activo. |
| **UI de exportación en panel admin** | El backend ya soporta exportación sin restricción para rol `admin` (ver sección 4); falta la vista en `frontend/admin.php` que arme la petición. Diseño ya entregado al equipo de frontend. |

---

## 11. Decisiones registradas

Para que quede constancia del porqué, sin que se reabra la discusión más adelante sin motivo nuevo:

| Tema | Decisión | Razón |
|---|---|---|
| **Importación en lote** (estudiantes/profesores/notas desde archivo) | No se implementará | Solo beneficiaría la primera carga de datos de un período, y requeriría que cada profesor adapte sus notas locales a un formato específico del sistema. El uso ideal del SGE es empezar a usarlo desde el inicio de un período, no a mitad de uno — el beneficio no justifica la complejidad. |
| **Exportación en formato CSV** | No se implementará | Es funcionalmente redundante con la exportación a Excel ya existente; no aporta un caso de uso distinto. |
| **Exportación desde el panel de admin** | Habilitada en backend | Se agregó `admin` a `requireRole` en `exportar.php` con una rama de permisos propia, sin restricción de materia (a diferencia de profesor). Las funciones de armado de datos y renderizado no se tocaron — solo se agregó la rama de permisos. Falta la UI en el panel admin (ver sección 10). |
| **Registro de derechos de autor (DIGERPI)** | No se hará | Fuera del alcance del proyecto como entrega académica. |

---

*Documentación generada para uso interno del equipo de desarrollo — sección backend.*