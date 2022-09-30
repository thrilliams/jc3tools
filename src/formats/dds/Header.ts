import { Buffer, Endian, Int32, readFull, Uint32, writeFull } from '../../deps.ts';
import { HeaderFlags } from './HeaderFlags.ts';
import { PixelFormat } from './PixelFormat.ts';

interface ConstructorOptions {
	pixelFormat?: PixelFormat;
	flags?: HeaderFlags;

	size?: number;
	height?: number;
	width?: number;
	pitchOrLinearSize?: number;
	depth?: number;
	mipMapCount?: number;
	surfaceFlags?: number;
	cubemapFlags?: number;
}

export class Header {
	pixelFormat: PixelFormat;
	flags!: HeaderFlags;

	size!: number;
	height!: number;
	width!: number;
	pitchOrLinearSize!: number;
	depth!: number;
	mipMapCount!: number;
	surfaceFlags!: number;
	cubemapFlags!: number;

	reserved1 = new ArrayBuffer(11 * 4);
	reserved2 = new ArrayBuffer(3 * 4);

	constructor(options?: ConstructorOptions) {
		this.pixelFormat = new PixelFormat();

		if (!options) return;

		if (options.pixelFormat) this.pixelFormat = options.pixelFormat;
		if (options.flags) this.flags = options.flags;

		if (options.size) this.size = options.size;
		if (options.height) this.height = options.height;
		if (options.width) this.width = options.width;
		if (options.pitchOrLinearSize) this.pitchOrLinearSize = options.pitchOrLinearSize;
		if (options.depth) this.depth = options.depth;
		if (options.mipMapCount) this.mipMapCount = options.mipMapCount;
		if (options.surfaceFlags) this.surfaceFlags = options.surfaceFlags;
		if (options.cubemapFlags) this.cubemapFlags = options.cubemapFlags;
	}

	GetSize() {
		return 18 * 4 + this.pixelFormat.getSize() + 5 * 4;
	}

	async serialize(output: Buffer, endian: Endian) {
		await Uint32[endian].writeTo(output, this.size);
		await Uint32[endian].writeTo(output, this.flags);
		await Int32[endian].writeTo(output, this.height);
		await Int32[endian].writeTo(output, this.width);
		await Uint32[endian].writeTo(output, this.pitchOrLinearSize);
		await Uint32[endian].writeTo(output, this.depth);
		await Uint32[endian].writeTo(output, this.mipMapCount);
		await writeFull(output, new Uint8Array(this.reserved1));
		await this.pixelFormat.serialize(output, endian);
		await Uint32[endian].writeTo(output, this.surfaceFlags);
		await Uint32[endian].writeTo(output, this.cubemapFlags);
		await writeFull(output, new Uint8Array(this.reserved2));
	}

	async deserialize(input: Buffer, endian: Endian) {
		this.size = await Uint32[endian].readFrom(input);
		this.flags = await Uint32[endian].readFrom(input);
		this.height = await Int32[endian].readFrom(input);
		this.width = await Int32[endian].readFrom(input);
		this.pitchOrLinearSize = await Uint32[endian].readFrom(input);
		this.depth = await Uint32[endian].readFrom(input);
		this.mipMapCount = await Uint32[endian].readFrom(input);
		// there's a chance this doesn't error when it should
		this.reserved1 = await readFull(input, this.reserved1);
		await this.pixelFormat.deserialize(input, endian);
		this.surfaceFlags = await Uint32[endian].readFrom(input);
		this.cubemapFlags = await Uint32[endian].readFrom(input);
		// there's a chance this doesn't error when it should
		this.reserved1 = await readFull(input, this.reserved2);
	}
}
