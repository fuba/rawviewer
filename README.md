# RAW Viewer

RAW 画像をブラウザで編集し、JPEG/PNG/TIFF で書き出すための Web アプリです。  
フロントエンドは Svelte 5 + WebGL2、RAW デコードは Go + libraw バックエンドで処理します。

## 主な機能

- RAW 読み込み（CR2/CR3/NEF/ARW/DNG など）
- 露出・WB・コントラスト・ハイライト/シャドウ・彩度・シャープネス調整
- トーンカーブ編集（RGB / R / G / B）
- 回転、クロップ、自動補正
- ヒストグラム表示
- Export 時の出力サイズ指定（縦横比保持）
- JPEG / PNG / TIFF 書き出し
- Open / Export の進捗バー表示
- WebGL 非対応環境では Canvas2D フォールバック

## アーキテクチャ

- Frontend: Svelte 5 + TypeScript + Vite
- Rendering: WebGL2（必要に応じて Canvas2D）
- Backend: Go + libraw
- Transport: `POST /api/decode` でバイナリエンベロープを返却
- Runtime: Docker Compose（frontend/backend の 2 サービス）

## 必要環境

- Docker
- Docker Compose v2（`docker compose`）

## 起動（推奨: Docker）

```bash
./scripts/docker-up.sh
```

このスクリプトは以下を行います。

- WEB ポートを `5173` で固定
- API ポートは `8080` から空きポートを自動探索
- `.env.compose` を生成して `docker compose up -d --build` を実行

起動後:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:<API_PORT>/api/healthz`

停止:

```bash
./scripts/docker-down.sh
```

## ログ

コンテナ内で以下にログ出力します。

- frontend: `/tmp/rawviewer-frontend.log`
- backend: `/tmp/rawviewer-backend.log`

## 開発コマンド

```bash
npm test
npm run check
npm run build
```

## API

### `GET /api/healthz`

ヘルスチェック。`ok` を返します。

### `POST /api/decode`

RAW バイト列を受け取り、デコード済みピクセルとメタデータをバイナリ形式で返します。

リクエストヘッダ:

- `Content-Type: application/octet-stream`
- `X-Filename: <optional>`
- `X-Max-Dimension: <optional>`

## 既知の注意点

- RAW デコードはサーバサイド処理のため、ファイルサイズによって時間がかかります。
- プレビューは軽量化のため低解像度デコードを使い、Export 時にフル解像度デコードします。
- TIFF Export はピクセル経路で処理するため、JPEG/PNG より時間がかかる場合があります。

## ライセンス

CC0 1.0 Universal
