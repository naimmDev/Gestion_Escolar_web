# Documentación Backend — Sistema de Gestión Escolar
**Versión:** 2.5.0
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
│   ├── composer.json / composer.lock    # dompdf/dompdf ^3.1 · phpoffice/phpspreadsheet ^5.9
│   ├── config/
│   │   ├── db.php                       # conexión PDO, cabeceras JSON, CORS, manejador de excepciones
│   │   ├── cors.php                     # lista blanca de orígenes + aplicarCORS()
│   │   ├── credenciales.php             # host/db/user/pass — NO se sube a Git (.gitignore)
│   │   ├── credenciales.php.example     # plantilla de credenciales.php
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
│   ├── periodos/
│   │   └── index.php                    # GET · PUT — abrir/cerrar trimestres
│   ├── notas/
│   │   ├── index.php                    # GET (listado/resumen) · POST · PUT · DELETE
│   │   └── exportar.php                 # GET — exportación de reportes PDF/Excel
│   ├── helpers/
│   │   ├── periodos.php                 # exigirTrimestreAbierto() — regla de período para notas
│   │   ├── notas_calculo.php            # cálculo de resumen por trimestre — única fuente de verdad
│   │   ├── reporte_data.php             # consultas a BD para armar reportes (individual/boletín/grupal)
│   │   ├── reporte_documento.php        # construye el documento genérico (título, info, columnas, filas, pie)
│   │   ├── pdf_reporte.php              # renderiza el documento genérico a PDF (DomPDF, con escape HTML)
│   │   └── excel_reporte.php            # renderiza el documento genérico a Excel (PhpSpreadsheet, sin fórmulas)
│   └── comentarios/
│       └── index.php                    # GET · POST
├── database/
│   ├── schema.sql                       # estructura de las tablas (volcado de phpMyAdmin)
│   └── migraciones/                     # scripts SQL para bases ya existentes (ej. 2026-10-22_periodos.sql)
├── docs/                                # documentación del proyecto (este archivo, frontend, instalación de Composer)
└── frontend/
    (documentación a cargo de otro integrante del equipo)
