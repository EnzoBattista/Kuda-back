# Skill: Modalidades y Pagos (CEF Actividades)

## Descripción
Esta skill contiene las reglas financieras del sistema, abarcando cómo pagan los clientes, las diferencias entre modalidades y las reglas estrictas de vencimiento y morosidad.

## Reglas de Negocio

### 1. Modalidades de Cliente
- **Cliente Abonado**:
  - Paga un valor fijo mensual.
  - La suscripción le otorga el derecho a asistir a 4 o 5 clases al mes de **una sola disciplina**.
  - Al momento de pagar, elige un día y horario en específico, el cual se convierte en **fijo e inamovible** por todo ese mes.
  - No existen "combos" de actividades. Si un abonado desea realizar una segunda disciplina, debe pagar una mensualidad aparte de forma independiente.
- **Cliente No Abonado**:
  - Paga únicamente por clase individual de manera suelta.
  - Tiene la opción de pagar el total de la clase de inmediato o realizar una reserva con una **seña del 50%**.
  - **Regla de la seña**: Si abona con seña, tiene hasta **24 horas antes** del inicio de la clase para abonar el 50% restante. Si no lo hace, el sistema cancela la reserva automáticamente y el dinero de la seña es retenido por el centro (no se devuelve). La opción de señar solo se muestra si faltan más de 24 hs para la clase.

### 2. Ciclo de Pagos y Vencimientos
- Las cuotas mensuales se gestionan mediante un **ciclo de 10 días de gracia**.
- Si la fecha de pago es, por ejemplo, el 10 de enero, el cliente tiene tiempo hasta el 20 de enero para abonar su renovación.
- **Notificación (Día 10)**: Al llegar al décimo día de gracia, se le envía un recordatorio de falta de pago (idealmente vía WhatsApp).
- **Suspensión (Día 11)**: Al undécimo día, si el pago no está registrado, el sistema suspende automáticamente la cuenta del usuario impidiendo que ingrese a las clases.

### 3. Métodos y Registros de Pago
- El centro opera **exclusivamente de manera digital** a través de Mercado Pago (API), utilizando transferencia o escaneo de código QR en el local. No se maneja efectivo y no hay descuentos en efectivo.
- El sistema debe llevar un registro contable riguroso: cada pago debe guardar quién pagó, cuánto abonó, la fecha, la hora y qué recepcionista lo cobró/registró. Este registro debe ser exportable a Excel o CSV.
- No es necesario el envío de facturas o comprobantes automáticos al cliente, pero este debe poder visualizar sus pagos en el sistema y generar un comprobante si así lo desea.
