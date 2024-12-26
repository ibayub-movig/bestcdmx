/**
 * @license
 * Copyright 2024 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// [START maps_place_nearby_search]
import config from './config.js';

let map;
let markers = [];

// Define performSearch first, before it's used
async function performSearch() {
  const { Place, SearchNearbyRankPreference } = await google.maps.importLibrary("places");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  
  // Clear existing markers
  markers.forEach(marker => marker.map = null);
  markers = [];

  // Mexico City center
  let center = new google.maps.LatLng(19.4326, -99.1332);
  
  const request = {
    fields: [
      "displayName",
      "location",
      "businessStatus",
      "rating",
      "priceLevel",
      "formattedAddress",
      "types",
      "userRatingCount",
      "primaryTypeDisplayName",
      "id"
    ],
    locationRestriction: {
      center: center,
      radius: 5000,
    },
    includedPrimaryTypes: ["restaurant"],
    maxResultCount: 5,
    rankPreference: SearchNearbyRankPreference.RATING,
    language: "es-MX",
    region: "mx",
  };

  try {
    const { places } = await Place.searchNearby(request);
    
    // Fetch additional details for each place
    const enrichedPlaces = await Promise.all(
      places.map(async (place) => {
        try {
          const details = await Place.fetchFields(place, [
            "displayName",
            "formattedAddress",
            "shortFormattedAddress",
            "location",
            "rating",
            "userRatingCount",
            "priceLevel",
            "types",
            "businessStatus",
            "nationalPhoneNumber",
            "internationalPhoneNumber",
            "websiteUri",
            "googleMapsUri",
            "regularOpeningHours",
            "currentOpeningHours",
            "editorialSummary",
            "takeout",
            "delivery",
            "dineIn",
            "curbsidePickup",
            "reservable",
            "servesBreakfast",
            "servesLunch",
            "servesDinner",
            "servesBeer",
            "servesWine",
            "servesBrunch",
            "servesVegetarianFood",
            "outdoorSeating",
            "menuForChildren",
            "addressComponents"
          ]);

          console.log('Place details:', details);
          return details;
        } catch (error) {
          console.error(`Error fetching details for ${place.displayName}:`, error);
          return place;
        }
      })
    );

    displayResults(enrichedPlaces, AdvancedMarkerElement);
    
    if (enrichedPlaces.length > 0) {
      addExportButton(enrichedPlaces);
    }
  } catch (error) {
    console.error("Error searching places:", error);
  }
}

function displayResults(places, AdvancedMarkerElement) {
  const tbody = document.querySelector('#resultsTable tbody');
  tbody.innerHTML = '';
  const bounds = new google.maps.LatLngBounds();

  places.forEach((place) => {
    const marker = new AdvancedMarkerElement({
      map,
      position: place.location,
      title: place.displayName,
    });
    markers.push(marker);
    bounds.extend(place.location);

    // Add table row with available fields
    const row = tbody.insertRow();
    
    console.log('Place data:', place);
    
    row.innerHTML = `
      <td>
        <strong>${place.displayName}</strong><br>
        ${place.businessStatus ? `<span class="status ${place.businessStatus.toLowerCase()}">${place.businessStatus}</span><br>` : ''}
        ${place.primaryTypeDisplayName || ''}<br>
        ${place.rating ? `⭐ ${place.rating.toFixed(1)} (${place.userRatingCount} reviews)<br>` : ''}
        ${place.priceLevel ? `${'$'.repeat(place.priceLevel)}<br>` : ''}
        ${place.formattedAddress || ''}<br>
      </td>
    `;

    // Highlight marker when hovering over row
    row.addEventListener('mouseenter', () => {
      marker.content.style.background = '#ff0000';
    });
    row.addEventListener('mouseleave', () => {
      marker.content.style.background = '#ffffff';
    });
  });

  if (places.length > 0) {
    map.fitBounds(bounds);
  } else {
    tbody.innerHTML = '<tr><td>No restaurants found</td></tr>';
  }
}

function parseAddressComponents(components) {
  if (!components) return {};
  
  const result = {
    street: '',
    neighborhood: '',
    city: '',
    postalCode: '',
    state: 'Mexico City',
    countryCode: 'MX'
  };

  components.forEach(component => {
    if (component.types.includes('route')) {
      result.street = component.longText;
    } else if (component.types.includes('sublocality')) {
      result.neighborhood = component.longText;
    } else if (component.types.includes('locality')) {
      result.city = component.longText;
    } else if (component.types.includes('postal_code')) {
      result.postalCode = component.longText;
    }
  });

  return result;
}

function exportToCSV(places) {
  const formattedData = places.map(place => {
    const addressInfo = parseAddressComponents(place.addressComponents);
    
    return {
      isAdvertisement: false,
      title: place.displayName.text,
      description: place.editorialSummary?.text || place.types?.join(', ') || "",
      price: "$".repeat(place.priceLevel || 0),
      categoryName: place.primaryTypeDisplayName?.text || "",
      address: place.formattedAddress,
      neighborhood: addressInfo.neighborhood,
      street: addressInfo.street,
      city: addressInfo.city,
      postalCode: addressInfo.postalCode,
      state: addressInfo.state,
      countryCode: addressInfo.countryCode,
      website: place.websiteUri || "",
      phone: place.nationalPhoneNumber || "",
      phoneUnformatted: (place.nationalPhoneNumber || "").replace(/\D/g, ''),
      claimThisBusiness: false,
      location: {
        lat: place.location.lat,
        lng: place.location.lng
      },
      totalScore: place.rating,
      permanentlyClosed: place.businessStatus === "CLOSED_PERMANENTLY",
      temporarilyClosed: place.businessStatus === "CLOSED_TEMPORARILY",
      placeId: place.id,
      categories: [place.primaryTypeDisplayName?.text || ""],
      reviewsCount: place.userRatingCount,
      features: {
        takeout: place.takeout || false,
        delivery: place.delivery || false,
        dineIn: place.dineIn || false,
        curbsidePickup: place.curbsidePickup || false,
        reservable: place.reservable || false,
        servesBreakfast: place.servesBreakfast || false,
        servesLunch: place.servesLunch || false,
        servesDinner: place.servesDinner || false,
        servesBeer: place.servesBeer || false,
        servesWine: place.servesWine || false,
        servesBrunch: place.servesBrunch || false,
        servesVegetarianFood: place.servesVegetarianFood || false,
        outdoorSeating: place.outdoorSeating || false,
        menuForChildren: place.menuForChildren || false
      },
      openingHours: formatOpeningHours(place.regularOpeningHours)
    };
  });

  // Convert to CSV
  const headers = Object.keys(formattedData[0]);
  const csvRows = [
    headers.join(','),
    ...formattedData.map(row => {
      return headers.map(header => {
        const value = header.split('.').reduce((obj, key) => obj?.[key], row);
        const cellValue = typeof value === 'object' ? JSON.stringify(value) : value;
        return `"${cellValue?.toString().replace(/"/g, '""') || ''}"`;
      }).join(',');
    })
  ];

  // Create and download CSV file
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'mexico_city_restaurants.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatOpeningHours(openingHours) {
  if (!openingHours?.periods) return [];
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days.map(day => {
    const period = openingHours.periods.find(p => days[p.open?.day] === day);
    if (!period) return { day, hours: 'Closed' };
    return {
      day,
      hours: `${period.open?.time || ''} to ${period.close?.time || ''}`
    };
  });
}

async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");
  // Mexico City coordinates
  let center = new google.maps.LatLng(19.4326, -99.1332);

  map = new Map(document.getElementById("map"), {
    center: center,
    zoom: 12,
    mapId: "DEMO_MAP_ID",
  });
  
  // Initial search
  performSearch();
}

// Make performSearch available globally BEFORE initializing
window.performSearch = performSearch;

// Add script loading function
function loadGoogleMapsScript() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${config.GOOGLE_MAPS_API_KEY}&libraries=places&v=weekly`;
        script.defer = true;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Initialize after script loads
async function initialize() {
    await loadGoogleMapsScript();
    initMap();
}

function addExportButton(places) {
  // Remove existing button if it exists
  const existingButton = document.getElementById('exportButton');
  if (existingButton) {
    existingButton.remove();
  }

  // Create export button
  const exportButton = document.createElement('button');
  exportButton.id = 'exportButton';
  exportButton.innerText = 'Export to CSV';
  exportButton.onclick = () => exportToCSV(places);
  
  // Add button to search controls
  document.querySelector('.search-controls').appendChild(exportButton);
}

// Start initialization
initialize().catch(console.error);
// [END maps_place_nearby_search]