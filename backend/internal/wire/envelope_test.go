package wire

import (
	"encoding/binary"
	"encoding/json"
	"testing"
)

func TestBuildDecodeEnvelope(t *testing.T) {
	meta := map[string]any{
		"make":   "SIGMA",
		"model":  "fp",
		"iso":    100,
		"width":  6064,
		"height": 4042,
	}
	pixels := []byte{1, 2, 3, 4, 5, 6}

	out, err := BuildDecodeEnvelope(2, 1, 3, 16, meta, pixels)
	if err != nil {
		t.Fatalf("BuildDecodeEnvelope returned error: %v", err)
	}

	if got := string(out[:4]); got != "RVD1" {
		t.Fatalf("magic mismatch: %q", got)
	}

	if got := binary.LittleEndian.Uint32(out[4:8]); got != 2 {
		t.Fatalf("width mismatch: %d", got)
	}
	if got := binary.LittleEndian.Uint32(out[8:12]); got != 1 {
		t.Fatalf("height mismatch: %d", got)
	}
	if got := binary.LittleEndian.Uint32(out[12:16]); got != 3 {
		t.Fatalf("channels mismatch: %d", got)
	}
	if got := binary.LittleEndian.Uint32(out[16:20]); got != 16 {
		t.Fatalf("bits mismatch: %d", got)
	}

	pixelLen := binary.LittleEndian.Uint32(out[20:24])
	metaLen := binary.LittleEndian.Uint32(out[24:28])

	metaStart := 28
	metaEnd := metaStart + int(metaLen)
	pixelEnd := metaEnd + int(pixelLen)
	if pixelEnd != len(out) {
		t.Fatalf("invalid envelope size: pixelEnd=%d len=%d", pixelEnd, len(out))
	}

	var parsed map[string]any
	if err := json.Unmarshal(out[metaStart:metaEnd], &parsed); err != nil {
		t.Fatalf("metadata json parse failed: %v", err)
	}
	if parsed["model"] != "fp" {
		t.Fatalf("metadata mismatch: %#v", parsed["model"])
	}
}
