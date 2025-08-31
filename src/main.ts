import { exit } from 'node:process';
import PgBoss from 'pg-boss';
import { IConfig } from './config.interface';
import { Logger } from './logger.service';
import { readConfig } from './read-config';

interface JobData {
    name: string;
    timeout: number;
}

class App {
    constructor(
        private config: IConfig,
        private logger: Logger
    ) {}

    async run() {
        const { connectionString, maxWorkersCount = 1, queueName = 'default' } = this.config;

        const boss = new PgBoss({ connectionString, monitorStateIntervalSeconds: 1 });

        boss.on('error', console.error);

        await boss.start();

        await boss.createQueue(queueName);

        const promises: Promise<string>[] = [];

        for (let i = 0; i < maxWorkersCount; i++) {
            promises.push(
                boss.work(queueName, async (job: PgBoss.Job<JobData>[]) => {
                    const {
                        data: { name, timeout },
                        name: queueName,
                    } = job[0];

                    this.logger.log(
                        `Job '${name}' started in queueName '${queueName}' (timeout=${timeout}ms)`
                    );

                    await new Promise((resolve) => setTimeout(() => resolve(0), timeout));

                    this.logger.log(
                        `Job '${name}' finished in queueName '${queueName}' (timeout=${timeout}ms)`
                    );
                })
            );
        }

        const workesIds = await Promise.all(promises);

        this.logger.log(`Started ${workesIds.length} worker(s): [${workesIds.join(', ')}]`);
    }
}

(async () => {
    const config = await readConfig(process.argv[2]);
    const logger = new Logger({});
    const app = new App(config, logger);
    return app.run();
})().catch((error) => {
    console.error(error);
    exit(1);
});
