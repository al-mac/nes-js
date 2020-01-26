var dataCacheName = 'nes-v1';
var cacheName = 'nesPWA-1';
var filesToCache = [
  '../index.html',
  '../emu/apu.js',
  '../emu/cpu.js',
  '../emu/dbg.js',
  '../emu/mmu.js',
  '../emu/mpr.js',
  '../emu/nes.js',
  '../emu/ppu.js',
  '../web/main.js',
  '../web/site.css'
 ];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== cacheName && key !== dataCacheName) {
          return caches.delete(key);
        }
      }));
    })
  );
 
  return self.clients.claim();
});
