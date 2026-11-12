const eventBus = require('./src/eventBus');

eventBus.on('rideStatusChanged', ({ rideId, status }) => {
  console.log(`ride ${rideId} is now in status ${status}`);
});

console.log('ops service listening...');
