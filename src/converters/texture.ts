import { TextureFile } from '../formats/TextureFile.ts';
import { Buffer, readN, Uint32, writeFull } from '../deps.ts';
import { Header } from '../squish/dds/Header.ts';
import { HeaderFlags } from '../squish/dds/HeaderFlags.ts';
import { PixelFormat } from '../squish/dds/PixelFormat.ts';
import { FileFormat } from '../squish/dds/FileFormat.ts';

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

	switch (texture.format) {
		case 71: {
			// DXGI_FORMAT_BC1_UNORM
			const pixelFormat = new PixelFormat();
			pixelFormat.intialize(FileFormat.DXT1);
			return pixelFormat;
		}

		case 74: {
			// DXGI_FORMAT_BC2_UNORM
			const pixelFormat = new PixelFormat();
			pixelFormat.intialize(FileFormat.DXT3);
			return pixelFormat;
		}

		case 77: {
			// DXGI_FORMAT_BC3_UNORM
			const pixelFormat = new PixelFormat();
			pixelFormat.intialize(FileFormat.DXT5);
			return pixelFormat;
		}
		case 87: {
			// DXGI_FORMAT_B8G8R8A8_UNORM
			const pixelFormat = new PixelFormat();
			pixelFormat.intialize(FileFormat.A8R8G8B8);
			return pixelFormat;
		}

		case 61: // DXGI_FORMAT_R8_UNORM
		case 80: // DXGI_FORMAT_BC4_UNORM
		case 83: // DXGI_FORMAT_BC5_UNORM
		case 98: {
			// DXGI_FORMAT_BC7_UNORM
			const pixelFormat = new PixelFormat();
			pixelFormat.size = pixelFormat.getSize();
			pixelFormat.fourCC = 0x30315844; // 'DX10'
			return pixelFormat;
		}
	}

	throw new Error('NotSupportedException');
}

export async function saveDDSFile(
	outputBaseName: string,
	elementIndex: number,
	texture: TextureFile,
	ddsc: Buffer | null
) {
	const hmddscFile = outputBaseName + '.hmddsc';
	const fileName = outputBaseName + elementIndex + '.dds';

	if (ddsc === null) {
		if (!(await exists(hmddscFile))) return false;
		const ddscFile = await Deno.readFile(hmddscFile);
		ddsc = new Buffer(ddscFile);
	}

	let rank = 0;
	for (let i = 0; i < texture.elements.length; i++) {
		if (i == elementIndex) continue;
		if (texture.elements[i].size > texture.elements[elementIndex].size) rank++;
	}

	// create the DDS header
	const header = new Header({
		Size: 124,
		Flags: HeaderFlags.Texture | HeaderFlags.Mipmap,
		Width: texture.width >> rank,
		Height: texture.height >> rank,
		PitchOrLinearSize: 0,
		Depth: texture.depth,
		MipMapCount: 1, // always 1
		PixelFormat: getPixelFormat(texture),
		SurfaceFlags: 8 | 0x1000,
		CubemapFlags: 0
	});

	const output = new Buffer();

	// write the DDS header
	await Uint32.le.writeTo(output, 0x20534444);
	await header.serialize(output, 'le');

	// DX10 header
	if (header.PixelFormat.fourCC == 0x30315844) {
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

	await Deno.writeFile(fileName, output.bytes());
}

export async function exportTextureFile(ddscTextureFile: string, outputBaseName: string) {
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

	if (texture.elements[biggestIndex].isExternal == false)
		await saveDDSFile(outputBaseName, biggestIndex, texture, input); // load internal texture
	else await saveDDSFile(outputBaseName, biggestIndex, texture, null); // load external texture (from hmddsc file)

	// TODO:
	// the XML metadata
	// using (var xmlOutput = File.Create(xmlOutFile))
	// using (var writer = XmlWriter.Create(xmlOutput, settings))
	// {
	// 	writer.WriteStartDocument();
	// 	writer.WriteStartElement("texture");
	// 	writer.WriteAttributeString("write-to-hmddsc", haveHMDDSCFile.ToString(CultureInfo.InvariantCulture));

	// 	writer.WriteStartElement("header");
	// 	writer.WriteAttributeString("unknown-06", texture.Unknown06.ToString("X8"));
	// 	writer.WriteAttributeString("unknown-1C", texture.Unknown1C.ToString("X8"));
	// 	writer.WriteAttributeString("dimension", texture.Dimension.ToString(CultureInfo.InvariantCulture));
	// 	writer.WriteAttributeString("depth", texture.Depth.ToString(CultureInfo.InvariantCulture));
	// 	writer.WriteAttributeString("mip-count", texture.MipCount.ToString(CultureInfo.InvariantCulture));
	// 	writer.WriteAttributeString("hdr-mip-count", texture.HeaderMipCount.ToString(CultureInfo.InvariantCulture));
	// 	writer.WriteAttributeString("flags", texture.Flags.ToString("X8"));
	// 	writer.WriteEndElement();

	// 	// Will emit a warning (or sometime fail) if not the same
	// 	writer.WriteStartElement("check");
	// 	writer.WriteAttributeString("width", texture.Height.ToString(CultureInfo.InvariantCulture));
	// 	writer.WriteAttributeString("height", texture.Width.ToString(CultureInfo.InvariantCulture));
	// 	writer.WriteAttributeString("format", texture.Format.ToString(CultureInfo.InvariantCulture));
	// 	writer.WriteEndElement();

	// 	writer.WriteStartElement("elements");
	// 	foreach (var element in texture.Elements)
	// 	{
	// 		writer.WriteStartElement("element");
	// 		writer.WriteAttributeString("offset", element.Offset.ToString(CultureInfo.InvariantCulture));
	// 		writer.WriteAttributeString("size", element.Size.ToString(CultureInfo.InvariantCulture));
	// 		writer.WriteAttributeString("external", element.IsExternal.ToString(CultureInfo.InvariantCulture));
	// 		writer.WriteAttributeString("unknown8", element.Unknown8.ToString("X8"));
	// 		writer.WriteAttributeString("unknownA", element.UnknownA.ToString("X8"));
	// 		writer.WriteEndElement();
	// 	}
	// 	writer.WriteEndElement();

	// 	writer.WriteEndElement();
	// 	writer.WriteEndDocument();
	// }
}
