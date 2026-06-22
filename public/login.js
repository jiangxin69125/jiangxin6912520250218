const loginForm = document.querySelector('#login-form');
const usernameInput = document.querySelector('#username');
const passwordInput = document.querySelector('#password');
const loginButton = document.querySelector('#login-button');
const loginStatus = document.querySelector('#login-status');

let csrfToken = '';

function setLoginStatus(message, state = '') {
  loginStatus.textContent = message;
  loginStatus.dataset.state = state;
}

async function fetchCsrfToken() {
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
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setLoginStatus('Signing in...', 'loading');

  try {
    const response = await fetch('/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({
        username: usernameInput.value,
        password: passwordInput.value,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `POST /login returned ${response.status}`);
    }

    window.location.assign(data.redirectTo || '/demo');
  } catch (error) {
    setLoginStatus(error.message, 'error');
  }
});

fetchCsrfToken()
  .then(() => {
    loginButton.disabled = false;
    setLoginStatus('Ready to login', 'ready');
  })
  .catch((error) => setLoginStatus(error.message, 'error'));
