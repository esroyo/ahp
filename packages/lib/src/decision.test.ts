import {
    assert,
    assertAlmostEquals,
    assertEquals,
    assertFalse,
    assertMatch,
    assertNotEquals,
    assertThrows,
} from '@std/assert';

import { Decision } from './decision.ts';
import leaderExample from './__fixtures__/leader.json' with { type: 'json' };

Deno.test('should be able to create Decision from a data object', () => {
    const decision = Decision.from({
        goal: 'Foo',
        criteria: [
            { id: '1', name: 'Bar' },
        ],
    });
    assertEquals(decision.goal, 'Foo');
    assertEquals(decision.criteria[0].name, 'Bar');
});

Deno.test('should be able to create Decision from a stringified data object', () => {
    const decision = Decision.from(
        JSON.stringify({
            goal: 'Foo',
            criteria: [
                { id: '1', name: 'Bar' },
            ],
        }),
    );
    assertEquals(decision.goal, 'Foo');
    assertEquals(decision.criteria[0].name, 'Bar');
});

Deno.test('should be able to create Decision from an incomplete data object', () => {
    const decision = Decision.from({
        goal: 'Foo',
        criteria: [
            { id: '1', name: 'Exp' },
            { id: '2', name: 'Age' },
        ],
        alternatives: [
            { id: '1', name: 'Duck' },
            { id: '2', name: 'Fox' },
            { id: '3', name: 'Worm' },
            { name: 'Snake' },
        ],
    });
    decision.criteria.forEach(function (criterion) {
        assert(criterion.id);
        assert(Array.isArray(criterion.comparisons));
        assertEquals(criterion.comparisons.length, 1);
        assert(Array.isArray(criterion.comparisons[0].measurements));
        assertEquals(
            criterion.comparisons[0].measurements.length,
            decision.criteria.length - 1,
        );
        criterion.comparisons[0].measurements.forEach(function (weight) {
            assertNotEquals(weight.pairId, criterion.id);
            assert(
                decision.criteria.map((cr) => cr.id).includes(weight.pairId),
            );
        });
    });
    decision.alternatives.forEach(function (alternative) {
        assert(alternative.id);
        assert(Array.isArray(alternative.comparisons));
        assertEquals(alternative.comparisons.length, decision.criteria.length);
        alternative.comparisons.forEach(function (comparison) {
            assert(
                decision.criteria.map((cr) => cr.id).includes(
                    comparison.criterionId,
                ),
            );
            assert(Array.isArray(comparison.measurements));
            assertEquals(
                comparison.measurements.length,
                decision.alternatives.length - 1,
            );
            comparison.measurements.forEach(function (weight) {
                assertNotEquals(weight.pairId, alternative.id);
                assert(
                    decision.alternatives.map((alt) => alt.id).includes(
                        weight.pairId,
                    ),
                );
            });
        });
    });
});

Deno.test('should be able to construct with no parameters', async (t) => {
    const decision = new Decision();
    assertEquals(decision.goal, 'unknown');
    assert(Array.isArray(decision.criteria));
    assert(Array.isArray(decision.alternatives));
    await t.step(
        'should generate ids with the built-in Crypto UUID v4 generator',
        () => {
            assertMatch(decision.id, /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/);
        },
    );
});

Deno.test('should be able to construct with a custom uid generator', async (t) => {
    let counter = 0;
    const decision = new Decision({ uid: () => `${++counter}` });
    decision.add({ alternative: { name: 'Exp' } });
    assertEquals(decision.goal, 'unknown');
    assert(Array.isArray(decision.criteria));
    assert(Array.isArray(decision.alternatives));
    assertEquals(decision.id, '1');
    assertEquals(decision.alternatives[0].id, '2');
});

