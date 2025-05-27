import CASAuthentication from 'cas-authentication';

const cas = new CASAuthentication({
  cas_url: 'https://login.iiit.ac.in/cas',      // IIIT CAS server URL
  service_url: 'http://localhost:8000',         // Your backend domain (change in prod)
  cas_version: '3.0',                           // Usually 3.0 or 2.0 depending on CAS server
  renew: false,                                 // Whether to force re-auth
  is_dev_mode: false,                           // Set to true for development bypass
  dev_mode_user: '',                            // Set mock user if in dev mode
  dev_mode_info: {}
});

export default cas;
