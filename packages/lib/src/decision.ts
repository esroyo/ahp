import eig from 'matrix-eig';

import {
    type Alternative,
    type Criterion,
    Intensity,
    type JsonDecision,
    type JsonDecisionComplete,
    type JsonDecisionFilled,
    type JsonDecisionValid,
} from './types.ts';

import {
    InsufficientAlternatives,
    InsufficientCriteria,
    MissingAlternativeComparison,
    MissingAlternativeComparisons,
    MissingAlternativeId,
    MissingAlternativeMeasurement,
    MissingAlternativeName,
    MissingCriterionComparisons,
    MissingCriterionId,
    MissingCriterionMeasurement,
    MissingCriterionName,
    MissingDecisionGoal,
    MissingDecisionId,
    ValidationError,
} from './errors.ts';

/**
 * Implementation of the Analytic Hierarchy Process (AHP) for multi-criteria decision making.
 *
 * The Decision class helps structure complex decisions by breaking them down into:
 * - A goal (what you're trying to decide)
 * - Criteria (factors to evaluate)
 * - Alternatives (options to choose from)
 * - Pairwise comparisons using the Saaty 1-9 scale
 *
 * @example
 * ```typescript
 * // Basic usage example
 * const decision = new Decision();
 * decision.goal = "Choose the best smartphone";
 *
 * // Add criteria
 * decision.add({ criterion: "Price" });
 * decision.add({ criterion: "Battery Life" });
 * decision.add({ criterion: "Camera Quality" });
 *
 * // Add alternatives
 * decision.add({ alternative: "iPhone 15" });
 * decision.add({ alternative: "Samsung Galaxy S24" });
 * decision.add({ alternative: "Google Pixel 8" });
 *
 * // Compare criteria importance (Battery Life is moderately more important than Price)
 * decision.compare({
 *   item: { name: "Battery Life" },
 *   pair: { name: "Price" },
 *   weight: 3
 * });
 *
 * // Compare alternatives for each criterion
 * decision.compare({
 *   item: { name: "iPhone 15" },
 *   pair: { name: "Samsung Galaxy S24" },
 *   criterion: { name: "Camera Quality" },
 *   weight: 5 // iPhone strongly preferred for camera
 * });
 *
 * // Calculate final rankings
 * decision.evaluate();
 *
 * // View results
 * console.log(decision.alternatives.map(alt => ({
 *   name: alt.name,
 *   priority: alt.priority
 * })));
 * ```
 *
 * @example
 * ```typescript
 * // Creating from existing data
 * const decision = Decision.from({
 *   goal: "Hire a software engineer",
 *   criteria: [
 *     { name: "Technical Skills" },
 *     { name: "Communication" },
 *     { name: "Experience" }
 *   ],
 *   alternatives: [
 *     { name: "Candidate A" },
 *     { name: "Candidate B" },
 *     { name: "Candidate C" }
 *   ]
 * });
 *
 * // The decision is automatically filled with empty comparison structures
 * console.log(decision.validate()); // Shows what comparisons are still needed
 * ```
 */
export class Decision implements JsonDecision {
    /** Unique identifier for this decision */
    public id!: string;

    /** The goal or objective of this decision */
    public goal!: string;

    /** Array of criteria used to evaluate alternatives */
    public criteria!: Criterion[];

    /** Array of alternatives being compared */
    public alternatives!: Alternative[];

    /** Reference to the Intensity enum for convenience */
    public static Intensity = Intensity;

    /** Function used to generate unique ids */
    protected uid: () => string;

    /**
     * Creates a new Decision instance.
     *
     * @param options Configuration options
     * @param options.uid Custom function to generate unique ids. Defaults to crypto.randomUUID
     *
     * @example
     * ```typescript
     * // Default constructor with crypto.randomUUID
     * const decision = new Decision();
     *
     * // Custom id generator
     * let counter = 0;
     * const decision = new Decision({
     *   uid: () => `decision-${++counter}`
     * });
     * ```
     */
    constructor(
        { uid = crypto.randomUUID.bind(crypto) }: { uid?: () => string } = {},
    ) {
        this.uid = uid;
        this.fill();
    }

