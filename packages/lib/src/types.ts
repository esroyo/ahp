import type { RequiredDeep, SetRequiredDeep, Simplify } from 'type-fest';

/**
 * Represents a pairwise comparison measurement between two items.
 *
 * @example
 * ```typescript
 * const measurement: Measurement = {
 *   pairId: "criterion-2",
 *   weight: 3 // Item is moderately preferred over the pair
 * };
 * ```
 */
export type Measurement = {
    /** The id of the item being compared against */
    pairId: string;
    /**
     * The comparison weight using the Saaty scale (1-9).
     * - 1: Equal importance
     * - 3: Moderate preference
     * - 5: Strong preference
     * - 7: Very strong preference
     * - 9: Extreme preference
     * - 2,4,6,8: Intermediate values
     */
    weight?: number;
};

/**
 * Represents a set of pairwise comparisons for an item.
 *
 * @example
 * ```typescript
 * const comparison: Comparison = {
 *   measurements: [
 *     { pairId: "item-2", weight: 3 },
 *     { pairId: "item-3", weight: 5 }
 *   ],
 *   priority: 0.637 // Calculated after evaluation
 * };
 * ```
 */
export type Comparison = {
    /** Array of pairwise comparison measurements */
    measurements: Measurement[];
};

/**
 * Comparison data structure for criteria.
 * Criteria are compared directly against each other without reference to a specific criterion.
 */
export type CriterionComparison = Comparison;

/**
 * Comparison data structure for alternatives.
 * Alternatives are compared with respect to a specific criterion.
 *
 * @example
 * ```typescript
 * const altComparison: AlternativeComparison = {
 *   criterionId: "experience",
 *   measurements: [
 *     { pairId: "candidate-2", weight: 4 }
 *   ]
 * };
 * ```
 */
export type AlternativeComparison =
    & Comparison
    & {
        /** The id of the criterion this comparison is made with respect to */
        criterionId: string;
        /** Calculated priority/weight after evaluation (0-1, sum to 1 across all items) */
        priority?: number;
    };

/**
 * Represents a decision criterion - a factor used to evaluate alternatives.
 *
 * @example
 * ```typescript
 * const criterion: Criterion = {
 *   id: "exp-001",
 *   name: "Experience",
 *   comparisons: [{
 *     measurements: [
 *       { pairId: "edu-001", weight: 3 } // Experience is moderately more important than Education
 *     ]
 *   }],
 *   priority: 0.75 // This criterion accounts for 75% of the decision weight
 * };
 * ```
 */
export type Criterion = {
    /** Unique identifier for the criterion */
    id?: string;
    /** Human-readable name for the criterion (minimum 3 characters) */
    name: string;
    /** Pairwise comparisons with other criteria */
    comparisons?: CriterionComparison[];
    /** Calculated priority/importance of this criterion (0-1, sum to 1 across all criteria) */
    priority?: number;
};

/**
 * Represents a decision alternative - an option being evaluated.
 *
 * @example
 * ```typescript
 * const alternative: Alternative = {
 *   id: "candidate-001",
 *   name: "Alice Johnson",
 *   comparisons: [
 *     {
 *       criterionId: "experience",
 *       measurements: [
 *         { pairId: "candidate-002", weight: 5 } // Alice strongly preferred over Bob for experience
 *       ]
 *     },
 *     {
 *       criterionId: "education",
 *       measurements: [
 *         { pairId: "candidate-002", weight: 2 } // Alice slightly preferred over Bob for education
 *       ]
 *     }
 *   ],
 *   priority: 0.68 // Alice has 68% preference overall
 * };
 * ```
 */
export type Alternative = {
    /** Unique identifier for the alternative */
    id?: string;
    /** Human-readable name for the alternative (minimum 3 characters) */
    name: string;
    /** Pairwise comparisons with other alternatives for each criterion */
    comparisons?: AlternativeComparison[];
    /** Calculated overall priority/preference for this alternative (0-1, sum to 1 across all alternatives) */
    priority?: number;
};

