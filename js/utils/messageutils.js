// helper functions for messages page logic
// these are pure functions so they are easy to test and reuse

// FOR THE PROTOTYPE, DATE IS FIXED TO OCTOBER 6TH, 2025 9:00 AM (because it was like that in the vertical prototype)
export function getCurrentDate() {
  return new Date('2025-10-06T09:00:00');
}

// build dms array from messages stored in global storage
// assumes data is already normalized (timestamps are date objects)
export function buildDmsFromStorage(rawMessages) {
  return rawMessages.map((dm) => {
    const messages = dm.messages.map((message) => {
      return {
        author: message.author,
        text: message.text,
        type: message.type,
        eventId: message.eventId,
        event: message.event ? { ...message.event } : undefined,
        timestamp: message.timestamp,
        response: message.response,
        responseTime: message.responseTime,
      };
    });

    return {
      id: dm.id,
      name: dm.name,
      type: dm.type,
      avatar: dm.avatar,
      status: dm.status,
      members: dm.members.slice(),
      lastMessage: dm.lastMessage,
      lastMessageTime: dm.lastMessageTime,
      messages,
    };
  });
}

// format a timestamp into a short relative string
export function formatRelativeTimestamp(date) {
  const now = getCurrentDate();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}

// format a timestamp into a message time like "3:45 pm"
export function formatMessageTime(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

// format a event time range into something readable
export function formatEventTimeRange(start, end) {
  const toDate = (value) => (value instanceof Date ? value : new Date(value));

  const format = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'pm' : 'am';
    const normalizedHour = hours % 12 || 12;
    const paddedMinutes = minutes.toString().padStart(2, '0');
    return `${normalizedHour}:${paddedMinutes} ${period}`;
  };

  if (!end) {
    return format(toDate(start));
  }

  const startDate = toDate(start);
  const endDate = toDate(end);

  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  if (sameDay) {
    return `${format(startDate)} – ${format(endDate)}`;
  }

  const startDay = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const endDay = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return `${startDay} ${format(startDate)} – ${endDay} ${format(endDate)}`;
}

// builds html for dm list in the sidebar
export function buildDmListHtml(dms, currentDmId) {
  const safeDms = Array.isArray(dms) ? dms : [];

  const sortedDms = [...safeDms].sort(
    (a, b) => b.lastMessageTime - a.lastMessageTime
  );

  return sortedDms
    .map((dm) => {
      const isActive = dm.id === currentDmId;
      const avatarClass = dm.type === 'group' ? 'group' : '';
      const statusIndicator =
        dm.status && dm.type === 'user'
          ? `<span class="friends-dm-status ${dm.status}"></span>`
          : '';

      return `
          <div class="friends-dm-entry ${
            isActive ? 'active' : ''
          }" data-dm-id="${dm.id}">
            <div class="friends-dm-avatar ${avatarClass}">${
        dm.avatar
      }${statusIndicator}</div>
            <div class="friends-dm-info">
              <div class="friends-dm-name">${dm.name}</div>
              <div class="friends-dm-preview">${dm.lastMessage}</div>
            </div>
            <div class="friends-dm-timestamp">${formatRelativeTimestamp(
              dm.lastMessageTime
            )}</div>
          </div>
        `;
    })
    .join('');
}

// builds html for search dropdown results on messages page
export function buildMessagesSearchResultsHtml(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return `
        <div class="friends-search-no-results">
          <p>No results found</p>
        </div>
      `;
  }

  return results
    .map((dm) => {
      const avatarClass = dm.type === 'group' ? 'group' : '';
      return `
            <div class="friends-search-result" data-dm-id="${dm.id}">
              <div class="friends-dm-avatar ${avatarClass}">${dm.avatar}</div>
              <div class="friends-dm-info">
                <div class="friends-search-result-name">${dm.name}</div>
              </div>
            </div>
          `;
    })
    .join('');
}

// builds html for invite events list inside the invite modal
export function buildInviteEventsHtml(
  events,
  userName,
  searchQuery,
  isGroupChat
) {
  const safeEvents = Array.isArray(events) ? events : [];
  const normalizedQuery =
    typeof searchQuery === 'string' ? searchQuery.trim().toLowerCase() : '';

  let filteredEvents = safeEvents;
  if (normalizedQuery) {
    filteredEvents = safeEvents.filter((event) => {
      const title = (event.title || '').toLowerCase();
      const name = (event.name || '').toLowerCase();
      const location = (event.location || '').toLowerCase();
      return (
        title.includes(normalizedQuery) ||
        name.includes(normalizedQuery) ||
        location.includes(normalizedQuery)
      );
    });
  }

  return filteredEvents
    .map((event) => {
      const inviteList = (event.invite || '')
        .split(',')
        .map((name) => name.trim());
      const isAlreadyIn = isGroupChat
        ? false
        : inviteList.some(
            (name) => name.toLowerCase() === userName.toLowerCase()
          );
      const isDisabled = isAlreadyIn ? 'disabled' : '';
      const disabledClass = isAlreadyIn ? 'disabled' : '';

      const timeStr = formatEventTimeRange(event.start, event.end);
      const dateStr = event.start
        ? new Date(event.start).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '';
      const dateTimeStr =
        dateStr && timeStr
          ? `${dateStr} ${timeStr}`
          : dateStr || timeStr || '';
      const location = event.location || '';
      const peopleList = inviteList.filter((name) => name).join(', ');

      return `
        <button
          class="friends-invite-event-item ${disabledClass}"
          ${isDisabled}
          data-event-id="${event.id || ''}"
        >
          <div class="friends-invite-event-info">
            <div class="friends-invite-event-title">${
              event.title || 'Untitled Event'
            }</div>
            ${
              dateTimeStr
                ? `<div class="friends-invite-event-row">${dateTimeStr}</div>`
                : ''
            }
            ${
              location
                ? `<div class="friends-invite-event-row">${location}</div>`
                : ''
            }
            ${
              peopleList
                ? `<div class="friends-invite-event-row">${peopleList}</div>`
                : ''
            }
          </div>
          ${
            isAlreadyIn
              ? '<span class="friends-invite-event-status">Already in</span>'
              : ''
          }
        </button>
      `;
    })
    .join('');
}

