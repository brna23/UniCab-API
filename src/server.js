const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
//const { path } = require('express/lib/application');
const path = require('path');
//per login
const authRoutes = require('./routes/auth.js');
const homeRoutes = require('./routes/home.js');
const adminRoutes = require('./routes/admin.js');
const authMiddleware = require('./middleware/authmw');
const rideRoutes = require('./routes/api/rides');
const userRoutes = require('./routes/user');
const ratingRoutes = require('./routes/api/rating'); //forse conviene usare sempre /rides come path
const bookingRoutes = require('./routes/api/booking'); //forse conviene usare sempre /rides come path
//notifiche
const notificationsRoutes = require('./routes/api/notifications');

const reportRoutes = require('./routes/api/report');

//Swagger API documentation
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const options = {
  failOnErrors: true, // Whether or not to throw when parsing errors. Defaults to false.
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hello World',
      version: '1.0.0',
    },
  },
  apis: ['./routes/api/rides.js', './server.js'],
};
const swaggerSpec = swaggerJsdoc(options);


// Carica le variabili d'ambiente
dotenv.config({path:'../.env'});

//oauth
const passport = require('./config/passport');

// Crea l'app Express
const app = express();

//pagina swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

//oauth
app.use(passport.initialize());

// Middleware
app.use(cors()); // Abilita CORS
app.use(express.json()); // Permette di parsare JSON nelle richieste


app.use(express.static(path.join(__dirname, 'public'))); // per html

// Connessione a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connesso a MongoDB'))
  .catch(err => console.error('Errore di connessione a MongoDB:', err));


// route per le pagine pubbliche (accessibili a chiunque, anche se non è registrato)
app.get('/', (req, res) => {
  res.send('API UniCab - Benvenuto nella pagina pubblica!');
});
app.get('/about', (req, res) => {
  res.send('Questa è la pagina "About Us" pubblica.');
});
// pagina di login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html')); 
});
// pagina di registrazione
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html')); 
});


// route protette 
app.use('/api/auth', authRoutes);
app.use('/api', homeRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/ratings', ratingRoutes); 
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/admin', adminRoutes);



// Avvia il server
//const PORT = process.env.PORT || 3000;
app.listen(process.env.PORT, () => {
  console.log(`Server in ascolto sulla porta ${process.env.PORT}`);
});

module.exports = app;