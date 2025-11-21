// navbar component. always visible, at highest level
const Navbar = {
  // fake user data
  userData: {
    username: 'John Doe',
    status: 'Active',
    initials: 'JD',
  },
  profileMenuOpen: false,

  init() {
    // put navbar in its designated home
    const container = document.getElementById('navbar-container');
    if (!container) return;

    container.innerHTML = `
      <nav class="navbar">
        <div class="navbar-content">
          <ul class="navbar-menu">
            <li class="navbar-item">
              <a href="#map" class="navbar-link" data-page="map">
                <span class="navbar-icon">🗺️</span>
                <span class="navbar-text">Map</span>
              </a>
            </li>
            <li class="navbar-item">
              <a href="#calendar" class="navbar-link" data-page="calendar">
                <span class="navbar-icon">📅</span>
                <span class="navbar-text">Calendar</span>
              </a>
            </li>
            <li class="navbar-item">
              <a href="#messages" class="navbar-link" data-page="messages">
                <span class="navbar-icon">💬</span>
                <span class="navbar-text">Messages</span>
              </a>
            </li>
            <li class="navbar-item">
              <span class="navbar-link" data-tooltip="Not implemented">
                <span class="navbar-icon">🔔</span>
                <span class="navbar-text">Activity</span>
              </span>
            </li>
          </ul>
        </div>
        <div class="navbar-profile">
          <button class="navbar-profile-button" id="profile-button">
            <div class="navbar-profile-picture">${this.userData.initials}</div>
            <span class="navbar-profile-status"></span>
          </button>
          <div class="navbar-profile-menu" id="profile-menu">
            <div class="navbar-profile-menu-header">
              <div class="navbar-profile-menu-picture">${this.userData.initials}</div>
              <div class="navbar-profile-menu-info">
                <div class="navbar-profile-menu-username">${this.userData.username}</div>
                <div class="navbar-profile-menu-status">
                  <span class="navbar-profile-menu-status-dot"></span>
                  <span>Online</span>
                </div>
              </div>
            </div>
            <div class="navbar-profile-menu-actions">
              <button class="navbar-profile-menu-action" data-tooltip="Not implemented" data-tooltip-direction="above">
                <span>Update your status</span>
              </button>
              <button class="navbar-profile-menu-action" data-tooltip="Not implemented" data-tooltip-direction="above">
                <span>Set yourself as away</span>
              </button>
              <button class="navbar-profile-menu-action" data-tooltip="Not implemented" data-tooltip-direction="above">
                <span>Pause notifications</span>
                <span style="margin-left: auto; color: #57606a;">›</span>
              </button>
            </div>
            <div class="navbar-profile-menu-divider"></div>
            <a href="#" class="navbar-profile-menu-link" data-tooltip="Not implemented" data-tooltip-direction="above">Profile</a>
            <div class="navbar-profile-menu-divider"></div>
            <button class="navbar-profile-menu-action" data-tooltip="Not implemented" data-tooltip-direction="above">
              <span>Log out</span>
            </button>
          </div>
        </div>
      </nav>
    `;

    this.setupEventListeners();
  },

  // event listeners for (not implemented) profile menu
  setupEventListeners() {
    const profileButton = document.getElementById('profile-button');
    const profileMenu = document.getElementById('profile-menu');

    if (profileButton && profileMenu) {
      // toggle menu on button click
      profileButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.profileMenuOpen = !this.profileMenuOpen;
        if (this.profileMenuOpen) {
          profileMenu.classList.add('active');
        } else {
          profileMenu.classList.remove('active');
        }
      });

      // also close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (
          !profileMenu.contains(e.target) &&
          !profileButton.contains(e.target)
        ) {
          this.profileMenuOpen = false;
          profileMenu.classList.remove('active');
        }
      });

      // prevent default on menu items
      // TODO: is this our default 'not implemented' behavor?
      const menuActions = profileMenu.querySelectorAll(
        '.navbar-profile-menu-action, .navbar-profile-menu-link'
      );
      menuActions.forEach((action) => {
        action.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      });
    }
  },
};

export default Navbar;