    /**
     * Creates a Decision instance from existing data.
     * Automatically fills in missing structure like ids and comparison arrays.
     *
     * @param data JSON string or object containing decision data
     * @returns A new Decision instance with filled structure
     *
     * @example
     * ```typescript
     * // From object
     * const decision = Decision.from({
     *   goal: "Choose vacation destination",
     *   criteria: [
     *     { name: "Cost" },
     *     { name: "Weather" }
     *   ],
     *   alternatives: [
     *     { name: "Hawaii" },
     *     { name: "Europe" }
     *   ]
     * });
     *
     * // From JSON string
     * const jsonData = '{"goal":"Choose laptop","criteria":[{"name":"Price"}]}';
     * const decision = Decision.from(jsonData);
     * ```
     */
    public static from(
        data: string | JsonDecision,
    ): Decision & JsonDecisionFilled {
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        const obj = JSON.parse(str) as JsonDecision;
        const decision: Decision = new Decision();
        Object.assign(decision, obj);
        decision.fill();
        return decision;
    }

    /**
     * Fills in missing structure for the decision.
     * - Generates ids for decision, criteria, and alternatives
     * - Creates empty comparison arrays with proper structure
     * - Sets default goal if missing
     *
     * This method is called automatically by the constructor and static methods.
     *
     * @example
     * ```typescript
     * const decision = new Decision();
     * decision.criteria.push({ name: "New Criterion" });
     * decision.fill(); // Generates id and comparison structure for the new criterion
     * ```
     */
    fill(): asserts this is this & JsonDecisionFilled {
        if (!this.id) {
            this.id = this.uid();
        }

        if (!this.goal) {
            this.goal = 'unknown';
        }

        if (!this.criteria || !Array.isArray(this.criteria)) {
            this.criteria = [];
        }

        if (!this.alternatives || !Array.isArray(this.alternatives)) {
            this.alternatives = [];
        }

        for (const criterion of this.criteria) {
            if (!criterion.id) {
                criterion.id = this.uid();
            }
        }

        for (const criterion of this.criteria) {
            if (
                !criterion.comparisons || !Array.isArray(criterion.comparisons)
            ) {
                criterion.comparisons = [{ measurements: [] }];
            }
            criterion.comparisons[0].measurements = this.criteria
                .filter((cr) => cr.id !== criterion.id)
                .map((cr) =>
                    criterion.comparisons![0].measurements.find((w) =>
                        w.pairId === cr.id
                    ) ||
                    { pairId: cr.id! }
                );
        }

        for (const alternative of this.alternatives) {
            if (!alternative.id) {
                alternative.id = this.uid();
            }
        }

        for (const alternative of this.alternatives) {
            if (
                !alternative.comparisons ||
                !Array.isArray(alternative.comparisons)
            ) {
                alternative.comparisons = [];
            }
            alternative.comparisons = this.criteria.map((criterion) => {
                // Before creating a comparison, check if it already exists
                const comparison = alternative.comparisons!
                    .find((comp) =>
                        comp && comp.criterionId === criterion.id
                    ) ||
                    {
                        criterionId: criterion.id!,
                        measurements: this.alternatives
                            .filter((alt) => alt.id !== alternative.id)
                            .map((alt) => ({ pairId: alt.id! })),
                    };
                // Check if some measurements are missing
                if (
                    comparison.measurements.length !==
                        this.alternatives.length - 1
                ) {
                    // Complete measurements
                    comparison.measurements = this.alternatives
                        .filter((alt) => alt.id !== alternative.id)
                        .map((alt) => {
                            const measurement = comparison.measurements
                                .find((m) => m.pairId === alt.id);
                            if (measurement) {
                                return measurement;
                            }
                            return { pairId: alt.id! };
                        });
                }
                return comparison;
            });
        }
    }

