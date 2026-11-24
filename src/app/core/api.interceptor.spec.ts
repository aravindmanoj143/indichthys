import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiHeaderInterceptor } from './api.interceptor';

describe('apiHeaderInterceptor', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiHeaderInterceptor])), provideHttpClientTesting()],
    }),
  );

  it('adds the CSRF header to API writes only', () => {
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);
    http.post('/api/x', {}).subscribe();
    http.get('/api/x').subscribe();
    http.post('https://api.crossref.org/x', {}).subscribe();
    const [post, get, external] = [
      ctrl.expectOne((r) => r.method === 'POST' && r.url === '/api/x'),
      ctrl.expectOne((r) => r.method === 'GET'),
      ctrl.expectOne((r) => r.url.startsWith('https://')),
    ];
    expect(post.request.headers.get('x-indichthys')).toBe('1');
    expect(get.request.headers.has('x-indichthys')).toBe(false);
    expect(external.request.headers.has('x-indichthys')).toBe(false);
  });
});
