# 卡池审计 · 2026-10-23

开工快照。155 张还在注册表里，处置按 `docs/combat/CARD_POOL_PLAN_20261021.md`。Notion 逐张表本窗读不到，没有另加稿面以外的调价。

注册 155 张。合同红 20 张（不含交叉未拍）。

| id | 系 | 费 | kind | 钩子 | 文案带数 | 合同 | 处置 | 牌面 |
|---|---|---|---|---|---|---|---|---|
| advance | any | 1 | skill | step | 有 | — | 留 | 身前一格为空则前进，抽 1 张牌。 |
| advance2 | any | 1 | skill | step | 有 | — | 调价→2 | 身前最多前进 2 格。抽 1 张牌。 |
| auraHook | 钩 | 0 | skill | aura,frail,pull | 有 | cost | 调价→2 | 【光环】打出后本场攻击 +3。拉近 1，滞手 +1。同门·天罗。 |
| auraPalm | 拳 | 0 | skill | aura,knock | 有 | cost | 调价→2 | 【光环】打出后本场攻击 +3。击退 +1。同门·崩山。 |
| auraSaber | 刀 | 0 | skill | aura,bleed,block | 有 | cost | 调价→2 | 【光环】打出后本场攻击 +3。裂创 +2，格挡 4。同门·血饮。 |
| auraSpear | 枪 | 0 | skill | aura,block | 有 | cost | 调价→2 | 【光环】打出后本场攻击 +3。格挡 4。同门·丈八。 |
| auraStaff | 棍 | 0 | skill | aura,block,plant | 有 | cost | 调价→2 | 【光环】打出后本场攻击 +3。格挡 12。同门·铁桩。 |
| auraSword | 剑 | 0 | skill | aura,block,expose | 有 | cost | 调价→2 | 【光环】打出后本场攻击 +3。破绽 +2，格挡 6。同门·万脉。 |
| backpalm | any | 0 | skill | block,step | 有 | cost | 调价→1 | 身后一格为空则后退，获得 5 点格挡。 |
| bindwound | any | 1 | skill | heal | 有 | — | 删 | 有铺势吃 1 层：回 7 清裂创；否则回 2。 |
| bleedcut | 棍 | 1 | attack | bleed,damage | 有 | — | 交叉改挂→刀 | 造成 4 点伤害。敌人每回合再失 3 血，可叠。 |
| brace | any | 1 | skill | block | 有 | — | 留 | 获得 6 点格挡。抽 1。 |
| buryBleed | any | 1 | skill | riposte | 有 | — | 改挂→刀；调价→2 | 埋反击（按气血撑数回）。挨打时叠 3 裂创。 |
| buryKnock | any | 1 | skill | riposte | 有 | — | 改挂→拳；调价→2 | 埋反击（按气血撑数回）。挨打时击退 1。 |
| burySlash | any | 1 | skill | riposte | 有 | — | 调价→2 | 埋反击（按气血撑数回）。挨打时回敬 7。 |
| buryWard | any | 1 | skill | riposte | 有 | — | 调价→2 | 埋反击（按气血撑数回）。挨打时挡 8 并回敬 4。 |
| cauterize | any | 0 | skill | clearBleed,clearSeal,payHp | 有 | cost | 删 | 自损 4（留 1）。清裂创与封脉。 |
| chain | any | 2 | attack | damage | 有 | — | 删 | 打 5。若有连势则打 9 并抽 1。 |
| chain2 | any | 3 | attack | damage | 有 | — | 删 | 打 7。若有连势则打 11 并抽 1。 |
| charge | any | 1 | skill | charge | 有 | — | 留 | 下一张攻击伤害 +4。势 +1。 |
| charge2 | any | 3 | skill | charge | 有 | — | 删 | 下一张攻击伤害 +7。 |
| close | any | 1 | skill | step | 无 | text | 留 | 移到对方身前。路要空。 |
| combo | any | 1 | skill | combo,stackTax | 有 | — | 删 | 连势 +1。下一张攻击按连势各加 2 伤。 |
| comboHook | 钩 | 2 | attack | assist,combo,damage,pull | 有 | — | 调价→3 | 组合：后场该系同行。伤 12，拉近 1。 |
| comboPalm | 拳 | 2 | attack | assist,combo,damage,knock | 有 | — | 留 | 组合：后场该系同行。伤 14，推 1 格。 |
| comboPay | any | 2 | attack | combo,damage | 有 | — | 删 | 消耗 1 连势：伤 10。 |
| comboSaber | 刀 | 2 | attack | assist,combo,damage | 有 | — | 调价→3 | 组合：后场该系同行。伤 16；贴身再 +6。 |
| comboSpear | 枪 | 2 | attack | assist,combo,damage | 有 | — | 调价→3 | 组合：后场该系同行。伤 15，破绽 +2。 |
| comboStaff | 棍 | 2 | attack | assist,block,combo,damage | 有 | — | 调价→3 | 组合：后场该系同行。伤 12，格挡 +8。 |
| comboSword | 剑 | 2 | attack | assist,combo,damage | 有 | — | 调价→3 | 组合：后场该系同行。伤 14，封脉滞步。 |
| comboTax | any | 1 | skill | stackTax | 有 | — | 删 | 付 2 血叠 1 连势。抽 1。 |
| cut | any | 2 | attack | bleed,damage,near | 有 | — | 改挂→刀 | 贴身 12，叠 2 裂创。距 2 则 4。 |
| defend | any | 1 | skill | block | 有 | — | 留 | 获得 8 点格挡。 |
| defend2 | any | 1 | skill | block | 有 | — | 调价→2 | 获得 12 点格挡，抽 1。 |
| direct | any | 1 | attack | damage,expose | 有 | — | 改挂→剑 | 造成 4 点伤害，破绽 +1。 |
| drawcut | any | 1 | attack | damage | 有 | — | 留 | 相邻打 8 并叠 1 裂创，否则 4。 |
| drunkFist | 拳 | 2 | attack | damage,near | 有 | — | 交叉改挂→刀 | 造成 10 点伤害。贴身再 +3。 |
| echo | any | 2 | skill | echo | 有 | — | 删 | 下回第一掌伤害 +6。 |
| elbow | any | 3 | attack | damage | 有 | — | 留 | 造成 15 点伤害。 |
| expose | 剑 | 1 | skill | expose,frail | 有 | — | 留 | 敌人下两下 +4。他出手 -3，两回。抽 1。 |
| finisher | any | 2 | attack | damage,finisher,setup | 有 | — | 留 | 需铺势≥1。打 4，每层铺势再 +5，然后清掉铺势。 |
| finisher2 | any | 4 | attack | damage,finisher | 有 | — | 留 | 打 6。每层铺势再 +6，并清掉铺势。 |
| follow | any | 1 | attack | damage | 有 | — | 删 | 本回合已出过攻击则打 6，否则 3。 |
| follow2 | any | 2 | attack | damage | 有 | — | 删 | 本回合已出过攻击则打 8，否则 4。 |
| fusePalmHook | 钩 | 1 | attack | damage,fuse,pull | 有 | — | 留 | 伤 6，拉近 1。 |
| fusePalmSaber | 刀 | 1 | attack | bleed,damage,fuse,knock | 有 | — | 留 | 伤 8，击退 1，裂创 +2。 |
| fusePalmSpear | 枪 | 1 | attack | damage,fuse,knock | 有 | — | 留 | 伤 8，击退 1。推开后距≥3 再打更疼。 |
| fusePalmStaff | 棍 | 1 | skill | block,fuse,knock | 有 | — | 留 | 格挡 10，击退 1。 |
| fusePalmSword | 剑 | 1 | attack | damage,expose,fuse,knock | 有 | — | 留 | 伤 7，击退 1，破绽 +2。 |
| fuseSaberHook | 钩 | 1 | attack | bleed,damage,fuse,pull | 有 | — | 留 | 伤 7，拉近 1，裂创 +2。 |
| fuseSaberSpear | 枪 | 1 | attack | bleed,damage,fuse | 有 | — | 留 | 伤 9，裂创 +1。 |
| fuseSaberStaff | 棍 | 1 | skill | block,fuse,plant | 有 | — | 留 | 格挡 8。可落桩。 |
| fuseSaberSword | 剑 | 1 | attack | bleed,damage,fuse | 有 | — | 留 | 伤 7，裂创 +2。有破绽时更疼。 |
| fuseSpearHook | 钩 | 1 | attack | damage,fuse,pull | 有 | — | 留 | 伤 8，拉近 1。 |
| fuseSpearStaff | 棍 | 1 | skill | block,fuse | 有 | — | 留 | 格挡 10。本回远打更稳。 |
| fuseStaffHook | 钩 | 1 | skill | block,fuse,pull | 有 | — | 留 | 格挡 9，拉近 1。 |
| fuseSwordHook | 钩 | 1 | skill | expose,fuse,pull | 有 | — | 留 | 拉近 1，破绽 +2。 |
| fuseSwordSpear | 枪 | 1 | attack | damage,expose,fuse | 有 | — | 留 | 伤 8，破绽 +2。 |
| fuseSwordStaff | 棍 | 1 | skill | block,expose,fuse | 有 | — | 留 | 格挡 8，破绽 +1。 |
| gather | any | 1 | skill | flow | 有 | — | 调价→2 | 气脉 +1（最多 3）。抽 1。攻击加气脉。 |
| gather2 | any | 2 | skill | flow | 有 | — | 删 | 本场气脉 +2（最多 3）。抽 1。 |
| handCut | any | 2 | skill | foeHandTax | 有 | — | 留 | 敌手牌上限 -2，持续 2 息。 |
| haste | any | 1 | skill | pace | 有 | — | 留 | 先机 +3。抽 1 张牌。 |
| haste2 | any | 1 | skill | pace | 有 | — | 删 | 先机 +5。抽 1 张牌。 |
| hitHook | 钩 | 2 | attack | damage,pull | 有 | — | 留 | 造成 5 点伤害并拉近 1。 |
| hitPalm | 拳 | 2 | attack | damage,knock | 有 | — | 留 | 造成 6 点伤害并击退 1。 |
| hitSaber | 刀 | 2 | attack | bleed,damage | 有 | — | 留 | 造成 6 点伤害，裂创 +1。 |
| hitSpear | 枪 | 1 | attack | damage,expose | 有 | — | 交叉改挂→剑 | 造成 7 点伤害，破绽 +1。 |
| hitStaff | 棍 | 1 | attack | damage,knock,stun | 有 | — | 交叉改挂→拳 | 造成 6 点伤害并击退 1，眩晕 1 段。 |
| hitSword | 剑 | 1 | attack | damage,expose | 有 | — | 留 | 造成 5 点伤害，破绽 +1。 |
| hookDisarm | 钩 | 2 | attack | damage,disarm,pull | 有 | — | 留 | 拉近 1。伤 4。缴械 2 息（敌攻击减半）。 |
| hookpull | any | 1 | attack | damage,pull | 有 | — | 改挂→钩 | 把对方拉近 2 格，造成 3 点伤害。 |
| inbreath | any | 1 | skill | energyNext | 有 | — | 留 | 下回合劲力 +2。抽 1。 |
| ironform | any | 2 | skill | block,retain | 有 | — | 调价→3 | 格挡 10。之后两回开局各有 6 点格挡。 |
| ironPulse | any | 2 | skill | block,qiRegen | 有 | — | 删 | 格挡 6。本场回劲 +1。 |
| jinwuToken | any | 1 | skill | block,thorns | 有 | — | 留 | 获得 5 点格挡。获得 2 层铁布。 |
| lateBleed | any | 3 | attack | bleed,damage | 有 | — | 改挂→刀 | 伤 7。裂创 +4。 |
| lateChain | any | 3 | attack | combo,damage | 有 | — | 删 | 耗 2 连势：伤 16 并抽 1。 |
| lateLeech | any | 3 | skill | energyNext,foeQiBurn | 有 | — | 删 | 敌扣劲 2 息。你立刻回 3 劲。 |
| lateMirror | any | 3 | skill | block,thorns | 有 | — | 删 | 格挡 10。反震 +4。 |
| lateMute | any | 3 | skill | foeMute | 有 | — | 删 | 敌禁技 3 息。 |
| latePouch | any | 2 | skill | foeNoBag,noBag | 有 | — | 删 | 敌禁药 3 息。你禁药 1 息。 |
| lateTide | any | 3 | skill | flow | 有 | — | 留 | 气脉拉满。抽 2。 |
| lateWard | any | 3 | skill | block,retain | 有 | value:block | 留 | 格挡 16。铁布 4/1。 |
| layer | any | 2 | attack | damage,layer | 有 | — | 留 | 打 3。本息已出攻则叠裂创 2、连势 +1。 |
| marking | any | 1 | attack | damage,mark | 有 | — | 调价→2 | 打 4。点穴印 +2。本场攻击各加印记点。 |
| mend | any | 1 | skill | heal | 有 | — | 留 | 回复 5 点生命。 |
| mend2 | any | 1 | skill | clearBleed,heal | 有 | — | 调价→2 | 回复 8 点生命，并清裂创。 |
| mirror | any | 1 | skill | mirror | 有 | — | 调价→2 | 看他这一息要打多少，卸多少（最多 14）。 |
| palmSeal | 拳 | 2 | attack | damage,foeMute | 有 | — | 留 | 伤 5。给敌禁技 1 息。 |
| peonyBrew | any | 0 | skill | energyNext,frail,heal | 有 | cost | 删 | 回复 2 点生命。下回合 +1 劲力；获得 1 层滞手。 |
| pierce | any | 1 | attack | damage,knock | 有 | — | 改挂→拳 | 造成 6 点，击退 1 格。 |
| plant | any | 1 | skill | plant | 无 | text | 改挂→棍 | 身前一格为空则落一根桩。 |
| pouchSeal | any | 1 | skill | foeNoBag | 有 | — | 调价→2 | 敌禁药/暗器 2 息。 |
| push | any | 2 | attack | knock,wall | 有 | — | 改挂→拳 | 击退 2 格。撞壁再受 8 点伤害。 |
| push2 | any | 3 | attack | knock,wall | 有 | — | 改挂→拳 | 击退 3 格。撞壁再受 10 点伤害。 |
| qiFlood | any | 2 | skill | energyNext | 有 | — | 调价→3 | 立刻回 4 劲（不超过上限）。 |
| qiLeech | any | 2 | skill | foeQiBurn,qiRegen | 有 | — | 留 | 敌每回少回 1 劲，持续 2 息。你回劲 +1（本场）。 |
| qiPulse | any | 1 | skill | qiRegen | 有 | — | 调价→2 | 本场回劲 +1。抽 1。 |
| retreat | any | 0 | skill | step | 有 | cost | 调价→1 | 身后最多退 2 格。 |
| rift | any | 1 | attack | damage,expose | 有 | — | 改挂→剑 | 打 6，破绽 +1。有印则吃 1 层再 +6 并抽 1。 |
| saberBleed | 刀 | 2 | attack | bleed,damage | 有 | — | 留 | 贴身伤 7，距 2 伤 4。裂创 +2。 |
| salve | any | 1 | skill | clearBleed,heal | 有 | — | 删 | 回 6。清掉你身上的裂创。 |
| setup | any | 1 | skill | setup | 有 | — | 调价→2 | 铺势 +1。抽 1。收势掌认这层。 |
| sidestep | any | 1 | skill | swap | 有 | — | 调价→2 | 相邻对调。先机够则抽 1，否则乱步 1。 |
| skillLock | any | 2 | skill | foeMute | 有 | — | 留 | 敌禁技 2 息。 |
| spearLock | 枪 | 2 | attack | damage,expose,frail | 有 | — | 交叉改挂→剑 | 伤 6。破绽 +2。滞手 1。 |
| split | any | 1 | attack | damage | 有 | — | 留 | 拆掉身前的桩。没有桩则造成 7 点伤害。 |
| staffBind | 棍 | 2 | skill | block,foeHandTax,stun | 有 | — | 留 | 格挡 8。敌手牌上限 -1（1 息）。缠压眩晕 1 段。 |
| statusHook | 钩 | 1 | skill | block,frail | 有 | — | 留 | 格挡 3。滞手 +1。 |
| statusHook2 | 钩 | 1 | skill | frail,pull | 有 | — | 留 | 拉近 1。滞手 +2。 |
| statusPalm | 拳 | 1 | skill | heal | 有 | — | 留 | 回复 4 点生命。抽 1。 |
| statusPalm2 | 拳 | 1 | skill | energyNext,heal | 有 | — | 留 | 回复 6 点生命。立刻回劲 2。 |
| statusSaber | 刀 | 1 | skill | bleed,block | 有 | — | 留 | 获得 5 点格挡。裂创 +1。抽 1。 |
| statusSaber2 | 刀 | 1 | skill | bleed,block | 有 | — | 留 | 裂创 +2。格挡 3。 |
| statusSpear | 枪 | 1 | skill | block,energyNext | 有 | — | 留 | 格挡 4。回劲 1。 |
| statusSpear2 | 枪 | 2 | skill | block,energyNext | 有 | — | 留 | 格挡 5。立刻回劲 3。 |
| statusStaff | 棍 | 2 | skill | block,plant | 有 | — | 留 | 获得 7 点格挡。身前空则落桩。抽 1。 |
| statusStaff2 | 棍 | 2 | skill | block | 有 | — | 留 | 获得 12 点格挡。 |
| statusSword | 剑 | 1 | skill | block,expose | 有 | — | 留 | 格挡 3。敌破绽 +1。 |
| statusSword2 | 剑 | 1 | skill | expose,frail | 有 | — | 留 | 敌破绽 +2。滞手 +1。 |
| stepHook | 钩 | 1 | skill | pull,step | 有 | — | 留 | 前进 1 格，拉近 1。 |
| stepPalm | 拳 | 1 | skill | block,step | 有 | — | 留 | 前进 1 格，获得 2 点格挡。 |
| stepSaber | 刀 | 1 | skill | pace,step | 有 | — | 留 | 前进 1 格，先机 +2。 |
| stepSpear | 枪 | 1 | skill | energyNext,step | 有 | — | 留 | 后退 1 格，立刻回劲 1。 |
| stepStaff | 棍 | 1 | skill | block,step | 有 | — | 留 | 前进 1 格，获得 3 点格挡。 |
| stepSword | 剑 | 1 | skill | expose,step | 有 | — | 留 | 后退 1 格，破绽 +1。 |
| strike | any | 1 | attack | damage | 有 | — | 留 | 造成 5 点伤害。 |
| strike2 | any | 2 | attack | damage,knock | 有 | — | 改挂→拳 | 造成 10 点伤害并击退 1。 |
| suture | any | 1 | skill | regen | 有 | — | 调价→2 | 4 回每回回 2。每两回裂创 -1。 |
| sweep | any | 1 | attack | knock | 有 | — | 改挂→拳 | 击退 1 格。抽 1 张牌。 |
| swordMute | 剑 | 2 | attack | bleed,damage,foeMute | 有 | — | 交叉改挂→刀 | 伤 5。裂创 +2。禁敌技 2 息。 |
| thorns | 棍 | 1 | skill | block,thorns | 有 | — | 留 | 获得 5 格挡。这回合挨打回敬 4。 |
| thrust | any | 1 | attack | damage,far | 有 | — | 改挂→枪 | 距 2/3/4 伤 3/5/8。贴身可拨杆：低伤并击退 1。 |
| tide | any | 3 | skill | energyNext,tide | 有 | — | 删 | 下回劲力 +1。有气脉则抽 1。 |
| twinpalm | any | 2 | attack | damage | 有 | — | 删 | 连打两掌，各 4 点。蓄劲只吃第一掌。 |
| ultHook | 钩 | 2 | attack | damage,disarm,pull,ultimate | 有 | — | 调价→4 | 绝招：敌缴械中。伤 12，拉近 1，续缴械 1 息。 |
| ultIronWall | any | 2 | skill | block,ultimate | 有 | — | 调价→4 | 绝招：格挡≥5。格挡 +10（满足前置时翻倍）。 |
| ultPalm | 拳 | 3 | attack | damage,ultimate | 有 | — | 调价→4 | 绝招：敌贴墙。伤 22。 |
| ultQiBurst | any | 2 | attack | damage,ultimate | 有 | — | 调价→4 | 绝招：势≥3。造成 14 点伤害。 |
| ultSaber | 刀 | 3 | attack | damage,knock,ultimate | 有 | — | 交叉未拍；调价→4 | 绝招：上回合挨过敌招。伤 18，击退 1。 |
| ultSpear | 枪 | 3 | attack | damage,ultimate | 有 | — | 调价→4 | 绝招：距离 ≥3。伤 20。 |
| ultStaff | 棍 | 3 | attack | damage,stun,ultimate | 有 | — | 调价→4 | 绝招：本回合已出 2 张攻击。伤 12，敌眩晕 1 段。 |
| ultSword | 剑 | 3 | attack | bleed,damage,ultimate | 有 | — | 交叉未拍；调价→4 | 绝招：敌裂创 ≥4。伤 10，裂创 +2。 |
| unbind | any | 1 | skill | clearSeal | 有 | — | 留 | 清掉封脉和滞步。抽 1。 |
| varBackwater | any | 2 | attack | damage,variant | 有 | — | 留 | 变式：HP≤20% 耗劲 0；否则造成 8 点伤害。 |
| varOverhand | any | 2 | attack | damage,variant | 有 | — | 留 | 变式：HP≥80% 伤害 +50%；否则造成 8 点伤害。 |
| venomFog | any | 2 | skill | bleed | 有 | — | 改挂→刀 | 敌裂创 +3。你也裂创 +1。 |
| wardHook | 钩 | 0 | skill | block,frail,ward | 有 | cost | 调价→1 | 格挡 6，滞手 +1。 |
| wardPalm | 拳 | 0 | skill | block,knock,ward | 有 | cost | 调价→1 | 格挡 6，击退 1。 |
| wardSaber | 刀 | 0 | skill | block,thorns,ward | 有 | cost | 调价→1 | 格挡 6，反震 2。 |
| wardSpear | 枪 | 0 | skill | block,energyNext,ward | 有 | cost | 调价→1 | 格挡 6，立刻回劲 1。 |
| wardStaff | 棍 | 0 | skill | block,plant,ward | 有 | cost | 调价→1 | 格挡 6。身前空则落桩。 |
| wardSword | 剑 | 0 | skill | block,expose,ward | 有 | cost | 调价→1 | 格挡 6，破绽 +1。 |
| weave | any | 0 | skill | costDiscount,weave | 有 | cost | 删 | 上一招是攻则挡 8 并连势 +1；否则蓄劲 +3。本回合下一张牌耗劲 -1。 |

## 处置计数

- 删 24
- 改挂 15
- 交叉改挂 6
- 交叉未拍 2（ultSaber、ultSword）
- 调价 44
- 目标张数 {"any":43,"palm":16,"saber":17,"sword":15,"spear":11,"staff":14,"hook":15}

起手（稿 §6）：五系 `direct` → `strike`；钩 `push` → `sidestep`。这一段是开工时的快照，函数当时还没改。落实见 `REGEN_REPORT_20261023.md`。

复跑：`npx tsx scripts/cardAudit/audit.ts`。注册表已是 131 张时，脚本只在终端打印核对，不覆盖这份 155 张快照。不读随机数。