```

---

## 2. Base de Datos

**Nombre:** `gestion_escolar`
**Motor:** InnoDB · Charset: utf8mb4

> La estructura completa está en `database/schema.sql`.

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
| intentos_fallidos | INT(11) DEFAULT 0 | Contador de intentos fallidos consecutivos (login y recuperación de contraseña) |
| bloqueado_hasta | DATETIME NULL | Si está en el futuro, el login y la recuperación se rechazan (429) |

> Ver sección 3 — Protección contra fuerza bruta.

#### `sesion`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| usuario_id | INT FK | Referencia a `usuario` |
| token | VARCHAR(64) UNIQUE | **Hash SHA-256** (hex) del token de sesión. El token en claro (hex de 32 bytes) solo viaja en la cookie `sesion_token`; nunca se guarda tal cual en la BD ni va en el JSON de login |
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
| password_inicial | VARCHAR(100) NULL | Contraseña inicial en texto plano, solo para que el admin la visualice. La API solo la devuelve mientras el usuario no haya cambiado su contraseña (`password_cambiada = 0`); después responde `null` |

#### `profesor`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| nombre | VARCHAR(100) | Nombre completo |
| email | VARCHAR(100) UNIQUE | Correo |
| identificacion | VARCHAR(20) UNIQUE | Cédula |
| especialidad | VARCHAR(100) NULL | Área académica |
| password_inicial | VARCHAR(100) NULL | Igual que en `estudiante`: solo se devuelve mientras `password_cambiada = 0` |

#### `materia`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| codigo | VARCHAR(20) UNIQUE | Código único Ej: MAT101 |
| nombre | VARCHAR(100) | Nombre de la materia |
| creditos | INT | Número de créditos (default 3) |
| profesor_id | INT FK NULL | Profesor asignado (`ON DELETE SET NULL`) |

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
| puntaje | DECIMAL(3,1) | Rango: 1.0 – 5.0 (también validado con `CHECK` en la tabla) |
| trimestre | ENUM('I Trimestre','II Trimestre','III Trimestre') | Período |
| comentario | VARCHAR(255) NULL | Observación opcional |
| fecha_registro | DATETIME | Fecha de registro |

> Solo puede existir **un** registro `EXAMEN_TRIMESTRAL` por combinación estudiante/materia/trimestre.

#### `nota_auditoria`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| nota_id | INT FK | Nota modificada (`ON DELETE CASCADE`) |
| editor_id | INT FK | Profesor que editó (`profesor.id`) |
| puntaje_anterior | DECIMAL(3,1) | Valor previo |
| puntaje_nuevo | DECIMAL(3,1) | Valor nuevo |
| fecha_cambio | DATETIME | Fecha del cambio |

#### `periodo`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| trimestre | ENUM('I Trimestre','II Trimestre','III Trimestre') UNIQUE | Trimestre (3 filas fijas) |
| fecha_inicio | DATE NULL | Informativa (no abre ni cierra automáticamente) |
| fecha_fin | DATE NULL | Informativa |
| estado | ENUM('abierto','cerrado') | Por defecto `cerrado`. Solo el admin lo cambia |
| fecha_actualizacion | DATETIME | Se actualiza sola en cada cambio |

> Estado inicial de la migración: `III Trimestre` abierto, I y II cerrados. Un trimestre cerrado bloquea crear, editar y eliminar notas de ese trimestre.

#### `comentario`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| estudiante_id | INT FK | Referencia a `estudiante` (`ON DELETE CASCADE`) |
| materia_id | INT FK | Referencia a `materia` (`ON DELETE CASCADE`) |
| comentario | TEXT | Contenido del comentario |
| fecha | DATETIME | Fecha de envío |

> Por el `ON DELETE CASCADE`, borrar un estudiante o una materia elimina sus comentarios; por eso los endpoints de borrado piden confirmación previa (ver sección 4).

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

El navegador la adjunta automáticamente en cada petición al mismo origen; el frontend solo necesita mandar `credentials: 'include'` en cada `fetch()`.

**El token no se guarda en claro:** en la tabla `sesion` se almacena su hash SHA-256. Cada vez que el backend lo recibe (middleware, logout, gate de páginas) calcula `hash('sha256', cookie)` y compara contra la BD, de modo que una filtración de la tabla no entrega tokens utilizables.

### CORS

`config/cors.php` define una lista blanca de orígenes (`http://localhost`, `http://localhost:3000`; el dominio real se agregará al desplegar). `aplicarCORS()` solo refleja el header `Origin` de la petición si está en esa lista, y siempre manda `Access-Control-Allow-Credentials: true`. Nunca se usa `Access-Control-Allow-Origin: *` (incompatible con cookies). `db.php` llama a `aplicarCORS()`, responde las peticiones `OPTIONS` y fija `Content-Type: application/json`.

`db.php` también registra un manejador global de excepciones: cualquier error no capturado responde `500` con JSON genérico (`"Error interno del servidor"`).

### Login

```
POST /api/auth/login.php
Body: { "email": "...", "password": "..." }
```

1. Busca el usuario por email.
2. Si la cuenta está bloqueada (`bloqueado_hasta` en el futuro), rechaza con **429** sin verificar la contraseña — ver "Protección contra fuerza bruta" abajo.
3. Verifica con `password_verify()` (bcrypt); si falla, intenta SHA256 (legado) y migra el hash automáticamente.
4. Si la contraseña es incorrecta, incrementa `intentos_fallidos` (o bloquea si llega al umbral) y devuelve 401.
5. Si es correcta: resetea `intentos_fallidos`/`bloqueado_hasta`, invalida sesiones previas del usuario, genera token (`bin2hex(random_bytes(32))`, sesión válida 8 horas), guarda su **hash SHA-256** en `sesion` y pone el token en claro en la cookie `sesion_token`.

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
- **Mismo contador en login y recuperación de contraseña:** `recuperar_password.php` reutiliza las columnas `intentos_fallidos` / `bloqueado_hasta` con las mismas constantes (5 intentos, 15 minutos). Una respuesta de seguridad incorrecta suma intentos igual que una contraseña incorrecta.
- **Por cuenta, no por IP:** decisión deliberada — bloquear por IP protegería además contra ataques que rotan de cuenta en cuenta desde una sola IP, pero en una red compartida (laboratorio, biblioteca) castigaría a usuarios legítimos distintos tras el error de uno solo. Queda anotado como posible mejora futura si se observan patrones de ataque reales.
- Respuesta de bloqueo: `429` con mensaje `"Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en N minuto(s)."` — no revela si la cuenta existe o no más allá de lo que ya revelaba el flujo normal.
- **El restablecimiento de acceso del admin (`PUT` con `initialPassword`) no limpia el bloqueo:** si una cuenta está bloqueada hay que esperar los 15 minutos o resetear `intentos_fallidos` / `bloqueado_hasta` directamente en la base de datos.

