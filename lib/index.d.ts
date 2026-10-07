import { IndexedData } from 'minecraft-data'
import { NBT } from 'prismarine-nbt'

declare function loader(mcVersion: string): loader.Registry
declare namespace loader {
  export interface RegistryPc extends IndexedData {
    loadDimensionCodec(codec: NBT): void;
    writeDimensionCodec(): NBT;
  }

  export interface RegistryBedrock extends IndexedData {
    blockStatesByStateId: { [stateId: number]: BlockState };
    handleStartGame(packet: any): void;
    handleItemRegistry(packet: any): void;
    writeItemStates(): ItemState[];
  }

  export type Registry = RegistryBedrock | RegistryPc
  export type BlockState = {
    name: string
    states: { [name: string]: { type: string, value: unknown } }
    version?: number
    stateId?: number
  }

  /**
   * An entry of the item palette: `start_game.itemstates` before 1.21.60, `item_registry.itemstates` from 1.21.60.
   * From 1.21.60 `version` tells the layout of `nbt`.
   */
  export type ItemState = {
    /** Namespaced identifier, e.g. `minecraft:apple` or `custom:ruby_sword` */
    name: string
    /** Network id of the item. Block items that are not in the legacy id range use negative ids. */
    runtime_id: number
    /** The client builds the item from its components (every `data_driven` item, and a few vanilla items without nbt) */
    component_based: boolean
  } & (
    | { version: 'data_driven', nbt: DataDrivenItemNbt }
    | { version: 'legacy', nbt: LegacyItemNbt }
    | { version: 'none', nbt: NbtRoot<Record<string, never>> }
    | { version?: undefined, nbt?: undefined }
  )

  /** An entry of the `item_component` packet (before 1.21.60): the components of a component based item */
  export type ItemComponentEntry = {
    name: string
    nbt: ItemComponentEntryNbt
  }

  /** Tags as `prismarine-nbt` reads them, with the values a server sends */
  export type NbtByte<V extends number = number> = { type: 'byte', value: V }
  /** A byte used as a boolean */
  export type NbtBoolean = NbtByte<0 | 1>
  export type NbtShort<V extends number = number> = { type: 'short', value: V }
  export type NbtInt<V extends number = number> = { type: 'int', value: V }
  export type NbtFloat = { type: 'float', value: number }
  export type NbtString<V extends string = string> = { type: 'string', value: V }
  export type NbtCompound<V> = { type: 'compound', value: V }
  /** An empty list is sent with the `end` type */
  export type NbtList<T extends { type: string, value: unknown }> = { type: 'list', value: { type: T['type'], value: Array<T['value']> } | { type: 'end', value: [] } }
  export type NbtRoot<V> = NbtCompound<V> & { name: string }

  /** What `nbt.simplify` returns for a tag */
  export type Simplified<T> = T extends { type: infer K, value: infer V } ? SimplifiedValue<K, V> : never
  type SimplifiedValue<K, V> =
    K extends 'compound' ? { [P in keyof V]: Simplified<V[P]> } :
    K extends 'list' ? V extends { type: infer I, value: Array<infer E> } ? Array<SimplifiedValue<I, E>> : never :
    V

  /**
   * `nbt` of a `data_driven` item state (1.21.60+): an item built from components, every custom item with a
   * component the client needs, and the vanilla items defined in json
   */
  export type DataDrivenItemNbt = NbtRoot<{ components: ItemComponentsNbt }>