    /**
     * Makes a pairwise comparison between two items using the Saaty 1-9 scale.
     *
     * For criteria comparisons (when no criterion parameter is provided):
     * - Compares the relative importance of two criteria
     *
     * For alternative comparisons (when criterion parameter is provided):
     * - Compares how two alternatives perform on a specific criterion
     *
     * @param params Comparison parameters
     * @param params.item The item being compared (receives the weight)
     * @param params.pair The item being compared against
     * @param params.criterion The criterion for alternative comparisons (omit for criteria comparisons)
     * @param params.weight The comparison weight (1-9 Saaty scale)
     *
     * @throws {ValidationError} When items are not found or weight is invalid
     *
     * @example
     * ```typescript
     * const decision = Decision.from({
     *   criteria: [{ name: "Quality" }, { name: "Price" }],
     *   alternatives: [{ name: "Product A" }, { name: "Product B" }]
     * });
     *
     * // Compare criteria importance
     * decision.compare({
     *   item: { name: "Quality" },
     *   pair: { name: "Price" },
     *   weight: 5 // Quality is strongly more important than Price
     * });
     *
     * // Compare alternatives on Quality criterion
     * decision.compare({
     *   item: { name: "Product A" },
     *   pair: { name: "Product B" },
     *   criterion: { name: "Quality" },
     *   weight: 3 // Product A is moderately better than Product B on Quality
     * });
     *
     * // Using ids instead of names
     * decision.compare({
     *   item: { id: "prod-a-id" },
     *   pair: { id: "prod-b-id" },
     *   criterion: { id: "price-id" },
     *   weight: 7 // Product A is very strongly better than Product B on Price
     * });
     * ```
     */
    compare(
        { item: inputItem, pair: inputPair, criterion, weight }: {
            item: Partial<Alternative | Criterion>;
            pair: Partial<Alternative | Criterion>;
            criterion?: Partial<Criterion>;
            weight: number;
        },
    ) {
        this.fill();

        if (criterion) {
            criterion = this.criteria.find((cr) =>
                (criterion!.id && cr.id === criterion!.id) ||
                (criterion!.name && cr.name === criterion!.name)
            );
            if (!criterion) {
                throw new ValidationError(
                    'Criterion not found among the criteria',
                );
            }
        }

        // Depending if a criterion was passed or not
        // we consider the item/pair to be alternatives or not
        const list: Array<
            typeof this.alternatives[0] | typeof this.criteria[0]
        > = criterion ? this.alternatives : this.criteria;
        const item = list.find((alt) =>
            (inputItem.id && alt.id === inputItem.id) ||
            (inputItem.name && alt.name === inputItem.name)
        );
        const pair = list.find((alt) =>
            (inputPair.id && alt.id === inputPair.id) ||
            (inputPair.name && alt.name === inputPair.name)
        );

        if (!item || !pair) {
            throw new ValidationError(
                `Item and/or pair not found among the ${
                    criterion ? 'alternatives' : 'criteria'
                }`,
            );
        }

        if (!weight || typeof Decision.Intensity[weight] === 'undefined') {
            throw new ValidationError(
                `The weight should be in the scale [${
                    Object.values(Decision.Intensity).filter(Number.isInteger)
                }]`,
            );
        }

        const comparison = criterion
            ? item.comparisons
                .find((comp) =>
                    'criterionId' in comp && comp.criterionId === criterion.id
                )
            : item.comparisons[0]; // Criteria only are compared in 1 dimension

        if (!comparison) {
            throw new ValidationError('Unexpected missing comparison');
        }

        const measurement = comparison.measurements
            .find((m) => m.pairId === pair.id);

        if (!measurement) {
            throw new ValidationError('Unexpected missing measurement');
        }

        measurement.weight = weight;

        // The weaker candidate gets weight of "1"
        // so if this weight is not "1", the other
        // side of the comparison must have "1"
        if (weight !== Decision.Intensity.Equal) {
            const pairComparison = criterion
                ? pair.comparisons.find((comp) =>
                    'criterionId' in comp && comp.criterionId === criterion.id
                )
                : pair.comparisons[0]; // Criteria only are compared in 1 dimension

            const pairMeasurement = pairComparison?.measurements
                .find((m) => m.pairId === item.id);

            if (!pairMeasurement) {
                throw new ValidationError('Unexpected missing measurement');
            }

            pairMeasurement.weight = Decision.Intensity.Equal;
        }
    }

