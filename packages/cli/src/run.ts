import { Decision } from '@esroyo/ahp-lib';
import type { Prompt, PromptOptions} from './types.ts';

export async function run(prompt: Prompt, print: (...data: any[]) => void) {

    const end = (list: any[]) => list[list.length - 1];

    const scale = [
        { name: Decision.Intensity.Equal, message: 'Equal' },
        { name: Decision.Intensity.Moderate, message: 'Moderate' },
        { name: Decision.Intensity.Strong, message: 'Strong' },
        { name: Decision.Intensity.VeryStrong, message: 'Very strong' },
        { name: Decision.Intensity.Extreme, message: 'Extreme' }
    ] as const;

    const steps: PromptOptions[] = [{
      type: 'input',
      name: 'goal',
      message: 'What is the decision you need to make?'
    }, {
      type: 'list',
      name: 'criteria',
      message: 'Type a comma-separated list of criteria',
    }, {
      type: 'list',
      name: 'alternatives',
      message: 'Type a comma-separated list of alternative candidates',
    }];
     
    const response = await prompt<{ goal: string; criteria: string[]; alternatives: string[]; }>(steps);
    const decision: Decision = Decision.from({
        goal: response.goal,
        criteria: response.criteria.map(name => ({ name })),
        alternatives: response.alternatives.map(name => ({ name })),
    });

    for (let criterion of decision.criteria) {
        for (let candidate of decision.alternatives) {
            for (let otherCandidate of decision.alternatives) {
                if (candidate === otherCandidate) {
                    continue;
                }
                if (candidate.comparisons?.find(comp => comp.criterionId === criterion.id && comp.measurements.find((meas) => meas.pairId === otherCandidate.id && meas.weight))) {
                    continue;
                }

                const choices = [{ name: candidate.name }, { name: otherCandidate.name }];
                steps.push({
                    type: 'select',
                    name: 'name',
                    message: `Pick the weaker candidate with respect to ${criterion.name}`,
                    choices,
                });
                const weakerResponse = await prompt<{ name: string; }>(end(steps));
                end(steps).reply = weakerResponse;

                const weaker = decision.alternatives.find(alt => alt.name === weakerResponse.name)!;
                const stronger = decision.alternatives.find(alt => alt.name === choices.find(({ name }) => name !== weakerResponse.name)?.name)!;

                decision.compare({
                    item: weaker,
                    pair: stronger,
                    criterion,
                    weight: 1,
                });

                steps.push({
                    type: 'scale',
                    name: 'comparison',
                    message: `Evaluate how much peferred is ${stronger.name} over ${weaker.name} regarding ${criterion.name}`, 
                    // @ts-ignore
                    scale, 
                    margin: [1, 1, 2, 1],
                    choices: [
                        {
                            name: 'weight',
                            initial: 2,
                        }
                    ]
                });
                const scaleResult = await prompt<{ comparison: { weight: number } }>(end(steps));
                end(steps).reply = scaleResult;

                decision.compare({
                    item: stronger,
                    pair: weaker,
                    criterion,
                    weight: scale.map(i => i.name)[scaleResult.comparison.weight],
                });
            }
        }
    }

    for (let criterion of decision.criteria) {
        for (let otherCriterion of decision.criteria) {
            if (criterion === otherCriterion) {
                continue;
            }
            if (criterion.comparisons![0].measurements.find((meas) => meas.pairId === otherCriterion.id && meas.weight)) {
                continue;
            }

            const choices = [{ name: criterion.name }, { name: otherCriterion.name }];
            steps.push({
                type: 'select',
                name: 'name',
                message: `Pick the least important criterion with respect to reaching the goal`,
                choices,
            });
            const weakerResponse = await prompt<{ name: string; }>(end(steps));
            end(steps).reply = weakerResponse;

            const weaker = decision.criteria.find(alt => alt.name === weakerResponse.name)!;
            const stronger = decision.criteria.find(alt => alt.name === choices.find(({ name }) => name !== weakerResponse.name)!.name)!;

            decision.compare({
                item: weaker,
                pair: stronger,
                weight: 1,
            });

            steps.push({
                type: 'scale',
                name: 'comparison',
                message: `Evaluate how much strength has ${stronger.name} over ${weaker.name} to reach the goal`, 
                // @ts-ignore
                scale,
                margin: [1, 1, 2, 1],
                choices: [
                    {
                        name: 'weight',
                        initial: 2,
                    }
                ]
            });
            const scaleResult = await prompt<{ comparison: { weight: number } }>(end(steps));
            end(steps).reply = scaleResult;

            decision.compare({
                item: stronger,
                pair: weaker,
                weight: scale.map(i => i.name)[scaleResult.comparison.weight],
            });
        }
    }

    decision.evaluate();

    const results = decision.alternatives
        .map(alt => [alt.name, Number(alt.priority!.toFixed(4).substr(0, 5))] as const)
        .sort((a, b) => b[1] - a[1]);

    print(results.map(([name, priority]) => `${name}: ${priority}`).join('\n'));

    Deno.exit();
}
