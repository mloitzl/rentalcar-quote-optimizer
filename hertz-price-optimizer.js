// ========================================
// 🚗 HERTZ CAR RENTAL PRICE OPTIMIZER
// with STOP function + Enhanced Error Logging
// ========================================

const API_ENDPOINT = 'https://www.hertz.com/rentacar/rest/hertz/v2/reservations/makeReservation';

// Configuration
const CONFIG = {
  pickupLocation: 'DWHX90',
  pickupLocationName: 'Darmstadt - Hauptbahnhof',
  pickupTime: '12:00',
  returnTime: '12:00',
  age: '25',
  cdp: '123456',
  rq: 'BEST',
  minDays: 12,
  delayMs: 2000
};

// ========================================
// STOP CONTROL
// ========================================
window.STOP_SEARCH = false;

window.stopSearch = function() {
  window.STOP_SEARCH = true;
  console.log('%c🛑 STOP REQUESTED - Script will stop after current request completes', 'color: #FF0000; font-weight: bold; font-size: 16px;');
};

// ========================================
// DATE UTILITIES
// ========================================

function parseDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function daysBetween(date1, date2) {
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function generateDateCombinations(pickupStart, pickupEnd, returnStart, returnEnd, minDays) {
  const combinations = [];
  let currentPickup = parseDate(pickupStart);
  const endPickup = parseDate(pickupEnd);
  
  while (currentPickup <= endPickup) {
    let currentReturn = parseDate(returnStart);
    const endReturn = parseDate(returnEnd);
    
    while (currentReturn <= endReturn) {
      const days = daysBetween(currentPickup, currentReturn);
      
      if (currentReturn > currentPickup && days >= minDays) {
        combinations.push({
          pickup: formatDate(currentPickup),
          return: formatDate(currentReturn),
          days: days
        });
      }
      currentReturn.setDate(currentReturn.getDate() + 1);
    }
    currentPickup.setDate(currentPickup.getDate() + 1);
  }
  
  return combinations;
}

// ========================================
// API INTERACTION
// ========================================

// Extract rate limiting and relevant headers
function extractHeaders(response) {
  const headers = {};
  
  // Common rate limiting headers
  const relevantHeaders = [
    'retry-after',
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
    'x-ratelimit-reset',
    'x-rate-limit-limit',
    'x-rate-limit-remaining',
    'x-rate-limit-reset',
    'ratelimit-limit',
    'ratelimit-remaining',
    'ratelimit-reset',
    'x-request-id',
    'x-response-time',
    'date',
    'server'
  ];
  
  for (const header of relevantHeaders) {
    const value = response.headers.get(header);
    if (value) {
      headers[header] = value;
    }
  }
  
  return headers;
}

// Format rate limit info for display
function formatRateLimitInfo(headers) {
  const info = [];
  
  // Check for Retry-After
  if (headers['retry-after']) {
    info.push(`Retry after: ${headers['retry-after']} seconds`);
  }
  
  // Check for rate limit remaining
  const remaining = headers['x-ratelimit-remaining'] || 
                    headers['x-rate-limit-remaining'] || 
                    headers['ratelimit-remaining'];
  const limit = headers['x-ratelimit-limit'] || 
                headers['x-rate-limit-limit'] || 
                headers['ratelimit-limit'];
  
  if (remaining !== undefined && limit !== undefined) {
    info.push(`Rate limit: ${remaining}/${limit} remaining`);
  } else if (remaining !== undefined) {
    info.push(`Requests remaining: ${remaining}`);
  }
  
  // Check for rate limit reset
  const reset = headers['x-ratelimit-reset'] || 
                headers['x-rate-limit-reset'] || 
                headers['ratelimit-reset'];
  
  if (reset) {
    // Try to parse as timestamp
    const resetTime = parseInt(reset);
    if (!isNaN(resetTime)) {
      const resetDate = new Date(resetTime * 1000);
      info.push(`Reset at: ${resetDate.toLocaleTimeString()}`);
    } else {
      info.push(`Reset: ${reset}`);
    }
  }
  
  // Request ID
  if (headers['x-request-id']) {
    info.push(`Request ID: ${headers['x-request-id']}`);
  }
  
  return info;
}

async function fetchPrices(pickupDate, returnDate) {
  const payload = {
    metadata: { isReviewModify: false },
    itinerary: {
      age: CONFIG.age,
      pickupLocationCode: CONFIG.pickupLocation,
      pickupLocationName: CONFIG.pickupLocationName,
      returnLocationCode: '',
      returnLocationName: '',
      pickupDate: pickupDate,
      pickupTime: CONFIG.pickupTime,
      militaryClock: 1,
      returnDate: returnDate,
      returnTime: CONFIG.returnTime,
      vehicleType: '',
      cdp: CONFIG.cdp,
      pc: '',
      rq: CONFIG.rq,
      cv: '',
      it: '',
      useRewardPoints: 'N',
      keepOriginalRateQuote: '',
      fromLocationSearch: false,
      corporateRate: '',
      lastName: '',
      memberNumber: '',
      affiliateCallCount: 0,
      affiliateMemberID: '',
      affiliateMemberJoin: '',
      companyId: '',
      partnerCDPVerified: 0,
      corpRate: '',
      useProfileCDP: '',
      officialTravel: 'off'
    }
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Extract headers
    const headers = extractHeaders(response);

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        statusText: response.statusText,
        headers: headers,
        data: null
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      status: response.status,
      headers: headers,
      data: data
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      errorType: error.name,
      data: null
    };
  }
}

