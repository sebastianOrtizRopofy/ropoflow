FROM node:20-slim

# Instalar dependencias del sistema necesarias para compilar
RUN apt-get update && apt-get install -y \
    build-essential python3 git curl && \
    apt-get clean

# Instalar pnpm
RUN curl -fsSL https://get.pnpm.io/install.sh | SHELL=bash sh && \
    ln -s /root/.local/share/pnpm/pnpm /usr/local/bin/pnpm

# Definir directorio de trabajo
WORKDIR /app

# Copiar tu fork de n8n
COPY . .

# Copiar archivo .npmrc si existe (opcional, para repos privados)
COPY .npmrc .npmrc

# Copiar tu nodo custom al contenedor (ajusta ruta si lo necesitas)
#COPY nodes-custom/n8n-nodes-ropoflow /app/nodes-custom/n8n-nodes-ropoflow

# Instalar dependencias del proyecto
RUN pnpm install --no-frozen-lockfile

# Antes del build: ajustar memoria
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Compilar el proyecto, incluyendo tu nodo custom
RUN pnpm build

# Configuración de autenticación básica
ENV N8N_BASIC_AUTH_ACTIVE=true
ENV N8N_BASIC_AUTH_USER=admin
ENV N8N_BASIC_AUTH_PASSWORD=admin

# Configuración de la base de datos
ENV DB_TYPE=postgresdb
ENV DB_POSTGRESDB_DATABASE=ropoflow-prod
ENV DB_POSTGRESDB_USER=ropofy
ENV DB_POSTGRESDB_PASSWORD=421gy7NR3,Xn
ENV DB_POSTGRESDB_HOST=databases-ropoflow.postgres.database.azure.com
ENV DB_POSTGRESDB_PORT=5432
ENV DB_POSTGRESDB_SSL_ENABLED=true
ENV DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED=false

# Configuración de runners y extensiones
#ENV N8N_CUSTOM_EXTENSIONS=/app/nodes-custom/n8n-nodes-ropoflow
ENV N8N_RUNNERS_ENABLED=true

# Configuración de correo SMTP para n8n
ENV N8N_SMTP_HOST=mail.smtp2go.com
ENV N8N_SMTP_PORT=2525
ENV N8N_SMTP_USER=waas_notifications
ENV N8N_SMTP_PASS=KqMw3fIxUJ4U5BkL
ENV N8N_SMTP_SENDER="waas@noreply.waasropofy.com"
ENV N8N_SMTP_SSL=false

# Configuración de webhook público
ENV WEBHOOK_URL="https://ropoflow-c4acfzgsbqa5bfad.canadacentral-01.azurewebsites.net/"

# Exponer el puerto
EXPOSE 5678

# Comando por defecto: lanzar n8n
CMD ["node", "packages/cli/bin/n8n"]
