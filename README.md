# Ride Booking System

A simple, in-memory ride booking system built with Node.js and Express.js.  
No database required — all state is held in process memory.

---

## Project structure

```
├── src/
│   ├── server.js       Express app, in-memory store, HTTP routes
│   ├── eventBus.js     Shared EventEmitter singleton (pub-sub bus)
│   ├── drivers.js      Hardcoded list of 10 fake drivers
│   └── dispatcher.js   Background worker: dequeues rides, offers to drivers
├── billing.js          Event consumer — charges rider when ride is ASSIGNED
├── ops.js              Event consumer — logs every status change
├── load-test.js        Concurrency test: books 100 rides and reports results
└── package.json
```

---

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Start the server

```bash
node src/server.js
```

The server listens on **http://localhost:3000**.

### 3. Event consumers (included automatically)

`billing.js` and `ops.js` are required directly by `src/server.js` and start automatically
when the server starts. They share the same in-memory `EventEmitter` instance and log
to the server's stdout.

> **Note:** Because `billing.js` and `ops.js` rely on Node.js module caching to share the
> `eventBus` singleton, they **must run in the same process** as the server. Running them
> as standalone programs (`node billing.js`) in a separate terminal will not work — each
> process gets its own independent EventEmitter and will never receive events from the server.
> To support separate-process consumers you would need a network message broker (e.g. Redis Pub/Sub).

### 4. Run the load test

The server must already be running in another terminal.

```bash
node load-test.js
```

Expected output:

```
┌────────────────────────────────────────────────┬────────────┬────────────┐
│ Metric                                         │     Actual │   Expected │
├────────────────────────────────────────────────┼────────────┼────────────┤
│ Total rides created                            │        100 │        100 │ ✓
│ Rides ASSIGNED + NO_DRIVER_FOUND               │        100 │        100 │ ✓
│ Rides assigned to 2 drivers (expected 0)       │          0 │          0 │ ✓
│ Rides stuck / no final status (expected 0)     │          0 │          0 │ ✓
└────────────────────────────────────────────────┴────────────┴────────────┘
```

---

## API reference

| Method | Path          | Description                          |
|--------|---------------|--------------------------------------|
| POST   | `/rides`      | Book a new ride → returns `{ rideId }` |
| GET    | `/rides/:id`  | Get ride status and details          |

### Ride object

```json
{
  "id": "uuid-v4",
  "status": "REQUESTED | ASSIGNED | NO_DRIVER_FOUND",
  "driverId": "driver-N or null",
  "createdAt": 1700000000000
}
```

---

## How it works

1. **POST /rides** creates a ride in `REQUESTED` status and pushes its ID onto an in-memory queue.
2. The **dispatcher** (`src/dispatcher.js`) runs every 100 ms, dequeues one ride, shuffles the driver list, and offers the ride to each driver in turn (simulated with a small async delay).
3. Each driver independently accepts (~50 %) or rejects the ride.
4. After **3 rejections** the ride becomes `NO_DRIVER_FOUND`; on the first acceptance it becomes `ASSIGNED`.
5. Every status change is emitted on the shared **eventBus** (`rideStatusChanged` event).
6. `billing.js` and `ops.js` subscribe to that bus and react to events.
