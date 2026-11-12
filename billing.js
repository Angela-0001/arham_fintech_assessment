const eventBus = require('./src/eventBus');

eventBus.on('rideStatusChanged', ({ rideId, status }) => {
  if (status === 'ASSIGNED') {
    console.log(`charging rider for ride ${rideId}`);
  }
});

console.log('billing service listening...');
