# Plan de Implementación — Sprint 1

> Plan de trabajo aprobado el 2026-05-12 para completar las HUs del Sprint 1 (98 pts totales; 6 pts diferidos a Sprint 2: HU80 + HU81).

---

## 1. Cobertura inicial

| Categoría | Total HUs | ✅ Hecho | ⚠️ Parcial | ❌ Falta |
|-----------|-----------|----------|------------|----------|
| Gestión de Usuarios (14) | 14 | 8 | 1 | 5 |
| Gestión de Clases (12) | 12 | 5 | 0 | 7 |
| Gestión de Reservas (8) | 8 | 1 | 3 | 4 |
| **Total Sprint 1** | **34** | **14** | **4** | **16** |

### Decisiones de producto tomadas

| Decisión | Resolución |
|----------|------------|
| HU12 — Logout | Stateless: endpoint retorna 200, el frontend descarta el JWT. |
| HU17 — Cambiar contraseña | Auto-gestionado: usuario logueado provee `passwordActual` + nueva. |
| HU49 / HU74 — Empleados | Endpoints dedicados (`/api/recepcionistas`, `/api/empleados`). |
| HU57-89 — CRUD Actividades | Se habilita CRUD para admin. Seeders quedan solo como datos iniciales. |
| HU44 vs HU63 — Eliminar vs Cancelar Clase | Eliminar = baja lógica del horario semanal (no se repite más). Cancelar = se cancela la próxima ocurrencia (modelo CancelacionClase). |
| HU31 / HU67 — Cancelaciones de reservas | Solo el cliente cancela su propia reserva. |
| HU80 / HU81 — Lista de espera | Diferido a Sprint 2 según PGP. |

---

## 2. Fase 0 — Alineación

- Actualizar `agents/agents.md` removiendo la regla que prohíbe CRUD para Actividades.
- Confirmar matriz `MATRIZ_ROL_PERMISOS` (admin ya tiene `ACTIVIDAD_GESTIONAR`).

## 3. Fase 1 — Gestión de Usuarios (gaps) ✅ (HECHO)

| HU | Cambio |
|----|--------|
| 12 | `POST /api/auth/logout` stateless. |
| 17 | `POST /api/auth/cambiar-password` con verificación de `passwordActual`. |
| 86 | Filtros en `GET /api/usuarios`: `?rol=`, `?activo=`, `?q=` (búsqueda en nombre/apellido/dni/email). |
| 49 | `POST /api/recepcionistas` — solo admin; crea Usuario con rol RECEPCIONISTA, sin fila en `clientes`. |
| 74 | `GET /api/empleados` y `GET /api/empleados/:email` — usuarios con rol ≠ CLIENTE. |

## 4. Fase 2 — Catálogo (Actividades) ✅ (HECHO)

Agregar columna `activa BOOLEAN DEFAULT true` al modelo `Actividad`.

| HU | Endpoint |
|----|----------|
| 61 | `GET /api/actividades` (opcional `?activa=`). |
| 57 | `POST /api/actividades` (admin) — nombre único, precio ≥ 0. |
| 58 | `PUT /api/actividades/:id` (admin) — no toca `precio`. |
| 89 | `PATCH /api/actividades/:id/precio` (admin). |
| 59 | `DELETE /api/actividades/:id` — baja lógica; rechaza si hay clases activas con inscriptos. |
| 60 | `GET /api/actividades/:id/profesores` (confirmar implementación). |

## 5. Fase 3 — Clases ✅ (HECHO)

| HU | Cambio |
|----|--------|
| 79 | `GET /api/clases/:id` con includes y próximas fechas. |
| 44 | `DELETE /api/clases/:id` — baja lógica; rechaza si hay inscripciones VIGENTE/EN_GRACIA o individuales futuras. |
| 63 | Nuevo modelo `CancelacionClase { id, clase_id, fecha, motivo, creado_por }`. `POST /api/clases/:id/cancelaciones` — la fecha debe coincidir con `dia_semana` y ser futura. Stub de notificación queda para Sprint 2. |

## 6. Fase 4 — Reservas ✅ (HECHO)

| HU | Cambio |
|----|--------|
| 30 | Validar al crear inscripción mensual: cliente no tiene otra VIGENTE de la misma actividad, cupo disponible, clase no dada de baja. |
| 31 | Cancelar mensual +24h → registro en nuevo modelo `Vale { id, cliente_email, monto, valido_desde, valido_hasta, usado_en_pago_id }` (20-25% mensualidad). <24h sin vale. |
| 47 | Validar cupo y disponibilidad de fecha (no cancelada) en inscripción individual COMPLETO. |
| 67 | `PATCH /api/inscripciones-individuales/:id/cancelar` — solo dueño. COMPLETO +24h → `REEMBOLSO_PENDIENTE`. COMPLETO <24h → sin reembolso. SEÑA → seña retenida. |
| 15 | `GET /api/reservas` — unifica inscripciones mensuales VIGENTE/EN_GRACIA + individuales con fecha ≥ hoy. |
| 33 | `GET /api/reservas/historial` — mensuales no vigentes + individuales pasadas; filtros `?cliente_email`, `?desde`, `?hasta`, paginación. |

## 7. Convenciones

- Toda creación/actualización pasa por `services/`.
- Errores con `httpError(status, msg)`.
- Modelos sin `validate: {}`.
- Cliente cancela solo lo suyo: comparar `req.usuario.email` contra `cliente_email` del recurso.

## 8. Tests

Cada endpoint nuevo requiere test Jest en `tests/`. Cobertura mínima por endpoint: camino feliz + un error 4xx por validación de regla de negocio.
