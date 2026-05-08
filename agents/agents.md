# Guía para Agentes de IA (Cursor, Copilot, Claude, Gemini, etc.)

Este archivo contiene las directrices principales para cualquier asistente de inteligencia artificial que colabore en el desarrollo del proyecto **CEF Actividades (Kuda-back)**. Como agente, debes leer y respetar estrictamente las reglas aquí definidas antes de proponer o escribir cualquier código.

---

## 1. Changelog
*Mantén este registro actualizado cada vez que realices cambios estructurales grandes en el sistema.*

- **[2026-05-07]**: Refactorización profunda de modelos y validaciones: Eliminación de `Empleado`. El modelo `Usuario` centraliza el acceso. El modelo `Cliente` se convierte en una tabla hija de `Usuario` (relación 1:1 vía `usuario_email`). Todas las validaciones a nivel base de datos (`validate: {}`) se extrajeron hacia los archivos en `/src/services/` para asegurar que el control ocurra previo a interactuar con Sequelize. Se agregaron validaciones de negocio estrictas a las clases (límite 4 horas, prohibido domingos, horario 07-22hs).
- **[2026-05-07]**: Reorganización de `src/` por dominio dentro de cada capa (`acceso/`, `catalogo/`, `clases/`, `pagos/`). Nueva carpeta `src/utils/` con helpers reutilizables (`httpError`, `fechas`). `db.js` escanea modelos recursivamente. Actividades y planes solo se cargan vía seeders (sin endpoints CRUD).
- **[2026-05-03]**: Implementación de la entidad `Profesor` (modelo, controlador, rutas) y actualización de relaciones con `Clase` y `Actividad`.
- **[2026-05-03]**: Creación del directorio `agents/skills` para documentar la lógica de negocio mediante archivos Markdown.
- **[Pre-Mayo 2026]**: Scaffolding inicial con Node.js, Express y Sequelize. Creación de entidades base (Usuario, Sala, Clase, Actividad).

---

## 2. Project Rules
*Reglas técnicas y convenciones de código.*

### Stack Tecnológico
- **Backend:** Node.js + Express.js.
- **Base de Datos:** PostgreSQL.
- **ORM:** Sequelize.

### Arquitectura y Convenciones
- El proyecto sigue un patrón MVC orientado a controladores y rutas, contenido íntegramente dentro de la carpeta `src/`.
- **Organización por dominio:** dentro de cada capa (`models/`, `controllers/`, `services/`, `routes/`) los archivos se agrupan en subcarpetas por dominio: `acceso/` (usuario, rol, permisos, auth), `catalogo/` (actividad, sala, sucursal, profesor, plan), `clases/` (clase, mensualidad, claseIndividual), `pagos/`.
- **Rutas (`src/routes/`):** Define los endpoints y asocia los controladores correspondientes. Siempre usa el router de Express (`express.Router()`). Exponer todo mediante `src/routes/index.js`.
- **Controladores (`src/controllers/`):** Manejan la petición (`req`), respuesta (`res`). **Importante:** No deben interactuar directamente con `Modelo.create` o `Modelo.update`. Toda creación o actualización debe pasar por los **Servicios**. Usa SIEMPRE bloques `try/catch` y pasa los errores al middleware global usando `next(error)`.
- **Servicios (`src/services/`):** Capa intermedia obligatoria. Contienen **todas** las validaciones y reglas de negocio (`validarX`, `crearX`, `actualizarX`). Lanzan `httpError` ante datos inválidos.
- **Modelos (`src/models/`):** Modelos definidos con Sequelize. Todas las asociaciones deben declararse dentro del método `associate` de cada modelo. `db.js` escanea recursivamente. **Regla de Arquitectura:** Los modelos NO deben contener bloques `validate: {}` propios de Sequelize; la validación ocurre en `services`.
- **Utilidades (`src/utils/`):** helpers reutilizables. Para errores HTTP usá `throw httpError(status, mensaje)` en lugar de construir el `Error` a mano. Para fechas, `calcularEdad` y `sumarUnMes`.
- **Datos base por seeders:** las actividades, salas, planes, roles y permisos se cargan exclusivamente desde `seeders/`. NO existen endpoints CRUD para crearlos (decisión de producto: el catálogo es estable y se versiona como parte del despliegue).
- **Respuestas HTTP:** Utiliza los códigos de estado HTTP correctos (`200` OK, `201` Created, `400` Bad Request, `404` Not Found, `409` Conflict). Retorna SIEMPRE objetos JSON estructurados con mensajes descriptivos.

---

## 3. Agent Skills
*Contexto de Negocio.*

Las reglas de negocio de **CEF Actividades** son estrictas y difieren de otros sistemas genéricos de gestión de gimnasios. Antes de modificar lógica de reservas, listas de espera, pagos o cobros, **debes leer imperativamente** los archivos de contexto (Skills) ubicados en la carpeta `agents/skills/`.

Asegúrate de consultar el archivo apropiado según la tarea:
- `01_gestion_usuarios_roles.md`: Permisos de usuarios, roles, y obligaciones en el registro (fichas médicas, edad, DNI).
- `02_modalidades_y_pagos.md`: Diferencias entre Abonados y No Abonados, ciclo de pagos de 10 días, políticas de seña del 50%.
- `03_asistencia_y_qr.md`: Generación y validación del código QR de ingreso, e historial de acceso.
- `04_listas_espera_y_notificaciones.md`: Separación de colas (abonados/no abonados) y ventana de 6 horas post-notificación.
- `05_clases_y_actividades.md`: Cupos dinámicos, restricciones de solapamiento y política de vale de 20-25% por cancelación anticipada (+24 hs).

---

## 4. Project Layout
*Estructura del Repositorio.*

```text
/
├── agents/             # Documentación y contexto para Agentes de IA
│   └── skills/         # Archivos de reglas de negocio (.md)
├── bin/                # Scripts de inicio del servidor (ej. www)
├── config/             # Configuraciones del proyecto / variables
├── docs/               # Documentación cruda del proyecto (SRS, Entrevistas, Historias de Usuario)
├── public/             # Archivos estáticos accesibles públicamente
├── seeders/            # Scripts para sembrado/población inicial de la BD
├── src/                # Código fuente principal de la aplicación
│   ├── constants/      # Constantes compartidas (roles, permisos)
│   ├── controllers/    # Controladores agrupados por dominio
│   │   ├── auth/
│   │   ├── usuarios/
│   │   ├── catalogo/   # planes, profesores
│   │   ├── clases/     # clases, mensualidades, clasesIndividuales
│   │   └── pagos/
│   ├── middleware/     # Middlewares (auth.middleware, requirePermiso)
│   ├── models/         # Modelos Sequelize agrupados por dominio (Sin bloques validate)
│   │   ├── acceso/     # usuario, rol, rolPermiso, permiso, cliente
│   │   ├── catalogo/   # actividad, sala, sucursal, profesor, plan
│   │   ├── clases/     # clase, mensualidad, pagoClaseIndividual
│   │   └── pagos/      # pago
│   ├── routes/         # Endpoints (subcarpetas espejo de controllers)
│   ├── services/       # Lógica de negocio y Validaciones (acceso, catalogo, clases, pagos)
│   └── utils/          # Helpers reutilizables (httpError, fechas)
├── .env                # (No en repositorio) Variables de entorno
├── app.js              # Configuración de la aplicación Express
├── db.js               # Conexión e instanciación de Sequelize
├── index.js            # Punto de entrada alternativo/general
└── package.json        # Dependencias y scripts
```
