import { Decision, type JsonDecisionComplete } from '@esroyo/ahp-lib';
import type {
    ComparisonResponse,
    DecisionSetupResponse,
    IntensityScaleOption,
    Logger,
    Prompt,
    PromptOptionsWithReply,
    RunConfig,
    ScaleResponse,
} from './types.ts';

/**
 * Interactive CLI runner for AHP (Analytic Hierarchy Process) decision making.
 *
 * This function guides users through the complete AHP workflow:
 * 1. Define the decision goal
 * 2. Specify criteria and alternatives
 * 3. Make pairwise comparisons for alternatives across each criterion
 * 4. Make pairwise comparisons for criteria importance
 * 5. Calculate and display final rankings
 *
 * @param prompt - The prompt function (typically from enquirer)
 * @param print - Output function for displaying results
 * @param config - Configuration options for logging and output
 *
 * @example
 * ```typescript
 * import enquirer from 'enquirer';
 * import { run } from './run.ts';
 *
 * // Run with standard console output
 * await run(enquirer.prompt, console.log);
 *
 * // Run with verbose logging
 * await run(enquirer.prompt, console.log, { verbose: true, debug: true });
 * ```
 */
export async function run(
    prompt: Prompt,
    logger: Logger,
    config: RunConfig = {},
): Promise<void> {
    const end = <T>(list: T[]): T => list[list.length - 1];

    /**
     * Predefined intensity scale for user-friendly comparison input.
     * Maps AHP intensity values to descriptive labels that users can understand.
     */
    const scale: IntensityScaleOption[] = [
        { name: Decision.Intensity.Equal, message: 'Equal' },
        { name: Decision.Intensity.Moderate, message: 'Moderate' },
        { name: Decision.Intensity.Strong, message: 'Strong' },
        { name: Decision.Intensity.VeryStrong, message: 'Very strong' },
        { name: Decision.Intensity.Extreme, message: 'Extreme' },
    ] as const;

    /**
     * Initial setup prompts to gather decision structure.
     * These prompts collect the goal, criteria, and alternatives needed
     * to build the AHP decision framework.
     */
    const steps: PromptOptionsWithReply[] = [
        {
            type: 'input',
            name: 'goal',
            message: 'What is the decision you need to make?',
            validate: (input: string) => {
                if (!input || input.trim().length < 3) {
                    return 'Goal must be at least 3 characters long';
                }
                return true;
            },
        },
        {
            type: 'list',
            name: 'criteria',
            message: 'Type a comma-separated list of criteria (minimum 2)',
            validate: (items: string[]) => {
                if (items.length < 2) {
                    return 'Please provide at least 2 criteria';
                }
                if (items.some((item) => item.length < 3)) {
                    return 'Each criterion must be at least 3 characters long';
                }
                return true;
            },
        },
        {
            type: 'list',
            name: 'alternatives',
            message:
                'Type a comma-separated list of alternative candidates (minimum 2)',
            validate: (items: string[]) => {
                if (items.length < 2) {
                    return 'Please provide at least 2 alternatives';
                }
                if (items.some((item) => item.length < 3)) {
                    return 'Each alternative must be at least 3 characters long';
                }
                return true;
            },
        },
    ];

    // Collect initial decision structure
    logger.info("Let's structure your decision step by step.\n");

    logger.debug('Starting decision setup phase');
    const response = await prompt<DecisionSetupResponse>(steps);
    logger.debug('User provided setup:', response);

    // Create decision from user input
    const decision: Decision = Decision.from({
        goal: response.goal,
        criteria: response.criteria.map((name) => ({ name: name.trim() })),
        alternatives: response.alternatives.map((name) => ({
            name: name.trim(),
        })),
    });

    logger.debug('Decision object created with IDs:', {
        decisionId: decision.id,
        criteria: decision.criteria.map((c) => ({ name: c.name, id: c.id })),
        alternatives: decision.alternatives.map((a) => ({
            name: a.name,
            id: a.id,
        })),
    });

    logger.info(`\n✅ Decision structure created:`);
    logger.info(`   Goal: ${decision.goal}`);
    logger.info(
        `   Criteria (${decision.criteria.length}): ${
            decision.criteria.map((c) => c.name).join(', ')
        }`,
    );
    logger.info(
        `   Alternatives (${decision.alternatives.length}): ${
            decision.alternatives.map((a) => a.name).join(', ')
        }`,
    );

    const totalComparisons =
        (decision.alternatives.length * (decision.alternatives.length - 1) *
            decision.criteria.length) +
        (decision.criteria.length * (decision.criteria.length - 1));
    logger.info(
        `\nYou'll need to make ${totalComparisons} pairwise comparisons.`,
    );
    logger.verbose(
        `Breakdown: ${
            decision.alternatives.length * (decision.alternatives.length - 1) *
            decision.criteria.length
        } alternative comparisons + ${
            decision.criteria.length * (decision.criteria.length - 1)
        } criteria comparisons`,
    );
    logger.info('');

    /**
     * Phase 1: Alternative Comparisons
     * For each criterion, compare all pairs of alternatives to determine
     * their relative performance on that specific criterion.
     */
    logger.info('Phase 1: Comparing alternatives for each criterion...\n');

    let comparisonCount = 0;
    const alternativeComparisons = decision.alternatives.length *
        (decision.alternatives.length - 1) * decision.criteria.length;

    for (const criterion of decision.criteria) {
        logger.info(`\n--- Evaluating "${criterion.name}" ---`);
        logger.debug(
            `Processing criterion: ${criterion.name} (ID: ${criterion.id})`,
        );

        for (const candidate of decision.alternatives) {
            for (const otherCandidate of decision.alternatives) {
                if (candidate === otherCandidate) {
                    continue;
                }

                // Skip if comparison already exists
                if (
                    candidate.comparisons?.find((comp) =>
                        comp.criterionId === criterion.id &&
                        comp.measurements.find((meas) =>
                            meas.pairId === otherCandidate.id && meas.weight
                        )
                    )
                ) {
                    logger.debug(
                        `Skipping existing comparison: ${candidate.name} vs ${otherCandidate.name} on ${criterion.name}`,
                    );
                    continue;
                }

                comparisonCount += 1;

                logger.verbose(
                    `Starting comparison ${comparisonCount}/${alternativeComparisons}: ${candidate.name} vs ${otherCandidate.name} on ${criterion.name}`,
                );

                const choices = [
                    { name: candidate.name, value: candidate.name },
                    { name: otherCandidate.name, value: otherCandidate.name },
                ];

                // Step 1: Identify the weaker candidate
                steps.push({
                    type: 'select',
                    name: 'name',
                    message:
                        `[${comparisonCount}/${alternativeComparisons}] Which performs worse on "${criterion.name}"?`,
                    choices,
                });

                const weakerResponse = await prompt<ComparisonResponse>(
                    end(steps),
                );
                end(steps).reply = weakerResponse;

                const weaker = decision.alternatives.find((alt) =>
                    alt.name === weakerResponse.name
                )!;
                const stronger = decision.alternatives.find((alt) =>
                    alt.name ===
                        choices.find(({ value }) =>
                            value !== weakerResponse.name
                        )?.value
                )!;

                // Set initial equal comparison
                decision.compare({
                    item: weaker,
                    pair: stronger,
                    criterion,
                    weight: Decision.Intensity.Equal,
                });

                comparisonCount += 1;

                // Step 2: Determine the intensity of preference
                steps.push({
                    type: 'scale',
                    name: 'comparison',
                    message:
                        `[${comparisonCount}/${alternativeComparisons}] How much better is "${stronger.name}" than "${weaker.name}" on "${criterion.name}"?`,
                    scale,
                    margin: [1, 1, 2, 1],
                    choices: [{
                        name: 'weight',
                        initial: 1, // Start at "Moderate"
                    }],
                });

                const scaleResult = await prompt<ScaleResponse>(end(steps));
                end(steps).reply = scaleResult;

                // Apply the comparison with selected intensity
                decision.compare({
                    item: stronger,
                    pair: weaker,
                    criterion,
                    weight: scale[scaleResult.comparison.weight].name,
                });
            }
        }
    }

    /**
     * Phase 2: Criteria Comparisons
     * Compare the relative importance of criteria in achieving the decision goal.
     */
    logger.info('\n\nPhase 2: Comparing criteria importance...\n');

    const criteriaComparisons = decision.criteria.length *
        (decision.criteria.length - 1);
    comparisonCount = 0;

    for (const criterion of decision.criteria) {
        for (const otherCriterion of decision.criteria) {
            if (criterion === otherCriterion) {
                continue;
            }

            // Skip if comparison already exists
            if (
                criterion.comparisons![0].measurements.find((meas) =>
                    meas.pairId === otherCriterion.id && meas.weight
                )
            ) {
                continue;
            }

            comparisonCount += 1;

            const choices = [
                { name: criterion.name, value: criterion.name },
                { name: otherCriterion.name, value: otherCriterion.name },
            ];

            // Step 1: Identify the less important criterion
            steps.push({
                type: 'select',
                name: 'name',
                message:
                    `[${comparisonCount}/${criteriaComparisons}] Which criterion is LESS important for achieving the goal?`,
                choices,
            });

            const weakerResponse = await prompt<ComparisonResponse>(end(steps));
            end(steps).reply = weakerResponse;

            const weaker = decision.criteria.find((crit) =>
                crit.name === weakerResponse.name
            )!;
            const stronger = decision.criteria.find((crit) =>
                crit.name ===
                    choices.find(({ value }) => value !== weakerResponse.name)
                        ?.value
            )!;

            // Set initial equal comparison
            decision.compare({
                item: weaker,
                pair: stronger,
                weight: Decision.Intensity.Equal,
            });

            comparisonCount += 1;

            // Step 2: Determine the importance difference
            steps.push({
                type: 'scale',
                name: 'comparison',
                message:
                    `[${comparisonCount}/${criteriaComparisons}] How much more important is "${stronger.name}" than "${weaker.name}" for the goal?`,
                scale,
                margin: [1, 1, 2, 1],
                choices: [{
                    name: 'weight',
                    initial: 1, // Start at "Moderate"
                }],
            });

            const scaleResult = await prompt<ScaleResponse>(end(steps));
            end(steps).reply = scaleResult;

            // Apply the criteria comparison
            decision.compare({
                item: stronger,
                pair: weaker,
                weight: scale[scaleResult.comparison.weight].name,
            });
        }
    }

    /**
     * Phase 3: Evaluation and Results
     * Calculate final priorities using AHP mathematics and display results.
     */
    logger.info('\n\nCalculating results...\n');

    try {
        decision.evaluate();
    } catch (error) {
        logger.info('❌ Error during evaluation:');
        if (Error.isError(error)) {
            logger.info(error.message);
        }
        logger.info(
            '\nThis might indicate incomplete or inconsistent comparisons.',
        );
        Deno.exit(1);
    }

    // For console format, use the rich display
    printResults(decision, logger);

    // If file output has been requested, save as JSON
    if (config.output) {
        try {
            await Deno.writeTextFile(
                config.output,
                JSON.stringify(decision, null, 2),
            );
            logger.verbose(
                `✅ Results saved as JSON to: ${config.output}`,
            );
        } catch (error) {
            if (Error.isError(error)) {
                logger.info(`❌ Failed to write to file: ${error.message}`);
            }
        }
    }

    logger.info('\n' + '='.repeat(50));
    logger.info(
        `✅ Decision analysis complete! The recommended choice is: ${decision.summary.recommendedChoice}`,
    );

    // Graceful exit
    Deno.exit(0);
}

