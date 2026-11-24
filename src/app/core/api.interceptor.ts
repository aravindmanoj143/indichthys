import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Marks state-changing API calls with the header the server requires.
 * Browsers can't add custom headers to cross-site form posts, so this blocks CSRF.
 */
export const apiHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/api/') && !['GET', 'HEAD'].includes(req.method)) {
    return next(req.clone({ setHeaders: { 'x-indichthys': '1' } }));
  }
  return next(req);
};
