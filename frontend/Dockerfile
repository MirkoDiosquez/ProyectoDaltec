FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Copy built files to volume on every container start
FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/dist ./dist
# Use sh as entrypoint so files are always synced into the mounted volume
CMD ["sh", "-c", "cp -r /app/dist/. /app/volume/ && echo 'Frontend files copied' && tail -f /dev/null"]