  /**
   * The components of a data driven item (behavior pack `minecraft:item` json).
   *
   * Each json component the client needs is sent as a `minecraft:<name>` compound. Components only the server uses
   * (`minecraft:damage_absorption`, `minecraft:durability_sensor`, custom components) are not sent. Fields with a
   * version are sent from that version.
   */
  export type ItemComponentsNbt = NbtCompound<{
    /** The components in the pre-component layout, with defaults for the components the item does not have */
    item_properties: ItemPropertiesNbt
    /** The tags of `minecraft:tags` */
    item_tags: NbtList<NbtString>

    /** The item can be held in the off hand */
    'minecraft:allow_off_hand'?: ValueComponent<NbtBoolean>
    /** The item places a block. Note the camelCase fields. */
    'minecraft:block_placer'?: NbtCompound<{
      /** The block placed */
      block: NbtString
      /** Blocks the item can be used on (empty: any block) */
      use_on: NbtList<BlockDescriptorNbt>
      /** Use the block as the icon when there is no `minecraft:icon` */
      canUseBlockAsIcon: NbtBoolean
      /** `replace_block_item`: the item is the item of the block (1.26.20) */
      replaceBlockItem?: NbtBoolean
      /** `aligned_placement` (1.26.10) */
      alignedPlacement?: NbtBoolean
    }>
    /** Bundle interaction and tooltip, with `minecraft:storage_item` */
    'minecraft:bundle_interaction'?: NbtCompound<{
      /** Item stacks shown in the tooltip */
      num_viewable_slots: NbtInt
    }>
    /** The item can break blocks in creative mode */
    'minecraft:can_destroy_in_creative'?: ValueComponent<NbtBoolean>
    /** The item can be put in a composter */
    'minecraft:compostable'?: NbtCompound<{
      /** Chance (1-100) that composting adds a layer */
      composting_chance: NbtByte
    }>
    /** Cooldown after the item is used */
    'minecraft:cooldown'?: NbtCompound<{
      /** Items of the same category share the cooldown */
      category: NbtString
      /** In seconds */
      duration: NbtFloat
      /** Action that starts the cooldown (1.21.130) */
      type?: NbtString<'use' | 'attack'>
    }>
    /** Attack damage added by the item: a byte, a short from 1.26.0 */
    'minecraft:damage'?: ValueComponent<NbtByte | NbtShort>
    /** The item mines the listed blocks at a speed */
    'minecraft:digger'?: NbtCompound<{
      destroy_speeds: NbtList<NbtCompound<{ block: BlockDescriptorNbt, speed: NbtInt }>>
      /** The efficiency enchantment changes the speeds */
      use_efficiency: NbtBoolean
    }>
    /** Name or localization key of the item */
    'minecraft:display_name'?: ValueComponent<NbtString>
    'minecraft:durability'?: NbtCompound<{
      /** Damage the item can take before it breaks */
      max_durability: NbtInt
      /** Chance (percent) that the item loses durability when used */
      damage_chance: NbtCompound<{ min: NbtInt, max: NbtInt }>
    }>
    /** The item can be dyed in a cauldron */
    'minecraft:dyeable'?: NbtCompound<{
      /** `[r, g, b]`; a json `"#RRGGBB"` is converted */
      default_color: NbtList<NbtInt>
    }>
    'minecraft:enchantable'?: NbtCompound<{
      /** Enchantment slot, e.g. `sword`, `pickaxe`, `armor_head`, `g_tool` */
      slot: NbtString
      value: NbtByte
    }>
    /** The item places an entity */
    'minecraft:entity_placer'?: NbtCompound<{
      /** The entity and its spawn event, e.g. `minecraft:pig<>` */
      entity: NbtString
      /** Blocks the item can be used on (empty: any block) */
      use_on: NbtList<BlockDescriptorNbt>
      /** Blocks a dispenser can place the entity on (empty: any block) */
      dispense_on: NbtList<BlockDescriptorNbt>
    }>
    /** The dropped item does not burn */
    'minecraft:fire_resistant'?: ValueComponent<NbtBoolean>
    /** The item can be eaten. The eating time is in `minecraft:use_modifiers`. */
    'minecraft:food'?: NbtCompound<{
      nutrition: NbtInt
      saturation_modifier: NbtFloat
      can_always_eat: NbtBoolean
      /** Item given back after eating (empty: none) */
      using_converts_to: ItemDescriptorNbt | NbtCompound<Record<string, never>>
    }>
    'minecraft:fuel'?: NbtCompound<{
      /** Burn time in seconds */
      duration: NbtFloat
    }>
    /** Enchantment glint */
    'minecraft:glint'?: ValueComponent<NbtBoolean>
    /** The item is held like a tool */
    'minecraft:hand_equipped'?: ValueComponent<NbtBoolean>
    /** Color of the name, e.g. `minecoin_gold` */
    'minecraft:hover_text_color'?: ValueComponent<NbtString>
    /** Interact button of touch controls */
    'minecraft:interact_button'?: NbtCompound<{
      /** `action.interact.use` when the json value is `true` */
      interact_text: NbtString
      requires_interact: NbtBoolean
    }>
    /** Charge attack of spears, nested in itself (1.21.130) */
    'minecraft:kinetic_weapon'?: NbtCompound<{
      'minecraft:kinetic_weapon': NbtCompound<{
        /** Ticks before the kinetic effects start */
        delay: NbtShort
        /** In blocks */
        reach: FloatRangeNbt
        creative_reach: FloatRangeNbt
        hitbox_margin: NbtFloat
        damage_multiplier: NbtFloat
        damage_modifier: NbtFloat
        damage_conditions: KineticWeaponConditionsNbt
        knockback_conditions: KineticWeaponConditionsNbt
        dismount_conditions: KineticWeaponConditionsNbt
      }>
    }>
    /** Using the item targets liquid blocks */
    'minecraft:liquid_clipped'?: ValueComponent<NbtBoolean>
    'minecraft:max_stack_size'?: ValueComponent<NbtByte>
    /** The attack hits every entity along the view vector (1.21.130) */
    'minecraft:piercing_weapon'?: NbtCompound<{
      /** In blocks */
      reach: FloatRangeNbt
      creative_reach: FloatRangeNbt
      hitbox_margin: NbtFloat
    }>
    /** The entity shot or thrown with the item */
    'minecraft:projectile'?: NbtCompound<{
      /** The entity and its spawn event, e.g. `minecraft:snowball<>` */
      projectile_entity: NbtString
      minimum_critical_power: NbtFloat
    }>
    /** Not a json component: sent with `minecraft:block_placer` and `minecraft:entity_placer` */
    'minecraft:publisher_on_use_on'?: NbtCompound<{ autoSucceedOnClient: NbtBoolean }>
    /** Gives the color of the name */
    'minecraft:rarity'?: ValueComponent<NbtString<'common' | 'uncommon' | 'rare' | 'epic'>>
    /** Music disc */
    'minecraft:record'?: NbtCompound<{
      /** e.g. `record.13` */
      sound_event: NbtString
      /** In seconds */
      duration: NbtFloat
      comparator_signal: NbtInt
    }>
    'minecraft:repairable'?: NbtCompound<{
      repair_items: NbtList<NbtCompound<{
        items: NbtList<ItemDescriptorNbt>
        /** Durability restored: a number, or a molang expression (a string from 1.26.40) */
        repair_amount: NbtFloat | NbtString | MolangNbt
      }>>
    }>
    /** The item shoots ammunition, like a bow */
    'minecraft:shooter'?: NbtCompound<{
      ammunition: NbtList<NbtCompound<{
        /** An item with `minecraft:projectile` */
        item: ItemDescriptorNbt
        use_offhand: NbtBoolean
        search_inventory: NbtBoolean
        use_in_creative: NbtBoolean
      }>>
      charge_on_draw: NbtBoolean
      /** In seconds */
      max_draw_duration: NbtFloat
      scale_power_by_draw_duration: NbtBoolean
    }>
    'minecraft:should_despawn'?: ValueComponent<NbtBoolean>
    /** Items with different data values stack separately */
    'minecraft:stacked_by_data'?: ValueComponent<NbtBoolean>
    /** The item stores items, like a bundle */
    'minecraft:storage_item'?: NbtCompound<StorageItemFields>
    'minecraft:storage_weight_limit'?: NbtCompound<{ max_weight_limit: NbtInt }>
    /** Weight in a storage item (0: can not be put in one) */
    'minecraft:storage_weight_modifier'?: NbtCompound<{ weight_in_storage_item: NbtInt }>
    /** Duration of the swing animation, in seconds (1.21.120) */
    'minecraft:swing_duration'?: ValueComponent<NbtFloat>
    /** Sound events of attacks (1.21.130) */
    'minecraft:swing_sounds'?: NbtCompound<{
      attack_miss?: NbtString
      attack_hit?: NbtString
      attack_critical_hit?: NbtString
    }>
    /** Also in `item_tags` */
    'minecraft:tags'?: NbtCompound<{ tags: NbtList<NbtString> }>
    /** The item throws its `minecraft:projectile` */
    'minecraft:throwable'?: NbtCompound<ThrowableFields>
    'minecraft:use_animation'?: ValueComponent<NbtString<UseAnimation>>
    /** Duration and movement while the item is used */
    'minecraft:use_modifiers'?: NbtCompound<{
      /** In seconds */
      use_duration: NbtFloat
      /** Speed of the player while using the item (only when set) */
      movement_modifier?: NbtFloat
      /** Sound when the use starts (only when set, 1.21.130) */
      start_sound?: NbtString
      /** 1.21.120 */
      emit_vibrations?: NbtBoolean
      /** 1.26.30 */
      start_using?: NbtString<'always' | 'if_first'>
    }>
    'minecraft:wearable'?: NbtCompound<{
      slot: NbtString<WearableSlot>
      /** Armor points */
      protection: NbtInt
      /** Hidden from the locator bar (1.21.90) */
      hides_player_location?: NbtBoolean
    }>
  }>

