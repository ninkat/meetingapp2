// global snackbar component for event notifications and undo
// this component owns the snackbar dom and timing behavior
// moved in major update nov 20
import { formatInviteeNotification } from '../utils/calendarutils.js';

const Snackbar = {
  root: null,
  snackbarEl: null,
  messageEl: null,
  notificationEl: null,
  undoBtn: null,
  dismissBtn: null,
  snackbarTimer: null,
  currentOnUndo: null,

  // initialize snackbar inside its designated container
  init() {
    // put snackbar in its designated home
    const container = document.getElementById('snackbar-container');
    if (!container) return;

    this.root = container;

    // make snackbar html. give it style of calendar
    this.root.innerHTML = `
      <div
        id="calendar-snackbar"
        class="calendar-snackbar"
      >
        <div class="calendar-snackbar-message-container">
          <span class="calendar-snackbar-message">event saved</span>
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
    `;

    this.snackbarEl = this.root.querySelector('#calendar-snackbar');
    this.messageEl = this.root.querySelector('.calendar-snackbar-message');
    this.notificationEl = this.root.querySelector(
      '#calendar-snackbar-notification'
    );
    this.undoBtn = this.root.querySelector('#calendar-snackbar-undo');
    this.dismissBtn = this.root.querySelector('#calendar-snackbar-dismiss');

    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', () => {
        if (typeof this.currentOnUndo === 'function') {
          this.currentOnUndo();
        }
        // don't hide immediately - let the undo callback show the "undone" message (unresolved bug that's beyond our scope)
      });
    }

    if (this.dismissBtn) {
      this.dismissBtn.addEventListener('click', () => {
        this.hide();
      });
    }
  },

  // show snackbar with message, optional invite list, and optional undo handler
  show(options = {}) {
    if (!this.snackbarEl || !this.messageEl || !this.notificationEl) {
      return;
    }

    const {
      message = 'Event saved',
      invite = '',
      onUndo = null,
      autoHideMs = 10000,
    } = options;

    if (this.snackbarTimer) {
      clearTimeout(this.snackbarTimer);
      this.snackbarTimer = null;
    }

    this.currentOnUndo = typeof onUndo === 'function' ? onUndo : null;

    this.messageEl.textContent = message;

    const inviteNotification = formatInviteeNotification(invite);
    if (inviteNotification) {
      this.notificationEl.textContent = inviteNotification;
      this.notificationEl.style.display = 'block';
    } else {
      this.notificationEl.textContent = '';
      this.notificationEl.style.display = 'none';
    }

    if (this.undoBtn) {
      if (this.currentOnUndo) {
        this.undoBtn.style.display = 'block';
      } else {
        this.undoBtn.style.display = 'none';
      }
    }

    this.snackbarEl.classList.add('calendar-snackbar-visible');

    this.snackbarTimer = setTimeout(() => {
      this.hide();
    }, autoHideMs);
  },

  // hide snackbar and clear pending undo
  hide() {
    if (!this.snackbarEl) {
      return;
    }

    if (this.snackbarTimer) {
      clearTimeout(this.snackbarTimer);
      this.snackbarTimer = null;
    }

    this.snackbarEl.classList.remove('calendar-snackbar-visible');
    this.currentOnUndo = null;
  },
};

export default Snackbar;
