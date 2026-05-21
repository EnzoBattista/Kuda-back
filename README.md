# 🛠️ Gimnasio Kuda - Backend

Guia rapida para levantar el backend sin vueltas.

## 🗄️ Base de Datos

Primero, en tu PostgreSQL local, crea una base de datos llamada:

**`gimnasio_kuda`**

## 📦 Instalacion

En esta misma carpeta (`GimnasioKuda-back-main`), corre:

```bash
npm install
```

## 🔐 Variables de Entorno

Crea un archivo **`.env`** en la raiz del backend y pega este molde:

```env
DB_USER=postgres
DB_PASSWORD=tu_clave
DB_HOST=localhost
DB_NAME=gimnasio_kuda
PORT=3001
MP_ACCESS_TOKEN=tu_token
FRONTEND_URL=http://localhost:4200
```

## 🚀 Arranque

Para prender el backend:

```bash
npm run dev
```

## 🌱 Seeders

Para cargar datos base (actividades, salas, planes, roles y permisos):

```bash
npx sequelize-cli db:seed:all
```

Y listo, con eso ya deberias tener el back andando.