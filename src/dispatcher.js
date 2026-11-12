const drivers = require('./drivers');

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function askDriver(driver) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(Math.random() < 0.5);
    }, 10);
  });
}

async function processRide(ride, ridesStore, eventBus) {
  const shuffledDrivers = shuffle(drivers);
  let rejections = 0;
  const MAX_REJECTIONS = 3;

  for (const driver of shuffledDrivers) {
    if (rejections >= MAX_REJECTIONS) break;

    const accepted = await askDriver(driver);

    if (accepted) {
      ride.status = 'ASSIGNED';
      ride.driverId = driver.id;
      eventBus.emit('rideStatusChanged', { rideId: ride.id, status: 'ASSIGNED', driverId: driver.id });
      return;
    } else {
      rejections++;
    }
  }

  ride.status = 'NO_DRIVER_FOUND';
  eventBus.emit('rideStatusChanged', { rideId: ride.id, status: 'NO_DRIVER_FOUND', driverId: null });
}

function startDispatcher(ridesStore, rideQueue, eventBus) {
  setInterval(() => {
    if (rideQueue.length === 0) return;

    const rideId = rideQueue.shift();
    const ride = ridesStore[rideId];
    if (!ride) return;

    processRide(ride, ridesStore, eventBus).catch((err) => {
      console.error(`[dispatcher] Error processing ride ${rideId}:`, err);
    });
  }, 100);
}

module.exports = { startDispatcher };
