package wire

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
)

const (
	magic      = "RVD1"
	headerSize = 4 + 4*6
)

func BuildDecodeEnvelope(
	width int,
	height int,
	channels int,
	bitsPerSample int,
	metadata any,
	pixelBytes []byte,
) ([]byte, error) {
	if width <= 0 || height <= 0 {
		return nil, fmt.Errorf("invalid image dimensions: %dx%d", width, height)
	}
	if channels < 1 || channels > 4 {
		return nil, fmt.Errorf("invalid channels: %d", channels)
	}
	if bitsPerSample != 8 && bitsPerSample != 16 {
		return nil, fmt.Errorf("invalid bits per sample: %d", bitsPerSample)
	}

	metaBytes, err := json.Marshal(metadata)
	if err != nil {
		return nil, fmt.Errorf("encode metadata: %w", err)
	}

	total := headerSize + len(metaBytes) + len(pixelBytes)
	out := make([]byte, total)
	copy(out[:4], []byte(magic))

	binary.LittleEndian.PutUint32(out[4:8], uint32(width))
	binary.LittleEndian.PutUint32(out[8:12], uint32(height))
	binary.LittleEndian.PutUint32(out[12:16], uint32(channels))
	binary.LittleEndian.PutUint32(out[16:20], uint32(bitsPerSample))
	binary.LittleEndian.PutUint32(out[20:24], uint32(len(pixelBytes)))
	binary.LittleEndian.PutUint32(out[24:28], uint32(len(metaBytes)))

	copy(out[headerSize:headerSize+len(metaBytes)], metaBytes)
	copy(out[headerSize+len(metaBytes):], pixelBytes)

	return out, nil
}