### Logout
```
POST /api/auth/logout.php
```
Lee el token desde la cookie `sesion_token`, marca la sesión como inactiva (`activa = 0`, buscándola por el hash del token) y limpia la cookie. No usa `auth_middleware.php`: funciona aunque la sesión ya haya expirado.

### Cambio de contraseña (usuario autenticado)
```
POST /api/auth/cambiar_password.php
Body: { "password_actual": "...", "password_nueva": "..." }
```
- Verifica la contraseña actual con `password_verify()` (401 si es incorrecta).
- Rechaza si la nueva es igual a la actual o tiene menos de 6 caracteres.
- Actualiza `password_hash` y marca `password_cambiada = 1`.

### Preguntas de seguridad

**Listar las 8 preguntas predefinidas:**
```
GET /api/auth/preguntas_seguridad.php
```
Requiere sesión.

**Configurar 3 preguntas (usuario autenticado):**
```
POST /api/auth/configurar_preguntas.php
Body: { "preguntas": [ {"pregunta_id": 1, "respuesta": "..."}, ... ] }  // exactamente 3, sin repetir
```
- Valida que las 3 preguntas existan en `pregunta_seguridad`.
- Borra configuraciones previas del usuario y guarda las nuevas (`respuesta_hash` con bcrypt cost 10, respuesta normalizada a minúsculas).
- Marca `preguntas_configuradas = 1`.

### Recuperación de contraseña (sin sesión)

**1. Obtener la pregunta de seguridad de un usuario por identificación:**
```
GET /api/auth/preguntas_usuario.php?identificacion=12345678
```
Devuelve **una sola** pregunta, elegida al azar por el servidor entre las que ese usuario configuró:
```json
{ "success": true, "data": { "pregunta_id": 3, "pregunta": "..." } }
```
Si la identificación no existe, o el usuario no tiene preguntas configuradas, devuelve una **pregunta señuelo** del catálogo general con la misma forma de respuesta (nunca 404). Así el endpoint no sirve para averiguar qué identificaciones están registradas (DEF-01).

**2. Responder y establecer nueva contraseña:**
```
POST /api/auth/recuperar_password.php
Body: { "identificacion": "...", "pregunta_id": 1, "respuesta": "...", "password_nueva": "..." }
```
- Busca el usuario (estudiante o profesor) por identificación.
- Si la cuenta está bloqueada → `429` (mismo mecanismo que el login).
- Verifica la respuesta con `password_verify()` contra la pregunta indicada en `pregunta_id` (case-insensitive).
- **Mensaje genérico único:** identificación inexistente, pregunta que no corresponde al usuario y respuesta incorrecta responden lo mismo (`401`, `"Identificación, pregunta o respuesta incorrecta"`). Un fallo con usuario existente suma a `intentos_fallidos` (bloqueo al llegar a 5).
- Éxito: actualiza `password_hash`, resetea `intentos_fallidos` y `bloqueado_hasta`, e **invalida todas las sesiones activas** del usuario (`sesion.activa = 0`). No modifica `password_cambiada`.

### Protección de endpoints
Todos los endpoints (excepto login, logout, recuperar_password y preguntas_usuario) incluyen:
```php
require '../config/db.php';
require '../config/auth_middleware.php';
```
`auth_middleware.php` calcula el hash SHA-256 del token recibido en `$_COOKIE['sesion_token']`, lo valida contra `sesion` (activa y no expirada) y deja disponible `$authUser` (`usuario_id`, `rol`, `nombre`, `id_referencia`). Sin cookie responde 401 `"Token no proporcionado"`; con token inválido o vencido, 401 `"Token inválido o expirado"`.

### Protección de páginas del frontend

