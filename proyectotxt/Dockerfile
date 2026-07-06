# Imagen base: Python liviano
FROM python:3.11-slim

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Instalamos dependencias primero (aprovecha la caché de Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el resto del proyecto
COPY . .

# La app escucha en el puerto 5000
EXPOSE 5000

# Arrancamos Flask
CMD gunicorn --bind 0.0.0.0:${PORT:-5000} app:app
