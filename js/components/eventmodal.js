// we make eventmodal a 'global' component because this is the easiest way to use it in different pages without copy-pasting 1000 lines of code
// the modal is essentially made from scratch. all structure and interactability
import {
  computeModalDateTimeValues,
  findClosestTimeOption,
  TIME_OPTIONS_30_MIN,
  validateLocationValue,
  validateTimeRange,
  buildLocationChoices,
} from '../utils/calendarutils.js';
import Tooltip from './tooltip.js';
import GlobalStorage from '../storage.js';

const EventModal = {
  // configuration provided by host page
  config: {
    container: null, // element to append modal into
  },

  // internal state
  initialized: false,
  selectedFriendIds: [],
  editingEventId: null,
  locationChoices: [],
  // store handler references for cleanup
  documentClickHandlers: [],
  currentOnSave: null,
  currentOnCancel: null,

  // initialize component and attach modal dom and handlers
  init(config = {}) {
    this.config = { ...this.config, ...config };

    // refresh location choices from storage
    const buildings = GlobalStorage.getBuildings();
    const choices = buildLocationChoices(buildings || {});
    this.locationChoices = Array.isArray(choices) ? choices.slice() : [];

    const container =
      this.config.container ||
      document.getElementById('app-container') ||
      document.body;

    // check if backdrop exists before creating
    const backdropExisted = !!document.getElementById(
      'calendar-modal-backdrop'
    );

    // inject if required
    let backdrop = document.getElementById('calendar-modal-backdrop');
    if (!backdrop) {
      container.insertAdjacentHTML('beforeend', this.getModalHtml());
      backdrop = document.getElementById('calendar-modal-backdrop');
    }

    if (backdrop && (!backdropExisted || !this.initialized)) {
      this.cleanupDocumentListeners();
      this.initialized = true;
      this.setupModalHandlers();
      this.setupEmojiPicker();
      this.setupTimeDropdowns();
      this.setupLocationDropdown();
      this.setupInviteTagInput();
      Tooltip.init(backdrop);
    }
  },

  // im not sure if this version of eventmodal needs this
  cleanupDocumentListeners() {
    this.documentClickHandlers.forEach((handler) => {
      document.removeEventListener('click', handler);
    });
    this.documentClickHandlers = [];
  },

  // shouldnt have to be used
  setLocationChoices(locationChoices) {
    this.locationChoices = Array.isArray(locationChoices)
      ? locationChoices.slice()
      : [];
  },

  // helper to get friends from storage
  getFriends() {
    try {
      const friends = GlobalStorage.getFriends() || [];
      return Array.isArray(friends) ? friends : [];
    } catch (e) {
      return [];
    }
  },

  // build modal html (copied from old calendar page)
  getModalHtml() {
    return `
      <div
        id="calendar-modal-backdrop"
        class="calendar-modal-backdrop"
      >
        <div
          class="calendar-modal"
          role="dialog"
        >
          <div class="calendar-modal-header" id="calendar-modal-title">
            Create Event
          </div>
          <div class="calendar-modal-body">
            <div class="calendar-modal-row calendar-modal-row-first">
              <div class="calendar-modal-field calendar-modal-field-emoji">
                <div class="calendar-emoji-picker">
                  <button
                    type="button"
                    id="calendar-emoji-button"
                    class="calendar-emoji-button"
                    data-tooltip="Emoji To Represent Event"
                    data-tooltip-direction="above"
                  >
                    <span id="calendar-emoji-display">📅</span>
                  </button>
                  <div
                    id="calendar-emoji-picker"
                    class="calendar-emoji-picker-dropdown"
                  >
                    <div class="calendar-emoji-grid">
                      <button
                        type="button"
                        class="calendar-emoji-option"
                        data-emoji="📅"
                      >
                        📅
                      </button>
                      <button
                        type="button"
                        class="calendar-emoji-option"
                        data-emoji="💼"
                      >
                        💼
                      </button>
                      <button
                        type="button"
                        class="calendar-emoji-option"
                        data-emoji="👥"
                      >
                        👥
                      </button>
                      <button
                        type="button"
                        class="calendar-emoji-option"
                        data-emoji="🎯"
                      >
                        🎯
                      </button>
                      <button
                        type="button"
                        class="calendar-emoji-option"
                        data-emoji="☕"
                      >
                        ☕
                      </button>
                      <button
                        type="button"
                        class="calendar-emoji-option"
                        data-emoji="🍕"
                      >
                        🍕
                      </button>
                      <button
                        type="button"
                        class="calendar-emoji-option"
                        data-emoji="🎉"
                      >
                        🎉
                      </button>
                      <button
                        type="button"
                        class="calendar-emoji-option"
                        data-emoji="💡"
                      >
                        💡
                      </button>
                      <button
                        type="button"
                        class="calendar-emoji-option"
                        data-emoji="🚀"
                      >
                        🚀
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="calendar-modal-field calendar-modal-field-name">
                <input
                  id="calendar-event-title"
                  class="calendar-modal-input"
                  type="text"
                  placeholder="Event Title"
                />
                <div
                  id="calendar-title-error"
                  class="calendar-title-error"
                ></div>
              </div>
            </div>

            <div class="calendar-modal-row">
              <div class="calendar-modal-emoji">⏰</div>
              <div class="calendar-modal-field calendar-modal-field-date">
                <input
                  id="calendar-event-date"
                  class="calendar-modal-input"
                  type="date"
                />
              </div>
              <div class="calendar-modal-field calendar-modal-field-time-start">
                <div class="calendar-time-input-wrapper">
                  <input
                    id="calendar-event-time-start"
                    class="calendar-modal-input calendar-time-input"
                    type="time"
                  />
                  <button
                    type="button"
                    class="calendar-time-dropdown-button"
                    data-time-input="calendar-event-time-start"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M3 4.5L6 7.5L9 4.5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <div
                    class="calendar-time-dropdown"
                    data-time-input="calendar-event-time-start"
                  >
                    <div class="calendar-time-dropdown-list"></div>
                  </div>
                </div>
              </div>
              <div class="calendar-time-separator">–</div>
              <div class="calendar-modal-field calendar-modal-field-time-end">
                <div class="calendar-time-input-wrapper">
                  <input
                    id="calendar-event-time-end"
                    class="calendar-modal-input calendar-time-input"
                    type="time"
                  />
                  <button
                    type="button"
                    class="calendar-time-dropdown-button"
                    data-time-input="calendar-event-time-end"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M3 4.5L6 7.5L9 4.5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <div
                    class="calendar-time-dropdown"
                    data-time-input="calendar-event-time-end"
                  >
                    <div class="calendar-time-dropdown-list"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="calendar-modal-row">
              <div class="calendar-modal-field calendar-modal-field-full">
                <div
                  id="calendar-time-error"
                  class="calendar-time-error"
                ></div>
              </div>
            </div>

            <div class="calendar-modal-row">
              <div class="calendar-modal-emoji">👥</div>
              <div class="calendar-modal-field calendar-modal-field-full">
                <div class="calendar-invite-wrapper">
                  <div
                    id="calendar-invite-tags"
                    class="calendar-invite-tags"
                  ></div>
                  <input
                    id="calendar-event-invite"
                    class="calendar-modal-input calendar-invite-input"
                    type="text"
                    placeholder="Add Friends..."
                    autocomplete="off"
                  />
                  <div
                    id="calendar-invite-dropdown"
                    class="calendar-invite-dropdown"
                  >
                    <div class="calendar-invite-list"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="calendar-modal-row">
              <div class="calendar-modal-emoji">📍</div>
              <div class="calendar-modal-field calendar-modal-field-full">
                <div class="calendar-location-wrapper">
                  <input
                    id="calendar-event-location"
                    class="calendar-modal-input"
                    type="text"
                    placeholder="Enter Location"
                    autocomplete="off"
                  />
                  <div
                    id="calendar-location-dropdown"
                    class="calendar-location-dropdown"
                  >
                    <div class="calendar-location-list"></div>
                  </div>
                </div>
                <div
                  id="calendar-location-error"
                  class="calendar-location-error"
                ></div>
              </div>
            </div>

            <div class="calendar-modal-row">
              <div class="calendar-modal-emoji">📝</div>
              <div class="calendar-modal-field calendar-modal-field-full">
                <textarea
                  id="calendar-event-description"
                  class="calendar-modal-textarea"
                  placeholder="Enter Description"
                  rows="3"
                ></textarea>
              </div>
            </div>
          </div>
          <div class="calendar-modal-footer">
            <button
              id="calendar-cancel-button"
              class="calendar-btn calendar-btn-secondary"
            >
              Cancel
            </button>
            <button
              id="calendar-save-button"
              class="calendar-btn calendar-btn-primary"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // modal 'public???' api
  // options: { startPreset, endPreset, eventData, onSave, onCancel }
  open(options = {}) {
    const {
      startPreset = null,
      endPreset = null,
      eventData = null,
      onSave = null,
      onCancel = null,
    } = options;

    // some of this logic is probably not required. relic from old
    const buildings = GlobalStorage.getBuildings();
    const choices = buildLocationChoices(buildings || {});
    this.locationChoices = Array.isArray(choices) ? choices.slice() : [];

    this.currentOnSave = typeof onSave === 'function' ? onSave : null;
    this.currentOnCancel = typeof onCancel === 'function' ? onCancel : null;
    const backdrop = document.getElementById('calendar-modal-backdrop');
    const titleInput = document.getElementById('calendar-event-title');
    const dateInput = document.getElementById('calendar-event-date');
    const timeStartInput = document.getElementById('calendar-event-time-start');
    const timeEndInput = document.getElementById('calendar-event-time-end');
    const inviteInput = document.getElementById('calendar-event-invite');
    const locationInput = document.getElementById('calendar-event-location');
    const descriptionInput = document.getElementById(
      'calendar-event-description'
    );
    const emojiDisplay = document.getElementById('calendar-emoji-display');
    const emojiPicker = document.getElementById('calendar-emoji-picker');
    const modalTitle = document.getElementById('calendar-modal-title');
    const titleErrorEl = document.getElementById('calendar-title-error');
    const locationErrorEl = document.getElementById('calendar-location-error');
    const timeErrorEl = document.getElementById('calendar-time-error');

    if (
      !backdrop ||
      !titleInput ||
      !dateInput ||
      !timeStartInput ||
      !timeEndInput ||
      !inviteInput ||
      !locationInput ||
      !descriptionInput ||
      !emojiDisplay
    ) {
      return;
    }

    // only treat as edit if eventData has an id
    if (eventData && eventData.id) {
      this.editingEventId = eventData.id;
      if (modalTitle) {
        modalTitle.textContent = 'Edit Event';
      }
    } else {
      this.editingEventId = null;
      if (modalTitle) {
        modalTitle.textContent = 'Create Event';
      }
    }

    if (eventData) {
      titleInput.value = eventData.name || '';
      locationInput.value = eventData.location || '';
      descriptionInput.value = eventData.description || '';
      emojiDisplay.textContent = eventData.emoji || '📅';

      this.selectedFriendIds = [];
      if (eventData.invite) {
        const friends = this.getFriends();
        const inviteNames = (eventData.invite || '')
          .split(',')
          .map((name) => name.trim())
          .filter((name) => name);
        inviteNames.forEach((name) => {
          const friend = friends.find(
            (f) => f.name && f.name.toLowerCase() === name.toLowerCase()
          );
          if (friend && !this.selectedFriendIds.includes(friend.id)) {
            this.selectedFriendIds.push(friend.id);
          }
        });
      }
      inviteInput.value = '';
    } else {
      titleInput.value = '';
      this.selectedFriendIds = [];
      inviteInput.value = '';
      locationInput.value = '';
      descriptionInput.value = '';
      emojiDisplay.textContent = '📅';
    }

    if (titleErrorEl) {
      titleErrorEl.textContent = '';
    }
    if (locationErrorEl) {
      locationErrorEl.textContent = '';
    }
    if (timeErrorEl) {
      timeErrorEl.textContent = '';
    }

    this.renderInviteTags();

    const modalDateTime = computeModalDateTimeValues(
      startPreset,
      endPreset,
      eventData || {}
    );
    dateInput.value = modalDateTime.dateValue;
    timeStartInput.value = modalDateTime.startTimeValue;
    timeEndInput.value = modalDateTime.endTimeValue;

    if (emojiPicker) {
      emojiPicker.classList.remove('show');
    }

    const timeDropdowns = document.querySelectorAll('.calendar-time-dropdown');
    timeDropdowns.forEach((dropdown) => {
      dropdown.classList.remove('show');
    });

    backdrop.style.display = 'flex';
    // ensure tooltips are initialized when modal opens. there was bug before but i forgot to note it
    Tooltip.init(backdrop);
    titleInput.focus();
  },

  // on close: hide modal and reset fields
  close() {
    const backdrop = document.getElementById('calendar-modal-backdrop');
    const emojiPicker = document.getElementById('calendar-emoji-picker');
    const titleInput = document.getElementById('calendar-event-title');
    const dateInput = document.getElementById('calendar-event-date');
    const timeStartInput = document.getElementById('calendar-event-time-start');
    const timeEndInput = document.getElementById('calendar-event-time-end');
    const inviteInput = document.getElementById('calendar-event-invite');
    const locationInput = document.getElementById('calendar-event-location');
    const descriptionInput = document.getElementById(
      'calendar-event-description'
    );
    const emojiDisplay = document.getElementById('calendar-emoji-display');
    const titleErrorEl = document.getElementById('calendar-title-error');
    const locationErrorEl = document.getElementById('calendar-location-error');
    const timeErrorEl = document.getElementById('calendar-time-error');

    if (backdrop) {
      // blur any focused element inside the modal before hiding
      // have to do this or you will get console warning about hidden elements
      const activeElement = document.activeElement;
      if (activeElement && backdrop.contains(activeElement)) {
        activeElement.blur();
      }
      backdrop.style.display = 'none';
    }

    if (emojiPicker) {
      emojiPicker.classList.remove('show');
    }

    const timeDropdowns = document.querySelectorAll('.calendar-time-dropdown');
    timeDropdowns.forEach((dropdown) => {
      dropdown.classList.remove('show');
    });

    if (titleInput) {
      titleInput.value = '';
    }
    if (dateInput) {
      dateInput.value = '';
    }
    if (timeStartInput) {
      timeStartInput.value = '';
    }
    if (timeEndInput) {
      timeEndInput.value = '';
    }
    if (inviteInput) {
      inviteInput.value = '';
    }
    if (locationInput) {
      locationInput.value = '';
    }
    if (descriptionInput) {
      descriptionInput.value = '';
    }
    if (emojiDisplay) {
      emojiDisplay.textContent = '📅';
    }

    if (titleErrorEl) {
      titleErrorEl.textContent = '';
    }
    if (locationErrorEl) {
      locationErrorEl.textContent = '';
    }
    if (timeErrorEl) {
      timeErrorEl.textContent = '';
    }

    this.editingEventId = null;
    this.selectedFriendIds = [];
  },

  // on cancel: hide modal and reset fields
  handleCancel() {
    this.close();
    if (typeof this.currentOnCancel === 'function') {
      this.currentOnCancel();
    }
  },

  // most of the modal interactivity
  setupModalHandlers() {
    const cancelBtn = document.getElementById('calendar-cancel-button');
    const saveBtn = document.getElementById('calendar-save-button');
    const backdrop = document.getElementById('calendar-modal-backdrop');
    const titleInput = document.getElementById('calendar-event-title');
    const titleErrorEl = document.getElementById('calendar-title-error');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.handleCancel());
    }

    if (backdrop) {
      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
          this.handleCancel();
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveEventFromModal());
    }

    if (titleInput && titleErrorEl) {
      titleInput.addEventListener('input', () => {
        titleErrorEl.textContent = '';
      });
    }

    const timeStartInput = document.getElementById('calendar-event-time-start');
    const timeEndInput = document.getElementById('calendar-event-time-end');
    const timeErrorEl = document.getElementById('calendar-time-error');

    if (timeStartInput && timeErrorEl) {
      timeStartInput.addEventListener('input', () => {
        timeErrorEl.textContent = '';
      });
    }

    if (timeEndInput && timeErrorEl) {
      timeEndInput.addEventListener('input', () => {
        timeErrorEl.textContent = '';
      });
    }
  },

  // emoji picker table thing
  setupEmojiPicker() {
    const emojiButton = document.getElementById('calendar-emoji-button');
    const emojiPicker = document.getElementById('calendar-emoji-picker');
    const emojiDisplay = document.getElementById('calendar-emoji-display');

    if (!emojiButton || !emojiPicker || !emojiDisplay) {
      return;
    }

    emojiButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const isShowing = emojiPicker.classList.contains('show');
      if (isShowing) {
        emojiPicker.classList.remove('show');
      } else {
        emojiPicker.classList.add('show');
      }
    });

    emojiPicker.addEventListener('click', (event) => {
      const option = event.target.closest('.calendar-emoji-option');
      if (!option) {
        return;
      }
      event.stopPropagation();
      const emoji = option.getAttribute('data-emoji');
      if (emoji) {
        emojiDisplay.textContent = emoji;
        emojiPicker.classList.remove('show');
      }
    });

    const emojiClickOutsideHandler = (event) => {
      if (
        emojiPicker &&
        emojiButton &&
        !emojiPicker.contains(event.target) &&
        !emojiButton.contains(event.target)
      ) {
        emojiPicker.classList.remove('show');
      }
    };
    document.addEventListener('click', emojiClickOutsideHandler);
    this.documentClickHandlers.push(emojiClickOutsideHandler);
  },

  // time dropdowns with 30-minute increments
  setupTimeDropdowns() {
    const timeDropdowns = document.querySelectorAll('.calendar-time-dropdown');
    const timeButtons = document.querySelectorAll(
      '.calendar-time-dropdown-button'
    );

    timeDropdowns.forEach((dropdown) => {
      const list = dropdown.querySelector('.calendar-time-dropdown-list');
      if (!list) {
        return;
      }

      TIME_OPTIONS_30_MIN.forEach((option) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'calendar-time-option';
        button.textContent = option.display;
        button.setAttribute('data-time-value', option.value);
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          const timeInputId = dropdown.getAttribute('data-time-input');
          const timeInput = document.getElementById(timeInputId);
          if (timeInput) {
            timeInput.value = option.value;
            timeInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          dropdown.classList.remove('show');
        });
        list.appendChild(button);
      });
    });

    timeButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const timeInputId = button.getAttribute('data-time-input');
        const dropdown = document.querySelector(
          `.calendar-time-dropdown[data-time-input="${timeInputId}"]`
        );
        if (!dropdown) {
          return;
        }

        const isShowing = dropdown.classList.contains('show');
        timeDropdowns.forEach((d) => {
          d.classList.remove('show');
        });

        if (!isShowing) {
          dropdown.classList.add('show');

          const timeInput = document.getElementById(timeInputId);
          if (timeInput && timeInput.value) {
            const currentTime = findClosestTimeOption(timeInput.value);
            if (currentTime) {
              const list = dropdown.querySelector(
                '.calendar-time-dropdown-list'
              );
              const targetButton = list?.querySelector(
                `button[data-time-value="${currentTime}"]`
              );
              if (targetButton) {
                requestAnimationFrame(() => {
                  targetButton.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                  });
                });
              }
            }
          }
        }
      });
    });

    // hide dropdown when clicking outside
    const timeClickOutsideHandler = (event) => {
      const isTimeDropdown = event.target.closest('.calendar-time-dropdown');
      const isTimeButton = event.target.closest(
        '.calendar-time-dropdown-button'
      );
      const isTimeInput = event.target.closest('.calendar-time-input');

      if (!isTimeDropdown && !isTimeButton && !isTimeInput) {
        timeDropdowns.forEach((dropdown) => {
          dropdown.classList.remove('show');
        });
      }
    };
    document.addEventListener('click', timeClickOutsideHandler);
    this.documentClickHandlers.push(timeClickOutsideHandler);
  },

  // location dropdown
  setupLocationDropdown() {
    const locationInput = document.getElementById('calendar-event-location');
    const dropdown = document.getElementById('calendar-location-dropdown');
    const listEl = dropdown
      ? dropdown.querySelector('.calendar-location-list')
      : null;
    const errorEl = document.getElementById('calendar-location-error');

    if (!locationInput || !dropdown || !listEl) {
      return;
    }

    const showDropdown = () => {
      dropdown.classList.add('show');
    };

    const hideDropdown = () => {
      dropdown.classList.remove('show');
    };

    const renderOptions = (query) => {
      const normalizedQuery =
        typeof query === 'string' ? query.trim().toLowerCase() : '';

      let matches = this.locationChoices || [];
      if (normalizedQuery) {
        matches = matches.filter((choice) => {
          const label = choice.label.toLowerCase();
          const buildingName =
            choice.buildingName && choice.buildingName.toLowerCase();
          return (
            label.includes(normalizedQuery) ||
            (buildingName && buildingName.includes(normalizedQuery))
          );
        });
      }

      // just a high number to prevent strange things
      matches = matches.slice(0, 20);

      // no matches
      if (!matches.length) {
        listEl.innerHTML =
          '<div class="calendar-location-option" tabindex="-1"><span class="calendar-location-option-main">No Matching Locations</span></div>';
        showDropdown();
        return;
      }

      const capitalizeType = (type) => {
        if (!type || type === 'building') {
          return 'building';
        }
        return type
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      };

      listEl.innerHTML = matches
        .map((choice) => {
          const capitalizedType = capitalizeType(choice.type);
          const metaText =
            choice.type === 'building'
              ? 'Building'
              : `${capitalizedType} · ${choice.buildingName || ''}`;
          return `
            <button
              type="button"
              class="calendar-location-option"
              data-location="${choice.label}"
              data-building="${choice.buildingName || ''}"
              data-type="${choice.type || 'building'}"
            >
              <span class="calendar-location-option-main">${choice.label}</span>
              <span class="calendar-location-option-meta">${metaText}</span>
            </button>
          `;
        })
        .join('');

      showDropdown();
    };

    locationInput.addEventListener('input', () => {
      if (errorEl) {
        errorEl.textContent = '';
      }
      renderOptions(locationInput.value || '');
    });

    locationInput.addEventListener('focus', () => {
      renderOptions(locationInput.value || '');
    });

    listEl.addEventListener('click', (event) => {
      const target = event.target.closest('.calendar-location-option');
      if (!target || !target.hasAttribute('data-location')) {
        return;
      }
      const selectedLocation = target.getAttribute('data-location') || '';
      const selectedBuilding = target.getAttribute('data-building') || '';
      const choiceType = target.getAttribute('data-type') || '';

      let locationValue = selectedLocation;
      if (choiceType && choiceType !== 'building' && selectedBuilding) {
        locationValue = `${selectedLocation}, ${selectedBuilding}`;
      }

      locationInput.value = locationValue;
      if (errorEl) {
        errorEl.textContent = '';
      }
      hideDropdown();
      locationInput.focus();
    });

    locationInput.addEventListener('blur', () => {
      window.setTimeout(() => {
        hideDropdown();
      }, 150);
    });

    // hide dropdown when clicking outside
    const locationClickOutsideHandler = (event) => {
      const isInsideDropdown = dropdown.contains(event.target);
      const isLocationInput = event.target === locationInput;
      if (!isInsideDropdown && !isLocationInput) {
        hideDropdown();
      }
    };
    document.addEventListener('click', locationClickOutsideHandler);
    this.documentClickHandlers.push(locationClickOutsideHandler);
  },

  // helpers for invite input dom
  getInviteDom() {
    const inviteInput = document.getElementById('calendar-event-invite');
    const tagsContainer = document.getElementById('calendar-invite-tags');
    const dropdown = document.getElementById('calendar-invite-dropdown');
    const listEl = dropdown
      ? dropdown.querySelector('.calendar-invite-list')
      : null;
    return { inviteInput, tagsContainer, dropdown, listEl };
  },

  showInviteDropdown() {
    const { dropdown } = this.getInviteDom();
    if (dropdown) {
      dropdown.classList.add('show');
    }
  },

  hideInviteDropdown() {
    const { dropdown } = this.getInviteDom();
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  },

  // invite tag itself (not the whole invite tag input)
  renderInviteTags() {
    const { tagsContainer } = this.getInviteDom();
    if (!tagsContainer) {
      return;
    }

    const friends = this.getFriends();

    const selectedFriends = this.selectedFriendIds
      .map((id) => friends.find((f) => f.id === id))
      .filter((f) => f !== undefined);

    tagsContainer.innerHTML = selectedFriends
      .map((friend) => {
        return `
          <div class="calendar-invite-tag" data-friend-id="${friend.id}">
            <span class="calendar-invite-tag-name">${friend.name || ''}</span>
            <button
              type="button"
              class="calendar-invite-tag-remove"
            >
              ×
            </button>
          </div>
        `;
      })
      .join('');

    tagsContainer
      .querySelectorAll('.calendar-invite-tag-remove')
      .forEach((button) => {
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          const tag = button.closest('.calendar-invite-tag');
          const friendId = tag?.getAttribute('data-friend-id');
          if (friendId) {
            this.selectedFriendIds = this.selectedFriendIds.filter(
              (id) => id !== friendId
            );
            this.renderInviteTags();
            this.hideInviteDropdown();
          }
        });
      });
  },

  // invite dropdown options
  renderInviteOptions(query) {
    const { listEl } = this.getInviteDom();
    if (!listEl) {
      return;
    }

    const friends = this.getFriends();
    const normalizedQuery =
      typeof query === 'string' ? query.trim().toLowerCase() : '';

    let matches = friends.filter(
      (friend) => !this.selectedFriendIds.includes(friend.id)
    );

    if (normalizedQuery) {
      matches = matches.filter((friend) => {
        const name = friend.name && friend.name.toLowerCase();
        return name && name.includes(normalizedQuery);
      });
    }

    matches = matches.slice(0, 20);

    // no matches
    if (!matches.length) {
      listEl.innerHTML =
        '<div class="calendar-invite-option" tabindex="-1"><span class="calendar-invite-option-main">No Matching Friends</span></div>';
      this.showInviteDropdown();
      return;
    }

    listEl.innerHTML = matches
      .map((friend) => {
        return `
          <button
            type="button"
            class="calendar-invite-option"
            data-friend-id="${friend.id}"
          >
            <div class="calendar-invite-option-avatar">${
              friend.avatar || ''
            }</div>
            <span class="calendar-invite-option-main">${
              friend.name || ''
            }</span>
          </button>
        `;
      })
      .join('');

    this.showInviteDropdown();
  },

  // invite tag input area
  setupInviteTagInput() {
    const { inviteInput, tagsContainer, dropdown, listEl } =
      this.getInviteDom();

    if (!inviteInput || !tagsContainer || !dropdown || !listEl) {
      return;
    }

    inviteInput.addEventListener('input', () => {
      this.renderInviteOptions(inviteInput.value || '');
    });

    inviteInput.addEventListener('focus', () => {
      this.renderInviteOptions(inviteInput.value || '');
    });

    listEl.addEventListener('click', (event) => {
      const target = event.target.closest('.calendar-invite-option');
      if (!target || !target.hasAttribute('data-friend-id')) {
        return;
      }
      const friendId = target.getAttribute('data-friend-id') || '';
      if (friendId && !this.selectedFriendIds.includes(friendId)) {
        this.selectedFriendIds.push(friendId);
        this.renderInviteTags();
        inviteInput.value = '';
        this.hideInviteDropdown();
        inviteInput.focus();
      }
    });

    inviteInput.addEventListener('blur', () => {
      window.setTimeout(() => {
        this.hideInviteDropdown();
      }, 150);
    });

    const inviteClickOutsideHandler = (event) => {
      const isInsideDropdown = dropdown.contains(event.target);
      const isInviteInput = event.target === inviteInput;
      const isTagContainer = tagsContainer.contains(event.target);
      if (!isInsideDropdown && !isInviteInput && !isTagContainer) {
        this.hideInviteDropdown();
      }
    };
    document.addEventListener('click', inviteClickOutsideHandler);
    this.documentClickHandlers.push(inviteClickOutsideHandler);

    // initial render with empty selection
    this.renderInviteTags();
  },

  // on save: gather validated form data and give it to current page
  saveEventFromModal() {
    const titleInput = document.getElementById('calendar-event-title');
    const dateInput = document.getElementById('calendar-event-date');
    const timeStartInput = document.getElementById('calendar-event-time-start');
    const timeEndInput = document.getElementById('calendar-event-time-end');
    const inviteInput = document.getElementById('calendar-event-invite');
    const locationInput = document.getElementById('calendar-event-location');
    const descriptionInput = document.getElementById(
      'calendar-event-description'
    );
    const emojiDisplay = document.getElementById('calendar-emoji-display');

    if (
      !titleInput ||
      !dateInput ||
      !timeStartInput ||
      !timeEndInput ||
      !inviteInput ||
      !locationInput ||
      !descriptionInput ||
      !emojiDisplay
    ) {
      return;
    }

    const title = titleInput.value.trim();
    const date = dateInput.value;
    const timeStart = timeStartInput.value;
    const timeEnd = timeEndInput.value;
    const location = locationInput.value.trim();
    const description = descriptionInput.value.trim();
    const emoji = emojiDisplay.textContent || '📅';

    const titleErrorEl = document.getElementById('calendar-title-error');
    const locationErrorEl = document.getElementById('calendar-location-error');
    const timeErrorEl = document.getElementById('calendar-time-error');

    let hasError = false;
    let firstErrorField = null;

    if (!title) {
      if (titleErrorEl) {
        titleErrorEl.textContent = 'Please provide a name for this event.';
      }
      hasError = true;
      firstErrorField = firstErrorField || titleInput;
    } else if (titleErrorEl) {
      titleErrorEl.textContent = '';
    }

    const timeValidation = validateTimeRange(date, timeStart, timeEnd);
    if (!timeValidation.valid) {
      if (timeErrorEl) {
        timeErrorEl.textContent = timeValidation.message;
      }
      hasError = true;
      if (!firstErrorField) {
        firstErrorField = timeStartInput;
      }
    } else if (timeErrorEl) {
      timeErrorEl.textContent = '';
    }

    const locationValidation = validateLocationValue(
      location,
      this.locationChoices
    );
    if (!locationValidation.valid) {
      if (locationErrorEl) {
        locationErrorEl.textContent = locationValidation.message;
      }
      hasError = true;
      if (!firstErrorField) {
        firstErrorField = locationInput;
      }
    } else if (locationErrorEl) {
      locationErrorEl.textContent = '';
    }

    if (hasError) {
      if (firstErrorField && typeof firstErrorField.focus === 'function') {
        firstErrorField.focus();
      }
      return;
    }

    let start = null;
    if (date && timeStart) {
      start = new Date(`${date}T${timeStart}`);
    } else if (date) {
      start = new Date(date);
    }

    let end = null;
    if (date && timeEnd) {
      end = new Date(`${date}T${timeEnd}`);
    } else if (start) {
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }

    if (!start) {
      return;
    }

    const friends = this.getFriends();
    const selectedNames = this.selectedFriendIds
      .map((id) => {
        const friend = friends.find((f) => f.id === id);
        return friend ? friend.name : null;
      })
      .filter((name) => name !== null);
    const invite = selectedNames.join(', ');

    const formData = {
      id: this.editingEventId || null,
      title,
      emoji,
      date,
      timeStart,
      timeEnd,
      start,
      end,
      location,
      description,
      invite,
      selectedFriendIds: this.selectedFriendIds.slice(),
    };

    // close before notifying host so host can show snackbar or other ui
    // from nov 16 bug
    this.close();

    if (typeof this.currentOnSave === 'function') {
      this.currentOnSave(formData);
    }
  },
};

export default EventModal;
