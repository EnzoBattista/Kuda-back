# 🏋️ Kuda API — Guía de Testing con Postman

> **Base URL:** `http://localhost:3001`
> **Auth header:** `Authorization: Bearer {{token}}`
> Variables de entorno sugeridas: `{{token}}`, `{{actividad_id}}`, `{{profesor_id}}`, `{{clase_id}}`, `{{inscripcion_mensual_id}}`, `{{inscripcion_individual_id}}`, `{{reserva_id}}`

---

## 1. Auth — `/api/auth`

### 1.1 Registrar cliente
```
POST /api/auth/register
```
> ⚠️ No requiere token. Crea un usuario de rol CLIENTE y envía email de confirmación (requiere SendGrid configurado).

**Body (todos requeridos salvo `telefono` y `fichaMedica`):**
```json
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "dni": "38000001",
  "email": "juan@test.com",
  "genero": "M",
  "fechaNacimiento": "2000-03-15",
  "telefono": "3515000001",
  "fichaMedica": "Sin observaciones",
  "password": "Clave1234!",
  "confirmPassword": "Clave1234!"
}
```
> Restricciones: `password >= 8 chars`, `edad > 14 años`, email único.

**Respuesta:** `201` — mensaje indicando que se envió el email.

---

### 1.2 Confirmar cuenta
```
GET /api/auth/confirmar/:token
```
> El `:token` llega por email. Sin body.

**Respuesta:** `200` — `{ message: "Usted ha sido registrado correctamente" }`

---

### 1.3 Login
```
POST /api/auth/login
```
```json
{
  "email": "admin@test.com",
  "password": "password123"
}
```
> La cuenta debe estar confirmada (`activo: true`).

**Respuesta:** `200` — `{ token: "...", usuario: { ... } }`
> 📌 Guardar `token` en `{{token}}`.

---

### 1.4 Cambiar contraseña
```
POST /api/auth/cambiar-password    [Auth]
```
```json
{
  "passwordActual": "Admin1234!",
  "passwordNueva": "NuevaClave99!",
  "confirmPassword": "NuevaClave99!"
}
```
**Respuesta:** `200`

---

### 1.5 Logout
```
POST /api/auth/logout    [Auth]
```
Sin body. **Respuesta:** `200`

---

## 2. Usuarios — `/api/usuarios`

> Requiere permiso `USUARIO_GESTIONAR` (rol ADMIN o RECEPCIONISTA según config).

### 2.1 Listar usuarios
```
GET /api/usuarios    [Auth]
```
**Query params opcionales:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `rol` | string | Nombre del rol: `ADMIN`, `CLIENTE`, `RECEPCIONISTA`, `EMPLEADO` |
| `activo` | boolean | `true` / `false` |
| `q` | string | Búsqueda por nombre, apellido, email o DNI |

---

### 2.2 Obtener usuario por email
```
GET /api/usuarios/:email    [Auth]
```

---

### 2.3 Crear usuario (admin)
```
POST /api/usuarios    [Auth]
```
**Campos aceptados (`email`, `dni`, `nombre`, `apellido` requeridos; resto opcionales):**
```json
{
  "email": "recep@kuda.com",
  "dni": "30000001",
  "nombre": "Ana",
  "apellido": "Gómez",
  "telefono": "3515000002",
  "password": "Clave1234!",
  "rol_id": 2
}
```
> Se crea con `activo: true` automáticamente.

---

### 2.4 Actualizar usuario
```
PUT /api/usuarios/:email    [Auth]
```
Body: cualquier subconjunto de `{ dni, nombre, apellido, telefono, password, rol_id }`.

---

### 2.5 Dar de baja usuario
```
DELETE /api/usuarios/:email    [Auth]
```
Sin body. Baja lógica + cancela inscripciones mensuales activas del cliente.
**Respuesta:** `204 No Content`

---

## 3. Profesores — `/api/profesores`

### 3.1 Listar (público)
```
GET /api/profesores
```

### 3.2 Por actividad (público)
```
GET /api/profesores/actividad/:actividad_id
```

### 3.3 Crear
```
POST /api/profesores    [Auth, ACTIVIDAD_GESTIONAR]
```
**Campos requeridos:** `nombre`, `apellido`, `dni` (único).
**Opcional:** `actividades` (array de IDs de actividades para asociar).
```json
{
  "nombre": "Carlos",
  "apellido": "García",
  "dni": "25000001",
  "actividades": [1, 2]
}
```
**Respuesta:** `201` — `{ message, profesor }`
> 📌 Guardar `profesor.id` en `{{profesor_id}}`.

