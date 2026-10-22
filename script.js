const button = document.querySelector('#hello-button');
const message = document.querySelector('#message');

button.addEventListener('click', () => {
  message.textContent = 'Sikerült! A JavaScript is működik.';
});
