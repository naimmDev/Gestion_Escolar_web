# Documentación Backend — Sistema de Gestión Escolar
**Versión:** 2.1
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

---

## 1. Estructura del Proyecto

```
gestion_escolar/
├── api/
│   ├── config/
│   │   ├── db.php
│   │   ├── auth_middleware.php
│   │   └── response.php
│   ├── auth/
│   │   ├── login.php                    # POST
│   │   ├── logout.php                   # POST
│   │   ├── cambiar_password.php         # POST — requiere token
│   │   ├── recuperar_password.php       # POST — sin token (recuperación por pregunta de seguridad)
│   │   ├── preguntas_seguridad.php      # GET  — lista las 8 preguntas predefinidas
│   │   ├── preguntas_usuario.php        # GET  — sin token, por identificación
│   │   └── configurar_preguntas.php     # POST — requiere token
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
│   │   └── index.php                    # GET (listado/resumen) · POST · PUT · DELETE
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

#### `sesion`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| usuario_id | INT FK | Referencia a `usuario` |
| token | VARCHAR(64) UNIQUE | Token Bearer (hex 32 bytes) |
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

> **Cambio respecto a v1:** el enum `tipo` migró de `('parcial','taller','tarea')` a `('PARCIAL','EXAMEN_TRIMESTRAL','APRECIACION')`. Solo puede existir **un** registro `EXAMEN_TRIMESTRAL` por combinación estudiante/materia/trimestre.

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

#### `pregunta_seguridad` *(nueva)*
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| pregunta | VARCHAR(255) | Texto de la pregunta |

> 8 preguntas predefinidas, fijas en la base de datos (mascota, ciudad natal, apellido materno, primera escuela, comida favorita, mejor amigo de infancia, primer teléfono, modelo de primer auto).

#### `usuario_pregunta` *(nueva)*
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO | Identificador |
| usuario_id | INT FK | Referencia a `usuario` |
| pregunta_id | INT FK | Referencia a `pregunta_seguridad` |
| respuesta_hash | VARCHAR(255) | bcrypt de la respuesta (normalizada a minúsculas y sin espacios extremos) |

> Restricción única: `(usuario_id, pregunta_id)`. Cada usuario configura exactamente 3 filas.

---

## 3. Autenticación y Flujo de Primer Ingreso

### Login

```
POST /api/auth/login.php
Body: { "email": "...", "password": "..." }
```

1. Busca el usuario por email.
2. Verifica con `password_verify()` (bcrypt); si falla, intenta SHA256 (legado) y migra el hash automáticamente.
3. Invalida sesiones previas del usuario.
4. Genera token (`bin2hex(random_bytes(32))`), sesión válida 8 horas.

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "token": "abc123...",
    "rol": "admin",
    "nombre": "Administrador",
    "id_referencia": null,
    "password_cambiada": true,
    "preguntas_configuradas": true
  }
}
```

> `password_cambiada` y `preguntas_configuradas` indican al frontend si debe redirigir al flujo de primer ingreso. El rol `admin` siempre tiene ambos en `true` y omite ese flujo.

### Logout
```
POST /api/auth/logout.php
Header: Authorization: Bearer <token>
```
Marca la sesión como inactiva (`activa = 0`).

### Cambio de contraseña (usuario autenticado)
```
POST /api/auth/cambiar_password.php
Header: Authorization: Bearer <token>
Body: { "password_actual": "...", "password_nueva": "..." }
```
- Verifica la contraseña actual con `password_verify()`.
- Rechaza si la nueva es igual a la actual o tiene menos de 6 caracteres.
- Actualiza `password_hash` y marca `password_cambiada = 1`.

### Preguntas de seguridad

**Listar las 8 preguntas predefinidas:**
```
GET /api/auth/preguntas_seguridad.php
Header: Authorization: Bearer <token>
```

