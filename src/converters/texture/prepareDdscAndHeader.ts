import { Buffer } from '../../deps.ts';
import { TextureFile } from '../../formats/TextureFile.ts';
import { FileFormat } from '../../squish/dds/FileFormat.ts';
import { Header } from '../../squish/dds/Header.ts';
import { HeaderFlags } from '../../squish/dds/HeaderFlags.ts';
import { PixelFormat } from '../../squish/dds/PixelFormat.ts';
import { exists } from '../../util.ts';

function getPixelFormat(texture: TextureFile) {
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
	hmddscFile: string | undefined,
	elementIndex: number,
	texture: TextureFile,
	ddsc: Buffer | null
) {
	if (ddsc === null) {
		if (hmddscFile === undefined || !(await exists(hmddscFile)))
			throw new Error('TextureNotFound');
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
