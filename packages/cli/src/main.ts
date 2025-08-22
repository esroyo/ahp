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
 * Enhanced console logging with better formatting, timestamp support, and log levels.
 * Provides structured output for the CLI application with configurable verbosity levels.
 *
 * @param config - Configuration object containing verbose level and debug flags
 */
function createLogger(
    config: { verbose: boolean; debug: boolean; verboseLevel: number },
) {
    return {
        info: (...data: unknown[]) => {
            console.log(...data);
        },
        table: (...data: unknown[]) => {
            console.table(...data);
        },
        verbose: (...data: unknown[]) => {
            if (config.verbose) { // -v or higher
                const timestamp = new Date().toLocaleTimeString();
                console.log(`[${timestamp}]`, ...data);
            }
        },
        debug: (...data: unknown[]) => {
            if (config.debug) { // -vv or higher
                const timestamp = new Date().toLocaleTimeString();
                console.log(`[DEBUG ${timestamp}]`, ...data);
            }
        },
        trace: (...data: unknown[]) => {
            if (config.verboseLevel >= 3) { // -vvv or higher
                const timestamp = new Date().toLocaleTimeString();
                console.log(`[TRACE ${timestamp}]`, ...data);
            }
        },
        error: (...data: unknown[]) => {
            console.error(...data);
        },
    };
}

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
    // First, manually count the verbose flags before parsing
    let verboseCount = 0;
    const filteredArgs: string[] = [];

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '-v') {
            verboseCount++;
        } else if (arg.startsWith('-v') && arg.length > 2) {
            // Handle -vv, -vvv, etc.
            verboseCount += arg.length - 1; // -vv = 2, -vvv = 3, etc.
        } else {
            filteredArgs.push(arg);
        }
    }

    const parsed = parseArgs(filteredArgs, {
        boolean: ['help', 'version'],
        string: ['output'],
        alias: {
            h: 'help',
            V: 'version', // Capital V for version (standard)
            o: 'output',
        },
        unknown: (arg: string) => {
            // Skip -v flags as we've already processed them
            if (
                arg === '-v' ||
                (arg.startsWith('-v') && arg.length > 2 && arg.match(/^-v+$/))
            ) {
                return true; // Allow these flags
            }
            console.error(`❌ Unknown option: ${arg}`);
            console.error('Use --help for available options');
            Deno.exit(1);
        },
    });

    // Validate output file extension
    if (parsed.output) {
        const expectedExtension = '.json';
        if (!parsed.output.endsWith(expectedExtension)) {
            console.log(
                `⚠️  Warning: Output file should have ${expectedExtension} extension`,
            );
        }
    }

    // Determine verbosity levels
    const isVerbose = verboseCount >= 1; // -v
    const isDebug = verboseCount >= 2; // -vv or more

    return {
        help: parsed.help as boolean,
        version: parsed.version as boolean,
        output: parsed.output as string | undefined,
        verbose: isVerbose,
        debug: isDebug,
        verboseLevel: verboseCount,
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
    -v                      Enable verbose output (level 1)
    -vv                     Enable debug mode (level 2+)

VERBOSITY LEVELS:
    (none)      Standard output with essential information
    -v          Verbose mode - shows progress and timing details
    -vv         Debug mode - includes internal state and detailed logging
    -vvv+       Extra debug - maximum verbosity for troubleshooting

EXAMPLES:
    # Basic interactive session
    deno run -A jsr:@esroyo/ahp-cli
    
    # Verbose output to see progress
    deno run -A jsr:@esroyo/ahp-cli -v
    
    # Debug mode for troubleshooting
    deno run -A jsr:@esroyo/ahp-cli -vv
    
    # Save results as JSON with verbose output
    deno run -A jsr:@esroyo/ahp-cli -o results.json -v
    
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
    • Use -v for progress tracking during long decision sessions
    • Use -vv for troubleshooting if you encounter issues
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
        const logger = createLogger(config);

        // Handle help and version flags
        if (config.help) {
            showHelp();
            Deno.exit(0);
        }

        if (config.version) {
            showVersion();
            Deno.exit(0);
        }

        // Debug output for configuration
        logger.debug('Parsed CLI configuration:', config);

        // Welcome message
        logger.info('Welcome to the AHP decision making tool!');
        logger.info(
            'This tool will help you make structured decisions using proven mathematical methods.\n',
        );

        if (config.verbose) {
            logger.verbose(
                'Running in verbose mode - detailed progress will be shown',
            );
        }

        if (config.debug) {
            logger.debug('Debug mode enabled - internal state will be logged');
        }

        // Enhanced run function with configuration
        await run(enquirer.prompt, logger, config);
    } catch (error) {
        console.error('\n❌ An error occurred:');
        if (Error.isError(error)) {
            console.error(error.message);

            if (error.stack) {
                console.error('\nStack trace:');
                console.error(error.stack);
            }
        }

        console.error(
            '\nIf this error persists, please report it as an issue.',
        );
        console.error(
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
