import _ from 'lodash'
import {
	version
} from '../package.json';
const PATH_SEPARATOR = '/'

const isNumber = (n) => {
	return typeof (n) === 'number' && n - n === 0;
}
const deepExtend = (base, target) => {
	return _.defaultsDeep(_.cloneDeep(target), _.cloneDeep(base))
}

const adjustIndex = (list, index) => {
	/**
	 * インデックスを配列の範囲内に整形する
	 * @param {number} index - 添字
	 * @param {*[]} list - 配列
	 * @return {number} 配列の範囲に収まった添字、範囲外の場合list.length(末尾)
	 */
	if (typeof index !== 'number' || index > list.length || index < 0) {
		index = list.length;
	}
	return index
}

const getIndexByKey = (list, key, value) => {
	/**
	 * オブジェクトの配列からキーの値が一致するオブジェクトのインデックスを返す
	 * @param {*[]} list - 配列
	 * @param {string} key - 探索対象のキー
	 * @param {*} value - 探索対象の値
	 * @return {number} 値が一致したオブジェクトの配列
	 */
	for (let i = 0; i < list.length; i++) {
		if (list[i][key] === value) return i;
	}
	return -1;
}

const addList = (target, list, index = undefined) => {
	/**
	 * 配列に対象を加える(破壊的)
	 * @param {*} target - 対象
	 * @param {*[]} list - 配列
	 * @param {number} index - 添字 範囲外または未指定の場合末尾に加えられる
	 */
	index = adjustIndex(list, index);
	list.splice(index, 0, target);
}

const removeList = (target, list) => {
	/**
	 * 対象が配列に含まれていた場合削除する(破壊的)
	 * @param {number} target - 対象
	 * @param {*[]} list - 配列
	 */
	if (list.includes(target))
		return list.splice(list.indexOf(target), 1);
}

const getParentPath = (path, separator) => {
	/**
	 * 親のIDを取得する
	 * @param {string} path - パス
	 * @param {string} separator - 区切り文字
	 * @param {string} parentPath - 親グループのパス
	 */
	const index = path.lastIndexOf(separator);
	if (index < 0) return "";

	return path.slice(0, index);
}


class Layer {
	constructor(layer, id, parent, visible) {
		this._layer = layer;
		this._id = id;
		this._parent = parent;
		this._visible = visible;
	}
}

class LayerGroup {
	constructor(map, id, parent, options = {}) {
		options = deepExtend({
			separator: PATH_SEPARATOR,
			visible: true,
			opacity: 1
		}, options);
		this._map = map;
		this._lyrs = []
		this._id = id;
		this._parent = parent;
		this._underlayId = '';
		this._overlayId = '';
		this._overlayId = '';
		this._visible = options.visible
		this._opacity = options.opacity;
		this._separator = options.separator;
	}

	_getChildIds(options = {}) {
		options = deepExtend({
			visibility: 'any'
		}, options);
		const ids = [];
		this._lyrs.forEach((lyr) => {
			if (options.visibility === 'any')
				ids.push(lyr._id)
			else if (options.visibility === 'visible' && lyr._visible === true)
				ids.push(lyr._id)
			else if (options.visibility === 'none' && lyr._visible === false)
				ids.push(lyr._id)
		})
		return ids;
	}

	_show(id, root, options = {}) {
		options = deepExtend({
			force: false,
			onVisiblePath: true,
		}, options);
		const force = options.force;
		const onVisiblePath = options.onVisiblePath;
		const lyr = this._lyrs[getIndexByKey(this._lyrs, '_id', id)];

		if (lyr) {
			if (root === true || force === true) {
				lyr._visible = true;
			}
			if (lyr instanceof Layer) {
				if (onVisiblePath === true && lyr._visible === true)
					lyr._layer.setVisible(true)
			} else {
				lyr._lyrs.forEach((child) => {
					lyr._show(child._id, false, options)
				})
			}
		}
	}

	_hide(id, root, options = {}) {
		options = deepExtend({
			force: false
		}, options);
		const force = options.force;
		const lyr = this._lyrs[getIndexByKey(this._lyrs, '_id', id)];

		if (lyr) {
			if (root === true || force === true) {
				lyr._visible = false;
			}
			if (lyr instanceof Layer) {
				lyr._layer.setVisible(false)
			} else {
				lyr._lyrs.forEach((child) => {
					lyr._hide(child._id, false, options)
				})
			}

		}
	}

