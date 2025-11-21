// central event manager, create/edit/delete/reschedule logic
// separated from everything because its actually kinda complex, so moved everything up
// updates globalstorage (event, lastEvent)
// coordinates with the global snackbar for undo behavior
// nov 20: added safety checks because of edge cases
// event naming is now consistently used across storage and ui

import GlobalStorage from './storage.js';
import Snackbar from './components/snackbar.js';
import {
  formatDateForSnackbar,
  formatTimeForSnackbar,
} from './utils/calendarutils.js';

// compute snackbar message
function buildMessage(action, after) {
  if (action === 'reschedule' && after && after.start) {
    const dateText = formatDateForSnackbar(after.start);
    const timeText = formatTimeForSnackbar(after.start);
    return `Event rescheduled to ${dateText}, ${timeText}`;
  }

  if (action === 'create') {
    return 'Event created';
  }

  if (action === 'edit') {
    return 'Event saved';
  }

  if (action === 'delete') {
    return 'Event deleted';
  }

  return 'Event updated';
}

// based on action, apply it
function applyChangeToEvents(action, before, after, events) {
  const current = Array.isArray(events) ? events : [];

  if (action === 'create' && after) {
    return [...current, after];
  }

  if (action === 'edit' && after) {
    return current.map((m) => (m.id === after.id ? after : m));
  }

  if (action === 'delete' && before) {
    return current.filter((m) => m.id !== before.id);
  }

  if (action === 'reschedule' && after) {
    return current.map((m) =>
      m.id === after.id
        ? {
            ...m,
            start: after.start,
            end: after.end,
          }
        : m
    );
  }

  return current;
}

// based on action, undo it (reverse of applyChangeToEvents)
function applyUndoToEvents(action, before, after, events) {
  const current = Array.isArray(events) ? events : [];

  if (action === 'create' && after) {
    // undo create by removing the created event
    return current.filter((m) => m.id !== after.id);
  }

  if (action === 'edit' && before) {
    // undo edit by restoring the previous version
    return current.map((m) => (m.id === before.id ? before : m));
  }

  if (action === 'delete' && before) {
    // undo delete by re-inserting the deleted event
    return [...current, before];
  }

  if (action === 'reschedule' && before) {
    // undo reschedule by restoring previous start/end
    return current.map((m) =>
      m.id === before.id
        ? {
            ...m,
            start: before.start,
            end: before.end,
          }
        : m
    );
  }

  return current;
}

const EventManager = {
  lastUiContext: null,

  // below two are helpers for the other functions
  setLastEvent(action, before, after, source) {
    const payload = {
      action,
      before: before || null,
      after: after || null,
      source: source || null,
    };
    GlobalStorage.setLastEvent(payload);
  },

  clearLastEvent() {
    GlobalStorage.clearLastEvent();
    this.lastUiContext = null;
  },

  // apply a change and show snackbar with undo
  applyChange({ action, before, after, invite, source }, uiContext = {}) {
    const events = GlobalStorage.getEvents();
    const updatedEvents = applyChangeToEvents(action, before, after, events);

    GlobalStorage.setEvents(updatedEvents);
    this.setLastEvent(action, before, after, source);
    this.lastUiContext = {
      applyAfterChange: uiContext.applyAfterChange || null,
      applyAfterUndo: uiContext.applyAfterUndo || null,
    };

    if (typeof this.lastUiContext.applyAfterChange === 'function') {
      this.lastUiContext.applyAfterChange(updatedEvents, {
        action,
        before,
        after,
      });
    }

    const message = buildMessage(action, after);

    // after action, show
    Snackbar.show({
      message,
      invite: invite || '',
      onUndo: () => {
        this.undoLastChange();
      },
    });
  },

  // undo the last event change and refresh ui
  undoLastChange() {
    const last = GlobalStorage.getLastEvent();
    if (!last) {
      return;
    }

    const { action, before, after } = last;
    const events = GlobalStorage.getEvents();
    const revertedEvents = applyUndoToEvents(action, before, after, events);

    GlobalStorage.setEvents(revertedEvents);

    if (
      this.lastUiContext &&
      typeof this.lastUiContext.applyAfterUndo === 'function'
    ) {
      this.lastUiContext.applyAfterUndo(revertedEvents, last);
    }

    this.clearLastEvent();

    // show snackbar and message
    Snackbar.show({
      message: 'Undid last change',
      invite: '',
      onUndo: null,
    });
  },

  // wrappers for the four actions
  createEvent(source, data, uiContext) {
    this.applyChange(
      {
        action: 'create',
        before: null,
        after: data,
        invite: data.invite || '',
        source: source || null,
      },
      uiContext
    );
  },

  editEvent(source, before, after, uiContext) {
    this.applyChange(
      {
        action: 'edit',
        before,
        after,
        invite: after.invite || '',
        source: source || null,
      },
      uiContext
    );
  },

  deleteEvent(source, before, uiContext) {
    this.applyChange(
      {
        action: 'delete',
        before,
        after: null,
        invite: before.invite || '',
        source: source || null,
      },
      uiContext
    );
  },

  rescheduleEvent(source, before, after, uiContext) {
    this.applyChange(
      {
        action: 'reschedule',
        before,
        after,
        invite: after.invite || before.invite || '',
        source: source || null,
      },
      uiContext
    );
  },
};

export default EventManager;
