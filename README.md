# OpenLayers Layer Manager
OpenLayersにおいてレイヤーの表示/非表示、重なり順、透明度を管理する

v6.3.1にて動作確認

[sample](https://yonda-yonda.github.io/ol-layer-manager/sample/)

## 使い方
### 初期化
`new OLM(map, options)`

### argument
* `map` ol mapオブジェクト (required)
* `options` オプション

#### configuration of options
* `separator` パスの区切り文字、デフォルトは`/`

### example
```js
const map = new ol.Map({
	target: 'map',
	view: new ol.View({
		center: ol.proj.fromLonLat([139.765, 35.65]),
		zoom: 10,
	})
});

const manager = new OLM(map);
```

### 追加(レイヤー)
`manager.addLayer(id, layer, options)`

レイヤーを追加する。

### argument
* `id` レイヤーID (required)
* `layer` olのaddLayerの第一引数と同じ (required)
* `options` オプション

#### configuration of options
* `index` 指定されたindexの位置に追加する。未指定の場合、末尾に追加される。
* `fixedTo` 値(`overlay`or`underlay`)が指定された場合、最前面または最背面に固定する。
			
### example
```js
manager.addLayer('pale', new ol.layer.Tile({
	minZoom: 5,
	source: new ol.source.XYZ({
		attributions: [
			"<a href='http: //maps.gsi.go.jp/development/ichiran.html'>地理院タイル</a>",
		],
		maxZoom: 18,
		url: "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",
	})
}));
```

### 追加(レイヤーグループ)
`manager.addGroup(id, options)`

レイヤーグループを追加する。

### argument
* `id` レイヤーID (required)
* `options` オプション

#### configuration of options
* `type` グループのタイプ デフォルトは`multi`
* `visible` グループの表示状態 デフォルトは`true`
* `index` 指定されたindexの位置に追加する。未指定の場合、末尾に追加される。
* `fixedTo` 値(`overlay`or`underlay`)が指定された場合、最前面または最背面に固定する。
			
### example
```js
manager.addGroup("group1", {
	index: 1
});
```

### グループへ追加
#### addLayer
親となるグループを追加した上で、addLayerまたはaddGroupで`親のレイヤーグループID`+`区切り文字(/)`+`追加するレイヤーのID`をidに設定する。

#### addSource
親となるグループを追加した上で、`親のレイヤーグループID`+`区切り文字(/)`+`追加するソースのID`をidに設定する。

### example
```js
manager.addGroup('base', {
	fixedTo: 'underlay'
});
manager.addLayer('base/photo', new ol.layer.Tile({
	minZoom: 12,
	source: new ol.source.XYZ({
		attributions: [
			"<a href='http: //maps.gsi.go.jp/development/ichiran.html'>地理院タイル</a>",
		],
		maxZoom: 18,
		url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
	})
}));
```
### シングルグループ
直下のレイヤーオブジェクトのうち、表示状態にできるのは1つのみのグループ。

showで選択レイヤーオブジェクトが切り替わる。

レイヤーオブジェクトを表示ステータスで追加した場合も、グループ内の選択レイヤーオブジェクトが切り替わる。


### example
```js
manager.addGroup({
	id: "group1"
}, {
	type: "single"
});
```


### 削除(レイヤー)
`manager.removeLayer(id)`

指定したレイヤーを削除する。

### argument
* `id` 削除したいレイヤーID (required)


### example
```js
manager.removeLayer("pale");
```

### 削除(レイヤーグループ)
`manager.removeGroup(id)`

指定したレイヤーグループを削除する。このとき配下のレイヤーオブジェクトもすべて削除される。

### argument
* `id` 削除したいレイヤーID (required)

### example
```js
manager.removeGroup("group1");
```

### リセット
`manager.reset(options)`

全て削除する。

### argument
* `options` オプション

#### configuration of options
* `id:` 指定した要素の配下を全て削除する。 未指定の場合はmanager配下を全て削除する。


### example
```js
manager.reset();
```


### 表示
`manager.show(id, options)`

指定したレイヤーオブジェクトを表示状態にする。
祖先に表示ステータス(visible)がfalseのグループが1つでもある場合、自身の表示ステータスのみ変更される。
またレイヤーグループの場合、配下で表示ステータス(visible)がtrueのレイヤーオブジェクトを表示状態にする。

### argument
* `id` 表示したいレイヤーオブジェクトID (required)
* `options` オプション

#### configuration of options
* `force:` 配下の要素の表示ステータス(visible)を強制的に書き換える。 デフォルトは`false`

### example
```js
manager.show("group1");
```

### 非表示
`manager.hide(id, options)`

指定したレイヤーオブジェクトと配下のレイヤーオブジェクトを非表示状態にする。

### argument
* `id` 表示したいレイヤーオブジェクトID (required)
* `options` オプション

#### configuration of options
* `force:` 配下の要素の表示ステータス(visible)を強制的に書き換える。 デフォルトは`false`

### example
```js
manager.hide("group1");
```

### 移動
`manager.move(id, beforeId)`

レイヤーオブジェクトの位置を移動する。

指定したIDが最前面または最背面のレイヤーオブジェクトだった場合エラーとなる。

### argument
* `id` 移動したいレイヤーID (required)
* `beforeId` 移動先レイヤーID 未指定の場合は末尾へ移動する。

### example
```js
manager.move("group1", "pale");
```

### 最前面へ移動
`manager.bringToFront(id)`

`manager.move(id)`のショートハンド

### argument
* `id` 移動したいレイヤーID (required)


### 不透明度
`manager.setOpacity(id, opacity)`

レイヤーの不透明度を設定する。

レイヤーグループの場合、配下のレイヤーすべてに値を設定する。

### argument
* `id` 移動したいレイヤーID (required)
* `opacity` 透過度 (required)

### example
```js
manager.setOpacity("group1", 0.8);
```

### 表示状態の確認
`manager.isVisible(id, options)`

指定したレイヤーオブジェクトの表示状態を確認にする。

### argument
* `options` オプション

#### configuration of options
* `ownStatus:` 祖先に表示ステータス(visible)に関わらず自身の表示ステータスのみ参照する。 デフォルトは`false`

### example
```js
manager.isVisible("group1");
```

### surce書き換え
`manager.setSource(id, source)`

layerのsourceを書き換える。idがgroupの場合は無視させる。

### argument
* `id` レイヤーID (required)
* `layer` ol.layerのsetSourceの引数と同じ (required)

### example
```js
manager.setSource('shape',new ol.source.Vector({
	features: new ol.format.GeoJSON({
		featureProjection: 'EPSG:3857'
	}).readFeatures(geojson)
}))
```

### mapのメソッド呼び出し
`manager.invoke(funcName, args..)`

内部のolオブジェクトのメソッドを実行する。

### argument
* `funcName` 呼び出すメソッド名 (required)

### example
```js
manager.invoke("getView")
```