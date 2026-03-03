module.exports = {
    apps: [
        {
            name: 'inuvps-enterprise',
            script: 'dist/main.js',
            instances: 'max', // Scale across all available CPU cores
            exec_mode: 'cluster',
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
        },
    ],
};
