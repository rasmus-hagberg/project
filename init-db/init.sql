CREATE TABLE devices(
  device_id VARCHAR PRIMARY KEY,
  host VARCHAR,
  hw_ver VARCHAR,
  sw_ver VARCHAR,
  fw_ver VARCHAR,
  status VARCHAR,
  checksum VARCHAR,
  last_seen TIMESTAMP
);
