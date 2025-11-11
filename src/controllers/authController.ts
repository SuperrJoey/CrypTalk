import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { isEmail, requireNonEmpty } from '../utils/validators';
import { signJwt } from '../utils/jwt';

export async function register(req: Request, res: Response) {
	const { name, email, password, publicKey } = req.body || {};
	if (!isEmail(email) || !requireNonEmpty(name) || !requireNonEmpty(password)) {
		return res.status(400).json({ message: 'Invalid input' });
	}
	const existing = await User.findOne({ email });
	if (existing) return res.status(409).json({ message: 'Email already in use' });

	const passwordHash = await bcrypt.hash(password, 10);
	const user = await User.create({ name, email, passwordHash, publicKey });
	const token = signJwt({ userId: user.id, email: user.email });

	return res.status(201).json({
		token,
		user: { id: user.id, name: user.name, email: user.email, publicKey: user.publicKey }
	});
}

export async function login(req: Request, res: Response) {
	const { email, password } = req.body || {};
	if (!isEmail(email) || !requireNonEmpty(password)) {
		return res.status(400).json({ message: 'Invalid input' });
	}
	const user = await User.findOne({ email });
	if (!user) return res.status(401).json({ message: 'Invalid credentials' });

	const ok = await bcrypt.compare(password, user.passwordHash);
	if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

	const token = signJwt({ userId: user.id, email: user.email });
	return res.json({
		token,
		user: { id: user.id, name: user.name, email: user.email, publicKey: user.publicKey }
	});
}

export async function me(req: Request, res: Response) {
	// populated by auth middleware
	// @ts-ignore
	const user = req.user;
	return res.json({ user });
}