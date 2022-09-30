import { deflate, inflate } from 'https://deno.land/x/denoflate@1.2.1/mod.ts';
import { Buffer, Endian, readN, Uint32, writeFull } from '../../deps.ts';
import { Entry } from '../smallArchive/Entry.ts';
import { SmallArchiveFile } from '../SmallArchiveFile.ts';

const CHUNK_SIGNATURE = 0x4d415745; // 'EWAM'

export class Chunk {
	compressedSize!: number;
	uncompressedSize!: number;
	data!: Uint8Array;
	// file!: SmallArchiveFile;
	// entries!: Entry[];

	async deserialize(input: Buffer, endian: Endian) {
		this.compressedSize = await Uint32[endian].readFrom(input);
		this.uncompressedSize = await Uint32[endian].readFrom(input);

		const nextBlockOffset = await Uint32[endian].readFrom(input);

		const blockMagic = await Uint32[endian].readFrom(input);
		if (blockMagic !== CHUNK_SIGNATURE) throw new Error('invalid chunk header');

		const compressedData = await readN(input, this.compressedSize);
		const data = inflate(compressedData);
		this.data = data;
		// const fileBuffer = new Buffer(data);
		// this.file = new SmallArchiveFile();
		// await this.file.deserialize(fileBuffer);

		// const lengthInitial = fileBuffer.length;
		// for (const entry of this.file.entries) {
		// 	if (lengthInitial - fileBuffer.length !== entry.offset) {
		// 		const currentPosition = lengthInitial - fileBuffer.length;
		// 		const delta = entry.offset - currentPosition;
		// 		if (delta < 0) throw new Error("that's not supposed to happen");
		// 		await readN(fileBuffer, delta);
		// 	}
		// 	entry.data = await readN(fileBuffer, entry.size);
		// }

		return nextBlockOffset;
	}

	async serialize(output: Buffer, endian: Endian, nextBlockOffset: number) {
		await Uint32[endian].writeTo(output, this.compressedSize);
		await Uint32[endian].writeTo(output, this.uncompressedSize);

		await Uint32[endian].writeTo(output, nextBlockOffset);

		await Uint32[endian].writeTo(output, CHUNK_SIGNATURE);

		// const fileBuffer = new Buffer();
		// await this.file.serialize(fileBuffer, endian);

		// const capacityInitial = fileBuffer.capacity;
		// for (const entry of this.file.entries) {
		// 	if (fileBuffer.capacity - capacityInitial !== entry.offset) {
		// 		const currentPosition = fileBuffer.capacity - capacityInitial;
		// 		const delta = entry.offset - currentPosition;
		// 		if (delta < 0) throw new Error("that's not supposed to happen");
		// 		const spacerBytes = new Uint8Array(delta);
		// 		await writeFull(fileBuffer, spacerBytes);
		// 	}
		// 	await writeFull(fileBuffer, entry.data!);
		// }

		const compressedData = deflate(this.data /* fileBuffer.bytes() */, undefined);
		if (compressedData.byteLength !== this.compressedSize)
			throw new Error('data size does not match');
		await writeFull(output, compressedData);
	}
}
