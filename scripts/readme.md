# Data Preprocessing Script

This script processes the BG Stats export and BoardGameGeek collection CSV to generate a minimal, privacy-focused JSON file for the website.

## Setup

1. Install dependencies:
   ```bash
   cd scripts
   npm install
   ```

## Usage

1. Ensure `BGStatsExport.json` and `collection.csv` are in the project root
2. Run the script:
   ```bash
   npm run process
   ```
   Or directly:
   ```bash
   node process-data.js
   ```

3. The script will generate `data.json` in the project root

## What Gets Processed

### Included in data.json:
- Game names, BGG IDs, publication years
- Base game vs expansion flags
- Expandalone tags
- Acquisition dates (dates only)
- Play dates (dates only)
- Play counts per game

### Excluded (privacy):
- Player names and IDs
- Game locations
- Scores and winners
- Purchase prices and sources
- Personal ratings
- Comments and notes

## Output Format

```json
{
  "games": [
    {
      "id": 123,
      "name": "Game Name",
      "bggId": 456789,
      "year": 2020,
      "isBaseGame": true,
      "isExpansion": false,
      "isExpandalone": false,
      "acquisitionDate": "2021-05-15",
      "playCount": 10,
      "uniquePlayDays": 8
    }
  ],
  "plays": [
    {
      "gameId": 123,
      "date": "2024-01-15"
    }
  ],
  "generatedAt": "2024-01-15T12:00:00.000Z"
}
```
