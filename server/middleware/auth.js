import { HttpError, parseCookies } from "../http.js";

export function createAuthMiddleware(auth) {
  async function requireUser(request) {
    const user = await auth.authenticate(parseCookies(request).portfolio_session);
    if (!user) throw new HttpError(401, "Debes iniciar sesión.");
    if (user.status === "suspended") {
      throw new HttpError(403, "Esta cuenta está suspendida.");
    }
    return user;
  }

  function requireRole(user, roles) {
    if (!roles.includes(user.role)) {
      throw new HttpError(403, "No tienes permisos para realizar esta acción.");
    }
  }

  return { requireUser, requireRole };
}
