# RAW Viewer - 開発タスクリスト

## Phase 1: Project Setup & RAW Decoding
- [x] プロジェクト初期化 (Svelte 5 + Vite + TypeScript)
- [x] libraw-wasm統合 (デコーダーAPI)
- [x] 基本UI (Toolbar, Viewer, AdjustPanel)
- [ ] テスト環境セットアップ

## Phase 2: WebGL Rendering
- [x] WebGL 2レンダラー (テクスチャアップロード、fullscreen quad描画)
- [x] 基本色調整シェーダー (exposure, WB, contrast, saturation)
- [ ] パン・ズーム操作 (マウス/タッチ)

## Phase 3: Advanced Adjustments
- [x] 詳細色調整シェーダー (highlights, shadows, blacks, whites, vibrance)
- [ ] トーンカーブエディタ (SVGベースUI + LUTシェーダー)
- [ ] リアルタイムヒストグラム
- [x] シャープニング (アンシャープマスク)

## Phase 4: Export & Polish
- [ ] JPEG/PNG書き出し (Canvas.toBlob)
- [ ] TIFF書き出し (UTIF.js)
- [ ] メタデータ表示 (EXIFパネル)
- [ ] UI仕上げ (レスポンシブ、ダークテーマ、キーボードショートカット)