Las páginas internas (`admin.php`, `profesor.php`, `estudiante.php`, `cambiar_password.php`, `configurar_preguntas.php`) son `.php` que, como primera línea, llaman a `verificarSesionPagina($rolPermitido)` (en `api/config/verificar_sesion_pagina.php`). Esa función valida la cookie `sesion_token` (por su hash) contra la tabla `sesion` antes de dejar pasar el resto del archivo; si no hay sesión válida o el rol no coincide, redirige a `index.html` sin servir nada del panel. No reutiliza `db.php` (que fija cabeceras JSON/CORS incompatibles con una respuesta HTML): se conecta con `credenciales.php`. Los `.html` equivalentes de esas 5 páginas ya no existen — se eliminaron a propósito para no dejar una vía sin protección en paralelo.

### Flujo de primer ingreso (referencia para frontend)
`login` → si `!password_cambiada` → pantalla cambiar contraseña → si `!preguntas_configuradas` → pantalla configurar preguntas → panel según rol. El admin omite ambos pasos.

---

## 4. Endpoints de la API

**URL base:** `http://localhost/gestion_escolar/api`

### Autenticación
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/login.php` | No | Iniciar sesión (sujeto a bloqueo por fuerza bruta) |
| POST | `/auth/logout.php` | No (lee la cookie) | Cerrar sesión |
| POST | `/auth/cambiar_password.php` | Sí | Cambiar contraseña propia |
| GET | `/auth/preguntas_seguridad.php` | Sí | Listar las 8 preguntas predefinidas |
| POST | `/auth/configurar_preguntas.php` | Sí | Configurar 3 preguntas de seguridad |
| GET | `/auth/preguntas_usuario.php?identificacion=` | No | Obtener una pregunta de seguridad (al azar) de un usuario |
| POST | `/auth/recuperar_password.php` | No | Recuperar contraseña respondiendo pregunta de seguridad (sujeto a bloqueo) |

> "Sí" en Auth significa: requiere la cookie `sesion_token` válida (ver sección 3).

### Estudiantes
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/estudiantes/` | admin | Listar (paginado, con filtros) |
| POST | `/estudiantes/` | admin | Crear + cuenta de usuario |
| PUT | `/estudiantes/` | admin | Editar |
| DELETE | `/estudiantes/delete.php` | admin | Eliminar |

**GET — Parámetros:** `page`, `per_page`, `search` (ver sección 7) y los filtros `grado` (coincidencia exacta, ej. `10°`) y `seccion` (sin distinguir mayúsculas).

**GET modo ligero de secciones:**
```
GET /api/estudiantes/?secciones=1[&grado=10°]
```
Devuelve un array con las secciones existentes (en mayúsculas, sin vacías, ordenadas), opcionalmente solo las de un grado: `["A", "B", "C"]`. No es paginado.

**POST:**
- Requiere `name`, `email`, `identificacion`. Valida formato de email y que no exista otro estudiante ni otra cuenta con ese email/identificación (409).
- `initialPassword` es opcional (mínimo 6 caracteres). **Si no se envía, la contraseña inicial es la identificación.**
- Responde 201 con `{ id, initialPassword, message }`.

**PUT — Body:**
```json
{ "id": 5, "name": "...", "email": "...", "identificacion": "...", "grade": "...", "seccion": "...", "initialPassword": "opcional" }
```
> Si se envía `initialPassword`, se regenera el hash en `usuario` y se resetean `password_cambiada = 0`, `preguntas_configuradas = 0`, además de borrarse sus `usuario_pregunta` (flujo de "restablecer acceso"). **No** cierra sesiones activas ni limpia `intentos_fallidos` / `bloqueado_hasta`.

**DELETE — Body:** `{ "id", "confirmar_comentarios"? }`
- 409 si el estudiante tiene notas registradas (no hay forma de forzarlo).
- Si tiene comentarios y no se envió `confirmar_comentarios`, responde 409 con `details: { requiresConfirmation: "comentarios", count }`; el cliente debe repetir la petición con `confirmar_comentarios: true`.
- Elimina en transacción sus matrículas, su cuenta de `usuario` y el estudiante (los comentarios se borran por cascada).

