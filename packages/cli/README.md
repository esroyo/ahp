# Analytic Hierarchy Process (AHP) command-line

[![JSR](https://jsr.io/badges/@esroyo/ahp-cli)](https://jsr.io/@esroyo/ahp-cli)
[![JSR Score](https://jsr.io/badges/@esroyo/ahp-cli/score)](https://jsr.io/@esroyo/ahp-cli)
[![ci](https://github.com/esroyo/ahp/actions/workflows/ci.yml/badge.svg)](https://github.com/esroyo/ahp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/esroyo/ahp/graph/badge.svg?token=bgQYIxxIx4)](https://codecov.io/gh/esroyo/ahp)

An interactive command-line tool for structured decision making using the
**[Analytic Hierarchy Process (AHP)](https://en.wikipedia.org/wiki/Analytic_hierarchy_process)**.
Make complex decisions with confidence by systematically comparing alternatives
across multiple criteria.

## Features

- **Interactive workflow** - Step-by-step guidance through the entire AHP
  process
- **Detailed results** - Comprehensive breakdown of criteria importance and
  alternative rankings

## Quick Start

1. **Run the CLI tool**:
   ```bash
   deno run --allow-read --allow-write @esroyo/ahp-cli
   ```

2. **Define your decision**:
   - Enter your decision goal (e.g., "Choose the best laptop")
   - List your criteria (e.g., "Performance, Price, Battery Life")
   - List your alternatives (e.g., "MacBook Pro, ThinkPad X1, Dell XPS")

3. **Make comparisons**:
   - Compare alternatives for each criterion
   - Compare criteria importance
   - Use the intuitive 5-point scale (Equal to Extreme)

4. **Get results**:
   - View comprehensive rankings
   - See criteria importance breakdown
   - Export results if needed

## Example Session

```
AHP Decision Making Tool
Let's structure your decision step by step.

? What is the decision you need to make? Choose the best smartphone
? Type a comma-separated list of criteria Camera Quality, Battery Life, Price, Performance
? Type a comma-separated list of alternative candidates iPhone 15, Samsung Galaxy S24, Google Pixel 8

✅ Decision structure created:
   Goal: Choose the best smartphone
   Criteria (4): Camera Quality, Battery Life, Price, Performance
   Alternatives (3): iPhone 15, Samsung Galaxy S24, Google Pixel 8

You'll need to make 24 pairwise comparisons.

Phase 1: Comparing alternatives for each criterion...

--- Evaluating "Camera Quality" ---
[1/24] Which performs worse on "Camera Quality"?
❯ iPhone 15
  Samsung Galaxy S24

How much better is "Samsung Galaxy S24" than "iPhone 15" on "Camera Quality"?
❯ Equal ─── Moderate ─── Strong ─── Very strong ─── Extreme

... [comparisons continue] ...

DECISION RESULTS
==================================================

CRITERIA IMPORTANCE:
   1. Camera Quality: 35.2%
   2. Performance: 28.7%
   3. Battery Life: 22.1%
   4. Price: 14.0%

FINAL RANKINGS:
   1. iPhone 15: 42.3%
   2. Samsung Galaxy S24: 31.7%
   3. Google Pixel 8: 26.0%

✅ Decision analysis complete! The recommended choice is: iPhone 15
```

## Command line options

```bash
# Basic usage
deno run --allow-read --allow-write @esroyo/ahp-cli

# Get help
deno run @esroyo/ahp-cli --help

# Check version
deno run @esroyo/ahp-cli --version

# Enable verbose output (level 1)
deno run --allow-read --allow-write @esroyo/ahp-cli -v

# Enable debug mode (level 2)
deno run --allow-read --allow-write @esroyo/ahp-cli -vv

# Maximum verbosity for troubleshooting (level 3+)
deno run --allow-read --allow-write @esroyo/ahp-cli -vvv

# Export results as JSON
deno run --allow-read --allow-write @esroyo/ahp-cli -o results.json
```

### Available Options

| Option            | Alias | Description                     | Example                 |
| ----------------- | ----- | ------------------------------- | ----------------------- |
| `--help`          | `-h`  | Show help information           | `--help`                |
| `--version`       | `-V`  | Show version info               | `--version`             |
| `--output <FILE>` | `-o`  | Save results to file            | `--output results.json` |
| `-v`              |       | Enable verbose output (level 1) | `-v`                    |
| `-vv`             |       | Enable debug mode (level 2)     | `-vv`                   |
| `-vvv`            |       | Enable trace mode (level 3+)    | `-vvv`                  |

### Verbosity Levels

| Level  | Flags  | Description     | What You See                          |
| ------ | ------ | --------------- | ------------------------------------- |
| **0**  | (none) | Standard output | Essential information only            |
| **1**  | `-v`   | Verbose mode    | Progress tracking, timing details     |
| **2**  | `-vv`  | Debug mode      | Internal state, detailed logging      |
| **3+** | `-vvv` | Trace mode      | Maximum verbosity for troubleshooting |

## License

MIT License - see LICENSE file for details.
