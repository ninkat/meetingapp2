// helper functions for calendar page logic
// these are mostly pure functions to keep calendar page code simple
// nov 19 update: well it's no longer calendar code, mostly for the modal

// FOR THE PROTOTYPE, DATE IS FIXED TO OCTOBER 6TH, 2025 9:00 AM (because it was like that in the vertical prototype)
const FIXED_NOW = new Date('2025-10-06T09:30:00');

// get the fixed now date
export function getFixedNow() {
  return FIXED_NOW;
}

// next two are self explanatory
export function toLocalDateInputValue(date) {
  const pad = (n) => `${n}`.padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

export function toLocalTimeInputValue(date) {
  const pad = (n) => `${n}`.padStart(2, '0');
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${hh}:${min}`;
}

// snackbar date formatter
export function formatDateForSnackbar(date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// snackbar time formatter
export function formatTimeForSnackbar(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'pm' : 'am';
  const normalizedHour = hours % 12 || 12;
  const paddedMinutes = minutes.toString().padStart(2, '0');
  return `${normalizedHour}:${paddedMinutes} ${period}`;
}

// snackbar invite formatter
export function formatInviteeNotification(invite) {
  const inviteNames = invite
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  if (inviteNames.length === 0) {
    return '';
  }
  return `Notified ${inviteNames.join(', ')}`;
}

// id generator starting with evt
export function generateEventId() {
  return `evt_${Math.random().toString(36).slice(2, 10)}`;
}

// event time range formatter
export function formatEventTimeRange(start, end) {
  const toDate = (value) => (value instanceof Date ? value : new Date(value));

  const formatTime = (date) => {
    const d = toDate(date);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const period = hours >= 12 ? 'pm' : 'am';
    const normalizedHour = hours % 12 || 12;
    const paddedMinutes = minutes.toString().padStart(2, '0');
    return `${normalizedHour}:${paddedMinutes} ${period}`;
  };

  if (!end) {
    return formatTime(start);
  }

  const startDate = toDate(start);
  const endDate = toDate(end);

  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  if (sameDay) {
    return `${formatTime(startDate)} – ${formatTime(endDate)}`;
  }

  const startDay = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const endDay = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return `${startDay} ${formatTime(startDate)} – ${endDay} ${formatTime(
    endDate
  )}`;
}

// builds html for events on calendar page (replaces FC's default content)
export function buildEventContent(info) {
  const event = info.event;
  const extended = event.extendedProps;

  const emoji = extended.emoji;
  const title =
    extended.name ||
    event.title.replace(/^[^\s]+\s+/, '').trim() ||
    event.title;

  const location = extended.location;
  const invite = extended.invite;

  const start = event.start;
  const end = event.end;
  const durationMs = end.getTime() - start.getTime();
  const oneHourMs = 60 * 60 * 1000;
  // show full range of info if more than an hour
  const showAllInfo = durationMs >= oneHourMs;

  const container = document.createElement('div');
  container.className = 'calendar-event-content';

  const header = document.createElement('div');
  header.className = 'calendar-event-header';

  const emojiEl = document.createElement('div');
  emojiEl.className = 'calendar-event-emoji';
  emojiEl.textContent = emoji;

  const titleEl = document.createElement('div');
  titleEl.className = 'calendar-event-title';
  titleEl.textContent = title;

  header.appendChild(emojiEl);
  header.appendChild(titleEl);
  container.appendChild(header);

  if (showAllInfo) {
    const timeRow = document.createElement('div');
    timeRow.className = 'calendar-event-row calendar-event-row-time';

    const timeIcon = document.createElement('span');
    timeIcon.className = 'calendar-event-row-icon';
    timeIcon.textContent = '⏰';

    const timeText = document.createElement('span');
    timeText.className = 'calendar-event-row-text';
    timeText.textContent = formatEventTimeRange(start, end);

    timeRow.appendChild(timeIcon);
    timeRow.appendChild(timeText);
    container.appendChild(timeRow);

    if (location) {
      const locationRow = document.createElement('div');
      locationRow.className = 'calendar-event-row calendar-event-row-location';

      const locationIcon = document.createElement('span');
      locationIcon.className = 'calendar-event-row-icon';
      locationIcon.textContent = '📍';

      const locationText = document.createElement('span');
      locationText.className = 'calendar-event-row-text';
      locationText.textContent = location;

      locationRow.appendChild(locationIcon);
      locationRow.appendChild(locationText);
      container.appendChild(locationRow);
    }

    if (invite) {
      const peopleRow = document.createElement('div');
      peopleRow.className = 'calendar-event-row calendar-event-row-people';

      const peopleIcon = document.createElement('span');
      peopleIcon.className = 'calendar-event-row-icon';
      peopleIcon.textContent = '👥';

      const peopleText = document.createElement('span');
      peopleText.className = 'calendar-event-row-text';
      peopleText.textContent = invite;

      peopleRow.appendChild(peopleIcon);
      peopleRow.appendChild(peopleText);
      container.appendChild(peopleRow);
    }
  }

  return { domNodes: [container] };
}

// builds location choices array from buildings data
// used for location dropdown in modal, here because modal was in calendar before
export function buildLocationChoices(buildings) {
  const choices = [];

  Object.keys(buildings).forEach((key) => {
    const building = buildings[key];
    const buildingName = building.name || key;

    choices.push({
      label: buildingName,
      locationName: buildingName,
      buildingName,
      type: 'building',
    });

    building.locations.forEach((loc) => {
      choices.push({
        label: loc.name,
        locationName: loc.name,
        buildingName,
        type: loc.type || 'location',
      });
    });
  });

  return choices;
}

// checks if valid location. used in eventmodal
export function validateLocationValue(rawLocation, locationChoices) {
  const value = rawLocation.trim();

  if (!value) {
    return { valid: true, message: '' };
  }

  if (locationChoices.length === 0) {
    return { valid: true, message: '' };
  }

  const lower = value.toLowerCase();

  // check if "[location], [building]" format
  const commaIndex = lower.indexOf(',');
  let locationPart = lower;
  let buildingPart = '';

  if (commaIndex > -1) {
    locationPart = lower.substring(0, commaIndex).trim();
    buildingPart = lower.substring(commaIndex + 1).trim();
  }

  const match = locationChoices.some((choice) => {
    const locName = choice.locationName.toLowerCase();
    const buildingName = choice.buildingName.toLowerCase();

    if (lower === locName || lower === buildingName) {
      return true;
    }

    if (commaIndex > -1) {
      return locName === locationPart && buildingName === buildingPart;
    }

    return false;
  });

  if (match) {
    return { valid: true, message: '' };
  }

  // error message for eventmodal
  return {
    valid: false,
    message: `${rawLocation} is not a valid location. Please choose a location from the list.`,
  };
}

// validate that end time is after start time
// nov 18: addresses bug where end time could be before start time
export function validateTimeRange(date, startTime, endTime) {
  // if date or times are missing, validation passes. other validations will catch
  if (!date || !startTime || !endTime) {
    return { valid: true, message: '' };
  }

  try {
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { valid: true, message: '' };
    }

    if (end <= start) {
      return {
        valid: false,
        message: 'End time must be after start time.',
      };
    }

    return { valid: true, message: '' };
  } catch (e) {
    // if date parsing fails, let other validations do it
    return { valid: true, message: '' };
  }
}

// for time dropdowns in eventmodal
function buildTimeOptions(stepMinutes) {
  const options = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      const hh = String(hour).padStart(2, '0');
      const mm = String(minute).padStart(2, '0');
      const timeValue = `${hh}:${mm}`;
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const displayTime = `${displayHour}:${mm} ${ampm}`;
      options.push({ value: timeValue, display: displayTime });
    }
  }
  return options;
}

// shared 30-minute time options for eventmodal dropdowns
// have this because it used be an hour earlier on
export const TIME_OPTIONS_30_MIN = buildTimeOptions(30);

// finds closest time option matching a raw "hh:mm" value
export function findClosestTimeOption(timeValue, stepMinutes = 30) {
  const [hours, minutes] = timeValue.split(':').map(Number);
  const roundedMinutes = Math.round(minutes / stepMinutes) * stepMinutes;
  const finalMinutes = roundedMinutes >= 60 ? 0 : roundedMinutes;
  const finalHours = roundedMinutes >= 60 ? (hours + 1) % 24 : hours;
  const hh = String(finalHours).padStart(2, '0');
  const mm = String(finalMinutes).padStart(2, '0');
  return `${hh}:${mm}`;
}

// computes modal date/time defaults given optional presets or event data
export function computeModalDateTimeValues(startPreset, endPreset, eventData) {
  if (startPreset) {
    const startDate = new Date(startPreset);
    const endDate = endPreset
      ? new Date(endPreset)
      : new Date(startDate.getTime() + 60 * 60 * 1000);
    return {
      dateValue: toLocalDateInputValue(startDate),
      startTimeValue: toLocalTimeInputValue(startDate),
      endTimeValue: toLocalTimeInputValue(endDate),
    };
  }

  if (eventData.start) {
    const startDate = new Date(eventData.start);
    const endDate = eventData.end
      ? new Date(eventData.end)
      : new Date(startDate.getTime() + 60 * 60 * 1000);
    return {
      dateValue: toLocalDateInputValue(startDate),
      startTimeValue: toLocalTimeInputValue(startDate),
      endTimeValue: toLocalTimeInputValue(endDate),
    };
  }

  const now = getFixedNow();
  const endTime = new Date(now.getTime() + 60 * 60 * 1000);
  return {
    dateValue: toLocalDateInputValue(now),
    startTimeValue: toLocalTimeInputValue(now),
    endTimeValue: toLocalTimeInputValue(endTime),
  };
}

// resets calendar events to match a events array
export function resetCalendarEvents(calendar, events) {
  const allEvents = calendar.getEvents();
  allEvents.forEach((event) => event.remove());

  events.forEach((event) => {
    calendar.addEvent(event);
  });
}

// deep copy of a events array for undo behavior
// not used anymore because of eventmanager. was for old undo process
export function copyEventsState(events) {
  return events.map((event) => ({
    ...event,
    start: event.start ? new Date(event.start) : null,
    end: event.end ? new Date(event.end) : null,
  }));
}
