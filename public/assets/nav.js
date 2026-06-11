// Progressive enhancement for the nav "Apps" dropdown (a native <details>).
// Closes any open dropdown when clicking outside it or pressing Escape.
// Without JS the dropdown still opens/closes on click via <details>.
document.addEventListener('click', (event) => {
  document.querySelectorAll('details.dropdown[open]').forEach((d) => {
    if (!d.contains(event.target)) d.removeAttribute('open');
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    document.querySelectorAll('details.dropdown[open]').forEach((d) => d.removeAttribute('open'));
  }
});
