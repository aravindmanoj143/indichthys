import { HttpInterceptorFn } from '@angular/common/http';
import { API_BASE } from './api-base';

/**
 * Marks state-changing API calls with the header the server requires.
 * Browsers can't add custom headers to cross-site form posts, so this blocks CSRF.
 */
export const apiHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);
  const write = !['GET', 'HEAD'].includes(req.method);
  return next(
    req.clone({
      url: API_BASE + req.url,
      // Cross-origin (GitHub Pages → Render): send the session cookie.
      withCredentials: API_BASE !== '' || req.withCredentials,
      setHeaders: write ? { 'x-indichthys': '1' } : {},
    }),
  );
};
