# Code-Sync Production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build frontend
COPY . .
RUN npm run build

# Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install lightweight isolated runtimes for instant execution of all languages on Render
RUN apk add --no-cache python3 py3-pip g++ gcc make openjdk17-jre-headless openjdk17-jdk go rust php php-cli ruby

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/build ./build
COPY --from=builder /app/server.js ./
COPY --from=builder /app/src/Actions.js ./src/

EXPOSE 5000

CMD ["node", "server.js"]
