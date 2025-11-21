// hash-based routing (why user will get cors error if they are not using the correct browser flags)
// this is apparently how hash routing works
import MapPage from './pages/map.js';
import CalendarPage from './pages/calendar.js';
import MessagesPage from './pages/messages.js';
import Snackbar from './components/snackbar.js';

const Router = {
  container: null,

  // if we are in hash X, we render the page X
  routes: {
    '#map': () => MapPage.init(),
    '#calendar': () => CalendarPage.init(),
    '#messages': () => MessagesPage.init(),
  },

  // initialize the router
  init(container) {
    this.container = container;
    // when hash changes, render new page
    window.addEventListener('hashchange', () => this.render());
    this.render();
  },

  // render the current page based on hash
  render() {
    const currentHash = window.location.hash || '#map';
    const route = this.routes[currentHash] || this.routes['#map'];

    // hide snackbar when switching pages to avoid edge cases (unresolved bug that's beyond our scope)
    Snackbar.hide();

    document.querySelectorAll('.navbar-link').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === currentHash);
    });

    route();
  },
};

export default Router;
