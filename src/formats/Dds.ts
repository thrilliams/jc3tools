import { Buffer, readN, Uint32, writeFull } from '../deps.ts';
import { TextureFile } from '../formats/TextureFile.ts';
import { seek } from '../util/seek.js';
import { Header } from './dds/Header.ts';
import { FileFormat } from './dds/FileFormat.ts';
import { HeaderFlags } from './dds/HeaderFlags.ts';
import { PixelFormat } from './dds/PixelFormat.ts';

const SIGNATURE = 0x20534444;
const DX10_FOURCC = 0x30315844;

export class Dds {
	static getPixelFormat(texture: TextureFile) {
		// https://msdn.microsoft.com/en-us/library/windows/desktop/bb173059.aspx "DXGI_FORMAT enumeration"
		// https://msdn.microsoft.com/en-us/library/windows/desktop/cc308051.aspx "Legacy Formats: Map Direct3D 9 Formats to Direct3D 10"

		const pixelFormat = new PixelFormat();

		switch (texture.format) {
			case 71: // DXGI_FORMAT_BC1_UNORM
				pixelFormat.intialize(FileFormat.DXT1);
				return pixelFormat;
			case 74: // DXGI_FORMAT_BC2_UNORM
				pixelFormat.intialize(FileFormat.DXT3);
				return pixelFormat;
			case 77: // DXGI_FORMAT_BC3_UNORM
				pixelFormat.intialize(FileFormat.DXT5);
				return pixelFormat;
			case 87: // DXGI_FORMAT_B8G8R8A8_UNORM
				pixelFormat.intialize(FileFormat.A8R8G8B8);
				return pixelFormat;
			case 61: // DXGI_FORMAT_R8_UNORM
			case 80: // DXGI_FORMAT_BC4_UNORM
			case 83: // DXGI_FORMAT_BC5_UNORM
			case 98: // DXGI_FORMAT_BC7_UNORM
				pixelFormat.size = pixelFormat.getSize();
				pixelFormat.fourCC = 0x30315844; // 'DX10'
				return pixelFormat;
		}

		throw new Error('NotSupportedException');
	}

	static prepareHeader(elementIndex: number, texture: TextureFile) {
		let rank = 0;
		for (let i = 0; i < texture.elements.length; i++) {
			if (i === elementIndex) continue;
			if (texture.elements[i].size > texture.elements[elementIndex].size) rank++;
		}

		// create the DDS header
		const header = new Header({
			size: 124,
			flags: HeaderFlags.Texture | HeaderFlags.Mipmap,
			width: texture.width >> rank,
			height: texture.height >> rank,
			pitchOrLinearSize: 0,
			depth: texture.depth,
			mipMapCount: 1, // always 1
			pixelFormat: Dds.getPixelFormat(texture),
			surfaceFlags: 8 | 0x1000,
			cubemapFlags: 0
		});

		return header;
	}

	static async createFile(ddsc: Buffer, elementIndex: number, texture: TextureFile) {
		const header = Dds.prepareHeader(elementIndex, texture);

		const output = new Buffer();

		// write the DDS header
		await Uint32.le.writeTo(output, SIGNATURE);
		await header.serialize(output, 'le');

		// DX10 header
		if (header.pixelFormat.fourCC == DX10_FOURCC) {
			await Uint32.le.writeTo(output, texture.format);
			await Uint32.le.writeTo(output, 3); // was 2. should be 3 as we most likely will export 2D textures
			await Uint32.le.writeTo(output, 0);
			await Uint32.le.writeTo(output, 1);
			await Uint32.le.writeTo(output, 0);
		}

		// body
		// seek(ddsc, texture.elements[elementIndex].offset);
		const elementBytes = await readN(ddsc, texture.elements[elementIndex].size);
		await writeFull(output, elementBytes);

		// finished buffer
		return output;
	}

	static async readFile(
		dds: Buffer,
		elementIndex: number,
		texture: TextureFile,
		useHmddsc: boolean
	) {
		let rank = 0;
		for (let i = 0; i < texture.elements.length; i++) {
			if (i === elementIndex) continue;
			if (texture.elements[i].size > texture.elements[elementIndex].size) rank++;
		}

		const magic = await Uint32.le.readFrom(dds);
		if (magic !== SIGNATURE) throw new Error('magic does not match');

		const header = new Header();
		await header.deserialize(dds, 'le');

		if (header.pixelFormat.fourCC === DX10_FOURCC) {
			const format = await Uint32.le.readFrom(dds);

			if ((await Uint32.le.readFrom(dds)) !== 3) throw new Error('1D/3D not implemented');
			if ((await Uint32.le.readFrom(dds)) !== 0) throw new Error('not implemented');
			if ((await Uint32.le.readFrom(dds)) !== 1) throw new Error('not implemented');
			if ((await Uint32.le.readFrom(dds)) !== 0) throw new Error('not implemented');

			if (format !== texture.format) throw new Error('format differs from original file');
		}

		if (header.height << rank !== texture.height || header.width << rank !== texture.width)
			throw new Error('dimensions differ from original file');

		// load the content of the texture
		// ddsContents = ddsInput.ReadBytes((int)(ddsInput.Length - ddsInput.Position));
		const ddsContents = dds.bytes();
		const contents = new Array(texture.elements.length).fill(0).map(() => new Uint8Array(0));

		if (useHmddsc) {
			// the list of elements, sorted by rank (biggest first)
			const rankIndexes: number[] = [];
			for (let i = 0; i < texture.elements.length; ++i) {
				let insertIndex = 0;
				for (; insertIndex < rankIndexes.length; insertIndex++) {
					if (texture.elements[rankIndexes[insertIndex]].size < texture.elements[i].size)
						break;
				}
				rankIndexes.splice(insertIndex, 0, i);
			}

			// them, for all those indexes, insert ranges of the dds file
			let currentOffset = 0;
			for (const index of rankIndexes) {
				const size = texture.elements[index].size;
				contents[index] = new Uint8Array(size);
				for (let i = 0; i < size; i++) contents[index][i] = ddsContents[currentOffset + i];
				currentOffset += size;
			}
		} else {
			contents[elementIndex] = ddsContents;
		}

		if (texture.elements[elementIndex].size !== ddsContents.length && !useHmddsc)
			throw new Error('size differs from original file');

		return contents;
	}
}