  /** A component with one `value` */
  export type ValueComponent<T> = NbtCompound<{ value: T }>

  /** `item_properties` of a data driven item */
  export type ItemPropertiesNbt = NbtCompound<{
    allow_off_hand: NbtBoolean
    /** Default 1 */
    can_destroy_in_creative: NbtBoolean
    /** `menu_category.category`: 1 construction, 2 nature, 3 equipment, 4 items, 6 none */
    creative_category: NbtInt<1 | 2 | 3 | 4 | 6>
    /** `menu_category.group`, e.g. `minecraft:itemGroup.name.sword` (empty: no group) */
    creative_group: NbtString
    damage: NbtInt
    /** `none` without `minecraft:enchantable` */
    enchantable_slot: NbtString
    enchantable_value: NbtInt
    /** `minecraft:glint` */
    foil: NbtBoolean
    /** Always 1 */
    frame_count: NbtInt
    hand_equipped: NbtBoolean
    /** `menu_category.is_hidden_in_commands`: 1 true, 2 false (1.21.111) */
    hidden_in_commands?: NbtByte<1 | 2>
    /** `minecraft:hover_text_color` as a formatting code, e.g. `§g` (only when set) */
    hover_text_color?: NbtString
    liquid_clipped: NbtBoolean
    max_stack_size: NbtInt
    /** Only when set. A json string icon is sent as `{ textures: { default } }`. */
    'minecraft:icon'?: NbtCompound<{ textures: ItemIconTexturesNbt }>
    /** Always 1 */
    mining_speed: NbtFloat
    /** Default 1 */
    should_despawn: NbtBoolean
    stacked_by_data: NbtBoolean
    use_animation: NbtInt<UseAnimationId>
    /** `minecraft:use_modifiers` use_duration, in ticks */
    use_duration: NbtInt
  }>

