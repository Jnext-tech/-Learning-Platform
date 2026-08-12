/**
 * Restricts a route to a set of roles. Must run after requireAuth.
 * Usage: router.post('/', requireAuth, authorize('manager', 'teacher'), handler)
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.profile) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!allowedRoles.includes(req.profile.role)) {
      return res.status(403).json({
        error: `Forbidden: requires role ${allowedRoles.join(" or ")}`,
      });
    }
    next();
  };
}
