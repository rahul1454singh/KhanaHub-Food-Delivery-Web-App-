const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Routes removed since data is entirely managed by Supabase now
app.get('/', (req, res) => {
  res.json({
    message: 'KhanaHub Backend API - Hosted on Vercel',
    status: 'Running'
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(\Backend Server running on port \\));
}

module.exports = app;
