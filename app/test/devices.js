import { test, suite, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import devices from '../src/devices.js'
import axios from 'axios';

suite('getDiagnosticsDataForDevice', () => {
  const dummyDevice = {
    device_id: 'abc123',
    host: 'unimportant',
  };

  suite('health endpoint error', () => {
    test('connection error', (t) => {
      t.mock.method(axios, 'get', () => { throw new Error('testerror') });
      assert.rejects(
        async () => {
          await devices.getDiagnosticsDataForDevice(dummyDevice);
        },
        {
          name: 'Error',
          message: `Failed to get health for device ${dummyDevice.device_id}: testerror`,
        }
      );
    });

    test('capabilities do not contain protocol', (t) => {
      t.mock.method(axios, 'get', () => { return { data: { notProtocol: 'something' } } });
      assert.rejects(
        async () => {
          await devices.getDiagnosticsDataForDevice(dummyDevice);
        },
        {
          name: 'Error',
          message: `Failed to get health for device ${dummyDevice.device_id}: Response did not contain protocol`,
        }
      );
    });
  });

  test('unexpected protocol', (t) => {
    t.mock.method(axios, 'get', () => { return { data: { protocol: 'unknownProtocol' } } });
    assert.rejects(
      async () => {
        await devices.getDiagnosticsDataForDevice(dummyDevice);
      },
      {
        name: 'Error',
        message: `Unexpected protocol unknownProtocol for device ${dummyDevice.device_id}`,
      }
    );
  });

  suite('REST', () => {
    const axiosMock = mock.method(axios, 'get', () => { return { data: { protocol: 'REST' } } });
    afterEach(() => {
      axiosMock.mock.resetCalls();
    });

    test('unexpected connection error', (t) => {
      axiosMock.mock.mockImplementationOnce(() => {
        throw new Error('unexpected error');
      }, 1);
      assert.rejects(
      async () => {
        await devices.getDiagnosticsDataForDevice(dummyDevice);
      },
      {
        name: 'Error',
        message: 'unexpected error',
      }
    );
    });

    test.skip('more timeouts than max attempts', () => {
      assert.fail('not implemented');
    });

    test.skip('fewer timeouts than max attempts', () => {
      assert.fail('not implemented');
    });

    suite('no timeouts', () => {
      test('response missing data', () => {
        test('response missing data', (t) => {
          axiosMock.mock.mockImplementationOnce(() => {
            return { 'notData': 'something' };
          }, 1);
          assert.rejects(
          async () => {
            await devices.getDiagnosticsDataForDevice(dummyDevice);
          },
          {
            name: 'Error',
            message: `Bad response from device ${dummyDevice.device_id}, check logs`,
          }
        );
        });
      });

      test('valid response', async () => {
        const dummyDiagnostics = {
          someDiagnostic: 'someValue',
          checksum: '234c9a2ad78a0175e3b156cb0f97a5e2deba636a1bbc03e59830a48d1d75eccc'
        };
        axiosMock.mock.mockImplementationOnce(() => {
          return { 'data': dummyDiagnostics };
        }, 1);
        assert.deepStrictEqual(
          await devices.getDiagnosticsDataForDevice(dummyDevice),
          {
            ...dummyDevice,
            ...dummyDiagnostics
          }
        );
      });
    });
  });

  test('gRPC', (t) => {
    t.mock.method(axios, 'get', () => { return { data: { protocol: devices.PROTOCOLS.GRPC } } });
    assert.rejects(
      async () => {
        await devices.getDiagnosticsDataForDevice(dummyDevice);
      },
      {
        name: 'Error',
        message: `Failed to get diagnostics data for device ${dummyDevice.device_id}: ${devices.PROTOCOLS.GRPC} not implemented yet`,
      }
    );
  });
});

// todo test this indirectly so we dont have to export it
suite('verifyDiagnosticsData', () => {
  test('missing checksum', () => {
    assert.throws(
      () => {
        devices.verifyDiagnosticsData({
          some: 'data',
        });
      },
      {
        name: 'Error',
        message: 'Diagnostics data missing checksum',
      }
    );
  });

  test('valid checksum', () => {
    devices.verifyDiagnosticsData({
      some: 'data',
      checksum: 'c67cdc294fe06519bd9b7948e27059b643edf540877335b271957ab95dd551b7',
    });
  });

  test('invalid checksum', () => {
    assert.throws(
      () => {
        devices.verifyDiagnosticsData({
          some: 'data',
          checksum: 'wrong',
        });
      },
      {
        name: 'Error',
        message: /^Checksum did not match/,
      }
    );
  });
});
