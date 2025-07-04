const express = require('express');
const statusMonitor = require('express-status-monitor');
const session = require('express-session');
const { exec } = require('child_process');
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

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === userName && password === pass) {
    req.session.user = email;
    res.redirect('/dashboard');
  } else {
    res.status(401).send(`
      <div class="alert alert-danger text-center" role="alert">
        Invalid credentials.
      </div>
      <div class="text-center">
        <a href="/login" class="btn btn-link">Try again</a>
      </div>
    `);
  }
});

app.get('/dashboard', isAuthenticated, async (req, res) => {
  const status = await getServerStatus();

  const statusBadge = status === 'running'
      ? `<span class="badge bg-success">Running</span>`
      : `<span class="badge bg-danger">Stopped</span>`;

  const disableStart = status === 'running' ? 'disabled' : '';
  const disableStop = status === 'stopped' ? 'disabled' : '';

  res.send(`
    <html>
    <head>
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
    <body class="p-4 bg-light">
      <div class="container">
        <h2 class="mb-4">Welcome, ${req.session.user}</h2>
        <h5>Status: ${statusBadge}</h5>

        <div class="d-flex gap-3 my-3">
          <button class="btn btn-success" onclick="confirmAction('/start', 'Are you sure you want to START the server?')" ${disableStart}>Start Server</button>
          <button class="btn btn-danger" onclick="confirmAction('/stop', 'Are you sure you want to STOP the server?')" ${disableStop}>Stop Server</button>
        </div>

        <a href="/status" class="btn btn-success">Server Status</a>
        <a href="/logout" class="btn btn-secondary">Logout</a>
      </div>
    </body>
    </html>
  `);
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/', isAuthenticated, (req, res) => res.send('Hello from Express!'));

// Start mc server
app.get('/start', isAuthenticated, (req, res) => {
  const screenName = 'mc1';
  const startCmd = `screen -ls | grep ${screenName}`;

  // Check if already running
  exec(startCmd, (err, stdout) => {
    if (stdout.includes(screenName)) {
      return res.send(`<pre>Server already running in screen '${screenName}'.</pre><a href="/dashboard">Back</a>`);
    }

    const launchCmd = `screen -dmS ${screenName} java -Xms3G -Xmx10G -jar ../mc1/paper-1.21.4.jar nogui`;
    exec(launchCmd, (error) => {
      if (error) {
        return res.status(500).send(`<pre>Error: ${error.message}</pre><a href="/dashboard">Back</a>`);
      }
      res.send(`<pre>Server started in screen '${screenName}'.</pre><a href="/dashboard">Back</a>`);
    });
  });
});

// Stop mc server
app.get('/stop', isAuthenticated, (req, res) => {
  const stopCmd = `screen -S mc1 -X stuff "stop\n"`;

  exec(stopCmd, (error) => {
    if (error) {
      return res.status(500).send(`<pre>Failed to send stop command: ${error.message}</pre><a href="/dashboard">Back</a>`);
    }
    res.send(`<pre>Stop command sent to Minecraft server.</pre><a href="/dashboard">Back</a>`);
  });
});

const getServerStatus = () => {
  return new Promise((resolve) => {
    exec("screen -ls | grep mc1", (err, stdout) => {
      if (stdout.includes('mc1')) {
        resolve("running");
      } else {
        resolve("stopped");
      }
    });
  });
};

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
