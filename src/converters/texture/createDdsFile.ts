import { Buffer, readN, Uint32, writeFull } from '../../deps.ts';
import { TextureFile } from '../../formats/TextureFile.ts';
import { prepareDdscAndHeader } from './prepareDdscAndHeader.ts';

export async function createDdsFile(
	hmddscFile: string | undefined,
	elementIndex: number,
	texture: TextureFile,
	srcDdsc: Buffer | null
) {
	const ddscAndHeader = await prepareDdscAndHeader(hmddscFile, elementIndex, texture, srcDdsc);
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

	// finished buffer
	return output;
}