function findCheapestCar(data) {
  try {
    if (!data?.data?.model?.vehicles || !Array.isArray(data.data.model.vehicles)) {
      return null;
    }

    const vehicles = data.data.model.vehicles;
    let cheapest = null;

    for (const vehicle of vehicles) {
      if (!vehicle?.quotes || !Array.isArray(vehicle.quotes) || vehicle.quotes.length === 0) continue;

      for (const quote of vehicle.quotes) {
        if (!quote?.price || quote.soldout === 1 || quote.unavailable === 1) continue;

        const price = parseFloat(quote.price);
        
        if (isNaN(price) || price <= 0) continue;

        if (!cheapest || price < cheapest.price) {
          cheapest = {
            price: price,
            currency: quote.currency || 'CHF',
            carName: vehicle.name || 'Unknown',
            carGroup: vehicle.carGroup || 'N/A',
            sipp: vehicle.sipp || '',
            passengers: vehicle.passengers || '',
            luggage: vehicle.luggage || '',
            transmission: vehicle.transmission || '',
            fuelConsumption: vehicle.fuel || '',
            prepaid: quote.prepaid === 1 ? 'Yes' : 'No',
            rateCode: quote.rateCode || '',
            discount: quote.discountAmount || '',
            carType: vehicle.carTypeDisplay || '',
            ev: vehicle.ev === 1 ? '⚡' : ''
          };
        }
      }
    }

    return cheapest;
    
  } catch (error) {
    console.warn('⚠️  Error in findCheapestCar:', error.message);
    return null;
  }
}

// ========================================
// MAIN SEARCH FUNCTION
// ========================================

