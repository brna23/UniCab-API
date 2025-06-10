require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/server');

const Ride = require('../src/models/viaggio');
const User = require('../src/models/user');

let tokenDriver, tokenNonDriver, userDriver, rideId;

beforeAll(async () => {
    jest.setTimeout(8000);
    app.locals.db = await mongoose.connect(process.env.MONGODB_URI);
    await User.deleteMany({});

    userDriver = await User.findOne({ username: 'mattia' });
    if (!userDriver) {
        userDriver = await User.create({
        username: 'mattia',
        email: 'mattia@example.com',
        password: 'password',
        role: 'user',
        isDriver: true
        });
    }
    userNonDriver = await User.findOne({ username: 'gigino' });
    if (!userNonDriver) {
        userNonDriver = await User.create({
        username: 'gigino',
        email: 'gigino@example.com',
        password: 'password',
        role: 'user',
        isDriver: false
        });
    }

    tokenDriver = jwt.sign({
        userId: userDriver._id,
        username: userDriver.username,
        role: userDriver.role,
        isDriver: userDriver.isDriver
    }, process.env.JWT_SECRET);

    tokenNonDriver = jwt.sign({
        userId: userNonDriver._id,
        username: userNonDriver.username,
        role: userNonDriver.role,
        isDriver: userNonDriver.isDriver
    }, process.env.JWT_SECRET);
});


afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe('POST /api/rides', () => {
  it('✅ dovrebbe creare un nuovo viaggio per un driver', async () => {
    const res = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${tokenDriver}`)
      //.set('Authorization', `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODI0NjllNWZmMzY0M2IxYmE3MmFhMTUiLCJ1c2VybmFtZSI6Im1hdHRpYSIsInJvbGUiOiJhZG1pbiIsImlzRHJpdmVyIjp0cnVlLCJpYXQiOjE3NDk0NzkzNTgsImV4cCI6MTc0OTQ4Mjk1OH0.B2aq0b-_eQBGBJRgPALJ3TtVZwoJq0IKfFJreMVB1Ho`)
      .send({
        startAddress: 'Via Roma',
        endAddress: 'Via Milano',
        departureTime: new Date(Date.now() + 3600000).toISOString(),
        availableSeats: 3,
        price: 12.5,
        startCoordinates: [9.19, 45.46],
        endCoordinates: [9.20, 45.47]
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('_id');
    rideId = res.body._id;
  });
  
  it('❌ NON dovrebbe permettere ad un non-driver di creare un viaggio', async () => {
    const res = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${tokenNonDriver}`)
      //.set('Authorization', `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODM4MWFiMzI1NzcxMDA3ZjkzM2U4OTkiLCJ1c2VybmFtZSI6ImdpZ2lubyIsInJvbGUiOiJ1c2VyIiwiaXNEcml2ZXIiOmZhbHNlLCJpYXQiOjE3NDk0Nzk0NjQsImV4cCI6MTc0OTQ4MzA2NH0.X_VTymDk0gSekXm5HDdS-iO2AjvrCuROwsMyAlS02_c`)
      .send({
        startAddress: 'Via Test',
        endAddress: 'Via Fake',
        departureTime: new Date().toISOString(),
        availableSeats: 2,
        price: 5
      });

    expect(res.statusCode).toBe(403);
  });

  it('❌ NON dovrebbe permettere creazione senza auth', async () => {
    const res = await request(app)
      .post('/api/rides')
      .send({ startAddress: 'a', endAddress: 'b' });

    expect(res.statusCode).toBe(401); // O 403 a seconda del tuo middleware
  });

  it('❌ dovrebbe fallire se mancano campi obbligatori', async () => {
    const res = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${tokenDriver}`)
      //.set('Authorization', `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODI0NjllNWZmMzY0M2IxYmE3MmFhMTUiLCJ1c2VybmFtZSI6Im1hdHRpYSIsInJvbGUiOiJhZG1pbiIsImlzRHJpdmVyIjp0cnVlLCJpYXQiOjE3NDk0NzkzNTgsImV4cCI6MTc0OTQ4Mjk1OH0.B2aq0b-_eQBGBJRgPALJ3TtVZwoJq0IKfFJreMVB1Ho`)
      .send({ startAddress: 'a' });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/rides', () => {
  it('✅ dovrebbe restituire i viaggi disponibili', async () => {
    const res = await request(app).get('/api/rides');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/rides/:id', () => {
  it('✅ dovrebbe restituire i dettagli del viaggio', async () => {
    const res = await request(app).get(`/api/rides/${rideId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('driver');
  });

  it('❌ dovrebbe tornare errore con ID non valido', async () => {
    const res = await request(app).get('/api/rides/123abc');
    expect(res.statusCode).toBe(400);
  });

  it('❌ dovrebbe tornare 404 per ID inesistente', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/rides/${fakeId}`);
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /api/rides/refresh-status', () => {
  it('✅ dovrebbe aggiornare lo stato dei viaggi', async () => {
    const res = await request(app).patch('/api/rides/refresh-status');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('updatedCount');
  });

  it('❌ dovrebbe gestire errori server', async () => {
    const originalFn = Ride.updateMany;
    Ride.updateMany = jest.fn(() => { throw new Error('Errore simulato') });

    const res = await request(app).patch('/api/rides/refresh-status');
    expect(res.statusCode).toBe(500);

    Ride.updateMany = originalFn;
  });
});

describe('POST /api/rides/complete/:id', () => {
  it('✅ dovrebbe completare il viaggio', async () => {
    const res = await request(app)
      .post(`/api/rides/complete/${rideId}`)
      .set('Authorization', `Bearer ${tokenDriver}`)
      //.set('Authorization', `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODI0NjllNWZmMzY0M2IxYmE3MmFhMTUiLCJ1c2VybmFtZSI6Im1hdHRpYSIsInJvbGUiOiJhZG1pbiIsImlzRHJpdmVyIjp0cnVlLCJpYXQiOjE3NDk0NzkzNTgsImV4cCI6MTc0OTQ4Mjk1OH0.B2aq0b-_eQBGBJRgPALJ3TtVZwoJq0IKfFJreMVB1Ho`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('❌ dovrebbe rifiutare utenti non driver', async () => {
    const res = await request(app)
      .post(`/api/rides/complete/${rideId}`)
      .set('Authorization', `Bearer ${tokenNonDriver}`)
      //.set('Authorization', `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODM4MWFiMzI1NzcxMDA3ZjkzM2U4OTkiLCJ1c2VybmFtZSI6ImdpZ2lubyIsInJvbGUiOiJ1c2VyIiwiaXNEcml2ZXIiOmZhbHNlLCJpYXQiOjE3NDk0Nzk0NjQsImV4cCI6MTc0OTQ4MzA2NH0.X_VTymDk0gSekXm5HDdS-iO2AjvrCuROwsMyAlS02_c`);
    expect(res.statusCode).toBe(403);
  });

  it('❌ dovrebbe restituire errore 404 se ID non trovato', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/rides/complete/${fakeId}`)
      .set('Authorization', `Bearer ${tokenDriver}`)
      //.set('Authorization', `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODI0NjllNWZmMzY0M2IxYmE3MmFhMTUiLCJ1c2VybmFtZSI6Im1hdHRpYSIsInJvbGUiOiJhZG1pbiIsImlzRHJpdmVyIjp0cnVlLCJpYXQiOjE3NDk0NzkzNTgsImV4cCI6MTc0OTQ4Mjk1OH0.B2aq0b-_eQBGBJRgPALJ3TtVZwoJq0IKfFJreMVB1Ho`);
    expect(res.statusCode).toBe(404);
  });
});