### Profesores
Mismos endpoints y comportamiento de `initialPassword` en POST/PUT que Estudiantes (`/profesores/`, `/profesores/delete.php`), con estas diferencias:
- GET solo admite `page`, `per_page` y `search` (sin filtros `grado`/`seccion` ni modo `secciones`).
- Campo propio: `specialty` (`especialidad`).
- DELETE: 409 si el profesor tiene notas registradas; no pide confirmación de comentarios. Deja `profesor_id = NULL` en sus materias, elimina su cuenta de `usuario` y el profesor, en transacción.

### Materias
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/materias/` | admin, profesor, estudiante | admin: paginado; profesor/estudiante: lista completa |
| POST | `/materias/` | admin | Crear |
| PUT | `/materias/` | admin | Editar |
| DELETE | `/materias/delete.php` | admin | Eliminar |

**DELETE:** 409 si la materia tiene notas registradas. Igual que en estudiantes, si tiene comentarios pide confirmación (`confirmar_comentarios`). Elimina en transacción sus matrículas y la materia.

### Matrículas
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/matriculas/` | admin, profesor, estudiante | Filtrado por rol; admin paginado |
| POST | `/matriculas/` | admin | Asignar una o varias materias. Body: `{ "studentId", "subjectIds": [..] }` (también acepta `subjectId`). Máximo 50 materias por petición. Transacción: omite las ya matriculadas y responde `{ id, created, skipped }`; 409 si todas ya existían, 404 si el estudiante o una materia no existe |
| DELETE | `/matriculas/` | admin | Eliminar matrícula |

### Períodos
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/periodos/` | admin, profesor, estudiante | Lista los 3 trimestres (I, II, III) con `estado` y `abierto` (booleano) |
| PUT | `/periodos/` | admin | Abre/cierra un trimestre o ajusta fechas. Body: `{ "trimestre", "estado"?, "fecha_inicio"?, "fecha_fin"? }`. Fecha `null` o `""` la borra. Devuelve la lista actualizada |

No hay POST ni DELETE: los 3 trimestres existen siempre. Errores: 400 (trimestre/estado/fecha inválidos, inicio posterior a fin, sin campos), 403 (no admin).

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
| `grado` | No (profesor/admin, en grupal) | Filtra el reporte grupal a un solo grado (ej. `10°`). Acepta `Sin grado` para estudiantes sin grado |
| `seccion` | No (profesor/admin, en grupal) | Filtra el reporte grupal a una sola sección (sin distinguir mayúsculas, máx. 20 caracteres). Acepta `Sin sección` para estudiantes sin sección. Se puede combinar con `grado` |

**Qué devuelve cada combinación:**

| Rol | Parámetros | Reporte |
|---|---|---|
| Estudiante | `format` | Boletín completo: todas sus materias matriculadas, columnas I/II/III + Nota Final |
| Estudiante | `format` + `trimestre` | Todas sus materias, detalle de ese trimestre |
| Estudiante | `format` + `materia_id` | Una materia, un renglón por trimestre + Nota Final del Curso |
| Profesor | `format` + `materia_id` + `estudiante_id` | Individual de un alumno en su materia |
| Profesor | `format` + `materia_id` | Grupal de la materia (todos los grados) |
| Profesor | `format` + `materia_id` + `grado` [+ `seccion`] | Grupal de un grado específico (y opcionalmente una sección) |
| **Admin** | `format` + `estudiante_id` (sin `materia_id`) | Boletín completo de cualquier estudiante |
| **Admin** | `format` + `estudiante_id` + `materia_id` | Individual de ese estudiante en esa materia |
| **Admin** | `format` + `materia_id` (sin `estudiante_id`) | Grupal de cualquier materia (todos los grados) |
| **Admin** | `format` + `materia_id` + `grado` [+ `seccion`] | Grupal de un grado (y sección) específico, de cualquier materia |

> `grado` y `seccion` solo se aplican al reporte grupal; en reportes individuales o boletines se ignoran. El grupal sin filtro de trimestre incluye además la columna Estado (Aprobado / En proceso) y se ordena por grado, luego sección (las sin sección al final) y nombre.

**Reglas de permisos:**
- Estudiante: solo puede exportar su propio reporte (`estudiante_id` se ignora y se fuerza al propio); si especifica `materia_id`, debe estar matriculado en ella (403 si no).
- Profesor: solo materias donde es `profesor_id` (403 si no es dueño); si pide un `estudiante_id` específico, debe estar matriculado en la materia (404 si no).
- **Admin: sin restricción de materia propia** (a diferencia del profesor) — puede exportar cualquier combinación válida de estudiante/materia/grado/sección. Debe indicar al menos `estudiante_id` o `materia_id` (400 si omite ambos). Las validaciones de matrícula (que la combinación estudiante+materia exista) se mantienen igual que para los demás roles.

**Respuesta:**
- Éxito: archivo binario con headers `Content-Type` (`application/pdf` o `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) y `Content-Disposition: attachment; filename="..."`. El nombre se sanitiza (sin acentos ni espacios, máx. 80 caracteres).
- Error: JSON estándar `{success:false, error, code}` (400 formato/parámetro inválido o faltante, 403 sin permiso, 404 materia/matrícula/datos inexistentes).