/**
 * Represents a complete AHP decision structure.
 *
 * @example
 * ```typescript
 * const decision: JsonDecision = {
 *   id: "hire-manager-2024",
 *   goal: "Choose the best manager for the marketing team",
 *   criteria: [
 *     { name: "Leadership Experience" },
 *     { name: "Technical Skills" },
 *     { name: "Cultural Fit" }
 *   ],
 *   alternatives: [
 *     { name: "Alice Johnson" },
 *     { name: "Bob Smith" },
 *     { name: "Carol Davis" }
 *   ]
 * };
 * ```
 */
export type JsonDecision = {
    /** Unique identifier for the decision */
    id?: string;
    /** Description of what is being decided (minimum 3 characters) */
    goal?: string;
    /** Array of criteria used to evaluate alternatives (minimum 2 required) */
    criteria?: Criterion[];
    /** Array of alternatives being evaluated (minimum 2 required) */
    alternatives?: Alternative[];
    /** A summary of the results once evaluted */
    summary?: {
        recommendedChoice: string;
        breakdown: Record<string, Record<string, number>>;
    };
};

/**
 * A JsonDecision with all required fields filled and proper structure.
 * This represents a decision that has been properly initialized with ids and comparison structures.
 */
export type JsonDecisionFilled = SetRequiredDeep<
    JsonDecision,
    | 'id'
    | 'goal'
    | 'criteria'
    | 'alternatives'
    | `${'criteria' | 'alternatives'}.${number}.${'id' | 'comparisons'}`
>;

/**
 * A JsonDecisionFilled with all comparison weights provided.
 * This represents a decision where all pairwise comparisons have been made.
 */
export type JsonDecisionValid = SetRequiredDeep<
    JsonDecisionFilled,
    `${
        | 'criteria'
        | 'alternatives'}.${number}.comparisons.${number}.measurements.${number}.weight`
>;

/**
 * A complete JsonDecision with all optional fields required and priorities calculated.
 * This represents a fully evaluated decision ready for analysis.
 */
export type JsonDecisionComplete = Simplify<RequiredDeep<JsonDecision>>;

/**
 * The Saaty intensity scale used for pairwise comparisons in AHP.
 * Each value represents the strength of preference of one element over another.
 *
 * @example
 * ```typescript
 * // Comparing two criteria
 * decision.compare({
 *   item: { name: "Quality" },
 *   pair: { name: "Cost" },
 *   weight: Intensity.Strong // Quality is strongly preferred over Cost
 * });
 *
 * // Using numeric values directly
 * decision.compare({
 *   item: { name: "Alice" },
 *   pair: { name: "Bob" },
 *   criterion: { name: "Experience" },
 *   weight: 7 // Alice is very strongly preferred over Bob for experience
 * });
 * ```
 */
export enum Intensity {
    /**
     * Two elements contribute equally to the objective.
     * Use when items have equal importance or preference.
     */
    Equal = 1,
    /**
     * Experience and judgment slightly favor one element over another.
     * (Intermediate value between Equal and Moderate)
     */
    SlightlyModerate = 2,
    /**
     * Experience and judgement moderately favor one element over another.
     * Use when you have a moderate preference but it's not overwhelming.
     */
    Moderate = 3,
    /**
     * Experience and judgment more than moderately favor one element over another.
     * (Intermediate value between Moderate and Strong)
     */
    ModeratelyStrong = 4,
    /**
     * Experience and judgement strongly favor one element over another.
     * Use when you have a clear, strong preference.
     */
    Strong = 5,
    /**
     * Experience and judgment very strongly favor one element over another.
     * (Intermediate value between Strong and Very Strong)
     */
    StronglyToVeryStrong = 6,
    /**
     * One element is favored very strongly over another;
     * its dominance is demonstrated in practice.
     */
    VeryStrong = 7,
    /**
     * One element is favored very to extremely strongly over another.
     * (Intermediate value between Very Strong and Extreme Importance)
     */
    VeryToExtremelyStrong = 8,
    /**
     * The evidence favoring one element over another is of the highest
     * possible order or affirmation. Use only when you have absolute certainty.
     */
    Extreme = 9,
}
