/**
 * modifies the #off property of a buffer (is profoundly stupid)
 * @param {import('../deps.ts').Buffer} buffer
 * @param {number} target
 * @param {'begin' | 'current' | 'end'} origin
 * @deprecated
 */
export function seek(buffer, target, origin = 'begin') {
	const descriptor = {
		readable: true,
		writeable: true,
		enumerable: true,
		configurable: true
	};

	const originDesc = Object.getOwnPropertyDescriptor(buffer, '#off');
	if (originDesc) {
		descriptor.value = originDesc.value;
		console.log(originDesc);
	}

	switch (origin) {
		case 'begin':
			descriptor.value = target;
			break;
		case 'current':
			descriptor.value = (descriptor.value || 0) + target;
			break;
		case 'end':
			descriptor.value = buffer.length + target;
			break;
	}

	Object.defineProperty(buffer, '#off', descriptor);
}