    /**
     * Adds a new criterion or alternative to the decision.
     * Automatically generates id and creates comparison structure.
     *
     * @param options Object containing either criterion or alternative to add
     * @param options.criterion Criterion to add (object or string name)
     * @param options.alternative Alternative to add (object or string name)
     *
     * @throws {ValidationError} When name is missing or duplicated
     *
     * @example
     * ```typescript
     * const decision = new Decision();
     *
     * // Add criteria (multiple ways)
     * decision.add({ criterion: "Quality" }); // Simple string
     * decision.add({ criterion: { name: "Price", id: "custom-id" } }); // With custom id
     *
     * // Add alternatives
     * decision.add({ alternative: "Product A" });
     * decision.add({ alternative: { name: "Product B" } });
     *
     * // After adding, comparison structures are automatically created
     * console.log(decision.criteria[0].comparisons); // Ready for comparisons
     * ```
     */
    add(
        options: {
            criterion?: Partial<Criterion> | string;
            alternative?: Partial<Alternative> | string;
        },
    ) {
        const criterion = typeof options.criterion === 'string'
            ? { name: options.criterion }
            : options.criterion;
        const alternative = typeof options.alternative === 'string'
            ? { name: options.alternative }
            : options.alternative;
        const valid = criterion?.name ||
            alternative?.name;

        if (!valid) {
            throw new ValidationError(
                'A Criterion or an Alternative should be provided',
            );
        }

        if (criterion) {
            if (this.criteria.find((cr) => cr.name === criterion.name)) {
                throw new ValidationError(
                    `A Criterion named "${criterion.name}" already exists`,
                );
            }
            // push a copy
            this.criteria.push({ ...criterion as Required<Criterion> });
        }

        if (alternative) {
            if (
                this.alternatives.find((alt) => alt.name === alternative.name)
            ) {
                throw new ValidationError(
                    `An Alternative named "${alternative.name}" already exists`,
                );
            }
            // push a copy
            this.alternatives.push({ ...alternative as Required<Alternative> });
        }

        this.fill();
    }

    /**
     * Removes a criterion or alternative from the decision.
     * Also removes all related comparisons.
     *
     * @param params Object specifying what to remove
     * @param params.criterion Criterion to remove (by id or name)
     * @param params.alternative Alternative to remove (by id or name)
     *
     * @example
     * ```typescript
     * const decision = Decision.from({
     *   criteria: [{ name: "Quality" }, { name: "Price" }],
     *   alternatives: [{ name: "Product A" }, { name: "Product B" }]
     * });
     *
     * // Remove by name
     * decision.remove({ criterion: { name: "Price" } });
     *
     * // Remove by id
     * decision.remove({ alternative: { id: "prod-a-id" } });
     *
     * // Comparison structures are automatically updated
     * console.log(decision.criteria.length); // 1 (Price removed)
     * ```
     */
    remove(
        { criterion, alternative }: {
            criterion?: Partial<Criterion>;
            alternative?: Partial<Alternative>;
        },
    ) {
        if (criterion && (criterion.id || criterion.name)) {
            const removed = this.criteria
                .find((cr) =>
                    (criterion.id && cr.id === criterion.id) ||
                    (!criterion.id && cr.name === criterion.name)
                );

            if (removed) {
                this.criteria = this.criteria.filter((cr) =>
                    cr.id !== removed.id
                );
            }
        }

        if (alternative && (alternative.id || alternative.name)) {
            const removed = this.alternatives
                .find((alt) =>
                    (alternative.id && alt.id === alternative.id) ||
                    (!alternative.id && alt.name === alternative.name)
                );

            if (removed) {
                this.alternatives = this.alternatives.filter((alt) =>
                    alt.id !== removed.id
                );
            }
        }

        this.fill();
    }

