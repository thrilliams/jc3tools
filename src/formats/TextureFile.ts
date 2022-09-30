import { Buffer, Endian, Uint16, Uint32, Uint8 } from '../deps.ts';
import { reverseBytes } from '../util/reverseBytes.ts';

const SIGNATURE = 0x58545641; // 'AVTX'
const ELEMENT_COUNT = 8;

export class TextureFile {
	endian: Endian = 'le';
	elements: Element[] = [];

	dimension!: number;
	format!: number;
	width!: number;
	height!: number;
	depth!: number;
	flags!: number;
	mipCount!: number;
	headerMipCount!: number;

	unknown06!: number;
	unknown1C!: number;

	async serialize(output: Buffer) {
		await Uint32[this.endian].writeTo(output, SIGNATURE); // magic
		await Uint16[this.endian].writeTo(output, 1); // version
		await Uint8.writeTo(output, this.unknown06);
		await Uint8.writeTo(output, this.dimension);
		await Uint32[this.endian].writeTo(output, this.format);
		await Uint16[this.endian].writeTo(output, this.width);
		await Uint16[this.endian].writeTo(output, this.height);
		await Uint16[this.endian].writeTo(output, this.depth);
		await Uint16[this.endian].writeTo(output, this.flags);
		await Uint8.writeTo(output, this.mipCount);
		await Uint8.writeTo(output, this.headerMipCount);

		await Uint8.writeTo(output, 0); // [unknown16] or 1 or 2
		await Uint8.writeTo(output, 0); // [unknown17]
		await Uint8.writeTo(output, 0); // [unknown18] or 1 or 2 or 3 or 4
		await Uint8.writeTo(output, 0); // [unknown19]
		await Uint8.writeTo(output, 0); // [unknown1A]
		await Uint8.writeTo(output, 0); // [unknown1B]
		await Uint32[this.endian].writeTo(output, this.unknown1C);

		// serialze elements
		for (let i = 0; i < this.elements.length; i++)
			await this.elements[i].serialize(output, this.endian);
	}

	async deserialize(input: Buffer) {
		const magic = await Uint32['le'].readFrom(input);
		if (magic !== SIGNATURE && reverseBytes(magic, 4) !== SIGNATURE)
			throw new Error('FormatException');

		const endian = magic === SIGNATURE ? 'le' : 'be';

		const version = await Uint16[endian].readFrom(input);
		if (version !== 1) throw new Error('FormatException');

		const unknown06 = await Uint8.readFrom(input);
		const dimension = await Uint8.readFrom(input);
		const format = await Uint32[endian].readFrom(input);
		const width = await Uint16[endian].readFrom(input);
		const height = await Uint16[endian].readFrom(input);
		const depth = await Uint16[endian].readFrom(input);
		const flags = await Uint16[endian].readFrom(input);
		const mipCount = await Uint8.readFrom(input);
		const headerMipCount = await Uint8.readFrom(input);

		const unknown16 = await Uint8.readFrom(input);
		const unknown17 = await Uint8.readFrom(input);
		const unknown18 = await Uint8.readFrom(input);
		const unknown19 = await Uint8.readFrom(input);
		const unknown1A = await Uint8.readFrom(input);
		const unknown1B = await Uint8.readFrom(input);
		const unknown1C = await Uint32[endian].readFrom(input);

		const elements: Element[] = [];
		for (let i = 0; i < ELEMENT_COUNT; i++) {
			const element = new Element();
			await element.deserialize(input, endian);
			elements.push(element);
		}

		if (flags !== 0 && (flags & ~(1 | 8 | 0x40)) !== 0) throw new Error('FormatException');

		if (unknown17 !== 0 || unknown19 !== 0 || unknown1A !== 0 || unknown1B !== 0)
			throw new Error('FormatException');

		if (unknown16 !== 0 && unknown16 !== 1 && unknown16 !== 2)
			throw new Error('FormatException');

		if (
			unknown18 !== 0 &&
			unknown18 !== 2 &&
			unknown18 !== 1 &&
			unknown18 !== 3 &&
			unknown18 !== 4
		)
			throw new Error('FormatException');

		this.endian = endian;
		this.elements = elements;

		this.dimension = dimension;
		this.format = format;
		this.width = width;
		this.height = height;
		this.depth = depth;
		this.flags = flags;
		this.mipCount = mipCount;
		this.headerMipCount = headerMipCount;

		this.unknown06 = unknown06;
		this.unknown1C = unknown1C;
	}
}

export class Element {
	offset!: number;
	size!: number;
	isExternal!: boolean;

	unknownA!: number;
	unknown8!: number;

	async deserialize(input: Buffer, endian: Endian) {
		this.offset = await Uint32[endian].readFrom(input);
		this.size = await Uint32[endian].readFrom(input);
		this.unknown8 = await Uint16[endian].readFrom(input);
		this.unknownA = await Uint8.readFrom(input);
		this.isExternal = (await Uint8.readFrom(input)) > 0;
	}

	async serialize(output: Buffer, endian: Endian) {
		await Uint32[endian].writeTo(output, this.offset);
		await Uint32[endian].writeTo(output, this.size);
		await Uint16[endian].writeTo(output, this.unknown8);
		await Uint8.writeTo(output, this.unknownA);
		await Uint8.writeTo(output, this.isExternal ? 1 : 0);
	}
}
