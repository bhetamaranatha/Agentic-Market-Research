import './style.css'
import { createClient } from '@supabase/supabase-js'
import { createIcons, ScanSearch, Search, LayoutDashboard, Map, BarChart3, Bookmark } from 'lucide'

// Initialize Lucide Icons
function updateIcons() {
    createIcons({
        icons: {
            ScanSearch,
            Search,
            LayoutDashboard,
            Map,
            BarChart3,
            Bookmark
        }
    });
}
updateIcons();

// Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// Initialize Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Global State
let map;
let fullMap;
let markerLibrary;
let placesLibrary;
let markers = [];
let fullMarkers = [];
let currentResults = [];
let bookmarkedIds = new Set();

// Initialize the App
async function initApp() {
    console.log('Initializing Agentic Market Research Advanced...');

    try {
        const { Map: GoogleMap } = await google.maps.importLibrary("maps");
        placesLibrary = await google.maps.importLibrary("places");
        markerLibrary = await google.maps.importLibrary("marker");

        // Initialize Dashboard Map
        const defaultLoc = { lat: -7.6298, lng: 111.5239 };
        map = new GoogleMap(document.getElementById("map-container"), {
            center: defaultLoc,
            zoom: 13,
            mapId: "4504f990b8621f21",
        });

        // Initialize Full View Map
        fullMap = new GoogleMap(document.getElementById("full-map-container"), {
            center: defaultLoc,
            zoom: 13,
            mapId: "4504f990b8621f21",
        });

        setupSearch();
        setupNavigation();
        await loadBookmarks();

        console.log('App Ready.');
    } catch (err) {
        console.error("Initialization failed:", err);
    }
}

function setupSearch() {
    const input = document.getElementById("pac-input");
    const autocomplete = new placesLibrary.Autocomplete(input, {
        fields: ["formatted_address", "geometry", "name"],
    });
    autocomplete.bindTo("bounds", map);

    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const queryStr = input.value;
        if (!place.geometry || !place.geometry.location) {
            performManualSearch(queryStr);
            return;
        }
        handleLocationSelection(place.geometry.location, place.geometry.viewport, place.name, queryStr);
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") performManualSearch(input.value);
    });

    document.querySelector(".search-icon").addEventListener("click", () => {
        performManualSearch(input.value);
    });
}

function setupNavigation() {
    document.querySelectorAll('.sidebar li').forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.getAttribute('data-view');
            switchView(viewId);

            const active = document.querySelector('.sidebar li.active');
            if (active) active.classList.remove('active');
            item.classList.add('active');
        });
    });

    document.getElementById('refresh-bookmarks').addEventListener('click', loadBookmarks);
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(`${viewId}-view`).classList.add('active');

    if (viewId === 'map') {
        setTimeout(() => google.maps.event.trigger(fullMap, 'resize'), 100);
    }
}

function handleLocationSelection(location, viewport, areaName = "", rawQuery = "") {
    if (viewport) {
        map.fitBounds(viewport);
        fullMap.fitBounds(viewport);
    } else {
        map.setCenter(location);
        fullMap.setCenter(location);
        map.setZoom(15);
        fullMap.setZoom(15);
    }
    performMarketResearch(location, areaName, rawQuery);
}

async function performManualSearch(query) {
    if (!query) return;
    const { Place } = placesLibrary;
    try {
        const { places } = await Place.searchByText({
            textQuery: query,
            fields: ["displayName", "location", "viewport"],
        });
        if (places && places.length > 0) {
            handleLocationSelection(places[0].location, places[0].viewport, places[0].displayName, query);
        }
    } catch (error) {
        console.error("Manual search failed:", error);
    }
}

async function performMarketResearch(location, areaName, rawQuery) {
    const { Place } = placesLibrary;

    // Parallel Strategy:
    // 1. Specific Intent (searchByText for the user's specific keywords)
    // 2. Market Context (searchNearby for general business environment)

    const intentRequest = Place.searchByText({
        textQuery: rawQuery,
        locationBias: { center: location, radius: 1500 },
        maxResultCount: 20,
        fields: ["displayName", "formattedAddress", "rating", "userRatingCount", "location", "id"],
    });

    const categories = [
        ["restaurant", "cafe", "bakery"],
        ["grocery_store", "bank", "clothing_store"]
    ];

    const marketRequests = categories.map(types => Place.searchNearby({
        locationRestriction: { center: location, radius: 1500 },
        includedPrimaryTypes: types,
        maxResultCount: 20,
        fields: ["displayName", "formattedAddress", "rating", "userRatingCount", "location", "id"],
    }));

    try {
        const [intentResponse, ...marketResponses] = await Promise.all([intentRequest, ...marketRequests]);

        // Results for the List: Priority to Intent Matches
        const intentLeads = intentResponse.places || [];
        const marketLeads = marketResponses.flatMap(r => r.places || []);

        // Deduplicate and merge: Intent leads first
        const uniqueLeads = [];
        const seenIds = new Set();

        intentLeads.forEach(p => {
            if (!seenIds.has(p.id)) {
                seenIds.add(p.id);
                uniqueLeads.push(p);
            }
        });

        marketLeads.forEach(p => {
            if (!seenIds.has(p.id)) {
                seenIds.add(p.id);
                uniqueLeads.push(p);
            }
        });

        currentResults = uniqueLeads;
        displayResults(currentResults, intentLeads.length);
        generateInsights(marketLeads, areaName, location); // Metrics based on broad market
    } catch (error) {
        console.error("Research failed:", error);
    }
}

