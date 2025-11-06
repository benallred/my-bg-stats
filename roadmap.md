# Roadmap

*Note: Items are numbered for reference only. Order does not represent priority.*

1. Fix ownership status: Update code to use `statusOwned` field so "Total Games Owned" only counts currently owned games, while "Total Games Acquired" includes previously owned games
2. Improve year filter dropdown: Include all acquisition years, even if no plays were logged, with separator between pre-logging and post-logging eras
3. Add price-per-play statistics: cheapest game per play, most expensive game per play, average price-per-play
4. Clicking an already-open card should close its details panel
5. Fix expandalones count showing 0
6. Update AGENTS.md to clarify "base game" terminology always excludes both expansions and expandalones
7. Refactor game classification: Each game should be classified as exactly one type (base, expandalone, or expansion), never a combination. Update data processing to enforce mutually exclusive categories.
8. Fix stats to only show owned games: "Unknown Acquisition Dates" and "Total BGG Entries" should filter to only owned games (including expansions and expandalones)
9. Add suggested games to play feature: Provide a list of owned base games that could be played based on various statistical analyses. Each suggestion should include the reason for its inclusion. Suggestion algorithms:
   - One of the most recent games played with the lowest total play session count
   - Game that has not been played the longest
   - One of the games needed to get to the next play session h-index
   - One of the games needed to get to the next play-count milestone
   - One of the games needed to get to the cost per play goal
