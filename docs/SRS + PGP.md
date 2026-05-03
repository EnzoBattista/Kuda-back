# Especificación de requisitos de Software (SRS)
# Plan de Gestión de Proyecto (PGP)
* **Proyecto:** CEF Actividades
* **Identificación:** 005

**Kuda Soluciones IT**

---

## Especificación de Requisitos de Software (SRS)

### 1) Introducción

**a. Propósito y alcance**
El propósito de este documento es definir de manera precisa y detallada todos los requisitos funcionales y no funcionales para el desarrollo del sistema para CEF ACTIVIDADES. Está dirigido tanto a nuestro equipo de desarrollo de Kuda Soluciones IT como a los propietarios del centro, para establecer un acuerdo mutuo sobre las capacidades del software antes de su construcción.

El alcance del sistema comprende la digitalización integral del centro, que actualmente opera de forma manual. El sistema permitirá la gestión de usuarios, empleados, pagos, reservas, clases, espacios y listas de espera, control de asistencia, un sistema de notificaciones por Whatsapp y visualización de reportes. No incluirá, la creación de rutinas de entrenamiento, ya que las mismas se manejan de forma física y presencial. El objetivo principal es reducir la dependencia de la responsabilidad humana y mejorar la satisfacción del cliente frente a la competencia.

**b. Definiciones, acrónimos y abreviaturas a considerar**
Para asegurar un vocabulario compartido se definen los siguientes términos:
* **SRS:** Especificación de requisitos del software
* **QR:** Código de respuesta rápido utilizado para la acreditación automatizada de asistencia
* **Abonado:** Cliente que paga una mensualidad fija por 4 o 5 clases al mes en un horario inamovible.
* **No abonado:** Cliente que reserva y paga de forma independiente por clases individuales.
* **Baja lógica:** Método para ocultar actividades o usuarios del sistema sin eliminarlos permanentemente de la base de datos, permitiendo su recuperación.
* **Requerimientos funcionales:** Son aquellos que definen el comportamiento y las tareas específicas que el sistema debe realizar (por ejemplo: "el sistema debe permitir el cobro por Mercado Pago").
* **Requerimientos no funcionales:** Son los que describen atributos deseables o restricciones del sistema, como el rendimiento, la seguridad, la usabilidad y la portabilidad (por ejemplo: "el escaneo del QR debe ser instantáneo").

**c. Referencias**
Este documento se apoya en la siguiente documentación técnica y de relevamiento:
* IEEE Std 830-1998: Práctica recomendada por IEEE para especificaciones de requisitos de software
* Entrevista de identificación 001 realizada el 12/03/2026 al dueño del centro Jose.
* Entrevista de identificación 002 realizada el 20/03/2026 al dueño del centro Jose.
* Documento de Épicas Identificación 003: Preparado por Kuda Soluciones IT para definir los grandes bloques funcionales del sistema
* Cuestionario con Identificación 004 dirigido a los usuarios del sistema.

---

### 2) Descripción general

**a. Resumen de la idea del producto**
El sistema CEF Actividades es una solución de software diseñada para digitalizar la gestión integral de un centro de bienestar que actualmente opera de forma manual mediante papel. El producto permitirá automatizar el registro de clientes, la gestión de reservas de clases (Yoga, Pilates y Funcional), el cobro de mensualidades y pases individuales a través de Mercado Pago, y la acreditación de asistencia mediante tecnología QR. Además, centralizará la visualización de estadísticas de facturación y ocupación para la toma de decisiones administrativas.

**b. Perspectiva del producto**
Este es un producto independiente y totalmente autónomo desarrollado específicamente para la sede de Parque Chacabuco.
* **Comunicación con otros sistemas:** El sistema se comunicará externamente con la API de Mercado Pago para procesar transacciones financieras y con un servicio de mensajería para enviar notificaciones automáticas por WhatsApp
* **Impacto de fallos:** Los problemas de comunicación con estos sistemas externos afectarían solo a las funcionalidades específicas (como la confirmación inmediata de pagos o el envío de alertas), permitiendo que el resto del sistema siga operativo para tareas de consulta y registro manual por parte del recepcionista

**c. Características de los usuarios**
Se identifican tres roles principales con las siguientes actividades permitidas:

1. **Administrador (Dueño):** Posee permisos totales sobre el sistema.
   * *Actividades:* Visualizar estadísticas y reportes de facturación, modificar cupos dinámicos de clases, realizar bajas lógicas de actividades y gestionar (editar/eliminar) cualquier perfil de usuario.
