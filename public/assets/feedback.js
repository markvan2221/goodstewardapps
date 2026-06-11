const form = document.querySelector('[data-feedback-form]');
const statusEl = document.querySelector('[data-feedback-status]');

function buildEmailBody(data) {
  return [
    'ScripturePicture feedback',
    '',
    `Name: ${data.name}`,
    `Email: ${data.email || 'Not provided'}`,
    `Rating: ${data.rating} out of 5`,
    '',
    'Feedback / suggestion:',
    data.comment
  ].join('\n');
}

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    if (!data.name || !data.rating || !data.comment) {
      statusEl.textContent = 'Please add your name, rating and feedback before sending.';
      return;
    }

    const subject = `ScripturePicture feedback - ${data.rating}/5`;
    const mailto = new URL('mailto:feedback@goodstewardapps.com');
    mailto.searchParams.set('subject', subject);
    mailto.searchParams.set('body', buildEmailBody(data));

    statusEl.textContent = 'Opening your email app so you can send the feedback.';
    window.location.href = mailto.toString();
  });
}
