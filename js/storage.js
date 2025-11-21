// global storage that persists with page switches but resets on refresh
// loads initial data from assets folder on initialization
// if a function is commented out it means we don't use it anywhere

import {
  processEventsFromSampleData,
  processMessagesFromSampleData,
  processFriendsFromSampleData,
  processBuildingsFromSampleData,
} from './utils/loaddata.js';

const GlobalStorage = {
  data: {
    events: [],
    messages: [],
    buildings: null,
    friends: [],
    lastEvent: null,
  },
  // subscribers for event changes
  // edit: abandoned pubsub
  // eventsSubscribers: [],

  // initialize storage with sample data from assets
  init() {
    if (typeof SAMPLE_EVENTS_DATA !== 'undefined') {
      const events = processEventsFromSampleData(SAMPLE_EVENTS_DATA);
      this.data.events = events;
    }

    if (typeof SAMPLE_MESSAGES_DATA !== 'undefined') {
      const messages = processMessagesFromSampleData(SAMPLE_MESSAGES_DATA);
      this.data.messages = messages;
    }

    if (typeof SAMPLE_FRIENDS_DATA !== 'undefined') {
      const friends = processFriendsFromSampleData(SAMPLE_FRIENDS_DATA);
      this.data.friends = friends;
    }

    if (typeof BUILDING_LOCATIONS_DATA !== 'undefined') {
      const buildings = processBuildingsFromSampleData(BUILDING_LOCATIONS_DATA);
      this.data.buildings = buildings;
    }

    console.log(this.data);
  },

  // OG getters and setters (not used no more)
  /*
  get(key) {
    return this.data[key];
  },
  */
  /*
  set(key, value) {
    this.data[key] = value;
  },
  */
  
  getEvents() {
    return Array.isArray(this.data.events) ? this.data.events.slice() : [];
  },

  setEvents(events) {
    this.data.events = Array.isArray(events) ? events.slice() : [];
  },

  getMessages() {
    return Array.isArray(this.data.messages) ? this.data.messages.slice() : [];
  },

  setMessages(messages) {
    this.data.messages = Array.isArray(messages) ? messages.slice() : [];
  },

  getBuildings() {
    return this.data.buildings;
  },

  /*
  setBuildings(buildings) {
    this.data.buildings = buildings || null;
  },
  */

  getFriends() {
    return Array.isArray(this.data.friends) ? this.data.friends.slice() : [];
  },

  // get the last event change metadata for undo
  getLastEvent() {
    return this.data.lastEvent || null;
  },

  // set the last event change metadata for undo
  setLastEvent(lastEvent) {
    this.data.lastEvent = lastEvent || null;
  },

  // clear the last event change metadata
  clearLastEvent() {
    this.data.lastEvent = null;
  },

  /*
  setFriends(friends) {
    this.data.friends = Array.isArray(friends) ? friends.slice() : [];
  },
  */

  /* abandoned pubsub
  // subscribe to event changes
  subscribeEvents(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }
    this.eventsSubscribers.push(callback);
    // return unsubscribe function
    return () => {
      const index = this.eventsSubscribers.indexOf(callback);
      if (index > -1) {
        this.eventsSubscribers.splice(index, 1);
      }
    };
  },
  */

  /*
  clear() {
    this.data.events = [];
    this.data.messages = [];
    this.data.buildings = null;
    this.data.friends = [];
  },
  */
};

export default GlobalStorage;
