import { Buffer, Endian, Uint32, Utf8, writeFull } from '../../deps.ts';

export class Entry {
	name!: string;
	offset!: number;
	size!: number;
	data?: Uint8Array;

	constructor(name?: string, offset?: number, size?: number) {
		if (name) this.name = name;
		if (offset) this.offset = offset;
		if (size) this.size = size;
	}

	async deserialize(input: Buffer, endian: Endian) {
		const length = await Uint32[endian].readFrom(input);
		if (length > 256) throw new Error('entry file name too long');

		this.name = await Utf8(length).readFrom(input);
		this.offset = await Uint32[endian].readFrom(input);
		this.size = await Uint32[endian].readFrom(input);
	}

	async serialize(output: Buffer, endian: Endian) {
		const nameBytes = new TextEncoder().encode(this.name);
		await Uint32[endian].writeTo(output, nameBytes.length);

		await writeFull(output, nameBytes);
		await Uint32[endian].writeTo(output, this.offset);
		await Uint32[endian].writeTo(output, this.size);
	}
}
