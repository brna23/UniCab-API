const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const { path } = require('express/lib/application');

//per login
const authRoutes = require('./routes/auth.js');
const dashboardRoutes = require('./routes/dashboard.js');


// Carica le variabili d'ambiente
dotenv.config({path:'../.env'});

// Crea l'app Express
const app = express();

// Middleware
app.use(cors()); // Abilita CORS
app.use(express.json()); // Permette di parsare JSON nelle richieste

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

// route protette (devono usare authMiddleware)
app.use('/api/auth', authRoutes);
app.use('/api', dashboardRoutes);  




// Avvia il server
//const PORT = process.env.PORT || 3000;
app.listen(process.env.PORT, () => {
  console.log(`Server in ascolto sulla porta ${process.env.PORT}`);
});