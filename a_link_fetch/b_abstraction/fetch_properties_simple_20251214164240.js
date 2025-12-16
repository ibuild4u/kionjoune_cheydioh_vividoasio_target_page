/**
 * Property Data Fetcher (Lightweight version)
 * Uses simple HTTP fetch instead of Puppeteer
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// File paths
const INPUT_FILE = path.join(__dirname, '../a_variable/url.json');
const OUTPUT_FILE = path.join(__dirname, '../c_output/fetched.json');

/**
 * Fetch HTML from URL
 * @param {string} url - URL to fetch
 * @returns {Promise<string>} HTML content
 */
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Extract property details from HTML
 * @param {string} html - HTML content
 * @param {string} url - Property URL
 * @param {string} id - Property ID
 * @returns {Object} Property data
 */
function parsePropertyData(html, url, id) {
  // Extract address from URL as fallback
  const urlParts = url.split('/');
  const addressPart = urlParts[4] || '';
  const parts = addressPart.split('-');
  const street = parts.slice(0, -3).join(' ').replace(/-/g, ' ');
  const city = parts[parts.length - 3] || '';
  const state = parts[parts.length - 2] || '';
  const zip = parts[parts.length - 1] || '';
  const fallbackAddress = `${street}, ${city}, ${state} ${zip}`;
  
  // Simple regex extraction (basic scraping)
  const extractNumber = (pattern) => {
    const match = html.match(pattern);
    return match ? parseInt(match[1].replace(/,/g, '')) : 0;
  };
  
  const extractText = (pattern) => {
    const match = html.match(pattern);
    return match ? match[1].trim() : '';
  };
  
  // Try to extract data
  const address = extractText(/"address":"([^"]+)"/) || fallbackAddress;
  const totalPrice = extractNumber(/"\$?([\d,]+)"/) || extractNumber(/"price":([\d,]+)/);
  const bedrooms = extractNumber(/"bedrooms?":(\d+)/) || extractNumber(/(\d+)\s*bd/i);
  const bathrooms = extractNumber(/"bathrooms?":(\d+)/) || extractNumber(/(\d+)\s*ba/i);
  const sqft = extractNumber(/"livingArea":(\d+)/) || extractNumber(/([\d,]+)\s*sqft/i);
  
  return {
    id,
    link: url,
    address,
    totalPrice,
    monthlyRent: 0, // Harder to extract without full browser
    estimatedMonthlyPayment: 0,
    bedrooms,
    bathrooms,
    sqft
  };
}

/**
 * Scrape property data from URL
 * @param {string} url - Zillow URL
 * @param {string} id - Property ID
 * @returns {Promise<Object>} Property data
 */
async function scrapePropertyData(url, id) {
  try {
    console.log(`  Fetching ${url}...`);
    const html = await fetchHTML(url);
    const data = parsePropertyData(html, url, id);
    console.log(`  ✓ Extracted:`, data);
    return data;
  } catch (error) {
    console.error(`  ✗ Error:`, error.message);
    
    // Return URL-based fallback
    const urlParts = url.split('/');
    const addressPart = urlParts[4] || '';
    const parts = addressPart.split('-');
    const street = parts.slice(0, -3).join(' ').replace(/-/g, ' ');
    const city = parts[parts.length - 3] || '';
    const state = parts[parts.length - 2] || '';
    const zip = parts[parts.length - 1] || '';
    
    return {
      id,
      link: url,
      address: `${street}, ${city}, ${state} ${zip}`,
      totalPrice: 0,
      monthlyRent: 0,
      estimatedMonthlyPayment: 0,
      bedrooms: 0,
      bathrooms: 0,
      sqft: 0,
      error: error.message
    };
  }
}

/**
 * Main function
 */
async function fetchProperties() {
  try {
    console.log('Reading input file...');
    
    const inputData = await fs.readFile(INPUT_FILE, 'utf8');
    const urlData = JSON.parse(inputData);
    
    if (!urlData.properties || !Array.isArray(urlData.properties)) {
      throw new Error('Invalid input format: expected {properties: [...]}');
    }
    
    console.log(`Found ${urlData.properties.length} properties to process\n`);
    
    const properties = [];
    
    for (const prop of urlData.properties) {
      if (!prop.link) {
        console.warn(`Skipping ${prop.id}: no link`);
        continue;
      }
      
      console.log(`Processing ${prop.id}...`);
      const data = await scrapePropertyData(prop.link, prop.id);
      properties.push(data);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const output = { properties };
    
    const outputDir = path.dirname(OUTPUT_FILE);
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
    
    console.log(`\n✓ Generated ${OUTPUT_FILE}`);
    console.log(`✓ Processed ${properties.length} properties`);
    
    return output;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

if (require.main === module) {
  fetchProperties()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal:', error);
      process.exit(1);
    });
}

module.exports = { fetchProperties, scrapePropertyData };
