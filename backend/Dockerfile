FROM node:24-alpine

# Prisma needs openssl at runtime on Alpine.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

EXPOSE 4000

# Apply migrations, ensure an admin exists (idempotent seed), then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node src/server.js"]
