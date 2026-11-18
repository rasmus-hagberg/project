import Fastify from 'fastify';
import routes from './routes.js';
import db from './db.js';
import devices from './devices.js'

const fastify = Fastify({
  logger: true
});

fastify.register(db);
fastify.register(routes);

fastify.listen({ port: 3000, host: '0.0.0.0' }, function (err, _address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
});

setInterval(async () => {
  try {
    await devices.updateDiagnosticsDataForAllDevices(fastify.pg);
  } catch (err) {
    err.message = `Failed to refresh diagnostics data: ${err.message}`;
    console.error(err); // when deploying for real we should use a proper logging system
  }
}, 30000); // Fairly often, for demonstration purposes. In a real setting this would be higher
