import type { Decision } from '@esroyo/ahp-lib';

/**
 * Type alias for the enquirer prompt function.
 * This abstraction allows for easier testing and dependency injection.
 *
 * @example
 * ```typescript
 * import enquirer from 'enquirer';
 * const myPrompt: Prompt = enquirer.prompt;
 *
 * // Use in tests with a mock
 * const mockPrompt: Prompt = async (questions) => ({ answer: 'test' });
 * ```
 */
export type Prompt = <T = object>(
    questions: PromptOptions | PromptOptions[],
    runState: RunState,
) => Promise<T>;

/**
 * Base configuration options for enquirer prompts.
 * Defines the common structure that all prompt configurations should follow.
 *
 * @example
 * ```typescript
 * const inputPrompt: PromptOptions = {
 *   type: 'input',
 *   name: 'goal',
 *   message: 'What is your decision goal?',
 *   validate: (input: string) => input.length > 3
 * };
 *
 * const selectPrompt: PromptOptions = {
 *   type: 'select',
 *   name: 'choice',
 *   message: 'Pick an option',
 *   choices: [
 *     { name: 'Option 1', value: 'opt1' },
 *     { name: 'Option 2', value: 'opt2' }
 *   ]
 * };
 * ```
 */
export interface PromptOptions {
    /** The type of prompt (input, select, scale, etc.) */
    type: string;
    /** The name/key for the response value */
    name: string;
    /** The message displayed to the user */
    message: string;
    /** Optional validation function */
    validate?: (input: any) => boolean | string;
    /** Optional choices for select/multi-select prompts */
    choices?: Array<
        { name: string; value?: unknown; disabled?: boolean; initial?: unknown }
    >;
    /** Optional initial/default value */
    initial?: unknown;
    /** Optional scale configuration for scale prompts */
    scale?: Array<{ name: number | string; message: string }>;
    /** Optional margin configuration for display */
    margin?: number[];
    header?: string;
    footer?: string;
}

/**
 * Response structure for initial decision setup prompts.
 * Contains the basic building blocks needed to create an AHP decision.
 *
 * @example
 * ```typescript
 * const setupResponse: DecisionSetupResponse = {
 *   goal: "Choose the best laptop",
 *   criteria: ["Performance", "Price", "Battery Life"],
 *   alternatives: ["MacBook Pro", "ThinkPad", "Dell XPS"]
 * };
 * ```
 */
export interface DecisionSetupResponse {
    /** The decision goal or objective */
    goal: string;
    /** List of criteria names for evaluation */
    criteria: string[];
    /** List of alternative option names */
    alternatives: string[];
}

/**
 * Response structure for comparison prompts.
 * Used when asking users to identify the weaker item in a pairwise comparison.
 *
 * @example
 * ```typescript
 * const comparisonResponse: ComparisonResponse = {
 *   name: "Budget Option" // The user selected this as the weaker choice
 * };
 * ```
 */
export interface ComparisonResponse {
    /** Name of the selected item (typically the weaker one) */
    name: string;
}

/**
 * Response structure for scale/intensity prompts.
 * Contains the user's assessment of how much stronger one item is over another.
 *
 * @example
 * ```typescript
 * const scaleResponse: ScaleResponse = {
 *   comparison: {
 *     weight: 2 // Index into the intensity scale (0=Equal, 1=Moderate, etc.)
 *   }
 * };
 * ```
 */
export interface ScaleResponse {
    /** The comparison assessment */
    comparison: {
        /** Index into the predefined intensity scale */
        weight: number;
    };
}

/**
 * Configuration for intensity scale options displayed to users.
 * Maps internal AHP intensity values to user-friendly labels.
 *
 * @example
 * ```typescript
 * const customScale: IntensityScaleOption[] = [
 *   { name: 1, message: 'Equal importance' },
 *   { name: 3, message: 'Moderate preference' },
 *   { name: 5, message: 'Strong preference' },
 *   { name: 7, message: 'Very strong preference' },
 *   { name: 9, message: 'Extreme preference' }
 * ];
 * ```
 */
export interface IntensityScaleOption {
    /** The AHP intensity value (1-9) */
    name: number;
    /** User-friendly description of this intensity level */
    message: string;
}

/**
 * Configuration options for CLI argument parsing.
 * Represents the parsed and validated command line arguments.
 *
 * @example
 * ```typescript
 * const config: CliConfig = {
 *   help: false,
 *   version: false,
 *   output: 'results.json',
 *   _: [] // No positional arguments
 * };
 * ```
 */
export interface CliConfig {
    /** Show help message */
    help: boolean;
    /** Show version information */
    version: boolean;
    /** Optional output file path */
    output?: string;
    /** Positional arguments */
    _: (string | number)[];
}

export type Logger = Pick<Console, 'info' | 'table' | 'clear'>;

export type RunState = {
    decision?: Decision;
    phase: number;
    phaseSteps: number;
    phaseStep: number;
    totalSteps: number;
    totalStep: number;
};
