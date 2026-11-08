export function adminAccess(isAdmin: boolean): 'allowed' | 'not-found' {
  return isAdmin ? 'allowed' : 'not-found';
}
