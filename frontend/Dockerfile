FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Output the built files so they can be picked up by the frontend_build volume
FROM alpine:3.19
WORKDIR /app/dist
COPY --from=builder /app/dist .
