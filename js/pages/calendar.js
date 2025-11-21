import Tooltip from '../components/tooltip.js';
import EventModal from '../components/eventmodal.js';
import GlobalStorage from '../storage.js';
import EventManager from '../eventManager.js';
import {
  buildEventContent,
  getFixedNow,
  resetCalendarEvents,
} from '../utils/calendarutils.js';

const CalendarPage = {
  // local state for this page
  events: [],
  calendar: null,

  init() {
    const container = document.getElementById('app-container');
    if (!container) {
      return;
    }

    // load events from global storage
    this.events = GlobalStorage.getEvents();

    container.innerHTML = this.getPageHtml();

    // start fullcalendar
    this.initializeCalendar();

    // interactivity for all other ui
    this.setupHeaderControls();
    this.setupEventPopoverHandlers();

    Tooltip.init(container);
  },

  // return the html structure for the calendar page
  getPageHtml() {
    return `
      <div class="calendar-page">
        <div class="calendar-header">
          <div class="calendar-header-left">
            <div class="calendar-search">
              <input
                type="text"
                id="calendar-search-input"
                class="calendar-search-input"
                placeholder="Search Events (Not Implemented)"
                disabled
              />
                    </div>
            <button
              id="calendar-create-button"
              class="calendar-create-button"
            >
              Create Event
            </button>
            <div class="calendar-header-divider"></div>
            <div class="calendar-view-toggle" role="group">
              <button
                class="calendar-view-button"
                data-view="timeGridDay"
              >
                Day
              </button>
              <button
                class="calendar-view-button active"
                data-view="timeGridWeek"
              >
                Week
              </button>
              <button
                class="calendar-view-button"
                data-view="dayGridMonth"
              >
                Month
              </button>
            </div>
          </div>
        </div>

        <div id="calendar"></div>

        <div id="calendar-event-popover" class="calendar-event-popover">
          <div class="calendar-popover-actions">
            <button
              type="button"
              class="calendar-popover-button"
              data-action="edit"
              data-tooltip="Edit Event"
              data-tooltip-direction="above"
            >
              ✏️
            </button>
            <button
              type="button"
              class="calendar-popover-button"
              data-action="delete"
              data-tooltip="Delete Event"
              data-tooltip-direction="above"
            >
              🗑️
            </button>
          </div>
          <div class="calendar-popover-divider"></div>
          <button
            type="button"
            class="calendar-popover-button calendar-popover-close"
            data-action="close"
          >
            ✕
          </button>
        </div>

        <div
          id="calendar-snackbar"
          class="calendar-snackbar"
        >
          <div class="calendar-snackbar-message-container">
            <span class="calendar-snackbar-message">Event Saved</span>
            <span
              class="calendar-snackbar-notification"
              id="calendar-snackbar-notification"
            ></span>
          </div>
          <button
            type="button"
            id="calendar-snackbar-undo"
            class="calendar-snackbar-undo"
          >
            Undo
          </button>
          <button
            type="button"
            id="calendar-snackbar-dismiss"
            class="calendar-snackbar-dismiss"
          >
            ×
          </button>
                </div>
            </div>
        `;
  },

  // create fullcalendar instance
  initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || !window.FullCalendar) {
      return;
    }

    if (this.calendar && typeof this.calendar.destroy === 'function') {
      this.calendar.destroy();
    }

    const { Calendar } = window.FullCalendar;

    this.calendar = new Calendar(calendarEl, {
      initialView: 'timeGridWeek',
      height: '100%',
      expandRows: true,
      headerToolbar: {
        left: 'today prev,next title',
        center: '',
        right: '',
      },
      titleFormat: { month: 'long', year: 'numeric', day: 'numeric' },
      weekends: true,
      selectable: true,
      editable: true,
      nowIndicator: true,
      now: () => getFixedNow(),
      allDaySlot: false,
      slotMinTime: '00:00:00',
      slotMaxTime: '24:00:00',
      slotDuration: '01:00:00',
      scrollTime: '09:00:00',
      // below are working with built in FC event handling
      eventContent: (info) => buildEventContent(info),
      select: (selectionInfo) => {
        this.openCreateModal(selectionInfo.start, selectionInfo.end);
      },
      // using eventChange to handle both drag/resize (we consider both a RESCHEDULE)
      eventChange: (changeInfo) => {
        this.handleEventChange(changeInfo);
      },
      eventClick: (clickInfo) => {
        this.showEventPopover(clickInfo);
      },
      events: this.events,
    });

    this.calendar.render();
  },

  // header controls: create button and view toggles
  setupHeaderControls() {
    const createButton = document.getElementById('calendar-create-button');
    const viewButtons = document.querySelectorAll('.calendar-view-button');

    if (createButton) {
      createButton.addEventListener('click', () => {
        this.openCreateModal();
      });
    }

    viewButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const view = button.getAttribute('data-view');
        if (view && this.calendar) {
          this.calendar.changeView(view);
        }
        viewButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
      });
    });
  },

  // show popover for a clicked event
  showEventPopover(clickInfo) {
    const popover = document.getElementById('calendar-event-popover');
    if (!popover) {
      return;
    }

    const eventEl = clickInfo.el;
    const rect = eventEl.getBoundingClientRect();

    popover.setAttribute('data-event-id', clickInfo.event.id);

    popover.classList.add('show');

    const popoverWidth = popover.offsetWidth || 120;
    const popoverHeight = popover.offsetHeight || 40;
    popover.style.left = `${rect.right - popoverWidth}px`;
    popover.style.top = `${rect.top - popoverHeight}px`;
  },

  // hide event popover
  hideEventPopover() {
    const popover = document.getElementById('calendar-event-popover');
    if (!popover) {
      return;
    }
    popover.classList.remove('show');
    popover.removeAttribute('data-event-id');
  },

  // popover button handlers
  setupEventPopoverHandlers() {
    const popover = document.getElementById('calendar-event-popover');
    if (!popover) {
      return;
    }

    const buttons = popover.querySelectorAll('.calendar-popover-button');
    buttons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const action = button.getAttribute('data-action');
        const eventId = popover.getAttribute('data-event-id');

        if (action === 'edit' && eventId) {
          this.editEvent(eventId);
        } else if (action === 'delete' && eventId) {
          this.deleteEvent(eventId);
        } else if (action === 'close') {
          this.hideEventPopover();
        }
      });
    });

    document.addEventListener('click', (event) => {
      if (
        popover &&
        !popover.contains(event.target) &&
        !event.target.closest('.fc-event')
      ) {
        this.hideEventPopover();
      }
    });

    // hide popover on scroll as well: edge case found november 20
    const calendarEl = document.getElementById('calendar');
    const handleScroll = () => {
      if (popover && popover.classList.contains('show')) {
        this.hideEventPopover();
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    if (calendarEl) {
      calendarEl.addEventListener('scroll', handleScroll, true);
    }
  },

  // edit existing event
  editEvent(eventId) {
    if (!this.calendar || !eventId) {
      return;
    }

    const event = this.calendar.getEventById(eventId);
    if (!event) {
      return;
    }

    this.hideEventPopover();

    const extended = event.extendedProps || {};
    const emoji = extended.emoji || '📅';
    const name =
      extended.name ||
      event.title.replace(/^[^\s]+\s+/, '').trim() ||
      event.title;
    const location = extended.location || '';
    const invite = extended.invite || '';
    const description = extended.description || '';

    this.openCreateModal(event.start, event.end, {
      id: eventId,
      emoji,
      name,
      location,
      invite,
      description,
    });
  },

  // delete existing event
  deleteEvent(eventId) {
    if (!this.calendar || !eventId) {
      return;
    }

    this.hideEventPopover();

    const event = this.calendar.getEventById(eventId);
    if (!event) {
      return;
    }

    const events = GlobalStorage.getEvents();
    const before = events.find((event) => event.id === eventId);
    if (!before) {
      event.remove();
      return;
    }

    EventManager.deleteEvent('calendar', before, {
      applyAfterChange: (updatedEvents) => {
        this.events = updatedEvents;
        resetCalendarEvents(this.calendar, this.events);
      },
      applyAfterUndo: (updatedEvents) => {
        this.events = updatedEvents;
        resetCalendarEvents(this.calendar, this.events);
      },
    });
  },

  // open create / edit modal, delegated almost everything to eventmanager
  openCreateModal(startPreset, endPreset, eventData = null) {
    const buildEventFromForm = (formData) => {
      const { id, title, emoji, start, end, location, description, invite } =
        formData;
      const eventId = id || formData.generatedId;
      const titleWithEmoji = `${emoji} ${title}`;
      return {
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
    };

    const onSave = (formData) => {
      if (this.calendar && typeof this.calendar.unselect === 'function') {
        this.calendar.unselect();
      }

      const events = GlobalStorage.getEvents();

      if (formData.id) {
        const before = events.find((m) => m.id === formData.id) || null;
        const after = buildEventFromForm(formData);
        EventManager.editEvent('calendar', before, after, {
          applyAfterChange: (updatedEvents) => {
            this.events = updatedEvents;
            resetCalendarEvents(this.calendar, this.events);
          },
          applyAfterUndo: (updatedEvents) => {
            this.events = updatedEvents;
            resetCalendarEvents(this.calendar, this.events);
          },
        });
        return;
      }

      const after = buildEventFromForm(formData);
      EventManager.createEvent('calendar', after, {
        applyAfterChange: (updatedEvents) => {
          this.events = updatedEvents;
          resetCalendarEvents(this.calendar, this.events);
        },
        applyAfterUndo: (updatedEvents) => {
          this.events = updatedEvents;
          resetCalendarEvents(this.calendar, this.events);
        },
      });
    };

    const onCancel = () => {
      if (this.calendar && typeof this.calendar.unselect === 'function') {
        this.calendar.unselect();
      }
    };

    EventModal.open({
      startPreset,
      endPreset,
      eventData,
      onSave,
      onCancel,
    });
  },

  // handle drag / resize changes from calendar
  handleEventChange(changeInfo) {
    const oldEvent = changeInfo.oldEvent;
    const newEvent = changeInfo.event;

    if (!oldEvent || !newEvent) {
      return;
    }

    const events = GlobalStorage.getEvents();
    const before = events.find((m) => m.id === newEvent.id);
    if (!before) {
      return;
    }

    const after = {
      ...before,
      start: newEvent.start,
      end: newEvent.end,
    };

    EventManager.rescheduleEvent('calendar', before, after, {
      applyAfterChange: (updatedEvents) => {
        this.events = updatedEvents;
        resetCalendarEvents(this.calendar, this.events);
      },
      applyAfterUndo: (updatedEvents) => {
        this.events = updatedEvents;
        resetCalendarEvents(this.calendar, this.events);
      },
    });
  },
};

export default CalendarPage;
