import Log from "@rbxts/rbxts-sleitnick-log";
import Reverse from "./reverse";
import { t } from "@rbxts/t";

const IsGreaterThanZero = t.numberMinExclusive(0);
const IsValidIndex = t.intersection(t.integer, t.numberConstrained(0, 31));

const logger = new Log();

const OCT_TO_BIN = new Map<string, string>([
	["0", "000"],
	["1", "001"],
	["2", "010"],
	["3", "011"],
	["4", "100"],
	["5", "101"],
	["6", "110"],
	["7", "111"],
]);

const ReplaceFunction = (value: string) => OCT_TO_BIN.get(value)!;
const ToBinary = (value: number) => "%o".format(value).gsub(".", ReplaceFunction)[0];

export default class BitField {
	public Value = 0;

	public constructor(minLength = 1) {
		assert(IsGreaterThanZero(minLength), "Illegal argument: parameter 'minLength' must be greater than 0");
		this.MinLength = minLength;
		if (this.MinLength > 31) logger.FatalThrow("BitField is limited to 31 flags");
	}

	/**
	 * Combines all the masks into a single value.
	 * @param masks
	 * @returns
	 */
	public static CombineMasks = (...masks: Array<number>) =>
		masks.reduce((previous, current) => previous | current, 0);

	/**
	 * Creates a bit field from an array of numbers.
	 * @param array
	 * @returns
	 */
	public static FromArray = (array: Array<number>) => {
		let length = 0;
		const bitMask = array.reduce((previous, current) => {
			length += 1;
			previous <<= 1;
			// eslint-disable-next-line roblox-ts/lua-truthiness
			if (current) previous += 1;
			return previous;
		}, 0);

		return new BitField(length).On(bitMask);
	};

	/**
	 * Deserializes a string to a BitField.
	 * @param input
	 * @returns
	 */
	public static Deserialize = (input: string) => {
		const numberValue = tonumber(input) ?? 0 / 0;
		if (numberValue === 0 / 0) logger.FatalThrow("Failed to deserialize input");
		return BitField.FromArray(input.split("").map((value) => tonumber(value)!));
	};

	/**
	 * Checks if the value is a BitField.
	 * @param value
	 * @returns
	 */
	public static Is = (value: unknown): value is BitField => {
		if (!typeIs(value, "table")) return false;
		return value instanceof BitField;
	};

	/**
	 * Gets the length of the BitField.
	 * @returns
	 */
	public GetLength() {
		let value = this.Value;
		let length = 0;

		while (value > 0) {
			length += 1;
			value >>= 1;
		}

		return math.max(this.MinLength, length);
	}

	/**
	 * Gets the number of bits that are on.
	 * @returns
	 */
	public Count() {
		let value = this.Value;
		let count = 0;

		while (value > 0) {
			// eslint-disable-next-line roblox-ts/lua-truthiness
			if (value & 1) count += 1;
			value >>= 1;
		}

		return count;
	}

	/**
	 * Intersects the bits using the masks.
	 * @param masks
	 * @returns
	 */
	public Intersect(...masks: Array<number>) {
		this.Value &= BitField.CombineMasks(...masks);
		return this;
	}

	/**
	 * Checks if the bits intersect using the masks.
	 * @param masks
	 * @returns
	 */
	public Intersects(...masks: Array<number>) {
		const mask = BitField.CombineMasks(...masks);
		return (this.Value & mask) !== 0;
	}

	/**
	 * Gets the bit at the index.
	 * @param index
	 * @returns
	 */
	public Get(index: number) {
		assert(IsValidIndex(index), "Illegal argument: parameter 'index' must be an integer between 0 and 31");
		return ((this.Value >> index) & 1) === 1;
	}

	/**
	 * Gets a new BitField with the bits at the indices.
	 * @param from
	 * @param to
	 * @returns
	 */
	public GetRange(from: number, to: number) {
		assert(IsValidIndex(from), "Illegal argument: parameter 'from' must be an integer between 0 and 31");
		assert(IsValidIndex(to), "Illegal argument: parameter 'to' must be an integer between 0 and 31");
		assert(to > from, "Illegal argument: parameter 'to' must be larger than parameter 'from'");

		const length = to - from;
		const mask = (1 << length) - 1;
		const bitField = new BitField(length);
		bitField.On((this.Value >> from) & mask);

		return bitField;
	}

	/**
	 * Checks if the current value is equal to the combined masks.
	 * @param masks
	 * @returns
	 */
	public Test(...masks: Array<number>) {
		const mask = BitField.CombineMasks(...masks);
		return (this.Value & mask) === mask;
	}

	/**
	 * Tests if any of the bits intersect (using &) using the combined masks.
	 * @param masks
	 * @returns
	 */
	public TestAny(...masks: Array<number>) {
		const mask = BitField.CombineMasks(...masks);
		return (this.Value & mask) !== 0;
	}

	/**
	 * Tests the bit at the index using the value.
	 * @param value
	 * @param index
	 * @returns
	 */
	public TestAt(value: number, index: number) {
		return this.Get(index) === (value === 1);
	}

