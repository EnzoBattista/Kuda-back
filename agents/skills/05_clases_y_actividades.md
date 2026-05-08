# Skill: Clases, Actividades y Cancelaciones (CEF Actividades)

## Descripción
Esta skill instruye sobre el manejo de las entidades estructurales del centro (actividades y clases) y la política de retención y créditos ante cancelaciones.

## Reglas de Negocio

### 1. Gestión de Actividades y Salas
- **Actividades base**: El sistema debe contemplar por defecto Yoga, Pilates y Funcional. Sin embargo, el administrador debe poder agregar, modificar y eliminar (mediante baja lógica) cualquier actividad a futuro.
- **Baja lógica**: Si una actividad se deja de dictar, se oculta del sistema (no se elimina de la base de datos) permitiendo conservarla en el historial o recuperarla desde una papelera. No se puede eliminar una actividad que tenga clases con clientes inscriptos.
- **Salas**: El recinto posee 3 salas aptas para cualquier tipo de actividad. Al crearlas, se les puede asignar un cupo máximo arbitrario según su capacidad física, y un cupo minimo o igual de 10.
- **Cupo Dinámico**: El cupo dinámico de una clase puede reducirse hasta un mínimo de 10 personas, pero no puede superar bajo ninguna circunstancia el cupo máximo de la sala física donde fue agendada.
- **Clases**: Al agendar una clase se debe especificar actividad, día de la semana, hora de inicio, hora de fin, sala, y el **profesor_id**. El sistema debe impedir que un mismo profesor dicte dos clases que se solapen en horario y fecha, y también evitar solapamientos en la sala. Además, las clases solo pueden dictarse dentro del horario de apertura del gimnasio (entre las 07:00hs y las 22:00hs).

### 2. Políticas de Cancelación (Clientes)
- El cliente tiene un botón autogestionado para cancelar su asistencia a una clase determinada.
- **Crédito por cancelación anticipada**: Si la cancelación se realiza con **más de 24 horas** de antelación al inicio de la clase:
  - Para Abonados: Se le otorga un vale de crédito equivalente al 20-25% de la mensualidad, el cual es válido **exclusivamente para el mes siguiente** (si no renueva al mes siguiente, lo pierde; no se puede usar el mismo mes).
  - Para No Abonados: Se le realiza un reembolso del depósito/seña abonado.
- **Cancelación tardía**: Si la cancelación se hace con **menos de 24 horas** de antelación, se libera el cupo normalmente, pero **no corresponde devolución ni crédito**.

### 3. Ausencia del Profesor
- Si un profesor cancela su clase por razones de fuerza mayor, el sistema no se encarga de esto. La administración conseguirá un reemplazo físico y la clase se dicta igual. El sistema solo modela las cancelaciones iniciadas por los clientes o si un administrador decide eliminar la clase por completo.
