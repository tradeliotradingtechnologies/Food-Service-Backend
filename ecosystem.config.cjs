/**
 * PM2 Ecosystem File
 * ─────────────────────────────────────────────────────────
 * Start:   pm2 start ecosystem.config.cjs
 * Restart: pm2 reload ecosystem.config.cjs
 * Logs:    pm2 logs ericas-kitchen
 * Monitor: pm2 monit
 */
module.exports = {
  apps: [
    {
      name: "ericas-kitchen",
      script: "dist/server.js",
      node_args: "--experimental-vm-modules",
      instances: "max", // Use all CPU cores (cluster mode)
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Graceful shutdown
      kill_timeout: 10000, // 10s to finish in-flight requests
      listen_timeout: 8000,
      // Logging
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      // Zero-downtime reload
      wait_ready: false,
      shutdown_with_message: false,
    },
  ],
};
