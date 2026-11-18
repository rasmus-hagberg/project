import axios from 'axios';
import { spawnSync } from 'node:child_process';

const PROTOCOLS = {
  REST: 'REST',
  GRPC: 'gRPC',
};

const STATUS = {
  OFFLINE: 'offline',
  ONLINE: 'online',
  ERROR: 'error',
};

/**
 * Fetches diagnostics data for all monitored devices
 * 
 * @param {Object} db
 * @returns 
 */
async function updateDiagnosticsDataForAllDevices(db) {
  // fetch devices
  let devices;
  try {
    devices = (await db.query('SELECT device_id, host FROM devices'))?.rows;
  } catch (err) {
    err.message = `Failed to get device list from database: ${err.message}`;
    throw err;
  }

  console.log(devices);
  await Promise.allSettled(devices.map(async (device) => {
    updateDiagnosticsDataForDevice(db, device);
  }));
}

async function updateDiagnosticsDataForDevice(db, device) {
  let updatedDevice;
  try {
    updatedDevice = await getDiagnosticsDataForDevice(device);
  } catch (err) {
    err.message = `Failed to get diagnostics data for device ${device.device_id}: ${err.message}`;
    console.error(err); // when deploying for real we should use a proper logging system
    try {
      await markDeviceOffline(db, device);
    } catch (err) {
      err.message = `Failed to mark device ${device.device_id} as offline: ${err.message}`;
      console.error(err); // when deploying for real we should use a proper logging system
    }
    return;
  }

  try {
    await insertDiagnosticsDataForDevice(db, updatedDevice);
    console.log(`Successfully updated data for device ${device.device_id}`);
  } catch (err) {
    err.message = `Failed to insert diagnostics data into database for device ${device.device_id}: ${err.message}`;
    console.error(err); // when deploying for real we should use a proper logging system
  }
}

/**
 * Fetches diagnostics data for the given device, using the devices preferred protocol
 * 
 * @param {Object} device
 * @returns 
 */
async function getDiagnosticsDataForDevice(device) {
  // Since the supported protocol is unlikely to change, an optimisation would be to store this in the database and only query it on setup and rarely thereafter
  let protocol;
  try {
    const capabilities = await axios.get(`http://${device.host}/health`, { timeout: 2000 }); // https in reality?
    if (!capabilities?.data?.protocol) {
      throw new Error('Response did not contain protocol');
    }
    protocol = capabilities.data.protocol;
  } catch (err) {
    err.message = `Failed to get health for device ${device.device_id}: ${err.message}`;
    throw err;
  }

  let diagnostics;
  switch (protocol) {
    case PROTOCOLS.REST: {
      let res;
      let attempts = 0;
      do {
        try {
          res = await axios.get(`http://${device.host}/diagnostics`, { timeout: 2000 }); // Aggressive timeout in order to trigger some timeouts for demonstration purposes. In a real setting this would be higher
          if (res.data) {
            diagnostics = res.data;
            break;
          } else {
            console.error(`res did not contain data: ${JSON.stringify(res)}`); // when deploying for real we should use a proper logging system
            throw new Error(`Bad response from device ${device.device_id}, check logs`);
          }
        } catch (err) {
          if (axios.isAxiosError(err) && (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT')) {
            await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempts)); // expected error, retry with increasing wait
          } else {
            throw err; // unexpected error, propagate
          }
        }
        attempts++;
      } while (attempts < 3);
      if (attempts >= 3) {
        throw new Error(`Attempted to get diagnostics data for device ${device.device_id} ${attempts} times, but timed out each time.`);
      }
      break;
    }
    case PROTOCOLS.GRPC:
      throw new Error(`Failed to get diagnostics data for device ${device.device_id}: gRPC not implemented yet`); // todo
    default:
      throw new Error(`Unexpected protocol ${protocol} for device ${device.device_id}`);
  }

  try {
    verifyDiagnosticsData(diagnostics);
    return {
      ...device,
      ...diagnostics,
    };
  } catch (err) {
    err.message = `Diagnostics data for device ${device.device_id} failed verification: ${err.message}`;
    throw err;
  }
};

function verifyDiagnosticsData(diagnostics) {
  if (!diagnostics.checksum) {
    throw new Error('Diagnostics data missing checksum');
  }
  const expected = diagnostics.checksum;
  delete diagnostics.checksum;

  // replace below with external checksum generator binary once available. For now uses sha256sum which is assumed to be available in $PATH
  const result = spawnSync('sha256sum', { input: JSON.stringify(diagnostics) });
  // If we want to be proper we should check result.status as well
  const actual = result.stdout.toString().split(' ', 1)[0]; // sha256sum outputs the checksum followed by the name of the input file separated by a space. We only care about the checksum

  diagnostics.checksum = expected;
  
  if (actual !== expected) {
    throw new Error(`Checksum did not match! Expected: '${expected}' Actual: '${actual}'`);
  }

  return diagnostics;
}

/**
 * Inserts updated device data into the database
 * 
 * @param {Object} device
 * @returns 
 */
async function insertDiagnosticsDataForDevice(db, device) {
  return db.query(
    'UPDATE devices SET hw_ver=$1, sw_ver=$2, fw_ver=$3, status=$4, checksum=$5, last_seen=NOW() WHERE device_id=$6',
    [ device.hw_ver, device.sw_ver, device.fw_ver, device.status, device.checksum, device.device_id ],
  );
}

/**
 * Marks the device as offline
 * 
 * @param {Object} device
 * @returns 
 */
async function markDeviceOffline(db, device) {
  return db.query(
    'UPDATE devices SET status=$1 WHERE device_id=$2',
    [ STATUS.OFFLINE, device.device_id ],
  );
}

export default { updateDiagnosticsDataForAllDevices, updateDiagnosticsDataForDevice, getDiagnosticsDataForDevice, verifyDiagnosticsData, PROTOCOLS, STATUS };
