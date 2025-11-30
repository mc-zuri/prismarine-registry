const buildIndexFromArray = require('../indexer')

module.exports = (data) => {
  function loadItemStates (itemStates) {
    const items = []
    for (const item of itemStates) {
      const name = item.name.replace('minecraft:', '')
      items.push({ ...data.itemsByName[name], name, id: item.runtime_id, nbt: item.nbt, version: item.version })
    }
    data.itemsArray = items
    data.items = buildIndexFromArray(data.itemsArray, 'id')
    data.itemsByName = buildIndexFromArray(data.itemsArray, 'name')
  }
  function loadHashedRuntimeIds (registry) {
    data.blocksArray = [...data.blocksArray]
    data.blockStates = [...data.blockStates]

    const stateIndexToHash = {}
    data.blocksByRuntimeId = {}
    const Block = require('prismarine-block')(registry)
    for (let i = 0; i < data.blockStates.length; i++) {
      const { name, states } = data.blockStates[i]
      const hash = Block.getHash(name, states)
      stateIndexToHash[i] = hash
      data.blocksByRuntimeId[hash] = { ...data.blocksByStateId[i], stateId: hash }
    }

    for (let i = 0; i < data.blockStates.length; i++) {
      data.blockStates[i] = { ...data.blockStates[i], stateId: stateIndexToHash[i] }
    }

    for (let i = 0; i < data.blocksArray.length; i++) {
      const item = data.blocksArray[i] = { ...data.blocksArray[i] }
      item.defaultState = stateIndexToHash[item.defaultState]
      item.states = []
      for (let stateId = item.minStateId; stateId <= item.maxStateId; stateId++) {
        item.states.push(stateIndexToHash[stateId])
      }
      item.maxStateId = undefined
      item.minStateId = undefined
    }

    data.blocks = buildIndexFromArray(data.blocksArray, 'id')
    data.blocksByName = buildIndexFromArray(data.blocksArray, 'name')

    data.blocksByStateId = {}
    for (const block of data.blocksArray) {
      for (const stateId of block.states) {
        data.blocksByStateId[stateId] = block
      }
    }
  }
  function loadRuntimeIds () {
    data.blocksArray = [...data.blocksArray]
    data.blockStates = [...data.blockStates]

    for (let i = 0; i < data.blockStates.length; i++) {
      data.blockStates[i] = { ...data.blockStates[i], stateId: i }
    }

    for (let i = 0; i < data.blocksArray.length; i++) {
      const item = data.blocksArray[i] = { ...data.blocksArray[i] }
      item.states = []
      for (let stateId = item.minStateId; stateId <= item.maxStateId; stateId++) {
        item.states.push(stateId)
      }
    }

    data.blocks = buildIndexFromArray(data.blocksArray, 'id')
    data.blocksByName = buildIndexFromArray(data.blocksArray, 'name')

    data.blocksByStateId = {}
    for (const block of data.blocksArray) {
      for (const stateId of block.states) {
        data.blocksByStateId[stateId] = block
      }
    }
  }

  return {
    handleStartGame (packet) {
      if (packet.itemstates) {
        loadItemStates(packet.itemstates)
      }

      if (this.supportFeature('blockHashes') && packet.block_network_ids_are_hashes) {
        loadHashedRuntimeIds(this)
      } else {
        loadRuntimeIds()
      }
    },
    handleItemRegistry (packet) {
      if (packet.itemstates) {
        loadItemStates(packet.itemstates)
      }
    },
    writeItemStates () {
      const itemstates = []
      for (const item of data.itemsArray) {
        // Custom items with different namespaces can also be in the palette
        let [ns, name] = item.name.split(':')
        if (!name) {
          name = ns
          ns = 'minecraft'
        }

        const itemState = {
          name: `${ns}:${name}`,
          runtime_id: item.id,
          component_based: ns !== 'minecraft'
        }

        if (item.version !== undefined) {
          itemState.version = item.version
        }

        if (item.nbt !== undefined) {
          itemState.nbt = item.nbt
        }

        itemstates.push(itemState)
      }

      return itemstates
    }
  }
}