**Dependencias (Composer):**
- `dompdf/dompdf` — generación de PDF
- `phpoffice/phpspreadsheet` — generación de Excel (requiere extensión PHP `gd` activa)

Instalación paso a paso en `docs/instalacion_composer.md`.

**Arquitectura interna:**
```
api/helpers/notas_calculo.php     → cálculo de resumen por trimestre (única fuente; también usado por /notas/ modo resumen)
api/helpers/reporte_data.php      → consultas a BD: individual, boletín multi-materia, grupal (con filtro de grado y sección)
api/helpers/reporte_documento.php → construye un documento genérico (título, info, subtítulo, columnas, filas, pie)
api/helpers/pdf_reporte.php       → renderiza el documento genérico a PDF — escapa toda salida con htmlspecialchars()
api/helpers/excel_reporte.php     → renderiza el documento genérico a Excel — escribe celdas con setCellValueExplicit() para que ningún valor (ej. un nombre que empiece con "=") se interprete como fórmula
api/notas/exportar.php            → endpoint: permisos (una rama por rol) + selección del tipo de reporte + orquestación
```
Separación deliberada: cambiar el formato de salida o agregar uno nuevo no requiere tocar el cálculo de notas, y un reporte nuevo solo necesita un constructor nuevo en `reporte_documento.php` — los renderizadores no cambian. Habilitar `admin` fue agregar una rama de permisos nueva (`elseif ($authUser['rol'] === 'admin')`) sin tocar ninguna de las funciones de `reporte_data.php`/`reporte_documento.php` — confirma la separación. Lo mismo ocurrió con el filtro por sección: se agregó un parámetro a `armarReporteGrupal` / `documentoGrupal` sin modificar los renderizadores.

> **Nota de seguridad:** la primera versión de este endpoint no escapaba la salida en PDF ni prevenía la inyección de fórmulas en Excel; ambos se corrigieron antes de la versión actual.

> El panel de admin consume este endpoint desde su vista **Reportes** (ver documentación de frontend).

