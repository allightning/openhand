/** 旧路径壳。数据在 `content/legacy.ts`，注册表在 `content/`。结算继续读旧表。 */
export * from "./content/legacy";
export { CARD_REGISTRY, CARD_HOLDS, type CardDef as ContentCardDef } from "./content/cards";
export { ENEMY_REGISTRY, ENEMY_HOLDS, type EnemyDef as ContentEnemyDef } from "./content/enemies";
export {
  TECHNIQUE_REGISTRY,
  TECHNIQUE_HOLDS,
  type TechniqueDef as ContentTechniqueDef,
} from "./content/techniques";
export {
  MIND_REGISTRY,
  HEART_REGISTRY,
  MIND_HOLDS,
  HEART_HOLDS,
  type MindDef as ContentMindDef,
  type HeartDef as ContentHeartDef,
} from "./content/mindArts";
export { CHARM_REGISTRY, CHARM_HOLDS, type CharmDef as ContentCharmDef } from "./content/charms";
export { ITEM_REGISTRY, ITEM_HOLDS, type ItemDef as ContentItemDef } from "./content/items";
