FROM node:22-slim

# Opcional: autenticación básica
ENV N8N_BASIC_AUTH_ACTIVE=true
ENV N8N_BASIC_AUTH_USER=admin
ENV N8N_BASIC_AUTH_PASSWORD=admin

# Configuración de DB
ENV DB_TYPE=postgresdb
ENV DB_POSTGRESDB_DATABASE=ropoflow-prod
ENV DB_POSTGRESDB_USER=ropofy
ENV DB_POSTGRESDB_PASSWORD=421gy7NR3,Xn
ENV DB_POSTGRESDB_HOST=databases-ropoflow.postgres.database.azure.com
ENV DB_POSTGRESDB_PORT=5432
ENV DB_POSTGRESDB_SSL_ENABLED=true
ENV DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED=false

# Configuración de runners y extensiones
ENV N8N_CUSTOM_EXTENSIONS=/nodes-custom/n8n-nodes-impulsa
ENV N8N_RUNNERS_ENABLED=true

# Webhook público
ENV WEBHOOK_URL="https://ropoflow-c4acfzgsbqa5bfad.canadacentral-01.azurewebsites.net/"

# Antes del build
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN apt-get update && apt-get install -y \
    build-essential python3 git curl && apt-get clean

# Instalar pnpm
RUN curl -fsSL https://get.pnpm.io/install.sh | SHELL=bash sh && \
    ln -s /root/.local/share/pnpm/pnpm /usr/local/bin/pnpm

WORKDIR /app
COPY . .
COPY .npmrc .npmrc

# Instalar dependencias
RUN pnpm install --no-frozen-lockfile

# Compilar
RUN pnpm build

EXPOSE 5678
CMD ["node", "packages/cli/bin/n8n"]
