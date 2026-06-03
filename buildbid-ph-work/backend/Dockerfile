FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

RUN mkdir -p uploads/documents uploads/projects uploads/avatars

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push && node prisma/seed.js && node server.js"]
