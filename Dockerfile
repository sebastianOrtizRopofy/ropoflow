FROM node:22-slim

# Opcional: autenticación básica
ENV N8N_BASIC_AUTH_ACTIVE=true
ENV N8N_BASIC_AUTH_USER=admin
ENV N8N_BASIC_AUTH_PASSWORD=admin

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

# Antes del build
ENV NODE_OPTIONS="--max-old-space-size=4096"
# Compilar
RUN pnpm build

EXPOSE 5678
CMD ["node", "packages/cli/bin/n8n"]
