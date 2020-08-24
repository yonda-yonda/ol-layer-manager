let map, mapElement, manager;

const dummyImageLayer = (id, visble = undefined) => {
	const layer = new ol.layer.Image({
		_id: id,
		source: new ol.source.ImageStatic({
			url: './1.png',
			imageExtent: ol.proj.transformExtent([
					139.74609375, 35.6037187406973,
					139.833984375, 35.67514743608467
				], 'EPSG:4326',
				'EPSG:3857')
		})
	})
	if (visble === false) {
		layer.setVisible(false);
	}
	return layer
}

const getActualLayerIds = (manager, options) => {
	let mode = 'any';
	if (options.visibility === 'visible') mode = 'visible'
	if (options.visibility === 'none') mode = 'none'

	return manager._map.getLayers().getArray().filter(layer => {
		return mode === 'any' || (mode === 'visible' && layer.getVisible()) || (mode === 'none' && !layer.getVisible())
	}).map(layer => {
		return layer.get('_id')
	})
}

// const isVisibleConfig = (layerConfig) => {
// 	return typeof layerConfig.layout !== 'undefined' && layerConfig.layout.visibility === 'none' ? false : true
// }

const getIds = (mamnager, type = 'all', visibility = 'any') => {

	const _getIds = (lyrs) => {
		let ids = []
		lyrs.forEach((lyr) => {
			ids.push({
				id: lyr._id,
				visible: lyr._visible,
				type: (lyr._type === 'multi' || lyr._type === 'single') ? 'group' : 'layer'
			});
			if (Array.isArray(lyr._lyrs)) {
				ids = ids.concat(_getIds(lyr._lyrs))
			}
		})

		return ids
	}
	const lyrs = _getIds(mamnager._lyrs);
	return lyrs.filter((idObj) => {
		const matchVisible = (idObj) => {
			if (visibility === 'any') return true;

			if (visibility === 'visible')
				return idObj.visible === true

			if (visibility === 'none')
				return idObj.visible === false
		}
		if (type === 'all' && matchVisible(idObj)) return true;
		if (type === idObj.type && matchVisible(idObj)) return true;
		return false
	}).map((lyr) => {
		return lyr.id
	})
}

beforeEach(function () {
	mapElement = document.createElement('div');
	mapElement.setAttribute('id', 'map');
	document.querySelector('body').append(mapElement);

	map = new ol.Map({
		target: 'map',
		view: new ol.View()
	});
	manager = new OLM(map);
});

afterEach(function () {
	manager = null;
	mapElement.parentNode.removeChild(mapElement);
});

describe('init', () => {
	it('default', () => {
		chai.assert.strictEqual(manager._map, map);
	})

	it('separator', () => {
		manager_dot = new OLM(map, {
			separator: '.'
		});
		const groupId1 = 'group1'
		manager_dot.addGroup(groupId1);
		const layerId1 = groupId1 + '.image1';
		manager_dot.addLayer(layerId1, dummyImageLayer(layerId1));

		const groupId2 = 'group1.group2'
		manager_dot.addGroup(groupId2);
		const layerId2 = groupId2 + '.image2';
		manager_dot.addLayer(layerId2, dummyImageLayer(layerId2));
		chai.expect(getIds(manager_dot, 'all'))
			.to.deep.equal([groupId1, layerId1, groupId2, layerId2]);

		manager_dot = null;
	});
});

