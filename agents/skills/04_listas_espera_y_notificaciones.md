# Skill: Listas de Espera y Notificaciones (CEF Actividades)

## Descripción
Esta skill abarca la lógica utilizada para manejar el exceso de demanda en las clases mediante listas de espera, y las notificaciones automáticas conectadas a este flujo.

## Reglas de Negocio

### 1. Colas de Espera Divididas
- Cuando el cupo máximo de una clase se llena, el sistema habilita un botón para "Anotarse en lista de espera".
- Existen **dos listas de espera separadas** por cada clase:
  1. Lista de Espera para Abonados.
  2. Lista de Espera para No Abonados.

### 2. Prioridad y Avance de Lista
- El algoritmo de liberación de cupos es el siguiente:
  - Si un usuario que cancela o se da de baja tenía un pase **Abonado** (cupo mensual fijo), el sistema avanza primero buscando en la **lista de abonados**.
  - Si quien cancela era un **No Abonado** (reserva puntual para ese día), el sistema avanza buscando en la **lista de no abonados**.
- Si no hay nadie en la lista correspondiente, el cupo queda libre para todo público.

### 3. Notificación de Cupo y Tiempo Límite
- Cuando se libera un lugar y es el turno de un cliente en lista de espera, el sistema le notifica automáticamente (vía WhatsApp).
- A partir del momento de la notificación, el cliente dispone de **6 horas cronometradas** para efectuar el pago y asegurar su reserva.
- Si el cliente rechaza explícitamente el lugar mediante un botón en el sistema, o si expira el plazo de 6 horas, el sistema lo elimina de la lista y notifica automáticamente a la siguiente persona en la cola.

### 4. Remover Clientes de Espera
- El personal administrativo (Recepcionista o Dueño) tiene permisos para suprimir manualmente a un cliente de la lista de espera, para forzar el avance de la misma si fuera necesario. Al hacerlo, se le notifica por WhatsApp al cliente removido.
