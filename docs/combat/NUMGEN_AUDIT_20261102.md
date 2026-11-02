# 数值生成器审计 · 2026-11-02

P1。输入：`EXCHANGE_V2_20261023.md` 九币价 + 标尺牌 + 开工时 `CARD_REGISTRY` 131 张。机制核并行新牌不进本包。本文件不改一张牌。

当量 = Σ(效果 × 币价) − 条件折扣。公平价 = 费用 × 5。浮动带 ±15%。

## 汇总

| 项 | 张 |
|---|---|
| 基线 | 131 |
| 带内（将重填） | 19 |
| 超带·偏肥 | 48 |
| 超带·偏瘦 | 37 |
| 构筑层跳过 | 27 |
| 带 | ±15% |

## 九币

| 币 | 价 |
|---|---|
| 伤 | 1 劲 = 5 伤 |
| 挡 | 1 劲 = 6 挡 |
| 血 | 1 劲 = 4 血 |
| 位移 | 1 格 = 0.4 劲 |
| 控制 | 晕/缴械 1 段 = 1.5 劲 |
| 叠层 | 1 层 = 2 伤 |
| 抽 | 1 = 1 劲 |
| 先机 | 临时 ±1 = 0.5 劲 |
| 撞墙 | 触发期望 0.6 |
| 蓄力利息 | +25%/手 |

## 全池