### Comentarios
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/comentarios/` | admin, profesor, estudiante | Filtrado por rol |
| POST | `/comentarios/` | estudiante | Enviar comentario (requiere matrícula en la materia; 403 si no está matriculado) |

---

## 5. Roles y Permisos

| Acción | Admin | Profesor | Estudiante |
|---|:---:|:---:|:---:|
| Ver/gestionar estudiantes | ✅ | ❌ | ❌ |
| Ver/gestionar profesores | ✅ | ❌ | ❌ |
| Ver/gestionar materias | ✅ | 👁️ | 👁️ |
| Gestionar matrículas | ✅ | ❌ | ❌ |
| Ver matrículas propias | ❌ | 👁️ | 👁️ |
| Registrar/editar/eliminar notas (solo en trimestres abiertos) | ❌ | ✅ | ❌ |
| Abrir/cerrar trimestres | ✅ | ❌ | ❌ |
| Consultar el estado de los trimestres | 👁️ | 👁️ | 👁️ |
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
| 401 | No autenticado / sesión inválida o expirada / credenciales o respuesta de seguridad incorrectas |
| 403 | Sin permisos para esta acción |
| 404 | Recurso no encontrado |
| 405 | Método HTTP no permitido |
| 409 | Conflicto (duplicado, restricción, examen trimestral ya registrado, borrado que requiere confirmación, trimestre cerrado) |
| 429 | Cuenta bloqueada temporalmente por intentos fallidos (login o recuperación de contraseña) |
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

| Endpoint | Campos de búsqueda | Filtros adicionales |
|---|---|---|
| `/estudiantes/` | nombre, email, identificacion | `grado`, `seccion` |
| `/profesores/` | nombre, email, especialidad | — |
| `/materias/` | nombre, codigo | — |
| `/matriculas/` | nombre del estudiante, nombre de la materia (solo admin) | — |

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
Filtrado automático por rol (profesor solo ve sus notas, estudiante solo las propias). `profesor_id` solo aplica para admin.

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
- Si el trimestre está cerrado: 409 `"Este trimestre ya fue cerrado"` (ver *Regla de períodos* al final de esta sección).

### Editar nota
```
PUT /api/notas/
Body: { "id", "puntaje", "tipo"?, "tipo_actividad"?, "trimestre"?, "nombre"?, "comentario"? }
```
- Solo el profesor propietario puede editar.
- Genera un registro en `nota_auditoria` con el puntaje anterior y nuevo (`editor_id` = id del profesor).
- Misma validación de unicidad de `EXAMEN_TRIMESTRAL` al cambiar tipo/trimestre.
- El trimestre actual de la nota debe estar abierto; si además se mueve a otro trimestre (`trimestre` en el body), el destino también debe estar abierto.

### Eliminar nota
```
DELETE /api/notas/
Body: { "id" }
```
Solo el profesor propietario puede eliminar, y solo si el trimestre de la nota está abierto.

### Regla de períodos
Un trimestre `cerrado` bloquea POST, PUT y DELETE de notas. La respuesta es:
```json
{ "success": false, "error": "Este trimestre ya fue cerrado", "code": 409,
  "details": { "codigo": "TRIMESTRE_CERRADO", "trimestre": "I Trimestre" } }
```
Si un trimestre no tiene fila en `periodo`, se trata como cerrado (falla cerrado). Las lecturas (listados, resumen, exportación de reportes y vista del estudiante) **no** se ven afectadas por el estado del período.

---

## 9. Credenciales Iniciales

| Usuario | Email | Contraseña inicial |
|---|---|---|
| Administrador | `admin@escuela.edu` | `admin123` |
| Profesor/Estudiante nuevo | email registrado | la que envíe el admin (`initialPassword`); si no envía ninguna, el backend usa la **identificación** del usuario. Visible para el admin en `password_inicial` solo hasta que el usuario cambie su contraseña |

> Al iniciar sesión con un hash SHA256 legado, el sistema migra automáticamente a bcrypt.

---

## 10. Pendiente

| Funcionalidad | Descripción |
|---|---|
| **Resto de la Propuesta de Mejoras** | Notificaciones por correo (6.2), PWA (6.4) y migración a HTTPS en servidor de producción (6.1). El panel de períodos (6.3) quedó implementado en la v2.5.0. |

---

## 11. Decisiones registradas

Para que quede constancia del porqué, sin que se reabra la discusión más adelante sin motivo nuevo:

| Tema | Decisión | Razón |
|---|---|---|
| **Importación en lote** (estudiantes/profesores/notas desde archivo) | No se implementará | Solo beneficiaría la primera carga de datos de un período, y requeriría que cada profesor adapte sus notas locales a un formato específico del sistema. El uso ideal del SGE es empezar a usarlo desde el inicio de un período, no a mitad de uno — el beneficio no justifica la complejidad. |
| **Exportación en formato CSV** | No se implementará | Es funcionalmente redundante con la exportación a Excel ya existente; no aporta un caso de uso distinto. |
| **Exportación desde el panel de admin** | Implementada (backend + vista Reportes) | Se agregó `admin` a `requireRole` en `exportar.php` con una rama de permisos propia, sin restricción de materia (a diferencia de profesor). Las funciones de armado de datos y renderizado no se tocaron — solo se agregó la rama de permisos. El panel de admin ya tiene la vista Reportes que consume el endpoint. |
| **Registro de derechos de autor (DIGERPI)** | No se hará | Fuera del alcance del proyecto como entrega académica. |

---

*Documentación generada para uso interno del equipo de desarrollo — sección backend.*