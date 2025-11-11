import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';

export interface JwtPayload { userId: string; email: string; }
export function signJwt(payload: JwtPayload): string {
	const options: SignOptions = { expiresIn: (config.JWT_EXPIRE || '7d') as unknown as SignOptions['expiresIn'] };
	return jwt.sign(payload, config.JWT_SECRET as Secret, options);
}

export function verifyJwt(token: string): JwtPayload {
	return jwt.verify(token, config.JWT_SECRET as Secret) as JwtPayload;
}