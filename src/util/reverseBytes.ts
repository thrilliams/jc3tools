export function reverseBytes(value: number, minBytes: number) {
	const bytes: number[] = [];
	for (let i = 0; i < minBytes; i++) {
		// push the 16 rightmost bits and shift 8 bits to the right
		bytes.push(value & 255);
		value >>>= 8;
	}
	bytes.reverse();
	let reverseValue = 0;
	for (let i = 0; i < minBytes; i++) {
		reverseValue += bytes[i] << (i * 8);
	}
	return reverseValue;
}