| id | 系 | 费 | 当量 | 公平 | 偏差 | 带 | 跳过 | 构成 |
|---|---|---|---|---|---|---|---|---|
| advance | any | 1 | 4.7 | 5 | -5.5% | in | — | 位移2.0；条件抽3.3 |
| advance2 | any | 2 | 7.3 | 10 | -27.5% | under | — | 位移4.0；条件抽3.3 |
| auraHook | hook | 2 | 4 | 10 | -60% | 跳 | 构筑层·光环，不进牌面汇率 | 拉近2.0；滞手2.0 |
| auraPalm | palm | 2 | 2 | 10 | -80% | 跳 | 构筑层·光环，不进牌面汇率 | 击退2.0 |
| auraSaber | saber | 2 | 7.3 | 10 | -26.7% | 跳 | 构筑层·光环，不进牌面汇率 | 挡3.3；裂创4.0 |
| auraSpear | spear | 2 | 3.3 | 10 | -66.7% | 跳 | 构筑层·光环，不进牌面汇率 | 挡3.3 |
| auraStaff | staff | 2 | 13 | 10 | +30% | 跳 | 构筑层·光环，不进牌面汇率 | 挡10.0；落桩3.0 |
| auraSword | sword | 2 | 9 | 10 | -10% | 跳 | 构筑层·光环，不进牌面汇率 | 挡5.0；破绽4.0 |
| backpalm | any | 1 | 4.2 | 5 | -16.7% | under | — | 挡4.2 |
| bleedcut | saber | 1 | 10 | 5 | +100% | over | — | 伤4.0；裂创6.0 |
| brace | any | 1 | 8.3 | 5 | +65% | over | — | 挡5.0；条件抽3.3 |
| buryBleed | saber | 2 | 3.1 | 10 | -69.4% | under | — | 反击裂创3.6 |
| buryKnock | palm | 2 | 1 | 10 | -89.8% | under | — | 反击击退1.2 |
| burySlash | any | 2 | 3.6 | 10 | -64.3% | under | — | 反击伤4.2 |
| buryWard | any | 2 | 5.4 | 10 | -45.6% | under | — | 反击伤2.4；反击挡4.0 |
| charge | any | 1 | 7 | 5 | +40% | over | — | 蓄劲5.0；势+12.0 |
| close | any | 1 | 0 | 5 | -100% | under | — | — |
| comboHook | hook | 3 | 14 | 15 | -6.7% | 跳 | 构筑层·组合，不进牌面汇率 | 伤12.0；拉近2.0 |
| comboPalm | palm | 2 | 16 | 10 | +60% | 跳 | 构筑层·组合，不进牌面汇率 | 伤14.0；击退2.0 |
| comboSaber | saber | 3 | 16 | 15 | +6.7% | 跳 | 构筑层·组合，不进牌面汇率 | 伤16.0 |
| comboSpear | spear | 3 | 15 | 15 | 0% | 跳 | 构筑层·组合，不进牌面汇率 | 伤15.0 |
| comboStaff | staff | 3 | 18.7 | 15 | +24.4% | 跳 | 构筑层·组合，不进牌面汇率 | 伤12.0；挡6.7 |
| comboSword | sword | 3 | 14 | 15 | -6.7% | 跳 | 构筑层·组合，不进牌面汇率 | 伤14.0 |
| cut | saber | 2 | 13.3 | 10 | +32.9% | over | — | 伤9.0；近加成2.1；裂创4.0 |
| defend | any | 1 | 6.7 | 5 | +33.3% | over | — | 挡6.7 |
| defend2 | any | 2 | 13.3 | 10 | +32.5% | over | — | 挡10.0；条件抽3.3 |
| direct | sword | 1 | 6 | 5 | +20% | over | — | 伤4.0；破绽2.0 |
| drawcut | any | 1 | 4 | 5 | -20% | under | — | 伤4.0 |
| drunkFist | saber | 2 | 9.8 | 10 | -2.3% | in | — | 伤9.0；近加成2.1 |
| elbow | any | 3 | 15 | 15 | 0% | in | — | 伤15.0 |
| expose | sword | 1 | 11.3 | 5 | +125% | over | — | 破绽4.0；滞手4.0；条件抽3.3 |
| finisher | any | 2 | 1.5 | 10 | -85% | under | — | 伤4.0；铺势消耗-2.0 |
| finisher2 | any | 4 | 4.5 | 20 | -77.5% | under | — | 伤6.0 |
| fusePalmHook | hook | 1 | 8 | 5 | +60% | 跳 | 构筑层·连携，不进牌面汇率 | 伤6.0；拉近2.0 |
| fusePalmSaber | saber | 1 | 14 | 5 | +180% | 跳 | 构筑层·连携，不进牌面汇率 | 伤8.0；击退2.0；裂创4.0 |
| fusePalmSpear | spear | 1 | 10 | 5 | +100% | 跳 | 构筑层·连携，不进牌面汇率 | 伤8.0；击退2.0 |
| fusePalmStaff | staff | 1 | 10.3 | 5 | +106.7% | 跳 | 构筑层·连携，不进牌面汇率 | 挡8.3；击退2.0 |
| fusePalmSword | sword | 1 | 13 | 5 | +160% | 跳 | 构筑层·连携，不进牌面汇率 | 伤7.0；击退2.0；破绽4.0 |
| fuseSaberHook | hook | 1 | 13 | 5 | +160% | 跳 | 构筑层·连携，不进牌面汇率 | 伤7.0；拉近2.0；裂创4.0 |
| fuseSaberSpear | spear | 1 | 11 | 5 | +120% | 跳 | 构筑层·连携，不进牌面汇率 | 伤9.0；裂创2.0 |
| fuseSaberStaff | staff | 1 | 9.7 | 5 | +93.3% | 跳 | 构筑层·连携，不进牌面汇率 | 挡6.7；落桩3.0 |
| fuseSaberSword | sword | 1 | 11 | 5 | +120% | 跳 | 构筑层·连携，不进牌面汇率 | 伤7.0；裂创4.0 |
| fuseSpearHook | hook | 1 | 10 | 5 | +100% | 跳 | 构筑层·连携，不进牌面汇率 | 伤8.0；拉近2.0 |
| fuseSpearStaff | staff | 1 | 8.3 | 5 | +66.7% | 跳 | 构筑层·连携，不进牌面汇率 | 挡8.3 |
| fuseStaffHook | hook | 1 | 9.5 | 5 | +90% | 跳 | 构筑层·连携，不进牌面汇率 | 挡7.5；拉近2.0 |
| fuseSwordHook | hook | 1 | 6 | 5 | +20% | 跳 | 构筑层·连携，不进牌面汇率 | 拉近2.0；破绽4.0 |
| fuseSwordSpear | spear | 1 | 12 | 5 | +140% | 跳 | 构筑层·连携，不进牌面汇率 | 伤8.0；破绽4.0 |
| fuseSwordStaff | staff | 1 | 8.7 | 5 | +73.3% | 跳 | 构筑层·连携，不进牌面汇率 | 挡6.7；破绽2.0 |
| gather | any | 2 | 7 | 10 | -30% | under | — | 气脉2.0；抽5.0 |
| handCut | any | 2 | 10 | 10 | 0% | in | — | 削手10.0 |
| haste | any | 1 | 10.8 | 5 | +115% | over | — | 先机7.5；条件抽3.3 |
| hitHook | hook | 2 | 7 | 10 | -30% | under | — | 伤5.0；拉近2.0 |
| hitPalm | palm | 2 | 8 | 10 | -20% | under | — | 伤6.0；击退2.0 |
| hitSaber | saber | 2 | 8 | 10 | -20% | under | — | 伤6.0；裂创2.0 |
| hitSpear | sword | 1 | 9 | 5 | +80% | over | — | 伤7.0；破绽2.0 |
| hitStaff | palm | 1 | 15.5 | 5 | +210% | over | — | 伤6.0；击退2.0；晕7.5 |
| hitSword | sword | 1 | 7 | 5 | +40% | over | — | 伤5.0；破绽2.0 |
| hookDisarm | hook | 2 | 21 | 10 | +110% | over | — | 伤4.0；拉近2.0；缴械15.0 |
| hookpull | hook | 1 | 7 | 5 | +40% | over | — | 伤3.0；拉近4.0 |
| inbreath | any | 1 | 13.3 | 5 | +165% | over | — | 下回劲10.0；条件抽3.3 |
| ironform | any | 3 | 15.3 | 15 | +2.2% | in | — | 挡8.3；留挡7.0 |
| jinwuToken | any | 1 | 4.7 | 5 | -5.3% | in | — | 挡3.3；铁布1.4 |
| lateBleed | saber | 3 | 15 | 15 | 0% | in | — | 伤7.0；裂创8.0 |
| lateTide | any | 3 | 16 | 15 | +6.7% | in | — | 气脉6.0；抽10.0 |
| lateWard | any | 3 | 14.8 | 15 | -1.1% | in | — | 挡12.5；留挡2.3 |
| layer | any | 2 | 9 | 10 | -10% | in | — | 伤3.0；势技4.0；势+12.0 |
| marking | any | 2 | 8 | 10 | -20% | under | — | 伤4.0；印4.0 |
| mend | any | 1 | 6.3 | 5 | +25% | over | — | 回血6.3 |
| mend2 | any | 2 | 13 | 10 | +30% | over | — | 回血10.0；驱散3.0 |
| mirror | any | 2 | 8 | 10 | -20% | under | — | 卸力(估)8.0 |
| palmSeal | palm | 2 | 12.5 | 10 | +25% | over | — | 伤5.0；禁技7.5 |
| pierce | palm | 1 | 8 | 5 | +60% | over | — | 伤6.0；击退2.0 |
| plant | staff | 1 | 2.6 | 5 | -49% | under | — | 落桩3.0 |
| pouchSeal | any | 2 | 5 | 10 | -50% | under | — | 封囊5.0 |
| push | palm | 2 | 9.4 | 10 | -6% | in | — | 击退4.0；撞墙期望5.4 |
| push2 | palm | 3 | 12 | 15 | -20% | under | — | 击退6.0；撞墙期望6.0 |
| qiFlood | any | 3 | 20 | 15 | +33.3% | over | — | 下回劲20.0 |
| qiLeech | any | 2 | 27.5 | 10 | +175% | over | — | 本场回劲10.0；断敌劲17.5 |
| qiPulse | any | 2 | 13.3 | 10 | +32.5% | over | — | 本场回劲10.0；条件抽3.3 |
| retreat | any | 1 | 0 | 5 | -100% | under | — | — |
| rift | sword | 1 | 13 | 5 | +160% | over | — | 伤6.0；破绽2.0；抽5.0 |
| saberBleed | saber | 2 | 10 | 10 | 0% | in | — | 伤6.0；裂创4.0 |
| setup | any | 2 | 7 | 10 | -30% | under | — | 铺势2.0；抽5.0 |
| sidestep | any | 2 | 7 | 10 | -30% | under | — | 换位2.0；抽5.0 |
| skillLock | any | 2 | 15 | 10 | +50% | over | — | 禁技15.0 |
| spearLock | sword | 2 | 12 | 10 | +20% | over | — | 伤6.0；破绽4.0；滞手2.0 |
| split | any | 1 | 7 | 5 | +40% | over | — | 伤7.0 |
| staffBind | staff | 2 | 19.2 | 10 | +91.7% | over | — | 挡6.7；晕7.5；削手5.0 |
| statusHook | hook | 1 | 4.5 | 5 | -10% | in | — | 挡2.5；滞手2.0 |
| statusHook2 | hook | 1 | 6 | 5 | +20% | over | — | 拉近2.0；滞手4.0 |
| statusPalm | palm | 1 | 8.3 | 5 | +65% | over | — | 回血5.0；条件抽3.3 |
| statusPalm2 | palm | 1 | 17.5 | 5 | +250% | over | — | 回血7.5；下回劲10.0 |
| statusSaber | saber | 1 | 9.4 | 5 | +88.3% | over | — | 挡4.2；裂创2.0；条件抽3.3 |
| statusSaber2 | saber | 1 | 6.5 | 5 | +30% | over | — | 挡2.5；裂创4.0 |
| statusSpear | spear | 1 | 8.3 | 5 | +66.7% | over | — | 挡3.3；下回劲5.0 |
| statusSpear2 | spear | 2 | 19.2 | 10 | +91.7% | over | — | 挡4.2；下回劲15.0 |
| statusStaff | staff | 2 | 10.3 | 10 | +2.7% | in | — | 挡5.8；落桩3.0；条件抽3.3 |
| statusStaff2 | staff | 2 | 10 | 10 | 0% | in | — | 挡10.0 |
| statusSword | sword | 1 | 4.5 | 5 | -10% | in | — | 挡2.5；破绽2.0 |
| statusSword2 | sword | 1 | 6 | 5 | +20% | over | — | 破绽4.0；滞手2.0 |
| stepHook | hook | 1 | 4 | 5 | -20% | under | — | 拉近2.0；位移2.0 |
| stepPalm | palm | 1 | 3.7 | 5 | -26.7% | under | — | 挡1.7；位移2.0 |
| stepSaber | saber | 1 | 7 | 5 | +40% | over | — | 位移2.0；先机5.0 |
| stepSpear | spear | 1 | 7 | 5 | +40% | over | — | 位移2.0；下回劲5.0 |
| stepStaff | staff | 1 | 4.5 | 5 | -10% | in | — | 挡2.5；位移2.0 |
| stepSword | sword | 1 | 4 | 5 | -20% | under | — | 位移2.0；破绽2.0 |
| strike | any | 1 | 5 | 5 | 0% | in | — | 伤5.0 |
| strike2 | palm | 2 | 12 | 10 | +20% | over | — | 伤10.0；击退2.0 |
| suture | any | 2 | 8 | 10 | -20% | under | — | 再生8.0 |
| sweep | palm | 1 | 7 | 5 | +40% | over | — | 击退2.0；抽5.0 |
| swordMute | saber | 2 | 24 | 10 | +140% | over | — | 伤5.0；裂创4.0；禁技15.0 |
| thorns | staff | 1 | 7 | 5 | +39.3% | over | — | 挡4.2；铁布2.8 |
| thrust | spear | 1 | 5.4 | 5 | +7.4% | in | — | 伤4.0；远加成2.1 |
| ultHook | hook | 4 | 14 | 20 | -30.1% | under | — | 伤12.0；拉近2.0；缴械7.5 |
| ultIronWall | any | 4 | 5.4 | 20 | -72.9% | under | — | 挡8.3 |
| ultPalm | palm | 4 | 14.3 | 20 | -28.5% | under | — | 伤22.0 |
| ultQiBurst | any | 4 | 9.1 | 20 | -54.5% | under | — | 伤14.0 |
| ultSaber | saber | 4 | 13 | 20 | -35% | under | — | 伤18.0；击退2.0 |
| ultSpear | spear | 4 | 13 | 20 | -35% | under | — | 伤20.0 |
| ultStaff | staff | 4 | 12.7 | 20 | -36.6% | under | — | 伤12.0；晕7.5 |
| ultSword | sword | 4 | 9.1 | 20 | -54.5% | under | — | 伤10.0；裂创4.0 |
| unbind | any | 1 | 6.3 | 5 | +25% | over | — | 驱散3.0；条件抽3.3 |
| varBackwater | any | 2 | 6.4 | 10 | -36% | under | — | 伤8.0 |
| varOverhand | any | 2 | 6.4 | 10 | -36% | under | — | 伤8.0 |
| venomFog | saber | 2 | 6 | 10 | -40% | under | — | 裂创6.0 |
| wardHook | hook | 1 | 7 | 5 | +40% | over | — | 挡5.0；滞手2.0 |
| wardPalm | palm | 1 | 7 | 5 | +40% | over | — | 挡5.0；击退2.0 |
| wardSaber | saber | 1 | 6.4 | 5 | +28% | over | — | 挡5.0；铁布1.4 |
| wardSpear | spear | 1 | 10 | 5 | +100% | over | — | 挡5.0；下回劲5.0 |
| wardStaff | staff | 1 | 6.8 | 5 | +36% | over | — | 挡5.0；落桩3.0 |
| wardSword | sword | 1 | 7 | 5 | +40% | over | — | 挡5.0；破绽2.0 |

