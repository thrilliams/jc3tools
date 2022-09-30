import { Buffer, writeFull } from '../deps.ts';
import { Element, TextureFile } from '../formats/TextureFile.ts';
import { PNG } from '../squish/PNG.ts';
import { DDS } from '../squish/DDS.ts';
import { seek } from '../util/seek.js';

export interface TextureMetadata {
	useHmddsc: boolean;
	fileFormat: 'png' | 'dds';

	header: {
		unknown06: number;
		unknown1C: number;
		dimension: number;
		depth: number;
		mipCount: number;
		headerMipCount: number;
		flags: number;
	};

	check: {
		width: number;
		height: number;
		format: number;
	};

	elements: {
		offset: number;
		size: number;
		isExternal: boolean;
		unknown8: number;
		unknownA: number;
	}[];
}

/**
 * parses a ddsc buffer into an image buffer and metadata object
 * @param ddsc buffer containing the ddsc data to extract
 * @param format the image format to export, defaults to png
 * @param hmddsc if the ddsc has an associated hmddsc file, pass it here
 * @returns a buffer containing the exported image data and some metadata about the exported image
 */
export async function exportTexture(ddsc: Buffer, format: 'dds' | 'png' = 'png', hmddsc?: Buffer) {
	const texture = new TextureFile();
	await texture.deserialize(ddsc);

	let biggestIndex = 0;
	let biggestSize = 0;
	// The DDS file (look for the biggest one)
	for (let i = 0; i < texture.elements.length; i++) {
		if (texture.elements[i].size == 0) continue;
		if (
			(texture.elements[i].isExternal && hmddsc) ||
			(!texture.elements[i].isExternal && texture.elements[i].size > biggestSize)
		) {
			biggestSize = texture.elements[i].size;
			biggestIndex = i;
		}
	}

	const useHmddsc = texture.elements[biggestIndex].isExternal && hmddsc !== undefined;

	const method = format === 'dds' ? DDS.createFile : PNG.createFile;
	const targetDdsc = useHmddsc ? hmddsc : ddsc;

	const buffer = await method(targetDdsc, biggestIndex, texture);

	const metadata: TextureMetadata = {
		useHmddsc: useHmddsc,
		fileFormat: format,

		header: {
			unknown06: texture.unknown06,
			unknown1C: texture.unknown1C,
			dimension: texture.dimension,
			depth: texture.depth,
			mipCount: texture.mipCount,
			headerMipCount: texture.headerMipCount,
			flags: texture.flags
		},

		check: {
			width: texture.width,
			height: texture.height,
			format: texture.format
		},

		elements: texture.elements.map((element) => ({
			offset: element.offset,
			size: element.size,
			isExternal: element.isExternal,
			unknown8: element.unknown8,
			unknownA: element.unknownA
		}))
	};

	return { buffer, metadata };
}

/**
 * parses an image buffer and a metadata object into a ddsc buffer
 * @param buffer buffer containing the image data to import
 * @param metadata texture data obtained through exportTexture
 * @returns a ddsc buffer ("output") and, if necessary, an hmddsc buffer
 */
export async function importTexture(buffer: Buffer, metadata: TextureMetadata) {
	const texture = new TextureFile();

	texture.unknown06 = metadata.header.unknown06;
	texture.unknown1C = metadata.header.unknown1C;
	texture.dimension = metadata.header.dimension;
	texture.depth = metadata.header.depth;
	texture.mipCount = metadata.header.mipCount;
	texture.headerMipCount = metadata.header.headerMipCount;
	texture.flags = metadata.header.flags;

	texture.width = metadata.check.width;
	texture.height = metadata.check.height;
	texture.format = metadata.check.format;

	for (const elementData of metadata.elements) {
		const element = new Element();
		element.offset = elementData.offset;
		element.size = elementData.size;
		element.isExternal = elementData.isExternal;
		element.unknown8 = elementData.unknown8;
		element.unknownA = elementData.unknownA;
		texture.elements.push(element);
	}

	let biggestIndex = 0;
	let biggestSize = 0;
	// The DDS file (look for the biggest one)
	for (let i = 0; i < texture.elements.length; i++) {
		if (texture.elements[i].size == 0) continue;
		if (
			(texture.elements[i].isExternal && metadata.useHmddsc) ||
			(!texture.elements[i].isExternal && texture.elements[i].size > biggestSize)
		) {
			biggestSize = texture.elements[i].size;
			biggestIndex = i;
		}
	}

	let contents: Uint8Array[];
	if (metadata.fileFormat === 'dds')
		contents = await DDS.readFile(buffer, biggestIndex, texture, metadata.useHmddsc);
	else contents = /* await */ PNG.readFile(buffer, biggestIndex, texture, metadata.useHmddsc);

	const output = new Buffer();
	await texture.serialize(output);

	// write the content of the ddsc file
	for (let i = 0; i < texture.elements.length; ++i) {
		if (texture.elements[i].isExternal || texture.elements[i].size === 0) continue;
		// seek(output, texture.elements[i].offset);
		await writeFull(output, contents[i]);
	}

	let hmddsc: Buffer | undefined;
	if (metadata.useHmddsc) {
		hmddsc = new Buffer();
		// write the content of the hmddsc file:
		for (let i = 0; i < texture.elements.length; ++i) {
			if (!texture.elements[i].isExternal || texture.elements[i].size === 0) continue;
			// seek(hmddsc, texture.elements[i].offset);
			await writeFull(hmddsc, contents[i]);
		}
	}

	return { output, hmddsc };
}
