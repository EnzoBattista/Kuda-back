# Guión de demo — orden sugerido (impacto → administrativo)

Basado en `Guion-ING 2.pdf`, reordenado para mostrar **primero lo que vende** (MP, QR, lista de espera) y **al final lo repetitivo** (filtros, ABM, reportes).

**Reset antes de la demo:**
```bash
cd GimnasioKuda-back-main && npm run seed:demo-full
cd GimnasioKuda-frontend-main && npm run start:all
```

**Contraseña universal:** `12345678`

| Rol | Email |
|-----|-------|
| Dueño | `dueno@yopmail.com` |
| Recepcionista | `recepcion@yopmail.com` |
| Cliente 1 | `cliente1@yopmail.com` |
| Cliente 2 | `cliente2@yopmail.com` |
| Cliente 3 | `cliente3@yopmail.com` |

**Setup recomendado (jueves demo):**
- Fecha del sistema: **jueves de julio 2026** (ideal: **02/07/2026** → cupo lleno precargado).
- Hora del sistema: **18:45** → ventana QR activa para **Yoga — Jueves 19:00** (18:30–19:30).
- Celular recepción: escáner por **HTTPS puerto 4201** si hace falta cámara.

---

## Apertura (2 min) — cualquiera

| # | Qué decir / hacer | HU ref |
|---|-------------------|--------|
| 0 | Presentar roles: cliente reserva y paga → recepción escanea QR → dueño ve pagos/reportes | #69 |
| 0b | Mencionar seed: 3 actividades, 3 clientes, vales julio, **Yoga Jueves 19:00 10/10** el 02/07 | — |

---

## BLOQUE 1 — Lo fuerte (15–20 min) ⭐

### 1.1 Reserva + Mercado Pago + vale
| Paso | Usuario | Acción | HU |
|------|---------|--------|-----|
| 1 | `cliente2@yopmail.com` | Login → **Clases** → elegir **Yoga — Jueves 19:00** en fecha **libre** (no 02/07) → **Individual** → aplicar **vale Yoga** → **Pagar con Mercado Pago** | #47, #82 |
| 2 | — | Completar pago MP (sandbox) → toast éxito reserva | #82 |
| 3 | `cliente3@yopmail.com` | Reservar **Pilates — Martes 10:00** o **Funcional — Miercoles 11:00** con su vale (segunda reserva en vivo) | #47, #82 |

### 1.2 Lista de espera (cupo lleno precargado)
| Paso | Usuario | Acción | HU |
|------|---------|--------|-----|
| 4 | `cliente1@yopmail.com` | **Yoga — Jueves 19:00** → fecha **02/07/2026** → cupo lleno → **Lista de espera** | #80 |
| 5 | `dueno@yopmail.com` | (Opcional) Panel lista de espera → ver cliente1 | #53 |

### 1.3 QR cliente → recepción (momento estrella)
| Paso | Usuario | Acción | HU |
|------|---------|--------|-----|
| 6 | `cliente2@yopmail.com` | **Asistencia → Generar QR** (con reserva de hoy en ventana horaria) | #26 |
| 7 | `recepcion@yopmail.com` | **Asistencia → Escanear QR** → apuntar cámara → toast **"Asistencia registrada con éxito"** | #27 |
| 8 | — | (Opcional fail) Escanear fuera de 18:30–19:30 → **"El código QR está vencido"** | #27 |
| 9 | `cliente2@yopmail.com` | **Asistencia → Historial** → ver registro | #29 |

### 1.4 Reserva abonada (si hay tiempo)
| Paso | Usuario | Acción | HU |
|------|---------|--------|-----|
| 10 | `cliente3@yopmail.com` | Reservar **mensual** en clase fija → pago MP | #30, #82 |
| 11 | — | **Mis reservas** → detalle abonado vs individual | #91, #90 |

### 1.5 Pagos y comprobante (cierre del bloque fuerte)
| Paso | Usuario | Acción | HU |
|------|---------|--------|-----|
| 12 | `dueno@yopmail.com` | **Pagos** → listado → **Generar comprobante** de un pago | #41, #45 |
| 13 | `recepcion@yopmail.com` | (Si aplica) **Registrar pago** manual / **Pagar con QR** MP en mostrador | #75, #83 |

---

## BLOQUE 2 — Operación del día (8–10 min)