async function searchBestPrices(pickupStart, pickupEnd, returnStart, returnEnd) {
  // Reset stop flag
  window.STOP_SEARCH = false;
  
  console.log('%c🚗 HERTZ CAR RENTAL PRICE OPTIMIZER', 'font-size: 16px; font-weight: bold; color: #FFD700;');
  console.log('================================\n');
  console.log(`📍 Location: ${CONFIG.pickupLocationName}`);
  console.log(`📅 Pickup Range: ${pickupStart} - ${pickupEnd}`);
  console.log(`📅 Return Range: ${returnStart} - ${returnEnd}`);
  console.log(`⏱️  Min Trip Length: ${CONFIG.minDays} days`);
  console.log(`⏳ Delay: ${CONFIG.delayMs}ms between requests\n`);
  console.log('%c🛑 To stop the search, type: stopSearch()', 'color: #FF9900; font-weight: bold; font-size: 14px;');
  console.log('');
  
  const combinations = generateDateCombinations(
    pickupStart, 
    pickupEnd, 
    returnStart, 
    returnEnd, 
    CONFIG.minDays
  );
  
  console.log(`🔍 Testing ${combinations.length} date combinations\n`);
  console.log('Starting search...\n');
  
  const results = [];
  const startTime = Date.now();
  let progressCount = 0;
  let successCount = 0;
  let errorCount = 0;
  let rateLimitWarnings = 0;

  for (const combo of combinations) {
    // Check if stop was requested
    if (window.STOP_SEARCH) {
      console.log('\n%c🛑 SEARCH STOPPED BY USER', 'color: #FF0000; font-weight: bold; font-size: 16px;');
      console.log(`%c📊 Processed ${progressCount}/${combinations.length} combinations before stopping`, 'color: #FF9900;');
      break;
    }

    progressCount++;
    const percentage = ((progressCount / combinations.length) * 100).toFixed(1);
    
    console.log(`%c[${progressCount}/${combinations.length}] (${percentage}%)`, 'color: #00AA00; font-weight: bold;', `${combo.pickup} → ${combo.return} (${combo.days} days)`);

    try {
      // Fetch with detailed response info
      const response = await fetchPrices(combo.pickup, combo.return);
      
      // Handle different error scenarios
      if (!response.success) {
        errorCount++;
        
        // Network/Fetch error
        if (response.error) {
          console.log(`  %c⚠️  Network Error: ${response.errorType} - ${response.error}`, 'color: #FF3333; font-weight: bold;');
        }
        // HTTP error
        else if (response.status) {
          console.log(`  %c⚠️  HTTP ${response.status} ${response.statusText}`, 'color: #FF6600; font-weight: bold;');
          
          // Check for rate limiting
          if (response.status === 429 || response.status === 503) {
            rateLimitWarnings++;
            console.log(`  %c🚨 RATE LIMITED!`, 'color: #FF0000; font-weight: bold; font-size: 14px;');
          }
          
          // Display headers if present
          if (response.headers && Object.keys(response.headers).length > 0) {
            console.log(`  %c📋 Response Headers:`, 'color: #AAAAAA; font-style: italic;');
            
            // Format and display rate limit info
            const rateLimitInfo = formatRateLimitInfo(response.headers);
            if (rateLimitInfo.length > 0) {
              console.log(`  %c⏱️  Rate Limit Info:`, 'color: #FF9900; font-weight: bold;');
              rateLimitInfo.forEach(info => {
                console.log(`     ${info}`);
              });
            }
            
            // Display all headers
            console.log(`  %c📦 All Headers:`, 'color: #AAAAAA;');
            for (const [key, value] of Object.entries(response.headers)) {
              console.log(`     ${key}: ${value}`);
            }
          }
        }
        
        results.push({
          pickup: combo.pickup,
          return: combo.return,
          days: combo.days,
          totalPrice: null,
          pricePerDay: null,
          currency: 'CHF',
          carName: 'N/A',
          error: response.error || `HTTP ${response.status}`,
          status: response.status,
          statusText: response.statusText
        });
        
        continue;
      }

      // Success - try to find cheapest car
      const cheapest = findCheapestCar(response.data);

      if (cheapest?.price) {
        const pricePerDay = (cheapest.price / combo.days).toFixed(2);
        
        results.push({
          pickup: combo.pickup,
          return: combo.return,
          days: combo.days,
          totalPrice: cheapest.price,
          pricePerDay: parseFloat(pricePerDay),
          currency: cheapest.currency,
          carName: cheapest.carName,
          carGroup: cheapest.carGroup,
          sipp: cheapest.sipp,
          passengers: cheapest.passengers,
          luggage: cheapest.luggage,
          transmission: cheapest.transmission,
          fuelConsumption: cheapest.fuelConsumption,
          prepaid: cheapest.prepaid,
          rateCode: cheapest.rateCode,
          discount: cheapest.discount,
          carType: cheapest.carType,
          ev: cheapest.ev,
          status: response.status
        });

        successCount++;
        console.log(`  %c✅ ${cheapest.ev}${cheapest.carName}: ${cheapest.price} ${cheapest.currency} (${pricePerDay} ${cheapest.currency}/day)`, 'color: #00CC00;');
      } else {
        errorCount++;
        console.log(`  %c⚠️  No prices available (HTTP ${response.status})`, 'color: #FF9900;');
        
        // Show headers for successful response but no prices
        if (response.headers && Object.keys(response.headers).length > 0) {
          const rateLimitInfo = formatRateLimitInfo(response.headers);
          if (rateLimitInfo.length > 0) {
            console.log(`  %c⏱️  Rate Limit Info:`, 'color: #0099FF;');
            rateLimitInfo.forEach(info => {
              console.log(`     ${info}`);
            });
          }
        }
        
        results.push({
          pickup: combo.pickup,
          return: combo.return,
          days: combo.days,
          totalPrice: null,
          pricePerDay: null,
          currency: 'CHF',
          carName: 'N/A',
          error: 'No prices in response',
          status: response.status
        });
      }
      
    } catch (error) {
      errorCount++;
      console.error(`  %c❌ Unexpected error: ${error.name} - ${error.message}`, 'color: #FF0000; font-weight: bold;');
      console.error(`     Stack: ${error.stack?.split('\n')[1]?.trim() || 'N/A'}`);
      
      results.push({
        pickup: combo.pickup,
        return: combo.return,
        days: combo.days,
        totalPrice: null,
        pricePerDay: null,
        currency: 'CHF',
        carName: 'N/A',
        error: `${error.name}: ${error.message}`
      });
    }

    if (progressCount % 10 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const remaining = Math.ceil(((combinations.length - progressCount) * CONFIG.delayMs) / 1000);
      console.log(`\n%c⏱️  Elapsed: ${elapsed}s | Est. remaining: ${remaining}s | Success: ${successCount} | Errors: ${errorCount}`, 'color: #0099FF; font-weight: bold;');
      if (rateLimitWarnings > 0) {
        console.log(`%c⚠️  Rate limit warnings: ${rateLimitWarnings}`, 'color: #FF9900; font-weight: bold;');
      }
      console.log('');
    }

    if (progressCount < combinations.length && !window.STOP_SEARCH) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayMs));
    }
  }

  results.sort((a, b) => {
    if (a.pricePerDay === null) return 1;
    if (b.pricePerDay === null) return -1;
    return a.pricePerDay - b.pricePerDay;
  });

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('\n================================');
  
  if (window.STOP_SEARCH) {
    console.log(`%c⏹️  Search stopped in ${totalTime} minutes`, 'font-size: 14px; font-weight: bold; color: #FF9900;');
  } else {
    console.log(`%c✅ Search completed in ${totalTime} minutes`, 'font-size: 14px; font-weight: bold; color: #00FF00;');
  }
  
  console.log(`%c📊 Results: ${successCount} with prices, ${errorCount} without prices`, 'font-size: 12px; color: #00AAFF;');
  
  if (rateLimitWarnings > 0) {
    console.log(`%c🚨 Rate limit warnings encountered: ${rateLimitWarnings}`, 'font-size: 12px; color: #FF0000; font-weight: bold;');
  }
  
  console.log('');

  return results;
}