describe('add/remove layer', () => {
	it('property and order', () => {

		const layerId1 = 'image1';
		manager.addLayer(layerId1, dummyImageLayer(layerId1));

		const lyr1 = manager._lyrs[0];
		chai.assert.strictEqual(lyr1._id, layerId1)
		chai.assert.strictEqual(lyr1._parent, manager)
		chai.assert.strictEqual(lyr1._visible, true)

		const layerId2 = 'image2';
		manager.addLayer(layerId2, dummyImageLayer(layerId2, false));
		const lyr2 = manager._lyrs[1];
		chai.assert.strictEqual(lyr2._id, layerId2)
		chai.assert.strictEqual(lyr2._parent, manager)
		chai.assert.strictEqual(lyr2._visible, false)

		const layerId3 = 'image3';
		manager.addLayer(layerId3, dummyImageLayer(layerId3), {
			index: manager.getIndexById(layerId1)
		});
		const lyr3 = manager._lyrs[0];
		chai.assert.strictEqual(lyr3._id, layerId3)
		chai.assert.strictEqual(lyr3._parent, manager)
		chai.assert.strictEqual(lyr3._visible, true)

		// number
		chai.assert.strictEqual(getIds(manager, 'layer', 'visible').length, 2)
		chai.assert.strictEqual(getIds(manager, 'layer').length, 3)

		// actual number
		chai.assert.strictEqual(manager.getLayerIds({
			type: 'layer',
			visibility: 'visible'
		}).length, 2)
		chai.assert.strictEqual(manager.getLayerIds({
			type: 'layer',
			visibility: 'any'
		}).length, 3)
	});
	it('add underlay', () => {
		const layerId1 = 'image1';
		manager.addLayer(layerId1, dummyImageLayer(layerId1));
		const layerId2 = 'image2';
		manager.addLayer(layerId2, dummyImageLayer(layerId2), {
			fixedTo: 'underlay'
		});
		chai.assert.strictEqual(manager._lyrs[1]._id, layerId1)
		chai.assert.strictEqual(manager._lyrs[0]._id, layerId2)

		const layerId3 = 'image3';
		manager.addLayer(layerId3, dummyImageLayer(layerId3), {
			fixedTo: 'underlay'
		});
		chai.assert.strictEqual(manager._lyrs[2]._id, layerId1)
		chai.assert.strictEqual(manager._lyrs[1]._id, layerId2)
		chai.assert.strictEqual(manager._lyrs[0]._id, layerId3)

		// not added
		chai.expect(() => {
			const layerIdX = 'imageX';
			manager.addLayer(layerIdX, dummyImageLayer(layerIdX), {
				index: manager.getIndexById(manager._lyrs[0]._id)
			});
		}).to.throw()
		chai.assert.strictEqual(getIds(manager, 'layer', 'visible').length, 3)
	});

	it('add overlay', () => {
		const layerId1 = 'image1';
		manager.addLayer(layerId1, dummyImageLayer(layerId1));
		const layerId2 = 'image2';
		manager.addLayer(layerId2, dummyImageLayer(layerId2), {
			fixedTo: 'overlay'
		});
		chai.assert.strictEqual(manager._lyrs[0]._id, layerId1)
		chai.assert.strictEqual(manager._lyrs[1]._id, layerId2)

		const layerId3 = 'image3';
		manager.addLayer(layerId3, dummyImageLayer(layerId3), {
			fixedTo: 'overlay'
		});
		chai.assert.strictEqual(manager._lyrs[0]._id, layerId1)
		chai.assert.strictEqual(manager._lyrs[1]._id, layerId2)
		chai.assert.strictEqual(manager._lyrs[2]._id, layerId3)

		const layerId4 = 'image4';
		manager.addLayer(layerId4, dummyImageLayer(layerId4));

		chai.assert.strictEqual(manager._lyrs[0]._id, layerId1)
		chai.assert.strictEqual(manager._lyrs[1]._id, layerId2)
		chai.assert.strictEqual(manager._lyrs[2]._id, layerId4)
		chai.assert.strictEqual(manager._lyrs[3]._id, layerId3)
	});

	it('add group', () => {
		// check order and property
		const id1 = 'group1'
		manager.addGroup(id1);

		const grp1 = manager._lyrs[0];
		chai.assert.strictEqual(grp1._id, id1)
		chai.assert.strictEqual(grp1._type, 'multi')
		chai.assert.strictEqual(grp1._parent, manager)
		chai.assert.strictEqual(grp1._visible, true)

		const id2 = 'group2';
		manager.addGroup(id2, {
			visible: false
		});
		const grp2 = manager._lyrs[1];
		chai.assert.strictEqual(grp2._id, id2)
		chai.assert.strictEqual(grp2._type, 'multi')
		chai.assert.strictEqual(grp2._parent, manager)
		chai.assert.strictEqual(grp2._visible, false)

		const id3 = 'group3'
		manager.addGroup(id3, {
			type: 'single',
			index: manager.getIndexById(id1)
		});
		const grp3 = manager._lyrs[0];
		chai.assert.strictEqual(grp3._id, id3)
		chai.assert.strictEqual(grp3._type, 'single')
		chai.assert.strictEqual(grp3._parent, manager)
		chai.assert.strictEqual(grp3._visible, true)

		// number of group
		chai.assert.strictEqual(getIds(manager, 'group', 'visible').length, 2)
		chai.assert.strictEqual(getIds(manager, 'group').length, 3)
		chai.assert.strictEqual(manager.getLayerIds({
			type: 'layer',
			visibility: 'visible'
		}).length, 0)
	});

	it('add group to underlay', () => {
		const id1 = 'group1'
		manager.addGroup(id1);
		const id2 = 'group2'
		manager.addGroup(id2, {
			fixedTo: 'underlay'
		});
		chai.assert.strictEqual(manager._lyrs[1]._id, id1)
		chai.assert.strictEqual(manager._lyrs[0]._id, id2)

		const id3 = 'group3'
		manager.addGroup(id3, {
			fixedTo: 'underlay'
		});
		chai.assert.strictEqual(manager._lyrs[2]._id, id1)
		chai.assert.strictEqual(manager._lyrs[1]._id, id2)
		chai.assert.strictEqual(manager._lyrs[0]._id, id3)

		chai.expect(() => {
			manager.addGroup('groupX', {
				index: manager.getIndexById(manager._lyrs[0]._id)
			});
		}).to.throw()
	});

	it('add group to overlay', () => {

		const id1 = 'group1'
		manager.addGroup(id1);
		const id2 = 'group2'
		manager.addGroup(id2, {
			fixedTo: 'overlay'
		});
		chai.assert.strictEqual(manager._lyrs[0]._id, id1)
		chai.assert.strictEqual(manager._lyrs[1]._id, id2)

		const id3 = 'group3'
		manager.addGroup(id3, {
			fixedTo: 'overlay'
		});
		chai.assert.strictEqual(manager._lyrs[0]._id, id1)
		chai.assert.strictEqual(manager._lyrs[1]._id, id2)
		chai.assert.strictEqual(manager._lyrs[2]._id, id3)

		const id4 = 'group4'
		manager.addGroup(id4);
		chai.assert.strictEqual(manager._lyrs[0]._id, id1)
		chai.assert.strictEqual(manager._lyrs[1]._id, id2)
		chai.assert.strictEqual(manager._lyrs[3]._id, id3)
		chai.assert.strictEqual(manager._lyrs[2]._id, id4)
	});


	it('add to group', () => {
		const groupId1 = 'group1'
		manager.addGroup(groupId1);

		const groupId2 = 'group2'
		manager.addGroup(groupId2);

		const layerId1 = groupId1 + '/image1';
		manager.addLayer(layerId1, dummyImageLayer(layerId1));

		// image1 property
		const lyr1 = manager._lyrs[0]._lyrs[0];
		chai.assert.strictEqual(lyr1._id, layerId1)
		chai.assert.strictEqual(lyr1._parent, manager._lyrs[0])
		chai.assert.strictEqual(lyr1._visible, true)

		const layerId2 = groupId2 + '/image2';
		manager.addLayer(layerId2, dummyImageLayer(layerId2));

		const layerId3 = groupId2 + '/image3';
		manager.addLayer(layerId3, dummyImageLayer(layerId3, false));

		const groupId3 = groupId2 + '/group3'
		manager.addGroup(groupId3, {
			type: 'single',
			index: manager.getIndexById(layerId3)
		});

		const layerId4 = groupId3 + '/image4';
		manager.addLayer(layerId4, dummyImageLayer(layerId4));

		const groupId4 = groupId3 + '/group4'
		manager.addGroup(groupId4, {
			type: 'single',
			fixedTo: 'overlay'
		});
		const layerId5 = groupId4 + '/image5';
		manager.addLayer(layerId5, dummyImageLayer(layerId5));


		// group4/image5 property
		const grp4 = manager._lyrs[1]._lyrs[1]._lyrs[1];
		chai.assert.strictEqual(grp4._id, groupId4)
		chai.assert.strictEqual(grp4._type, 'single')
		chai.assert.strictEqual(grp4._parent, manager._lyrs[1]._lyrs[1])
		chai.assert.strictEqual(grp4._visible, true)
		const lyr5 = grp4._lyrs[0];
		chai.assert.strictEqual(lyr5._id, layerId5)
		chai.assert.strictEqual(lyr5._parent, grp4)
		chai.assert.strictEqual(lyr5._visible, true)


		const layerId6 = groupId3 + '/image6';
		manager.addLayer(layerId6, dummyImageLayer(layerId6), {
			fixedTo: 'overlay'
		});

		// changed by single group
		chai.assert.strictEqual(grp4._visible, false) // changed
		chai.assert.strictEqual(lyr5._visible, true) // not changed

		const groupId5 = 'group5'
		manager.addGroup(groupId5, {
			type: 'single',
			visible: false,
		});
		const layerId8 = groupId5 + '/image8';
		manager.addLayer(layerId8, dummyImageLayer(layerId8, false), {
			fixedTo: 'underlay'
		});
		chai.assert.strictEqual(manager._lyrs[2]._selectId, '')
		chai.assert.strictEqual(manager._lyrs[2]._underlayId, layerId8)

		const groupId6 = groupId5 + '/group6'
		manager.addGroup(groupId6, {
			fixedTo: 'underlay'
		});
		chai.assert.strictEqual(manager._lyrs[2]._selectId, groupId6)
		chai.assert.strictEqual(manager._lyrs[2]._underlayId, groupId6)

		const layerId7 = groupId6 + '/image7';
		manager.addLayer(layerId7, dummyImageLayer(layerId7));
		const groupId7 = groupId5 + '/group7'
		manager.addGroup(groupId7, {
			fixedTo: 'overlay'
		});
		chai.assert.strictEqual(manager._lyrs[2]._selectId, groupId7)
		chai.assert.strictEqual(manager._lyrs[2]._underlayId, groupId6)
		chai.assert.strictEqual(manager._lyrs[2]._overlayId, groupId7)

		const layerId9 = groupId7 + '/image9';
		manager.addLayer(layerId9, dummyImageLayer(layerId9), {
			fixedTo: 'overlay'
		});

		chai.assert.strictEqual(manager._lyrs[2]._lyrs[2]._overlayId, layerId9)

		// order
		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([groupId1, layerId1, groupId2,
				layerId2, groupId3, layerId4,
				groupId4, layerId5, layerId6, layerId3,
				groupId5, groupId6, layerId7, layerId8, groupId7, layerId9
			]);

		chai.expect(getIds(manager, 'layer'))
			.to.deep.equal([layerId1, layerId2, layerId4,
				layerId5, layerId6, layerId3,
				layerId7, layerId8, layerId9
			]);

		chai.expect(getIds(manager, 'group')).to.deep.equal([groupId1, groupId2, groupId3, groupId4, groupId5, groupId6, groupId7]);

		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([groupId1, layerId1, groupId2,
				layerId2, groupId3, layerId5, layerId6, layerId7, groupId7, layerId9
			]);

		chai.expect(getIds(manager, 'layer', 'visible'))
			.to.deep.equal([layerId1, layerId2, layerId5,
				layerId6, layerId7, layerId9
			]);

		chai.expect(getIds(manager, 'group', 'visible'))
			.to.deep.equal([groupId1, groupId2, groupId3, groupId7]);


		// actual layer
		chai.expect(manager.getLayerIds({
			type: 'layer',
			visibility: 'visible'
		})).to.deep.equal([layerId1, layerId2, layerId6]);

		chai.expect(manager.getLayerIds({
			type: 'layer',
			visibility: 'none'
		})).to.deep.equal([layerId4, layerId5, layerId3, layerId7, layerId8, layerId9]);

		// rise error(not added)
		chai.expect(() => {
			manager.addGroup('groupX/groupY');
		}).to.throw();
		chai.expect(() => {
			const dummy = 'groupZ/imageX';
			manager.addLayer(dummy, dummyImageLayer(dummy));
		}).to.throw();

		chai.expect(() => {
			manager.addLayer(layerId2);
		}).to.throw();

		chai.expect(() => {
			manager.addGroup(groupId7, {
				fixedTo: 'overlay'
			});
		}).to.throw();

		chai.expect(() => {
			const dummy = groupId5 + '/imageX';
			manager.addLayer(dummy, dummyImageLayer(dummy), {
				index: manager.getIndexById(groupId6)
			});
		}).to.throw();

	});

	it('remove layer and group', () => {
		const groupId1 = 'group1'
		manager.addGroup(groupId1);
		const groupId2 = 'group2'
		manager.addGroup(groupId2);

		const layerId1 = groupId1 + '/image1';
		manager.addLayer(layerId1, dummyImageLayer(layerId1));
		const layerId2 = groupId2 + '/image2';
		manager.addLayer(layerId2, dummyImageLayer(layerId2));

		const layerId3 = 'image3';
		manager.addLayer(layerId3, dummyImageLayer(layerId3, false));

		const groupId3 = groupId2 + '/group3'
		manager.addGroup(groupId3, {
			index: manager.getIndexById(layerId2)
		});

		const layerId4 = groupId3 + '/image4';
		manager.addLayer(layerId4, dummyImageLayer(layerId4, false));

		const groupId4 = groupId3 + '/group4'
		manager.addGroup(groupId4);

		const layerId5 = groupId4 + '/image5';
		manager.addLayer(layerId5, dummyImageLayer(layerId5));
		const layerId6 = groupId3 + '/image6';
		manager.addLayer(layerId6, dummyImageLayer(layerId6));

		const groupId5 = 'group5'
		manager.addGroup(groupId5);

		const layerId7 = groupId5 + '/image7';
		manager.addLayer(layerId7, dummyImageLayer(layerId7));
		const layerId8 = groupId5 + '/image8';
		manager.addLayer(layerId8, dummyImageLayer(layerId8, false));

		const groupId6 = groupId5 + '/group6'
		manager.addGroup(groupId6, {
			type: 'single'
		});
		const layerId9 = groupId6 + '/image9';
		manager.addLayer(layerId9, dummyImageLayer(layerId9));

		const groupId7 = groupId6 + '/group7'
		manager.addGroup(groupId7);



		// check order
		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([
				groupId1, layerId1, groupId2,
				groupId3, layerId4,
				groupId4, layerId5, layerId6, layerId2, layerId3,
				groupId5, layerId7, layerId8, groupId6, layerId9, groupId7
			]);


		chai.expect(manager.getLayerIds({
				visibility: 'visible'
			}))
			.to.deep.equal([layerId1, layerId5, layerId6, layerId2, layerId7]);

		chai.expect(manager.getLayerIds({
				visibility: 'any'
			}))
			.to.deep.equal([layerId1,
				layerId4,
				layerId5, layerId6, layerId2, layerId3,
				layerId7, layerId8, layerId9
			]);

		manager.removeLayer(layerId6);

		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([groupId1, layerId1, groupId2,
				groupId3, layerId4,
				groupId4, layerId5, layerId2, layerId3,
				groupId5, layerId7, layerId8, groupId6, layerId9, groupId7
			]);
		chai.expect(manager.getLayerIds({
				visibility: 'visible'
			}))
			.to.deep.equal([layerId1, layerId5, layerId2, layerId7]);


		chai.expect(manager.getLayerIds({
				visibility: 'any'
			}))
			.to.deep.equal([layerId1,
				layerId4,
				layerId5, layerId2, layerId3,
				layerId7, layerId8, layerId9
			]);


		manager.removeGroup(groupId4);

		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([groupId1, layerId1, groupId2,
				groupId3, layerId4,
				layerId2, layerId3,
				groupId5, layerId7, layerId8, groupId6, layerId9, groupId7
			]);
		chai.expect(manager.getLayerIds({
				visibility: 'visible'
			}))
			.to.deep.equal([layerId1, layerId2, layerId7]);

		chai.expect(manager.getLayerIds({
				visibility: 'any'
			}))
			.to.deep.equal([layerId1,
				layerId4,
				layerId2, layerId3,
				layerId7, layerId8, layerId9
			]);

		chai.assert.strictEqual(manager._lyrs[3]._lyrs[2]._selectId, groupId7);

		manager.removeGroup(groupId7);
		chai.assert.strictEqual(manager._lyrs[3]._lyrs[2]._selectId, '')

		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([groupId1, layerId1, groupId2,
				groupId3, layerId4,
				layerId2, layerId3,
				groupId5, layerId7, layerId8, groupId6, layerId9
			]);


		manager.removeGroup(groupId5);

		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([groupId1, layerId1, groupId2,
				groupId3, layerId4,
				layerId2, layerId3
			]);

		chai.expect(manager.getLayerIds({
				visibility: 'visible'
			}))
			.to.deep.equal([layerId1, layerId2]);

		chai.expect(manager.getLayerIds({
				visibility: 'any'
			}))
			.to.deep.equal([layerId1, layerId4, layerId2, layerId3]);


		// rise error(not added)
		chai.expect(() => {
			manager.removeGroup(layerId1);
		}).to.throw();
		chai.expect(() => {
			manager.removeLayer(groupId1);
		}).to.throw();

	});
	it('removed form map', () => {
		const groupId1 = 'group1'
		manager.addGroup(groupId1);
		const layerId1 = groupId1 + '/image1';
		manager.addLayer(layerId1, dummyImageLayer(layerId1));
		const layerId2 = 'image2';
		manager.addLayer(layerId2, dummyImageLayer(layerId2, false));

		chai.expect(manager.getLayerIds({
				visibility: 'any'
			}))
			.to.deep.equal([layerId1, layerId2]);

		const asctualLayers = manager._map.getLayers().getArray();
		let actualLayer1 = asctualLayers.find((layer) => layer.get('_id') === layerId1)
		let actualLayer2 = asctualLayers.find((layer) => layer.get('_id') === layerId2)

		chai.expect(typeof actualLayer1).to.not.equal('undefined');
		chai.expect(typeof actualLayer2).to.not.equal('undefined');

		manager.removeGroup(groupId1);
		manager.removeLayer(layerId2);
		actualLayer1 = asctualLayers.find((layer) => layer.get('_id') === layerId1)
		actualLayer2 = asctualLayers.find((layer) => layer.get('_id') === layerId2)
		chai.expect(typeof actualLayer1).to.equal('undefined');
		chai.expect(typeof actualLayer2).to.equal('undefined');

		chai.expect(manager.getLayerIds({
				visibility: 'any'
			}))
			.to.deep.equal([]);
	})

	it('reset', () => {
		const groupId1 = 'group1'
		manager.addGroup(groupId1);

		const groupId2 = 'group2'
		manager.addGroup(groupId2);

		const layerId1 = groupId1 + '/image1';
		manager.addLayer(layerId1, dummyImageLayer(layerId1));

		const layerId2 = groupId2 + '/image2';
		manager.addLayer(layerId2, dummyImageLayer(layerId2));

		const layerId3 = groupId2 + '/image3';
		manager.addLayer(layerId3, dummyImageLayer(layerId3, false));

		const groupId3 = groupId2 + '/group3'
		manager.addGroup(groupId3, {
			type: 'single',
			index: manager.getIndexById(layerId3)
		});

		const layerId4 = groupId3 + '/image4';
		manager.addLayer(layerId4, dummyImageLayer(layerId4));

		const groupId4 = groupId3 + '/group4'
		manager.addGroup(groupId4, {
			type: 'single',
			fixedTo: 'overlay'
		});
		const layerId5 = groupId4 + '/image5';
		manager.addLayer(layerId5, dummyImageLayer(layerId5));

		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([groupId1, layerId1, groupId2,
				layerId2, groupId3, layerId4, groupId4, layerId5, layerId3
			]);

		manager.reset({
			id: groupId3
		})
		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([groupId1, layerId1, groupId2,
				layerId2, groupId3, layerId3
			]);

		manager.reset()
		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([]);
	})
});

