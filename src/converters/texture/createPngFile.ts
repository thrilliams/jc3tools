import { encode } from 'https://deno.land/x/pngs@0.1.1/mod.ts';
import decodeDxt from 'https://esm.sh/decode-dxt@1.0.1';

import { Buffer, readN } from '../../deps.ts';
import { TextureFile } from '../../formats/TextureFile.ts';
import { Header } from '../../squish/dds/Header.ts';
import { PixelFormatFlags } from '../../squish/dds/PixelFormatFlags.ts';
import { prepareDdscAndHeader } from './prepareDdscAndHeader.ts';

function ddsBodyToRgba(body: Uint8Array, header: Header) {
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
				format = 'dxt1';
				break;
			case 0x33545844:
				format = 'dxt3';
				break;
			case 0x35545844:
				format = 'dxt5';
				break;
		}
		return decodeDxt(new DataView(body.buffer), header.width, header.height, format);
	}
}

export async function createPngFile(
	hmddscFile: string | undefined,
	elementIndex: number,
	texture: TextureFile,
	srcDdsc: Buffer | null
) {
	const ddscAndHeader = await prepareDdscAndHeader(hmddscFile, elementIndex, texture, srcDdsc);
	const { header, ddsc } = ddscAndHeader;

	Object.assign(ddsc, { '#off': texture.elements[elementIndex].offset }); // this sucks (and works!)
	const elementBytes = await readN(ddsc, texture.elements[elementIndex].size);

	const rgba = await ddsBodyToRgba(elementBytes, header);
	const image = encode(rgba, header.width, header.height);

	return new Buffer(image);
}
