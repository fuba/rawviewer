package main

import (
	"log"
	"net/http"
	"os"

	"rawviewer/backend/internal/api"
	"rawviewer/backend/internal/decode"
)

func main() {
	addr := os.Getenv("RAWVIEWER_API_ADDR")
	if addr == "" {
		addr = ":8080"
	}

	handler := api.NewHandler(realDecoder{})
	log.Printf("rawviewer-api listening on %s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}

type realDecoder struct{}

func (realDecoder) DecodeRawBytes(rawData []byte, ext string, maxDimension int) (*api.DecodedResult, error) {
	result, err := decode.DecodeRawBytes(rawData, ext, maxDimension)
	if err != nil {
		return nil, err
	}

	return &api.DecodedResult{
		Width:         result.Width,
		Height:        result.Height,
		Channels:      result.Channels,
		BitsPerSample: result.BitsPerSample,
		PixelBytes:    result.PixelBytes,
		Metadata:      result.Metadata,
	}, nil
}
