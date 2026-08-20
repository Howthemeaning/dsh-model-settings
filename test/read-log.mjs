// Decode a dsh session .zstd log (multi-frame) and print request/header + descriptor info.
import { readFileSync } from "node:fs";
import { zstdDecompressSync } from "node:zlib";

const path = process.argv[2];
const buf = readFileSync(path);
const ZSTD_MAGIC = 4247762216;

function scanZstdFrames(buffer) {
	const frames = [];
	let offset = 0;
	while (offset < buffer.length) {
		const start = offset;
		if (buffer.length - offset < 4) break;
		if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) break;
		offset += 4;
		if (offset === buffer.length) break;
		const descriptor = buffer.readUInt8(offset);
		offset += 1;
		if ((descriptor & 24) !== 0) break;
		const contentSizeFlag = descriptor >>> 6;
		const singleSegment = (descriptor & 32) !== 0;
		const checksum = (descriptor & 4) !== 0;
		const dictionaryFlag = descriptor & 3;
		const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
		const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : 1 << contentSizeFlag;
		const remainingHeaderBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
		if (buffer.length - offset < remainingHeaderBytes) break;
		offset += remainingHeaderBytes;
		let ok = false;
		for (;;) {
			if (buffer.length - offset < 3) break;
			const blockHeader = buffer.readUIntLE(offset, 3);
			offset += 3;
			const lastBlock = (blockHeader & 1) !== 0;
			const blockType = blockHeader >>> 1 & 3;
			const blockSize = blockHeader >>> 3;
			if (blockType === 3) break;
			const payloadBytes = blockType === 1 ? 1 : blockSize;
			if (buffer.length - offset < payloadBytes) break;
			offset += payloadBytes;
			if (lastBlock) { ok = true; break; }
		}
		if (!ok) break;
		if (checksum) {
			if (buffer.length - offset < 4) break;
			offset += 4;
		}
		frames.push({ start, end: offset });
	}
	return frames;
}

let text = "";
for (const fr of scanZstdFrames(buf)) {
	try {
		text += zstdDecompressSync(buf.subarray(fr.start, fr.end)).toString("utf8");
	} catch {
		/* skip bad frame */
	}
}
const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
for (const line of lines) {
	if (!/request\/header|subagent\/descriptor|agentModel|agentProvider/.test(line)) continue;
	try {
		const ev = JSON.parse(line);
		const data = ev.data ?? {};
		const model = data.header?.config?.model ?? data.agentModel ?? data.config?.model;
		const provider = data.header?.config?.provider ?? data.agentProvider ?? data.config?.provider;
		const effort = data.header?.config?.reasoningEffort ?? data.config?.reasoningEffort;
		console.log(`${ev.type}: provider=${provider} model=${model} effort=${effort} ${data.mode ? `mode=${data.mode}` : ""} ${data.reason ? `reason=${data.reason}` : ""}`);
	} catch {
		/* skip */
	}
}
