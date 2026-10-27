const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const compression = require('compression');

const config = require('./config');
const AppError = require('./utils/AppError');
const RequestLogger = require('./middleware/request-logger');
const Response = require('./utils/Response_handler');
const Route = require('./routes/index');

const app = express();

app.disable('etag').disable('x-powered-by');
app.set('trust proxy', 1); // correct client IPs (rate limiting) behind Render/Railway/nginx

app.use('/static', express.static(path.join(__dirname, '../public')));

app.use(cors({
    origin: config.corsOrigin === '*' ? '*' : config.corsOrigin.split(',').map((s) => s.trim()),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
}));

if (config.env !== 'production' && config.env !== 'test') app.use(RequestLogger);

app.use(helmet());

app.use('/api', rateLimit({
    windowMs: 60 * 1000, max: 300,
    message: { isSuccess: false, status: 'fail', message: 'Too many requests from this IP, please try again later.', errorCode: 'RATE_LIMITED' },
}));

app.use(express.json({ limit: '100kb' }));
app.use(hpp({ whitelist: [] })); // parameter pollution guard

app.use(compression());

Route(app);


app.use((req, res, next) => next(new AppError(`Route ${req.originalUrl} not found`, 404, true, 'ROUTE_NOT_FOUND')));

// Global error handler (must have 4 args)
app.use(Response.sendError);

module.exports = app;
