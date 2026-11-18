FROM node:26
WORKDIR /fake_device
COPY . .
RUN npm install
ENTRYPOINT [ "node", "fake_device.js" ]
