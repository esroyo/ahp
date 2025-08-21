import type { RequiredDeep, SetRequiredDeep, Simplify } from 'type-fest';

export type Measurement = {
    pairId: string;
    weight?: number;
};

export type Comparison = {
    measurements: Measurement[];
    priority?: number;
};

export type CriterionComparison = Comparison;

export type AlternativeComparison =
    & Comparison
    & { criterionId: string };

export type Criterion = {
    id?: string;
    name: string;
    comparisons?: CriterionComparison[];
    priority?: number;
};

export type Alternative = {
    id?: string;
    name: string;
    comparisons?: AlternativeComparison[];
    priority?: number;
};

export type JsonDecision = {
    id?: string;
    goal?: string;
    criteria?: Criterion[];
    alternatives?: Alternative[];
};

export type JsonDecisionFilled = SetRequiredDeep<
    JsonDecision,
    | 'id'
    | 'goal'
    | 'criteria'
    | 'alternatives'
    | `${'criteria' | 'alternatives'}.${number}.${'id' | 'comparisons'}`
>;

export type JsonDecisionValid = SetRequiredDeep<
    JsonDecisionFilled,
    `${
        | 'criteria'
        | 'alternatives'}.${number}.comparisons.${number}.measurements.${number}.weight`
>;

export type JsonDecisionComplete = Simplify<RequiredDeep<JsonDecision>>;

export enum Intensity {
    /**
     * Two elements contribute equally to the objective.
     */
    Equal = 1,
    /**
     * Experience and judgment slightly favor one element over another.
     * (Intermediate value between Equal and Moderate)
     */
    SlightlyModerate = 2,
    /**
     * Experience and judgement moderately favor one element over another.
     */
    Moderate = 3,
    /**
     * Experience and judgment more than moderately favor one element over another.
     * (Intermediate value between Moderate and Strong)
     */
    ModeratelyStrong = 4,
    /**
     * Experience and judgement strongly favor one element over another.
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
     * possible order or affirmation.
     */
    Extreme = 9,
}
