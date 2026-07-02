# Seed manual testing — Gimnasio Kuda

Comando para **resetear y cargar** el entorno de prueba:

```bash
cd GimnasioKuda-back-main
npm run seed:demo-full
```

**Contraseña de todos los usuarios:** `12345678`

---

## Qué deja el seed

| Dato | Detalle |
|------|---------|
| Actividades | Yoga, Pilates, Funcional ($10.000 c/u) |
| Usuarios de prueba | 1 dueño + 1 recepcionista + 3 clientes |
| Vales | 9 total — 1 por actividad × cada cliente, vigencia **julio 2026** |
| Lista de espera | **Una sola clase** llena 10/10 (ver abajo) |
| Gracia global | 1 día (`configuracion_sistema`), recordatorio global día 1 |

---

## Usuarios de prueba (@yopmail.com)

| Rol | Email |
|-----|-------|
| Dueño | `dueno@yopmail.com` |
| Recepcionista | `recepcion@yopmail.com` |
| Cliente 1 | `cliente1@yopmail.com` |
| Cliente 2 | `cliente2@yopmail.com` |
| Cliente 3 | `cliente3@yopmail.com` |

### Cuentas técnicas de cupo (no usar en la demo)

Para llenar **10/10** en la clase de lista de espera existen:

`ocupante1@yopmail.com` … `ocupante10@yopmail.com` — misma contraseña.

Solo ocupan lugar; **no** son clientes de prueba para recorrer historias.

---

## Vales (julio 2026)

Cada cliente tiene **3 vales INDIVIDUAL** (uno por actividad):

| Actividad | Clase del vale | Vigencia |
|-----------|----------------|----------|
| Yoga | Yoga — Jueves 19:00 | 01/07/2026 – 31/07/2026 |
| Pilates | Pilates — Martes 10:00 | 01/07/2026 – 31/07/2026 |
| Funcional | Funcional — Miercoles 11:00 | 01/07/2026 – 31/07/2026 |

Monto del vale: precio individual de la actividad (cubre la clase suelta).

---

## Lista de espera (única clase sin cupo)

| Campo | Valor |
|-------|-------|
| Clase | **Yoga — Jueves 19:00** |
| Cupo | 10 |
| Fecha llena | **2026-07-02** (10/10 reservas) |
| Quién prueba | `cliente1@`, `cliente2@` o `cliente3@` — ninguno tiene reserva ese día |

**Flujo:** reservar Yoga individual el **02/07/2026** → cupo lleno → alta en **lista de espera**.

---

## Escenarios sugeridos — Jueves 19:00

Clase ancla: **Yoga — Jueves 19:00** (ventana QR: 18:30 – 19:30).

| # | Escenario | Quién | Qué probar |
|---|-----------|-------|------------|
| 1 | Lista de espera | `cliente1@yopmail.com` | Yoga el **02/07/2026** → lista de espera |
| 2 | Reserva con vale | `cliente2@yopmail.com` | Otra fecha de Yoga con vale |
| 3 | Otra actividad | `cliente3@yopmail.com` | Pilates o Funcional con su vale |
| 4 | Generar QR | Cliente con reserva | Ventana 18:30–19:30 |
| 5 | Escanear QR | `recepcion@yopmail.com` | Asistencia registrada |
| 6 | Asistencia manual | `recepcion@yopmail.com` | Yoga 19:00 |
| 7 | Liberar cupo | `dueno@yopmail.com` | Cancelar ocupante el 02/07 → lista avanza |
| 8 | Pagos | Admin | Listar pagos y comprobante |

---

## Pipeline de seeders (`seed:demo-full`)

1. `roles-permisos`
2. `actividades-salas`
3. `profesores`
4. `clases`
5. `recepcionista-clase-gestionar`
6. **`demo-full-manual`** — reset + usuarios + vales + cupo 10/10

---

## Notas

- Para repetir el reset: volver a ejecutar `npm run seed:demo-full`.
- Fecha del sistema en un **jueves de julio 2026** facilita QR y asistencia manual.
- Escenario opcional mensualidad anticipada: `npm run seed:mensualidad-demo` (si existe).
