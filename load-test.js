const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TOTAL_RIDES = 100;
const POLL_INTERVAL_MS = 200;
const TIMEOUT_MS = 30_000;
const FINAL_STATUSES = new Set(['ASSIGNED', 'NO_DRIVER_FOUND']);

async function waitForFinalStatus(rideId) {
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const { data } = await axios.get(`${BASE_URL}/rides/${rideId}`);
      if (FINAL_STATUSES.has(data.status)) {
        return data;
      }
    } catch (_err) {
    }
  }

  return { id: rideId, status: 'TIMEOUT', driverId: null };
}

async function main() {
  console.log(`\nBooking ${TOTAL_RIDES} rides concurrently...\n`);

  const bookingPromises = Array.from({ length: TOTAL_RIDES }, () =>
    axios.post(`${BASE_URL}/rides`).then((r) => r.data.rideId)
  );

  let rideIds;
  try {
    rideIds = await Promise.all(bookingPromises);
  } catch (err) {
    console.error('Failed to book rides. Is the server running?', err.message);
    process.exit(1);
  }

  console.log(`All ${rideIds.length} rides booked. Waiting for final statuses...\n`);

  const results = await Promise.all(rideIds.map((id) => waitForFinalStatus(id)));

  const assigned  = results.filter((r) => r.status === 'ASSIGNED');
  const noDriver  = results.filter((r) => r.status === 'NO_DRIVER_FOUND');
  const stuck     = results.filter((r) => r.status === 'TIMEOUT');

  const rideIdsSeen = new Set();
  let duplicateRides = 0;
  for (const r of assigned) {
    if (rideIdsSeen.has(r.id)) duplicateRides++;
    rideIdsSeen.add(r.id);
  }

  const col1W = 42;
  const col2W = 10;

  function row(label, value, expected) {
    const status = value === expected ? '✓' : '✗';
    const paddedLabel = label.padEnd(col1W);
    const paddedValue = String(value).padStart(col2W);
    const paddedExpected = String(expected).padStart(col2W);
    console.log(`│ ${paddedLabel} │ ${paddedValue} │ ${paddedExpected} │ ${status}`);
  }

  const divider = `├${'─'.repeat(col1W + 2)}┼${'─'.repeat(col2W + 2)}┼${'─'.repeat(col2W + 2)}┤`;
  const top     = `┌${'─'.repeat(col1W + 2)}┬${'─'.repeat(col2W + 2)}┬${'─'.repeat(col2W + 2)}┐`;
  const bottom  = `└${'─'.repeat(col1W + 2)}┴${'─'.repeat(col2W + 2)}┴${'─'.repeat(col2W + 2)}┘`;
  const header  = `│ ${'Metric'.padEnd(col1W)} │ ${'Actual'.padStart(col2W)} │ ${'Expected'.padStart(col2W)} │`;

  console.log('\n' + top);
  console.log(header);
  console.log(divider);
  row('Total rides created',                        rideIds.length,                100);
  row('Rides ASSIGNED + NO_DRIVER_FOUND',           assigned.length + noDriver.length, 100);
  row('Rides assigned to 2 drivers (expected 0)',   duplicateRides,                0);
  row('Rides stuck / no final status (expected 0)', stuck.length,                  0);
  console.log(bottom);

  console.log(`\n  ASSIGNED:        ${assigned.length}`);
  console.log(`  NO_DRIVER_FOUND: ${noDriver.length}`);
  console.log(`  STUCK/TIMEOUT:   ${stuck.length}\n`);
}

main();
