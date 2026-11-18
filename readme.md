# PoC for device monitoring service

Proof of concept for a basic device monitoring system. Allows a user to add and remove devices to be monitored. The service will request diagnostics data for all monitored devices at regular intervals. A user can then interact with the service to get the latest diagnostics data.

## Using the service
### Adding a device
Make a `POST` request to `/devices/:deviceID`, where the deviceID is the ID of the device to add. The request body must be valid JSON containing a "host" entry which must be a string indicating where to find the device.

Example: `curl -X POST localhost:3000/devices/abc123 -d '{"host": "fake_device_one"}' -H "Content-Type: application/json"`

### Removing a device
Make a `DELETE` request to `/devices/:deviceID`, where the deviceID is the ID of the device to remove.

Example: `curl -X DELETE localhost:3000/devices/abc123`

### Getting status for devices
Make a `GET` request to `/devices`

Example: `curl localhost:3000/devices/status`

## Unimplemented features
In the interest of time a number of features are not implemented. Some of the most obvious are:
- gRPC support
- Authentication and Authorization
- URL parameter and post body validation
- TypeScript
- Full test coverage including integration tests
- Real logging
- Simulation of different network situations for the fake devices
- Code style and linting checks and enforcement

## Running using docker (recommended)
Requirements:
- docker
- docker-compose

Run `docker compose up` to start the service along with three fake devices. You can then interact with the device monitoring service at localhost:3000. When adding the fake devices to the monitoring service, use the hosts `fake_device_one` etc.

## Running manually
Requirements:
- node
- npm
- sha256sum
- an accessible postgresql server

### Initialising the database
Use the `init.sql` script in the `init-db` folder to create the required table.

### Device monitoring service
Run `npm install` to install dependencies, and `node server.js` to start the server. Your environment must have the connection details for the postgres server, using the regular postgres environment vars (`DBHOST` etc).

### Fake devices
Run `npm install` to install dependencies, and `node fake_device.js` to start the fake device. You can use the `HTTP_PORT` environment variable to set the port at which the fake device server will listen (default 80).
