# Estágio 1: Build do Frontend Vite
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Estágio 2: Runner com Servidor Node.js + MCP + Frontend
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/mcp-server ./mcp-server
COPY --from=builder /app/src ./src

EXPOSE 3000

CMD ["node", "mcp-server/index.js"]
