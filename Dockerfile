FROM postgres:15-alpine

# Instalamos las zonas horarias
RUN apk add --no-cache tzdata

# Configuramos las variables dentro de la imagen
ENV TZ="America/Buenos_Aires"
ENV PGTZ="America/Buenos_Aires"