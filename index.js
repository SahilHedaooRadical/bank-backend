const express = require('express');
const cors = require('cors');
const bankRoutes = require('./routes/bankRoutes');
const userRoutes = require('./routes/userRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const returnRoutes = require('./routes/returnRoutes');


const app = express();
app.use(cors({
  origin: [
    "http://localhost:5173", 
    "https://user-web-9wez.vercel.app" // your hosted frontend
  ],
  credentials: true
}));

app.use(express.json());

app.use('/api/banks', bankRoutes);
app.use('/api/users', userRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/returns', returnRoutes);

app.get('/', (req, res) => {
  res.send("hello bank");
});

app.listen(5000, '0.0.0.0', () => {
  console.log('Server running on port 5000');
});
