let extractedData = null;

document.getElementById('extractBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('zillow.com')) {
    showStatus('Please open a Zillow property page first!', 'error');
    return;
  }
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractPropertyData,
  }, (results) => {
    if (results && results[0] && results[0].result) {
      extractedData = results[0].result;
      const json = JSON.stringify({ properties: [extractedData] }, null, 2);
      document.getElementById('output').textContent = json;
      document.getElementById('output').style.display = 'block';
      showStatus(`✅ Extracted: $${extractedData.totalPrice.toLocaleString()} | ${extractedData.bedrooms}bd ${extractedData.bathrooms}ba`, 'success');
    } else {
      showStatus('Failed to extract data', 'error');
    }
  });
});

document.getElementById('saveBtn').addEventListener('click', () => {
  if (!extractedData) {
    showStatus('Extract data first!', 'error');
    return;
  }
  
  const json = JSON.stringify({ properties: [extractedData] }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fetched.json';
  a.click();
  URL.revokeObjectURL(url);
  showStatus('✅ File downloaded!', 'success');
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
  setTimeout(() => {
    status.style.display = 'none';
  }, 5000);
}

function extractPropertyData() {
  const extractNumber = (text) => {
    if (!text) return 0;
    const match = text.match(/[\d,]+/);
    return match ? parseInt(match[0].replace(/,/g, '')) : 0;
  };
  
  const cleanText = (text) => text?.trim().replace(/\s+/g, ' ') || '';
  
  let address = '';
  let totalPrice = 0;
  let bedrooms = 0;
  let bathrooms = 0;
  let sqft = 0;
  let monthlyRent = 0;
  let estimatedMonthlyPayment = 0;
  let propertyType = '';
  let yearBuilt = 0;
  let lotSize = '';
  let parking = '';
  let cooling = '';
  let heating = '';
  let amenities = [];
  
  const addressEl = document.querySelector('h1');
  if (addressEl) {
    address = cleanText(addressEl.textContent);
  }
  
  const allText = document.body.innerText;
  
  const priceMatch = allText.match(/\$(\d{3,}(?:,\d{3})*)/);
  if (priceMatch) totalPrice = extractNumber(priceMatch[0]);
  
  const bedMatch = allText.match(/(\d+)\s*bd/i);
  if (bedMatch) bedrooms = parseInt(bedMatch[1]);
  
  const bathMatch = allText.match(/(\d+)\s*ba/i);
  if (bathMatch) bathrooms = parseInt(bathMatch[1]);
  
  const sqftMatch = allText.match(/([\d,]+)\s*sqft/i);
  if (sqftMatch) sqft = extractNumber(sqftMatch[1]);
  
  const rentMatch = allText.match(/Rent\s*Zestimate.*?\$(\d{1,3}(?:,\d{3})*)/is);
  if (rentMatch) monthlyRent = extractNumber(rentMatch[1]);
  
  const paymentMatch = allText.match(/Est\.\s*payment.*?\$(\d{1,3}(?:,\d{3})*)/is) || 
                       allText.match(/monthly\s*payment.*?\$(\d{1,3}(?:,\d{3})*)/is);
  if (paymentMatch) estimatedMonthlyPayment = extractNumber(paymentMatch[1]);
  
  const typeMatch = allText.match(/Type:\s*([^\n]+)/i) || 
                    allText.match(/(Single Family|Condo|Townhouse|Multi-Family|Apartment)/i);
  if (typeMatch) propertyType = cleanText(typeMatch[1]);
  
  const yearMatch = allText.match(/Built\s*in\s*(\d{4})/i) || 
                    allText.match(/Year\s*built:\s*(\d{4})/i);
  if (yearMatch) yearBuilt = parseInt(yearMatch[1]);
  
  const lotMatch = allText.match(/Lot:\s*([^\n]+)/i) || 
                   allText.match(/([\d,\.]+)\s*acres?/i);
  if (lotMatch) lotSize = cleanText(lotMatch[1]);
  
  const parkingMatch = allText.match(/Parking:\s*([^\n]+)/i) || 
                       allText.match(/(\d+)\s*garage/i);
  if (parkingMatch) parking = cleanText(parkingMatch[1]);
  
  const coolingMatch = allText.match(/Cooling:\s*([^\n]+)/i);
  if (coolingMatch) cooling = cleanText(coolingMatch[1]);
  
  const heatingMatch = allText.match(/Heating:\s*([^\n]+)/i);
  if (heatingMatch) heating = cleanText(heatingMatch[1]);
  
  const commonAmenities = [
    'Pool', 'Gym', 'Fitness Center', 'Spa', 'Hot Tub', 'Tennis Court', 
    'Basketball Court', 'Clubhouse', 'Pet Friendly', 'Washer/Dryer', 
    'Dishwasher', 'Fireplace', 'Balcony', 'Patio', 'Deck', 'Hardwood Floors', 
    'Stainless Steel Appliances', 'Granite Countertops', 'Walk-in Closet', 
    'Central Air', 'Garage', 'Parking', 'Gated Community', 'Security', 
    'Concierge', 'Doorman', 'Elevator'
  ];
  
  commonAmenities.forEach(amenity => {
    if (allText.toLowerCase().includes(amenity.toLowerCase())) {
      amenities.push(amenity);
    }
  });
  
  return {
    id: 'property_01',
    link: window.location.href,
    address: address,
    totalPrice: totalPrice,
    monthlyRent: monthlyRent,
    estimatedMonthlyPayment: estimatedMonthlyPayment,
    bedrooms: bedrooms,
    bathrooms: bathrooms,
    sqft: sqft,
    propertyType: propertyType,
    yearBuilt: yearBuilt,
    lotSize: lotSize,
    parking: parking,
    cooling: cooling,
    heating: heating,
    amenities: amenities
  };
}
