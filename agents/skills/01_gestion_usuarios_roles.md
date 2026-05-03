# Skill: Gestión de Usuarios y Roles (CEF Actividades)

## Descripción
Esta skill proporciona las reglas de negocio relacionadas con el registro, gestión y permisos de los distintos usuarios dentro del sistema CEF Actividades.

## Reglas de Negocio

### 1. Roles del Sistema
- **Administrador (Dueño)**: Tiene permisos totales sobre el sistema. Puede visualizar estadísticas, modificar cupos dinámicos, realizar bajas lógicas y gestionar cualquier perfil.
- **Recepcionista**: Empleados administrativos (5 en total). Sus tareas incluyen iniciar sesión, registrar clientes manualmente, cobrar cuotas en mostrador, escanear códigos QR para validar ingresos, denegar accesos (siempre con motivo) y gestionar las listas de espera. Si un recepcionista decide tomar clases, debe tener **dos perfiles diferentes** (uno como recepcionista y otro como cliente).
- **Cliente**: Usuario final. Busca clases, reserva, paga online y autogestiona su código QR de ingreso.
- **Profesor**: Entidad del sistema (no son usuarios con inicio de sesión). Su interacción es únicamente física con el cliente. No tienen perfil en el sistema, pero sí se los registra en la base de datos (nombre, apellido, DNI, actividades) para asociarlos a las clases que dictan.

### 2. Registro de Clientes
- **Autogestión**: El cliente puede y debe registrarse por sí mismo a través del sistema web/app.
- **Restricción de edad**: Todo cliente debe ser **mayor estricto a 14 años** (calculado desde su fecha de nacimiento).
- **Datos obligatorios**: 
  - Nombre y apellido
  - DNI
  - Email (debe ser único)
  - Género
  - Fecha de nacimiento
  - Número de teléfono
  - Contraseña (mínimo 8 caracteres)
  - **Ficha médica** (documento obligatorio; sin ella cargada, el cliente no puede generar su código QR ni acceder).
- **Confirmación**: Se debe enviar un correo electrónico con un enlace de confirmación que expirará a las 48 horas.

### 3. Recuperación de Acceso
- El restablecimiento de la contraseña debe realizarse de forma automatizada mediante el envío de un enlace seguro por email.
- El enlace de recuperación tiene una vigencia de 48 horas desde su envío.
