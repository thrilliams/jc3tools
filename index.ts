import { Buffer, readN } from './src/deps.ts';
import { CoolArchive } from './src/formats/CoolArchive.ts';
import { SmallArchiveFile } from './src/formats/SmallArchiveFile.ts';
import { bufferFromFile } from './src/util/fs.ts';
import { ensureFile } from 'https://deno.land/std@0.156.0/fs/mod.ts';

const buffer = await bufferFromFile(
	'../../files/archives_win64/global/region_1_global.bl'
	// '../../files/archives_win64/global/global_music.bl'
	// '../../files/archives_win64/global/global_behaviors.bl'
	// '../../files/archives_win64/global/global_physics_effects.bl'
	// '../../files/archives_win64/global/landmarks_gen.bl'
);
const archive = new CoolArchive();
await archive.deserialize(buffer);

console.log(archive);

for (const chunk of archive.chunks) {
	const file = new SmallArchiveFile();
	const chunkBuffer = new Buffer(chunk.data);
	const lengthInitial = chunkBuffer.length;
	await file.deserialize(chunkBuffer);
	for (const entry of file.entries) {
		if (lengthInitial - chunkBuffer.length !== entry.offset) {
			const currentPosition = lengthInitial - chunkBuffer.length;
			const delta = entry.offset - currentPosition;
			if (delta < 0) throw new Error("that's not supposed to happen");
			await readN(chunkBuffer, delta);
		}
		const name = entry.name.slice(0, entry.name.indexOf('\x00'));
		console.log(name);
		await ensureFile(name);
		await Deno.writeFile(name, await readN(chunkBuffer, entry.size));
	}
}
