const express = require('express');
const app = express();
const port = 3000;

// Middleware (for parsing JSON)
app.use(express.json());

// Basic GET route
app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

// Sample POST route
app.post('/echo', (req, res) => {
  res.json({ received: req.body });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