	_addGroup(id, options = {}) {
		options = deepExtend({
			type: 'multi',
			visible: true,
			fixedTo: '',
			index: undefined
		}, options);
		const groupId = id;
		const groupType = options.type;
		const visible = options.visible;
		const fixedTo = options.fixedTo;
		if (getIndexByKey(this._lyrs, '_id', groupId) >= 0) throw new Error(`${groupId} already exists on this manager.`);

		let index = options.index;
		if (fixedTo === 'overlay') {
			index = this._lyrs.length;
			this._overlayId = groupId;
		} else if (fixedTo === 'underlay') {
			index = 0;
			this._underlayId = groupId;
		} else if (isNumber(index)) {
			if (index > this._lyrs.length || index < 0)
				throw new Error('out of range.');

			if (this._overlayId !== '' && index >= this._lyrs.length - 1)
				throw new Error('can\'t overwrite fixed layer.');

			if (this._underlayId !== '' && index === 0)
				throw new Error('can\'t overwrite fixed layer.');
		} else {
			index = this._lyrs.length;
			if (this._overlayId !== '')
				index = this._lyrs.length - 1
		}

		let group
		if (groupType === 'single') {
			group = new SingleLayerGroup(this._map, groupId, this, {
				visible,
				separator: this._separator
			})
		} else {
			group = new MultiLayerGroup(this._map, groupId, this, {
				visible,
				separator: this._separator,
				opacity: this._opacity
			})
		}
		addList(group, this._lyrs, index);
	}

	_removeGroup(groupId) {
		const grplyr = this._lyrs[getIndexByKey(this._lyrs, '_id', groupId)];
		if (grplyr instanceof Layer) throw new Error(`${groupId} does not exist on this manager.`);
		if (typeof grplyr === 'undefined') return;

		if (groupId === this._overlayId) {
			this._overlayId = '';
		} else if (groupId === this._underlayId) {
			this._underlayId = '';
		}

		const _remove = (grplyr) => {
			while (grplyr._lyrs.length > 0) {
				let child = grplyr._lyrs.pop();
				if (child instanceof LayerGroup) {
					_remove(child);
				} else {
					this._map.removeLayer(child._layer)
				}
				child = null;
			}
		}
		_remove(grplyr);
		removeList(grplyr, this._lyrs);
	}

	_addLayer(id, layer, options = {}) {
		options = deepExtend({
			fixedTo: '',
			index: undefined,
			onVisiblePath: true
		}, options);

		let index = options.index;
		const fixedTo = options.fixedTo;
		const onVisiblePath = options.onVisiblePath;

		if (typeof id === 'undefined') throw new Error(`id is required.`);
		if (getIndexByKey(this._lyrs, '_id', id) >= 0) throw new Error(`${id} already exists on this manager.`);

		const visible = layer.getVisible();
		if (!onVisiblePath)
			layer.setVisible(false);
		layer.setOpacity(this._opacity);

		if (fixedTo === 'overlay') {
			index = this._lyrs.length;
			this._overlayId = id;
		} else if (fixedTo === 'underlay') {
			index = 0;
			this._underlayId = id;
		} else if (isNumber(index)) {
			if (index > this._lyrs.length || index < 0)
				throw new Error('out of range.');

			if (this._overlayId !== '' && index >= this._lyrs.length - 1)
				throw new Error('can\'t overwrite fixed layer.');

			if (this._underlayId !== '' && index === 0)
				throw new Error('can\'t overwrite fixed layer.');
		} else {
			index = this._lyrs.length;
			if (this._overlayId !== '')
				index = this._lyrs.length - 1
		}
		const lyr = new Layer(layer, id, this, visible);
		addList(lyr, this._lyrs, index);

		this._map.addLayer(layer);
	}

	_removeLayer(id) {
		const lyr = this._lyrs[getIndexByKey(this._lyrs, '_id', id)];
		if (lyr instanceof LayerGroup) throw new Error('This id is not layer.');
		if (typeof lyr === 'undefined') return;

		if (id === this._overlayId) {
			this._overlayId = '';
		} else if (id === this._underlayId) {
			this._underlayId = '';
		}

		removeList(lyr, this._lyrs);
		this._map.removeLayer(lyr._layer)
	}

}

class MultiLayerGroup extends LayerGroup {
	constructor(map, id, parent, options = {}) {
		super(map, id, parent, options)
		this._type = 'multi'
	}
}

class SingleLayerGroup extends LayerGroup {
	constructor(map, id, parent, options = {}) {
		super(map, id, parent, options)
		this._type = 'single'
		this._selectId = ''
	}

	_show(id, root, options = {}) {
		if (root) {
			this._selectId = id;
			super._show(id, root, options);
			this._lyrs.forEach((lyr) => {
				if (lyr._id !== id)
					this._hide(lyr._id, true)
			})
		} else {
			if (this._selectId === id)
				super._show(id, root, options);
		}
	}

	_addGroup(id, options = {}) {
		super._addGroup(id, options);
		if (options.visible !== false) {
			this._selectId = id;
			this._lyrs.forEach((otherLayer) => {
				if (otherLayer._id !== id)
					this._hide(otherLayer._id, true)
			})
		}
	}

