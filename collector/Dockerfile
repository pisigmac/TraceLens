FROM node:22.23.2-alpine3.24 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:22.23.2-alpine3.24
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN apk add --no-cache libcrypto3=3.5.8-r0 libssl3=3.5.8-r0 \
    && npm ci --omit=dev --ignore-scripts \
    && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/proto ./proto
EXPOSE 8080 50051
CMD ["node", "dist/index.js"]
