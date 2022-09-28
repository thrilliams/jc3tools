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

export async function exists(filename: string): Promise<boolean> {
	try {
		await Deno.stat(filename);
		// successful, file or directory must exist
		return true;
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) {
			// file or directory does not exist
			return false;
		} else {
			// unexpected error, maybe permissions, pass it along
			throw error;
		}
	}
}
