import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, of } from 'rxjs';
import { AuthService } from './auth.service';

const whenLoaded = () => {
  const auth = inject(AuthService);
  return auth.loaded() ? of(auth.user()) : auth.refresh();
};

/** Signed-in users only; otherwise go to sign-in and come back. */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return whenLoaded().pipe(
    map((user) => (user ? true : router.createUrlTree(['/account/login'], { queryParams: { next: state.url } }))),
  );
};

export const adminGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return whenLoaded().pipe(
    map((user) =>
      user?.role === 'admin'
        ? true
        : router.createUrlTree(user ? ['/'] : ['/account/login'], { queryParams: user ? {} : { next: state.url } }),
    ),
  );
};
