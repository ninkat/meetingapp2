// helper utilities for the map page
// these are kept separate so the main map page file stays smaller and easier to read

// convert overpass api response to geojson format (for polygons/clickable buildings)
export function convertOverpassToGeoJson(overpassData) {
  const features = [];
  const nodes = {};
  const ways = [];

  if (!overpassData || !Array.isArray(overpassData.elements)) {
    return { type: 'FeatureCollection', features: [] };
  }

  // parse overpass data into way
  overpassData.elements.forEach((element) => {
    if (element.type === 'node') {
      nodes[element.id] = [element.lat, element.lon];
    } else if (element.type === 'way' && element.nodes) {
      ways.push(element);
    }
  });

  // overpass way to geojson
  ways.forEach((way) => {
    if (way.nodes && way.nodes.length >= 3) {
      const coordinates = way.nodes
        .map((nodeId) => {
          const node = nodes[nodeId];
          return node ? [node[1], node[0]] : null;
        })
        .filter((coord) => coord !== null);

      if (coordinates.length >= 3) {
        if (
          coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
          coordinates[0][1] !== coordinates[coordinates.length - 1][1]
        ) {
          coordinates.push(coordinates[0]);
        }

        const feature = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
          },
          properties: {
            name: way.tags?.name || 'university building',
            building: way.tags?.building || 'yes',
            ...way.tags,
          },
        };
        features.push(feature);
      }
    }
  });

  // geojson!
  return {
    type: 'FeatureCollection',
    features,
  };
}

// star rating maker
export function buildRatingStars(ratingValue) {
  const full = Math.floor(ratingValue);
  const half = ratingValue - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
}

// build html for popular times bar chart, based on the format i made up
export function buildPopularTimesHtml(hours, values) {
  const safeHours = Array.isArray(hours) ? hours : [];
  const safeValues = Array.isArray(values) ? values : [];
  const maxValue = safeValues.length > 0 ? Math.max.apply(null, safeValues) : 0;
  const maxBarHeight = 80;

  const barsRow = safeValues
    .map((v, i) => {
      const isFirst = i === 0;
      const isLast = i === safeValues.length - 1;
      const hourLabel = safeHours[i] || '';
      const normalizedHeight = maxValue > 0 ? (v / maxValue) * maxBarHeight : 0;
      const barClasses = `map-popular-times-bar${
        isFirst ? ' map-popular-times-bar-first' : ''
      }${isLast ? ' map-popular-times-bar-last' : ''}`;
      return `
        <div class="map-popular-times-bar-wrapper">
          <div
            class="${barClasses}"
            data-value="${v}"
            data-height="${normalizedHeight}"
            title="${hourLabel} · ${v}%"
          ></div>
        </div>
      `;
    })
    .join('');

  const labelsRow = safeHours
    .map((h) => `<div class="map-popular-times-label">${h}</div>`)
    .join('');

  return `
    <div class="map-popular-times-bars">${barsRow}</div>
    <div class="map-popular-times-labels">${labelsRow}</div>
  `;
}

// build html for reviews list
export function buildReviewsHtml(reviews) {
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  if (safeReviews.length === 0) {
    return '<div class="map-sidebar-empty">no reviews yet</div>';
  }

  return safeReviews
    .map((r) => {
      const userName = r.user || 'user';
      const firstInitial = userName.charAt(0).toUpperCase();
      return `
      <div class="map-sidebar-review">
        <div class="map-sidebar-review-header">
          <div class="map-sidebar-review-image">${firstInitial}</div>
          <div class="map-sidebar-review-user">${userName}</div>
        </div>
        <div class="map-sidebar-review-meta">
          <span class="map-sidebar-rating-stars">${r.rating || '★★★★☆'}</span>
          <span class="map-sidebar-review-date">· ${r.when || 'recently'}</span>
        </div>
        <div class="map-sidebar-review-text">${r.text || ''}</div>
      </div>
    `;
    })
    .join('');
}

// calculate a simple centroid for a polygon feature
// used for mapping markers. feed this a polygon building
export function calculatePolygonCentroid(feature) {
  const geometry = feature?.geometry;
  if (!geometry || geometry.type !== 'Polygon' || !geometry.coordinates) {
    return null;
  }

  const ring = geometry.coordinates[0];
  if (!ring || ring.length < 3) {
    return null;
  }

  const coords =
    ring.length > 0 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;

  let sumLat = 0;
  let sumLng = 0;

  coords.forEach((coord) => {
    sumLng += coord[0];
    sumLat += coord[1];
  });

  const centerLat = sumLat / coords.length;
  const centerLng = sumLng / coords.length;

  return { lat: centerLat, lng: centerLng };
}