Deno.test('When adding a criterion', async (t) => {
    const decision = new Decision();

    await t.step('should throw if "name" is not provided', () => {
        assertThrows(() => {
            decision.add({ criterion: {} } as any);
        });
    });

    await t.step('should be able to add a criterion', () => {
        decision.add({ criterion: { name: 'Exp' } });

        assertEquals(decision.criteria.length, 1);
        assert(decision.criteria[0].id);
        assertEquals(decision.criteria[0].name, 'Exp');
        assert(Array.isArray(decision.criteria[0].comparisons));
        assertEquals(
            decision.criteria[0].comparisons[0].measurements.length,
            0,
        );
    });

    await t.step('should be able to add a criterion as a string', () => {
        decision.remove({ criterion: { name: 'Exp' } });
        decision.add({ criterion: 'Exp' });

        assertEquals(decision.criteria.length, 1);
        assert(decision.criteria[0].id);
        assertEquals(decision.criteria[0].name, 'Exp');
        assert(Array.isArray(decision.criteria[0].comparisons));
        assertEquals(
            decision.criteria[0].comparisons[0].measurements.length,
            0,
        );
    });

    await t.step('should throw if "name" is duplicated', () => {
        assertThrows(() => {
            decision.add({ criterion: { name: 'Exp' } });
        });
    });

    await t.step('should fill the criterion comparisons', () => {
        decision.add({ criterion: { name: 'Age' } });

        assertEquals(decision.criteria[1].name, 'Age');
        assert(Array.isArray(decision.criteria[1].comparisons));
        assertEquals(
            decision.criteria[0].comparisons![0].measurements.length,
            1,
        );
        assertEquals(
            decision.criteria[1].comparisons[0].measurements.length,
            1,
        );
        decision.criteria.forEach(function (criterion) {
            criterion.comparisons![0].measurements.forEach(function (weight) {
                assertNotEquals(weight.pairId, criterion.id);
                assert(
                    decision.criteria.map((cr) => cr.id).includes(
                        weight.pairId,
                    ),
                );
            });
        });
    });
});

Deno.test('when adding an alternative', async (t) => {
    const decision = Decision.from({
        criteria: [{ name: 'Exp' }, { name: 'Age' }],
    });

    assert(Array.isArray(decision.alternatives));
    assertEquals(decision.alternatives.length, 0);

    await t.step('should throw if "name" is not provided', () => {
        assertThrows(() => {
            decision.add({ alternative: {} as any });
        });
    });

    await t.step('should be able to add an alternative', () => {
        decision.add({ alternative: { name: 'Frog' } });

        assert(decision.alternatives[0].id);
        assertEquals(decision.alternatives[0].name, 'Frog');
        assert(Array.isArray(decision.alternatives[0].comparisons));
        assertEquals(
            decision.alternatives[0].comparisons.length,
            decision.criteria.length,
        );
        decision.alternatives[0].comparisons.forEach(function (comp) {
            assert(Array.isArray(comp.measurements));
            assertEquals(comp.measurements.length, 0);
        });
    });

    await t.step('should be able to add an alternative as a string', () => {
        decision.remove({ alternative: { name: 'Frog' } });
        decision.add({ alternative: 'Frog' });

        assert(decision.alternatives[0].id);
        assertEquals(decision.alternatives[0].name, 'Frog');
        assert(Array.isArray(decision.alternatives[0].comparisons));
        assertEquals(
            decision.alternatives[0].comparisons.length,
            decision.criteria.length,
        );
        decision.alternatives[0].comparisons.forEach(function (comp) {
            assert(Array.isArray(comp.measurements));
            assertEquals(comp.measurements.length, 0);
        });
    });

    await t.step('should throw if "name" is duplicated', () => {
        assertThrows(() => {
            decision.add({ alternative: { name: 'Frog' } });
        });
    });

    await t.step('should fill the alternative comparisons', () => {
        decision.add({ alternative: { name: 'Squirrel' } });

        assert(decision.alternatives[1].id);
        assertEquals(decision.alternatives[1].name, 'Squirrel');
        assert(Array.isArray(decision.alternatives[1].comparisons));
        assertEquals(
            decision.alternatives[1].comparisons.length,
            decision.criteria.length,
        );
        decision.alternatives[1].comparisons.forEach(function (comp) {
            assert(Array.isArray(comp.measurements));
            assertEquals(
                comp.measurements.length,
                decision.alternatives.length - 1,
            );
            comp.measurements.forEach(function (weight) {
                assertNotEquals(weight.pairId, decision.alternatives[1].id);
                assert(
                    decision.alternatives.map((alt) => alt.id).includes(
                        weight.pairId,
                    ),
                );
            });
        });
        decision.alternatives[0].comparisons?.forEach(function (comp) {
            assert(Array.isArray(comp.measurements));
            assertEquals(
                comp.measurements.length,
                decision.alternatives.length - 1,
            );
            comp.measurements.forEach(function (weight) {
                assertNotEquals(weight.pairId, decision.alternatives[0].id);
                assert(
                    decision.alternatives.map((alt) => alt.id).includes(
                        weight.pairId,
                    ),
                );
            });
        });
    });
});

