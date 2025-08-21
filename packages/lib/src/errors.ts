/**
 * Base error class for all decision-related errors.
 * Automatically sets the error name to the class name.
 *
 * @example
 * ```typescript
 * try {
 *   // Some decision operation
 * } catch (error) {
 *   if (error instanceof DecisionError) {
 *     console.log(`Decision error: ${error.name} - ${error.message}`);
 *   }
 * }
 * ```
 */
export class DecisionError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

/**
 * Thrown when decision validation fails.
 * This is the base class for all validation-specific errors.
 *
 * @example
 * ```typescript
 * try {
 *   decision.compare({ item: { name: "Invalid" }, pair: { name: "Test" }, weight: 15 });
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.log(`Validation failed: ${error.message}`);
 *   }
 * }
 * ```
 */
export class ValidationError extends DecisionError {}

/**
 * Thrown when fewer than 2 alternatives are provided.
 * AHP requires at least 2 alternatives to make meaningful comparisons.
 *
 * @example
 * ```typescript
 * const decision = new Decision();
 * decision.add({ alternative: "Only Option" });
 *
 * const result = decision.validate();
 * // Will contain InsufficientAlternatives error
 * ```
 */
export class InsufficientAlternatives extends ValidationError {}

/**
 * Thrown when fewer than 2 criteria are provided.
 * AHP requires at least 2 criteria to make meaningful comparisons.
 *
 * @example
 * ```typescript
 * const decision = new Decision();
 * decision.add({ criterion: "Only Criterion" });
 *
 * const result = decision.validate();
 * // Will contain InsufficientCriteria error
 * ```
 */
export class InsufficientCriteria extends ValidationError {}

/**
 * Thrown when an alternative is missing a comparison for a specific criterion.
 * Each alternative must have comparisons with all other alternatives for every criterion.
 *
 * @example
 * ```typescript
 * // This error occurs when the comparison structure is corrupted
 * // Normally prevented by the fill() method
 * ```
 */
export class MissingAlternativeComparison extends ValidationError {}

/**
 * Thrown when an alternative is missing its comparisons array entirely.
 * Each alternative must have a comparisons array with one entry per criterion.
 *
 * @example
 * ```typescript
 * // This error occurs when the comparison structure is corrupted
 * // Normally prevented by the fill() method
 * ```
 */
export class MissingAlternativeComparisons extends ValidationError {}

/**
 * Thrown when an alternative is missing its unique identifier.
 * All alternatives must have ids for proper referencing in comparisons.
 *
 * @example
 * ```typescript
 * // This error occurs when the id generation fails
 * // Normally prevented by the fill() method
 * ```
 */
export class MissingAlternativeId extends ValidationError {}

/**
 * Thrown when a pairwise measurement between alternatives is missing or invalid.
 * This occurs when not all required comparisons have been made with valid weights (1-9).
 *
 * @example
 * ```typescript
 * const decision = Decision.from({
 *   criteria: [{ name: "Quality" }],
 *   alternatives: [{ name: "A" }, { name: "B" }]
 * });
 *
 * // Missing comparison between A and B for Quality
 * const result = decision.validate();
 * // Will contain MissingAlternativeMeasurement error
 *
 * // Fix by making the comparison:
 * decision.compare({
 *   item: { name: "A" },
 *   pair: { name: "B" },
 *   criterion: { name: "Quality" },
 *   weight: 3
 * });
 * ```
 */
export class MissingAlternativeMeasurement extends ValidationError {}

/**
 * Thrown when an alternative has no name or the name is too short (< 3 characters).
 * Alternative names must be descriptive enough to be meaningful.
 *
 * @example
 * ```typescript
 * const decision = new Decision();
 * decision.add({ alternative: "AB" }); // Too short
 *
 * const result = decision.validate();
 * // Will contain MissingAlternativeName error
 * ```
 */
export class MissingAlternativeName extends ValidationError {}

/**
 * Thrown when a criterion is missing its comparisons array.
 * Each criterion must have exactly one comparison array for comparing with other criteria.
 *
 * @example
 * ```typescript
 * // This error occurs when the comparison structure is corrupted
 * // Normally prevented by the fill() method
 * ```
 */
export class MissingCriterionComparisons extends ValidationError {}

/**
 * Thrown when a criterion is missing its unique identifier.
 * All criteria must have ids for proper referencing in comparisons.
 *
 * @example
 * ```typescript
 * // This error occurs when the id generation fails
 * // Normally prevented by the fill() method
 * ```
 */
export class MissingCriterionId extends ValidationError {}

/**
 * Thrown when a pairwise measurement between criteria is missing or invalid.
 * This occurs when not all required criterion comparisons have been made with valid weights (1-9).
 *
 * @example
 * ```typescript
 * const decision = Decision.from({
 *   criteria: [{ name: "Quality" }, { name: "Price" }],
 *   alternatives: [{ name: "A" }, { name: "B" }]
 * });
 *
 * // Missing comparison between Quality and Price
 * const result = decision.validate();
 * // Will contain MissingCriterionMeasurement error
 *
 * // Fix by making the comparison:
 * decision.compare({
 *   item: { name: "Quality" },
 *   pair: { name: "Price" },
 *   weight: 5 // Quality is strongly more important than Price
 * });
 * ```
 */
export class MissingCriterionMeasurement extends ValidationError {}

/**
 * Thrown when a criterion has no name or the name is too short (< 3 characters).
 * Criterion names must be descriptive enough to be meaningful.
 *
 * @example
 * ```typescript
 * const decision = new Decision();
 * decision.add({ criterion: "XY" }); // Too short
 *
 * const result = decision.validate();
 * // Will contain MissingCriterionName error
 * ```
 */
export class MissingCriterionName extends ValidationError {}

/**
 * Thrown when the decision has no goal or the goal is too short (< 3 characters).
 * The goal should clearly describe what decision is being made.
 *
 * @example
 * ```typescript
 * const decision = new Decision();
 * decision.goal = "Hi"; // Too short
 *
 * const result = decision.validate();
 * // Will contain MissingDecisionGoal error
 * ```
 */
export class MissingDecisionGoal extends ValidationError {}

/**
 * Thrown when the decision is missing its unique identifier.
 * All decisions must have ids for proper identification.
 *
 * @example
 * ```typescript
 * // This error occurs when the id generation fails
 * // Normally prevented by the constructor
 * ```
 */
export class MissingDecisionId extends ValidationError {}