  /** Texture shortnames (`item_texture.json` keys) of `minecraft:icon` */
  export type ItemIconTexturesNbt = NbtCompound<{
    default: NbtString
    /** Once dyed */
    dyed?: NbtString
    icon_trim?: NbtString
    bundle_open_back?: NbtString
    bundle_open_front?: NbtString
  }>

  export type UseAnimation = 'none' | 'eat' | 'drink' | 'block' | 'bow' | 'camera' | 'spear' | 'crossbow' | 'spyglass' | 'brush'
  /** none 0, eat 1, drink 2, block 3, bow 4, camera 5, spear 6, crossbow 9, spyglass 10, brush 12 */
  export type UseAnimationId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 9 | 10 | 12
  export type WearableSlot = 'slot.weapon.mainhand' | 'slot.weapon.offhand' | 'slot.armor.head' | 'slot.armor.chest' | 'slot.armor.legs' | 'slot.armor.feet' | 'slot.armor.body'

  /**
   * A json `"minecraft:dirt"` is sent as `{ name: 'minecraft:dirt', states: {}, tags: '' }`, a json
   * `{ tags: "q.any_tag('stone')" }` as `{ name: '', states: {}, tags: "q.any_tag('stone')" }`
   */
  export type BlockDescriptorNbt = NbtCompound<{
    name: NbtString
    /** `true` is sent as 1, a string value as 0 */
    states: NbtCompound<{ [state: string]: NbtInt }>
    /** Molang tag expression */
    tags: NbtString
  }>

  /** A json `"minecraft:apple"` is sent as `{ name: 'minecraft:apple' }` */
  export type ItemDescriptorNbt = NbtCompound<{ name: NbtString }> | NbtCompound<{ tags: NbtString }>

  export type MolangNbt = NbtCompound<{ expression: NbtString, version: NbtShort }>
  export type FloatRangeNbt = NbtCompound<{ min: NbtFloat, max: NbtFloat }>