Deno.test('when removing a criterion', async (t) => {
    const decision = Decision.from({
        criteria: [
            { id: '1', name: 'Exp' },
            { id: '2', name: 'Age' },
            { id: '3', name: 'Edu' },
        ],
        alternatives: [
            { id: '4', name: 'Frog' },
            { id: '5', name: 'Squirrel' },
            { id: '6', name: 'Eagle' },
        ],
    });

    const assertCriteriaLength = async (length: number) => {
        await t.step(
            'should have the correct criteria and comparisons length',
            async () => {
                assertEquals(decision.criteria.length, length);
                decision.criteria.forEach(function (criterion) {
                    criterion.comparisons![0].measurements.forEach(
                        function (weight) {
                            assertNotEquals(weight.pairId, criterion.id);
                            assert(
                                decision.criteria.map((cr) => cr.id).includes(
                                    weight.pairId,
                                ),
                            );
                        },
                    );
                });
            },
        );
    };

    await assertCriteriaLength(3);

    decision.remove({ criterion: { name: 'Age' } });

    await assertCriteriaLength(2);

    // Nonexistent criterion
    decision.remove({ criterion: { name: 'Presidentiable' } });

    await assertCriteriaLength(2);

    // Readd Age
    decision.add({ criterion: { id: '2', name: 'Age' } });

    await assertCriteriaLength(3);

    decision.remove({ criterion: { id: '2' } });

    await assertCriteriaLength(2);

    // Nonexistent criterion
    decision.remove({ criterion: { id: '100000' } });

    await assertCriteriaLength(2);
});

Deno.test('when removing an alternative', async (t) => {
    const decision = Decision.from({
        criteria: [
            { id: '1', name: 'Exp' },
            { id: '2', name: 'Age' },
        ],
        alternatives: [
            { id: '3', name: 'Frog' },
            { id: '4', name: 'Squirrel' },
            { id: '5', name: 'Eagle' },
        ],
    });

    const assertAlternativesLength = async (length: number) => {
        await t.step(
            'should have the correct alternative and comparisons length',
            async () => {
                assertEquals(decision.alternatives.length, length);
                decision.alternatives.forEach(function (alternative) {
                    alternative.comparisons!.forEach(function (comp) {
                        assert(Array.isArray(comp.measurements));
                        assertEquals(
                            comp.measurements.length,
                            decision.alternatives.length - 1,
                        );
                        comp.measurements.forEach(function (weight) {
                            assertNotEquals(weight.pairId, alternative.id);
                            assert(
                                decision.alternatives.map((alt) => alt.id)
                                    .includes(weight.pairId),
                            );
                        });
                    });
                });
            },
        );
    };

    await assertAlternativesLength(3);

    decision.remove({ alternative: { name: 'Frog' } });

    await assertAlternativesLength(2);

    // Nonexistant alternative
    decision.remove({ alternative: { name: 'Cthulhu' } });

    await assertAlternativesLength(2);

    // Readd the Frog
    decision.add({ alternative: { id: '3', name: 'Frog' } });

    await assertAlternativesLength(3);

    decision.remove({ alternative: { id: '3' } });

    await assertAlternativesLength(2);

    // Nonexistant alternative
    decision.remove({ alternative: { id: '100000' } });

    await assertAlternativesLength(2);
});

