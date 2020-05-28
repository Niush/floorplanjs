/**
 * Version: 0.0.0.1
 */

const STATIC_CACHE = 'STATIC_CACHE_V1'
const FONT_CACHE = 'FONT_CACHE'
const OLD_CACHE = []
const OFFLINE_ERROR_RESPONSE = {'data':'', 'error':'No Internet Connection Available'}
const assets = [
    '/',
    '/jquery.min.js',
    '/bootstrap.min.js',
    '/mousewheel.js',
    '/func.js',
    '/qSVG.js',
    '/editor.js',
    '/engine.js',
    '/bootstrap.min.css',
    '/style.css',
    '/patterns/granite.jpg', '/patterns/grass.jpg', '/patterns/tiles.jpg', '/patterns/wood.jpg', 
    '/patterns/check.png', '/patterns/favicon.jpg', '/patterns/grab.png', '/patterns/scissor.png', '/patterns/trash.png',  
]

console.log('Service Woker First Installation Initialized')

self.addEventListener('install', evt => {
    // Precache static asset files
    evt.waitUntil(
        caches.open(STATIC_CACHE)
        .then(cache => {
            cache.addAll(assets).then(res => {
                console.log('sw is installed')
                console.log('prefetch cache OK')
            })
            // Skip Waiting and force activate this new installed service worker
            // This will redundant old serviceworker
            self.skipWaiting()
        })
    );
})

self.addEventListener('activate', evt => {
    let cacheWhiteList = [STATIC_CACHE, FONT_CACHE]
    let cacheCleared = 0
    evt.waitUntil(
        // USEFUL TO DELETE OLD CACHE //
        caches.keys()
            .then(names => {
                Promise.all(
                    names.map(cacheName => {
                        if(cacheWhiteList.indexOf(cacheName) === -1){
                            cacheCleared += 1
                            return caches.delete(cacheName)
                        }
                    })
                ).then(res => {
                    console.log(`${cacheCleared} Old Cache Cleared...`)
                }).catch(err => {
                    console.log('Cache deletion failing...')
                })

                // After our new Service Worker is Activated (old possible redundant) we can claim all the clients
                self.clients.claim()
            })
    )
})

// HELPER FUNCTION TO CACHE, RETURN, CHECK FETCH EVENTS REQUESTS, TTL re-fetch cache (evt=fetch event, clonedReq=evt.request.clone(), cache_type=STATIC_CACHE, hours=12)
// Re-Fetch and Delete cache only if internet is OK navigator.onLine and fetch was success with 200 //
function handleCacheAndRequest(evt,clonedReq,cache_type,hours=24){
    // console.log(clonedReq)
    let clearCache = false;
    return evt.respondWith(new Promise((resolve, reject) => {
        // FETCH FROM CACHE FOR FROM SERVER if/else
        caches.match(evt.request.clone()).then(function(cachedRes) {
            // If cache found
            if(cachedRes){
                console.log('asset from cache...')
                // console.log(evt.request.clone())
                try{
                    let cached_at = new Date(cachedRes.clone().headers.get('date').replace(',','').split(/,/)[0])
                    let now = new Date()
                    if(Math.floor((now - cached_at) / (1000*60*60)) > hours){ // IF CACHE IS > hours(from param) old delete it
                        clearCache = true; // if true clears only if internet is OK and fetch is good
                    }else{
                        resolve(cachedRes)
                        return;
                    }
                }catch(e){
                    resolve(cachedRes)
                    return;
                }
            }
            // Else goes here
            fetch(clonedReq).then(res => {
                // If response from server was 200 then cache and resolve else only resolve
                if(res.status == 200){
                    if(clearCache && navigator.onLine){ // If clearCache is true (expired) and internet is OK then delete (also response is already 200 from fetch)
                        caches.delete(evt.request.clone()).then(function(r) {
                            console.log('Old asset cache was deleted')
                        });
                    }

                    // CACHE THE RESPONSE
                    caches.open(cache_type)
                        .then(cache => {
                            cache.put(evt.request.clone(), res.clone())
                            console.log('asset cache updated')
                            resolve(res)
                            return;
                        })
                }else{
                    resolve(res)
                    return;
                }
            }).catch(e => {
                reject(e)
                return;
            })
        });
    }))
}

self.addEventListener('fetch', evt => {
    const clonedReq = evt.request.clone()
    const url = new URL(clonedReq.url)

    if(assets.indexOf(url.pathname) > -1){ // if is in asset
        return handleCacheAndRequest(evt,clonedReq,STATIC_CACHE,336) //ttl 336 hrs (14 days)
    }
    else if (/fonts.(googleapis|gstatic).com/.test(url.href || /font-awesome.css/.test(url.href))) { // if is google static, font awesome fonts css or woff,ttf etc files //
        return handleCacheAndRequest(evt,clonedReq,FONT_CACHE,2880) //ttl 2880 hrs (120 days)
    }
})