  export type KineticWeaponConditionsNbt = NbtCompound<{
    /** Ticks, -1: no limit */
    max_duration: NbtShort
    min_speed: NbtFloat
    min_relative_speed: NbtFloat
  }>

  type StorageItemFields = {
    max_slots: NbtInt
    allow_nested_storage_items: NbtBoolean
    /** Empty: any item */
    allowed_items: NbtList<ItemDescriptorNbt>
    banned_items: NbtList<ItemDescriptorNbt>
  }

  type ThrowableFields = {
    do_swing_animation: NbtBoolean
    launch_power_scale: NbtFloat
    max_launch_power: NbtFloat
    /** In seconds */
    min_draw_duration: NbtFloat
    max_draw_duration: NbtFloat
    scale_power_by_draw_duration: NbtBoolean
  }

  /**
   * `nbt` of a `legacy` item state (1.21.60+): hardcoded vanilla items, custom items without a component the client
   * needs, and items in the 1.10 json format. Empty for most.
   */
  export type LegacyItemNbt = NbtRoot<{ components?: LegacyItemComponentsNbt }>

  export type LegacyItemComponentsNbt = NbtCompound<{
    'minecraft:food'?: LegacyFoodNbt
    /** In ticks */
    'minecraft:use_duration'?: NbtInt
    'minecraft:max_stack_size'?: NbtInt
    'minecraft:stacked_by_data'?: NbtBoolean
    'minecraft:foil'?: NbtBoolean
    /** The block of the item */
    'minecraft:block'?: NbtString
    /** The item plants a crop */
    'minecraft:seed'?: NbtCompound<{
      crop_result: NbtString
      plant_at: NbtList<NbtString>
      plant_at_any_solid_surface: NbtBoolean
      /** e.g. `up` */
      plant_at_face: NbtString
    }>
    /** In seconds */
    'minecraft:camera'?: NbtCompound<{
      black_bars_duration: NbtFloat
      black_bars_screen_ratio: NbtFloat
      shutter_duration: NbtFloat
      shutter_screen_ratio: NbtFloat
      picture_duration: NbtFloat
      slide_away_duration: NbtFloat
    }>
  }>

  export type LegacyFoodNbt = NbtCompound<{
    nutrition: NbtInt
    saturation_modifier: NbtFloat
    can_always_eat: NbtBoolean
    /** The item given back, or empty */
    using_converts_to: NbtString
    effects?: NbtList<NbtCompound<{
      /** e.g. 10 and `regeneration` */
      id: NbtInt
      name: NbtString
      /** e.g. `potion.regeneration` */
      descriptionId: NbtString
      /** In seconds */
      duration: NbtInt
      amplifier: NbtInt
      /** 0-1 */
      chance: NbtFloat
    }>>
    /** Ids of the effects removed */
    remove_effects?: NbtList<NbtInt>
    /** -1: none */
    on_use_action: NbtInt
    on_use_range: NbtList<NbtFloat>
    cooldown_type: NbtString
    cooldown_time: NbtInt
  }>

  /**
   * `nbt` of an `item_component` entry (1.16.201 - 1.21.50): the components of a custom item, or (from 1.18.11)
   * the legacy components of a vanilla item
   */
  export type ItemComponentEntryNbt = NbtRoot<{
    components: ItemComponentEntryComponentsNbt | NbtCompound<{
      'minecraft:food'?: LegacyFoodNbt
      /** In ticks */
      'minecraft:use_duration': NbtInt
    }>
    id: NbtInt
    name: NbtString
  }>

  type DataDrivenComponents = NonNullable<ItemComponentsNbt['value']>
  type ComponentFields<K extends keyof DataDrivenComponents> = NonNullable<DataDrivenComponents[K]>['value']

