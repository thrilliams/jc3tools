import { Buffer, Endian, Uint32 } from '../../deps.ts';
import { FileFormat } from './FileFormat.ts';
import { PixelFormatFlags } from './PixelFormatFlags.ts';

export class PixelFormat {
	size!: number;
	flags!: PixelFormatFlags;
	fourCC!: number;
	rgbBitCount!: number;
	redBitMask!: number;
	greenBitMask!: number;
	blueBitMask!: number;
	alphaBitMask!: number;

	getSize() {
		return 8 * 4;
	}

	intialize(fileFormat: FileFormat) {
		this.size = this.getSize();

		switch (fileFormat) {
			case FileFormat.DXT1:
				this.flags = PixelFormatFlags.FourCC;
				this.rgbBitCount = 0;
				this.redBitMask = 0;
				this.greenBitMask = 0;
				this.blueBitMask = 0;
				this.alphaBitMask = 0;
				this.fourCC = 0x31545844; // "DXT1"
				break;
			case FileFormat.DXT3:
				this.flags = PixelFormatFlags.FourCC;
				this.rgbBitCount = 0;
				this.redBitMask = 0;
				this.greenBitMask = 0;
				this.blueBitMask = 0;
				this.alphaBitMask = 0;
				this.fourCC = 0x33545844; // "DXT3"
				break;
			case FileFormat.DXT5:
				this.flags = PixelFormatFlags.FourCC;
				this.rgbBitCount = 0;
				this.redBitMask = 0;
				this.greenBitMask = 0;
				this.blueBitMask = 0;
				this.alphaBitMask = 0;
				this.fourCC = 0x35545844; // "DXT5"
				break;
			case FileFormat.A8R8G8B8:
				this.flags = PixelFormatFlags.RGBA;
				this.rgbBitCount = 32;
				this.fourCC = 0;
				this.redBitMask = 0x00ff0000;
				this.greenBitMask = 0x0000ff00;
				this.blueBitMask = 0x000000ff;
				this.alphaBitMask = 0xff000000;
				break;
			case FileFormat.X8R8G8B8:
				this.flags = PixelFormatFlags.RGB;
				this.rgbBitCount = 32;
				this.fourCC = 0;
				this.redBitMask = 0x00ff0000;
				this.greenBitMask = 0x0000ff00;
				this.blueBitMask = 0x000000ff;
				this.alphaBitMask = 0x00000000;
				break;
			case FileFormat.A8B8G8R8:
				this.flags = PixelFormatFlags.RGBA;
				this.rgbBitCount = 32;
				this.fourCC = 0;
				this.redBitMask = 0x000000ff;
				this.greenBitMask = 0x0000ff00;
				this.blueBitMask = 0x00ff0000;
				this.alphaBitMask = 0xff000000;
				break;
			case FileFormat.X8B8G8R8:
				this.flags = PixelFormatFlags.RGB;
				this.rgbBitCount = 32;
				this.fourCC = 0;
				this.redBitMask = 0x000000ff;
				this.greenBitMask = 0x0000ff00;
				this.blueBitMask = 0x00ff0000;
				this.alphaBitMask = 0x00000000;
				break;
			case FileFormat.A1R5G5B5:
				this.flags = PixelFormatFlags.RGBA;
				this.rgbBitCount = 16;
				this.fourCC = 0;
				this.redBitMask = 0x00007c00;
				this.greenBitMask = 0x000003e0;
				this.blueBitMask = 0x0000001f;
				this.alphaBitMask = 0x00008000;
				break;
			case FileFormat.A4R4G4B4:
				this.flags = PixelFormatFlags.RGBA;
				this.rgbBitCount = 16;
				this.fourCC = 0;
				this.redBitMask = 0x00000f00;
				this.greenBitMask = 0x000000f0;
				this.blueBitMask = 0x0000000f;
				this.alphaBitMask = 0x0000f000;
				break;
			case FileFormat.R8G8B8:
				this.flags = PixelFormatFlags.RGB;
				this.fourCC = 0;
				this.rgbBitCount = 24;
				this.redBitMask = 0x00ff0000;
				this.greenBitMask = 0x0000ff00;
				this.blueBitMask = 0x000000ff;
				this.alphaBitMask = 0x00000000;
				break;
			case FileFormat.R5G6B5:
				this.flags = PixelFormatFlags.RGB;
				this.fourCC = 0;
				this.rgbBitCount = 16;
				this.redBitMask = 0x0000f800;
				this.greenBitMask = 0x000007e0;
				this.blueBitMask = 0x0000001f;
				this.alphaBitMask = 0x00000000;
				break;
			default:
				throw new Error('NotSupportedException');
		}
	}

	async serialize(output: Buffer, endian: Endian) {
		await Uint32[endian].writeTo(output, this.size);
		await Uint32[endian].writeTo(output, this.flags);
		await Uint32[endian].writeTo(output, this.fourCC);
		await Uint32[endian].writeTo(output, this.rgbBitCount);
		await Uint32[endian].writeTo(output, this.redBitMask);
		await Uint32[endian].writeTo(output, this.greenBitMask);
		await Uint32[endian].writeTo(output, this.blueBitMask);
		await Uint32[endian].writeTo(output, this.alphaBitMask);
	}

	async deserialize(input: Buffer, endian: Endian) {
		this.size = await Uint32[endian].readFrom(input);
		this.flags = await Uint32[endian].readFrom(input);
		this.fourCC = await Uint32[endian].readFrom(input);
		this.rgbBitCount = await Uint32[endian].readFrom(input);
		this.redBitMask = await Uint32[endian].readFrom(input);
		this.greenBitMask = await Uint32[endian].readFrom(input);
		this.blueBitMask = await Uint32[endian].readFrom(input);
		this.alphaBitMask = await Uint32[endian].readFrom(input);
	}
}
