import { deflate } from 'https://deno.land/x/denoflate@1.2.1/mod.ts';

export class ChunkInfo {
	dataOffset: number;
	compressedSize: number;
	uncompressedSize: number;
	data: Uint8Array;

	constructor(dataOffset: number, compressedSize: number, uncompressedSize: number);
	constructor(uncompressedData: Uint8Array);

	constructor(
		dataOrOffset: Uint8Array | number,
		compressedSize?: number,
		uncompressedSize?: number
	) {
		if (dataOrOffset instanceof Uint8Array) {
			this.data = deflate(dataOrOffset, undefined);
			this.dataOffset = -1; // unused for serializing
			this.compressedSize = this.data.byteLength;
			this.uncompressedSize = dataOrOffset.byteLength;
		} else {
			this.data = new Uint8Array();
			this.dataOffset = dataOrOffset;
			this.compressedSize = compressedSize!;
			this.uncompressedSize = uncompressedSize!;
		}
	}
}
