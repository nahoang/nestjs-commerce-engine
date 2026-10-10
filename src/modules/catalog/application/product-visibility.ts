import type { Role } from '../../account/domain/role';

/** Who is looking: the caller's role, or null for an anonymous visitor. */
export type Viewer = Role | null;

/**
 * Visibility policy for products (DOMAIN-SPEC-2-AUTH § 2.4 R3/R4): staff and
 * admin see drafts too; visitors and customers see published products only.
 */
export function canSeeDrafts(viewer: Viewer): boolean {
  return viewer === 'staff' || viewer === 'admin';
}
