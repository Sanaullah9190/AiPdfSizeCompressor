require('dotenv').config();
const express = require('express');
const path = require('path')
const app = express();
const cors = require('cors');

const PORT = 5000;


const upload = require('./middlewares/upload.js');
const pdfController = require('./controllers/pdfController.js');


app.use(cors());

// 3. Ek test route (check karne ke liye ki server chal raha hai)
app.get('/', (req, res) => {
  res.send('Hello! Humara PDF compressor backend chal raha hai.');
});


app.post('/compress-pdf', upload.single('pdfFile'), pdfController.compressPdf);

// 4. Server ko start karna
app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT} par live hai.`);
});