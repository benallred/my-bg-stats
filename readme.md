# My Board Game Stats

A GitHub Pages site that displays statistics and visualizations from my board game collection and play history.

## Overview

This site processes data from:
- **BG Stats** app export (BGStatsExport.json)

And displays interactive statistics including:
- Traditional and Play Session H-Indexes
- Collection statistics (games owned, expansions, etc.)
- Play statistics (total plays, unique days, etc.)
- Milestone achievements (fives, dimes, quarters, centuries)
- Year-based filtering

## Project Structure

```
my-bg-stats/
├── scripts/              # Data preprocessing
│   ├── package.json
│   ├── process-data.js
│   └── README.md
├── index.html           # Main page
├── styles.css           # Styling
├── app.js              # Application logic
├── stats.js            # Statistics calculations
├── data.json           # Generated data (committed)
├── BGStatsExport.json  # Source data (gitignored)
└── .gitignore
```

## Setup & Usage

### 1. Process Source Data

Place your source file in the project root:
- `BGStatsExport.json` - Export from BG Stats app

Run the preprocessing script:

```bash
node scripts/process-data.js
```

This generates `data.json` with only the necessary, non-private data.

### 2. View the Site Locally

Open `index.html` in a web browser. You'll need a local server for the fetch API to work:

**Option 1: Using Python**
```bash
python -m http.server 8000
```

**Option 2: Using Node.js**
```bash
npx http-server
```

**Option 3: Using VS Code**
Install the "Live Server" extension and click "Go Live"

Then visit `http://localhost:8000` (or the appropriate port).

### 3. Deploy to GitHub Pages

1. Commit all files except the source data:
   ```bash
   git add .
   git commit -m "Initial board game stats site"
   git push
   ```

2. In your GitHub repository settings:
   - Go to Settings → Pages
   - Set Source to "Deploy from a branch"
   - Select the `main` branch and `/ (root)` folder
   - Click Save

Your site will be live at: `https://[username].github.io/my-bg-stats/`

## Privacy

The preprocessing script ensures that private data is NOT included in the public `data.json`:

### Included (Public)
- Game names, BGG IDs, publication years
- Play dates (dates only)
- Acquisition dates (dates only)
- Play counts

### Excluded (Private)
- Player names and IDs
- Game locations
- Scores and winners
- Purchase prices and sources
- Personal ratings
- Comments and notes

## Features

### Statistics Displayed
- **Traditional H-Index**: All play entries counted
- **Play Session H-Index**: Unique game sessions per day
- **Total BGG Entries**: All games, expansions, and expandalones
- **Total Games Owned**: Base games only (excludes expandalones)
- **Total Expansions**: With breakdown of expandalones vs expansion-only
- **Total Plays Logged**: All recorded plays
- **Total Days Played**: Unique dates with plays
- **Total Games Played**: Unique games played (owned or not)
- **Milestone Achievements**: Fives (5+ plays), Dimes (10+), Quarters (25+), Centuries (100+)

### Interactive Features
- **Year Filtering**: View stats for specific years or all time
- **Clickable Stats**: Click on stat cards to see detailed breakdowns
- **New-to-Me Games**: Shows games played for the first time in a given year
- **Unknown Acquisition Dates**: Lists games missing acquisition data when filtering by year

## Updating Data

To update the statistics with new plays or collection changes:

1. Export fresh data from BG Stats
2. Replace `BGStatsExport.json` in the project root
3. Run the preprocessing script:
   ```bash
   node scripts/process-data.js
   ```
4. Commit and push the updated `data.json`:
   ```bash
   git add data.json
   git commit -m "Update stats data"
   git push
   ```

The GitHub Pages site will automatically update within a few minutes.

## Technology Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Data Processing**: Node.js
- **Hosting**: GitHub Pages
