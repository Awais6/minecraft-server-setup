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

app.get('/', isAuthenticated, (req, res) => res.redirect("/dashboard"));

// Login page
app.get('/login', (req, res) => {
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
                <label for="email" class="form-label">Email address</label>
                <input type="email" class="form-control" id="email" name="email" required placeholder="enter email">
              </div>
              <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <input type="password" class="form-control" id="password" name="password" required placeholder="enter password">
              </div>
              <button type="submit" class="btn btn-primary w-100">Login</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const dateElement = document.getElementById('lastBackupDate');
      const dateStr = dateElement.getAttribute('data-date');
      if (dateStr) {
        try {
          const date = new Date(dateStr);
          dateElement.textContent = date.toLocaleString();
        } catch (e) {
          console.error('Error formatting date:', e);
        }
      }
    });
  </script>
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
  res.status(401).send(`<!DOCTYPE html>
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

  // Read and clear error message from session
  const errorMessage = req.session.error;
  delete req.session.error;

  // Read backup info from session
  const backupInfo = req.session.backupInfo;
  delete req.session.backupInfo;

  // Read last backup datetime from file if not in session
  const serverPath = path.resolve(__dirname, '../mc1');
  const lastBackupFile = path.join(serverPath, 'last_backup.txt');
  let lastBackupDate = null;
try {
    if (!backupInfo || !backupInfo.lastBackup) {
      const data = fs.readFileSync(lastBackupFile, 'utf8');
      lastBackupDate = new Date(data).toISOString();
    } else {
      lastBackupDate = new Date(backupInfo.lastBackup).toISOString();
    }
  } catch {
    lastBackupDate = 'No backups yet';
  }

  // Prepare backup alert HTML
  let backupAlert = '';
  let backupLogsHtml = '';
  if (backupInfo) {
    const alertClass = backupInfo.success ? 'alert-success' : 'alert-danger';
    backupAlert = `<div class="alert ${alertClass}" role="alert">${backupInfo.message}</div>`;
    if (backupInfo.rawSize && backupInfo.zipSize) {
      backupAlert += `<p>Raw folder size: <strong>${backupInfo.rawSize}</strong></p>`;
      backupAlert += `<p>Zip file size: <strong>${backupInfo.zipSize}</strong></p>`;
    }
    if (backupInfo.logs) {
      backupLogsHtml = `
        <details class="mb-3">
          <summary>Backup Logs</summary>
          <pre style="background:#f8f9fa; padding:1rem; max-height: 300px; overflow:auto;">${backupInfo.logs}</pre>
        </details>
      `;
    }
  }

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
</head>
<body class="bg-light p-4">
  <div class="container">
    <h2 class="mb-4">Welcome, ${req.session.user}</h2>
    <h5>Status: ${statusBadge}</h5>

    ${errorMessage ? `<div class="alert alert-danger" role="alert">${errorMessage}</div>` : ''}
    ${backupAlert}
    ${backupLogsHtml}
    ${backupInfo ? `<script>alert(${JSON.stringify(backupInfo.message)});</script>` : ''}

<p><strong>Last Backup:</strong> <span id="lastBackupDate" data-date="${lastBackupDate === 'No backups yet' ? '' : lastBackupDate}">${lastBackupDate === 'No backups yet' ? 'No backups yet' : 'Loading...'}</span></p>

    <div class="d-flex gap-3 my-3 flex-wrap">
      <form method="POST" action="/start" onsubmit="return confirm('Are you sure you want to start the server?');">
        <button type="submit" class="btn btn-success" ${disableStart}>Start Server</button>
      </form>
      <form method="POST" action="/stop" onsubmit="return confirm('Are you sure you want to stop the server?');">
        <button type="submit" class="btn btn-danger" ${disableStop}>Stop Server</button>
      </form>
      <form method="POST" action="/backup" onsubmit="return confirm('Are you sure you want to backup the server?');">
        <button type="submit" class="btn btn-success">Backup</button>
      </form>
      <form method="POST" action="/restore" onsubmit="return confirm('Are you sure you want to restore the server?');">
        <button type="submit" class="btn btn-warning">Restore</button>
      </form>
      <a href="/logs" class="btn btn-primary">View Logs</a>
      <a href="/status" class="btn btn-success">Server Status</a>
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
    res.send(`<!DOCTYPE html>
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
app.post('/start', isAuthenticated, (req, res) => {
  const screenName = 'mc1';
  const serverPath = path.resolve(__dirname, '../mc1');
  exec(`screen -S ${screenName} -Q echo`, (err) => {
    if (!err) {
      return res.redirect('/dashboard');
    }
    const args = ['-dmS', screenName, 'java', '-Xms3G', '-Xmx10G', '-jar', 'paper-1.21.4.jar', 'nogui'];
    const child = spawn('screen', args, { cwd: serverPath, stdio: 'ignore', detached: true });
    child.unref();
    res.redirect('/dashboard');
  });
});

// Stop Minecraft server
app.post('/stop', isAuthenticated, (req, res) => {
  const screenName = 'mc1';
  const cmd = [`screen -S ${screenName} -X stuff "stop\n"`, `screen -S ${screenName} -X quit`].join(' && ');
  exec(cmd, () => {
    res.redirect('/dashboard');
  });
});

// Backup Minecraft server - run upload.sh
app.post('/backup', isAuthenticated, async (req, res) => {
  const serverPath = path.resolve(__dirname, '../mc1');
  const scriptPath = path.join(serverPath, 'upload.sh');
  const backupLog = [];
  try {
    // Get raw folder size before backup
    const rawSize = await getFolderSize(serverPath);
    backupLog.push(`Raw folder size before backup: ${rawSize}`);

    // Run upload.sh and capture stdout/stderr
    await new Promise((resolve, reject) => {
      const child = exec(`bash ${scriptPath}`, {cwd: serverPath});

      child.stdout.on('data', (data) => {
        backupLog.push(data.toString());
      });

      child.stderr.on('data', (data) => {
        backupLog.push(data.toString());
      });

      child.on('error', (err) => {
        reject(err);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Backup script exited with code ${code}`));
        }
      });
    });

    // Extract zip size from the backup logs
    let zipSize = 'N/A';
    const zipSizeMatch = backupLog.join('').match(/Zip file size: ([0-9.]+\s*[KMGT]?B)/i);
    if (zipSizeMatch && zipSizeMatch[1]) {
      zipSize = zipSizeMatch[1];
    }

    // Save last backup datetime to file
    const lastBackupFile = path.join(serverPath, 'last_backup.txt');
    const now = new Date().toISOString();
    fs.writeFileSync(lastBackupFile, now);

    // Save info in session to show on dashboard
    req.session.backupInfo = {
      success: true,
      message: `Backup completed successfully.`,
      rawSize,
      zipSize,
      logs: backupLog.join(''),
      lastBackup: now,
    };
  } catch (error) {
    console.error(`Backup error: ${error.message}`);
    req.session.backupInfo = {
      success: false,
      message: `Backup failed: ${error.message}`,
      logs: backupLog.join(''),
    };
  }
  res.redirect('/dashboard');
});

// Restore Minecraft server - run restore.sh
app.post('/restore', isAuthenticated, (req, res) => {
  const serverPath = path.resolve(__dirname, '../mc1');
  const scriptPath = path.join(serverPath, 'restore.sh');
  exec(`bash ${scriptPath}`, {cwd: serverPath}, (error, stdout, stderr) => {
    if (error) {
      console.error(`Restore error: ${error.message}`);
      req.session.error = `Restore failed: ${error.message}`;
    }
    res.redirect('/dashboard');
  });
});

// Check server status
const getServerStatus = () => {
  const screenName = 'mc1';
  return new Promise(resolve => {
    exec(`screen -S ${screenName} -Q echo`, err => resolve(err ? 'stopped' : 'running'));
  });
};

const getFolderSize = (folderPath) => {
  return new Promise((resolve, reject) => {
    exec(`du -sh ${folderPath}`, (err, stdout) => {
      if (err) return reject(err);
      // stdout example: "1.2G    /path/to/folder"
      const size = stdout.split('\t')[0];
      resolve(size);
    });
  });
};

const getFileSize = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) return reject(err);
      // Convert bytes to human-readable format
      const i = Math.floor(Math.log(stats.size) / Math.log(1024));
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const size = (stats.size / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
      resolve(size);
    });
  });
};

app.listen(port, () => console.log(`Server is running at http://localhost:${port}`));
