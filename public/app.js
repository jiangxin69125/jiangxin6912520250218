const form = document.querySelector('#echo-form');
const messageInput = document.querySelector('#message');
const tokenStatus = document.querySelector('#token-status');
const responseStatus = document.querySelector('#response-status');
const userStatus = document.querySelector('#user-status');
const logoutButton = document.querySelector('#logout-button');
const echoButton = document.querySelector('#echo-button');

let csrfToken = '';

function setStatus(element, message, state = '') {
  element.textContent = message;
  element.dataset.state = state;
}

async function fetchCsrfToken() {
  setStatus(tokenStatus, 'Fetching...', 'loading');

  const response = await fetch('/csrf-token', {
    credentials: 'same-origin',
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`GET /csrf-token returned ${response.status}`);
  }

  const data = await response.json();
  csrfToken = data.csrfToken;
  echoButton.disabled = false;
  logoutButton.disabled = false;
  setStatus(tokenStatus, `${csrfToken.slice(0, 12)}...`, 'ready');
}

async function fetchCurrentUser() {
  const response = await fetch('/me', {
    credentials: 'same-origin',
    headers: {
      accept: 'application/json',
    },
  });

  if (response.status === 401) {
    window.location.assign('/');
    return;
  }

  if (!response.ok) {
    throw new Error(`GET /me returned ${response.status}`);
  }

  const data = await response.json();
  setStatus(userStatus, `Signed in as ${data.username}`, 'ready');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!csrfToken) {
    setStatus(responseStatus, 'CSRF token is not ready', 'error');
    return;
  }

  setStatus(responseStatus, 'Submitting...', 'loading');

  try {
    const response = await fetch('/echo', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ message: messageInput.value }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `POST /echo returned ${response.status}`);
    }

    setStatus(responseStatus, data.message, 'ready');
  } catch (error) {
    setStatus(responseStatus, error.message, 'error');
  }
});

logoutButton.addEventListener('click', async () => {
  if (!csrfToken) {
    setStatus(responseStatus, 'CSRF token is not ready', 'error');
    return;
  }

  const response = await fetch('/logout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    body: '{}',
  });

  if (response.ok) {
    window.location.assign('/');
    return;
  }

  const data = await response.json();
  setStatus(responseStatus, data.error || `POST /logout returned ${response.status}`, 'error');
});

Promise.all([fetchCsrfToken(), fetchCurrentUser()]).catch((error) => {
  setStatus(tokenStatus, error.message, 'error');
});
