// utility functions for processing sample data from assets folder
// these functions transform raw sample data into the format expected by storage
// these functions assume data (from assets folder) is perfect

// FOR THE PROTOTYPE, DATE IS FIXED TO OCTOBER 6TH, 2025 9:00 AM (because it was like that in the vertical prototype)
function getCurrentDate() {
  return new Date('2025-10-06T09:00:00');
}

// process sample events data into our events format
export function processEventsFromSampleData(eventsData) {
  return eventsData.map((eventData, index) => {
    const start = new Date(
      eventData.year,
      eventData.month,
      eventData.day,
      eventData.startHour,
      eventData.startMinute
    );
    const end = new Date(
      eventData.year,
      eventData.month,
      eventData.day,
      eventData.endHour,
      eventData.endMinute
    );

    const title = `${eventData.emoji} ${eventData.name}`;

    return {
      id: `sample_evt_${index}`,
      title,
      start,
      end,
      emoji: eventData.emoji,
      name: eventData.name,
      location: eventData.location,
      invite: eventData.invite,
      description: eventData.description,
    };
  });
}

// process sample messages data and get timestamps for dms
export function processMessagesFromSampleData(messagesData) {
  const now = getCurrentDate().getTime();

  return messagesData.map((dm) => {
    const lastMessageTime =
      dm.lastMessageTime instanceof Date
        ? dm.lastMessageTime
        : new Date(now + dm.lastMessageTimeOffset);

    const messages = dm.messages.map((message) => {
      const timestamp =
        message.timestamp instanceof Date
          ? message.timestamp
          : new Date(now + message.timestampOffset);

      return {
        author: message.author,
        text: message.text,
        type: message.type,
        eventId: message.eventId,
        event: message.event ? { ...message.event } : undefined,
        timestamp,
        response: message.response,
        responseTime:
          message.responseTime instanceof Date
            ? message.responseTime
            : undefined,
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
      lastMessageTime,
      messages,
    };
  });
}

// friends data already correct format
export function processFriendsFromSampleData(friendsData) {
  return friendsData.slice();
}

// buildings data already correct format
export function processBuildingsFromSampleData(buildingsData) {
  return buildingsData;
}