---

## 4. Actividades — `/api/actividades`

### 4.1 Listar
```
GET /api/actividades    [Auth]
```
**Query opcional:** `activa=true` para filtrar solo activas.

### 4.2 Crear
```
POST /api/actividades    [Auth, ACTIVIDAD_GESTIONAR]
```
**Requeridos:** `nombre` (único), `precio`.
**Opcional:** `descripcion`.
```json
{
  "nombre": "Yoga",
  "descripcion": "Clases de yoga para todos los niveles",
  "precio": 15000
}
```
**Respuesta:** `201` — `{ message, actividad }`
> 📌 Guardar `actividad.id` en `{{actividad_id}}`.

### 4.3 Actualizar
```
PUT /api/actividades/:id    [Auth, ACTIVIDAD_GESTIONAR]
```
Body: subconjunto de `{ nombre, descripcion, precio }`.

### 4.4 Actualizar precio
```
PATCH /api/actividades/:id/precio    [Auth, ACTIVIDAD_GESTIONAR]
```
```json
{ "precio": 18000 }
```

### 4.5 Profesores de la actividad
```
GET /api/actividades/:id/profesores    [Auth]
```

### 4.6 Eliminar
```
DELETE /api/actividades/:id    [Auth, ACTIVIDAD_GESTIONAR]
```

---

## 5. Clases — `/api/clases`

### 5.1 Listar activas (público)
```
GET /api/clases
```
Devuelve clases con `activa: true`, incluye actividad, sala y profesor.

### 5.2 Crear
```
POST /api/clases    [Auth, CLASE_GESTIONAR]
```
**Todos requeridos:**
```json
{
  "nombre": "Yoga Mañana",
  "actividad_id": 1,
  "profesor_id": 1,
  "sala_id": 1,
  "dia_semana": "Lunes",
  "hora_inicio": "09:00",
  "hora_fin": "10:00",
  "cupo": 15
}
```
> `dia_semana` ∈ `["Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"]` (Domingo bloqueado).
> `hora_inicio >= 07:00`, `hora_fin <= 22:00`, duración máx 4hs, `cupo >= 10` y `<= cupo de sala`.

**Respuesta:** `201` — `{ message, clase }`
> 📌 Guardar `clase.id` en `{{clase_id}}`.

### 5.3 Obtener por ID
```
GET /api/clases/:id    [Auth]
```
Devuelve la clase con `proximas_fechas` (próximas 4 fechas no canceladas).

### 5.4 Actualizar
```
PUT /api/clases/:id    [Auth, CLASE_GESTIONAR]
```
Body: subconjunto de `{ nombre, actividad_id, profesor_id, sala_id, dia_semana, hora_inicio, hora_fin, cupo }`.

### 5.5 Cancelar fecha puntual
```
POST /api/clases/:id/cancelaciones    [Auth, CLASE_GESTIONAR]
```
**Requerido:** `fecha`. **Opcional:** `motivo`.
```json
{
  "fecha": "2026-06-02",
  "motivo": "Feriado nacional"
}
```
> La `fecha` debe corresponder al `dia_semana` de la clase y no ser pasada.

### 5.6 Eliminar (baja lógica)
```
DELETE /api/clases/:id    [Auth, CLASE_GESTIONAR]
```
> Bloqueado si hay inscripciones mensuales VIGENTE/EN_GRACIA o individuales futuras.

---

## 6. Inscripciones Mensuales — `/api/inscripciones-mensuales`

### 6.1 Crear
```
POST /api/inscripciones-mensuales    [Auth, CLASE_RESERVAR]
```
**Todos requeridos:**
```json
{
  "cliente_email": "juan@test.com",
  "actividad_id": 1,
  "clase_id": 1,
  "periodo_inicio": "2026-06-01"
}
```
> `periodo_fin` = `periodo_inicio + 1 mes` (calculado automáticamente).
> Genera todas las `ReservaClase` del período correspondientes al `dia_semana` de la clase.
> Valida superposición de fechas con inscripciones vigentes.

**Respuesta:** `201`
```json
{
  "id": 1,
  "cliente_email": "juan@test.com",
  "actividad_id": 1,
  "clase_id": 1,
  "periodo_inicio": "2026-06-01",
  "periodo_fin": "2026-07-01",
  "dia_vencimiento": "2026-07-01",
  "estado": "VIGENTE",
  "monto": 15000
}
```
> 📌 Guardar `id` en `{{inscripcion_mensual_id}}`.

