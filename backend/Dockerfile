# Backend Dockerfile для Goose Messenger
FROM node:18-alpine AS builder

# Устанавливаем зависимости для сборки
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S goose -u 1001

# Меняем владельца файлов
RUN chown -R goose:nodejs /app

USER goose

# Финальный образ
FROM node:18-alpine

WORKDIR /app

# Копируем node_modules и исходный код из builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

# Создаем пользователя
RUN addgroup -g 1001 -S nodejs
RUN adduser -S goose -u 1001
RUN chown -R goose:nodejs /app

USER goose

# Создаем директории для логов и загрузок
RUN mkdir -p logs uploads

# Открываем порт
EXPOSE 5000

# Команда запуска
CMD ["node", "src/server.js"]