| Paso | Usuario | Acción | HU |
|------|---------|--------|-----|
| 14 | `recepcion@yopmail.com` | **Asistencia manual** → **Yoga — Jueves 19:00** → Presente/Ausente → toast éxito | #28 |
| 15 | `dueno@yopmail.com` | **Historial asistencia** → filtros DNI / actividad / fechas / hora | #29, #51 |
| 16 | `dueno@yopmail.com` | Cancelar reserva de un **ocupante** el 02/07 → liberar cupo → lista de espera avanza | #31, #53 |
| 17 | `cliente1@yopmail.com` | Verificar promoción / reserva confirmada desde lista de espera | #80 |
| 18 | `cliente1@yopmail.com` | **Mis reservas** → listado → **Cancelar** (abonado o individual) | #31, #67 |
| 19 | `dueno@yopmail.com` | **Clientes** → **Modificar recordatorio** días de gracia (día 5) → "Recordatorio modificado" | #65 |

---

## BLOQUE 3 — ABM y configuración (8 min) — “el sistema se administra solo”

### Actividades y precios
| Paso | Usuario | Acción | HU |
|------|---------|--------|-----|
| 20 | `dueno@yopmail.com` | Listar actividades → modificar precio / descripción | #61, #58, #89 |
| 21 | — | Agregar actividad (opcional, revertir después) | #57 |

### Empleados
| Paso | Usuario | Acción | HU |
|------|---------|--------|-----|
| 22 | `dueno@yopmail.com` | Registrar profesor → listar → ver detalle → modificar | #1, #72, #74, #70 |
| 23 | — | Registrar recepcionista → modificar | #2, #93 |
| 24 | — | Eliminar profesor / recepcionista (solo si no rompe clases) | #9, #94 |

### Salas
| Paso | Usuario | Acción | HU |
|------|---------|--------|-----|
| 25 | `dueno@yopmail.com` | Listar salas → modificar cupo → habilitar/deshabilitar | #24, #23, #98, #22 |
| 26 | — | Agregar / eliminar sala (opcional) | #21, #36 |

### Notificaciones
| Paso | Usuario | Acción | HU |
|------|---------|--------|-----|
| 27 | `cliente1@yopmail.com` | **Mi información** → activar/desactivar notificaciones | #46, #64 |
| 28 | `dueno@yopmail.com` | Notificar cliente manual (email) | #65 |

---

## BLOQUE 4 — Filtros y reportes (5 min, al final) 🥱

> Mostrar solo 1–2 de cada grupo; no recorrer todo.

| Paso | Usuario | Acción | HU |
|------|---------|--------|-----|
| 29 | `dueno@yopmail.com` | **Reservas** → filtrar por cliente / fecha | #34, #15 |
| 30 | — | **Profesores** → filtrar por actividad | #88, #5 |
| 31 | — | **Pagos** → filtrar por email / rango fechas | #41 |
| 32 | — | **Reportes** → horarios más elegidos | #37 |
| 33 | — | Reporte dinero ingresado | #38 |
| 34 | — | Reporte usuarios nuevos + total usuarios | #39, #50 |

---

## Cierre (1 min)

- Recapitular: **reserva digital → pago MP → QR → asistencia trazada → comprobante → reportes**.
- Mencionar pendientes si preguntan: recordatorio automático días de gracia (cron), WhatsApp.

---

## Reparto sugerido por persona (si presentan en trio)

| Persona | Bloques | Rol en pantalla |
|---------|---------|-----------------|
| **Facu** | 1.1 – 1.2 – 1.4 (cliente + MP + lista espera) | Cliente en celular / notebook |
| **Enzo** | 1.3 – 1.5 – Bloque 2 (QR + asistencia + pagos) | Recepcionista + dueño pagos |
| **Fede** | Bloque 3 – 4 (ABM + filtros/reportes) | Dueño administración |

Si son **uno solo**: seguir orden Bloque 1 → 2 → saltar 3 → mostrar 2 reportes del 4.

---

## Cheat sheet rápido (jueves 19:00)

```
Yoga — Jueves 19:00
├── 02/07/2026 → 10/10 → lista de espera (cliente1)
├── Otra fecha jueves → libre → reservar + vale (cliente2)
└── QR ventana: 18:30 – 19:30 del día de la reserva

Vales julio (todos los clientes):
├── Yoga      → Yoga — Jueves 19:00
├── Pilates   → Pilates — Martes 10:00
└── Funcional → Funcional — Miercoles 11:00
```

---

## Mapa PDF original → nuevo orden

| Nuevo bloque | HUs del PDF |
|--------------|-------------|
| 1 fuerte | #82, #83, #47, #30, #80, #26, #27, #28, #29, #41, #45, #75 |
| 2 operación | #28, #29, #51, #31, #53, #67, #65, #15, #34 |
| 3 ABM | #57–#61, #1–#10, #21–#24, #46, #64, #65 |
| 4 filtros/reportes | #5, #34, #37–#39, #50, #88, #90, #91 |
