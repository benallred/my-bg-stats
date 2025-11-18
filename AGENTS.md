# Agent Guidelines for my-bg-stats

## Board Game Statistics Terminology

### Base Game Definition

In board game statistics contexts, "base game" refers exclusively to standalone games that are neither expansions nor expandalones:

- **Base game**: A standalone game that is not an expansion and not an expandalone
- **Expansion**: Content that requires another game to play
- **Expandalone**: Standalone game that can be played independently but also functions as an expansion to another game

These categories are mutually exclusive. A game classified as an expandalone is NOT a base game, even though it can be played standalone.

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
hoursHIndexIncrease: calculateHIndexIncrease(..., 'hours'),
sessionsHIndexIncrease: calculateHIndexIncrease(..., 'sessions'),
playsHIndexIncrease: calculateHIndexIncrease(..., 'plays'),

// Correct ordering - switch with hours as default
switch (metric) {
  case 'sessions':
    return calculateSessionValue();
  case 'plays':
    return calculatePlaysValue();
  case 'hours':
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
function calculateHIndexIncrease(games, plays, year, metric = 'plays') {
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
