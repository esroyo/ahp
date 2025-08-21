import eig from 'matrix-eig';

import {
    type Alternative,
    type Criterion,
    Intensity,
    type JsonDecision,
    type JsonDecisionComplete,
    JsonDecisionFilled,
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

export class Decision implements JsonDecision {
    public id!: string;
    public goal!: string;
    public criteria!: Criterion[];
    public alternatives!: Alternative[];
    public static Intensity = Intensity;
    protected uid: () => string;

    constructor(
        { uid = crypto.randomUUID.bind(crypto) }: { uid?: () => string } = {},
    ) {
        this.uid = uid;
        this.fill();
    }

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

    assertValid(): asserts this is this & JsonDecisionValid {
        const result = this.validate();
        if (!result.valid) {
            throw new AggregateError(result.errors, 'Validation failed');
        }
    }

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
    }

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

    static getRightEigenvector(matrix: number[][]): Float64Array<ArrayBuffer> {
        const vector = eig(matrix).eigenvectors.right.slice(
            0,
            matrix.length,
        );
        const scale = 1 / vector.reduce((acc, curr) => acc + curr, 0);
        return vector.map((p) => p * scale);
    }
}