  /**
   * The components of a custom item in an `item_component` entry. The Holiday Creator Features experiment sends
   * more (`minecraft:armor`, `minecraft:on_use`, ...), format 1.20 removed most of them. Fields with versions
   * were sent by those.
   */
  export type ItemComponentEntryComponentsNbt = NbtCompound<
    Pick<DataDrivenComponents,
    'minecraft:allow_off_hand' | 'minecraft:bundle_interaction' | 'minecraft:can_destroy_in_creative' |
    'minecraft:display_name' | 'minecraft:durability' | 'minecraft:dyeable' | 'minecraft:enchantable' |
    'minecraft:entity_placer' | 'minecraft:fuel' | 'minecraft:glint' | 'minecraft:hand_equipped' |
    'minecraft:hover_text_color' | 'minecraft:interact_button' | 'minecraft:liquid_clipped' |
    'minecraft:max_stack_size' | 'minecraft:projectile' | 'minecraft:publisher_on_use_on' | 'minecraft:rarity' |
    'minecraft:record' | 'minecraft:shooter' | 'minecraft:should_despawn' | 'minecraft:stacked_by_data' |
    'minecraft:tags' | 'minecraft:use_animation'> & {
      item_properties: ItemComponentEntryPropertiesNbt
      /** 1.18.11 */
      item_tags?: NbtList<NbtString>
      /** Holiday Creator Features, until 1.20.15 */
      'minecraft:armor'?: NbtCompound<{
        protection: NbtInt
        /** An int before 1.19.1, then a name, e.g. `diamond` */
        texture_type: NbtInt | NbtString
      }>
      'minecraft:block_placer'?: NbtCompound<{
        block: NbtString
        use_on: NbtList<BlockDescriptorNbt>
        /** 1.21.50 */
        canUseBlockAsIcon?: NbtBoolean
      }>
      /** Renamed to `minecraft:use_modifiers` (1.19.1 - 1.20.50) */
      'minecraft:chargeable'?: NbtCompound<{ movement_modifier: NbtFloat }>
      'minecraft:cooldown'?: NbtCompound<{ category: NbtString, duration: NbtFloat }>
      'minecraft:damage'?: ValueComponent<NbtByte>
      'minecraft:digger'?: NbtCompound<{
        destroy_speeds: NbtList<NbtCompound<{
          block: DiggerBlockDescriptorNbt
          speed: NbtInt
          /** Holiday Creator Features, until 1.20.40 */
          on_dig?: ItemEventTriggerNbt
        }>>
        use_efficiency: NbtBoolean
        /** Holiday Creator Features, until 1.20.40 */
        on_dig?: ItemEventTriggerNbt
      }>
      /** Holiday Creator Features, until 1.19.80: an int before 1.19.1, then a name */
      'minecraft:dye_powder'?: NbtCompound<{ color: NbtInt | NbtString }>
      'minecraft:food'?: NbtCompound<{
        nutrition: NbtInt
        saturation_modifier: NbtFloat
        can_always_eat: NbtBoolean
        /** `{ Name, Aux }` before 1.19.1, or empty */
        using_converts_to: NbtCompound<{ Name: NbtString, Aux: NbtShort }> | ItemDescriptorNbt | NbtCompound<Record<string, never>>
        /** Holiday Creator Features, until 1.20.80 */
        on_consume?: ItemEventTriggerNbt
      }>
      /** Before 1.17.30, then in `item_properties` */
      'minecraft:icon'?: NbtCompound<{ frame: NbtString, legacy_id: NbtString, texture: NbtString }>
      /** Holiday Creator Features, until 1.19.80 */
      'minecraft:knockback_resistance'?: NbtCompound<{ protection: NbtFloat }>
      /** Holiday Creator Features, until 1.20.71 */
      'minecraft:on_use'?: NbtCompound<{ on_use: ItemEventTriggerNbt }>
      /** Holiday Creator Features, until 1.20.80 */
      'minecraft:on_use_on'?: NbtCompound<{ on_use_on: ItemEventTriggerNbt }>
      /** Holiday Creator Features, 1.16.210 - 1.20.80 */
      'minecraft:render_offsets'?: NbtCompound<{ main_hand: ItemHandOffsetsNbt, off_hand: ItemHandOffsetsNbt }>
      'minecraft:repairable'?: NbtCompound<{
        repair_items: NbtList<NbtCompound<{
          items: NbtList<ItemDescriptorNbt>
          /** A number (1.21.50), or a molang expression whose version is an int before 1.21.20 */
          repair_amount: NbtFloat | NbtCompound<{ expression: NbtString, version: NbtInt | NbtShort }>
        }>>
      }>
      /** 1.21.42 - 1.21.50 */
      'minecraft:storage_item'?: NbtCompound<StorageItemFields & {
        /** Moved to `minecraft:storage_weight_limit` */
        max_weight_limit: NbtInt
        /** Moved to `minecraft:storage_weight_modifier` */
        weight_in_storage_item: NbtInt
      }>
      'minecraft:throwable'?: NbtCompound<ThrowableFields & {
        /** 1.20.80 - 1.21.2 */
        default_offset_scale?: NbtFloat
        /** 1.20.80 - 1.21.2 */
        inside_block_offset_scale?: NbtFloat
      }>
      /** `{ value }` (the use duration) in 1.20.50 */
      'minecraft:use_modifiers'?: NbtCompound<{ use_duration: NbtFloat, movement_modifier?: NbtFloat }> | ValueComponent<NbtFloat>
      /** Holiday Creator Features, until 1.20.50 */
      'minecraft:weapon'?: NbtCompound<{ on_hit_block: ItemEventTriggerNbt, on_hurt_entity: ItemEventTriggerNbt, on_not_hurt_entity: ItemEventTriggerNbt }>
      'minecraft:wearable'?: NbtCompound<{
        /** An int before 1.19.1 */
        slot: NbtInt | NbtString<Exclude<WearableSlot, 'slot.weapon.mainhand' | 'slot.armor.body'>>
        /** 1.20.30 */
        protection?: NbtInt
        /** Before 1.17.30 */
        dispensable?: NbtBoolean
      }>
    }
  >

