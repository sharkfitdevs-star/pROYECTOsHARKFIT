// Endpoints centrados en esta app landing. Solo extractor por ahora.
export const API_ENDPOINTS = {
  EXTRACTOR: {
    CONFIG:  '/extractor/config',
    RUN:     '/extractor/run',
    DISCOVER: '/extractor/discover',
    PREVIEW: '/extractor/preview',
    RUN_SELECTIVE: '/extractor/run-selective',
    RESOLVE: '/extractor/resolve',
    STATUS:  (jobId) => `/extractor/status/${jobId}`,
    LOGS:    '/extractor/logs',
  },
};    