# RAW Viewer - 開発タスクリスト

## Phase 1: Project Setup & RAW Decoding
- [x] プロジェクト初期化 (Svelte 5 + Vite + TypeScript)
- [x] libraw-wasm統合 (デコーダーAPI)
- [x] 基本UI (Toolbar, Viewer, AdjustPanel)
- [x] テスト環境セットアップ (Vitest)

## Phase 2: WebGL Rendering
- [x] WebGL 2レンダラー (テクスチャアップロード、fullscreen quad描画)
- [x] 基本色調整シェーダー (exposure, WB, contrast, saturation)
- [x] パン・ズーム操作 (マウス/タッチ/ピンチ)

## Phase 3: Advanced Adjustments
- [x] 詳細色調整シェーダー (highlights, shadows, blacks, whites, vibrance)
- [x] トーンカーブエディタ (SVGベースUI + LUTシェーダー)
- [x] リアルタイムヒストグラム (RGB + 輝度)
- [x] シャープニング (アンシャープマスク)

## Phase 4: Export & Polish
- [x] JPEG/PNG書き出し (Canvas.toBlob)
- [x] TIFF書き出し (UTIF.js)
- [x] メタデータ表示 (EXIFパネル)
- [x] UI仕上げ (ダークテーマ、キーボードショートカット、ドラッグ&ドロップ)
- [x] ExportDialog (フォーマット/品質選択)
- [x] File System Access API対応
