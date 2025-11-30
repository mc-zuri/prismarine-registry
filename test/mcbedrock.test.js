/* eslint-env mocha */

const SUPPORTED_VERSIONS = ['1.17.10', '1.18.0', '1.18.11', '1.18.30', '1.19.1', '1.19.10', '1.21.70']
const test = require('./mcbedrock')
const assert = require('assert')

describe('mcbedrock', function () {
  this.timeout(18000 * 10)

  for (const version of SUPPORTED_VERSIONS) {
    const registry = require('prismarine-registry')(`bedrock_${version}`)
    require('prismarine-block')(registry)

    it(`should not modify minecraft-data indexes on ${version}`, async () => {
      // arrange
      const minecraftData = require('minecraft-data')(`bedrock_${version}`)
      const keysToVerify = ['blocksArray', 'blocks', 'blocksByName', 'blocksByStateId', 'blockblockStates']

      const expectedData = {}
      for (const key of keysToVerify) {
        expectedData[key] = JSON.stringify(minecraftData[key])
      }

      registry.handleStartGame({ itemstates: [], block_network_ids_are_hashes: true })

      for (const key of keysToVerify) {
        const actualData = JSON.stringify(minecraftData[key])
        assert.deepEqual(actualData, expectedData[key], `minecraft-data.${key} was modified`)
      }

      registry.handleStartGame({ itemstates: [], block_network_ids_are_hashes: false })

      for (const key of keysToVerify) {
        const actualData = JSON.stringify(minecraftData[key])
        assert.deepEqual(actualData, expectedData[key], `minecraft-data.${key} was modified`)
      }
    })

    it(`works on ${version}, block block_network_ids_are_hashes = false`, async () => {
      await test(version)
    })

    if (registry.version['>=']('1.18')) {
      it.skip(`works on ${version}, block block_network_ids_are_hashes = true`, async () => {
        await test(version)
      })
    }
  }

  it('should use use hash on id 1.21.70', async () => {
    // arrange
    const registry = require('prismarine-registry')('bedrock_1.21.70')
    registry.handleStartGame({ itemstates: [], block_network_ids_are_hashes: true })
    const block = registry.blocksByName.diamond_block

    // blocksArray, blocks, blocksByName, blocksByStateId should have same object references
    assert.equal(registry.blocksArray.find(x => x.id === block.id), block)
    assert.equal(registry.blocks[192], block)
    assert.equal(registry.blocksByName.diamond_block, block)
    assert.equal(registry.blocksByStateId['1460042000'], block)

    assert.equal(block.id, 192)
    assert.equal(block.minStateId, undefined)
    assert.equal(block.maxStateId, undefined)
    assert.deepEqual(block.states, [1460042000])
    assert.equal(block.defaultState, 1460042000)

    const blockState = registry.blockStates.find(bs => bs.stateId === block.defaultState)
    assert.equal(blockState.stateId, 1460042000)
    assert.equal(blockState.name, 'diamond_block')
  })

  it('should use use index on id 1.21.70', async () => {
    // arrange
    let registry = require('prismarine-registry')('bedrock_1.21.70')
    registry.handleStartGame({ itemstates: [], block_network_ids_are_hashes: true })

    registry = require('prismarine-registry')('bedrock_1.21.70')
    registry.handleStartGame({ itemstates: [], block_network_ids_are_hashes: false })
    const block = registry.blocksByName.diamond_block

    // blocksArray, blocks, blocksByName, blocksByStateId should have same object references
    assert.equal(registry.blocksArray.find(x => x.id === block.id), block)
    assert.equal(registry.blocks[192], block)
    assert.equal(registry.blocksByName.diamond_block, block)
    assert.equal(registry.blocksByStateId[1276], block)

    assert.equal(block.id, 192)
    assert.equal(block.minStateId, 1276)
    assert.equal(block.maxStateId, 1276)
    assert.deepEqual(block.states, [1276])
    assert.equal(block.defaultState, 1276)

    const blockState = registry.blockStates.find(bs => bs.stateId === block.defaultState)
    assert.equal(blockState.stateId, 1276)
    assert.equal(blockState.name, 'diamond_block')
  })
})
