package decode

import (
	"encoding/binary"
	"fmt"
	"os"

	"github.com/tlaceby/rawkit/core"
)

type Metadata struct {
	Make        string  `json:"make"`
	Model       string  `json:"model"`
	ISO         int     `json:"iso"`
	Shutter     float64 `json:"shutter"`
	Aperture    float64 `json:"aperture"`
	FocalLength float64 `json:"focalLength"`
	Width       int     `json:"width"`
	Height      int     `json:"height"`
	Description string  `json:"description"`
	Artist      string  `json:"artist"`
}

type Result struct {
	Width         int
	Height        int
	Channels      int
	BitsPerSample int
	PixelBytes    []byte
	Metadata      Metadata
}

func DecodeRawBytes(rawData []byte, ext string, maxDimension int) (*Result, error) {
	if len(rawData) == 0 {
		return nil, fmt.Errorf("empty input")
	}
	if ext == "" {
		ext = ".dng"
	}
	if ext[0] != '.' {
		ext = "." + ext
	}

	tmpFile, err := os.CreateTemp("", "rawviewer-*"+ext)
	if err != nil {
		return nil, fmt.Errorf("create temp file: %w", err)
	}
	tmpPath := tmpFile.Name()
	if _, err := tmpFile.Write(rawData); err != nil {
		tmpFile.Close()
		_ = os.Remove(tmpPath)
		return nil, fmt.Errorf("write temp file: %w", err)
	}
	if err := tmpFile.Close(); err != nil {
		_ = os.Remove(tmpPath)
		return nil, fmt.Errorf("close temp file: %w", err)
	}
	defer func() {
		_ = os.Remove(tmpPath)
	}()

	img, err := core.ReadAll(tmpPath)
	if err != nil {
		return nil, fmt.Errorf("raw decode failed: %w", err)
	}
	if img == nil || img.Data == nil {
		return nil, fmt.Errorf("raw decode returned empty image")
	}

	data := img.Data
	if data.Channels != core.LIBRAW_CHANNELS_RGB && data.Channels != core.LIBRAW_CHANNELS_RGBA {
		return nil, fmt.Errorf("unsupported channel layout: %d", data.Channels)
	}
	originalWidth := data.Width
	originalHeight := data.Height

	if maxDimension > 0 {
		resized := resizeToMaxDimension(data, maxDimension)
		if resized != nil {
			data = resized
		}
	}

	pixelBytes := u16SliceToBytes(data.Data)

	meta := Metadata{
		Width:       originalWidth,
		Height:      originalHeight,
		Description: "",
		Artist:      "",
	}
	if img.Meta != nil {
		meta.Make = img.Meta.CameraMake
		meta.Model = img.Meta.CameraModel
		meta.ISO = img.Meta.ISO
		meta.Shutter = float64(img.Meta.ShutterSpeed)
		meta.Aperture = float64(img.Meta.Aperture)
		meta.FocalLength = float64(img.Meta.FocalLength)
	}

	return &Result{
		Width:         data.Width,
		Height:        data.Height,
		Channels:      int(data.Channels),
		BitsPerSample: 16,
		PixelBytes:    pixelBytes,
		Metadata:      meta,
	}, nil
}

func resizeToMaxDimension(data *core.ImageData, maxDimension int) *core.ImageData {
	if data == nil || maxDimension <= 0 {
		return data
	}
	w := data.Width
	h := data.Height
	if w <= 0 || h <= 0 {
		return data
	}
	longSide := w
	if h > longSide {
		longSide = h
	}
	if longSide <= maxDimension {
		return data
	}

	scale := float64(maxDimension) / float64(longSide)
	targetW := int(float64(w) * scale)
	targetH := int(float64(h) * scale)
	if targetW < 1 {
		targetW = 1
	}
	if targetH < 1 {
		targetH = 1
	}

	channels := int(data.Channels)
	if channels <= 0 {
		return data
	}
	out := make([]uint16, targetW*targetH*channels)
	for y := 0; y < targetH; y++ {
		srcY := y * h / targetH
		for x := 0; x < targetW; x++ {
			srcX := x * w / targetW
			srcIdx := (srcY*w + srcX) * channels
			dstIdx := (y*targetW + x) * channels
			copy(out[dstIdx:dstIdx+channels], data.Data[srcIdx:srcIdx+channels])
		}
	}

	return &core.ImageData{
		Width:      targetW,
		Height:     targetH,
		Channels:   data.Channels,
		Colorspace: data.Colorspace,
		Data:       out,
	}
}

func u16SliceToBytes(in []uint16) []byte {
	out := make([]byte, len(in)*2)
	for i := range in {
		binary.LittleEndian.PutUint16(out[i*2:i*2+2], in[i])
	}
	return out
}