2. **Recepcionista (5 empleados):** Encargados de la operatividad diaria en el centro.
   * *Actividades:* Iniciar sesión, registrar clientes de forma manual, cobrar cuotas en mostrador, escanear códigos QR para validar el ingreso, denegar accesos con motivo y gestionar las listas de espera.
3. **Cliente (Alumno):** Usuarios finales (mayores de 14 años) que utilizan la aplicación web.
   * *Actividades:* Registrarse autónomamente (subiendo ficha médica), buscar y reservar clases, realizar pagos digitales, generar su QR personal de asistencia y cancelar turnos para obtener créditos.

**d. Evolución previsible del sistema**
Para futuras versiones del producto se contemplan las siguientes mejoras:
* **Escalabilidad:** Expansión del sistema para soportar la gestión de nuevas sucursales y la incorporación de disciplinas deportivas adicionales.
* **Mejoras de experiencia de usuario:** Implementación de un "Modo Nocturno" y soporte multi-idioma (ej. Inglés) detectando el lenguaje del navegador.
* **Marketing e Integración:** Creación de apartados para contacto directo y enlaces a redes sociales comerciales del centro.

---

### 3) Requisitos del Software

#### Requisitos de interfaz

**a. Interfaz de Usuario**
El cliente solicitó una interfaz con un estilo moderno e intuitivo. Se definió que la paleta de colores principal será rojo y azul, acompañando al logo oficial de la marca "CEF Actividades" que ya se encuentra definido.

**b. Interfaz de Software**
El sistema deberá integrarse con dos plataformas externas clave:
* **Mercado Pago:** Se utilizará su API para procesar todos los pagos digitales del centro.
* **WhatsApp:** Se integrará una API de mensajería para automatizar el envío de avisos cuando se libere un cupo en la lista de espera y para notificar el inminente vencimiento de las cuotas.

**c. Interfaz de Hardware**
No se requiere hardware periférico especializado. Se utilizarán las cámaras de los dispositivos móviles (celulares o tablets) del personal de recepción para escanear los códigos QR de asistencia de los clientes.

#### Requisitos funcionales
Registrarse, Inicio de sesión, Cierre de sesión, Ver clientes, Modificar clientes, Eliminar clientes, Modificar contraseñas, Pagar con billetera virtual, Generar comprobantes, Ver pagos, Crear clases, Cancelar y eliminar clases, Ver clases, Modificar clases, Reservar clases, Cancelar reservas, Ver reservas, Filtrar reservas, Toma de asistencia, Ver asistencias, Ver empleados, Eliminar empleados, Crear lista de espera, Agregar clientes a la lista de espera, Hacer avanzar la lista de espera, Notificar créditos a clientes, Notificar recordatorios a clientes, Crear salas, Eliminar salas, Modificar salas, Ver salas, Filtrar estadísticas de usuarios, Filtrar estadísticas de ingresos, Filtrar estadísticas de horarios.

#### Requisitos no funcionales

**Seguridad:**
* **Contraseñas:** no van a estar visibles en ningún lado, se guardan encriptadas en la base de datos.
* **Datos médicos y personales:** la información de la ficha médica debe estar protegida.

**Interfaz:**
* **Uso en celulares:** la parte de clientes tiene que ser responsive (apta para móviles) porque la van a usar para mostrar el QR en la entrada.
* **Diseño:** interfaz moderna e intuitiva, respetando la identidad de CEF Actividades (logo y paleta de colores rojo y azul).

**Rendimiento y concurrencia:**
* **Usuarios en paralelo:** el sistema no se puede tildar. Tiene que aguantar a los 5 recepcionistas operando a la vez, más los clientes usando la app desde el celular (calculando salas de hasta 50 personas).

**Mantenimiento:**
* **Bugs:** el soporte técnico por fallas post-entrega se va a manejar de forma directa vía WhatsApp con los dueños.
* **Nuevos requerimientos:** el plazo de desarrollo es de 3 a 5 meses. Si después de eso piden funcionalidades nuevas, se presupuestan aparte como un nuevo proyecto.

**Integraciones externas:**
* **Pagos:** integración con Mercado Pago para cobros con QR o transferencia.
* **Mensajería:** integración con WhatsApp para automatizar avisos (cuando se libera un cupo en la lista de espera o vencimientos de cuota).

---

## Plan de Gestión de Proyecto (PGP)

### 1) Introducción