describe('change order', () => {
	it('move', () => {
		const layerId0 = 'image0';
		manager.addLayer(layerId0, dummyImageLayer(layerId0), {
			fixedTo: 'underlay'
		});

		const groupId1 = 'group1'
		manager.addGroup(groupId1);
		const groupId2 = 'group2'
		manager.addGroup(groupId2);
		const layerId1 = groupId1 + '/image1';
		manager.addLayer(layerId1, dummyImageLayer(layerId1));
		const layerId2 = groupId2 + '/image2';
		manager.addLayer(layerId2, dummyImageLayer(layerId2));

		const layerId3 = 'image3';
		manager.addLayer(layerId3, dummyImageLayer(layerId3, false));

		const groupId3 = groupId2 + '/group3'
		manager.addGroup(groupId3, {
			type: 'single',
			index: manager.getIndexById(layerId2)
		});

		const layerId4 = groupId3 + '/image4';
		manager.addLayer(layerId4, dummyImageLayer(layerId4));

		const groupId4 = groupId3 + '/group4'
		manager.addGroup(groupId4);

		const layerId5 = groupId4 + '/image5';
		manager.addLayer(layerId5, dummyImageLayer(layerId5));
		const layerId6 = groupId3 + '/image6';
		manager.addLayer(layerId6, dummyImageLayer(layerId6), {
			fixedTo: 'overlay'
		});

		const groupId5 = 'group5'
		manager.addGroup(groupId5, {
			visible: false,
			fixedTo: 'overlay'
		});
		const layerId8 = groupId5 + '/image8';
		manager.addLayer(layerId8, dummyImageLayer(layerId8, false), {
			fixedTo: 'underlay'
		});

		const groupId6 = groupId5 + '/group6'
		manager.addGroup(groupId6, {
			fixedTo: 'underlay'
		});

		const layerId7 = groupId6 + '/image7';
		manager.addLayer(layerId7, dummyImageLayer(layerId7));

		const groupId7 = groupId5 + '/group7'
		manager.addGroup(groupId7);

		const layerId9 = groupId7 + '/image9';
		manager.addLayer(layerId9, dummyImageLayer(layerId9));


		// check order
		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([layerId0, groupId1, layerId1, groupId2,
				groupId3, layerId4,
				groupId4, layerId5, layerId6, layerId2, layerId3,
				groupId5, groupId6, layerId7, layerId8, groupId7, layerId9
			]);
		manager.move(groupId1, layerId3);
		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([layerId0, groupId2,
				groupId3, layerId4, groupId4, layerId5, layerId6, layerId2, groupId1, layerId1, layerId3,
				groupId5, groupId6, layerId7, layerId8, groupId7, layerId9
			]);

		manager.move(layerId2, groupId3);
		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([layerId0, groupId2,
				layerId2, groupId3, layerId4, groupId4, layerId5, layerId6, groupId1, layerId1, layerId3,
				groupId5, groupId6, layerId7, layerId8, groupId7, layerId9
			]);

		manager.move(groupId1);
		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([layerId0, groupId2,
				layerId2, groupId3, layerId4, groupId4, layerId5, layerId6, layerId3, groupId1, layerId1,
				groupId5, groupId6, layerId7, layerId8, groupId7, layerId9
			]);

		// rise error
		chai.expect(() => {
			manager.move(layerId0, layerId3);
		}).to.throw();
		chai.expect(() => {
			manager.move(groupId6, groupId7);
		}).to.throw();
		chai.expect(() => {
			manager.move(groupId5, groupId1);
		}).to.throw();
	});
});

