/**
 * Main entry point for the AHP Decision Making CLI tool.
 *
 * This command-line interface provides an interactive way to work through
 * complex decisions using the Analytic Hierarchy Process (AHP) methodology.
 *
 * Usage:
 *   deno run -A jsr:@esroyo/ahp-cli
 *
 * The tool will guide you through:
 * 1. Defining your decision goal
 * 2. Specifying evaluation criteria
 * 3. Listing alternative options
 * 4. Making pairwise comparisons
 * 5. Viewing mathematically calculated results
 *
 * @example
 * ```bash
 * # Run the CLI tool
 * deno run -A jsr:@esroyo/ahp-cli
 *
 * # Example session:
 * # Goal: "Choose the best laptop for work"
 * # Criteria: "Performance, Price, Battery Life, Portability"
 * # Alternatives: "MacBook Pro, ThinkPad X1, Dell XPS 13"
 * # [Interactive comparisons follow...]
 * ```
 *
 * @module AHP-CLI
 */

import enquirer from 'enquirer';
import { parseArgs } from '@std/cli/parse-args';

import pkgConfig from '../deno.json' with { type: 'json' };
import { run } from './run.ts';

/**
 * Parse and validate command line arguments using Deno's standard CLI parser.
 * Provides type-safe argument parsing with built-in validation and help generation.
 *
 * @param args - Command line arguments from Deno.args
 * @returns Parsed and validated configuration object
 *
 * @example
 * ```typescript
 * const config = parseCliArguments(['--output', 'results.json']);
 * console.log(config.output); // 'results.json'
 * ```
 */
function parseCliArguments(args: string[]) {
    const parsed = parseArgs(args, {
        boolean: ['help', 'version'],
        string: ['output'],
        alias: {
            h: 'help',
            V: 'version', // Capital V for version (standard)
            o: 'output',
        },
        unknown: (arg: string) => {
            console.error(`❌ Unknown option: ${arg}`);
            console.error('Use --help for available options');
            Deno.exit(1);
        },
    });

    // Validate output file extension
    if (parsed.output) {
        const expectedExtension = '.json';
        if (!parsed.output.endsWith(expectedExtension)) {
            console.info(
                `⚠️  Warning: Output file should have ${expectedExtension} extension`,
            );
        }
    }

    return {
        help: parsed.help as boolean,
        version: parsed.version as boolean,
        output: parsed.output as string | undefined,
        // Include any additional positional arguments
        _: parsed._,
    };
}

/**
 * Display comprehensive help information for the CLI tool.
 * Shows usage instructions, available options, examples, and background information.
 */
function showHelp(): void {
    console.log(`
AHP Decision Making CLI Tool

USAGE:
    deno run -A jsr:@esroyo/ahp-cli [OPTIONS]

OPTIONS:
    -h, --help              Show this help message
    -V, --version           Show version information
    -o, --output <FILE>     Save results to JSON file

EXAMPLES:
    # Basic interactive session
    deno run -A jsr:@esroyo/ahp-cli
    
    # Save results as JSON
    deno run -A jsr:@esroyo/ahp-cli -o results.json
    
ABOUT:
    This tool implements the Analytic Hierarchy Process (AHP) for structured
    decision making. AHP helps you make complex decisions by breaking them
    down into criteria and alternatives, then using pairwise comparisons
    to mathematically determine the best choice.

    The process involves:
    1. Define your decision goal
    2. Specify evaluation criteria (minimum 2)
    3. List alternative options (minimum 2)  
    4. Make pairwise comparisons using a 1-9 scale
    5. Review mathematically calculated rankings

    Perfect for decisions like:
    • Choosing between job offers          • Selecting vendors or suppliers
    • Picking investment options           • Evaluating product alternatives
    • Making hiring decisions              • Strategic business planning
    • Personal major decisions             • Resource allocation

TIPS:
    • Be consistent in your comparisons for reliable results
    • Take breaks during long sessions to maintain judgment quality
    • Review criteria weights to ensure they align with your priorities
    `);
}

/**
 * Display version and build information.
 */
function showVersion(): void {
    console.log(`
AHP Decision Making CLI v${pkgConfig.version || '0.0.0'}
Built on Deno ${Deno.version.deno}
TypeScript ${Deno.version.typescript}

For more information: https://github.com/esroyo/ahp
`);
}

/**
 * Main application entry point.
 * Handles CLI argument parsing using @std/cli, help/version display, and delegates to the main run function.
 */
async function main(): Promise<void> {
    try {
        const config = parseCliArguments(Deno.args);

        if (config.help) {
            showHelp();
            Deno.exit(0);
        }

        if (config.version) {
            showVersion();
            Deno.exit(0);
        }

        const decision = await run(enquirer.prompt, console);

        // If file output has been requested, save as JSON
        if (config.output) {
            try {
                await Deno.writeTextFile(
                    config.output,
                    JSON.stringify(decision, null, 2),
                );
                console.info(
                    `✅ Results saved as JSON to: ${config.output}`,
                );
            } catch (error) {
                if (Error.isError(error)) {
                    console.info(
                        `❌ Failed to write to file: ${error.message}`,
                    );
                }
            }
        }

        Deno.exit(0);
    } catch (error) {
        console.info('\n❌ An error occurred:');
        if (Error.isError(error)) {
            console.error(error.message);
        }

        console.info(
            '\nIf this error persists, please report it as an issue.',
        );
        console.info(
            'Use --help for usage information or --debug for detailed logging.',
        );

        Deno.exit(1);
    }
}

/**
 * Execute main function only when this file is run directly.
 * This allows the module to be imported without automatically executing.
 */
if (import.meta.main) {
    await main();
}