**Configurar 3 preguntas (usuario autenticado):**
```
POST /api/auth/configurar_preguntas.php
Header: Authorization: Bearer <token>
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
- Actualiza `password_hash` directamente (no afecta `password_cambiada`).

### Protección de endpoints
Todos los endpoints (excepto login, recuperar_password y preguntas_usuario) incluyen:
```php
require '../config/db.php';
require '../config/auth_middleware.php';
```
`auth_middleware.php` valida el token Bearer contra `sesion` (activa y no expirada) y deja disponible `$authUser`.

### Flujo de primer ingreso (referencia para frontend)
`login` → si `!password_cambiada` → pantalla cambiar contraseña → si `!preguntas_configuradas` → pantalla configurar preguntas → panel según rol. El admin omite ambos pasos.

---

## 4. Endpoints de la API

**URL base:** `http://localhost/gestion_escolar/api`

### Autenticación
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/login.php` | No | Iniciar sesión |
| POST | `/auth/logout.php` | Sí | Cerrar sesión |
| POST | `/auth/cambiar_password.php` | Sí | Cambiar contraseña propia |
| GET | `/auth/preguntas_seguridad.php` | Sí | Listar las 8 preguntas predefinidas |
| POST | `/auth/configurar_preguntas.php` | Sí | Configurar 3 preguntas de seguridad |
| GET | `/auth/preguntas_usuario.php?identificacion=` | No | Obtener preguntas configuradas por un usuario |
| POST | `/auth/recuperar_password.php` | No | Recuperar contraseña respondiendo pregunta de seguridad |

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
> Si se envía `initialPassword`, se regenera el hash en `usuario` y se resetean `password_cambiada = 0`, `preguntas_configuradas = 0`, además de borrarse sus `usuario_pregunta` (flujo de "restablecer acceso").

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
| GET | `/notas/exportar.php` | profesor, estudiante | Genera y descarga un reporte de notas en PDF o Excel |

**Parámetros (query string):**

| Parámetro | Obligatorio | Descripción |
|---|---|---|
| `format` | Sí | `pdf` o `excel` |
| `materia_id` | Sí | Materia a exportar |
| `estudiante_id` | No | Si se envía → reporte individual. Si se omite (solo profesor) → reporte grupal de todos los matriculados |
| `trimestre` | No | Filtra el reporte individual a un solo trimestre; si se omite, incluye los 3 + promedio final |

**Reglas de permisos:**
- Estudiante: solo puede exportar su propio reporte (`estudiante_id` se ignora y se fuerza al propio); requiere estar matriculado en la materia (403 si no).
- Profesor: solo materias donde es `profesor_id` (403 si no es dueño); si pide un `estudiante_id` específico, debe estar matriculado en la materia (404 si no).
- Admin: no habilitado en esta versión (arquitectura preparada para agregarlo después sin refactor).

**Respuesta:**
- Éxito: archivo binario con headers `Content-Type` (`application/pdf` o `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) y `Content-Disposition: attachment; filename="..."`.
- Error: JSON estándar `{success:false, error, code}` (400 formato/materia inválidos, 403 sin permiso, 404 materia o matrícula inexistente).

**Dependencias nuevas (Composer):**
- `dompdf/dompdf` — generación de PDF
- `phpoffice/phpspreadsheet` — generación de Excel (requiere extensión PHP `gd` activa)

**Arquitectura interna:**
api/helpers/reporte_data.php → cálculo de datos (reutiliza lógica de /notas/ modo resumen)
api/helpers/pdf_reporte.php → renderizado a PDF
api/helpers/excel_reporte.php → renderizado a Excel
api/notas/exportar.php → endpoint: permisos + orquestación

Separación deliberada: cambiar el formato de salida o agregar uno nuevo (ej. CSV) no requiere tocar el cálculo de notas.

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
| 401 | No autenticado / token inválido / respuesta de seguridad incorrecta |
| 403 | Sin permisos para esta acción |
| 404 | Recurso no encontrado |
| 405 | Método HTTP no permitido |
| 409 | Conflicto (duplicado, restricción, examen trimestral ya registrado) |
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
Por cada trimestre calcula:
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
- `profesor_id` se extrae del token, nunca del body.
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

---

*Documentación generada para uso interno del equipo de desarrollo — sección backend.*
