import { Decision } from '@esroyo/ahp-lib';
import type {
    ComparisonResponse,
    DecisionSetupResponse,
    IntensityScaleOption,
    Logger,
    Prompt,
    RunState,
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
 * await run(enquirer.prompt, console);
 *
 * // Run with verbose logging
 * await run(enquirer.prompt, console);
 * ```
 */
export async function run(
    prompt: Prompt,
    logger: Logger,
): Promise<Decision> {
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

    const runState: RunState = {
        phase: 1,
        phaseSteps: 3,
        phaseStep: 1,
        totalSteps: 0,
        totalStep: 0,
        /**
         * Initial setup prompts to gather decision structure.
         * These prompts collect the goal, criteria, and alternatives needed
         * to build the AHP decision framework.
         */
        steps: [
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
        ],
    };

    // Welcome message
    logger.info('Welcome to the AHP decision making tool!');
    logger.info(
        'This tool will help you make structured decisions using proven mathematical methods.\n',
    );

    // Collect initial decision structure
    logger.info("Let's structure your decision step by step.\n");

    logger.debug('Starting decision setup phase');
    logger.trace({ runState });

    const response = await prompt<DecisionSetupResponse>(
        runState.steps,
        runState,
    );
    logger.debug('User provided setup:', response);

    runState.phaseStep = 3;

    // Create decision from user input
    const decision: Decision = Decision.from({
        goal: response.goal,
        criteria: response.criteria.map((name) => ({ name: name.trim() })),
        alternatives: response.alternatives.map((name) => ({
            name: name.trim(),
        })),
    });
    runState.decision = decision;

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
    runState.totalSteps = totalComparisons + runState.phaseSteps;
    runState.totalStep = runState.phaseStep;
    logger.trace({ runState });
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
     * Phase 2: Alternative Comparisons
     * For each criterion, compare all pairs of alternatives to determine
     * their relative performance on that specific criterion.
     */
    logger.info('Phase 2: Comparing alternatives for each criterion...\n');

    runState.phase = 2;
    runState.phaseStep = 0;
    runState.phaseSteps = decision.alternatives.length *
        (decision.alternatives.length - 1) * decision.criteria.length;
    logger.trace({ runState });

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

                runState.phaseStep += 1;
                runState.totalStep += 1;
                logger.trace({ runState });

                logger.verbose(
                    `Starting comparison ${runState.phaseStep}/${runState.phaseSteps}: ${candidate.name} vs ${otherCandidate.name} on ${criterion.name}`,
                );

                const choices = [
                    { name: candidate.name, value: candidate.name },
                    { name: otherCandidate.name, value: otherCandidate.name },
                ];

                // Step 1: Identify the weaker candidate
                runState.steps.push({
                    type: 'select',
                    name: 'name',
                    message:
                        `[${runState.phaseStep}/${runState.phaseSteps}] Which performs worse on "${criterion.name}"?`,
                    choices,
                });

                const weakerResponse = await prompt<ComparisonResponse>(
                    end(runState.steps),
                    runState,
                );
                end(runState.steps).reply = weakerResponse;

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

                runState.phaseStep += 1;
                runState.totalStep += 1;
                logger.trace({ runState });

                // Step 2: Determine the intensity of preference
                runState.steps.push({
                    type: 'scale',
                    name: 'comparison',
                    message:
                        `[${runState.phaseStep}/${runState.phaseSteps}] How much better is "${stronger.name}" than "${weaker.name}" on "${criterion.name}"?`,
                    scale,
                    margin: [1, 1, 2, 1],
                    choices: [{
                        name: 'weight',
                        initial: 1, // Start at "Moderate"
                    }],
                });

                const scaleResult = await prompt<ScaleResponse>(
                    end(runState.steps),
                    runState,
                );
                end(runState.steps).reply = scaleResult;

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
     * Phase 3: Criteria Comparisons
     * Compare the relative importance of criteria in achieving the decision goal.
     */
    logger.info('\n\nPhase 3: Comparing criteria importance...\n');

    runState.phase = 3;
    runState.phaseStep = 0;
    runState.phaseSteps = decision.criteria.length *
        (decision.criteria.length - 1);
    logger.trace({ runState });

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

            runState.phaseStep += 1;
            runState.totalStep += 1;
            logger.trace({ runState });

            const choices = [
                { name: criterion.name, value: criterion.name },
                { name: otherCriterion.name, value: otherCriterion.name },
            ];

            // Step 1: Identify the less important criterion
            runState.steps.push({
                type: 'select',
                name: 'name',
                message:
                    `[${runState.phaseStep}/${runState.phaseSteps}] Which criterion is LESS important for achieving the goal?`,
                choices,
            });

            const weakerResponse = await prompt<ComparisonResponse>(
                end(runState.steps),
                runState,
            );
            end(runState.steps).reply = weakerResponse;

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

            runState.phaseStep += 1;
            runState.totalStep += 1;
            logger.trace({ runState });

            // Step 2: Determine the importance difference
            runState.steps.push({
                type: 'scale',
                name: 'comparison',
                message:
                    `[${runState.phaseStep}/${runState.phaseSteps}] How much more important is "${stronger.name}" than "${weaker.name}" for the goal?`,
                scale,
                margin: [1, 1, 2, 1],
                choices: [{
                    name: 'weight',
                    initial: 1, // Start at "Moderate"
                }],
            });

            const scaleResult = await prompt<ScaleResponse>(
                end(runState.steps),
                runState,
            );
            end(runState.steps).reply = scaleResult;

            // Apply the criteria comparison
            decision.compare({
                item: stronger,
                pair: weaker,
                weight: scale[scaleResult.comparison.weight].name,
            });
        }
    }

    /**
     * Phase 4: Evaluation and Results
     * Calculate final priorities using AHP mathematics and display results.
     */
    logger.info('\n\nCalculating results...\n');
    runState.phase = 4;
    runState.phaseStep = 0;
    runState.phaseSteps = 0;
    logger.trace({ runState });

    decision.evaluate();

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

    logger.info('\n' + '='.repeat(50));
    logger.info(
        `✅ Decision analysis complete! The recommended choice is: ${decision.summary.recommendedChoice}`,
    );

    return decision;
}