	_removeGroup(groupId) {
		super._removeGroup(groupId);
		if (this._selectId === groupId)
			this._selectId = '';
	}

	_addLayer(id, layer, options = {}) {
		super._addLayer(id, layer, options);

		const lyr = this._lyrs.find(lyr => lyr._id === id);
		const visible = lyr._visible;
		if (visible) {
			this._selectId = id;
			this._lyrs.forEach((otherLayer) => {
				if (otherLayer._id !== id)
					this._hide(otherLayer._id, true)
			})
		}
	}

	_removeLayer(id) {
		super._removeLayer(id);
		if (this._selectId === id)
			this._selectId = '';
	}

}


class OLM extends LayerGroup {
	constructor(map, options = {}) {
		super(map, 'manager', undefined, options)
		this.version = version;
		return this;
	}

	_getById(id) {
		if (id === "") return this;

		const _get = (parent, path, stage) => {
			const chained = path.split(this._separator);
			const id = chained.slice(0, stage + 1).join(this._separator)
			const index = getIndexByKey(parent._lyrs, '_id', id);
			if (index >= 0) {
				const lyr = parent._lyrs[index];

				if (id !== path && lyr instanceof LayerGroup) {
					return _get(lyr, path, ++stage)
				} else {
					return lyr
				}
			}
		}
		return _get(this, id, 0)
	}


	_onVisiblePath(lyr) {
		if (lyr === this)
			return true
		if (lyr._visible !== true) return false;
		return this._onVisiblePath(lyr._parent);
	}

	_getLyrs(options) {
		options = deepExtend({
			id: '',
			visibility: 'any',
			type: 'layer'
		}, options);
		const id = options.id;
		const visibility = options.visibility;
		const root = this._getById(id);
		const type = options.type;
		if (root instanceof Layer) return [root];

		const _get = (lyrs) => {
			let layers = []
			lyrs.forEach((lyr) => {
				if (lyr instanceof Layer) {
					const visble = lyr._layer.getVisible()
					if (type === 'layer' || type === 'any') {
						if (visibility === 'any')
							layers.push(lyr);
						if (visibility === 'visible' && visble === true) {
							layers.push(lyr);
						}
						if (visibility === 'none' && visble === false) {
							layers.push(lyr);
						}
					}
				}
				if (lyr instanceof LayerGroup) {
					const visble = lyr._visible
					if (type === 'group' || type === 'any') {
						if (visibility === 'any') {
							layers.push(lyr);
						}
						if (visibility === 'none' && (visble === false || !this._onVisiblePath(lyr._parent))) {
							layers.push(lyr);
						}
						if (visibility === 'visible' && visble === true && this._onVisiblePath(lyr._parent)) {
							layers.push(lyr);
						}
					}
					layers = layers.concat(_get(lyr._lyrs))
				}
			})

			return layers
		}
		return _get(root._lyrs);
	}

	_update() {
		const lyrs = this._getLyrs({
			visibility: 'any',
			type: 'layer'
		});
		let z = 0;

		function setZIndex(layer, z) {
			if (typeof layer.getLayers === 'function') {
				layer.getLayers().getArray().forEach((l) => {
					z = setZIndex(l, z);
				})
			} else {
				layer.setZIndex(z++);
			}
			return z
		}

		lyrs.forEach((lyr) => {
			const layer = lyr._layer;
			z = setZIndex(layer, z)
		})
	}

	addGroup(id, options) {
		if (typeof id === 'undefined') throw new Error(`id is required.`);

		if (this._getById(id)) throw new Error(`Layer/Group with id "${id}" already exists on this manager.`);

		const parentPath = getParentPath(id, this._separator);
		const parent = this._getById(parentPath);
		if (typeof parent === 'undefined') throw new Error('not found parent layer group.');

		parent._addGroup(id, options);
	}

	removeGroup(groupId, options) {
		const grplyr = this._getById(groupId);
		if (grplyr instanceof Layer) throw new Error('This id is not group.');
		if (typeof grplyr === 'undefined') return;

		const parent = grplyr._parent;
		parent._removeGroup(grplyr._id, options);
	}

	addLayer(id, layer, options = {}) {
		if (typeof id === 'undefined') throw new Error(`id is required.`);

		if (this._getById(id)) throw new Error(`Layer/Group with id "${id}" already exists on this manager.`);

		const parentPath = getParentPath(id, this._separator);
		const parent = this._getById(parentPath);
		if (typeof parent === 'undefined') throw new Error('not found parent layer group.');
		parent._addLayer(id, layer, deepExtend(options, {
			onVisiblePath: this._onVisiblePath(parent)
		}));
		this._update();
	}

