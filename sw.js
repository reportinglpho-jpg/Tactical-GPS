const CACHE_NAME = 'tactical-gps-cache-v1';
const TILE_CACHE_NAME = 'tactical-tiles-cache-v1';

const assetsToCache = [
  './',
  './index.html',
  './gps.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
];

// ติดตั้ง Service Worker และแคชไฟล์หลัก
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assetsToCache);
    })
  );
  self.skipWaiting();
});

// เปิดใช้งานและลบแคชเก่า
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== TILE_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clientsClaim();
});

// ดักจับการเรียกข้อมูล (Cache First สำหรับไฟล์หลัก, Network First พร้อมเก็บบันทึกสำหรับแผนที่)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ถ้าระบบเรียกใช้งานภาพแผนที่ (Map Tiles)
  if (url.href.includes('arcgisonline.com') || url.href.includes('openstreetmap.org')) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
            // หากไม่มีเน็ตและไม่มีในแคช ให้ข้าม
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // สำหรับไฟล์ทั่วไปในระบบ
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});