// the map is the main page and most feature heavy
import GlobalStorage from '../storage.js';
import {
  convertOverpassToGeoJson,
  buildRatingStars,
  buildPopularTimesHtml,
  buildReviewsHtml,
  calculatePolygonCentroid,
  createPersonIcon,
  createEventIcon,
  createPersonPopupHtml,
  createEventPopupHtml,
  stripEmojiFromTitle,
  formatEventTimeRange,
  resolveBuildingNameForLocation,
  getEventOffsetForIndex,
  searchMapEntities,
  buildMapSearchResultsHtml,
} from '../utils/maputils.js';
import { createMap3dController } from '../utils/3dbuilding.js';
import EventModal from '../components/eventmodal.js';
import EventManager from '../eventManager.js';
import Tooltip from '../components/tooltip.js';

// fixed prototype date (same as calendar/messages data helpers)
const FIXED_PROTOTYPE_DATE = new Date('2025-10-06T00:00:00');

const MapPage = {
  // leaflet map instance
  map: null,
  // layer for clickablle building polygons
  buildingsLayer: null,
  // layer for people markers
  peopleMarkersLayer: null,
  // layer for event markers
  eventsMarkersLayer: null,
  // map of person names to their markers for search
  peopleMarkersByName: null,
  // current building and location context for sidebars
  currentBuildingName: null,
  currentBuildingInfo: null,
  currentLocationInfo: null,
  // three.js 3d building controller
  map3dController: null,

  // set center to roughly the administration building
  defaultCenter: { lat: 49.809565, lng: -97.1327 },
  // zoom level to show campus area
  defaultZoom: 18,
  // bounding box to keep users roughly in the area of interest (admin building)
  bounds: {
    southWest: { lat: 49.808, lng: -97.137 },
    northEast: { lat: 49.8115, lng: -97.129 },
  },

  // initialize the map page
  init() {
    const container = document.getElementById('app-container');
    if (!container) {
      return;
    }

    // sanity check: clean up any existing 3d controller before re-rendering the page
    if (
      this.map3dController &&
      typeof this.map3dController.destroy === 'function'
    ) {
      this.map3dController.destroy();
      this.map3dController = null;
    }

    // initialize people markers map
    this.peopleMarkersByName = new Map();

    container.innerHTML = this.getPageHtml();

    // set up leaflet map, two sidebars, and 3d building
    // our three main views: map, building (with 3d building), and location (with 3d building)
    this.initLeafletMap();
    this.setupSidebarControls();
    this.setup3dController();
    this.setupSearch();

    // building directory search/filter feature
    const buildingSearchInput = document.getElementById('map-sidebar-search');
    if (buildingSearchInput) {
      buildingSearchInput.addEventListener('input', () => {
        this.renderBuildingDirectory();
      });
    }

    // wire up create event buttons
    this.setupCreateEventButtons();

    // initialize tooltips
    Tooltip.init(container);
  },

  // return the html for the map page
  getPageHtml() {
    return `
      <div class="map-page">
        <div class="map-header">
          <div class="map-header-left">
            <div class="map-search">
              <div class="map-search-wrapper">
                <input
                  type="text"
                  id="map-search-input"
                  class="map-search-input"
                  placeholder="Search locations or friends"
                  autocomplete="off"
                />
                <div id="map-search-dropdown" class="map-search-dropdown">
                  <div class="map-search-dropdown-list"></div>
                </div>
              </div>
            </div>
            <button id="map-create-button" class="map-create-button">
              Create Event
            </button>
            <div class="map-header-divider"></div>
            <div class="map-category-buttons" role="group">
              <button
                class="map-category-button"
                data-category="libraries"
                data-tooltip="Not implemented"
                data-tooltip-direction="below"
              >
                Libraries
              </button>
              <button
                class="map-category-button"
                data-category="restaurants"
                data-tooltip="Not implemented"
                data-tooltip-direction="below"
              >
                Restaurants
              </button>
              <button
                class="map-category-button"
                data-category="common-areas"
                data-tooltip="Not implemented"
                data-tooltip-direction="below"
              >
                Common Areas
              </button>
            </div>
            <div class="map-header-divider"></div>
            <div class="map-secondary-buttons" role="group">
              <button
                class="map-secondary-button"
                data-filter="recents"
                data-tooltip="Not implemented"
                data-tooltip-direction="below"
              >
                Recents
              </button>
              <button
                class="map-secondary-button"
                data-filter="saved"
                data-tooltip="Not implemented"
                data-tooltip-direction="below"
              >
                Saved
              </button>
            </div>
          </div>
        </div>

        <div id="map-sidebar" class="map-sidebar" style="display: none;">
          <div class="map-sidebar-content">
            <div class="map-sidebar-image">
              <button class="map-sidebar-close" id="map-sidebar-close">
                ×
              </button>
              <img
                id="map-sidebar-building-image"
                src=""
                alt=""
                class="map-sidebar-image-img"
              />
            </div>

            <div class="map-sidebar-info-section">
              <h2 class="map-sidebar-name" id="map-sidebar-name">
                Building Name
              </h2>
              <div class="map-sidebar-location" id="map-sidebar-location">
                Location
              </div>
              <div class="map-sidebar-status" id="map-sidebar-status">
                Open · Closes 9 p.m.
              </div>
            </div>

            <div class="map-sidebar-separator"></div>

            <div class="map-sidebar-buttons">
              <button class="map-sidebar-button" id="map-sidebar-button-1">
                Create Event
              </button>
              <button
                class="map-sidebar-button"
                id="map-sidebar-button-2"
                data-tooltip="Not implemented"
              >
                Get Directions
              </button>
            </div>

            <div class="map-sidebar-separator"></div>

            <div class="map-sidebar-directory-section">
              <div class="map-sidebar-directory-title">Directory</div>
              <input
                type="text"
                id="map-sidebar-search"
                class="map-sidebar-search-input"
                placeholder="search for places"
              />
              <div
                class="map-sidebar-directory-entries"
                id="building-directory-entries"
              ></div>
            </div>
          </div>
        </div>

        <div id="leaflet-map" class="leaflet-map" role="region"></div>
        <div
          id="map-3d-container"
          class="map-3d-container"
          style="display: none;"
          role="region"
        >
          <canvas id="map-3d-canvas"></canvas>
        </div>
        <div
          id="map-location-sidebar"
          class="map-sidebar"
          style="display: none;"
        >
          <div class="map-sidebar-content">
            <div class="map-sidebar-image">
              <button class="map-sidebar-back" id="map-location-back">←</button>
              <button class="map-sidebar-close" id="map-location-close">
                ×
              </button>
              <img
                id="map-location-sidebar-image"
                src=""
                alt=""
                class="map-sidebar-image-img"
              />
            </div>

            <div class="map-sidebar-info-section">
              <h2 class="map-sidebar-name" id="location-sidebar-name">
                Location Name
              </h2>
              <div
                class="map-sidebar-rating"
                id="location-sidebar-rating"
              >
                <span class="map-sidebar-rating-value">4.2</span>
                <span class="map-sidebar-rating-stars">★★★★☆</span>
                <span class="map-sidebar-rating-count">(128)</span>
              </div>
              <div
                class="map-sidebar-location"
                id="location-sidebar-meta"
              >
                floor 1 · food
              </div>
              <div
                class="map-sidebar-status"
                id="location-sidebar-status"
              >
                Open · Closes 9 p.m.
              </div>
            </div>

            <div class="map-sidebar-separator"></div>

            <div class="map-sidebar-buttons">
              <button
                class="map-sidebar-button"
                id="location-sidebar-button-1"
              >
                Create Event
              </button>
              <button
                class="map-sidebar-button"
                id="location-sidebar-button-2"
                data-tooltip="Not implemented"
              >
                Get Directions
              </button>
            </div>

            <div class="map-sidebar-separator"></div>

            <div class="map-sidebar-directory-section map-popular-times-section">
              <div class="map-sidebar-directory-title">Popular Times</div>
              <div
                id="location-popular-times"
                class="map-sidebar-popular-times"
              ></div>
            </div>

            <div class="map-sidebar-separator"></div>

            <div class="map-sidebar-directory-section">
              <div class="map-sidebar-directory-title">Reviews</div>
              <div
                id="location-reviews"
                class="map-sidebar-reviews"
              ></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // initialize leaflet map for the campus
  initLeafletMap() {
    const mapEl = document.getElementById('leaflet-map');
    if (!mapEl || typeof window.L === 'undefined') {
      return;
    }

    this.map = null;

    const campusBounds = window.L.latLngBounds(
      [this.bounds.southWest.lat, this.bounds.southWest.lng],
      [this.bounds.northEast.lat, this.bounds.northEast.lng]
    );

    this.map = window.L.map('leaflet-map', {
      maxBounds: campusBounds,
      maxBoundsViscosity: 1.0,
      minZoom: 18,
      maxZoom: 19,
    }).setView(
      [this.defaultCenter.lat, this.defaultCenter.lng],
      this.defaultZoom
    );

    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">openstreetmap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    // add the three main features of the map: clickable buildings, people markers, and event markers
    this.loadBuildings();
    this.loadPeopleMarkers();
    this.loadEventMarkers();
  },

  // set up shared 3d building controller for the map page
  setup3dController() {
    const canvasEl = document.getElementById('map-3d-canvas');
    const containerEl = document.getElementById('map-3d-container');
    if (!canvasEl || !containerEl) {
      return;
    }

    // helper for controller to compute current sidebar width
    const getSidebarWidth = () => {
      const buildingSidebar = document.getElementById('map-sidebar');
      const locationSidebar = document.getElementById('map-location-sidebar');
      const buildingVisible =
        buildingSidebar && buildingSidebar.style.display !== 'none';
      const locationVisible =
        locationSidebar && locationSidebar.style.display !== 'none';
      return buildingVisible || locationVisible ? 332 : 0;
    };

    // helper for controller to get locations for a building from static data
    const getBuildingLocations = (buildingName) => {
      if (
        !buildingName ||
        typeof BUILDING_LOCATIONS_DATA === 'undefined' ||
        !BUILDING_LOCATIONS_DATA[buildingName]
      ) {
        return [];
      }
      const buildingData = BUILDING_LOCATIONS_DATA[buildingName];
      return Array.isArray(buildingData.locations)
        ? buildingData.locations
        : [];
    };

    this.map3dController = createMap3dController({
      getSidebarWidth,
      getBuildingLocations,
      onLocationSelected: (payload) => {
        const locationName =
          payload && typeof payload.name === 'string' ? payload.name : null;
        const locationData = payload && payload.data ? payload.data : null;
        if (!locationName || !locationData) {
          return;
        }
        this.showLocationSidebar({
          name: locationName,
          locationData,
          image: locationData.image || null,
        });
      },
    });
  },

  // show 3d building view for the given building name and hide the map view
  show3dView(buildingName) {
    const mapEl = document.getElementById('leaflet-map');
    const container3d = document.getElementById('map-3d-container');
    if (!mapEl || !container3d || !this.map3dController) {
      return;
    }

    mapEl.style.display = 'none';
    container3d.style.display = 'block';

    this.map3dController.renderBuilding(buildingName);
    this.handle3dResize();
  },

  // show map view and hide 3d building view
  showMapView() {
    const mapEl = document.getElementById('leaflet-map');
    const container3d = document.getElementById('map-3d-container');
    if (!mapEl || !container3d) {
      return;
    }

    mapEl.style.display = 'block';
    container3d.style.display = 'none';
  },

  // request the 3d controller to recompute its layout for current sidebar state
  // 3d building will look funny if this isn't used
  handle3dResize() {
    if (
      this.map3dController &&
      typeof this.map3dController.handleResize === 'function'
    ) {
      this.map3dResizePending = false;
      this.map3dController.handleResize();
    }
  },

  // load building polygons from static overpass data and add to map
  loadBuildings() {
    try {
      if (!this.map || typeof OVERPASS_BUILDINGS_DATA === 'undefined') {
        return;
      }

      const data = OVERPASS_BUILDINGS_DATA;
      const geoJsonData = convertOverpassToGeoJson(data);

      // i chose these ad hoc. enough that it feels navigate-y
      const clickableBuildings = [
        'University Centre',
        'Buller Biological Building',
        'Armes Lecture Building',
        'Allen Physics Building',
        'Elizabeth Dafoe Library',
        'Fletcher Argue Building',
        'Tier Building',
        'Isbister Building',
        'Engineering and Information Technology Complex-E2',
        'Human Ecology Building',
        'Duff Roblin Building',
      ];

      const filteredFeatures = geoJsonData.features.filter((feature) => {
        const buildingName = feature.properties?.name || '';
        return clickableBuildings.includes(buildingName);
      });

      const filteredGeoJsonData = {
        type: 'FeatureCollection',
        features: filteredFeatures,
      };

      // do styling here to avoid cssing stuff on the canvas
      this.buildingsLayer = window.L.geoJSON(filteredGeoJsonData, {
        style: () => ({
          fillColor: '#d0d7de',
          fillOpacity: 0.6,
          color: '#57606a',
          weight: 2,
          opacity: 0.8,
        }),
        onEachFeature: (feature, layer) => {
          layer.on({
            click: () => {
              this.handleBuildingClick(feature);
            },
            mouseover: (event) => {
              const targetLayer = event.target;
              targetLayer.setStyle({
                fillColor: '#0969da',
                fillOpacity: 0.5,
                color: '#0969da',
                weight: 2,
                opacity: 1,
              });
            },
            mouseout: (event) => {
              if (this.buildingsLayer) {
                this.buildingsLayer.resetStyle(event.target);
              }
            },
          });
        },
      }).addTo(this.map);
    } catch (error) {
      console.error('error loading buildings:', error);
    }
  },

  // handle click on a building polygon and show the building sidebar
  handleBuildingClick(feature) {
    const buildingName = feature.properties?.name || 'university building';

    const buildingData =
      typeof BUILDING_LOCATIONS_DATA !== 'undefined' &&
      BUILDING_LOCATIONS_DATA[buildingName]
        ? BUILDING_LOCATIONS_DATA[buildingName]
        : null;

    const address =
      buildingData?.address ||
      feature.properties?.['addr:full'] ||
      feature.properties?.['addr:street'] ||
      null;

    const closingTime = buildingData?.closingTime || '9 p.m.';
    const buildingImage =
      buildingData?.image ||
      (GlobalStorage.getBuildings &&
        GlobalStorage.getBuildings()?.[buildingName]?.image) ||
      null;

    // track current building info for directory and location sidebar
    this.currentBuildingInfo = {
      name: buildingName,
      address,
      closingTime,
      image: buildingImage,
    };
    this.currentBuildingName = buildingName;

    this.showBuildingSidebar(buildingName, address, closingTime, buildingImage);
    this.renderBuildingDirectory();

    // enter 3d view for this building using the shared controller
    this.show3dView(buildingName);
  },

  // render building directory entries for the current building
  renderBuildingDirectory(filterQuery) {
    const container = document.getElementById('building-directory-entries');
    if (!container) {
      return;
    }

    if (
      !this.currentBuildingName ||
      typeof BUILDING_LOCATIONS_DATA === 'undefined' ||
      !BUILDING_LOCATIONS_DATA[this.currentBuildingName]
    ) {
      container.innerHTML =
        '<div class="map-sidebar-empty">no locations available</div>';
      return;
    }

    const buildingData = BUILDING_LOCATIONS_DATA[this.currentBuildingName];
    const locations = Array.isArray(buildingData.locations)
      ? buildingData.locations
      : [];

    // read filter text from input if not provided
    const searchInput = document.getElementById('map-sidebar-search');
    const query =
      typeof filterQuery === 'string'
        ? filterQuery.trim().toLowerCase()
        : searchInput && typeof searchInput.value === 'string'
        ? searchInput.value.trim().toLowerCase()
        : '';

    const filteredLocations = locations.filter((loc) => {
      if (!query) {
        return true;
      }
      const name = (loc.name || '').toLowerCase();
      const type = (loc.type || '').toLowerCase();
      return name.includes(query) || type.includes(query);
    });

    // TODO: make this a function in maputils.js
    const entriesHtml = filteredLocations
      .map((loc) => {
        const name = loc.name || 'location';
        const ratingValue = loc.rating || 4.2;
        const ratingStars = buildRatingStars(Math.round(ratingValue * 10) / 10);
        const ratingCount = Array.isArray(loc.reviews) ? loc.reviews.length : 0;
        const closingTime =
          loc.closingTime || buildingData.closingTime || '9 p.m.';
        const status = `Open · Closes ${closingTime}`;
        const locationImage = loc.image || buildingData.image || null;

        return `
          <div class="map-sidebar-directory-entry" data-location="${name}">
            <div class="map-sidebar-entry-content">
              <div class="map-sidebar-entry-name">${name}</div>
              <div class="map-sidebar-entry-rating">
                <span class="map-sidebar-rating-value">${ratingValue.toFixed(
                  1
                )}</span>
                <span class="map-sidebar-rating-stars">${ratingStars}</span>
                <span class="map-sidebar-rating-count">(${ratingCount})</span>
              </div>
              <div class="map-sidebar-entry-status">${status}</div>
            </div>
            <div class="map-sidebar-entry-image">
              ${
                locationImage
                  ? `<img src="${locationImage}" alt="${name}" class="map-sidebar-entry-image-img" />`
                  : ''
              }
            </div>
          </div>
        `;
      })
      .join('');

    container.innerHTML =
      entriesHtml || '<div class="map-sidebar-empty">no matches found</div>';

    // for each entry, add a click handler to open the location sidebar
    container
      .querySelectorAll('.map-sidebar-directory-entry')
      .forEach((entry) => {
        entry.addEventListener('click', () => {
          const locationName = entry.getAttribute('data-location');
          if (!locationName) {
            return;
          }

          const locationData = locations.find(
            (loc) => loc && loc.name === locationName
          );
          if (!locationData) {
            return;
          }

          const image = locationData.image || buildingData.image || null;

          this.showLocationSidebar({
            name: locationName,
            locationData,
            image,
          });
        });
      });
  },

  // show the building sidebar
  showBuildingSidebar(name, address, closingTime, image) {
    const sidebar = document.getElementById('map-sidebar');
    const nameEl = document.getElementById('map-sidebar-name');
    const locationEl = document.getElementById('map-sidebar-location');
    const statusEl = document.getElementById('map-sidebar-status');
    const imageEl = document.getElementById('map-sidebar-building-image');

    if (!sidebar || !nameEl || !locationEl || !statusEl || !imageEl) {
      return;
    }

    nameEl.textContent = name || 'building';

    if (address) {
      locationEl.textContent = address;
    } else {
      locationEl.textContent = 'university building';
    }

    const buildingClosingTime = closingTime || '9 p.m.';
    statusEl.textContent = `Open · Closes ${buildingClosingTime}`;

    if (image) {
      imageEl.src = image;
      imageEl.alt = `${name || 'building'} photo`;
    } else {
      imageEl.src = '';
      imageEl.alt = '';
    }

    sidebar.style.display = 'block';
    if (typeof sidebar.scrollTop === 'number') {
      sidebar.scrollTop = 0;
    }

    // hide location sidebar if it was open
    const locationSidebar = document.getElementById('map-location-sidebar');
    if (locationSidebar) {
      locationSidebar.style.display = 'none';
    }

    // ensure 3d view is visible when building sidebar is shown
    if (this.currentBuildingName && this.map3dController) {
      const mapEl = document.getElementById('leaflet-map');
      const container3d = document.getElementById('map-3d-container');
      if (mapEl && container3d) {
        mapEl.style.display = 'none';
        container3d.style.display = 'block';
      }
    }

    // update 3d layout now that sidebar state changed
    this.handle3dResize();
  },

  // hide the building sidebar
  hideSidebar() {
    const sidebar = document.getElementById('map-sidebar');
    if (sidebar) {
      sidebar.style.display = 'none';
    }
    // clear location highlight when closing building sidebar
    if (
      this.map3dController &&
      typeof this.map3dController.clearSelectedLocationHighlight === 'function'
    ) {
      this.map3dController.clearSelectedLocationHighlight();
    }
    // when closing the building sidebar, return to the map view
    this.showMapView();
  },

  // show the location sidebar
  showLocationSidebar(pointData) {
    const locationSidebar = document.getElementById('map-location-sidebar');
    const nameEl = document.getElementById('location-sidebar-name');
    const ratingEl = document.getElementById('location-sidebar-rating');
    const metaEl = document.getElementById('location-sidebar-meta');
    const statusEl = document.getElementById('location-sidebar-status');
    const imageEl = document.getElementById('map-location-sidebar-image');

    if (
      !locationSidebar ||
      !nameEl ||
      !ratingEl ||
      !metaEl ||
      !statusEl ||
      !imageEl
    ) {
      return;
    }

    // get location data from pointData
    const locationData = pointData?.locationData || null;

    // track current location info for back button and event creation
    this.currentLocationInfo = {
      name: pointData?.name || null,
      buildingName:
        this.currentBuildingInfo?.name || this.currentBuildingName || null,
      data: locationData,
    };

    // prefer location-specific image, fall back to building image
    const locationImage = locationData?.image || pointData?.image || null;
    const buildingImage = this.currentBuildingInfo?.image || null;
    const imageToUse = locationImage || buildingImage;

    if (imageToUse) {
      imageEl.src = imageToUse;
      imageEl.alt = `${pointData?.name || 'Location'} photo`;
    } else {
      imageEl.src = '';
      imageEl.alt = '';
    }

    nameEl.textContent = pointData?.name || 'location';

    // get location rating
    if (locationData) {
      const ratingValue = locationData.rating || 4.0;
      const ratingCount = Array.isArray(locationData.reviews)
        ? locationData.reviews.length
        : 0;
      const ratingStars = buildRatingStars(Math.round(ratingValue * 10) / 10);
      ratingEl.innerHTML = `
        <span class="map-sidebar-rating-value">${ratingValue.toFixed(1)}</span>
        <span class="map-sidebar-rating-stars">${ratingStars}</span>
        <span class="map-sidebar-rating-count">(${ratingCount})</span>
      `;
    } else {
      ratingEl.innerHTML = `
        <span class="map-sidebar-rating-value">4.2</span>
        <span class="map-sidebar-rating-stars">★★★★☆</span>
        <span class="map-sidebar-rating-count">(128)</span>
      `;
    }

    // other data (floor and type)
    if (metaEl) {
      if (locationData && pointData) {
        const floorText = `Floor ${
          pointData.floor || locationData.floor || ''
        }`;
        const typeText =
          locationData.type === 'food'
            ? 'Food'
            : locationData.type === 'library'
            ? 'Library'
            : 'Common area';
        metaEl.textContent = `${floorText} · ${typeText}`;
        if (metaEl.style) {
          metaEl.style.display = 'block';
        }
      } else {
        metaEl.textContent = '';
        if (metaEl.style) {
          metaEl.style.display = 'none';
        }
      }
    }

    // status line
    const closingTime = locationData?.closingTime || '9 p.m.';
    statusEl.textContent = `Open · Closes ${closingTime}`;

    // popular times
    const popularEl = document.getElementById('location-popular-times');
    if (popularEl && locationData?.popularTimes) {
      const hours = locationData.popularTimes.hours || [];
      const values = locationData.popularTimes.values || [];
      popularEl.innerHTML = buildPopularTimesHtml(hours, values);

      // set dynamic bar heights using js after html is inserted
      const bars = popularEl.querySelectorAll('.map-popular-times-bar');
      if (bars.length > 0) {
        bars.forEach((bar) => {
          const heightAttr = bar.getAttribute('data-height');
          const height = heightAttr ? parseFloat(heightAttr) : 0;
          if (!Number.isNaN(height)) {
            bar.style.height = `${height}px`;
          }
        });
      }
    }

    // reviews
    const reviewsEl = document.getElementById('location-reviews');
    if (reviewsEl) {
      const reviews = Array.isArray(locationData?.reviews)
        ? locationData.reviews
        : [];
      reviewsEl.innerHTML = buildReviewsHtml(reviews);
    }

    // hide building sidebar and show location sidebar
    const buildingSidebar = document.getElementById('map-sidebar');
    if (buildingSidebar) {
      buildingSidebar.style.display = 'none';
    }

    locationSidebar.style.display = 'block';
    if (typeof locationSidebar.scrollTop === 'number') {
      locationSidebar.scrollTop = 0;
    }

    // ensure 3d building is visible when location sidebar is shown
    if (this.currentBuildingName && this.map3dController) {
      const mapEl = document.getElementById('leaflet-map');
      const container3d = document.getElementById('map-3d-container');
      if (mapEl && container3d) {
        mapEl.style.display = 'none';
        container3d.style.display = 'block';
      }
    }

    // highlight the selected location's sprite in 3d building
    if (
      this.map3dController &&
      typeof this.map3dController.setSelectedLocationByName === 'function' &&
      pointData?.name
    ) {
      this.map3dController.setSelectedLocationByName(pointData.name);
    }

    // adjust 3d layout for visible sidebar state
    this.handle3dResize();
  },

  // setup close/back buttons for the two sidebars
  setupSidebarControls() {
    const buildingCloseBtn = document.getElementById('map-sidebar-close');
    if (buildingCloseBtn) {
      buildingCloseBtn.addEventListener('click', () => {
        this.hideSidebar();
      });
    }

    const locationCloseBtn = document.getElementById('map-location-close');
    if (locationCloseBtn) {
      locationCloseBtn.addEventListener('click', () => {
        const locationSidebar = document.getElementById('map-location-sidebar');
        if (locationSidebar) {
          locationSidebar.style.display = 'none';
        }
        // clear location highlight when closing location sidebar
        if (
          this.map3dController &&
          typeof this.map3dController.clearSelectedLocationHighlight ===
            'function'
        ) {
          this.map3dController.clearSelectedLocationHighlight();
        }
        // check if building sidebar is also closed: if so, return to map view
        const buildingSidebar = document.getElementById('map-sidebar');
        const buildingVisible =
          buildingSidebar && buildingSidebar.style.display !== 'none';
        if (!buildingVisible) {
          this.showMapView();
        } else {
          // building sidebar is still open, just update 3d layout
          this.handle3dResize();
        }
      });
    }

    const locationBackBtn = document.getElementById('map-location-back');
    if (locationBackBtn) {
      locationBackBtn.addEventListener('click', () => {
        const locationSidebar = document.getElementById('map-location-sidebar');
        if (locationSidebar) {
          locationSidebar.style.display = 'none';
        }
        // clear location highlight when going back to building view
        if (
          this.map3dController &&
          typeof this.map3dController.clearSelectedLocationHighlight ===
            'function'
        ) {
          this.map3dController.clearSelectedLocationHighlight();
        }
        const buildingSidebar = document.getElementById('map-sidebar');
        if (buildingSidebar) {
          buildingSidebar.style.display = 'block';
          if (typeof buildingSidebar.scrollTop === 'number') {
            buildingSidebar.scrollTop = 0;
          }
        }
        // make sure 3d building stays visible when switching back to building view
        if (this.currentBuildingName && this.map3dController) {
          const mapEl = document.getElementById('leaflet-map');
          const container3d = document.getElementById('map-3d-container');
          if (mapEl && container3d) {
            mapEl.style.display = 'none';
            container3d.style.display = 'block';
          }
        }
        this.handle3dResize();
      });
    }
  },

  // setup create event buttons to work with the global event modal
  setupCreateEventButtons() {
    const headerButton = document.getElementById('map-create-button');
    const sidebarButton1 = document.getElementById('map-sidebar-button-1');
    const locationSidebarButton1 = document.getElementById(
      'location-sidebar-button-1'
    );

    const openCreateModal = (eventData = null) => {
      const onSave = (formData) => {
        const { id, title, emoji, start, end, location, description, invite } =
          formData;
        const eventId = id || formData.generatedId;
        const titleWithEmoji = `${emoji} ${title}`;

        const after = {
          id: eventId,
          title: titleWithEmoji,
          start,
          end,
          emoji,
          invite,
          location,
          description,
          name: title,
        };

        if (id) {
          const events = GlobalStorage.getEvents();
          const before = events.find((m) => m.id === id) || null;
          EventManager.editEvent('map', before, after, {
            applyAfterChange: () => {
              this.refreshEventMarkers();
            },
            applyAfterUndo: () => {
              this.refreshEventMarkers();
            },
          });
          return;
        }

        EventManager.createEvent('map', after, {
          applyAfterChange: () => {
            this.refreshEventMarkers();
          },
          applyAfterUndo: () => {
            this.refreshEventMarkers();
          },
        });
      };

      const onCancel = () => {
        // no special cleanup needed for map page
      };

      EventModal.open({
        startPreset: null,
        endPreset: null,
        eventData,
        onSave,
        onCancel,
      });
    };

    if (headerButton) {
      headerButton.addEventListener('click', () => {
        openCreateModal();
      });
    }

    // building sidebar button - auto-fill with building name
    if (sidebarButton1) {
      sidebarButton1.addEventListener('click', () => {
        const location = this.currentBuildingName || '';
        const eventData = location ? { location } : null;
        openCreateModal(eventData);
      });
    }

    // location sidebar button - auto-fill with location name and building
    if (locationSidebarButton1) {
      locationSidebarButton1.addEventListener('click', () => {
        let location = '';
        if (this.currentLocationInfo) {
          const locationName = this.currentLocationInfo.name || '';
          const buildingName = this.currentLocationInfo.buildingName || '';
          // format: "Location Name, Building Name" if both exist, otherwise just the name
          if (locationName && buildingName) {
            location = `${locationName}, ${buildingName}`;
          } else if (locationName) {
            location = locationName;
          } else if (buildingName) {
            location = buildingName;
          }
        }
        const eventData = location ? { location } : null;
        openCreateModal(eventData);
      });
    }
  },

  // set up search bar behavior for locations, buildings, and friends
  setupSearch() {
    const searchInput = document.getElementById('map-search-input');
    const dropdown = document.getElementById('map-search-dropdown');
    const dropdownList = dropdown?.querySelector('.map-search-dropdown-list');
    const searchWrapper = searchInput?.closest('.map-search-wrapper');

    if (!searchInput || !dropdown || !dropdownList || !searchWrapper) {
      return;
    }

    // handle input events and show results
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim();
      if (!query) {
        dropdown.style.display = 'none';
        return;
      }

      const friends = this.getFriendsForSearch();
      const buildingsData =
        (GlobalStorage.getBuildings && GlobalStorage.getBuildings()) ||
        (typeof BUILDING_LOCATIONS_DATA !== 'undefined'
          ? BUILDING_LOCATIONS_DATA
          : null);
      const results = searchMapEntities(query, friends, buildingsData);
      this.renderSearchResults(results, dropdownList);

      // position dropdown to visually attach to the input
      const inputRect = searchInput.getBoundingClientRect();
      const containerRect = searchWrapper.getBoundingClientRect();
      if (containerRect) {
        const dropdownTop = inputRect.bottom - containerRect.top - 1;
        dropdown.style.top = `${dropdownTop}px`;
      }

      dropdown.style.display = results.length === 0 ? 'none' : 'block';
    });

    // re-open results on focus when there is text
    searchInput.addEventListener('focus', () => {
      const query = searchInput.value.trim();
      if (!query) {
        return;
      }

      const friends = this.getFriendsForSearch();
      const buildingsData =
        (GlobalStorage.getBuildings && GlobalStorage.getBuildings()) ||
        (typeof BUILDING_LOCATIONS_DATA !== 'undefined'
          ? BUILDING_LOCATIONS_DATA
          : null);
      const results = searchMapEntities(query, friends, buildingsData);
      this.renderSearchResults(results, dropdownList);

      const inputRect = searchInput.getBoundingClientRect();
      const containerRect = searchWrapper.getBoundingClientRect();
      if (containerRect) {
        const dropdownTop = inputRect.bottom - containerRect.top - 1;
        dropdown.style.top = `${dropdownTop}px`;
      }

      dropdown.style.display = results.length === 0 ? 'none' : 'block';
    });

    // hide dropdown when clicking outside search area
    document.addEventListener('click', (event) => {
      if (
        !searchInput.contains(event.target) &&
        !dropdown.contains(event.target)
      ) {
        dropdown.style.display = 'none';
      }
    });
  },

  // get friend list for search using people markers on the map
  getFriendsForSearch() {
    const friends = [];

    if (this.peopleMarkersByName && this.peopleMarkersByName.forEach) {
      this.peopleMarkersByName.forEach((marker, name) => {
        // skip the current user marker
        if (name === 'John Doe') {
          return;
        }
        friends.push({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          avatar: name.charAt(0),
          status: 'online',
        });
      });
    }

    return friends;
  },

  // render search results dropdown items
  renderSearchResults(results, container) {
    if (!container) {
      return;
    }

    const itemsHtml = buildMapSearchResultsHtml(results);
    container.innerHTML = itemsHtml;

    if (!Array.isArray(results) || results.length === 0) {
      return;
    }

    // wire up click behavior for each result
    container.querySelectorAll('.map-search-dropdown-item').forEach((item) => {
      item.addEventListener('click', () => {
        const type = item.getAttribute('data-type');
        const name = item.getAttribute('data-name');
        const buildingName = item.getAttribute('data-building');
        this.handleSearchSelection(type, name, buildingName);
      });
    });
  },

  // handle click on a dropdown search result
  handleSearchSelection(type, name, buildingName) {
    const dropdown = document.getElementById('map-search-dropdown');
    const searchInput = document.getElementById('map-search-input');

    if (dropdown) {
      dropdown.style.display = 'none';
    }
    if (searchInput) {
      searchInput.value = '';
    }

    if (type === 'friend') {
      this.handleFriendSelection(name);
    } else if (type === 'building') {
      this.handleBuildingSelection(name);
    } else if (type === 'location') {
      this.handleLocationSelection(name, buildingName);
    }
  },

  // when picking a friend, zoom to their marker and open the popup
  handleFriendSelection(friendName) {
    if (!friendName || !this.map || !this.peopleMarkersByName) {
      return;
    }

    const marker = this.peopleMarkersByName.get(friendName);
    if (!marker) {
      return;
    }

    const latlng = marker.getLatLng();
    if (!latlng) {
      return;
    }

    // ensure we are in map view and sidebars are closed
    this.showMapView();
    this.hideSidebar();
    const locationSidebar = document.getElementById('map-location-sidebar');
    if (locationSidebar) {
      locationSidebar.style.display = 'none';
    }

    // zoom in to the friend marker
    if (typeof this.map.getMaxZoom === 'function') {
      this.map.setView([latlng.lat, latlng.lng], this.map.getMaxZoom());
    } else {
      this.map.setView([latlng.lat, latlng.lng]);
    }

    if (typeof marker.openPopup === 'function') {
      marker.openPopup();
    }
  },

  // when picking a building, show its sidebar and enter 3d view
  handleBuildingSelection(buildingName) {
    if (!buildingName) {
      return;
    }

    const buildingsData =
      (GlobalStorage.getBuildings && GlobalStorage.getBuildings()) ||
      (typeof BUILDING_LOCATIONS_DATA !== 'undefined'
        ? BUILDING_LOCATIONS_DATA
        : null);

    if (!buildingsData || !buildingsData[buildingName]) {
      return;
    }

    const building = buildingsData[buildingName];
    const address = building.address || null;
    const closingTime = building.closingTime || '9 p.m.';
    const image = building.image || null;

    this.currentBuildingInfo = {
      name: buildingName,
      address,
      closingTime,
      image,
    };
    this.currentBuildingName = buildingName;

    this.showBuildingSidebar(buildingName, address, closingTime, image);
    this.renderBuildingDirectory();
    this.show3dView(buildingName);
  },

  // when picking a specific location, open its building view and then its location sidebar
  handleLocationSelection(locationName, buildingName) {
    if (!locationName || !buildingName) {
      return;
    }

    const buildingsData =
      (GlobalStorage.getBuildings && GlobalStorage.getBuildings()) ||
      (typeof BUILDING_LOCATIONS_DATA !== 'undefined'
        ? BUILDING_LOCATIONS_DATA
        : null);

    if (!buildingsData || !buildingsData[buildingName]) {
      return;
    }

    const building = buildingsData[buildingName];
    const address = building.address || null;
    const closingTime = building.closingTime || '9 p.m.';
    const image = building.image || null;

    const locations = Array.isArray(building.locations)
      ? building.locations
      : [];
    const locationData = locations.find(
      (loc) => loc && loc.name === locationName
    );
    if (!locationData) {
      return;
    }

    this.currentBuildingInfo = {
      name: buildingName,
      address,
      closingTime,
      image,
    };
    this.currentBuildingName = buildingName;

    this.showBuildingSidebar(buildingName, address, closingTime, image);
    this.renderBuildingDirectory();
    this.show3dView(buildingName);

    // small delay so 3d view can render before showing the location sidebar
    setTimeout(() => {
      this.showLocationSidebar({
        name: locationName,
        locationData,
        image: locationData.image || image || null,
      });
    }, 100);
  },

  // load and display people markers on the map
  loadPeopleMarkers() {
    try {
      if (typeof OVERPASS_BUILDINGS_DATA === 'undefined' || !this.map) {
        return;
      }

      const geoJsonData = convertOverpassToGeoJson(OVERPASS_BUILDINGS_DATA);

      // defined them in a way that looks cool
      const people = [
        {
          name: 'Alice',
          letter: 'A',
          buildingName: 'Engineering and Information Technology Complex-E2',
          offset: { lat: 0.00015, lng: 0.0006 },
          hasWhiteBorder: false,
          status: 'online',
        },
        {
          name: 'Francesca',
          letter: 'F',
          buildingName: 'Engineering and Information Technology Complex-E2',
          offset: { lat: 0.00005, lng: -0.0003 },
          hasWhiteBorder: false,
          status: 'dnd',
        },
        {
          name: 'Charlie',
          letter: 'C',
          buildingName: 'Elizabeth Dafoe Library',
          offset: { lat: 0.00012, lng: 0.00018 },
          hasWhiteBorder: false,
          status: 'online',
        },
        {
          name: 'David',
          letter: 'D',
          buildingName: 'Tier Building',
          offset: { lat: 0.0001, lng: -0.0004 },
          hasWhiteBorder: false,
          status: 'online',
        },
        {
          name: 'Elaine',
          letter: 'E',
          buildingName: 'Allen Physics Building',
          offset: { lat: -0.0002, lng: 0.0003 },
          hasWhiteBorder: false,
          status: 'online',
        },
        {
          name: 'John Doe',
          letter: 'JD',
          buildingName: 'University Centre',
          offset: { lat: 0.00012, lng: 0.0006 },
          hasWhiteBorder: true,
          status: 'online',
        },
      ];

      this.peopleMarkersLayer = window.L.layerGroup();

      people.forEach((person) => {
        const buildingFeature = geoJsonData.features.find(
          (feature) => feature.properties?.name === person.buildingName
        );

        if (!buildingFeature) {
          return;
        }

        const centroid = calculatePolygonCentroid(buildingFeature);
        if (!centroid) {
          return;
        }

        const personLat = centroid.lat + person.offset.lat;
        const personLng = centroid.lng + person.offset.lng;

        const icon = createPersonIcon(person.letter, person.hasWhiteBorder);
        if (!icon) {
          return;
        }

        // the only person that is not clickable is the 'user'
        const isUser = person.name === 'John Doe';
        const marker = window.L.marker([personLat, personLng], {
          icon,
          interactive: !isUser,
        });

        if (!isUser) {
          const popupHtml = createPersonPopupHtml(person);

          marker.bindPopup(popupHtml, {
            className: 'map-person-popup',
            offset: window.L.point(0, 0),
            closeButton: false,
          });

          marker.on('popupopen', () => {
            // hide tooltips when popup opens
            this.hideAllTooltips();
            this.setupPersonPopupHandlers(marker, person);
          });
        }

        marker.addTo(this.peopleMarkersLayer);
        this.peopleMarkersByName.set(person.name, marker);
      });

      this.peopleMarkersLayer.addTo(this.map);
    } catch (error) {
      console.error('error loading people markers:', error);
    }
  },

  // set up event handlers for person popup buttons
  setupPersonPopupHandlers(marker, person) {
    const popup = marker.getPopup();
    if (!popup) {
      return;
    }

    const popupElement = popup.getElement();
    if (!popupElement) {
      return;
    }

    const closeButton = popupElement.querySelector('.map-person-popup-close');
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        marker.closePopup();
      });
    }

    const envelopeButton = popupElement.querySelector(
      '.map-person-popup-envelope'
    );
    if (envelopeButton) {
      // set up tooltip for envelope button
      Tooltip.init(popupElement);

      envelopeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        // hide tooltip before navigating. otherwise the tooltip will stay on the page forever
        this.hideAllTooltips();
        // ------------------------------------------------------------
        // TO MESSAGES LOGIC! separating because this could get really confusing in the middle of nowhere
        // get person name from button data attribute. THIS CODE SENDS YOU TO MESSAGES
        const personName = envelopeButton.getAttribute('data-person');
        if (personName) {
          // store person name in sessionStorage to pass to messages page
          sessionStorage.setItem('openDmForPerson', personName);
        }
        // ------------------------------------------------------------
        // navigate to messages page
        window.location.hash = '#messages';
        marker.closePopup();
      });
    }
  },

  // helper to hide all visible tooltips
  hideAllTooltips() {
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach((tooltip) => {
      tooltip.style.opacity = '0';
      tooltip.style.display = 'none';
    });
  },

  // load and display event markers based on globalstorage events
  loadEventMarkers() {
    try {
      if (!this.map || typeof OVERPASS_BUILDINGS_DATA === 'undefined') {
        return;
      }

      const geoJsonData = convertOverpassToGeoJson(OVERPASS_BUILDINGS_DATA);

      const allEvents = GlobalStorage.getEvents() || [];

      const eventsForToday = allEvents.filter((event) => {
        if (!event.start) {
          return false;
        }
        const d = new Date(event.start);
        return (
          d.getFullYear() === FIXED_PROTOTYPE_DATE.getFullYear() &&
          d.getMonth() === FIXED_PROTOTYPE_DATE.getMonth() &&
          d.getDate() === FIXED_PROTOTYPE_DATE.getDate()
        );
      });

      const buildingsData = GlobalStorage.getBuildings() || {};

      const events = eventsForToday
        .map((event, index) => {
          const locationName = event.location || '';
          const buildingName = resolveBuildingNameForLocation(
            locationName,
            buildingsData
          );

          if (!buildingName) {
            return null;
          }

          return {
            id: event.id,
            name: event.name || stripEmojiFromTitle(event.title || ''),
            emoji: event.emoji || '📅',
            buildingName,
            offset: getEventOffsetForIndex(index),
            time: formatEventTimeRange(event.start, event.end),
          };
        })
        .filter((m) => m !== null);

      this.eventsMarkersLayer = window.L.layerGroup();

      events.forEach((event) => {
        const buildingFeature = geoJsonData.features.find(
          (feature) => feature.properties?.name === event.buildingName
        );

        if (!buildingFeature) {
          return;
        }

        // get the centroid of the building polygon as the starting point
        const centroid = calculatePolygonCentroid(buildingFeature);
        if (!centroid) {
          return;
        }

        const eventLat = centroid.lat + event.offset.lat;
        const eventLng = centroid.lng + event.offset.lng;

        const icon = createEventIcon(event.emoji);
        if (!icon) {
          return;
        }

        const marker = window.L.marker([eventLat, eventLng], {
          icon,
        });

        const popupHtml = createEventPopupHtml(event);

        marker.bindPopup(popupHtml, {
          className: 'map-event-popup',
          offset: window.L.point(0, 0),
          closeButton: false,
        });

        marker.on('popupopen', () => {
          // hide tooltips when popup opens
          this.hideAllTooltips();
          this.setupEventPopupHandlers(marker, event);
        });

        marker.addTo(this.eventsMarkersLayer);
      });

      this.eventsMarkersLayer.addTo(this.map);
    } catch (error) {
      console.error('error loading event markers:', error);
    }
  },

  // set up event handlers for event popup buttons. similar to above
  setupEventPopupHandlers(marker, event) {
    const popup = marker.getPopup();
    if (!popup) {
      return;
    }

    const popupElement = popup.getElement();
    if (!popupElement) {
      return;
    }

    const closeButton = popupElement.querySelector('.map-event-popup-close');
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        marker.closePopup();
      });
    }

    const calendarButton = popupElement.querySelector('.map-event-calendar');
    if (calendarButton) {
      Tooltip.init(popupElement);

      calendarButton.addEventListener('click', (e) => {
        e.stopPropagation();
        // hide tooltip before opening modal. otherwise, bug
        this.hideAllTooltips();
        marker.closePopup();

        // get full event data from globalstorage
        const events = GlobalStorage.getEvents();
        const fullEvent = events.find((m) => m.id === event.id);
        if (!fullEvent) {
          return;
        }

        // format event data for eventmodal
        const eventData = {
          id: fullEvent.id,
          name:
            fullEvent.name || stripEmojiFromTitle(fullEvent.title || ''),
          location: fullEvent.location || '',
          description: fullEvent.description || '',
          emoji: fullEvent.emoji || '📅',
          invite: fullEvent.invite || '',
          start: fullEvent.start,
          end: fullEvent.end,
        };

        // open edit modal
        const onSave = (formData) => {
          const {
            id,
            title,
            emoji,
            start,
            end,
            location,
            description,
            invite,
          } = formData;
          const eventId = id || formData.generatedId;
          const titleWithEmoji = `${emoji} ${title}`;

          const after = {
            id: eventId,
            title: titleWithEmoji,
            start,
            end,
            emoji,
            invite,
            location,
            description,
            name: title,
          };

          const events = GlobalStorage.getEvents();
          const before = events.find((m) => m.id === id) || null;
          EventManager.editEvent('map', before, after, {
            applyAfterChange: () => {
              // refresh event markers after edit
              this.refreshEventMarkers();
            },
            applyAfterUndo: () => {
              // refresh event markers after undo
              this.refreshEventMarkers();
            },
          });
        };

        const onCancel = () => {
          // removed original code but keeping oncancel here just in case
        };

        EventModal.open({
          startPreset: null,
          endPreset: null,
          eventData,
          onSave,
          onCancel,
        });
      });
    }
  },

  // refresh event markers when events data changes
  refreshEventMarkers() {
    if (!this.map) {
      return;
    }

    // use a small delay to ensure state updates are fully processed
    setTimeout(() => {
      if (!this.map) {
        return;
      }

      if (
        this.eventsMarkersLayer &&
        typeof this.map.removeLayer === 'function'
      ) {
        this.map.removeLayer(this.eventsMarkersLayer);
        this.eventsMarkersLayer = null;
      }

      this.loadEventMarkers();
    }, 50);
  },
};

export default MapPage;