Deno.test('when comparing alternatives', async (t) => {
    const decision = Decision.from({
        criteria: [
            { id: '1', name: 'Exp' },
            { id: '2', name: 'Age' },
            { id: '3', name: 'Edu' },
            { id: '4', name: 'Speed' },
        ],
        alternatives: [
            { id: '5', name: 'Frog' },
            { id: '6', name: 'Squirrel' },
            { id: '7', name: 'Eagle' },
        ],
    });

    await t.step(
        'should throw when comparing with an invalid item',
        async () => {
            assertThrows(() => {
                decision.compare({
                    item: { name: 'Snake' }, // Whoops
                    pair: { name: 'Frog' },
                    criterion: { name: 'Speed' },
                    weight: 9,
                });
            });
        },
    );

    await t.step(
        'should throw when comparing with an invalid pair',
        async () => {
            assertThrows(() => {
                decision.compare({
                    item: { name: 'Eagle' },
                    pair: { name: 'Snake' }, // Whoops
                    criterion: { name: 'Speed' },
                    weight: 9,
                });
            });
        },
    );

    await t.step(
        'should throw when comparing with an invalid weight',
        async () => {
            assertThrows(() => {
                decision.compare({
                    item: { name: 'Eagle' },
                    pair: { name: 'Frog' },
                    criterion: { name: 'Speed' },
                    weight: 20, // Whoops
                });
            });
        },
    );

    await t.step(
        'should throw when comparing with an invalid criterion',
        async () => {
            assertThrows(() => {
                decision.compare({
                    item: { name: 'Eagle' },
                    pair: { name: 'Frog' },
                    criterion: { name: 'Wisdom' }, // Whoops
                    weight: 9,
                });
            });
        },
    );

    // An OK comparison
    const eagle = decision.alternatives.find((alt) => alt.name === 'Eagle')!;
    const frog = decision.alternatives.find((alt) => alt.name === 'Frog')!;
    const speed = decision.criteria.find((cr) => cr.name === 'Speed')!;

    const assertEagleWeight = (weight: number) => {
        assertEquals(
            eagle.comparisons!
                .find((comp) => comp.criterionId === speed.id)!
                .measurements
                .find((meas) => meas.pairId === frog.id)!
                .weight,
            weight,
        );

        assertEquals(
            frog.comparisons!
                .find((comp) => comp.criterionId === speed.id)!
                .measurements
                .find((meas) => meas.pairId === eagle.id)!
                .weight,
            1,
        );
    };

    await t.step('should be able to compare alternatives by name', () => {
        // comparison made by name
        decision.compare({
            item: { name: 'Eagle' },
            pair: { name: 'Frog' },
            criterion: { name: 'Speed' },
            weight: 9,
        });

        assertEagleWeight(9);
    });

    await t.step('should be able to compare alternatives by id', () => {
        // comparison made by id
        decision.compare({
            item: { id: '7' },
            pair: { id: '5' },
            criterion: { id: '4' },
            weight: 9,
        });

        assertEagleWeight(9);
    });

    await t.step('when givin the item a weight of "1"', async (t) => {
        await t.step('should not change the weight of the pair ', () => {
            // When givin the item a weight of "1"
            // the pair weight should not change
            decision.compare({
                item: { name: 'Eagle' },
                pair: { name: 'Frog' },
                criterion: { name: 'Speed' },
                weight: 1,
            });
            assertEagleWeight(1);
        });
    });

    // Now lets give the Frog a weight of 9 ....
    const assertFrogWeight = (weight: number) => {
        assertEquals(
            eagle.comparisons!
                .find((comp) => comp.criterionId === speed.id)!
                .measurements
                .find((meas) => meas.pairId === frog.id)!
                .weight,
            1,
        );

        assertEquals(
            frog.comparisons!
                .find((comp) => comp.criterionId === speed.id)!
                .measurements
                .find((meas) => meas.pairId === eagle.id)!
                .weight,
            weight,
        );
    };

    await t.step('should be able to compare alternatives by name', () => {
        // comparison made by name
        decision.compare({
            item: { name: 'Frog' },
            pair: { name: 'Eagle' },
            criterion: { name: 'Speed' },
            weight: 9,
        });
        assertFrogWeight(9);
    });

    await t.step('should be able to compare alternatives by id', () => {
        // comparison made by id
        decision.compare({
            item: { id: '5' },
            pair: { id: '7' },
            criterion: { id: '4' },
            weight: 9,
        });
        assertFrogWeight(9);
    });

    await t.step('when givin the item a weight of "1"', async (t) => {
        await t.step('should not change the weight of the pair ', () => {
            // When givin the item a weight of "1"
            // the pair weight should not change
            decision.compare({
                item: { name: 'Frog' },
                pair: { name: 'Eagle' },
                criterion: { name: 'Speed' },
                weight: 1,
            });
            assertFrogWeight(1);
        });
    });
});

