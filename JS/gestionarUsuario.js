// JS enhancements for gestionarUsuario: small UX helpers
document.addEventListener('DOMContentLoaded', () => {
  // Auto-focus first input in create form
  const first = document.querySelector('#create-user-form input[name="username"]');
  if (first) { try { first.focus(); } catch(_) {} }

  // Simple filter by text across usernames and emails
  const header = document.querySelector('.topbar');
  if (header) {
    const filter = document.createElement('input');
    filter.type = 'search';
    filter.placeholder = 'Filtrar usuarios…';
    filter.style.marginLeft = '12px';
    filter.style.padding = '8px';
    filter.style.borderRadius = '8px';
    filter.style.border = '1px solid var(--border)';
    filter.style.background = 'var(--surface-2)';
    filter.style.color = 'var(--text)';
    header.appendChild(filter);

    filter.addEventListener('input', () => {
      const q = filter.value.toLowerCase();
      document.querySelectorAll('#users-list .card').forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(q) ? '' : 'none';
      });
    });
  }
});
