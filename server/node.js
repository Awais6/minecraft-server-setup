const express = require('express');
const statusMonitor = require('express-status-monitor');
const session = require('express-session');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(express.json());
app.use(statusMonitor());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'agfgsdfjs65765',
  resave: false,
  saveUninitialized: false
}));

const userName = "admin@sparking.com";
const pass = "minecraft123";

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user === userName) {
    return next();
  }
  res.redirect('/login');
}

// Login page
app.get('/login', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Login</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
  <div class="container d-flex vh-100">
    <div class="row justify-content-center align-self-center w-100">
      <div class="col-md-5">
        <div class="card shadow-sm">
          <div class="card-body">
            <h3 class="card-title text-center mb-4">Login</h3>
            <form method="POST" action="/login">
              <div class="mb-3">
                <label for="email" class="form-label">Email address</label>
                <input type="email" class="form-control" id="email" name="email" required placeholder="admin@example.com">
              </div>
              <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <input type="password" class="form-control" id="password" name="password" required placeholder="secret123">
              </div>
              <button type="submit" class="btn btn-primary w-100">Login</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `);
});

// Handle login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === userName && password === pass) {
    req.session.user = email;
    return res.redirect('/dashboard');
  }
  res.status(401).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Login Failed</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
  <div class="container d-flex vh-100">
    <div class="row justify-content-center align-self-center w-100">
      <div class="col-md-5">
        <div class="alert alert-danger text-center" role="alert">
          Invalid credentials.
        </div>
        <div class="text-center">
          <a href="/login" class="btn btn-link">Try again</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `);
});

// Dashboard
app.get('/dashboard', isAuthenticated, async (req, res) => {
  const status = await getServerStatus();
  const statusBadge = status === 'running'
      ? `<span class="badge bg-success">Running</span>`
      : `<span class="badge bg-danger">Stopped</span>`;
  const disableStart = status === 'running' ? 'disabled' : '';
  const disableStop = status === 'stopped' ? 'disabled' : '';

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <script>
    function confirmAction(url, message) {
      if (confirm(message)) {
        window.location.href = url;
      }
    }
  </script>
</head>
<body class="bg-light p-4">
  <div class="container">
    <h2 class="mb-4">Welcome, ${req.session.user}</h2>
    <h5>Status: ${statusBadge}</h5>
    <div class="d-flex gap-3 my-3">
      <button class="btn btn-success" onclick="confirmAction('/start','Are you sure you want to START the server?')" ${disableStart}>Start Server</button>
      <button class="btn btn-danger" onclick="confirmAction('/stop','Are you sure you want to STOP the server?')" ${disableStop}>Stop Server</button>
      <a href="/logs" class="btn btn-primary">View Logs</a>
      <a href="/status" class="btn btn-success">Server Status:</a>
      <a href="/logout" class="btn btn-secondary">Logout</a>
    </div>
  </div>
</body>
</html>
  `);
});

// Display logs
app.get('/logs', isAuthenticated, (req, res) => {
  const logPath = path.resolve(__dirname, '../mc1/logs/latest.log');
  fs.readFile(logPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send(`<pre>Error reading log file: ${err.message}</pre><a href="/dashboard">Back</a>`);
    }
    const lines = data.split('\n');
    const lastLines = lines.slice(-100).join('\n');
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Server Logs</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    pre { height: 80vh; overflow: auto; background: #000; color: #0f0; padding: 1rem; }
  </style>
</head>
<body class="bg-light p-4">
  <div class="container">
    <h3 class="mb-3">Minecraft Server Logs (last 100 lines)</h3>
    <pre>${lastLines}</pre>
    <a href="/dashboard" class="btn btn-link mt-3">Back to Dashboard</a>
  </div>
</body>
</html>
    `);
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// Start mc server
app.get('/start', isAuthenticated, (req, res) => {
  const screenName = 'mc1';
  const serverPath = path.resolve(__dirname, '../mc1');
  exec(`screen -S ${screenName} -Q echo`, (err) => {
    if (!err) {
      return res.send(`<pre>Server already running in screen '${screenName}'.</pre><a href="/dashboard">Back</a>`);
    }
    const args = ['-dmS', screenName, 'java', '-Xms3G', '-Xmx10G', '-jar', 'paper-1.21.4.jar', 'nogui'];
    const child = spawn('screen', args, { cwd: serverPath, stdio: 'ignore', detached: true });
    child.on('error', error => res.status(500).send(`<pre>Error: ${error.message}</pre><a href="/dashboard">Back</a>`));
    child.unref();
    res.send(`<pre>Server started in screen '${screenName}'.</pre><a href="/dashboard">Back</a>`);
  });
});

// Stop Minecraft server
app.get('/stop', isAuthenticated, (req, res) => {
  const screenName = 'mc1';
  const cmd = [`screen -S ${screenName} -X stuff "stop\n"`, `screen -S ${screenName} -X quit`].join(' && ');
  exec(cmd, error => {
    if (error) {
      return res.status(500).send(`<pre>Failed to stop server: ${error.message}</pre><a href="/dashboard">Back</a>`);
    }
    res.send(`<pre>Server stopped and screen session '${screenName}' closed.</pre><a href="/dashboard">Back</a>`);
  });
});

// Check server status
const getServerStatus = () => {
  const screenName = 'mc1';
  return new Promise(resolve => {
    exec(`screen -S ${screenName} -Q echo`, err => resolve(err ? 'stopped' : 'running'));
  });
};

app.listen(port, () => console.log(`Server is running at http://localhost:${port}`));
