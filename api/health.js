const packageJson = require('../package.json');

module.exports = function health(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    response.status(200).json({
        ok: true,
        service: 'ambo-sleeper',
        version: packageJson.version,
        timestamp: new Date().toISOString()
    });
};
