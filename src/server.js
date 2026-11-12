const express = require('express');
const { randomUUID } = require('crypto');
const eventBus = require('./eventBus');
const { startDispatcher } = require('./dispatcher');

require('../billing');
require('../ops');

const app = express();
app.use(express.json());

const rides = {};
const rideQueue = [];

app.post('/rides', (req, res) => {
  const id = randomUUID();
  const ride = {
    id,
    status: 'REQUESTED',
    driverId: null,
    createdAt: Date.now(),
  };

  rides[id] = ride;
  rideQueue.push(id);

  eventBus.emit('rideStatusChanged', { rideId: id, status: 'REQUESTED', driverId: null });

  res.status(201).json({ rideId: id });
});

app.get('/rides/:id', (req, res) => {
  const ride = rides[req.params.id];
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }
  res.json(ride);
});

startDispatcher(rides, rideQueue, eventBus);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`[server] Ride Booking System listening on http://localhost:${PORT}`);
});

module.exports = app;