### 6.2 Listar
```
GET /api/inscripciones-mensuales    [Auth]
```
**Query opcionales:**

| Param | Valores posibles |
|-------|-----------------|
| `cliente_email` | email del cliente |
| `estado` | `VIGENTE` / `EN_GRACIA` / `SUSPENDIDA` / `FINALIZADA` / `CANCELADA` |

### 6.3 Obtener por ID
```
GET /api/inscripciones-mensuales/:id    [Auth]
```

### 6.4 Cancelar
```
PATCH /api/inscripciones-mensuales/:id/cancelar    [Auth, CLASE_RESERVAR]
```
Sin body. Cambia estado a `CANCELADA` y destruye todas las `ReservaClase` futuras.

### 6.5 Renovar
```
POST /api/inscripciones-mensuales/:id/renovar    [Auth, CLASE_RESERVAR]
```
Sin body. Crea nueva inscripción con `periodo_inicio = periodo_fin` actual.
> Bloqueado si el estado actual es `CANCELADA` o `FINALIZADA`.

---

## 7. Inscripciones Individuales — `/api/inscripciones-individuales`

### 7.1 Crear — modalidad COMPLETO
```
POST /api/inscripciones-individuales    [Auth, CLASE_RESERVAR]
```
**Requeridos:** `cliente_email`, `actividad_id`, `clase_id`, `fecha`, `modalidad`.
```json
{
  "cliente_email": "juan@test.com",
  "actividad_id": 1,
  "clase_id": 1,
  "fecha": "2026-06-09",
  "modalidad": "COMPLETO"
}
```
> `modalidad` ∈ `["COMPLETO", "SEÑA"]`.
> `monto_total = actividad.precio * 0.333` (calculado automáticamente).
> Para `COMPLETO`: `monto_pagado = monto_total`.

### 7.2 Crear — modalidad SEÑA
```
POST /api/inscripciones-individuales    [Auth, CLASE_RESERVAR]
```
```json
{
  "cliente_email": "juan@test.com",
  "actividad_id": 1,
  "clase_id": 1,
  "fecha": "2026-06-16",
  "modalidad": "SEÑA",
  "vencimiento_seña": "2026-06-14"
}
```
> `vencimiento_seña` requerido solo cuando `modalidad = SEÑA`.
> Se crea con `estado_seña: PENDIENTE` y `monto_pagado = monto_total / 2`.

> 📌 Guardar `id` en `{{inscripcion_individual_id}}`.

### 7.3 Completar seña
```
POST /api/inscripciones-individuales/:id/completar-sena    [Auth, CLASE_RESERVAR]
```
Sin body. Cambia `estado_seña → COMPLETADA` y `monto_pagado = monto_total`.

### 7.4 Listar
```
GET /api/inscripciones-individuales    [Auth]
```
**Query opcionales:**

| Param | Valores posibles |
|-------|-----------------|
| `cliente_email` | email del cliente |
| `modalidad` | `COMPLETO` / `SEÑA` |
| `estado_seña` | `PENDIENTE` / `COMPLETADA` / `VENCIDA` |

### 7.5 Obtener por ID
```
GET /api/inscripciones-individuales/:id    [Auth]
```

---

## 8. Reservas — `/api/reservas`

### 8.1 Reservas activas
```
GET /api/reservas    [Auth, CLASE_RESERVAR]
```
Devuelve reservas con `estado: ACTIVA` y `fecha_exacta >= hoy`.

**Query opcionales:**

| Param | Descripción |
|-------|-------------|
| `cliente_email` | Filtrar por cliente |
| `clase_id` | Filtrar por clase |
| `actividad_id` | Filtrar por actividad (join en clase) |

### 8.2 Historial
```
GET /api/reservas/historial    [Auth, CLASE_RESERVAR]
```
Devuelve reservas canceladas o pasadas. Paginado.

**Query opcionales:**

| Param | Descripción |
|-------|-------------|
| `cliente_email` | Filtrar por cliente |
| `desde` | Fecha ISO mínima: `2026-05-01` |
| `hasta` | Fecha ISO máxima: `2026-07-31` |
| `actividad_id` | Filtrar por actividad |
| `page` | Número de página (default: `1`) |
| `limit` | Resultados por página (default: `20`) |

**Respuesta:**
```json
{ "total": 5, "pagina": 1, "paginas": 1, "reservas": [...] }
```

### 8.3 Cancelar reserva
```
PATCH /api/reservas/:id/cancelar    [Auth, CLASE_RESERVAR]
```
Sin body. Requiere `>= 24 hs` de anticipación; si se cumple, emite un `Vale`.

