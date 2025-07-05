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
  if (req.session && req.session.user === userName) return next();
  res.redirect('/login');
}

// Login page
app.get(['/', '/login'], (req, res) => {
  res.send(`<!DOCTYPE html>
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
                <label for="email" class="form-label">Email</label>
                <input type="email" id="email" name="email" class="form-control" required placeholder="enter email">
              </div>
              <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <input type="password" id="password" name="password" class="form-control" required placeholder="enter password">
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
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

// Dashboard
app.get('/dashboard', isAuthenticated, async (req, res) => {
  const status = await getServerStatus();
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light p-4">
  <div class="container">
    <h2 class="mb-4">Welcome, ${req.session.user}</h2>
    <h5>Status: <span class="badge bg-${status==='running'?'success':'danger'}">${status.toUpperCase()}</span></h5>
    <div class="d-flex gap-3 my-3">
      <form method="POST" action="/start"><button class="btn btn-success" ${status==='running'?'disabled':''}>Start</button></form>
      <form method="POST" action="/stop"><button class="btn btn-danger" ${status==='stopped'?'disabled':''}>Stop</button></form>
      <button class="btn btn-warning" onclick="if(confirm('Backup world?')) startBackup()">Backup</button>
      <button class="btn btn-info" onclick="if(confirm('Restore world?')) startRestore()">Restore</button>
      <a href="/logs" class="btn btn-primary">Logs</a>
      <a href="/logout" class="btn btn-secondary">Logout</a>
    </div>
    <div id="progressSection" style="display:none;">
      <div class="mb-2">Progress: <span id="progressText">0%</span></div>
      <div class="progress mb-2"><div id="progressBar" class="progress-bar" role="progressbar" style="width:0%"></div></div>
      <pre id="logOutput" style="height:200px; overflow:auto; background:#f8f9fa; padding:1rem;"></pre>
    </div>
  </div>
<script>
function streamProcess(endpoint) {
  document.getElementById('progressSection').style.display = 'block';
  const log = document.getElementById('logOutput');
  const bar = document.getElementById('progressBar');
  const text = document.getElementById('progressText');
  const es = new EventSource(endpoint);
  es.onmessage = e => {
    const d = JSON.parse(e.data);
    log.textContent += d.message + "\n";
    if (d.percent) { bar.style.width = d.percent + '%'; text.textContent = d.percent + '%'; }
    if (d.done) es.close();
    log.scrollTop = log.scrollHeight;
  };
}
function startBackup() { streamProcess('/backup-stream'); }
function startRestore() { streamProcess('/restore-stream'); }
</script>
</body>
</html>
`);
});

// Logs
app.get('/logs', isAuthenticated, (req, res) => {
  const logPath = path.resolve(__dirname, '../mc1/logs/latest.log');
  fs.readFile(logPath, 'utf8', (err, data) => {
    if (err) return res.status(500).send(`Error: ${err.message}`);
    res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Logs</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"></head>
<body class="bg-light p-4"><div class="container">
  <h3>Server Logs</h3>
  <pre style="background:#000;color:#0f0;padding:1rem;height:80vh;overflow:auto;">${data}</pre>
  <a href="/dashboard" class="btn btn-link">Back</a>
</div></body></html>
`);
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// Control
app.post('/start', isAuthenticated, (req, res) => controlScreen('paper-1.21.4.jar', ['-Xms3G','-Xmx10G','-jar','paper-1.21.4.jar','nogui'], res));
app.post('/stop', isAuthenticated, (req, res) => {
  exec(`screen -S mc1 -X stuff "stop\n" && screen -S mc1 -X quit`, () => res.redirect('/dashboard'));
});

// Streams
function streamScript(route, script) {
  app.get(route, isAuthenticated, (req, res) => {
    res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache'});
    const child = spawn('bash', [path.resolve(__dirname,'../mc1',script)]);
    child.stdout.on('data', d => parseSend(d, res));
    child.stderr.on('data', d => res.write(`data: ${JSON.stringify({message:d.toString()})}\n\n`));
    child.on('close', () => res.write(`data: ${JSON.stringify({message:'Done',done:true})}\n\n`));
  });
}
function parseSend(chunk, res) {
  chunk.toString().split(/\r?\n/).forEach(l => {
    if (!l) return;
    const m = l.match(/(\d+)%/);
    res.write(`data: ${JSON.stringify({message:l, percent: m?m[1]:null})}\n\n`);
  });
}
streamScript('/backup-stream','upload.sh');
streamScript('/restore-stream','download.sh');

// Helper
function controlScreen(cmd,args,res) {
  exec(`screen -S mc1 -Q echo`, err => {
    if (!err) return res.redirect('/dashboard');
    const ch = spawn('screen',['-dmS','mc1',cmd,...args]); ch.unref(); res.redirect('/dashboard');
  });
}
function getServerStatus() { return new Promise(r => exec(`screen -S mc1 -Q echo`, err => r(err?'stopped':'running')));
}

app.listen(port, ()=>console.log(`Server running on http://localhost:${port}`));
