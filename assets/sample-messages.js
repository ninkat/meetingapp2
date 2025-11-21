// sample messages and friends data for prototype

const SAMPLE_MESSAGES_DATA = [
  {
    id: 'alice',
    name: 'Alice',
    type: 'user',
    avatar: 'A',
    status: 'online',
    members: ['alice'],
    lastMessage: 'Hey! How are you doing?',
    lastMessageTimeOffset: -2 * 60 * 60 * 1000,
    messages: [
      {
        author: 'Alice',
        text: 'Hey! How are you doing?',
        timestampOffset: -2 * 60 * 60 * 1000,
      },
    ],
  },
  {
    id: 'bob',
    name: 'Bob',
    type: 'user',
    avatar: 'B',
    status: 'offline',
    members: ['bob'],
    lastMessage: 'Thanks for the update!',
    lastMessageTimeOffset: -5 * 60 * 60 * 1000,
    messages: [
      {
        author: 'Bob',
        text: 'Thanks for the update!',
        timestampOffset: -5 * 60 * 60 * 1000,
      },
    ],
  },
  {
    id: 'charlie',
    name: 'Charlie',
    type: 'user',
    avatar: 'C',
    status: 'online',
    members: ['charlie'],
    lastMessage: 'See you at the meeting!',
    lastMessageTimeOffset: -24 * 60 * 60 * 1000, 
    messages: [
      {
        author: 'Charlie',
        text: 'See you at the meeting!',
        timestampOffset: -24 * 60 * 60 * 1000,
      },
    ],
  },
  {
    id: 'david',
    name: 'David',
    type: 'user',
    avatar: 'D',
    status: 'online',
    members: ['david'],
    lastMessage: 'Good catch on that bug!',
    lastMessageTimeOffset: -3 * 24 * 60 * 60 * 1000, 
    messages: [
      {
        author: 'David',
        text: 'Good catch on that bug!',
        timestampOffset: -3 * 24 * 60 * 60 * 1000,
      },
    ],
  },
  {
    id: 'project-chat',
    name: 'Project Chat',
    type: 'group',
    avatar: 'PC',
    status: null,
    members: ['alice', 'bob'],
    lastMessage: "Alice: Let's schedule the next sprint",
    lastMessageTimeOffset: -12 * 60 * 60 * 1000,
    messages: [
      {
        author: 'Alice',
        text: "Let's schedule the next sprint",
        timestampOffset: -12 * 60 * 60 * 1000,
      },
      {
        author: 'Bob',
        text: "Sounds good, I'll check my calendar",
        timestampOffset: -11 * 60 * 60 * 1000,
      },
    ],
  },
  {
    id: 'elaine',
    name: 'Elaine',
    type: 'user',
    avatar: 'E',
    status: 'online',
    members: ['elaine'],
    lastMessage: 'The research looks promising',
    lastMessageTimeOffset: -7 * 24 * 60 * 60 * 1000,
    messages: [
      {
        author: 'Elaine',
        text: 'The research looks promising',
        timestampOffset: -7 * 24 * 60 * 60 * 1000,
      },
    ],
  },
  {
    id: 'francesca',
    name: 'Francesca',
    type: 'user',
    avatar: 'F',
    status: 'dnd',
    members: ['francesca'],
    lastMessage: 'Can you review this paper?',
    lastMessageTimeOffset: -10 * 24 * 60 * 60 * 1000,
    messages: [
      {
        author: 'Francesca',
        text: 'Can you review this paper?',
        timestampOffset: -10 * 24 * 60 * 60 * 1000,
      },
    ],
  },
  {
    id: 'research-group',
    name: 'Research Group',
    type: 'group',
    avatar: 'RG',
    status: null,
    members: ['elaine', 'francesca'],
    lastMessage: 'Elaine: We should present next week',
    lastMessageTimeOffset: -14 * 24 * 60 * 60 * 1000, 
    messages: [
      {
        author: 'Elaine',
        text: 'We should present next week',
        timestampOffset: -14 * 24 * 60 * 60 * 1000,
      },
      {
        author: 'Francesca',
        text: "Agreed! I'll prepare the slides",
        timestampOffset: -13 * 24 * 60 * 60 * 1000,
      },
    ],
  },
];
