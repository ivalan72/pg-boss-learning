import dayjs from 'dayjs';
import { readFile } from 'node:fs/promises';
import { exit } from 'node:process';
import PgBoss from 'pg-boss';

interface IConfig {
    queueName: string;
    connectionString: string;
    maxWorkersCount?: number;
}

interface JobData {
    name: string;
    timeout: number;
}

async function readConfig(filename: string): Promise<IConfig> {
    const content = await readFile(filename, { encoding: 'utf-8' });
    return JSON.parse(content) as IConfig;
}

async function sendJob(boss: PgBoss, queueName: string, data: JobData): Promise<string | null> {
    const id = await boss.send(queueName, data);

    const { name, timeout } = data;
    console.log(`created job '${name}' in queueName '${queueName}' (timeout=${timeout}ms)`);

    return id;
}

function getTime(): string {
    return dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss.SSS');
}

function getTimeout(): number {
    return 1000 + Math.round(Math.random() * 9000);
}

async function doJob(job: PgBoss.Job<JobData>[]) {
    const { data: { name, timeout }, name: queueName } = job[0];

    console.log(
        `${getTime()}: Job '${name}' started in queueName '${queueName}' (timeout=${timeout}ms)`
    );

    await new Promise((resolve) => setTimeout(() => resolve(0), timeout));

    console.log(
        `${getTime()}: Job '${name}' finished in queueName '${queueName}' (timeout=${timeout}ms)`
    );
}

async function main() {
    const {
        connectionString,
        maxWorkersCount = 3,
        queueName = 'default',
    } = await readConfig(process.argv[2]);

    const boss = new PgBoss({ connectionString, monitorStateIntervalSeconds: 1 });

    boss.on('error', console.error);

    await boss.start();

    console.log('PgBoss started');

    await boss.createQueue(queueName);

    for (let i = 1; i <= 20; i++) {
        await sendJob(boss, queueName, { name: `Job-${i}`, timeout: getTimeout() });
    }

    const promises: Promise<string>[] = [];

    for (let i = 0; i < maxWorkersCount; i++) {
        promises.push(boss.work(queueName, doJob));
    }

    const workesIds = await Promise.all(promises);

    console.log(`Started ${workesIds.length} worker(s): [${workesIds.join(', ')}]`)
}

main()
    .catch((error) => {
        console.error(error);
        exit(1);
    });
