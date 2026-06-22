const { JSDOM } = require('jsdom');

function setupDOM() {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <form id="login-form">
          <input id="username" type="text" value="" />
          <input id="password" type="password" value="" />
          <button type="submit">Login</button>
        </form>
        <div id="message"></div>
      </body>
    </html>
  `, { url: 'http://localhost' });

  return dom;
}

function loadScript(dom) {
  const scriptContent = `
    const form = document.getElementById('login-form');
    const message = document.getElementById('message');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      message.textContent = '';
      message.classList.remove('success');

      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          message.textContent = data.error || 'Login failed';
          return;
        }

        message.classList.add('success');
        message.textContent = 'Welcome, ' + data.user.username + '!';
        localStorage.setItem('token', data.token);
      } catch (err) {
        message.textContent = 'Network error. Please try again.';
      }
    });
  `;

  const scriptEl = dom.window.document.createElement('script');
  scriptEl.textContent = scriptContent;
  dom.window.document.body.appendChild(scriptEl);
}

async function submitForm(dom) {
  const form = dom.window.document.getElementById('login-form');
  const event = new dom.window.Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(event);
  // Allow microtasks/promises to resolve
  await new Promise(resolve => setTimeout(resolve, 50));
}

describe('Login page', () => {
  let dom;
  let fetchMock;

  beforeEach(() => {
    dom = setupDOM();

    fetchMock = jest.fn();
    dom.window.fetch = fetchMock;

    dom.window.localStorage.clear();

    loadScript(dom);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('happy path: successful login displays welcome message and stores token', async () => {
    dom.window.document.getElementById('username').value = 'testuser';
    dom.window.document.getElementById('password').value = 'password123';

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { username: 'testuser' }, token: 'abc123' }),
    });

    await submitForm(dom);

    const message = dom.window.document.getElementById('message');
    expect(message.textContent).toBe('Welcome, testuser!');
    expect(message.classList.contains('success')).toBe(true);
    expect(dom.window.localStorage.getItem('token')).toBe('abc123');
  });

  test('error path: invalid credentials shows error message from server', async () => {
    dom.window.document.getElementById('username').value = 'wronguser';
    dom.window.document.getElementById('password').value = 'wrongpass';

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid username or password' }),
    });

    await submitForm(dom);

    const message = dom.window.document.getElementById('message');
    expect(message.textContent).toBe('Invalid username or password');
    expect(message.classList.contains('success')).toBe(false);
    expect(dom.window.localStorage.getItem('token')).toBeNull();
  });

  test('error path: network failure shows network error message', async () => {
    dom.window.document.getElementById('username').value = 'testuser';
    dom.window.document.getElementById('password').value = 'password123';

    fetchMock.mockRejectedValueOnce(new Error('Network failure'));

    await submitForm(dom);

    const message = dom.window.document.getElementById('message');
    expect(message.textContent).toBe('Network error. Please try again.');
    expect(message.classList.contains('success')).toBe(false);
  });

  test('edge case: server error with no error field falls back to "Login failed"', async () => {
    dom.window.document.getElementById('username').value = 'testuser';
    dom.window.document.getElementById('password').value = 'password123';

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    await submitForm(dom);

    const message = dom.window.document.getElementById('message');
    expect(message.textContent).toBe('Login failed');
    expect(message.classList.contains('success')).toBe(false);
  });

  test('edge case: previous success message and class are cleared on new submission attempt', async () => {
    const message = dom.window.document.getElementById('message');
    message.textContent = 'Welcome, olduser!';
    message.classList.add('success');

    dom.window.document.getElementById('username').value = 'testuser';
    dom.window.document.getElementById('password').value = 'wrongpass';

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    });

    await submitForm(dom);

    expect(message.textContent).toBe('Invalid credentials');
    expect(message.classList.contains('success')).toBe(false);
  });

  test('edge case: token is stored in localStorage on successful login', async () => {
    dom.window.document.getElementById('username').value = 'adminuser';
    dom.window.document.getElementById('password').value = 'securepass';

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { username: 'adminuser' }, token: 'token-xyz-789' }),
    });

    await submitForm(dom);

    expect(dom.window.localStorage.getItem('token')).toBe('token-xyz-789');
    const message = dom.window.document.getElementById('message');
    expect(message.textContent).toBe('Welcome, adminuser!');
  });
});