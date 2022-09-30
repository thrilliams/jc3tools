export function align(value: number, align: number) {
	if (value === 0) return value;
	return value + ((align - (value % align)) % align);
}
