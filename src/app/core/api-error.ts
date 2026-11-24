import { HttpErrorResponse } from '@angular/common/http';

function body401(err: HttpErrorResponse): string {
  return (err.error as { error?: string } | null)?.error ?? 'Please sign in.';
}

/** Readable message from an API error, including validation issues. */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 401) return body401(err);
    if (err.status === 0 || err.status === 502 || err.status === 504) {
      return 'Cannot reach the Indichthys API. Start it with “npm run api”.';
    }
    // 200 but not JSON: the dev server answered with index.html, i.e. /api isn't proxied.
    if (err.ok === false && err.status === 200) {
      return 'The API returned a web page instead of data. Restart “npm start” so the /api proxy is active, and make sure “npm run api” is running.';
    }
    if (err.status === 500 && typeof err.error === 'string' && err.error.includes('ECONNREFUSED')) {
      return 'Cannot reach the Indichthys API. Start it with “npm run api”.';
    }
    const body = err.error as { error?: string; issues?: { path: string; message: string }[] } | null;
    if (body?.issues?.length) return body.issues.map((i) => `${i.path}: ${i.message}`).join('; ');
    if (body?.error) return body.error;
    return `Request failed (${err.status}).`;
  }
  return 'Something went wrong.';
}

