const express = require('express');
const cors = require('cors');
const bankRoutes = require('./routes/bankRoutes');
const userRoutes = require('./routes/userRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const returnRoutes = require('./routes/returnRoutes');

const PORT = process.env.PORT || 3002;
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/banks', bankRoutes);
app.use('/api/users', userRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/returns', returnRoutes);

app.get('/', (req, res) => {
  res.send("hello bank");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
