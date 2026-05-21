# Validaciones del Sistema por Historia de Usuario

## Iniciar sesión
* **Validación de cuenta:** La cuenta debe encontrarse en estado "Confirmada".
* **Validación de existencia:** El email ingresado debe existir en la base de datos de usuarios registrados.
* **Validación de credenciales:** La contraseña ingresada debe coincidir exactamente con la contraseña asociada a ese email en el sistema.

## Cerrar sesión
* **Validación de estado:** El usuario debe tener una sesión activa en el sistema.

## Registrar cliente
* **Validación de unicidad de email:** El email ingresado no debe estar previamente registrado en el sistema.
* **Validación de edad mínima:** La edad calculada a partir de la fecha de nacimiento respecto a la fecha actual debe ser estrictamente mayor a 14 años.
* **Validación de longitud de contraseña:** La contraseña ingresada debe tener un mínimo de 8 caracteres.
* **Validación de coincidencia de contraseña:** El campo de "contraseña" y "confirmación de contraseña" deben coincidir exactamente.

## Ver detalle de usuario
* *Sin validaciones lógicas específicas más allá de recuperar la información de la base de datos.*

## Listar reservas actuales
* *Sin validaciones lógicas específicas más allá de la consulta de existencia de reservas.*

## Modificar cliente
* **Validación de edad mínima:** La nueva fecha de nacimiento ingresada debe dar como resultado una edad estrictamente mayor a 14 años.

## Cambiar contraseña
* **Validación de contraseña actual:** La contraseña ingresada como "actual" debe coincidir con la registrada en la base de datos.
* **Validación de nueva contraseña (distinta):** La nueva contraseña no puede ser igual a la contraseña actual.
* **Validación de coincidencia:** La nueva contraseña y su confirmación deben coincidir exactamente.
* **Validación de longitud:** La nueva contraseña debe tener un mínimo de 8 caracteres.

## Envío de enlace vía email para recuperar contraseña
* **Validación de existencia:** El email ingresado debe pertenecer a una cuenta de usuario registrada en el sistema.

## Editar usuario (Administrativo)
* **Validación de unicidad de DNI:** El nuevo DNI ingresado no debe pertenecer a otro usuario ya registrado.
* **Validación de edad mínima:** La fecha de nacimiento modificada debe dar como resultado una edad estrictamente mayor a 14 años.

## Listar usuarios
* *Sin validaciones específicas.*

## Agregar Sala
* **Validación de unicidad de ID:** El identificador asignado a la sala debe ser único y no existir previamente.
* **Validación de cupo mínimo:** El cupo de la sala debe ser mayor o igual a 10.

## Deshabilitar Sala
* **Validación de dependencia:** La sala a deshabilitar no debe tener clases próximas asignadas.

## Modificar Sala
* **Validación de unicidad de ID:** El nuevo identificador no debe pertenecer a otra sala registrada.
* **Validación de consistencia de cupo:** El nuevo cupo de la sala debe ser mayor o igual al cupo máximo de cualquier clase que ya esté asignada a dicha sala.
* **Validación de valor de cupo:** El nuevo cupo debe ser estrictamente mayor a 0.

## Listar Salas / Ver Sala
* *Sin validaciones específicas.*

## Generar QR
* **Validación de reserva activa:** El cliente debe poseer una reserva activa para la clase que se está dictando en el día y horario actual.
* **Validación de estado contable:** El cliente no debe tener su mensualidad suspendida por falta de pago (no debe haber superado los 10 días de gracia).

## Escanear QR
* **Validación de identidad:** Validación visual obligatoria por parte del recepcionista (foto del sistema vs. persona física).
* **Validación de vigencia del QR:** El código QR escaneado debe ser reconocido por el sistema y no encontrarse vencido.

## Anotar asistencia manual
* **Validación de mora:** El cliente no debe tener más de 10 días de mora respecto a su fecha de pago (debe estar al día).
* **Validación de documentación:** El cliente debe tener obligatoriamente su ficha médica cargada en el sistema.
* **Validación de reserva activa:** El cliente debe poseer una reserva activa para el día y horario actual de la clase.

## Listar historial de asistencia
* *Sin validaciones específicas.*

## Reservar Clase abonado (Inscripción)
* **Validación de cupo:** La clase seleccionada debe tener al menos un cupo disponible.
* **Validación de transacción:** El pago asociado a la reserva debe ser procesado y registrado de manera exitosa (no rechazado ni cancelado).

## Cancelar reserva abonados
* **Validación de tiempo de antelación:** El sistema debe verificar si la cancelación se realiza con más o menos de 24 horas de antelación al inicio de la clase para aplicar (o no) el bono de descuento del 20-25% para el próximo mes.

## Listar clases / Ver historial de reservas / Filtrar Reserva por sede
* *Sin validaciones específicas.*

## Eliminar Sala
* **Validación de dependencia:** La sala no debe tener clases próximas asignadas en el sistema.

## Visualizar Reportes (Horarios, Dinero, Usuarios Nuevos)
* *Sin validaciones lógicas específicas más allá de comprobar si existen registros para el rango/año seleccionado.*

## Recuperar contraseña vía enlace
* **Validación de vigencia de token:** El enlace de recuperación debe encontrarse dentro de las 48 horas de vigencia.
* **Validación de validez de token:** El enlace de recuperación debe existir en la base de datos y no haber sido utilizado previamente.
* **Validación de coincidencia:** La nueva contraseña y su confirmación deben coincidir exactamente.

