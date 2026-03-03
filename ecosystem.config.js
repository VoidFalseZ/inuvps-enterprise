module.exports = {
    apps: [
        {
            name: 'inuvps-enterprise',
            script: 'dist/main.js',
            instances: 2, // 2 of 4 cores (leave room for FFmpeg)
            exec_mode: 'cluster',
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
            max_memory_restart: '1G',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: '/var/log/pm2/inuvps-error.log',
            out_file: '/var/log/pm2/inuvps-out.log',
        },
    ],
};
