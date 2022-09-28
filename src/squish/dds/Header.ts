import { Endian, Buffer, Uint32, Int32, writeFull, readFull } from '../../deps.ts';
import { PixelFormat } from './PixelFormat.ts';
import { HeaderFlags } from './HeaderFlags.ts';

interface ConstructorOptions {
	PixelFormat?: PixelFormat;
	Flags?: HeaderFlags;

	Size?: number;
	Height?: number;
	Width?: number;
	PitchOrLinearSize?: number;
	Depth?: number;
	MipMapCount?: number;
	SurfaceFlags?: number;
	CubemapFlags?: number;
}

export class Header {
	PixelFormat: PixelFormat;
	Flags!: HeaderFlags;

	Size!: number;
	Height!: number;
	Width!: number;
	PitchOrLinearSize!: number;
	Depth!: number;
	MipMapCount!: number;
	SurfaceFlags!: number;
	CubemapFlags!: number;

	Reserved1 = new ArrayBuffer(11 * 4);
	Reserved2 = new ArrayBuffer(3 * 4);

	constructor(options?: ConstructorOptions) {
		this.PixelFormat = new PixelFormat();

		if (!options) return;

		if (options.PixelFormat) this.PixelFormat = options.PixelFormat;
		if (options.Flags) this.Flags = options.Flags;

		if (options.Size) this.Size = options.Size;
		if (options.Height) this.Height = options.Height;
		if (options.Width) this.Width = options.Width;
		if (options.PitchOrLinearSize) this.PitchOrLinearSize = options.PitchOrLinearSize;
		if (options.Depth) this.Depth = options.Depth;
		if (options.MipMapCount) this.MipMapCount = options.MipMapCount;
		if (options.SurfaceFlags) this.SurfaceFlags = options.SurfaceFlags;
		if (options.CubemapFlags) this.CubemapFlags = options.CubemapFlags;
	}

	GetSize() {
		return 18 * 4 + this.PixelFormat.getSize() + 5 * 4;
	}

	async serialize(output: Buffer, endian: Endian) {
		await Uint32[endian].writeTo(output, this.Size);
		await Uint32[endian].writeTo(output, this.Flags);
		await Int32[endian].writeTo(output, this.Height);
		await Int32[endian].writeTo(output, this.Width);
		await Uint32[endian].writeTo(output, this.PitchOrLinearSize);
		await Uint32[endian].writeTo(output, this.Depth);
		await Uint32[endian].writeTo(output, this.MipMapCount);
		await writeFull(output, new Uint8Array(this.Reserved1));
		await this.PixelFormat.serialize(output, endian);
		await Uint32[endian].writeTo(output, this.SurfaceFlags);
		await Uint32[endian].writeTo(output, this.CubemapFlags);
		await writeFull(output, new Uint8Array(this.Reserved2));
	}

	async deserialize(input: Buffer, endian: Endian) {
		this.Size = await Uint32[endian].readFrom(input);
		// assuming this is a byte flag 🤞
		this.Flags = await Uint32[endian].readFrom(input);
		this.Height = await Int32[endian].readFrom(input);
		this.Width = await Int32[endian].readFrom(input);
		this.PitchOrLinearSize = await Uint32[endian].readFrom(input);
		this.Depth = await Uint32[endian].readFrom(input);
		this.MipMapCount = await Uint32[endian].readFrom(input);
		// there's a chance this doesn't error when it should
		this.Reserved1 = await readFull(input, this.Reserved1);
		this.PixelFormat.deserialize(input, endian);
		this.SurfaceFlags = await Uint32[endian].readFrom(input);
		this.CubemapFlags = await Uint32[endian].readFrom(input);
		// there's a chance this doesn't error when it should
		this.Reserved1 = await readFull(input, this.Reserved2);
	}
}
