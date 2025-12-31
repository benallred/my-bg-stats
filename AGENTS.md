# Agent Guidelines for my-bg-stats

## Board Game Statistics Terminology

### Base Game Definition

In board game statistics contexts, "base game" refers exclusively to standalone games that are neither expansions nor expandalones:

- **Base game**: A standalone game that is not an expansion and not an expandalone
- **Expansion**: Content that requires another game to play
- **Expandalone**: Standalone game that can be played independently but also functions as an expansion to another game

These categories are mutually exclusive. A game classified as an expandalone is NOT a base game, even though it can be played standalone.

### Session Definition

A "session" is approximated as a unique calendar day. Multiple plays may occur during separate sessions on the same day, but we have no way to distinguish them from our data. Therefore:

- **Session**: All plays that occur on the same calendar day
- Use the term "session" (not "day") when describing this concept in code and UI
- One session = one unique date, regardless of how many plays occurred

## Metric Ordering Convention

When hours, sessions, and plays are used together for any reason, they MUST always appear in this order:

1. **Hours** (first)
2. **Sessions** (second)
3. **Plays** (third)

This ordering applies to:
- UI display elements
- Code variable declarations
- Function parameter documentation
- Test cases
- Any other context where multiple metrics appear together

**Special case for switch statements with defaults:**
When using switch statements where hours is the default/fallthrough case, the order should be:
1. Sessions (explicit case)
2. Plays (explicit case)
3. Hours (default case, comes last)

This allows hours to be the default while maintaining logical grouping of explicit cases.

**Examples:**
```javascript
// Correct ordering - variable declarations
hoursHIndexIncrease: calculateHIndexIncrease(..., Metric.HOURS),
sessionsHIndexIncrease: calculateHIndexIncrease(..., Metric.SESSIONS),
playsHIndexIncrease: calculateHIndexIncrease(..., Metric.PLAYS),

// Correct ordering - switch with hours as default
switch (metric) {
  case Metric.SESSIONS:
    return calculateSessionValue();
  case Metric.PLAYS:
    return calculatePlaysValue();
  case Metric.HOURS:
  default:
    return calculateHoursValue();
}
```

## Function Parameter Defaults

Do NOT use default parameter values in function signatures except when `null` is meaningful.

**Rules:**
- Required parameters that should always be explicitly passed: **no default value**
- Optional parameters where `null` is a valid/meaningful value: **use `= null`**

**Examples:**

```javascript
// CORRECT - metric is required, must be explicitly passed
function calculateHIndexIncrease(games, plays, year, metric) {
  // ...
}

// CORRECT - year is optional, null means "all time"
function calculateTraditionalHIndex(games, plays, year = null) {
  // ...
}

// INCORRECT - don't use arbitrary defaults for required parameters
function calculateHIndexIncrease(games, plays, year, metric = Metric.PLAYS) {
  // ...
}
```

This ensures function calls are explicit and self-documenting about required vs optional parameters.

## Time Duration Data Storage

Always aggregate and store time durations in **minutes**, never hours.

**Rules:**
- Data layer (stats.js): Always work with minutes for calculations and return values
- Display layer (app.js): Convert minutes to hours/formatted strings only when rendering

**Rationale:**
- Minutes provide integer precision for most play durations
- Consistent unit throughout data calculations prevents conversion errors
- Display concerns remain separate from data concerns

**Examples:**

```javascript
// CORRECT - data layer stores minutes
function getDaysPlayedByGame(games, plays, year = null) {
  // ...
  gameDays.minutesPerDay.set(play.date, currentMinutes + play.durationMin);
  // ...
  return {
    minMinutes: Math.min(...minutesPerDayArray),
    maxMinutes: Math.max(...minutesPerDayArray),
    // ...
  };
}

// CORRECT - display layer converts to hours
function showDaysPlayedBreakdown(container) {
  const formatMinutes = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };
  // ...
}

// INCORRECT - data layer converts to hours
function getDaysPlayedByGame(games, plays, year = null) {
  // ...
  gameDays.hoursPerDay.set(play.date, currentHours + (play.durationMin / 60));
  // ...
}
```

## Metric Keyword Highlighting in Year in Review

When displaying metric keywords (hours, sessions, plays) in Year in Review UI, always wrap them with the `metric-name` span for consistent highlighting:

```html
<span class="metric-name hours">hours</span>
<span class="metric-name sessions">sessions</span>
<span class="metric-name plays">plays</span>
```

**Example:**
```javascript
// CORRECT - metric keywords highlighted
`Solo <span class="metric-name hours">hours</span>:`
`Solo <span class="metric-name sessions">sessions</span>:`
`Solo <span class="metric-name plays">plays</span>:`

// INCORRECT - plain text
`Solo hours:`
`Solo sessions:`
`Solo plays:`
```

## Trailing Commas

Always use trailing commas in multi-line constructs where they are syntactically valid:

- Array literals
- Object literals
- Function parameters and arguments
- Import/export statements

**Rationale:**
- Cleaner diffs when adding/removing items (only one line changes)
- Reduces merge conflicts
- Consistent style throughout codebase

**Examples:**

```javascript
// CORRECT - trailing commas
const stats = {
    hours: 100,
    sessions: 50,
    plays: 200,
};

const games = [
    'Catan',
    'Wingspan',
    'Azul',
];

calculateStats(
    gameData.games,
    gameData.plays,
    currentYear,
);

// INCORRECT - missing trailing commas
const stats = {
    hours: 100,
    sessions: 50,
    plays: 200
};
```

## Year in Review Summary Updates

When adding new details or stats to the Year in Review feature, always ask the user if and how they want the Summary section updated to reflect the new information.

The Summary section provides a high-level overview, so not every detail needs to appear there. Ask the user:
1. Whether this new stat should be mentioned in the Summary
2. If yes, how they want it presented (e.g., as a standalone line, incorporated into existing text, etc.)

## Play Next Suggestion Metric Coverage

Play next suggestions are NOT metric-aware (they don't respond to the currentBaseMetric filter). When a suggestion algorithm is metric-based, it should generate separate suggestions for ALL THREE metric types (hours, sessions, plays), following the metric ordering convention.

**Example - Milestone suggestions:**
```javascript
suggestForNextMilestone(gamePlayData, Metric.HOURS),
suggestForNextMilestone(gamePlayData, Metric.SESSIONS),
suggestForNextMilestone(gamePlayData, Metric.PLAYS),
```

This ensures users see relevant suggestions regardless of which metric filter they have selected.

## Pre-Commit Requirements

**CRITICAL: Always run the test suite before creating any commit.**

Before committing changes:

1. **Run tests with coverage**: Execute `npm run test:coverage` to ensure all tests pass and coverage thresholds are met
2. **Verify output**: Confirm no test failures and coverage meets configured thresholds
3. **Fix issues**: If tests fail or coverage drops, resolve issues before committing

**Never commit code that:**
- Fails any test
- Reduces coverage below configured thresholds
- Has not been tested

This ensures the codebase remains stable and well-tested at all times.
