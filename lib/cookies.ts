// Helper cookie phía client (module-scope để không vướng rule immutability).

const ONE_YEAR = 31536000;

export function setCookie(name: string, value: string, maxAge = ONE_YEAR): void {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0`;
}
