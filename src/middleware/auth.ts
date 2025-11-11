import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt';
import { User } from '../models/User';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
	const auth = req.headers.authorization || '';
	const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
	if (!token) return res.status(401).json({ message: 'Missing token' });

	try {
		const payload = verifyJwt(token);
		const user = await User.findById(payload.userId).select('id name email publicKey');
		if (!user) return res.status(401).json({ message: 'Invalid token' });
		// @ts-ignore
		req.user = { id: user.id, name: user.name, email: user.email, publicKey: user.publicKey };
		return next();
	} catch {
		return res.status(401).json({ message: 'Invalid token' });
	}
}