    /**
     * Validates the decision structure and completeness.
     * Checks for required fields, minimum counts, and missing comparisons.
     *
     * @returns Validation result with success flag and any errors found
     *
     * @example
     * ```typescript
     * const decision = new Decision();
     * decision.goal = "Choose smartphone";
     * decision.add({ criterion: "Price" });
     * decision.add({ alternative: "iPhone" });
     *
     * const result = decision.validate();
     * if (!result.valid) {
     *   console.log("Issues found:");
     *   result.errors.forEach(error => console.log(`- ${error.message}`));
     * }
     * // Output: "Issues found:"
     * //         "- Found 1 criteria, but a minimum of 2 is required"
     * //         "- Found 1 alternatives, but a minimum of 2 is required"
     * ```
     */
    validate(): { valid: boolean; errors: Error[] } {
        const errors: Error[] = [];
        const MINIMUM_CHARS = 3;
        const MINIMUM_ITEMS = 2;

        if (!this.id) {
            errors.push(new MissingDecisionId('Missing id for this decision'));
        }

        if (
            !this.goal ||
            this.goal.length < MINIMUM_CHARS
        ) {
            errors.push(
                new MissingDecisionGoal('Missing goal for this decision'),
            );
        }

        if (
            !this.criteria ||
            !Array.isArray(this.criteria) ||
            this.criteria.length < MINIMUM_ITEMS
        ) {
            errors.push(
                new InsufficientCriteria(
                    `Found ${
                        this.criteria?.length ?? 0
                    } criteria, but a minimum of ${MINIMUM_ITEMS} is required`,
                ),
            );
        }

        if (
            !this.alternatives ||
            !Array.isArray(this.alternatives) ||
            this.alternatives.length < MINIMUM_ITEMS
        ) {
            errors.push(
                new InsufficientAlternatives(
                    `Found ${
                        this.alternatives?.length ?? 0
                    } alternatives, but a minimum of ${MINIMUM_ITEMS} is required`,
                ),
            );
        }

        if (this.criteria) {
            for (const criterion of this.criteria) {
                if (!criterion.id) {
                    errors.push(
                        new MissingCriterionId(
                            `Missing id for criterion "${criterion.name}"`,
                        ),
                    );
                }
                if (
                    !criterion.name ||
                    criterion.name.length < MINIMUM_CHARS
                ) {
                    errors.push(
                        new MissingCriterionName(
                            `Missing or insufficient name for criterion with id "${criterion.id}"`,
                        ),
                    );
                }
                if (
                    !criterion.comparisons ||
                    !Array.isArray(criterion.comparisons) ||
                    criterion.comparisons.length !== 1
                ) {
                    errors.push(
                        new MissingCriterionComparisons(
                            `Missing or invalid number of comparisons for criterion "${criterion.name}" (Expected 1)`,
                        ),
                    );
                } else {
                    const otherCriteria = this.criteria
                        .filter((cr) => cr.id !== criterion.id);
                    for (const pair of otherCriteria) {
                        const measurement = criterion
                            .comparisons
                            ?.[0]
                            ?.measurements
                            ?.find((m) => m.pairId === pair.id);
                        if (
                            !measurement ||
                            typeof Decision.Intensity[measurement.weight!] ===
                                'undefined'
                        ) {
                            errors.push(
                                new MissingCriterionMeasurement(
                                    `Missing or invalid measurement for criterion "${criterion.name}" with respect to "${pair.name}" (Weight "${measurement?.weight}" not found in scale [${
                                        Object.values(Decision.Intensity)
                                            .filter(Number.isInteger)
                                    }])`,
                                ),
                            );
                        }
                    }
                }
            }
        }

        if (this.alternatives) {
            for (const alternative of this.alternatives) {
                if (!alternative.id) {
                    errors.push(
                        new MissingAlternativeId(
                            `Missing id for alternative "${alternative.name}"`,
                        ),
                    );
                }
                if (
                    !alternative.name ||
                    alternative.name.length < MINIMUM_CHARS
                ) {
                    errors.push(
                        new MissingAlternativeName(
                            `Missing of insufficient name for alternative with id "${alternative.id}"`,
                        ),
                    );
                }

                const expected = this.criteria?.length ?? 0;
                if (
                    !alternative.comparisons ||
                    !Array.isArray(alternative.comparisons) ||
                    alternative.comparisons.length !== expected
                ) {
                    errors.push(
                        new MissingAlternativeComparisons(
                            `Missing or invalid number of comparisons for alternative "${alternative.name}" (Expected ${expected})`,
                        ),
                    );
                } else if (this.criteria) {
                    for (const criterion of this.criteria) {
                        const comparison = alternative.comparisons
                            .find((comp) =>
                                comp && comp.criterionId === criterion.id
                            );
                        if (!comparison) {
                            errors.push(
                                new MissingAlternativeComparison(
                                    `Missing comparison for criteria "${criterion.name}" on alternative "${alternative.name}"`,
                                ),
                            );
                        } else {
                            const otherAlternatives = this.alternatives
                                .filter((alt) => alt.id !== alternative.id);
                            for (const pair of otherAlternatives) {
                                const measurement = comparison.measurements
                                    .find((m) => m.pairId === pair.id);
                                if (
                                    !measurement ||
                                    typeof Decision
                                            .Intensity[measurement.weight!] ===
                                        'undefined'
                                ) {
                                    errors.push(
                                        new MissingAlternativeMeasurement(
                                            `Missing or invalid measurement for alternative "${alternative.name}" with pair "${pair.name}" with repect to "${criterion.name}" (Weight "${measurement?.weight}" not found in scale [${
                                                Object.values(
                                                    Decision.Intensity,
                                                ).filter(Number.isInteger)
                                            }])`,
                                        ),
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }

        return {
            errors,
            valid: !errors.length,
        };
    }

    /**
     * Validates the decision and throws an error if validation fails.
     * Use this when you want to ensure the decision is valid before proceeding.
     *
     * @throws {AggregateError} When validation fails, containing all validation errors
     *
     * @example
     * ```typescript
     * const decision = Decision.from({
     *   goal: "Choose laptop",
     *   criteria: [{ name: "Price" }, { name: "Performance" }],
     *   alternatives: [{ name: "MacBook" }, { name: "ThinkPad" }]
     * });
     *
     * try {
     *   decision.assertValid(); // Will throw - no comparisons made yet
     * } catch (error) {
     *   console.log(`Validation failed: ${error.message}`);
     *   // Handle validation errors
     * }
     *
     * // Make all required comparisons...
     * decision.compare({ item: { name: "Price" }, pair: { name: "Performance" }, weight: 3 });
     * // ... add all other comparisons
     *
     * decision.assertValid(); // Now passes
     * ```
     */
    assertValid(): asserts this is this & JsonDecisionValid {
        const result = this.validate();
        if (!result.valid) {
            throw new AggregateError(result.errors, 'Validation failed');
        }
    }

    /**
     * Evaluates the decision using the Analytic Hierarchy Process (AHP).
     * Calculates priority weights for all criteria and alternatives using eigenvalue decomposition.
     *
     * The evaluation process:
     * 1. Creates pairwise comparison matrices from your comparisons
     * 2. Calculates the principal eigenvector of each matrix
     * 3. Normalizes the eigenvectors to get priority weights
     * 4. Combines criteria weights with alternative weights to get final rankings
     *
     * @throws {AggregateError} If the decision is not valid (missing comparisons, etc.)
     *
     * @example
     * ```typescript
     * const decision = Decision.from({
     *   goal: "Choose vacation destination",
     *   criteria: [{ name: "Cost" }, { name: "Weather" }],
     *   alternatives: [{ name: "Hawaii" }, { name: "Colorado" }]
     * });
     *
     * // Make all required comparisons
     * decision.compare({
     *   item: { name: "Weather" },
     *   pair: { name: "Cost" },
     *   weight: 3 // Weather is moderately more important
     * });
     *
     * decision.compare({
     *   item: { name: "Hawaii" },
     *   pair: { name: "Colorado" },
     *   criterion: { name: "Weather" },
     *   weight: 5 // Hawaii strongly better weather
     * });
     *
     * decision.compare({
     *   item: { name: "Colorado" },
     *   pair: { name: "Hawaii" },
     *   criterion: { name: "Cost" },
     *   weight: 7 // Colorado very strongly better cost
     * });
     *
     * // Calculate final priorities
     * decision.evaluate();
     *
     * // View results
     * decision.alternatives.forEach(alt => {
     *   console.log(`${alt.name}: ${(alt.priority! * 100).toFixed(1)}%`);
     * });
     * // Example output:
     * // Hawaii: 45.2%
     * // Colorado: 54.8%
     *
     * decision.criteria.forEach(criterion => {
     *   console.log(`${criterion.name} importance: ${(criterion.priority! * 100).toFixed(1)}%`);
     * });
     * // Example output:
     * // Cost importance: 25.0%
     * // Weather importance: 75.0%
     * ```
     */
    evaluate(): asserts this is this & JsonDecisionComplete {
        this.assertValid();

        const criteriaMatrix = Decision.getWeigthsMatrix(this.criteria);
        const criteriaResult = Decision.getRightEigenvector(criteriaMatrix);

        for (const [crIdx, criterion] of Object.entries(this.criteria)) {
            criterion.priority = criteriaResult[crIdx as unknown as number];

            const matrix = Decision.getWeigthsMatrix(
                this.alternatives,
                criterion.id,
            );
            const result = Decision.getRightEigenvector(matrix);

            for (
                const [altIdx, alternative] of Object.entries(this.alternatives)
            ) {
                const comparison = alternative.comparisons
                    .find((comp) => comp.criterionId === criterion.id)!;

                comparison.priority = result[altIdx as unknown as number];

                if (crIdx === '0') {
                    alternative.priority = 0;
                }

                if (typeof alternative.priority === 'undefined') {
                    throw new ValidationError('Unexpected missing priority');
                }

                alternative.priority += comparison.priority *
                    criterion.priority;
            }
        }

        this.summary = {
            recommendedChoice:
                this.alternatives.toSorted((a, b) =>
                    b.priority! - a.priority!
                )[0].name,
            breakdown: Decision.formatAsTable(this as JsonDecisionComplete),
        };
    }

    /**
     * Creates a pairwise comparison matrix from criteria or alternatives data.
     * This is used internally by the evaluate() method to perform eigenvalue calculations.
     *
     * @param data Array of criteria (for criteria matrix) or alternatives (for alternative matrix)
     * @param criterionId Required when creating alternative matrices - specifies which criterion to use
     * @returns Square matrix of pairwise comparison ratios
     *
     * @example
     * ```typescript
     * // This is typically used internally, but can be called directly for analysis
     * const decision = Decision.from({
     *   criteria: [{ name: "A" }, { name: "B" }],
     *   alternatives: [{ name: "X" }, { name: "Y" }]
     * });
     *
     * // Add some comparisons...
     * decision.compare({ item: { name: "A" }, pair: { name: "B" }, weight: 3 });
     *
     * // Get the criteria comparison matrix
     * const matrix = Decision.getWeigthsMatrix(decision.criteria);
     * console.log(matrix);
     * // Output: [[1, 3], [0.333, 1]]
     * // - A vs A = 1 (equal)
     * // - A vs B = 3 (A moderately preferred)
     * // - B vs A = 1/3 (reciprocal)
     * // - B vs B = 1 (equal)
     * ```
     */
    static getWeigthsMatrix(
        data: JsonDecisionValid['criteria'],
    ): number[][];
    static getWeigthsMatrix(
        data: JsonDecisionValid['alternatives'],
        criterionId: Criterion['id'],
    ): number[][];
    static getWeigthsMatrix(
        data: JsonDecisionValid['alternatives'],
        criterionId?: Criterion['id'],
    ): number[][] {
        return data.map((thing) =>
            data.map((pair) => {
                if (thing.id === pair.id) {
                    return 1;
                }
                const thingWeight = thing.comparisons
                    .find((comp) => comp.criterionId === criterionId)
                    ?.measurements
                    .find((comp) => comp.pairId === pair.id)
                    ?.weight;
                const pairWeight = pair.comparisons
                    .find((comp) => comp.criterionId === criterionId)
                    ?.measurements
                    .find((comp) => comp.pairId === thing.id)
                    ?.weight;
                if (
                    typeof thingWeight === 'undefined' ||
                    typeof pairWeight === 'undefined'
                ) {
                    throw new ValidationError('Unexpected missing weight');
                }
                return thingWeight / pairWeight;
            })
        );
    }

    /**
     * Calculates the principal eigenvector of a matrix and normalizes it to sum to 1.
     * This converts a pairwise comparison matrix into priority weights.
     *
     * The principal eigenvector represents the relative priorities derived from
     * pairwise comparisons, which is the mathematical foundation of AHP.
     *
     * @param matrix Square matrix of pairwise comparisons
     * @returns Normalized priority vector (sums to 1)
     *
     * @example
     * ```typescript
     * // Example: If Quality is 3x more important than Price
     * const matrix = [
     *   [1, 3],     // Quality vs [Quality, Price]
     *   [1/3, 1]    // Price vs [Quality, Price]
     * ];
     *
     * const priorities = Decision.getRightEigenvector(matrix);
     * console.log(priorities);
     * // Output: [0.75, 0.25] (Quality: 75%, Price: 25%)
     * ```
     */
    static getRightEigenvector(matrix: number[][]): Float64Array<ArrayBuffer> {
        const vector = eig(matrix).eigenvectors.right.slice(
            0,
            matrix.length,
        );
        const scale = 1 / vector.reduce((acc, curr) => acc + curr, 0);
        return vector.map((p) => p * scale);
    }

    /**
     * Creates an object that is suitable to be printed with console.table
     */
    static formatAsTable(
        decision: JsonDecisionComplete,
        precision: number = 3,
    ): Record<string, Record<string, number>> {
        const round = (value: number) => parseFloat(value.toFixed(precision));
        const rows = decision.alternatives.map((
            alternative,
        ) => [
            alternative.name,
            Object.fromEntries(
                decision.criteria.map((
                    criterion,
                ) => [
                    criterion.name,
                    round(
                        alternative.comparisons.find((meas) =>
                            meas.criterionId === criterion.id
                        )!.priority * criterion.priority,
                    ),
                ]).concat([['Goal', round(alternative.priority)]]),
            ),
        ]);
        const footer = [
            'Totals',
            Object.fromEntries(
                Object.keys(rows[0][1]).map((
                    key,
                ) => [
                    key,
                    round(rows.reduce(
                        (acc, curr) =>
                            acc + curr[1][key as keyof typeof rows[0][1]],
                        0,
                    )),
                ]),
            ),
        ];
        return Object.fromEntries([...rows, footer]);
    }
}
