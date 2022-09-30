import { compress, decompress, flags } from 'https://esm.sh/dxt-js@0.0.3';
import { encode, decode } from 'https://deno.land/x/pngs@0.1.1/mod.ts';

import { readN, Buffer } from '../deps.ts';
import { TextureFile } from '../formats/TextureFile.ts';
import { Header } from './dds/Header.ts';
import { PixelFormatFlags } from './dds/PixelFormatFlags.ts';
import { DDS } from './DDS.ts';

export class PNG {
	static ddsBodyToRgba(body: Uint8Array, header: Header) {
		if (
			header.pixelFormat.flags === PixelFormatFlags.RGB ||
			header.pixelFormat.flags === PixelFormatFlags.RGBA
		) {
			// TODO: implement
			throw new Error('not implemented');
		} else {
			let format = '';
			switch (header.pixelFormat.fourCC) {
				case 0x31545844:
					format = flags.DXT1;
					break;
				case 0x33545844:
					format = flags.DXT3;
					break;
				case 0x35545844:
					format = flags.DXT5;
					break;
			}
			return decompress(new DataView(body.buffer), header.width, header.height, format);
		}
	}

	static rgbaToDdsBody(body: Uint8Array, header: Header) {
		if (
			header.pixelFormat.flags === PixelFormatFlags.RGB ||
			header.pixelFormat.flags === PixelFormatFlags.RGBA
		) {
			// TODO: implement
			throw new Error('not implemented');
		} else {
			let format = '';
			switch (header.pixelFormat.fourCC) {
				case 0x31545844:
					format = flags.DXT1;
					break;
				case 0x33545844:
					format = flags.DXT3;
					break;
				case 0x35545844:
					format = flags.DXT5;
					break;
			}
			return compress(new DataView(body.buffer), header.width, header.height, format);
		}
	}

	static async createFile(ddsc: Buffer, elementIndex: number, texture: TextureFile) {
		const header = DDS.prepareHeader(elementIndex, texture);

		// seek(ddsc, texture.elements[elementIndex].offset);
		const elementBytes = await readN(ddsc, texture.elements[elementIndex].size);

		const rgba = await PNG.ddsBodyToRgba(elementBytes, header);
		const image = encode(rgba, header.width, header.height);

		return new Buffer(image);
	}

	static /* async */ readFile(
		png: Buffer,
		elementIndex: number,
		texture: TextureFile,
		useHmddsc: boolean
	) {
		throw new Error('png imports not not implemented');

		const header = DDS.prepareHeader(elementIndex, texture);

		const image = decode(png.bytes());
		if (image.height !== texture.height || image.width !== texture.width)
			throw new Error('dimensions differ from original file');
		if (useHmddsc) console.warn('reading PNGs into hmddsc files is not tested');

		const contents = new Array(texture.elements.length).fill(0).map(() => new Uint8Array(0));
		contents[elementIndex] = this.rgbaToDdsBody(image.image, header);

		return contents;
	}
}
