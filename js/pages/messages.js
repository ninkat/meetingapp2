import GlobalStorage from '../storage.js';
import Tooltip from '../components/tooltip.js';
import Navbar from '../components/navbar.js';
import {
  buildDmsFromStorage,
  formatRelativeTimestamp,
  formatMessageTime,
  formatEventTimeRange,
  buildDmListHtml,
  buildMessagesHtml,
  buildInviteEventsHtml,
  buildMessagesSearchResultsHtml,
  getCurrentDate,
} from '../utils/messageutils.js';

// without this your messages will render with a 'Y' instead of a 'JD'
const CURRENT_USER_INITIALS =
  (Navbar?.userData?.initials && Navbar.userData.initials.trim()) || 'Y';

const MessagesPage = {
  dms: [],
  // current dm we are viewing
  currentDmId: null,

  init() {
    const container = document.getElementById('app-container');
    if (!container) {
      return;
    }

    // load dm data from global storage
    const storedMessages = GlobalStorage.getMessages();
    this.dms = buildDmsFromStorage(storedMessages);

    // reset simple view state
    this.currentDmId = null;

    // render the page structure
    container.innerHTML = this.getPageHtml();

    // render initial sidebar and dm selection
    this.renderDmList();

    // ------------------------------------------------------------
    // COMING FROM MAP LOGIC! separating because this could get really confusing in the middle of nowhere
    // check if we should open a specific person's dm (from map page navigation)
    const personNameToOpen = sessionStorage.getItem('openDmForPerson');
    if (personNameToOpen) {
      // clear the stored value
      sessionStorage.removeItem('openDmForPerson');
      // find dm by name (case-insensitive)
      const targetDm = this.dms.find(
        (dm) =>
          dm.name &&
          dm.name.toLowerCase() === personNameToOpen.toLowerCase() &&
          dm.type === 'user'
      );
      if (targetDm) {
        this.selectDm(targetDm.id);
      } else {
        // if dm not found, show default view
        this.showDmView();
      }
    }
    // ------------------------------------------------------------
    else {
      // show default view (most recent dm)
      this.showDmView();
    }

    this.setupEventListeners();
    this.setupChatActionButton();

    // attach tooltips
    Tooltip.init(container);
  },

  // return the html structure for the messages page
  getPageHtml() {
    return `
      <div class="friends-container">
        <aside class="friends-sidebar">
          <div class="friends-sidebar-search">
            <div class="friends-search-wrapper">
              <input
                type="text"
                class="friends-search-input"
                placeholder="Find a DM"
                id="dm-search-input"
              />
              <div class="friends-search-dropdown" id="friends-search-dropdown" style="display: none;"></div>
            </div>
          </div>

          <div class="friends-view-toggle">
            <button
              class="friends-view-button"
              id="friends-view-button"
              data-tooltip="Friends view not implemented yet"
              data-tooltip-direction="right"
            >
              <span>Friends</span>
            </button>
          </div>

          <div class="friends-dm-header">
            <span class="friends-dm-header-title">Direct Messages</span>
            <button
              class="friends-dm-create-button"
              id="friends-dm-create-button"
              data-tooltip="Create new DM (not implemented)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>

          <div class="friends-dm-list" id="friends-dm-list"></div>
        </aside>

        <main class="friends-conversation">
          <div class="friends-conversation-header" id="friends-conversation-header">
            <div class="friends-conversation-title">
              <div class="friends-conversation-avatar" id="conversation-avatar"></div>
              <span id="conversation-name">Select a conversation</span>
            </div>
          </div>

          <div class="friends-messages-area" id="friends-messages-area">
            <div class="friends-messages-placeholder">
              <p>Select a conversation to start messaging</p>
            </div>
          </div>

          <div class="friends-message-input-container" id="friends-message-input-container">
            <div class="friends-message-input-wrapper">
              <button
                class="friends-chat-action-button"
                id="friends-chat-action-button"
                data-tooltip="Use chat action"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 3V13M3 8H13"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <textarea
                class="friends-message-input"
                id="friends-message-input"
                placeholder=""
                rows="1"
              ></textarea>
              <button class="friends-send-button" id="friends-send-button" disabled>
                Send
              </button>
            </div>
          </div>
        </main>
      </div>

      <div id="friends-invite-modal-backdrop" class="friends-invite-modal-backdrop" style="display: none;">
        <div class="friends-invite-modal">
          <div class="friends-invite-modal-header">
            <span id="friends-invite-modal-title">Invite [user] to...</span>
            <button
              class="friends-invite-modal-close"
              id="friends-invite-modal-close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <div class="friends-invite-modal-body">
            <input
              type="text"
              class="friends-invite-search-input"
              id="friends-invite-search-input"
              placeholder="Search events..."
            />
            <div class="friends-invite-events-list" id="friends-invite-events-list"></div>
          </div>
        </div>
      </div>
    `;
  },

  // like the other pages, we could move html generators to util. idk
  // render dm list in the sidebar
  renderDmList() {
    const dmListContainer = document.getElementById('friends-dm-list');
    if (!dmListContainer) {
      return;
    }

    // delegate dm list html generation to message utils to keep this file slim
    dmListContainer.innerHTML = buildDmListHtml(this.dms, this.currentDmId);

    const dmEntries = dmListContainer.querySelectorAll('.friends-dm-entry');
    dmEntries.forEach((entry) => {
      entry.addEventListener('click', () => {
        const dmId = entry.getAttribute('data-dm-id');
        this.selectDm(dmId);
      });
    });
  },

  // show dm view and select the most recent dm on deafult
  showDmView() {
    if (this.currentDmId) {
      const dm = this.dms.find((d) => d.id === this.currentDmId);
      if (dm) {
        this.renderMessages(dm);
        return;
      }
    }

    if (this.dms.length > 0) {
      const sortedDms = [...this.dms].sort(
        (a, b) => b.lastMessageTime - a.lastMessageTime
      );
      this.selectDm(sortedDms[0].id);
    }
  },

  // interactivity for most of the ui
  setupEventListeners() {
    // 'send' button
    const sendButton = document.getElementById('friends-send-button');
    if (sendButton) {
      sendButton.addEventListener('click', () => {
        this.sendMessage();
      });
    }

    // message bar
    const messageInput = document.getElementById('friends-message-input');
    if (messageInput) {
      messageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          this.sendMessage();
        }
      });

      // 'send' button state
      messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = `${Math.min(
          messageInput.scrollHeight,
          200
        )}px`;
        this.updateSendButtonState();
      });
    }

    this.updateSendButtonState();

    // search input
    const searchInput = document.getElementById('dm-search-input');
    const searchDropdown = document.getElementById('friends-search-dropdown');
    if (searchInput && searchDropdown) {
      searchInput.addEventListener('input', (event) => {
        this.showSearchResults(event.target.value);
      });

      document.addEventListener('click', (event) => {
        if (
          !searchInput.contains(event.target) &&
          !searchDropdown.contains(event.target)
        ) {
          searchDropdown.style.display = 'none';
          searchInput.value = '';
        }
      });

      searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
          this.showSearchResults(searchInput.value);
        }
      });
    }
  },

  // chat action button and onclick menu
  setupChatActionButton() {
    const chatActionButton = document.getElementById(
      'friends-chat-action-button'
    );
    if (!chatActionButton) {
      return;
    }

    if (chatActionButton.dataset.setup === 'true') {
      return;
    }
    chatActionButton.dataset.setup = 'true';

    // this can be moved to getpagehtml()
    // update: just keep it
    let popoverMenu = document.querySelector('.friends-chat-action-menu');
    if (!popoverMenu) {
      popoverMenu = document.createElement('div');
      popoverMenu.className = 'friends-chat-action-menu';
      popoverMenu.style.display = 'none';
      popoverMenu.innerHTML = `
        <button class="friends-chat-action-menu-item" data-action="invite">
          <span class="friends-chat-action-icon">📅</span>
          <span class="friends-chat-action-label">Send Invite</span>
        </button>
        <button
          class="friends-chat-action-menu-item"
          data-action="poll"
          data-tooltip="Not implemented"
          data-tooltip-direction="right"
        >
          <span class="friends-chat-action-icon">📊</span>
          <span class="friends-chat-action-label">Send Poll</span>
        </button>
        <button
          class="friends-chat-action-menu-item"
          data-action="location"
          data-tooltip="Not implemented"
          data-tooltip-direction="right"
        >
          <span class="friends-chat-action-icon">📍</span>
          <span class="friends-chat-action-label">Send Location</span>
        </button>
      `;
      document.body.appendChild(popoverMenu);
    }

    // attach tooltips to any menu items created here
    Tooltip.init(popoverMenu);

    // prevent default + stop prop is the 'not implemented' behavior
    chatActionButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const isVisible = popoverMenu.style.display === 'block';
      if (isVisible) {
        popoverMenu.style.display = 'none';
      } else {
        const rect = chatActionButton.getBoundingClientRect();
        popoverMenu.style.display = 'block';
        popoverMenu.style.visibility = 'hidden';

        const menuRect = popoverMenu.getBoundingClientRect();
        popoverMenu.style.visibility = 'visible';

        const topPosition = rect.top - menuRect.height - 8;
        popoverMenu.style.left = `${rect.left}px`;
        popoverMenu.style.top = `${topPosition}px`;
        popoverMenu.style.bottom = 'auto';
      }
    });

    const menuItems = popoverMenu.querySelectorAll(
      '.friends-chat-action-menu-item'
    );
    menuItems.forEach((item) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const action = item.getAttribute('data-action');

        if (action === 'invite') {
          this.openInviteModal();
        } else {
          // keep a simple console log for unimplemented actions
          // eslint-disable-next-line no-console
          console.log(`chat action clicked: ${action}`);
        }

        popoverMenu.style.display = 'none';
      });
    });

    document.addEventListener('click', (event) => {
      if (
        !chatActionButton.contains(event.target) &&
        !popoverMenu.contains(event.target)
      ) {
        popoverMenu.style.display = 'none';
      }
    });
  },

  // open invite modal and wire up search + close handlers
  openInviteModal() {
    if (!this.currentDmId) {
      return;
    }

    const dm = this.dms.find((d) => d.id === this.currentDmId);
    if (!dm) {
      return;
    }

    const modalBackdrop = document.getElementById(
      'friends-invite-modal-backdrop'
    );
    const modalTitle = document.getElementById('friends-invite-modal-title');
    const searchInput = document.getElementById('friends-invite-search-input');
    const eventsList = document.getElementById(
      'friends-invite-events-list'
    );
    const closeButton = document.getElementById('friends-invite-modal-close');

    if (
      !modalBackdrop ||
      !modalTitle ||
      !searchInput ||
      !eventsList ||
      !closeButton
    ) {
      return;
    }

    modalTitle.textContent = `Invite ${dm.name} to...`;

    this.renderInviteEventsList(dm.name, '');

    searchInput.value = '';
    searchInput.oninput = (event) => {
      const query = event.target.value.trim().toLowerCase();
      this.renderInviteEventsList(dm.name, query);
    };

    closeButton.onclick = () => {
      this.closeInviteModal();
    };

    modalBackdrop.onclick = (event) => {
      if (event.target === modalBackdrop) {
        this.closeInviteModal();
      }
    };

    modalBackdrop.style.display = 'flex';
  },

  // close invite modal
  closeInviteModal() {
    const modalBackdrop = document.getElementById(
      'friends-invite-modal-backdrop'
    );
    if (modalBackdrop) {
      modalBackdrop.style.display = 'none';
    }
  },

  // render events in invite modal
  // html generator for the events
  renderInviteEventsList(userName, searchQuery) {
    const eventsList = document.getElementById(
      'friends-invite-events-list'
    );
    if (!eventsList) {
      return;
    }

    const events = GlobalStorage.getEvents() || [];

    const currentDm = this.dms.find((d) => d.id === this.currentDmId);
    const isGroupChat = currentDm && currentDm.type === 'group';

    // delegate invite events html generation to message utils
    const eventsHtml = buildInviteEventsHtml(
      events,
      userName,
      searchQuery,
      isGroupChat
    );

    // otherwise 'no events found'
    eventsList.innerHTML =
      eventsHtml.length > 0
        ? eventsHtml
        : '<div class="friends-invite-no-events">No events found</div>';

    // add click handlers to the invitable events
    const eventItems = eventsList.querySelectorAll(
      '.friends-invite-event-item:not(.disabled)'
    );
    eventItems.forEach((item) => {
      item.addEventListener('click', () => {
        const eventId = item.getAttribute('data-event-id');
        this.sendInvitation(userName, eventId);
        this.closeInviteModal();
      });
    });
  },

  // update send button enabled state based on input contents
  // the grey blue thing should be used as an affordance for the writeup
  updateSendButtonState() {
    const messageInput = document.getElementById('friends-message-input');
    const sendButton = document.getElementById('friends-send-button');
    if (!messageInput || !sendButton) {
      return;
    }

    const hasText = messageInput.value.trim().length > 0;
    sendButton.disabled = !hasText;
  },

  // select a dm and render its messages. called on dm click
  selectDm(dmId) {
    const dm = this.dms.find((d) => d.id === dmId);
    if (!dm) {
      return;
    }

    this.currentDmId = dmId;
    this.renderDmList();

    const conversationName = document.getElementById('conversation-name');
    const conversationAvatar = document.getElementById('conversation-avatar');

    if (conversationName) {
      conversationName.textContent = dm.name;
    }

    if (conversationAvatar) {
      const avatarClass = dm.type === 'group' ? 'group' : '';
      const statusIndicator =
        dm.status && dm.type === 'user'
          ? `<span class="friends-dm-status ${dm.status}"></span>`
          : '';
      conversationAvatar.innerHTML = `
        <div class="friends-dm-avatar ${avatarClass}">${dm.avatar}${statusIndicator}</div>
      `;
    }

    this.renderMessages(dm);

    const messageInput = document.getElementById('friends-message-input');
    if (messageInput) {
      messageInput.placeholder = `Message ${dm.name}`;
      messageInput.focus();
    }

    this.updateSendButtonState();
  },

  // render messages for a dm. called on dm select
  renderMessages(dm) {
    const messagesArea = document.getElementById('friends-messages-area');
    if (!messagesArea) {
      return;
    }

    messagesArea.style.padding = '20px';
    messagesArea.style.gap = '16px';

    // delegate dm messages html generation to message utils
    messagesArea.innerHTML = buildMessagesHtml(
      dm,
      this.dms,
      CURRENT_USER_INITIALS
    );

    const acceptButtons = messagesArea.querySelectorAll(
      '.friends-invitation-accept'
    );
    const declineButtons = messagesArea.querySelectorAll(
      '.friends-invitation-decline'
    );

    acceptButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (button.disabled || button.classList.contains('disabled')) {
          return;
        }
        const messageIndex = parseInt(
          button.getAttribute('data-message-index'),
          10
        );
        const eventId = button.getAttribute('data-event-id');
        this.handleInvitationResponse(dm, messageIndex, eventId, 'accept');
      });
    });

    declineButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (button.disabled || button.classList.contains('disabled')) {
          return;
        }
        const messageIndex = parseInt(
          button.getAttribute('data-message-index'),
          10
        );
        const eventId = button.getAttribute('data-event-id');
        this.handleInvitationResponse(dm, messageIndex, eventId, 'decline');
      });
    });

    messagesArea.scrollTop = messagesArea.scrollHeight;
  },

  // handle invitation response for a given dm message
  handleInvitationResponse(dm, messageIndex, eventId, response) {
    if (
      !dm ||
      !Array.isArray(dm.messages) ||
      messageIndex < 0 ||
      messageIndex >= dm.messages.length
    ) {
      return;
    }

    const message = dm.messages[messageIndex];
    if (message.type !== 'invitation') {
      return;
    }

    message.response = response;
    message.responseTime = getCurrentDate();

    GlobalStorage.setMessages(this.dms);

    this.renderMessages(dm);
  },

  // send an invitation message and update events in storage
  // decided not to include this in the snackbar/eventmanager network because it's hard to change
  sendInvitation(userName, eventId) {
    if (!this.currentDmId || !eventId) {
      return;
    }

    const events = GlobalStorage.getEvents() || [];
    const event = events.find((m) => m.id === eventId);
    if (!event) {
      return;
    }

    const dm = this.dms.find((d) => d.id === this.currentDmId);
    if (!dm) {
      return;
    }

    const inviteList = (event.invite || '')
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name);

    if (dm.type === 'group' && Array.isArray(dm.members)) {
      dm.members.forEach((memberId) => {
        const memberDm = this.dms.find(
          (d) => d.id === memberId && d.type === 'user'
        );
        if (memberDm) {
          const memberName = memberDm.name;
          if (
            !inviteList.some(
              (name) => name.toLowerCase() === memberName.toLowerCase()
            )
          ) {
            inviteList.push(memberName);
          }
        }
      });
    } else {
      if (
        !inviteList.some(
          (name) => name.toLowerCase() === userName.toLowerCase()
        )
      ) {
        inviteList.push(userName);
      }
    }

    event.invite = inviteList.join(', ');

    // find and update the event in the array
    const eventIndex = events.findIndex((m) => m && m.id === event.id);
    if (eventIndex !== -1) {
      events[eventIndex] = event;
    } else {
      events.push(event);
    }
    GlobalStorage.setEvents(events);

    const invitationMessage = {
      author: 'You',
      type: 'invitation',
      eventId,
      event,
      timestamp: getCurrentDate(),
    };

    dm.messages.push(invitationMessage);
    dm.lastMessage = `You: sent an invitation to ${
      event.name || event.title
    }`;
    dm.lastMessageTime = getCurrentDate();

    GlobalStorage.setMessages(this.dms);

    this.renderMessages(dm);
    this.renderDmList();
  },

  // send a text message in the current dm
  sendMessage() {
    if (!this.currentDmId) {
      return;
    }

    const messageInput = document.getElementById('friends-message-input');
    if (!messageInput) {
      return;
    }

    const messageText = messageInput.value.trim();
    if (!messageText) {
      return;
    }

    const dm = this.dms.find((d) => d.id === this.currentDmId);
    if (!dm) {
      return;
    }

    const newMessage = {
      author: 'You',
      text: messageText,
      timestamp: getCurrentDate(),
    };

    dm.messages.push(newMessage);
    dm.lastMessage = `You: ${messageText}`;
    dm.lastMessageTime = getCurrentDate();

    GlobalStorage.setMessages(this.dms);

    messageInput.value = '';

    this.updateSendButtonState();

    messageInput.style.height = 'auto';

    this.renderDmList();
    this.renderMessages(dm);
  },

  // update dm search dropdown with results. called on search input change
  showSearchResults(query) {
    const searchDropdown = document.getElementById('friends-search-dropdown');
    const searchInput = document.getElementById('dm-search-input');
    if (!searchDropdown || !searchInput) {
      return;
    }

    const lowerQuery = query.trim().toLowerCase();

    if (!lowerQuery) {
      searchDropdown.style.display = 'none';
      return;
    }

    const inputRect = searchInput.getBoundingClientRect();
    const wrapperElement =
      searchInput.closest('.friends-search-wrapper') ||
      searchInput.closest('.friends-sidebar-search');
    const containerRect = wrapperElement?.getBoundingClientRect();
    if (containerRect) {
      const dropdownTop = inputRect.bottom - containerRect.top - 1;
      searchDropdown.style.top = `${dropdownTop}px`;
    }

    const results = this.dms.filter((dm) =>
      dm.name.toLowerCase().includes(lowerQuery)
    );

    // delegate search results html generation to message utils
    searchDropdown.innerHTML = buildMessagesSearchResultsHtml(results);

    const searchResults = searchDropdown.querySelectorAll(
      '.friends-search-result'
    );
    searchResults.forEach((result) => {
      result.addEventListener('click', () => {
        const dmId = result.getAttribute('data-dm-id');
        this.selectDm(dmId);
        searchDropdown.style.display = 'none';
        if (searchInput) {
          searchInput.value = '';
        }
      });
    });

    searchDropdown.style.display = 'block';
  },
};

export default MessagesPage;
