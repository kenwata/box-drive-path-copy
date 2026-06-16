# Box Drive Path Copier

**English** | [日本語](#日本語)

---

## English

A Chrome extension that copies the current Box.com folder/file path to the clipboard as a local [Box Drive](https://www.box.com/drive) path.

### Features

- Copies the folder hierarchy you are viewing on Box.com as a local path
- Supports both Windows and macOS
- Works on folder pages and file preview pages
- Keyboard shortcut: **Ctrl+.** (Windows) / **Cmd+.** (macOS)
- Toolbar icon is enabled (color) only on Box pages; grayed out elsewhere

### Requirements

- **You must be invited to the folder as a user** so that it is synced via Box Drive. Folders shared via a link (without user invitation) are not accessible through Box Drive and will not work with this extension.
- Only folders accessible through **Box Drive** are supported — shared links are not supported.
- [Box Drive](https://www.box.com/drive) must be installed and the default mount path must be used
  - Windows: `%USERPROFILE%\Box\`
  - macOS: `~/Library/CloudStorage/Box-Box/`
- If you use a custom mount path, edit `config.js` to match

### Installation

**Chrome Web Store** (coming soon)

**Manual (developer mode)**

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the repository folder

### Usage

1. Open a folder or file page on [box.com](https://www.box.com)
2. Click the **Box Drive Path Copier** icon in the toolbar, or press **Ctrl+.** / **Cmd+.**
3. The local Box Drive path is copied to your clipboard

### Known Limitations

- Only the default Box Drive mount paths are supported out of the box. If you have configured a custom mount path, open `config.js` and update `root` for your OS.
- The extension relies on Box's DOM structure. If Box updates its UI, path detection may break until the extension is updated.

### Privacy

This extension does not collect, store, or transmit any data. It reads the folder hierarchy from the current Box page, converts it to a local path string, and writes that string to your clipboard — nothing more.

### License

[MIT](LICENSE) © 2026 kenwata

---

## 日本語

Box.comで開いているフォルダ/ファイルの階層を、ローカルの[Box Drive](https://www.box.com/drive)パスとしてクリップボードにコピーするChrome拡張機能です。

### 機能

- Box.comで表示しているフォルダ階層をローカルパスとしてコピー
- Windows・macOS 両対応
- フォルダページとファイルプレビューページで動作
- キーボードショートカット: **Ctrl+.** (Windows) / **Cmd+.** (macOS)
- Boxページでのみツールバーアイコンが有効（カラー）になり、それ以外ではグレーアウト

### 前提条件

- **対象はBox Driveでアクセスできるフォルダのみです。** フォルダに「ユーザーとして招待」されていることが必要で、リンク共有でアクセスしているフォルダはBox Driveに同期されないため、本拡張機能は動作しません。
- [Box Drive](https://www.box.com/drive) がインストール済みで、デフォルトのマウントパスを使用していること
  - Windows: `%USERPROFILE%\Box\`
  - macOS: `~/Library/CloudStorage/Box-Box/`
- カスタムマウントパスを使用している場合は `config.js` を編集してください

### インストール

**Chrome ウェブストア**（近日公開予定）

**手動（デベロッパーモード）**

1. このリポジトリをクローンまたはダウンロード
2. Chrome で `chrome://extensions` を開く
3. 右上の**デベロッパーモード**を有効にする
4. **パッケージ化されていない拡張機能を読み込む**をクリックし、リポジトリのフォルダを選択

### 使い方

1. [box.com](https://www.box.com) でフォルダやファイルのページを開く
2. ツールバーの **Box Drive Path Copier** アイコンをクリック、または **Ctrl+.** / **Cmd+.** を押す
3. ローカルの Box Drive パスがクリップボードにコピーされます

### 既知の制約

- デフォルトの Box Drive マウントパスのみ対応しています。カスタムパスを使用している場合は `config.js` の `root` を変更してください。
- BoxのDOMに依存しているため、BoxのUI変更によっては動作しなくなる場合があります。

### プライバシー

本拡張機能はデータの収集・保存・送信を一切行いません。Boxページの階層情報をローカルでパス文字列に変換し、クリップボードに書き込むだけです。

### ライセンス

[MIT](LICENSE) © 2026 kenwata
