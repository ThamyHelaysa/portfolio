// self.addEventListener('install', function(e) {
//   self.skipWaiting();
//   e.waitUntil(
//     caches.open('airhorner').then(function(cache) {
//       return cache.addAll([
//       '/proj1',
//       '/tcc',
//       '/index.html',
//       '/scripts/index.js',
//       '/scripts/router.js',
//       '/scripts/utils.js',
//       '/css/main.css',
//       '/css/variables.css',
//       '/media/dadaismo.png',
//       '/media/teste-imagem.jpg',
//       'https://fonts.googleapis.com/css?family=PT+Serif:400,400i,700,700i&display=swap',
//       'https://fonts.googleapis.com/css?family=Poppins:400,700&display=swap'
//       ]);
//     })
//   );
// });

// self.addEventListener('activate', event => {
//   console.log('Service worker activating...');
// });

// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     caches.match(event.request).then(function(response) {
//       return response || fetch(event.request);
//     })
//   );
// });