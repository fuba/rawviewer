package api

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"

	"rawviewer/backend/internal/wire"
)

const maxUploadSize = 200 * 1024 * 1024 // 200MB

type Decoder interface {
	DecodeRawBytes(rawData []byte, ext string, maxDimension int) (*DecodedResult, error)
}

type DecodedResult struct {
	Width         int
	Height        int
	Channels      int
	BitsPerSample int
	PixelBytes    []byte
	Metadata      any
}

func NewHandler(decoder Decoder) http.Handler {
	if decoder == nil {
		panic("decoder must not be nil")
	}
	mux := http.NewServeMux()

	mux.HandleFunc("/api/healthz", func(w http.ResponseWriter, _ *http.Request) {
		setCORS(w)
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		_, _ = w.Write([]byte("ok"))
	})

	mux.HandleFunc("/api/decode", func(w http.ResponseWriter, r *http.Request) {
		setCORS(w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		rawData, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxUploadSize))
		if err != nil {
			http.Error(w, fmt.Sprintf("read request body failed: %v", err), http.StatusBadRequest)
			return
		}
		if len(rawData) == 0 {
			http.Error(w, "request body is empty", http.StatusBadRequest)
			return
		}

		ext := extensionFromFilename(r.Header.Get("X-Filename"))
		maxDimension, err := parseMaxDimension(r.Header.Get("X-Max-Dimension"))
		if err != nil {
			http.Error(w, fmt.Sprintf("invalid X-Max-Dimension: %v", err), http.StatusBadRequest)
			return
		}

		result, err := decoder.DecodeRawBytes(rawData, ext, maxDimension)
		if err != nil {
			http.Error(w, fmt.Sprintf("decode failed: %v", err), http.StatusBadRequest)
			return
		}

		envelope, err := wire.BuildDecodeEnvelope(
			result.Width,
			result.Height,
			result.Channels,
			result.BitsPerSample,
			result.Metadata,
			result.PixelBytes,
		)
		if err != nil {
			http.Error(w, fmt.Sprintf("encode response failed: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("Cache-Control", "no-store")
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write(envelope); err != nil {
			log.Printf("write decode response failed: %v", err)
			return
		}
	})

	return mux
}

func setCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Filename, X-Max-Dimension")
}

func extensionFromFilename(name string) string {
	for i := len(name) - 1; i >= 0; i-- {
		if name[i] == '.' {
			return name[i:]
		}
		if name[i] == '/' || name[i] == '\\' {
			break
		}
	}
	return ""
}

func parseMaxDimension(value string) (int, error) {
	if value == "" {
		return 0, nil
	}
	n, err := strconv.Atoi(value)
	if err != nil {
		return 0, err
	}
	if n <= 0 {
		return 0, fmt.Errorf("must be > 0")
	}
	return n, nil
}
