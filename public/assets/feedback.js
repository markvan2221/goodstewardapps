const form = document.querySelector('[data-feedback-form]');
const statusEl = document.querySelector('[data-feedback-status]');
if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    statusEl.textContent = 'Sending your feedback...';
    const data = Object.fromEntries(new FormData(form).entries());
    data.rating = Number(data.rating);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Feedback could not be saved.');
      form.reset();
      statusEl.textContent = 'Thank you — your feedback has been saved.';
    } catch (error) {
      statusEl.textContent = error.message || 'Sorry, something went wrong. Please email feedback@goodstewardapps.com.';
    }
  });
}
