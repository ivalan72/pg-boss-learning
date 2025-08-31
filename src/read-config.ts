import { readFile } from 'node:fs/promises';
import { IConfig } from './config.interface';

export async function readConfig(filename: string): Promise<IConfig> {
    const content = await readFile(filename, { encoding: 'utf-8' });
    return JSON.parse(content) as IConfig;
}
