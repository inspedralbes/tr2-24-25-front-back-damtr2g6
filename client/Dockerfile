# Usar una imagen base de Node.js
FROM node:20

# Establecer el directorio de trabajo en el contenedor
WORKDIR /app

# Copiar el package.json y package-lock.json para instalar dependencias
# Se copia por separado para aprovechar el cache de Docker
COPY package*.json ./

# Instalar las dependencias del proyecto
RUN npm install

# Copiar el resto de los archivos de la aplicación
COPY . .

# Exponer el puerto en el que correrá el frontend de desarrollo
EXPOSE 3000

# El comando para iniciar el servidor de desarrollo se especifica
# en el docker-compose.yml para poder pasarle los flags --host y --port
CMD ["npm", "run", "dev"]
