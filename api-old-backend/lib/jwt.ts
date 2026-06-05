import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.APP_SECRET || "anglotec-dev-secret-change-me";
const JWT_EXPIRES_IN = "7d";

export type JwtPayload = {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
