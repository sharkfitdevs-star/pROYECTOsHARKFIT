FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production=false
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production=false
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/index.html ./index.html
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
