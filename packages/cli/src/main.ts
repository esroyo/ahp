import enquirer from 'enquirer';
import { run } from './run.ts';

if (import.meta.main) {
    await run(enquirer.prompt, console.log.bind(console));
}
