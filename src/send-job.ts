import { exit, argv } from 'node:process';
import PgBoss from 'pg-boss';
import { readConfig } from './read-config';
import { getTimeout } from './get-timeout';

interface JobData {
    name: string;
    timeout: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function sendJob(boss: PgBoss, queueName: string, data: JobData): Promise<string | null> {
    const id = await boss.send(queueName, data);

    return id;
}

async function main() {
    const { connectionString, queueName = 'default' } = await readConfig(argv[2]);

    const boss = new PgBoss({ connectionString, monitorStateIntervalSeconds: 1 });

    boss.on('error', console.error);

    await boss.start();

    await boss.createQueue(queueName);

    const name = argv[3] || 'NoName';
    const timeout = getTimeout(1000, 5000);
    const id = await boss.send(queueName, { name, timeout });

    await boss.stop();

    return { name, timeout, id, queueName };
}

main()
    .then((data) => {
        const { id, name, timeout, queueName } = data;
        console.log(
            `created job {id: '${id}', name: '${name}', timeout: ${timeout}ms} in queueName '${queueName}'`
        );
    })
    .catch((error) => {
        console.error(error);
        exit(1);
    });
