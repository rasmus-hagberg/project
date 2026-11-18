FROM node:26
WORKDIR /fake_device
COPY . .
RUN npm ci
ENTRYPOINT [ "node", "fake_device.js" ]
