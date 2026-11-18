import { createHash } from 'node:crypto';
import Fastify from 'fastify';
import { faker } from '@faker-js/faker';

const fastify = Fastify({
  logger: true
});

fastify.get('/health', function (_request, reply) {
  return reply.send({
    protocol: 'REST',
  });
});

fastify.get('/diagnostics', async function (_request, reply) {
  const diagnostics = {
    hw_ver: faker.system.semver(),
    sw_ver: faker.system.semver(),
    fw_ver: faker.system.semver(),
    status: faker.datatype.boolean() ? 'online' : 'error',
  };
  diagnostics.checksum = createHash('sha256').update(JSON.stringify(diagnostics)).digest('hex');

  const msWait = faker.number.int(3000); // This will cause timeouts occassionally
  console.log(`sleeping for ${msWait} ms`);
  await new Promise(resolve => setTimeout(resolve, msWait));

  return reply.send(diagnostics);
});

fastify.listen({ port: process.env.HTTP_PORT ?? 80, host: '0.0.0.0' }, function (err, _address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