describe('change visibility', () => {
	it('show/hide', () => {
		const layerId0 = 'image0';
		manager.addLayer(layerId0, dummyImageLayer(layerId0), {
			fixedTo: 'underlay'
		});

		const groupId1 = 'group1'
		manager.addGroup(groupId1);
		const groupId2 = 'group2'
		manager.addGroup(groupId2);
		const layerId1 = groupId1 + '/image1';
		manager.addLayer(layerId1, dummyImageLayer(layerId1));
		const layerId2 = groupId2 + '/image2';
		manager.addLayer(layerId2, dummyImageLayer(layerId2));

		const layerId3 = 'image3';
		manager.addLayer(layerId3, dummyImageLayer(layerId3, false));

		const groupId3 = groupId2 + '/group3'
		manager.addGroup(groupId3, {
			type: 'single',
			index: manager.getIndexById(layerId2)
		});

		const layerId4 = groupId3 + '/image4';
		manager.addLayer(layerId4, dummyImageLayer(layerId4));

		const groupId4 = groupId3 + '/group4'
		manager.addGroup(groupId4);

		const layerId5 = groupId4 + '/image5';
		manager.addLayer(layerId5, dummyImageLayer(layerId5));
		const layerId6 = groupId3 + '/image6';
		manager.addLayer(layerId6, dummyImageLayer(layerId6), {
			fixedTo: 'overlay'
		});

		const groupId5 = 'group5'
		manager.addGroup(groupId5, {
			visible: false,
			fixedTo: 'overlay'
		});
		const layerId8 = groupId5 + '/image8';
		manager.addLayer(layerId8, dummyImageLayer(layerId8, false), {
			fixedTo: 'underlay'
		});

		const groupId6 = groupId5 + '/group6'
		manager.addGroup(groupId6, {
			fixedTo: 'underlay'
		});

		const layerId7 = groupId6 + '/image7';
		manager.addLayer(layerId7, dummyImageLayer(layerId7));

		const layerId9 = groupId6 + '/image9';
		manager.addLayer(layerId9, dummyImageLayer(layerId9, false));

		// check order
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([layerId0, groupId1, layerId1, groupId2,
				groupId3, layerId5, layerId6, layerId2, groupId6, layerId7
			]);
		chai.expect(manager.getLayerIds({
				visibility: 'visible'
			}))
			.to.deep.equal([
				layerId0, layerId1, layerId6, layerId2
			]);
		manager.hide(layerId0)
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([groupId1, layerId1, groupId2,
				groupId3, layerId5, layerId6, layerId2, groupId6, layerId7
			]);
		chai.expect(manager.getLayerIds({
				visibility: 'visible'
			}))
			.to.deep.equal([
				layerId1, layerId6, layerId2
			]);
		manager.show(layerId0)
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([layerId0, groupId1, layerId1, groupId2,
				groupId3, layerId5, layerId6, layerId2, groupId6, layerId7
			]);
		chai.expect(manager.getLayerIds({
				visibility: 'visible'
			}))
			.to.deep.equal([
				layerId0, layerId1, layerId6, layerId2
			]);

		manager.show(groupId5)
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([layerId0, groupId1, layerId1, groupId2,
				groupId3, layerId5, layerId6, layerId2, groupId5, groupId6, layerId7
			]);
		chai.expect(manager.getLayerIds({
				visibility: 'visible'
			}))
			.to.deep.equal([
				layerId0, layerId1, layerId6, layerId2, layerId7
			]);


		manager.hide(groupId5);
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([layerId0, groupId1, layerId1, groupId2,
				groupId3, layerId5, layerId6, layerId2, groupId6, layerId7
			]);
		chai.expect(manager.getLayerIds({
				visibility: 'visible'
			}))
			.to.deep.equal([
				layerId0, layerId1, layerId6, layerId2
			]);

		manager.hide(groupId2, {
			force: true
		})
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([layerId0, groupId1, layerId1, groupId6, layerId7]);
		chai.expect(manager.getLayerIds({
				visibility: 'visible'
			}))
			.to.deep.equal([
				layerId0, layerId1
			]);
		manager.show(groupId2, {
			force: true
		});
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([layerId0, groupId1, layerId1, groupId2,
				groupId3, layerId6, layerId2, groupId6, layerId7
			]);
		chai.expect(manager.getLayerIds({
				visibility: 'visible'
			}))
			.to.deep.equal([
				layerId0, layerId1, layerId6, layerId2
			]);

		manager.hide(groupId5, {
			force: true
		})
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([layerId0, groupId1, layerId1, groupId2,
				groupId3, layerId6, layerId2,
			]);
		chai.expect(manager.getLayerIds({
				visibility: 'visible'
			}))
			.to.deep.equal([
				layerId0, layerId1, layerId6, layerId2
			]);

		manager.show(groupId5, {
			force: true
		})
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([layerId0, groupId1, layerId1, groupId2,
				groupId3, layerId6, layerId2, groupId5,
				groupId6, layerId7, layerId9, layerId8
			]);
		chai.expect(manager.getLayerIds({
				visibility: 'visible'
			}))
			.to.deep.equal([
				layerId0, layerId1, layerId6, layerId2, layerId7, layerId9, layerId8
			]);
	});
});