Deno.test('when comparing criteria', async (t) => {
    const decision = Decision.from({
        criteria: [{ name: 'Exp' }, { name: 'Age' }, { name: 'Edu' }, {
            name: 'Speed',
        }],
        alternatives: [{ name: 'Frog' }, { name: 'Squirrel' }, {
            name: 'Eagle',
        }],
    });

    await t.step(
        'should throw when comparing with an invalid item',
        async () => {
            assertThrows(() => {
                decision.compare({
                    item: { name: 'Wisdom' }, // Whoops
                    pair: { name: 'Age' },
                    weight: 9,
                });
            });
        },
    );

    await t.step(
        'should throw when comparing with an invalid pair',
        async () => {
            assertThrows(() => {
                decision.compare({
                    item: { name: 'Exp' },
                    pair: { name: 'Wisdom' }, // Whoops
                    weight: 9,
                });
            });
        },
    );

    await t.step(
        'should throw when comparing with an invalid weight',
        async () => {
            assertThrows(() => {
                decision.compare({
                    item: { name: 'Exp' },
                    pair: { name: 'Age' },
                    weight: 20, // Whoops
                });
            });
        },
    );

    const exp = decision.criteria.find((cr) => cr.name === 'Exp')!;
    const age = decision.criteria.find((cr) => cr.name === 'Age')!;

    await t.step('should be able to compare critera by name', async () => {
        // An OK comparison
        decision.compare({
            item: { name: 'Exp' },
            pair: { name: 'Age' },
            weight: 9,
        });
        assertEquals(
            exp.comparisons![0]
                .measurements
                .find((meas) => meas.pairId === age.id)!
                .weight,
            9,
        );

        assertEquals(
            age.comparisons![0]
                .measurements
                .find((meas) => meas.pairId === exp.id)!
                .weight,
            1,
        );
    });

    await t.step('should be able to change the criteria weight', async () => {
        // Now lets give the Age a weight of 9 ....
        decision.compare({
            item: { name: 'Age' },
            pair: { name: 'Exp' },
            weight: 9,
        });

        assertEquals(
            exp.comparisons![0]
                .measurements
                .find((meas) => meas.pairId === age.id)!
                .weight,
            1,
        );

        assertEquals(
            age.comparisons![0]
                .measurements
                .find((meas) => meas.pairId === exp.id)!
                .weight,
            9,
        );
    });
});

Deno.test('should be able to export', async () => {
    const decision = Decision.from({
        id: '1',
        goal: 'Choose the best animal',
        criteria: [
            { id: '2', name: 'Exp' },
            { id: '3', name: 'Age' },
        ],
        alternatives: [
            { id: '4', name: 'Frog' },
            { id: '5', name: 'Eagle' },
        ],
    });
    decision.compare({
        item: { name: 'Frog' },
        pair: { name: 'Eagle' },
        criterion: { name: 'Exp' },
        weight: 3,
    });
    assertEquals(
        JSON.stringify(decision),
        '{"id":"1","goal":"Choose the best animal","criteria":[{"id":"2","name":"Exp","comparisons":[{"measurements":[{"pairId":"3"}]}]},{"id":"3","name":"Age","comparisons":[{"measurements":[{"pairId":"2"}]}]}],"alternatives":[{"id":"4","name":"Frog","comparisons":[{"criterionId":"2","measurements":[{"pairId":"5","weight":3}]},{"criterionId":"3","measurements":[{"pairId":"5"}]}]},{"id":"5","name":"Eagle","comparisons":[{"criterionId":"2","measurements":[{"pairId":"4","weight":1}]},{"criterionId":"3","measurements":[{"pairId":"4"}]}]}]}',
    );
});

Deno.test('should be able to validate without errors', async () => {
    const decision = Decision.from({
        goal: 'Choose a leader',
        criteria: [
            { name: 'Exp' },
            { name: 'Edu' },
        ],
        alternatives: [
            { name: 'Tom' },
            { name: 'Dick' },
        ],
    });
    // Experience is more important than education
    decision.compare({
        item: { name: 'Exp' },
        pair: { name: 'Edu' },
        weight: 3,
    });
    // Dick experience is preferred over Tom's
    decision.compare({
        item: { name: 'Dick' },
        pair: { name: 'Tom' },
        criterion: { name: 'Exp' },
        weight: 3,
    });
    // Tom education is preferred over Dick's
    decision.compare({
        item: { name: 'Tom' },
        pair: { name: 'Dick' },
        criterion: { name: 'Edu' },
        weight: 3,
    });
    const result = decision.validate();
    assert(result.valid);
});

