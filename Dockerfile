# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src/ ./src/

RUN npm run build

# Production stage
FROM node:20-alpine

RUN addgroup -g 1001 nodejs && \
    adduser -S nodejs -u 1001 && \
    apk add --no-cache tini

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]