/**
 * Display results in rich console format.
 *
 * @param decision - Evaluated Decision object
 * @param logger - Logger instance for output
 */
function printResults(
    decision: JsonDecisionComplete,
    logger: Record<'info' | 'table', (...data: unknown[]) => void>,
) {
    // Prepare and sort results
    const results = decision.alternatives
        .map((alt) => ({
            name: alt.name,
            priority: Number((alt.priority! * 100).toFixed(2)),
            rawPriority: alt.priority!,
        }))
        .sort((a, b) => b.rawPriority - a.rawPriority);

    // Display comprehensive results
    logger.info('DECISION RESULTS');
    logger.info('='.repeat(50));
    logger.info(`\nGoal: ${decision.goal}\n`);

    logger.info('CRITERIA IMPORTANCE:');
    decision.criteria
        .sort((a, b) => b.priority! - a.priority!)
        .forEach((criterion, index) => {
            const percentage = (criterion.priority! * 100).toFixed(1);
            logger.info(`   ${index + 1}. ${criterion.name}: ${percentage}%`);
        });

    logger.info('\nFINAL RANKINGS:');
    results.forEach((result, index) => {
        logger.info(`   ${index + 1}. ${result.name}: ${result.priority}%`);
    });

    logger.info('\n DETAILED BREAKDOWN:');
    logger.table(decision.summary.breakdown);
}