	removeLayer(id, options = {}) {
		const lyr = this._getById(id);
		if (lyr instanceof LayerGroup) throw new Error('This id is not layer.');
		if (typeof lyr === 'undefined') return;

		const parent = lyr._parent;
		parent._removeLayer(lyr._id, options);
	}

	show(id, options = {}) {
		options = deepExtend({
			force: false
		}, options);
		const parentPath = getParentPath(id, this._separator);
		const parent = this._getById(parentPath);

		if (parent) {
			parent._show(id, true, deepExtend(options, {
				onVisiblePath: this._onVisiblePath(parent)
			}));
		}
	}

	hide(id, options = {}) {
		options = deepExtend({
			force: false
		}, options);
		const parentPath = getParentPath(id, this._separator);
		const parent = this._getById(parentPath);

		if (parent) {
			parent._hide(id, true, options);
		}
	}

	move(id, beforeId) {
		const parentPath = getParentPath(id, this._separator);
		const parent = this._getById(parentPath);
		if (id === beforeId)
			return;

		if (beforeId) {
			const beforeParentPath = getParentPath(beforeId, this._separator);
			if (parentPath !== beforeParentPath) throw new Error('These ids are not same group.');
		}

		if ([parent._underlayId, parent._overlayId].indexOf(id) >= 0) {
			throw new Error('can\'t update fixed layer.');
		}
		if (parent._underlayId === beforeId) {
			throw new Error('can\'t update fixed layer.');
		}
		if (parent._overlayId !== '' && typeof beforeId === 'undefined') {
			beforeId = parent._overlayId;
		}

		const lyr = parent._lyrs[getIndexByKey(parent._lyrs, '_id', id)];
		removeList(lyr, parent._lyrs);

		let index;
		if (beforeId) {
			let beforeIndex = getIndexByKey(parent._lyrs, '_id', beforeId);
			if (beforeIndex < 0) throw new Error('not found beforeId\'s layer.');
			index = beforeIndex;
		} else {
			index = parent._lyrs.length;
		}
		addList(lyr, parent._lyrs, index);
		this._update();
	}

	bringToFront(id) {
		this.move(id);
	}

	invoke(methodName) {
		if (typeof this._map[methodName] === 'function') {
			return this._map[methodName](...[].slice.call(arguments).slice(1));
		}
	}

	isVisible(id, options) {
		options = deepExtend({
			ownStatus: false
		}, options);
		const lyr = this._getById(id);
		if (options.ownStatus === true) {
			return lyr && lyr._visible
		}
		return this._onVisiblePath(lyr)
	}

	has(id) {
		return typeof this._getById(id) !== 'undefined'
	}

	setOpacity(id, opacity) {
		const lyr = this._getById(id);

		const _setOpacity = (lyr, opacity) => {
			if (lyr instanceof Layer) {
				lyr._layer.setOpacity(opacity);
			}
			if (lyr instanceof LayerGroup) {
				lyr._opacity = opacity;
				lyr._lyrs.forEach((child) => {
					_setOpacity(child, opacity);
				})
			}
		}
		_setOpacity(lyr, opacity);
	}

	getChildIds(options = {}) {
		options = deepExtend({
			id: '',
			visibility: 'any'
		}, options);
		const id = options.id;
		const visibility = options.visibility;
		const root = this._getById(id);

		if (root instanceof Layer) return [];
		return root._getChildIds({
			visibility
		});
	}

	getLayerIds(options = {}) {
		return this._getLyrs(options).map((lyr) => {
			return lyr._id;
		});
	}

	reset(options = {}) {
		options = deepExtend({
			id: ''
		}, options);
		const id = options.id;
		const root = this._getById(id);

		if (root instanceof LayerGroup) {
			let lyrs = [].concat(root._lyrs)
			lyrs.forEach((lyr) => {
				if (lyr instanceof Layer) {
					root._removeLayer(lyr._id);
				}
				if (lyr instanceof LayerGroup) {
					root._removeGroup(lyr._id);
				}
			})
			lyrs = null;
		}
	}

	getIndexById(id) {
		const parentPath = getParentPath(id, this._separator);
		const parent = this._getById(parentPath);
		if (typeof parent === 'undefined') throw new Error('not found parent layer group.');

		for (let i = 0; i < parent._lyrs.length; i++) {
			if (parent._lyrs[i]._id === id)
				return i
		}
		return -1
	}

	getSource(id) {
		const lyr = this._getById(id);
		if (lyr instanceof Layer) {
			return lyr._layer.getSource()
		}
	}

	setSource(id, source) {
		const lyr = this._getById(id);
		if (lyr instanceof Layer) {
			lyr._layer.setSource(source)
		}
	}
}

export default OLM