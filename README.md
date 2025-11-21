# Project Overview
Download the project, then open index.html on a web browser.

## Third-party resources
This project uses the following open-source libraries:

- **[Leaflet](https://leafletjs.com/)** (v1.9.4) - For the interactive map
- **[FullCalendar](https://fullcalendar.io/)** (v6.1.15) - For the calendar functionality
- **[Three.js](https://threejs.org/)** (r128) - For the 3D rendering

This project also uses images/data from the following sources:
- **[OpenStreetMap](https://www.openstreetmap.org/)** - For the GeoJSON data (for the building vectors)
- **[Google Maps](https://www.google.com/maps)** - For location images. Individual links for each are too long, however they are the main images for UofM locations (ie Degrees, EITC, Elizabeth Dafoe Library)
- **[University of Manitoba Website](https://maps.umanitoba.ca/)** - For building images. Building images in prototype correspond to their counterpart on this website
- **[Google Gemini](https://gemini.google.com)** - For generating fake location reviews


## Code Structure
```
eventapp/
├─ index.html                        | click on this to access the app
├─ js/
│  ├─ app.js                         | boots global services (storage, navbar, snackbar, event modal, router)
│  ├─ router.js                      | hash-based single-page application router that mounts pages into #app-container
│  ├─ storage.js                     | global getter/setter store for events/messages/buildings/friends
│  ├─ eventManager.js                | events create/edit/delete/reschedule logic and logic with snackbar + undo
│  ├─ components/
│  │  ├─ navbar.js                   | vertical navbar
│  │  ├─ snackbar.js                 | snackbar controller for event notifications and undo
│  │  ├─ tooltip.js                  | tooltip
│  │  └─ eventmodal.js               | modal for creating and editing events
│  ├─ pages/
│  │  ├─ map.js                      | interactive campus map
│  │  ├─ calendar.js                 | calendar view
│  │  └─ messages.js                 | direct messaging
│  ├─ utils/
│  │  ├─ calendarutils.js            | helpers for calendar.js and eventmodal.js
│  │  ├─ maputils.js                 | helpers for map.js
│  │  ├─ messageutils.js             | helpers for event.js
│  └─ └─ 3dbuilding.js               | interactive three.js building for map.js
├─ css/
│  ├─ styles.css                     | global base styles
│  ├─ componentstyles/               | per-component css for global components (navbar, tooltip, snackbar, event modal)
│  └─ pagestyles/                    | page-specific css for map, calendar, messages
├─ assets/                           | sample data (events, messages, friends, buildings)
└─ vendor/                           | third-party libraries (leaflet, three, fullcalendar)
```
# meetingapp2
