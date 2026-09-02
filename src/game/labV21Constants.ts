/** §20 道具数值（颗数制：一次给 2 颗，用一少一） */
export const ITEM_GRANT_QTY = 2;
export const ITEM_HEAL_PCT = 0.32;
export const ITEM_DART_DMG = 8;
export const ITEM_QI_GAIN = 6;

export const LAB_ITEM_LABEL: Record<string, string> = {
  jinchuang: "金疮药",
  xiujian: "袖箭",
  huiqi: "回气散",
  lianhuan: "连环丹",
  pojin: "破禁丹",
  deathSquad: "死士符",
  aidPalm: "助战符·拳",
  aidSaber: "助战符·刀",
  aidSword: "助战符·剑",
  aidSpear: "助战符·枪",
  aidStaff: "助战符·棍",
  aidHook: "助战符·钩",
};

export const LAB_ITEM_TIP: Record<string, string> = {
  jinchuang: "回 32% 气血",
  xiujian: "8 点伤害，无视格挡",
  huiqi: "即时 +6 劲",
  lianhuan: "本回合积势额外 +1",
  pojin: "本回合绝招无视前置",
  deathSquad: "死士为你挡下本回合第一段攻击并反扑 8；若无人来犯，他收势前主动打 8。用后即走，不占伙伴位",
  aidPalm: "召铁牛上场一回合：敌下一段攻击只认他（算你拆）。放敌身后可当墙配震壁。用后符尽",
  aidSaber: "召燕七上场一回合：敌破绽 +2（承伤加深）。实体可卡位挡冲锋。用后符尽",
  aidSword: "召白衣上场一回合：敌裂创 +3。实体可卡位挡冲锋。用后符尽",
  aidSpear: "召长梢上场一回合：把敌挑退 1 格替你控距。实体可卡位挡冲锋。用后符尽",
  aidStaff: "召顿僧上场一回合：敌眩晕 1 段。实体可卡位挡冲锋。用后符尽",
  aidHook: "召缠丝上场一回合：敌缴械 2 息。实体可卡位挡冲锋。用后符尽",
};

export { AURA_DUO_START_QI } from "./labV25Constants";
