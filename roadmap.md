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
9. Highlight stat card when clicked: When a stat card is clicked, visually highlight it to make the link between the card and the details table more visible
10. Add permalink functionality: Button to get a permalink to the currently selected year and stat. Consider showing a chain icon when hovering over the title of the expanded details table
11. Add suggested games to play feature: Provide a list of owned base games that could be played based on various statistical analyses. Each suggestion should include the reason for its inclusion. Suggestion algorithms:
   - One of the most recent games played with the lowest total play session count
   - Game that has not been played the longest
   - One of the games needed to get to the next play session h-index
   - One of the games needed to get to the next play-count milestone
   - One of the games needed to get to the cost per play goal
12. Add play time statistics as a stat card: Show total hours played, year-filterable, with proper handling of plays that have no duration data
13. Add "Gaming Year in Review" section: New section positioned below stat cards and above diagnostics, using inline "description: number" format. Include:
   - **Engagement & Milestones:** Increase in all-time h-index and contributor games, yearly session h-index and contributor games, new milestones reached (games hitting fives/dimes/quarters/centuries), games closest to next milestone, biggest jumps (games with most increased play count vs previous year)
   - **Time & Activity:** Total days played, total play time (hours), longest total playtime in one day, shortest total playtime in one day, busiest gaming month, longest play streak (consecutive days), longest dry spell (days between sessions), most productive gaming day
   - **Game Statistics:** Most played game by days, most played game by hours, longest single play (game + duration), most time-efficient game (most plays per hour), marathon game (highest total hours), unique games played, new-to-me games played, highest rated new-to-me game, oldest game played (by publication year), newest game played (by publication year)
   - **Social & Locations:** Total number of other players (excluding self), total solo plays, total solo days, total solo-only days (no multiplayer games that day), most common player count, most common day to play, game played with the most unique players, most social game (played with most unique players), biggest gaming session (most players in single session/day), locations played in, game played in the most locations, most frequented location
   - **Collection & Variety:** Shelf of shame progress (games played for the first time, regardless of acquisition date), shelf of shame additions (games acquired this year still unplayed), resurrected games (not played previous year, played this year), dormant games (played previous year, not played this year), play concentration (% of plays from top 10 games), new vs familiar ratio (plays of new-to-me vs previously played)
   - **Records & Comparisons:** Personal records broken (all-time highs achieved this year), personal records set (all-time lows achieved this year), this year vs last year (plays, unique games, hours with % changes), speed gaming day (most games in shortest time), variety day (most unique games in one day), average play duration for the year, average rating of games played, weekend vs weekday play percentage
   - When viewing current year, show stats through latest logged play date only (no projections)