// create people marker
// define styling here because canvas css didn't work
export function createPersonIcon(letter, hasWhiteBorder = false) {
  if (typeof window === 'undefined' || typeof window.L === 'undefined') {
    return null;
  }

  const scale = 2;
  const baseSize = hasWhiteBorder ? 40 : 36;
  const canvasSize = baseSize * scale;

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const context = canvas.getContext('2d');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.scale(scale, scale);

  const centerX = baseSize / 2;
  const centerY = baseSize / 2;
  const radius = hasWhiteBorder ? 16 : 18;

  context.fillStyle = '#0969da';
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();

  if (hasWhiteBorder) {
    context.strokeStyle = '#ffffff';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.stroke();
  }

  const fontSize = letter.length > 1 ? 16 : 20;
  context.fillStyle = '#ffffff';
  context.font = `bold ${fontSize}px Arial`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(letter, centerX, centerY);

  const dataUrl = canvas.toDataURL();

  return window.L.icon({
    iconUrl: dataUrl,
    iconSize: [baseSize, baseSize],
    iconAnchor: [baseSize / 2, baseSize / 2],
    popupAnchor: [0, -baseSize / 2],
  });
}

// create event marker
export function createEventIcon(emoji) {
  if (typeof window === 'undefined' || typeof window.L === 'undefined') {
    return null;
  }

  const scale = 2;
  const baseSize = 36;
  const canvasSize = baseSize * scale;

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const context = canvas.getContext('2d');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.scale(scale, scale);

  const centerX = baseSize / 2;
  const centerY = baseSize / 2;
  const radius = 18;

  context.fillStyle = '#fb8500';
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();

  context.font = '20px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(emoji, centerX + 2, centerY + 1);

  const dataUrl = canvas.toDataURL();

  return window.L.icon({
    iconUrl: dataUrl,
    iconSize: [baseSize, baseSize],
    iconAnchor: [baseSize / 2, baseSize / 2],
    popupAnchor: [0, -baseSize / 2],
  });
}

export function stripEmojiFromTitle(title) {
  if (typeof title !== 'string') {
    return '';
  }
  // regex strips emoji
  return title.replace(/^[^\s]+\s+/, '').trim();
}

// format a calendar-style event time range for popup display
export function formatEventTimeRange(start, end) {
  if (!start || !end) {
    return '';
  }
  const format = (date) => {
    const d = new Date(date);
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    if (hours === 0) {
      hours = 12;
    }
    const minutesStr = minutes.toString().padStart(2, '0');
    return `${hours}:${minutesStr} ${ampm}`;
  };
  return `${format(start)} \u2013 ${format(end)}`;
}

// resolve a building name for a given location string using building/location data
// note: normalize just means lowercase and trim
export function resolveBuildingNameForLocation(locationName, buildingsData) {
  if (!locationName) {
    return null;
  }

  const normalizedLocation = locationName.toLowerCase();

  const commaIndex = normalizedLocation.indexOf(',');
  if (commaIndex > -1) {
    const buildingName = locationName.substring(commaIndex + 1).trim();
    if (buildingsData && buildingsData[buildingName]) {
      return buildingName;
    }
  }

  // search through building locations to find a matching location name
  if (buildingsData) {
    for (const buildingName in buildingsData) {
      if (!Object.prototype.hasOwnProperty.call(buildingsData, buildingName)) {
        continue;
      }
      const building = buildingsData[buildingName];
      const locations = Array.isArray(building?.locations)
        ? building.locations
        : [];
      const match = locations.find((loc) => {
        const locName =
          typeof loc.name === 'string' ? loc.name.toLowerCase() : '';
        return locName === normalizedLocation;
      });
      if (match) {
        return buildingName;
      }
    }

    // else, just check if the location name is a building name
    for (const buildingName in buildingsData) {
      if (!Object.prototype.hasOwnProperty.call(buildingsData, buildingName)) {
        continue;
      }
      if (buildingName.toLowerCase() === normalizedLocation) {
        return buildingName;
      }
    }
  }

  return null;
}

// derive a small offset for event markers so they do not overlap perfectly
// this works up to 4 events per. too much work to create another algorithm
export function getEventOffsetForIndex(index) {
  const baseOffsets = [
    { lat: 0.0001, lng: 0.0001 },
    { lat: 0.0001, lng: -0.0001 },
    { lat: -0.0001, lng: 0.0001 },
    { lat: -0.0001, lng: -0.0001 },
  ];
  const safeIndex = index >= 0 ? index : 0;
  return baseOffsets[safeIndex % baseOffsets.length];
}