**a. Propósito y alcance**
El propósito de este Plan de Gestión de Proyecto (PGP) es definir las estrategias de planificación, estimación de costos, asignación de recursos y gestión de riesgos para el desarrollo del sistema de gestión "CEF Actividades", llevado a cabo por el equipo de desarrollo de Kuda. Este documento está dirigido tanto al equipo técnico (para coordinar el trabajo) como a los dueños de CEF Actividades para su evaluación.

**b. Definiciones, acrónimos y abreviaturas a considerar**
* **PGP:** Plan de Gestión de Proyecto.
* **SRS:** Especificación de Requisitos de Software (Software Requirements Specification).
* **GCS:** Gestión de la Configuración del Software.
* **API:** Interfaz de Programación de Aplicaciones (mecanismo para conectar con servicios como Mercado Pago o WhatsApp).
* **Deuda Técnica:** Costos asociados al aplazamiento de actividades de calidad en el código o documentación, que dificultan el mantenimiento futuro.

**c. Referencias**
* Entrevista 1 (ID 001) - 8/3/2026 - Equipo Kuda
* Entrevista 2 (ID 002) - 13/3/2026 - Equipo Kuda
* Épicas (ID 003) - 2/4/2026 - Equipo Kuda

---

### 2) Planes generales

**a. Entregables del proyecto**
A continuación se detallan los elementos que se entregarán al cliente, incluyendo la documentación técnica y las versiones del producto de software para el "Centro de Actividades", contemplando un plazo de desarrollo estimado de entre 3 y 5 meses:
* **20/03/2026:** Documentación de la Elicitación de Requerimientos. Se hace entrega del documento de la Entrevista 1 y la Entrevista 2 finalizadas, junto con la definición de las épicas del proyecto.
* **17/04/2026:** Documentación formal del proyecto. Se entrega la Especificación de Requisitos de Software (SRS), el Plan de Gestión de Proyecto (PGP) y las historias de usuario detalladas.
* **19/06/2026:** Primera demo del producto. Se entrega una versión preliminar para validar la interfaz gráfica (estética moderna en colores rojo y azul con el logo integrado) y probar flujos críticos como el registro autogestionado de usuarios y la visualización de las actividades (Yoga, Funcional y Pilates).
* **14/08/2026:** Segunda demo del producto y despliegue final. Se entrega la versión completa y productiva del sistema dentro del plazo máximo estipulado. Esta versión incluirá la acreditación de asistencia vía código QR, la gestión de pagos por Mercado Pago, el sistema de listas de espera automatizado por WhatsApp y el panel de reportes estadísticos para la administración. Junto con el software, se entregará el manual de usuario correspondiente para empleados y administradores.

**b. Calendario y resumen del presupuesto**
El equipo de desarrollo cuenta con un período estimado de entre 3 y 5 meses para entregar el producto final completo y funcional. El proyecto requiere de un presupuesto final de 16.960.000 ARS.

En cuanto a las restricciones indicadas por el cliente durante las entrevistas, no se estableció ninguna limitante específica o tope máximo respecto al presupuesto disponible. Sin embargo, en el aspecto temporal, el cliente definió como restricción estricta que el sistema debe estar desarrollado, implementado y listo para ser utilizado por los clientes dentro del margen acordado de 3 a 5 meses.

**c. Plan del personal**
Para llevar a cabo el proyecto del sistema para "CEF Actividades", se requerirá de un equipo compuesto por 5 integrantes. Las tareas se distribuirán entre los miembros del equipo cubriendo los distintos tipos de perfiles técnicos necesarios para el ciclo de vida del software:
* **Analistas Funcionales:** Encargados de la elicitación de requerimientos, diseño de la documentación, modelado del dominio y comunicación constante con el cliente.
* **Desarrolladores Frontend:** Responsables de construir la interfaz gráfica de usuario, asegurando un diseño moderno, intuitivo y estéticamente acorde a la identidad de marca solicitada (colores rojo y azul) para la correcta experiencia de clientes y empleados.
* **Desarrolladores Backend:** Encargados de programar la lógica de negocio, estructurar la base de datos, implementar la seguridad del sistema y realizar las integraciones con servicios externos (como la API de Mercado Pago y el sistema de envíos de mensajes por WhatsApp).
* **Analistas de Calidad (QA) / Testers:** Responsables de realizar pruebas unitarias, de integración y de validación con el usuario para garantizar que no haya fallos críticos, especialmente en el manejo de pagos, cupos de clases y el sistema de acreditación por QR.

---

### 3) Presupuesto

**a. Principales actividades del proyecto**
Para garantizar una entrega iterativa y funcional, el proyecto se divide en las siguientes etapas principales, desglosando el desarrollo en dos Sprints de trabajo:

