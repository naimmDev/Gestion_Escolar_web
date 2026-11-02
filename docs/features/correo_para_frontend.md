# Notificaciones por correo — traspaso al frontend

**Backend:** listo (módulo `api/helpers/mail/`). Casi todo es transparente para el frontend: el correo se envía solo, después de guardar el cambio. Si el correo falla, la acción **igual se guarda**.

## Qué eventos envían correo (sin cambios en el frontend)
| Evento | Quién lo recibe |
|---|---|
| Crear estudiante/profesor (admin) | El propio usuario (contraseña inicial) |
| Restablecer acceso (PUT con `initialPassword`) | El propio usuario (nueva contraseña inicial) |
| Nota nueva (POST `/notas/`) | El estudiante |
| Comentario nuevo (POST `/comentarios/`) | El profesor de la materia |
| Trimestre cerrado (PUT `/periodos/` de abierto a cerrado) | Todos los profesores |
| Cuenta bloqueada (5 intentos fallidos en login o recuperación) | El dueño de la cuenta |

No se envía correo al **editar** notas ni al reabrir un trimestre.

## Único cambio en la API: campo `correo`
Estas respuestas traen ahora `data.correo`:
- `POST /estudiantes/` y `POST /profesores/` (201)
- `PUT /estudiantes/` y `PUT /profesores/` (200)

Valores: `"enviado"` | `"fallido"` | `"desactivado"` (el envío está apagado en `credenciales.php`) | `"no_aplica"` (solo en PUT cuando no se cambió la contraseña, o sea, no había nada que enviar).

## Tareas de frontend (pequeñas)
1. **Admin, tras crear un usuario** (`admin.js`, handlers de estudiante y profesor): si `json.data.correo === 'enviado'`, agregar al aviso/toast: "Se envió un correo con sus credenciales". Si es `'fallido'`, avisar: "El usuario se creó, pero no se pudo enviar el correo; entrégale la contraseña manualmente". Con `'desactivado'` no mostrar nada extra.
2. **Admin, tras restablecer acceso** (`resetStudentAccess` / `resetTeacherAccess`): igual que el punto 1 con `correo` de la respuesta del PUT.
3. **No cambiar** la forma en que se muestra la contraseña inicial en la tabla: sigue siendo necesaria como respaldo.
4. **`ayuda.js`** (opcional): una pregunta "¿Recibiré correos del sistema?" explicando los eventos de la tabla de arriba y que los correos son automáticos y no se responden.
5. Subir el `?v=` de los archivos modificados.

## Qué NO hacer
- No asumir que `correo` siempre existe: puede faltar (usar `json.data?.correo`).
- No bloquear ni reintentar la acción si el correo falló: ya se guardó.

## Checklist
- [ ] Con el envío desactivado, crear/editar usuarios funciona igual que antes y no muestra avisos de correo.
- [ ] Con el envío activo, al crear un usuario aparece el aviso de correo enviado.
- [ ] Con el SMTP mal configurado, el usuario se crea y se muestra el aviso de fallo.
- [ ] Restablecer acceso muestra el aviso correcto.
