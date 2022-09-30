import { Buffer } from '../deps.ts';

/**
 * reads a file and transforms it into a buffer
 * @param file the path to read
 */
export async function bufferFromFile(file: string) {
	const bytes = await Deno.readFile(file);
	const buffer = new Buffer(bytes);
	return buffer;
}

/**
 * writes a buffer to the filesystem
 * @param buffer the buffer to write from
 * @param file the path to write to
 */
export async function bufferToFile(buffer: Buffer, file: string) {
	const bytes = buffer.bytes();
	await Deno.writeFile(file, bytes);
}