* **Elicitación de requerimientos:**
  * Reuniones de relevamiento con los dueños del centro para identificar necesidades y procesos actuales.
  * Documentación de entrevistas y definición de los objetivos del sistema.
  * Identificación y redacción de las épicas del proyecto.

* **Análisis y diseño:**
  * Especificación formal de requisitos (SRS) y confección del Plan de Gestión de Proyecto (PGP).
  * Diseño de la arquitectura del sistema y modelado de la base de datos para soportar múltiples modalidades de clientes.
  * Creación de prototipos de interfaz con estilo moderno e intuitivo, utilizando la paleta de colores rojo y azul definida.

* **Desarrollo:**
  * **Sprint 1:**
    * Implementación del módulo de registro autogestionado para clientes mayores de 14 años y gestión de perfiles administrativos.
    * Desarrollo de la ficha médica digital y captura de datos personales obligatorios.
    * Creación del catálogo de actividades (Yoga, Funcional y Pilates) y gestión básica de salas.
    * Lógica de inscripción para clientes abonados (horario fijo) y no abonados (clase suelta).
    * Integración de pagos básicos mediante Mercado Pago y motor de vencimientos (ciclo del día 1 al 10).
    * Pruebas unitarias de los flujos principales de registro y cobro.
  * **Sprint 2:**
    * Desarrollo del sistema de acreditación de asistencia mediante escaneo de código QR personal.
    * Implementación de la lógica de lista de espera automatizada con priorización entre abonados y no abonados.
    * Integración de notificaciones automáticas vía WhatsApp para avisos de vencimiento y liberación de cupos.
    * Lógica de créditos del 20-25% por cancelaciones con 24 horas de antelación.

* **Despliegue:**
  * Desarrollo de tablas exportables a Excel/CSV para el seguimiento contable de los recepcionistas.
  * Panel de estadísticas y reportes exclusivos para la administración (ingresos, concurrencia y cancelaciones).
  * Pruebas de integración y ajustes finales de usabilidad.
  * Configuración del entorno productivo y puesta en marcha del sistema.
  * Capacitación al personal mediante la entrega del manual de usuario para empleados y administradores.

* **Mantenimiento:**
  * Soporte técnico directo vía WhatsApp para la resolución de bugs e incidentes reportados.
  * Monitoreo del rendimiento del sistema durante los primeros meses de uso intensivo.

**b. Asignación de esfuerzo**
A continuación se detalla la estimación del esfuerzo requerido para cada actividad del proyecto, considerando que el equipo está conformado por 5 integrantes que participarán activamente en todas las fases.

| Actividad | Cantidad de personas | Horas (unitario) | Horas totales |
| :--- | :--- | :--- | :--- |
| Elicitación de requerimientos | 5 | 6 | 30 |
| Análisis y diseño | 5 | 20 | 100 |
| Desarrollo (Sprint 1) | 5 | 60 | 300 |
| Desarrollo (Sprint 2) | 5 | 65 | 325 |
| Despliegue | 5 | 8 | 40 |
| Mantenimiento | 5 | 10 | 50 |

**Esfuerzo total del proyecto:** Al sumar los esfuerzos en horas totales de cada una de las actividades, se determina que la cantidad estimada de horas destinadas al proyecto completo es de 845 horas.

**c. Presupuesto final**
Para el cálculo del presupuesto total del proyecto "CEF Actividades", se ha considerado la carga horaria técnica, el valor de la hora profesional del equipo de desarrollo y los costos fijos de infraestructura necesarios para la puesta en marcha del sistema.

* **Cantidad de horas del proyecto:** 845 horas (según lo determinado en la asignación de esfuerzo).
* **Precio por hora:** 20.000 ARS.
* **Recursos adicionales:** 60.000 ARS.
  * Hosting (Plan anual con soporte para bases de datos y tráfico escalable): 48.000 ARS.
  * Dominio (.com.ar por un año): 12.000 ARS.
* **Cálculo del presupuesto:** (845 horas * 20.000 ARS/h) + 60.000 ARS = 16.900.000 ARS + 60.000 ARS
* **Valor del presupuesto total:** 16.960.000 ARS

Este presupuesto contempla el desarrollo completo de los dos Sprints definidos, la integración con plataformas de terceros (Mercadopago y WhatsApp) y el despliegue del sistema en un entorno productivo estable. El cliente no ha manifestado restricciones presupuestarias durante las entrevistas, por lo que se ha priorizado la calidad técnica y la escalabilidad del producto final.

---