## 超带名单（不自动削）

| id | 现值当量 | 生成目标 | 偏差 | 现值数字 |
|---|---|---|---|---|
| statusPalm2 | 17.5 | 5 | +250% | {"heal":6,"energyNext":2} |
| hitStaff | 15.5 | 5 | +210% | {"damage":6,"knock":1,"foeStun":1} |
| qiLeech | 27.5 | 10 | +175% | {"foeQiBurn":2,"qiRegenSelf":1} |
| inbreath | 13.3 | 5 | +165% | {"energyNext":2} |
| rift | 13 | 5 | +160% | {"damage":6,"expose":1} |
| swordMute | 24 | 10 | +140% | {"damage":5,"bleed":2,"foeMute":2} |
| expose | 11.3 | 5 | +125% | {"expose":2,"frail":2} |
| haste | 10.8 | 5 | +115% | {"pace":3} |
| hookDisarm | 21 | 10 | +110% | {"damage":4,"pullEnemy":1,"foeDisarm":2} |
| bleedcut | 10 | 5 | +100% | {"damage":4,"bleed":3} |
| wardSpear | 10 | 5 | +100% | {"block":6,"energyNext":1} |
| close | 0 | 5 | -100% | {} |
| retreat | 0 | 5 | -100% | {} |
| staffBind | 19.2 | 10 | +91.7% | {"block":8,"foeStun":1,"foeHandTax":1} |
| statusSpear2 | 19.2 | 10 | +91.7% | {"block":5,"energyNext":3} |
| buryKnock | 1 | 10 | -89.8% | {} |
| statusSaber | 9.4 | 5 | +88.3% | {"block":5,"bleed":1} |
| finisher | 1.5 | 10 | -85% | {"damage":4,"setupCost":1} |
| hitSpear | 9 | 5 | +80% | {"damage":7,"expose":1} |
| finisher2 | 4.5 | 20 | -77.5% | {"damage":6} |
| ultIronWall | 5.4 | 20 | -72.9% | {"block":10,"blockMin":5} |
| buryBleed | 3.1 | 10 | -69.4% | {} |
| statusSpear | 8.3 | 5 | +66.7% | {"block":4,"energyNext":1} |
| brace | 8.3 | 5 | +65% | {"block":6} |
| statusPalm | 8.3 | 5 | +65% | {"heal":4} |
| burySlash | 3.6 | 10 | -64.3% | {} |
| pierce | 8 | 5 | +60% | {"damage":6,"knock":1} |
| ultQiBurst | 9.1 | 20 | -54.5% | {"damage":14,"qiMin":3} |
| ultSword | 9.1 | 20 | -54.5% | {"damage":10,"bleed":2,"bleedMin":4} |
| skillLock | 15 | 10 | +50% | {"foeMute":2} |
| pouchSeal | 5 | 10 | -50% | {"foeNoBag":2} |
| plant | 2.6 | 5 | -49% | {"stake":1} |
| buryWard | 5.4 | 10 | -45.6% | {} |
| charge | 7 | 5 | +40% | {"chargeBonus":4} |
| hitSword | 7 | 5 | +40% | {"damage":5,"expose":1} |
| hookpull | 7 | 5 | +40% | {"damage":3,"pullEnemy":2} |
| split | 7 | 5 | +40% | {"damage":7} |
| stepSaber | 7 | 5 | +40% | {"steps":1,"pace":2} |
| stepSpear | 7 | 5 | +40% | {"steps":-1,"energyNext":1} |
| sweep | 7 | 5 | +40% | {"knock":1} |
| wardHook | 7 | 5 | +40% | {"block":6,"frail":1} |
| wardPalm | 7 | 5 | +40% | {"block":6,"knock":1} |
| wardSword | 7 | 5 | +40% | {"block":6,"expose":1} |
| venomFog | 6 | 10 | -40% | {"bleed":3} |
| thorns | 7 | 5 | +39.3% | {"block":5,"thorns":4} |
| ultStaff | 12.7 | 20 | -36.6% | {"damage":12,"foeStun":1,"attacksMin":2} |
| wardStaff | 6.8 | 5 | +36% | {"block":6,"stake":1} |
| varBackwater | 6.4 | 10 | -36% | {"damage":8,"threshold":0.2} |
| varOverhand | 6.4 | 10 | -36% | {"damage":8,"threshold":0.8,"damageMulA":1.5} |
| ultSaber | 13 | 20 | -35% | {"damage":18,"knock":1} |
| ultSpear | 13 | 20 | -35% | {"damage":20,"distMin":3} |
| defend | 6.7 | 5 | +33.3% | {"block":8} |
| qiFlood | 20 | 15 | +33.3% | {"energyNext":4} |
| cut | 13.3 | 10 | +32.9% | {"damage":9,"nearBonus":3,"bleed":2} |
| defend2 | 13.3 | 10 | +32.5% | {"block":12} |
| qiPulse | 13.3 | 10 | +32.5% | {"qiRegenSelf":1} |
| ultHook | 14 | 20 | -30.1% | {"damage":12,"pullEnemy":1,"foeDisarm":1} |
| mend2 | 13 | 10 | +30% | {"heal":8} |
| statusSaber2 | 6.5 | 5 | +30% | {"block":3,"bleed":2} |
| gather | 7 | 10 | -30% | {"flow":1} |
| hitHook | 7 | 10 | -30% | {"damage":5,"pullEnemy":1} |
| setup | 7 | 10 | -30% | {"setupGain":1} |
| sidestep | 7 | 10 | -30% | {} |
| ultPalm | 14.3 | 20 | -28.5% | {"damage":22} |
| wardSaber | 6.4 | 5 | +28% | {"block":6,"thorns":2} |
| advance2 | 7.3 | 10 | -27.5% | {"steps":2} |
| stepPalm | 3.7 | 5 | -26.7% | {"block":2,"steps":1} |
| mend | 6.3 | 5 | +25% | {"heal":5} |
| palmSeal | 12.5 | 10 | +25% | {"damage":5,"foeMute":1} |
| unbind | 6.3 | 5 | +25% | {} |
| direct | 6 | 5 | +20% | {"damage":4,"expose":1} |
| spearLock | 12 | 10 | +20% | {"damage":6,"expose":2,"frail":1} |
| statusHook2 | 6 | 5 | +20% | {"pullEnemy":1,"frail":2} |
| statusSword2 | 6 | 5 | +20% | {"expose":2,"frail":1} |
| strike2 | 12 | 10 | +20% | {"damage":10,"knock":1} |
| drawcut | 4 | 5 | -20% | {"damage":4} |
| hitPalm | 8 | 10 | -20% | {"damage":6,"knock":1} |
| hitSaber | 8 | 10 | -20% | {"damage":6,"bleed":1} |
| marking | 8 | 10 | -20% | {"damage":4,"mark":2} |
| mirror | 8 | 10 | -20% | {} |
| push2 | 12 | 15 | -20% | {"knock":3,"wall":10} |
| stepHook | 4 | 5 | -20% | {"steps":1,"pullEnemy":1} |
| stepSword | 4 | 5 | -20% | {"steps":-1,"expose":1} |
| suture | 8 | 10 | -20% | {"regen":2,"regenTurns":4} |
| backpalm | 4.2 | 5 | -16.7% | {"block":5} |

