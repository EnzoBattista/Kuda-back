# Guía para Agentes de IA (Cursor, Copilot, Claude, Gemini, etc.)

Este archivo contiene las directrices principales para cualquier asistente de inteligencia artificial que colabore en el desarrollo del proyecto **CEF Actividades (Kuda-back)**. Como agente, debes leer y respetar estrictamente las reglas aquí definidas antes de proponer o escribir cualquier código.

---

## 1. Changelog
*Mantén este registro actualizado cada vez que realices cambios estructurales grandes en el sistema.*

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
- **Rutas (`src/routes/`):** Define los endpoints y asocia los controladores correspondientes. Siempre usa el router de Express (`express.Router()`). Exponer todo mediante `src/routes/index.js`.
- **Controladores (`src/controllers/`):** Manejan la petición (`req`), respuesta (`res`), e interacciones directas con los modelos. Usa SIEMPRE bloques `try/catch` y pasa los errores al middleware global usando `next(error)`.
- **Modelos (`src/models/`):** Modelos definidos con Sequelize. Todas las asociaciones (relaciones entre tablas) deben declararse dentro del método `associate` de cada modelo. Evita definir asociaciones directamente en `db.js`, este archivo ya se encarga de llamar iterativamente al método `associate` de todos los modelos.
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
│   ├── controllers/    # Controladores (Lógica de las peticiones)
│   ├── middleware/     # Middlewares globales y de rutas (CORS, Auth, Errores)
│   ├── models/         # Modelos y schemas de BD (Sequelize)
│   ├── routes/         # Endpoints de la API
│   └── services/       # (Opcional) Lógica de negocio separada
├── .env                # (No en repositorio) Variables de entorno
├── app.js              # Configuración de la aplicación Express
├── db.js               # Conexión e instanciación de Sequelize
├── index.js            # Punto de entrada alternativo/general
└── package.json        # Dependencias y scripts
```
