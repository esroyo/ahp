# Analytic Hierarchy Process (AHP) library

[![JSR](https://jsr.io/badges/@esroyo/ahp-lib)](https://jsr.io/@esroyo/ahp-lib)
[![JSR Score](https://jsr.io/badges/@esroyo/ahp-lib/score)](https://jsr.io/@esroyo/ahp-lib)
[![ci](https://github.com/esroyo/ahp/actions/workflows/ci.yml/badge.svg)](https://github.com/esroyo/ahp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/esroyo/ahp/graph/badge.svg?token=bgQYIxxIx4)](https://codecov.io/gh/esroyo/ahp)

A JavaScript implementation of the
**[Analytic Hierarchy Process (AHP)](https://en.wikipedia.org/wiki/Analytic_hierarchy_process)**
for structured multi-criteria decision making. This library helps you make
complex decisions by breaking them down into criteria, alternatives, and
systematic pairwise comparisons using the proven Saaty scale.

## Features

- **Structured decision making** - Break complex decisions into manageable
  components
- **Type safety** - Comprehensive TypeScript types with validation states
- **Robust validation** - Extensive error checking with meaningful error
  messages
- **Serialization** - Easy JSON import/export for saving and loading
  decisions

## Installation

```bash
npx jsr add @esroyo/ahp-lib
```

## Quick start

```typescript
import { Decision, Intensity } from '@esroyo/ahp-lib';

// Create a new decision
const decision = new Decision();
decision.goal = 'Choose the best smartphone';

// Add criteria
decision.add({ criterion: 'Price' });
decision.add({ criterion: 'Battery Life' });
decision.add({ criterion: 'Camera Quality' });

// Add alternatives
decision.add({ alternative: 'iPhone 15' });
decision.add({ alternative: 'Samsung Galaxy S24' });
decision.add({ alternative: 'Google Pixel 8' });

// Compare criteria importance
decision.compare({
    item: { name: 'Camera Quality' },
    pair: { name: 'Price' },
    weight: Intensity.Strong, // Camera quality is strongly more important than price
});

decision.compare({
    item: { name: 'Battery Life' },
    pair: { name: 'Price' },
    weight: Intensity.Moderate, // Battery life is moderately more important than price
});

decision.compare({
    item: { name: 'Camera Quality' },
    pair: { name: 'Battery Life' },
    weight: Intensity.SlightlyModerate, // Camera quality is slightly more important than battery life
});

// Compare alternatives for each criterion
decision.compare({
    item: { name: 'iPhone 15' },
    pair: { name: 'Samsung Galaxy S24' },
    criterion: { name: 'Camera Quality' },
    weight: Intensity.Moderate, // iPhone moderately better camera than Samsung
});

// ... add all other comparisons

// Calculate results
decision.evaluate();

// View results
console.log('Final Rankings:');
decision.alternatives
    .sort((a, b) => b.priority! - a.priority!)
    .forEach((phone, index) => {
        console.log(
            `${index + 1}. ${phone.name}: ${
                (phone.priority! * 100).toFixed(1)
            }%`,
        );
    });
```

## The Saaty intensity scale

The library uses the standard AHP 1-9 scale for pairwise comparisons:

| Value | Meaning                  | Description                              |
| ----- | ------------------------ | ---------------------------------------- |
| 1     | Equal                    | Two elements contribute equally          |
| 2     | Slightly Moderate        | Intermediate value                       |
| 3     | Moderate                 | Experience moderately favors one element |
| 4     | Moderately Strong        | Intermediate value                       |
| 5     | Strong                   | Experience strongly favors one element   |
| 6     | Strongly to Very Strong  | Intermediate value                       |
| 7     | Very Strong              | One element is very strongly favored     |
| 8     | Very to Extremely Strong | Intermediate value                       |
| 9     | Extreme                  | Highest possible order of affirmation    |

```typescript
// Using the Intensity enum
decision.compare({
    item: { name: 'Quality' },
    pair: { name: 'Price' },
    weight: Intensity.Strong, // Quality is strongly more important than Price
});

// Or using numeric values directly
decision.compare({
    item: { name: 'Quality' },
    pair: { name: 'Price' },
    weight: 5, // Same as Intensity.Strong
});
```

## Core concepts

### Decision structure

Every AHP decision consists of:

- **Goal**: What you're trying to decide
- **Criteria**: Factors used to evaluate alternatives (minimum 2)
- **Alternatives**: Options to choose from (minimum 2)
- **Comparisons**: Pairwise judgments using the 1-9 scale
  1. **Criteria Comparisons**: Compare the relative importance of criteria
  2. **Alternative Comparisons**: Compare how alternatives perform on each
     criterion

## API reference

### Decision class

#### Constructor

```typescript
new Decision(options?: { uid?: () => string })
```

Create a new decision with optional custom ID generator.

#### Static methods

```typescript
Decision.from(data: string | JsonDecision): Decision & JsonDecisionFilled
```

Create a decision from existing data (JSON string or object).

#### Instance methods

##### `add(options)`

Add criteria or alternatives to the decision.

```typescript
decision.add({ criterion: 'Quality' });
decision.add({ criterion: { name: 'Price', id: 'custom-id' } });
decision.add({ alternative: 'Product A' });
```

##### `remove(options)`

Remove criteria or alternatives from the decision.

```typescript
decision.remove({ criterion: { name: 'Quality' } });
decision.remove({ alternative: { id: 'product-a-id' } });
```

##### `compare(params)`

Make pairwise comparisons between items.

```typescript
// Compare criteria importance
decision.compare({
    item: { name: 'Quality' },
    pair: { name: 'Price' },
    weight: 5,
});

// Compare alternatives on a criterion
decision.compare({
    item: { name: 'Product A' },
    pair: { name: 'Product B' },
    criterion: { name: 'Quality' },
    weight: 3,
});
```

##### `validate()`

Check decision completeness and validity.

```typescript
const result = decision.validate();
if (!result.valid) {
    result.errors.forEach((error) => console.log(error.message));
}
```

##### `assertValid()`

Validate and throw if invalid.

```typescript
try {
    decision.assertValid();
} catch (error) {
    console.log('Validation failed:', error.message);
}
```

##### `evaluate()`

Calculate final priorities.

```typescript
decision.evaluate();

// Access results
decision.criteria.forEach((c) => console.log(c.name, c.priority));
decision.alternatives.forEach((a) => console.log(a.name, a.priority));
```

## Advanced usage

### Working with existing data

```typescript
const hiringData = {
    goal: 'Hire the best candidate',
    criteria: [
        { name: 'Technical Skills' },
        { name: 'Experience' },
        { name: 'Communication' },
    ],
    alternatives: [
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Carol' },
    ],
};

const decision = Decision.from(hiringData);
// Decision is automatically filled with proper structure
```

### Custom ID generation

```typescript
let counter = 1000;
const decision = new Decision({
    uid: () => `DECISION_${++counter}`,
});
```

### Serialization

```typescript
// Export decision
const jsonData = JSON.stringify(decision);

// Import decision
const restored = Decision.from(jsonData);
```

### Error handling

```typescript
import { InsufficientCriteria, ValidationError } from '@esroyo/ahp-lib';

try {
    decision.compare({
        item: { name: 'NonExistent' },
        pair: { name: 'Price' },
        weight: 5,
    });
} catch (error) {
    if (error instanceof ValidationError) {
        console.log('Validation error:', error.message);
    }
}
```

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please read the contributing guidelines and submit
pull requests for any improvements.

## References

- Saaty, T.L. (1980). The Analytic Hierarchy Process. McGraw-Hill.
- Saaty, T.L. (2008). Decision making with the analytic hierarchy process.
  International Journal of Services Sciences.
