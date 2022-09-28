import { Buffer } from '../deps.ts';
import { TextureFile } from '../formats/TextureFile.ts';
import { exists } from '../util.ts';
import { createDdsFile } from './texture/createDdsFile.ts';
import { createPngFile } from './texture/createPngFile.ts';

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
	format: 'dds' | 'png' = 'png',
	hmddscFile?: string
) {
	const haveHMDDSCFile = hmddscFile !== undefined && (await exists(hmddscFile));
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

	const method = format === 'dds' ? createDdsFile : createPngFile;

	const buffer = await method(
		hmddscFile,
		biggestIndex,
		texture,
		texture.elements[biggestIndex].isExternal ? null : input
	);

	const metadata: ExportTextureMetadata = {
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

	return { buffer, metadata };
}
