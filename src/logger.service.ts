import dayjs from 'dayjs';

export class Logger {
    private config: object;

    constructor(config: object) {
        this.config = structuredClone(config);
    }

    private getTime(): string {
        return dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss.SSS');
    }

    public log(message: string) {
        console.log(`${this.getTime()}: ${message}`);
    }

    public warn(message: string) {
        console.warn(`${this.getTime()}: ${message}`);
    }

    public error(message: string) {
        console.error(`${this.getTime()}: ${message}`);
    }
}
