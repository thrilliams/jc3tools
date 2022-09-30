import { Buffer, Endian, Uint16, Uint32, Uint8 } from '../../deps.ts';

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