// ========================================
// RESULTS FORMATTING
// ========================================

function generateMarkdownTable(results) {
  let markdown = '\n# 🚗 HERTZ CAR RENTAL PRICE RESULTS\n\n';
  
  const validResults = results.filter(r => r.totalPrice !== null);
  if (validResults.length > 0) {
    const best = validResults[0];
    markdown += '## 🏆 BEST DEAL\n\n';
    markdown += `**${best.pickup} → ${best.return}** (${best.days} days)  \n`;
    markdown += `**${best.totalPrice.toFixed(2)} ${best.currency}** total | **${best.pricePerDay.toFixed(2)} ${best.currency}/day**  \n`;
    markdown += `**Car:** ${best.ev}${best.carName} (${best.carGroup})  \n`;
    markdown += `**Type:** ${best.carType}  \n`;
    markdown += `**Passengers:** ${best.passengers} | **Luggage:** ${best.luggage}  \n`;
    markdown += `**Transmission:** ${best.transmission} | **Fuel:** ${best.fuelConsumption}  \n`;
    markdown += `**Prepaid:** ${best.prepaid} | **Rate Code:** ${best.rateCode}  \n`;
    if (best.discount) markdown += `**Discount:** ${best.discount}  \n`;
    markdown += '\n---\n\n';
  }

  markdown += '## 📊 TOP 20 CHEAPEST OPTIONS (by price per day)\n\n';
  markdown += '| Rank | Pickup | Return | Days | Total Price | Price/Day | Car | Group | Prepaid |\n';
  markdown += '|------|--------|--------|------|-------------|-----------|-----|-------|----------|\n';

  let rank = 1;
  const top20 = validResults.slice(0, 20);
  
  for (const result of top20) {
    const carShortName = result.carName.length > 25 ? result.carName.substring(0, 25) + '...' : result.carName;
    markdown += `| ${rank} | ${result.pickup} | ${result.return} | ${result.days} | **${result.totalPrice.toFixed(2)} ${result.currency}** | **${result.pricePerDay.toFixed(2)}** | ${result.ev}${carShortName} | ${result.carGroup} | ${result.prepaid} |\n`;
    rank++;
  }

  markdown += '\n---\n\n';
  
  const withoutPrices = results.filter(r => r.totalPrice === null);
  
  markdown += '## 📈 STATISTICS\n\n';
  markdown += `- **Total searches:** ${results.length}\n`;
  markdown += `- **With prices:** ${validResults.length}\n`;
  markdown += `- **Without prices:** ${withoutPrices.length}\n`;
  
  if (validResults.length > 0) {
    const avgTotal = (validResults.reduce((sum, r) => sum + r.totalPrice, 0) / validResults.length).toFixed(2);
    const avgPerDay = (validResults.reduce((sum, r) => sum + r.pricePerDay, 0) / validResults.length).toFixed(2);
    const maxPrice = Math.max(...validResults.map(r => r.totalPrice)).toFixed(2);
    const minPrice = Math.min(...validResults.map(r => r.totalPrice)).toFixed(2);
    const maxPricePerDay = Math.max(...validResults.map(r => r.pricePerDay)).toFixed(2);
    const minPricePerDay = Math.min(...validResults.map(r => r.pricePerDay)).toFixed(2);
    
    markdown += `- **Average total price:** ${avgTotal} CHF\n`;
    markdown += `- **Average price/day:** ${avgPerDay} CHF\n`;
    markdown += `- **Highest total:** ${maxPrice} CHF\n`;
    markdown += `- **Lowest total:** ${minPrice} CHF\n`;
    markdown += `- **Highest price/day:** ${maxPricePerDay} CHF\n`;
    markdown += `- **Lowest price/day:** ${minPricePerDay} CHF\n`;
    markdown += `- **Total savings potential:** ${(maxPrice - minPrice).toFixed(2)} CHF (${(((maxPrice - minPrice) / maxPrice) * 100).toFixed(1)}%)\n`;
  }

  markdown += '\n---\n\n';
  markdown += '_⚡ = Electric Vehicle_\n';

  return markdown;
}