  /** `item_properties` of an `item_component` entry */
  export type ItemComponentEntryPropertiesNbt = NbtCompound<Omit<ComponentFields<'item_properties'>, 'hidden_in_commands' | 'minecraft:icon'> & {
    /** Before 1.20.30 */
    animates_in_toolbar?: NbtBoolean
    /** Before 1.20.30 */
    explodable?: NbtBoolean
    /** Before 1.20.30 */
    ignores_permission?: NbtBoolean
    /** Before 1.20.30 */
    mirrored_art?: NbtBoolean
    /** Before 1.20.30 */
    requires_interact?: NbtBoolean
    /** 1.17.30; the layout changed in 1.18.11, 1.20.0 and 1.20.61 */
    'minecraft:icon'?:
    | NbtCompound<{ frame: NbtString, frame_version: NbtInt, legacy_id: NbtString, texture: NbtString }>
    | NbtCompound<{ legacy_id: NbtString, texture: NbtString }>
    | NbtCompound<{ texture: NbtString }>
    | NbtCompound<{ textures: ItemIconTexturesNbt }>
  }>

  /** An event of the Holiday Creator Features components */
  export type ItemEventTriggerNbt = NbtCompound<{
    event: NbtString
    /** A string before 1.17.30, none in 1.17.30 - 1.18.30, then a molang expression */
    condition?: NbtString | NbtCompound<{ expression: NbtString, version: NbtInt }>
    /** Who the event runs on: an int before 1.19.1, then a name, e.g. `self` */
    target: NbtInt | NbtString
  }>

  /** No states before 1.19.1, no tags before 1.19.40 */
  export type DiggerBlockDescriptorNbt = NbtCompound<{
    name: NbtString
    states?: NbtCompound<{ [state: string]: NbtInt }>
    tags?: NbtString
  }>

  export type ItemHandOffsetsNbt = NbtCompound<{ first_person: ItemTransformNbt, third_person: ItemTransformNbt }>
  export type ItemTransformNbt = NbtCompound<{ position: Vector3Nbt, rotation: Vector3Nbt, scale: Vector3Nbt }>
  /** A compound before 1.19.1, then a list */
  export type Vector3Nbt = NbtCompound<{ x: NbtFloat, y: NbtFloat, z: NbtFloat }> | NbtList<NbtFloat>

  /** `nbt.simplify` of the nbt of an item state, by its version */
  export interface SimplifiedItemNbt {
    data_driven: Simplified<DataDrivenItemNbt>
    legacy: Simplified<LegacyItemNbt>
    none: Simplified<NbtRoot<Record<string, never>>>
  }
  export type ItemComponents = Simplified<ItemComponentsNbt>
  export type ItemProperties = Simplified<ItemPropertiesNbt>
  export type BlockDescriptor = Simplified<BlockDescriptorNbt>
  export type ItemDescriptor = Simplified<ItemDescriptorNbt>
  export type LegacyItemComponents = Simplified<LegacyItemComponentsNbt>
  export type ItemComponentEntryComponents = Simplified<ItemComponentEntryNbt>['components']
}

export = loader
