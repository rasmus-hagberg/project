FROM node:26
WORKDIR /app
COPY . .
RUN npm install
ENTRYPOINT [ "node", "/app/src/server.js" ]