**Respuesta:** `200`
```json
{
  "reserva": { "id": 1, "estado": "CANCELADA", ... },
  "vale": { "id": 1, "valido_hasta": "2026-08-01", ... }
}
```

### 8.4 Mis vales
```
GET /api/reservas/mis-vales    [Auth]
```
Devuelve vales vigentes (`valido_hasta >= hoy`) y no usados del usuario autenticado. Sin params.

---

## 9. Pagos — `/api/pagos`

### 9.1 Registrar pago manual
```
POST /api/pagos    [Auth, PAGO_COBRAR]
```
**Requeridos:** `cliente_email`, `origen`, `origen_id`, `monto`, `medio`.
**Opcionales:** `recepcionista_email`, `fecha`, `mp_payment_id`.

```json
{
  "cliente_email": "juan@test.com",
  "recepcionista_email": "admin@kuda.com",
  "origen": "MENSUALIDAD",
  "origen_id": 1,
  "monto": 15000,
  "fecha": "2026-06-01",
  "medio": "MP",
  "mp_payment_id": "MP-12345"
}
```
> `origen` ∈ `["MENSUALIDAD", "CLASE_SUELTA", "SEÑA", "SALDO_SEÑA"]`
> `medio` ∈ `["MP"]` (único medio habilitado actualmente)

### 9.2 Crear preferencia Mercado Pago
```
POST /api/pagos/create-preference    [Auth]
```
**Requeridos:** `tituloPlan`, `precio` (> 0).
```json
{
  "tituloPlan": "Membresía Yoga — Junio 2026",
  "precio": 15000
}
```
**Respuesta:** `201` — `{ id, init_point }`

### 9.3 Listar pagos
```
GET /api/pagos    [Auth, PAGO_VER_TODOS]
```
**Query opcionales:**

| Param | Descripción |
|-------|-------------|
| `cliente_email` | Filtrar por cliente |
| `origen` | `MENSUALIDAD` / `CLASE_SUELTA` / `SEÑA` / `SALDO_SEÑA` |
| `desde` | Fecha ISO mínima |
| `hasta` | Fecha ISO máxima |

---

## 10. Casos de Error Esperados

| Caso | Endpoint | Respuesta |
|------|----------|-----------|
| Registrar con edad <= 14 | `POST /auth/register` | `400` |
| Login con cuenta no confirmada | `POST /auth/login` | `403 CUENTA_INACTIVA` |
| Inscripción mensual con fechas superpuestas | `POST /inscripciones-mensuales` | `400` |
| Clase sin cupo | `POST /inscripciones-mensuales` | `400` |
| Cancelar inscripción ya cancelada | `PATCH /inscripciones-mensuales/:id/cancelar` | `409` |
| Renovar inscripción CANCELADA | `POST /inscripciones-mensuales/:id/renovar` | `409` |
| Cancelar reserva con < 24hs | `PATCH /reservas/:id/cancelar` | `400` |
| Completar seña de inscripción COMPLETO | `POST /inscripciones-individuales/:id/completar-sena` | `409` |
| Crear clase con Domingo | `POST /api/clases` | `400` |
| Crear clase con horario solapado (sala u profesor) | `POST /api/clases` | `409` |
| Eliminar clase con inscripciones activas | `DELETE /api/clases/:id` | `409` |
| Cancelar fecha pasada de una clase | `POST /api/clases/:id/cancelaciones` | `400` |

---

## Flujo Happy Path (orden sugerido)

```
1.  POST /api/auth/login                                    → {{token}}
2.  POST /api/profesores                                    → {{profesor_id}}
3.  POST /api/actividades                                   → {{actividad_id}}
4.  POST /api/clases                                        → {{clase_id}}
5.  POST /api/inscripciones-mensuales                       → {{inscripcion_mensual_id}}
    └─► Genera ReservaClase automáticas para el período
6.  GET  /api/reservas?cliente_email=juan@test.com          → Ver reservas activas, guardar {{reserva_id}}
7.  PATCH /api/reservas/{{reserva_id}}/cancelar             → Cancela reserva + emite Vale
8.  GET  /api/reservas/mis-vales                            → Ver vale generado
9.  POST /api/inscripciones-mensuales/{{inscripcion_mensual_id}}/renovar → Nueva inscripción mes siguiente
10. POST /api/pagos/create-preference                       → Obtener init_point de Mercado Pago
11. POST /api/pagos                                         → Registrar pago manual
```
