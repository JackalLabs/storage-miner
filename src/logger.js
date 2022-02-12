const winston = require('winston');
const { format } = winston;

const myformat = format.combine(
    format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.align(),
    format.printf(info => `[${info.timestamp}] [${info.level}]: ${info.stack == null ? info.message.trim() : info.stack}`)
);

const logger = winston.createLogger({
    level: 'info',
    format: myformat,
    defaultMeta: {
        service: 'user-service'
    },
    transports: [

        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error'
        }),
        new winston.transports.File({
            filename: 'logs/combined.log'
        }),
    ],
});

module.exports = logger;
module.exports.myformat = myformat;
