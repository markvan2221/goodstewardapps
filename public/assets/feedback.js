const form = document.querySelector('[data-feedback-form]');
const statusEl = document.querySelector('[data-feedback-status]');

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    if (!data.name || !data.rating || !data.comment) {
      statusEl.textContent = 'Please add your name, rating and feedback before sending.';
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    statusEl.textContent = 'Sending…';

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email || '',
          rating: data.rating,
          comment: data.comment,
          company: data.company || '', // honeypot — leave blank
        }),
      });
      if (!res.ok) throw new Error('send failed');
      form.reset();
      statusEl.textContent = 'Thanks — your feedback has been sent!';
    } catch {
      statusEl.textContent =
        'Sorry, that didn’t send. Please email feedback@goodstewardapps.com instead.';
    } finally {
      button.disabled = false;
    }
  });
}