## 构筑层（单独审）

- auraHook：构筑层·光环，不进牌面汇率（毛当量 4）
- auraPalm：构筑层·光环，不进牌面汇率（毛当量 2）
- auraSaber：构筑层·光环，不进牌面汇率（毛当量 7.3）
- auraSpear：构筑层·光环，不进牌面汇率（毛当量 3.3）
- auraStaff：构筑层·光环，不进牌面汇率（毛当量 13）
- auraSword：构筑层·光环，不进牌面汇率（毛当量 9）
- comboHook：构筑层·组合，不进牌面汇率（毛当量 14）
- comboPalm：构筑层·组合，不进牌面汇率（毛当量 16）
- comboSaber：构筑层·组合，不进牌面汇率（毛当量 16）
- comboSpear：构筑层·组合，不进牌面汇率（毛当量 15）
- comboStaff：构筑层·组合，不进牌面汇率（毛当量 18.7）
- comboSword：构筑层·组合，不进牌面汇率（毛当量 14）
- fusePalmHook：构筑层·连携，不进牌面汇率（毛当量 8）
- fusePalmSaber：构筑层·连携，不进牌面汇率（毛当量 14）
- fusePalmSpear：构筑层·连携，不进牌面汇率（毛当量 10）
- fusePalmStaff：构筑层·连携，不进牌面汇率（毛当量 10.3）
- fusePalmSword：构筑层·连携，不进牌面汇率（毛当量 13）
- fuseSaberHook：构筑层·连携，不进牌面汇率（毛当量 13）
- fuseSaberSpear：构筑层·连携，不进牌面汇率（毛当量 11）
- fuseSaberStaff：构筑层·连携，不进牌面汇率（毛当量 9.7）
- fuseSaberSword：构筑层·连携，不进牌面汇率（毛当量 11）
- fuseSpearHook：构筑层·连携，不进牌面汇率（毛当量 10）
- fuseSpearStaff：构筑层·连携，不进牌面汇率（毛当量 8.3）
- fuseStaffHook：构筑层·连携，不进牌面汇率（毛当量 9.5）
- fuseSwordHook：构筑层·连携，不进牌面汇率（毛当量 6）
- fuseSwordSpear：构筑层·连携，不进牌面汇率（毛当量 12）
- fuseSwordStaff：构筑层·连携，不进牌面汇率（毛当量 8.7）

复跑：`npx tsx scripts/numgen/audit.ts`。
