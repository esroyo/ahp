export class DecisionError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = this.constructor.name;
    }
}
export class ValidationError extends DecisionError {}
export class InsufficientAlternatives extends ValidationError {}
export class InsufficientCriteria extends ValidationError {}
export class MissingAlternativeComparison extends ValidationError {}
export class MissingAlternativeComparisons extends ValidationError {}
export class MissingAlternativeId extends ValidationError {}
export class MissingAlternativeMeasurement extends ValidationError {}
export class MissingAlternativeName extends ValidationError {}
export class MissingCriterionComparisons extends ValidationError {}
export class MissingCriterionId extends ValidationError {}
export class MissingCriterionMeasurement extends ValidationError {}
export class MissingCriterionName extends ValidationError {}
export class MissingDecisionGoal extends ValidationError {}
export class MissingDecisionId extends ValidationError {}
