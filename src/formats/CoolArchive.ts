import { inflate } from 'https://deno.land/x/denoflate@1.2.1/mod.ts';
import { Buffer, Endian, readN, Uint32 } from '../deps.ts';
import { reverseBytes } from '../util/reverseBytes.ts';
import { seek } from '../util/seek.js';
import { Chunk } from './coolArchive/Chunk.ts';

// so called because of the avalanche archive header:
const COMMENT_BYTES = new TextEncoder().encode('AVALANCHEARCHIVEFORMATISCOOL');
const SIGNATURE = 0x00464141; // 'AAF\0'
const CHUNK_SIGNATURE = 0x4d415745; // 'EWAM'

export class CoolArchive {
	endian!: Endian;
	totalUncompressedSize!: number;
	blockSize!: number;
	chunks: Chunk[] = [];

	async deserialize(input: Buffer) {
		const length = input.bytes().byteLength;

		const magic = await Uint32.le.readFrom(input);
		if (magic !== SIGNATURE && reverseBytes(magic, 4) !== SIGNATURE)
			throw new Error('invalid header');
		this.endian = magic === SIGNATURE ? 'le' : 'be';

		const version = await Uint32[this.endian].readFrom(input);
		if (version !== 1) throw new Error('invalid version');

		const comment = await readN(input, COMMENT_BYTES.byteLength);
		if (!COMMENT_BYTES.every((v, i) => v === comment[i]))
			throw new Error('invalid comment (uncool 😔)');

		this.totalUncompressedSize = await Uint32[this.endian].readFrom(input);
		this.blockSize = await Uint32[this.endian].readFrom(input);

		const blockCount = await Uint32[this.endian].readFrom(input);
		this.chunks = [];
		for (let i = 0; i < blockCount; i++) {
			// const lengthInitial = input.length;

			const chunk = new Chunk();
			const nextBlockOffset = await chunk.deserialize(input, this.endian);
			this.chunks.push(chunk);

			// const deltaLength = lengthInitial - input.length;
			// await readN(input, nextBlockOffset - deltaLength);

			/* const blockCompressedSize = await Uint32[this.endian].readFrom(input);
			const blockUncompressedSize = await Uint32[this.endian].readFrom(input);
			// distance in bytes from start of this chunk to start of next chunk
			const nextBlockOffset = await Uint32[this.endian].readFrom(input);

			const blockMagic = await Uint32[this.endian].readFrom(input);
			if (blockMagic !== CHUNK_SIGNATURE) throw new Error('invalid chunk header');

			const chunkInfo = new ChunkInfo(
				length - input.length,
				blockCompressedSize,
				blockUncompressedSize
			);
			this.chunkInfos.push(chunkInfo);

			// jump to start of next chunk (-16 for this chunk's header)
			await readN(input, nextBlockOffset - 4 * 4); */
		}
	}
}
