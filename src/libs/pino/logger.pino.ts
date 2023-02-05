import pino from 'pino'

export const Logger = pino({
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        level: 'debug',
        options: {
          ...{
            ignore: 'pid,hostname',
            colorize: true,
            translateTime: true,
          },
        },
      },
    ],
  },
})

export type Logger = pino.Logger
