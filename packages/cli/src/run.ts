import { Decision } from '@esroyo/ahp-lib';
import type {
    ComparisonResponse,
    DecisionSetupResponse,
    IntensityScaleOption,
    Logger,
    Prompt,
    PromptOptions,
    RunState,
    ScaleResponse,
} from './types.ts';

const phaseMap: Record<number, string> = {
    1: 'Setup',
    2: 'Comparing alternatives',
    3: 'Comparing criteria',
    4: 'Results',
};

const percentage = (pos: number, total: number): number =>
    Math.round(pos / total * 100);

const buildStatusLine = (runState: RunState) => {
    const progress = percentage(runState.totalStep, runState.totalSteps) || 0;
    const length = 20;
    const progressBar = Array.from(
        { length },
        (_, idx) => percentage(idx, length) < progress ? '#' : '-',
    ).join('');
    const goal = `   Goal:         ${runState.decision?.goal || '?'}`;
    const criteria = `   Criteria:     (${
        runState.decision?.criteria.length || '?'
    }) ${runState.decision?.criteria.map((c) => c.name).join(', ') || '-'}`;
    const alternatives = `   Alternatives: (${
        runState.decision?.alternatives.length || '?'
    }) ${runState.decision?.alternatives.map((a) => a.name).join(', ') || '-'}`;
    const totalSteps = runState.totalSteps ? ` | ${runState.totalStep}/${runState.totalSteps}` : '';
    const step = `   Progress:     [${progressBar}] ${progress}%${totalSteps}`;
    const phase = `   Phase:        ${
        phaseMap[runState.phase]
    } | ${runState.phaseStep}/${runState.phaseSteps}`;
    return ['', goal, criteria, alternatives, '', step, phase, ''].join('\n');
};

const pairs = (n: number): number => n === 0 ? 0 : (n - 1) + pairs(n - 1);

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
 * @param logger - Output functions for displaying results
 *
 * @example
 * ```typescript
 * import enquirer from 'enquirer';
 * import { run } from './run.ts';
 *
 * await run(enquirer.prompt, console);
 * ```
 */
export async function run(
    prompt: Prompt,
    logger: Logger,
): Promise<Decision> {
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
    };

    // Welcome message
    logger.clear();
    logger.info(`Welcome to the AHP decision making tool!
This tool will help you make structured decisions using proven mathematical methods.

Let's structure your decision step by step.
`);

    /**
     * Initial setup prompts to gather decision structure.
     * These prompts collect the goal, criteria, and alternatives needed
     * to build the AHP decision framework.
     */
    const setupSteps: PromptOptions[] = [
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

    const setupResponse = await prompt<DecisionSetupResponse>(
        setupSteps,
        runState,
    );

    // Create decision from user input
    const decision: Decision = Decision.from({
        goal: setupResponse.goal,
        criteria: setupResponse.criteria.map((name) => ({ name: name.trim() })),
        alternatives: setupResponse.alternatives.map((name) => ({
            name: name.trim(),
        })),
    });

    runState.phaseStep = 3;
    runState.decision = decision;

    const alternativeComparisons = pairs(decision.alternatives.length) *
        decision.criteria.length;
    const criteriaComparisons = pairs(decision.criteria.length);
    const totalComparisons = alternativeComparisons + criteriaComparisons;
    runState.totalSteps = totalComparisons + runState.phaseSteps + 1;
    runState.totalStep = runState.phaseStep;

    /**
     * Phase 2: Alternative Comparisons
     * For each criterion, compare all pairs of alternatives to determine
     * their relative performance on that specific criterion.
     */
    logger.clear();
    runState.phase = 2;
    runState.phaseStep = 0;
    runState.phaseSteps = alternativeComparisons;

    for (const criterion of decision.criteria) {
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
                    continue;
                }

                runState.phaseStep += 1;
                runState.totalStep += 1;

                const choices = [
                    { name: candidate.name, value: candidate.name },
                    { name: otherCandidate.name, value: otherCandidate.name },
                ];

                // Substep 1: Identify the weaker candidate
                const step1 = {
                    header: buildStatusLine(runState),
                    type: 'select',
                    name: 'name',
                    message: `Which performs worse on "${criterion.name}"?`,
                    choices,
                };

                logger.clear();
                const weakerResponse = await prompt<ComparisonResponse>(
                    step1,
                    runState,
                );

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

                // Substep 2: Determine the intensity of preference
                const step2 = {
                    header: buildStatusLine(runState),
                    type: 'scale',
                    name: 'comparison',
                    message:
                        `How much better is "${stronger.name}" than "${weaker.name}" on "${criterion.name}"?`,
                    scale,
                    margin: [1, 1, 2, 1],
                    choices: [{
                        name: 'weight',
                        initial: 1, // Start at "Moderate"
                    }],
                };

                logger.clear();
                const scaleResult = await prompt<ScaleResponse>(
                    step2,
                    runState,
                );

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
    logger.clear();
    runState.phase = 3;
    runState.phaseStep = 0;
    runState.phaseSteps = criteriaComparisons;

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

            const choices = [
                { name: criterion.name, value: criterion.name },
                { name: otherCriterion.name, value: otherCriterion.name },
            ];

            // Substep 1: Identify the less important criterion
            const step1 = {
                header: buildStatusLine(runState),
                type: 'select',
                name: 'name',
                message:
                    `Which criterion is LESS important for achieving the goal?`,
                choices,
            };

            logger.clear();
            const weakerResponse = await prompt<ComparisonResponse>(
                step1,
                runState,
            );

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

            // Substep 2: Determine the importance difference
            const step2 = {
                header: buildStatusLine(runState),
                type: 'scale',
                name: 'comparison',
                message:
                    `How much more important is "${stronger.name}" than "${weaker.name}" for the goal?`,
                scale,
                margin: [1, 1, 2, 1],
                choices: [{
                    name: 'weight',
                    initial: 1, // Start at "Moderate"
                }],
            };

            logger.clear();
            const scaleResult = await prompt<ScaleResponse>(step2, runState);

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
    logger.clear();
    runState.phase = 4;
    runState.phaseStep = 1;
    runState.phaseSteps = 1;
    runState.totalSteps += 1;

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
