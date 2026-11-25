import { describe, expect, it } from "vitest";

// Mock browser globals for node test environment
if (typeof (globalThis as any).Worker === "undefined") {
	(globalThis as any).Worker = class {
		postMessage() {}
		onmessage() {}
		terminate() {}
		addEventListener() {}
		removeEventListener() {}
	};
}

const {
	AUTO_DOWNLOAD_AUDIO_OFFSET_SECONDS,
	padAudioBufferStart,
	shiftAudioBufferStart,
} = await import("./audio-engine");

describe("padAudioBufferStart", () => {
	it("returns the original buffer when seconds <= 0", () => {
		const mockCtx = {} as AudioContext;
		const mockBuffer = {
			sampleRate: 44100,
			numberOfChannels: 2,
			length: 44100,
			duration: 1.0,
		} as AudioBuffer;

		const result = padAudioBufferStart(mockCtx, mockBuffer, 0);
		expect(result).toBe(mockBuffer);
	});

	it("prepends silence by shifting existing audio data by exactly 0.03 seconds", () => {
		const sampleRate = 44100;
		const duration = 1.0;
		const originalLength = sampleRate * duration;
		const padSeconds = AUTO_DOWNLOAD_AUDIO_OFFSET_SECONDS; // 0.03s
		const expectedPadSamples = Math.round(padSeconds * sampleRate); // 1323 samples

		const channelData0 = new Float32Array(originalLength).fill(0.5);
		const channelData1 = new Float32Array(originalLength).fill(-0.5);

		const mockBuffer = {
			sampleRate,
			numberOfChannels: 2,
			length: originalLength,
			duration,
			getChannelData: (c: number) => (c === 0 ? channelData0 : channelData1),
		} as unknown as AudioBuffer;

		const allocatedChannels: Float32Array[] = [];
		const mockCtx = {
			createBuffer: (channels: number, length: number, rate: number) => {
				const buffers = Array.from({ length: channels }, () => new Float32Array(length));
				allocatedChannels.push(...buffers);
				return {
					numberOfChannels: channels,
					length,
					sampleRate: rate,
					duration: length / rate,
					getChannelData: (c: number) => buffers[c],
				} as unknown as AudioBuffer;
			},
		} as unknown as AudioContext;

		const paddedBuffer = padAudioBufferStart(mockCtx, mockBuffer, padSeconds);

		expect(paddedBuffer.length).toBe(originalLength + expectedPadSamples);
		expect(paddedBuffer.duration).toBeCloseTo(duration + padSeconds, 4);

		const paddedData0 = paddedBuffer.getChannelData(0);
		const paddedData1 = paddedBuffer.getChannelData(1);

		// The first expectedPadSamples must be exact silence (0.0)
		for (let i = 0; i < expectedPadSamples; i++) {
			expect(paddedData0[i]).toBe(0);
			expect(paddedData1[i]).toBe(0);
		}

		// After the padding offset, original sound data starts
		expect(paddedData0[expectedPadSamples]).toBe(0.5);
		expect(paddedData1[expectedPadSamples]).toBe(-0.5);
		expect(paddedData0[paddedBuffer.length - 1]).toBe(0.5);
		expect(paddedData1[paddedBuffer.length - 1]).toBe(-0.5);
	});
});

describe("shiftAudioBufferStart", () => {
	function makeMockBuffer(samples: number[], sampleRate = 1000) {
		const ch0 = new Float32Array(samples);
		return {
			sampleRate,
			numberOfChannels: 1,
			length: ch0.length,
			duration: ch0.length / sampleRate,
			getChannelData: () => ch0,
		} as unknown as AudioBuffer;
	}

	const mockCtx = {
		createBuffer: (channels: number, length: number, rate: number) => {
			const buffers = Array.from(
				{ length: channels },
				() => new Float32Array(length),
			);
			return {
				numberOfChannels: channels,
				length,
				sampleRate: rate,
				duration: length / rate,
				getChannelData: (c: number) => buffers[c],
			} as unknown as AudioBuffer;
		},
	} as unknown as AudioContext;

	it("prepends silence for positive offsets and trims from start for negative offsets", () => {
		const buffer = makeMockBuffer([0.1, 0.2, 0.3, 0.4, 0.5], 1000);

		const delayed = shiftAudioBufferStart(mockCtx, buffer, 0.002);
		expect(Array.from(delayed.getChannelData(0)).map((v) => +v.toFixed(2))).toEqual([
			0, 0, 0.1, 0.2, 0.3, 0.4, 0.5,
		]);

		const advanced = shiftAudioBufferStart(mockCtx, buffer, -0.002);
		expect(Array.from(advanced.getChannelData(0)).map((v) => +v.toFixed(2))).toEqual([
			0.3, 0.4, 0.5,
		]);
	});

	it("preserves at least 1 sample when trimming past buffer length", () => {
		const buffer = makeMockBuffer([0.1, 0.2, 0.3], 1000);
		const trimmed = shiftAudioBufferStart(mockCtx, buffer, -1);
		expect(trimmed.length).toBe(1);
		expect(trimmed.getChannelData(0)[0]).toBeCloseTo(0.3);
	});
});
