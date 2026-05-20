# Skill: Clases, Actividades y Cancelaciones (CEF Actividades)

## Descripción
Esta skill instruye sobre el manejo de las entidades estructurales del centro (actividades y clases) y la política de retención y créditos ante cancelaciones.

## Reglas de Negocio

### 1. Gestión de Actividades y Salas
- **Actividades base**: El sistema debe contemplar por defecto Yoga, Pilates y Funcional. Sin embargo, el administrador debe poder agregar, modificar y eliminar (mediante baja lógica) cualquier actividad a futuro.
- **Baja lógica**: Si una actividad se deja de dictar, se oculta del sistema (no se elimina de la base de datos) permitiendo conservarla en el historial o recuperarla desde una papelera. No se puede eliminar una actividad que tenga clases con clientes inscriptos.
- **Salas**: Al crearlas o modificarlas, se les debe asignar un cupo máximo. El cupo de una sala siempre debe ser **mayor o igual a 10**, y no puede ser menor al cupo de las clases que ya tenga asignadas. No se pueden deshabilitar ni eliminar salas que tengan clases asignadas próximas.
- **Clases**: Al agendar una clase se debe especificar actividad, día de la semana, hora de inicio, hora de fin, sala, y el **profesor_id**. El sistema debe impedir que un mismo profesor dicte dos clases que se solapen en horario y fecha, y también evitar solapamientos en la sala. El cupo máximo de la clase debe ser mayor o igual al mínimo (10). Además, las clases solo pueden dictarse dentro del horario de apertura del gimnasio (entre las 07:00hs y las 22:00hs).

### 2. Políticas de Cancelación (Clientes)
- El cliente tiene un botón autogestionado para cancelar su asistencia a una clase determinada.
- **Crédito por cancelación anticipada**: Si la cancelación se realiza con **más de 24 horas** de antelación al inicio de la clase:
  - Para Abonados: Se le otorga un vale de crédito equivalente al 20-25% de la mensualidad, el cual es válido **exclusivamente para el mes siguiente** (si no renueva al mes siguiente, lo pierde; no se puede usar el mismo mes).
  - Para No Abonados: Se le realiza un reembolso del depósito/seña abonado.
- **Cancelación tardía**: Si la cancelación se hace con **menos de 24 horas** de antelación, se libera el cupo normalmente, pero **no corresponde devolución ni crédito**.

### 3. Ausencia del Profesor o Eliminación de Clase
- Si un profesor cancela su clase por razones de fuerza mayor, el sistema no se encarga de esto directamente. La administración conseguirá un reemplazo físico y la clase se dicta igual.
- Sin embargo, si un administrador decide **cancelar o eliminar la clase** por completo, el sistema procederá a cancelar la clase y **reintegrará a cada cliente afectado** la clase correspondiente a su pase/mensualidad.