// person popup
export function createPersonPopupHtml(person) {
  const statusIndicator = person.status
    ? `<span class="map-person-status ${person.status}"></span>`
    : '';

  const popupId = `person-popup-${person.name
    .toLowerCase()
    .replace(/\s+/g, '-')}`;

  return `
    <div class="map-person-popup-content" id="${popupId}">
      <div class="map-person-popup-avatar">
        ${person.letter}
        ${statusIndicator}
      </div>
      <div class="map-person-popup-right">
        <div class="map-person-popup-header">
          <button class="map-person-popup-envelope" data-person="${person.name}" data-tooltip="Message ${person.name}" data-tooltip-direction="above">💬</button>
          <button class="map-person-popup-close">×</button>
        </div>
        <div class="map-person-popup-name">${person.name}</div>
      </div>
    </div>
  `;
}

// event popup
export function createEventPopupHtml(event) {
  const popupId = `event-popup-${event.name
    .toLowerCase()
    .replace(/\s+/g, '-')}`;

  return `
    <div class="map-event-popup-content" id="${popupId}">
      <div class="map-event-popup-avatar">
        ${event.emoji}
      </div>
      <div class="map-event-popup-right">
        <div class="map-event-popup-header">
          <button class="map-event-calendar" data-event="${
            event.name
          }" data-tooltip="Edit Event: ${
    event.name
  }" data-tooltip-direction="above">✏️</button>
          <button class="map-event-popup-close">×</button>
        </div>
        <div class="map-event-time">
          ${event.time || ''}
        </div>
        <div class="map-event-name">${event.name}</div>
      </div>
    </div>
  `;
}

// simple search across friends, buildings, and locations. i feel like this runs poorly
// TODO: find a better simple search algorithm
export function searchMapEntities(query, friends, buildingsData) {
  const normalizedQuery =
    typeof query === 'string' ? query.toLowerCase().trim() : '';
  if (!normalizedQuery) {
    return [];
  }

  const results = [];

  // search friends list
  const safeFriends = Array.isArray(friends) ? friends : [];
  safeFriends.forEach((friend) => {
    const name = friend && typeof friend.name === 'string' ? friend.name : '';
    if (name && name.toLowerCase().includes(normalizedQuery)) {
      results.push({
        type: 'friend',
        name,
        data: friend,
      });
    }
  });

  // search buildings and locations
  if (buildingsData) {
    Object.keys(buildingsData).forEach((buildingKey) => {
      const building = buildingsData[buildingKey];
      const buildingName =
        (building && typeof building.name === 'string' && building.name) ||
        buildingKey;

      if (buildingName.toLowerCase().includes(normalizedQuery)) {
        results.push({
          type: 'building',
          name: buildingName,
          data: building,
        });
      }

      const locations = Array.isArray(building?.locations)
        ? building.locations
        : [];
      locations.forEach((loc) => {
        const locName = loc && typeof loc.name === 'string' ? loc.name : '';
        if (locName && locName.toLowerCase().includes(normalizedQuery)) {
          results.push({
            type: 'location',
            name: locName,
            buildingName,
            data: loc,
          });
        }
      });
    });
  }

  // sort: friends, then buildings, then locations
  results.sort((a, b) => {
    const typeOrder = { friend: 0, building: 1, location: 2 };
    const aOrder = typeOrder[a.type] ?? 3;
    const bOrder = typeOrder[b.type] ?? 3;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    return a.name.localeCompare(b.name);
  });

  return results;
}

// build html for search dropdown results
export function buildMapSearchResultsHtml(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return '<div class="map-search-no-results"><p>No results found</p></div>';
  }

  return results
    .map((result) => {
      const typeIcon =
        result.type === 'friend'
          ? '👤'
          : result.type === 'building'
          ? '🏢'
          : '📍';
      const name = result.name || '';
      const buildingAttr =
        result.buildingName && result.type === 'location'
          ? `data-building="${result.buildingName}"`
          : '';
      return `
        <div
          class="map-search-dropdown-item"
          data-type="${result.type}"
          data-name="${name}"
          ${buildingAttr}
        >
          <span class="map-search-dropdown-item-icon">${typeIcon}</span>
          <span class="map-search-dropdown-item-name">${name}</span>
        </div>
      `;
    })
    .join('');
}
