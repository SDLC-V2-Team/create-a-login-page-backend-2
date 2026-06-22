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
    message.textContent = `Welcome, ${data.user.username}!`;
    // Token is also set as an httpOnly cookie by the server.
    localStorage.setItem('token', data.token);
  } catch (err) {
    message.textContent = 'Network error. Please try again.';
  }
});
