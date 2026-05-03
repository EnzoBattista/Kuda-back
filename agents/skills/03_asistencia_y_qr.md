# Skill: Asistencia y Control de QR (CEF Actividades)

## Descripción
Esta skill instruye sobre el manejo de las asistencias, la validación en la puerta de entrada y los requisitos para poder generar el código de acceso.

## Reglas de Negocio

### 1. Generación del Código QR (Cliente)
- El ingreso al centro se realiza mediante el escaneo de un código QR personal generado por la aplicación del cliente.
- **Condiciones obligatorias para generar el QR**:
  1. El usuario debe poseer una **reserva activa** para la clase del día y horario en el que se encuentra.
  2. La cuenta del usuario **no debe estar suspendida** por falta de pago (no haber superado los 10 días de gracia).
  3. El cliente debe tener su **ficha médica cargada** en su perfil.
- Si no se cumple alguna de estas condiciones, el sistema debe ocultar el QR e informar el motivo (ej: "No posee reserva", "Cuota suspendida", "Cargue documento médico").

### 2. Escaneo y Recepción (Recepcionista)
- El recepcionista escaneará el código QR del cliente utilizando la cámara de su dispositivo móvil o tablet.
- El sistema validará la autenticidad y vigencia del código y mostrará en pantalla la **foto del cliente** para una validación visual de identidad.
- **Confirmación de acceso**: Al confirmar, el sistema registra la asistencia en el historial del cliente y actualiza el cupo de la clase. Se descuenta automáticamente el pase.
- **Denegación de acceso**: El recepcionista tiene un botón para denegar la entrada. Al hacerlo, es obligatorio ingresar un motivo (ej: "La identidad no coincide", "Indumentaria inadecuada", etc.). Esta denegación queda registrada en la base de datos.
- **Registro manual**: En caso de que el QR falle o la pantalla del cliente esté rota, el recepcionista puede buscar manualmente al cliente por su DNI en el sistema, verificar sus pagos y ficha médica, y confirmar su asistencia manualmente.

### 3. Historial
- Todas las asistencias exitosas deben guardarse en un historial.
- Tanto el cliente como el administrador/recepcionista podrán acceder a dicho historial para auditar las concurrencias.