Deno.test('should not validate if decision id is missing', function () {
    const decision = Decision.from({
        goal: 'Choose a leader',
    });
    // @ts-ignore to test a possible JavaScript scenario
    decision.id = undefined;
    const result = decision.validate();
    assertEquals(result.valid, false);
    assert(result.errors.find((err) => err.name === 'MissingDecisionId'));
});

Deno.test('should not validate if decision goal is missing or insufficient', function () {
    const decision = Decision.from({
        goal: 'Ch',
    });
    const result = decision.validate();
    assertEquals(result.valid, false);
    assert(
        result.errors.find((err) => err.name === 'MissingDecisionGoal'),
    );
});

Deno.test('should not validate when criteria are missing or insufficient', function () {
    const decision = Decision.from({
        goal: 'Choose a leader',
        criteria: [
            { name: 'Exp' },
        ],
        alternatives: [
            { name: 'Tom' },
            { name: 'Dick' },
        ],
    });

    let result = decision.validate();
    assertEquals(result.valid, false);
    assert(
        result.errors.find((err) => err.name === 'InsufficientCriteria'),
    );

    // @ts-ignore to test a possible JavaScript scenario
    delete decision.criteria;

    result = decision.validate();
    assertEquals(result.valid, false);
    assert(
        result.errors.find((err) => err.name === 'InsufficientCriteria'),
    );
});

Deno.test('should not validte when alternatives are missing or insufficient', function () {
    const decision = Decision.from({
        goal: 'Choose a leader',
        criteria: [
            { name: 'Exp' },
            { name: 'Edu' },
        ],
        alternatives: [
            { name: 'Tom' },
        ],
    });

    let result = decision.validate();
    assertEquals(result.valid, false);
    assert(
        result.errors.find((err) => err.name === 'InsufficientAlternatives'),
    );

    // @ts-ignore to test a possible JavaScript scenario
    delete decision.alternatives;

    result = decision.validate();
    assertEquals(result.valid, false);
    assert(
        result.errors.find((err) => err.name === 'InsufficientAlternatives'),
    );
});

Deno.test('should not validate', async (t) => {
    const decision: Decision = Decision.from({
        goal: 'Choose a leader',
        criteria: [
            { name: 'Exp' },
            { name: 'Edu' },
        ],
        alternatives: [
            { name: 'Tom' },
            { name: 'Dick' },
        ],
    });

    await t.step('when missing criterion id', () => {
        const id = decision.criteria[0].id;
        decision.criteria[0].id = undefined;

        const result = decision.validate();
        assertEquals(result.valid, false);

        const err = result.errors.find((err) =>
            err.name === 'MissingCriterionId'
        )!;

        assert(err.message.includes(decision.criteria[0].name));

        decision.criteria[0].id = id;
    });

    await t.step('when missing criterion name', () => {
        const name = decision.criteria[0].name;
        // @ts-ignore to test a possible JavaScript scenario
        decision.criteria[0].name = undefined;

        const result = decision.validate();
        const err = result.errors.find((err) =>
            err.name === 'MissingCriterionName'
        )!;
        assert(err.message.includes(decision.criteria[0].id!));

        decision.criteria[0].name = name;
    });

    await t.step('when insufficient criterion name', () => {
        decision.criteria[0].name = 'Ex';

        let result = decision.validate();
        assert(
            result.errors.find((err) => err.name === 'MissingCriterionName'),
        );

        decision.criteria[0].name = 'Exp';

        result = decision.validate();
        assertFalse(
            result.errors.find((err) => err.name === 'MissingCriterionName'),
        );
    });

    await t.step('when missing criterion comparisons', () => {
        delete decision.criteria[0].comparisons;

        let result = decision.validate();
        let err = result.errors.find((err) =>
            err.name === 'MissingCriterionComparisons'
        )!;
        assert(err.message.includes(decision.criteria[0].name));

        assertThrows(() => {
            decision.assertValid();
        });

        decision.fill();
        result = decision.validate();
        err = result.errors.find((err) =>
            err.name === 'MissingCriterionComparisons'
        )!;
        assertFalse(err);
    });
});

