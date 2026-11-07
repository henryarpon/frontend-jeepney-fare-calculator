export const environment = {
  /** Base URL of the back-end API. The dev server proxies `/api` to it (see `proxy.conf.json`). */
  apiBaseUrl: '/api',

  /** Photon place search, called straight from the browser. */
  photonBaseUrl: 'https://photon.komoot.io',

  /**
   * OpenStreetMap's standard map tiles, loaded straight from the browser. Their use
   * policy requires the attribution the map shows, and allows light use only.
   */
  mapTilesUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
};