describe('others', () => {
	it('invoke', () => {
		const layerId1 = 'image1'
		const layer1 = dummyImageLayer(layerId1);
		manager.invoke('addLayer', layer1)
		chai.assert.strictEqual(manager._map.getLayers().getArray()[0].get('_id'), layerId1)
	})

	it('getLayerIds', () => {
		const groupId1 = 'group1'
		manager.addGroup(groupId1);
		const groupId2 = 'group2'
		manager.addGroup(groupId2, {
			visible: false
		});
		const layerId1 = groupId1 + '/image1';
		manager.addLayer(layerId1, dummyImageLayer(layerId1));
		const layerId2 = groupId2 + '/image2';
		manager.addLayer(layerId2, dummyImageLayer(layerId2));

		const layerId3 = 'image3';
		manager.addLayer(layerId3, dummyImageLayer(layerId3, false));

		const groupId3 = groupId2 + '/group3'
		manager.addGroup(groupId3, {
			index: manager.getIndexById(layerId2)
		});

		const layerId4 = groupId3 + '/image4';
		manager.addLayer(layerId4, dummyImageLayer(layerId4, false));

		const groupId4 = groupId3 + '/group4'
		manager.addGroup(groupId4);

		const layerId5 = groupId4 + '/image5';
		manager.addLayer(layerId5, dummyImageLayer(layerId5));

		const layerId6 = groupId3 + '/image6';
		manager.addLayer(layerId6, dummyImageLayer(layerId6));

		const groupId5 = 'group5'
		manager.addGroup(groupId5);
		const layerId7 = groupId5 + '/image7';
		manager.addLayer(layerId7, dummyImageLayer(layerId7));
		const layerId8 = groupId5 + '/image8';
		manager.addLayer(layerId8, dummyImageLayer(layerId8, false));

		const groupId6 = groupId5 + '/group6'
		manager.addGroup(groupId6, {
			type: 'single'
		});

		const layerId9 = groupId6 + '/image9';
		manager.addLayer(layerId9, dummyImageLayer(layerId9));
		const groupId7 = groupId6 + '/group6'
		manager.addGroup(groupId7);

		chai.expect(manager.getLayerIds({
				visibility: 'any',
				type: 'layer'
			}))
			.to.deep.equal([
				layerId1, layerId4, layerId5, layerId6, layerId2, layerId3,
				layerId7, layerId8, layerId9
			]);

		chai.expect(manager.getLayerIds({
				visibility: 'any',
				type: 'group'
			}))
			.to.deep.equal([groupId1, groupId2, groupId3, groupId4, groupId5, groupId6, groupId7]);

		chai.expect(manager.getLayerIds({
				visibility: 'any',
				type: 'any'
			}))
			.to.deep.equal([groupId1, layerId1, groupId2, groupId3,
				layerId4, groupId4, layerId5, layerId6, layerId2, layerId3,
				groupId5, layerId7, layerId8, groupId6, layerId9, groupId7
			]);

		chai.expect(manager.getLayerIds({
				visibility: 'visible'
			}))
			.to.deep.equal([layerId1, layerId7]);
		chai.expect(manager.getLayerIds({
				visibility: 'visible',
				type: 'group'
			}))
			.to.deep.equal([groupId1, groupId5, groupId6, groupId7]);

		chai.expect(manager.getLayerIds({
				visibility: 'none'
			}))
			.to.deep.equal([
				layerId4, layerId5, layerId6, layerId2, layerId3, layerId8, layerId9
			]);

		chai.expect(manager.getLayerIds({
				visibility: 'none',
				type: 'group'
			}))
			.to.deep.equal([groupId2, groupId3, groupId4]);

		chai.expect(manager.getLayerIds({
				visibility: 'visible',
				type: 'any'
			}))
			.to.deep.equal([groupId1, layerId1, groupId5, layerId7, groupId6, groupId7]);

		chai.expect(manager.getLayerIds({
				visibility: 'none',
				type: 'any'
			}))
			.to.deep.equal([groupId2, groupId3, layerId4, groupId4, layerId5,
				layerId6, layerId2, layerId3, layerId8, layerId9
			]);

		manager.show(groupId2);

		chai.expect(manager.getLayerIds({
				visibility: 'visible'
			}))
			.to.deep.equal([
				layerId1, layerId5, layerId6, layerId2, layerId7
			]);
		chai.expect(manager.getLayerIds({
				visibility: 'visible',
				type: 'group'
			}))
			.to.deep.equal([groupId1, groupId2, groupId3, groupId4, groupId5, groupId6, groupId7]);

		chai.expect(manager.getLayerIds({
				visibility: 'none'
			}))
			.to.deep.equal([
				layerId4, layerId3, layerId8, layerId9
			]);
		chai.expect(manager.getLayerIds({
				visibility: 'none',
				type: 'group'
			}))
			.to.deep.equal([]);
	})

	it('opacity', () => {
		const groupId1 = 'group1'
		manager.addGroup(groupId1);

		const layerId1 = groupId1 + '/image1';
		manager.addLayer(layerId1, dummyImageLayer(layerId1), {
			fixedTo: 'underlay'
		});

		const layerId2 = groupId1 + '/image2';
		manager.addLayer(layerId2, dummyImageLayer(layerId2), {
			fixedTo: 'overlay'
		});

		const groupId2 = 'group1/group2'
		manager.addGroup(groupId2);

		manager.addLayer(groupId1 + '/geojson', new ol.layer.Vector({
			_id: groupId1 + '/geojson',
			source: new ol.source.Vector({
				url: '../shape.geojson',
				format: new ol.format.GeoJSON()
			})
		}));

		const layerId3 = groupId2 + '/image3';
		manager.addLayer(layerId3, dummyImageLayer(layerId3));

		const getOpacities = (id) => {
			return manager._getLyrs({
				id: id
			}).map((lyr) => {
				return lyr._layer.getOpacity()
			});
		}

		manager.setOpacity(groupId1, 0.8)
		chai.expect(getOpacities(groupId1))
			.to.deep.equal([0.8, 0.8, 0.8, 0.8]);

		manager.setOpacity(groupId2, 0.1)
		chai.expect(getOpacities(groupId1))
			.to.deep.equal([0.8, 0.1, 0.8, 0.8]);
	});


	it('has', () => {
		const groupId1 = 'group1'
		manager.addGroup(groupId1);
		const layerId1 = groupId1 + '/image1';
		manager.addLayer(layerId1, dummyImageLayer(layerId1), {
			fixedTo: 'underlay'
		});
		const layerId2 = groupId1 + '/image2';
		manager.addLayer(layerId2, dummyImageLayer(layerId2, false));

		chai.expect(manager.has(groupId1)).to.be.true;
		chai.expect(manager.has(layerId1)).to.be.true;
		chai.expect(manager.has(layerId2)).to.be.true;
		chai.expect(manager.has("dummy")).to.be.false;

	});
	it('getChildIds', () => {
		const layerId0 = 'image0';
		manager.addLayer(layerId0, dummyImageLayer(layerId0), {
			fixedTo: 'underlay'
		});

		const groupId1 = 'group1'
		manager.addGroup(groupId1);
		const groupId2 = 'group2'
		manager.addGroup(groupId2);
		const layerId1 = groupId1 + '/image1';
		manager.addLayer(layerId1, dummyImageLayer(layerId1));
		const layerId2 = groupId2 + '/image2';
		manager.addLayer(layerId2, dummyImageLayer(layerId2));

		const layerId3 = 'image3';
		manager.addLayer(layerId3, dummyImageLayer(layerId3, false));

		const groupId3 = groupId2 + '/group3'
		manager.addGroup(groupId3, {
			type: 'single',
			index: manager.getIndexById(layerId2)
		});

		const layerId4 = groupId3 + '/image4';
		manager.addLayer(layerId4, dummyImageLayer(layerId4));

		const groupId4 = groupId3 + '/group4'
		manager.addGroup(groupId4);

		const layerId5 = groupId4 + '/image5';
		manager.addLayer(layerId5, dummyImageLayer(layerId5));
		const layerId6 = groupId3 + '/image6';
		manager.addLayer(layerId6, dummyImageLayer(layerId6), {
			fixedTo: 'overlay'
		});

		chai.expect(manager.getChildIds())
			.to.deep.equal([layerId0, groupId1, groupId2, layerId3]);
		chai.expect(manager.getChildIds({
				id: layerId0
			}))
			.to.deep.equal([]);
		chai.expect(manager.getChildIds({
				id: groupId1
			}))
			.to.deep.equal([layerId1]);
		chai.expect(manager.getChildIds({
			id: groupId3
		})).to.deep.equal([layerId4, groupId4, layerId6]);

		chai.expect(manager.getChildIds({
				visibility: 'visible'
			}))
			.to.deep.equal([layerId0, groupId1, groupId2]);
		chai.expect(manager.getChildIds({
				visibility: 'none'
			}))
			.to.deep.equal([layerId3]);

		chai.expect(manager.getChildIds({
			id: groupId3,
			visibility: 'visible'
		})).to.deep.equal([layerId6]);

		chai.expect(manager.getChildIds({
			id: groupId3,
			visibility: 'none'
		})).to.deep.equal([layerId4, groupId4]);
	});
	it('isGroup', () => {
		const layerId1 = 'image1';
		manager.addLayer(layerId1, dummyImageLayer(layerId1));

		const groupId1 = 'group1'
		manager.addGroup(groupId1);

		chai.assert.strictEqual(manager.isGroup(layerId1), false);
		chai.assert.strictEqual(manager.isGroup(groupId1), true);
	});
	it('isVisible', () => {
		const layerId1 = 'image1';
		manager.addLayer(layerId1, dummyImageLayer(layerId1));


		const groupId1 = 'group1'
		manager.addGroup(groupId1);

		const layerId2 = groupId1 + '/image2';
		manager.addLayer(layerId2, dummyImageLayer(layerId2));

		const layerId3 = groupId1 + '/image3';
		manager.addLayer(layerId3, dummyImageLayer(layerId2, false));

		const layerId4 = 'image4';
		manager.addLayer(layerId4, dummyImageLayer(layerId4, false));


		chai.assert.strictEqual(manager.isVisible(layerId1), true);
		chai.assert.strictEqual(manager.isVisible(layerId4), false);
		chai.assert.strictEqual(manager.isVisible(groupId1), true);
		chai.assert.strictEqual(manager.isVisible(layerId2), true);
		chai.assert.strictEqual(manager.isVisible(layerId3), false);
		manager.hide(groupId1);
		chai.assert.strictEqual(manager.isVisible(groupId1), false);
		chai.assert.strictEqual(manager.isVisible(layerId2), false);
		chai.assert.strictEqual(manager.isVisible(layerId3), false);

		chai.assert.strictEqual(manager.isVisible(layerId2, {
			ownStatus: true
		}), true);
		chai.assert.strictEqual(manager.isVisible(layerId3, {
			ownStatus: true
		}), false);
	});
});