Deno.test('should not validate while criteria measurements are missing', async () => {
    const decision: Decision = Decision.from({
        goal: 'Choose a leader',
        criteria: [
            { name: 'Exp' },
            { name: 'Edu' },
        ],
        alternatives: [
            { name: 'Tom' },
            { name: 'Dick' },
        ],
    });

    // We miss the measurements between Exp-Edu, Edu-Exp
    let result = decision.validate();
    let err = result.errors.filter((err) =>
        err.name === 'MissingCriterionMeasurement'
    );
    assertEquals(err.length, 2);

    // Experience is less important than education
    decision.compare({
        item: { name: 'Exp' },
        pair: { name: 'Edu' },
        weight: 1,
    });

    // We still miss the measurements between Edu-Exp
    result = decision.validate();
    err = result.errors.filter((err) =>
        err.name === 'MissingCriterionMeasurement'
    );
    assertEquals(err.length, 1);

    // Education is XXXXXX important than Experience
    try {
        decision.compare({
            item: { name: 'Edu' },
            pair: { name: 'Exp' },
            weight: 100000,
        });
    } catch {}

    // We still miss the measurements between Edu-Exp because invalid value
    result = decision.validate();
    err = result.errors.filter((err) =>
        err.name === 'MissingCriterionMeasurement'
    );
    assertEquals(err.length, 1);

    // Education is moderately more important than Experience
    decision.compare({
        item: { name: 'Edu' },
        pair: { name: 'Exp' },
        weight: 3,
    });

    // We do not miss criteria measurements
    result = decision.validate();
    err = result.errors.filter((err) =>
        err.name === 'MissingCriterionMeasurement'
    );
    assertEquals(err.length, 0);
});

Deno.test('should not validate', async (t) => {
    const decision: Decision = Decision.from({
        goal: 'Choose a leader',
        criteria: [
            { name: 'Exp' },
            { name: 'Edu' },
        ],
        alternatives: [
            { name: 'Tom' },
            { name: 'Dick' },
        ],
    });

    await t.step('when missing alternative id', () => {
        const id = decision.alternatives[0].id;
        decision.alternatives[0].id = undefined;

        const result = decision.validate();
        assertFalse(result.valid);

        const err = result.errors.find((err) =>
            err.name === 'MissingAlternativeId'
        )!;
        assert(err.message.includes(decision.alternatives[0].name));
        decision.alternatives[0].id = id;
    });

    await t.step('when missing alternative name', () => {
        const name = decision.alternatives[0].name;
        // @ts-ignore to test a possible JavaScript scenario
        decision.alternatives[0].name = undefined;

        const result = decision.validate();
        const err = result.errors.find((err) =>
            err.name === 'MissingAlternativeName'
        )!;
        assert(err.message.includes(decision.alternatives[0].id!));
        decision.alternatives[0].name = name;
    });

    await t.step('when insufficient alternative name', () => {
        decision.alternatives[0].name = 'To';

        let result = decision.validate();
        assert(
            result.errors.find((err) => err.name === 'MissingAlternativeName'),
        );

        decision.alternatives[0].name = 'Tom';

        result = decision.validate();
        assertFalse(
            result.errors.find((err) => err.name === 'MissingAlternativeName'),
        );
    });

    await t.step('when missing alterantive comparisons', () => {
        delete decision.alternatives[0].comparisons;

        let result = decision.validate();
        let err = result.errors.find((err) =>
            err.name === 'MissingAlternativeComparisons'
        )!;
        assert(err.message.includes(decision.alternatives[0].name));

        decision.fill();
        result = decision.validate();
        err = result.errors.find((err) =>
            err.name === 'MissingAlternativeComparisons'
        )!;
        assertFalse(err);

        // @ts-ignore to test a possible JavaScript scenario
        delete decision.alternatives[0].comparisons[0];

        result = decision.validate();
        err = result.errors.find((err) =>
            err.name === 'MissingAlternativeComparison'
        )!;
        assert(err.message.includes(decision.criteria[0].name));
        assert(err.message.includes(decision.alternatives[0].name));

        decision.fill();
        result = decision.validate();
        err = result.errors.find((err) =>
            err.name === 'MissingAlternativeComparisons'
        )!;
        assertFalse(err);
    });
});

