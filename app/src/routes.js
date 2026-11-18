import devices from './devices.js';

async function routes (fastify, _options) {
  /**
   * Adds the device identified by the given device_id to the list of devices to query and store information on, and asynchronously fetches information from the device
   */
  fastify.post('/devices/:device_id', async function (request, reply) {
    const device_id = request.params.device_id;
    // todo: check that device_id matches format
    const host = request.body?.host;
    if (!host) {
      return reply.code(400).send('Host missing');
    }

    try {
      const exists = await fastify.pg.query('SELECT EXISTS(SELECT 1 FROM devices WHERE device_id=$1)', [ device_id ]);
      if (exists.rows[0]?.exists) {
        return reply.code(409).send(`Device with device_id ${device_id} already exists`);
      }
    } catch (err) {
      console.error(err); // when deploying for real we should use a proper logging system
      return reply.code(500).send('Internal error, check logs');
    }
    
    try {
      await fastify.pg.query('INSERT INTO devices (device_id, host) VALUES ($1, $2)', [ device_id, host ]);
    } catch (err) {
      console.error(err); // when deploying for real we should use a proper logging system
      return reply.code(500).send('Internal error, check logs');
    }
    
    // no return, execution continues
    reply.code(204).send();
    
    // get and store data right away, so we have it if the devices goes down in the future
    await devices.updateDiagnosticsDataForDevice(fastify.pg, { device_id, host })
  });

  /**
   * Removes the device identified by the given device_id from the list of devices to query and store information on
   */
  fastify.delete('/devices/:device_id', async function (request, reply) {
    // todo: check that device_id matches format
    const device_id = request.params.device_id;

    const res = await fastify.pg.query('DELETE FROM devices WHERE device_id=$1', [ device_id ]);
    if (res.rowCount) {
      return reply.code(204).send();
    } else {
      return reply.code(404).send('No such device');
    }
  });

  /**
   * Fetches diagnostics data for all devices stored in the database
   */
  fastify.get('/devices/status', async function (_request, reply) {
    const devs = {};
    try {
      const res = (await fastify.pg.query('SELECT * FROM devices')).rows; // if we expect the user to add very many devices we should add pagination
      for (const device of res) {
        devs[device.device_id] = device;
      }
    } catch (err) {
      err.message = `Failed to get list of devices from database: ${err.message}`;
      console.error(err); // when deploying for real we should use a proper logging system
      return reply.code(500).send('Internal error, check logs');
    }

    return reply.send(devs);
  });
}

export default routes;
