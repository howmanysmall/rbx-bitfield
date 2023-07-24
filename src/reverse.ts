export const Reverse = <T>(array: Array<T>) => {
	const length = array.size();
	let index = 0;

	while (index < length / 2) {
		const temp = array[index];
		array[index] = array[length - 1 - index];
		array[length - 1 - index] = temp;
		index += 1;
	}

	return array;
};

export default Reverse;
