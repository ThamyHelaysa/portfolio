self.addEventListener('install', function(e) {
 e.waitUntil(
   caches.open('airhorner').then(function(cache) {
     return cache.addAll([
       '/index.html',
       '/scripts/index.js',
       '/scripts/router.js',
       '/scripts/utils.js',
       '/css/main.css',
       '/css/variables.css',
       '/media/dadaismo.png',
       '/media/teste-imagem.jpg'
     ]);
   })
 );
});