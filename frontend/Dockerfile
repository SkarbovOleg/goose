# Frontend Dockerfile для Goose Messenger
FROM node:18-alpine AS builder

# Устанавливаем зависимости для сборки
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Финальный образ с Nginx
FROM nginx:alpine

# Копируем собранное приложение
COPY --from=builder /app/build /usr/share/nginx/html

# Копируем конфигурацию Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nginxuser
RUN adduser -S nginxuser -u 1001

# Меняем владельца файлов
RUN chown -R nginxuser:nginxuser /usr/share/nginx/html
RUN chown -R nginxuser:nginxuser /var/cache/nginx
RUN chown -R nginxuser:nginxuser /var/log/nginx
RUN chown -R nginxuser:nginxuser /etc/nginx/conf.d

# Делаем директории доступными для записи
RUN touch /var/run/nginx.pid
RUN chown -R nginxuser:nginxuser /var/run/nginx.pid

USER nginxuser

# Открываем порт
EXPOSE 80

# Запускаем Nginx
CMD ["nginx", "-g", "daemon off;"]