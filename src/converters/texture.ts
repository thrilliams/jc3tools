import { encode } from 'https://deno.land/x/pngs@0.1.1/mod.ts';
import decodeDxt from 'https://esm.sh/decode-dxt@1.0.1';
import { TextureFile } from '../formats/TextureFile.ts';
import { Buffer, readN, Uint32, writeFull } from '../deps.ts';
import { Header } from '../squish/dds/Header.ts';
import { HeaderFlags } from '../squish/dds/HeaderFlags.ts';
import { PixelFormat } from '../squish/dds/PixelFormat.ts';
import { FileFormat } from '../squish/dds/FileFormat.ts';
import { PixelFormatFlags } from '../squish/dds/PixelFormatFlags.ts';

async function exists(filename: string): Promise<boolean> {
	try {
		await Deno.stat(filename);
		// successful, file or directory must exist
		return true;
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) {
			// file or directory does not exist
			return false;
		} else {
			// unexpected error, maybe permissions, pass it along
			throw error;
		}
	}
}

export function getPixelFormat(texture: TextureFile) {
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

export async function prepareDdscAndHeader(
	outputBaseName: string,
	elementIndex: number,
	texture: TextureFile,
	ddsc: Buffer | null
) {
	const hmddscFile = outputBaseName + '.hmddsc';

	if (ddsc === null) {
		if (!(await exists(hmddscFile))) throw new Error('TextureNotFound');
		const ddscFile = await Deno.readFile(hmddscFile);
		ddsc = new Buffer(ddscFile);
	}

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
		pixelFormat: getPixelFormat(texture),
		surfaceFlags: 8 | 0x1000,
		cubemapFlags: 0
	});

	return { header, ddsc };
}

export async function saveDdsFile(
	outputBaseName: string,
	elementIndex: number,
	texture: TextureFile,
	srcDdsc: Buffer | null
) {
	const fileName = outputBaseName + elementIndex + '.dds';

	const ddscAndHeader = await prepareDdscAndHeader(
		outputBaseName,
		elementIndex,
		texture,
		srcDdsc
	);
	const { header, ddsc } = ddscAndHeader;

	const output = new Buffer();

	// write the DDS header
	await Uint32.le.writeTo(output, 0x20534444);
	await header.serialize(output, 'le');

	// DX10 header
	if (header.pixelFormat.fourCC == 0x30315844) {
		await Uint32.le.writeTo(output, texture.format);
		await Uint32.le.writeTo(output, 3); // was 2. should be 3 as we most likely will export 2D textures
		await Uint32.le.writeTo(output, 0);
		await Uint32.le.writeTo(output, 1);
		await Uint32.le.writeTo(output, 0);
	}

	// body
	Object.assign(ddsc, { '#off': texture.elements[elementIndex].offset }); // this sucks (and works!)
	const elementBytes = await readN(ddsc, texture.elements[elementIndex].size);
	await writeFull(output, elementBytes);

	// write to disk
	await Deno.writeFile(fileName, output.bytes());
}

export function ddsBodyToRgba(body: Uint8Array, header: Header) {
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

export async function savePngFile(
	outputBaseName: string,
	elementIndex: number,
	texture: TextureFile,
	srcDdsc: Buffer | null
) {
	const fileName = outputBaseName + elementIndex + '.png';

	const ddscAndHeader = await prepareDdscAndHeader(
		outputBaseName,
		elementIndex,
		texture,
		srcDdsc
	);
	const { header, ddsc } = ddscAndHeader;

	Object.assign(ddsc, { '#off': texture.elements[elementIndex].offset }); // this sucks (and works!)
	const elementBytes = await readN(ddsc, texture.elements[elementIndex].size);

	const rgba = await ddsBodyToRgba(elementBytes, header);

	const image = encode(rgba, header.width, header.height);

	// write to disk
	await Deno.writeFile(fileName, image);
}

interface ExportTextureMetadata {
	texture: {
		writeToHmddsc: boolean;

		header: {
			unknown06: string;
			unknown1C: string;
			dimension: number;
			depth: number;
			mipCount: number;
			hdrMipCount: number;
			flags: string;
		};

		check: {
			width: number;
			height: number;
			format: number;
		};

		elements: {
			offset: number;
			size: number;
			external: boolean;
			unknown8: string;
			unknownA: string;
		}[];
	};
}

export async function exportTextureFile(
	ddscTextureFile: string,
	outputBaseName: string
): Promise<ExportTextureMetadata> {
	// const xmlOutFile = outputBaseName + '.xml';
	const hmddscFile = outputBaseName + '.hmddsc';

	const haveHMDDSCFile = await exists(hmddscFile);
	const textureFile = await Deno.readFile(ddscTextureFile);
	const input = new Buffer(textureFile);

	const texture = new TextureFile();
	await texture.deserialize(input);

	let biggestIndex = 0;
	let biggestSize = 0;
	// The DDS file (look for the biggest one)
	for (let i = 0; i < texture.elements.length; i++) {
		if (texture.elements[i].size == 0) continue;
		if (
			(haveHMDDSCFile && texture.elements[i].isExternal) ||
			(!texture.elements[i].isExternal && texture.elements[i].size > biggestSize)
		) {
			biggestSize = texture.elements[i].size;
			biggestIndex = i;
		}
	}

	// if (texture.elements[biggestIndex].isExternal == false)
	// 	await saveDdsFile(outputBaseName, biggestIndex, texture, input); // load internal texture
	// else await saveDdsFile(outputBaseName, biggestIndex, texture, null); // load external texture (from hmddsc file)

	if (texture.elements[biggestIndex].isExternal == false)
		await savePngFile(outputBaseName, biggestIndex, texture, input); // load internal texture
	else await savePngFile(outputBaseName, biggestIndex, texture, null); // load external texture (from hmddsc file)

	return {
		texture: {
			writeToHmddsc: haveHMDDSCFile,

			header: {
				unknown06: texture.unknown06.toString(8),
				unknown1C: texture.unknown1C.toString(8),
				dimension: texture.dimension,
				depth: texture.depth,
				mipCount: texture.mipCount,
				hdrMipCount: texture.headerMipCount,
				flags: texture.flags.toString(8)
			},

			check: {
				width: texture.width,
				height: texture.height,
				format: texture.format
			},

			elements: texture.elements.map((element) => ({
				offset: element.offset,
				size: element.size,
				external: element.isExternal,
				unknown8: element.unknown8.toString(8),
				unknownA: element.unknownA.toString(8)
			}))
		}
	};
}
