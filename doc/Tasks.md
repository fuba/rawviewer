# RAW Viewer - 開発タスクリスト

## Phase 1: Project Setup & RAW Decoding
- [x] プロジェクト初期化 (Svelte 5 + Vite + TypeScript)
- [x] Go + libraw バックエンド実装
- [x] デコード結果のバイナリエンベロープ化
- [x] 基本UI (Toolbar, Viewer, AdjustPanel)
- [x] テスト環境セットアップ (Vitest)

## Phase 2: Rendering & Interaction
- [x] WebGL 2レンダラー (texture upload / fullscreen quad)
- [x] Canvas2D フォールバックレンダラー
- [x] パン・ズーム操作
- [x] プレビュー軽量化 (操作時 DPR 低減)

## Phase 3: Editing Features
- [x] 基本色調整 (exposure, WB, contrast, saturation)
- [x] 詳細色調整 (highlights, shadows, whites, blacks, vibrance)
- [x] トーンカーブエディタ
- [x] 回転・クロップ
- [x] 自動補正 (auto adjust)
- [x] ヒストグラム表示

## Phase 4: Export
- [x] JPEG/PNG 書き出し
- [x] TIFF 書き出し
- [x] Export サイズ指定 (縦横比保持)
- [x] フル解像度デコード経由の高品質 Export

## Phase 5: Stability & UX
- [x] デコード timeout / abort 対応
- [x] 連続操作時の再描画間引き
- [x] Open / Export 進捗バー
- [x] Before/After 比較バー（ドラッグ分割）
- [x] Docker Compose 開発環境の整備
- [x] ポート自動探索 (API) + WEB 5173 固定
