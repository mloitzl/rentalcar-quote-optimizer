# 🚗 Rental Car Quote Optimizer

A browser-based automation script for comparing car rental prices across multiple date combinations. Optimized for hXXXz but adaptable to other rental services.

## Overview

This console script automates price comparison by testing all combinations of pickup and return dates within specified ranges, eliminating the need for manual date-by-date searches.

**Key Features:**
- Automated multi-date price comparison
- Configurable minimum trip length filtering
- Real-time progress tracking with error handling
- Rate limit detection with header inspection
- Graceful stop functionality
- Multiple export formats (Markdown, JSON, CSV)

## Quick Start

1. Navigate to your target rental site (e.g., https://www.hXXXz.ch)
2. Open DevTools Console (`F12` → Console tab)
3. Paste the script and execute
4. Results auto-copy to clipboard on completion

### Optional Exports
```javascript
downloadJSON(window.carRentalResults)  // JSON export
downloadCSV(window.carRentalResults)   // CSV export
```

## Configuration

### Basic Settings

```javascript
const CONFIG = {
  pickupLocation: 'ZRHX90',              // Location code
  pickupLocationName: 'Zürich - Hauptbahnhof',
  pickupTime: '12:00',
  returnTime: '12:00',
  age: '25',
  cdp: '',                               // Corporate Discount Program code (see below)
  rq: 'BEST',                           // Rate qualifier
  minDays: 12,                          // Minimum rental duration
  delayMs: 2000                         // Request interval (ms)
};
```

### Date Ranges

Modify the date parameters at the bottom of the script:

```javascript
const results = await searchBestPrices(
  '09/02/2026',  // Pickup start (DD/MM/YYYY)
  '19/02/2026',  // Pickup end
  '03/03/2026',  // Return start
  '18/03/2026'   // Return end
);
```

### Finding Your CDP Code

Corporate Discount Program (CDP) codes provide discounted rates for members of partner organizations:

1. Check if your employer, association, or credit card offers a CDP code
2. Common sources:
   - AAA/CAA memberships
   - Airline loyalty programs
   - Credit card benefits (AMEX, Visa Infinite, etc.)
   - Professional associations
   - University alumni programs
3. Look for "Corporate/Promotional Code" fields on the rental site
4. Leave blank (`cdp: ''`) if you don't have one

**Note:** hXXXz may require verification of CDP eligibility at pickup.

### Location Codes

To find location codes:
1. Use DevTools Network tab while searching on the rental site
2. Inspect the API request payload
3. Look for `pickupLocationCode` or similar field
4. Common format: Airport IATA code + location number (e.g., `ZRHX90`)

## Runtime Controls

### Stop Execution
```javascript
stopSearch()
```
Completes current request, then stops gracefully and displays partial results.

### Force Stop
Reload the page (`F5` / `Ctrl+R`)

## Output Format

### Console Display
- Real-time progress with colored status indicators
- HTTP status codes and rate limit headers on errors
- Summary statistics on completion

### Markdown Table (auto-copied)
```markdown
## 🏆 BEST DEAL
**19/02/2026 → 03/03/2026** (12 days)
**645.38 CHF** total | **53.78 CHF/day**
**Car:** (A) Toyota Aygo
...

## 📊 TOP 20 CHEAPEST OPTIONS
| Rank | Pickup | Return | Days | Total Price | Price/Day | Car | Group |
|------|--------|--------|------|-------------|-----------|-----|-------|
...
```

### Exported Data
- **JSON**: Full structured data with all vehicle details
- **CSV**: Spreadsheet-compatible format for analysis

## Error Handling

The script continues execution on errors and provides detailed logging:

- **HTTP errors**: Status code, status text, and response headers
- **Rate limiting (429/503)**: Displays `Retry-After`, rate limit quotas, and reset times
- **Network errors**: Exception type and message
- **Parsing errors**: Continues to next date combination

Example error output:
```
⚠️  HTTP 429 Too Many Requests
🚨 RATE LIMITED!
⏱️  Rate Limit Info:
   Retry after: 60 seconds
   Rate limit: 0/100 remaining
   Reset at: 2:30:45 PM
```

## Performance Considerations

**Execution Time:** `(# of combinations) × (delayMs / 1000)` seconds
- Example: 176 combinations × 2s = ~6 minutes

**Rate Limiting:**
- Default 2-second delay between requests
- Increase `delayMs` to 3000-4000 if rate limited
- Monitor console for rate limit warnings

**Resource Usage:**
- Runs entirely in browser (no external dependencies)
- Minimal memory footprint
- Results stored in `window.carRentalResults`

## Customization

### Adapting to Other Rental Services

To modify for different rental APIs:

1. **Update API endpoint:**
   ```javascript
   const API_ENDPOINT = 'https://your-rental-site.com/api/endpoint';
   ```

2. **Adjust request payload** in `fetchPrices()` function

3. **Modify response parsing** in `findCheapestCar()` function to match new data structure

4. **Update headers** if authentication or special headers required

### Adding Custom Filters

Extend the `findCheapestCar()` function to filter by:
- Vehicle type (SUV, sedan, etc.)
- Transmission (automatic/manual)
- Electric vehicles only
- Passenger capacity
- Price ceiling

## Technical Details

**Dependencies:** None (vanilla JavaScript)

**Browser Compatibility:** 
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

**API Method:** POST requests with JSON payloads

**Data Storage:** Results stored in `window.carRentalResults` global variable

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Script stops after error | Already handled - check console for details |
| Rate limited (429) | Increase `delayMs` or wait before retrying |
| No prices available | Normal - some dates have no availability |
| CORS errors | Must run on rental site's domain |
| Network errors | Check internet connection and site accessibility |

## Legal & Ethical Considerations

⚠️ **IMPORTANT DISCLAIMERS:**

### Terms of Service
- This tool may violate the Terms of Service of some rental websites
- Automated scraping may be prohibited
- Check the target site's ToS before use
- Use at your own risk

### Rate Limiting & Fair Use
- Respect rate limits (default 2s delay minimum)
- Don't run multiple instances simultaneously
- Avoid excessive requests during peak hours
- Monitor for rate limit warnings and adjust accordingly

### Educational & Personal Use Only
- This tool is provided for educational purposes
- Intended for personal use only
- Not for commercial use or resale
- Not for scraping data at scale

### No Warranty
- Tool provided "as is" without warranty
- Authors not responsible for:
  - IP blocking or account termination
  - Inaccurate pricing data
  - ToS violations
  - Any damages from use

**Use responsibly. The fact that you _can_ automate something doesn't mean you _should_ do it excessively.**

## Contributing

Contributions welcome via pull requests:

- Bug fixes
- Performance improvements
- Support for additional rental services
- Enhanced error handling
- Documentation improvements

Please ensure:
- Code maintains existing structure
- Comments explain complex logic
- Commits are descriptive

## License

MIT License - see [LICENSE](LICENSE) file for details.

Free to use and modify for personal use. Attribution appreciated but not required.

---

**Disclaimer:** This is an independent project not affiliated with, endorsed by, or connected to Hertz Corporation or any other car rental company. All trademarks belong to their respective owners.

---

## Project Structure

```
rentalcar-quote-optimizer/
├── README.md                          # This file
├── LICENSE                            # MIT License
├── hertz-price-optimizer.js          # Main script
└── .gitignore                        # Git ignore rules
```

---

**Made for budget-conscious travelers who value automation** 🚀