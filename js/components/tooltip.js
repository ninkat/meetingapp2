// not really a component, more like a 'give everything a tooltip'. however it works nice so i might not change it
// we eventually swapped to global components for the other three components
const Tooltip = {
  // for all elements with data-tooltip attribute, attach a tooltip
  init(container = document) {
    const elements = container.querySelectorAll('[data-tooltip]');
    elements.forEach((element) => {
      this.attachTooltip(element);
    });
  },

  // attach tooltip to a single element
  attachTooltip(element) {
    const tooltipText = element.getAttribute('data-tooltip');
    if (!tooltipText) return;

    // default is right, override with tooltip direction IFY
    const direction = element.getAttribute('data-tooltip-direction') || 'right';

    const tooltip = document.createElement('div');
    tooltip.className = `tooltip tooltip-${direction}`;
    tooltip.textContent = tooltipText;
    document.body.appendChild(tooltip);

    let tooltipTimeout;

    // show on hover
    element.addEventListener('mouseenter', () => {
      clearTimeout(tooltipTimeout);
      const rect = element.getBoundingClientRect();

      switch (direction) {
        case 'above':
          tooltip.style.left = `${rect.left + rect.width / 2}px`;
          tooltip.style.top = `${rect.top}px`;
          tooltip.style.transform = 'translate(-50%, -100%)';
          tooltip.style.marginTop = '-4px';
          break;
        case 'below':
          tooltip.style.left = `${rect.left + rect.width / 2}px`;
          tooltip.style.top = `${rect.bottom}px`;
          tooltip.style.transform = 'translate(-50%, 0)';
          tooltip.style.marginTop = '4px';
          break;
        case 'left':
          tooltip.style.left = `${rect.left}px`;
          tooltip.style.top = `${rect.top + rect.height / 2}px`;
          tooltip.style.transform = 'translate(-100%, -50%)';
          tooltip.style.marginRight = '4px';
          break;
        case 'right':
        default:
          tooltip.style.left = `${rect.right}px`;
          tooltip.style.top = `${rect.top + rect.height / 2}px`;
          tooltip.style.transform = 'translate(0, -50%)';
          tooltip.style.marginLeft = '4px';
          break;
      }

      tooltip.style.display = 'block';
      tooltip.offsetHeight;
      tooltip.style.opacity = '1';
    });

    // hide on mouse leave
    element.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
      tooltipTimeout = setTimeout(() => {
        tooltip.style.display = 'none';
      }, 200);
    });
  },
};

export default Tooltip;
