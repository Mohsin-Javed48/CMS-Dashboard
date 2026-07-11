const path = require('path');

module.exports = {
  apps: [
    {
      name: 'cms-backend',
      cwd: path.join(__dirname, 'backend'),
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      error_file: path.join(__dirname, 'logs', 'backend-error.log'),
      out_file: path.join(__dirname, 'logs', 'backend-out.log'),
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'cms-frontend',
      cwd: path.join(__dirname, 'frontend'),
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: path.join(__dirname, 'logs', 'frontend-error.log'),
      out_file: path.join(__dirname, 'logs', 'frontend-out.log'),
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
