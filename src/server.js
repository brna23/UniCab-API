const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
//const { path } = require('express/lib/application');
const path = require('path');
//per login
const authRoutes = require('./routes/auth.js');
const homeRoutes = require('./routes/home.js');
const authMiddleware = require('./middleware/authmw');

// Carica le variabili d'ambiente
dotenv.config({path:'../.env'});

// Crea l'app Express
const app = express();

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



// Avvia il server
//const PORT = process.env.PORT || 3000;
app.listen(process.env.PORT, () => {
  console.log(`Server in ascolto sulla porta ${process.env.PORT}`);
});