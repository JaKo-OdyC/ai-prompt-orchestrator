export type Role = "admin" | "editor" | "viewer";
export type AuthContext = { userId: string; role: Role; source?: string };

export class AuthError extends Error {
  constructor(message: string){ super(message); this.name = "AuthError"; }
}

export function requireRole(ctx: AuthContext, allowed: Role[]) {
  if (!allowed.includes(ctx.role)) throw new AuthError(`FORBIDDEN: role ${ctx.role}`);
}

export function canRead(role: Role){ return role === "admin" || role === "editor" || role === "viewer"; }
export function canWrite(role: Role){ return role === "admin" || role === "editor"; }
export function canAdmin(role: Role){ return role === "admin"; }

export function createAuthMiddleware(getUserAuth: (req:any)=>AuthContext|null){
  return (req:any,res:any,next:any)=>{
    try { const auth = getUserAuth(req); if(!auth) return res.status(401).json({error:"UNAUTHORIZED"}); req.auth = auth; next(); }
    catch { res.status(401).json({error:"INVALID_AUTH"}); }
  };
}
