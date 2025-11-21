// main application entry point. kind of like react
import Router from './router.js';
import Navbar from './components/navbar.js';
import Tooltip from './components/tooltip.js';
import GlobalStorage from './storage.js';
import Snackbar from './components/snackbar.js';
import EventModal from './components/eventmodal.js';
// EVENT AND MEETING ARE USED INTERCHANGEABLY IN THE CODEBASE. ITS JUST THAT I STARTED THE STORAGE/PROCESS AS EVENTS AND UI AS EVENTS
// update: changed entire codebase to refer to events instead of meetings. event is kind of an unfortunate name in javascript :/

document.addEventListener('DOMContentLoaded', () => {
  // three global components: snavbar, modal, and snackbar
  GlobalStorage.init();
  Navbar.init();

  // initialize tooltips for navbar
  Tooltip.init(document.getElementById('navbar-container'));

  Snackbar.init();

  const eventModalRoot = document.getElementById('event-modal-container');
  EventModal.init({
    container: eventModalRoot,
  });

  const container = document.getElementById('app-container');
  Router.init(container);
});
