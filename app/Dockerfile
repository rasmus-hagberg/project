FROM node:26
WORKDIR /app
COPY . .
RUN npm ci
ENTRYPOINT [ "node", "/app/src/server.js" ]