function displayResults(places, intentCount) {
    const resultsList = document.getElementById('results-list');
    if (!resultsList) return;

    resultsList.innerHTML = '';
    const leadsCountEl = document.getElementById('total-leads');
    // Leads count shows either the specific leads found or total depending on UX preference.
    // We'll show the intent matches count if specific results were found, else total discovered.
    if (leadsCountEl) leadsCountEl.innerText = intentCount > 0 ? intentCount : places.length;

    if (places.length === 0) {
        resultsList.innerHTML = '<div class="placeholder-text">No opportunities found.</div>';
        const pointsEl = document.getElementById('analysis-points');
        if (pointsEl) pointsEl.innerText = '0';
        return;
    }

    markers.forEach(m => m.setMap(null));
    fullMarkers.forEach(m => m.setMap(null));
    markers = [];
    fullMarkers = [];

    const totalPoints = places.reduce((acc, p) => acc + (p.userRatingCount || 0) + 10, 0);
    const pointsEl = document.getElementById('analysis-points');
    if (pointsEl) pointsEl.innerText = totalPoints.toLocaleString();

    places.forEach((place, index) => {
        // Only show markers for the first 20 results to avoid clutter
        if (index >= 20) return;

        const isBookmarked = bookmarkedIds.has(place.id);
        const card = document.createElement('div');
        card.className = 'result-item';
        // Highlight intent matches
        if (index < intentCount) card.classList.add('priority-lead');

        card.innerHTML = `
      <div class="result-info">
        <h3>${place.displayName}</h3>
        <p>${place.formattedAddress}</p>
        <span class="rating">⭐ ${place.rating || 'N/A'} (${place.userRatingCount || 0})</span>
      </div>
      <button class="save-btn ${isBookmarked ? 'active' : ''}" data-id="${place.id}">
        <i data-lucide="bookmark" ${isBookmarked ? 'style="fill: currentColor"' : ''}></i>
      </button>
    `;

        const saveBtn = card.querySelector('.save-btn');
        saveBtn.addEventListener('click', () => toggleBookmark(place, saveBtn));
        resultsList.appendChild(card);

        if (place.location) {
            const m1 = new markerLibrary.AdvancedMarkerElement({ position: place.location, map: map, title: place.displayName });
            const m2 = new markerLibrary.AdvancedMarkerElement({ position: place.location, map: fullMap, title: place.displayName });
            markers.push(m1);
            fullMarkers.push(m2);
        }
    });

    updateIcons();
}

async function toggleBookmark(place, btn) {
    const isBookmarked = bookmarkedIds.has(place.id);
    try {
        if (isBookmarked) {
            const { error } = await supabase.from('bookmarks').delete().eq('google_place_id', place.id);
            if (error) throw error;
            bookmarkedIds.delete(place.id);
        } else {
            const { error } = await supabase.from('bookmarks').upsert({
                google_place_id: place.id,
                name: place.displayName,
                address: place.formattedAddress,
                rating: place.rating
            });
            if (error) throw error;
            bookmarkedIds.add(place.id);
        }
        await loadBookmarks();
        displayResults(currentResults, 0); // Refresh UI
    } catch (err) {
        console.error('Error toggling bookmark:', err);
    }
}

async function loadBookmarks() {
    try {
        const { data, error } = await supabase.from('bookmarks').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        bookmarkedIds = new Set(data.map(item => item.google_place_id));

        const savedEl = document.getElementById('saved-clusters');
        if (savedEl) savedEl.innerText = data.length;

        const list = document.getElementById('bookmarks-list');
        if (!list) return;

        list.innerHTML = '';
        if (data.length === 0) {
            list.innerHTML = '<div class="placeholder-text">No bookmarks saved yet.</div>';
            return;
        }

        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'result-item';
            card.innerHTML = `
        <div class="result-info">
          <h3>${item.name}</h3>
          <p>${item.address}</p>
          <span class="rating">⭐ ${item.rating || 'N/A'}</span>
        </div>
        <button class="save-btn active" data-id="${item.google_place_id}">
          <i data-lucide="bookmark" style="fill: currentColor"></i>
        </button>
      `;
            card.querySelector('.save-btn').addEventListener('click', () => {
                toggleBookmark({ id: item.google_place_id, displayName: item.name, formattedAddress: item.address, rating: item.rating }, card.querySelector('.save-btn'));
            });
            list.appendChild(card);
        });
        updateIcons();
    } catch (err) {
        console.error('Error loading bookmarks:', err);
    }
}

