import registryLoader = require('prismarine-registry')
import nbt, { NBT } from 'prismarine-nbt'

const registry = registryLoader('bedrock_1.21.70') as registryLoader.RegistryBedrock
const itemStates: registryLoader.ItemState[] = registry.writeItemStates()

for (const state of itemStates) {
  if (state.version === 'data_driven') {
    // the tags as prismarine-nbt reads them
    const maxDurability: number | undefined = state.nbt.value.components.value['minecraft:durability']?.value.max_durability.value
    const damageTag: 'byte' | 'short' | undefined = state.nbt.value.components.value['minecraft:damage']?.value.value.type
    // @ts-expect-error max_stack_size is a byte
    const stackSizeTag: 'int' | undefined = state.nbt.value.components.value['minecraft:max_stack_size']?.value.value.type

    // and as nbt.simplify returns them (prismarine-nbt does not type empty lists, which are sent with the end type)
    const { components } = nbt.simplify(state.nbt as NBT) as registryLoader.SimplifiedItemNbt['data_driven']
    const stackSize: number = components.item_properties.max_stack_size
    const glint: 0 | 1 | undefined = components['minecraft:glint']?.value
    const iconTexture: string | undefined = components.item_properties['minecraft:icon']?.textures.default
    const tags: string[] = components.item_tags
    const rarity: 'common' | 'uncommon' | 'rare' | 'epic' | undefined = components['minecraft:rarity']?.value
    const useOn: Array<{ [state: string]: number }> | undefined = components['minecraft:block_placer']?.use_on.map(block => block.states)
    const repairAmount: number | string | { expression: string, version: number } | undefined = components['minecraft:repairable']?.repair_items[0].repair_amount
    // @ts-expect-error not a component
    const unknown = components['minecraft:unknown']
    console.log(maxDurability, damageTag, stackSizeTag, stackSize, glint, iconTexture, tags, rarity, useOn, repairAmount, unknown)
  } else if (state.version === 'legacy') {
    const { components } = nbt.simplify(state.nbt as NBT) as registryLoader.SimplifiedItemNbt['legacy']
    const useDuration: number | undefined = components?.['minecraft:use_duration']
    const effects: string[] | undefined = components?.['minecraft:food']?.effects?.map(effect => effect.name)
    console.log(useDuration, effects)
  } else if (state.version === undefined) {
    // before 1.21.60 there is no nbt
    const none: undefined = state.nbt
    console.log(none)
  }
}

const durabilityState: registryLoader.ItemState = {
  name: 'test:durability',
  runtime_id: 300,
  component_based: true,
  version: 'data_driven',
  nbt: {
    type: 'compound',
    name: '',
    value: {
      components: {
        type: 'compound',
        value: {
          item_properties: {
            type: 'compound',
            value: {
              allow_off_hand: { type: 'byte', value: 0 },
              can_destroy_in_creative: { type: 'byte', value: 1 },
              creative_category: { type: 'int', value: 4 },
              creative_group: { type: 'string', value: '' },
              damage: { type: 'int', value: 0 },
              enchantable_slot: { type: 'string', value: 'none' },
              enchantable_value: { type: 'int', value: 0 },
              foil: { type: 'byte', value: 0 },
              frame_count: { type: 'int', value: 1 },
              hand_equipped: { type: 'byte', value: 0 },
              liquid_clipped: { type: 'byte', value: 0 },
              max_stack_size: { type: 'int', value: 1 },
              mining_speed: { type: 'float', value: 1 },
              should_despawn: { type: 'byte', value: 1 },
              stacked_by_data: { type: 'byte', value: 0 },
              use_animation: { type: 'int', value: 0 },
              use_duration: { type: 'int', value: 0 }
            }
          },
          item_tags: { type: 'list', value: { type: 'end', value: [] } },
          'minecraft:durability': {
            type: 'compound',
            value: {
              max_durability: { type: 'int', value: 250 },
              damage_chance: { type: 'compound', value: { min: { type: 'int', value: 10 }, max: { type: 'int', value: 50 } } }
            }
          }
        }
      }
    }
  }
}

// @ts-expect-error a none item has an empty nbt
const noneState: registryLoader.ItemState = { name: 'minecraft:stone', runtime_id: 1, component_based: false, version: 'none', nbt: { type: 'compound', name: '', value: { components: { type: 'compound', value: {} } } } }
// @ts-expect-error the max_stack_size of a legacy item is an int
const wrongTagState: registryLoader.ItemState = { name: 'minecraft:apple', runtime_id: 257, component_based: false, version: 'legacy', nbt: { type: 'compound', name: '', value: { components: { type: 'compound', value: { 'minecraft:max_stack_size': { type: 'byte', value: 64 } } } } } }
// @ts-expect-error a data driven item has nbt
const dataDrivenWithoutNbt: registryLoader.ItemState = { name: 'test:item', runtime_id: 2, component_based: true, version: 'data_driven' }
const palette: registryLoader.ItemState[] = [{ name: 'minecraft:apple', runtime_id: 257, component_based: false }]
registry.handleItemRegistry({ itemstates: [...palette, durabilityState] })

function readEntry (entry: registryLoader.ItemComponentEntry) {
  const { id, components } = nbt.simplify(entry.nbt as NBT) as registryLoader.Simplified<registryLoader.ItemComponentEntryNbt>
  const useDuration: number | undefined = 'minecraft:use_duration' in components ? components['minecraft:use_duration'] : undefined
  const armor: number | string | undefined = 'item_properties' in components ? components['minecraft:armor']?.texture_type : undefined
  return [id, useDuration, armor]
}

// Simplified works with any typed tag
type Custom = registryLoader.NbtCompound<{ name: registryLoader.NbtString, scores: registryLoader.NbtList<registryLoader.NbtInt> }>
const custom: registryLoader.Simplified<Custom> = { name: 'a', scores: [1, 2] }
// @ts-expect-error scores are numbers
const wrongCustom: registryLoader.Simplified<Custom> = { name: 'a', scores: ['1'] }

export { noneState, wrongTagState, dataDrivenWithoutNbt, readEntry, custom, wrongCustom }