	/**
	 * Tests all the bits using the value.
	 * @param value
	 * @returns
	 */
	public TestAll(value: number) {
		let mask = 0;
		if (value > 0) mask = (value << this.GetLength()) - 1;
		return this.Value === mask;
	}

	/**
	 * Turns all bits on using the masks.
	 * @param masks
	 * @returns
	 */
	public On(...masks: Array<number>) {
		return this.Set(1, ...masks);
	}

	/**
	 * Turns all bits off using the masks.
	 * @param masks
	 * @returns
	 */
	public Off(...masks: Array<number>) {
		return this.Set(0, ...masks);
	}

	/**
	 * Sets the bits of the masks to the value.
	 * @param value
	 * @param masks
	 * @returns
	 */
	public Set(value: number, ...masks: Array<number>) {
		const mask = BitField.CombineMasks(...masks);

		if (value > 0) this.Value |= mask;
		else this.Value &= ~mask;

		return this;
	}

	/**
	 * Sets all the bits to the value.
	 * @param value
	 * @returns
	 */
	public SetAll(value: number) {
		const mask = (1 << this.GetLength()) - 1;
		return this.Set(value, mask);
	}

	/**
	 * Sets the bit at the index to the value.
	 * @param value
	 * @param index
	 * @returns
	 */
	public SetAt(value: number, index: number) {
		assert(IsValidIndex(index), "Illegal argument: parameter 'index' must be an integer between 0 and 31");
		return this.Set(value, 1 << index);
	}

	/**
	 * Sets the bits within the range to the value.
	 * @param value
	 * @param from
	 * @param to
	 * @returns
	 */
	public SetRange(value: number, from: number, to: number) {
		assert(IsValidIndex(from), "Illegal argument: parameter 'from' must be an integer between 0 and 31");
		assert(IsValidIndex(to), "Illegal argument: parameter 'to' must be an integer between 0 and 31");
		assert(to > from, "Illegal argument: parameter 'to' must be larger than parameter 'from'");

		let mask = (1 << (to - from)) - 1;
		if (from > 0) mask *= 2 * from;
		return this.Set(value, mask);
	}

	/**
	 * Flips the bits of the masks.
	 * @param masks
	 * @returns
	 */
	public Flip(...masks: Array<number>) {
		this.Value ^= BitField.CombineMasks(...masks);
		return this;
	}

	/**
	 * Flips all bits.
	 * @returns
	 */
	public FlipAll() {
		const mask = (1 << this.GetLength()) - 1;
		return this.Flip(mask);
	}

	/**
	 * Flips the bit at the index.
	 * @param index
	 * @returns
	 */
	public FlipAt(index: number) {
		assert(IsValidIndex(index), "Illegal argument: parameter 'index' must be an integer between 0 and 31");
		const mask = 1 << index;
		return this.Flip(mask);
	}

	/**
	 * Flips the bits within the range.
	 * @param from
	 * @param to
	 * @returns
	 */
	public FlipRange(from: number, to: number) {
		assert(IsValidIndex(from), "Illegal argument: parameter 'from' must be an integer between 0 and 31");
		assert(IsValidIndex(to), "Illegal argument: parameter 'to' must be an integer between 0 and 31");
		assert(to > from, "Illegal argument: parameter 'to' must be larger than parameter 'from'");

		let mask = (1 << (to - from)) - 1;
		if (from > 0) mask *= 2 * from;
		return this.Flip(mask);
	}

	/**
	 * Copies the other BitField's value to this BitField.
	 * @param otherBitField
	 * @returns
	 */
	public Copy(otherBitField: BitField) {
		this.Value = otherBitField.Value;
		return this;
	}

	/**
	 * Serializes this BitField to a string.
	 * @returns
	 */
	public Serialize() {
		let output = ToBinary(this.Value);
		if (this.MinLength > output.size()) output = "0".rep(this.MinLength - output.size()) + output;
		return output;
	}

	/**
	 * Clones this BitField and returns the clone.
	 * @returns
	 */
	public Clone() {
		return new BitField(this.MinLength).Copy(this);
	}

	public equals(other: unknown) {
		assert(BitField.Is(other), "Illegal argument: parameter 'other' must be a BitField");
		return this.Value === other.Value;
	}

	/**
	 * Converts this BitField to an array of booleans.
	 * @returns
	 */
	public ToArray() {
		const array = new Array<boolean>();
		let value = this.Value;
		let length = 0;

		while (value > 0) {
			array[length] = (value & 1) === 1;
			length += 1;
			value >>= 1;
		}

		if (this.MinLength > length) {
			const filler = new Array<boolean>(this.MinLength - length, false);
			for (const value of filler) array.push(value);
		}

		return Reverse(array);
	}

	/**
	 * Stringifies this BitField.
	 * @returns
	 */
	public ToString() {
		return `BitField(${this.Serialize()})`;
	}

	private readonly MinLength: number;
}

const metatable = getmetatable(BitField) as LuaMetatable<BitField>;

metatable.__tostring = (value) => value.ToString();
metatable.__unm = (value) => value.FlipAll();
