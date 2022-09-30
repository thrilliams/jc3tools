import { Buffer, Endian, readN, Uint32, Utf8, writeFull } from '../deps.ts';
import { reverseBytes } from '../util/reverseBytes.ts';
import { Entry } from './smallArchive/Entry.ts';

export class SmallArchiveFile {
	endian!: Endian;
	entries: Entry[] = [];

	async deserialize(input: Buffer) {
		const magic = await Uint32.le.readFrom(input);
		if (magic !== 4 && reverseBytes(magic, 4) !== magic)
			throw new Error('invalid header magic');
		this.endian = magic === 4 ? 'le' : 'be';

		const tag = await Utf8(4).readFrom(input);
		if (tag !== 'SARC') throw new Error('invalid header tag');

		const version = await Uint32[this.endian].readFrom(input);
		if (version !== 2) throw new Error('invalid header version');

		const indexSize = await Uint32[this.endian].readFrom(input);
		const indexBuffer = new Buffer(await readN(input, indexSize));

		this.entries = [];
		while (indexBuffer.length > 15) {
			const entry = new Entry();
			await entry.deserialize(indexBuffer, this.endian);
			this.entries.push(entry);
		}
	}

	async serialize(output: Buffer, endian: Endian) {
		await Uint32[endian].writeTo(output, 4); // magic
		await Utf8(4).writeTo(output, 'SARC'); // tag
		await Uint32[endian].writeTo(output, 2); // version

		const entryBuffer = new Buffer();
		for (const entry of this.entries) {
			await entry.serialize(entryBuffer, endian);
		}

		if (entryBuffer.capacity % 16 !== 0) {
			const spacerBytes = new Uint8Array(entryBuffer.capacity % 16);
			await writeFull(entryBuffer, spacerBytes);
		}

		await Uint32[endian].writeTo(output, entryBuffer.capacity); // index size
		await writeFull(output, entryBuffer.bytes());

		if (output.capacity % 4 !== 0) {
			const spacerBytes = new Uint8Array(output.capacity % 4);
			await writeFull(output, spacerBytes);
		}
	}
}