### 4) Riesgos
A continuación, se identifican los posibles riesgos del proyecto, su probabilidad de ocurrencia, el impacto que tendrían sobre el desarrollo y quién es el integrante del equipo responsable de gestionarlo.

| Riesgos | Probabilidad | Impacto | Responsable |
| :--- | :--- | :--- | :--- |
| Cambios frecuentes en los requisitos del proyecto (ej. nuevas reglas para cuotas) | Alta | 2 | Battista, Enzo |
| Fallo o inestabilidad en la integración con Mercado Pago | Baja | 2 | Dobal, Federico |
| Fallo o caída del servicio de la API de WhatsApp para notificaciones | Media | 3 | Aufmuth, Álvaro |
| Inconvenientes técnicos con el escaneo de los códigos QR | Media | 3 | Gerli, Facundo |
| Pérdida de información o base de datos corrupta | Baja | 1 | Segobia, Juan Cruz |
| Ausencia por enfermedad de algún integrante del equipo | Media | 3 | Battista, Enzo |

**Clasificación de impactos:**
* 1 = Muy grave
* 2 = Grave
* 3 = Moderado
* 4 = Leve

**Plan de mitigación:**
* **Cambios frecuentes en los requisitos del proyecto:** Se firmará un acta de acuerdo con los requerimientos finales aprobados tras las entrevistas. Se utilizarán las demos pactadas para mostrar avances visuales rápidos y evitar sorpresas al final del ciclo de desarrollo.
* **Fallo o inestabilidad en la integración con Mercado Pago:** Se utilizará la documentación y SDK oficial de Mercado Pago, realizando pruebas intensivas en el entorno de sandbox (pruebas) antes de pasar el sistema a producción para evitar errores de facturación.
* **Fallo o caída del servicio de la API de WhatsApp para notificaciones:** Se utilizará un proveedor oficial y estable para enviar los avisos automáticos de cuotas por vencer y liberación de cupos en lista de espera. Además, se programarán alertas internas si los envíos fallan consecutivamente.
* **Inconvenientes técnicos con el escaneo de los códigos QR:** Se diseñarán los códigos QR desde la aplicación web con un tamaño y contraste adecuados para facilitar su lectura en recepción. Se le indicará visualmente al cliente que suba el brillo de su pantalla.
* **Pérdida de información o base de datos corrupta:** Se implementarán respaldos (backups) automáticos de manera periódica alojados en servidores en la nube. Todo el código del proyecto se mantendrá versionado mediante herramientas como Git.
* **Ausencia por enfermedad de algún integrante del equipo:** Se mantendrá un código limpio y documentado para que cualquier miembro pueda entender el trabajo del otro. El equipo realizará reuniones de sincronización semanales para compartir el estado de las tareas.

**Plan de contingencia:**
* **Cambios frecuentes en los requisitos del proyecto:** Si el cliente solicita un cambio no contemplado que afecta la entrega de los 3 a 5 meses, se evaluará su impacto en tiempo. Si es crítico, se reordenarán las tareas y se dejará otra funcionalidad menor para una futura actualización.
* **Fallo o inestabilidad en la integración con Mercado Pago:** Si la pasarela sufre una caída general y los clientes no pueden abonar, se habilitará un botón temporal para registrar una "seña o pago en revisión", permitiendo que el cliente asista y que el recepcionista concilie el pago más tarde cuando vuelva el servicio.
* **Fallo o caída del servicio de la API de WhatsApp para notificaciones:** Si el sistema de envíos de WhatsApp deja de funcionar, se proveerá en el panel del recepcionista una lista clara de a qué clientes contactar y qué mensaje mandar para que puedan realizar el aviso manualmente.
* **Inconvenientes técnicos con el escaneo de los códigos QR:** En caso de que el celular del cliente tenga la pantalla rota o la cámara del recepcionista falle, se dispondrá de un buscador manual en el sistema que le permita al recepcionista buscar al cliente por DNI o nombre y marcar su asistencia manualmente.
* **Pérdida de información o base de datos corrupta:** Ante una pérdida parcial o total, se pondrá el sistema en modo "mantenimiento" y se procederá a restaurar el último backup estable. Se le avisará transparentemente al cliente sobre el incidente y se registrarán manualmente los movimientos ocurridos en el ínterin.
* **Ausencia por enfermedad de algún integrante del equipo:** Las tareas urgentes asignadas a la persona ausente se redistribuirán temporalmente entre el resto del equipo, dándole prioridad estricta al desarrollo de las funcionalidades críticas para no retrasar el Sprint.