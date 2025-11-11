export function isEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export function requireNonEmpty(value: string): boolean {
	return typeof value === 'string' && value.trim().length > 0;
}