Deno.test('should not validate while alternatives measurements are missing', async () => {
    const decision = Decision.from({
        goal: 'Choose a leader',
        criteria: [
            { name: 'Exp' },
            { name: 'Edu' },
        ],
        alternatives: [
            { name: 'Tom' },
            { name: 'Dick' },
        ],
    });
    // Experience is less important than education
    decision.compare({
        item: { name: 'Exp' },
        pair: { name: 'Edu' },
        weight: 1,
    });
    // Education is moderately more important than Experience
    decision.compare({
        item: { name: 'Edu' },
        pair: { name: 'Exp' },
        weight: 3,
    });

    // Special: No criteria
    const criteria = decision.criteria;
    // @ts-ignore to test a possible JavaScript scenario
    delete decision.criteria;

    let result = decision.validate();
    let err = result.errors.filter((err) =>
        err.name === 'MissingAlternativeMeasurement'
    )!;
    assertEquals(err.length, 0);

    decision.criteria = criteria;

    // We miss the measurements between Tom-Dick (Edu), Dick-Tom (Edu), Tom-Dick (Exp), Dick-Tom (Exp)
    result = decision.validate();
    err = result.errors.filter((err) =>
        err.name === 'MissingAlternativeMeasurement'
    );
    assertEquals(err.length, 4);

    // Education
    decision.compare({
        item: { name: 'Tom' },
        pair: { name: 'Dick' },
        criterion: { name: 'Edu' },
        weight: 1,
    });

    result = decision.validate();
    err = result.errors.filter((err) =>
        err.name === 'MissingAlternativeMeasurement'
    );
    assertEquals(err.length, 3);

    // Education is XXXXXX important than Experience
    try {
        decision.compare({
            item: { name: 'Dick' },
            pair: { name: 'Tom' },
            criterion: { name: 'Edu' },
            weight: 100000,
        });
    } catch {}

    // We still miss the measurements between Edu-Exp because invalid value
    result = decision.validate();
    err = result.errors.filter((err) =>
        err.name === 'MissingAlternativeMeasurement'
    );
    assertEquals(err.length, 3);

    decision.compare({
        item: { name: 'Dick' },
        pair: { name: 'Tom' },
        criterion: { name: 'Edu' },
        weight: 3,
    });

    result = decision.validate();
    err = result.errors.filter((err) =>
        err.name === 'MissingAlternativeMeasurement'
    );
    assertEquals(err.length, 2);

    // Experience
    decision.compare({
        item: { name: 'Tom' },
        pair: { name: 'Dick' },
        criterion: { name: 'Exp' },
        weight: 3,
    });
    // Dick-Tom (Exp) is filled with 1 automatically

    // We do not miss measurements
    result = decision.validate();
    err = result.errors.filter((err) =>
        err.name === 'MissingAlternativeMeasurement'
    );
    assertEquals(err.length, 0);
});

Deno.test('should be able to evaluate priorities', function () {
    const decision: Decision = Decision.from(leaderExample);

    decision.evaluate();

    const tolerance = 0.001;

    assertAlmostEquals(decision.alternatives[0].priority, 0.358, tolerance);
    assertAlmostEquals(decision.alternatives[1].priority, 0.492, tolerance);
    assertAlmostEquals(decision.alternatives[2].priority, 0.149, tolerance);
    // assertEquals(
    //     decision.alternatives
    //         .map((alt) => alt.priority!.toFixed(4).substr(0, 5)),
    //     ['0.358', '0.492', '0.149'],
    // );
    assertEquals(
        decision.alternatives.reduce((acc, curr) => acc + curr.priority!, 0),
        1,
    );

    assertAlmostEquals(decision.criteria[0].priority, 0.547, tolerance);
    assertAlmostEquals(decision.criteria[1].priority, 0.127, tolerance);
    assertAlmostEquals(decision.criteria[2].priority, 0.270, tolerance);
    assertAlmostEquals(decision.criteria[3].priority, 0.056, tolerance);
    // assertEquals(
    //     decision.criteria
    //         .map((cr) => cr.priority!.toFixed(4).substr(0, 5)),
    //     ['0.547', '0.127', '0.270', '0.056'],
    // );
    assertEquals(
        decision.criteria.reduce((acc, curr) => acc + curr.priority!, 0),
        1,
    );
});