// builds html for dm messages (including invitation messages)
export function buildMessagesHtml(dm, allDms, currentUserInitials) {
  if (!dm || !Array.isArray(dm.messages) || dm.messages.length === 0) {
    return `
        <div class="friends-messages-placeholder">
          <p>No messages yet</p>
        </div>
      `;
  }

  const safeDms = Array.isArray(allDms) ? allDms : [];
  const currentInitials =
    typeof currentUserInitials === 'string' && currentUserInitials
      ? currentUserInitials
      : 'Y';

  return dm.messages
    .map((message, index) => {
      const isOwn = message.author === 'You';

      let userAvatar = currentInitials;

      if (isOwn) {
        userAvatar = currentInitials;
      } else if (dm.type === 'group') {
        const userDm = safeDms.find(
          (d) => d.type === 'user' && d.name === message.author
        );
        if (userDm) {
          userAvatar = userDm.avatar;
        } else if (message.author && typeof message.author === 'string') {
          userAvatar = message.author.charAt(0);
        }
      } else {
        userAvatar = dm.avatar;
      }

      // if invitation, generate all the html for that special message
      if (message.type === 'invitation' && message.event) {
        const event = message.event;
        const timeStr = formatEventTimeRange(event.start, event.end);
        const location = event.location || '';
        const inviteList = (event.invite || '')
          .split(',')
          .map((name) => name.trim())
          .filter((name) => name);
        const description = event.description || '';
        const hasResponse =
          message.response === 'accept' || message.response === 'decline';
        const responseText =
          message.response === 'accept'
            ? 'Accepted'
            : message.response === 'decline'
            ? 'Declined'
            : '';
        const isInviter = message.author === 'You';
        const showButtons = !hasResponse;

        return `
            <div class="friends-message ${isOwn ? 'own' : ''}">
              <div class="friends-message-avatar">${userAvatar}</div>
              <div class="friends-message-content">
                <div class="friends-message-header">
                  <span class="friends-message-author">${message.author}</span>
                  <span class="friends-message-time">${formatMessageTime(
                    message.timestamp
                  )}</span>
                </div>
                <div class="friends-message-invitation">
                  <div class="friends-invitation-header">
                    Sent an invitation to <strong>${
                      event.name || event.title || 'Untitled Event'
                    }</strong>
                  </div>
                  <div class="friends-invitation-details">
                    ${
                      timeStr
                        ? `<div class="friends-invitation-detail"><span class="friends-invitation-icon">⏰</span><span>${timeStr}</span></div>`
                        : ''
                    }
                    ${
                      location
                        ? `<div class="friends-invitation-detail"><span class="friends-invitation-icon">📍</span><span>${location}</span></div>`
                        : ''
                    }
                    ${
                      inviteList.length > 0
                        ? `<div class="friends-invitation-detail"><span class="friends-invitation-icon">👥</span><span>${inviteList.join(
                            ', '
                          )}</span></div>`
                        : ''
                    }
                    ${
                      description
                        ? `<div class="friends-invitation-detail"><span class="friends-invitation-icon">📝</span><span>${description}</span></div>`
                        : ''
                    }
                  </div>
                  ${
                    hasResponse
                      ? `<div class="friends-invitation-response">${responseText}</div>`
                      : ''
                  }
                  ${
                    showButtons
                      ? `
                    <div class="friends-invitation-actions">
                      <button
                        class="friends-invitation-button friends-invitation-accept ${
                          isInviter ? 'disabled' : ''
                        }"
                        ${isInviter ? 'disabled' : ''}
                        data-message-index="${index}"
                        data-event-id="${event.id || ''}"
                      >
                        Accept
                      </button>
                      <button
                        class="friends-invitation-button friends-invitation-decline ${
                          isInviter ? 'disabled' : ''
                        }"
                        ${isInviter ? 'disabled' : ''}
                        data-message-index="${index}"
                        data-event-id="${event.id || ''}"
                      >
                        Decline
                      </button>
                    </div>
                  `
                      : ''
                  }
                </div>
              </div>
            </div>
          `;
      }

      return `
          <div class="friends-message ${isOwn ? 'own' : ''}">
            <div class="friends-message-avatar">${userAvatar}</div>
            <div class="friends-message-content">
              <div class="friends-message-header">
                <span class="friends-message-author">${message.author}</span>
                <span class="friends-message-time">${formatMessageTime(
                  message.timestamp
                )}</span>
              </div>
              <div class="friends-message-text">${message.text}</div>
            </div>
          </div>
        `;
    })
    .join('');
}

/** NO LONGER USED: USING STANDARD GET/SET INSTEAD
export function upsertEvent(events, updatedEvent) {
  if (!updatedEvent) {
    return Array.isArray(events) ? events.slice() : [];
  }

  const list = Array.isArray(events) ? events.slice() : [];
  const index = list.findIndex((m) => m && m.id === updatedEvent.id);

  if (index === -1) {
    list.push(updatedEvent);
  } else {
    list[index] = updatedEvent;
  }

  return list;
}
**/