function downloadJSON(results) {
  const dataStr = JSON.stringify(results, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hertz-prices-${Date.now()}.json`;
  link.click();
  console.log('%c📥 JSON file downloaded!', 'color: #00FF00; font-weight: bold;');
}

function downloadCSV(results) {
  const headers = ['Rank', 'Pickup', 'Return', 'Days', 'Total Price', 'Price/Day', 'Currency', 'Car Name', 'Car Group', 'SIPP', 'Type', 'Passengers', 'Luggage', 'Transmission', 'Fuel', 'Prepaid', 'Rate Code', 'EV', 'Status'];
  
  let csv = headers.join(',') + '\n';
  
  results.forEach((result, index) => {
    if (result.totalPrice !== null) {
      const row = [
        index + 1,
        result.pickup,
        result.return,
        result.days,
        result.totalPrice.toFixed(2),
        result.pricePerDay.toFixed(2),
        result.currency,
        `"${result.carName}"`,
        result.carGroup,
        result.sipp,
        `"${result.carType}"`,
        `"${result.passengers}"`,
        `"${result.luggage}"`,
        `"${result.transmission}"`,
        `"${result.fuelConsumption}"`,
        result.prepaid,
        result.rateCode,
        result.ev ? 'Yes' : 'No',
        result.status || 'N/A'
      ];
      csv += row.join(',') + '\n';
    }
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hertz-prices-${Date.now()}.csv`;
  link.click();
  console.log('%c📥 CSV file downloaded!', 'color: #00FF00; font-weight: bold;');
}

// ========================================
// RUN THE SCRIPT
// ========================================

(async function() {
  console.clear();
  
  try {
    const results = await searchBestPrices(
      '09/02/2026',
      '19/02/2026',
      '03/03/2026',
      '18/03/2026'
    );

    const markdown = generateMarkdownTable(results);
    console.log(markdown);

    try {
      await navigator.clipboard.writeText(markdown);
      console.log('%c📋 Markdown table copied to clipboard!', 'color: #00FF00; font-weight: bold; font-size: 14px;');
    } catch (e) {
      console.log('%c⚠️  Could not copy to clipboard automatically', 'color: #FF9900;');
    }

    window.carRentalResults = results;
    
    console.log('\n%c💾 Results saved to: window.carRentalResults', 'color: #00AAFF; font-weight: bold;');
    console.log('\n%c📥 To export results, run:', 'color: #FFD700; font-weight: bold;');
    console.log('%c   downloadJSON(window.carRentalResults)', 'color: #AAAAAA;');
    console.log('%c   downloadCSV(window.carRentalResults)', 'color: #AAAAAA;');

  } catch (error) {
    console.error('%c❌ Fatal error in main execution:', 'color: #FF0000; font-weight: bold;', error);
  }
})();