## Listar pagos
* *Sin validaciones específicas.*

## Modificar clase
* **Validación de cupo contra inscriptos:** El nuevo cupo máximo no puede ser menor a la cantidad de alumnos ya inscriptos en la clase.
* **Validación de cupo mínimo:** El nuevo cupo debe ser mayor o igual a 10.
* **Validación de disponibilidad de profesor:** El profesor seleccionado no debe tener otra clase asignada en el mismo día y horario.
* **Validación de disponibilidad de sala:** La sala seleccionada no debe estar ocupada por otra clase en el mismo día y horario.

## Eliminar Clase
* **Validación de inscriptos (Acción consecuente):** El sistema debe verificar si hay alumnos inscriptos para ejecutar la rutina automática de reintegro de clase a cada afectado.

## Generar Comprobante
* **Validación de comunicación API:** La conexión con el gestor externo de información de pagos debe responder exitosamente.

## Activar notificaciones
* *Sin validaciones específicas.*

## Reservar Clase No Abonados
* **Validación de transacción de pago:** El pago (ya sea completo o mediante seña) debe recibir un estado de "Aprobado" desde la pasarela de pagos.

## Registrar Recepcionista
* **Validación de unicidad de email:** El correo electrónico ingresado debe ser único en todo el sistema.

## Ver Total de Usuarios
* *Sin validaciones específicas.*

## Listar historial de asistencia total
* **Validación de existencia:** El DNI ingresado en el buscador debe pertenecer a un usuario registrado en el sistema.

## Remover cliente de lista de espera
* *Sin validaciones específicas.*

## Agregar / Modificar actividad
* **Validación de unicidad de nombre:** El nombre asignado a la actividad debe ser único y no repetirse con otra ya existente.

## Eliminar actividad
* **Validación de dependencia:** La actividad a eliminar no debe tener clases que contengan clientes actualmente inscriptos.

## Listar profesores / Listar actividades
* *Sin validaciones específicas.*

## Agregar Clase
* **Validación de disponibilidad de sala:** La sala asignada no debe estar ocupada en el día y horario estipulados para la nueva clase.
* **Validación de disponibilidad de profesor:** El profesor asignado no debe estar ocupado impartiendo otra clase en ese día y horario.
* **Validación de consistencia de cupo:** El cupo máximo definido para la clase debe ser mayor o igual al cupo mínimo permitido del sistema (10).

## Cancelar Clase
* **Validación de inscriptos (Acción consecuente):** El sistema debe verificar la existencia de inscriptos para procesar la rutina de reintegros automáticos.

## Desactivar notificaciones
* *Sin validaciones específicas.*

## Modificar notificación
* **Validación de rango de días:** El día configurado para el recordatorio de falta de pago debe situarse estrictamente dentro de los 10 días de gracia otorgados por el sistema.

## Cancelar reserva no abonados
* **Validación de tiempo de antelación:** El sistema debe verificar si la cancelación se hace con más de 24 horas de antelación para calcular y aplicar el reembolso correspondiente (33.3%).

## Registrar Profesor
* **Validación de unicidad de DNI:** El número de documento ingresado no debe pertenecer a ningún profesor previamente registrado.

## Modificar Empleado
* **Validación de formato de datos:** El campo "número de teléfono" debe contener únicamente caracteres numéricos.
* **Validación de inmutabilidad:** El campo DNI del empleado está bloqueado y no puede ser modificado una vez registrado.

## Eliminar Empleado / Listar Profesores / Ver Detalle de Empleado
* *Sin validaciones específicas.*

## Registrar Pago
* **Validación de valor de monto:** El monto ingresado a cobrar/registrar debe ser estrictamente mayor a 0.

## Decidir asistencia
* *Sin validaciones específicas (gestión directa de listas y colas).*

## Reservar Clase abonado (Detalle de la clase)
* **Validación de cupo dinámico:** El sistema debe evaluar en tiempo real si el cupo actual es menor al cupo máximo para habilitar el botón "Reservar" o, en su defecto, el botón "Anotarse en lista de espera".

## Agregar Cliente a lista de espera
* **Validación de tipo de cliente:** El sistema debe verificar el estado del cliente para derivarlo a la cola de "abonados" o "no abonados".
* **Validación de redundancia:** El cliente no puede anotarse múltiples veces en la lista de espera de una misma clase.

## Pagar con Mercado Pago
* **Validación de conexión:** La conexión entre el sistema y el servidor de Mercado Pago debe establecerse sin interrupciones.
* **Validación de estado de transacción:** El web-hook o respuesta de Mercado Pago debe devolver un estado "Aprobado" para procesar la reserva.

## Pagar con QR / Notificar cliente manual
* *Sin validaciones específicas.*

## Confirmar registro
* **Validación de vigencia de token:** El enlace de confirmación de cuenta debe ser utilizado dentro de sus 48 horas de vida útil.
* **Validación de validez de token:** El enlace de confirmación debe existir y estar ligado a un usuario en la base de datos.

## Filtrar (Usuarios, Clases, Profesores)
* *Sin validaciones lógicas de bloqueo (las búsquedas ejecutan "like" o coincidencias exactas y devuelven listas vacías si no hay cruces).*

## Modificar precio de actividad
* **Validación de valor:** El nuevo precio a registrar en la actividad debe ser estrictamente mayor a cero.