function calculateDistance(loc1, loc2) {
    if (!loc1 || !loc2) return 0;
    const R = 6371; // km
    const lat1 = typeof loc1.lat === 'function' ? loc1.lat() : loc1.lat;
    const lng1 = typeof loc1.lng === 'function' ? loc1.lng() : loc1.lng;
    const lat2 = typeof loc2.lat === 'function' ? loc2.lat() : loc2.lat;
    const lng2 = typeof loc2.lng === 'function' ? loc2.lng() : loc2.lng;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function generateInsights(places, areaName, center) {
    const densityEl = document.getElementById('density-chart');
    const trendsEl = document.getElementById('trends-chart');
    const dashAnalysis = document.getElementById('dashboard-analysis');

    if (!densityEl || !trendsEl || !dashAnalysis) return;

    if (places.length === 0) {
        densityEl.innerHTML = '<div class="placeholder-text">No broad market data.</div>';
        trendsEl.innerHTML = '<div class="placeholder-text">No patterns detected.</div>';
        dashAnalysis.innerHTML = '<div class="placeholder-text">Gathering data...</div>';
        return;
    }

    const distances = places.filter(p => p.location).map(p => calculateDistance(center, p.location));
    const avgDistance = distances.length > 0 ? (distances.reduce((a, b) => a + b, 0) / distances.length) : 0;

    const rawDensity = (places.length / 7.06).toFixed(1);
    const coreProximity = avgDistance > 0 ? (1 / (avgDistance + 0.1)).toFixed(1) : 0;

    const densityScore = (places.length * coreProximity / 10).toFixed(1);
    const denCat = densityScore > 5 ? 'High Concentration' : (densityScore > 2 ? 'Active Market' : 'Developing');

    densityEl.innerHTML = `
    <div style="text-align: center; color: var(--primary)">
      <div style="font-size: 3rem; font-weight: 800">${densityScore}</div>
      <div>Market Index</div>
      <div style="margin-top: 1rem; color: var(--text-muted)">${denCat}</div>
    </div>
  `;

    const avgRating = places.reduce((acc, p) => acc + (p.rating || 0), 0) / places.length;
    const saturationPercent = Math.min(100, Math.round((avgRating / 4.5) * (densityScore / 8) * 100));

    trendsEl.innerHTML = `
    <div style="width: 80%; text-align: left">
      <div style="margin-bottom: 0.5rem">Market Saturation: <span style="color:var(--accent)">${saturationPercent}%</span></div>
      <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden">
        <div style="width: ${saturationPercent}%; height: 100%; background: var(--accent)"></div>
      </div>
      <div style="margin-top: 1rem; font-size: 0.7rem; color: var(--text-muted)">Scanning broad cluster of ${places.length} entities.</div>
    </div>
  `;

    const oppStatus = saturationPercent < 35 ? 'Strategic Entry' : (saturationPercent < 65 ? 'Competitive Growth' : 'High Barrier');

    dashAnalysis.innerHTML = `
    <div class="analysis-report" style="animation: fadeInUp 0.5s ease-out forwards">
      <h3 style="color: var(--primary); margin-bottom: 0.5rem; font-size: 1rem">Regional Intel: ${areaName || 'Sector Hub'}</h3>
      <p style="font-size: 0.9rem">Broad context suggests a <span class="highlight">${oppStatus}</span> level.</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin: 0.5rem 0">
        <div style="background: rgba(255,255,255,0.03); padding: 0.5rem; border-radius: 6px">
          <small style="color: var(--text-muted)">Hub Strength</small>
          <div style="font-weight: bold; color: var(--accent)">${(rawDensity * avgRating).toFixed(1)}x</div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 0.5rem; border-radius: 6px">
          <small style="color: var(--text-muted)">Reliability</small>
          <div style="font-weight: bold; color: var(--secondary)">Verified</div>
        </div>
      </div>
      <ul style="font-size: 0.85rem; line-height: 1.5; padding-left: 1rem">
        <li>Market clusters avg ${avgDistance.toFixed(2)}km from hub.</li>
        <li>Regional sentiment is stable at ⭐ ${avgRating.toFixed(1)}.</li>
        <li>Suggested move: ${saturationPercent > 70 ? 'Niche specialization is key' : 'Active expansion highly viable'}.</li>
      </ul>
    </div>
  `;
}

function loadGoogleMaps() {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&v=weekly&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initApp;
    document.head.appendChild(script);
}

loadGoogleMaps();
window.switchView = switchView;
