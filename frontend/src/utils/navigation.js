// Leaves the app for an external address (a full page load). Kept separate so tests can replace it.
export const goTo = (url) => {
  window.location.href = url;
};
