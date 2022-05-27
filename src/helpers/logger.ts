import winston, {format} from "winston";

export const myformat = format.combine(
    format.errors({ stack: true }), 
    format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.align(),
    format.printf(info => `[${info.timestamp}] [${info.level}]: ${info.stack == null ? info.message.trim() : info.stack}`)
);

export default winston.createLogger({
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
